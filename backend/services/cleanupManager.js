const logger = require('../utils/logger');

class CleanupManager {
  constructor(pool) {
    this.pool = pool;
    this.batchSize = 5000;
    this.cleanupInterval = 60000; // 1 minute
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    logger.info('SYSTEM', 'Cleanup manager started');
    
    // Run cleanup immediately and then every interval
    this.runCleanup();
    this.cleanupTimer = setInterval(() => this.runCleanup(), this.cleanupInterval);
  }

  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.isRunning = false;
    logger.info('SYSTEM', 'Cleanup manager stopped');
  }

  async runCleanup() {
    try {
      await Promise.all([
        this.cleanupOldMetrics(),
        this.cleanupOldSlowQueries(),
        this.cleanupOldLogs()
      ]);
    } catch (error) {
      logger.error('SYSTEM', 'Cleanup failed', { metadata: { error: error.message } });
    }
  }

  /**
   * Clean up metrics older than 30 days using batch deletion
   * Prevents full table locks and allows concurrent queries
   */
  async cleanupOldMetrics() {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let totalDeleted = 0;
      let batchCount = 0;

      while (true) {
        const [result] = await this.pool.query(
          'DELETE FROM telemetry_data WHERE timestamp < ? LIMIT ?',
          [cutoffDate, this.batchSize]
        );

        if (result.affectedRows === 0) {
          break;
        }

        totalDeleted += result.affectedRows;
        batchCount++;

        // Add small delay between batches to prevent lock contention
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (totalDeleted > 0) {
        logger.info('SYSTEM', 'Old metrics cleaned up', {
          metadata: {
            deletedRows: totalDeleted,
            batches: batchCount,
            cutoffDate: cutoffDate.toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('SYSTEM', 'Failed to cleanup old metrics', {
        metadata: { error: error.message }
      });
    }
  }

  /**
   * Clean up slow query logs older than 7 days
   */
  async cleanupOldSlowQueries() {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      let totalDeleted = 0;
      let batchCount = 0;

      while (true) {
        const [result] = await this.pool.query(
          'DELETE FROM slow_queries WHERE timestamp < ? LIMIT ?',
          [cutoffDate, this.batchSize]
        );

        if (result.affectedRows === 0) {
          break;
        }

        totalDeleted += result.affectedRows;
        batchCount++;

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (totalDeleted > 0) {
        logger.info('SYSTEM', 'Old slow queries cleaned up', {
          metadata: {
            deletedRows: totalDeleted,
            batches: batchCount,
            cutoffDate: cutoffDate.toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('SYSTEM', 'Failed to cleanup old slow queries', {
        metadata: { error: error.message }
      });
    }
  }

  /**
   * Clean up application logs older than 14 days
   */
  async cleanupOldLogs() {
    try {
      const cutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      let totalDeleted = 0;
      let batchCount = 0;

      while (true) {
        const [result] = await this.pool.query(
          'DELETE FROM application_logs WHERE timestamp < ? LIMIT ?',
          [cutoffDate, this.batchSize]
        );

        if (result.affectedRows === 0) {
          break;
        }

        totalDeleted += result.affectedRows;
        batchCount++;

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (totalDeleted > 0) {
        logger.info('SYSTEM', 'Old logs cleaned up', {
          metadata: {
            deletedRows: totalDeleted,
            batches: batchCount,
            cutoffDate: cutoffDate.toISOString()
          }
        });
      }
    } catch (error) {
      // Don't fail if application_logs table doesn't exist
      if (!error.message.includes('Table')) {
        logger.error('SYSTEM', 'Failed to cleanup old logs', {
          metadata: { error: error.message }
        });
      }
    }
  }

  /**
   * Get cleanup statistics
   */
  async getStats() {
    try {
      const [tableStats] = await this.pool.query(`
        SELECT 
          table_name,
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
          table_rows
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN ('telemetry_data', 'slow_queries', 'application_logs')
        ORDER BY size_mb DESC
      `);

      return {
        isRunning: this.isRunning,
        tables: tableStats,
        batchSize: this.batchSize,
        cleanupInterval: this.cleanupInterval
      };
    } catch (error) {
      logger.error('SYSTEM', 'Failed to get cleanup stats', {
        metadata: { error: error.message }
      });
      return null;
    }
  }
}

module.exports = CleanupManager;
