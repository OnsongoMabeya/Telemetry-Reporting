/**
 * ServiceReportDocument - Backend PDF renderer
 * Full-feature port of frontend/src/components/reports/ServicePDFReport.js
 * Produces identical output to manual downloads: graphs, gauges, merged groups, BSI branding.
 */
const React = require('react');
const path = require('path');
const fs = require('fs');
const { Document, Page, Text, View, StyleSheet, Canvas, Image } = require('@react-pdf/renderer');

// Embed BSI logo as base64 so it works in Node.js without webpack
const logoPath = path.join(__dirname, '../../frontend/src/assets/images/bsilogo512.png');
const BSILogoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : null;

// ---------------------------------------------------------------------------
// Styles — exact mirror of frontend ServicePDFReport.js
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { marginBottom: 20, backgroundColor: '#0a1628', padding: 15, borderRadius: 4 },
  headerWithLogo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logo: { height: 60, marginRight: 12 },
  titleSection: { flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 3 },
  subtitle: { fontSize: 11, color: '#a0c4e8', marginBottom: 2 },
  preparedBy: { fontSize: 9, color: '#64b5f6', marginTop: 4 },
  metaInfo: { fontSize: 9, color: '#8aa3c7', marginTop: 6 },
  summarySection: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#30a1e4', marginBottom: 10, backgroundColor: '#f5f9ff', padding: 8, borderRadius: 4 },
  table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#e0e0e0' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', minHeight: 25, alignItems: 'center' },
  tableHeader: { backgroundColor: '#30a1e4', color: 'white', fontWeight: 'bold' },
  tableCell: { padding: 6, fontSize: 9 },
  colMetric: { width: '25%' },
  colValue: { width: '15%', textAlign: 'center' },
  colUnit: { width: '10%', textAlign: 'center' },
  colNode: { width: '25%' },
  colBase: { width: '25%' },
  baseStationHeader: { backgroundColor: '#f5f9ff', padding: 12, marginBottom: 15, borderRadius: 4, borderLeft: '4 solid #30a1e4' },
  baseStationName: { fontSize: 16, fontWeight: 'bold', color: '#163d90' },
  nodeInfo: { fontSize: 10, color: '#666', marginTop: 3 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  metricCard: { width: '48%', border: '1 solid #e0e0e0', borderRadius: 6, padding: 12, marginBottom: 10 },
  mergedMetricCard: { width: '100%', border: '1 solid #e0e0e0', borderRadius: 6, padding: 12, marginBottom: 15, backgroundColor: '#fafafa' },
  mergedBadge: { backgroundColor: '#9c27b0' },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1 solid #f0f0f0' },
  metricName: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  viewTypeBadge: { fontSize: 7, padding: '2 6', borderRadius: 10, color: 'white' },
  dialBadge: { backgroundColor: '#ff9800' },
  graphBadge: { backgroundColor: '#30a1e4' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1 solid #f0f0f0' },
  statItem: { textAlign: 'center' },
  statLabel: { fontSize: 7, color: '#999', marginBottom: 2 },
  statValue: { fontSize: 9, fontWeight: 'bold', color: '#333' },
  chartContainer: { height: 140, backgroundColor: '#fafafa', borderRadius: 4, marginTop: 8, marginBottom: 4 },
  dialContainer: { height: 100, marginTop: 8, marginBottom: 4, alignItems: 'center', justifyContent: 'flex-end' },
  currentValue: { fontSize: 18, fontWeight: 'bold', color: '#30a1e4', textAlign: 'center', marginTop: 4 },
  narrativeSection: { marginTop: 20, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 4, borderLeft: '3 solid #4caf50' },
  narrativeTitle: { fontSize: 11, fontWeight: 'bold', color: '#4caf50', marginBottom: 8 },
  narrativeText: { fontSize: 9, lineHeight: 1.5, color: '#555' },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#999', borderTop: '1 solid #e0e0e0', paddingTop: 8 }
});

