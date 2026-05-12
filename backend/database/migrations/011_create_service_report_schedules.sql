-- Migration: Create service_report_schedules table for automated report scheduling
-- Allows admins to configure periodic reports per client/service

CREATE TABLE IF NOT EXISTS service_report_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  service_id INT NOT NULL,
  frequency ENUM('daily', 'weekly', 'monthly') NOT NULL DEFAULT 'monthly',
  recipients JSON NOT NULL COMMENT 'Array of email addresses',
  time_filter VARCHAR(10) NOT NULL DEFAULT '1d' COMMENT 'Time range for reports (1d, 7d, 30d, etc.)',
  last_sent_at TIMESTAMP NULL,
  next_scheduled_at TIMESTAMP NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  
  INDEX idx_client_service (client_id, service_id),
  INDEX idx_next_scheduled (next_scheduled_at, is_active),
  INDEX idx_frequency (frequency, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Scheduled report configuration for service telemetry reports';

-- Down migration (rollback)
-- DROP TABLE IF EXISTS service_report_schedules;
