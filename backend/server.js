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
  try {
    const { nodeName } = req.params;
    const [rows] = await pool.promise().query(
      'SELECT DISTINCT NodeBaseStationName FROM node_status_table WHERE NodeName = ? ORDER BY NodeBaseStationName',
      [nodeName]
    );
    // Transform the rows into the expected format
    const baseStations = rows.map(row => ({
      id: row.NodeBaseStationName,
      name: row.NodeBaseStationName,
      node: nodeName
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

// Helper function to get data with pagination
const getTelemetryData = async (pool, nodeName, baseStation, timeFilter, page = 1, pageSize = 100) => {
  // Adjust sampling rate based on time range
  let samplingInterval;
  if (timeFilter === '5m' || timeFilter === '10m') samplingInterval = '10 SECOND';
  else if (timeFilter === '30m') samplingInterval = '30 SECOND';
  else if (timeFilter === '1h') samplingInterval = '1 MINUTE';
  else if (timeFilter === '2h') samplingInterval = '2 MINUTE';
  else if (timeFilter === '6h') samplingInterval = '5 MINUTE';
  else if (timeFilter === '1d') samplingInterval = '15 MINUTE';
  else if (timeFilter === '2d') samplingInterval = '30 MINUTE';
  else if (timeFilter === '5d') samplingInterval = '1 HOUR';
  else if (timeFilter === '1w') samplingInterval = '2 HOUR';
  else if (timeFilter === '2w') samplingInterval = '4 HOUR';
  else if (timeFilter === '30d') samplingInterval = '6 HOUR';
  else samplingInterval = '1 MINUTE';
  const offset = (page - 1) * pageSize;
  let minutesToSubtract;
  switch (timeFilter) {
    case '5m': minutesToSubtract = 5; break;
    case '10m': minutesToSubtract = 10; break;
    case '30m': minutesToSubtract = 30; break;
    case '1h': minutesToSubtract = 60; break;
    case '2h': minutesToSubtract = 120; break;
    case '6h': minutesToSubtract = 360; break;
    case '1d': minutesToSubtract = 1440; break;
    case '2d': minutesToSubtract = 2880; break;
    case '5d': minutesToSubtract = 7200; break;
    case '1w': minutesToSubtract = 10080; break;
    case '2w': minutesToSubtract = 20160; break;
    case '30d': minutesToSubtract = 43200; break;
    default: minutesToSubtract = 60;
  }

  // Debug query to check time range
  const timeRangeQuery = `
    SELECT 
      MAX(time) as latest_time,
      MIN(time) as earliest_time
    FROM node_status_table
    WHERE NodeName = ? AND NodeBaseStationName = ?
  `;

  const [[timeRange]] = await pool.promise().query(timeRangeQuery, [nodeName, baseStation]);
  console.log('Available time range in database:', {
    earliest: timeRange.earliest_time,
    latest: timeRange.latest_time
  });

  const query = `
    WITH RECURSIVE
    time_range AS (
      SELECT 
        MAX(time) as end_time,
        DATE_SUB(MAX(time), INTERVAL ? MINUTE) as start_time
      FROM node_status_table
      WHERE NodeName = ? AND NodeBaseStationName = ?
    ),
    sampled_data AS (
      SELECT 
        DATE_FORMAT(time, '%Y-%m-%d %H:%i:00') as sample_time,
        AVG(Analog1Value) as forwardPower,
        AVG(Analog2Value) as reflectedPower,
        AVG(Analog3Value) as vswr,
        AVG(Analog4Value) as returnLoss,
        AVG(Analog5Value) as temperature,
        AVG(Analog6Value) as voltage,
        AVG(Analog7Value) as current,
        AVG(Analog8Value) as power
      FROM node_status_table, time_range
      WHERE NodeName = ? 
        AND NodeBaseStationName = ?
        AND time >= (SELECT start_time FROM time_range)
        AND time <= (SELECT end_time FROM time_range)
      GROUP BY DATE_FORMAT(time, '%Y-%m-%d %H:%i:00')
      ORDER BY sample_time DESC
      LIMIT ? OFFSET ?
    )
    SELECT * FROM sampled_data
  `;

  const countQuery = `
    WITH time_range AS (
      SELECT 
        MAX(time) as end_time,
        DATE_SUB(MAX(time), INTERVAL ? MINUTE) as start_time
      FROM node_status_table
      WHERE NodeName = ? AND NodeBaseStationName = ?
    )
    SELECT COUNT(DISTINCT DATE_FORMAT(time, '%Y-%m-%d %H:%i:00')) as total
    FROM node_status_table
    WHERE NodeName = ? 
      AND NodeBaseStationName = ?
      AND time >= (SELECT start_time FROM time_range)
      AND time <= (SELECT end_time FROM time_range)
  `;

  const [[{ total }], data] = await Promise.all([
    pool.promise().query(countQuery, [minutesToSubtract, nodeName, baseStation, nodeName, baseStation]),
    pool.promise().query(query, [minutesToSubtract, nodeName, baseStation, nodeName, baseStation, pageSize, offset])
  ]);
  
  // Debug time range of returned data
  if (data[0].length > 0) {
    const returnedData = data[0];
    console.log('Returned data time range:', {
      start: returnedData[returnedData.length - 1].time,
      end: returnedData[0].time,
      requestedMinutes: minutesToSubtract,
      recordCount: total
    });
  }

  return {
    data: data[0],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
};

app.get('/api/telemetry/:nodeName/:baseStation', async (req, res) => {
  try {
    const { nodeName, baseStation } = req.params;
    const { timeFilter, page = 1 } = req.query;
    const pageSize = 100;

    // Input validation
    if (!timeFilter || !isValidTimeFilter(timeFilter)) {
      return res.status(400).json({ error: 'Invalid time filter' });
    }

    // Create cache key
    const cacheKey = `telemetry:${nodeName}:${baseStation}:${timeFilter}:${page}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const result = await getTelemetryData(pool, nodeName, baseStation, timeFilter, parseInt(page), pageSize);
    
    // Cache the result with dynamic TTL
    const ttl = getCacheTTL(timeFilter);
    cache.set(cacheKey, result, ttl);
    res.json(result);
  } catch (error) {
    console.error('Error fetching telemetry data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
