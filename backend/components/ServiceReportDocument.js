/**
 * ServiceReportDocument - Backend version for @react-pdf/renderer
 * Generates PDF reports from report data
 */
const React = require('react');
const { Document, Page, Text, View, StyleSheet, Canvas } = require('@react-pdf/renderer');

// BSI Brand Colors
const COLORS = {
  primary: '#0099ff',
  primaryLight: '#ccebff',
  primaryDark: '#004d80',
  gray: '#f5f5f5',
  text: '#333333',
  white: '#ffffff'
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    marginBottom: 20,
    borderRadius: 8
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  headerSubtitle: {
    color: COLORS.primaryLight,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 10,
    borderBottom: `1 solid ${COLORS.primary}`,
    paddingBottom: 5
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  infoLabel: {
    fontSize: 10,
    color: '#666'
  },
  infoValue: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: 'bold'
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  tableHeader: {
    backgroundColor: COLORS.primaryLight,
    flexDirection: 'row',
    padding: 8
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  tableCell: {
    fontSize: 9,
    flex: 1
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    flex: 1,
    color: COLORS.primaryDark
  },
  metricCard: {
    backgroundColor: COLORS.gray,
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary
  },
  metricName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10
  }
});

/**
 * Simple gauge component for dial view
 */
const SimpleGauge = ({ value, min, max, unit }) => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const safeMin = typeof min === 'number' ? min : 0;
  const safeMax = typeof max === 'number' && max > safeMin ? max : safeMin + 100;
  const normalized = Math.max(0, Math.min(100, ((safeValue - safeMin) / (safeMax - safeMin)) * 100));
  
  return (
    React.createElement(View, { style: { alignItems: 'center', marginVertical: 10 } },
      React.createElement(Text, { style: styles.metricValue },
        `${safeValue.toFixed ? safeValue.toFixed(1) : safeValue} ${unit || ''}`
      ),
      React.createElement(Text, { style: { fontSize: 8, color: '#666' } },
        `Range: ${safeMin} - ${safeMax}`
      ),
      React.createElement(Text, { style: { fontSize: 8, color: COLORS.primary } },
        `${normalized.toFixed(0)}% of max`
      )
    )
  );
};

/**
 * Summary Table Component
 */
const SummaryTable = ({ summaryTable }) => {
  if (!summaryTable || summaryTable.length === 0) return null;
  
  return React.createElement(View, { style: styles.section },
    React.createElement(Text, { style: styles.sectionTitle }, 'Summary — Latest Values'),
    React.createElement(View, { style: styles.table },
      // Header
      React.createElement(View, { style: styles.tableHeader },
        React.createElement(Text, { style: [styles.tableCellHeader, { flex: 2 }] }, 'Metric'),
        React.createElement(Text, { style: styles.tableCellHeader }, 'Value'),
        React.createElement(Text, { style: styles.tableCellHeader }, 'Unit'),
        React.createElement(Text, { style: styles.tableCellHeader }, 'Node'),
        React.createElement(Text, { style: styles.tableCellHeader }, 'Base Station')
      ),
      // Rows
      ...summaryTable.map((row, index) => 
        React.createElement(View, { 
          key: index, 
          style: [
            styles.tableRow, 
            index % 2 === 1 && { backgroundColor: '#fafafa' }
          ] 
        },
          React.createElement(Text, { style: [styles.tableCell, { flex: 2 }] }, 
            row.display_name || row.metric_name || 'N/A'
          ),
          React.createElement(Text, { style: [styles.tableCell, { color: COLORS.primary }] }, 
            row.latest !== null && row.latest !== undefined 
              ? row.latest.toFixed(2) 
              : (row.value !== null ? row.value.toFixed(2) : 'N/A')
          ),
          React.createElement(Text, { style: styles.tableCell }, row.unit || ''),
          React.createElement(Text, { style: styles.tableCell }, row.node_name || ''),
          React.createElement(Text, { style: styles.tableCell }, row.base_station_name || '')
        )
      )
    )
  );
};

/**
 * Metric Card Component
 */
