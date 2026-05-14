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

module.exports = {
  generateReportPDF
};
