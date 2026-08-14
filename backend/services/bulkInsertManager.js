const logger = require('../utils/logger');

class BulkInsertManager {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.batchSize = options.batchSize || 500; // Batch size for bulk inserts
    this.flushInterval = options.flushInterval || 5000; // Flush every 5 seconds
    this.maxRetries = options.maxRetries || 3;
    this.isRunning = false;
    this.queue = [];
    this.stats = {
      totalInserted: 0,
      totalBatches: 0,
      totalErrors: 0,
      avgBatchTime: 0,
      lastFlush: null
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('SYSTEM', 'Bulk insert manager started');

    // Flush queue periodically
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.isRunning = false;
    logger.info('SYSTEM', 'Bulk insert manager stopped');
  }

  /**
   * Queue a metric for bulk insertion
   */
  queueMetric(metric) {
    if (!this.isRunning) {
      throw new Error('Bulk insert manager is not running');
    }

    this.queue.push(metric);

    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Queue multiple metrics at once
   */
  queueMetrics(metrics) {
    if (!this.isRunning) {
      throw new Error('Bulk insert manager is not running');
    }

    this.queue.push(...metrics);

    // Flush if batch size reached
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush queued metrics to database
   */
  async flush() {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);
    const startTime = Date.now();

    try {
      await this.insertBatch(batch);

      const duration = Date.now() - startTime;
      this.stats.totalInserted += batch.length;
      this.stats.totalBatches++;
      this.stats.avgBatchTime = (this.stats.avgBatchTime + duration) / 2;
      this.stats.lastFlush = new Date();

      logger.info('SYSTEM', 'Bulk insert batch completed', {
        metadata: {
          batchSize: batch.length,
          duration,
          totalInserted: this.stats.totalInserted
        }
      });
    } catch (error) {
      logger.error('SYSTEM', 'Bulk insert batch failed', {
        metadata: {
          batchSize: batch.length,
          error: error.message
        }
      });

      // Re-queue failed items
      this.queue.unshift(...batch);
      this.stats.totalErrors++;
    }
  }

  /**
   * Insert a batch of metrics using bulk insert
   */
  async insertBatch(metrics, retryCount = 0) {
    if (metrics.length === 0) {
      return;
    }

    try {
      // Prepare values for bulk insert
      const values = metrics.map(m => [
        m.nodeId || m.NodeName,
        m.metricName || m.MetricName,
        m.value,
        m.timestamp || new Date(),
        m.unit || null,
        m.baseStationName || m.NodeBaseStationName || null
      ]);

      const query = `
        INSERT INTO telemetry_data 
        (NodeName, MetricName, value, timestamp, unit, NodeBaseStationName)
        VALUES ?
        ON DUPLICATE KEY UPDATE
        value = VALUES(value),
        timestamp = VALUES(timestamp)
      `;

      const [result] = await this.pool.query(query, [values]);

      return result;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        logger.warn('SYSTEM', 'Retrying bulk insert', {
          metadata: {
            attempt: retryCount + 1,
            maxRetries: this.maxRetries,
            error: error.message
          }
        });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.insertBatch(metrics, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Force flush all queued items
   */
  async flushAll() {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }

  /**
   * Get bulk insert statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      queuedItems: this.queue.length,
      totalInserted: this.stats.totalInserted,
      totalBatches: this.stats.totalBatches,
      totalErrors: this.stats.totalErrors,
      avgBatchTime: `${this.stats.avgBatchTime.toFixed(2)}ms`,
      lastFlush: this.stats.lastFlush,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalInserted: 0,
      totalBatches: 0,
      totalErrors: 0,
      avgBatchTime: 0,
      lastFlush: null
    };
  }
}

module.exports = BulkInsertManager;
