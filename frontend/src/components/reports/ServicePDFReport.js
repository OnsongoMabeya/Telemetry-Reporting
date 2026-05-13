/**
 * Service PDF Report Generator
 * 
 * Uses @react-pdf/renderer to create portrait PDF reports with:
 * - Summary table on first page
 * - Per-base-station pages with 2-column metric layout
 * - Dial/gauge visualizations and time-series graphs
 * - Auto-generated narrative
 * 
 * @module components/reports/ServicePDFReport
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Canvas
} from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333'
  },
  // Header
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #30a1e4',
    paddingBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#163d90',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3
  },
  metaInfo: {
    fontSize: 9,
    color: '#999',
    marginTop: 8
  },
  
  // Summary Table
  summarySection: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#30a1e4',
    marginBottom: 10,
    backgroundColor: '#f5f9ff',
    padding: 8,
    borderRadius: 4
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 25,
    alignItems: 'center'
  },
  tableHeader: {
    backgroundColor: '#30a1e4',
    color: 'white',
    fontWeight: 'bold'
  },
  tableCell: {
    padding: 6,
    fontSize: 9
  },
  colMetric: { width: '25%' },
  colValue: { width: '15%', textAlign: 'center' },
  colUnit: { width: '10%', textAlign: 'center' },
  colNode: { width: '25%' },
  colBase: { width: '25%' },
  
  // Base Station Page
  baseStationHeader: {
    backgroundColor: '#f5f9ff',
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
    borderLeft: '4 solid #30a1e4'
  },
  baseStationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#163d90'
  },
  nodeInfo: {
    fontSize: 10,
    color: '#666',
    marginTop: 3
  },
  
  // Metrics Grid (2-column layout)
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15
  },
  metricCard: {
    width: '48%',
    border: '1 solid #e0e0e0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1 solid #f0f0f0'
  },
  metricName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333'
  },
  viewTypeBadge: {
    fontSize: 7,
    padding: '2 6',
    borderRadius: 10,
    color: 'white'
  },
  dialBadge: {
    backgroundColor: '#ff9800'
  },
  graphBadge: {
    backgroundColor: '#30a1e4'
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTop: '1 solid #f0f0f0'
  },
  statItem: {
    textAlign: 'center'
  },
  statLabel: {
    fontSize: 7,
    color: '#999',
    marginBottom: 2
  },
  statValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333'
  },
  
  // Visualization Areas
  chartContainer: {
    height: 140,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 4
  },
  
  dialContainer: {
    height: 100,
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  sparklineContainer: {
    height: 60,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    marginTop: 8
  },
  
  // Current Value Display
  currentValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#30a1e4',
    textAlign: 'center',
    marginTop: 4
  },
  unit: {
    fontSize: 10,
    color: '#666'
  },
  
  // Narrative Section
  narrativeSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    borderLeft: '3 solid #4caf50'
  },
  narrativeTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 8
  },
  narrativeText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: '#555'
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTop: '1 solid #e0e0e0',
    paddingTop: 8
  },
  pageNumber: {
    fontSize: 8,
    color: '#999'
  }
});

/**
 * Render a smooth area line chart using PDF Canvas with X/Y axis labels
 * @param {Array} data - Array of {sample_time, value} objects
 * @param {string} color - Line color
 * @returns {ReactElement} Canvas element
 */
