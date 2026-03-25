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

// GET /api/my-sites - Get all services assigned to the current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all services assigned to this user with their metric assignments
    const [services] = await db.query(`
      SELECT DISTINCT
        s.id,
        s.name,
        s.description
      FROM user_service_assignments usa
      INNER JOIN services s ON usa.service_id = s.id
      WHERE usa.user_id = ? AND s.is_active = TRUE
      ORDER BY s.name
    `, [userId]);

    // For each service, get its metric assignments
    const servicesWithMetrics = await Promise.all(
      services.map(async (service) => {
        const [metrics] = await db.query(`
          SELECT 
            sma.id as assignment_id,
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
        `, [service.id]);

        return {
          ...service,
          metrics,
          metric_count: metrics.length
        };
      })
    );

    res.json({
      success: true,
      data: servicesWithMetrics,
      count: servicesWithMetrics.length
    });
  } catch (error) {
    console.error('Error fetching my sites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch my sites',
      message: error.message
    });
  }
});

// GET /api/my-sites/:serviceId - Get detailed information for a specific service
router.get('/:serviceId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceId } = req.params;

    // Check if user has access to this service
    const [access] = await db.query(
      'SELECT id FROM user_service_assignments WHERE user_id = ? AND service_id = ?',
      [userId, serviceId]
    );

    if (access.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have access to this service.'
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
        sma.id as assignment_id,
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

// GET /api/my-sites/:serviceId/telemetry - Get telemetry data for a service's metrics
// This endpoint fetches telemetry data for all metrics assigned to a service
router.get('/:serviceId/telemetry', async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceId } = req.params;
    const { timeFilter = '1h' } = req.query;

    // Check if user has access to this service
    const [access] = await db.query(
      'SELECT id FROM user_service_assignments WHERE user_id = ? AND service_id = ?',
      [userId, serviceId]
    );

    if (access.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have access to this service.'
      });
    }

    // Get metric assignments for this service
    const [metrics] = await db.query(`
      SELECT 
        sma.id as assignment_id,
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

    if (metrics.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No metrics assigned to this service'
      });
    }

    // For each metric, we'll return the node/base station info
    // The actual telemetry data will be fetched by the frontend using the existing /api/telemetry endpoint
    // This endpoint just provides the metadata needed to fetch the data
    const metricsWithInfo = metrics.map(metric => ({
      assignment_id: metric.assignment_id,
      display_name: metric.display_name,
      display_order: metric.display_order,
      metric_mapping_id: metric.metric_mapping_id,
      node_name: metric.node_name,
      base_station_name: metric.base_station_name,
      metric_name: metric.metric_name,
      column_name: metric.column_name,
      unit: metric.unit,
      color: metric.color,
      // Frontend will use this to fetch telemetry data
      telemetry_endpoint: `/api/telemetry/${encodeURIComponent(metric.node_name)}/${encodeURIComponent(metric.base_station_name)}?timeFilter=${timeFilter}`
    }));

    res.json({
      success: true,
      data: metricsWithInfo,
      count: metricsWithInfo.length
    });
  } catch (error) {
    console.error('Error fetching service telemetry info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service telemetry info',
      message: error.message
    });
  }
});

module.exports = router;
