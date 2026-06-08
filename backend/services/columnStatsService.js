/**
 * Column Statistics Cache Service
 * 
 * Pre-calculates and caches column statistics to avoid expensive
 * aggregate queries on node_status_table during Visualization Settings page load.
 * 
 * Cache is refreshed hourly by the scheduler, and can be manually refreshed via API.
 */

const logger = require('../utils/logger');
const cacheLogger = require('../utils/cacheLogger');

let db = null;

/**
 * Set database connection
 */
function setDatabase(database) {
  db = database;
}

/**
 * Get database connection (with fallback)
 */
function getDb() {
  if (db) return db;
  // Fallback for when used outside of route context
  const app = require('../server').app;
  return app ? app.get('db') : null;
}

/**
 * Refresh the entire column stats cache
 * This is called hourly by the scheduler
 */
async function refreshCache() {
  const startTime = Date.now();
  logger.info('ColumnStatsCache', 'Starting cache refresh');
  cacheLogger.refreshStart();

  const database = getDb();
  if (!database) {
    const error = new Error('Database not available');
    cacheLogger.refreshError(error);
    throw error;
  }

  try {
    // Clear old cache data
    await database.query('TRUNCATE TABLE column_stats_cache');
    logger.debug('ColumnStatsCache', 'Cleared existing cache');
    cacheLogger.info('Cleared existing cache data');

    // Get all unique node/base station combinations
    const [nodes] = await database.query(`
      SELECT DISTINCT NodeName as node_name, NodeBaseStationName as base_station_name
      FROM node_status_table
      ORDER BY NodeName, NodeBaseStationName
    `);

    logger.info('ColumnStatsCache', `Found ${nodes.length} unique node/station combinations to process`);
    cacheLogger.info(`Found ${nodes.length} unique node/station combinations`, { totalNodes: nodes.length });

    // Get all columns from node_status_table
    const [columns] = await database.query(`
      SELECT COLUMN_NAME, DATA_TYPE, ORDINAL_POSITION
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'node_status_table'
      AND ORDINAL_POSITION >= 6
      ORDER BY ORDINAL_POSITION`,
      [process.env.DB_NAME || 'horiserverlive']
    );

    // Categorize columns
    const analogColumns = columns.filter(c => c.COLUMN_NAME.match(/^Analog\d+Value$/i));
    const digitalColumns = columns.filter(c => c.COLUMN_NAME.match(/^Digital\d+Value$/i));
    const outputColumns = columns.filter(c => c.COLUMN_NAME.match(/^Output\d+Value$/i));

    logger.debug('ColumnStatsCache', `Columns: ${analogColumns.length} analog, ${digitalColumns.length} digital, ${outputColumns.length} output`);
    cacheLogger.info('Column categories loaded', {
      analogCount: analogColumns.length,
      digitalCount: digitalColumns.length,
      outputCount: outputColumns.length,
      totalColumns: columns.length
    });

    // Process each node/station combination with progress logging
    let totalStats = 0;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodeStartTime = Date.now();
      
      const nodeStats = await calculateNodeStats(
        database,
        node.node_name,
        node.base_station_name,
        analogColumns,
        digitalColumns,
        outputColumns
      );
      
      const nodeDuration = Date.now() - nodeStartTime;
      totalStats += nodeStats;
      
      // Log per-node progress
      cacheLogger.nodeProgress(
        node.node_name,
        node.base_station_name,
        i + 1,
        nodes.length,
        nodeDuration,
        nodeStats
      );
      
      // Log every 10 nodes at INFO level, others at DEBUG
      if ((i + 1) % 10 === 0 || i === nodes.length - 1) {
        logger.info('ColumnStatsCache', `Progress: ${i + 1}/${nodes.length} nodes processed`);
      }
    }

    const duration = Date.now() - startTime;
    
    logger.info('ColumnStatsCache', `Cache refresh completed`, {
      duration: `${duration}ms`,
      nodesProcessed: nodes.length,
      totalStatsCached: totalStats
    });
    
    cacheLogger.refreshComplete({
      duration: `${duration}ms`,
      nodesProcessed: nodes.length,
      totalStatsCached: totalStats,
      analogColumns: analogColumns.length,
      digitalColumns: digitalColumns.length,
      outputColumns: outputColumns.length
    });

    return {
      success: true,
      nodesProcessed: nodes.length,
      totalStatsCached: totalStats,
      duration: duration
    };

  } catch (error) {
    logger.error('ColumnStatsCache', 'Cache refresh failed', { error: error.message });
    cacheLogger.refreshError(error, { phase: 'refreshCache' });
    throw error;
  }
}

