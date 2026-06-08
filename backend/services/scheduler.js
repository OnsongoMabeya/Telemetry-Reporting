/**
 * Report Scheduler Service
 * Manages scheduled report generation and email delivery
 */
const cron = require('node-cron');
const logger = require('../utils/logger');
const emailService = require('./emailService');
const reportDataService = require('./reportDataService');
const whatsappService = require('./whatsappService');

// Store active tasks and db reference
const activeTasks = new Map();
let db = null;

// Log WhatsApp configuration status on startup
if (whatsappService.isConfigured()) {
  logger.info('WhatsApp service is configured and ready');
} else {
  logger.info('WhatsApp service not configured - alerts will be email-only. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to enable.');
}

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

    // Start offline site checker — every 15 minutes
    cron.schedule('*/15 * * * *', () => {
      checkOfflineSites().catch(err => logger.error('Offline site check failed:', err));
    }, { scheduled: true, timezone: 'Africa/Nairobi' });

    logger.info('Offline site checker started (every 15 minutes)');
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

// ---------------------------------------------------------------------------
// Offline Site Alert Checker
// Runs every 15 minutes. Sends alerts when base stations stop sending data
// for more than 3 hours. Respects per-config repeat_interval_hours.
// ---------------------------------------------------------------------------
const safeJsonParseArr = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

