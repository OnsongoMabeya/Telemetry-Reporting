-- Performance Optimization Migration for Manual Reports System
-- This migration adds indexes and optimizations for improved performance

-- Manual Reports Table Indexes
CREATE INDEX IF NOT EXISTS idx_manual_reports_generated_by ON manual_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_manual_reports_status ON manual_reports(status);
CREATE INDEX IF NOT EXISTS idx_manual_reports_report_type ON manual_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_manual_reports_date_range ON manual_reports(date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_manual_reports_created_at ON manual_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_manual_reports_composite_status_type ON manual_reports(status, report_type, created_at);

-- Manual Reports Audit Table Indexes
CREATE INDEX IF NOT EXISTS idx_manual_reports_audit_report_id ON manual_reports_audit(report_id);
CREATE INDEX IF NOT EXISTS idx_manual_reports_audit_user_id ON manual_reports_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_reports_audit_action ON manual_reports_audit(action);
CREATE INDEX IF NOT EXISTS idx_manual_reports_audit_created_at ON manual_reports_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_manual_reports_audit_composite_user_action ON manual_reports_audit(user_id, action, created_at);

-- Manual Reports Cache Table Indexes
CREATE INDEX IF NOT EXISTS idx_manual_reports_cache_cache_key ON manual_reports_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_manual_reports_cache_report_type ON manual_reports_cache(report_type);
CREATE INDEX IF NOT EXISTS idx_manual_reports_cache_last_accessed ON manual_reports_cache(last_accessed);
CREATE INDEX IF NOT EXISTS idx_manual_reports_cache_created_at ON manual_reports_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_manual_reports_cache_composite_type_accessed ON manual_reports_cache(report_type, last_accessed);

-- Manual Reports Rate Limits Table Indexes
CREATE INDEX IF NOT EXISTS idx_manual_reports_rate_limits_user_id ON manual_reports_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_reports_rate_limits_last_reset ON manual_reports_rate_limits(last_reset);

-- Telemetry Table Performance Indexes (for report generation)
CREATE INDEX IF NOT EXISTS idx_telemetry_service_id_timestamp ON telemetry(service_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_service_timestamp_value ON telemetry(service_id, timestamp, value);

-- Services Table Indexes
CREATE INDEX IF NOT EXISTS idx_services_client_id ON services(client_id);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

-- Clients Table Indexes
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

-- Power Drop Alerts Table Indexes
CREATE INDEX IF NOT EXISTS idx_power_drop_configs_node_id ON power_drop_alert_configs(node_id);
CREATE INDEX IF NOT EXISTS idx_power_drop_configs_is_active ON power_drop_alert_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_power_drop_state_config_id ON power_drop_alert_state(config_id);
CREATE INDEX IF NOT EXISTS idx_power_drop_state_last_check ON power_drop_alert_state(last_check_time);
CREATE INDEX IF NOT EXISTS idx_power_drop_history_config_id_timestamp ON power_drop_alert_history(config_id, alert_timestamp);

-- Report Schedules Table Indexes
CREATE INDEX IF NOT EXISTS idx_report_schedules_user_id ON report_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_report_type ON report_schedules(report_type);
CREATE INDEX IF NOT EXISTS idx_report_schedules_target_id ON report_schedules(target_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_is_active ON report_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_time);

-- Optimized Views for Common Queries
CREATE OR REPLACE VIEW manual_reports_summary AS
SELECT 
    mr.id,
    mr.report_type,
    mr.target_count,
    mr.date_range_start,
    mr.date_range_end,
    mr.status,
    mr.pdf_size_bytes,
    mr.created_at,
    mr.completed_at,
    mr.generation_time_ms,
    u.username as generated_by_username,
    CASE 
        WHEN mr.status = 'completed' THEN 'success'
        WHEN mr.status = 'failed' THEN 'error'
        WHEN mr.status = 'generating' THEN 'processing'
        ELSE 'pending'
    END as status_category
FROM manual_reports mr
LEFT JOIN users u ON mr.generated_by = u.id;

CREATE OR REPLACE VIEW manual_reports_performance_stats AS
SELECT 
    DATE(created_at) as report_date,
    report_type,
    status,
    COUNT(*) as report_count,
    AVG(generation_time_ms) as avg_generation_time,
    SUM(pdf_size_bytes) as total_size_bytes,
    AVG(pdf_size_bytes) as avg_size_bytes
FROM manual_reports 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), report_type, status
ORDER BY report_date DESC, report_type;

CREATE OR REPLACE VIEW cache_performance_metrics AS
SELECT 
    DATE(created_at) as cache_date,
    report_type,
    COUNT(*) as cache_entries,
    SUM(file_size) as total_cache_size,
    AVG(access_count) as avg_access_count,
    MAX(access_count) as max_access_count
FROM manual_reports_cache 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), report_type
ORDER BY cache_date DESC, report_type;

-- Partitioning Strategy for Large Tables (Future Enhancement)
-- Note: These are commented out as they require table recreation
-- ALTER TABLE telemetry PARTITION BY RANGE (YEAR(timestamp)) (
--     PARTITION p2023 VALUES LESS THAN (2024),
--     PARTITION p2024 VALUES LESS THAN (2025),
--     PARTITION p2025 VALUES LESS THAN (2026),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- Query Optimization Hints
-- Add covering indexes for frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_manual_reports_covering ON manual_reports(status, report_type, created_at, id, pdf_size_bytes, generation_time_ms);
CREATE INDEX IF NOT EXISTS idx_manual_reports_audit_covering ON manual_reports_audit(user_id, action, created_at, report_id, message);
CREATE INDEX IF NOT EXISTS idx_telemetry_covering ON telemetry(service_id, timestamp, value, id);

-- Performance Monitoring Tables
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    additional_data JSON,
    INDEX idx_performance_metrics_name_time (metric_name, recorded_at),
    INDEX idx_performance_metrics_recorded_at (recorded_at)
);

-- Slow Query Log Table
CREATE TABLE IF NOT EXISTS slow_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_text TEXT NOT NULL,
    execution_time_ms INT NOT NULL,
    rows_examined INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT,
    endpoint VARCHAR(255),
    INDEX idx_slow_queries_execution_time (execution_time_ms),
    INDEX idx_slow_queries_timestamp (timestamp),
    INDEX idx_slow_queries_user_id (user_id)
);

-- Database Configuration Optimizations
-- These settings should be applied to the MySQL configuration
-- SET GLOBAL innodb_buffer_pool_size = 1G;  -- Adjust based on available memory
-- SET GLOBAL innodb_log_file_size = 256M;
-- SET GLOBAL innodb_flush_log_at_trx_commit = 2;
-- SET GLOBAL query_cache_size = 256M;
-- SET GLOBAL query_cache_type = ON;

-- Table Optimization Commands
-- OPTIMIZE TABLE manual_reports;
-- OPTIMIZE TABLE manual_reports_audit;
-- OPTIMIZE TABLE manual_reports_cache;
-- OPTIMIZE TABLE telemetry;
-- OPTIMIZE TABLE services;
-- OPTIMIZE TABLE clients;

-- Analyze tables for query optimizer
-- ANALYZE TABLE manual_reports;
-- ANALYZE TABLE manual_reports_audit;
-- ANALYZE TABLE manual_reports_cache;
-- ANALYZE TABLE telemetry;
-- ANALYZE TABLE services;
-- ANALYZE TABLE clients;
