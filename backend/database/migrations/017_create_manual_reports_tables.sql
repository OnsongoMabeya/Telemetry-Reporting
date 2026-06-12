-- Migration: Create manual reports tables for on-demand report generation
-- Created: 2026-06-11
-- Purpose: Support manual report generation with caching and rate limiting

-- Main manual reports table
CREATE TABLE IF NOT EXISTS manual_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_type ENUM('service', 'client') NOT NULL COMMENT 'Type of report to generate',
    target_ids JSON NOT NULL COMMENT 'Array of service IDs or client IDs',
    date_range_start DATETIME NOT NULL COMMENT 'Start of report data period',
    date_range_end DATETIME NOT NULL COMMENT 'End of report data period',
    generated_by INT NOT NULL COMMENT 'User who requested the report',
    generation_time_ms INT DEFAULT NULL COMMENT 'Time taken to generate in milliseconds',
    pdf_size_bytes INT DEFAULT NULL COMMENT 'Size of generated PDF file',
    status ENUM('generating', 'completed', 'failed', 'cached') DEFAULT 'generating' COMMENT 'Current generation status',
    error_message TEXT DEFAULT NULL COMMENT 'Error details if generation failed',
    delivery_method ENUM('download', 'email', 'both') NOT NULL COMMENT 'How report was delivered',
    recipients JSON DEFAULT NULL COMMENT 'Email recipients if sent via email',
    cache_key VARCHAR(255) DEFAULT NULL COMMENT 'Cache key for identifying duplicate requests',
    is_cached BOOLEAN DEFAULT FALSE COMMENT 'Whether this report came from cache',
    file_path VARCHAR(500) DEFAULT NULL COMMENT 'Path to generated PDF file',
    expires_at DATETIME DEFAULT NULL COMMENT 'When the report file should be deleted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_generated_by (generated_by),
    INDEX idx_status (status),
    INDEX idx_cache_key (cache_key),
    INDEX idx_date_range (date_range_start, date_range_end),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cache statistics table for tracking frequently requested reports