// ---------------------------------------------------------------------------
// Metric grouping utility (mirrors frontend/src/utils/metricGrouping.js)
// ---------------------------------------------------------------------------
function groupMetricsByView(metrics, viewSettings) {
  const groups = {};
  const individual = [];
  if (!metrics || metrics.length === 0) return { groups, individual };
  metrics.forEach(metric => {
    const vs = viewSettings[metric.metric_mapping_id || metric.id];
    if (vs && vs.view_type === 'merged' && vs.merge_group_id) {
      const gid = vs.merge_group_id;
      if (!groups[gid]) groups[gid] = { groupId: gid, groupName: vs.merge_group_name || 'Merged Metrics', metrics: [] };
      groups[gid].metrics.push(metric);
    } else {
      individual.push(metric);
    }
  });
  return { groups, individual };
}

// ---------------------------------------------------------------------------
// SimpleLineChart — single metric time series with area fill
// ---------------------------------------------------------------------------
function SimpleLineChart({ data, color, unit }) {
  color = color || '#30a1e4';
  unit = unit || '';
  const rawData = (data || []).filter(d => d.value !== null && !isNaN(parseFloat(d.value)));
  if (rawData.length < 2) {
    return React.createElement(View, { style: styles.chartContainer },
      React.createElement(Text, { style: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 9 } }, 'Insufficient data for chart')
    );
  }
  const maxPoints = 150;
  let chartData = rawData;
  if (rawData.length > maxPoints) {
    const step = Math.ceil(rawData.length / maxPoints);
    chartData = rawData.filter((_, i) => i % step === 0);
  }
  const values = chartData.map(d => parseFloat(d.value));
  const min = 0;
  const max = Math.max(...values);
  const range = max > min ? max - min : 1;
  const firstTime = new Date(chartData[0].sample_time);
  const lastTime = new Date(chartData[chartData.length - 1].sample_time);

  return React.createElement(View, { style: styles.chartContainer },
    React.createElement(Canvas, {
      style: { width: '100%', height: '100%' },
      paint: (pdfDoc, width, height) => {
        const padding = { top: 20, right: 20, bottom: 35, left: 45 };
        const cw = width - padding.left - padding.right;
        const ch = height - padding.top - padding.bottom;
        const getX = i => padding.left + cw * i / (values.length - 1);
        const getY = v => padding.top + ch - ((v - 0) / (max - 0 || 1) * ch);

        pdfDoc.strokeColor('#e0e0e0').lineWidth(0.5);
        pdfDoc.fontSize(7).fillColor('#666');
        for (let i = 0; i <= 4; i++) {
          const val = min + (range * i / 4);
          const y = padding.top + ch - (val / (max || 1) * ch);
          pdfDoc.moveTo(padding.left, y).lineTo(width - padding.right, y).stroke();
          pdfDoc.text(val.toFixed(0), padding.left - 40, y - 3, { width: 35, align: 'right' });
        }
        pdfDoc.strokeColor('#cccccc').lineWidth(1);
        pdfDoc.moveTo(padding.left, padding.top + ch).lineTo(width - padding.right, padding.top + ch).stroke();

        const formatLabel = d => d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        pdfDoc.fontSize(6).fillColor('#666');
        pdfDoc.text(formatLabel(firstTime), padding.left, padding.top + ch + 8);
        pdfDoc.text(formatLabel(lastTime), width - padding.right - 25, padding.top + ch + 8);
        if (chartData.length > 10) {
          const mid = Math.floor(chartData.length / 2);
          pdfDoc.text(formatLabel(new Date(chartData[mid].sample_time)), padding.left + cw / 2 - 10, padding.top + ch + 8);
        }

        pdfDoc.fillColor(color).fillOpacity(0.15);
        pdfDoc.moveTo(getX(0), padding.top + ch);
        values.forEach((v, i) => pdfDoc.lineTo(getX(i), getY(v)));
        pdfDoc.lineTo(getX(values.length - 1), padding.top + ch).fill();

        pdfDoc.fillOpacity(1);
        pdfDoc.strokeColor(color).lineWidth(2);
        pdfDoc.moveTo(getX(0), getY(values[0]));
        for (let i = 1; i < values.length; i++) pdfDoc.lineTo(getX(i), getY(values[i]));
        pdfDoc.stroke();

        pdfDoc.fontSize(6).fillColor('#888');
        pdfDoc.text(unit || 'Value', padding.left - 35, padding.top - 12, { width: 30, align: 'center' });
      }
    })
  );
}

