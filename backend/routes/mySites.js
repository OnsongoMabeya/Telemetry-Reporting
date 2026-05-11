const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

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
    logger.error('CRUD', 'Error fetching my sites clients', { userId: req.user?.id, ip: req.ip, metadata: { error: error.message } });
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
    logger.error('CRUD', 'Error fetching client services', { userId: req.user?.id, ip: req.ip, metadata: { error: error.message } });
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
        mm.color,
        mm.min_value,
        mm.max_value
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
    logger.error('CRUD', 'Error fetching service details', { userId: req.user?.id, ip: req.ip, metadata: { error: error.message } });
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
    logger.error('CRUD', 'Error fetching telemetry data', { userId: req.user?.id, ip: req.ip, metadata: { error: error.message } });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch telemetry data',
      message: error.message
    });
  }
});

// ============================================================================
// MY SITES MAP - Base Station Locations
// ============================================================================

// GET /api/my-sites/clients/:clientId/map-stations - Get base stations for client's map
// Query param: serviceId (optional) - if provided, filters to service-specific stations
router.get('/clients/:clientId/map-stations', async (req, res) => {
  try {
    const userId = req.user.id;
    const { clientId } = req.params;
    const { serviceId } = req.query;

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

    // Build query to get unique base stations
    let baseStationsQuery;
    let queryParams;

    if (serviceId) {
      // Service-level view: get base stations for specific service only
      baseStationsQuery = `
        SELECT DISTINCT mm.base_station_name
        FROM client_services cs
        INNER JOIN service_metric_assignments sma ON sma.service_id = cs.service_id
        INNER JOIN metric_mappings mm ON mm.id = sma.metric_mapping_id
        WHERE cs.client_id = ? 
          AND cs.service_id = ?
          AND mm.base_station_name IS NOT NULL 
          AND mm.base_station_name != ''
          AND mm.is_active = TRUE
          AND sma.is_active = TRUE
      `;
      queryParams = [clientId, serviceId];
    } else {
      // Client-level view: get all base stations across all services
      baseStationsQuery = `
        SELECT DISTINCT mm.base_station_name
        FROM client_services cs
        INNER JOIN service_metric_assignments sma ON sma.service_id = cs.service_id
        INNER JOIN metric_mappings mm ON mm.id = sma.metric_mapping_id
        WHERE cs.client_id = ? 
          AND mm.base_station_name IS NOT NULL 
          AND mm.base_station_name != ''
          AND mm.is_active = TRUE
          AND sma.is_active = TRUE
      `;
      queryParams = [clientId];
    }

    const [baseStationRows] = await db.query(baseStationsQuery, queryParams);

    if (baseStationRows.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No base stations found for this client/service'
      });
    }

    // Get unique base station names
    const baseStationNames = baseStationRows.map(row => row.base_station_name.toUpperCase());
    const placeholders = baseStationNames.map(() => '?').join(',');

    // Query mapviewtable for latest coordinates and status per station
    const [mapData] = await db.query(`
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
      AND UPPER(BaseStationName) IN (${placeholders})
    `, baseStationNames);

    // Get latest status time from node_status_table for online/offline determination
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    
    const [statusRows] = await db.query(`
      SELECT 
        NodeBaseStationName,
        MAX(time) as latestStatusTime
      FROM node_status_table
      WHERE UPPER(NodeBaseStationName) IN (${placeholders})
      GROUP BY NodeBaseStationName
    `, baseStationNames);

    const statusTimeMap = new Map();
    statusRows.forEach(row => {
      statusTimeMap.set(row.NodeBaseStationName.toUpperCase(), new Date(row.latestStatusTime));
    });

    // Helper functions for status determination
    const getStatusTier = (status) => {
      if (status >= 1 && status <= 10) return 'good';
      if (status >= 11 && status <= 30) return 'warning';
      return 'critical';
    };

    const getStatusColor = (status) => {
      if (status >= 1 && status <= 10) return '#1FC700';
      if (status >= 11 && status <= 30) return '#CF8700';
      return '#D92A00';
    };

    // Fallback coordinates for stations not in mapviewtable
    const fallbackCoordinates = {
      'KITUI': { lat: -1.27639, lng: 38.0325 },
      'KIBWEZI': { lat: -2.23333, lng: 37.96667 },
      'LIMURU': { lat: -1.11667, lng: 36.65 },
      'KAKAMEGA': { lat: 0.28273, lng: 34.751 },
      'NAKURU': { lat: -0.28333, lng: 36.06667 },
      'KISUMU': { lat: -0.0917, lng: 34.7679 },
      'MERU': { lat: 0.047, lng: 37.649 },
      'ELDORET': { lat: 0.52036, lng: 35.26992 },
      'WEBUYE': { lat: 0.594, lng: 34.769 },
      'NAROK': { lat: -1.08001, lng: 35.8711 },
      'MAZERAS': { lat: -3.9333, lng: 39.55 },
      'NYERI': { lat: -0.42013, lng: 36.94759 },
      'KISII': { lat: -0.68166, lng: 34.76666 },
      'KAPENGURIA': { lat: 1.25809, lng: 35.1059 },
      'MALINDI': { lat: -3.21799, lng: 40.11655 },
      'MANDERA': { lat: 3.93726, lng: 41.85688 },
      'NYADUNDO': { lat: -0.041, lng: 34.55 },
      'NAIROBI': { lat: -1.286389, lng: 36.817223 },
      'MOMBASA': { lat: -4.043477, lng: 39.668205 }
    };

    // Build response
    const stations = baseStationNames.map(stationName => {
      const mapRow = mapData.find(row => row.BaseStationName.toUpperCase() === stationName);
      const fallback = fallbackCoordinates[stationName];
      
      let lat, lng, status, lastUpdate;
      
      if (mapRow) {
        lat = mapRow.Latitude;
        lng = mapRow.Longitude;
        status = mapRow.BaseStationStatus;
        lastUpdate = mapRow.time;
      } else if (fallback) {
        lat = fallback.lat;
        lng = fallback.lng;
        status = 0;
        lastUpdate = null;
      } else {
        return null; // Skip stations without coordinates
      }

      // Determine online/offline status
      const latestStatusTime = statusTimeMap.get(stationName);
      const isOnline = latestStatusTime && (latestStatusTime > threeHoursAgo);

      return {
        id: stationName,
        name: stationName,
        lat,
        lng,
        status: isOnline ? 'online' : 'offline',
        statusTier: getStatusTier(status),
        statusValue: status,
        statusColor: getStatusColor(status),
        lastStatusUpdate: latestStatusTime ? latestStatusTime.toISOString() : null,
        hasLiveData: !!mapRow
      };
    }).filter(station => station !== null);

    res.json({
      success: true,
      data: stations,
      count: stations.length,
      viewType: serviceId ? 'service' : 'client'
    });
  } catch (error) {
    logger.error('CRUD', 'Error fetching map stations', { userId: req.user?.id, ip: req.ip, metadata: { error: error.message } });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch map stations',
      message: error.message
    });
  }
});

module.exports = router;
