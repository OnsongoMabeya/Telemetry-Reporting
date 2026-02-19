-- Analyze which database columns have non-null and non-zero values
-- This helps identify which columns contain actual telemetry data

-- Check Analog columns (1-16)
SELECT 
    'Analog Channels' as category,
    SUM(CASE WHEN Analog1Value IS NOT NULL AND Analog1Value != 0 THEN 1 ELSE 0 END) as Analog1_count,
    SUM(CASE WHEN Analog2Value IS NOT NULL AND Analog2Value != 0 THEN 1 ELSE 0 END) as Analog2_count,
    SUM(CASE WHEN Analog3Value IS NOT NULL AND Analog3Value != 0 THEN 1 ELSE 0 END) as Analog3_count,
    SUM(CASE WHEN Analog4Value IS NOT NULL AND Analog4Value != 0 THEN 1 ELSE 0 END) as Analog4_count,
    SUM(CASE WHEN Analog5Value IS NOT NULL AND Analog5Value != 0 THEN 1 ELSE 0 END) as Analog5_count,
    SUM(CASE WHEN Analog6Value IS NOT NULL AND Analog6Value != 0 THEN 1 ELSE 0 END) as Analog6_count,
    SUM(CASE WHEN Analog7Value IS NOT NULL AND Analog7Value != 0 THEN 1 ELSE 0 END) as Analog7_count,
    SUM(CASE WHEN Analog8Value IS NOT NULL AND Analog8Value != 0 THEN 1 ELSE 0 END) as Analog8_count,
    SUM(CASE WHEN Analog9Value IS NOT NULL AND Analog9Value != 0 THEN 1 ELSE 0 END) as Analog9_count,
    SUM(CASE WHEN Analog10Value IS NOT NULL AND Analog10Value != 0 THEN 1 ELSE 0 END) as Analog10_count,
    SUM(CASE WHEN Analog11Value IS NOT NULL AND Analog11Value != 0 THEN 1 ELSE 0 END) as Analog11_count,
    SUM(CASE WHEN Analog12Value IS NOT NULL AND Analog12Value != 0 THEN 1 ELSE 0 END) as Analog12_count,
    SUM(CASE WHEN Analog13Value IS NOT NULL AND Analog13Value != 0 THEN 1 ELSE 0 END) as Analog13_count,
    SUM(CASE WHEN Analog14Value IS NOT NULL AND Analog14Value != 0 THEN 1 ELSE 0 END) as Analog14_count,
    SUM(CASE WHEN Analog15Value IS NOT NULL AND Analog15Value != 0 THEN 1 ELSE 0 END) as Analog15_count,
    SUM(CASE WHEN Analog16Value IS NOT NULL AND Analog16Value != 0 THEN 1 ELSE 0 END) as Analog16_count,
    COUNT(*) as total_rows
FROM node_status_table;

-- Check Digital columns (1-16)
SELECT 
    'Digital Channels' as category,
    SUM(CASE WHEN Digital1Value IS NOT NULL AND Digital1Value != 0 THEN 1 ELSE 0 END) as Digital1_count,
    SUM(CASE WHEN Digital2Value IS NOT NULL AND Digital2Value != 0 THEN 1 ELSE 0 END) as Digital2_count,
    SUM(CASE WHEN Digital3Value IS NOT NULL AND Digital3Value != 0 THEN 1 ELSE 0 END) as Digital3_count,
    SUM(CASE WHEN Digital4Value IS NOT NULL AND Digital4Value != 0 THEN 1 ELSE 0 END) as Digital4_count,
    SUM(CASE WHEN Digital5Value IS NOT NULL AND Digital5Value != 0 THEN 1 ELSE 0 END) as Digital5_count,
    SUM(CASE WHEN Digital6Value IS NOT NULL AND Digital6Value != 0 THEN 1 ELSE 0 END) as Digital6_count,
    SUM(CASE WHEN Digital7Value IS NOT NULL AND Digital7Value != 0 THEN 1 ELSE 0 END) as Digital7_count,
    SUM(CASE WHEN Digital8Value IS NOT NULL AND Digital8Value != 0 THEN 1 ELSE 0 END) as Digital8_count,
    SUM(CASE WHEN Digital9Value IS NOT NULL AND Digital9Value != 0 THEN 1 ELSE 0 END) as Digital9_count,
    SUM(CASE WHEN Digital10Value IS NOT NULL AND Digital10Value != 0 THEN 1 ELSE 0 END) as Digital10_count,
    SUM(CASE WHEN Digital11Value IS NOT NULL AND Digital11Value != 0 THEN 1 ELSE 0 END) as Digital11_count,
    SUM(CASE WHEN Digital12Value IS NOT NULL AND Digital12Value != 0 THEN 1 ELSE 0 END) as Digital12_count,
    SUM(CASE WHEN Digital13Value IS NOT NULL AND Digital13Value != 0 THEN 1 ELSE 0 END) as Digital13_count,
    SUM(CASE WHEN Digital14Value IS NOT NULL AND Digital14Value != 0 THEN 1 ELSE 0 END) as Digital14_count,
    SUM(CASE WHEN Digital15Value IS NOT NULL AND Digital15Value != 0 THEN 1 ELSE 0 END) as Digital15_count,
    SUM(CASE WHEN Digital16Value IS NOT NULL AND Digital16Value != 0 THEN 1 ELSE 0 END) as Digital16_count,
    COUNT(*) as total_rows
FROM node_status_table;

