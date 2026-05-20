/**
 * Report Schedules API Routes
 * CRUD operations for scheduled report generation and email delivery
 * Only accessible to admin users
 */
const express = require('express');
const router = express.Router();

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  next();
});

const logger = require('../utils/logger');
const scheduler = require('../services/scheduler');
const emailService = require('../services/emailService');

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
}

// Apply admin check to all routes
router.use(requireAdmin);

/**
 * GET /api/report-schedules
 * Get all report schedules
 */
router.get('/', async (req, res) => {
  try {
    const [schedules] = await db.query(
      `SELECT rs.*, 
              u.email as created_by_email,
              CASE 
                WHEN rs.report_type = 'service' THEN s.name 
                ELSE c.name 
              END as target_name
       FROM report_schedules rs
       LEFT JOIN users u ON rs.created_by = u.id
       LEFT JOIN services s ON rs.report_type = 'service' AND rs.target_id = s.id
       LEFT JOIN clients c ON rs.report_type = 'client' AND rs.target_id = c.id
       ORDER BY rs.created_at DESC`
    );

    // Parse JSON fields safely — MySQL2 may already return JSON columns as parsed arrays
    const safeJsonParse = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return []; }
    };
    const parsedSchedules = schedules.map(schedule => ({
      ...schedule,
      recipient_users: safeJsonParse(schedule.recipient_users),
      recipient_emails: safeJsonParse(schedule.recipient_emails)
    }));

    res.json(parsedSchedules);
  } catch (error) {
    logger.error('Error fetching report schedules:', error);
    res.status(500).json({ error: 'Failed to fetch report schedules' });
  }
});