const SimpleLineChart = ({ data, color = '#30a1e4', unit = '' }) => {
  if (!data || data.length < 2) {
    return (
      <View style={styles.chartContainer}>
        <Text style={{ textAlign: 'center', marginTop: 50, color: '#999', fontSize: 9 }}>
          Insufficient data for chart
        </Text>
      </View>
    );
  }

  // Downsample to max 150 points for cleaner visualization
  const maxPoints = 150;
  const rawData = data.filter(d => d.value !== null && !isNaN(parseFloat(d.value)));
  
  if (rawData.length < 2) {
    return (
      <View style={styles.chartContainer}>
        <Text style={{ textAlign: 'center', marginTop: 50, color: '#999', fontSize: 9 }}>
          Insufficient data for chart
        </Text>
      </View>
    );
  }
  
  let chartData = rawData;
  if (rawData.length > maxPoints) {
    const step = Math.ceil(rawData.length / maxPoints);
    chartData = rawData.filter((_, i) => i % step === 0);
  }
  
  const values = chartData.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
  if (values.length === 0) {
    return (
      <View style={[styles.sparklineContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 10, color: '#999' }}>No data available</Text>
      </View>
    );
  }
  const min = 0;
  const max = Math.max(...values);
  const range = max > min ? max - min : 1;
  const baseline = 0;
  
  // Get time range for X-axis
  const firstTime = new Date(chartData[0].sample_time);
  const lastTime = new Date(chartData[chartData.length - 1].sample_time);

  return (
    <View style={styles.chartContainer}>
      <Canvas
        paint={(pdfDoc, width, height) => {
          const padding = { top: 20, right: 20, bottom: 35, left: 45 };
          const chartWidth = width - padding.left - padding.right;
          const chartHeight = height - padding.top - padding.bottom;
          
          // Calculate coordinates
          const getX = (index) => padding.left + (chartWidth * index / (values.length - 1));
          const getY = (value) => padding.top + chartHeight - ((value - baseline) / (max - baseline) * chartHeight);
          
          // Draw Y-axis grid lines and labels (5 lines)
          pdfDoc.strokeColor('#e0e0e0').lineWidth(0.5);
          pdfDoc.fontSize(7).fillColor('#666');
          
          for (let i = 0; i <= 4; i++) {
            const value = min + (range * i / 4);
            const y = padding.top + chartHeight - ((value - baseline) / (max - baseline) * chartHeight);
            
            // Grid line
            pdfDoc.moveTo(padding.left, y);
            pdfDoc.lineTo(width - padding.right, y);
            pdfDoc.stroke();
            
            // Y-axis label
            const labelY = y - 3;
            pdfDoc.text(value.toFixed(0), padding.left - 40, labelY, { width: 35, align: 'right' });
          }
          
          // Draw X-axis line
          pdfDoc.strokeColor('#cccccc').lineWidth(1);
          pdfDoc.moveTo(padding.left, padding.top + chartHeight);
          pdfDoc.lineTo(width - padding.right, padding.top + chartHeight);
          pdfDoc.stroke();
          
          // X-axis labels (start, middle, end times)
          pdfDoc.fontSize(6).fillColor('#666');
          
          // Calculate time range
          
          // Format function - always show full date and time
          const formatLabel = (date) => {
            return date.toLocaleString('en-GB', { 
              day: '2-digit', 
              month: 'short',
              hour: '2-digit', 
              minute: '2-digit'
            });
          };
          
          // Start time
          const startLabel = formatLabel(firstTime);
          pdfDoc.text(startLabel, padding.left, padding.top + chartHeight + 8);
          
          // End time
          const endLabel = formatLabel(lastTime);
          pdfDoc.text(endLabel, width - padding.right - 25, padding.top + chartHeight + 8);
          
          // Middle time
          if (chartData.length > 10) {
            const midIndex = Math.floor(chartData.length / 2);
            const midTime = new Date(chartData[midIndex].sample_time);
            const midLabel = formatLabel(midTime);
            pdfDoc.text(midLabel, padding.left + chartWidth / 2 - 10, padding.top + chartHeight + 8);
          }
          
          // Draw area fill under the line (semi-transparent)
          pdfDoc.fillColor(color).fillOpacity(0.15);
          pdfDoc.moveTo(getX(0), padding.top + chartHeight);
          
          values.forEach((value, index) => {
            pdfDoc.lineTo(getX(index), getY(value));
          });
          
          pdfDoc.lineTo(getX(values.length - 1), padding.top + chartHeight);
          pdfDoc.fill();
          
          // Reset opacity for line
          pdfDoc.fillOpacity(1);
          
          // Draw smooth line
          pdfDoc.strokeColor(color).lineWidth(2);
          pdfDoc.moveTo(getX(0), getY(values[0]));
          
          for (let i = 1; i < values.length; i++) {
            pdfDoc.lineTo(getX(i), getY(values[i]));
          }
          
          pdfDoc.stroke();
          
          // Y-axis label (use unit if provided)
          pdfDoc.fontSize(6).fillColor('#888');
          pdfDoc.text(unit || 'Value', padding.left - 35, padding.top - 12, { width: 30, align: 'center' });
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

/**
 * Render a semicircular dial gauge using line segments
 * @param {number} value - Current value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} color - Gauge color
 */
const SimpleGauge = ({ value, min, max, color = '#30a1e4', unit = '' }) => {
  // Ensure valid numbers with defaults
  const safeValue = (typeof value === 'number' && !isNaN(value)) ? value : 0;
  const safeMin = (typeof min === 'number' && !isNaN(min)) ? min : 0;
  const safeMax = (typeof max === 'number' && !isNaN(max) && max > safeMin) ? max : safeMin + 100;
  
  const normalized = Math.max(0, Math.min(100, ((safeValue - safeMin) / (safeMax - safeMin)) * 100));
  
  return (
    <View style={styles.dialContainer}>
      <Canvas
        paint={(pdfDoc, width, height) => {
          const centerX = width / 2;
          const centerY = height - 15;
          const radius = 55;
          const innerRadius = 40;
          
          // Helper to convert polar to cartesian
          const polarToCartesian = (r, angleDeg) => {
            const angleRad = (angleDeg * Math.PI) / 180;
            return {
              x: centerX + r * Math.cos(angleRad),
              y: centerY - r * Math.sin(angleRad)
            };
          };
          
          // Draw background arc (180 degrees, left to right)
          const bgSegments = 60;
          for (let i = 0; i <= bgSegments; i++) {
            const angle = 180 - (i / bgSegments) * 180; // 180 to 0 degrees
            const outer = polarToCartesian(radius, angle);
            const inner = polarToCartesian(innerRadius, angle);
            
            pdfDoc.strokeColor('#e0e0e0').lineWidth(3);
            pdfDoc.moveTo(inner.x, inner.y);
            pdfDoc.lineTo(outer.x, outer.y);
            pdfDoc.stroke();
          }
          
          // Draw value arc (colored portion)
          const valueSegments = Math.floor((normalized / 100) * bgSegments);
          for (let i = 0; i <= valueSegments; i++) {
            const angle = 180 - (i / bgSegments) * 180;
            const outer = polarToCartesian(radius, angle);
            const inner = polarToCartesian(innerRadius, angle);
            
            pdfDoc.strokeColor(color).lineWidth(3);
            pdfDoc.moveTo(inner.x, inner.y);
            pdfDoc.lineTo(outer.x, outer.y);
            pdfDoc.stroke();
          }
          
          // Draw needle
          const needleAngle = 180 - (normalized / 100) * 180;
          const needleEnd = polarToCartesian(radius + 5, needleAngle);
          
          pdfDoc.strokeColor('#333').lineWidth(2);
          pdfDoc.moveTo(centerX, centerY);
          pdfDoc.lineTo(needleEnd.x, needleEnd.y);
          pdfDoc.stroke();
          
          // Needle pivot circle
          pdfDoc.fillColor('#333');
          pdfDoc.rect(centerX - 3, centerY - 3, 6, 6).fill();
          
          // Min/Max labels
          pdfDoc.fontSize(7).fillColor('#666');
          pdfDoc.text(min.toString(), centerX - radius - 10, centerY + 5);
          pdfDoc.text(max.toString(), centerX + radius - 5, centerY + 5);
        }}
        style={{ width: 140, height: 80 }}
      />
      <Text style={[styles.currentValue, { marginTop: 4 }]}>
        {value !== null ? value.toFixed(2) : 'N/A'} {unit}
      </Text>
    </View>
  );
};

/**
 * Summary Table Component
 */
const SummaryTable = ({ summaryTable }) => (
  <View style={styles.summarySection}>
    <Text style={styles.sectionTitle}>Summary — Latest Values</Text>
    <View style={styles.table}>
      {/* Table Header */}
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.tableCell, styles.colMetric]}>Metric</Text>
        <Text style={[styles.tableCell, styles.colValue]}>Latest</Text>
        <Text style={[styles.tableCell, styles.colUnit]}>Unit</Text>
        <Text style={[styles.tableCell, styles.colNode]}>Node</Text>
        <Text style={[styles.tableCell, styles.colBase]}>Base Station</Text>
      </View>
      
      {/* Table Rows */}
      {summaryTable.map((row, index) => (
        <View key={index} style={[styles.tableRow, index % 2 === 1 && { backgroundColor: '#f9f9f9' }]}>
          <Text style={[styles.tableCell, styles.colMetric]}>{row.display_name}</Text>
          <Text style={[styles.tableCell, styles.colValue, { color: '#30a1e4', fontWeight: 'bold' }]}>
            {row.latest !== null ? row.latest.toFixed(2) : 'N/A'}
          </Text>
          <Text style={[styles.tableCell, styles.colUnit]}>{row.unit}</Text>
          <Text style={[styles.tableCell, styles.colNode, { fontSize: 8 }]}>{row.node_name}</Text>
          <Text style={[styles.tableCell, styles.colBase, { fontSize: 8 }]}>{row.base_station_name}</Text>
        </View>
      ))}
    </View>
  </View>
);

/**
 * Metric Card Component
 */
const MetricCard = ({ metric }) => {
  const { display_name, unit, stats, threshold_value, telemetry } = metric;
  const min = stats?.min ?? 0;
  const max = stats?.max ?? 100;
  const avg = stats?.avg ?? 0;
  const latest = stats?.latest ?? 0;

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricName}>{display_name}</Text>
        <Text style={[
          styles.viewTypeBadge,
          metric.view_type === 'dial' ? styles.dialBadge : styles.graphBadge
        ]}>
          {metric.view_type === 'dial' ? 'DIAL' : 'GRAPH'}
      </Text>
    </View>
    
    {/* Source info */}
    <Text style={{ fontSize: 8, color: '#999', marginBottom: 6 }}>
      {metric.node_name} → {metric.base_station_name}
    </Text>
    
    {metric.view_type === 'dial' ? (
      <>
        {/* Dial View - Just the gauge, no sparkline to save space */}
        <SimpleGauge
          value={metric.stats.latest}
          min={metric.min_value}
          max={metric.max_value}
          color={metric.color || '#30a1e4'}
          unit={metric.unit}
        />
      </>
    ) : (
      <>
        {/* Graph View - Full height chart */}
        <SimpleLineChart data={metric.data} color={metric.color || '#30a1e4'} unit={metric.unit} />
      </>
    )}
    
    {/* Stats */}
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Min</Text>
        <Text style={styles.statValue}>{metric.stats.min !== null ? metric.stats.min.toFixed(2) : 'N/A'}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Max</Text>
        <Text style={styles.statValue}>{metric.stats.max !== null ? metric.stats.max.toFixed(2) : 'N/A'}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Avg</Text>
        <Text style={styles.statValue}>{metric.stats.avg !== null ? metric.stats.avg.toFixed(2) : 'N/A'}</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statLabel}>Latest</Text>
        <Text style={[styles.statValue, { color: metric.color || '#30a1e4' }]}>
          {metric.stats.latest !== null ? metric.stats.latest.toFixed(2) : 'N/A'}
        </Text>
      </View>
    </View>
  </View>
);
};

