import React, { useEffect, useMemo, memo, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../context/DashboardContext';
import { 
  Box, 
  Paper, 
  CircularProgress, 
  Alert, 
  useTheme, 
  Button,
  Typography
} from '@mui/material';
import { 
  Settings
} from '@mui/icons-material';
import KenyaMap from './KenyaMap';
import StatusCard from './StatusCard';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import axios from '../services/axiosInterceptor';
import { API_BASE_URL } from '../config/api';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4 }}>
          <Alert severity="error">
            Something went wrong. Please try refreshing the page.
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Helper functions
const getGraphColor = (dataKey) => {
  return '#000000';
};

// Telemetry Graph Component
const TelemetryGraph = memo(({ data, title, dataKey, unit, isLoading, timeFilter, lineColor = '#30a1e4', hasCustomColor = false }) => {
  const theme = useTheme();
  
  // Determine the actual color to use for line and area
  const actualLineColor = hasCustomColor 
    ? lineColor 
    : (theme.palette.mode === 'dark' ? '#60a5fa' : getGraphColor(dataKey));
  
  // Debug: log color info
  if (hasCustomColor) {
    console.log(`Graph ${dataKey}: hasCustomColor=${hasCustomColor}, lineColor=${lineColor}, actualLineColor=${actualLineColor}`);
  }
  
  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return '';
      
      if (!data || data.length < 2) {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Nairobi',
          hour12: false
        }).format(date);
      }
      
      const timeRange = new Date(data[data.length - 1].timestamp) - new Date(data[0].timestamp);
      const hours = timeRange / (1000 * 60 * 60);

      if (hours <= 1) {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Nairobi',
          hour12: false
        }).format(date);
      } else if (hours <= 24) {
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
  };

  const getTimeDomain = useCallback(() => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    const timestamps = data.map(d => d.timestamp);
    return [Math.min(...timestamps), Math.max(...timestamps)];
  }, [data]);

  const getYAxisScale = useCallback(() => {
    if (!data || data.length === 0) {
      return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] };
    }

    const values = data.map(item => Number(item[dataKey]) || 0).filter(v => !isNaN(v));
    if (values.length === 0) {
      return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] };
    }

    const max = Math.max(...values);
    const padding = max * 0.1;
    
    const domainMax = max + padding;
    
    const step = domainMax / 4;
    const ticks = [
      0,
      step,
      step * 2,
      step * 3,
      domainMax
    ];

    return {
      domain: [0, domainMax],
      ticks: ticks
    };
  }, [data, dataKey]);

  const downsampledData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const maxPoints = 200;
    if (data.length <= maxPoints) return data;
    
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
  }, [data]);

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100%"
        minHeight={200}
      >
        <CircularProgress size={40} sx={{ color: lineColor || '#30a1e4' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Graph Title */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {unit}
        </Typography>
      </Box>

      {/* Graph */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={downsampledData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
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
              tickFormatter={(value) => {
                if (dataKey === 'vswr') {
                  return value.toFixed(2);
                } else if (dataKey === 'returnLoss') {
                  return value.toFixed(1);
                } else if (dataKey === 'temperature') {
                  return `${value.toFixed(1)}°C`;
                } else if (dataKey === 'voltage') {
                  return `${value.toFixed(1)}V`;
                } else if (dataKey === 'current') {
                  return `${value.toFixed(2)}A`;
                } else {
                  return value.toFixed(2);
                }
              }}
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
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Africa/Nairobi'
                  });
                } catch (error) {
                  return '';
                }
              }}
              formatter={(value, name) => [
                typeof value === 'number' ? value.toFixed(2) : value,
                unit ? `${name} (${unit})` : name
              ]}
            />
            {hasCustomColor && (
              <Area
                type="monotone"
                dataKey={dataKey}
                fill={actualLineColor}
                fillOpacity={0.3}
                stroke="none"
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={actualLineColor}
              strokeWidth={theme.palette.mode === 'dark' ? 3 : 2}
              dot={false}
              activeDot={{
                r: 6,
                fill: actualLineColor,
                stroke: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
                strokeWidth: 2
              }}
              animationDuration={1500}
              animationEasing="ease-in-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
});

