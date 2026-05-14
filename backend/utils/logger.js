const fs = require('fs');
const path = require('path');

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CATEGORIES = ['AUTH', 'API', 'SLIDESHOW', 'CRUD', 'SYSTEM'];

let dbPool = null;
let currentLogFile = null;
let currentWeekStart = null;

// Log directory - create if not exists
const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Get the Sunday of the current week (week starts on Sunday)
 * Returns date string like '2026-04-26'
 */
function getWeekStartDate() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = now.getDate() - day; // go back to Sunday
  const sunday = new Date(now.setDate(diff));
  return sunday.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get the current log file path based on week
 */
function getLogFilePath() {
  const weekStart = getWeekStartDate();
  return path.join(LOG_DIR, `logs_${weekStart}.jsonl`);
}

/**
 * Ensure we're writing to the correct weekly file
 */
function ensureLogFile() {
  const weekStart = getWeekStartDate();
  if (weekStart !== currentWeekStart) {
    currentWeekStart = weekStart;
    currentLogFile = getLogFilePath();
  }
  return currentLogFile;
}

/**
 * Initialize the logger with a MySQL pool reference.
 * Must be called once after the DB pool is created in server.js.
 */
function initLogger(poolRef) {
  dbPool = poolRef;
}

/**
 * Format a log entry as structured JSON.
 */
function formatLogEntry(entry) {
  const { timestamp, level, category, message, userId, ip, metadata } = entry;
  // Convert Error objects to string
  let msg = message;
  if (message instanceof Error) {
    msg = message.message;
  } else if (typeof message === 'object' && message !== null) {
    msg = JSON.stringify(message);
  }
  const base = {
    timestamp,
    level,
    category,
    message: msg
  };
  if (userId) base.userId = userId;
  if (ip) base.ip = ip;
  if (metadata && Object.keys(metadata).length > 0) base.metadata = metadata;
  return JSON.stringify(base);
}

/**
 * Write log entry to weekly file.
 */
function writeToFile(entry) {
  try {
    const logFile = ensureLogFile();
    const line = formatLogEntry(entry) + '\n';
    fs.appendFileSync(logFile, line, { encoding: 'utf8' });
  } catch (err) {
    // Fallback to console only if file write fails
    console.error('[Logger] File write failed:', err.message);
    console.error(formatLogEntry(entry));
  }
}

/**
 * Insert a log entry into the user_activity_log table.
 * Failures are silently caught to avoid disrupting the app.
 */
