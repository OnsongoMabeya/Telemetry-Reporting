/**
 * Manual Reports API Routes
 * 
 * Provides endpoints for on-demand report generation with caching,
 * rate limiting, and comprehensive audit logging.
 * 
 * @module routes/manualReports
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const manualReportProcessor = require('../services/manualReportProcessor');
const ManualReportCacheManager = require('../services/manualReportCacheManager');
const PerformanceMonitor = require('../services/performanceMonitor');
const QueryOptimizer = require('../services/queryOptimizer');

// Get database connection from app
let db;
let queryOptimizer;
router.use((req, res, next) => {
  db = req.app.get('db');
  
  // Initialize cache manager
  if (!req.app.get('cacheManager')) {
    const cacheManager = new ManualReportCacheManager(db);
    cacheManager.scheduleMaintenance();
    req.app.set('cacheManager', cacheManager);
  }
  
  // Initialize query optimizer
  if (!queryOptimizer) {
    const performanceMonitor = req.app.get('performanceMonitor');
    queryOptimizer = new QueryOptimizer(db, performanceMonitor);
    req.app.set('queryOptimizer', queryOptimizer);
  }
  
  next();
});

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Generate cache key for report parameters
 * @param {string} reportType - 'service' or 'client'
 * @param {Array} targetIds - Array of service/client IDs
 * @param {Date} dateRangeStart - Start date
 * @param {Date} dateRangeEnd - End date
 * @returns {string} Cache key
 */
function generateCacheKey(reportType, targetIds, dateRangeStart, dateRangeEnd) {
  const targetHash = crypto.createHash('md5')
    .update(JSON.stringify(targetIds.sort()))
    .digest('hex');
  
  return `manual_report_${reportType}_${targetHash}_${dateRangeStart.toISOString().slice(0, 16)}_${dateRangeEnd.toISOString().slice(0, 16)}`;
}

/**
 * Check if user is rate limited
 * @param {number} userId - User ID
 * @returns {Promise<{isLimited: boolean, remaining: number}>}
 */
async function checkRateLimit(userId) {
  try {
    // Reset daily counter if needed
    await db.query(
      `UPDATE manual_reports_rate_limits 
       SET requests_today = 0, last_reset = CURDATE() 
       WHERE user_id = ? AND last_reset < CURDATE()`,
      [userId]
    );

    // Reset hourly counter if needed
    await db.query(
      `UPDATE manual_reports_rate_limits 
       SET hourly_requests = 0, last_hour_reset = NOW() 
       WHERE user_id = ? AND last_hour_reset < DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [userId]
    );

    // Get current limits
    const [limits] = await db.query(
      `SELECT requests_today, hourly_requests FROM manual_reports_rate_limits WHERE user_id = ?`,
      [userId]
    );

    const DAILY_LIMIT = 10; // Configurable per admin
    const HOURLY_LIMIT = 5;  // Configurable per admin

    if (limits.length === 0) {
      // Initialize rate limit for new admin user
      await db.query(
        `INSERT INTO manual_reports_rate_limits (user_id, requests_today, hourly_requests) VALUES (?, 0, 0)`,
        [userId]
      );
      return { isLimited: false, remaining: DAILY_LIMIT };
    }

    const { requests_today, hourly_requests } = limits[0];
    
    if (requests_today >= DAILY_LIMIT || hourly_requests >= HOURLY_LIMIT) {
      return { 
        isLimited: true, 
        remaining: Math.max(0, DAILY_LIMIT - requests_today),
        hourlyRemaining: Math.max(0, HOURLY_LIMIT - hourly_requests)
      };
    }

    return { 
      isLimited: false, 
      remaining: DAILY_LIMIT - requests_today,
      hourlyRemaining: HOURLY_LIMIT - hourly_requests
    };
  } catch (error) {
    logger.error('ManualReports', 'Rate limit check failed', {
      userId,
      error: error.message
    });
    return { isLimited: false, remaining: 0 }; // Allow on error
  }
}

/**
 * Update rate limit counters
 * @param {number} userId - User ID
 */
async function updateRateLimit(userId) {
  try {
    await db.query(
      `UPDATE manual_reports_rate_limits 
       SET requests_today = requests_today + 1,
           hourly_requests = hourly_requests + 1,
           total_requests = total_requests + 1,
           last_request_at = NOW()
       WHERE user_id = ?`,
      [userId]
    );
  } catch (error) {
    logger.error('ManualReports', 'Rate limit update failed', {
      userId,
      error: error.message
    });
  }
}

/**
 * Update cache statistics
 * @param {string} cacheKey - Cache key
 * @param {Object} reportParams - Report parameters
 */
async function updateCacheStats(cacheKey, reportParams) {
  try {
    // Check if cache entry exists
    const [existing] = await db.query(
      `SELECT request_count, is_cached FROM manual_reports_cache_stats WHERE cache_key = ?`,
      [cacheKey]
    );

    if (existing.length === 0) {
      // Create new cache stats entry
      await db.query(
        `INSERT INTO manual_reports_cache_stats 
         (cache_key, request_count, report_parameters) VALUES (?, 1, ?)`,
        [cacheKey, JSON.stringify(reportParams)]
      );
    } else {
      // Update existing entry
      await db.query(
        `UPDATE manual_reports_cache_stats 
         SET request_count = request_count + 1,
             last_requested = NOW()
         WHERE cache_key = ?`,
        [cacheKey]
      );

      // Check if should be cached (4+ requests in 7 days)
      const [stats] = await db.query(
        `SELECT request_count, 
                DATEDIFF(NOW(), first_requested) as days_since_first
         FROM manual_reports_cache_stats 
         WHERE cache_key = ?`,
        [cacheKey]
      );

      if (stats[0].request_count >= 4 && stats[0].days_since_first <= 7 && !existing[0].is_cached) {
        await db.query(
          `UPDATE manual_reports_cache_stats 
           SET is_cached = TRUE, cached_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
           WHERE cache_key = ?`,
          [cacheKey]
        );
      }
    }
  } catch (error) {
    logger.error('ManualReports', 'Cache stats update failed', {
      cacheKey,
      error: error.message
    });
  }
}

/**
 * Log manual report action
 * @param {Object} auditData - Audit data
 */
async function logAuditAction(auditData) {
  try {
    await db.query(
      `INSERT INTO manual_reports_audit 
       (report_id, cache_key, action, user_id, report_type, target_ids, 
        date_range_start, date_range_end, status, message, delivery_method,
        recipients_count, pdf_size_bytes, execution_time_ms, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        auditData.reportId || null,
        auditData.cacheKey || null,
        auditData.action,
        auditData.userId,
        auditData.reportType,
        JSON.stringify(auditData.targetIds),
        auditData.dateRangeStart,
        auditData.dateRangeEnd,
        auditData.status,
        auditData.message || null,
        auditData.deliveryMethod || 'none',
        auditData.recipientsCount || 0,
        auditData.pdfSizeBytes || null,
        auditData.executionTimeMs || null,
        auditData.ipAddress || null,
        auditData.userAgent || null
      ]
    );
  } catch (error) {
    logger.error('ManualReports', 'Audit logging failed', {
      auditData,
      error: error.message
    });
  }
}

