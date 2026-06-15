/**
 * PDF Service
 * Generates PDF reports from report data using @react-pdf/renderer
 */
const React = require('react');
const { pdf } = require('@react-pdf/renderer');
const ServiceReportDocument = require('../components/ServiceReportDocument');
const logger = require('../utils/logger');

/**
 * Generate PDF buffer from report data
 * @param {Object} reportData - Report data object
 * @returns {Buffer} PDF buffer
 */
async function generateReportPDF(reportData) {
  try {
    logger.info('Generating PDF report...');

    // Create the PDF document
    const doc = React.createElement(ServiceReportDocument, { reportData });
    
    // Generate PDF buffer
    const buffer = await pdf(doc).toBuffer();

    logger.info('PDF generated successfully', {
      size: buffer.length,
      reportType: reportData.isClientReport ? 'client' : 'service'
    });

    return buffer;
  } catch (error) {
    logger.error('Failed to generate PDF:', error);
    throw error;
  }
}

/**
 * Generate PDF for manual reports
 * @param {Object} manualReportData - Manual report data
 * @returns {Buffer} PDF buffer
 */
async function generateManualReport(manualReportData) {
  try {
    logger.info('Generating manual report PDF...', {
      reportType: manualReportData.reportType,
      dataGroups: manualReportData.data.length,
      firstGroupSample: manualReportData.data.length > 0 ? {
        id: manualReportData.data[0].id,
        name: manualReportData.data[0].name,
        metricKeys: Object.keys(manualReportData.data[0].metrics || {}),
        metricCount: Object.keys(manualReportData.data[0].metrics || {}).length
      } : null
    });

    // Convert service-grouped data to baseStations format expected by ServiceReportDocument
    // Each service becomes a "base station" with its metrics
    const baseStations = manualReportData.data.map(group => {
      // Convert metrics object to array format expected by PDF component
      const metrics = Object.entries(group.metrics).map(([metricName, metricData]) => ({
        display_name: metricName,
        metricName: metricName,
        unit: metricData.unit,
        color: metricData.color,
        data: metricData.data,
        stats: metricData.stats || {},
        view_type: metricData.view_type || 'graph',
        metric_mapping_id: metricData.metric_mapping_id
      }));

      return {
        base_station_name: group.name,
        node_name: metrics[0]?.data?.[0]?.nodeName || group.name,
        service_name: group.name,
        service_id: group.id,
        client_name: group.clientName,
        client_id: group.clientId,
        metrics: metrics
      };
    });

    // Calculate summary table from metrics
    const summaryTable = baseStations.flatMap(bs => 
      bs.metrics.map(m => ({
        metric: m.display_name,
        latest: m.stats?.latest || (m.data?.[m.data.length - 1]?.value),
        unit: m.unit,
        node: bs.node_name,
        base_station: bs.base_station_name
      }))
    );

    // Build report info
    const isClientReport = manualReportData.reportType === 'client';
    const reportInfo = {
      report_type: isClientReport ? 'client_comprehensive' : 'service',
      clientName: isClientReport ? baseStations[0]?.client_name : null,
      serviceName: isClientReport ? null : baseStations[0]?.service_name,
      generatedAt: manualReportData.generatedAt,
      timeRange: manualReportData.dateRange || {}
    };

    // Adapt the data structure to match ServiceReportDocument expected format
    const adaptedReportData = {
      reportInfo,
      summaryTable,
      baseStations,
      totalMetrics: baseStations.reduce((sum, bs) => sum + bs.metrics.length, 0),
      totalBaseStations: baseStations.length
    };

    // Log adapted data
    logger.info('Adapted report data for PDF', {
      baseStationsCount: adaptedReportData.baseStations.length,
      totalMetrics: adaptedReportData.totalMetrics,
      reportType: reportInfo.report_type,
      firstBaseStation: adaptedReportData.baseStations.length > 0 ? {
        name: adaptedReportData.baseStations[0].base_station_name,
        node: adaptedReportData.baseStations[0].node_name,
        metricCount: adaptedReportData.baseStations[0].metrics.length
      } : null
    });

    // Create the PDF document using existing component
    const doc = React.createElement(ServiceReportDocument, { reportData: adaptedReportData });
    
    // Generate PDF buffer
    const buffer = await pdf(doc).toBuffer();

    logger.info('Manual report PDF generated successfully', {
      size: buffer.length,
      reportType: manualReportData.reportType
    });

    return buffer;
  } catch (error) {
    logger.error('Failed to generate manual report PDF:', error);
    throw error;
  }
}

module.exports = {
  generateReportPDF,
  generateManualReport
};
