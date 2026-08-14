const logger = require('../utils/logger');

class PerformanceMetrics {
  constructor(options = {}) {
    this.slowQueryThreshold = options.slowQueryThreshold || 1000; // 1 second
    this.healthCheckInterval = options.healthCheckInterval || 60000; // 1 minute
    this.isRunning = false;
    this.metrics = {
      queries: {
        total: 0,
        slow: 0,
        avgDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        durations: []
      },
      writes: {
        total: 0,
        failed: 0,
        avgDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        durations: []
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      pool: {
        connections: 0,
        utilization: 0,
        peakUtilization: 0
      },
      health: {
        lastCheck: null,
        status: 'UNKNOWN',
        errors: []
      }
    };
  }

  start(pool) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.pool = pool;

    logger.info('SYSTEM', 'Performance metrics started');

    // Run health checks periodically
    this.healthCheckTimer = setInterval(() => this.checkHealth(), this.healthCheckInterval);
  }

  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    this.isRunning = false;
    logger.info('SYSTEM', 'Performance metrics stopped');
  }

  /**
   * Track query performance
   */
  trackQuery(duration, query = '') {
    this.metrics.queries.total++;
    this.metrics.queries.durations.push(duration);

    // Keep only last 1000 durations for percentile calculation
    if (this.metrics.queries.durations.length > 1000) {
      this.metrics.queries.durations.shift();
    }

    // Update average
    this.metrics.queries.avgDuration =
      this.metrics.queries.durations.reduce((a, b) => a + b, 0) /
      this.metrics.queries.durations.length;

    // Update percentiles
    this.updatePercentiles('queries');

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      this.metrics.queries.slow++;
      logger.warn('SLOW_QUERY', `Query took ${duration}ms`, {
        metadata: { duration, query: query.substring(0, 100) }
      });
    }
  }

  /**
   * Track write performance
   */
  trackWrite(duration, success = true) {
    this.metrics.writes.total++;
    if (!success) {
      this.metrics.writes.failed++;
    }

    this.metrics.writes.durations.push(duration);

    // Keep only last 1000 durations
    if (this.metrics.writes.durations.length > 1000) {
      this.metrics.writes.durations.shift();
    }

    // Update average
    this.metrics.writes.avgDuration =
      this.metrics.writes.durations.reduce((a, b) => a + b, 0) /
      this.metrics.writes.durations.length;

    // Update percentiles
    this.updatePercentiles('writes');
  }

  /**
   * Track cache performance
   */
  trackCacheHit(hit = true) {
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }

    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 
      ? ((this.metrics.cache.hits / total) * 100).toFixed(2)
      : 0;
  }

  /**
   * Track pool utilization
   */
  trackPoolUtilization(utilization) {
    this.metrics.pool.utilization = utilization;
    if (utilization > this.metrics.pool.peakUtilization) {
      this.metrics.pool.peakUtilization = utilization;
    }
  }

  /**
   * Update percentiles for durations
   */
  updatePercentiles(type) {
    const durations = this.metrics[type].durations.sort((a, b) => a - b);
    if (durations.length === 0) return;

    const p95Index = Math.ceil(durations.length * 0.95) - 1;
    const p99Index = Math.ceil(durations.length * 0.99) - 1;

    this.metrics[type].p95Duration = durations[Math.max(0, p95Index)];
    this.metrics[type].p99Duration = durations[Math.max(0, p99Index)];
  }

  /**
   * Check database health
   */
  async checkHealth() {
    try {
      const startTime = Date.now();
      const [result] = await this.pool.query('SELECT 1');
      const duration = Date.now() - startTime;

      this.metrics.health.lastCheck = new Date();
      this.metrics.health.status = 'HEALTHY';
      this.metrics.health.errors = [];

      logger.info('SYSTEM', 'Database health check passed', {
        metadata: { duration }
      });
    } catch (error) {
      this.metrics.health.status = 'UNHEALTHY';
      this.metrics.health.errors.push({
        timestamp: new Date(),
        error: error.message
      });

      // Keep only last 10 errors
      if (this.metrics.health.errors.length > 10) {
        this.metrics.health.errors.shift();
      }

      logger.error('SYSTEM', 'Database health check failed', {
        metadata: { error: error.message }
      });
    }
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      isRunning: this.isRunning,
      timestamp: new Date(),
      queries: {
        total: this.metrics.queries.total,
        slow: this.metrics.queries.slow,
        slowPercentage: this.metrics.queries.total > 0
          ? ((this.metrics.queries.slow / this.metrics.queries.total) * 100).toFixed(2)
          : 0,
        avgDuration: `${this.metrics.queries.avgDuration.toFixed(2)}ms`,
        p95Duration: `${this.metrics.queries.p95Duration.toFixed(2)}ms`,
        p99Duration: `${this.metrics.queries.p99Duration.toFixed(2)}ms`
      },
      writes: {
        total: this.metrics.writes.total,
        failed: this.metrics.writes.failed,
        successRate: this.metrics.writes.total > 0
          ? (((this.metrics.writes.total - this.metrics.writes.failed) / this.metrics.writes.total) * 100).toFixed(2)
          : 0,
        avgDuration: `${this.metrics.writes.avgDuration.toFixed(2)}ms`,
        p95Duration: `${this.metrics.writes.p95Duration.toFixed(2)}ms`,
        p99Duration: `${this.metrics.writes.p99Duration.toFixed(2)}ms`
      },
      cache: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        hitRate: `${this.metrics.cache.hitRate}%`
      },
      pool: {
        utilization: `${this.metrics.pool.utilization.toFixed(2)}%`,
        peakUtilization: `${this.metrics.pool.peakUtilization.toFixed(2)}%`
      },
      health: {
        status: this.metrics.health.status,
        lastCheck: this.metrics.health.lastCheck,
        recentErrors: this.metrics.health.errors.slice(-5)
      }
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      queries: {
        total: 0,
        slow: 0,
        avgDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        durations: []
      },
      writes: {
        total: 0,
        failed: 0,
        avgDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        durations: []
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      pool: {
        connections: 0,
        utilization: 0,
        peakUtilization: 0
      },
      health: {
        lastCheck: null,
        status: 'UNKNOWN',
        errors: []
      }
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const slowQueryPercentage = parseFloat(metrics.queries.slowPercentage);
    const writeSuccessRate = parseFloat(metrics.writes.successRate);
    const cacheHitRate = parseFloat(metrics.cache.hitRate);

    let overallStatus = 'HEALTHY';
    const issues = [];

    if (slowQueryPercentage > 10) {
      overallStatus = 'WARNING';
      issues.push(`${slowQueryPercentage}% of queries are slow`);
    }

    if (writeSuccessRate < 99) {
      overallStatus = 'WARNING';
      issues.push(`Write success rate is ${writeSuccessRate}%`);
    }

    if (cacheHitRate < 50) {
      issues.push(`Cache hit rate is low at ${cacheHitRate}%`);
    }

    if (this.metrics.health.status === 'UNHEALTHY') {
      overallStatus = 'CRITICAL';
      issues.push('Database health check failed');
    }

    return {
      status: overallStatus,
      issues,
      metrics
    };
  }
}

module.exports = PerformanceMetrics;
