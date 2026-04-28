-- Enhance user_activity_log table for structured JSON logging
-- Adds level, category, and metadata columns for the new logger utility
-- Compatible with MySQL 5.7+

-- Check and add level column
SET @level_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'user_activity_log' AND column_name = 'level');

SET @sql = IF(@level_exists = 0, 
  'ALTER TABLE user_activity_log ADD COLUMN level ENUM("DEBUG", "INFO", "WARN", "ERROR") DEFAULT "INFO" AFTER user_id', 
  'SELECT "level column already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add category column
SET @category_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'user_activity_log' AND column_name = 'category');

SET @sql = IF(@category_exists = 0, 
  'ALTER TABLE user_activity_log ADD COLUMN category ENUM("AUTH", "API", "SLIDESHOW", "CRUD", "SYSTEM") DEFAULT "SYSTEM" AFTER level', 
  'SELECT "category column already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add metadata column
SET @metadata_exists = (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'user_activity_log' AND column_name = 'metadata');

SET @sql = IF(@metadata_exists = 0, 
  'ALTER TABLE user_activity_log ADD COLUMN metadata JSON DEFAULT NULL AFTER details', 
  'SELECT "metadata column already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for level lookups (ignore error if exists)
SET @idx_level_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'user_activity_log' AND index_name = 'idx_level');

SET @sql = IF(@idx_level_exists = 0, 
  'ALTER TABLE user_activity_log ADD INDEX idx_level (level)', 
  'SELECT "idx_level index already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for category lookups (ignore error if exists)
SET @idx_category_exists = (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'user_activity_log' AND index_name = 'idx_category');

SET @sql = IF(@idx_category_exists = 0, 
  'ALTER TABLE user_activity_log ADD INDEX idx_category (category)', 
  'SELECT "idx_category index already exists" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
