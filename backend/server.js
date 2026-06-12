const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const NodeCache = require('node-cache');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import routes
const emailRoutes = require('./routes/email');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const nodeAssignmentsRoutes = require('./routes/nodeAssignments');
const metricMappingsRoutes = require('./routes/metricMappings');
const metricViewSettingsRoutes = require('./routes/metricViewSettings');
const telemetryMappingsRoutes = require('./routes/telemetryMappings');
const clientsRoutes = require('./routes/clients');
const servicesRoutes = require('./routes/services');
const userClientAssignmentsRoutes = require('./routes/userClientAssignments');
const mySitesRoutes = require('./routes/mySites');
const serviceReportsRoutes = require('./routes/serviceReports');
const reportSchedulesRoutes = require('./routes/reportSchedules');
const { router: siteAlertsRouter, setDatabase: setSiteAlertsDb } = require('./routes/siteAlerts');
const powerDropAlertsRoutes = require('./routes/powerDropAlerts');
const manualReportsRoutes = require('./routes/manualReports');
const { authenticateToken } = require('./middleware/auth');
const logger = require('./utils/logger');

// Helper function to get cache TTL based on time filter
const getCacheTTL = (timeFilter) => {
  switch (timeFilter) {
    case '5m': return 30;  // 30 seconds for 5m data
    case '10m': return 60;  // 1 minute for 10m data
    case '30m': return 120; // 2 minutes for 30m data
    case '1h': return 300;  // 5 minutes for 1h data
    default: return 600;    // 10 minutes for longer ranges
  }
};

// Initialize cache with default 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Validate time filter
const isValidTimeFilter = (timeFilter) => {
  const validFilters = ['5m', '10m', '30m', '1h', '2h', '6h', '1d', '2d', '5d', '1w', '2w', '30d'];
  return validFilters.includes(timeFilter);
};

const app = express();

// Load environment variables
require('dotenv').config();

// Trust proxy - required when behind nginx reverse proxy
// Use 'loopback' instead of true to prevent rate limiter bypass
app.set('trust proxy', 'loopback');

// Enable CORS for all routes
app.use((req, res, next) => {
  // Get allowed origins from environment variable
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : [];
    
  const origin = req.headers.origin;
  
  // Allow requests from configured origins OR from nginx proxy (no origin header)
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  // Allow all methods
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  // Allow all headers the client might send
  res.header('Access-Control-Allow-Headers', [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'Expires',
    'If-Modified-Since',
    'X-HTTP-Method-Override'
  ].join(', '));
  
  // Allow credentials
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    // Return 204 No Content for preflight requests
    return res.status(204).end();
  }
  
  next();
});
app.use(express.json());

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // limit each IP to 300 requests per windowMs (monitoring dashboard fetches 14+ metrics concurrently)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Trust the X-Forwarded-For header from nginx
  validate: {trustProxy: false}
});

// Apply rate limiting to all routes
app.use(limiter);

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    logger.error('SYSTEM', 'Error connecting to the database', { metadata: { error: err.message } });
    return;
  }
  logger.info('SYSTEM', 'Successfully connected to database');
  connection.release();
});

// Make database connection available to routes
app.set('db', pool.promise());

// Initialize structured logger with DB pool
logger.init(pool.promise());

// File upload limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== API REQUEST LOGGING MIDDLEWARE ==========
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const path = req.originalUrl;
    const status = res.statusCode;

    // Extract user info from JWT if available
    let userId = null;
    let username = 'unknown';
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.decode(token);
        userId = decoded?.id || null;
        username = decoded?.username || 'unknown';
      } catch (e) { /* not a valid JWT, ignore */ }
    }

    // Skip health-check noise
    if (path === '/api/keep-alive' && status < 400) {
      logger.slideshow.keepAlive(username, { userId, ip: req.ip, metadata: { status, duration } });
      return;
    }

    if (status >= 400) {
      logger.api.error(method, path, status, { userId, ip: req.ip, metadata: { duration } });
    } else {
      logger.api.response(method, path, status, duration, { userId, ip: req.ip });
    }
  });

  next();
});

// Email routes
app.use('/api', emailRoutes);

// Auth routes (public)
app.use('/api/auth', authRoutes);

// User management routes (protected)
app.use('/api/users', authenticateToken, usersRoutes);

// Node assignments routes (protected)
app.use('/api/node-assignments', authenticateToken, nodeAssignmentsRoutes);

