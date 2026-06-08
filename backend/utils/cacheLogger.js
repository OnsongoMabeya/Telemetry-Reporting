/**
 * Cache Logger
 * Separate logging for column statistics cache operations
 * Writes to: backend/logs/cache_logs_YYYY-MM-DD.jsonl
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Get current date string for filename
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get cache log file path
 */
function getCacheLogFilePath() {
  return path.join(LOG_DIR, `cache_logs_${getDateString()}.jsonl`);
}

/**
 * Format log entry
 */
function formatLogEntry(level, category, message, metadata = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...metadata
  });
}

/**
 * Write to cache log file
 */
function writeToCacheLog(level, category, message, metadata = {}) {
  try {
    const logFile = getCacheLogFilePath();
    const line = formatLogEntry(level, category, message, metadata) + '\n';
    fs.appendFileSync(logFile, line, { encoding: 'utf8' });
  } catch (err) {
    console.error('[CacheLogger] File write failed:', err.message);
  }
}

/**
 * Cache Logger API
 */
const cacheLogger = {
  /**
   * Log cache refresh start
   */
  refreshStart: (metadata = {}) => {
    writeToCacheLog('INFO', 'CACHE_REFRESH', 'Starting column stats cache refresh', metadata);
  },

  /**
   * Log cache refresh progress per node
   */
  nodeProgress: (nodeName, baseStation, progress, total, duration, statsCount) => {
    writeToCacheLog('INFO', 'CACHE_NODE', `Processed ${nodeName}/${baseStation}`, {
      nodeName,
      baseStation,
      progress,
      total,
      duration: `${duration}ms`,
      statsCached: statsCount
    });
  },

  /**
   * Log column-specific stats
   */
  columnStats: (nodeName, baseStation, columnName, columnType, stats) => {
    writeToCacheLog('DEBUG', 'CACHE_COLUMN', `Stats for ${columnName}`, {
      nodeName,
      baseStation,
      columnName,
      columnType,
      hasData: stats.hasData,
      recordCount: stats.recordCount,
      percentage: stats.percentage,
      minValue: stats.minValue,
      maxValue: stats.maxValue,
      avgValue: stats.avgValue
    });
  },

  /**
   * Log cache refresh completion
   */
  refreshComplete: (metadata) => {
    writeToCacheLog('INFO', 'CACHE_REFRESH', 'Cache refresh completed', metadata);
  },

  /**
   * Log cache refresh error
   */
  refreshError: (error, metadata = {}) => {
    writeToCacheLog('ERROR', 'CACHE_REFRESH', error.message, {
      ...metadata,
      error: error.stack
    });
  },

  /**
   * Log API cache hit
   */
  cacheHit: (nodeName, baseStation, columnCount, age) => {
    writeToCacheLog('INFO', 'CACHE_HIT', `Served cached stats for ${nodeName}/${baseStation}`, {
      nodeName,
      baseStation,
      columnCount,
      cacheAge: `${Math.round(age / 1000 / 60)} minutes`
    });
  },

  /**
   * Log API cache miss
   */
  cacheMiss: (nodeName, baseStation, reason) => {
    writeToCacheLog('INFO', 'CACHE_MISS', `Cache miss for ${nodeName}/${baseStation}`, {
      nodeName,
      baseStation,
      reason
    });
  },

  /**
   * Log fallback to schema-only response
   */
  fallbackSchema: (reason) => {
    writeToCacheLog('INFO', 'CACHE_FALLBACK', 'Returning schema-only column names', { reason });
  },

  /**
   * Log manual refresh triggered
   */
  manualRefresh: (userId, username) => {
    writeToCacheLog('INFO', 'CACHE_MANUAL', `Manual cache refresh triggered by ${username}`, {
      userId,
      username
    });
  },

  /**
   * Log cache status check
   */
  statusCheck: (metadata) => {
    writeToCacheLog('DEBUG', 'CACHE_STATUS', 'Cache status checked', metadata);
  },

  /**
   * Generic debug log
   */
  debug: (message, metadata = {}) => {
    writeToCacheLog('DEBUG', 'CACHE', message, metadata);
  },

  /**
   * Generic info log
   */
  info: (message, metadata = {}) => {
    writeToCacheLog('INFO', 'CACHE', message, metadata);
  },

  /**
   * Generic error log
   */
  error: (message, metadata = {}) => {
    writeToCacheLog('ERROR', 'CACHE', message, metadata);
  }
};

module.exports = cacheLogger;