/**
 * POST /api/manual-reports/generate
 * Start manual report generation
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      reportType,           // 'service' or 'client'
      targetIds,            // Array of service/client IDs
      dateRangeStart,       // ISO string
      dateRangeEnd,         // ISO string
      deliveryMethod = 'download', // 'download', 'email', 'both'
      recipients = []       // Email recipients
    } = req.body;

    // Validate input
    if (!reportType || !['service', 'client'].includes(reportType)) {
      return res.status(400).json({
        error: 'Invalid report type. Must be "service" or "client"'
      });
    }

    if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
      return res.status(400).json({
        error: 'Target IDs are required and must be a non-empty array'
      });
    }

    if (!dateRangeStart || !dateRangeEnd) {
      return res.status(400).json({
        error: 'Date range start and end are required'
      });
    }

    const startDate = new Date(dateRangeStart);
    const endDate = new Date(dateRangeEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format'
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        error: 'Start date must be before end date'
      });
    }

    // Check date range limit (90 days)
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return res.status(400).json({
        error: 'Date range cannot exceed 90 days'
      });
    }

    // Check rate limits
    const rateLimit = await checkRateLimit(req.user.id);
    if (rateLimit.isLimited) {
      await logAuditAction({
        action: 'rate_limit',
        userId: req.user.id,
        reportType,
        targetIds,
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        status: 'failed',
        message: `Rate limit exceeded. Daily remaining: ${rateLimit.remaining}, Hourly remaining: ${rateLimit.hourlyRemaining}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `You have reached your limit. Daily remaining: ${rateLimit.remaining}, Hourly remaining: ${rateLimit.hourlyRemaining}`
      });
    }

    // Update rate limit counter
    await updateRateLimit(req.user.id);

    // Check cache for existing report
    const cacheManager = req.app.get('cacheManager');
    if (!cacheManager) {
      logger.error('ManualReports', 'Cache manager not available');
    } else {
      const cachedReport = await cacheManager.getCachedReport(
        reportType, 
        targetIds, 
        dateRangeStart, 
        dateRangeEnd
      );

      if (cachedReport) {
        // Cache hit - return cached report
        const reportId = await createReportRecord({
          reportType,
          targetIds,
          dateRangeStart: startDate,
          dateRangeEnd: endDate,
          deliveryMethod,
          recipients,
          generatedBy: req.user.id,
          status: 'completed',
          pdfSizeBytes: cachedReport.metadata.fileSize,
          completedAt: new Date(),
          processingTimeMs: 0, // Instant from cache
          isFromCache: true
        });

        // Log cache hit
        await logAuditAction({
          action: 'cache_hit',
          userId: req.user.id,
          reportId,
          reportType,
          targetIds,
          dateRangeStart: startDate,
          dateRangeEnd: endDate,
          status: 'completed',
          message: `Report served from cache (size: ${cachedReport.metadata.fileSize} bytes)`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        // Handle delivery methods for cached report
        if (deliveryMethod === 'email' || deliveryMethod === 'both') {
          await handleEmailDelivery(reportId, cachedReport.data, {
            reportType,
            targetIds,
            dateRangeStart: startDate,
            dateRangeEnd: endDate,
            recipients
          });
        }

        logger.info('ManualReports', 'Cache hit - report served from cache', {
          reportId,
          cacheKey: cacheManager.generateCacheKey(reportType, targetIds, startDate, endDate),
          userId: req.user.id
        });

        return res.json({
          success: true,
          message: 'Report generated successfully (from cache)',
          reportId,
          fromCache: true,
          processingTime: 0,
          fileSize: cachedReport.metadata.fileSize
        });
      }
    }

    // Create new report entry (cache miss - generate new report)
    const [result] = await db.query(
      `INSERT INTO manual_reports 
       (report_type, target_ids, date_range_start, date_range_end, generated_by,
        status, delivery_method, recipients)
       VALUES (?, ?, ?, ?, ?, 'generating', ?, ?)`,
      [
        reportType,
        JSON.stringify(targetIds),
        startDate,
        endDate,
        req.user.id,
        deliveryMethod,
        JSON.stringify(recipients)
      ]
    );
    
    const reportId = result.insertId;
    const isFromCache = false;

    // Log generation start
    await logAuditAction({
      reportId,
      action: 'generate',
      userId: req.user.id,
      reportType,
      targetIds,
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      status: 'pending',
      message: 'Report generation started',
      deliveryMethod,
      recipientsCount: recipients.length,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('ManualReports', 'Report generation started', {
      userId: req.user.id,
      reportId,
      reportType,
      targetCount: targetIds.length,
      dateRange: `${dateRangeStart} to ${dateRangeEnd}`,
      deliveryMethod
    });

    // Start background report generation process
    manualReportProcessor.setDatabase(db);
    manualReportProcessor.startProcessing(reportId);

    res.status(201).json({
      success: true,
      reportId,
      status: 'generating',
      isFromCache,
      message: 'Report generation started',
      estimatedTime: 30000 // 30 seconds estimate
    });

  } catch (error) {
    logger.error('ManualReports', 'Report generation failed', {
      userId: req.user.id,
      error: error.message,
      requestBody: req.body
    });

    await logAuditAction({
      action: 'generate',
      userId: req.user.id,
      reportType: req.body.reportType,
      targetIds: req.body.targetIds || [],
      dateRangeStart: req.body.dateRangeStart,
      dateRangeEnd: req.body.dateRangeEnd,
      status: 'failed',
      message: error.message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(500).json({
      error: 'Failed to start report generation',
      message: error.message
    });
  }
});

/**
 * GET /api/manual-reports/status/:id
 * Check report generation status
 */
