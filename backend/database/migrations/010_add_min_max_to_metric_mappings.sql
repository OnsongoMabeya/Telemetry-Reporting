-- Migration: Add min_value and max_value columns to metric_mappings table
-- For dial/gauge visualization range configuration

-- Add min_value column with default 0
ALTER TABLE metric_mappings 
ADD COLUMN min_value DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Minimum value for dial/gauge display';

-- Add max_value column with default 100
ALTER TABLE metric_mappings 
ADD COLUMN max_value DECIMAL(10,2) DEFAULT 100.00 COMMENT 'Maximum value for dial/gauge display';

-- Down migration (rollback)
-- ALTER TABLE metric_mappings DROP COLUMN IF EXISTS min_value;
-- ALTER TABLE metric_mappings DROP COLUMN IF EXISTS max_value;
