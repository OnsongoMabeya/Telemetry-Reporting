const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CATEGORIES = ['AUTH', 'API', 'SLIDESHOW', 'CRUD', 'SYSTEM'];

let dbPool = null;

/**
 * Initialize the logger with a MySQL pool reference.
 * Must be called once after the DB pool is created in server.js.
 */
function initLogger(poolRef) {
  dbPool = poolRef;
}

/**
 * Format a log entry as structured JSON for console output.
 */
function formatConsole(entry) {
  const { timestamp, level, category, message, userId, ip, metadata } = entry;
  const base = {
    timestamp,
    level,
    category,
    message
  };
  if (userId) base.userId = userId;
  if (ip) base.ip = ip;
  if (metadata && Object.keys(metadata).length > 0) base.metadata = metadata;
  return JSON.stringify(base);
}

/**
 * Insert a log entry into the user_activity_log table.
 * Failures are silently caught to avoid disrupting the app.
 */
async function insertToDB(entry) {
  if (!dbPool) return;
  try {
    await dbPool.query(
      `INSERT INTO user_activity_log (user_id, level, category, action, resource, details, ip_address, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.userId || null,
        entry.level,
        entry.category,
        entry.action || entry.message,
        entry.resource || null,
        entry.details || entry.message,
        entry.ip || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null
      ]
    );
  } catch (err) {
    // Never let a DB logging failure crash the app
    console.error('[Logger] DB insert failed:', err.message);
  }
}

/**
 * Core log function. Outputs structured JSON to console and inserts to DB.
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

  // Console output (structured JSON)
  if (level === 'ERROR') {
    console.error(formatConsole(entry));
  } else if (level === 'WARN') {
    console.warn(formatConsole(entry));
  } else {
    console.log(formatConsole(entry));
  }

  // DB insert (async, non-blocking)
  // Only insert INFO and above to DB to avoid noise
  if (LEVELS[level] >= LEVELS['INFO']) {
    insertToDB(entry);
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