// Metric mappings routes (protected)
app.use('/api/metric-mappings', authenticateToken, metricMappingsRoutes);

// Metric view settings routes (protected)
app.use('/api/metric-view-settings', authenticateToken, metricViewSettingsRoutes);

// Telemetry mappings routes (protected)
app.use('/api/telemetry-mappings', authenticateToken, telemetryMappingsRoutes);

// My Sites routes (protected)
app.use('/api/clients', authenticateToken, clientsRoutes);
app.use('/api/services', authenticateToken, servicesRoutes);
app.use('/api/user-client-assignments', authenticateToken, userClientAssignmentsRoutes);
app.use('/api/my-sites', authenticateToken, mySitesRoutes);
app.use('/api', authenticateToken, serviceReportsRoutes);
app.use('/api/report-schedules', authenticateToken, reportSchedulesRoutes);
app.use('/api/site-alerts', authenticateToken, siteAlertsRouter);
app.use('/api/power-drop-alerts', authenticateToken, powerDropAlertsRoutes);
app.use('/api/manual-reports', manualReportsRoutes);

// Keep-alive endpoint for slideshow session management (with token refresh)
// Accepts expired tokens within a grace period so the session can be renewed
app.get('/api/keep-alive', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.auth.noToken({ ip: req.ip });
    return res.status(401).json({ error: 'No token provided.', code: 'NO_TOKEN' });
  }

  try {
    // First try normal verification (token still valid)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.auth.tokenRefresh(decoded.username, { userId: decoded.id, ip: req.ip });
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30;
    const newToken = jwt.sign(
      { id: decoded.id, username: decoded.username, email: decoded.email, role: decoded.role, loginTime: decoded.loginTime },
      process.env.JWT_SECRET,
      { expiresIn: `${sessionTimeout}m` }
    );
    return res.json({ success: true, timestamp: Date.now(), token: newToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // Token expired — check if within grace period (2x session timeout)
      try {
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
          logger.auth.tokenInvalid({ ip: req.ip });
          return res.status(401).json({ error: 'Invalid token.', code: 'INVALID_TOKEN' });
        }

        const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30;
        const gracePeriodMs = sessionTimeout * 60 * 1000 * 2; // 2x session timeout
        const expiredAt = decoded.exp * 1000;
        const now = Date.now();
        const timeSinceExpiry = now - expiredAt;

        if (timeSinceExpiry > gracePeriodMs) {
          logger.auth.tokenExpired(decoded.username, { userId: decoded.id, ip: req.ip, metadata: { expiredAt: new Date(expiredAt).toISOString(), timeSinceExpiry, gracePeriodMs } });
          return res.status(401).json({ error: 'Token expired beyond grace period. Please login again.', code: 'TOKEN_EXPIRED' });
        }

        // Within grace period — issue a fresh token
        logger.auth.tokenRefresh(decoded.username, { userId: decoded.id, ip: req.ip, metadata: { gracePeriodRefresh: true, expiredAt: new Date(expiredAt).toISOString() } });
        const newToken = jwt.sign(
          { id: decoded.id, username: decoded.username, email: decoded.email, role: decoded.role, loginTime: decoded.loginTime },
          process.env.JWT_SECRET,
          { expiresIn: `${sessionTimeout}m` }
        );
        return res.json({ success: true, timestamp: Date.now(), token: newToken });
      } catch (decodeError) {
        logger.auth.tokenInvalid({ ip: req.ip, metadata: { error: decodeError.message } });
        return res.status(401).json({ error: 'Invalid token.', code: 'INVALID_TOKEN' });
      }
    }

    logger.auth.tokenInvalid({ ip: req.ip, metadata: { error: error.name } });
    return res.status(401).json({ error: 'Invalid token.', code: 'INVALID_TOKEN' });
  }
});

