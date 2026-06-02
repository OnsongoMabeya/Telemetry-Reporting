/**
 * Site Alert Routes
 * CRUD for offline-site alert configurations.
 * Each config ties a base station to a recipient list and a repeat interval.
 */
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const whatsappService = require('../services/whatsappService');

let db = null;

function setDatabase(database) {
  db = database;
}

// Safe JSON parse — handles MySQL2 auto-parsed values and raw strings
function safeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

/**
 * GET /api/site-alerts
 * List all site alert configurations with creator email
 */
router.get('/', async (req, res) => {
  try {
    const [configs] = await db.query(
      `SELECT sac.*, u.email as created_by_email
       FROM site_alert_configs sac
       LEFT JOIN users u ON sac.created_by = u.id
       ORDER BY sac.base_station_name ASC`
    );

    const parsed = configs.map(c => ({
      ...c,
      recipient_users: safeJsonArray(c.recipient_users),
      recipient_emails: safeJsonArray(c.recipient_emails)
    }));

    res.json(parsed);
  } catch (error) {
    logger.error('Error fetching site alert configs:', error);
    res.status(500).json({ error: 'Failed to fetch site alert configs', details: error.message });
  }
});

/**
 * GET /api/site-alerts/base-stations
 * Return all distinct base station names known to the system (for the dropdown)
 */
router.get('/base-stations', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT NodeBaseStationName as base_station_name
       FROM node_status_table
       WHERE NodeBaseStationName IS NOT NULL AND NodeBaseStationName != ''
       ORDER BY NodeBaseStationName ASC`
    );
    res.json(rows.map(r => r.base_station_name));
  } catch (error) {
    logger.error('Error fetching base stations:', error);
    res.status(500).json({ error: 'Failed to fetch base stations', details: error.message });
  }
});

/**
 * POST /api/site-alerts
 * Create a new site alert configuration
 */
router.post('/', async (req, res) => {
  try {
    const {
      base_station_name,
      is_active = true,
      repeat_interval_hours = 4,
      recipient_users = [],
      recipient_emails = []
    } = req.body;

    if (!base_station_name) {
      return res.status(400).json({ error: 'base_station_name is required' });
    }

    if (!Number.isInteger(repeat_interval_hours) || repeat_interval_hours < 1) {
      return res.status(400).json({ error: 'repeat_interval_hours must be a positive integer' });
    }

    const [result] = await db.query(
      `INSERT INTO site_alert_configs
         (base_station_name, is_active, repeat_interval_hours, recipient_users, recipient_emails, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        base_station_name,
        is_active,
        repeat_interval_hours,
        JSON.stringify(Array.isArray(recipient_users) ? recipient_users : []),
        JSON.stringify(Array.isArray(recipient_emails) ? recipient_emails : []),
        req.user.id
      ]
    );

    logger.info('Created site alert config:', { id: result.insertId, base_station_name });
    res.status(201).json({ id: result.insertId, message: 'Site alert config created successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `An alert config for "${req.body.base_station_name}" already exists` });
    }
    logger.error('Error creating site alert config:', error);
    res.status(500).json({ error: 'Failed to create site alert config', details: error.message });
  }
});

/**
 * PUT /api/site-alerts/:id
 * Update an existing site alert configuration
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      base_station_name,
      is_active,
      repeat_interval_hours,
      recipient_users,
      recipient_emails
    } = req.body;

    const [existing] = await db.query('SELECT id FROM site_alert_configs WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Site alert config not found' });
    }

    await db.query(
      `UPDATE site_alert_configs
       SET base_station_name    = COALESCE(?, base_station_name),
           is_active            = COALESCE(?, is_active),
           repeat_interval_hours = COALESCE(?, repeat_interval_hours),
           recipient_users      = ?,
           recipient_emails     = ?,
           updated_at           = NOW()
       WHERE id = ?`,
      [
        base_station_name || null,
        is_active !== undefined ? is_active : null,
        repeat_interval_hours || null,
        JSON.stringify(Array.isArray(recipient_users) ? recipient_users : []),
        JSON.stringify(Array.isArray(recipient_emails) ? recipient_emails : []),
        id
      ]
    );

    logger.info('Updated site alert config:', { id });
    res.json({ message: 'Site alert config updated successfully' });
  } catch (error) {
    logger.error('Error updating site alert config:', error);
    res.status(500).json({ error: 'Failed to update site alert config', details: error.message });
  }
});

/**
 * DELETE /api/site-alerts/:id
 * Delete a site alert configuration (also clears its state row)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query(
      'SELECT base_station_name FROM site_alert_configs WHERE id = ?', [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Site alert config not found' });
    }

    const { base_station_name } = existing[0];

    await db.query('DELETE FROM site_alert_configs WHERE id = ?', [id]);
    await db.query('DELETE FROM site_alert_state WHERE base_station_name = ?', [base_station_name]);

    logger.info('Deleted site alert config:', { id, base_station_name });
    res.json({ message: 'Site alert config deleted successfully' });
  } catch (error) {
    logger.error('Error deleting site alert config:', error);
    res.status(500).json({ error: 'Failed to delete site alert config', details: error.message });
  }
});

/**
 * POST /api/site-alerts/run-check
 * Manually trigger the offline checker immediately (for testing).
 * Admin only in production — remove or gate behind role check when done testing.
 */
router.post('/run-check', async (req, res) => {
  try {
    const { checkOfflineSites } = require('../services/scheduler');
    res.json({ message: 'Offline check started in background — watch backend logs.' });
    checkOfflineSites().catch(err => {
      const logger = require('../utils/logger');
      logger.error('Manual offline check failed:', err);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger check', details: error.message });
  }
});

/**
 * POST /api/site-alerts/test-whatsapp
 * Send a test WhatsApp message to verify configuration
 * Body: { phone: "+254712345678" }
 */
router.post('/test-whatsapp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use international format like +254712345678'
      });
    }

    const result = await whatsappService.testConfiguration(phone.trim());

    if (result.success) {
      res.json({
        success: true,
        message: 'Test WhatsApp message sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send test WhatsApp message',
        details: result.error
      });
    }
  } catch (error) {
    logger.error('Error sending test WhatsApp message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test WhatsApp message',
      details: error.message
    });
  }
});

module.exports = { router, setDatabase };