// Main Component
const NodeDetail = () => {
  const theme = useTheme();
  const { isAuthenticated, hasRole } = useAuth();
  
  const {
    setNodes,
    selectedNode,
    setSelectedNode,
    setBaseStations,
    selectedBaseStation,
    setSelectedBaseStation,
    timeFilter,
    telemetryData,
    setTelemetryData,
    isLoading,
    setIsLoading,
    error,
    setError,
    metricMappings,
    setMetricMappings,
    setHasMappings,
  } = useDashboard();

  // State for map status counts
  const [statusCounts, setStatusCounts] = useState({
    onlineCount: 0,
    offlineCount: 0,
    unknownCount: 0
  });

  const handleStatusUpdate = useCallback((counts) => {
    setStatusCounts(counts);
  }, []);

  // Fetch available nodes
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchNodes = async () => {
      setError(null);
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/nodes`);
        
        if (response.data && Array.isArray(response.data)) {
          setNodes(response.data);
          if (response.data.length > 0) {
            setSelectedNode(response.data[0].id);
          } else {
            setError('No nodes available. Please check the backend service.');
          }
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        setError(`Failed to fetch nodes: ${err.message || 'Network error'}`);
      }
    };
    
    fetchNodes();
  }, [isAuthenticated, setNodes, setSelectedNode, setError]);

  // Fetch base stations when a node is selected
  useEffect(() => {
    const fetchBaseStations = async () => {
      if (!selectedNode) {
        setBaseStations([]);
        setSelectedBaseStation(null);
        return;
      }

      setError(null);
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/basestations/${selectedNode}`);

        if (!Array.isArray(response.data)) {
          throw new Error('Invalid base stations data format');
        }

        const formattedStations = response.data;
        setBaseStations(formattedStations);
        
        if (formattedStations.length > 0) {
          setSelectedBaseStation(formattedStations[0].id);
        } else {
          setSelectedBaseStation(null);
          setError('No base stations found for this node.');
        }
      } catch (err) {
        setError(`Failed to fetch base stations: ${err.message}`);
        setBaseStations([]);
        setSelectedBaseStation(null);
      }
    };

    fetchBaseStations();
  }, [selectedNode, setBaseStations, setSelectedBaseStation, setError]);

  // Fetch telemetry data
  const fetchTelemetryData = useCallback(async () => {
    if (!selectedNode || !selectedBaseStation) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/telemetry/${selectedNode}/${selectedBaseStation}`,
        { params: { timeFilter } }
      );

      if (response.data && Array.isArray(response.data.data)) {
        // Transform data: convert sample_time to timestamp
        const transformedData = response.data.data.map(item => {
          const { sample_time, ...rest } = item;
          return {
            ...rest,
            timestamp: new Date(sample_time).getTime()
          };
        });
        
        setTelemetryData(transformedData);
        const mappings = response.data.metricMappings || [];
        setMetricMappings(mappings);
        setHasMappings(mappings.length > 0);
      } else {
        throw new Error('Invalid telemetry data format');
      }
    } catch (err) {
      setError(`Failed to fetch telemetry data: ${err.message}`);
      setTelemetryData([]);
      setMetricMappings([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNode, selectedBaseStation, timeFilter, setIsLoading, setError, setTelemetryData, setMetricMappings, setHasMappings]);

  useEffect(() => {
    if (selectedNode && selectedBaseStation) {
      fetchTelemetryData();
    }
  }, [selectedNode, selectedBaseStation, timeFilter, fetchTelemetryData]);

  // Auto-refresh
  useEffect(() => {
    const getRefreshInterval = () => {
      const intervals = {
        '5m': 10000, '10m': 15000, '30m': 30000,
        '1h': 60000, '2h': 120000, '6h': 300000,
        '1d': 600000, '2d': 1200000, '5d': 1800000,
        '1w': 3600000, '2w': 3600000, '30d': 3600000
      };
      return intervals[timeFilter] || 60000;
    };

    const intervalId = setInterval(fetchTelemetryData, getRefreshInterval());
    return () => clearInterval(intervalId);
  }, [fetchTelemetryData, timeFilter]);

  return (
    <ErrorBoundary>
      <Box>
        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Main Grid Layout */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 3,
            gridAutoRows: '300px',
          }}
        >
          {/* Map Card - 2x2 on desktop, 1x1 on tablet/phone */}
          <Paper
            elevation={3}
            sx={{
              gridColumn: { xs: 'span 1', lg: 'span 2' },
              gridRow: { xs: 'span 1', lg: 'span 2' },
              overflow: 'hidden',
              backgroundColor: 'background.paper',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              position: 'relative',
            }}
          >
            <KenyaMap selectedNode={selectedNode} onStatusUpdate={handleStatusUpdate} />
          </Paper>

          {/* Status Card - 1x1 grid size */}
          <StatusCard
            selectedNode={selectedNode}
            selectedBaseStation={selectedBaseStation}
            onlineCount={statusCounts.onlineCount}
            offlineCount={statusCounts.offlineCount}
            unknownCount={statusCounts.unknownCount}
          />

          {/* Graph Cards - Dynamic */}
          {metricMappings.length > 0 ? (
            metricMappings.map((mapping, index) => {
              const dataKey = mapping.metric_name;
              
              return (
                <Paper
                  key={`${mapping.column_name}-${index}`}
                  elevation={3}
                  sx={{
                    gridColumn: 'span 1',
                    gridRow: 'span 1',
                    p: 2,
                    backgroundColor: 'background.paper',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <TelemetryGraph
                    data={telemetryData}
                    title={mapping.metric_name}
                    dataKey={dataKey}
                    unit={mapping.unit}
                    isLoading={isLoading}
                    timeFilter={timeFilter}
                    lineColor={mapping.color || "#30a1e4"}
                    hasCustomColor={!!mapping.color}
                  />
                </Paper>
              );
            })
          ) : (
            !isLoading && selectedBaseStation && (
              <Paper
                elevation={3}
                sx={{
                  gridColumn: { xs: 'span 1', sm: 'span 2' },
                  gridRow: 'span 1',
                  p: 4,
                  backgroundColor: 'background.paper',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <Settings sx={{ fontSize: 48, color: '#30a1e4', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  We're Setting Things Up
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Our team is currently configuring the visualization metrics for this base station. 
                  We appreciate your patience and will have everything ready for you shortly!
                </Typography>
                {hasRole('admin') && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Settings />}
                    onClick={() => window.location.href = '/visualization-settings'}
                    sx={{
                      background: 'linear-gradient(135deg, #30a1e4 0%, #163d90 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2891d4 0%, #0f2d70 100%)',
                      }
                    }}
                  >
                    Configure Metrics
                  </Button>
                )}
              </Paper>
            )
          )}
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

export default NodeDetail;
