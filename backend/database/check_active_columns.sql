-- Quick check: Which columns have actual data (non-null and non-zero)
-- Run this to see which columns you should use for metric mappings

SET @total_rows = (SELECT COUNT(*) FROM node_status_table);

-- Analog Channels with Data
SELECT 
    'ANALOG CHANNELS WITH DATA' as info,
    '' as column_name,
    '' as records_with_data,
    '' as percentage,
    '' as sample_values;

SELECT 
    CONCAT('Analog', n, 'Value') as column_name,
    COUNT(*) as records_with_data,
    CONCAT(ROUND((COUNT(*) / @total_rows) * 100, 1), '%') as percentage,
    CONCAT('Min: ', ROUND(MIN(value), 2), ', Max: ', ROUND(MAX(value), 2), ', Avg: ', ROUND(AVG(value), 2)) as sample_values
FROM (
    SELECT 1 as n, Analog1Value as value FROM node_status_table WHERE Analog1Value IS NOT NULL AND Analog1Value != 0
    UNION ALL SELECT 2, Analog2Value FROM node_status_table WHERE Analog2Value IS NOT NULL AND Analog2Value != 0
    UNION ALL SELECT 3, Analog3Value FROM node_status_table WHERE Analog3Value IS NOT NULL AND Analog3Value != 0
    UNION ALL SELECT 4, Analog4Value FROM node_status_table WHERE Analog4Value IS NOT NULL AND Analog4Value != 0
    UNION ALL SELECT 5, Analog5Value FROM node_status_table WHERE Analog5Value IS NOT NULL AND Analog5Value != 0
    UNION ALL SELECT 6, Analog6Value FROM node_status_table WHERE Analog6Value IS NOT NULL AND Analog6Value != 0
    UNION ALL SELECT 7, Analog7Value FROM node_status_table WHERE Analog7Value IS NOT NULL AND Analog7Value != 0
    UNION ALL SELECT 8, Analog8Value FROM node_status_table WHERE Analog8Value IS NOT NULL AND Analog8Value != 0
    UNION ALL SELECT 9, Analog9Value FROM node_status_table WHERE Analog9Value IS NOT NULL AND Analog9Value != 0
    UNION ALL SELECT 10, Analog10Value FROM node_status_table WHERE Analog10Value IS NOT NULL AND Analog10Value != 0
    UNION ALL SELECT 11, Analog11Value FROM node_status_table WHERE Analog11Value IS NOT NULL AND Analog11Value != 0
    UNION ALL SELECT 12, Analog12Value FROM node_status_table WHERE Analog12Value IS NOT NULL AND Analog12Value != 0
    UNION ALL SELECT 13, Analog13Value FROM node_status_table WHERE Analog13Value IS NOT NULL AND Analog13Value != 0
    UNION ALL SELECT 14, Analog14Value FROM node_status_table WHERE Analog14Value IS NOT NULL AND Analog14Value != 0
    UNION ALL SELECT 15, Analog15Value FROM node_status_table WHERE Analog15Value IS NOT NULL AND Analog15Value != 0
    UNION ALL SELECT 16, Analog16Value FROM node_status_table WHERE Analog16Value IS NOT NULL AND Analog16Value != 0
) as analog_data
GROUP BY n
HAVING COUNT(*) > 0
ORDER BY n;

-- Digital Channels with Data
SELECT 
    'DIGITAL CHANNELS WITH DATA' as info,
    '' as column_name,
    '' as records_with_data,
    '' as percentage,
    '' as sample_values;

SELECT 
    CONCAT('Digital', n, 'Value') as column_name,
    COUNT(*) as records_with_data,
    CONCAT(ROUND((COUNT(*) / @total_rows) * 100, 1), '%') as percentage,
    CONCAT('Values: ', GROUP_CONCAT(DISTINCT value ORDER BY value)) as sample_values
