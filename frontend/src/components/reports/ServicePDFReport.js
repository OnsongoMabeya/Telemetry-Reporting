/**
 * Service PDF Report Generator
 * 
 * Uses @react-pdf/renderer to create landscape PDF reports with:
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
    height: 120,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    marginTop: 8
  },
  sparklineContainer: {
    height: 60,
    backgroundColor: '#fafafa',
    borderRadius: 4,
    marginTop: 8
  },
  
  // Current Value Display
  currentValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#30a1e4',
    textAlign: 'center',
    marginVertical: 8
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
 * Render a simple line chart using PDF Canvas
 * @param {Array} data - Array of {sample_time, value} objects
 * @param {string} color - Line color
 * @returns {ReactElement} Canvas element
 */
const SimpleLineChart = ({ data, color = '#30a1e4' }) => {
  if (!data || data.length < 2) {
    return (
      <View style={styles.chartContainer}>
        <Text style={{ textAlign: 'center', marginTop: 50, color: '#999', fontSize: 9 }}>
          Insufficient data for chart
        </Text>
      </View>
    );
  }

  const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View style={styles.chartContainer}>
      <Canvas
        paint={(pdfDoc, width, height) => {
          const padding = 20;
          const chartWidth = width - padding * 2;
          const chartHeight = height - padding * 2;
          
          // Draw grid lines
          pdfDoc.strokeColor('#e0e0e0').lineWidth(0.5);
          for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight * i / 4);
            pdfDoc.moveTo(padding, y).lineTo(width - padding, y).stroke();
          }
          
          // Draw data line
          pdfDoc.strokeColor(color).lineWidth(2);
          pdfDoc.moveTo(
            padding,
            padding + chartHeight - ((values[0] - min) / range * chartHeight)
          );
          
          values.forEach((value, index) => {
            const x = padding + (chartWidth * index / (values.length - 1));
            const y = padding + chartHeight - ((value - min) / range * chartHeight);
            pdfDoc.lineTo(x, y);
          });
          
          pdfDoc.stroke();
          
          // Draw points
          pdfDoc.fillColor(color);
          values.forEach((value, index) => {
            if (index % Math.ceil(values.length / 20) === 0) { // Show ~20 points max
              const x = padding + (chartWidth * index / (values.length - 1));
              const y = padding + chartHeight - ((value - min) / range * chartHeight);
              pdfDoc.circle(x, y, 2).fill();
            }
          });
        }}
      />
    </View>
  );
};

/**
 * Render a sparkline (mini chart) for dial metrics
 * @param {Array} data - Array of {sample_time, value} objects
 * @param {string} color - Line color
 */
