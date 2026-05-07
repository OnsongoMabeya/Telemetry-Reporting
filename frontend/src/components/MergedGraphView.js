import React, { useMemo, useCallback } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

/**
 * MergedGraphView - Displays multiple metrics on a single shared graph
 * Each metric shown as a different colored line
 */
const MergedGraphView = ({
  metrics, // Array of { data, title, dataKey, color, unit }
  groupName = 'Merged Metrics',
  isLoading = false,
  timeFilter = '1h'
}) => {
  const theme = useTheme();

  // Transform and merge data from all metrics
  const mergedData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];

    // Collect all timestamps from all metrics
    const timestampMap = new Map();

    metrics.forEach((metric, metricIndex) => {
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
  }, [metrics]);

  // Smart X-axis formatter with Nairobi timezone
  const formatXAxis = useCallback((tickItem) => {
    if (!tickItem) return '';
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return '';

      if (!mergedData || mergedData.length < 2) {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Nairobi',
          hour12: false
        }).format(date);
      }

      const timeRange = mergedData[mergedData.length - 1].timestamp - mergedData[0].timestamp;
      const hours = timeRange / (1000 * 60 * 60);

      if (hours <= 24) {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Nairobi',
          hour12: false
        }).format(date);
      } else if (hours <= 168) {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          timeZone: 'Africa/Nairobi',
          hour12: false
        }).format(date);
      } else {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'Africa/Nairobi'
        }).format(date);
      }
    } catch (error) {
      return '';
    }
  }, [mergedData]);

  // Calculate Y-axis scale based on all data
  const getYAxisScale = useMemo(() => {
    if (!mergedData || mergedData.length === 0) {
      return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] };
    }

    let allValues = [];
    metrics.forEach(metric => {
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
  }, [mergedData, metrics]);

  // Y-axis formatter
  const formatYAxis = useCallback((value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0);
  }, []);

  // Custom legend formatter
  const formatLegend = useCallback((value) => {
    const metric = metrics.find(m => m.dataKey === value);
    return metric ? metric.title : value;
  }, [metrics]);

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

  if (!metrics || metrics.length === 0) {
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

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Group Title */}
      <Box sx={{ mb: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: 'text.primary'
          }}
        >
          {groupName}
        </Typography>
      </Box>

      {/* Multi-line Graph */}
      <Box sx={{ flex: 1, minHeight: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={mergedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
              tick={{
                fontSize: 10,
                fill: theme.palette.mode === 'dark' ? '#cbd5e1' : theme.palette.text.secondary
              }}
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              stroke={theme.palette.mode === 'dark' ? '#94a3b8' : theme.palette.text.secondary}
              tick={{
                fontSize: 10,
                fill: theme.palette.mode === 'dark' ? '#cbd5e1' : theme.palette.text.secondary
              }}
              domain={getYAxisScale.domain}
              ticks={getYAxisScale.ticks}
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
                    timeZone: 'Africa/Nairobi',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                } catch {
                  return value;
                }
              }}
              formatter={(value, name) => {
                const metric = metrics.find(m => m.dataKey === name);
                const unit = metric?.unit || '';
                return [`${formatYAxis(value)} ${unit}`, metric?.title || name];
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '0.7rem',
                paddingTop: '10px'
              }}
              formatter={formatLegend}
            />

            {/* Render a line for each metric */}
            {metrics.map((metric, index) => (
              <Line
                key={metric.dataKey}
                type="monotone"
                dataKey={metric.dataKey}
                name={metric.dataKey}
                stroke={metric.color || theme.palette.primary.main}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={1000}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      {/* Metric summary row */}
      <Box sx={{
        display: 'flex',
        gap: 2,
        mt: 1,
        flexWrap: 'wrap'
      }}>
        {metrics.map((metric, index) => {
          // Get latest value
          const latestData = metric.data && metric.data.length > 0
            ? metric.data[metric.data.length - 1]
            : null;
          const latestValue = latestData
            ? Number(latestData[metric.dataKey])
            : null;

          return (
            <Box
              key={metric.dataKey}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: metric.color || theme.palette.primary.main
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {metric.title}: {latestValue !== null && !isNaN(latestValue)
                  ? `${formatYAxis(latestValue)} ${metric.unit || ''}`
                  : '--'}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default MergedGraphView;
