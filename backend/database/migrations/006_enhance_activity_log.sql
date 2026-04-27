-- Enhance user_activity_log table for structured JSON logging
-- Adds level, category, and metadata columns for the new logger utility

-- Add level column (INFO, WARN, ERROR, DEBUG)
ALTER TABLE user_activity_log
ADD COLUMN IF NOT EXISTS level ENUM('DEBUG', 'INFO', 'WARN', 'ERROR') DEFAULT 'INFO'
AFTER user_id;

-- Add category column (AUTH, API, SLIDESHOW, CRUD, SYSTEM)
ALTER TABLE user_activity_log
ADD COLUMN IF NOT EXISTS category ENUM('AUTH', 'API', 'SLIDESHOW', 'CRUD', 'SYSTEM') DEFAULT 'SYSTEM'
AFTER level;

-- Add metadata column for structured JSON data
ALTER TABLE user_activity_log
ADD COLUMN IF NOT EXISTS metadata JSON DEFAULT NULL
AFTER details;

-- Add index for level and category lookups
ALTER TABLE user_activity_log
ADD INDEX IF NOT EXISTS idx_level (level);

ALTER TABLE user_activity_log
ADD INDEX IF NOT EXISTS idx_category (category);
