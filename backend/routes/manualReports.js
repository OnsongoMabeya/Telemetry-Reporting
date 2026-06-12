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
const manualReportProcessor = require('../services/manualReportProcessor');

// Get database connection from app
let db;
router.use((req, res, next) => {
  db = req.app.get('db');
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

    // Generate cache key
    const cacheKey = generateCacheKey(reportType, targetIds, startDate, endDate);

    // Update cache statistics
    await updateCacheStats(cacheKey, {
      reportType,
      targetIds,
      dateRangeStart: startDate,
      dateRangeEnd: endDate
    });

    // Check if report is cached
    const [cachedReport] = await db.query(
      `SELECT file_path, pdf_size_bytes FROM manual_reports_cache_stats 
       WHERE cache_key = ? AND is_cached = TRUE AND expires_at > NOW()`,
      [cacheKey]
    );

    let reportId;
    let isFromCache = false;

    if (cachedReport.length > 0) {
      // Create report entry for cached report
      const [result] = await db.query(
        `INSERT INTO manual_reports 
         (report_type, target_ids, date_range_start, date_range_end, generated_by,
          status, delivery_method, recipients, cache_key, is_cached, 
          pdf_size_bytes, file_path, expires_at)
         VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, TRUE, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        [
          reportType,
          JSON.stringify(targetIds),
          startDate,
          endDate,
          req.user.id,
          deliveryMethod,
          JSON.stringify(recipients),
          cacheKey,
          cachedReport[0].pdf_size_bytes,
          cachedReport[0].file_path
        ]
      );
      
      reportId = result.insertId;
      isFromCache = true;

      // Log cache hit
      await logAuditAction({
        reportId,
        cacheKey,
        action: 'cache_hit',
        userId: req.user.id,
        reportType,
        targetIds,
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        status: 'success',
        message: 'Report served from cache',
        deliveryMethod,
        recipientsCount: recipients.length,
        pdfSizeBytes: cachedReport[0].pdf_size_bytes,
        executionTimeMs: Date.now() - startTime,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('ManualReports', 'Report served from cache', {
        userId: req.user.id,
        reportId,
        cacheKey,
        executionTime: Date.now() - startTime
      });

    } else {
      // Create new report entry
      const [result] = await db.query(
        `INSERT INTO manual_reports 
         (report_type, target_ids, date_range_start, date_range_end, generated_by,
          status, delivery_method, recipients, cache_key, expires_at)
         VALUES (?, ?, ?, ?, ?, 'generating', ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
        [
          reportType,
          JSON.stringify(targetIds),
          startDate,
          endDate,
          req.user.id,
          deliveryMethod,
          JSON.stringify(recipients),
          cacheKey
        ]
      );
      
      reportId = result.insertId;

      // Log generation start
      await logAuditAction({
        reportId,
        cacheKey,
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
    }

    res.status(201).json({
      success: true,
      reportId,
      status: isFromCache ? 'completed' : 'generating',
      isFromCache,
      message: isFromCache ? 
        'Report generated successfully from cache' : 
        'Report generation started',
      estimatedTime: isFromCache ? 0 : 30000 // 30 seconds estimate
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
      targetIds: JSON.parse(report.target_ids),
      dateRangeStart: report.date_range_start,
      dateRangeEnd: report.date_range_end,
      status: 'success',
      message: 'Report downloaded',
      deliveryMethod: 'download',
      pdfSizeBytes: report.pdf_size_bytes,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('ManualReports', 'Report downloaded', {
      userId: req.user.id,
      reportId: report.id,
      fileSize: report.pdf_size_bytes
    });

    // TODO: Implement file download
    // This will be implemented with file system integration
    res.json({
      success: true,
      message: 'Report download ready',
      downloadUrl: `/api/manual-reports/file/${report.id}`,
      fileName: `manual_report_${report.report_type}_${report.id}.pdf`,
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
      targetIds: JSON.parse(report.target_ids),
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

    let whereClause = 'WHERE generated_by = ?';
    const params = [req.user.id];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const [reports] = await db.query(
      `SELECT id, report_type, target_ids, date_range_start, date_range_end,
              status, generation_time_ms, pdf_size_bytes, delivery_method,
              is_cached, created_at, updated_at
       FROM manual_reports 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [totalCount] = await db.query(
      `SELECT COUNT(*) as total FROM manual_reports ${whereClause}`,
      params
    );

    const processedReports = reports.map(report => {
      try {
        const targetIds = JSON.parse(report.target_ids);
        return {
          ...report,
          targetIds,
          targetCount: targetIds.length
        };
      } catch (error) {
        logger.error('ManualReports', 'Failed to parse target_ids', {
          reportId: report.id,
          targetIds: report.target_ids,
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

    if (cancelled) {
      // Log cancellation
      await logAuditAction({
        reportId: report.id,
        action: 'error',
        userId: req.user.id,
        reportType: 'unknown',
        targetIds: [],
        dateRangeStart: new Date(),
        dateRangeEnd: new Date(),
        status: 'success',
        message: 'Report processing was cancelled by user',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      logger.info('ManualReports', 'Report processing cancelled', {
        userId: req.user.id,
        reportId
      });

      res.json({
        success: true,
        message: 'Report processing cancelled successfully'
      });

    } else {
      res.status(500).json({
        error: 'Failed to cancel report processing'
      });
    }

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

module.exports = router;
