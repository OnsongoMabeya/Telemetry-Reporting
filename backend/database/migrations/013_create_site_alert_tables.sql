-- Migration 013: Offline Site Alert System
-- Creates site_alert_configs and site_alert_state tables

-- Configuration: one row per base station that should be monitored
CREATE TABLE IF NOT EXISTS site_alert_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  base_station_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  repeat_interval_hours INT NOT NULL DEFAULT 4 COMMENT 'Hours between repeat alert emails while site stays offline',
  recipient_users JSON NOT NULL DEFAULT ('[]') COMMENT 'Array of user IDs',
  recipient_emails JSON NOT NULL DEFAULT ('[]') COMMENT 'Array of external email strings',
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_base_station (base_station_name),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- State tracking: one row per base station, updated by the checker
CREATE TABLE IF NOT EXISTS site_alert_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  base_station_name VARCHAR(255) NOT NULL,
  alert_status ENUM('online', 'offline') NOT NULL DEFAULT 'online',
  first_offline_at DATETIME NULL COMMENT 'When the site first went offline in this incident',
  last_alert_sent_at DATETIME NULL COMMENT 'When the last alert email was sent',
  last_checked_at DATETIME NULL COMMENT 'When the checker last evaluated this station',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_base_station (base_station_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