async function insertToDB(entry) {
  if (!dbPool) return;
  try {
    // Ensure all values are strings (not objects) and truncate if needed
    let action = typeof (entry.action || entry.message) === 'object' 
      ? JSON.stringify(entry.action || entry.message) 
      : (entry.action || entry.message);
    // Truncate to fit database columns (action: 50 chars, details: 255 chars)
    action = action ? action.substring(0, 50) : '';
    
    let details = typeof (entry.details || entry.message) === 'object' 
      ? JSON.stringify(entry.details || entry.message) 
      : (entry.details || entry.message);
    details = details ? details.substring(0, 255) : '';
    
    await dbPool.query(
      `INSERT INTO user_activity_log (user_id, level, category, action, resource, details, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.userId || null,
        entry.level,
        entry.category,
        action,
        entry.resource || null,
        details,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ip || null
      ]
    );
  } catch (err) {
    // Never let a DB logging failure crash the app
    console.error('[Logger] DB insert failed:', err.message);
  }
}

/**
 * Core log function. Writes to weekly file and inserts to DB.
 *
 * @param {string} level   - DEBUG | INFO | WARN | ERROR
 * @param {string} category - AUTH | API | SLIDESHOW | CRUD | SYSTEM
 * @param {string} message - Human-readable log message
 * @param {object} options - Optional: { userId, ip, action, resource, details, metadata }
 */
function log(level, category, message, options = {}) {
  if (!LEVELS[level]) level = 'INFO';
  if (!CATEGORIES.includes(category)) category = 'SYSTEM';

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    userId: options.userId || null,
    ip: options.ip || null,
    action: options.action || null,
    resource: options.resource || null,
    details: options.details || null,
    metadata: options.metadata || null
  };

  // Write to weekly log file (primary output)
  writeToFile(entry);

  // DB insert (async, non-blocking)
  // Only insert INFO and above to DB to avoid noise
  if (LEVELS[level] >= LEVELS['INFO']) {
    insertToDB(entry);
  }

  // Optional: Also log errors to console for immediate visibility (can be disabled)
  // Set LOG_TO_CONSOLE=false in .env to disable
  if (process.env.LOG_TO_CONSOLE === 'true' || level === 'ERROR') {
    const formatted = formatLogEntry(entry);
    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }
}

// Convenience methods
const logger = {
  init: initLogger,

  debug: (category, message, options) => log('DEBUG', category, message, options),
  info:  (category, message, options) => log('INFO',  category, message, options),
  warn:  (category, message, options) => log('WARN',  category, message, options),
  error: (category, message, options) => log('ERROR', category, message, options),

  // Auth-specific shorthand
  auth: {
    login:        (username, options) => log('INFO', 'AUTH', `User ${username} logged in`, { ...options, action: 'LOGIN' }),
    logout:       (username, options) => log('INFO', 'AUTH', `User ${username} logged out`, { ...options, action: 'LOGOUT' }),
    tokenRefresh: (username, options) => log('INFO', 'AUTH', `Token refreshed for ${username}`, { ...options, action: 'TOKEN_REFRESH' }),
    failedLogin:  (username, reason, options) => log('WARN', 'AUTH', `Failed login attempt for ${username}: ${reason}`, { ...options, action: 'LOGIN_FAILED' }),
    tokenExpired: (username, options) => log('WARN', 'AUTH', `Token expired for ${username}`, { ...options, action: 'TOKEN_EXPIRED' }),
    tokenInvalid: (options) => log('WARN', 'AUTH', 'Invalid token presented', { ...options, action: 'TOKEN_INVALID' }),
    noToken:      (options) => log('WARN', 'AUTH', 'No token provided', { ...options, action: 'NO_TOKEN' }),
  },

  // API request shorthand
  api: {
    request: (method, path, options) => log('INFO', 'API', `${method} ${path}`, { ...options, action: 'REQUEST', metadata: { method, path, ...(options.metadata || {}) } }),
    response: (method, path, status, duration, options) => log('INFO', 'API', `${method} ${path} → ${status} (${duration}ms)`, { ...options, action: 'RESPONSE', metadata: { method, path, status, duration, ...(options.metadata || {}) } }),
    error: (method, path, status, options) => log('ERROR', 'API', `${method} ${path} → ${status}`, { ...options, action: 'API_ERROR', metadata: { method, path, status, ...(options.metadata || {}) } }),
  },

  // Slideshow shorthand
  slideshow: {
    start:       (options) => log('INFO', 'SLIDESHOW', 'Slideshow started', { ...options, action: 'SLIDESHOW_START' }),
    stop:        (options) => log('INFO', 'SLIDESHOW', 'Slideshow stopped', { ...options, action: 'SLIDESHOW_STOP' }),
    switch:      (serviceId, options) => log('INFO', 'SLIDESHOW', `Switched to service ${serviceId}`, { ...options, action: 'SLIDESHOW_SWITCH', metadata: { serviceId, ...(options.metadata || {}) } }),
    keepAlive:   (username, options) => log('DEBUG', 'SLIDESHOW', `Keep-alive ping for ${username}`, { ...options, action: 'KEEP_ALIVE' }),
    connError:   (options) => log('WARN', 'SLIDESHOW', 'Connection error during slideshow', { ...options, action: 'CONNECTION_ERROR' }),
    connRestore: (options) => log('INFO', 'SLIDESHOW', 'Connection restored during slideshow', { ...options, action: 'CONNECTION_RESTORED' }),
  },

  // CRUD shorthand
  crud: {
    create: (resource, id, options) => log('INFO', 'CRUD', `Created ${resource} id=${id}`, { ...options, action: 'CREATE', resource, metadata: { id, ...(options.metadata || {}) } }),
    update: (resource, id, options) => log('INFO', 'CRUD', `Updated ${resource} id=${id}`, { ...options, action: 'UPDATE', resource, metadata: { id, ...(options.metadata || {}) } }),
    delete: (resource, id, options) => log('INFO', 'CRUD', `Deleted ${resource} id=${id}`, { ...options, action: 'DELETE', resource, metadata: { id, ...(options.metadata || {}) } }),
    read:   (resource, options) => log('DEBUG', 'CRUD', `Read ${resource}`, { ...options, action: 'READ', resource }),
  }
};

module.exports = logger;