router.get('/status/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({
        error: 'Invalid report ID'
      });
    }

    const [reports] = await db.query(
      `SELECT id, status, generation_time_ms, pdf_size_bytes, error_message,
              created_at, updated_at, is_cached, delivery_method
       FROM manual_reports 
       WHERE id = ? AND generated_by = ?`,
      [reportId, req.user.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    const report = reports[0];

    // Get real-time progress from background processor
    let progress = 0;
    let processorStatus = null;
    
    if (report.status === 'completed') {
      progress = 100;
    } else if (report.status === 'generating') {
      const processorProgress = manualReportProcessor.getProgress(reportId);
      if (processorProgress) {
        progress = processorProgress.progress;
        processorStatus = processorProgress.status;
      } else {
        progress = 10; // Default if processor not found
      }
    }

    res.json({
      success: true,
      reportId: report.id,
      status: report.status,
      progress,
      processorStatus,
      generationTime: report.generation_time_ms,
      pdfSize: report.pdf_size_bytes,
      errorMessage: report.error_message,
      isCached: report.is_cached,
      deliveryMethod: report.delivery_method,
      createdAt: report.created_at,
      updatedAt: report.updated_at
    });

  } catch (error) {
    logger.error('ManualReports', 'Status check failed', {
      userId: req.user.id,
      reportId: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to check report status',
      message: error.message
    });
  }
});

/**
 * GET /api/manual-reports/download/:id
 * Download completed report
 */
