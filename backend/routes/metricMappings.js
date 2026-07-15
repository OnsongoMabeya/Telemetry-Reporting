const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  next();
});

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin role required.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

// Middleware to check admin or manager role
const requireAdminOrManager = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ 
      error: 'Access denied. Admin or Manager role required.',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }
  next();
};

// GET /api/metric-mappings/columns - Get available columns for mapping
// OPTIMIZED: Uses cache when available, falls back to simple column names
const columnStatsService = require('../services/columnStatsService');
const cacheLogger = require('../utils/cacheLogger');

router.get('/columns', requireAdminOrManager, async (req, res) => {
  const requestStartTime = Date.now();
  try {
    const { nodeName, baseStation } = req.query;

    // If specific node/station requested, try to get from cache
    if (nodeName && baseStation) {
      try {
        columnStatsService.setDatabase(db);
        const cachedStats = await columnStatsService.getStatsForNode(nodeName, baseStation);
        
        // Check if we actually got data
        const hasCachedData = cachedStats.analog.length > 0 || 
                              cachedStats.digital.length > 0 || 
                              cachedStats.output.length > 0;
        
        if (hasCachedData) {
          // CACHE HIT - Log it
          const cacheAge = cachedStats.calculatedAt 
            ? Date.now() - new Date(cachedStats.calculatedAt).getTime()
            : 0;
          const totalColumns = cachedStats.analog.length + cachedStats.digital.length + cachedStats.output.length;
          
          cacheLogger.cacheHit(nodeName, baseStation, totalColumns, cacheAge);
          logger.info('CRUD', `Cache hit for ${nodeName}/${baseStation}`, {
            metadata: { 
              nodeName, 
              baseStation, 
              columnCount: totalColumns,
              duration: `${Date.now() - requestStartTime}ms`
            }
          });
        
          // Return cached data with source indicator
          return res.json({
            analog: cachedStats.analog,
            digital: cachedStats.digital,
            output: cachedStats.output,
            totalRows: cachedStats.totalRows,
            summary: {
              analogWithData: cachedStats.analog.filter(c => c.hasData).length,
              digitalWithData: cachedStats.digital.filter(c => c.hasData).length,
              outputWithData: cachedStats.output.filter(c => c.hasData).length
            },
            source: 'cache',
            calculatedAt: cachedStats.calculatedAt
          });
        } else {
          // Empty cache entry - treat as miss
          cacheLogger.cacheMiss(nodeName, baseStation, 'Empty cache entry for this node/station');
        }
      } catch (cacheError) {
        // Cache miss or error - log and fall through to fallback
        cacheLogger.cacheMiss(nodeName, baseStation, cacheError.message);
        logger.debug('CRUD', 'Cache miss for columns', { nodeName, baseStation, error: cacheError.message });
      }
    }

    // FALLBACK: Return simple column names without expensive stats
    // This happens when:
    // 1. No nodeName/baseStation provided
    // 2. Cache miss for the specific node/station
    if (nodeName && baseStation) {
      cacheLogger.fallbackSchema('Cache miss - returning schema-only column names');
    }
    
    const [columns] = await db.query(
      `SELECT COLUMN_NAME, DATA_TYPE, ORDINAL_POSITION
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'node_status_table'
       AND ORDINAL_POSITION >= 6
       ORDER BY ORDINAL_POSITION`,
      [process.env.DB_NAME || 'horiserverlive']
    );

    // Simple categorization without data analysis
    const analog = columns.filter(c => 
      c.COLUMN_NAME.match(/^Analog\d+Value$/i)
    ).map(c => ({ name: c.COLUMN_NAME, hasData: true }));

    const digital = columns.filter(c => 
      c.COLUMN_NAME.match(/^Digital\d+Value$/i)
    ).map(c => ({ name: c.COLUMN_NAME, hasData: true }));

    const output = columns.filter(c => 
      c.COLUMN_NAME.match(/^Output\d+Value$/i)
    ).map(c => ({ name: c.COLUMN_NAME, hasData: true }));

    res.json({
      analog,
      digital,
      output,
      source: 'schema',
      message: nodeName && baseStation ? 'Cache not available - showing column names only' : undefined
    });

  } catch (error) {
    logger.error('CRUD', 'Error fetching columns', { metadata: { error: error.message } });
    res.status(500).json({ 
      error: 'Failed to fetch available columns',
      code: 'SERVER_ERROR'
    });
  }
});