-- Check Output columns (1-16)
SELECT 
    'Output Channels' as category,
    SUM(CASE WHEN Output1Value IS NOT NULL AND Output1Value != 0 THEN 1 ELSE 0 END) as Output1_count,
    SUM(CASE WHEN Output2Value IS NOT NULL AND Output2Value != 0 THEN 1 ELSE 0 END) as Output2_count,
    SUM(CASE WHEN Output3Value IS NOT NULL AND Output3Value != 0 THEN 1 ELSE 0 END) as Output3_count,
    SUM(CASE WHEN Output4Value IS NOT NULL AND Output4Value != 0 THEN 1 ELSE 0 END) as Output4_count,
    SUM(CASE WHEN Output5Value IS NOT NULL AND Output5Value != 0 THEN 1 ELSE 0 END) as Output5_count,
    SUM(CASE WHEN Output6Value IS NOT NULL AND Output6Value != 0 THEN 1 ELSE 0 END) as Output6_count,
    SUM(CASE WHEN Output7Value IS NOT NULL AND Output7Value != 0 THEN 1 ELSE 0 END) as Output7_count,
    SUM(CASE WHEN Output8Value IS NOT NULL AND Output8Value != 0 THEN 1 ELSE 0 END) as Output8_count,
    SUM(CASE WHEN Output9Value IS NOT NULL AND Output9Value != 0 THEN 1 ELSE 0 END) as Output9_count,
    SUM(CASE WHEN Output10Value IS NOT NULL AND Output10Value != 0 THEN 1 ELSE 0 END) as Output10_count,
    SUM(CASE WHEN Output11Value IS NOT NULL AND Output11Value != 0 THEN 1 ELSE 0 END) as Output11_count,
    SUM(CASE WHEN Output12Value IS NOT NULL AND Output12Value != 0 THEN 1 ELSE 0 END) as Output12_count,
    SUM(CASE WHEN Output13Value IS NOT NULL AND Output13Value != 0 THEN 1 ELSE 0 END) as Output13_count,
    SUM(CASE WHEN Output14Value IS NOT NULL AND Output14Value != 0 THEN 1 ELSE 0 END) as Output14_count,
    SUM(CASE WHEN Output15Value IS NOT NULL AND Output15Value != 0 THEN 1 ELSE 0 END) as Output15_count,
    SUM(CASE WHEN Output16Value IS NOT NULL AND Output16Value != 0 THEN 1 ELSE 0 END) as Output16_count,
    COUNT(*) as total_rows
FROM node_status_table;

-- Summary: List only columns with data
SELECT 'Columns with Data Summary' as report;

SELECT 
    'Analog1Value' as column_name,
    COUNT(*) as records_with_data,
    ROUND(AVG(Analog1Value), 2) as avg_value,
    MIN(Analog1Value) as min_value,
    MAX(Analog1Value) as max_value
FROM node_status_table 
WHERE Analog1Value IS NOT NULL AND Analog1Value != 0
HAVING COUNT(*) > 0

UNION ALL

SELECT 
    'Analog2Value' as column_name,
    COUNT(*) as records_with_data,
    ROUND(AVG(Analog2Value), 2) as avg_value,
    MIN(Analog2Value) as min_value,
    MAX(Analog2Value) as max_value
FROM node_status_table 
WHERE Analog2Value IS NOT NULL AND Analog2Value != 0
HAVING COUNT(*) > 0

UNION ALL

SELECT 
    'Analog3Value' as column_name,
    COUNT(*) as records_with_data,
    ROUND(AVG(Analog3Value), 2) as avg_value,
    MIN(Analog3Value) as min_value,
    MAX(Analog3Value) as max_value
FROM node_status_table 
WHERE Analog3Value IS NOT NULL AND Analog3Value != 0
HAVING COUNT(*) > 0

UNION ALL

SELECT 
    'Analog4Value' as column_name,
    COUNT(*) as records_with_data,
    ROUND(AVG(Analog4Value), 2) as avg_value,
    MIN(Analog4Value) as min_value,
    MAX(Analog4Value) as max_value
FROM node_status_table 
WHERE Analog4Value IS NOT NULL AND Analog4Value != 0
HAVING COUNT(*) > 0

UNION ALL

SELECT 
    'Analog5Value' as column_name,
    COUNT(*) as records_with_data,
    ROUND(AVG(Analog5Value), 2) as avg_value,
    MIN(Analog5Value) as min_value,
    MAX(Analog5Value) as max_value
FROM node_status_table 
WHERE Analog5Value IS NOT NULL AND Analog5Value != 0
HAVING COUNT(*) > 0

UNION ALL

SELECT 
    'Analog6Value' as column_name,
    COUNT(*) as records_with_data,
    ROUND(AVG(Analog6Value), 2) as avg_value,
    MIN(Analog6Value) as min_value,
    MAX(Analog6Value) as max_value
FROM node_status_table 
WHERE Analog6Value IS NOT NULL AND Analog6Value != 0
HAVING COUNT(*) > 0

UNION ALL

SELECT 
    'Analog7Value' as column_name,
    COUNT(*) as records_with_data,
    ROUND(AVG(Analog7Value), 2) as avg_value,
    MIN(Analog7Value) as min_value,
    MAX(Analog7Value) as max_value
FROM node_status_table 
WHERE Analog7Value IS NOT NULL AND Analog7Value != 0
HAVING COUNT(*) > 0

UNION ALL

SELECT 
    'Analog8Value' as column_name,
    COUNT(*) as records_with_data,
    ROUND(AVG(Analog8Value), 2) as avg_value,
    MIN(Analog8Value) as min_value,
    MAX(Analog8Value) as max_value
FROM node_status_table 
WHERE Analog8Value IS NOT NULL AND Analog8Value != 0
HAVING COUNT(*) > 0

ORDER BY column_name;
