/**
 * Report Data Service
 * Shared logic for generating service and client report data.
 * Used by both the API routes and the scheduler.
 */
const logger = require('../utils/logger');

let db = null;

function setDatabase(database) {
  db = database;
}

function calculateTimeRange(timeFilter) {
  const now = new Date();
  const endTime = now.toISOString();
  let startTime;
  switch (timeFilter) {
    case '5m':   startTime = new Date(now - 5 * 60 * 1000).toISOString(); break;
    case '10m':  startTime = new Date(now - 10 * 60 * 1000).toISOString(); break;
    case '30m':  startTime = new Date(now - 30 * 60 * 1000).toISOString(); break;
    case '1h':   startTime = new Date(now - 60 * 60 * 1000).toISOString(); break;
    case '2h':   startTime = new Date(now - 2 * 60 * 60 * 1000).toISOString(); break;
    case '6h':   startTime = new Date(now - 6 * 60 * 60 * 1000).toISOString(); break;
    case '12h':  startTime = new Date(now - 12 * 60 * 60 * 1000).toISOString(); break;
    case '1d':   startTime = new Date(now - 24 * 60 * 60 * 1000).toISOString(); break;
    case '24h':  startTime = new Date(now - 24 * 60 * 60 * 1000).toISOString(); break;
    case '2d':   startTime = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(); break;
    case '7d':   startTime = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(); break;
    case '1w':   startTime = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(); break;
    case '30d':  startTime = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(); break;
    default:     startTime = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  }
  return { startTime, endTime };
}

async function fetchTelemetryForMetric(metric, startTime, endTime) {
  try {
    const query = `SELECT time as sample_time, ${metric.column_name} as value
       FROM node_status_table
       WHERE NodeName = ?
         AND NodeBaseStationName = ?
         AND time BETWEEN ? AND ?
         AND ${metric.column_name} IS NOT NULL
       ORDER BY time ASC`;
    const [data] = await db.query(query, [metric.node_name, metric.base_station_name, startTime, endTime]);
    return data;
  } catch (error) {
    logger.error('Error fetching telemetry:', { metric: metric.metric_name, error: error.message });
    return [];
  }
}

