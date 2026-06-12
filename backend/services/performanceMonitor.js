/**
 * Performance Monitoring Service
 * 
 * Tracks API performance, database query times, and system metrics
 * to identify bottlenecks and optimize system performance.
 * 
 * @module services/performanceMonitor
 */

const logger = require('../utils/logger');

class PerformanceMonitor {
  constructor() {
    this.db = null;
    this.metrics = new Map();
    this.slowQueryThreshold = 1000; // 1 second
    this.memoryThreshold = 100 * 1024 * 1024; // 100MB
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Set database connection
   * @param {Object} database - MySQL database connection
   */
  setDatabase(database) {
    this.db = database;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.cleanupOldMetrics();
    }, 60000); // Collect metrics every minute

    logger.info('PerformanceMonitor', 'Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('PerformanceMonitor', 'Performance monitoring stopped');
  }

  /**
   * Record API performance metric
   * @param {string} endpoint - API endpoint
   * @param {number} responseTime - Response time in milliseconds
   * @param {number} statusCode - HTTP status code
   * @param {Object} metadata - Additional metadata
   */
  recordApiMetric(endpoint, responseTime, statusCode, metadata = {}) {
    const metric = {
      type: 'api',
      endpoint,
      responseTime,
      statusCode,
      timestamp: new Date(),
      metadata
    };

    this.storeMetric(metric);

    // Log slow responses
    if (responseTime > this.slowQueryThreshold) {
      logger.warn('PerformanceMonitor', 'Slow API response detected', {
        endpoint,
        responseTime,
        statusCode,
        threshold: this.slowQueryThreshold
      });

      this.recordSlowQuery(endpoint, responseTime, metadata);
    }

    return metric;
  }

  /**
   * Record database query performance
   * @param {string} query - SQL query (truncated)
   * @param {number} executionTime - Execution time in milliseconds
   * @param {number} rowsExamined - Number of rows examined
   * @param {Object} metadata - Additional metadata
   */
  recordQueryMetric(query, executionTime, rowsExamined, metadata = {}) {
    const metric = {
      type: 'database',
      query: query.substring(0, 500), // Limit query length
      executionTime,
      rowsExamined,
      timestamp: new Date(),
      metadata
    };

    this.storeMetric(metric);

    // Log slow queries
    if (executionTime > this.slowQueryThreshold) {
      logger.warn('PerformanceMonitor', 'Slow database query detected', {
        query: query.substring(0, 100),
        executionTime,
        rowsExamined,
        threshold: this.slowQueryThreshold
      });

      this.recordSlowQuery(query, executionTime, { rowsExamined, ...metadata });
    }

    return metric;
  }

  /**
   * Record memory usage
   * @param {string} process - Process name
   * @param {number} memoryUsage - Memory usage in bytes
   * @param {Object} metadata - Additional metadata
   */
  recordMemoryMetric(process, memoryUsage, metadata = {}) {
    const metric = {
      type: 'memory',
      process,
      memoryUsage,
      timestamp: new Date(),
      metadata
    };

    this.storeMetric(metric);

    // Log high memory usage
    if (memoryUsage > this.memoryThreshold) {
      logger.warn('PerformanceMonitor', 'High memory usage detected', {
        process,
        memoryUsage: this.formatBytes(memoryUsage),
        threshold: this.formatBytes(this.memoryThreshold)
      });
    }

    return metric;
  }

