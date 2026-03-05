-- Migration: Add color column to metric_mappings table
-- This allows admins to configure graph colors per metric

ALTER TABLE metric_mappings 
ADD COLUMN color VARCHAR(7) DEFAULT NULL COMMENT 'Hex color code for graph line (e.g., #FF5733). NULL = default black'
AFTER display_order;

-- Update the view to include color
CREATE OR REPLACE VIEW v_active_metric_mappings AS
SELECT 
  mm.id,
  mm.node_name,
  mm.base_station_name,
  mm.metric_name,
  mm.column_name,
  mm.unit,
  mm.display_order,
  mm.color,
  mm.created_at,
  mm.updated_at,
  u.username as created_by_username,
  u.first_name as created_by_first_name,
  u.last_name as created_by_last_name
FROM metric_mappings mm
INNER JOIN users u ON mm.created_by = u.id
WHERE mm.is_active = TRUE
ORDER BY mm.node_name, mm.base_station_name, mm.display_order;
