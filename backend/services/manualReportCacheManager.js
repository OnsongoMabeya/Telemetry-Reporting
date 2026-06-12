const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class ManualReportCacheManager {
  constructor(db) {
    this.db = db;
    this.cacheDir = path.join(__dirname, '../cache/manual-reports');
    this.maxCacheSize = 100 * 1024 * 1024; // 100MB
    this.maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.frequentRequestThreshold = 4; // 4+ requests per week
    this.initializeCache();
  }

  async initializeCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.cleanupExpiredCache();
      await this.updateCacheStatistics();
    } catch (error) {
      logger.error('CacheManager', 'Failed to initialize cache', { error: error.message });
    }
  }

  /**
   * Generate cache key for report parameters
   */
  generateCacheKey(reportType, targetIds, dateRangeStart, dateRangeEnd) {
    const targetHash = crypto.createHash('md5')
      .update(JSON.stringify(targetIds.sort()))
      .digest('hex');
    
    const dateStart = new Date(dateRangeStart).toISOString().slice(0, 16);
    const dateEnd = new Date(dateRangeEnd).toISOString().slice(0, 16);
    
    return `manual_report_${reportType}_${targetHash}_${dateStart}_${dateEnd}`;
  }

  /**
   * Check if a report should be cached based on request frequency
   */
  async shouldCacheReport(reportType, targetIds, dateRangeStart, dateRangeEnd) {
    try {
      const cacheKey = this.generateCacheKey(reportType, targetIds, dateRangeStart, dateRangeEnd);
      
      // Check request frequency in the last 7 days
      const [frequencyData] = await this.db.query(`
        SELECT 
          COUNT(*) as request_count,
          MAX(mr.created_at) as last_requested
        FROM manual_reports mr
        WHERE mr.report_type = ?
          AND JSON_CONTAINS(mr.target_ids, ?)
          AND mr.date_range_start = ?
          AND mr.date_range_end = ?
          AND mr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `, [
        reportType,
        JSON.stringify(targetIds),
        dateRangeStart,
        dateRangeEnd
      ]);

      const requestCount = frequencyData[0]?.request_count || 0;
      
      // Cache if requested 4+ times in the last week
      if (requestCount >= this.frequentRequestThreshold) {
        return true;
      }

      // Also cache if any of the targets are frequently requested
      const [targetFrequency] = await this.db.query(`
        SELECT 
          COUNT(DISTINCT mr.id) as unique_reports
        FROM manual_reports mr
        WHERE JSON_CONTAINS(mr.target_ids, ?)
          AND mr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `, [JSON.stringify(targetIds)]);

      const uniqueReports = targetFrequency[0]?.unique_reports || 0;
      return uniqueReports >= this.frequentRequestThreshold;

    } catch (error) {
      logger.error('CacheManager', 'Failed to check cache eligibility', { error: error.message });
      return false;
    }
  }

  /**
   * Store report in cache
   */
  async cacheReport(reportId, reportData, metadata) {
    try {
      const cacheKey = this.generateCacheKey(
        metadata.reportType,
        metadata.targetIds,
        metadata.dateRangeStart,
        metadata.dateRangeEnd
      );

      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.pdf`);
      
      // Store the PDF file
      await fs.writeFile(cacheFilePath, reportData);

      // Store cache metadata in database
      await this.db.query(`
        INSERT INTO manual_reports_cache (
          cache_key, report_id, report_type, target_ids,
          date_range_start, date_range_end, file_path,
          file_size, created_at, last_accessed, access_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)
        ON DUPLICATE KEY UPDATE
          file_size = VALUES(file_size),
          last_accessed = NOW(),
          access_count = access_count + 1
      `, [
        cacheKey,
        reportId,
        metadata.reportType,
        JSON.stringify(metadata.targetIds),
        metadata.dateRangeStart,
        metadata.dateRangeEnd,
        cacheFilePath,
        reportData.length
      ]);

      // Update cache statistics
      await this.updateCacheStatistics();

      logger.info('CacheManager', 'Report cached successfully', {
        cacheKey,
        reportId,
        fileSize: reportData.length
      });

      return true;
    } catch (error) {
      logger.error('CacheManager', 'Failed to cache report', {
        reportId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Retrieve report from cache
   */
  async getCachedReport(reportType, targetIds, dateRangeStart, dateRangeEnd) {
    try {
      const cacheKey = this.generateCacheKey(reportType, targetIds, dateRangeStart, dateRangeEnd);

      // Get cache metadata
      const [cacheData] = await this.db.query(`
        SELECT * FROM manual_reports_cache 
        WHERE cache_key = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [cacheKey, Math.floor(this.maxCacheAge / (24 * 60 * 60 * 1000))]);

      if (cacheData.length === 0) {
        return null;
      }

      const cache = cacheData[0];

      // Check if file exists
      try {
        await fs.access(cache.file_path);
      } catch {
        // File doesn't exist, remove cache entry
        await this.db.query('DELETE FROM manual_reports_cache WHERE cache_key = ?', [cacheKey]);
        return null;
      }

      // Read cached file
      const reportData = await fs.readFile(cache.file_path);

      // Update access statistics
      await this.db.query(`
        UPDATE manual_reports_cache 
        SET last_accessed = NOW(), access_count = access_count + 1 
        WHERE cache_key = ?
      `, [cacheKey]);

      logger.info('CacheManager', 'Cache hit successful', {
        cacheKey,
        accessCount: cache.access_count + 1
      });

      return {
        data: reportData,
        metadata: {
          reportId: cache.report_id,
          reportType: cache.report_type,
          targetIds: JSON.parse(cache.target_ids),
          dateRangeStart: cache.date_range_start,
          dateRangeEnd: cache.date_range_end,
          fileSize: cache.file_size,
          createdAt: cache.created_at,
          lastAccessed: cache.last_accessed,
          accessCount: cache.access_count + 1
        }
      };

    } catch (error) {
      logger.error('CacheManager', 'Failed to retrieve cached report', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Invalidate cache for specific parameters
   */
  async invalidateCache(reportType, targetIds, dateRangeStart, dateRangeEnd) {
    try {
      const cacheKey = this.generateCacheKey(reportType, targetIds, dateRangeStart, dateRangeEnd);

      // Get cache entry
      const [cacheData] = await this.db.query(`
        SELECT file_path FROM manual_reports_cache WHERE cache_key = ?
      `, [cacheKey]);

      if (cacheData.length > 0) {
        // Delete file
        try {
          await fs.unlink(cacheData[0].file_path);
        } catch (error) {
          logger.warn('CacheManager', 'Failed to delete cache file', {
            filePath: cacheData[0].file_path,
            error: error.message
          });
        }

        // Delete database entry
        await this.db.query('DELETE FROM manual_reports_cache WHERE cache_key = ?', [cacheKey]);
      }

      await this.updateCacheStatistics();

      logger.info('CacheManager', 'Cache invalidated', { cacheKey });
      return true;
    } catch (error) {
      logger.error('CacheManager', 'Failed to invalidate cache', { error: error.message });
      return false;
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache() {
    try {
      const expiredDays = Math.floor(this.maxCacheAge / (24 * 60 * 60 * 1000));

      // Get expired cache entries
      const [expiredEntries] = await this.db.query(`
        SELECT cache_key, file_path FROM manual_reports_cache 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [expiredDays]);

      // Delete expired files
      for (const entry of expiredEntries) {
        try {
          await fs.unlink(entry.file_path);
        } catch (error) {
          logger.warn('CacheManager', 'Failed to delete expired cache file', {
            filePath: entry.file_path,
            error: error.message
          });
        }
      }

      // Delete expired database entries
      const [result] = await this.db.query(`
        DELETE FROM manual_reports_cache 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [expiredDays]);

      if (result.affectedRows > 0) {
        logger.info('CacheManager', 'Cleaned up expired cache entries', {
          count: result.affectedRows
        });
      }

      await this.updateCacheStatistics();
    } catch (error) {
      logger.error('CacheManager', 'Failed to cleanup expired cache', { error: error.message });
    }
  }

  /**
   * Clean up cache based on size (LRU eviction)
   */
  async cleanupBySize() {
    try {
      // Get current cache size
      const [sizeData] = await this.db.query(`
        SELECT SUM(file_size) as total_size, COUNT(*) as total_entries
        FROM manual_reports_cache
      `);

      const totalSize = sizeData[0]?.total_size || 0;
      const totalEntries = sizeData[0]?.total_entries || 0;

      if (totalSize <= this.maxCacheSize) {
        return;
      }

      // Get oldest entries to delete (LRU)
      const [entriesToDelete] = await this.db.query(`
        SELECT cache_key, file_path FROM manual_reports_cache 
        ORDER BY last_accessed ASC 
        LIMIT ?
      `, [Math.ceil(totalEntries * 0.2)]); // Delete oldest 20%

      // Delete files and database entries
      for (const entry of entriesToDelete) {
        try {
          await fs.unlink(entry.file_path);
        } catch (error) {
          logger.warn('CacheManager', 'Failed to delete cache file during cleanup', {
            filePath: entry.file_path,
            error: error.message
          });
        }

        await this.db.query('DELETE FROM manual_reports_cache WHERE cache_key = ?', [entry.cache_key]);
      }

      logger.info('CacheManager', 'Cache cleanup completed', {
        deletedCount: entriesToDelete.length,
        previousSize: totalSize
      });

      await this.updateCacheStatistics();
    } catch (error) {
      logger.error('CacheManager', 'Failed to cleanup cache by size', { error: error.message });
    }
  }

  /**
   * Update cache statistics
   */
  async updateCacheStatistics() {
    try {
      const [stats] = await this.db.query(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(file_size) as total_size,
          SUM(access_count) as total_accesses,
          AVG(access_count) as avg_accesses,
          MAX(created_at) as oldest_entry,
          MAX(last_accessed) as most_recent_access
        FROM manual_reports_cache
      `);

      const statistics = stats[0] || {
        total_entries: 0,
        total_size: 0,
        total_accesses: 0,
        avg_accesses: 0,
        oldest_entry: null,
        most_recent_access: null
      };

      // Update statistics table
      await this.db.query(`
        INSERT INTO manual_reports_cache_stats (
          total_entries, total_size_bytes, total_accesses, 
          avg_access_count, oldest_entry, most_recent_access, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          total_entries = VALUES(total_entries),
          total_size_bytes = VALUES(total_size_bytes),
          total_accesses = VALUES(total_accesses),
          avg_access_count = VALUES(avg_access_count),
          oldest_entry = VALUES(oldest_entry),
          most_recent_access = VALUES(most_recent_access),
          updated_at = NOW()
      `, [
        statistics.total_entries,
        statistics.total_size,
        statistics.total_accesses,
        statistics.avg_accesses,
        statistics.oldest_entry,
        statistics.most_recent_access
      ]);

    } catch (error) {
      logger.error('CacheManager', 'Failed to update cache statistics', { error: error.message });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics() {
    try {
      const [stats] = await this.db.query('SELECT * FROM manual_reports_cache_stats ORDER BY updated_at DESC LIMIT 1');
      
      const [topEntries] = await this.db.query(`
        SELECT 
          cache_key, report_type, access_count, 
          file_size, last_accessed, created_at
        FROM manual_reports_cache 
        ORDER BY access_count DESC 
        LIMIT 10
      `);

      return {
        statistics: stats[0] || {},
        topEntries: topEntries,
        hitRate: await this.calculateHitRate()
      };
    } catch (error) {
      logger.error('CacheManager', 'Failed to get cache statistics', { error: error.message });
      return { statistics: {}, topEntries: [], hitRate: 0 };
    }
  }

  /**
   * Calculate cache hit rate
   */
  async calculateHitRate() {
    try {
      const [hitData] = await this.db.query(`
        SELECT 
          SUM(CASE WHEN access_count > 1 THEN access_count - 1 ELSE 0 END) as cache_hits,
          COUNT(*) as total_requests
        FROM manual_reports_cache
      `);

      const cacheHits = hitData[0]?.cache_hits || 0;
      const totalRequests = hitData[0]?.total_requests || 0;

      return totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    } catch (error) {
      logger.error('CacheManager', 'Failed to calculate hit rate', { error: error.message });
      return 0;
    }
  }

  /**
   * Schedule periodic maintenance
   */
  scheduleMaintenance() {
    // Run cleanup every 6 hours
    setInterval(async () => {
      await this.cleanupExpiredCache();
      await this.cleanupBySize();
    }, 6 * 60 * 60 * 1000);

    logger.info('CacheManager', 'Cache maintenance scheduled');
  }
}

module.exports = ManualReportCacheManager;
