const express = require('express');
const router = express.Router();

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
router.get('/columns', requireAdminOrManager, async (req, res) => {
  try {
    // Get all columns from node_status_table
    const [columns] = await db.query(
      `SELECT COLUMN_NAME, DATA_TYPE, ORDINAL_POSITION
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'node_status_table'
       AND ORDINAL_POSITION >= 6
       ORDER BY ORDINAL_POSITION`,
      [process.env.DB_NAME || 'horiserverlive']
    );

    // Categorize columns
    const analogColumns = columns.filter(c => 
      c.COLUMN_NAME.match(/^Analog\d+Value$/i)
    ).map(c => c.COLUMN_NAME);

    const digitalColumns = columns.filter(c => 
      c.COLUMN_NAME.match(/^Digital\d+Value$/i)
    ).map(c => c.COLUMN_NAME);

    const outputColumns = columns.filter(c => 
      c.COLUMN_NAME.match(/^Output\d+Value$/i)
    ).map(c => c.COLUMN_NAME);

    res.json({
      analog: analogColumns,
      digital: digitalColumns,
      output: outputColumns,
      all: [...analogColumns, ...digitalColumns, ...outputColumns]
    });

  } catch (error) {
    console.error('Error fetching columns:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available columns',
      code: 'SERVER_ERROR'
    });
  }
});

// GET /api/metric-mappings - Get all metric mappings (with optional filters)
router.get('/', requireAdminOrManager, async (req, res) => {
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

    res.json(mappings);

  } catch (error) {
    console.error('Error fetching metric mappings:', error);
    res.status(500).json({ 
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
    console.error('Error fetching nodes:', error);
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
    console.error('Error fetching unmapped nodes:', error);
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
      display_order 
    } = req.body;

    // Validate required fields
    if (!node_name || !base_station_name || !metric_name || !column_name) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if mapping already exists
    const [existing] = await db.query(
      `SELECT id FROM metric_mappings 
       WHERE node_name = ? AND base_station_name = ? 
       AND (column_name = ? OR metric_name = ?)
       AND is_active = TRUE`,
      [node_name, base_station_name, column_name, metric_name]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Mapping already exists for this column or metric name',
        code: 'DUPLICATE_MAPPING'
      });
    }

    // Insert new mapping
    const [result] = await db.query(
      `INSERT INTO metric_mappings 
       (node_name, base_station_name, metric_name, column_name, unit, display_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [node_name, base_station_name, metric_name, column_name, unit || null, display_order || 0, req.user.id]
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
        JSON.stringify({ metric_name, column_name, unit, display_order }),
        req.ip
      ]
    );

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, 'CREATE', 'metric_mapping', ?, ?)`,
      [req.user.id, `Created mapping: ${metric_name} -> ${column_name} for ${node_name}/${base_station_name}`, req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Metric mapping created successfully',
      id: result.insertId
    });

  } catch (error) {
    console.error('Error creating metric mapping:', error);
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
    const { metric_name, column_name, unit, display_order } = req.body;

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
       SET metric_name = ?, column_name = ?, unit = ?, display_order = ?
       WHERE id = ?`,
      [metric_name, column_name, unit || null, display_order || 0, id]
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
        JSON.stringify({ metric_name, column_name, unit, display_order }),
        req.ip
      ]
    );

    // Log activity
    await db.query(
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, 'UPDATE', 'metric_mapping', ?, ?)`,
      [req.user.id, `Updated mapping: ${metric_name} for ${oldMapping[0].node_name}/${oldMapping[0].base_station_name}`, req.ip]
    );

    res.json({
      success: true,
      message: 'Metric mapping updated successfully'
    });

  } catch (error) {
    console.error('Error updating metric mapping:', error);
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
      `INSERT INTO user_activity_log (user_id, action, resource, details, ip_address)
       VALUES (?, 'DELETE', 'metric_mapping', ?, ?)`,
      [req.user.id, `Deleted mapping: ${mapping[0].metric_name} for ${mapping[0].node_name}/${mapping[0].base_station_name}`, req.ip]
    );

    res.json({
      success: true,
      message: 'Metric mapping deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting metric mapping:', error);
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
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ 
      error: 'Failed to fetch audit trail',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