/**
 * GET /api/report-schedules/:id
 * Get a single report schedule by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [schedules] = await db.query(
      `SELECT rs.*, 
              u.email as created_by_email,
              CASE 
                WHEN rs.report_type = 'service' THEN s.name 
                ELSE c.name 
              END as target_name
       FROM report_schedules rs
       LEFT JOIN users u ON rs.created_by = u.id
       LEFT JOIN services s ON rs.report_type = 'service' AND rs.target_id = s.id
       LEFT JOIN clients c ON rs.report_type = 'client' AND rs.target_id = c.id
       WHERE rs.id = ?`,
      [id]
    );

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const schedule = schedules[0];
    const safeJsonParse = (val) => { if (!val) return []; if (Array.isArray(val)) return val; try { return JSON.parse(val); } catch { return []; } };
    schedule.recipient_users = safeJsonParse(schedule.recipient_users);
    schedule.recipient_emails = safeJsonParse(schedule.recipient_emails);

    res.json(schedule);
  } catch (error) {
    logger.error('Error fetching report schedule:', error);
    res.status(500).json({ error: 'Failed to fetch report schedule' });
  }
});

/**
 * POST /api/report-schedules
 * Create a new report schedule
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      report_type,
      target_id,
      frequency,
      interval_hours,
      daily_time,
      weekly_day,
      weekly_time,
      monthly_day,
      monthly_time,
      custom_cron,
      time_range,
      recipient_users,
      recipient_emails,
      start_date,
      end_date
    } = req.body;

    // Validate required fields
    if (!name || !report_type || !target_id || !frequency || !time_range || !start_date) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'report_type', 'target_id', 'frequency', 'time_range', 'start_date']
      });
    }

    // Validate report type
    if (!['service', 'client'].includes(report_type)) {
      return res.status(400).json({ error: 'Invalid report_type. Must be "service" or "client"' });
    }

    // Calculate next run based on frequency and start date
    const nextRun = calculateInitialNextRun({
      frequency,
      start_date,
      daily_time,
      weekly_day,
      weekly_time,
      monthly_day,
      monthly_time,
      interval_hours
    });

    const scheduleData = {
      name,
      report_type,
      target_id,
      frequency,
      interval_hours: interval_hours || null,
      daily_time: daily_time || null,
      weekly_day: weekly_day !== undefined ? weekly_day : null,
      weekly_time: weekly_time || null,
      monthly_day: monthly_day || null,
      monthly_time: monthly_time || null,
      custom_cron: custom_cron || null,
      time_range,
      recipient_users: JSON.stringify(recipient_users || []),
      recipient_emails: JSON.stringify(recipient_emails || []),
      is_active: true,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : null,
      next_run: nextRun,
      created_by: req.user.id,
      run_count: 0
    };

    const [result] = await db.query('INSERT INTO report_schedules SET ?', scheduleData);
    
    const newScheduleId = result.insertId;

    // Schedule the task
    const newSchedule = { ...scheduleData, id: newScheduleId };
    scheduler.scheduleReport(newSchedule);

    logger.info('Created report schedule:', { id: newScheduleId, name, report_type, target_id });

    res.status(201).json({
      id: newScheduleId,
      message: 'Report schedule created successfully',
      schedule: newSchedule
    });
  } catch (error) {
    logger.error('Error creating report schedule:', error);
    res.status(500).json({ error: 'Failed to create report schedule', details: error.message });
  }
});

/**
 * PUT /api/report-schedules/:id
 * Update an existing report schedule
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Strip fields that are not real DB columns (computed aliases, auto fields)
    const readOnlyFields = ['id', 'created_by', 'created_at', 'run_count', 'last_run',
      'last_run_status', 'last_run_message', 'created_by_email', 'target_name'];
    readOnlyFields.forEach(f => delete updates[f]);

    // Always serialize JSON fields (including empty arrays)
    updates.recipient_users = JSON.stringify(Array.isArray(updates.recipient_users) ? updates.recipient_users : []);
    updates.recipient_emails = JSON.stringify(Array.isArray(updates.recipient_emails) ? updates.recipient_emails : []);

    // Recalculate next_run if frequency or timing changed
    const [existingSchedules] = await db.query(
      'SELECT * FROM report_schedules WHERE id = ?',
      [id]
    );

    if (existingSchedules.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const existing = existingSchedules[0];
    
    // If timing changed, recalculate next run
    if (updates.frequency || updates.daily_time || updates.start_date) {
      updates.next_run = calculateInitialNextRun({
        frequency: updates.frequency || existing.frequency,
        start_date: updates.start_date || existing.start_date,
        daily_time: updates.daily_time || existing.daily_time,
        weekly_day: updates.weekly_day !== undefined ? updates.weekly_day : existing.weekly_day,
        weekly_time: updates.weekly_time || existing.weekly_time,
        monthly_day: updates.monthly_day || existing.monthly_day,
        monthly_time: updates.monthly_time || existing.monthly_time,
        interval_hours: updates.interval_hours || existing.interval_hours
      });
    }

    // Convert empty-string date/datetime fields to null so MySQL doesn't reject them
    const dateFields = ['start_date', 'end_date', 'next_run', 'last_run'];
    dateFields.forEach(f => {
      if (updates[f] === '' || updates[f] === undefined) updates[f] = null;
    });

    updates.updated_at = new Date();

    await db.query('UPDATE report_schedules SET ? WHERE id = ?', [updates, id]);

    // Reschedule the task
    scheduler.updateSchedule(id);

    logger.info('Updated report schedule:', { id, updates });

    res.json({ message: 'Report schedule updated successfully' });
  } catch (error) {
    logger.error('Error updating report schedule:', error);
    res.status(500).json({ error: 'Failed to update report schedule', details: error.message });
  }
});

/**
 * DELETE /api/report-schedules/:id
 * Delete a report schedule
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get schedule name before deleting
    const [schedules] = await db.query(
      'SELECT name FROM report_schedules WHERE id = ?',
      [id]
    );

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const scheduleName = schedules[0].name;

    // Remove from scheduler
    scheduler.removeSchedule(id);

    // Delete from database
    await db.query('DELETE FROM report_schedules WHERE id = ?', [id]);

    logger.info('Deleted report schedule:', { id, name: scheduleName });

    res.json({ message: 'Report schedule deleted successfully' });
  } catch (error) {
    logger.error('Error deleting report schedule:', error);
    res.status(500).json({ error: 'Failed to delete report schedule' });
  }
});

/**
 * POST /api/report-schedules/:id/test
 * Run a scheduled report immediately for testing
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Running test for schedule ${id}`);

    // Respond immediately so nginx doesn't time out on slow PDF generation
    res.json({ message: 'Test report queued — check your email shortly.' });

    // Run in background after response is sent
    scheduler.runScheduleNow(id)
      .then(result => {
        if (result.success) {
          logger.info(`Test schedule ${id} completed`, { recipients: result.recipients, executionTime: result.executionTime });
        } else {
          logger.error(`Test schedule ${id} failed`, { error: result.error });
        }
      })
      .catch(err => {
        logger.error(`Test schedule ${id} threw:`, err);
      });
  } catch (error) {
    logger.error('Error queuing test schedule:', error);
    res.status(500).json({ error: 'Failed to queue test', details: error.message });
  }
});

/**
 * POST /api/report-schedules/test-email
 * Send a test email to verify SMTP configuration
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(503).json({
        error: 'SMTP not configured',
        details: 'Email service is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.'
      });
    }

    const result = await emailService.sendTestEmail(email);

    if (result.success) {
      res.json({ message: 'Test email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ error: 'Failed to send test email', details: result.error });
    }
  } catch (error) {
    logger.error('Error sending test email:', error.message || error);
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

/**
 * GET /api/report-schedules/:id/history
 * Get audit history for a scheduled report
 */
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const [history] = await db.query(
      `SELECT * FROM report_schedule_audit 
       WHERE schedule_id = ? 
       ORDER BY run_at DESC 
       LIMIT ?`,
      [id, parseInt(limit, 10)]
    );

    res.json(history);
  } catch (error) {
    logger.error('Error fetching schedule history:', error);
    res.status(500).json({ error: 'Failed to fetch schedule history' });
  }
});

