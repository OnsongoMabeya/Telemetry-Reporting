/**
 * Power Drop Alert Routes
 * 
 * API endpoints for managing power drop alert configurations
 * Monitors sudden drops in metrics (e.g., Forward Power) and sends notifications
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const cacheLogger = require('../utils/cacheLogger');

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  req.db = db; // Make db available in req for convenience
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

/**
 * Helper function to safely parse JSON fields
 */
function safeJsonParse(val, defaultValue = []) {
  if (!val) return defaultValue;
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch {
    return defaultValue;
  }
}

/**
 * GET /api/power-drop-alerts - List all power drop alert configs
 * Admin and Manager access
 */
router.get('/', requireAdminOrManager, async (req, res) => {
  try {
    const { node_name, base_station_name, is_active } = req.query;
    
    let query = `
      SELECT 
        pdac.*,
        u.username as created_by_username,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        pdas.is_power_down,
        pdas.alert_triggered_at,
        pdas.last_alert_sent_at,
        pdas.alert_count,
        pdas.recovered_at
      FROM power_drop_alert_configs pdac
      LEFT JOIN users u ON pdac.created_by = u.id
      LEFT JOIN metric_mappings mm ON pdac.metric_mapping_id = mm.id
      LEFT JOIN power_drop_alert_state pdas ON pdac.id = pdas.config_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (node_name) {
      query += ' AND pdac.node_name = ?';
      params.push(node_name);
    }
    
    if (base_station_name) {
      query += ' AND pdac.base_station_name = ?';
      params.push(base_station_name);
    }
    
    if (is_active !== undefined) {
      query += ' AND pdac.is_active = ?';
      params.push(is_active === 'true');
    }
    
    query += ' ORDER BY pdac.created_at DESC';
    
    const [configs] = await req.db.query(query, params);
    
    // Parse JSON fields and format response
    const formattedConfigs = configs.map(config => ({
      ...config,
      recipient_users: safeJsonParse(config.recipient_users),
      recipient_emails: safeJsonParse(config.recipient_emails),
      recipient_phones: safeJsonParse(config.recipient_phones),
      status: config.is_power_down ? 'active' : 'normal',
      last_triggered: config.alert_triggered_at,
      last_alert_sent: config.last_alert_sent_at
    }));
    
    res.json({
      success: true,
      data: formattedConfigs,
      total: formattedConfigs.length
    });
    
  } catch (error) {
    logger.error('CRUD', 'Error fetching power drop alert configs', { 
      userId: req.user?.id, 
      metadata: { error: error.message } 
    });
    res.status(500).json({ 
      error: 'Failed to fetch power drop alert configurations',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * GET /api/power-drop-alerts/:id - Get specific alert config
 * Admin and Manager access
 */
router.get('/:id', requireAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [configs] = await req.db.query(`
      SELECT 
        pdac.*,
        u.username as created_by_username,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        pdas.is_power_down,
        pdas.alert_triggered_at,
        pdas.last_alert_sent_at,
        pdas.alert_count,
        pdas.recovered_at,
        pdas.last_reading_value,
        pdas.last_reading_time
      FROM power_drop_alert_configs pdac
      LEFT JOIN users u ON pdac.created_by = u.id
      LEFT JOIN metric_mappings mm ON pdac.metric_mapping_id = mm.id
      LEFT JOIN power_drop_alert_state pdas ON pdac.id = pdas.config_id
      WHERE pdac.id = ?
    `, [id]);
    
    if (configs.length === 0) {
      return res.status(404).json({ 
        error: 'Power drop alert configuration not found',
        code: 'NOT_FOUND'
      });
    }
    
    const config = configs[0];
    
    // Parse JSON fields
    config.recipient_users = safeJsonParse(config.recipient_users);
    config.recipient_emails = safeJsonParse(config.recipient_emails);
    config.recipient_phones = safeJsonParse(config.recipient_phones);
    config.status = config.is_power_down ? 'active' : 'normal';
    
    res.json({
      success: true,
      data: config
    });
    
  } catch (error) {
    logger.error('CRUD', 'Error fetching power drop alert config', { 
      userId: req.user?.id, 
      metadata: { id: req.params.id, error: error.message } 
    });
    res.status(500).json({ 
      error: 'Failed to fetch power drop alert configuration',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * POST /api/power-drop-alerts - Create new power drop alert config
 * Admin only
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      node_name,
      base_station_name,
      metric_mapping_id,
      drop_percentage = 80,
      time_window_seconds = 5,
      check_interval_seconds = 5,
      recipient_users = [],
      recipient_emails = [],
      recipient_phones = [],
      notify_email = true,
      notify_whatsapp = true,
      is_active = true
    } = req.body;
    
    // Validate required fields
    if (!name || !node_name || !base_station_name || !metric_mapping_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, node_name, base_station_name, metric_mapping_id',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Validate metric mapping exists
    const [metricMappings] = await req.db.query(
      'SELECT id FROM metric_mappings WHERE id = ? AND is_active = TRUE',
      [metric_mapping_id]
    );
    
    if (metricMappings.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid metric_mapping_id or metric mapping is not active',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Insert new config
    const [result] = await req.db.query(`
      INSERT INTO power_drop_alert_configs (
        name, node_name, base_station_name, metric_mapping_id,
        drop_percentage, time_window_seconds, check_interval_seconds,
        recipient_users, recipient_emails, recipient_phones,
        notify_email, notify_whatsapp, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, node_name, base_station_name, metric_mapping_id,
      drop_percentage, time_window_seconds, check_interval_seconds,
      JSON.stringify(recipient_users),
      JSON.stringify(recipient_emails),
      JSON.stringify(recipient_phones),
      notify_email, notify_whatsapp, is_active,
      req.user.id
    ]);
    
    // Initialize state table entry
    await req.db.query(`
      INSERT INTO power_drop_alert_state (
        config_id, node_name, base_station_name
      ) VALUES (?, ?, ?)
    `, [result.insertId, node_name, base_station_name]);
    
    logger.crud.create('power_drop_alert_config', result.insertId, {
      userId: req.user.id,
      metadata: { name, node_name, base_station_name }
    });
    
    res.status(201).json({
      success: true,
      message: 'Power drop alert configuration created successfully',
      id: result.insertId
    });
    
  } catch (error) {
    logger.error('CRUD', 'Error creating power drop alert config', { 
      userId: req.user?.id, 
      metadata: { error: error.message, code: error.code, sqlMessage: error.sqlMessage } 
    });
    res.status(500).json({ 
      error: 'Failed to create power drop alert configuration',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * PUT /api/power-drop-alerts/:id - Update power drop alert config
 * Admin only
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      node_name,
      base_station_name,
      metric_mapping_id,
      drop_percentage,
      time_window_seconds,
      check_interval_seconds,
      recipient_users,
      recipient_emails,
      recipient_phones,
      notify_email,
      notify_whatsapp,
      is_active
    } = req.body;
    
    // Check if config exists
    const [existing] = await req.db.query(
      'SELECT * FROM power_drop_alert_configs WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Power drop alert configuration not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    
    if (node_name !== undefined) {
      updates.push('node_name = ?');
      params.push(node_name);
    }
    
    if (base_station_name !== undefined) {
      updates.push('base_station_name = ?');
      params.push(base_station_name);
    }
    
    if (metric_mapping_id !== undefined) {
      updates.push('metric_mapping_id = ?');
      params.push(metric_mapping_id);
    }
    
    if (drop_percentage !== undefined) {
      updates.push('drop_percentage = ?');
      params.push(drop_percentage);
    }
    
    if (time_window_seconds !== undefined) {
      updates.push('time_window_seconds = ?');
      params.push(time_window_seconds);
    }
    
    if (check_interval_seconds !== undefined) {
      updates.push('check_interval_seconds = ?');
      params.push(check_interval_seconds);
    }
    
    if (recipient_users !== undefined) {
      updates.push('recipient_users = ?');
      params.push(JSON.stringify(recipient_users));
    }
    
    if (recipient_emails !== undefined) {
      updates.push('recipient_emails = ?');
      params.push(JSON.stringify(recipient_emails));
    }
    
    if (recipient_phones !== undefined) {
      updates.push('recipient_phones = ?');
      params.push(JSON.stringify(recipient_phones));
    }
    
    if (notify_email !== undefined) {
      updates.push('notify_email = ?');
      params.push(notify_email);
    }
    
    if (notify_whatsapp !== undefined) {
      updates.push('notify_whatsapp = ?');
      params.push(notify_whatsapp);
    }
    
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ 
        error: 'No fields to update provided',
        code: 'VALIDATION_ERROR'
      });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    await req.db.query(
      `UPDATE power_drop_alert_configs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    logger.crud.update('power_drop_alert_config', id, {
      userId: req.user.id,
      metadata: { updatedFields: Object.keys(req.body) }
    });
    
    res.json({
      success: true,
      message: 'Power drop alert configuration updated successfully'
    });
    
  } catch (error) {
    logger.error('CRUD', 'Error updating power drop alert config', { 
      userId: req.user?.id, 
      metadata: { id: req.params.id, error: error.message } 
    });
    res.status(500).json({ 
      error: 'Failed to update power drop alert configuration',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * DELETE /api/power-drop-alerts/:id - Delete power drop alert config
 * Admin only
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if config exists
    const [existing] = await req.db.query(
      'SELECT name FROM power_drop_alert_configs WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ 
        error: 'Power drop alert configuration not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Delete config (cascade will delete state and history)
    await req.db.query('DELETE FROM power_drop_alert_configs WHERE id = ?', [id]);
    
    logger.crud.delete('power_drop_alert_config', id, {
      userId: req.user.id,
      metadata: { name: existing[0].name }
    });
    
    res.json({
      success: true,
      message: 'Power drop alert configuration deleted successfully'
    });
    
  } catch (error) {
    logger.error('CRUD', 'Error deleting power drop alert config', { 
      userId: req.user?.id, 
      metadata: { id: req.params.id, error: error.message } 
    });
    res.status(500).json({ 
      error: 'Failed to delete power drop alert configuration',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * GET /api/power-drop-alerts/:id/state - Get current alert state
 * Admin and Manager access
 */
router.get('/:id/state', requireAdminOrManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [state] = await req.db.query(`
      SELECT 
        pdas.*,
        pdac.name as config_name,
        pdac.node_name,
        pdac.base_station_name,
        pdac.metric_mapping_id,
        mm.metric_name,
        mm.column_name,
        mm.unit
      FROM power_drop_alert_state pdas
      LEFT JOIN power_drop_alert_configs pdac ON pdas.config_id = pdac.id
      LEFT JOIN metric_mappings mm ON pdac.metric_mapping_id = mm.id
      WHERE pdas.config_id = ?
    `, [id]);
    
    if (state.length === 0) {
      return res.status(404).json({ 
        error: 'Alert state not found',
        code: 'NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: state[0]
    });
    
  } catch (error) {
    logger.error('CRUD', 'Error fetching power drop alert state', { 
      userId: req.user?.id, 
      metadata: { id: req.params.id, error: error.message } 
    });
    res.status(500).json({ 
      error: 'Failed to fetch alert state',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * GET /api/power-drop-alerts/status - Get overall status of all alerts
 * Admin and Manager access
 */
router.get('/status', requireAdminOrManager, async (req, res) => {
  try {
    const [summary] = await req.db.query(`
      SELECT 
        COUNT(*) as total_configs,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_configs,
        COUNT(CASE WHEN is_power_down = TRUE THEN 1 END) as active_alerts,
        COUNT(CASE WHEN is_power_down = TRUE AND alert_count > 0 THEN 1 END) as alerted_stations,
        COUNT(CASE WHEN recovered_at IS NOT NULL THEN 1 END) as recovered_today
      FROM power_drop_alert_configs pdac
      LEFT JOIN power_drop_alert_state pdas ON pdac.id = pdas.config_id
    `);
    
    const [recentAlerts] = await req.db.query(`
      SELECT 
        pdah.*,
        pdac.name as config_name,
        pdac.node_name,
        pdac.base_station_name,
        mm.metric_name
      FROM power_drop_alert_history pdah
      LEFT JOIN power_drop_alert_configs pdac ON pdah.config_id = pdac.id
      LEFT JOIN metric_mappings mm ON pdac.metric_mapping_id = mm.id
      ORDER BY pdah.sent_at DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      summary: summary[0],
      recentAlerts: recentAlerts.map(alert => ({
        ...alert,
        recipient_users: safeJsonParse(alert.recipient_users),
        recipient_emails: safeJsonParse(alert.recipient_emails),
        recipient_phones: safeJsonParse(alert.recipient_phones)
      }))
    });
    
  } catch (error) {
    logger.error('CRUD', 'Error fetching power drop alert status', { 
      userId: req.user?.id, 
      metadata: { error: error.message } 
    });
    res.status(500).json({ 
      error: 'Failed to fetch alert status',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
