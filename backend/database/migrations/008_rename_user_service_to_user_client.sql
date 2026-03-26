-- Migration: Rename user_service_assignments to user_client_assignments
-- This changes the assignment model from User->Service to User->Client

-- Drop the old table if it exists
DROP TABLE IF EXISTS user_service_assignments;

-- Create user_client_assignments table
CREATE TABLE IF NOT EXISTS user_client_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  client_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE KEY unique_user_client (user_id, client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for faster lookups
CREATE INDEX idx_user_client_user ON user_client_assignments(user_id);
CREATE INDEX idx_user_client_client ON user_client_assignments(client_id);
CREATE INDEX idx_user_client_active ON user_client_assignments(is_active);
