/**
 * Database Query Optimization Service
 * 
 * Optimizes database queries for better performance, provides
 * connection pooling, and implements query result caching.
 * 
 * @module services/queryOptimizer
 */

const logger = require('../utils/logger');

class QueryOptimizer {
  constructor(db, performanceMonitor) {
    this.db = db;
    this.performanceMonitor = performanceMonitor;
    this.queryCache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheMaxAge = 5 * 60 * 1000; // 5 minutes
    this.connectionPool = {
      max: 20,
      min: 5,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000
    };
  }

  /**
   * Execute optimized query with performance monitoring
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @param {Object} options - Query options
   */
  async executeQuery(query, params = [], options = {}) {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(query, params);
    
    // Check cache first if enabled
    if (options.cache !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.performanceMonitor?.recordQueryMetric(query, Date.now() - startTime, 0, {
          cached: true,
          cacheHit: true
        });
        return cached;
      }
    }

    try {
      let result;
      
      // Use optimized connection if available
      if (options.usePool !== false) {
        result = await this.executeWithPool(query, params);
      } else {
        result = await this.db.query(query, params);
      }

      const executionTime = Date.now() - startTime;
      const rowsExamined = this.estimateRowsExamined(query, result);

      // Record performance metric
      this.performanceMonitor?.recordQueryMetric(query, executionTime, rowsExamined, {
        cached: false,
        cacheHit: false,
        rowCount: result.length || (result[0] ? result[0].length : 0)
      });

      // Cache result if enabled and not too large
      if (options.cache !== false && this.shouldCacheResult(result)) {
        this.setCache(cacheKey, result);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      this.performanceMonitor?.recordQueryMetric(query, executionTime, 0, {
        error: error.message,
        cached: false
      });

      logger.error('QueryOptimizer', 'Query execution failed', {
        query: query.substring(0, 100),
        error: error.message,
        executionTime
      });

      throw error;
    }
  }

  /**
   * Execute query with connection pooling
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   */
  async executeWithPool(query, params) {
    // For now, use the existing connection
    // In a production environment, this would implement proper connection pooling
    return await this.db.query(query, params);
  }

  /**
   * Optimized query for manual reports history
   * @param {Object} filters - Query filters
   */
  async getManualReportsHistory(filters = {}) {
    let query = `
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
        mr.generation_time_ms,
        u.username as generated_by_username,
        CASE 
          WHEN mr.status = 'completed' THEN 'success'
          WHEN mr.status = 'failed' THEN 'error'
          WHEN mr.status = 'generating' THEN 'processing'
          ELSE 'pending'
        END as status_category
      FROM manual_reports mr
      LEFT JOIN users u ON mr.generated_by = u.id
      WHERE 1=1
    `;

    const params = [];
    
    // Add filters efficiently
    if (filters.userId) {
      query += ' AND mr.generated_by = ?';
      params.push(filters.userId);
    }

    if (filters.reportType) {
      query += ' AND mr.report_type = ?';
      params.push(filters.reportType);
    }

    if (filters.status) {
      query += ' AND mr.status = ?';
      params.push(filters.status);
    }

    if (filters.dateFrom) {
      query += ' AND mr.created_at >= ?';
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ' AND mr.created_at <= ?';
      params.push(filters.dateTo);
    }

    // Add ordering and pagination
    query += ' ORDER BY mr.created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    return await this.executeQuery(query, params, { cache: true });
  }

  /**
   * Optimized query for telemetry data aggregation
   * @param {Array} serviceIds - Service IDs
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} aggregation - Aggregation type (hourly, daily)
   */
  async getTelemetryAggregation(serviceIds, startDate, endDate, aggregation = 'hourly') {
    const dateFormat = aggregation === 'hourly' 
      ? '%Y-%m-%d %H:00:00' 
      : '%Y-%m-%d';

    const query = `
      SELECT 
        DATE_FORMAT(t.timestamp, ?) as time_period,
        t.service_id,
        AVG(t.value) as avg_value,
        MIN(t.value) as min_value,
        MAX(t.value) as max_value,
        COUNT(t.id) as data_points,
        s.name as service_name,
        s.client_name
      FROM telemetry t
      JOIN services s ON t.service_id = s.id
      WHERE t.service_id IN (?)
        AND t.timestamp BETWEEN ? AND ?
      GROUP BY time_period, t.service_id, s.name, s.client_name
      ORDER BY time_period ASC, t.service_id ASC
    `;

    const params = [dateFormat, serviceIds, startDate, endDate];

    return await this.executeQuery(query, params, { cache: true });
  }

