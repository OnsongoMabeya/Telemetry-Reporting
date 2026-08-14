const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class MetricQueryOptimizer {
  constructor(pool) {
    this.pool = pool;
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 min TTL
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgQueryTime: 0,
      slowQueries: 0
    };
  }

  /**
   * Get metrics for a node within a date range with caching
   * Optimized with index usage and result limiting
   */
  async getMetrics(nodeId, startDate, endDate, limit = 1000) {
    const cacheKey = `metrics_${nodeId}_${startDate}_${endDate}_${limit}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      logger.info('CACHE', 'Metric query cache hit', {
        metadata: { nodeId, cacheKey }
      });
      return cached;
    }

    this.stats.cacheMisses++;
    const startTime = Date.now();

    try {
      // Optimized query using indexes
      const query = `
        SELECT 
          NodeName,
          MetricName,
          value,
          timestamp,
          unit
        FROM telemetry_data
        WHERE NodeName = ? 
          AND timestamp BETWEEN ? AND ?
        ORDER BY timestamp DESC
        LIMIT ?
      `;

      const [rows] = await this.pool.query(query, [
        nodeId,
        startDate,
        endDate,
        limit
      ]);

      const duration = Date.now() - startTime;
      this.stats.totalQueries++;
      this.stats.avgQueryTime = (this.stats.avgQueryTime + duration) / 2;

      if (duration > 1000) {
        this.stats.slowQueries++;
        logger.warn('SLOW_QUERY', 'Metric query exceeded 1 second', {
          metadata: { nodeId, duration, rowCount: rows.length }
        });
      }

      // Cache the result
      this.cache.set(cacheKey, rows);

      logger.info('QUERY', 'Metric query executed', {
        metadata: { nodeId, duration, rowCount: rows.length }
      });

      return rows;
    } catch (error) {
      logger.error('QUERY', 'Failed to fetch metrics', {
        metadata: { nodeId, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Get aggregated metrics (hourly/daily) with caching
   * Much faster for large date ranges
   */
  async getAggregatedMetrics(nodeId, metricName, startDate, endDate, aggregation = 'hourly') {
    const cacheKey = `agg_${nodeId}_${metricName}_${startDate}_${endDate}_${aggregation}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;
    const startTime = Date.now();

    try {
      let dateFormat;
      switch (aggregation) {
        case 'daily':
          dateFormat = '%Y-%m-%d';
          break;
        case 'hourly':
        default:
          dateFormat = '%Y-%m-%d %H:00:00';
          break;
      }

      const query = `
        SELECT 
          DATE_FORMAT(timestamp, '${dateFormat}') as period,
          AVG(value) as avg_value,
          MAX(value) as max_value,
          MIN(value) as min_value,
          COUNT(*) as data_points,
          STDDEV(value) as std_dev
        FROM telemetry_data
        WHERE NodeName = ? 
          AND MetricName = ?
          AND timestamp BETWEEN ? AND ?
        GROUP BY period
        ORDER BY period DESC
      `;

      const [rows] = await this.pool.query(query, [
        nodeId,
        metricName,
        startDate,
        endDate
      ]);

      const duration = Date.now() - startTime;
      this.stats.totalQueries++;
      this.stats.avgQueryTime = (this.stats.avgQueryTime + duration) / 2;

      if (duration > 2000) {
        this.stats.slowQueries++;
        logger.warn('SLOW_QUERY', 'Aggregated query exceeded 2 seconds', {
          metadata: { nodeId, metricName, duration, rowCount: rows.length }
        });
      }

      // Cache aggregated results for longer (10 min)
      this.cache.set(cacheKey, rows, 600);

      return rows;
    } catch (error) {
      logger.error('QUERY', 'Failed to fetch aggregated metrics', {
        metadata: { nodeId, metricName, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Get metrics for multiple nodes efficiently
   * Uses batch query instead of N+1 queries
   */
  async getMetricsForNodes(nodeIds, startDate, endDate, limit = 100) {
    const cacheKey = `metrics_batch_${nodeIds.join('_')}_${startDate}_${endDate}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;
    const startTime = Date.now();

    try {
      // Use IN clause for batch query
      const placeholders = nodeIds.map(() => '?').join(',');
      const query = `
        SELECT 
          NodeName,
          MetricName,
          value,
          timestamp
        FROM telemetry_data
        WHERE NodeName IN (${placeholders})
          AND timestamp BETWEEN ? AND ?
        ORDER BY NodeName, timestamp DESC
        LIMIT ?
      `;

      const params = [...nodeIds, startDate, endDate, limit];
      const [rows] = await this.pool.query(query, params);

      const duration = Date.now() - startTime;
      this.stats.totalQueries++;
      this.stats.avgQueryTime = (this.stats.avgQueryTime + duration) / 2;

      // Cache batch results
      this.cache.set(cacheKey, rows, 300);

      return rows;
    } catch (error) {
      logger.error('QUERY', 'Failed to fetch batch metrics', {
        metadata: { nodeCount: nodeIds.length, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Get latest metric value for a node
   * Cached separately for quick access
   */
  async getLatestMetric(nodeId, metricName) {
    const cacheKey = `latest_${nodeId}_${metricName}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;

    try {
      const query = `
        SELECT 
          NodeName,
          MetricName,
          value,
          timestamp,
          unit
        FROM telemetry_data
        WHERE NodeName = ? AND MetricName = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const [rows] = await this.pool.query(query, [nodeId, metricName]);
      const result = rows.length > 0 ? rows[0] : null;

      // Cache latest values for 1 minute
      this.cache.set(cacheKey, result, 60);

      return result;
    } catch (error) {
      logger.error('QUERY', 'Failed to fetch latest metric', {
        metadata: { nodeId, metricName, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Clear cache for specific node or all
   */
  clearCache(nodeId = null) {
    if (nodeId) {
      const keys = this.cache.keys();
      const keysToDelete = keys.filter(k => k.includes(nodeId));
      keysToDelete.forEach(k => this.cache.del(k));
      logger.info('CACHE', 'Cleared cache for node', {
        metadata: { nodeId, keysCleared: keysToDelete.length }
      });
    } else {
      this.cache.flushAll();
      logger.info('CACHE', 'Cleared all metric query cache');
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.totalQueries > 0 
      ? ((this.stats.cacheHits / this.stats.totalQueries) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.getStats().keys,
      cacheMemory: this.cache.getStats().ksize
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgQueryTime: 0,
      slowQueries: 0
    };
  }
}

module.exports = MetricQueryOptimizer;