/**
 * Generate narrative text for base station metrics
 */
const generateNarrative = (baseStation) => {
  const metrics = baseStation.metrics;
  if (!metrics || metrics.length === 0) return null;
  
  const lines = [];
  lines.push(`Base station "${baseStation.base_station_name}" (Node: ${baseStation.node_name}) monitoring overview:`);
  lines.push('');
  
  metrics.forEach(metric => {
    const latest = metric.stats?.latest;
    const min = metric.stats?.min;
    const max = metric.stats?.max;
    const avg = metric.stats?.avg;
    const threshold = metric.threshold_value;
    const unit = metric.unit || '';
    
    // Skip metrics with no data
    if (latest === null || latest === undefined || isNaN(latest)) return;
    
    let status = 'normal';
    if (threshold && latest > threshold) {
      status = 'above threshold';
    } else if (threshold && latest < threshold * 0.5) {
      status = 'below expected range';
    }
    
    const safeMin = (min !== null && min !== undefined && !isNaN(min)) ? min.toFixed(2) : 'N/A';
    const safeMax = (max !== null && max !== undefined && !isNaN(max)) ? max.toFixed(2) : 'N/A';
    const safeAvg = (avg !== null && avg !== undefined && !isNaN(avg)) ? avg.toFixed(2) : 'N/A';
    
    lines.push(`• ${metric.display_name}: Current value ${latest.toFixed(2)}${unit} (${status}). ` +
               `Range: ${safeMin}${unit} - ${safeMax}${unit}, Average: ${safeAvg}${unit}.`);
  });
  
  lines.push('');
  lines.push('All metrics are being monitored continuously. Data represents the selected time period.');
  
  return lines.join('\n');
};

