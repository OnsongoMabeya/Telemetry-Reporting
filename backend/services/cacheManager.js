const NodeCache = require('node-cache');

class CacheManager {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300,
      checkperiod: 120,
      useClones: false
    });

    this.ttls = {
      nodes: parseInt(process.env.CACHE_TTL_NODES || '300'),
      metrics: parseInt(process.env.CACHE_TTL_METRICS || '60'),
      baseStations: parseInt(process.env.CACHE_TTL_BASE_STATIONS || '300'),
      userAccess: parseInt(process.env.CACHE_TTL_USER_ACCESS || '600')
    };
  }

  /**
   * Get cached nodes for a user
   */
  getNodes(userId) {
    const key = `nodes_${userId}`;
    return this.cache.get(key);
  }

  /**
   * Set cached nodes for a user
   */
  setNodes(userId, nodes) {
    const key = `nodes_${userId}`;
    this.cache.set(key, nodes, this.ttls.nodes);
  }

  /**
   * Invalidate nodes cache for a user
   */
  invalidateNodes(userId) {
    const key = `nodes_${userId}`;
    this.cache.del(key);
  }

  /**
   * Invalidate all nodes cache
   */
  invalidateAllNodes() {
    const keys = this.cache.keys();
    const nodeKeys = keys.filter(k => k.startsWith('nodes_'));
    this.cache.del(nodeKeys);
  }

  /**
   * Get cached base stations for a node
   */
  getBaseStations(nodeName) {
    const key = `baseStations_${nodeName}`;
    return this.cache.get(key);
  }

  /**
   * Set cached base stations for a node
   */
  setBaseStations(nodeName, baseStations) {
    const key = `baseStations_${nodeName}`;
    this.cache.set(key, baseStations, this.ttls.baseStations);
  }

  /**
   * Invalidate base stations cache for a node
   */
  invalidateBaseStations(nodeName) {
    const key = `baseStations_${nodeName}`;
    this.cache.del(key);
  }

  /**
   * Get cached user access info
   */
  getUserAccess(userId) {
    const key = `userAccess_${userId}`;
    return this.cache.get(key);
  }

  /**
   * Set cached user access info
   */
  setUserAccess(userId, accessInfo) {
    const key = `userAccess_${userId}`;
    this.cache.set(key, accessInfo, this.ttls.userAccess);
  }

  /**
   * Invalidate user access cache
   */
  invalidateUserAccess(userId) {
    const key = `userAccess_${userId}`;
    this.cache.del(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      keys: this.cache.keys().length,
      size: this.cache.getStats()
    };
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.flushAll();
  }

  /**
   * Get cache info
   */
  getInfo() {
    const stats = this.cache.getStats();
    return {
      keys: this.cache.keys().length,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hits + stats.misses > 0 
        ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
        : 'N/A',
      ttls: this.ttls
    };
  }
}

module.exports = new CacheManager();