  /**
   * Store metric in memory and database
   * @param {Object} metric - Metric object
   */
  async storeMetric(metric) {
    // Store in memory for real-time monitoring
    const key = `${metric.type}_${metric.endpoint || metric.process || metric.query?.substring(0, 50)}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metricList = this.metrics.get(key);
    metricList.push(metric);
    
    // Keep only last 1000 metrics per key to prevent memory bloat
    if (metricList.length > 1000) {
      metricList.splice(0, metricList.length - 1000);
    }

    // Store in database for historical analysis
    if (this.db) {
      try {
        await this.db.query(
          `INSERT INTO performance_metrics 
           (metric_name, metric_value, metric_unit, additional_data, recorded_at) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            this.getMetricName(metric),
            this.getMetricValue(metric),
            this.getMetricUnit(metric),
            JSON.stringify(metric),
            metric.timestamp
          ]
        );
      } catch (error) {
        logger.error('PerformanceMonitor', 'Failed to store metric in database', {
          error: error.message,
          metric: metric.type
        });
      }
    }
  }

  /**
   * Record slow query in dedicated table
   * @param {string} query - Query or endpoint
   * @param {number} executionTime - Execution time
   * @param {Object} metadata - Additional metadata
   */
  async recordSlowQuery(query, executionTime, metadata = {}) {
    if (!this.db) return;

    try {
      await this.db.query(
        `INSERT INTO slow_queries 
         (query_text, execution_time_ms, rows_examined, user_id, endpoint) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          query,
          executionTime,
          metadata.rowsExamined || null,
          metadata.userId || null,
          metadata.endpoint || query
        ]
      );
    } catch (error) {
      logger.error('PerformanceMonitor', 'Failed to record slow query', {
        error: error.message
      });
    }
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    this.recordMemoryMetric('nodejs_heap_used', memUsage.heapUsed);
    this.recordMemoryMetric('nodejs_heap_total', memUsage.heapTotal);
    this.recordMemoryMetric('nodejs_external', memUsage.external);
    this.recordMemoryMetric('nodejs_rss', memUsage.rss);

    // Record active connections if available
    if (this.db && this.db.pool) {
      try {
        const poolInfo = this.db.pool._pool || this.db.pool;
        this.recordApiMetric('database_pool', 0, 200, {
          activeConnections: poolInfo._allConnections?.length || 0,
          freeConnections: poolInfo._freeConnections?.length || 0,
          totalConnections: poolInfo._allConnections?.length || 0
        });
      } catch (error) {
        // Ignore pool monitoring errors
      }
    }
  }

  /**
   * Clean up old metrics to prevent memory bloat
   */
  cleanupOldMetrics() {
    // Keep metrics for last hour in memory
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [key, metricList] of this.metrics.entries()) {
      const filteredMetrics = metricList.filter(metric => 
        metric.timestamp > oneHourAgo
      );
      
      if (filteredMetrics.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filteredMetrics);
      }
    }

    // Clean up old database records (keep 30 days)
    if (this.db) {
      this.db.query(
        'DELETE FROM performance_metrics WHERE recorded_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
      ).catch(error => {
        logger.error('PerformanceMonitor', 'Failed to cleanup old metrics', {
          error: error.message
        });
      });

      this.db.query(
        'DELETE FROM slow_queries WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY)'
      ).catch(error => {
        logger.error('PerformanceMonitor', 'Failed to cleanup old slow queries', {
          error: error.message
        });
      });
    }
  }

  /**
   * Get performance statistics
   * @param {string} type - Metric type (api, database, memory)
   * @param {number} timeRange - Time range in minutes
   */
  async getPerformanceStats(type = null, timeRange = 60) {
    const stats = {
      summary: {},
      topSlowQueries: [],
      metrics: []
    };

    try {
      // Get summary from database
      if (this.db) {
        const [summaryData] = await this.db.query(`
          SELECT 
            metric_name,
            AVG(metric_value) as avg_value,
            MIN(metric_value) as min_value,
            MAX(metric_value) as max_value,
            COUNT(*) as count
          FROM performance_metrics 
          WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
          ${type ? 'AND metric_name LIKE ?' : ''}
          GROUP BY metric_name
          ORDER BY avg_value DESC
        `, [timeRange, type ? `${type}%` : '']);

        stats.summary = summaryData;

        // Get top slow queries
        const [slowQueries] = await this.db.query(`
          SELECT 
            query_text,
            execution_time_ms,
            rows_examined,
            timestamp,
            endpoint
          FROM slow_queries 
          WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
          ORDER BY execution_time_ms DESC 
          LIMIT 10
        `, [timeRange]);

        stats.topSlowQueries = slowQueries;
      }

      // Get real-time metrics from memory
      for (const [key, metricList] of this.metrics.entries()) {
        if (!type || key.startsWith(type)) {
          const recentMetrics = metricList.filter(metric => 
            metric.timestamp > new Date(Date.now() - timeRange * 60 * 1000)
          );

          if (recentMetrics.length > 0) {
            const values = recentMetrics.map(m => 
              m.responseTime || m.executionTime || m.memoryUsage
            );

            stats.metrics.push({
              key,
              count: recentMetrics.length,
              avg: values.reduce((a, b) => a + b, 0) / values.length,
              min: Math.min(...values),
              max: Math.max(...values),
              latest: recentMetrics[recentMetrics.length - 1]
            });
          }
        }
      }

    } catch (error) {
      logger.error('PerformanceMonitor', 'Failed to get performance stats', {
        error: error.message
      });
    }

    return stats;
  }

  /**
   * Get metric name for storage
   * @param {Object} metric - Metric object
   */
  getMetricName(metric) {
    switch (metric.type) {
      case 'api':
        return `api_${metric.endpoint}`;
      case 'database':
        return `db_query`;
      case 'memory':
        return `memory_${metric.process}`;
      default:
        return `unknown_${metric.type}`;
    }
  }

  /**
   * Get metric value for storage
   * @param {Object} metric - Metric object
   */
  getMetricValue(metric) {
    return metric.responseTime || metric.executionTime || metric.memoryUsage || 0;
  }

  /**
   * Get metric unit for storage
   * @param {Object} metric - Metric object
   */
  getMetricUnit(metric) {
    switch (metric.type) {
      case 'api':
      case 'database':
        return 'ms';
      case 'memory':
        return 'bytes';
      default:
        return 'unknown';
    }
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create performance monitoring middleware
   */
  createMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Capture original end function
      const originalEnd = res.end;
      
      res.end = function(...args) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Record API metric
        const metric = {
          endpoint: `${req.method} ${req.route?.path || req.path}`,
          responseTime,
          statusCode: res.statusCode,
          userId: req.user?.id,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        };

        // Store in request for later use
        req.performanceMetric = metric;

        // Call original end
        originalEnd.apply(this, args);
        
        // Record metric after response is sent
        setImmediate(function() {
          this.recordApiMetric(
            metric.endpoint,
            metric.responseTime,
            metric.statusCode,
            {
              userId: metric.userId,
              userAgent: metric.userAgent,
              ip: metric.ip
            }
          );
        }.bind(this));
      }.bind(this);

      next();
    };
  }
}

module.exports = PerformanceMonitor;