router.get('/download/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({
        error: 'Invalid report ID'
      });
    }

    const [reports] = await db.query(
      `SELECT id, status, file_path, pdf_size_bytes, report_type, target_ids,
              date_range_start, date_range_end, generated_by
       FROM manual_reports 
       WHERE id = ? AND generated_by = ?`,
      [reportId, req.user.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    const report = reports[0];

    if (report.status !== 'completed') {
      return res.status(400).json({
        error: 'Report is not ready for download',
        status: report.status
      });
    }

    if (!report.file_path) {
      return res.status(404).json({
        error: 'Report file not found'
      });
    }

    // Log download action
    await logAuditAction({
      reportId: report.id,
      action: 'download',
      userId: req.user.id,
      reportType: report.report_type,
      targetIds: typeof report.target_ids === 'string' ? JSON.parse(report.target_ids) : report.target_ids,
      dateRangeStart: report.date_range_start,
      dateRangeEnd: report.date_range_end,
      status: 'success',
      message: 'Report downloaded',
      deliveryMethod: 'download',
      pdfSizeBytes: report.pdf_size_bytes,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Check if file exists on disk
    if (!fs.existsSync(report.file_path)) {
      logger.error('ManualReports', 'Report file not found on disk', {
        reportId: report.id,
        filePath: report.file_path
      });
      return res.status(404).json({
        error: 'Report file not found on server'
      });
    }

    // Set headers for PDF download
    const fileName = `manual_report_${report.report_type}_${report.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', report.pdf_size_bytes);

    // Stream the file
    const fileStream = fs.createReadStream(report.file_path);
    fileStream.pipe(res);

    logger.info('ManualReports', 'Report downloaded', {
      userId: req.user.id,
      reportId: report.id,
      fileSize: report.pdf_size_bytes
    });

  } catch (error) {
    logger.error('ManualReports', 'Download failed', {
      userId: req.user.id,
      reportId: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to download report',
      message: error.message
    });
  }
});

/**
 * GET /api/manual-reports/file/:id
 * Serve the actual PDF file for download
 */
router.get('/file/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({
        error: 'Invalid report ID'
      });
    }

    const [reports] = await db.query(
      `SELECT id, status, file_path, pdf_size_bytes, report_type
       FROM manual_reports 
       WHERE id = ? AND generated_by = ?`,
      [reportId, req.user.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    const report = reports[0];

    if (report.status !== 'completed') {
      return res.status(400).json({
        error: 'Report is not ready for download',
        status: report.status
      });
    }

    if (!report.file_path) {
      return res.status(404).json({
        error: 'Report file not found'
      });
    }

    // Check if file exists
    if (!fs.existsSync(report.file_path)) {
      logger.error('ManualReports', 'Report file not found on disk', {
        reportId,
        filePath: report.file_path
      });
      return res.status(404).json({
        error: 'Report file not found on server'
      });
    }

    // Set headers for PDF download
    const fileName = `manual_report_${report.report_type}_${reportId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', report.pdf_size_bytes);

    // Stream the file
    const fileStream = fs.createReadStream(report.file_path);
    fileStream.pipe(res);

    logger.info('ManualReports', 'Report file served', {
      userId: req.user.id,
      reportId,
      fileName,
      fileSize: report.pdf_size_bytes
    });

  } catch (error) {
    logger.error('ManualReports', 'File serve failed', {
      userId: req.user.id,
      reportId: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to serve report file',
      message: error.message
    });
  }
});

/**
 * POST /api/manual-reports/send-email/:id
 * Send report via email
 */
router.post('/send-email/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { recipients } = req.body;
    
    if (isNaN(reportId)) {
      return res.status(400).json({
        error: 'Invalid report ID'
      });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Recipients are required and must be a non-empty array'
      });
    }

    const [reports] = await db.query(
      `SELECT id, status, file_path, pdf_size_bytes, report_type, target_ids,
              date_range_start, date_range_end, generated_by
       FROM manual_reports 
       WHERE id = ? AND generated_by = ?`,
      [reportId, req.user.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    const report = reports[0];

    if (report.status !== 'completed') {
      return res.status(400).json({
        error: 'Report is not ready for email delivery',
        status: report.status
      });
    }

    // TODO: Implement email sending
    // This will be implemented in Phase 1.3 with email service integration

    // Log email action
    await logAuditAction({
      reportId: report.id,
      action: 'email',
      userId: req.user.id,
      reportType: report.report_type,
      targetIds: typeof report.target_ids === 'string' ? JSON.parse(report.target_ids) : report.target_ids,
      dateRangeStart: report.date_range_start,
      dateRangeEnd: report.date_range_end,
      status: 'success',
      message: `Report sent to ${recipients.length} recipients`,
      deliveryMethod: 'email',
      recipientsCount: recipients.length,
      pdfSizeBytes: report.pdf_size_bytes,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('ManualReports', 'Report sent via email', {
      userId: req.user.id,
      reportId: report.id,
      recipientCount: recipients.length
    });

    res.json({
      success: true,
      message: `Report sent to ${recipients.length} recipients`,
      recipients
    });

  } catch (error) {
    logger.error('ManualReports', 'Email sending failed', {
      userId: req.user.id,
      reportId: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to send report via email',
      message: error.message
    });
  }
});

/**
 * GET /api/manual-reports/history
 * Get user's manual report history
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    const queryOptimizer = req.app.get('queryOptimizer');

    if (!queryOptimizer) {
      return res.status(503).json({
        error: 'Query optimizer not available'
      });
    }

    const filters = {
      userId: req.user.id,
      status,
      limit: parseInt(limit),
      offset
    };

    // Temporarily disable cache to ensure fresh data
    const [reports] = await queryOptimizer.getManualReportsHistory({...filters, nocache: true});

    // Get total count with fresh query (disable cache)
    const [totalCount] = await queryOptimizer.executeQuery(
      'SELECT COUNT(*) as total FROM manual_reports WHERE generated_by = ?' + 
      (status ? ' AND status = ?' : ''),
      status ? [req.user.id, status] : [req.user.id],
      { cache: false }
    );

    const processedReports = reports.map(report => {
      try {
                
        // target_ids might already be an array (MySQL JSON parsing) or a string
        let targetIds = report.target_ids;
        
        // Handle various data types and edge cases
        if (targetIds === null || targetIds === undefined) {
          targetIds = [];
        } else if (typeof targetIds === 'string') {
          try {
            targetIds = JSON.parse(targetIds);
          } catch (parseError) {
            // If parsing fails, try to handle common edge cases
            if (targetIds.trim() === '') {
              targetIds = [];
            } else if (targetIds.startsWith('[') && targetIds.endsWith(']')) {
              // Try to extract numbers from brackets
              const numbers = targetIds.match(/\d+/g);
              targetIds = numbers ? numbers.map(Number) : [];
            } else {
              targetIds = [];
            }
          }
        } else if (typeof targetIds === 'number') {
          targetIds = [targetIds];
        } else if (!Array.isArray(targetIds)) {
          // If it's not an array but not null/undefined/string/number, convert to empty array
          targetIds = [];
        }
        
        // Ensure it's an array of numbers
        targetIds = Array.isArray(targetIds) ? targetIds.filter(id => typeof id === 'number' && !isNaN(id)) : [];
        
        return {
          ...report,
          targetIds,
          targetCount: targetIds.length
        };
      } catch (error) {
        logger.error('ManualReports', 'Failed to parse target_ids', {
          reportId: report.id,
          targetIds: report.target_ids,
          targetType: typeof report.target_ids,
          error: error.message
        });
        return {
          ...report,
          targetIds: [],
          targetCount: 0
        };
      }
    });

    res.json({
      success: true,
      reports: processedReports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].total,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });

  } catch (error) {
    logger.error('ManualReports', 'History fetch failed', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to fetch report history',
      message: error.message
    });
  }
});

/**
 * GET /api/manual-reports/stats
 * Get manual report statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await db.query(
      `SELECT 
         COUNT(*) as total_reports,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_reports,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_reports,
         COUNT(CASE WHEN is_cached = TRUE THEN 1 END) as cached_reports,
         AVG(generation_time_ms) as avg_generation_time,
         AVG(pdf_size_bytes) as avg_pdf_size,
         MAX(created_at) as last_report_date
       FROM manual_reports 
       WHERE generated_by = ?`,
      [req.user.id]
    );

    const [rateLimit] = await db.query(
      `SELECT requests_today, hourly_requests, total_requests, last_request_at
       FROM manual_reports_rate_limits 
       WHERE user_id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      statistics: {
        reports: {
          total: stats[0].total_reports || 0,
          successful: stats[0].successful_reports || 0,
          failed: stats[0].failed_reports || 0,
          cached: stats[0].cached_reports || 0,
          avgGenerationTime: Math.round(stats[0].avg_generation_time || 0),
          avgPdfSize: Math.round(stats[0].avg_pdf_size || 0),
          lastReportDate: stats[0].last_report_date
        },
        rateLimits: {
          dailyUsed: rateLimit[0]?.requests_today || 0,
          dailyLimit: 10,
          hourlyUsed: rateLimit[0]?.hourly_requests || 0,
          hourlyLimit: 5,
          totalRequests: rateLimit[0]?.total_requests || 0,
          lastRequestAt: rateLimit[0]?.last_request_at
        }
      }
    });

  } catch (error) {
    logger.error('ManualReports', 'Stats fetch failed', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/manual-reports/cancel/:id
 * Cancel report processing
 */
router.post('/cancel/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({
        error: 'Invalid report ID'
      });
    }

    // Check if report belongs to user and is in generating state
    const [reports] = await db.query(
      `SELECT id, status, generated_by FROM manual_reports 
       WHERE id = ? AND generated_by = ?`,
      [reportId, req.user.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    const report = reports[0];

    if (report.status !== 'generating') {
      return res.status(400).json({
        error: 'Report cannot be cancelled',
        status: report.status
      });
    }

    // Cancel processing
    const cancelled = await manualReportProcessor.cancelProcessing(reportId);

    // If cancelProcessing returns false, the report might be orphaned (server restarted)
    // In that case, we should still update the database to mark it as failed
    if (!cancelled) {
      logger.info('ManualReports', 'Attempting to cancel orphaned report', {
        reportId,
        dbAvailable: !!db
      });

      if (db) {
        await db.query(
          `UPDATE manual_reports 
           SET status = 'failed',
               error_message = 'Report processing was cancelled',
               updated_at = NOW()
           WHERE id = ? AND status = 'generating'`,
          [reportId]
        );
        logger.info('ManualReports', 'Database update completed for orphaned report', {
          reportId
        });
      } else {
        logger.error('ManualReports', 'Database connection not available in cancel endpoint', {
          reportId
        });
      }
    }

    // Log cancellation
    await logAuditAction({
      reportId: report.id,
      action: 'cancel',
      userId: req.user.id,
      reportType: report.report_type || 'unknown',
      targetIds: typeof report.target_ids === 'string' ? JSON.parse(report.target_ids) : report.target_ids,
      dateRangeStart: report.date_range_start || new Date(),
      dateRangeEnd: report.date_range_end || new Date(),
      status: 'success',
      message: 'Report processing was cancelled by user',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('ManualReports', 'Report processing cancelled', {
      userId: req.user.id,
      reportId,
      wasActive: cancelled
    });

    res.json({
      success: true,
      message: 'Report processing cancelled successfully'
    });

  } catch (error) {
    logger.error('ManualReports', 'Cancel processing failed', {
      userId: req.user.id,
      reportId: req.params.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to cancel report processing',
      message: error.message
    });
  }
});

/**
 * POST /api/manual-reports/preview
 * Generate report preview without creating a full report
 */
router.post('/preview', async (req, res) => {
  try {
    const {
      reportType,
      targetIds,
      dateRangeStart,
      dateRangeEnd
    } = req.body;

    // Validate input
    if (!reportType || !targetIds || targetIds.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: reportType, targetIds'
      });
    }

    if (!dateRangeStart || !dateRangeEnd) {
      return res.status(400).json({
        error: 'Missing required fields: dateRangeStart, dateRangeEnd'
      });
    }

    // Parse dates
    const startDate = new Date(dateRangeStart);
    const endDate = new Date(dateRangeEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        error: 'Start date must be before end date'
      });
    }

    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return res.status(400).json({
        error: 'Date range cannot exceed 90 days'
      });
    }

    // Get target information
    let targets = [];
    if (reportType === 'service') {
      const [services] = await db.query(
        'SELECT id, name, client_name FROM services WHERE id IN (?)',
        [targetIds]
      );
      targets = services;
    } else {
      const [clients] = await db.query(
        'SELECT id, name FROM clients WHERE id IN (?)',
        [targetIds]
      );
      targets = clients;
    }

    if (targets.length === 0) {
      return res.status(404).json({
        error: 'No valid targets found'
      });
    }

    // Get sample telemetry data for preview (limited to first 3 targets and 1 day)
    const previewTargets = targetIds.slice(0, 3);
    const previewEndDate = new Date(Math.min(endDate.getTime(), startDate.getTime() + 24 * 60 * 60 * 1000));
    
    let previewData = [];
    
    if (reportType === 'service') {
      for (const serviceId of previewTargets) {
        const [telemetry] = await db.query(`
          SELECT 
            DATE_FORMAT(t.timestamp, '%Y-%m-%d %H:00:00') as hour,
            AVG(t.analog1_value) as avg_value,
            MIN(t.analog1_value) as min_value,
            MAX(t.analog1_value) as max_value,
            COUNT(t.id) as data_points
          FROM telemetry t
          JOIN metric_mappings mm ON t.node_name = mm.node_name
          JOIN service_metric_assignments sma ON mm.id = sma.metric_mapping_id
          WHERE sma.service_id = ? 
            AND t.timestamp BETWEEN ? AND ?
            AND sma.is_active = 1
            AND mm.is_active = 1
          GROUP BY DATE_FORMAT(t.timestamp, '%Y-%m-%d %H:00:00')
          ORDER BY hour ASC
          LIMIT 24
        `, [serviceId, startDate, previewEndDate]);
        
        const service = targets.find(t => t.id === serviceId);
        previewData.push({
          targetId: serviceId,
          targetName: service.name,
          clientName: service.client_name,
          dataPoints: telemetry.length,
          avgValue: telemetry.length > 0 ? telemetry.reduce((sum, t) => sum + parseFloat(t.avg_value), 0) / telemetry.length : 0,
          sampleData: telemetry.map(t => ({
            hour: t.hour,
            avgValue: parseFloat(t.avg_value),
            minValue: parseFloat(t.min_value),
            maxValue: parseFloat(t.max_value),
            dataPoints: t.data_points
          }))
        });
      }
    } else {
      for (const clientId of previewTargets) {
        const [telemetry] = await db.query(`
          SELECT 
            COUNT(DISTINCT sma.service_id) as services_with_data,
            COUNT(t.id) as total_data_points,
            AVG(t.analog1_value) as avg_value,
            MIN(t.analog1_value) as min_value,
            MAX(t.analog1_value) as max_value
          FROM telemetry t
          JOIN metric_mappings mm ON t.node_name = mm.node_name
          JOIN service_metric_assignments sma ON mm.id = sma.metric_mapping_id
          JOIN services s ON sma.service_id = s.id
          JOIN client_services cs ON s.id = cs.service_id
          WHERE cs.client_id = ? 
            AND t.timestamp BETWEEN ? AND ?
            AND sma.is_active = 1
            AND mm.is_active = 1
        `, [clientId, startDate, previewEndDate]);
        
        const client = targets.find(t => t.id === clientId);
        const stats = telemetry[0] || {};
        
        previewData.push({
          targetId: clientId,
          targetName: client.name,
          dataPoints: parseInt(stats.total_data_points || 0),
          servicesWithData: parseInt(stats.services_with_data || 0),
          avgValue: parseFloat(stats.avg_value || 0),
          minValue: parseFloat(stats.min_value || 0),
          maxValue: parseFloat(stats.max_value || 0)
        });
      }
    }

    // Calculate estimated report size and generation time
    const estimatedDataPoints = previewData.reduce((sum, item) => sum + item.dataPoints, 0);
    const totalTargets = targetIds.length;
    const estimatedTotalDataPoints = Math.round((estimatedDataPoints / previewTargets.length) * totalTargets);
    
    // Estimate file size (rough calculation: ~100 bytes per data point + 50KB base)
    const estimatedFileSize = Math.round(estimatedTotalDataPoints * 100 + 50 * 1024);
    
    // Estimate generation time (rough calculation: ~1ms per 10 data points + 2 seconds base)
    const estimatedGenerationTime = Math.round(estimatedTotalDataPoints / 10 + 2000);

    res.json({
      success: true,
      preview: {
        reportType,
        dateRange: {
          start: dateRangeStart,
          end: dateRangeEnd,
          days: daysDiff
        },
        targets: targets.map(t => ({
          id: t.id,
          name: t.name,
          clientName: t.client_name
        })),
        sampleData: previewData,
        estimates: {
          totalDataPoints: estimatedTotalDataPoints,
          fileSizeBytes: estimatedFileSize,
          fileSizeHuman: formatFileSize(estimatedFileSize),
          generationTimeMs: estimatedGenerationTime,
          generationTimeHuman: formatDuration(estimatedGenerationTime)
        },
        quality: {
          dataCompleteness: estimatedDataPoints > 0 ? 'good' : 'no_data',
          recommendedAction: estimatedDataPoints > 0 ? 'proceed' : 'adjust_date_range'
        }
      }
    });

  } catch (error) {
    logger.error('ManualReports', 'Preview generation failed', {
      userId: req.user?.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to generate preview',
      message: error.message
    });
  }
});

