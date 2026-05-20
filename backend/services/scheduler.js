/**
 * Report Scheduler Service
 * Manages scheduled report generation and email delivery
 */
const cron = require('node-cron');
const logger = require('../utils/logger');
const emailService = require('./emailService');
const reportDataService = require('./reportDataService');

// Store active tasks and db reference
const activeTasks = new Map();
let db = null;

/**
 * Set database connection
 */
function setDatabase(database) {
  db = database;
}

/**
 * Calculate next run time based on schedule configuration
 */
function calculateNextRun(schedule) {
  const now = new Date();
  let nextRun = new Date(now);

  switch (schedule.frequency) {
    case 'hourly':
      nextRun.setHours(now.getHours() + (schedule.interval_hours || 1));
      nextRun.setMinutes(0, 0, 0);
      break;

    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      if (schedule.daily_time) {
        const [hours, minutes] = schedule.daily_time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
      }
      break;

    case 'weekly':
      nextRun.setDate(now.getDate() + 7);
      if (schedule.weekly_day !== null && schedule.weekly_time) {
        const [hours, minutes] = schedule.weekly_time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
        // Adjust to the correct day of week
        const currentDay = nextRun.getDay();
        const daysToAdd = (schedule.weekly_day - currentDay + 7) % 7;
        nextRun.setDate(nextRun.getDate() + daysToAdd);
      }
      break;

    case 'monthly':
      nextRun.setMonth(now.getMonth() + 1);
      if (schedule.monthly_day) {
        nextRun.setDate(schedule.monthly_day);
      }
      if (schedule.monthly_time) {
        const [hours, minutes] = schedule.monthly_time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
      }
      break;

    case 'custom':
      // For custom cron, we just add a default interval
      // The actual cron expression is handled by node-cron
      nextRun.setDate(now.getDate() + 1);
      break;

    default:
      nextRun.setDate(now.getDate() + 1);
  }

  return nextRun;
}

/**
 * Generate cron expression from schedule configuration
 */
function generateCronExpression(schedule) {
  switch (schedule.frequency) {
    case 'hourly':
      const interval = schedule.interval_hours || 1;
      return `0 */${interval} * * *`;

    case 'daily':
      if (schedule.daily_time) {
        const [hours, minutes] = schedule.daily_time.split(':');
        return `${minutes} ${hours} * * *`;
      }
      return '0 0 * * *'; // Default midnight

    case 'weekly':
      if (schedule.weekly_day !== null && schedule.weekly_time) {
        const [hours, minutes] = schedule.weekly_time.split(':');
        return `${minutes} ${hours} * * ${schedule.weekly_day}`;
      }
      return '0 0 * * 0'; // Default Sunday midnight

    case 'monthly':
      if (schedule.monthly_day && schedule.monthly_time) {
        const [hours, minutes] = schedule.monthly_time.split(':');
        return `${minutes} ${hours} ${schedule.monthly_day} * *`;
      }
      return '0 0 1 * *'; // Default 1st of month

    case 'custom':
      return schedule.custom_cron || '0 0 * * *';

    default:
      return '0 0 * * *';
  }
}

/**
 * Generate PDF report based on schedule type
 */
async function generateReport(schedule) {
  try {
    logger.info(`Generating ${schedule.report_type} report for schedule ${schedule.id}`);

    let reportData;
    let reportName;

    if (schedule.report_type === 'service') {
      // Generate service report
      reportData = await reportDataService.generateServiceReportData(
        schedule.target_id,
        schedule.time_range
      );
      
      if (!reportData) {
        throw new Error('Failed to generate service report data');
      }
      
      reportName = `${reportData.reportInfo?.serviceName || 'Service'} Report`;
      
    } else if (schedule.report_type === 'client') {
      // Generate client report and transform to PDF-ready shape (mirrors frontend handleGenerateClientReport)
      const rawClientData = await reportDataService.generateClientReportData(
        schedule.target_id,
        schedule.time_range
      );
      
      if (!rawClientData) {
        throw new Error('Failed to generate client report data');
      }
      
      reportData = reportDataService.transformClientReportForPDF(rawClientData);
      reportName = `${reportData.reportInfo?.clientName || 'Client'} Report`;
    }

    return {
      reportData,
      reportName
    };
  } catch (error) {
    logger.error(`Error generating report for schedule ${schedule.id}:`, error);
    throw error;
  }
}