async function checkOfflineSites() {
  try {
    // Load all active alert configs
    const [configs] = await db.query(
      'SELECT * FROM site_alert_configs WHERE is_active = TRUE'
    );
    if (configs.length === 0) return;

    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const stationNames = configs.map(c => c.base_station_name);
    const placeholders = stationNames.map(() => '?').join(',');

    // Get latest telemetry timestamp for each monitored station
    const [latestRows] = await db.query(
      `SELECT NodeBaseStationName, MAX(time) as last_seen
       FROM node_status_table
       WHERE NodeBaseStationName IN (${placeholders})
       GROUP BY NodeBaseStationName`,
      stationNames
    );
    const lastSeenMap = new Map(latestRows.map(r => [r.NodeBaseStationName, new Date(r.last_seen)]));

    for (const config of configs) {
      const station = config.base_station_name;
      const lastSeen = lastSeenMap.get(station) || null;
      const isOffline = !lastSeen || lastSeen < threeHoursAgo;

      // Load or create state row
      const [stateRows] = await db.query(
        'SELECT * FROM site_alert_state WHERE base_station_name = ?', [station]
      );
      const state = stateRows[0] || null;
      const prevStatus = state ? state.alert_status : 'online';

      // Resolve email recipient list
      const userIds = safeJsonParseArr(config.recipient_users);
      const externalEmails = safeJsonParseArr(config.recipient_emails);
      const recipients = [...externalEmails];

      // Resolve phone number list for WhatsApp
      const externalPhones = safeJsonParseArr(config.recipient_phones);
      const phoneRecipients = [...externalPhones];

      if (userIds.length > 0) {
        const [userRows] = await db.query(
          'SELECT email, phone_number FROM users WHERE id IN (?) AND is_active = TRUE', [userIds]
        );
        recipients.push(...userRows.map(u => u.email));
        // Add phone numbers from users who have them
        userRows.forEach(u => {
          if (u.phone_number) {
            phoneRecipients.push(u.phone_number);
          }
        });
      }

      // Skip if no recipients at all
      if (recipients.length === 0 && phoneRecipients.length === 0) continue;

      if (isOffline) {
        const firstOfflineAt = (state && state.alert_status === 'offline' && state.first_offline_at)
          ? state.first_offline_at
          : (lastSeen || new Date());

        // Determine if we should send: first time or repeat interval elapsed
        const repeatMs = (config.repeat_interval_hours || 4) * 60 * 60 * 1000;
        const lastAlertAt = state && state.last_alert_sent_at ? new Date(state.last_alert_sent_at) : null;
        const shouldSend = !lastAlertAt || (Date.now() - lastAlertAt.getTime() >= repeatMs);

        if (shouldSend) {
          // Find services affected by this station
          const [serviceRows] = await db.query(
            `SELECT DISTINCT s.name
             FROM services s
             INNER JOIN service_metric_assignments sma ON s.id = sma.service_id
             INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
             WHERE mm.base_station_name = ? AND sma.is_active = TRUE AND s.is_active = TRUE`,
            [station]
          );
          const affectedServices = serviceRows.map(r => r.name);

          // Send email alerts
          if (recipients.length > 0) {
            const { sendOfflineAlert } = require('./emailService');
            await sendOfflineAlert({ to: recipients, baseStationName: station, affectedServices, offlineSince: firstOfflineAt });
            logger.info(`Offline email alert sent for ${station}`, { recipients: recipients.length });
          }

          // Send WhatsApp alerts
          if (phoneRecipients.length > 0) {
            const whatsappResults = await whatsappService.sendWhatsAppOfflineAlert({
              to: phoneRecipients,
              baseStationName: station,
              lastDataReceived: firstOfflineAt,
              affectedServices
            });
            const successCount = whatsappResults.filter(r => r.success).length;
            logger.info(`Offline WhatsApp alert sent for ${station}`, {
              phoneRecipients: phoneRecipients.length,
              successCount,
              failedCount: whatsappResults.length - successCount
            });
          }
        }

        // Upsert state
        await db.query(
          `INSERT INTO site_alert_state (base_station_name, alert_status, first_offline_at, last_alert_sent_at, last_checked_at)
           VALUES (?, 'offline', ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             alert_status = 'offline',
             first_offline_at = IF(alert_status = 'offline', first_offline_at, VALUES(first_offline_at)),
             last_alert_sent_at = IF(${shouldSend ? 'TRUE' : 'FALSE'}, VALUES(last_alert_sent_at), last_alert_sent_at),
             last_checked_at = NOW()`,
          [station, firstOfflineAt, shouldSend ? new Date() : (lastAlertAt || new Date())]
        );

      } else {
        // Station is online
        if (prevStatus === 'offline') {
          // Calculate downtime for recovery message
          // Use first_offline_at from state, or fall back to lastSeen (last data received)
          const offlineSince = (state && state.first_offline_at)
            ? new Date(state.first_offline_at)
            : (lastSeen ? new Date(lastSeen) : null);

          let downtimeStr = 'Unknown';
          if (offlineSince) {
            const downtimeMs = Date.now() - offlineSince.getTime();
            const downtimeHours = Math.floor(downtimeMs / (1000 * 60 * 60));
            const downtimeMinutes = Math.floor((downtimeMs % (1000 * 60 * 60)) / (1000 * 60));
            downtimeStr = downtimeHours > 0
              ? `${downtimeHours}h ${downtimeMinutes}m`
              : `${downtimeMinutes}m`;
          }

          // Send recovery email
          if (recipients.length > 0) {
            const { sendRecoveryAlert } = require('./emailService');
            await sendRecoveryAlert({ to: recipients, baseStationName: station, offlineSince });
            logger.info(`Recovery email alert sent for ${station}`, { recipients: recipients.length });
          }

          // Send recovery WhatsApp alerts
          if (phoneRecipients.length > 0) {
            const recoveryResults = await whatsappService.sendWhatsAppRecoveryAlert({
              to: phoneRecipients,
              baseStationName: station,
              lastDataReceived: offlineSince || new Date(),
              downtime: downtimeStr
            });
            const successCount = recoveryResults.filter(r => r.success).length;
            logger.info(`Recovery WhatsApp alert sent for ${station}`, {
              phoneRecipients: phoneRecipients.length,
              successCount,
              failedCount: recoveryResults.length - successCount
            });
          }
        }

        await db.query(
          `INSERT INTO site_alert_state (base_station_name, alert_status, first_offline_at, last_alert_sent_at, last_checked_at)
           VALUES (?, 'online', NULL, NULL, NOW())
           ON DUPLICATE KEY UPDATE
             alert_status = 'online',
             first_offline_at = NULL,
             last_alert_sent_at = NULL,
             last_checked_at = NOW()`,
          [station]
        );
      }
    }
  } catch (error) {
    logger.error('Error in checkOfflineSites:', error);
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
  setDatabase,
  checkOfflineSites
};
