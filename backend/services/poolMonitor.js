const logger = require('../utils/logger');

class PoolMonitor {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.alertThreshold = options.alertThreshold || 0.8; // 80% utilization
    this.warningThreshold = options.warningThreshold || 0.6; // 60% utilization
    this.isRunning = false;
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      freeConnections: 0,
      queuedRequests: 0,
      peakUtilization: 0,
      avgUtilization: 0,
      utilizationHistory: [],
      alerts: [],
      warnings: []
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info('SYSTEM', 'Pool monitor started');

    // Run check immediately
    this.checkPoolHealth();

    // Then run periodically
    this.monitorTimer = setInterval(() => this.checkPoolHealth(), this.checkInterval);
  }

  stop() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    this.isRunning = false;
    logger.info('SYSTEM', 'Pool monitor stopped');
  }

  /**
   * Check pool health and track metrics
   */
  async checkPoolHealth() {
    try {
      const poolInfo = this.getPoolInfo();

      if (!poolInfo) {
        logger.warn('SYSTEM', 'Could not retrieve pool information');
        return;
      }

      const {
        totalConnections,
        activeConnections,
        freeConnections,
        queuedRequests,
        utilization
      } = poolInfo;

      // Update stats
      this.stats.totalConnections = totalConnections;
      this.stats.activeConnections = activeConnections;
      this.stats.freeConnections = freeConnections;
      this.stats.queuedRequests = queuedRequests;

      // Track utilization history
      this.stats.utilizationHistory.push(utilization);
      if (this.stats.utilizationHistory.length > 100) {
        this.stats.utilizationHistory.shift();
      }

      // Update peak and average
      if (utilization > this.stats.peakUtilization) {
        this.stats.peakUtilization = utilization;
      }
      this.stats.avgUtilization = 
        this.stats.utilizationHistory.reduce((a, b) => a + b, 0) / 
        this.stats.utilizationHistory.length;

      // Check thresholds
      this.checkThresholds(poolInfo);

      // Log health status
      this.logHealthStatus(poolInfo);
    } catch (error) {
      logger.error('SYSTEM', 'Pool health check failed', {
        metadata: { error: error.message }
      });
    }
  }

  /**
   * Get pool information from the connection pool
   */
  getPoolInfo() {
    try {
      // For mysql2 pool
      if (this.pool._pool) {
        const poolObj = this.pool._pool;
        const allConnections = poolObj._allConnections || [];
        const freeConnections = poolObj._freeConnections || [];
        const activeConnections = allConnections.length - freeConnections.length;
        const queuedRequests = poolObj._connectionQueue ? poolObj._connectionQueue.length : 0;

        const utilization = allConnections.length > 0 
          ? (activeConnections / allConnections.length)
          : 0;

        return {
          totalConnections: allConnections.length,
          activeConnections,
          freeConnections: freeConnections.length,
          queuedRequests,
          utilization: parseFloat((utilization * 100).toFixed(2))
        };
      }

      return null;
    } catch (error) {
      logger.error('SYSTEM', 'Failed to get pool info', {
        metadata: { error: error.message }
      });
      return null;
    }
  }

  /**
   * Check utilization thresholds and trigger alerts
   */
  checkThresholds(poolInfo) {
    const { utilization, activeConnections, queuedRequests } = poolInfo;
    const utilizationRatio = utilization / 100;

    // Alert threshold (80%)
    if (utilizationRatio >= this.alertThreshold) {
      const alert = {
        timestamp: new Date(),
        level: 'ALERT',
        utilization,
        activeConnections,
        queuedRequests,
        message: `Connection pool utilization at ${utilization}% (CRITICAL)`
      };

      this.stats.alerts.push(alert);
      if (this.stats.alerts.length > 50) {
        this.stats.alerts.shift();
      }

      logger.error('SYSTEM', 'Connection pool utilization CRITICAL', {
        metadata: {
          utilization,
          activeConnections,
          queuedRequests
        }
      });
    }
    // Warning threshold (60%)
    else if (utilizationRatio >= this.warningThreshold) {
      const warning = {
        timestamp: new Date(),
        level: 'WARNING',
        utilization,
        activeConnections,
        queuedRequests,
        message: `Connection pool utilization at ${utilization}% (WARNING)`
      };

      this.stats.warnings.push(warning);
      if (this.stats.warnings.length > 50) {
        this.stats.warnings.shift();
      }

      logger.warn('SYSTEM', 'Connection pool utilization HIGH', {
        metadata: {
          utilization,
          activeConnections,
          queuedRequests
        }
      });
    }
  }

  /**
   * Log pool health status
   */
  logHealthStatus(poolInfo) {
    const { totalConnections, activeConnections, freeConnections, utilization } = poolInfo;

    let status = '✅ HEALTHY';
    if (utilization >= this.alertThreshold * 100) {
      status = '🔴 CRITICAL';
    } else if (utilization >= this.warningThreshold * 100) {
      status = '🟡 WARNING';
    }

    logger.info('SYSTEM', `Pool Status: ${status}`, {
      metadata: {
        total: totalConnections,
        active: activeConnections,
        free: freeConnections,
        utilization: `${utilization}%`
      }
    });
  }

  /**
   * Get current pool statistics
   */
  getStats() {
    const poolInfo = this.getPoolInfo();

    return {
      isRunning: this.isRunning,
      current: poolInfo,
      history: {
        peakUtilization: `${this.stats.peakUtilization.toFixed(2)}%`,
        avgUtilization: `${this.stats.avgUtilization.toFixed(2)}%`,
        utilizationTrend: this.getUtilizationTrend()
      },
      alerts: this.stats.alerts.slice(-10), // Last 10 alerts
      warnings: this.stats.warnings.slice(-10), // Last 10 warnings
      thresholds: {
        warning: `${(this.warningThreshold * 100).toFixed(0)}%`,
        alert: `${(this.alertThreshold * 100).toFixed(0)}%`
      }
    };
  }

  /**
   * Get utilization trend (increasing, stable, decreasing)
   */
  getUtilizationTrend() {
    if (this.stats.utilizationHistory.length < 2) {
      return 'UNKNOWN';
    }

    const recent = this.stats.utilizationHistory.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const first = recent[0];
    const last = recent[recent.length - 1];

    const change = last - first;
    if (change > 5) return '📈 INCREASING';
    if (change < -5) return '📉 DECREASING';
    return '➡️ STABLE';
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      freeConnections: 0,
      queuedRequests: 0,
      peakUtilization: 0,
      avgUtilization: 0,
      utilizationHistory: [],
      alerts: [],
      warnings: []
    };
  }

  /**
   * Get health status for API endpoint
   */
  getHealthStatus() {
    const poolInfo = this.getPoolInfo();
    if (!poolInfo) {
      return {
        status: 'UNKNOWN',
        message: 'Could not retrieve pool information'
      };
    }

    const { utilization } = poolInfo;

    if (utilization >= this.alertThreshold * 100) {
      return {
        status: 'CRITICAL',
        utilization: `${utilization}%`,
        message: 'Connection pool utilization is critical',
        action: 'Increase pool size or reduce concurrent requests'
      };
    }

    if (utilization >= this.warningThreshold * 100) {
      return {
        status: 'WARNING',
        utilization: `${utilization}%`,
        message: 'Connection pool utilization is high',
        action: 'Monitor closely and consider increasing pool size'
      };
    }

    return {
      status: 'HEALTHY',
      utilization: `${utilization}%`,
      message: 'Connection pool is operating normally'
    };
  }
}

module.exports = PoolMonitor;