// ---------------------------------------------------------------------------
// SimpleGauge — semicircular dial gauge
// ---------------------------------------------------------------------------
function SimpleGauge({ value, min, max, color, unit }) {
  color = color || '#30a1e4'; unit = unit || '';
  const safeValue = (typeof value === 'number' && !isNaN(value)) ? value : 0;
  const safeMin = (typeof min === 'number' && !isNaN(min)) ? min : 0;
  const safeMax = (typeof max === 'number' && !isNaN(max) && max > safeMin) ? max : safeMin + 100;
  const normalized = Math.max(0, Math.min(100, ((safeValue - safeMin) / (safeMax - safeMin)) * 100));

  return React.createElement(View, { style: styles.dialContainer },
    React.createElement(Canvas, {
      style: { width: 140, height: 80 },
      paint: (pdfDoc, width, height) => {
        const cx = width / 2, cy = height - 15, r = 55, ir = 40;
        const toCart = (radius, angleDeg) => {
          const rad = angleDeg * Math.PI / 180;
          return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
        };
        const segs = 60;
        for (let i = 0; i <= segs; i++) {
          const a = 180 - (i / segs) * 180;
          const o = toCart(r, a), inn = toCart(ir, a);
          pdfDoc.strokeColor('#e0e0e0').lineWidth(3).moveTo(inn.x, inn.y).lineTo(o.x, o.y).stroke();
        }
        const valSegs = Math.floor((normalized / 100) * segs);
        for (let i = 0; i <= valSegs; i++) {
          const a = 180 - (i / segs) * 180;
          const o = toCart(r, a), inn = toCart(ir, a);
          pdfDoc.strokeColor(color).lineWidth(3).moveTo(inn.x, inn.y).lineTo(o.x, o.y).stroke();
        }
        const needleAngle = 180 - (normalized / 100) * 180;
        const needleEnd = toCart(r + 5, needleAngle);
        pdfDoc.strokeColor('#333').lineWidth(2).moveTo(cx, cy).lineTo(needleEnd.x, needleEnd.y).stroke();
        pdfDoc.fillColor('#333').rect(cx - 3, cy - 3, 6, 6).fill();
        pdfDoc.fontSize(7).fillColor('#666');
        pdfDoc.text(safeMin.toString(), cx - r - 10, cy + 5);
        pdfDoc.text(safeMax.toString(), cx + r - 5, cy + 5);
      }
    }),
    React.createElement(Text, { style: [styles.currentValue, { marginTop: 4 }] },
      `${value !== null && value !== undefined ? value.toFixed(2) : 'N/A'} ${unit}`
    )
  );
}

