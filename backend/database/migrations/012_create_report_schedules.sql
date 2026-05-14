-- Migration: Create report_schedules table for scheduled report delivery
-- Created: 2024-05-14

CREATE TABLE IF NOT EXISTS report_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    report_type ENUM('service', 'client') NOT NULL,
    target_id INT NOT NULL COMMENT 'service_id or client_id depending on report_type',
    frequency ENUM('hourly', 'daily', 'weekly', 'monthly', 'custom') NOT NULL,
    -- For hourly: interval in hours (e.g., every 6 hours)
    interval_hours INT DEFAULT NULL,
    -- For daily: specific time (HH:MM:SS)
    daily_time TIME DEFAULT NULL,
    -- For weekly: day of week (0=Sunday, 1=Monday, etc.) and time
    weekly_day TINYINT DEFAULT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
    weekly_time TIME DEFAULT NULL,
    -- For monthly: day of month (1-31) and time
    monthly_day TINYINT DEFAULT NULL,
    monthly_time TIME DEFAULT NULL,
    -- For custom: cron expression
    custom_cron VARCHAR(100) DEFAULT NULL,
    -- Time range for report data
    time_range VARCHAR(20) NOT NULL DEFAULT '24h' COMMENT '24h, 7d, 30d',
    -- Recipients
    recipient_users JSON DEFAULT NULL COMMENT 'Array of user IDs from system',
    recipient_emails JSON DEFAULT NULL COMMENT 'Array of external email addresses',
    -- Schedule control
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATETIME NOT NULL,
    end_date DATETIME DEFAULT NULL,
    next_run DATETIME NOT NULL,
    last_run DATETIME DEFAULT NULL,
    last_run_status ENUM('success', 'failed', 'pending') DEFAULT NULL,
    last_run_message TEXT DEFAULT NULL,
    run_count INT DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_report_type_target (report_type, target_id),
    INDEX idx_next_run (next_run, is_active),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log table for scheduled report runs
CREATE TABLE IF NOT EXISTS report_schedule_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('success', 'failed', 'pending') NOT NULL,
    message TEXT DEFAULT NULL,
    recipients_count INT DEFAULT 0,
    pdf_size_bytes INT DEFAULT NULL,
    execution_time_ms INT DEFAULT NULL,
    
    FOREIGN KEY (schedule_id) REFERENCES report_schedules(id) ON DELETE CASCADE,
    INDEX idx_schedule_run (schedule_id, run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
