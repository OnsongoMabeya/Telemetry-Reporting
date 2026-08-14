const logger = require('../utils/logger');

/**
 * MapCacheManager - Caches map station data with TTL
 * 
 * Caches station data for:
 * - My Sites Map: /api/my-sites/clients/{clientId}/map-stations
 * - Dashboard Map: /api/basestations-map
 * 
 * Features:
 * - Configurable TTL (default 10 minutes)
 * - Automatic cache invalidation
 * - Cache hit/miss tracking
 * - Memory-efficient storage
 */
class MapCacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 10 * 60 * 1000; // Default 10 minutes
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0
    };
    
    logger.info('SERVICE', 'MapCacheManager initialized', {
      metadata: {
        ttl: `${this.ttl / 1000}s`,
        maxEntries: 'unlimited'
      }
    });
  }

  /**
   * Generate cache key for My Sites map
   */
  getMapSitesCacheKey(clientId, serviceId) {
    return `map-sites-${clientId}-${serviceId || 'all'}`;
  }

  /**
   * Generate cache key for Dashboard map
   */
  getDashboardMapCacheKey(nodeName) {
    return `map-dashboard-${nodeName || 'all'}`;
  }

  /**
   * Get cached data
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.invalidations++;
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set cached data
   */
  set(key, data) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttl,
      createdAt: Date.now()
    });
    this.stats.sets++;
  }

  /**
   * Invalidate cache for My Sites map
   */
  invalidateMapSites(clientId, serviceId) {
    const key = this.getMapSitesCacheKey(clientId, serviceId);
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.invalidations++;
      logger.debug('SERVICE', 'Invalidated My Sites map cache', {
        metadata: { clientId, serviceId, key }
      });
    }
    return deleted;
  }

  /**
   * Invalidate cache for Dashboard map
   */
  invalidateDashboardMap(nodeName) {
    const key = this.getDashboardMapCacheKey(nodeName);
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.invalidations++;
      logger.debug('SERVICE', 'Invalidated Dashboard map cache', {
        metadata: { nodeName, key }
      });
    }
    return deleted;
  }

  /**
   * Invalidate all map caches
   */
  invalidateAll() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.invalidations += size;
    logger.debug('SERVICE', 'Invalidated all map caches', {
      metadata: { count: size }
    });
    return size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      sets: this.stats.sets,
      invalidations: this.stats.invalidations,
      entries: this.cache.size,
      ttl: `${this.ttl / 1000}s`
    };
  }

  /**
   * Clear expired entries (cleanup)
   */
  clearExpired() {
    let cleared = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      logger.debug('SERVICE', 'Cleared expired map cache entries', {
        metadata: { count: cleared }
      });
    }
    
    return cleared;
  }

  /**
   * Start periodic cleanup (every 5 minutes)
   */
  startCleanup(interval = 5 * 60 * 1000) {
    this.cleanupInterval = setInterval(() => {
      this.clearExpired();
    }, interval);
    
    logger.debug('SERVICE', 'Map cache cleanup started', {
      metadata: { interval: `${interval / 1000}s` }
    });
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.debug('SERVICE', 'Map cache cleanup stopped');
    }
  }

  /**
   * Destroy the cache manager
   */
  destroy() {
    this.stopCleanup();
    this.cache.clear();
    logger.info('SERVICE', 'MapCacheManager destroyed');
  }
}

module.exports = MapCacheManager;