// POST /api/metric-mappings/columns/refresh - Manually refresh column stats cache
router.post('/columns/refresh', requireAdmin, async (req, res) => {
  try {
    columnStatsService.setDatabase(db);
    
    // Log manual refresh
    cacheLogger.manualRefresh(req.user?.id, req.user?.username || 'unknown');
    logger.info('CRUD', `Manual cache refresh triggered by ${req.user?.username || 'unknown'}`);
    
    // Run refresh (this may take a while)
    const result = await columnStatsService.refreshCache();
    
    res.json({
      success: true,
      message: `Cache refreshed successfully`,
      details: result
    });
  } catch (error) {
    cacheLogger.error('Manual cache refresh failed', { 
      error: error.message,
      userId: req.user?.id,
      username: req.user?.username
    });
    logger.error('CRUD', 'Error refreshing column cache', { metadata: { error: error.message } });
    res.status(500).json({ 
      success: false,
      error: 'Failed to refresh column cache',
      message: error.message
    });
  }
});

// GET /api/metric-mappings/columns/status - Get cache status
router.get('/columns/status', requireAdminOrManager, async (req, res) => {
  try {
    columnStatsService.setDatabase(db);
    const status = await columnStatsService.getCacheStatus();
    const isStale = await columnStatsService.isCacheStale();
    
    res.json({
      success: true,
      ...status,
      isStale,
      message: isStale ? 'Cache is stale (older than 2 hours)' : 'Cache is fresh'
    });
  } catch (error) {
    logger.error('CRUD', 'Error fetching cache status', { metadata: { error: error.message } });
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch cache status',
      message: error.message
    });
  }
});

// GET /api/metric-mappings - Get all metric mappings (with optional filters)
// Accessible to all authenticated users for assignment purposes
router.get('/', async (req, res) => {
  try {
    const { node_name, base_station_name } = req.query;

    let query = `
      SELECT 
        mm.id,
        mm.node_name,
        mm.base_station_name,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        mm.display_order,
        mm.color,
        mm.min_value,
        mm.max_value,
        mm.is_active,
        mm.created_at,
        mm.updated_at,
        u.username as created_by_username,
        CONCAT(u.first_name, ' ', u.last_name) as created_by_name
      FROM metric_mappings mm
      INNER JOIN users u ON mm.created_by = u.id
      WHERE mm.is_active = TRUE
    `;

    const params = [];

    if (node_name) {
      query += ' AND mm.node_name = ?';
      params.push(node_name);
    }

    if (base_station_name) {
      query += ' AND mm.base_station_name = ?';
      params.push(base_station_name);
    }

    query += ' ORDER BY mm.node_name, mm.base_station_name, mm.display_order';

    const [mappings] = await db.query(query, params);

    res.json({
      success: true,
      data: mappings,
      count: mappings.length
    });

  } catch (error) {
    logger.error('CRUD', 'Error fetching metric mappings', { metadata: { error: error.message } });
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch metric mappings',
      code: 'SERVER_ERROR'
    });
  }
});

// GET /api/metric-mappings/nodes - Get all unique node/base station combinations
router.get('/nodes', requireAdminOrManager, async (req, res) => {
  try {
    const [nodes] = await db.query(`
      SELECT DISTINCT NodeName as node_name, NodeBaseStationName as base_station_name
      FROM node_status_table
      ORDER BY NodeName, NodeBaseStationName
    `);

    // Check which nodes have mappings
    const [mappedNodes] = await db.query(`
      SELECT DISTINCT node_name, base_station_name
      FROM metric_mappings
      WHERE is_active = TRUE
    `);

    const mappedSet = new Set(
      mappedNodes.map(n => `${n.node_name}|${n.base_station_name}`)
    );

    const nodesWithStatus = nodes.map(node => ({
      ...node,
      has_mappings: mappedSet.has(`${node.node_name}|${node.base_station_name}`)
    }));

    res.json(nodesWithStatus);

  } catch (error) {
    logger.error('CRUD', 'Error fetching nodes', { metadata: { error: error.message } });
    res.status(500).json({ 
      error: 'Failed to fetch nodes',
      code: 'SERVER_ERROR'
    });
  }
});

