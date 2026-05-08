-- Migration: Create metric view settings table for visualization configuration
-- This allows admins to configure how metrics are displayed (line graph vs dial) and merge groups

-- Create metric_view_settings table
CREATE TABLE IF NOT EXISTS metric_view_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_mapping_id INT NOT NULL COMMENT 'Reference to metric_mappings.id',
  view_type ENUM('line', 'dial') DEFAULT 'line' COMMENT 'Display type: line graph or dial/gauge',
  merge_group_id VARCHAR(36) DEFAULT NULL COMMENT 'UUID for grouping metrics into merged views',
  merge_group_name VARCHAR(100) DEFAULT NULL COMMENT 'Display name for the merge group',
  display_order INT DEFAULT 0 COMMENT 'Order within merge group or overall display',
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL COMMENT 'User ID who created this setting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key to metric_mappings table
  FOREIGN KEY (metric_mapping_id) REFERENCES metric_mappings(id) ON DELETE CASCADE,
  
  -- Foreign key to users table
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Unique constraint - one view setting per metric mapping
  UNIQUE KEY unique_metric_mapping (metric_mapping_id),
  
  -- Indexes for faster queries
  INDEX idx_merge_group_id (merge_group_id),
  INDEX idx_view_type (view_type),
  INDEX idx_is_active (is_active),
  INDEX idx_metric_mapping_id (metric_mapping_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores view settings for metric visualizations (line graph vs dial, merge groups)';

-- Down migration (rollback)
-- Uncomment the lines below and comment out the CREATE statements to roll back this migration
-- DROP TABLE IF EXISTS metric_view_settings;