/**
 * GET /api/report-schedules/status/scheduler
 * Get scheduler status
 */
router.get('/status/scheduler', async (req, res) => {
  try {
    const status = scheduler.getStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error getting scheduler status:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

/**
 * Helper function to calculate initial next run time
 */
function calculateInitialNextRun({ frequency, start_date, daily_time, weekly_day, weekly_time, monthly_day, monthly_time, interval_hours }) {
  const startDate = new Date(start_date);
  const now = new Date();
  
  // If start date is in the future, use that
  if (startDate > now) {
    return startDate;
  }

  // Otherwise calculate next occurrence based on frequency
  let nextRun = new Date(now);

  switch (frequency) {
    case 'hourly':
      const interval = interval_hours || 1;
      nextRun.setHours(now.getHours() + interval);
      nextRun.setMinutes(0, 0, 0);
      break;

    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      if (daily_time) {
        const [hours, minutes] = daily_time.split(':');
        nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      break;

    case 'weekly':
      nextRun.setDate(now.getDate() + 7);
      if (weekly_day !== null && weekly_time) {
        const [hours, minutes] = weekly_time.split(':');
        nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        const currentDay = nextRun.getDay();
        const daysToAdd = (weekly_day - currentDay + 7) % 7;
        nextRun.setDate(nextRun.getDate() + daysToAdd);
      }
      break;

    case 'monthly':
      nextRun.setMonth(now.getMonth() + 1);
      if (monthly_day) {
        nextRun.setDate(monthly_day);
      }
      if (monthly_time) {
        const [hours, minutes] = monthly_time.split(':');
        nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      break;

    default:
      nextRun.setDate(now.getDate() + 1);
  }

  return nextRun;
}

module.exports = router;