function calculateStats(data) {
  if (!data || data.length === 0) return { latest: null, min: null, max: null, avg: null };
  const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
  if (values.length === 0) return { latest: null, min: null, max: null, avg: null };
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
 * Generate service report data (mirrors POST /api/services/:serviceId/generate-report)
 */
async function generateServiceReportData(serviceId, timeFilter = '1d') {
  const { startTime, endTime } = calculateTimeRange(timeFilter);

  const [service] = await db.query(
    `SELECT s.id, s.name, c.name as client_name
     FROM services s
     INNER JOIN client_services cs ON s.id = cs.service_id
     INNER JOIN clients c ON cs.client_id = c.id
     WHERE s.id = ?`,
    [serviceId]
  );

  if (service.length === 0) throw new Error(`Service ${serviceId} not found`);

  const [metrics] = await db.query(
    `SELECT 
      sma.id as assignment_id, sma.display_name, sma.display_order,
      mm.id as metric_mapping_id, mm.node_name, mm.base_station_name,
      mm.metric_name, mm.column_name, mm.unit, mm.min_value, mm.max_value, mm.color,
      COALESCE(mvs.view_type, 'graph') as view_type,
      mvs.merge_group_id, mvs.merge_group_name
     FROM service_metric_assignments sma
     INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
     LEFT JOIN metric_view_settings mvs ON mm.id = mvs.metric_mapping_id
     WHERE sma.service_id = ? AND sma.is_active = TRUE AND mm.is_active = TRUE
     ORDER BY sma.display_order, sma.created_at`,
    [serviceId]
  );

  const metricsWithData = await Promise.all(
    metrics.map(async (metric) => {
      const data = await fetchTelemetryForMetric(metric, startTime, endTime);
      const stats = calculateStats(data);
      return {
        assignment_id: metric.assignment_id,
        display_name: metric.display_name,
        display_order: metric.display_order,
        metric_mapping_id: metric.metric_mapping_id,
        metric_name: metric.metric_name,
        node_name: metric.node_name,
        base_station_name: metric.base_station_name,
        column_name: metric.column_name,
        unit: metric.unit || '',
        min_value: metric.min_value ?? 0,
        max_value: metric.max_value ?? 100,
        color: metric.color,
        view_type: metric.view_type,
        merge_group_id: metric.merge_group_id,
        merge_group_name: metric.merge_group_name,
        data,
        sparkline: data.slice(-20),
        stats
      };
    })
  );

  const summaryTable = metricsWithData.map(m => ({
    display_name: m.display_name,
    latest: m.stats.latest,
    unit: m.unit,
    node_name: m.node_name,
    base_station_name: m.base_station_name,
    view_type: m.view_type
  }));

  const baseStationsMap = {};
  metricsWithData.forEach(metric => {
    const key = `${metric.node_name}|${metric.base_station_name}`;
    if (!baseStationsMap[key]) {
      baseStationsMap[key] = { node_name: metric.node_name, base_station_name: metric.base_station_name, metrics: [] };
    }
    baseStationsMap[key].metrics.push(metric);
  });
  const baseStations = Object.values(baseStationsMap);

  return {
    reportInfo: {
      clientName: service[0].client_name,
      serviceName: service[0].name,
      generatedAt: new Date().toISOString(),
      timeRange: { start: startTime, end: endTime, label: timeFilter }
    },
    summaryTable,
    baseStations,
    totalMetrics: metricsWithData.length,
    totalBaseStations: baseStations.length
  };
}

/**
 * Generate client report data (mirrors POST /api/reports/client/:clientId/generate)
 */
async function generateClientReportData(clientId, timeFilter = '1d') {
  const { startTime, endTime } = calculateTimeRange(timeFilter);

  const [client] = await db.query(`SELECT id, name FROM clients WHERE id = ?`, [clientId]);
  if (client.length === 0) throw new Error(`Client ${clientId} not found`);

  const [services] = await db.query(
    `SELECT DISTINCT s.id, s.name
     FROM services s
     INNER JOIN client_services cs ON s.id = cs.service_id
     WHERE cs.client_id = ? AND s.is_active = TRUE
     ORDER BY s.name`,
    [clientId]
  );

  const servicesWithData = await Promise.all(
    services.map(async (service) => {
      const [metrics] = await db.query(
        `SELECT 
          sma.id as assignment_id, sma.display_name, sma.display_order,
          mm.id as metric_mapping_id, mm.node_name, mm.base_station_name,
          mm.metric_name, mm.column_name, mm.unit, mm.min_value, mm.max_value, mm.color,
          COALESCE(mvs.view_type, 'graph') as view_type,
          mvs.merge_group_id, mvs.merge_group_name
         FROM service_metric_assignments sma
         INNER JOIN metric_mappings mm ON sma.metric_mapping_id = mm.id
         LEFT JOIN metric_view_settings mvs ON mm.id = mvs.metric_mapping_id
         WHERE sma.service_id = ? AND sma.is_active = TRUE AND mm.is_active = TRUE
         ORDER BY sma.display_order, sma.created_at`,
        [service.id]
      );

      const metricsWithData = await Promise.all(
        metrics.map(async (metric) => {
          const data = await fetchTelemetryForMetric(metric, startTime, endTime);
          const stats = calculateStats(data);
          return {
            assignment_id: metric.assignment_id,
            display_name: metric.display_name,
            display_order: metric.display_order,
            metric_mapping_id: metric.metric_mapping_id,
            metric_name: metric.metric_name,
            node_name: metric.node_name,
            base_station_name: metric.base_station_name,
            column_name: metric.column_name,
            unit: metric.unit || '',
            min_value: metric.min_value ?? 0,
            max_value: metric.max_value ?? 100,
            color: metric.color,
            view_type: metric.view_type,
            merge_group_id: metric.merge_group_id,
            merge_group_name: metric.merge_group_name,
            data,
            sparkline: data.slice(-20),
            stats
          };
        })
      );

      const baseStationsMap = new Map();
      metricsWithData.forEach(metric => {
        const key = metric.base_station_name || 'Unknown';
        if (!baseStationsMap.has(key)) {
          baseStationsMap.set(key, { base_station_name: key, node_name: metric.node_name, metrics: [] });
        }
        baseStationsMap.get(key).metrics.push(metric);
      });

      return {
        service_id: service.id,
        service_name: service.name,
        baseStations: Array.from(baseStationsMap.values())
      };
    })
  );

  const allBaseStations = servicesWithData.flatMap(s =>
    s.baseStations.map(bs => ({ ...bs, service_name: s.service_name }))
  );

  const summaryTable = allBaseStations.flatMap(bs =>
    bs.metrics.map(m => ({
      display_name: m.display_name,
      latest: m.stats.latest,
      unit: m.unit,
      node_name: m.node_name,
      base_station_name: m.base_station_name
    }))
  );

  return {
    reportInfo: {
      client_name: client[0].name,
      clientName: client[0].name,
      generatedAt: new Date().toISOString(),
      report_type: 'client_comprehensive',
      time_range: timeFilter,
      start_time: startTime,
      end_time: endTime,
      timeRange: { start: startTime, end: endTime, label: timeFilter }
    },
    summary: {
      totalMetrics: allBaseStations.reduce((a, bs) => a + bs.metrics.length, 0),
      totalBaseStations: allBaseStations.length,
      quickStats: servicesWithData.map(s => ({
        service_name: s.service_name,
        metrics: s.baseStations.flatMap(bs => bs.metrics.map(m => ({
          metric_name: m.display_name,
          unit: m.unit,
          current: m.stats.latest,
          node_name: m.node_name,
          base_station_name: m.base_station_name
        })))
      }))
    },
    services: servicesWithData,
    baseStations: allBaseStations,
    totalMetrics: allBaseStations.reduce((a, bs) => a + bs.metrics.length, 0),
    totalBaseStations: allBaseStations.length
  };
}

/**
 * Transform raw client report data into the shape expected by ServiceReportDocument.
 * Mirrors the transformation in frontend ServiceReportModal.js handleGenerateClientReport.
 */
function transformClientReportForPDF(clientReportData) {
  return {
    reportInfo: {
      clientName: clientReportData.reportInfo?.client_name || clientReportData.reportInfo?.clientName,
      service_name: `${clientReportData.reportInfo?.client_name || 'Client'} - All Services`,
      report_type: 'client_comprehensive',
      generatedAt: clientReportData.reportInfo?.generatedAt || new Date().toISOString(),
      timeRange: {
        label: clientReportData.reportInfo?.time_range || clientReportData.reportInfo?.timeRange?.label || '1d',
        start: clientReportData.reportInfo?.start_time || clientReportData.reportInfo?.timeRange?.start,
        end: clientReportData.reportInfo?.end_time || clientReportData.reportInfo?.timeRange?.end
      }
    },
    summaryTable: clientReportData.baseStations?.flatMap(bs =>
      (bs.metrics || []).map(m => ({
        display_name: m.display_name,
        latest: m.stats?.latest ?? null,
        unit: m.unit,
        node_name: m.node_name || bs.node_name,
        base_station_name: m.base_station_name || bs.base_station_name
      }))
    ) || [],
    totalMetrics: clientReportData.totalMetrics || 0,
    totalBaseStations: clientReportData.totalBaseStations || 0,
    baseStations: clientReportData.baseStations || []
  };
}

module.exports = {
  setDatabase,
  generateServiceReportData,
  generateClientReportData,
  transformClientReportForPDF
};