  /**
   * Optimized query for cache statistics
   */
  async getCacheStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_entries,
        SUM(file_size) as total_size,
        AVG(access_count) as avg_access_count,
        MAX(access_count) as max_access_count,
        MIN(created_at) as oldest_entry,
        MAX(last_accessed) as most_recent_access,
        report_type,
        COUNT(*) as entries_by_type
      FROM manual_reports_cache 
      GROUP BY report_type
      ORDER BY total_size DESC
    `;

    return await this.executeQuery(query, [], { cache: true });
  }

  /**
   * Optimized query for report generation statistics
   * @param {number} days - Number of days to look back
   */
  async getReportGenerationStats(days = 30) {
    const query = `
      SELECT 
        DATE(created_at) as report_date,
        report_type,
        status,
        COUNT(*) as report_count,
        AVG(generation_time_ms) as avg_generation_time,
        SUM(pdf_size_bytes) as total_size_bytes,
        AVG(pdf_size_bytes) as avg_size_bytes
      FROM manual_reports 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at), report_type, status
      ORDER BY report_date DESC, report_type
    `;

    return await this.executeQuery(query, [days], { cache: true });
  }

  /**
   * Batch insert for better performance
   * @param {string} table - Table name
   * @param {Array} records - Records to insert
   * @param {Array} fields - Field names
   */
  async batchInsert(table, records, fields) {
    if (records.length === 0) return;

    const placeholders = records.map(() => 
      `(${fields.map(() => '?').join(', ')})`
    ).join(', ');

    const values = records.flatMap(record => 
      fields.map(field => record[field])
    );

    const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES ${placeholders}`;

    return await this.executeQuery(query, values, { cache: false });
  }

  /**
   * Generate cache key for query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   */
  getCacheKey(query, params) {
    const crypto = require('crypto');
    const key = `${query}_${JSON.stringify(params)}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Get result from cache
   * @param {string} key - Cache key
   */
  getFromCache(key) {
    const cached = this.queryCache.get(key);
    
    if (!cached) return null;
    
    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > this.cacheMaxAge) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set result in cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  setCache(key, data) {
    // Remove oldest entries if cache is full
    if (this.queryCache.size >= this.cacheMaxSize) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Check if result should be cached
   * @param {*} result - Query result
   */
  shouldCacheResult(result) {
    // Don't cache very large results
    const resultSize = JSON.stringify(result).length;
    return resultSize < 1024 * 1024; // 1MB limit
  }

  /**
   * Estimate number of rows examined
   * @param {string} query - SQL query
   * @param {*} result - Query result
   */
  estimateRowsExamined(query, result) {
    // Simple estimation based on result size
    if (Array.isArray(result)) {
      return result.length;
    }
    
    if (result && result[0] && Array.isArray(result[0])) {
      return result[0].length;
    }
    
    return 0;
  }

  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
    logger.info('QueryOptimizer', 'Query cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      size: this.queryCache.size,
      maxSize: this.cacheMaxSize,
      entries: []
    };

    for (const [key, value] of this.queryCache.entries()) {
      stats.entries.push({
        key: key.substring(0, 50) + '...',
        age: Date.now() - value.timestamp,
        size: JSON.stringify(value.data).length
      });
    }

    return stats;
  }

  /**
   * Optimize database tables
   */
  async optimizeTables() {
    const tables = [
      'manual_reports',
      'manual_reports_audit',
      'manual_reports_cache',
      'telemetry',
      'services',
      'clients',
      'power_drop_alerts',
      'report_schedules'
    ];

    const results = [];

    for (const table of tables) {
      try {
        await this.db.query(`OPTIMIZE TABLE ${table}`);
        results.push({ table, status: 'success' });
        logger.info('QueryOptimizer', `Table optimized: ${table}`);
      } catch (error) {
        results.push({ table, status: 'error', error: error.message });
        logger.error('QueryOptimizer', `Failed to optimize table: ${table}`, {
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Analyze tables for query optimizer
   */
  async analyzeTables() {
    const tables = [
      'manual_reports',
      'manual_reports_audit',
      'manual_reports_cache',
      'telemetry',
      'services',
      'clients'
    ];

    const results = [];

    for (const table of tables) {
      try {
        await this.db.query(`ANALYZE TABLE ${table}`);
        results.push({ table, status: 'success' });
        logger.info('QueryOptimizer', `Table analyzed: ${table}`);
      } catch (error) {
        results.push({ table, status: 'error', error: error.message });
        logger.error('QueryOptimizer', `Failed to analyze table: ${table}`, {
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = QueryOptimizer;