const MetricCard = ({ metric }) => {
  const displayName = metric.display_name || metric.metric_name || 'Metric';
  const unit = metric.unit || '';
  const stats = metric.stats || {};
  const min = stats.min !== null ? stats.min : (metric.min_value || 0);
  const max = stats.max !== null ? stats.max : (metric.max_value || 100);
  const latest = stats.latest !== null ? stats.latest : 0;
  const isDial = metric.view_type === 'dial';
  
  return React.createElement(View, { style: styles.metricCard },
    React.createElement(Text, { style: styles.metricName }, displayName),
    React.createElement(Text, { style: { fontSize: 9, color: '#666', marginBottom: 10 } },
      `${metric.node_name || ''} → ${metric.base_station_name || ''}`
    ),
    
    isDial 
      ? React.createElement(SimpleGauge, { value: latest, min, max, unit })
      : React.createElement(Text, { style: { fontSize: 10 } }, 
          `Latest: ${latest !== null ? latest.toFixed(2) : 'N/A'} ${unit}`
        ),
    
    React.createElement(View, { 
      style: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        paddingTop: 8
      } 
    },
      React.createElement(View, null,
        React.createElement(Text, { style: { fontSize: 8, color: '#999' } }, 'Min'),
        React.createElement(Text, { style: { fontSize: 10 } }, 
          min !== null ? min.toFixed(2) : 'N/A'
        )
      ),
      React.createElement(View, null,
        React.createElement(Text, { style: { fontSize: 8, color: '#999' } }, 'Max'),
        React.createElement(Text, { style: { fontSize: 10 } }, 
          max !== null ? max.toFixed(2) : 'N/A'
        )
      ),
      React.createElement(View, null,
        React.createElement(Text, { style: { fontSize: 8, color: '#999' } }, 'Avg'),
        React.createElement(Text, { style: { fontSize: 10 } }, 
          stats.avg !== null ? stats.avg.toFixed(2) : 'N/A'
        )
      )
    )
  );
};

/**
 * Main Service Report Document Component
 */
const ServiceReportDocument = ({ reportData }) => {
  const { 
    isClientReport = false,
    reportInfo = {},
    summaryTable = [],
    baseStations = [],
    services = []
  } = reportData || {};

  const title = reportInfo.reportTitle || 
    (isClientReport 
      ? `${reportInfo.clientName || 'Client'} Report` 
      : `${reportInfo.serviceName || 'Service'} Report`);

  const timeRange = reportInfo.timeRange?.label || reportInfo.time_range || '24h';
  const dateRange = `${reportInfo.startTime || 'N/A'} to ${reportInfo.endTime || 'N/A'}`;

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },
      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.headerTitle }, 'BSI Telemetry'),
        React.createElement(Text, { style: styles.headerTitle, style: { fontSize: 18, marginTop: 5 } }, title),
        React.createElement(Text, { style: styles.headerSubtitle }, 
          `Generated: ${new Date().toLocaleString()}`
        )
      ),

      // Report Info Section
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Report Information'),
        React.createElement(View, { style: styles.infoRow },
          React.createElement(Text, { style: styles.infoLabel }, 'Time Range'),
          React.createElement(Text, { style: styles.infoValue }, timeRange)
        ),
        React.createElement(View, { style: styles.infoRow },
          React.createElement(Text, { style: styles.infoLabel }, 'Date Range'),
          React.createElement(Text, { style: styles.infoValue }, dateRange)
        ),
        isClientReport && reportInfo.clientName && React.createElement(View, { style: styles.infoRow },
          React.createElement(Text, { style: styles.infoLabel }, 'Client'),
          React.createElement(Text, { style: styles.infoValue }, reportInfo.clientName)
        )
      ),

      // Summary Table
      summaryTable.length > 0 && React.createElement(SummaryTable, { summaryTable }),

      // Footer
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, null, 'Broadcasting Services International (BSI)'),
        React.createElement(Text, null, 'BSI Telemetry System - Automated Report'),
        React.createElement(Text, null, `Page 1 of ${Math.ceil((summaryTable.length || 0) / 10) + 1}`)
      )
    ),

    // Additional pages for metrics if needed
    ...(isClientReport && services.length > 0 
      ? services.map((service, sIdx) => 
          service.baseStations?.map((bs, bsIdx) => 
            bs.metrics?.length > 0 && React.createElement(Page, { 
              key: `service-${sIdx}-bs-${bsIdx}`, 
              size: 'A4', 
              style: styles.page 
            },
              React.createElement(View, { style: styles.section },
                React.createElement(Text, { style: styles.sectionTitle }, 
                  `${service.name || 'Service'} - ${bs.node_name || ''} / ${bs.base_station_name || ''}`
                ),
                ...bs.metrics.map((metric, mIdx) => 
                  React.createElement(MetricCard, { key: mIdx, metric })
                )
              )
            )
          )
        ).flat()
      : baseStations.length > 0 
        ? baseStations.map((bs, idx) => 
            bs.metrics?.length > 0 && React.createElement(Page, { 
              key: `bs-${idx}`, 
              size: 'A4', 
              style: styles.page 
            },
              React.createElement(View, { style: styles.section },
                React.createElement(Text, { style: styles.sectionTitle }, 
                  `${bs.node_name || ''} / ${bs.base_station_name || ''}`
                ),
                ...bs.metrics.map((metric, mIdx) => 
                  React.createElement(MetricCard, { key: mIdx, metric })
                )
              )
            )
          )
        : []
    )
  );
};

module.exports = ServiceReportDocument;