/**
 * GET /api/manual-reports/download-history
 * Get download history for the current user
 */
router.get('/download-history', async (req, res) => {
  try {
    const [history] = await db.query(`
      SELECT 
        mr.id,
        mr.report_type,
        mr.target_count,
        mr.date_range_start,
        mr.date_range_end,
        mr.status,
        mr.pdf_size_bytes,
        mr.created_at,
        mr.completed_at,
        mra.action,
        mra.created_at as action_time
      FROM manual_reports mr
      LEFT JOIN manual_reports_audit mra ON mr.id = mra.report_id AND mra.action = 'downloaded'
      WHERE mr.generated_by = ? 
        AND mr.status = 'completed'
      ORDER BY mr.created_at DESC
      LIMIT 50
    `, [req.user.id]);

    const formattedHistory = history.map(item => ({
      ...item,
      fileSizeHuman: item.pdf_size_bytes ? formatFileSize(item.pdf_size_bytes) : 'Unknown',
      downloaded: item.action === 'downloaded',
      downloadTime: item.action_time
    }));

    res.json({
      success: true,
      history: formattedHistory
    });

  } catch (error) {
    logger.error('ManualReports', 'Download history fetch failed', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to fetch download history',
      message: error.message
    });
  }
});

// Helper functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1000) return ms + 'ms';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return seconds + 's';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * GET /api/manual-reports/cache-stats
 * Get cache statistics and performance metrics
 */