// Routes
app.get('/api/nodes', authenticateToken, async (req, res) => {
  try {
    // Check if user has access to all nodes or specific assignments
    const [userAccess] = await pool.promise().query(
      'SELECT access_all_nodes, role FROM users WHERE id = ?',
      [req.user.id]
    );

    let nodes;
    
    if (userAccess[0].access_all_nodes || userAccess[0].role === 'admin') {
      // User has access to all nodes
      const [rows] = await pool.promise().query('SELECT DISTINCT NodeName FROM node_status_table ORDER BY NodeName');
      nodes = rows.map(row => ({
        id: row.NodeName,
        name: row.NodeName
      }));
    } else {
      // User has access to assigned nodes only
      const [rows] = await pool.promise().query(
        `SELECT DISTINCT nst.NodeName 
         FROM node_status_table nst
         INNER JOIN user_node_assignments una ON nst.NodeName = una.node_name
         WHERE una.user_id = ?
         ORDER BY nst.NodeName`,
        [req.user.id]
      );
      nodes = rows.map(row => ({
        id: row.NodeName,
        name: row.NodeName
      }));
    }
    
    res.json(nodes);
  } catch (error) {
    logger.error('CRUD', 'Error fetching nodes for dropdown', { metadata: { error: error.message } });
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/basestations/:nodeName', authenticateToken, async (req, res) => {
  const { nodeName } = req.params;
  try {
    const [rows] = await pool.promise().query(
      'SELECT DISTINCT NodeBaseStationName FROM node_status_table WHERE NodeName = ?',
      [nodeName]
    );
    
    const baseStations = rows.map(row => ({
      id: row.NodeBaseStationName,
      name: row.NodeBaseStationName
    }));
    
    res.json(baseStations);
  } catch (error) {
    logger.error('CRUD', 'Error fetching base stations', { metadata: { error: error.message } });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Maximum time range in milliseconds (30 days)
const maxTimeRangeMs = 30 * 24 * 60 * 60 * 1000;

// Helper function to calculate optimal number of data points based on time range
const calculateDataPoints = (minutes) => {
  if (minutes <= 15) return 60;        // High resolution for very short ranges
  if (minutes <= 60) return 120;       // 2 points per minute for 1h
  if (minutes <= 360) return 180;      // 1 point per 2 minutes for 6h
  if (minutes <= 1440) return 240;     // 1 point per 6 minutes for 1d
  if (minutes <= 4320) return 200;     // 1 point per 21.6 minutes for 3d
  if (minutes <= 10080) return 210;    // 1 point per 48 minutes for 1w
  return 200;                          // Cap at 200 points for very long ranges
};

// Helper function to get telemetry data with pagination
const getTelemetryData = async (pool, nodeName, baseStation, timeFilter, page = 1, pageSize = 500) => {
  // First, fetch the metric mappings for this node/base station
  const [mappings] = await pool.promise().query(
    `SELECT id, metric_name, column_name, unit, display_order, color, min_value, max_value
     FROM metric_mappings 
     WHERE node_name = ? AND base_station_name = ? AND is_active = 1
     ORDER BY display_order`,
    [nodeName, baseStation]
  );

  // If no mappings exist, return empty data
  if (!mappings || mappings.length === 0) {
    logger.debug('CRUD', 'No metric mappings found', { metadata: { nodeName, baseStation } });
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 0
    };
  }

    logger.debug('CRUD', 'Found metric mappings', { metadata: { mappingsCount: mappings.length } });

  // Set time range based on filter
  let timeRangeMinutes;
  let samplingInterval;
  
  switch (timeFilter) {
    case '5m': 
      timeRangeMinutes = 5;
      samplingInterval = '10 SECOND';
      break;
    case '10m':
      timeRangeMinutes = 10;
      samplingInterval = '15 SECOND';
      break;
    case '30m':
      timeRangeMinutes = 30;
      samplingInterval = '30 SECOND';
      break;
    case '1h':
      timeRangeMinutes = 60;
      samplingInterval = '1 MINUTE';
      break;
    case '2h':
      timeRangeMinutes = 120;
      samplingInterval = '2 MINUTE';
      break;
    case '6h':
      timeRangeMinutes = 360;
      samplingInterval = '5 MINUTE';
      break;
    case '1d':
      timeRangeMinutes = 1440;
      samplingInterval = '15 MINUTE';
      break;
    case '2d':
      timeRangeMinutes = 2880;
      samplingInterval = '30 MINUTE';
      break;
    case '5d':
      timeRangeMinutes = 7200;
      samplingInterval = '1 HOUR';
      break;
    case '1w':
      timeRangeMinutes = 10080;
      samplingInterval = '2 HOUR';
      break;
    case '2w':
      timeRangeMinutes = 20160;
      samplingInterval = '4 HOUR';
      break;
    case '30d':
      timeRangeMinutes = 43200;
      samplingInterval = '6 HOUR';
      break;
    default:
      timeRangeMinutes = 60;
      samplingInterval = '1 MINUTE';
  }
  
  const offset = (page - 1) * pageSize;
  
  // Set timezone for this session to ensure consistent time handling
  await pool.promise().query(`SET time_zone = '+03:00'`);
  
  // First, get the time range of available data for this node and base station
  const timeRangeQuery = `
    SELECT 
      CONVERT_TZ(MIN(time), @@session.time_zone, '+03:00') as earliest_time,
      CONVERT_TZ(MAX(time), @@session.time_zone, '+03:00') as latest_time
    FROM node_status_table
    WHERE NodeName = ? AND NodeBaseStationName = ?
  `;

    logger.debug('CRUD', 'Fetching time range', { metadata: { nodeName, baseStation } });
  const [[timeRange]] = await pool.promise().query(timeRangeQuery, [nodeName, baseStation]);
  
    logger.debug('CRUD', 'Available time range in database', { metadata: { earliest: timeRange.earliest_time, latest: timeRange.latest_time } });

  // If no data is found, return empty result
  if (!timeRange.earliest_time || !timeRange.latest_time) {
    logger.debug('CRUD', 'No data found for specified node/base station', { metadata: { nodeName, baseStation } });
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 0
    };
  }

  // Calculate time range based on the filter
  const endTime = new Date(timeRange.latest_time);
  const startTime = new Date(endTime.getTime() - (timeRangeMinutes * 60 * 1000));
  
  logger.debug('CRUD', 'Calculated query time range', { metadata: { startTime: startTime.toISOString(), endTime: endTime.toISOString(), timeRangeMinutes } });

  // Calculate optimal number of data points and time step
  const dataPointCount = calculateDataPoints(timeRangeMinutes);
  const timeStep = Math.max(1, Math.ceil(timeRangeMinutes / (dataPointCount / 2)));
  
  logger.debug('CRUD', 'Sampling configuration', { metadata: { dataPointCount, timeStepMinutes: timeStep } });

  // Build dynamic column selections based on metric mappings
  const columnSelections = mappings.map(m => 
    `ROUND(AVG(${m.column_name}), 2) as \`${m.metric_name}\``
  ).join(',\n        ');

  const columnNames = mappings.map(m => `\`${m.metric_name}\``).join(',\n      ');

  const query = `
    WITH time_buckets AS (
      SELECT 
        -- Convert to EAT timezone and round to nearest time step
        DATE_FORMAT(
          CONVERT_TZ(
            FROM_UNIXTIME(
              FLOOR(UNIX_TIMESTAMP(time) / (${timeStep} * 60)) * (${timeStep} * 60)
            ),
            @@session.time_zone,
            '+03:00'
          ),
          '%Y-%m-%d %H:%i:00'
        ) as bucket_start,
        ${columnSelections},
        COUNT(*) as sample_count
      FROM node_status_table
      WHERE NodeName = ?
        AND NodeBaseStationName = ?
        AND time BETWEEN ? AND ?
      GROUP BY bucket_start
      HAVING sample_count > 0
      ORDER BY bucket_start DESC
      LIMIT ? OFFSET ?
    )
    SELECT 
      bucket_start as sample_time,
      ${columnNames}
    FROM time_buckets
    ORDER BY sample_time ASC  -- Return in chronological order for the chart
  `;

  // More accurate count query that matches the main query's time bucketing
  const countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT 1
      FROM node_status_table
      WHERE NodeName = ?
        AND NodeBaseStationName = ?
        AND time BETWEEN ? AND ?
      GROUP BY FLOOR(UNIX_TIMESTAMP(time) / (${timeStep} * 60))
    ) as time_buckets
  `;

  logger.debug('CRUD', 'Executing queries with params', { metadata: { timeRangeMinutes, nodeName, baseStation } });

  logger.debug('CRUD', 'Query preview', { metadata: { queryPreview: query.substring(0, 200) } });

  // Define max time range (30 days in milliseconds)
  const maxTimeRangeMs = 30 * 24 * 60 * 60 * 1000;
  
  // Calculate the actual time range we're querying
  const actualEndTime = new Date(timeRange.latest_time);
  const actualStartTime = new Date(actualEndTime.getTime() - (Math.min(timeRangeMinutes * 60 * 1000, maxTimeRangeMs)));
  
  logger.debug('CRUD', 'Query parameters', { metadata: { nodeName, baseStation, timeStep } });

  // Execute the queries with proper parameter binding
  const queryParams = [
    nodeName,
    baseStation,
    actualStartTime,
    actualEndTime,
    pageSize,
    offset
  ];

  const countParams = [
    nodeName,
    baseStation,
    actualStartTime,
    actualEndTime
  ];

  logger.debug('CRUD', 'Executing queries', { metadata: { queryParamsCount: queryParams.length } });

  const [[{ total }], data] = await Promise.all([
    pool.promise().query(countQuery, countParams),
    pool.promise().query(query, queryParams)
  ]);
  
  // Debug time range of returned data
  if (data[0].length > 0) {
    const returnedData = data[0];
    logger.debug('CRUD', 'Returned data time range', { metadata: { pointsReturned: returnedData.length, requestedMinutes: timeRangeMinutes } });
  }

  return {
    data: data[0],
    metricMappings: mappings,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
};

// Get all available nodes
app.get('/api/nodes', async (req, res) => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const [rows] = await pool.promise().query('SELECT DISTINCT node_name as id, node_name as name FROM telemetry_data ORDER BY node_name');
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No nodes found' });
    }

    res.json(rows);
  } catch (error) {
    logger.error('CRUD', 'Error fetching nodes', { metadata: { error: error.message } });
    res.status(500).json({ error: 'Failed to fetch nodes', details: error.message });
  }
});

// Telemetry data endpoint
app.get('/api/telemetry/:nodeName/:baseStation', authenticateToken, async (req, res) => {
  const { nodeName, baseStation } = req.params;
  const { timeFilter = '1h', page = 1, pageSize = 200 } = req.query; // Increased default pageSize
  
  const requestId = Math.random().toString(36).substring(2, 9);
  const startTime = Date.now();
  
  // Create a cache key based on the request parameters
  const cacheKey = `telemetry:${nodeName}:${baseStation}:${timeFilter}:${page}:${pageSize}`;
  const ttl = getCacheTTL(timeFilter);
  
  logger.api.request('GET', `/api/telemetry/${nodeName}/${baseStation}`, { ip: req.ip, metadata: { timeFilter, requestId } });

  // Try to get cached data first
  try {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      const duration = Date.now() - startTime;
      logger.debug('API', 'Cache hit', { metadata: { requestId, duration, recordsReturned: cachedData.data?.length || 0 } });
      
      res.set({
        'X-Response-Time': `${duration}ms`,
        'X-Cache': 'HIT',
        'X-Request-Id': requestId
      });
      
      return res.json(cachedData);
    }
  } catch (cacheError) {
    logger.warn('API', 'Cache check failed', { metadata: { requestId, error: cacheError.message } });
    // Continue with fresh data if cache check fails
  }
  
  // Validate time filter
  if (!isValidTimeFilter(timeFilter)) {
    const errorMsg = `Invalid time filter: ${timeFilter}`;
    logger.error('API', `Invalid time filter: ${timeFilter}`, { metadata: { requestId } });
    return res.status(400).json({ 
      error: `Invalid time filter. Must be one of: 5m, 10m, 30m, 1h, 2h, 6h, 1d, 2d, 5d, 1w, 2w, 30d`,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Execute the query
    const queryStart = Date.now();
    const data = await getTelemetryData(pool, nodeName, baseStation, timeFilter, parseInt(page), parseInt(pageSize));
    
    const duration = Date.now() - startTime;
    
    logger.api.response('GET', `/api/telemetry/${nodeName}/${baseStation}`, 200, duration, { metadata: { requestId, recordsReturned: data.data?.length || 0, totalRecords: data.total } });

    // Log successful response
    res.set({
      'X-Response-Time': `${duration}ms`,
      'X-Query-Time': `${duration}ms`,
      'X-Cache': 'MISS',
      'X-Request-Id': requestId,
      'X-Total-Records': data.total || 0,
      'X-Page': page,
      'X-Page-Size': pageSize,
      'X-Total-Pages': data.totalPages || 1
    });
    
    return res.json(data);
    
  } catch (error) {
    const errorDuration = Date.now() - startTime;
    const errorId = `err_${Math.random().toString(36).substring(2, 8)}`;
    
    logger.error('API', 'Telemetry request failed', { metadata: { requestId, error: error.message, nodeName, baseStation, timeFilter, errorDuration } });

    return res.status(500).json({ 
      error: 'Failed to fetch telemetry data',
      errorId,
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Base stations with coordinates for Kenya map - uses mapviewtable for coordinates and status
app.get('/api/basestations-map', authenticateToken, async (req, res) => {
  try {
    const { nodeName } = req.query;
    
    // Get base station names from node_status_table - filter by node if provided
    let nodeQuery = 'SELECT DISTINCT NodeBaseStationName FROM node_status_table WHERE NodeBaseStationName IS NOT NULL AND NodeBaseStationName != ""';
    let nodeQueryParams = [];
    
    if (nodeName) {
      nodeQuery += ' AND NodeName = ?';
      nodeQueryParams.push(nodeName);
    }
    
    nodeQuery += ' ORDER BY NodeBaseStationName';
    
    const [nodeRows] = await pool.promise().query(nodeQuery, nodeQueryParams);
    
    // Get latest coordinates and status from mapviewtable for all stations
    const [mapViewRows] = await pool.promise().query(`
      SELECT 
        BaseStationName,
        Latitude,
        Longitude,
        BaseStationStatus,
        time
      FROM mapviewtable mv1
      WHERE time = (
        SELECT MAX(time) 
        FROM mapviewtable mv2 
        WHERE mv2.BaseStationName = mv1.BaseStationName
      )
    `);
    
    // Create a map of station data from mapviewtable
    const stationDataMap = new Map();
    mapViewRows.forEach(row => {
      stationDataMap.set(row.BaseStationName.toUpperCase(), {
        lat: parseFloat(row.Latitude),
        lng: parseFloat(row.Longitude),
        statusValue: parseInt(row.BaseStationStatus),
        lastUpdate: row.time
      });
    });
    
    // Get latest update time from node_status_table for each station to determine online/offline
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    
    const [statusRows] = await pool.promise().query(`
      SELECT 
        NodeBaseStationName,
        MAX(time) as latestStatusTime
      FROM node_status_table
      WHERE NodeBaseStationName IS NOT NULL AND NodeBaseStationName != ""
      GROUP BY NodeBaseStationName
    `);
    
    const statusTimeMap = new Map();
    statusRows.forEach(row => {
      statusTimeMap.set(row.NodeBaseStationName.toUpperCase(), new Date(row.latestStatusTime));
    });
    
    // Hardcoded fallback coordinates for stations not in mapviewtable
    const fallbackCoordinates = {
      'NAIROBI': { lat: -1.2921, lng: 36.8219 },
      'MOMBASA': { lat: -4.0435, lng: 39.6682 },
      'KISUMU': { lat: -0.0917, lng: 34.7679 },
      'NAKURU': { lat: -0.3031, lng: 36.0695 },
      'ELDORET': { lat: 0.5143, lng: 35.2698 },
      'KITALE': { lat: 1.0149, lng: 35.0013 },
      'GARISSA': { lat: -0.4528, lng: 39.6460 },
      'KAKAMEGA': { lat: 0.2842, lng: 34.7519 },
      'NYERI': { lat: -0.4243, lng: 36.9568 },
      'MERU': { lat: 0.0470, lng: 37.6555 },
      'THIKA': { lat: -1.0361, lng: 37.0695 },
      'MALINDI': { lat: -3.2192, lng: 40.1164 },
      'LAMU': { lat: -2.2715, lng: 40.9020 },
      'BUSIA': { lat: 0.4608, lng: 34.1114 },
      'MACHAKOS': { lat: -1.5178, lng: 37.2628 },
      'KERICHO': { lat: -0.3675, lng: 35.2850 },
      'NAROK': { lat: -1.0785, lng: 35.8619 },
      'BUNGOMA': { lat: 0.5635, lng: 34.5605 },
      'MOYALE': { lat: 3.5216, lng: 39.0546 },
      'MARSABIT': { lat: 2.3287, lng: 37.9909 },
      'ISIOLO': { lat: 0.3549, lng: 37.5821 },
      'WAJIR': { lat: 1.7471, lng: 40.0575 },
      'MANDERA': { lat: 3.9377, lng: 41.8569 },
      'LIMURU': { lat: -1.1085, lng: 36.6421 },
      'LIMURU_NMG': { lat: -1.1424, lng: 36.6409 },
      'WEBUYE': { lat: 0.6069, lng: 34.7399 },
      'MAZERAS': { lat: -3.6739, lng: 39.4927 },
      'KITUI': { lat: -1.3667, lng: 38.0167 },
      'KIBWEZI': { lat: -2.4167, lng: 37.9667 },
      'KISII': { lat: -0.6833, lng: 34.7667 },
      'KAPENGURIA': { lat: 1.2388, lng: 35.1167 },
      'NYADUNDO': { lat: -0.1167, lng: 34.9000 }
    };
    
    // Helper function to get status color based on BaseStationStatus value
    const getStatusColor = (statusValue) => {
      if (statusValue >= 1 && statusValue <= 10) return '#1FC700';  // Green
      if (statusValue >= 11 && statusValue <= 30) return '#CF8700';  // Orange
      if (statusValue >= 31 && statusValue <= 50) return '#D92A00';  // Red
      return '#CF8700'; // Default to orange for unknown values
    };
    
    // Helper function to get status tier for frontend display
    const getStatusTier = (statusValue) => {
      if (statusValue >= 1 && statusValue <= 10) return 'good';
      if (statusValue >= 11 && statusValue <= 30) return 'warning';
      if (statusValue >= 31 && statusValue <= 50) return 'critical';
      return 'warning';
    };
    
    // Map database stations to coordinates and status
    const baseStations = await Promise.all(nodeRows.map(async (row) => {
      const stationName = row.NodeBaseStationName;
      const stationNameUpper = stationName.toUpperCase();
      
      // Check if we have data from mapviewtable
      const mapData = stationDataMap.get(stationNameUpper);
      
      let lat, lng, statusValue, statusTier, statusColor;
      
      if (mapData) {
        // Use coordinates and status from mapviewtable
        lat = mapData.lat;
        lng = mapData.lng;
        statusValue = mapData.statusValue;
      } else {
        // Try fallback coordinates
        const fallback = fallbackCoordinates[stationNameUpper] || 
                        fallbackCoordinates[stationName] ||
                        fallbackCoordinates[stationName.charAt(0).toUpperCase() + stationName.slice(1).toUpperCase()];
        
        if (fallback) {
          lat = fallback.lat;
          lng = fallback.lng;
        } else {
          // Last resort: try to geocode from station name
          logger.debug('API', `Attempting geocode for station: ${stationName}`);
          // For now, skip stations we can't locate
          return null;
        }
        statusValue = 0; // Unknown status
      }
      
      // Determine online/offline status based on node_status_table timestamp
      const latestStatusTime = statusTimeMap.get(stationNameUpper);
      const isOnline = latestStatusTime && latestStatusTime >= threeHoursAgo;
      
      statusTier = getStatusTier(statusValue);
      statusColor = getStatusColor(statusValue);
      
      return {
        id: stationName,
        name: stationName,
        lat: lat,
        lng: lng,
        status: isOnline ? 'online' : 'offline',
        statusTier: statusTier,
        statusValue: statusValue,
        statusColor: statusColor,
        lastStatusUpdate: latestStatusTime ? latestStatusTime.toISOString() : null
      };
    }));
    
    // Filter out null entries (stations we couldn't locate)
    const validStations = baseStations.filter(station => station !== null);
    
    res.json(validStations);
  } catch (error) {
    logger.error('API', 'Error fetching base stations for map', { 
      metadata: { 
        error: error.message,
        stack: error.stack
      } 
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Initialize report scheduler and report data service
const scheduler = require('./services/scheduler');
const reportDataService = require('./services/reportDataService');
const manualReportProcessor = require('./services/manualReportProcessor');
const ManualReportCacheManager = require('./services/manualReportCacheManager');

// Initialize cache manager
const cacheManager = new ManualReportCacheManager(pool.promise());
cacheManager.scheduleMaintenance();

scheduler.setDatabase(pool.promise());
reportDataService.setDatabase(pool.promise());
manualReportProcessor.setDatabase(pool.promise());
manualReportProcessor.setCacheManager(cacheManager);
setSiteAlertsDb(pool.promise());

// Set cache manager in app for routes to access
app.set('cacheManager', cacheManager);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info('SYSTEM', `Server is running on port ${PORT}`);
    
    // Initialize scheduled reports
    scheduler.initializeScheduler().catch(err => {
        logger.error('Failed to initialize report scheduler:', err);
    });
});
