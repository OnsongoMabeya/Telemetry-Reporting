const express = require('express');
const router = express.Router();

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  next();
});

// ============================================================================
// MY SITES - USER VIEW
// ============================================================================

// GET /api/my-sites/clients - Get all clients assigned to the current user
router.get('/clients', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all clients assigned to this user
    const [clients] = await db.query(`
      SELECT DISTINCT
        c.id,
        c.name,
        c.description,
        uca.assigned_at
      FROM user_client_assignments uca
      INNER JOIN clients c ON uca.client_id = c.id
      WHERE uca.user_id = ? AND uca.is_active = TRUE AND c.is_active = TRUE
      ORDER BY c.name
    `, [userId]);

    // For each client, get the count of services
    const clientsWithCounts = await Promise.all(
      clients.map(async (client) => {
        const [serviceCount] = await db.query(`
          SELECT COUNT(*) as count
          FROM client_services cs
          INNER JOIN services s ON cs.service_id = s.id
          WHERE cs.client_id = ? AND s.is_active = TRUE
        `, [client.id]);

        return {
          ...client,
          service_count: serviceCount[0].count
        };
      })
    );

    res.json({
      success: true,
      data: clientsWithCounts,
      count: clientsWithCounts.length
    });
  } catch (error) {
    console.error('Error fetching my sites clients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch my sites clients',
      message: error.message
    });
  }
});

// GET /api/my-sites/clients/:clientId/services - Get all services for a client
router.get('/clients/:clientId/services', async (req, res) => {
  try {
    const userId = req.user.id;
    const { clientId } = req.params;

    // Check if user has access to this client
    const [access] = await db.query(
      'SELECT id FROM user_client_assignments WHERE user_id = ? AND client_id = ? AND is_active = TRUE',
      [userId, clientId]
    );

    if (access.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have access to this client.'
      });
    }

    // Get all services for this client
    const [services] = await db.query(`
      SELECT 
        s.id,
        s.name,
        s.description
      FROM client_services cs
      INNER JOIN services s ON cs.service_id = s.id
      WHERE cs.client_id = ? AND s.is_active = TRUE
      ORDER BY s.name
    `, [clientId]);

    // For each service, get metric count
    const servicesWithMetrics = await Promise.all(
      services.map(async (service) => {
        const [metricCount] = await db.query(`
          SELECT COUNT(*) as count
          FROM service_metric_assignments sma
          WHERE sma.service_id = ? AND sma.is_active = TRUE
        `, [service.id]);

        return {
          ...service,
          metric_count: metricCount[0].count
        };
      })
    );

    res.json({
      success: true,
      data: servicesWithMetrics,
      count: servicesWithMetrics.length
    });
  } catch (error) {
    console.error('Error fetching client services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client services',
      message: error.message
    });
  }
});

// GET /api/my-sites/clients/:clientId/services/:serviceId - Get service details with metrics
router.get('/clients/:clientId/services/:serviceId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { clientId, serviceId } = req.params;

    // Check if user has access to this client
    const [clientAccess] = await db.query(
      'SELECT id FROM user_client_assignments WHERE user_id = ? AND client_id = ? AND is_active = TRUE',
      [userId, clientId]
    );

    if (clientAccess.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have access to this client.'
      });
    }

    // Check if service belongs to this client
    const [serviceAccess] = await db.query(
      'SELECT id FROM client_services WHERE client_id = ? AND service_id = ?',
      [clientId, serviceId]
    );

    if (serviceAccess.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'This service is not assigned to this client.'
      });
    }

    // Get service details
    const [services] = await db.query(
      'SELECT id, name, description FROM services WHERE id = ? AND is_active = TRUE',
      [serviceId]
    );

    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    // Get metric assignments for this service
    const [metrics] = await db.query(`
      SELECT 
        sma.id,
        sma.display_name,
        sma.display_order,
        mm.id as metric_mapping_id,
        mm.node_name,
        mm.base_station_name,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        mm.color
      FROM service_metric_assignments sma
      INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
      WHERE sma.service_id = ? AND sma.is_active = TRUE AND mm.is_active = TRUE
      ORDER BY sma.display_order, sma.created_at
    `, [serviceId]);

    res.json({
      success: true,
      data: {
        ...services[0],
        metrics,
        metric_count: metrics.length
      }
    });
  } catch (error) {
    console.error('Error fetching service details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service details',
      message: error.message
    });
  }
});

