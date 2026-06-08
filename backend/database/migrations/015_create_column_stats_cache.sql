-- Migration: Create column_stats_cache table for Visualization Settings optimization
-- This table stores pre-calculated column statistics to avoid expensive
-- aggregate queries on node_status_table during page load.

CREATE TABLE IF NOT EXISTS column_stats_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  node_name VARCHAR(100) NOT NULL,
  base_station_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(50) NOT NULL,
  column_type ENUM('analog', 'digital', 'output') NOT NULL,
  has_data BOOLEAN DEFAULT FALSE,
  record_count BIGINT DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  min_value DECIMAL(20,6),
  max_value DECIMAL(20,6),
  avg_value DECIMAL(20,6),
  total_rows BIGINT DEFAULT 0,
  calculated_at DATETIME DEFAULT NOW(),
  UNIQUE KEY uk_stats (node_name, base_station_name, column_name),
  INDEX idx_node_station (node_name, base_station_name),
  INDEX idx_calculated_at (calculated_at),
  INDEX idx_column_type (column_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to table
ALTER TABLE column_stats_cache COMMENT = 'Cached column statistics for Visualization Settings - updated hourly by scheduler';
