-- Check all metric mappings for MediaMax1 / MERU
SELECT 
    id,
    node_name,
    base_station_name,
    metric_name,
    db_column,
    output_column,
    is_active,
    created_at,
    updated_at
FROM metric_mappings 
WHERE node_name = 'MediaMax1' 
  AND base_station_name = 'MERU'
ORDER BY created_at;
