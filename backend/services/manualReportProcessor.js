/**
 * Manual Report Processing Service
 * 
 * Handles background processing of manual reports with progress tracking,
 * large date range handling, and PDF generation integration.
 * 
 * @module services/manualReportProcessor
 */

const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class ManualReportProcessor {
  constructor() {
    this.isProcessing = false;
    this.processingQueue = [];
    this.activeJobs = new Map(); // reportId -> job info
    this.db = null;
  }

  /**
   * Set database connection
   * @param {Object} database - MySQL database connection
   */
  setDatabase(database) {
    this.db = database;
  }

  /**
   * Start processing a manual report
   * @param {number} reportId - Report ID to process
   */
  async startProcessing(reportId) {
    try {
      // Get report details
      const [reports] = await this.db.query(
        `SELECT id, report_type, target_ids, date_range_start, date_range_end,
                generated_by, delivery_method, recipients, cache_key
         FROM manual_reports 
         WHERE id = ? AND status = 'generating'`,
        [reportId]
      );

      if (reports.length === 0) {
        logger.error('ManualReportProcessor', 'Report not found or not in generating state', {
          reportId
        });
        return;
      }

      const report = reports[0];
      const targetIds = JSON.parse(report.target_ids);

      // Initialize job tracking
      this.activeJobs.set(reportId, {
        report,
        startTime: Date.now(),
        progress: 0,
        status: 'processing',
        chunks: [],
        totalChunks: 0
      });

      logger.info('ManualReportProcessor', 'Starting report processing', {
        reportId,
        reportType: report.report_type,
        targetCount: targetIds.length,
        dateRange: `${report.date_range_start} to ${report.date_range_end}`
      });

      // Start processing in background
      this.processReport(reportId, report, targetIds);

    } catch (error) {
      logger.error('ManualReportProcessor', 'Failed to start processing', {
        reportId,
        error: error.message
      });
      
      await this.markReportFailed(reportId, error.message);
    }
  }

  /**
   * Process a report with background handling
   * @param {number} reportId - Report ID
   * @param {Object} report - Report details
   * @param {Array} targetIds - Target service/client IDs
   */
  async processReport(reportId, report, targetIds) {
    try {
      const startTime = Date.now();

      // Update progress
      await this.updateProgress(reportId, 10, 'Initializing report generation...');

      // Calculate date range and determine chunking strategy
      const startDate = new Date(report.date_range_start);
      const endDate = new Date(report.date_range_end);
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      let chunks = [];
      
      if (daysDiff > 30) {
        // Split large date ranges into 30-day chunks
        chunks = this.splitDateRange(startDate, endDate, 30);
        logger.info('ManualReportProcessor', 'Split large date range into chunks', {
          reportId,
          totalDays: daysDiff,
          chunkCount: chunks.length
        });
      } else {
        // Single chunk for smaller ranges
        chunks = [{
          start: startDate,
          end: endDate,
          targetIds: targetIds
        }];
      }

      // Update job info
      const job = this.activeJobs.get(reportId);
      job.chunks = chunks;
      job.totalChunks = chunks.length;

      await this.updateProgress(reportId, 20, `Processing ${chunks.length} data chunks...`);

      // Process chunks and collect data
      const allData = [];
      let processedChunks = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          const chunkData = await this.processChunk(reportId, report, chunk, i, chunks.length);
          allData.push(...chunkData);
          processedChunks++;

          const progress = 20 + (processedChunks / chunks.length) * 60; // 20-80%
          await this.updateProgress(reportId, Math.round(progress), 
            `Processed ${processedChunks}/${chunks.length} chunks...`);

        } catch (chunkError) {
          logger.error('ManualReportProcessor', 'Chunk processing failed', {
            reportId,
            chunkIndex: i,
            error: chunkError.message
          });
          throw chunkError;
        }
      }

      await this.updateProgress(reportId, 85, 'Generating PDF report...');

      // Generate PDF from collected data
      const pdfResult = await this.generatePDF(reportId, report, allData);

      await this.updateProgress(reportId, 95, 'Finalizing report...');

      // Update report with completion details
      const generationTime = Date.now() - startTime;
      await this.markReportCompleted(reportId, pdfResult.filePath, pdfResult.fileSize, generationTime);

      // Handle delivery method
      if (report.delivery_method === 'email' || report.delivery_method === 'both') {
        await this.sendEmailReport(reportId, report, pdfResult.filePath);
      }

      await this.updateProgress(reportId, 100, 'Report completed successfully');

      logger.info('ManualReportProcessor', 'Report processing completed', {
        reportId,
        generationTime,
        fileSize: pdfResult.fileSize,
        chunksProcessed: processedChunks
      });

      // Clean up job tracking
      this.activeJobs.delete(reportId);

    } catch (error) {
      logger.error('ManualReportProcessor', 'Report processing failed', {
        reportId,
        error: error.message,
        stack: error.stack
      });

      await this.markReportFailed(reportId, error.message);
      this.activeJobs.delete(reportId);
    }
  }

  /**
   * Process a single data chunk
   * @param {number} reportId - Report ID
   * @param {Object} report - Report details
   * @param {Object} chunk - Chunk data (start, end, targetIds)
   * @param {number} chunkIndex - Current chunk index
   * @param {number} totalChunks - Total number of chunks
   */
  async processChunk(reportId, report, chunk, chunkIndex, totalChunks) {
    try {
      logger.debug('ManualReportProcessor', 'Processing chunk', {
        reportId,
        chunkIndex,
        dateRange: `${chunk.start.toISOString()} to ${chunk.end.toISOString()}`,
        targetCount: chunk.targetIds.length
      });

      // Get telemetry data for this chunk
      const telemetryData = await this.getTelemetryData(report.report_type, chunk.targetIds, chunk.start, chunk.end);

      // Get metric mappings for formatting
      const metricMappings = await this.getMetricMappings(report.report_type, chunk.targetIds);

      // Process and format data
      const processedData = this.formatTelemetryData(telemetryData, metricMappings, report.report_type);

      logger.debug('ManualReportProcessor', 'Chunk processed successfully', {
        reportId,
        chunkIndex,
        dataPoints: processedData.length
      });

      return processedData;

    } catch (error) {
      logger.error('ManualReportProcessor', 'Chunk processing failed', {
        reportId,
        chunkIndex,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get telemetry data for targets within date range
   * @param {string} reportType - 'service' or 'client'
   * @param {Array} targetIds - Target IDs
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async getTelemetryData(reportType, targetIds, startDate, endDate) {
    try {
      let query;
      let params;

      if (reportType === 'service') {
        // Service-based query
        query = `
          SELECT td.*, s.name as service_name, c.name as client_name,
                 n.node_name, bs.base_station_name
          FROM telemetry_data td
          JOIN services s ON td.service_id = s.id
          JOIN clients c ON s.client_id = c.id
          JOIN nodes n ON td.node_id = n.id
          JOIN basestations bs ON td.base_station_id = bs.id
          WHERE td.service_id IN (${targetIds.map(() => '?').join(',')})
            AND td.timestamp BETWEEN ? AND ?
          ORDER BY td.timestamp ASC, td.service_id, td.node_id, td.base_station_id
        `;
        params = [...targetIds, startDate, endDate];

      } else {
        // Client-based query (all services for these clients)
        query = `
          SELECT td.*, s.name as service_name, c.name as client_name,
                 n.node_name, bs.base_station_name
          FROM telemetry_data td
          JOIN services s ON td.service_id = s.id
          JOIN clients c ON s.client_id = c.id
          JOIN nodes n ON td.node_id = n.id
          JOIN basestations bs ON td.base_station_id = bs.id
          WHERE c.id IN (${targetIds.map(() => '?').join(',')})
            AND td.timestamp BETWEEN ? AND ?
          ORDER BY td.timestamp ASC, c.id, td.service_id, td.node_id, td.base_station_id
        `;
        params = [...targetIds, startDate, endDate];
      }

      const [rows] = await this.db.query(query, params);
      
      logger.debug('ManualReportProcessor', 'Telemetry data retrieved', {
        reportType,
        targetCount: targetIds.length,
        dataPoints: rows.length,
        dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`
      });

      return rows;

    } catch (error) {
      logger.error('ManualReportProcessor', 'Failed to get telemetry data', {
        reportType,
        targetIds,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get metric mappings for targets
   * @param {string} reportType - 'service' or 'client'
   * @param {Array} targetIds - Target IDs
   */
  async getMetricMappings(reportType, targetIds) {
    try {
      let query;
      let params;

      if (reportType === 'service') {
        query = `
          SELECT mm.*, s.name as service_name, c.name as client_name
          FROM metric_mappings mm
          JOIN services s ON mm.service_id = s.id
          JOIN clients c ON s.client_id = c.id
          WHERE mm.service_id IN (${targetIds.map(() => '?').join(',')})
          ORDER BY s.id, mm.display_order
        `;
        params = targetIds;

      } else {
        query = `
          SELECT mm.*, s.name as service_name, c.name as client_name
          FROM metric_mappings mm
          JOIN services s ON mm.service_id = s.id
          JOIN clients c ON s.client_id = c.id
          WHERE c.id IN (${targetIds.map(() => '?').join(',')})
          ORDER BY c.id, s.id, mm.display_order
        `;
        params = targetIds;
      }

      const [rows] = await this.db.query(query, params);
      
      logger.debug('ManualReportProcessor', 'Metric mappings retrieved', {
        reportType,
        targetCount: targetIds.length,
        mappingCount: rows.length
      });

      return rows;

    } catch (error) {
      logger.error('ManualReportProcessor', 'Failed to get metric mappings', {
        reportType,
        targetIds,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Format telemetry data for report generation
   * @param {Array} telemetryData - Raw telemetry data
   * @param {Array} metricMappings - Metric mappings
   * @param {string} reportType - 'service' or 'client'
   */
  formatTelemetryData(telemetryData, metricMappings, reportType) {
    try {
      // Group data by service/client and metric
      const groupedData = {};

      telemetryData.forEach(record => {
        const groupKey = reportType === 'service' ? 
          `service_${record.service_id}` : 
          `client_${record.client_id}`;
        
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = {
            id: reportType === 'service' ? record.service_id : record.client_id,
            name: reportType === 'service' ? record.service_name : record.client_name,
            metrics: {}
          };
        }

        // Find metric mapping for this record
        const mapping = metricMappings.find(m => 
          m.service_id === record.service_id && 
          m.column_name === record.column_name
        );

        if (mapping) {
          const metricKey = mapping.metric_name || record.column_name;
          
          if (!groupedData[groupKey].metrics[metricKey]) {
            groupedData[groupKey].metrics[metricKey] = {
              unit: mapping.unit,
              color: mapping.color,
              data: []
            };
          }

          groupedData[groupKey].metrics[metricKey].data.push({
            timestamp: record.timestamp,
            value: record.value,
            nodeName: record.node_name,
            baseStationName: record.base_station_name
          });
        }
      });

      const formattedData = Object.values(groupedData);
      
      logger.debug('ManualReportProcessor', 'Telemetry data formatted', {
        reportType,
        groupCount: formattedData.length,
        totalDataPoints: telemetryData.length
      });

      return formattedData;

    } catch (error) {
      logger.error('ManualReportProcessor', 'Failed to format telemetry data', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate PDF from processed data
   * @param {number} reportId - Report ID
   * @param {Object} report - Report details
   * @param {Array} data - Processed telemetry data
   */
  async generatePDF(reportId, report, data) {
    try {
      // Import PDF generation service
      const pdfService = require('./pdfService');
      
      // Create reports directory if it doesn't exist
      const reportsDir = path.join(__dirname, '../reports/manual');
      await fs.mkdir(reportsDir, { recursive: true });

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `manual_report_${report.report_type}_${reportId}_${timestamp}.pdf`;
      const filePath = path.join(reportsDir, filename);

      logger.info('ManualReportProcessor', 'Generating PDF', {
        reportId,
        filename,
        dataGroups: data.length
      });

      // Generate PDF using existing service
      const pdfBuffer = await pdfService.generateManualReport({
        reportType: report.report_type,
        data: data,
        dateRange: {
          start: report.date_range_start,
          end: report.date_range_end
        },
        generatedBy: report.generated_by,
        generatedAt: new Date().toISOString()
      });

      // Save PDF to file
      await fs.writeFile(filePath, pdfBuffer);

      const stats = await fs.stat(filePath);
      
      logger.info('ManualReportProcessor', 'PDF generated successfully', {
        reportId,
        filePath,
        fileSize: stats.size
      });

      return {
        filePath,
        fileSize: stats.size
      };

    } catch (error) {
      logger.error('ManualReportProcessor', 'PDF generation failed', {
        reportId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send report via email
   * @param {number} reportId - Report ID
   * @param {Object} report - Report details
   * @param {string} filePath - Path to PDF file
   */
  async sendEmailReport(reportId, report, filePath) {
    try {
      // Import email service
      const emailService = require('./emailService');
      
      const recipients = JSON.parse(report.recipients || '[]');
      
      if (recipients.length === 0) {
        logger.warn('ManualReportProcessor', 'No recipients for email delivery', {
          reportId
        });
        return;
      }

      logger.info('ManualReportProcessor', 'Sending report via email', {
        reportId,
        recipientCount: recipients.length
      });

      // Send email using existing service
      await emailService.sendManualReport({
        to: recipients,
        subject: `Manual Report: ${report.report_type} - ${new Date().toLocaleDateString()}`,
        reportType: report.report_type,
        dateRange: {
          start: report.date_range_start,
          end: report.date_range_end
        },
        filePath: filePath
      });

      logger.info('ManualReportProcessor', 'Email sent successfully', {
        reportId,
        recipientCount: recipients.length
      });

    } catch (error) {
      logger.error('ManualReportProcessor', 'Email sending failed', {
        reportId,
        error: error.message
      });
      // Don't throw error - email failure shouldn't mark report as failed
    }
  }

  /**
   * Split date range into chunks
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} chunkSizeDays - Size of each chunk in days
   */
  splitDateRange(startDate, endDate, chunkSizeDays) {
    const chunks = [];
    let currentStart = new Date(startDate);

    while (currentStart < endDate) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + chunkSizeDays);
      
      // Don't go beyond the end date
      if (currentEnd > endDate) {
        currentEnd.setTime(endDate.getTime());
      }

      chunks.push({
        start: new Date(currentStart),
        end: new Date(currentEnd)
      });

      currentStart = new Date(currentEnd);
    }

    return chunks;
  }

  /**
   * Update report progress
   * @param {number} reportId - Report ID
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  async updateProgress(reportId, progress, message) {
    try {
      await this.db.query(
        `UPDATE manual_reports 
         SET updated_at = NOW() 
         WHERE id = ?`,
        [reportId]
      );

      // Progress is tracked in memory for real-time updates
      const job = this.activeJobs.get(reportId);
      if (job) {
        job.progress = progress;
        job.status = message;
      }

      logger.debug('ManualReportProcessor', 'Progress updated', {
        reportId,
        progress,
        message
      });

    } catch (error) {
      logger.error('ManualReportProcessor', 'Failed to update progress', {
        reportId,
        error: error.message
      });
    }
  }

  /**
   * Mark report as completed
   * @param {number} reportId - Report ID
   * @param {string} filePath - Path to generated PDF
   * @param {number} fileSize - File size in bytes
   * @param {number} generationTime - Generation time in milliseconds
   */
  async markReportCompleted(reportId, filePath, fileSize, generationTime) {
    try {
      await this.db.query(
        `UPDATE manual_reports 
         SET status = 'completed',
             generation_time_ms = ?,
             pdf_size_bytes = ?,
             file_path = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [generationTime, fileSize, filePath, reportId]
      );

      logger.info('ManualReportProcessor', 'Report marked as completed', {
        reportId,
        filePath,
        fileSize,
        generationTime
      });

    } catch (error) {
      logger.error('ManualReportProcessor', 'Failed to mark report as completed', {
        reportId,
        error: error.message
      });
    }
  }

  /**
   * Mark report as failed
   * @param {number} reportId - Report ID
   * @param {string} errorMessage - Error message
   */
  async markReportFailed(reportId, errorMessage) {
    try {
      await this.db.query(
        `UPDATE manual_reports 
         SET status = 'failed',
             error_message = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [errorMessage, reportId]
      );

      logger.error('ManualReportProcessor', 'Report marked as failed', {
        reportId,
        errorMessage
      });

    } catch (error) {
      logger.error('ManualReportProcessor', 'Failed to mark report as failed', {
        reportId,
        error: error.message
      });
    }
  }

  /**
   * Get current progress for a report
   * @param {number} reportId - Report ID
   */
  getProgress(reportId) {
    const job = this.activeJobs.get(reportId);
    if (!job) {
      return null;
    }

    return {
      progress: job.progress,
      status: job.status,
      totalChunks: job.totalChunks,
      processedChunks: job.chunks ? job.chunks.length : 0,
      startTime: job.startTime
    };
  }

  /**
   * Cancel report processing
   * @param {number} reportId - Report ID
   */
  async cancelProcessing(reportId) {
    try {
      const job = this.activeJobs.get(reportId);
      if (!job) {
        return false;
      }

      // Mark as cancelled in database
      await this.db.query(
        `UPDATE manual_reports 
         SET status = 'failed',
             error_message = 'Report processing was cancelled',
             updated_at = NOW()
         WHERE id = ?`,
        [reportId]
      );

      // Remove from active jobs
      this.activeJobs.delete(reportId);

      logger.info('ManualReportProcessor', 'Report processing cancelled', {
        reportId
      });

      return true;

    } catch (error) {
      logger.error('ManualReportProcessor', 'Failed to cancel processing', {
        reportId,
        error: error.message
      });
      return false;
    }
  }
}

// Create singleton instance
const manualReportProcessor = new ManualReportProcessor();

module.exports = manualReportProcessor;
