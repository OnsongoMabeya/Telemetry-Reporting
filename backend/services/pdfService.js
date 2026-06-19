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
      dataStructure: manualReportData.data ? Object.keys(manualReportData.data) : 'undefined',
      baseStationsCount: manualReportData.data?.baseStations?.length,
      totalMetrics: manualReportData.data?.totalMetrics,
      totalBaseStations: manualReportData.data?.totalBaseStations
    });

    // The data now comes pre-structured from manualReportProcessor with baseStations array
    // This matches the automated report structure from reportDataService
    const baseStations = manualReportData.data?.baseStations || [];
    const services = manualReportData.data?.services || [];  // <-- Service hierarchy
    const totalMetrics = manualReportData.data?.totalMetrics || 0;
    const totalBaseStations = manualReportData.data?.totalBaseStations || baseStations.length;
    
    logger.info('pdfService', 'Using pre-structured base station data', {
      totalBaseStations: baseStations.length,
      totalMetrics: totalMetrics,
      serviceCount: services.length,  // <-- Log service count
      serviceNames: services.map(s => s.service_name),  // <-- Log service names
      baseStationNames: baseStations.map(bs => bs.base_station_name),
      metricsPerBaseStation: baseStations.map(bs => ({ 
        name: bs.base_station_name, 
        count: bs.metrics?.length || 0 
      }))
    });

    // Calculate summary table from metrics
    const summaryTable = baseStations
      .flatMap(bs => 
        (bs.metrics || []).map(m => ({
          display_name: m.display_name,
          latest: m.stats?.latest ?? null,
          unit: m.unit,
          node_name: bs.node_name,
          base_station_name: bs.base_station_name,
          data: m.data,
          stats: m.stats
        }))
      )
      .sort((a, b) => {
        // Sort by Node first, then by Base Station, then by Metric
        const nodeCompare = (a.node_name || '').localeCompare(b.node_name || '');
        if (nodeCompare !== 0) return nodeCompare;
        const bsCompare = (a.base_station_name || '').localeCompare(b.base_station_name || '');
        if (bsCompare !== 0) return bsCompare;
        return (a.display_name || '').localeCompare(b.display_name || '');
      });

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
      services,  // <-- Service hierarchy for PDF rendering
      baseStations,
      totalMetrics: totalMetrics,
      totalBaseStations: totalBaseStations
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
