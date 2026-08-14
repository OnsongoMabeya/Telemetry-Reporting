-- Migration 021: Optimize Map Query Performance
-- Created: August 14, 2026
-- Purpose: Add indexes for map station queries (My Sites Map + Dashboard Map)

-- Index for mapviewtable lookups by BaseStationName
-- Used by both My Sites Map and Dashboard Map endpoints
ALTER TABLE mapviewtable ADD INDEX idx_mapviewtable_basestationname (BaseStationName);

-- Index for metric_mappings lookups by base_station_name
-- Used by My Sites Map endpoint to get base stations for a client/service
ALTER TABLE metric_mappings ADD INDEX idx_metric_mappings_basestationname (base_station_name);

-- Verify indexes were created
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('mapviewtable', 'metric_mappings')
  AND INDEX_NAME IN ('idx_mapviewtable_basestationname', 'idx_metric_mappings_basestationname')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
