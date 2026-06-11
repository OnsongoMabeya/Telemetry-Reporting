-- Migration: Create tables for Power Drop Alert feature
-- This feature monitors sudden drops in metrics (e.g., Forward Power) and sends notifications

-- Table 1: Power Drop Alert Configurations
CREATE TABLE IF NOT EXISTS power_drop_alert_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL COMMENT 'Human-readable alert name',
  node_name VARCHAR(100) NOT NULL COMMENT 'Node to monitor',
  base_station_name VARCHAR(100) NOT NULL COMMENT 'Base station to monitor',
  metric_mapping_id INT NOT NULL COMMENT 'Which metric to monitor',
  drop_percentage DECIMAL(5,2) DEFAULT 80.00 COMMENT 'Drop percentage threshold',
  time_window_seconds INT DEFAULT 5 COMMENT 'Time window for comparison (seconds)',
  check_interval_seconds INT DEFAULT 5 COMMENT 'How often to check (seconds)',
  recipient_users JSON DEFAULT NULL COMMENT 'Array of user IDs to notify',
  recipient_emails JSON DEFAULT NULL COMMENT 'Array of email addresses',
  recipient_phones JSON DEFAULT NULL COMMENT 'Array of phone numbers for WhatsApp',
  notify_email BOOLEAN DEFAULT TRUE COMMENT 'Send email notifications',
  notify_whatsapp BOOLEAN DEFAULT TRUE COMMENT 'Send WhatsApp notifications',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Alert rule is enabled',
  created_by INT COMMENT 'User who created this alert',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_node_station (node_name, base_station_name),
  INDEX idx_metric_mapping (metric_mapping_id),
  INDEX idx_active (is_active),
  INDEX idx_created_by (created_by),
  
  FOREIGN KEY (metric_mapping_id) REFERENCES metric_mappings(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: Power Drop Alert State (current status per station)
CREATE TABLE IF NOT EXISTS power_drop_alert_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_id INT NOT NULL COMMENT 'Reference to alert config',
  node_name VARCHAR(100) NOT NULL,
  base_station_name VARCHAR(100) NOT NULL,
  last_reading_value DECIMAL(20,6) COMMENT 'Last metric reading value',
  last_reading_time DATETIME COMMENT 'When last reading was taken',
  previous_reading_value DECIMAL(20,6) COMMENT 'Previous reading for comparison',
  previous_reading_time DATETIME COMMENT 'When previous reading was taken',
  alert_triggered_at DATETIME COMMENT 'When alert was first triggered',
  last_alert_sent_at DATETIME COMMENT 'When last alert was sent',
  alert_count INT DEFAULT 0 COMMENT 'How many alerts sent (max 2)',
  is_power_down BOOLEAN DEFAULT FALSE COMMENT 'Currently in power down state',
  recovered_at DATETIME COMMENT 'When power was recovered',
  
  UNIQUE KEY uk_config_node_station (config_id, node_name, base_station_name),
  INDEX idx_config (config_id),
  INDEX idx_node_station (node_name, base_station_name),
  INDEX idx_power_down (is_power_down),
  INDEX idx_last_alert (last_alert_sent_at),
  
  FOREIGN KEY (config_id) REFERENCES power_drop_alert_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 3: Power Drop Alert History (audit log)
CREATE TABLE IF NOT EXISTS power_drop_alert_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_id INT NOT NULL COMMENT 'Reference to alert config',
  node_name VARCHAR(100) NOT NULL,
  base_station_name VARCHAR(100) NOT NULL,
  alert_type ENUM('drop', 'recovery') NOT NULL COMMENT 'Type of alert',
  previous_value DECIMAL(20,6) COMMENT 'Value before change',
  current_value DECIMAL(20,6) COMMENT 'Value after change',
  drop_percentage DECIMAL(5,2) COMMENT 'Percentage drop (for drop alerts)',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'When alert was sent',
  notification_method ENUM('email', 'whatsapp', 'both') NOT NULL COMMENT 'How notification was sent',
  status ENUM('sent', 'failed', 'pending') DEFAULT 'sent' COMMENT 'Alert status',
  error_message TEXT COMMENT 'Error if sending failed',
  metadata JSON DEFAULT NULL COMMENT 'Additional context',
  
  INDEX idx_config (config_id),
  INDEX idx_node_station (node_name, base_station_name),
  INDEX idx_alert_type (alert_type),
  INDEX idx_sent_at (sent_at),
  INDEX idx_status (status),
  
  FOREIGN KEY (config_id) REFERENCES power_drop_alert_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add table comments
ALTER TABLE power_drop_alert_configs COMMENT = 'Configuration rules for power drop alerts';
ALTER TABLE power_drop_alert_state COMMENT = 'Current state of power drop alerts per station';
ALTER TABLE power_drop_alert_history COMMENT = 'History log of power drop alerts sent';