// GET /api/my-sites/clients/:clientId/services/:serviceId/metrics/:metricId/telemetry
// Get telemetry data for a specific metric with smart date range logic
router.get('/clients/:clientId/services/:serviceId/metrics/:metricId/telemetry', async (req, res) => {
  try {
    const userId = req.user.id;
    const { clientId, serviceId, metricId } = req.params;
    const { timeFilter = '1h' } = req.query;

    // Check if user has access to this client
    const [clientAccess] = await db.query(
      'SELECT id FROM user_client_assignments WHERE user_id = ? AND client_id = ? AND is_active = TRUE',
      [userId, clientId]
    );

    if (clientAccess.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have access to this client.'
      });
    }

    // Get metric details
    const [metrics] = await db.query(`
      SELECT 
        mm.node_name,
        mm.base_station_name,
        mm.metric_name,
        mm.column_name
      FROM service_metric_assignments sma
      INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
      WHERE sma.id = ? AND sma.service_id = ? AND sma.is_active = TRUE
    `, [metricId, serviceId]);

    if (metrics.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Metric not found'
      });
    }

    const metric = metrics[0];

    // Set timezone for this session
    await db.query(`SET time_zone = '+03:00'`);

    // Get the time range of available data
    const timeRangeQuery = `
      SELECT 
        CONVERT_TZ(MIN(time), @@session.time_zone, '+03:00') as earliest_time,
        CONVERT_TZ(MAX(time), @@session.time_zone, '+03:00') as latest_time
      FROM node_status_table
      WHERE NodeName = ? AND NodeBaseStationName = ?
    `;

    const [[timeRange]] = await db.query(timeRangeQuery, [metric.node_name, metric.base_station_name]);

    // If no data is found, return empty result
    if (!timeRange.earliest_time || !timeRange.latest_time) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    // Calculate time range based on filter (same as Dashboard)
    let timeRangeMinutes;
    let timeStep;
    
    switch (timeFilter) {
      case '5m': 
        timeRangeMinutes = 5;
        timeStep = 1;
        break;
      case '10m':
        timeRangeMinutes = 10;
        timeStep = 1;
        break;
      case '30m':
        timeRangeMinutes = 30;
        timeStep = 1;
        break;
      case '1h':
        timeRangeMinutes = 60;
        timeStep = 1;
        break;
      case '2h':
        timeRangeMinutes = 120;
        timeStep = 2;
        break;
      case '6h':
        timeRangeMinutes = 360;
        timeStep = 5;
        break;
      case '1d':
        timeRangeMinutes = 1440;
        timeStep = 15;
        break;
      case '2d':
        timeRangeMinutes = 2880;
        timeStep = 30;
        break;
      case '5d':
        timeRangeMinutes = 7200;
        timeStep = 60;
        break;
      case '1w':
        timeRangeMinutes = 10080;
        timeStep = 120;
        break;
      case '2w':
        timeRangeMinutes = 20160;
        timeStep = 240;
        break;
      case '30d':
        timeRangeMinutes = 43200;
        timeStep = 360;
        break;
      default:
        timeRangeMinutes = 60;
        timeStep = 1;
    }

    // Calculate time range based on latest available data (not NOW())
    const endTime = new Date(timeRange.latest_time);
    const startTime = new Date(endTime.getTime() - (timeRangeMinutes * 60 * 1000));

    // Build query with time bucketing for performance
    const query = `
      WITH time_buckets AS (
        SELECT 
          DATE_FORMAT(
            CONVERT_TZ(
              FROM_UNIXTIME(
                FLOOR(UNIX_TIMESTAMP(time) / (? * 60)) * (? * 60)
              ),
              @@session.time_zone,
              '+03:00'
            ),
            '%Y-%m-%d %H:%i:00'
          ) as bucket_start,
          ROUND(AVG(${metric.column_name}), 2) as \`${metric.metric_name}\`,
          COUNT(*) as sample_count
        FROM node_status_table
        WHERE NodeName = ?
          AND NodeBaseStationName = ?
          AND time BETWEEN ? AND ?
        GROUP BY bucket_start
        HAVING sample_count > 0
        ORDER BY bucket_start DESC
        LIMIT 200
      )
      SELECT 
        bucket_start as sample_time,
        \`${metric.metric_name}\`
      FROM time_buckets
      ORDER BY sample_time ASC
    `;

    const [telemetryData] = await db.query(query, [
      timeStep,
      timeStep,
      metric.node_name,
      metric.base_station_name,
      startTime,
      endTime
    ]);

    res.json({
      success: true,
      data: telemetryData,
      count: telemetryData.length
    });
  } catch (error) {
    console.error('Error fetching telemetry data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch telemetry data',
      message: error.message
    });
  }
});

module.exports = router;