/**
 * Group base stations by service
 */
const groupByService = (baseStations) => {
  const grouped = {};
  baseStations.forEach(bs => {
    const serviceName = bs.service_name || 'Unknown Service';
    if (!grouped[serviceName]) {
      grouped[serviceName] = [];
    }
    grouped[serviceName].push(bs);
  });
  return grouped;
};

/**
 * Main Service Report Document Component
 */
const ServiceReportDocument = ({ reportData }) => {
  const { reportInfo, summaryTable, baseStations } = reportData;
  const generatedDate = new Date(reportInfo.generatedAt).toLocaleString();
  const isClientReport = reportInfo.report_type === 'client_comprehensive';
  
  // Group by service for client reports
  const servicesGrouped = isClientReport ? groupByService(baseStations) : null;
  const serviceNames = isClientReport ? Object.keys(servicesGrouped) : [];
  
  // Calculate total pages
  const totalPages = isClientReport 
    ? 1 + baseStations.length  // Cover + service/base station pages
    : baseStations.length + 1;
  
  return (
    <Document>
      {/* Page 1: Header + Summary Table */}
      <Page key="page1" size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          {isClientReport ? (
            <>
              <Text style={styles.title}>{reportInfo.clientName} Report</Text>
              <Text style={styles.subtitle}>Client Telemetry Report — All Services</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>{reportInfo.clientName} — {reportInfo.serviceName} Report</Text>
              <Text style={styles.subtitle}>Service Telemetry Report</Text>
            </>
          )}
          <Text style={styles.metaInfo}>
            Generated: {generatedDate} | Time Range: {reportInfo.timeRange.label} ({new Date(reportInfo.timeRange.start).toLocaleDateString()} — {new Date(reportInfo.timeRange.end).toLocaleDateString()})
          </Text>
        </View>
        
        <SummaryTable summaryTable={summaryTable} />
        
        <Text style={[styles.sectionTitle, { marginTop: 15 }]}>
          Report Contents: {reportData.totalMetrics} metrics from {reportData.totalBaseStations} base station(s)
          {isClientReport && ` across ${serviceNames.length} services`}
        </Text>
        
        {isClientReport ? (
          // Client report: Show services with their base stations
          serviceNames.map((serviceName, sIdx) => (
            <View key={sIdx} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#163d90', marginBottom: 5 }}>
                {serviceName}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {servicesGrouped[serviceName].map((bs, idx) => (
                  <View key={idx} style={{ width: '31%', padding: 6, backgroundColor: '#f5f9ff', borderRadius: 4 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 8, color: '#163d90' }}>{bs.base_station_name}</Text>
                    <Text style={{ fontSize: 7, color: '#666' }}>{bs.node_name}</Text>
                    <Text style={{ fontSize: 7, marginTop: 2, color: '#999' }}>
                      {bs.metrics.length} metric{bs.metrics.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          // Service report: Show all base stations flat
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {baseStations.map((bs, idx) => (
              <View key={idx} style={{ width: '32%', padding: 8, backgroundColor: '#f5f9ff', borderRadius: 4 }}>
                <Text style={{ fontWeight: 'bold', color: '#163d90' }}>{bs.base_station_name}</Text>
                <Text style={{ fontSize: 8, color: '#666' }}>{bs.node_name}</Text>
                <Text style={{ fontSize: 8, marginTop: 4, color: '#999' }}>
                  {bs.metrics.length} metric{bs.metrics.length !== 1 ? 's' : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        <Text style={styles.footer}>
          BSI Telemetry Reporting System • Page 1 of {totalPages}
        </Text>
      </Page>
      
      {/* Pages for each service and base station (client report) */}
      {isClientReport ? (
        serviceNames.map((serviceName) => 
          servicesGrouped[serviceName].map((baseStation, pageIndex) => {
            const globalPageIndex = baseStations.findIndex(bs => 
              bs.service_name === serviceName && bs.base_station_name === baseStation.base_station_name
            ) + 1;
            
            return (
              <Page key={`${serviceName}-${pageIndex}`} size="A4" orientation="portrait" style={styles.page}>
                {/* Service Header */}
                <View style={{ backgroundColor: '#163d90', padding: 10, marginBottom: 10 }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{serviceName}</Text>
                </View>
                
                {/* Base Station Header */}
                <View style={styles.baseStationHeader}>
                  <Text style={styles.baseStationName}>{serviceName} — {baseStation.base_station_name}</Text>
                  <Text style={styles.nodeInfo}>Node: {baseStation.node_name}</Text>
                </View>
                
                {/* 2-Column Grid of Metrics */}
                <View style={styles.metricsGrid}>
                  {baseStation.metrics.map((metric, mIndex) => (
                    <MetricCard key={mIndex} metric={metric} />
                  ))}
                </View>
                
                {/* Per-base-station Narrative */}
                <View style={styles.narrativeSection}>
                  <Text style={styles.narrativeTitle}>Data Analysis & Narrative</Text>
                  <Text style={styles.narrativeText}>{generateNarrative(baseStation)}</Text>
                </View>
                
                <Text style={styles.footer}>
                  BSI Telemetry Reporting System • Page {globalPageIndex + 1} of {totalPages}
                </Text>
              </Page>
            );
          })
        )
      ) : (
        // Service report pages (original structure)
        baseStations.map((baseStation, pageIndex) => (
          <Page key={pageIndex} size="A4" orientation="portrait" style={styles.page}>
            <View style={styles.baseStationHeader}>
              <Text style={styles.baseStationName}>{baseStation.base_station_name}</Text>
              <Text style={styles.nodeInfo}>Node: {baseStation.node_name}</Text>
            </View>
            
            {/* 2-Column Grid of Metrics */}
            <View style={styles.metricsGrid}>
              {baseStation.metrics.map((metric, mIndex) => (
                <MetricCard key={mIndex} metric={metric} />
              ))}
            </View>
            
            {/* Per-base-station Narrative */}
            {baseStation.narrative && (
              <View style={styles.narrativeSection}>
                <Text style={styles.narrativeTitle}>Data Analysis & Narrative</Text>
                <Text style={styles.narrativeText}>{baseStation.narrative}</Text>
              </View>
            )}
            
            <Text style={styles.footer}>
              BSI Telemetry Reporting System • Page {pageIndex + 2} of {totalPages}
            </Text>
          </Page>
        ))
      )}
    </Document>
  );
};

/**
 * Generate PDF blob from report data
 * @param {Object} reportData - Report data from API
 * @returns {Blob} PDF blob
 */
export const generateServicePDF = async (reportData) => {
  const blob = await pdf(<ServiceReportDocument reportData={reportData} />).toBlob();
  return blob;
};

export default ServiceReportDocument;
