-- Export existing metric mappings from development database
-- Run this on your development computer (Mac) to export your configurations

-- This will generate INSERT statements for all your metric mappings
SELECT 
    CONCAT(
        'INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES (',
        QUOTE(node_name), ', ',
        QUOTE(base_station_name), ', ',
        QUOTE(metric_name), ', ',
        QUOTE(column_name), ', ',
        QUOTE(IFNULL(unit, '')), ', ',
        display_order, ', ',
        is_active, ', ',
        QUOTE(IFNULL(created_by, 'admin')),
        ');'
    ) AS insert_statement
FROM metric_mappings
WHERE is_active = 1
ORDER BY node_name, base_station_name, display_order;