/**
 * Calculate statistics for a specific node/station
 */
async function calculateNodeStats(db, nodeName, baseStationName, analogCols, digitalCols, outputCols) {
  // Get total row count for this node/station
  const [totalRows] = await db.query(
    'SELECT COUNT(*) as total FROM node_status_table WHERE NodeName = ? AND NodeBaseStationName = ?',
    [nodeName, baseStationName]
  );
  const total = totalRows[0].total;

  const statsToInsert = [];

  // Analyze each column type with detailed logging
  const analyzeColumns = async (columns, type) => {
    for (const col of columns) {
      try {
        const [stats] = await db.query(`
          SELECT 
            COUNT(??) as count,
            MIN(??) as min_value,
            MAX(??) as max_value,
            AVG(??) as avg_value
          FROM node_status_table 
          WHERE NodeName = ? AND NodeBaseStationName = ?
          AND ?? IS NOT NULL AND ?? != 0`,
          [col.COLUMN_NAME, col.COLUMN_NAME, col.COLUMN_NAME, col.COLUMN_NAME,
           nodeName, baseStationName, col.COLUMN_NAME, col.COLUMN_NAME]
        );

        const recordCount = stats[0].count;
        const percentage = total > 0 ? ((recordCount / total) * 100).toFixed(2) : 0;
        
        const columnStats = {
          hasData: recordCount > 0,
          recordCount: recordCount,
          percentage: parseFloat(percentage),
          minValue: stats[0].min_value,
          maxValue: stats[0].max_value,
          avgValue: stats[0].avg_value
        };

        // Log detailed column stats (only for columns with data to reduce noise)
        if (recordCount > 0) {
          cacheLogger.columnStats(nodeName, baseStationName, col.COLUMN_NAME, type, columnStats);
        }

        statsToInsert.push([
          nodeName,
          baseStationName,
          col.COLUMN_NAME,
          type,
          columnStats.hasData,
          columnStats.recordCount,
          columnStats.percentage,
          columnStats.minValue,
          columnStats.maxValue,
          columnStats.avgValue,
          total
        ]);
      } catch (err) {
        logger.debug('ColumnStatsCache', `Error analyzing column ${col.COLUMN_NAME}`, { error: err.message });
        cacheLogger.error(`Error analyzing column ${col.COLUMN_NAME}`, {
          nodeName,
          baseStationName,
          columnName: col.COLUMN_NAME,
          type,
          error: err.message
        });
        
        // Add entry with no data
        statsToInsert.push([
          nodeName,
          baseStationName,
          col.COLUMN_NAME,
          type,
          false,
          0,
          0,
          null,
          null,
          null,
          total
        ]);
      }
    }
  };

  await Promise.all([
    analyzeColumns(analogCols, 'analog'),
    analyzeColumns(digitalCols, 'digital'),
    analyzeColumns(outputCols, 'output')
  ]);

  // Batch insert all stats for this node
  if (statsToInsert.length > 0) {
    const placeholders = statsToInsert.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    await db.query(`
      INSERT INTO column_stats_cache 
        (node_name, base_station_name, column_name, column_type, has_data, 
         record_count, percentage, min_value, max_value, avg_value, total_rows)
      VALUES ${placeholders}`,
      statsToInsert.flat()
    );
  }

  return statsToInsert.length;
}

