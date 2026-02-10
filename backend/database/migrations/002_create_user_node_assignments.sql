-- Create user_node_assignments table for assigning nodes to users
-- This allows admins to control which nodes each user can access

CREATE TABLE IF NOT EXISTS user_node_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  node_name VARCHAR(100) NOT NULL,
  assigned_by INT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  INDEX idx_user_id (user_id),
  INDEX idx_node_name (node_name),
  INDEX idx_assigned_by (assigned_by),
  UNIQUE KEY unique_user_node (user_id, node_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add column to users table to indicate if user has access to all nodes (admin privilege)
-- Check if column exists first
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'users' 
                   AND COLUMN_NAME = 'access_all_nodes');

SET @sql = IF(@col_exists = 0, 
              'ALTER TABLE users ADD COLUMN access_all_nodes BOOLEAN DEFAULT FALSE AFTER is_active', 
              'SELECT "Column access_all_nodes already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing admin users to have access to all nodes
UPDATE users SET access_all_nodes = TRUE WHERE role = 'admin';
