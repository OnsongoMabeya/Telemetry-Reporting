-- Migration 020: Optimize Metric Writes and Cleanup Operations
-- Created: August 14, 2026
-- Purpose: Add indexes for metric write performance and cleanup operations

-- Index for metric write operations (timestamp-based)
ALTER TABLE telemetry_data ADD INDEX idx_telemetry_data_timestamp (timestamp);

-- Composite index for metric queries by node and metric name
ALTER TABLE telemetry_data ADD INDEX idx_telemetry_data_node_metric (NodeName, MetricName, timestamp);

-- Index for range queries (node + timestamp descending)
ALTER TABLE telemetry_data ADD INDEX idx_telemetry_data_range (NodeName, timestamp DESC);

-- Index for cleanup operations
ALTER TABLE telemetry_data ADD INDEX idx_telemetry_data_cleanup (timestamp);

-- Optimize slow_queries table if it exists
ALTER TABLE slow_queries ADD INDEX idx_slow_queries_timestamp (timestamp);

-- Add index for user_node_assignments if not exists
ALTER TABLE user_node_assignments ADD INDEX idx_user_node_assignments_active (user_id, is_active);

-- Add index for base station queries
ALTER TABLE node_status_table ADD INDEX idx_node_status_base_station (NodeBaseStationName, timestamp);

-- Verify indexes were created
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  SEQ_IN_INDEX
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('telemetry_data', 'slow_queries', 'user_node_assignments', 'node_status_table')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
