const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

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

app.get('/api/telemetry/:nodeName/:baseStation', async (req, res) => {
  try {
    const { nodeName, baseStation } = req.params;
    const { timeFilter } = req.query;

    // First, get the most recent time from the database for this node and base station
    const getLatestTimeQuery = `
      SELECT MAX(time) as latestTime
      FROM node_status_table
      WHERE NodeName = ? AND NodeBaseStationName = ?
    `;
    const [latestTimeResult] = await pool.promise().query(getLatestTimeQuery, [nodeName, baseStation]);
    const latestTime = latestTimeResult[0].latestTime;

    if (!latestTime) {
      return res.json([]);
    }

    // Calculate the time range based on the filter
    let timeRange;
    const latestDate = new Date(latestTime);

    switch (timeFilter) {
      case '5m': timeRange = new Date(latestDate - 5 * 60 * 1000); break;
      case '10m': timeRange = new Date(latestDate - 10 * 60 * 1000); break;
      case '30m': timeRange = new Date(latestDate - 30 * 60 * 1000); break;
      case '1h': timeRange = new Date(latestDate - 60 * 60 * 1000); break;
      case '2h': timeRange = new Date(latestDate - 2 * 60 * 60 * 1000); break;
      case '6h': timeRange = new Date(latestDate - 6 * 60 * 60 * 1000); break;
      case '1d': timeRange = new Date(latestDate - 24 * 60 * 60 * 1000); break;
      case '2d': timeRange = new Date(latestDate - 2 * 24 * 60 * 60 * 1000); break;
      case '5d': timeRange = new Date(latestDate - 5 * 24 * 60 * 60 * 1000); break;
      case '1w': timeRange = new Date(latestDate - 7 * 24 * 60 * 60 * 1000); break;
      case '2w': timeRange = new Date(latestDate - 14 * 24 * 60 * 60 * 1000); break;
      case '30d': timeRange = new Date(latestDate - 30 * 24 * 60 * 60 * 1000); break;
      default: timeRange = new Date(latestDate - 60 * 60 * 1000); // Default to 1 hour
    }

    const query = `
      SELECT 
        time,
        Analog1Value as forwardPower,
        Analog2Value as reflectedPower,
        Analog3Value as vswr,
        Analog4Value as returnLoss,
        Analog5Value as temperature,
        Analog6Value as voltage,
        Analog7Value as current,
        Analog8Value as power
      FROM node_status_table 
      WHERE NodeName = ? 
        AND NodeBaseStationName = ? 
        AND time >= ?
      ORDER BY time DESC
    `;
    
    const [rows] = await pool.promise().query(query, [nodeName, baseStation, timeRange]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching telemetry data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