// ---------------------------------------------------------------------------
// SimpleMultiLineChart — merged metrics on shared axes
// ---------------------------------------------------------------------------
function SimpleMultiLineChart({ metrics }) {
  if (!metrics || metrics.length === 0) {
    return React.createElement(View, { style: [styles.chartContainer, { height: 180 }] },
      React.createElement(Text, { style: { textAlign: 'center', marginTop: 80, color: '#999', fontSize: 9 } }, 'No data for merged metrics')
    );
  }
  const timestampMap = new Map();
  metrics.forEach((metric, idx) => {
    if (!metric.data || metric.data.length === 0) return;
    metric.data.forEach(point => {
      const ts = new Date(point.sample_time).getTime();
      if (!timestampMap.has(ts)) timestampMap.set(ts, { timestamp: ts, sample_time: point.sample_time });
      timestampMap.get(ts)[`metric_${idx}`] = parseFloat(point.value);
    });
  });
  const sortedData = Array.from(timestampMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  if (sortedData.length < 2) {
    return React.createElement(View, { style: [styles.chartContainer, { height: 180 }] },
      React.createElement(Text, { style: { textAlign: 'center', marginTop: 80, color: '#999', fontSize: 9 } }, 'Insufficient data for chart')
    );
  }
  let allValues = [];
  metrics.forEach((_, idx) => sortedData.forEach(d => { const v = d[`metric_${idx}`]; if (v !== undefined && !isNaN(v)) allValues.push(v); }));
  if (allValues.length === 0) {
    return React.createElement(View, { style: [styles.chartContainer, { height: 180 }] },
      React.createElement(Text, { style: { textAlign: 'center', marginTop: 80, color: '#999', fontSize: 9 } }, 'No valid data points')
    );
  }
  const minVal = 0, maxVal = Math.max(...allValues);
  const sortedMetrics = [...metrics].map((m, idx) => {
    const vals = (m.data || []).map(d => parseFloat(d.value)).filter(v => !isNaN(v));
    return { ...m, idx, maxValue: vals.length > 0 ? Math.max(...vals) : 0 };
  }).sort((a, b) => b.maxValue - a.maxValue);
  const firstTime = new Date(sortedData[0].sample_time);
  const lastTime = new Date(sortedData[sortedData.length - 1].sample_time);

  return React.createElement(View, { style: [styles.chartContainer, { height: 180 }] },
    React.createElement(Canvas, {
      style: { width: '100%', height: '100%' },
      paint: (pdfDoc, width, height) => {
        const padding = { top: 25, right: 20, bottom: 35, left: 50 };
        const cw = width - padding.left - padding.right;
        const ch = height - padding.top - padding.bottom;
        const getX = i => padding.left + cw * i / (sortedData.length - 1);
        const getY = v => padding.top + ch - ((v - minVal) / ((maxVal - minVal) || 1) * ch);
        const range = maxVal - minVal || 1;

        pdfDoc.strokeColor('#e0e0e0').lineWidth(0.5);
        pdfDoc.fontSize(7).fillColor('#666');
        for (let i = 0; i <= 4; i++) {
          const val = minVal + range * i / 4;
          const y = getY(val);
          pdfDoc.moveTo(padding.left, y).lineTo(width - padding.right, y).stroke();
          pdfDoc.text(val.toFixed(val < 10 ? 2 : 0), padding.left - 45, y - 3, { width: 40, align: 'right' });
        }
        pdfDoc.strokeColor('#cccccc').lineWidth(1);
        pdfDoc.moveTo(padding.left, padding.top + ch).lineTo(width - padding.right, padding.top + ch).stroke();

        const fmt = d => d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        pdfDoc.fontSize(6).fillColor('#666');
        pdfDoc.text(fmt(firstTime), padding.left, padding.top + ch + 8);
        pdfDoc.text(fmt(lastTime), width - padding.right - 30, padding.top + ch + 8);
        if (sortedData.length > 10) {
          const mid = Math.floor(sortedData.length / 2);
          pdfDoc.text(fmt(new Date(sortedData[mid].sample_time)), padding.left + cw / 2 - 10, padding.top + ch + 8);
        }

        sortedMetrics.forEach(metric => {
          const col = metric.color || '#30a1e4';
          const vals = sortedData.map((d, i) => ({ x: i, y: d[`metric_${metric.idx}`] })).filter(p => p.y !== undefined && !isNaN(p.y));
          if (vals.length < 2) return;
          pdfDoc.fillColor(col).fillOpacity(0.15);
          pdfDoc.moveTo(getX(vals[0].x), padding.top + ch);
          vals.forEach(p => pdfDoc.lineTo(getX(p.x), getY(p.y)));
          pdfDoc.lineTo(getX(vals[vals.length - 1].x), padding.top + ch).fill();
          pdfDoc.fillOpacity(1).strokeColor(col).lineWidth(3);
          pdfDoc.moveTo(getX(vals[0].x), getY(vals[0].y));
          for (let i = 0; i < vals.length - 1; i++) {
            const p0 = vals[i > 0 ? i - 1 : i], p1 = vals[i], p2 = vals[i + 1], p3 = vals[i + 2 < vals.length ? i + 2 : i + 1];
            const x1 = getX(p1.x), y1 = getY(p1.y), x2 = getX(p2.x), y2 = getY(p2.y);
            const cp1x = x1 + (x2 - getX(p0.x)) / 6, cp1y = y1 + (y2 - getY(p0.y)) / 6;
            const cp2x = x2 - (getX(p3.x) - x1) / 6, cp2y = y2 - (getY(p3.y) - y1) / 6;
            pdfDoc.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
          }
          pdfDoc.stroke();
        });

        let legendX = padding.left;
        const legendY = padding.top - 15;
        sortedMetrics.forEach((metric, idx) => {
          const col = metric.color || '#30a1e4';
          pdfDoc.fillColor(col).rect(legendX, legendY, 8, 8).fill();
          pdfDoc.fontSize(7).fillColor('#333');
          const label = metric.display_name || metric.metric_name || `Metric ${idx + 1}`;
          pdfDoc.text(label, legendX + 12, legendY);
          legendX += label.length * 4 + 35;
        });
      }
    })
  );
}

// ---------------------------------------------------------------------------
// MergedMetricCard — full-width card for merged groups
// ---------------------------------------------------------------------------
function MergedMetricCard({ group }) {
  const { groupName, metrics } = group;
  const chartMetrics = metrics.map(m => ({ data: m.data, dataKey: m.metric_name, color: m.color, unit: m.unit, display_name: m.display_name, metric_name: m.metric_name }));
  const latestValues = metrics.map(m => ({ name: m.display_name || m.metric_name, value: m.stats?.latest, unit: m.unit, color: m.color }));

  return React.createElement(View, { style: styles.mergedMetricCard },
    React.createElement(View, { style: styles.metricHeader },
      React.createElement(Text, { style: styles.metricName }, groupName),
      React.createElement(Text, { style: [styles.viewTypeBadge, styles.mergedBadge] }, 'MERGED')
    ),
    React.createElement(Text, { style: { fontSize: 8, color: '#666', marginBottom: 6 } }, `${metrics.length} metrics combined`),
    React.createElement(SimpleMultiLineChart, { metrics: chartMetrics }),
    React.createElement(View, { style: [styles.statsRow, { flexWrap: 'wrap', gap: 10 }] },
      ...latestValues.map((item, idx) =>
        React.createElement(View, { key: idx, style: styles.statItem },
          React.createElement(Text, { style: [styles.statLabel, { fontSize: 6 }] }, item.name),
          React.createElement(Text, { style: [styles.statValue, { color: item.color || '#30a1e4', fontSize: 9 }] },
            `${item.value !== null && item.value !== undefined ? item.value.toFixed(2) : 'N/A'} ${item.unit || ''}`
          )
        )
      )
    )
  );
}

// ---------------------------------------------------------------------------
// SummaryTable
// ---------------------------------------------------------------------------
function SummaryTable({ summaryTable }) {
  if (!summaryTable || summaryTable.length === 0) return null;
  return React.createElement(View, { style: styles.summarySection },
    React.createElement(Text, { style: styles.sectionTitle }, 'Summary \u2014 Latest Values'),
    React.createElement(View, { style: styles.table },
      React.createElement(View, { style: [styles.tableRow, styles.tableHeader] },
        React.createElement(Text, { style: [styles.tableCell, styles.colMetric] }, 'Metric'),
        React.createElement(Text, { style: [styles.tableCell, styles.colValue] }, 'Latest'),
        React.createElement(Text, { style: [styles.tableCell, styles.colUnit] }, 'Unit'),
        React.createElement(Text, { style: [styles.tableCell, styles.colNode] }, 'Node'),
        React.createElement(Text, { style: [styles.tableCell, styles.colBase] }, 'Base Station')
      ),
      ...summaryTable.map((row, index) =>
        React.createElement(View, { key: index, style: [styles.tableRow, index % 2 === 1 && { backgroundColor: '#f9f9f9' }] },
          React.createElement(Text, { style: [styles.tableCell, styles.colMetric] }, row.display_name || ''),
          React.createElement(Text, { style: [styles.tableCell, styles.colValue, { color: '#30a1e4', fontWeight: 'bold' }] },
            row.latest !== null && row.latest !== undefined ? row.latest.toFixed(2) : 'N/A'
          ),
          React.createElement(Text, { style: [styles.tableCell, styles.colUnit] }, row.unit || ''),
          React.createElement(Text, { style: [styles.tableCell, styles.colNode, { fontSize: 8 }] }, row.node_name || ''),
          React.createElement(Text, { style: [styles.tableCell, styles.colBase, { fontSize: 8 }] }, row.base_station_name || '')
        )
      )
    )
  );
}

// ---------------------------------------------------------------------------
// MetricCard — individual metric (graph or dial)
// ---------------------------------------------------------------------------
function MetricCard({ metric }) {
  const stats = metric.stats || {};
  return React.createElement(View, { style: styles.metricCard },
    React.createElement(View, { style: styles.metricHeader },
      React.createElement(Text, { style: styles.metricName }, metric.display_name || metric.metric_name || 'Metric'),
      React.createElement(Text, { style: [styles.viewTypeBadge, metric.view_type === 'dial' ? styles.dialBadge : styles.graphBadge] },
        metric.view_type === 'dial' ? 'DIAL' : 'GRAPH'
      )
    ),
    React.createElement(Text, { style: { fontSize: 8, color: '#999', marginBottom: 6 } },
      `${metric.node_name || ''} \u2192 ${metric.base_station_name || ''}`
    ),
    metric.view_type === 'dial'
      ? React.createElement(SimpleGauge, { value: stats.latest, min: metric.min_value, max: metric.max_value, color: metric.color, unit: metric.unit })
      : React.createElement(SimpleLineChart, { data: metric.data, color: metric.color, unit: metric.unit }),
    React.createElement(View, { style: styles.statsRow },
      React.createElement(View, { style: styles.statItem },
        React.createElement(Text, { style: styles.statLabel }, 'Min'),
        React.createElement(Text, { style: styles.statValue }, stats.min !== null && stats.min !== undefined ? stats.min.toFixed(2) : 'N/A')
      ),
      React.createElement(View, { style: styles.statItem },
        React.createElement(Text, { style: styles.statLabel }, 'Max'),
        React.createElement(Text, { style: styles.statValue }, stats.max !== null && stats.max !== undefined ? stats.max.toFixed(2) : 'N/A')
      ),
      React.createElement(View, { style: styles.statItem },
        React.createElement(Text, { style: styles.statLabel }, 'Avg'),
        React.createElement(Text, { style: styles.statValue }, stats.avg !== null && stats.avg !== undefined ? stats.avg.toFixed(2) : 'N/A')
      ),
      React.createElement(View, { style: styles.statItem },
        React.createElement(Text, { style: styles.statLabel }, 'Latest'),
        React.createElement(Text, { style: [styles.statValue, { color: metric.color || '#30a1e4' }] },
          stats.latest !== null && stats.latest !== undefined ? stats.latest.toFixed(2) : 'N/A'
        )
      )
    )
  );
}

// ---------------------------------------------------------------------------
// MetricsGridWithMerges — renders merged groups then individual cards
// ---------------------------------------------------------------------------
function MetricsGridWithMerges({ metrics }) {
  const viewSettings = {};
  (metrics || []).forEach(m => {
    viewSettings[m.metric_mapping_id] = {
      view_type: m.merge_group_id ? 'merged' : m.view_type,
      merge_group_id: m.merge_group_id,
      merge_group_name: m.merge_group_name
    };
  });
  const { groups, individual } = groupMetricsByView(metrics || [], viewSettings);
  return React.createElement(View, { style: styles.metricsGrid },
    ...Object.values(groups).map((group, idx) => React.createElement(MergedMetricCard, { key: `merged-${idx}`, group })),
    ...individual.map((metric, idx) => React.createElement(MetricCard, { key: `individual-${idx}`, metric }))
  );
}

// ---------------------------------------------------------------------------
// Narrative generator (mirrors frontend generateNarrative)
// ---------------------------------------------------------------------------
function generateNarrative(baseStation) {
  const metrics = baseStation.metrics;
  if (!metrics || metrics.length === 0) return null;
  const lines = [`Base station "${baseStation.base_station_name}" (Node: ${baseStation.node_name}) monitoring overview:`, ''];
  metrics.forEach(metric => {
    const { latest, min, max, avg } = metric.stats || {};
    if (latest === null || latest === undefined || isNaN(latest)) return;
    const unit = metric.unit || '';
    const sm = (v) => (v !== null && v !== undefined && !isNaN(v)) ? v.toFixed(2) : 'N/A';
    lines.push(`\u2022 ${metric.display_name}: Current ${latest.toFixed(2)}${unit}. Range: ${sm(min)}${unit} \u2013 ${sm(max)}${unit}, Avg: ${sm(avg)}${unit}.`);
  });
  lines.push('', 'All metrics are being monitored continuously. Data represents the selected time period.');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// groupByService — for client reports
// ---------------------------------------------------------------------------
function groupByService(baseStations) {
  const grouped = {};
  (baseStations || []).forEach(bs => {
    const sn = bs.service_name || 'Unknown Service';
    if (!grouped[sn]) grouped[sn] = [];
    grouped[sn].push(bs);
  });
  return grouped;
}

// ---------------------------------------------------------------------------
// Main Document Component
// ---------------------------------------------------------------------------
const ServiceReportDocument = ({ reportData }) => {
  const {
    reportInfo = {},
    summaryTable = [],
    baseStations = []
  } = reportData || {};

  const isClientReport = reportInfo.report_type === 'client_comprehensive';
  const generatedDate = reportInfo.generatedAt ? new Date(reportInfo.generatedAt).toLocaleString() : new Date().toLocaleString();
  const timeRange = reportInfo.timeRange || {};
  const servicesGrouped = isClientReport ? groupByService(baseStations) : null;
  const serviceNames = isClientReport ? Object.keys(servicesGrouped) : [];
  const totalPages = isClientReport ? 1 + baseStations.length : baseStations.length + 1;

  const metaText = `Generated: ${generatedDate} | Time Range: ${timeRange.label || ''} (${timeRange.start ? new Date(timeRange.start).toLocaleDateString() : ''} \u2014 ${timeRange.end ? new Date(timeRange.end).toLocaleDateString() : ''})`;

  return React.createElement(Document, null,
    // Page 1: Header + Summary Table + Contents overview
    React.createElement(Page, { key: 'page1', size: 'A4', orientation: 'portrait', style: styles.page },
      // Header with logo
      React.createElement(View, { style: styles.header },
        React.createElement(View, { style: styles.headerWithLogo },
          BSILogoBase64 && React.createElement(Image, { src: BSILogoBase64, style: styles.logo }),
          React.createElement(View, { style: styles.titleSection },
            isClientReport
              ? React.createElement(React.Fragment, null,
                  React.createElement(Text, { style: styles.title }, `${reportInfo.clientName || 'Client'} Report`),
                  React.createElement(Text, { style: styles.subtitle }, 'Client Telemetry Report \u2014 All Services')
                )
              : React.createElement(React.Fragment, null,
                  React.createElement(Text, { style: styles.title }, `${reportInfo.clientName || ''} \u2014 ${reportInfo.serviceName || 'Service'} Report`),
                  React.createElement(Text, { style: styles.subtitle }, 'Service Telemetry Report')
                ),
            React.createElement(Text, { style: styles.preparedBy }, 'Prepared by Broadcast Solutions International (BSI)')
          )
        ),
        React.createElement(Text, { style: styles.metaInfo }, metaText)
      ),

      React.createElement(SummaryTable, { summaryTable }),

      React.createElement(Text, { style: [styles.sectionTitle, { marginTop: 15 }] },
        `Report Contents: ${reportData.totalMetrics || 0} metrics from ${reportData.totalBaseStations || 0} base station(s)${isClientReport ? ` across ${serviceNames.length} services` : ''}`
      ),

      isClientReport
        ? React.createElement(View, null,
            ...serviceNames.map((serviceName, sIdx) =>
              React.createElement(View, { key: sIdx, style: { marginBottom: 10 } },
                React.createElement(Text, { style: { fontSize: 10, fontWeight: 'bold', color: '#163d90', marginBottom: 5 } }, serviceName),
                React.createElement(View, { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } },
                  ...servicesGrouped[serviceName].map((bs, idx) =>
                    React.createElement(View, { key: idx, style: { width: '31%', padding: 6, backgroundColor: '#f5f9ff', borderRadius: 4 } },
                      React.createElement(Text, { style: { fontWeight: 'bold', fontSize: 8, color: '#163d90' } }, bs.base_station_name),
                      React.createElement(Text, { style: { fontSize: 7, color: '#666' } }, bs.node_name),
                      React.createElement(Text, { style: { fontSize: 7, marginTop: 2, color: '#999' } }, `${bs.metrics.length} metric${bs.metrics.length !== 1 ? 's' : ''}`)
                    )
                  )
                )
              )
            )
          )
        : React.createElement(View, { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } },
            ...baseStations.map((bs, idx) =>
              React.createElement(View, { key: idx, style: { width: '32%', padding: 8, backgroundColor: '#f5f9ff', borderRadius: 4 } },
                React.createElement(Text, { style: { fontWeight: 'bold', color: '#163d90' } }, bs.base_station_name),
                React.createElement(Text, { style: { fontSize: 8, color: '#666' } }, bs.node_name),
                React.createElement(Text, { style: { fontSize: 8, marginTop: 4, color: '#999' } }, `${bs.metrics.length} metric${bs.metrics.length !== 1 ? 's' : ''}`)
              )
            )
          ),

      React.createElement(Text, { style: styles.footer }, `BSI Telemetry Reporting System \u2022 Page 1 of ${totalPages}`)
    ),

    // Per-base-station metric pages
    ...(isClientReport
      ? serviceNames.flatMap(serviceName =>
          servicesGrouped[serviceName].map((baseStation, pageIndex) => {
            const globalIdx = baseStations.findIndex(bs => bs.service_name === serviceName && bs.base_station_name === baseStation.base_station_name) + 1;
            const narrative = generateNarrative(baseStation);
            return React.createElement(Page, { key: `${serviceName}-${pageIndex}`, size: 'A4', orientation: 'portrait', style: styles.page },
              React.createElement(View, { style: { backgroundColor: '#163d90', padding: 10, marginBottom: 10 } },
                React.createElement(Text, { style: { color: 'white', fontSize: 12, fontWeight: 'bold' } }, serviceName)
              ),
              React.createElement(View, { style: styles.baseStationHeader },
                React.createElement(Text, { style: styles.baseStationName }, `${serviceName} \u2014 ${baseStation.base_station_name}`),
                React.createElement(Text, { style: styles.nodeInfo }, `Node: ${baseStation.node_name}`)
              ),
              React.createElement(MetricsGridWithMerges, { metrics: baseStation.metrics }),
              narrative && React.createElement(View, { style: styles.narrativeSection },
                React.createElement(Text, { style: styles.narrativeTitle }, 'Data Analysis & Narrative'),
                React.createElement(Text, { style: styles.narrativeText }, narrative)
              ),
              React.createElement(Text, { style: styles.footer }, `BSI Telemetry Reporting System \u2022 Page ${globalIdx + 1} of ${totalPages}`)
            );
          })
        )
      : baseStations.map((baseStation, pageIndex) => {
          const narrative = generateNarrative(baseStation);
          return React.createElement(Page, { key: pageIndex, size: 'A4', orientation: 'portrait', style: styles.page },
            React.createElement(View, { style: styles.baseStationHeader },
              React.createElement(Text, { style: styles.baseStationName }, baseStation.base_station_name),
              React.createElement(Text, { style: styles.nodeInfo }, `Node: ${baseStation.node_name}`)
            ),
            React.createElement(MetricsGridWithMerges, { metrics: baseStation.metrics }),
            narrative && React.createElement(View, { style: styles.narrativeSection },
              React.createElement(Text, { style: styles.narrativeTitle }, 'Data Analysis & Narrative'),
              React.createElement(Text, { style: styles.narrativeText }, narrative)
            ),
            React.createElement(Text, { style: styles.footer }, `BSI Telemetry Reporting System \u2022 Page ${pageIndex + 2} of ${totalPages}`)
          );
        })
    )
  );
};

module.exports = ServiceReportDocument;