const SparklineChart = ({ data, color = '#30a1e4' }) => {
  if (!data || data.length < 2) {
    return (
      <View style={styles.sparklineContainer}>
        <Text style={{ textAlign: 'center', marginTop: 20, color: '#999', fontSize: 8 }}>
          No trend data
        </Text>
      </View>
    );
  }

  const values = data.map(d => parseFloat(d.value)).filter(v => !isNaN(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View style={styles.sparklineContainer}>
      <Canvas
        paint={(pdfDoc, width, height) => {
          const padding = 8;
          const chartWidth = width - padding * 2;
          const chartHeight = height - padding * 2;
          
          pdfDoc.strokeColor(color).lineWidth(1.5);
          pdfDoc.moveTo(
            padding,
            padding + chartHeight - ((values[0] - min) / range * chartHeight)
          );
          
          values.forEach((value, index) => {
            const x = padding + (chartWidth * index / (values.length - 1));
            const y = padding + chartHeight - ((value - min) / range * chartHeight);
            pdfDoc.lineTo(x, y);
          });
          
          pdfDoc.stroke();
          
          // Area fill (semi-transparent)
          pdfDoc.fillColor(color).fillOpacity(0.1);
          pdfDoc.moveTo(padding, padding + chartHeight);
          values.forEach((value, index) => {
            const x = padding + (chartWidth * index / (values.length - 1));
            const y = padding + chartHeight - ((value - min) / range * chartHeight);
            pdfDoc.lineTo(x, y);
          });
          pdfDoc.lineTo(width - padding, padding + chartHeight);
          pdfDoc.closePath().fill();
        }}
      />
    </View>
  );
};

/**
 * Render a simple horizontal bar gauge visualization
 * @param {number} value - Current value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} color - Gauge color
 */
const SimpleGauge = ({ value, min, max, color = '#30a1e4' }) => {
  const normalized = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const barWidth = 100;
  const barHeight = 8;
  
  return (
    <View style={{ alignItems: 'center', marginVertical: 8, width: 120 }}>
      <Canvas
        paint={(pdfDoc, width, height) => {
          const startX = (width - barWidth) / 2;
          const startY = height * 0.6;
          
          // Background bar (gray)
          pdfDoc.fillColor('#e0e0e0');
          pdfDoc.rect(startX, startY, barWidth, barHeight).fill();
          
          // Value bar (colored)
          if (normalized > 0) {
            const valueWidth = (normalized / 100) * barWidth;
            pdfDoc.fillColor(color);
            pdfDoc.rect(startX, startY, valueWidth, barHeight).fill();
          }
          
          // Border
          pdfDoc.strokeColor('#cccccc').lineWidth(1);
          pdfDoc.rect(startX, startY, barWidth, barHeight).stroke();
          
          // Min/Max labels
          pdfDoc.fontSize(8).fillColor('#666');
          pdfDoc.text(min.toString(), startX, startY + barHeight + 4);
          pdfDoc.text(max.toString(), startX + barWidth - 15, startY + barHeight + 4);
        }}
        style={{ width: 120, height: 40 }}
      />
      <Text style={styles.currentValue}>
        {value !== null ? value.toFixed(2) : 'N/A'}
        <Text style={styles.unit}> {min !== undefined && max !== undefined ? '' : ''}</Text>
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
const MetricCard = ({ metric }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <Text style={styles.metricName}>{metric.display_name}</Text>
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
        {/* Dial View */}
        <SimpleGauge
          value={metric.stats.latest}
          min={metric.min_value}
          max={metric.max_value}
          color={metric.color || '#30a1e4'}
        />
        <SparklineChart data={metric.sparkline} color={metric.color || '#30a1e4'} />
      </>
    ) : (
      <>
        {/* Graph View */}
        <SimpleLineChart data={metric.data} color={metric.color || '#30a1e4'} />
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

/**
 * Main Service Report Document Component
 */
const ServiceReportDocument = ({ reportData }) => {
  const { reportInfo, summaryTable, baseStations, narrative } = reportData;
  const generatedDate = new Date(reportInfo.generatedAt).toLocaleString();
  
  return (
    <Document>
      {/* Page 1: Header + Summary Table */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{reportInfo.clientName} — {reportInfo.serviceName} Report</Text>
          <Text style={styles.subtitle}>Service Telemetry Report</Text>
          <Text style={styles.metaInfo}>
            Generated: {generatedDate} | Time Range: {reportInfo.timeRange.label} ({new Date(reportInfo.timeRange.start).toLocaleDateString()} — {new Date(reportInfo.timeRange.end).toLocaleDateString()})
          </Text>
        </View>
        
        <SummaryTable summaryTable={summaryTable} />
        
        <Text style={[styles.sectionTitle, { marginTop: 15 }]}>
          Report Contents: {reportData.totalMetrics} metrics from {reportData.totalBaseStations} base station(s)
        </Text>
        
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
        
        <Text style={styles.footer}>
          BSI Telemetry Reporting System • Page 1 of {baseStations.length + 1}
        </Text>
      </Page>
      
      {/* Pages for each base station */}
      {baseStations.map((baseStation, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page}>
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
          
          {/* Narrative for this base station (if last page or multiple pages) */}
          {pageIndex === baseStations.length - 1 && narrative && (
            <View style={styles.narrativeSection}>
              <Text style={styles.narrativeTitle}>Data Analysis & Narrative</Text>
              <Text style={styles.narrativeText}>{narrative}</Text>
            </View>
          )}
          
          <Text style={styles.footer}>
            BSI Telemetry Reporting System • Page {pageIndex + 2} of {baseStations.length + 1}
          </Text>
        </Page>
      ))}
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
