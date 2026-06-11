/**
 * Power Drop Notification Service
 * 
 * Handles sending email and WhatsApp notifications for power drop alerts
 * and recovery notifications
 */

const logger = require('../utils/logger');
const cacheLogger = require('../utils/cacheLogger');
const emailService = require('./emailService');
const whatsappService = require('./whatsappService');

let db = null;

/**
 * Set database connection
 */
function setDatabase(database) {
  db = database;
}

/**
 * Get database connection
 */
function getDb() {
  if (db) return db;
  const app = require('../server').app;
  return app ? app.get('db') : null;
}

/**
 * Get user details for notifications
 */
async function getUserDetails(userIds) {
  const database = getDb();
  if (!database || !userIds || userIds.length === 0) return [];

  try {
    const [users] = await database.query(
      'SELECT id, username, email, phone_number FROM users WHERE id IN (?) AND is_active = TRUE',
      [userIds]
    );
    return users;
  } catch (error) {
    logger.error('PowerDropNotification', 'Error fetching user details', {
      metadata: { userIds, error: error.message }
    });
    return [];
  }
}

/**
 * Send power drop alert notification
 */
async function sendPowerDropAlert(config, alertData) {
  const database = getDb();
  if (!database) {
    logger.error('PowerDropNotification', 'Database not available');
    return { success: false, error: 'Database not available' };
  }

  try {
    const { previousReading, currentReading, dropPercentage, columnName } = alertData;
    
    // Get user details
    const users = await getUserDetails(config.recipient_users || []);
    
    // Prepare email recipients
    const emailRecipients = [
      ...users.map(u => u.email).filter(Boolean),
      ...(config.recipient_emails || [])
    ].filter(email => email && email.includes('@'));

    // Prepare WhatsApp recipients
    const whatsappRecipients = [
      ...users.map(u => u.phone_number).filter(Boolean),
      ...(config.recipient_phones || [])
    ].filter(phone => phone && phone.length > 0);

    // Format alert time
    const alertTime = new Date(currentReading.timestamp).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Prepare message content
    const emailSubject = `⚠️ Power Drop Alert: ${config.node_name}/${config.base_station_name}`;
    
    const emailBody = `
Power Drop Alert Notification

=====================================
Alert Details:
=====================================
Site: ${config.node_name} / ${config.base_station_name}
Metric: ${config.name} (${columnName})
Alert Time: ${alertTime}

Drop Information:
- Previous Value: ${previousReading.value}
- Current Value: ${currentReading.value}
- Drop Percentage: ${dropPercentage.toFixed(2)}%
- Threshold: ${config.drop_percentage}%

Configuration:
- Time Window: ${config.time_window_seconds} seconds
- Check Interval: ${config.check_interval_seconds} seconds

=====================================
Action Required:
=====================================
Please check the transmission status at ${config.node_name}/${config.base_station_name}.

This is an automated alert from BSI Telemetry Reporting System.
    `.trim();

    // WhatsApp message (shorter format)
    const whatsappMessage = `⚠️ POWER DROP ALERT

${config.name} has dropped by ${dropPercentage.toFixed(1)}% at ${config.node_name}/${config.base_station_name}

Previous: ${previousReading.value}
Current: ${currentReading.value}
Time: ${alertTime}

Please check transmission status.`;

    let emailSent = false;
    let whatsappSent = false;
    let errors = [];

    // Send email if enabled and recipients exist
    if (config.notify_email && emailRecipients.length > 0) {
      try {
        await emailService.sendEmail({
          to: emailRecipients,
          subject: emailSubject,
          text: emailBody
        });
        emailSent = true;
        logger.info('PowerDropNotification', 'Power drop email sent', {
          metadata: { configId: config.id, recipients: emailRecipients.length }
        });
      } catch (error) {
        errors.push(`Email: ${error.message}`);
        logger.error('PowerDropNotification', 'Failed to send power drop email', {
          metadata: { configId: config.id, error: error.message }
        });
      }
    }

    // Send WhatsApp if enabled and recipients exist
    if (config.notify_whatsapp && whatsappRecipients.length > 0 && whatsappService.isConfigured()) {
      try {
        for (const phone of whatsappRecipients) {
          await whatsappService.sendMessage(
            phone,
            whatsappMessage,
            'bsi_power_drop_alert'
          );
        }
        whatsappSent = true;
        logger.info('PowerDropNotification', 'Power drop WhatsApp sent', {
          metadata: { configId: config.id, recipients: whatsappRecipients.length }
        });
      } catch (error) {
        errors.push(`WhatsApp: ${error.message}`);
        logger.error('PowerDropNotification', 'Failed to send power drop WhatsApp', {
          metadata: { configId: config.id, error: error.message }
        });
      }
    }

    // Determine notification method for history
    let notificationMethod = 'none';
    if (emailSent && whatsappSent) notificationMethod = 'both';
    else if (emailSent) notificationMethod = 'email';
    else if (whatsappSent) notificationMethod = 'whatsapp';

    // Update alert history
    await database.query(`
      UPDATE power_drop_alert_history SET
        notification_method = ?,
        status = ?,
        error_message = ?,
        sent_at = NOW()
      WHERE config_id = ? AND alert_type = 'drop' AND status = 'pending'
      ORDER BY sent_at DESC LIMIT 1
    `, [
      notificationMethod,
      (emailSent || whatsappSent) ? 'sent' : 'failed',
      errors.length > 0 ? errors.join('; ') : null,
      config.id
    ]);

    // Update alert state with last sent time
    await database.query(`
      UPDATE power_drop_alert_state SET
        last_alert_sent_at = NOW()
      WHERE config_id = ?
    `, [config.id]);

    cacheLogger.info('Power drop alert processed', {
      configId: config.id,
      nodeName: config.node_name,
      baseStationName: config.base_station_name,
      notificationMethod,
      emailSent,
      whatsappSent,
      emailRecipients: emailRecipients.length,
      whatsappRecipients: whatsappRecipients.length,
      errors: errors.length
    });

    return {
      success: emailSent || whatsappSent,
      notificationMethod,
      emailSent,
      whatsappSent,
      errors: errors.length > 0 ? errors : null
    };

  } catch (error) {
    logger.error('PowerDropNotification', 'Error sending power drop alert', {
      metadata: { configId: config.id, error: error.message }
    });

    // Update history with failure
    try {
      await database.query(`
        UPDATE power_drop_alert_history SET
          status = 'failed',
          error_message = ?,
          sent_at = NOW()
        WHERE config_id = ? AND alert_type = 'drop' AND status = 'pending'
        ORDER BY sent_at DESC LIMIT 1
      `, [error.message, config.id]);
    } catch (historyError) {
      logger.error('PowerDropNotification', 'Failed to update history', {
        metadata: { configId: config.id, error: historyError.message }
      });
    }

    return { success: false, error: error.message };
  }
}

