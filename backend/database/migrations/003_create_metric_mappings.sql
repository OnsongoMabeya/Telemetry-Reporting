-- Migration: Create metric mappings table for dynamic y-axis configuration
-- This allows admins to map database columns to custom metric names per node/base station

-- Create metric_mappings table
CREATE TABLE IF NOT EXISTS metric_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  node_name VARCHAR(100) NOT NULL,
  base_station_name VARCHAR(100) NOT NULL,
  metric_name VARCHAR(100) NOT NULL COMMENT 'Custom name like "Forward Power", "VSWR", etc.',
  column_name VARCHAR(50) NOT NULL COMMENT 'Database column like "Analog1Value", "Digital5Value"',
  unit VARCHAR(20) DEFAULT NULL COMMENT 'Unit of measurement like "dBm", "W", etc.',
  display_order INT DEFAULT 0 COMMENT 'Order in which metrics appear in graphs',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT NOT NULL COMMENT 'User ID who created this mapping',
  
  -- Ensure unique mapping per node/base station/column
  UNIQUE KEY unique_node_column (node_name, base_station_name, column_name),
  
  -- Ensure unique metric name per node/base station
  UNIQUE KEY unique_node_metric (node_name, base_station_name, metric_name),
  
  -- Foreign key to users table
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Index for faster queries
  INDEX idx_node_base (node_name, base_station_name),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores metric mappings for dynamic y-axis configuration per node/base station';

-- Create metric_mapping_audit table for tracking changes
CREATE TABLE IF NOT EXISTS metric_mapping_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mapping_id INT DEFAULT NULL COMMENT 'Reference to metric_mappings.id (NULL if deleted)',
  node_name VARCHAR(100) NOT NULL,
  base_station_name VARCHAR(100) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(50) NOT NULL,
  unit VARCHAR(20) DEFAULT NULL,
  action ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
  changed_by INT NOT NULL COMMENT 'User ID who made the change',
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  old_values JSON DEFAULT NULL COMMENT 'Previous values for UPDATE/DELETE actions',
  new_values JSON DEFAULT NULL COMMENT 'New values for CREATE/UPDATE actions',
  ip_address VARCHAR(45) DEFAULT NULL,
  
  -- Foreign key to users table
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Index for faster audit queries
  INDEX idx_mapping_id (mapping_id),
  INDEX idx_node_base_audit (node_name, base_station_name),
  INDEX idx_changed_at (changed_at),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for all metric mapping changes';

-- Create view for active mappings with user info
CREATE OR REPLACE VIEW v_active_metric_mappings AS
SELECT 
  mm.id,
  mm.node_name,
  mm.base_station_name,
  mm.metric_name,
  mm.column_name,
  mm.unit,
  mm.display_order,
  mm.created_at,
  mm.updated_at,
  u.username as created_by_username,
  u.first_name as created_by_first_name,
  u.last_name as created_by_last_name
FROM metric_mappings mm
INNER JOIN users u ON mm.created_by = u.id
WHERE mm.is_active = TRUE
ORDER BY mm.node_name, mm.base_station_name, mm.display_order;

-- Insert sample mappings for testing (optional - can be removed in production)
-- These are examples showing how different nodes might have different mappings
INSERT INTO metric_mappings 
  (node_name, base_station_name, metric_name, column_name, unit, display_order, created_by)
SELECT 
  'MediaMax1', 
  'Nairobi',
  'Forward Power',
  'Analog1Value',
  'dBm',
  1,
  (SELECT id FROM users WHERE username = 'BSI' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'BSI')
  AND NOT EXISTS (
    SELECT 1 FROM metric_mappings 
    WHERE node_name = 'MediaMax1' 
      AND base_station_name = 'Nairobi' 
      AND column_name = 'Analog1Value'
  );

INSERT INTO metric_mappings 
  (node_name, base_station_name, metric_name, column_name, unit, display_order, created_by)
SELECT 
  'MediaMax1', 
  'Nairobi',
  'Reflected Power',
  'Analog2Value',
  'dBm',
  2,
  (SELECT id FROM users WHERE username = 'BSI' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'BSI')
  AND NOT EXISTS (
    SELECT 1 FROM metric_mappings 
    WHERE node_name = 'MediaMax1' 
      AND base_station_name = 'Nairobi' 
      AND column_name = 'Analog2Value'
  );

INSERT INTO metric_mappings 
  (node_name, base_station_name, metric_name, column_name, unit, display_order, created_by)
SELECT 
  'MediaMax1', 
  'Nairobi',
  'VSWR',
  'Analog3Value',
  '',
  3,
  (SELECT id FROM users WHERE username = 'BSI' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'BSI')
  AND NOT EXISTS (
    SELECT 1 FROM metric_mappings 
    WHERE node_name = 'MediaMax1' 
      AND base_station_name = 'Nairobi' 
      AND column_name = 'Analog3Value'
  );

INSERT INTO metric_mappings 
  (node_name, base_station_name, metric_name, column_name, unit, display_order, created_by)
SELECT 
  'MediaMax1', 
  'Nairobi',
  'Return Loss',
  'Analog4Value',
  'dB',
  4,
  (SELECT id FROM users WHERE username = 'BSI' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'BSI')
  AND NOT EXISTS (
    SELECT 1 FROM metric_mappings 
    WHERE node_name = 'MediaMax1' 
      AND base_station_name = 'Nairobi' 
      AND column_name = 'Analog4Value'
  );