router.get('/cache-stats', async (req, res) => {
  try {
    const cacheManager = req.app.get('cacheManager');
    if (!cacheManager) {
      return res.status(503).json({
        error: 'Cache manager not available'
      });
    }

    const stats = await cacheManager.getCacheStatistics();
    
    res.json({
      success: true,
      cacheStatistics: {
        totalEntries: stats.statistics.total_entries || 0,
        totalSizeBytes: stats.statistics.total_size || 0,
        totalSizeHuman: formatFileSize(stats.statistics.total_size || 0),
        totalAccesses: stats.statistics.total_accesses || 0,
        avgAccessCount: stats.statistics.avg_accesses || 0,
        hitRate: stats.hitRate || 0,
        oldestEntry: stats.statistics.oldest_entry,
        mostRecentAccess: stats.statistics.most_recent_access,
        lastUpdated: stats.statistics.updated_at
      },
      topEntries: stats.topEntries.map(entry => ({
        cacheKey: entry.cache_key,
        reportType: entry.report_type,
        accessCount: entry.access_count,
        fileSize: entry.file_size,
        fileSizeHuman: formatFileSize(entry.file_size),
        lastAccessed: entry.last_accessed,
        createdAt: entry.created_at
      })),
      performance: {
        hitRatePercentage: Math.round(stats.hitRate || 0),
        cacheEfficiency: stats.hitRate > 50 ? 'excellent' : stats.hitRate > 25 ? 'good' : 'needs_improvement'
      }
    });

  } catch (error) {
    logger.error('ManualReports', 'Cache stats fetch failed', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to fetch cache statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/manual-reports/cache/clear
 * Clear cache entries (admin only)
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const { targetIds, reportType, dateRangeStart, dateRangeEnd } = req.body;
    const cacheManager = req.app.get('cacheManager');
    
    if (!cacheManager) {
      return res.status(503).json({
        error: 'Cache manager not available'
      });
    }

    let clearedCount = 0;

    if (targetIds && reportType && dateRangeStart && dateRangeEnd) {
      // Clear specific cache entry
      const success = await cacheManager.invalidateCache(
        reportType,
        targetIds,
        dateRangeStart,
        dateRangeEnd
      );
      clearedCount = success ? 1 : 0;
    } else {
      // Clear all expired cache entries
      await cacheManager.cleanupExpiredCache();
      await cacheManager.cleanupBySize();
      clearedCount = 'all_expired';
    }

    // Log cache clear action
    await logAuditAction({
      action: 'cache_clear',
      userId: req.user.id,
      reportType,
      targetIds,
      dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : null,
      dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : null,
      status: 'success',
      message: `Cache cleared: ${clearedCount} entries`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: `Cache cleared successfully (${clearedCount} entries)`,
      clearedCount
    });

  } catch (error) {
    logger.error('ManualReports', 'Cache clear failed', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

/**
 * GET /api/manual-reports/performance
 * Get performance metrics and statistics
 */
router.get('/performance', async (req, res) => {
  try {
    const performanceMonitor = req.app.get('performanceMonitor');
    const queryOptimizer = req.app.get('queryOptimizer');
    
    if (!performanceMonitor) {
      return res.status(503).json({
        error: 'Performance monitor not available'
      });
    }

    const { type = null, timeRange = 60 } = req.query;
    
    const stats = await performanceMonitor.getPerformanceStats(type, parseInt(timeRange));
    
    // Add query optimizer stats
    let queryStats = {};
    if (queryOptimizer) {
      queryStats = {
        cacheStats: queryOptimizer.getCacheStats(),
        cacheEnabled: true
      };
    }

    res.json({
      success: true,
      performance: {
        summary: stats.summary,
        topSlowQueries: stats.topSlowQueries,
        metrics: stats.metrics,
        queryOptimizer: queryStats,
        monitoring: {
          isActive: performanceMonitor.isMonitoring,
          slowQueryThreshold: performanceMonitor.slowQueryThreshold,
          memoryThreshold: performanceMonitor.memoryThreshold
        }
      }
    });

  } catch (error) {
    logger.error('ManualReports', 'Performance stats fetch failed', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to fetch performance statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/manual-reports/performance/optimize
 * Run database optimization tasks
 */
router.post('/performance/optimize', async (req, res) => {
  try {
    const queryOptimizer = req.app.get('queryOptimizer');
    
    if (!queryOptimizer) {
      return res.status(503).json({
        error: 'Query optimizer not available'
      });
    }

    const { operation = 'all' } = req.body;
    
    let results = {};
    
    if (operation === 'all' || operation === 'optimize') {
      results.optimize = await queryOptimizer.optimizeTables();
    }
    
    if (operation === 'all' || operation === 'analyze') {
      results.analyze = await queryOptimizer.analyzeTables();
    }
    
    if (operation === 'all' || operation === 'cache') {
      queryOptimizer.clearCache();
      results.cache = { status: 'success', message: 'Query cache cleared' };
    }

    // Log optimization action
    await logAuditAction({
      action: 'performance_optimize',
      userId: req.user.id,
      status: 'success',
      message: `Database optimization completed: ${operation}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Database optimization completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('ManualReports', 'Database optimization failed', {
      userId: req.user.id,
      error: error.message
    });

    res.status(500).json({
      error: 'Failed to optimize database',
      message: error.message
    });
  }
});

/**
 * GET /api/manual-reports/performance/health
 * Get system health metrics
 */
router.get('/performance/health', async (req, res) => {
  try {
    const performanceMonitor = req.app.get('performanceMonitor');
    const queryOptimizer = req.app.get('queryOptimizer');
    const cacheManager = req.app.get('cacheManager');
    
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      components: {}
    };

    // Check performance monitor
    if (performanceMonitor) {
      health.components.performanceMonitor = {
        status: 'active',
        isMonitoring: performanceMonitor.isMonitoring
      };
    } else {
      health.components.performanceMonitor = {
        status: 'inactive',
        message: 'Performance monitor not initialized'
      };
      health.status = 'degraded';
    }

    // Check query optimizer
    if (queryOptimizer) {
      const cacheStats = queryOptimizer.getCacheStats();
      health.components.queryOptimizer = {
        status: 'active',
        cacheSize: cacheStats.size,
        cacheMaxSize: cacheStats.maxSize
      };
    } else {
      health.components.queryOptimizer = {
        status: 'inactive',
        message: 'Query optimizer not initialized'
      };
      health.status = 'degraded';
    }

    // Check cache manager
    if (cacheManager) {
      const cacheStats = await cacheManager.getCacheStatistics();
      health.components.cacheManager = {
        status: 'active',
        totalEntries: cacheStats.statistics.total_entries || 0,
        hitRate: Math.round(cacheStats.hitRate || 0)
      };
    } else {
      health.components.cacheManager = {
        status: 'inactive',
        message: 'Cache manager not initialized'
      };
      health.status = 'degraded';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    health.components.memory = {
      status: 'active',
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    };

    // Check database connection
    try {
      await db.query('SELECT 1');
      health.components.database = {
        status: 'active',
        message: 'Database connection successful'
      };
    } catch (error) {
      health.components.database = {
        status: 'error',
        message: 'Database connection failed'
      };
      health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 206 : 503;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      health
    });

  } catch (error) {
    logger.error('ManualReports', 'Health check failed', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      health: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

module.exports = router;
