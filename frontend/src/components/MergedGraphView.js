import React, { useMemo, useCallback } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

/**
 * MergedGraphView - Displays multiple metrics on a single shared graph
 * Each metric shown as a different colored line with area fill beneath
 * Styled to match TelemetryGraph component
 */
const MergedGraphView = ({
  metrics, // Array of { data, title, dataKey, color, unit }
  groupName = 'Merged Metrics',
  isLoading = false,
  timeFilter = '1h'
}) => {
  const theme = useTheme();

  // Sort metrics by their max value so largest values render first (at back)
  const sortedMetrics = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    return [...metrics].map(metric => {
      const values = (metric.data || []).map(item => Number(item[metric.dataKey])).filter(v => !isNaN(v));
      const maxValue = values.length > 0 ? Math.max(...values) : 0;
      return { ...metric, maxValue };
    }).sort((a, b) => b.maxValue - a.maxValue); // Largest first
  }, [metrics]);

  // Determine actual color to use (matching TelemetryGraph logic)
  const getActualColor = useCallback((metric) => {
    const hasCustomColor = !!metric.color;
    return hasCustomColor
      ? metric.color
      : (theme.palette.mode === 'dark' ? '#60a5fa' : '#30a1e4');
  }, [theme.palette.mode]);

  // Transform and merge data from all metrics
  const mergedData = useMemo(() => {
    if (!sortedMetrics || sortedMetrics.length === 0) return [];

    // Collect all timestamps from all metrics
    const timestampMap = new Map();

    sortedMetrics.forEach((metric, metricIndex) => {
      if (!metric.data || metric.data.length === 0) return;

      metric.data.forEach(item => {
        const timestamp = new Date(item.sample_time || item.timestamp).getTime();
        if (isNaN(timestamp)) return;

        if (!timestampMap.has(timestamp)) {
          timestampMap.set(timestamp, { timestamp });
        }

        const point = timestampMap.get(timestamp);
        point[metric.dataKey] = Number(item[metric.dataKey]) || null;
        point[`${metric.dataKey}_metricIndex`] = metricIndex;
      });
    });

    // Convert to array and sort by timestamp
    return Array.from(timestampMap.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [sortedMetrics]);

  // Smart X-axis formatter with Nairobi timezone (matching TelemetryGraph)
  const formatXAxis = useCallback((tickItem) => {
    if (!tickItem) return '';
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return '';

      if (!mergedData || mergedData.length < 2) {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi', hour12: false
        }).format(date);
      }

      const timeRange = mergedData[mergedData.length - 1].timestamp - mergedData[0].timestamp;
      const hours = timeRange / (1000 * 60 * 60);

      if (hours <= 24) {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi', hour12: false
        }).format(date);
      } else if (hours <= 168) {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', timeZone: 'Africa/Nairobi', hour12: false
        }).format(date);
      } else {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi'
        }).format(date);
      }
    } catch (error) {
      return '';
    }
  }, [mergedData]);

  // Calculate Y-axis scale based on all data
  const getYAxisScale = useCallback(() => {
    if (!mergedData || mergedData.length === 0) {
      return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] };
    }

    let allValues = [];
    sortedMetrics.forEach(metric => {
      mergedData.forEach(point => {
        const value = point[metric.dataKey];
        if (value !== null && !isNaN(value)) {
          allValues.push(Number(value));
        }
      });
    });

    if (allValues.length === 0) {
      return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] };
    }

    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    const padding = (max - min) * 0.1 || max * 0.1;

    const domainMin = Math.max(0, min - padding);
    const domainMax = max + padding;

    const step = (domainMax - domainMin) / 4;
    const ticks = [
      domainMin,
      domainMin + step,
      domainMin + step * 2,
      domainMin + step * 3,
      domainMax
    ];

    return { domain: [domainMin, domainMax], ticks };
  }, [mergedData, sortedMetrics]);

  // Y-axis tick formatter (matching TelemetryGraph)
  const formatYAxis = useCallback((value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0);
  }, []);

  // Latest values display for all metrics (compact horizontal row)
  const latestValuesDisplay = useMemo(() => {
    return sortedMetrics.map(metric => {
      const metricData = metric.data || [];
      const latestItem = metricData.length > 0 ? metricData[metricData.length - 1] : null;
      const rawValue = latestItem?.[metric.dataKey];
      const value = rawValue != null && !isNaN(Number(rawValue))
        ? `${formatYAxis(Number(rawValue))}${metric.unit ? ` ${metric.unit}` : ''}`
        : '--';
      const color = getActualColor(metric);
      return { title: metric.title, value, color };
    });
  }, [sortedMetrics, formatYAxis, getActualColor]);

  // Get time domain for X-axis
  const getTimeDomain = useCallback(() => {
    if (!mergedData || mergedData.length === 0) return ['auto', 'auto'];
    const timestamps = mergedData.map(d => d.timestamp);
    return [Math.min(...timestamps), Math.max(...timestamps)];
  }, [mergedData]);

  if (isLoading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        minHeight: 200
      }}>
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!sortedMetrics || sortedMetrics.length === 0) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        minHeight: 200
      }}>
        <Typography variant="body2" color="text.secondary">
          No metrics to display
        </Typography>
      </Box>
    );
  }

  // DEBUG: Log data flow to trace empty graph issue - using JSON to force full expansion
  // eslint-disable-next-line no-console
  console.log('MergedGraphView DEBUG:', JSON.stringify({
    groupName,
    sortedMetricsCount: sortedMetrics.length,
    metrics: sortedMetrics.map(m => ({
      dataKey: m.dataKey,
      dataLength: m.data?.length,
      firstDataKeys: m.data?.[0] ? Object.keys(m.data[0]) : null,
      valueField: m.data?.[0]?.[m.dataKey],  // Does the value exist under dataKey?
    })),
    mergedDataLength: mergedData.length,
    mergedDataFirstPoint: mergedData[0] ? { ...mergedData[0], timestamp: mergedData[0].timestamp.toString() } : null,
  }, null, 2));

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Graph Title & Unit */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {groupName}
        </Typography>
      </Box>

      {/* Multi-line Graph with Area Fills */}
      <Box sx={{ flex: 1, minHeight: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={mergedData}
            margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}
              strokeOpacity={theme.palette.mode === 'dark' ? 0.5 : 0.3}
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke={theme.palette.mode === 'dark' ? '#94a3b8' : theme.palette.text.secondary}
              tick={{ fontSize: 11, fill: theme.palette.mode === 'dark' ? '#cbd5e1' : theme.palette.text.secondary }}
              domain={getTimeDomain()}
              type="number"
              scale="time"
            />
            <YAxis
              stroke={theme.palette.mode === 'dark' ? '#94a3b8' : theme.palette.text.secondary}
              tick={{ fontSize: 11, fill: theme.palette.mode === 'dark' ? '#cbd5e1' : theme.palette.text.secondary }}
              domain={getYAxisScale().domain}
              ticks={getYAxisScale().ticks}
              tickFormatter={formatYAxis}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                color: theme.palette.text.primary,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                fontSize: '0.75rem'
              }}
              labelFormatter={(value) => {
                try {
                  return new Date(value).toLocaleString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    timeZone: 'Africa/Nairobi'
                  });
                } catch {
                  return '';
                }
              }}
              formatter={(value, name) => {
                const metric = sortedMetrics.find(m => m.dataKey === name);
                const unit = metric?.unit || '';
                return [`${formatYAxis(value)} ${unit}`, metric?.title || name];
              }}
            />

            {/* Render areas first (at back), then lines on top */}
            {/* Areas - largest values first so smaller values render on top */}
            {sortedMetrics.map((metric) => {
              const actualColor = getActualColor(metric);
              return (
                <Area
                  key={`area-${metric.dataKey}`}
                  type="monotone"
                  dataKey={metric.dataKey}
                  fill={actualColor}
                  fillOpacity={0.3}
                  stroke="none"
                  isAnimationActive={false}
                />
              );
            })}
            {/* Lines on top of areas */}
            {sortedMetrics.map((metric) => {
              const actualColor = getActualColor(metric);
              return (
                <Line
                  key={`line-${metric.dataKey}`}
                  type="monotone"
                  dataKey={metric.dataKey}
                  name={metric.dataKey}
                  stroke={actualColor}
                  strokeWidth={theme.palette.mode === 'dark' ? 4 : 3}
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: actualColor,
                    stroke: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
                    strokeWidth: 2
                  }}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* Latest Values Row - compact horizontal display like single metric cards */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 0.5, gap: 2, flexWrap: 'wrap' }}>
        {latestValuesDisplay.map((item, index) => (
          <Typography
            key={index}
            variant="caption"
            sx={{ fontWeight: 600, color: item.color }}
          >
            {item.value}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

export default MergedGraphView;
