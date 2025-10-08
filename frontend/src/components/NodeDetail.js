import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Container, Box, Typography, FormControl, InputLabel, Select, MenuItem, Paper, CircularProgress, Alert, useTheme, useMediaQuery } from '@mui/material';
import ReportGenerator from './reports/ReportGenerator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
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
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Alert severity="error" sx={{ m: 2 }}>
              Something went wrong. Please try refreshing the page.
            </Alert>
          </Box>
        </Container>
      );
    }
    return this.props.children;
  }
}

// Helper functions
const getGraphColor = (dataKey) => {
  switch (dataKey) {
    case 'forwardPower':
      return '#4CAF50'; // Green
    case 'reflectedPower':
      return '#F44336'; // Red
    case 'vswr':
      return '#2196F3'; // Blue
    case 'returnLoss':
      return '#FF9800'; // Orange
    case 'temperature':
      return '#E91E63'; // Pink
    case 'voltage':
      return '#9C27B0'; // Purple
    case 'current':
      return '#795548'; // Brown
    case 'power':
      return '#607D8B'; // Blue Grey
    default:
      return '#000000'; // Black
  }
};

// Telemetry Graph Component
const TelemetryGraph = memo(({ data, title, dataKey, unit, isLoading, timeFilter }) => {
  // Format x-axis tick values based on time range with timezone support
  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return '';
      
      // Determine the time range span
      if (!data || data.length < 2) {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Nairobi',
          hour12: false
        }).format(date);
      }
      
      const timeRange = new Date(data[data.length - 1].timestamp) - new Date(data[0].timestamp);
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (timeRange <= 2 * 60 * 60 * 1000) {
        // Less than 2 hours: show hours:minutes:seconds
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Africa/Nairobi',
          hour12: false
        }).format(date);
      } else if (timeRange <= oneDay) {
        // Less than 1 day: show hours:minutes
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Nairobi',
          hour12: false
        }).format(date);
      } else if (timeRange <= 7 * oneDay) {
        // Less than 1 week: show date and time
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Nairobi',
          hour12: false
        }).format(date);
      } else {
        // More than 1 week: show date only
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'Africa/Nairobi'
        }).format(date);
      }
    } catch (error) {
      console.error('Error formatting x-axis tick:', error, 'Value:', tickItem);
      return '';
    }
  };

  // Calculate time domain based on timeFilter
  const getTimeDomain = useCallback(() => {
    if (!data || data.length === 0) return [0, 1];
    
    // Use the actual data range instead of calculating from current time
    const timestamps = data.map(d => d.timestamp);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    
    // Add a small buffer to the domain to ensure all points are visible
    const buffer = (maxTimestamp - minTimestamp) * 0.05; // 5% buffer on each side
    
    return [minTimestamp - buffer, maxTimestamp + buffer];
  }, [data]);

  // Downsample data points for smoother rendering
  const downsampledData = useMemo(() => {
    const targetPoints = 100;
    if (!data || data.length <= targetPoints) return data;
    
    const step = Math.ceil(data.length / targetPoints);
    return data.filter((_, index) => index % step === 0);
  }, [data]);

  const getYAxisDomain = useCallback(() => {
    if (!data || data.length === 0) return [0, 1];
    
    // Get all valid values for the current data key
    const values = data
      .map(item => typeof item[dataKey] === 'number' ? item[dataKey] : null)
      .filter(val => val !== null && !isNaN(val));
      
    if (values.length === 0) return [0, 1];
    
    // Calculate min and max with some smart padding
    let min = Math.min(...values);
    let max = Math.max(...values);
    
    // Handle case where all values are the same
    if (min === max) {
      // For zero values, use a default range
      if (min === 0) return [0, 1];
      
      // For non-zero values, create a range around the value
      const padding = Math.max(0.1, Math.abs(min * 0.1));
      return [min - padding, max + padding];
    }
    
    // Calculate dynamic padding based on the value range
    const range = max - min;
    const padding = range * 0.1; // 10% padding
    
    // Ensure we don't go below zero for metrics that can't be negative
    const minDomain = ['vswr', 'returnLoss', 'forwardPower', 'reflectedPower'].includes(dataKey) 
      ? Math.max(0, min - padding) 
      : min - padding;
      
    return [minDomain, max + padding];
  }, [data, dataKey]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        backgroundColor: '#fff',
        '&:hover': {
          boxShadow: 6,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          '&::before': {
            content: '""',
            width: 4,
            height: 24,
            marginRight: 2,
            borderRadius: 2,
            backgroundColor: getGraphColor(dataKey),
          },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: (theme) => theme.palette.grey[800],
          }}
        >
          {title}
        </Typography>
      </Box>

      <Box height={350} mt={2}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={downsampledData}
            margin={{
              top: 10,
              right: 30,
              left: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={getTimeDomain()}
              tickFormatter={formatXAxis}
              tick={{ fontSize: 12, fill: '#666' }}
              ticks={(() => {
                if (!downsampledData || downsampledData.length === 0) return [];
                const min = downsampledData[0].timestamp;
                const max = downsampledData[downsampledData.length - 1].timestamp;
                const tickCount = Math.min(6, downsampledData.length);
                const step = (max - min) / (tickCount - 1);
                return Array.from({ length: tickCount }, (_, i) => min + (step * i));
              })()}
              axisLine={{ stroke: '#ccc' }}
              tickLine={{ stroke: '#ccc' }}
              padding={{ left: 10, right: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={getYAxisDomain()}
              tickFormatter={(value) => {
                // Format numbers with appropriate decimal places
                if (value === null || value === undefined) return 'N/A';
                
                // For very small numbers, use scientific notation
                if (Math.abs(value) > 0 && Math.abs(value) < 0.01) {
                  return value.toExponential(2);
                }
                
                // For numbers with many decimal places, limit to 4
                const strValue = value.toString();
                if (strValue.includes('.') && strValue.split('.')[1].length > 4) {
                  return value.toFixed(4);
                }
                
                // For whole numbers, don't show decimal places
                if (Number.isInteger(value)) {
                  return value.toString();
                }
                
                // For other numbers, show up to 2 decimal places
                return value.toFixed(2);
              }}
              tick={{
                fontSize: 11,
                fill: '#666',
                fontFamily: 'monospace'
              }}
              width={70}
              axisLine={{ stroke: '#ddd' }}
              tickLine={{ stroke: '#eee' }}
              padding={{ top: 10, bottom: 10 }}
              label={{
                value: unit,
                angle: -90,
                position: 'insideLeft',
                offset: -10,
                style: { textAnchor: 'middle', fill: '#666' },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                padding: '10px',
                fontSize: '13px',
                minWidth: '180px',
              }}
              labelFormatter={(timestamp) => {
                try {
                  const date = new Date(timestamp);
                  return new Intl.DateTimeFormat('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Africa/Nairobi',
                    hour12: false
                  }).format(date);
                } catch (error) {
                  console.error('Error formatting tooltip date:', error);
                  return timestamp || 'N/A';
                }
              }}
              formatter={(value, name, props) => {
                const formattedValue = value !== null && value !== undefined 
                  ? `${Number(value).toFixed(2)} ${unit}`
                  : 'N/A';
                
                // Return an array with the value and name (title)
                return [formattedValue, title];
              }}
              labelStyle={{ 
                fontWeight: 'bold', 
                marginBottom: '5px',
                color: '#333',
                fontSize: '0.9em'
              }}
              itemStyle={{
                padding: '2px 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              separator=": "
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={getGraphColor(dataKey)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={false}
              name={title}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      <Box
        mt={2}
        sx={{
          borderTop: 1,
          borderColor: (theme) => theme.palette.grey[200],
          pt: 2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: (theme) => theme.palette.grey[700],
            fontSize: '0.9rem'
          }}
        >
          Analysis:
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: (theme) => theme.palette.grey[600],
            lineHeight: 1.6,
            fontSize: '0.85rem'
          }}
        >
          {generateAnalysis(data, dataKey, title)}
        </Typography>
      </Box>
    </Paper>
  );
});

const generateAnalysis = (data, dataKey, title) => {
  if (!data || data.length === 0) {
    return "No data available for analysis.";
  }

  const values = data.map(item => item[dataKey]);
  const current = values[values.length - 1];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  return generateRecommendation(dataKey, current, avg, max, min);
};

const generateRecommendation = (metric, current, avg, max, min) => {
  // Handle null/undefined values
  current = Number(current) || 0;
  avg = Number(avg) || 0;
  max = Number(max) || 0;
  min = Number(min) || 0;

  const getStatus = (value, thresholds) => {
    value = Number(value) || 0;
    if (value >= thresholds.critical) return 'Critical';
    if (value >= thresholds.warning) return 'Warning';
    return 'Normal';
  };

  const formatValue = (value) => {
    value = Number(value);
    return isNaN(value) ? '0.00' : value.toFixed(2);
  };

  const calculateChange = (current, avg) => {
    current = Number(current) || 0;
    avg = Number(avg) || 1; // Prevent division by zero
    const change = ((current - avg) / avg) * 100;
    return isNaN(change) ? '0.0' : change.toFixed(1);
  };

  const change = calculateChange(current, avg);
  const trend = Number(change) > 0 ? 'increased' : 'decreased';

  switch (metric) {
    case 'forwardPower':
      const powerStatus = getStatus(current, { warning: 45, critical: 50 });
      return `Forward Power is ${powerStatus} at ${formatValue(current)}W (${Math.abs(change)}% ${trend} from average). ` +
        `Range: ${formatValue(min)}W to ${formatValue(max)}W. ` +
        (powerStatus !== 'Normal' ? 'Consider checking transmitter output settings.' : 'Operating within expected range.');

    case 'reflectedPower':
      const reflectedStatus = getStatus(current, { warning: 5, critical: 10 });
      return `Reflected Power is ${reflectedStatus} at ${formatValue(current)}W (${Math.abs(change)}% ${trend} from average). ` +
        `Range: ${formatValue(min)}W to ${formatValue(max)}W. ` +
        (reflectedStatus !== 'Normal' ? 'High reflection indicates possible antenna system issues.' : 'Good antenna match.');

    case 'vswr':
      const vswrStatus = getStatus(current, { warning: 1.5, critical: 2.0 });
      return `VSWR is ${vswrStatus} at ${formatValue(current)}:1 (${Math.abs(change)}% ${trend} from average). ` +
        `Range: ${formatValue(min)}:1 to ${formatValue(max)}:1. ` +
        (vswrStatus !== 'Normal' ? 'Check antenna system and connections for impedance mismatch.' : 'Good impedance match.');

    case 'returnLoss':
      const returnLossStatus = getStatus(-current, { warning: -15, critical: -10 });
      return `Return Loss is ${returnLossStatus} at ${formatValue(current)}dB (${Math.abs(change)}% ${trend} from average). ` +
        `Range: ${formatValue(min)}dB to ${formatValue(max)}dB. ` +
        (returnLossStatus !== 'Normal' ? 'Poor return loss indicates possible antenna system issues.' : 'Good signal reflection characteristics.');

    case 'temperature':
      const tempStatus = getStatus(current, { warning: 40, critical: 50 });
      return `Temperature is ${tempStatus} at ${formatValue(current)}°C (${Math.abs(change)}% ${trend} from average). ` +
        `Range: ${formatValue(min)}°C to ${formatValue(max)}°C. ` +
        (tempStatus !== 'Normal' ? 'Check cooling system and airflow.' : 'Temperature is within safe operating range.');

    case 'voltage':
      const voltageStatus = getStatus(Math.abs(current - 12), { warning: 1, critical: 2 });
      return `Voltage is ${voltageStatus} at ${formatValue(current)}V (${Math.abs(change)}% ${trend} from average). ` +
        `Range: ${formatValue(min)}V to ${formatValue(max)}V. ` +
        (voltageStatus !== 'Normal' ? 'Check power supply and connections.' : 'Power supply is stable.');

    case 'current':
      const currentStatus = getStatus(current, { warning: 8, critical: 10 });
      return `Current draw is ${currentStatus} at ${formatValue(current)}A (${Math.abs(change)}% ${trend} from average). ` +
        `Range: ${formatValue(min)}A to ${formatValue(max)}A. ` +
        (currentStatus !== 'Normal' ? 'Investigate possible overload conditions.' : 'Current consumption is normal.');

    case 'power':
      const totalPowerStatus = getStatus(current, { warning: 100, critical: 120 });
      return `Total Power is ${totalPowerStatus} at ${formatValue(current)}W (${Math.abs(change)}% ${trend} from average). ` +
        `Range: ${formatValue(min)}W to ${formatValue(max)}W. ` +
        (totalPowerStatus !== 'Normal' ? 'Check for power efficiency issues.' : 'Power consumption is within expected range.');

    default:
      return `Current value: ${formatValue(current)} (${Math.abs(change)}% ${trend} from average). ` +
        `Range: ${formatValue(min)} to ${formatValue(max)}. System is operating within normal parameters.`;
  }
};

// Main Component
const NodeDetail = () => {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [telemetryData, setTelemetryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('1h');
  const [baseStations, setBaseStations] = useState([]);
  const [selectedBaseStation, setSelectedBaseStation] = useState(null);
  const [error, setError] = useState(null);

  // Axios instance with default config
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Content-Type': 'application/json'
    }
  });

  // Fetch available nodes
  useEffect(() => {
    const fetchNodes = async () => {
      console.log('Fetching nodes...');
      setError(null);
      
      try {
        const response = await api.get('/api/nodes');
        console.log('Nodes response:', response.data);
        
        if (response.data && Array.isArray(response.data)) {
          setNodes(response.data);
          if (response.data.length > 0) {
            setSelectedNode(response.data[0].id);
            console.log('Selected initial node:', response.data[0].id);
          } else {
            setError('No nodes available. Please check the backend service.');
          }
        } else {
          console.error('Unexpected response format:', response.data);
          throw new Error('Invalid response format from server');
        }
      } catch (err) {
        console.error('Error fetching nodes:', {
          error: err,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(`Failed to fetch nodes: ${err.message || 'Network error'}`);
      }
    };
    
    fetchNodes();
  }, []);

  const TIME_FILTERS = [
    { value: '5m', label: 'Last 5 minutes' },
    { value: '10m', label: 'Last 10 minutes' },
    { value: '30m', label: 'Last 30 minutes' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '2h', label: 'Last 2 hours' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '1d', label: 'Last 24 hours' },
    { value: '2d', label: 'Last 2 days' },
    { value: '5d', label: 'Last 5 days' },
    { value: '1w', label: 'Last 1 week' },
    { value: '2w', label: 'Last 2 weeks' },
    { value: '30d', label: 'Last 30 days' }
  ];

  // Fetch base stations when a node is selected
  useEffect(() => {
    const fetchBaseStations = async () => {
      if (!selectedNode) {
        console.log('No node selected, skipping base station fetch');
        setBaseStations([]);
        setSelectedBaseStation(null);
        return;
      }

      console.log(`Fetching base stations for node: ${selectedNode}`);
      setError(null);
      
      try {
        const response = await api.get(`/api/basestations/${selectedNode}`);
        console.log('Base stations API response:', response.data);

        if (!Array.isArray(response.data)) {
          console.error('Expected array of base stations, got:', response.data);
          throw new Error('Invalid base stations data format');
        }

        const formattedStations = response.data;
        console.log(`Found ${formattedStations.length} base stations:`, formattedStations);

        setBaseStations(formattedStations);
        
        if (formattedStations.length > 0) {
          setSelectedBaseStation(formattedStations[0].id);
        } else {
          console.warn(`No base stations found for node: ${selectedNode}`);
          setSelectedBaseStation(null);
          setError(`No base stations available for node: ${selectedNode}`);
        }
      } catch (err) {
        console.error('Error fetching base stations:', {
          error: err,
          response: err.response?.data,
          status: err.response?.status,
          node: selectedNode
        });
        
        setError(`Failed to fetch base stations: ${err.message || 'Network error'}`);
        setBaseStations([]);
        setSelectedBaseStation(null);
      }
    };

    fetchBaseStations();
  }, [selectedNode]);

  const fetchTelemetryData = useCallback(async () => {
    if (!selectedBaseStation || !timeFilter || !selectedNode) {
      console.log('Missing required parameters for telemetry data fetch:', {
        selectedNode,
        selectedBaseStation,
        timeFilter
      });
      return;
    }

    console.log(`Fetching telemetry data for node=${selectedNode}, baseStation=${selectedBaseStation}, timeFilter=${timeFilter}`);
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = Date.now();
      const response = await api.get(`/api/telemetry/${selectedNode}/${selectedBaseStation}`, {
        params: { 
          timeFilter,
          _t: new Date().getTime() // Cache buster
        },
        timeout: 30000 // 30 second timeout
      });
      
      console.log(`API response received in ${Date.now() - startTime}ms`);
      console.log('Response data structure:', {
        hasData: !!response.data,
        dataLength: response.data?.data?.length,
        firstItem: response.data?.data?.[0]
      });

      if (!response.data?.data || !Array.isArray(response.data.data)) {
        console.error('Invalid data format received:', response.data);
        throw new Error('Invalid data format received from server');
      }

      // Process and sort the data by timestamp
      const formattedData = response.data.data
        .filter(item => item && item.sample_time) // Filter out invalid items
        .map(item => {
          const timestamp = new Date(item.sample_time).getTime();
          if (isNaN(timestamp)) {
            console.warn('Invalid timestamp:', item.sample_time, 'in item:', item);
            return null;
          }
          return {
            timestamp,
            temperature: parseFloat(item.temperature) || 0,
            voltage: parseFloat(item.voltage) || 0,
            current: parseFloat(item.current) || 0,
            power: parseFloat(item.power) || 0,
            forwardPower: parseFloat(item.forwardPower) || 0,
            reflectedPower: parseFloat(item.reflectedPower) || 0,
            vswr: parseFloat(item.vswr) || 0,
            returnLoss: parseFloat(item.returnLoss) || 0
          };
        })
        .filter(Boolean) // Remove any null entries from invalid timestamps
        .sort((a, b) => a.timestamp - b.timestamp);

      console.log(`Processed ${formattedData.length} valid data points`);
      if (formattedData.length > 0) {
        const startDate = new Date(formattedData[0].timestamp);
        const endDate = new Date(formattedData[formattedData.length - 1].timestamp);
        const timeDiff = endDate - startDate;
        console.log('Data time range:', {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          duration: `${(timeDiff / (1000 * 60 * 60)).toFixed(2)} hours`,
          pointsPerHour: (formattedData.length / (timeDiff / (1000 * 60 * 60))).toFixed(2)
        });
      } else {
        console.warn('No valid data points found after processing');
      }

      setTelemetryData(formattedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching telemetry data:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. The server is taking too long to respond. Try a smaller time range.');
      } else if (err.response) {
        // Server responded with an error status code
        setError(`Error: ${err.response.data.error || 'Failed to fetch data'}`);
      } else {
        setError('Failed to fetch telemetry data. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedBaseStation, timeFilter, selectedNode]);

  useEffect(() => {
    // Initial fetch
    fetchTelemetryData();

    // Set up auto-refresh interval based on time filter
    const getRefreshInterval = () => {
      switch (timeFilter) {
        case '5m': return 10000;  // 10 seconds for 5m view
        case '10m': return 15000; // 15 seconds for 10m view
        case '30m': return 30000; // 30 seconds for 30m view
        case '1h': return 60000;  // 1 minute for 1h view
        default: return 300000;   // 5 minutes for longer ranges
      }
    };

    const intervalId = setInterval(fetchTelemetryData, getRefreshInterval());

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(intervalId);
  }, [fetchTelemetryData, timeFilter]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <ErrorBoundary>
      <Container sx={{ py: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 3 
        }}>
          <Typography 
            variant={isMobile ? 'h5' : 'h4'} 
            gutterBottom
            sx={{ 
              textAlign: { xs: 'center', sm: 'left' },
              mb: { xs: 1, sm: 0 }
            }}
          >
            Telemetry Dashboard
          </Typography>
          <ReportGenerator 
            nodes={nodes} 
            onError={(error) => setError(error.message)}
            currentNode={selectedNode}
            currentTimeRange={timeFilter}
          />
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ display: 'none' }}>
              <pre>Selected Node: {selectedNode}</pre>
              <pre>Base Stations: {JSON.stringify(baseStations, null, 2)}</pre>
            </div>
          )}
        </Box>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2, 
          mb: 4,
          '& .MuiFormControl-root': {
            width: '100%',
            maxWidth: '100%',
            mb: { xs: 1, sm: 0 }
          },
          '& .MuiInputBase-root': {
            width: '100%'
          }
        }}>
          <FormControl>
            <InputLabel>Node</InputLabel>
            <Select
              value={selectedNode || ''}
              label="Node"
              onChange={(e) => setSelectedNode(e.target.value)}
            >
              {nodes.map((node) => (
                <MenuItem key={node.id} value={node.id}>
                  {node.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Base Station</InputLabel>
            <Select
              value={selectedBaseStation || ''}
              label="Base Station"
              onChange={(e) => setSelectedBaseStation(e.target.value)}
            >
              {baseStations.map((station) => (
                <MenuItem key={station.id} value={station.id}>
                  {station.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeFilter}
              label="Time Range"
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              {TIME_FILTERS.map((filter) => (
                <MenuItem key={filter.value} value={filter.value}>
                  {filter.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        {/* First Row */}
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Forward Power"
            dataKey="forwardPower"
            unit="W"
            isLoading={isLoading}
            timeFilter={timeFilter}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Reflected Power"
            dataKey="reflectedPower"
            unit="W"
            isLoading={isLoading}
            timeFilter={timeFilter}
          />
        </Box>

        {/* Second Row */}
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="VSWR"
            dataKey="vswr"
            unit=""
            isLoading={isLoading}
            timeFilter={timeFilter}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Return Loss"
            dataKey="returnLoss"
            unit="dB"
            isLoading={isLoading}
            timeFilter={timeFilter}
          />
        </Box>

        {/* Third Row */}
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Temperature"
            dataKey="temperature"
            unit="°C"
            isLoading={isLoading}
            timeFilter={timeFilter}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Voltage"
            dataKey="voltage"
            unit="V"
            isLoading={isLoading}
            timeFilter={timeFilter}
          />
        </Box>

        {/* Fourth Row */}
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Current"
            dataKey="current"
            unit="A"
            isLoading={isLoading}
            timeFilter={timeFilter}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Power"
            dataKey="power"
            unit="W"
            isLoading={isLoading}
            timeFilter={timeFilter}
          />
        </Box>
      </Box>
    </Container>
    </ErrorBoundary>
  );
};

export default NodeDetail;
