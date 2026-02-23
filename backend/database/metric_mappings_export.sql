-- Metric Mappings Export
-- Generated: 2026-02-23T11:50:29.399Z
-- Source Database: horiserverlive
-- Total Mappings: 21

-- Clear existing mappings (optional - comment out if you want to keep existing)
-- DELETE FROM metric_mappings;

-- Insert metric mappings
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('Genset02', 'KISUMU', 'MILELE FM Reflected Power', 'Analog1Value', 'W', 0, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('Genset02', 'KISUMU', 'MILELE FM Forward Power', 'Analog2Value', 'W', 1, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('Genset02', 'KISUMU', 'MILELE FM RA Voltage', 'Analog3Value', 'V', 2, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('Genset02', 'KISUMU', 'MILELE FM PA Current', 'Analog4Value', 'A', 3, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('Genset02', 'KISUMU', 'OSIEPE FM Forward Power', 'Analog5Value', 'W', 4, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('Kameme FM', 'LIMURU', 'KAMEME FM Forward Power', 'Analog1Value', 'W', 0, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('Kameme FM', 'LIMURU', 'KAMEME FM PA Voltage', 'Analog3Value', 'V', 2, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('Kameme FM', 'LIMURU', 'KAMEME FM PA Current', 'Analog4Value', 'A', 3, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'MERU', 'MILELE FM Forward Power', 'Analog1Value', 'W', 0, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'MERU', 'MILELE FM PA Voltage', 'Analog3Value', 'V', 2, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'MERU', 'MILELE FM PA Current', 'Analog4Value', 'A', 3, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'MERU', 'MERU FM Forward Power', 'Analog5Value', 'W', 4, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'MERU', 'MERU FM Reflected Power', 'Analog6Value', 'W', 5, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'MERU', 'MERU FM PA Voltage', 'Analog7Value', 'V', 6, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'MERU', 'MERU FM PA Current', 'Analog8Value', 'A', 7, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'Nairobi', 'Forward Power', 'Analog1Value', 'dBm', 1, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'Nairobi', 'Reflected Power', 'Analog2Value', 'dBm', 2, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'Nairobi', 'VSWR', 'Analog3Value', '', 3, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'Nairobi', 'Return Loss', 'Analog4Value', 'dB', 4, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'NYERI', 'Forward Power', 'Analog1Value', 'W', 0, 1, 1);
INSERT INTO metric_mappings (node_name, base_station_name, metric_name, column_name, unit, display_order, is_active, created_by) VALUES ('MediaMax1', 'NYERI', 'Reflected Power', 'Analog2Value', 'W', 0, 1, 1);

-- Summary:
-- Genset02/KISUMU: 5 metric(s)
-- Kameme FM/LIMURU: 3 metric(s)
-- MediaMax1/MERU: 7 metric(s)
-- MediaMax1/Nairobi: 4 metric(s)
-- MediaMax1/NYERI: 2 metric(s)
