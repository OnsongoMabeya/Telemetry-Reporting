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
      dataGroups: manualReportData.data.length
    });

    // For now, reuse the existing service report document
    // In a full implementation, you'd create a ManualReportDocument component
    const adaptedReportData = {
      ...manualReportData,
      isClientReport: manualReportData.reportType === 'client',
      serviceName: manualReportData.reportType === 'client' ? 
        'Client Report' : 'Service Report',
      reportTitle: `Manual ${manualReportData.reportType.charAt(0).toUpperCase() + manualReportData.reportType.slice(1)} Report`,
      dateRange: manualReportData.dateRange,
      generatedBy: manualReportData.generatedBy,
      generatedAt: manualReportData.generatedAt,
      // Adapt the data structure to match existing format
      telemetryData: manualReportData.data.flatMap(group => 
        Object.entries(group.metrics).map(([metricName, metricData]) => ({
          metricName,
          unit: metricData.unit,
          color: metricData.color,
          data: metricData.data,
          serviceName: group.name,
          // Add other required fields
        }))
      )
    };

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