CREATE TABLE IF NOT EXISTS manual_reports_cache_stats (
    cache_key VARCHAR(255) PRIMARY KEY COMMENT 'Unique key for report parameters',
    request_count INT DEFAULT 1 COMMENT 'Number of times this report was requested',
    last_requested DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Most recent request timestamp',
    first_requested DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'First request timestamp',
    is_cached BOOLEAN DEFAULT FALSE COMMENT 'Whether this report is cached',
    cached_at DATETIME DEFAULT NULL COMMENT 'When the report was cached',
    expires_at DATETIME DEFAULT NULL COMMENT 'When cache expires',
    file_path VARCHAR(500) DEFAULT NULL COMMENT 'Path to cached PDF file',
    pdf_size_bytes INT DEFAULT NULL COMMENT 'Size of cached PDF file in bytes',
    report_parameters JSON DEFAULT NULL COMMENT 'Stored report parameters for validation',
    
    INDEX idx_last_requested (last_requested),
    INDEX idx_is_cached (is_cached),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate limiting table to prevent abuse of manual report generation
CREATE TABLE IF NOT EXISTS manual_reports_rate_limits (
    user_id INT PRIMARY KEY COMMENT 'User being rate limited',
    requests_today INT DEFAULT 0 COMMENT 'Number of requests made today',
    last_reset DATE DEFAULT (CURRENT_DATE) COMMENT 'When the daily counter was last reset',
    hourly_requests INT DEFAULT 0 COMMENT 'Number of requests in current hour',
    last_hour_reset DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'When hourly counter was last reset',
    total_requests INT DEFAULT 0 COMMENT 'Total requests ever made by this user',
    last_request_at DATETIME DEFAULT NULL COMMENT 'Timestamp of last request',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_last_reset (last_reset),
    INDEX idx_last_hour_reset (last_hour_reset),
    INDEX idx_last_request_at (last_request_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit table for manual report operations (similar to report_schedule_audit)
CREATE TABLE IF NOT EXISTS manual_reports_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT DEFAULT NULL COMMENT 'Link to manual_reports table if available',
    cache_key VARCHAR(255) DEFAULT NULL COMMENT 'Cache key if this was a cached request',
    action ENUM('generate', 'download', 'email', 'cache_hit', 'cache_miss', 'rate_limit', 'error') NOT NULL,
    user_id INT NOT NULL COMMENT 'User who performed the action',
    report_type ENUM('service', 'client') NOT NULL,
    target_ids JSON NOT NULL COMMENT 'Report targets',
    date_range_start DATETIME NOT NULL,
    date_range_end DATETIME NOT NULL,
    status ENUM('success', 'failed', 'pending') NOT NULL,
    message TEXT DEFAULT NULL COMMENT 'Details about the action',
    delivery_method ENUM('download', 'email', 'both', 'none') DEFAULT 'none',
    recipients_count INT DEFAULT 0 COMMENT 'Number of recipients if emailed',
    pdf_size_bytes INT DEFAULT NULL COMMENT 'Size of generated PDF',
    execution_time_ms INT DEFAULT NULL COMMENT 'Time taken for the action',
    ip_address VARCHAR(45) DEFAULT NULL COMMENT 'User IP address',
    user_agent TEXT DEFAULT NULL COMMENT 'Browser user agent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES manual_reports(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_report_id (report_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_cache_key (cache_key),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_date_range (date_range_start, date_range_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default rate limiting for admin users (assuming admin users have role 'admin')
INSERT IGNORE INTO manual_reports_rate_limits (user_id, requests_today, last_reset)
SELECT u.id, 0, CURRENT_DATE
FROM users u 
WHERE u.role = 'admin' AND u.id NOT IN (SELECT user_id FROM manual_reports_rate_limits);

-- Create a view for manual report statistics
CREATE OR REPLACE VIEW manual_reports_stats AS
SELECT 
    DATE(created_at) as report_date,
    report_type,
    status,
    COUNT(*) as total_reports,
    AVG(generation_time_ms) as avg_generation_time_ms,
    AVG(pdf_size_bytes) as avg_pdf_size_bytes,
    SUM(CASE WHEN is_cached = TRUE THEN 1 ELSE 0 END) as cached_reports,
    SUM(CASE WHEN delivery_method = 'email' OR delivery_method = 'both' THEN 1 ELSE 0 END) as emailed_reports
FROM manual_reports 
GROUP BY DATE(created_at), report_type, status
ORDER BY report_date DESC, report_type;

-- Create a view for user activity statistics
CREATE OR REPLACE VIEW manual_reports_user_activity AS
SELECT 
    u.id as user_id,
    u.username,
    u.role,
    COUNT(mr.id) as total_reports_generated,
    COUNT(CASE WHEN mr.status = 'completed' THEN 1 END) as successful_reports,
    COUNT(CASE WHEN mr.status = 'failed' THEN 1 END) as failed_reports,
    AVG(mr.generation_time_ms) as avg_generation_time_ms,
    MAX(mr.created_at) as last_report_date,
    COUNT(DISTINCT DATE(mr.created_at)) as active_days
FROM users u
LEFT JOIN manual_reports mr ON u.id = mr.generated_by
WHERE u.role = 'admin'
GROUP BY u.id, u.username, u.role
ORDER BY total_reports_generated DESC;

-- Add indexes for better performance on frequently queried columns
ALTER TABLE manual_reports ADD INDEX idx_status_type (status, report_type);
ALTER TABLE manual_reports ADD INDEX idx_user_status_date (generated_by, status, created_at);
ALTER TABLE manual_reports_audit ADD INDEX idx_user_action_date (user_id, action, created_at);
ALTER TABLE manual_reports_cache_stats ADD INDEX idx_request_count (request_count);

-- Create a stored procedure for cleaning up expired reports and cache entries
DELIMITER //
CREATE PROCEDURE CleanupExpiredManualReports()
BEGIN
    -- Delete expired manual reports (older than 24 hours)
    DELETE FROM manual_reports 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- Delete expired cache entries (older than 7 days)
    DELETE FROM manual_reports_cache_stats 
    WHERE is_cached = TRUE AND expires_at < NOW();
    
    -- Reset daily rate limits at midnight
    UPDATE manual_reports_rate_limits 
    SET requests_today = 0, last_reset = CURRENT_DATE 
    WHERE last_reset < CURRENT_DATE;
    
    -- Reset hourly rate limits every hour
    UPDATE manual_reports_rate_limits 
    SET hourly_requests = 0, last_hour_reset = NOW() 
    WHERE last_hour_reset < DATE_SUB(NOW(), INTERVAL 1 HOUR);
    
    SELECT ROW_COUNT() as total_cleaned;
END //
DELIMITER ;

-- Create a stored procedure for generating cache keys
DELIMITER //
CREATE PROCEDURE GenerateManualReportCacheKey(
    IN report_type VARCHAR(10),
    IN target_ids JSON,
    IN date_start DATETIME,
    IN date_end DATETIME,
    OUT cache_key VARCHAR(255)
)
BEGIN
    SET cache_key = CONCAT(
        'manual_report_',
        report_type, '_',
        MD5(COALESCE(JSON_UNQUOTE(target_ids), '[]')), '_',
        DATE_FORMAT(date_start, '%Y-%m-%d_%H:%i'), '_',
        DATE_FORMAT(date_end, '%Y-%m-%d_%H:%i')
    );
END //
DELIMITER ;

-- Set up automatic cleanup (this would be called by a cron job or scheduled task)
-- Note: This should be called daily to clean up expired reports
-- CALL CleanupExpiredManualReports();
