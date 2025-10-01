const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const NodeCache = require('node-cache');
require('dotenv').config();

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

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60 // limit each IP to 60 requests per windowMs
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
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to database');
  connection.release();
});

// Routes
app.get('/api/nodes', async (req, res) => {
  try {
    const [rows] = await pool.promise().query('SELECT DISTINCT NodeName FROM node_status_table ORDER BY NodeName');
    // Transform the rows into the expected format
    const nodes = rows.map(row => ({
      id: row.NodeName,  // Use NodeName as the id
      name: row.NodeName // Use NodeName as the display name
    }));
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

app.get('/api/basestations/:nodeName', async (req, res) => {
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
    console.error('Error fetching base stations:', error);
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

  console.log('Fetching time range for:', { nodeName, baseStation });
  const [[timeRange]] = await pool.promise().query(timeRangeQuery, [nodeName, baseStation]);
  
  console.log('Available time range in database (EAT):', {
    earliest: timeRange.earliest_time,
    latest: timeRange.latest_time,
    now: new Date().toISOString()
  });

  // If no data is found, return empty result
  if (!timeRange.earliest_time || !timeRange.latest_time) {
    console.log('No data found for the specified node and base station');
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
  
  console.log('Calculated query time range:', {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    timeRangeMinutes,
    timeRangeMs: endTime - startTime
  });

  // Calculate optimal number of data points and time step
  const dataPointCount = calculateDataPoints(timeRangeMinutes);
  const timeStep = Math.max(1, Math.ceil(timeRangeMinutes / (dataPointCount / 2)));
  
  console.log('Sampling configuration:', {
    dataPointCount,
    timeStepMinutes: timeStep,
    estimatedPoints: Math.ceil(timeRangeMinutes / timeStep)
  });

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
        ROUND(AVG(Analog1Value), 2) as forwardPower,
        ROUND(AVG(Analog2Value), 2) as reflectedPower,
        ROUND(AVG(Analog3Value), 2) as vswr,
        ROUND(AVG(Analog4Value), 2) as returnLoss,
        ROUND(AVG(Analog5Value), 2) as temperature,
        ROUND(AVG(Analog6Value), 2) as voltage,
        ROUND(AVG(Analog7Value), 2) as current,
        ROUND(AVG(Analog8Value), 2) as power,
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
      forwardPower,
      reflectedPower,
      vswr,
      returnLoss,
      temperature,
      voltage,
      current,
      power
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

  console.log('Executing queries with params:', {
    timeRangeMinutes,
    nodeName,
    baseStation,
    pageSize,
    offset,
    timeStep,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  });
  
  // Log the first few characters of the query for debugging
  console.log('Query preview:', query.substring(0, 200) + '...');

  // Define max time range (30 days in milliseconds)
  const maxTimeRangeMs = 30 * 24 * 60 * 60 * 1000;
  
  // Calculate the actual time range we're querying
  const actualEndTime = new Date(timeRange.latest_time);
  const actualStartTime = new Date(actualEndTime.getTime() - (Math.min(timeRangeMinutes * 60 * 1000, maxTimeRangeMs)));
  
  console.log('Query parameters:', {
    startTime: actualStartTime,
    endTime: actualEndTime,
    timeStep: timeStep + ' minutes',
    pageSize,
    offset
  });

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

  console.log('Executing query with params:', queryParams);
  console.log('Executing count query with params:', countParams);

  const [[{ total }], data] = await Promise.all([
    pool.promise().query(countQuery, countParams),
    pool.promise().query(query, queryParams)
  ]);
  
  // Debug time range of returned data
  if (data[0].length > 0) {
    const returnedData = data[0];
    console.log('Returned data time range:', {
      start: returnedData[returnedData.length - 1]?.sample_time || 'N/A',
      end: returnedData[0]?.sample_time || 'N/A',
      requestedMinutes: timeRangeMinutes,
      recordCount: total,
      dataPoints: returnedData.length
    });
    
    // Log first and last few data points for debugging
    console.log('First data point:', returnedData[0]);
    if (returnedData.length > 1) {
      console.log('Last data point:', returnedData[returnedData.length - 1]);
    }
  }

  return {
    data: data[0],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
};

// Telemetry data endpoint
app.get('/api/telemetry/:nodeName/:baseStation', async (req, res) => {
  const { nodeName, baseStation } = req.params;
  const { timeFilter = '1h', page = 1, pageSize = 200 } = req.query; // Increased default pageSize
  
  const requestId = Math.random().toString(36).substring(2, 9);
  const startTime = Date.now();
  
  // Create a cache key based on the request parameters
  const cacheKey = `telemetry:${nodeName}:${baseStation}:${timeFilter}:${page}:${pageSize}`;
  const ttl = getCacheTTL(timeFilter);
  
  // Log request details
  console.log(`[${requestId}] [START] Telemetry request`, {
    nodeName,
    baseStation,
    timeFilter,
    page,
    pageSize,
    cacheKey,
    ttl,
    timestamp: new Date().toISOString(),
    url: req.originalUrl
  });
  
  // Try to get cached data first
  try {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] [CACHE HIT] Served from cache in ${duration}ms`, {
        recordsReturned: cachedData.data?.length || 0,
        cacheKey
      });
      
      res.set({
        'X-Response-Time': `${duration}ms`,
        'X-Cache': 'HIT',
        'X-Request-Id': requestId
      });
      
      return res.json(cachedData);
    }
  } catch (cacheError) {
    console.warn(`[${requestId}] Cache check failed:`, cacheError);
    // Continue with fresh data if cache check fails
  }
  
  // Validate time filter
  if (!isValidTimeFilter(timeFilter)) {
    const errorMsg = `Invalid time filter: ${timeFilter}`;
    console.error(`[${requestId}] [ERROR] ${errorMsg}`);
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
    
    // Log successful response
    console.log(`[${requestId}] [SUCCESS] Query executed in ${duration}ms`, {
      recordsReturned: data.data?.length || 0,
      totalRecords: data.total || 0,
      timeRange: timeFilter,
      queryDuration: duration,
      page,
      pageSize,
      totalPages: data.totalPages || 1
    });
    
    // Add response headers
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
    
    console.error(`[${requestId}] [ERROR] Request failed after ${errorDuration}ms`, {
      error: error.message,
      errorId,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      params: { nodeName, baseStation, timeFilter, page, pageSize }
    });
    
    return res.status(500).json({ 
      error: 'Failed to fetch telemetry data',
      errorId,
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
