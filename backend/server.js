const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const NodeCache = require('node-cache');
require('dotenv').config();

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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
    res.json(rows);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/basestations/:nodeName', async (req, res) => {
  try {
    const { nodeName } = req.params;
    const [rows] = await pool.promise().query(
      'SELECT DISTINCT NodeBaseStationName FROM node_status_table WHERE NodeName = ? ORDER BY NodeBaseStationName',
      [nodeName]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching base stations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get data with pagination
const getTelemetryData = async (pool, nodeName, baseStation, timeFilter, page = 1, pageSize = 100) => {
  // Adjust sampling rate based on time range
  let samplingInterval = '1 MINUTE';
  if (timeFilter === '6h') samplingInterval = '5 MINUTE';
  else if (timeFilter === '1d') samplingInterval = '15 MINUTE';
  else if (timeFilter === '2d') samplingInterval = '30 MINUTE';
  else if (['5d', '1w', '2w', '30d'].includes(timeFilter)) samplingInterval = '1 HOUR';
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

    // Create cache key
    const cacheKey = `telemetry:${nodeName}:${baseStation}:${timeFilter}:${page}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const result = await getTelemetryData(pool, nodeName, baseStation, timeFilter, parseInt(page), pageSize);
    
    // Cache the result
    cache.set(cacheKey, result);
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
