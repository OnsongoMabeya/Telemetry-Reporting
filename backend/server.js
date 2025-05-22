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
      WHERE NodeName = ? AND NodeBaseStationName = ?
      ORDER BY time DESC
      LIMIT 100
    `;
    
    const [rows] = await pool.promise().query(query, [nodeName, baseStation]);
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