/**
 * Send power recovery notification
 */
async function sendPowerRecoveryAlert(config, recoveryData) {
  const database = getDb();
  if (!database) {
    logger.error('PowerDropNotification', 'Database not available');
    return { success: false, error: 'Database not available' };
  }

  try {
    const { currentReading, columnName, downtimeStarted } = recoveryData;
    
    // Get user details
    const users = await getUserDetails(config.recipient_users || []);
    
    // Prepare email recipients
    const emailRecipients = [
      ...users.map(u => u.email).filter(Boolean),
      ...(config.recipient_emails || [])
    ].filter(email => email && email.includes('@'));

    // Prepare WhatsApp recipients
    const whatsappRecipients = [
      ...users.map(u => u.phone_number).filter(Boolean),
      ...(config.recipient_phones || [])
    ].filter(phone => phone && phone.length > 0);

    // Calculate downtime
    let downtimeMinutes = 0;
    if (downtimeStarted) {
      downtimeMinutes = Math.round((Date.now() - new Date(downtimeStarted).getTime()) / 60000);
    }

    // Format recovery time
    const recoveryTime = new Date(currentReading.timestamp).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Prepare message content
    const emailSubject = `✅ Power Recovery: ${config.node_name}/${config.base_station_name}`;
    
    const emailBody = `
Power Recovery Notification

=====================================
Recovery Details:
=====================================
Site: ${config.node_name} / ${config.base_station_name}
Metric: ${config.name} (${columnName})
Recovery Time: ${alertTime}

Current Status:
- Current Value: ${currentReading.value}
- Downtime: ${downtimeMinutes} minutes

=====================================
Information:
=====================================
The power level has returned to normal operating range.
Transmission at ${config.node_name}/${config.base_station_name} is now stable.

This is an automated recovery notification from BSI Telemetry Reporting System.
    `.trim();

    // WhatsApp message (shorter format)
    const whatsappMessage = `✅ POWER RECOVERY

${config.name} has returned to normal at ${config.node_name}/${config.base_station_name}

Current Value: ${currentReading.value}
Downtime: ${downtimeMinutes} minutes
Time: ${recoveryTime}

Transmission is now stable.`;

    let emailSent = false;
    let whatsappSent = false;
    let errors = [];

    // Send email if enabled and recipients exist
    if (config.notify_email && emailRecipients.length > 0) {
      try {
        await emailService.sendEmail({
          to: emailRecipients,
          subject: emailSubject,
          text: emailBody
        });
        emailSent = true;
        logger.info('PowerDropNotification', 'Power recovery email sent', {
          metadata: { configId: config.id, recipients: emailRecipients.length }
        });
      } catch (error) {
        errors.push(`Email: ${error.message}`);
        logger.error('PowerDropNotification', 'Failed to send power recovery email', {
          metadata: { configId: config.id, error: error.message }
        });
      }
    }

    // Send WhatsApp if enabled and recipients exist
    if (config.notify_whatsapp && whatsappRecipients.length > 0 && whatsappService.isConfigured()) {
      try {
        for (const phone of whatsappRecipients) {
          await whatsappService.sendMessage(
            phone,
            whatsappMessage,
            'bsi_power_recovery_alert'
          );
        }
        whatsappSent = true;
        logger.info('PowerDropNotification', 'Power recovery WhatsApp sent', {
          metadata: { configId: config.id, recipients: whatsappRecipients.length }
        });
      } catch (error) {
        errors.push(`WhatsApp: ${error.message}`);
        logger.error('PowerDropNotification', 'Failed to send power recovery WhatsApp', {
          metadata: { configId: config.id, error: error.message }
        });
      }
    }

    // Determine notification method for history
    let notificationMethod = 'none';
    if (emailSent && whatsappSent) notificationMethod = 'both';
    else if (emailSent) notificationMethod = 'email';
    else if (whatsappSent) notificationMethod = 'whatsapp';

    // Update alert history
    await database.query(`
      UPDATE power_drop_alert_history SET
        notification_method = ?,
        status = ?,
        error_message = ?,
        sent_at = NOW()
      WHERE config_id = ? AND alert_type = 'recovery' AND status = 'pending'
      ORDER BY sent_at DESC LIMIT 1
    `, [
      notificationMethod,
      (emailSent || whatsappSent) ? 'sent' : 'failed',
      errors.length > 0 ? errors.join('; ') : null,
      config.id
    ]);

    cacheLogger.info('Power recovery alert processed', {
      configId: config.id,
      nodeName: config.node_name,
      baseStationName: config.base_station_name,
      notificationMethod,
      emailSent,
      whatsappSent,
      emailRecipients: emailRecipients.length,
      whatsappRecipients: whatsappRecipients.length,
      downtimeMinutes,
      errors: errors.length
    });

    return {
      success: emailSent || whatsappSent,
      notificationMethod,
      emailSent,
      whatsappSent,
      downtimeMinutes,
      errors: errors.length > 0 ? errors : null
    };

  } catch (error) {
    logger.error('PowerDropNotification', 'Error sending power recovery alert', {
      metadata: { configId: config.id, error: error.message }
    });

    // Update history with failure
    try {
      await database.query(`
        UPDATE power_drop_alert_history SET
          status = 'failed',
          error_message = ?,
          sent_at = NOW()
        WHERE config_id = ? AND alert_type = 'recovery' AND status = 'pending'
        ORDER BY sent_at DESC LIMIT 1
      `, [error.message, config.id]);
    } catch (historyError) {
      logger.error('PowerDropNotification', 'Failed to update recovery history', {
        metadata: { configId: config.id, error: historyError.message }
      });
    }

    return { success: false, error: error.message };
  }
}

module.exports = {
  setDatabase,
  sendPowerDropAlert,
  sendPowerRecoveryAlert
};