/**
 * Execute a scheduled report
 */
async function executeSchedule(schedule) {
  const startTime = Date.now();
  const auditData = {
    schedule_id: schedule.id,
    status: 'pending',
    run_at: new Date()
  };

  try {
    logger.info(`Executing scheduled report ${schedule.id}: ${schedule.name}`);

    // Update last run status to pending
    await db.query(
      'UPDATE report_schedules SET last_run_status = ?, last_run = ? WHERE id = ?',
      ['pending', new Date(), schedule.id]
    );

    // Generate report data
    const { reportData, reportName } = await generateReport(schedule);

    // Generate PDF (we'll use the pdfService for this)
    const pdfService = require('./pdfService');
    const pdfBuffer = await pdfService.generateReportPDF(reportData);

    if (!pdfBuffer) {
      throw new Error('Failed to generate PDF');
    }

    // Prepare recipients
    const recipients = [];
    
    // Add system users
    if (schedule.recipient_users && schedule.recipient_users.length > 0) {
      const [users] = await db.query(
        'SELECT email FROM users WHERE id IN (?) AND is_active = TRUE',
        [schedule.recipient_users]
      );
      recipients.push(...users.map(u => u.email));
    }

    // Add external emails
    if (schedule.recipient_emails && schedule.recipient_emails.length > 0) {
      recipients.push(...schedule.recipient_emails);
    }

    if (recipients.length === 0) {
      throw new Error('No recipients configured for this schedule');
    }

    // Generate PDF filename
    const timestamp = new Date().toISOString().split('T')[0];
    const pdfFilename = `${schedule.report_type}_report_${timestamp}.pdf`;

    // Send email
    const emailResult = await emailService.sendScheduledReport({
      to: recipients,
      subject: `BSI Telemetry - ${schedule.name}`,
      reportName,
      scheduleName: schedule.name,
      pdfBuffer,
      pdfFilename,
      greeting: 'Hello,',
      message: `Your scheduled report "${schedule.name}" is now available. This report contains telemetry data and analysis for your equipment monitoring over the past ${schedule.time_range}.`,
      footer: 'Thank you for using BSI Telemetry services.'
    });

    if (!emailResult.success) {
      throw new Error(`Email sending failed: ${emailResult.error}`);
    }

    // Calculate next run
    const nextRun = calculateNextRun(schedule);

    // Check if end date has passed
    const isExpired = schedule.end_date && new Date() > new Date(schedule.end_date);

    // Update schedule status
    await db.query(
      `UPDATE report_schedules 
       SET last_run = ?, last_run_status = ?, last_run_message = ?, 
           next_run = ?, run_count = run_count + 1, is_active = ?
       WHERE id = ?`,
      [
        new Date(),
        'success',
        `Sent to ${recipients.length} recipient(s)`,
        nextRun,
        !isExpired, // Deactivate if expired
        schedule.id
      ]
    );

    // Log to audit
    auditData.status = 'success';
    auditData.recipients_count = recipients.length;
    auditData.pdf_size_bytes = pdfBuffer.length;
    auditData.execution_time_ms = Date.now() - startTime;
    
    await db.query(
      'INSERT INTO report_schedule_audit SET ?',
      auditData
    );

    logger.info(`Schedule ${schedule.id} executed successfully`, {
      recipients: recipients.length,
      executionTime: auditData.execution_time_ms,
      pdfSize: auditData.pdf_size_bytes
    });

    return {
      success: true,
      recipients: recipients.length,
      executionTime: auditData.execution_time_ms
    };

  } catch (error) {
    logger.error(`Schedule ${schedule.id} execution failed:`, error);

    // Update schedule with error status
    await db.query(
      `UPDATE report_schedules 
       SET last_run = ?, last_run_status = ?, last_run_message = ?
       WHERE id = ?`,
      [new Date(), 'failed', error.message, schedule.id]
    );

    // Log failed audit
    auditData.status = 'failed';
    auditData.message = error.message;
    auditData.execution_time_ms = Date.now() - startTime;
    
    await db.query(
      'INSERT INTO report_schedule_audit SET ?',
      auditData
    );

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Schedule a single report
 */
function scheduleReport(schedule) {
  // Cancel existing task if any
  if (activeTasks.has(schedule.id)) {
    activeTasks.get(schedule.id).stop();
    activeTasks.delete(schedule.id);
  }

  if (!schedule.is_active) {
    logger.info(`Schedule ${schedule.id} is inactive, not scheduling`);
    return;
  }

  const cronExpression = generateCronExpression(schedule);
  logger.info(`Scheduling report ${schedule.id} with cron: ${cronExpression}`);

  const task = cron.schedule(cronExpression, async () => {
    await executeSchedule(schedule);
  }, {
    scheduled: true,
    timezone: 'Africa/Nairobi' // Set to local timezone
  });

  activeTasks.set(schedule.id, task);
}

/**
 * Initialize scheduler - load and schedule all active reports
 */
async function initializeScheduler() {
  try {
    logger.info('Initializing report scheduler...');

    // Clear any existing tasks
    for (const [id, task] of activeTasks) {
      task.stop();
    }
    activeTasks.clear();

    // Load all active schedules
    const [schedules] = await db.query(
      `SELECT * FROM report_schedules 
       WHERE is_active = TRUE 
       AND (end_date IS NULL OR end_date > NOW())
       ORDER BY created_at DESC`
    );

    logger.info(`Found ${schedules.length} active scheduled reports`);

    const safeJsonParse = (val) => { if (!val) return []; if (Array.isArray(val)) return val; try { return JSON.parse(val); } catch { return []; } };

    // Schedule each report
    for (const schedule of schedules) {
      // Parse JSON fields
      schedule.recipient_users = safeJsonParse(schedule.recipient_users);
      schedule.recipient_emails = safeJsonParse(schedule.recipient_emails);
      
      scheduleReport(schedule);
    }

    logger.info('Report scheduler initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize scheduler:', error);
  }
}

/**
 * Add or update a scheduled report
 */
async function updateSchedule(scheduleId) {
  try {
    const [schedules] = await db.query(
      'SELECT * FROM report_schedules WHERE id = ?',
      [scheduleId]
    );

    if (schedules.length === 0) {
      logger.warn(`Schedule ${scheduleId} not found`);
      return;
    }

    const schedule = schedules[0];
    
    // Parse JSON fields
    const safeJsonParse = (val) => { if (!val) return []; if (Array.isArray(val)) return val; try { return JSON.parse(val); } catch { return []; } };
    schedule.recipient_users = safeJsonParse(schedule.recipient_users);
    schedule.recipient_emails = safeJsonParse(schedule.recipient_emails);

    // Reschedule
    scheduleReport(schedule);
    
    logger.info(`Schedule ${scheduleId} updated`);
  } catch (error) {
    logger.error(`Failed to update schedule ${scheduleId}:`, error);
  }
}

/**
 * Remove a scheduled report
 */
function removeSchedule(scheduleId) {
  if (activeTasks.has(scheduleId)) {
    activeTasks.get(scheduleId).stop();
    activeTasks.delete(scheduleId);
    logger.info(`Schedule ${scheduleId} removed from scheduler`);
  }
}

/**
 * Get scheduler status
 */
function getStatus() {
  return {
    activeSchedules: activeTasks.size,
    scheduleIds: Array.from(activeTasks.keys())
  };
}

/**
 * Run a schedule immediately (for testing)
 */
async function runScheduleNow(scheduleId) {
  try {
    const [schedules] = await db.query(
      'SELECT * FROM report_schedules WHERE id = ?',
      [scheduleId]
    );

    if (schedules.length === 0) {
      throw new Error('Schedule not found');
    }

    const schedule = schedules[0];
    
    // Parse JSON fields — MySQL2 may already return JSON columns as parsed arrays
    const safeJsonParse = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return []; }
    };
    schedule.recipient_users = safeJsonParse(schedule.recipient_users);
    schedule.recipient_emails = safeJsonParse(schedule.recipient_emails);

    return await executeSchedule(schedule);
  } catch (error) {
    logger.error(`Failed to run schedule ${scheduleId}:`, error);
    throw error;
  }
}

module.exports = {
  initializeScheduler,
  scheduleReport,
  updateSchedule,
  removeSchedule,
  getStatus,
  runScheduleNow,
  executeSchedule,
  calculateNextRun,
  setDatabase
};
