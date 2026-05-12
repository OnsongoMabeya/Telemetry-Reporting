/**
 * Service Reports API
 * 
 * Provides endpoints for generating service-centric telemetry reports.
 * A service can have multiple metrics from different nodes/base stations.
 * 
 * @module routes/serviceReports
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
  next();
});

/**
 * Calculate time range from filter string
 * @param {string} timeFilter - e.g., '1h', '1d', '7d', '30d'
 * @returns {Object} { startTime, endTime } as ISO strings
 */
function calculateTimeRange(timeFilter) {
  const now = new Date();
  const endTime = now.toISOString();
  let startTime;
  
  switch (timeFilter) {
    case '5m':
      startTime = new Date(now - 5 * 60 * 1000).toISOString();
      break;
    case '10m':
      startTime = new Date(now - 10 * 60 * 1000).toISOString();
      break;
    case '30m':
      startTime = new Date(now - 30 * 60 * 1000).toISOString();
      break;
    case '1h':
      startTime = new Date(now - 60 * 60 * 1000).toISOString();
      break;
    case '2h':
      startTime = new Date(now - 2 * 60 * 60 * 1000).toISOString();
      break;
    case '6h':
      startTime = new Date(now - 6 * 60 * 60 * 1000).toISOString();
      break;
    case '1d':
      startTime = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      break;
    case '2d':
      startTime = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case '5d':
      startTime = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case '1w':
      startTime = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case '2w':
      startTime = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case '30d':
      startTime = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      break;
    default:
      startTime = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  }
  
  return { startTime, endTime };
}

/**
 * Fetch telemetry data for a specific metric
 * @param {Object} metric - Metric mapping info
 * @param {string} startTime - ISO start time
 * @param {string} endTime - ISO end time
 * @returns {Array} Telemetry data points
 */
async function fetchTelemetryForMetric(metric, startTime, endTime) {
  try {
    const tableName = `telemetry_${metric.node_name.toLowerCase().replace(/\s+/g, '_')}`;
    
    const [data] = await db.query(
      `SELECT sample_time, ${metric.column_name} as value
       FROM ${tableName}
       WHERE base_station = ?
         AND sample_time BETWEEN ? AND ?
         AND ${metric.column_name} IS NOT NULL
       ORDER BY sample_time ASC`,
      [metric.base_station_name, startTime, endTime]
    );
    
    return data;
  } catch (error) {
    logger.error('Error fetching telemetry', {
      metric: metric.metric_name,
      node: metric.node_name,
      baseStation: metric.base_station_name,
      error: error.message
    });
    return [];
  }
}

/**
 * Calculate statistics from telemetry data
 * @param {Array} data - Array of {sample_time, value} objects
 * @returns {Object} Statistics (latest, min, max, avg)
 */
