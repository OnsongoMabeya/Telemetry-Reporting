const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  next();
});

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

// GET /api/metric-view-settings - Get all view settings with metric details
router.get('/', async (req, res) => {
  try {
    const [settings] = await db.query(`
      SELECT 
        mvs.id,
        mvs.metric_mapping_id,
        mvs.view_type,
        mvs.merge_group_id,
        mvs.merge_group_name,
        mvs.display_order,
        mvs.is_active,
        mvs.created_by,
        mvs.created_at,
        mvs.updated_at,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        mm.color,
        mm.node_name,
        mm.base_station_name,
        mm.is_active as metric_is_active
      FROM metric_view_settings mvs
      INNER JOIN metric_mappings mm ON mm.id = mvs.metric_mapping_id
      WHERE mvs.is_active = TRUE
      ORDER BY 
        COALESCE(mvs.merge_group_id, ''),
        mvs.display_order,
        mvs.id
    `);

    // Group by merge groups
    const grouped = {
      individual: [],
      merged: {}
    };

    settings.forEach(setting => {
      if (setting.merge_group_id) {
        if (!grouped.merged[setting.merge_group_id]) {
          grouped.merged[setting.merge_group_id] = {
            groupId: setting.merge_group_id,
            groupName: setting.merge_group_name,
            metrics: []
          };
        }
        grouped.merged[setting.merge_group_id].metrics.push(setting);
      } else {
        grouped.individual.push(setting);
      }
    });

    res.json({
      success: true,
      data: settings,
      grouped: grouped,
      count: settings.length
    });
  } catch (error) {
    logger.error('API', 'Error fetching metric view settings', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { error: error.message }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch view settings',
      message: error.message
    });
  }
});

// GET /api/metric-view-settings/metric/:metricMappingId - Get setting for specific metric
router.get('/metric/:metricMappingId', async (req, res) => {
  try {
    const { metricMappingId } = req.params;

    const [settings] = await db.query(`
      SELECT * FROM metric_view_settings
      WHERE metric_mapping_id = ? AND is_active = TRUE
      LIMIT 1
    `, [metricMappingId]);

    if (settings.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No custom view setting found - using default line graph'
      });
    }

    res.json({
      success: true,
      data: settings[0]
    });
  } catch (error) {
    logger.error('API', 'Error fetching metric view setting', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { error: error.message, metricMappingId }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch view setting',
      message: error.message
    });
  }
});

// POST /api/metric-view-settings - Create new view setting (admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const {
      metric_mapping_id,
      view_type = 'line',
      merge_group_id = null,
      merge_group_name = null,
      display_order = 0
    } = req.body;

    if (!metric_mapping_id) {
      return res.status(400).json({
        success: false,
        error: 'metric_mapping_id is required'
      });
    }

    // Check if metric mapping exists
    const [mappings] = await db.query(
      'SELECT id FROM metric_mappings WHERE id = ?',
      [metric_mapping_id]
    );

    if (mappings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Metric mapping not found'
      });
    }

    // Check if setting already exists for this metric
    const [existing] = await db.query(
      'SELECT id FROM metric_view_settings WHERE metric_mapping_id = ? AND is_active = TRUE',
      [metric_mapping_id]
    );

    if (existing.length > 0) {
      // Update existing
      await db.query(`
        UPDATE metric_view_settings
        SET view_type = ?,
            merge_group_id = ?,
            merge_group_name = ?,
            display_order = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [view_type, merge_group_id, merge_group_name, display_order, existing[0].id]);

      return res.json({
        success: true,
        message: 'View setting updated',
        data: { id: existing[0].id }
      });
    }

    // Create new setting
    const [result] = await db.query(`
      INSERT INTO metric_view_settings
        (metric_mapping_id, view_type, merge_group_id, merge_group_name, display_order, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [metric_mapping_id, view_type, merge_group_id, merge_group_name, display_order, req.user.id]);

    logger.info('API', 'Created metric view setting', {
      userId: req.user.id,
      ip: req.ip,
      metadata: { settingId: result.insertId, metricMappingId: metric_mapping_id, view_type }
    });

    res.json({
      success: true,
      message: 'View setting created',
      data: { id: result.insertId }
    });
  } catch (error) {
    logger.error('API', 'Error creating metric view setting', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { error: error.message }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create view setting',
      message: error.message
    });
  }
});

