/**
 * Power Drop Polling Service
 * 
 * Polls node_status_table every 5 seconds to check for sudden drops in metrics
 * Triggers alerts when metrics drop by configured percentage within time window
 */

const logger = require('../utils/logger');
const cacheLogger = require('../utils/cacheLogger');

let db = null;
let pollingInterval = null;
let isPolling = false;

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
 * Get current metric value for a specific node/station
 */
async function getCurrentMetricValue(nodeName, baseStationName, columnName) {
  const database = getDb();
  if (!database) throw new Error('Database not available');

  const [rows] = await database.query(`
    SELECT ?? as value, time as timestamp
    FROM node_status_table
    WHERE NodeName = ? AND NodeBaseStationName = ?
    ORDER BY time DESC
    LIMIT 1
  `, [columnName, nodeName, baseStationName]);

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get previous metric value within time window
 */
async function getPreviousMetricValue(nodeName, baseStationName, columnName, timeWindowSeconds) {
  const database = getDb();
  if (!database) throw new Error('Database not available');

  const [rows] = await database.query(`
    SELECT ?? as value, time as timestamp
    FROM node_status_table
    WHERE NodeName = ? AND NodeBaseStationName = ?
    AND time >= DATE_SUB(NOW(), INTERVAL ? SECOND)
    AND ?? IS NOT NULL AND ?? != 0
    ORDER BY time DESC
    LIMIT 2
  `, [columnName, nodeName, baseStationName, timeWindowSeconds * 2, columnName, columnName]);

  // Return the second row (previous) if we have at least 2 readings
  return rows.length >= 2 ? rows[1] : null;
}

/**
 * Calculate percentage drop
 */
function calculateDropPercentage(previousValue, currentValue) {
  if (!previousValue || previousValue === 0) return 0;
  if (!currentValue) return 100; // Complete loss
  
  const drop = previousValue - currentValue;
  const percentage = (drop / previousValue) * 100;
  return Math.max(0, percentage); // Can't be negative
}

/**
 * Check for power drop for a single alert config
 */
async function checkPowerDropForConfig(config) {
  const database = getDb();
  if (!database) {
    logger.error('PowerDropPolling', 'Database not available for polling check');
    return;
  }

  try {
    // Get metric column name from metric mapping
    const [metricMappings] = await database.query(
      'SELECT column_name FROM metric_mappings WHERE id = ? AND is_active = TRUE',
      [config.metric_mapping_id]
    );

    if (metricMappings.length === 0) {
      logger.warn('PowerDropPolling', `Invalid metric mapping for config ${config.id}`);
      return;
    }

    const columnName = metricMappings[0].column_name;

    // Get current reading
    const currentReading = await getCurrentMetricValue(
      config.node_name,
      config.base_station_name,
      columnName
    );

    if (!currentReading) {
      // No current data, skip this check
      cacheLogger.debug(`No current data for ${config.node_name}/${config.base_station_name}`, {
        configId: config.id,
        columnName
      });
      return;
    }

    // Get current state for this config
    const [currentState] = await database.query(
      'SELECT * FROM power_drop_alert_state WHERE config_id = ?',
      [config.id]
    );

    const state = currentState.length > 0 ? currentState[0] : null;

    // If we're currently in power down state, check for recovery
    if (state && state.is_power_down) {
      await checkForRecovery(config, state, currentReading, columnName);
      return;
    }

    // Get previous reading for comparison
    const previousReading = await getPreviousMetricValue(
      config.node_name,
      config.base_station_name,
      columnName,
      config.time_window_seconds
    );

    if (!previousReading) {
      // No previous data to compare, update state and continue
      await updateLastReading(config.id, currentReading, columnName);
      return;
    }

    // Calculate drop percentage
    const dropPercentage = calculateDropPercentage(
      previousReading.value,
      currentReading.value
    );

    cacheLogger.debug(`Checked ${config.node_name}/${config.base_station_name}`, {
      configId: config.id,
      columnName,
      previousValue: previousReading.value,
      currentValue: currentReading.value,
      dropPercentage: dropPercentage.toFixed(2),
      threshold: config.drop_percentage
    });

    // Check if drop exceeds threshold
    if (dropPercentage >= config.drop_percentage) {
      await handlePowerDrop(config, state, previousReading, currentReading, dropPercentage, columnName);
    } else {
      // Normal operation, just update last reading
      await updateLastReading(config.id, currentReading, columnName);
    }

  } catch (error) {
    logger.error('PowerDropPolling', 'Error checking power drop for config', {
      metadata: { configId: config.id, error: error.message }
    });
    cacheLogger.error('Polling check failed', {
      configId: config.id,
      error: error.message
    });
  }
}

/**
 * Handle power drop detection
 */
async function handlePowerDrop(config, state, previousReading, currentReading, dropPercentage, columnName) {
  const database = getDb();
  
  try {
    const now = new Date();
    
    // Update or insert alert state
    if (state) {
      await database.query(`
        UPDATE power_drop_alert_state SET
          previous_reading_value = ?,
          previous_reading_time = ?,
          last_reading_value = ?,
          last_reading_time = ?,
          is_power_down = TRUE,
          alert_triggered_at = ?,
          alert_count = 0
        WHERE config_id = ?
      `, [
        previousReading.value,
        previousReading.timestamp,
        currentReading.value,
        currentReading.timestamp,
        now,
        config.id
      ]);
    } else {
      await database.query(`
        INSERT INTO power_drop_alert_state (
          config_id, node_name, base_station_name,
          previous_reading_value, previous_reading_time,
          last_reading_value, last_reading_time,
          is_power_down, alert_triggered_at, alert_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, 0)
      `, [
        config.id, config.node_name, config.base_station_name,
        previousReading.value, previousReading.timestamp,
        currentReading.value, currentReading.timestamp,
        now
      ]);
    }

    // Log to history
    await database.query(`
      INSERT INTO power_drop_alert_history (
        config_id, node_name, base_station_name, alert_type,
        previous_value, current_value, drop_percentage,
        sent_at, notification_method, status
      ) VALUES (?, ?, ?, 'drop', ?, ?, ?, NOW(), 'both', 'pending')
    `, [
      config.id, config.node_name, config.base_station_name,
      previousReading.value, currentReading.value, dropPercentage
    ]);

    logger.warn('PowerDropPolling', `Power drop detected`, {
      metadata: {
        configId: config.id,
        nodeName: config.node_name,
        baseStationName: config.base_station_name,
        columnName,
        dropPercentage: dropPercentage.toFixed(2),
        previousValue: previousReading.value,
        currentValue: currentReading.value
      }
    });

    cacheLogger.info(`Power drop detected: ${dropPercentage.toFixed(2)}%`, {
      configId: config.id,
      nodeName: config.node_name,
      baseStationName: config.base_station_name,
      columnName,
      dropPercentage,
      previousValue: previousReading.value,
      currentValue: currentReading.value
    });

    // Trigger immediate notification (will be handled by notification service)
    const notificationService = require('./powerDropNotificationService');
    await notificationService.sendPowerDropAlert(config, {
      previousReading,
      currentReading,
      dropPercentage,
      columnName
    });

  } catch (error) {
    logger.error('PowerDropPolling', 'Error handling power drop', {
      metadata: { configId: config.id, error: error.message }
    });
  }
}

/**
 * Check for recovery from power down
 */
async function checkForRecovery(config, state, currentReading, columnName) {
  const database = getDb();
  
  try {
    // Calculate current drop from the trigger value
    const dropPercentage = calculateDropPercentage(
      state.previous_reading_value,
      currentReading.value
    );

    // Consider recovered if drop is less than half the threshold
    const recoveryThreshold = config.drop_percentage * 0.5;
    
    if (dropPercentage < recoveryThreshold) {
      // Power has recovered!
      await database.query(`
        UPDATE power_drop_alert_state SET
          last_reading_value = ?,
          last_reading_time = ?,
          is_power_down = FALSE,
          recovered_at = NOW()
        WHERE config_id = ?
      `, [currentReading.value, currentReading.timestamp, config.id]);

      // Log recovery to history
      await database.query(`
        INSERT INTO power_drop_alert_history (
          config_id, node_name, base_station_name, alert_type,
          previous_value, current_value, drop_percentage,
          sent_at, notification_method, status
        ) VALUES (?, ?, ?, 'recovery', ?, ?, ?, NOW(), 'both', 'pending')
      `, [
        config.id, config.node_name, config.base_station_name,
        state.previous_reading_value, currentReading.value, dropPercentage
      ]);

      logger.info('PowerDropPolling', `Power recovery detected`, {
        metadata: {
          configId: config.id,
          nodeName: config.node_name,
          baseStationName: config.base_station_name,
          columnName,
          currentValue: currentReading.value,
          downtimeMinutes: state.alert_triggered_at 
            ? Math.round((Date.now() - new Date(state.alert_triggered_at).getTime()) / 60000)
            : null
        }
      });

      cacheLogger.info(`Power recovery detected`, {
        configId: config.id,
        nodeName: config.node_name,
        baseStationName: config.base_station_name,
        columnName,
        currentValue: currentReading.value,
        downtimeMinutes: state.alert_triggered_at 
          ? Math.round((Date.now() - new Date(state.alert_triggered_at).getTime()) / 60000)
          : null
      });

      // Send recovery notification
      const notificationService = require('./powerDropNotificationService');
      await notificationService.sendPowerRecoveryAlert(config, {
        currentReading,
        columnName,
        downtimeStarted: state.alert_triggered_at
      });
    } else {
      // Still down, update last reading
      await updateLastReading(config.id, currentReading, columnName);
    }

  } catch (error) {
    logger.error('PowerDropPolling', 'Error checking for recovery', {
      metadata: { configId: config.id, error: error.message }
    });
  }
}

/**
 * Update last reading in state
 */
async function updateLastReading(configId, reading, columnName) {
  const database = getDb();
  
  try {
    await database.query(`
      UPDATE power_drop_alert_state SET
        last_reading_value = ?,
        last_reading_time = ?
      WHERE config_id = ?
    `, [reading.value, reading.timestamp, configId]);
  } catch (error) {
    logger.error('PowerDropPolling', 'Error updating last reading', {
      metadata: { configId, error: error.message }
    });
  }
}

/**
 * Main polling function
 */
async function pollPowerDrops() {
  const database = getDb();
  if (!database) {
    logger.error('PowerDropPolling', 'Database not available for polling');
    return;
  }

  try {
    // Get all active alert configs
    const [configs] = await database.query(`
      SELECT pdac.*, mm.column_name
      FROM power_drop_alert_configs pdac
      INNER JOIN metric_mappings mm ON pdac.metric_mapping_id = mm.id
      WHERE pdac.is_active = TRUE
      ORDER BY pdac.id
    `);

    if (configs.length === 0) {
      cacheLogger.debug('No active power drop alert configs to check');
      return;
    }

    // Check each config
    const promises = configs.map(config => checkPowerDropForConfig(config));
    await Promise.all(promises);

    cacheLogger.debug(`Completed polling check for ${configs.length} configs`, {
      totalConfigs: configs.length
    });

  } catch (error) {
    logger.error('PowerDropPolling', 'Error in polling cycle', {
      metadata: { error: error.message }
    });
  }
}

/**
 * Start the polling service
 */
function startPolling(intervalSeconds = 5) {
  if (isPolling) {
    logger.warn('PowerDropPolling', 'Polling already started');
    return;
  }

  isPolling = true;
  
  logger.info('PowerDropPolling', `Starting power drop polling service (${intervalSeconds}s interval)`);
  cacheLogger.info('Power drop polling service started', { intervalSeconds });

  // Start polling
  pollingInterval = setInterval(pollPowerDrops, intervalSeconds * 1000);
  
  // Run first check immediately
  pollPowerDrops();
}

/**
 * Stop the polling service
 */
function stopPolling() {
  if (!isPolling) {
    logger.warn('PowerDropPolling', 'Polling not running');
    return;
  }

  isPolling = false;
  
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  logger.info('PowerDropPolling', 'Power drop polling service stopped');
  cacheLogger.info('Power drop polling service stopped');
}

/**
 * Get polling status
 */
function getPollingStatus() {
  return {
    isPolling,
    interval: pollingInterval ? 'active' : 'stopped'
  };
}

module.exports = {
  setDatabase,
  startPolling,
  stopPolling,
  getPollingStatus,
  pollPowerDrops // Export for manual testing
};