function calculateStats(data) {
  if (!data || data.length === 0) {
    return { latest: null, min: null, max: null, avg: null };
  }
  
  const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
  
  if (values.length === 0) {
    return { latest: null, min: null, max: null, avg: null };
  }
  
  const latest = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  
  return {
    latest: parseFloat(latest.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    avg: parseFloat(avg.toFixed(2))
  };
}

/**
 * Generate auto-narrative based on data trends
 * @param {Array} metrics - Array of metric data with stats
 * @returns {string} Narrative text
 */
function generateNarrative(metrics) {
  const narratives = [];
  
  metrics.forEach(metric => {
    const { display_name, stats, unit, view_type } = metric;
    
    if (!stats || stats.latest === null) {
      narratives.push(`${display_name}: No data available for the reporting period.`);
      return;
    }
    
    let narrative = `${display_name}: Current value is ${stats.latest}${unit}.`;
    
    if (stats.min !== null && stats.max !== null) {
      const range = stats.max - stats.min;
      const variation = range > 0 ? ((range / stats.avg) * 100).toFixed(1) : 0;
      
      narrative += ` Range: ${stats.min}-${stats.max}${unit} (avg: ${stats.avg}${unit}, ${variation}% variation).`;
      
      // Trend analysis
      if (view_type === 'graph' && metric.data && metric.data.length > 1) {
        const firstHalf = metric.data.slice(0, Math.floor(metric.data.length / 2));
        const secondHalf = metric.data.slice(Math.floor(metric.data.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + parseFloat(b.value), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + parseFloat(b.value), 0) / secondHalf.length;
        
        const change = ((secondAvg - firstAvg) / firstAvg * 100).toFixed(1);
        
        if (Math.abs(change) > 5) {
          const direction = change > 0 ? 'increasing' : 'decreasing';
          narrative += ` Trend shows ${direction} pattern (${Math.abs(change)}% change).`;
        } else {
          narrative += ` Trend is stable.`;
        }
      }
    }
    
    narratives.push(narrative);
  });
  
  return narratives.join('\n\n');
}

/**
 * GET /api/services/:serviceId/report-preview
 * Get preview of what will be included in the report
 */
router.get('/services/:serviceId/report-preview', authenticateToken, async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Get service info with client name
    const [service] = await db.query(
      `SELECT s.id, s.name, c.id as client_id, c.name as client_name
       FROM services s
       INNER JOIN client_services cs ON s.id = cs.service_id
       INNER JOIN clients c ON cs.client_id = c.id
       WHERE s.id = ?`,
      [serviceId]
    );
    
    if (service.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Get all metrics for this service with their view settings
    const [metrics] = await db.query(
      `SELECT 
        sma.id as assignment_id,
        sma.display_name,
        mm.id as metric_mapping_id,
        mm.node_name,
        mm.base_station_name,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        mm.min_value,
        mm.max_value,
        mm.color,
        COALESCE(mvs.view_type, 'graph') as view_type
       FROM service_metric_assignments sma
       INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
       LEFT JOIN metric_view_settings mvs ON mm.id = mvs.metric_mapping_id
       WHERE sma.service_id = ? AND sma.is_active = TRUE AND mm.is_active = TRUE
       ORDER BY sma.display_order, sma.created_at`,
      [serviceId]
    );
    
    // Group metrics by base station
    const baseStations = {};
    metrics.forEach(metric => {
      const key = `${metric.node_name}|${metric.base_station_name}`;
      if (!baseStations[key]) {
        baseStations[key] = {
          node_name: metric.node_name,
          base_station_name: metric.base_station_name,
          metrics: []
        };
      }
      baseStations[key].metrics.push({
        assignment_id: metric.assignment_id,
        display_name: metric.display_name,
        metric_name: metric.metric_name,
        unit: metric.unit,
        view_type: metric.view_type,
        color: metric.color,
        min_value: metric.min_value,
        max_value: metric.max_value
      });
    });
    
    res.json({
      service: {
        id: service[0].id,
        name: service[0].name,
        client_name: service[0].name
      },
      totalMetrics: metrics.length,
      baseStations: Object.values(baseStations)
    });
    
  } catch (error) {
    logger.error('Error generating report preview', { error: error.message, serviceId: req.params.serviceId });
    res.status(500).json({ error: 'Failed to generate report preview' });
  }
});

/**
 * POST /api/services/:serviceId/generate-report
 * Generate full report data for PDF generation
 */
router.post('/services/:serviceId/generate-report', authenticateToken, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { timeFilter = '1d' } = req.body;
    
    const { startTime, endTime } = calculateTimeRange(timeFilter);
    
    // Get service info
    const [service] = await db.query(
      `SELECT s.id, s.name, c.name as client_name
       FROM services s
       INNER JOIN client_services cs ON s.id = cs.service_id
       INNER JOIN clients c ON cs.client_id = c.id
       WHERE s.id = ?`,
      [serviceId]
    );
    
    if (service.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Get all metrics with full details
    const [metrics] = await db.query(
      `SELECT 
        sma.id as assignment_id,
        sma.display_name,
        sma.display_order,
        mm.id as metric_mapping_id,
        mm.node_name,
        mm.base_station_name,
        mm.metric_name,
        mm.column_name,
        mm.unit,
        mm.min_value,
        mm.max_value,
        mm.color,
        COALESCE(mvs.view_type, 'graph') as view_type
       FROM service_metric_assignments sma
       INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
       LEFT JOIN metric_view_settings mvs ON mm.id = mvs.metric_mapping_id
       WHERE sma.service_id = ? AND sma.is_active = TRUE AND mm.is_active = TRUE
       ORDER BY sma.display_order, sma.created_at`,
      [serviceId]
    );
    
    // Fetch telemetry and calculate stats for each metric
    const metricsWithData = await Promise.all(
      metrics.map(async (metric) => {
        const data = await fetchTelemetryForMetric(metric, startTime, endTime);
        const stats = calculateStats(data);
        
        return {
          assignment_id: metric.assignment_id,
          display_name: metric.display_name,
          display_order: metric.display_order,
          metric_name: metric.metric_name,
          node_name: metric.node_name,
          base_station_name: metric.base_station_name,
          column_name: metric.column_name,
          unit: metric.unit || '',
          min_value: metric.min_value ?? 0,
          max_value: metric.max_value ?? 100,
          color: metric.color,
          view_type: metric.view_type,
          data: data, // Full data for graphs
          sparkline: data.slice(-20), // Last 20 points for sparklines
          stats: stats
        };
      })
    );
    
    // Create summary table
    const summaryTable = metricsWithData.map(m => ({
      display_name: m.display_name,
      latest: m.stats.latest,
      unit: m.unit,
      node_name: m.node_name,
      base_station_name: m.base_station_name,
      view_type: m.view_type
    }));
    
    // Group by base station for page organization
    const baseStationsMap = {};
    metricsWithData.forEach(metric => {
      const key = `${metric.node_name}|${metric.base_station_name}`;
      if (!baseStationsMap[key]) {
        baseStationsMap[key] = {
          node_name: metric.node_name,
          base_station_name: metric.base_station_name,
          metrics: []
        };
      }
      baseStationsMap[key].metrics.push(metric);
    });
    
    const baseStations = Object.values(baseStationsMap);
    
    // Generate narrative
    const narrative = generateNarrative(metricsWithData);
    
    res.json({
      reportInfo: {
        clientName: service[0].name,
        serviceName: service[0].name,
        generatedAt: new Date().toISOString(),
        timeRange: {
          start: startTime,
          end: endTime,
          label: timeFilter
        }
      },
      summaryTable,
      baseStations,
      narrative,
      totalMetrics: metricsWithData.length,
      totalBaseStations: baseStations.length
    });
    
  } catch (error) {
    logger.error('Error generating report', { error: error.message, serviceId: req.params.serviceId });
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/service-reports/summary/:serviceId
 * Quick summary for dashboard widgets (latest values only)
 */
router.get('/service-reports/summary/:serviceId', authenticateToken, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { timeFilter = '1h' } = req.query;
    
    const { startTime, endTime } = calculateTimeRange(timeFilter);
    
    const [metrics] = await db.query(
      `SELECT 
        sma.display_name,
        mm.node_name,
        mm.base_station_name,
        mm.column_name,
        mm.unit,
        mm.color
       FROM service_metric_assignments sma
       INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
       WHERE sma.service_id = ? AND sma.is_active = TRUE AND mm.is_active = TRUE
       ORDER BY sma.display_order`,
      [serviceId]
    );
    
    const summary = await Promise.all(
      metrics.map(async (metric) => {
        const data = await fetchTelemetryForMetric(metric, startTime, endTime);
        const stats = calculateStats(data);
        
        return {
          display_name: metric.display_name,
          latest: stats.latest,
          unit: metric.unit,
          color: metric.color,
          hasData: data.length > 0
        };
      })
    );
    
    res.json({ summary });
    
  } catch (error) {
    logger.error('Error fetching report summary', { error: error.message, serviceId: req.params.serviceId });
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// ============================================================
// Admin Routes for Scheduled Reports
// ============================================================

/**
 * GET /api/admin/service-reports/schedules
 * List all scheduled reports (admin only)
 */
router.get('/admin/service-reports/schedules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [schedules] = await db.query(
      `SELECT 
        srs.*,
        c.name,
        s.name,
        u.username as created_by_name
       FROM service_report_schedules srs
       INNER JOIN clients c ON srs.client_id = c.id
       INNER JOIN services s ON srs.service_id = s.id
       INNER JOIN users u ON srs.created_by = u.id
       ORDER BY srs.next_scheduled_at ASC`
    );
    
    res.json({ schedules });
  } catch (error) {
    logger.error('Error fetching report schedules', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

/**
 * POST /api/admin/service-reports/schedules
 * Create new scheduled report (admin only)
 */
router.post('/admin/service-reports/schedules', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { client_id, service_id, frequency, recipients, time_filter } = req.body;
    
    // Calculate next scheduled time
    const now = new Date();
    let nextScheduled = new Date(now);
    
    switch (frequency) {
      case 'daily':
        nextScheduled.setDate(nextScheduled.getDate() + 1);
        break;
      case 'weekly':
        nextScheduled.setDate(nextScheduled.getDate() + 7);
        break;
      case 'monthly':
        nextScheduled.setMonth(nextScheduled.getMonth() + 1);
        break;
    }
    
    const [result] = await db.query(
      `INSERT INTO service_report_schedules 
       (client_id, service_id, frequency, recipients, time_filter, next_scheduled_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [client_id, service_id, frequency, JSON.stringify(recipients), time_filter, nextScheduled, req.user.id]
    );
    
    logger.info('Created report schedule', { 
      scheduleId: result.insertId,
      clientId: client_id,
      serviceId: service_id,
      frequency
    });
    
    res.status(201).json({ 
      id: result.insertId,
      message: 'Report schedule created successfully'
    });
    
  } catch (error) {
    logger.error('Error creating report schedule', { error: error.message });
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

/**
 * PUT /api/admin/service-reports/schedules/:id
 * Update scheduled report (admin only)
 */
router.put('/admin/service-reports/schedules/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { frequency, recipients, time_filter, is_active } = req.body;
    
    // Calculate next scheduled time if frequency changed
    let nextScheduled = null;
    if (frequency) {
      const now = new Date();
      nextScheduled = new Date(now);
      
      switch (frequency) {
        case 'daily':
          nextScheduled.setDate(nextScheduled.getDate() + 1);
          break;
        case 'weekly':
          nextScheduled.setDate(nextScheduled.getDate() + 7);
          break;
        case 'monthly':
          nextScheduled.setMonth(nextScheduled.getMonth() + 1);
          break;
      }
    }
    
    const updates = [];
    const values = [];
    
    if (frequency) {
      updates.push('frequency = ?');
      values.push(frequency);
    }
    if (recipients) {
      updates.push('recipients = ?');
      values.push(JSON.stringify(recipients));
    }
    if (time_filter) {
      updates.push('time_filter = ?');
      values.push(time_filter);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (nextScheduled) {
      updates.push('next_scheduled_at = ?');
      values.push(nextScheduled);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    await db.query(
      `UPDATE service_report_schedules SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({ message: 'Schedule updated successfully' });
    
  } catch (error) {
    logger.error('Error updating report schedule', { error: error.message, scheduleId: req.params.id });
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

/**
 * DELETE /api/admin/service-reports/schedules/:id
 * Delete scheduled report (admin only)
 */
router.delete('/admin/service-reports/schedules/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.query('DELETE FROM service_report_schedules WHERE id = ?', [id]);
    
    res.json({ message: 'Schedule deleted successfully' });
    
  } catch (error) {
    logger.error('Error deleting report schedule', { error: error.message, scheduleId: req.params.id });
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

module.exports = router;
