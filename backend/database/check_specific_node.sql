-- Check data for specific node: Aviation FM / ELDORET
-- This will show which columns have data for this specific node

SELECT 
    'Aviation FM / ELDORET - Column Data Check' as info;

-- Check Analog columns for this specific node
SELECT 
    'Analog1Value' as column_name,
    COUNT(*) as records_with_data,
    MIN(Analog1Value) as min_value,
    MAX(Analog1Value) as max_value,
    AVG(Analog1Value) as avg_value
FROM node_status_table 
WHERE NodeName = 'Aviation FM' 
  AND NodeBaseStationName = 'ELDORET'
  AND Analog1Value IS NOT NULL 
  AND Analog1Value != 0

UNION ALL

SELECT 
    'Analog2Value' as column_name,
    COUNT(*) as records_with_data,
    MIN(Analog2Value) as min_value,
    MAX(Analog2Value) as max_value,
    AVG(Analog2Value) as avg_value
FROM node_status_table 
WHERE NodeName = 'Aviation FM' 
  AND NodeBaseStationName = 'ELDORET'
  AND Analog2Value IS NOT NULL 
  AND Analog2Value != 0

UNION ALL

SELECT 
    'Analog3Value' as column_name,
    COUNT(*) as records_with_data,
    MIN(Analog3Value) as min_value,
    MAX(Analog3Value) as max_value,
    AVG(Analog3Value) as avg_value
FROM node_status_table 
WHERE NodeName = 'Aviation FM' 
  AND NodeBaseStationName = 'ELDORET'
  AND Analog3Value IS NOT NULL 
  AND Analog3Value != 0

UNION ALL

SELECT 
    'Analog4Value' as column_name,
    COUNT(*) as records_with_data,
    MIN(Analog4Value) as min_value,
    MAX(Analog4Value) as max_value,
    AVG(Analog4Value) as avg_value
FROM node_status_table 
WHERE NodeName = 'Aviation FM' 
  AND NodeBaseStationName = 'ELDORET'
  AND Analog4Value IS NOT NULL 
  AND Analog4Value != 0

HAVING records_with_data > 0
ORDER BY column_name;

-- Total records for this node
SELECT 
    COUNT(*) as total_records_for_node
FROM node_status_table 
WHERE NodeName = 'Aviation FM' 
  AND NodeBaseStationName = 'ELDORET';