FROM (
    SELECT 1 as n, Digital1Value as value FROM node_status_table WHERE Digital1Value IS NOT NULL AND Digital1Value != 0
    UNION ALL SELECT 2, Digital2Value FROM node_status_table WHERE Digital2Value IS NOT NULL AND Digital2Value != 0
    UNION ALL SELECT 3, Digital3Value FROM node_status_table WHERE Digital3Value IS NOT NULL AND Digital3Value != 0
    UNION ALL SELECT 4, Digital4Value FROM node_status_table WHERE Digital4Value IS NOT NULL AND Digital4Value != 0
    UNION ALL SELECT 5, Digital5Value FROM node_status_table WHERE Digital5Value IS NOT NULL AND Digital5Value != 0
    UNION ALL SELECT 6, Digital6Value FROM node_status_table WHERE Digital6Value IS NOT NULL AND Digital6Value != 0
    UNION ALL SELECT 7, Digital7Value FROM node_status_table WHERE Digital7Value IS NOT NULL AND Digital7Value != 0
    UNION ALL SELECT 8, Digital8Value FROM node_status_table WHERE Digital8Value IS NOT NULL AND Digital8Value != 0
    UNION ALL SELECT 9, Digital9Value FROM node_status_table WHERE Digital9Value IS NOT NULL AND Digital9Value != 0
    UNION ALL SELECT 10, Digital10Value FROM node_status_table WHERE Digital10Value IS NOT NULL AND Digital10Value != 0
    UNION ALL SELECT 11, Digital11Value FROM node_status_table WHERE Digital11Value IS NOT NULL AND Digital11Value != 0
    UNION ALL SELECT 12, Digital12Value FROM node_status_table WHERE Digital12Value IS NOT NULL AND Digital12Value != 0
    UNION ALL SELECT 13, Digital13Value FROM node_status_table WHERE Digital13Value IS NOT NULL AND Digital13Value != 0
    UNION ALL SELECT 14, Digital14Value FROM node_status_table WHERE Digital14Value IS NOT NULL AND Digital14Value != 0
    UNION ALL SELECT 15, Digital15Value FROM node_status_table WHERE Digital15Value IS NOT NULL AND Digital15Value != 0
    UNION ALL SELECT 16, Digital16Value FROM node_status_table WHERE Digital16Value IS NOT NULL AND Digital16Value != 0
) as digital_data
GROUP BY n
HAVING COUNT(*) > 0
ORDER BY n;

-- Output Channels with Data
SELECT 
    'OUTPUT CHANNELS WITH DATA' as info,
    '' as column_name,
    '' as records_with_data,
    '' as percentage,
    '' as sample_values;

SELECT 
    CONCAT('Output', n, 'Value') as column_name,
    COUNT(*) as records_with_data,
    CONCAT(ROUND((COUNT(*) / @total_rows) * 100, 1), '%') as percentage,
    CONCAT('Min: ', ROUND(MIN(value), 2), ', Max: ', ROUND(MAX(value), 2), ', Avg: ', ROUND(AVG(value), 2)) as sample_values
FROM (
    SELECT 1 as n, Output1Value as value FROM node_status_table WHERE Output1Value IS NOT NULL AND Output1Value != 0
    UNION ALL SELECT 2, Output2Value FROM node_status_table WHERE Output2Value IS NOT NULL AND Output2Value != 0
    UNION ALL SELECT 3, Output3Value FROM node_status_table WHERE Output3Value IS NOT NULL AND Output3Value != 0
    UNION ALL SELECT 4, Output4Value FROM node_status_table WHERE Output4Value IS NOT NULL AND Output4Value != 0
    UNION ALL SELECT 5, Output5Value FROM node_status_table WHERE Output5Value IS NOT NULL AND Output5Value != 0
    UNION ALL SELECT 6, Output6Value FROM node_status_table WHERE Output6Value IS NOT NULL AND Output6Value != 0
    UNION ALL SELECT 7, Output7Value FROM node_status_table WHERE Output7Value IS NOT NULL AND Output7Value != 0
    UNION ALL SELECT 8, Output8Value FROM node_status_table WHERE Output8Value IS NOT NULL AND Output8Value != 0
    UNION ALL SELECT 9, Output9Value FROM node_status_table WHERE Output9Value IS NOT NULL AND Output9Value != 0
    UNION ALL SELECT 10, Output10Value FROM node_status_table WHERE Output10Value IS NOT NULL AND Output10Value != 0
    UNION ALL SELECT 11, Output11Value FROM node_status_table WHERE Output11Value IS NOT NULL AND Output11Value != 0
    UNION ALL SELECT 12, Output12Value FROM node_status_table WHERE Output12Value IS NOT NULL AND Output12Value != 0
    UNION ALL SELECT 13, Output13Value FROM node_status_table WHERE Output13Value IS NOT NULL AND Output13Value != 0
    UNION ALL SELECT 14, Output14Value FROM node_status_table WHERE Output14Value IS NOT NULL AND Output14Value != 0
    UNION ALL SELECT 15, Output15Value FROM node_status_table WHERE Output15Value IS NOT NULL AND Output15Value != 0
    UNION ALL SELECT 16, Output16Value FROM node_status_table WHERE Output16Value IS NOT NULL AND Output16Value != 0
) as output_data
GROUP BY n
HAVING COUNT(*) > 0
ORDER BY n;

-- Summary
SELECT 
    'SUMMARY' as info,
    '' as total_columns_with_data;

SELECT 
    'Total database rows' as metric,
    COUNT(*) as value
FROM node_status_table;