// GET /api/metric-mappings/unmapped - Get nodes without metric mappings (admin alert)
router.get('/unmapped', requireAdmin, async (req, res) => {
  try {
    const [unmappedNodes] = await db.query(`
      SELECT DISTINCT 
        nst.NodeName as node_name, 
        nst.NodeBaseStationName as base_station_name,
        COUNT(DISTINCT nst.time) as data_points
      FROM node_status_table nst
      LEFT JOIN metric_mappings mm 
        ON nst.NodeName = mm.node_name 
        AND nst.NodeBaseStationName = mm.base_station_name
        AND mm.is_active = TRUE
      WHERE mm.id IS NULL
      GROUP BY nst.NodeName, nst.NodeBaseStationName
      ORDER BY data_points DESC, nst.NodeName
    `);

    res.json({
      count: unmappedNodes.length,
      nodes: unmappedNodes
    });

  } catch (error) {
    logger.error('CRUD', 'Error fetching unmapped nodes', { metadata: { error: error.message } });
    res.status(500).json({ 
      error: 'Failed to fetch unmapped nodes',
      code: 'SERVER_ERROR'
    });
  }
});

// POST /api/metric-mappings - Create new metric mapping (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { 
      node_name, 
      base_station_name, 
      metric_name, 
      column_name, 
      unit, 
      display_order,
      color,
      min_value,
      max_value
    } = req.body;

    // Validate required fields
    if (!node_name || !base_station_name || !metric_name || !column_name) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate user exists
    if (!req.user || !req.user.id) {
      logger.error('AUTH', 'User authentication error', { metadata: { reqUser: req.user } });
      return res.status(401).json({ 
        error: 'User authentication failed',
        code: 'AUTH_ERROR'
      });
    }

    // Verify user exists in database
    const [userCheck] = await db.query('SELECT id FROM users WHERE id = ?', [req.user.id]);
    if (userCheck.length === 0) {
      logger.error('AUTH', 'User ID not found in database', { metadata: { userId: req.user.id } });
      return res.status(401).json({ 
        error: 'User not found in database',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if mapping already exists for this column
    const [existingColumn] = await db.query(
      `SELECT id, metric_name FROM metric_mappings 
       WHERE node_name = ? AND base_station_name = ? 
       AND column_name = ?
       AND is_active = TRUE`,
      [node_name, base_station_name, column_name]
    );

    if (existingColumn.length > 0) {
      return res.status(409).json({ 
        error: `Column ${column_name} is already mapped to "${existingColumn[0].metric_name}"`,
        code: 'DUPLICATE_COLUMN'
      });
    }

    // Check if mapping already exists for this metric name
    const [existingMetric] = await db.query(
      `SELECT id, column_name FROM metric_mappings 
       WHERE node_name = ? AND base_station_name = ? 
       AND metric_name = ?
       AND is_active = TRUE`,
      [node_name, base_station_name, metric_name]
    );

    if (existingMetric.length > 0) {
      return res.status(409).json({ 
        error: `Metric name "${metric_name}" is already used for column ${existingMetric[0].column_name}`,
        code: 'DUPLICATE_METRIC_NAME'
      });
    }

    // Insert new mapping
    const [result] = await db.query(
      `INSERT INTO metric_mappings 
       (node_name, base_station_name, metric_name, column_name, unit, display_order, color, min_value, max_value, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [node_name, base_station_name, metric_name, column_name, unit || null, display_order || 0, color || null, min_value ?? 0, max_value ?? 100, req.user.id]
    );

    // Log to audit trail
    await db.query(
      `INSERT INTO metric_mapping_audit 
       (mapping_id, node_name, base_station_name, metric_name, column_name, unit, action, changed_by, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, 'CREATE', ?, ?, ?)`,
      [
        result.insertId,
        node_name,
        base_station_name,
        metric_name,
        column_name,
        unit || null,
        req.user.id,
        JSON.stringify({ metric_name, column_name, unit, display_order, color, min_value, max_value }),
        req.ip
      ]
    );

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, level, category, action, resource, details, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'INFO',
        'CRUD',
        'CREATE',
        'metric_mapping',
        `Created mapping: ${metric_name} -> ${column_name} for ${node_name}/${base_station_name}`,
        null,
        req.ip
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Metric mapping created successfully',
      id: result.insertId
    });

  } catch (error) {
    logger.error('CRUD', 'Error creating metric mapping', { userId: req.user?.id, metadata: { error: error.message, code: error.code, sqlMessage: error.sqlMessage } });
    res.status(500).json({ 
      error: 'Failed to create metric mapping',
      code: 'SERVER_ERROR'
    });
  }
});

// PUT /api/metric-mappings/:id - Update metric mapping (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { metric_name, column_name, unit, display_order, color, min_value, max_value } = req.body;

    // Get old values for audit
    const [oldMapping] = await db.query(
      'SELECT * FROM metric_mappings WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (oldMapping.length === 0) {
      return res.status(404).json({ 
        error: 'Metric mapping not found',
        code: 'NOT_FOUND'
      });
    }

    // Update mapping
    await db.query(
      `UPDATE metric_mappings 
       SET metric_name = ?, column_name = ?, unit = ?, display_order = ?, color = ?, min_value = ?, max_value = ?
       WHERE id = ?`,
      [metric_name, column_name, unit || null, display_order || 0, color || null, min_value ?? oldMapping[0].min_value, max_value ?? oldMapping[0].max_value, id]
    );

    // Log to audit trail
    await db.query(
      `INSERT INTO metric_mapping_audit 
       (mapping_id, node_name, base_station_name, metric_name, column_name, unit, action, changed_by, old_values, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, 'UPDATE', ?, ?, ?, ?)`,
      [
        id,
        oldMapping[0].node_name,
        oldMapping[0].base_station_name,
        metric_name,
        column_name,
        unit || null,
        req.user.id,
        JSON.stringify(oldMapping[0]),
        JSON.stringify({ metric_name, column_name, unit, display_order, color, min_value, max_value }),
        req.ip
      ]
    );

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, level, category, action, resource, details, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'INFO',
        'CRUD',
        'UPDATE',
        'metric_mapping',
        `Updated mapping: ${metric_name} for ${oldMapping[0].node_name}/${oldMapping[0].base_station_name}`,
        null,
        req.ip
      ]
    );

    res.json({
      success: true,
      message: 'Metric mapping updated successfully'
    });

  } catch (error) {
    logger.error('CRUD', 'Error updating metric mapping', { metadata: { error: error.message } });
    res.status(500).json({ 
      error: 'Failed to update metric mapping',
      code: 'SERVER_ERROR'
    });
  }
});

// DELETE /api/metric-mappings/:id - Delete metric mapping (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get mapping details for audit
    const [mapping] = await db.query(
      'SELECT * FROM metric_mappings WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (mapping.length === 0) {
      return res.status(404).json({ 
        error: 'Metric mapping not found',
        code: 'NOT_FOUND'
      });
    }

    // Soft delete
    await db.query(
      'UPDATE metric_mappings SET is_active = FALSE WHERE id = ?',
      [id]
    );

    // Log to audit trail
    await db.query(
      `INSERT INTO metric_mapping_audit 
       (mapping_id, node_name, base_station_name, metric_name, column_name, unit, action, changed_by, old_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, 'DELETE', ?, ?, ?)`,
      [
        id,
        mapping[0].node_name,
        mapping[0].base_station_name,
        mapping[0].metric_name,
        mapping[0].column_name,
        mapping[0].unit,
        req.user.id,
        JSON.stringify(mapping[0]),
        req.ip
      ]
    );

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, level, category, action, resource, details, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'INFO',
        'CRUD',
        'DELETE',
        'metric_mapping',
        `Deleted mapping: ${mapping[0].metric_name} for ${mapping[0].node_name}/${mapping[0].base_station_name}`,
        null,
        req.ip
      ]
    );

    res.json({
      success: true,
      message: 'Metric mapping deleted successfully'
    });

  } catch (error) {
    logger.error('CRUD', 'Error deleting metric mapping', { metadata: { error: error.message } });
    res.status(500).json({ 
      error: 'Failed to delete metric mapping',
      code: 'SERVER_ERROR'
    });
  }
});

// GET /api/metric-mappings/audit/:id - Get audit trail for a mapping
router.get('/audit/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [audit] = await db.query(
      `SELECT 
        mma.*,
        u.username as changed_by_username,
        CONCAT(u.first_name, ' ', u.last_name) as changed_by_name
       FROM metric_mapping_audit mma
       INNER JOIN users u ON mma.changed_by = u.id
       WHERE mma.mapping_id = ?
       ORDER BY mma.changed_at DESC`,
      [id]
    );

    res.json(audit);

  } catch (error) {
    logger.error('CRUD', 'Error fetching audit trail', { metadata: { error: error.message } });
    res.status(500).json({ 
      error: 'Failed to fetch audit trail',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
