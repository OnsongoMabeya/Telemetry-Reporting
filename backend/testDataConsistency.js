const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDataConsistency() {
  // Database connection
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  try {
    const nodeName = 'Aviation FM';
    const baseStation = 'ELDORET';
    
    // Test different time ranges
    const timeRanges = [
      { name: '5m', minutes: 5 },
      { name: '1h', minutes: 60 },
      { name: '6h', minutes: 360 },
      { name: '1d', minutes: 1440 },
      { name: '2d', minutes: 2880 },
      { name: '5d', minutes: 7200 }
    ];

    for (const range of timeRanges) {
      console.log(`\n=== Testing time range: ${range.name} (${range.minutes} minutes) ===`);
      
      // Get the latest timestamp from the database
      const [latestRow] = await pool.query(
        'SELECT MAX(time) as latest FROM node_status_table WHERE NodeName = ? AND NodeBaseStationName = ?',
        [nodeName, baseStation]
      );
      
      const latestTime = latestRow[0].latest;
      const startTime = new Date(latestTime - (range.minutes * 60 * 1000));
      
      console.log(`Time range: ${startTime.toISOString()} to ${latestTime.toISOString()}`);
      
      // Get raw data count in this range
      const [countResult] = await pool.query(
        'SELECT COUNT(*) as count FROM node_status_table WHERE NodeName = ? AND NodeBaseStationName = ? AND time BETWEEN ? AND ?',
        [nodeName, baseStation, startTime, latestTime]
      );
      
      console.log(`Raw data points: ${countResult[0].count}`);
      
      // Get sampled data (mimic the API endpoint)
      const timeStep = Math.max(1, Math.floor(range.minutes / 100)); // Ensure at least 1 minute steps
      
      const [sampledData] = await pool.query(`
        SELECT 
          DATE_FORMAT(
            FROM_UNIXTIME(
              FLOOR(UNIX_TIMESTAMP(time) / (${timeStep} * 60)) * (${timeStep} * 60)
            ), 
            '%Y-%m-%d %H:%i:00'
          ) as bucket_start,
          AVG(Analog1Value) as forwardPower,
          AVG(Analog2Value) as reflectedPower,
          COUNT(*) as sample_count
        FROM node_status_table
        WHERE NodeName = ? 
          AND NodeBaseStationName = ?
          AND time BETWEEN ? AND ?
        GROUP BY bucket_start
        ORDER BY bucket_start DESC
        LIMIT 100
      `, [nodeName, baseStation, startTime, latestTime]);
      
      console.log(`Sampled data points: ${sampledData.length}`);
      
      if (sampledData.length > 0) {
        console.log('First sample:', {
          time: sampledData[0].bucket_start,
          forwardPower: sampledData[0].forwardPower,
          reflectedPower: sampledData[0].reflectedPower,
          samples: sampledData[0].sample_count
        });
        
        if (sampledData.length > 1) {
          console.log('Last sample:', {
            time: sampledData[sampledData.length - 1].bucket_start,
            forwardPower: sampledData[sampledData.length - 1].forwardPower,
            reflectedPower: sampledData[sampledData.length - 1].reflectedPower,
            samples: sampledData[sampledData.length - 1].sample_count
          });
        }
      }
      
      // Check for any anomalies
      if (sampledData.length === 0 && countResult[0].count > 0) {
        console.warn('WARNING: No sampled data points found despite having raw data!');
      }
      
      if (sampledData.length > 0) {
        const zeroSamples = sampledData.filter(d => d.sample_count === 0);
        if (zeroSamples.length > 0) {
          console.warn(`WARNING: Found ${zeroSamples.length} time buckets with zero samples`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error testing data consistency:', error);
  } finally {
    await pool.end();
  }
}

testDataConsistency().catch(console.error);