/**
 * Get cached stats for a specific node/station
 */
async function getStatsForNode(nodeName, baseStationName) {
  const database = getDb();
  if (!database) {
    throw new Error('Database not available');
  }

  const startTime = Date.now();
  
  const [stats] = await database.query(`
    SELECT 
      column_name,
      column_type,
      has_data,
      record_count,
      percentage,
      min_value,
      max_value,
      avg_value,
      total_rows,
      calculated_at
    FROM column_stats_cache
    WHERE node_name = ? AND base_station_name = ?
    ORDER BY column_type, column_name
  `, [nodeName, baseStationName]);

  const duration = Date.now() - startTime;

  // Group by type
  const grouped = {
    analog: [],
    digital: [],
    output: [],
    totalRows: stats.length > 0 ? stats[0].total_rows : 0,
    calculatedAt: stats.length > 0 ? stats[0].calculated_at : null
  };

  stats.forEach(stat => {
    const result = {
      name: stat.column_name,
      hasData: stat.has_data,
      recordCount: stat.record_count,
      percentage: parseFloat(stat.percentage),
      minValue: stat.min_value,
      maxValue: stat.max_value,
      avgValue: stat.avg_value
    };
    grouped[stat.column_type].push(result);
  });

  return grouped;
}

/**
 * Get just column names without stats (fast)
 */
async function getColumnNamesOnly() {
  const database = getDb();
  if (!database) {
    throw new Error('Database not available');
  }

  const [columns] = await database.query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'node_status_table'
    AND ORDINAL_POSITION >= 6
    ORDER BY ORDINAL_POSITION`,
    [process.env.DB_NAME || 'horiserverlive']
  );

  const analog = columns.filter(c => c.COLUMN_NAME.match(/^Analog\d+Value$/i)).map(c => c.COLUMN_NAME);
  const digital = columns.filter(c => c.COLUMN_NAME.match(/^Digital\d+Value$/i)).map(c => c.COLUMN_NAME);
  const output = columns.filter(c => c.COLUMN_NAME.match(/^Output\d+Value$/i)).map(c => c.COLUMN_NAME);

  return { analog, digital, output };
}

/**
 * Get cache status overview
 */
async function getCacheStatus() {
  const database = getDb();
  if (!database) {
    throw new Error('Database not available');
  }

  const [stats] = await database.query(`
    SELECT 
      COUNT(*) as total_entries,
      COUNT(DISTINCT node_name, base_station_name) as unique_nodes,
      MIN(calculated_at) as oldest_calculation,
      MAX(calculated_at) as latest_calculation
    FROM column_stats_cache
  `);

  const [nodesWithData] = await database.query(`
    SELECT DISTINCT node_name, base_station_name
    FROM column_stats_cache
    ORDER BY node_name, base_station_name
  `);

  const status = {
    totalEntries: stats[0].total_entries,
    uniqueNodes: stats[0].unique_nodes,
    oldestCalculation: stats[0].oldest_calculation,
    latestCalculation: stats[0].latest_calculation,
    cachedNodes: nodesWithData
  };
  
  cacheLogger.statusCheck({
    totalEntries: status.totalEntries,
    uniqueNodes: status.uniqueNodes,
    latestCalculation: status.latestCalculation
  });

  return status;
}

/**
 * Check if cache is stale (older than 2 hours)
 */
async function isCacheStale() {
  const database = getDb();
  if (!database) return true;

  const [result] = await database.query(`
    SELECT MAX(calculated_at) as latest
    FROM column_stats_cache
  `);

  if (!result[0].latest) return true;

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return new Date(result[0].latest) < twoHoursAgo;
}

module.exports = {
  setDatabase,
  refreshCache,
  getStatsForNode,
  getColumnNamesOnly,
  getCacheStatus,
  isCacheStale
};
