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
    this.cacheManager = null;
  }

  /**
   * Set cache manager
   * @param {Object} cacheManager - Manual report cache manager instance
   */
  setCacheManager(cacheManager) {
    this.cacheManager = cacheManager;
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
      const targetIds = typeof report.target_ids === 'string' ? JSON.parse(report.target_ids) : report.target_ids;

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
        // Add targetIds to each chunk
        chunks = chunks.map(chunk => ({
          ...chunk,
          targetIds: targetIds
        }));
        logger.info('ManualReportProcessor', 'Split large date range into chunks', {
          reportId,
          totalDays: daysDiff,
          chunkCount: chunks.length,
          targetCount: targetIds.length
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
      // Now formatTelemetryData returns { services, baseStations, totalMetrics, totalBaseStations }
      const allBaseStations = [];
      const allServicesMap = {}; // Merge services across chunks
      let totalMetrics = 0;
      let processedChunks = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          const chunkData = await this.processChunk(reportId, report, chunk, i, chunks.length);
          // chunkData is now an object with services and baseStations arrays
          if (chunkData.baseStations && Array.isArray(chunkData.baseStations)) {
            allBaseStations.push(...chunkData.baseStations);
            totalMetrics += chunkData.totalMetrics || 0;
          }
          // Merge services from this chunk
          if (chunkData.services && Array.isArray(chunkData.services)) {
            chunkData.services.forEach(service => {
              const key = `${service.service_id}_${service.service_name}`;
              if (!allServicesMap[key]) {
                allServicesMap[key] = {
                  service_id: service.service_id,
                  service_name: service.service_name,
                  baseStations: []
                };
              }
              // Add base stations from this service in this chunk
              if (service.baseStations && Array.isArray(service.baseStations)) {
                allServicesMap[key].baseStations.push(...service.baseStations);
              }
            });
          }
          processedChunks++;

          const progress = 20 + (processedChunks / chunks.length) * 60; // 20-80%
          await this.updateProgress(reportId, Math.round(progress), 
            `Processed ${processedChunks}/${chunks.length} chunks...`);

          // Yield to event loop to prevent blocking other requests
          await new Promise(resolve => setImmediate(resolve));

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

      // Prepare final data structure matching automated reports
      // Merge any duplicate base stations within each service AND combine their metrics
      const mergedServices = Object.values(allServicesMap).map(service => {
        const baseStationMap = {};
        service.baseStations.forEach(bs => {
          const key = `${bs.node_name}|${bs.base_station_name}`;
          if (!baseStationMap[key]) {
            baseStationMap[key] = { ...bs, metrics: [...bs.metrics] };
          } else {
            // Same base station from different chunk - merge metrics
            bs.metrics.forEach(metric => {
              const existingMetric = baseStationMap[key].metrics.find(m => 
                m.metric_name === metric.metric_name || m.display_name === metric.display_name
              );
              if (!existingMetric) {
                baseStationMap[key].metrics.push(metric);
              } else {
                // Metric exists - merge data points
                existingMetric.data = [...existingMetric.data, ...metric.data];
              }
            });
          }
        });
        return {
          ...service,
          baseStations: Object.values(baseStationMap)
        };
      });
      
      // Build flat base stations list from merged services (unique across all services)
      const globalBaseStationMap = {};
      mergedServices.forEach(service => {
        service.baseStations.forEach(bs => {
          const key = `${bs.node_name}|${bs.base_station_name}`;
          if (!globalBaseStationMap[key]) {
            globalBaseStationMap[key] = { ...bs };
          }
        });
      });
      const mergedBaseStations = Object.values(globalBaseStationMap);
      
      // Recalculate totals from merged data
      const mergedTotalMetrics = mergedBaseStations.reduce((sum, bs) => sum + bs.metrics.length, 0);
      const mergedTotalBaseStations = mergedBaseStations.length;
      
      const reportData = {
        services: mergedServices,  // <-- Service hierarchy for PDF
        baseStations: mergedBaseStations,
        totalMetrics: mergedTotalMetrics,
        totalBaseStations: mergedTotalBaseStations
      };
      
      logger.info('ManualReportProcessor', 'Final report data prepared', {
        reportId,
        serviceCount: mergedServices.length,
        serviceNames: mergedServices.map(s => s.service_name),
        baseStationCount: mergedBaseStations.length,
        totalMetrics: mergedTotalMetrics
      });

      // Generate PDF from collected data
      const pdfResult = await this.generatePDF(reportId, report, reportData);

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
        targetCount: chunk.targetIds ? chunk.targetIds.length : 'undefined'
      });

      // Get telemetry data for this chunk
      logger.debug('ManualReportProcessor', 'Getting telemetry data for chunk', {
        reportId,
        chunkIndex
      });
      const telemetryData = await this.getTelemetryData(report.report_type, chunk.targetIds, chunk.start, chunk.end);
      logger.debug('ManualReportProcessor', 'Telemetry data received', {
        reportId,
        chunkIndex,
        dataType: typeof telemetryData,
        isArray: Array.isArray(telemetryData),
        length: telemetryData ? telemetryData.length : 'undefined'
      });

      // Get metric mappings for formatting
      logger.debug('ManualReportProcessor', 'Getting metric mappings for chunk', {
        reportId,
        chunkIndex
      });
      const metricMappings = await this.getMetricMappings(report.report_type, chunk.targetIds);
      logger.debug('ManualReportProcessor', 'Metric mappings received', {
        reportId,
        chunkIndex,
        dataType: typeof metricMappings,
        isArray: Array.isArray(metricMappings),
        length: metricMappings ? metricMappings.length : 'undefined'
      });

      // Process and format data
      logger.debug('ManualReportProcessor', 'Formatting telemetry data for chunk', {
        reportId,
        chunkIndex
      });
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
      // Validate input parameters
      if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
        logger.error('ManualReportProcessor', 'Invalid targetIds parameter', {
          reportType,
          targetIds: typeof targetIds,
          isArray: Array.isArray(targetIds),
          length: targetIds ? targetIds.length : 'undefined'
        });
        return [];
      }

      let query;
      let params;

      if (reportType === 'service') {
        // Service-based query
        const placeholders = targetIds.map(() => '?').join(',');
        query = `
          SELECT t.*, s.name as service_name, c.name as client_name,
                 sma.service_id, cs.client_id, t.node_name, t.base_station as base_station_name
          FROM telemetry t
          JOIN metric_mappings mm ON t.node_name = mm.node_name
          JOIN service_metric_assignments sma ON mm.id = sma.metric_mapping_id
          JOIN services s ON sma.service_id = s.id
          JOIN client_services cs ON s.id = cs.service_id
          JOIN clients c ON cs.client_id = c.id
          WHERE sma.service_id IN (${placeholders})
            AND t.timestamp BETWEEN ? AND ?
            AND sma.is_active = 1
            AND mm.is_active = 1
          ORDER BY t.timestamp ASC, sma.service_id, t.node_name, t.base_station
        `;
        params = [...targetIds, startDate, endDate];

      } else {
        // Client-based query (all services for these clients)
        const placeholders = targetIds.map(() => '?').join(',');
        query = `
          SELECT t.*, s.name as service_name, c.name as client_name,
                 sma.service_id, cs.client_id, t.node_name, t.base_station as base_station_name
          FROM telemetry t
          JOIN metric_mappings mm ON t.node_name = mm.node_name
          JOIN service_metric_assignments sma ON mm.id = sma.metric_mapping_id
          JOIN services s ON sma.service_id = s.id
          JOIN client_services cs ON s.id = cs.service_id
          JOIN clients c ON cs.client_id = c.id
          WHERE c.id IN (${placeholders})
            AND t.timestamp BETWEEN ? AND ?
            AND sma.is_active = 1
            AND mm.is_active = 1
          ORDER BY t.timestamp ASC, c.id, sma.service_id, t.node_name, t.base_station
        `;
        params = [...targetIds, startDate, endDate];
      }

      const [rows] = await this.db.query(query, params);
      
      logger.debug('ManualReportProcessor', 'Telemetry data retrieved', {
        reportType,
        targetCount: targetIds.length,
        dataPoints: rows ? rows.length : 'undefined',
        isArray: Array.isArray(rows),
        dateRange: `${startDate.toISOString()} to ${endDate.toISOString()}`
      });

      // Log a sample of the data to understand the structure
      if (rows && rows.length > 0) {
        logger.debug('ManualReportProcessor', 'Sample telemetry record', {
          sample: rows[0],
          keys: Object.keys(rows[0])
        });
      }

      return rows || [];

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
      // Validate input parameters
      if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
        logger.error('ManualReportProcessor', 'Invalid targetIds parameter for metric mappings', {
          reportType,
          targetIds: typeof targetIds,
          isArray: Array.isArray(targetIds),
          length: targetIds ? targetIds.length : 'undefined'
        });
        return [];
      }

      let query;
      let params;

      if (reportType === 'service') {
        const placeholders = targetIds.map(() => '?').join(',');
        query = `
          SELECT mm.*, sma.service_id, s.name as service_name, c.name as client_name
          FROM metric_mappings mm
          JOIN service_metric_assignments sma ON mm.id = sma.metric_mapping_id
          JOIN services s ON sma.service_id = s.id
          JOIN client_services cs ON s.id = cs.service_id
          JOIN clients c ON cs.client_id = c.id
          WHERE sma.service_id IN (${placeholders})
            AND sma.is_active = 1
            AND mm.is_active = 1
          ORDER BY s.id, mm.display_order
        `;
        params = targetIds;

      } else {
        const placeholders = targetIds.map(() => '?').join(',');
        query = `
          SELECT mm.*, sma.service_id, s.name as service_name, c.name as client_name
          FROM metric_mappings mm
          JOIN service_metric_assignments sma ON mm.id = sma.metric_mapping_id
          JOIN services s ON sma.service_id = s.id
          JOIN client_services cs ON s.id = cs.service_id
          JOIN clients c ON cs.client_id = c.id
          WHERE c.id IN (${placeholders})
            AND sma.is_active = 1
            AND mm.is_active = 1
          ORDER BY c.id, s.id, mm.display_order
        `;
        params = targetIds;
      }

      const [rows] = await this.db.query(query, params);
      
      logger.debug('ManualReportProcessor', 'Metric mappings retrieved', {
        reportType,
        targetCount: targetIds.length,
        mappingCount: rows ? rows.length : 'undefined',
        isArray: Array.isArray(rows)
      });

      // Log a sample of the metric mappings to understand the structure
      if (rows && rows.length > 0) {
        logger.debug('ManualReportProcessor', 'Sample metric mapping', {
          sample: rows[0],
          keys: Object.keys(rows[0])
        });
      }

      return rows || [];

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
      // Debug logging to understand the data structure
      logger.info('ManualReportProcessor', 'Formatting telemetry data', {
        reportType,
        telemetryDataLength: telemetryData ? telemetryData.length : 'undefined',
        metricMappingsLength: metricMappings ? metricMappings.length : 'undefined',
        telemetryDataSample: telemetryData && telemetryData.length > 0 ? {
          service_id: telemetryData[0].service_id,
          service_id_type: typeof telemetryData[0].service_id,
          node_name: telemetryData[0].node_name,
          client_id: telemetryData[0].client_id
        } : null,
        metricMappingsSample: metricMappings && metricMappings.length > 0 ? {
          service_id: metricMappings[0].service_id,
          service_id_type: typeof metricMappings[0].service_id,
          node_name: metricMappings[0].node_name
        } : null
      });

      // Check if telemetryData is defined and is an array
      if (!telemetryData || !Array.isArray(telemetryData)) {
        logger.error('ManualReportProcessor', 'Invalid telemetry data structure', {
          telemetryData: typeof telemetryData,
          isArray: Array.isArray(telemetryData)
        });
        return [];
      }

      // Group data by SERVICE + BASE STATION (like automated reports)
      // This allows the same base station to appear in multiple services
      const baseStationsMap = {};
      let matchedCount = 0;
      let unmatchedCount = 0;
      let unmatchedSamples = [];

      telemetryData.forEach((record, index) => {
        // Group by (service_id, node_name, base_station_name) - allows same BS in multiple services
        const groupKey = `${record.service_id}|${record.node_name}|${record.base_station_name}`;
        
        if (!baseStationsMap[groupKey]) {
          baseStationsMap[groupKey] = {
            node_name: record.node_name,
            base_station_name: record.base_station_name,
            service_name: record.service_name,
            service_id: record.service_id,
            client_name: record.client_name,
            client_id: record.client_id,
            metrics: {}
          };
        }

        // Find ALL metric mappings for this record (one node can have multiple metrics)
        const mappings = metricMappings.filter(m => 
          m.service_id === record.service_id && 
          m.node_name === record.node_name
        );

        // Debug first few records and track match rates
        if (index < 3) {
          console.log(`[DEBUG] Record ${index}: service_id=${record.service_id}, node_name=${record.node_name}, base_station=${record.base_station_name}`);
          console.log(`[DEBUG] Available mappings for this service: ${metricMappings.filter(m => m.service_id === record.service_id).length}`);
          console.log(`[DEBUG] Matching mappings: ${mappings.map(m => `${m.metric_name}(${m.column_name})`).join(', ')}`);
        }

        if (mappings.length > 0) {
          matchedCount += mappings.length;
        } else {
          unmatchedCount++;
          if (unmatchedSamples.length < 3) {
            unmatchedSamples.push({ service_id: record.service_id, node_name: record.node_name, base_station: record.base_station_name });
          }
        }

        // Process ALL matching mappings for this record
        mappings.forEach(mapping => {
          const metricKey = mapping.metric_name || mapping.column_name;
          
          if (!baseStationsMap[groupKey].metrics[metricKey]) {
            baseStationsMap[groupKey].metrics[metricKey] = {
              display_name: mapping.display_name || mapping.metric_name,
              metric_name: mapping.metric_name,
              unit: mapping.unit,
              color: mapping.color,
              column_name: mapping.column_name,
              data: [],
              stats: { latest: null, min: null, max: null, avg: null }
            };
          }

          // Use the appropriate analog value based on the column name
          // Normalize column name to handle both PascalCase (Analog1Value, Digital1Value) and snake_case (analog1_value)
          const colName = mapping.column_name ? mapping.column_name.toLowerCase().replace(/value$/, '_value') : '';
          let value;
          switch (colName) {
            case 'analog1_value':
            case 'analog1':
            case 'digital1_value':
            case 'digital1':
              value = record.analog1_value;
              break;
            case 'analog2_value':
            case 'analog2':
            case 'digital2_value':
            case 'digital2':
              value = record.analog2_value;
              break;
            case 'analog3_value':
            case 'analog3':
            case 'digital3_value':
            case 'digital3':
              value = record.analog3_value;
              break;
            case 'analog4_value':
            case 'analog4':
            case 'digital4_value':
            case 'digital4':
              value = record.analog4_value;
              break;
            case 'analog5_value':
            case 'analog5':
            case 'digital5_value':
            case 'digital5':
              value = record.analog5_value;
              break;
            case 'analog6_value':
            case 'analog6':
            case 'digital6_value':
            case 'digital6':
              value = record.analog6_value;
              break;
            case 'analog7_value':
            case 'analog7':
            case 'digital7_value':
            case 'digital7':
              value = record.analog7_value;
              break;
            case 'analog8_value':
            case 'analog8':
            case 'digital8_value':
            case 'digital8':
              value = record.analog8_value;
              break;
            default:
              value = record.analog1_value; // Default to analog1_value
          }

          // Only add if value is not null
          if (value !== null && value !== undefined) {
            baseStationsMap[groupKey].metrics[metricKey].data.push({
              timestamp: record.timestamp,
              value: parseFloat(value),
              nodeName: record.node_name,
              baseStationName: record.base_station_name
            });
          }
        });
      });

      // Convert metrics object to array for each base station and calculate stats
      const baseStations = Object.values(baseStationsMap).map(bs => {
        const metricsArray = Object.values(bs.metrics).map(metric => {
          // Calculate stats like automated reports do
          const values = metric.data.map(d => d.value).filter(v => !isNaN(v));
          if (values.length > 0) {
            // Use iterative approach to avoid stack overflow
            let min = values[0];
            let max = values[0];
            let sum = 0;
            for (let i = 0; i < values.length; i++) {
              if (values[i] < min) min = values[i];
              if (values[i] > max) max = values[i];
              sum += values[i];
            }
            metric.stats = {
              latest: parseFloat(values[values.length - 1].toFixed(2)),
              min: parseFloat(min.toFixed(2)),
              max: parseFloat(max.toFixed(2)),
              avg: parseFloat((sum / values.length).toFixed(2))
            };
          }
          return metric;
        });
        
        return {
          ...bs,
          metrics: metricsArray
        };
      });

      // Filter out base stations with no metrics
      const validBaseStations = baseStations.filter(bs => bs.metrics.length > 0);
      
      const totalMetrics = validBaseStations.reduce((sum, bs) => sum + bs.metrics.length, 0);
      
      // Build services hierarchy (like automated reports)
      // Group base stations by service
      const servicesMap = {};
      validBaseStations.forEach(bs => {
        const serviceKey = `${bs.service_id}_${bs.service_name}`;
        if (!servicesMap[serviceKey]) {
          servicesMap[serviceKey] = {
            service_id: bs.service_id,
            service_name: bs.service_name,
            baseStations: []
          };
        }
        servicesMap[serviceKey].baseStations.push(bs);
      });
      const services = Object.values(servicesMap);
      
      logger.info('ManualReportProcessor', 'Telemetry data formatted - base station grouping', {
        reportType,
        baseStationCount: validBaseStations.length,
        totalMetrics,
        totalDataPoints: telemetryData.length,
        serviceCount: services.length,
        matchedCount,
        unmatchedCount,
        unmatchedSamples,
        sampleBaseStation: validBaseStations.length > 0 ? {
          node_name: validBaseStations[0].node_name,
          base_station_name: validBaseStations[0].base_station_name,
          metricCount: validBaseStations[0].metrics.length,
          metrics: validBaseStations[0].metrics.map(m => m.display_name)
        } : null
      });

      // Return structure matching automated reports
      return {
        services,  // <-- Service hierarchy for PDF
        baseStations: validBaseStations,
        totalMetrics,
        totalBaseStations: validBaseStations.length
      };

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

      // Get report details for caching
      const [reportData] = await this.db.query(
        `SELECT report_type, target_ids, date_range_start, date_range_end 
         FROM manual_reports WHERE id = ?`,
        [reportId]
      );

      if (reportData.length > 0 && this.cacheManager) {
        const report = reportData[0];
        
        // Check if this report should be cached
        const shouldCache = await this.cacheManager.shouldCacheReport(
          report.report_type,
          typeof report.target_ids === 'string' ? JSON.parse(report.target_ids) : report.target_ids,
          report.date_range_start,
          report.date_range_end
        );

        if (shouldCache) {
          try {
            // Read the generated PDF file
            const pdfData = await fs.readFile(filePath);
            
            // Cache the report
            const cacheSuccess = await this.cacheManager.cacheReport(reportId, pdfData, {
              reportType: report.report_type,
              targetIds: typeof report.target_ids === 'string' ? JSON.parse(report.target_ids) : report.target_ids,
              dateRangeStart: report.date_range_start,
              dateRangeEnd: report.date_range_end
            });

            if (cacheSuccess) {
              logger.info('ManualReportProcessor', 'Report cached successfully', {
                reportId,
                cacheKey: this.cacheManager.generateCacheKey(
                  report.report_type,
                  typeof report.target_ids === 'string' ? JSON.parse(report.target_ids) : report.target_ids,
                  report.date_range_start,
                  report.date_range_end
                )
              });
            }
          } catch (cacheError) {
            logger.warn('ManualReportProcessor', 'Failed to cache report', {
              reportId,
              error: cacheError.message
            });
          }
        }
      }

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