// POST /api/metric-view-settings/merge - Create a merge group (admin only)
router.post('/merge', isAdmin, async (req, res) => {
  try {
    const {
      metric_mapping_ids,
      merge_group_name,
      view_type = 'line'
    } = req.body;

    if (!metric_mapping_ids || !Array.isArray(metric_mapping_ids) || metric_mapping_ids.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 metric_mapping_ids required for merge group'
      });
    }

    // Generate UUID using MySQL
    const [uuidResult] = await db.query('SELECT UUID() as uuid');
    const groupId = uuidResult[0].uuid;

    // Create/update settings for all metrics in the group
    for (let i = 0; i < metric_mapping_ids.length; i++) {
      const metricId = metric_mapping_ids[i];

      // Check if setting exists
      const [existing] = await db.query(
        'SELECT id FROM metric_view_settings WHERE metric_mapping_id = ? AND is_active = TRUE',
        [metricId]
      );

      if (existing.length > 0) {
        await db.query(`
          UPDATE metric_view_settings
          SET view_type = ?,
              merge_group_id = ?,
              merge_group_name = ?,
              display_order = ?,
              updated_at = NOW()
          WHERE id = ?
        `, [view_type, groupId, merge_group_name, i, existing[0].id]);
      } else {
        await db.query(`
          INSERT INTO metric_view_settings
            (metric_mapping_id, view_type, merge_group_id, merge_group_name, display_order, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [metricId, view_type, groupId, merge_group_name, i, req.user.id]);
      }
    }

    logger.info('API', 'Created merge group', {
      userId: req.user.id,
      ip: req.ip,
      metadata: { groupId, groupName: merge_group_name, metricCount: metric_mapping_ids.length }
    });

    res.json({
      success: true,
      message: 'Merge group created',
      data: {
        groupId,
        groupName: merge_group_name,
        metricCount: metric_mapping_ids.length
      }
    });
  } catch (error) {
    logger.error('API', 'Error creating merge group', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { error: error.message }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create merge group',
      message: error.message
    });
  }
});

// PUT /api/metric-view-settings/:id - Update view setting (admin only)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { view_type, merge_group_id, merge_group_name, display_order, is_active } = req.body;

    const updates = [];
    const values = [];

    if (view_type !== undefined) {
      updates.push('view_type = ?');
      values.push(view_type);
    }
    if (merge_group_id !== undefined) {
      updates.push('merge_group_id = ?');
      values.push(merge_group_id);
    }
    if (merge_group_name !== undefined) {
      updates.push('merge_group_name = ?');
      values.push(merge_group_name);
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?');
      values.push(display_order);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    await db.query(
      `UPDATE metric_view_settings SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    logger.info('API', 'Updated metric view setting', {
      userId: req.user.id,
      ip: req.ip,
      metadata: { settingId: id, updates: req.body }
    });

    res.json({
      success: true,
      message: 'View setting updated'
    });
  } catch (error) {
    logger.error('API', 'Error updating metric view setting', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { error: error.message, settingId: req.params.id }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update view setting',
      message: error.message
    });
  }
});

// DELETE /api/metric-view-settings/:id - Soft delete (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      'UPDATE metric_view_settings SET is_active = FALSE WHERE id = ?',
      [id]
    );

    logger.info('API', 'Deleted metric view setting', {
      userId: req.user.id,
      ip: req.ip,
      metadata: { settingId: id }
    });

    res.json({
      success: true,
      message: 'View setting deleted'
    });
  } catch (error) {
    logger.error('API', 'Error deleting metric view setting', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { error: error.message, settingId: req.params.id }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete view setting',
      message: error.message
    });
  }
});

// POST /api/metric-view-settings/ungroup/:groupId - Remove metrics from merge group (admin only)
router.post('/ungroup/:groupId', isAdmin, async (req, res) => {
  try {
    const { groupId } = req.params;
    const metric_mapping_ids = req.body?.metric_mapping_ids; // Optional: specific metrics to ungroup

    console.log('[ungroup] Request:', { groupId, metric_mapping_ids, user: req.user?.id, role: req.user?.role });

    let query = `
      UPDATE metric_view_settings
      SET merge_group_id = NULL,
          merge_group_name = NULL,
          display_order = 0,
          updated_at = NOW()
      WHERE merge_group_id = ?
    `;
    let values = [groupId];

    if (metric_mapping_ids && Array.isArray(metric_mapping_ids) && metric_mapping_ids.length > 0) {
      query += ` AND metric_mapping_id IN (${metric_mapping_ids.map(() => '?').join(',')})`;
      values = [...values, ...metric_mapping_ids];
    }

    console.log('[ungroup] Query:', query, 'Values:', values);

    const [result] = await db.query(query, values);

    console.log('[ungroup] Result:', result);

    logger.info('API', 'Ungrouped metrics', {
      userId: req.user.id,
      ip: req.ip,
      metadata: { groupId, ungroupedCount: result.affectedRows }
    });

    res.json({
      success: true,
      message: `Ungrouped ${result.affectedRows} metric(s)`,
      data: { ungroupedCount: result.affectedRows }
    });
  } catch (error) {
    logger.error('API', 'Error ungrouping metrics', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { error: error.message, groupId: req.params.groupId }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to ungroup metrics',
      message: error.message
    });
  }
});

// GET /api/metric-view-settings/for-metric/:metricMappingId - Public endpoint for fetching view setting
router.get('/for-metric/:metricMappingId', async (req, res) => {
  try {
    const { metricMappingId } = req.params;

    const [settings] = await db.query(`
      SELECT 
        mvs.view_type,
        mvs.merge_group_id,
        mvs.merge_group_name,
        mvs.display_order
      FROM metric_view_settings mvs
      WHERE mvs.metric_mapping_id = ? AND mvs.is_active = TRUE
      LIMIT 1
    `, [metricMappingId]);

    if (settings.length === 0) {
      return res.json({
        success: true,
        data: {
          view_type: 'line',
          merge_group_id: null,
          merge_group_name: null,
          display_order: 0
        }
      });
    }

    res.json({
      success: true,
      data: settings[0]
    });
  } catch (error) {
    logger.error('API', 'Error fetching metric view setting', {
      userId: req.user?.id,
      ip: req.ip,
      metadata: { error: error.message, metricMappingId }
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch view setting',
      message: error.message
    });
  }
});

module.exports = router;
