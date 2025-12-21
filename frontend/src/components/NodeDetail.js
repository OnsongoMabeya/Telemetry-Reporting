import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Paper, 
  CircularProgress, 
  Alert, 
  useTheme, 
  useMediaQuery,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  Badge,
  alpha
} from '@mui/material';
import { 
  Refresh, 
  Settings, 
  Timeline, 
  Wifi, 
  Assessment,
  Tune,
  DateRange,
  LocationOn
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ReportGenerator from './reports/ReportGenerator';
import KenyaMap from './KenyaMap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          height={350}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            position: 'relative'
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <CircularProgress 
              size={60}
              thickness={4}
              sx={{ 
                color: 'white',
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round'
                }
              }}
            />
          </motion.div>
        </Box>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -5 }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-2px)'
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  mr: 2,
                  background: `linear-gradient(135deg, ${getGraphColor(dataKey)}, ${alpha(getGraphColor(dataKey), 0.7)})`,
                }}
              >
                <Timeline sx={{ color: 'white' }} />
              </Avatar>
            </motion.div>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: '#1a1a1a',
                  fontSize: '1.1rem'
                }}
              >
                {title}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Real-time telemetry data
              </Typography>
            </Box>
          </Box>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Tooltip title="Refresh data">
              <IconButton size="small">
                <Refresh sx={{ color: getGraphColor(dataKey) }} />
              </IconButton>
            </Tooltip>
          </motion.div>
        </Box>

        <Box 
          height={350} 
          sx={{ 
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4))',
            borderRadius: 2,
            p: 1
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={downsampledData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getGraphColor(dataKey)} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={getGraphColor(dataKey)} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(0, 0, 0, 0.1)"
                strokeOpacity={0.3}
              />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatXAxis}
                stroke="#666"
                tick={{ fontSize: 12 }}
                domain={getTimeDomain()}
                type="number"
                scale="time"
              />
              <YAxis 
                stroke="#666"
                tick={{ fontSize: 12 }}
                domain={getYAxisDomain()}
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
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 8,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
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
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px'
                }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={getGraphColor(dataKey)}
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: getGraphColor(dataKey),
                  stroke: '#fff',
                  strokeWidth: 2
                }}
                fill={`url(#gradient-${dataKey})`}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </motion.div>
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
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 3,
            mb: 4 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
                  }}
                >
                  <Assessment sx={{ fontSize: 32, color: 'white' }} />
                </Avatar>
              </motion.div>
              <Box>
                <Typography 
                  variant={isMobile ? 'h5' : 'h4'} 
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 0.5
                  }}
                >
                  Telemetry Dashboard
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Real-time monitoring and analysis
                </Typography>
              </Box>
            </Box>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <IconButton
                onClick={fetchTelemetryData}
                disabled={isLoading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  }
                }}
              >
                <Refresh />
              </IconButton>
            </motion.div>
          </Box>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 3,
              mb: 4,
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              alignItems: { xs: 'stretch', md: 'center' }
            }}>
              <motion.div whileHover={{ scale: 1.02 }} style={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ 
                    background: 'white',
                    px: 1,
                    '&.Mui-focused': {
                      color: '#667eea'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Wifi fontSize="small" />
                      Node
                    </Box>
                  </InputLabel>
                  <Select
                    value={selectedNode || ''}
                    label="Node"
                    onChange={(e) => setSelectedNode(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(102, 126, 234, 0.3)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(102, 126, 234, 0.6)'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#667eea'
                      }
                    }}
                  >
                    {nodes.map((node) => (
                      <MenuItem key={node.id} value={node.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: '#667eea' }}>
                            {node.name.charAt(0).toUpperCase()}
                          </Avatar>
                          {node.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} style={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ 
                    background: 'white',
                    px: 1,
                    '&.Mui-focused': {
                      color: '#764ba2'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" />
                      Base Station
                    </Box>
                  </InputLabel>
                  <Select
                    value={selectedBaseStation || ''}
                    label="Base Station"
                    onChange={(e) => setSelectedBaseStation(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(118, 75, 162, 0.3)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(118, 75, 162, 0.6)'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#764ba2'
                      }
                    }}
                  >
                    {baseStations.map((station) => (
                      <MenuItem key={station.id} value={station.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: '#764ba2' }}>
                            {station.name.charAt(0).toUpperCase()}
                          </Avatar>
                          {station.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} style={{ flex: 1 }}>
                <FormControl fullWidth>
                  <InputLabel sx={{ 
                    background: 'white',
                    px: 1,
                    '&.Mui-focused': {
                      color: '#f59e0b'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DateRange fontSize="small" />
                      Time Range
                    </Box>
                  </InputLabel>
                  <Select
                    value={timeFilter}
                    label="Time Range"
                    onChange={(e) => setTimeFilter(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(245, 158, 11, 0.3)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(245, 158, 11, 0.6)'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#f59e0b'
                      }
                    }}
                  >
                    {TIME_FILTERS.map((filter) => (
                      <MenuItem key={filter.value} value={filter.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Chip 
                            label={filter.label} 
                            size="small"
                            sx={{ 
                              bgcolor: alpha('#f59e0b', 0.1),
                              color: '#f59e0b',
                              fontWeight: 600
                            }} 
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </motion.div>
            </Box>
          </Paper>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1), rgba(244, 67, 54, 0.05))',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(244, 67, 54, 0.2)'
                }}
              >
                {error}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '450px 1fr 1fr' }, 
            gap: 3,
            mb: 4 
          }}>
            {/* Kenya Map - Left Side */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
            >
              <Paper
                elevation={8}
                sx={{
                  height: { xs: '400px', sm: '600px' },
                  borderRadius: 3,
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <KenyaMap selectedNode={selectedNode} />
              </Paper>
            </motion.div>
            
            {/* Graphs - Right Side */}
            <Box sx={{ display: 'grid', gap: 3 }}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <TelemetryGraph
                  data={telemetryData}
                  title="Forward Power"
                  dataKey="forwardPower"
                  unit="W"
                  isLoading={isLoading}
                  timeFilter={timeFilter}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <TelemetryGraph
                  data={telemetryData}
                  title="Reflected Power"
                  dataKey="reflectedPower"
                  unit="W"
                  isLoading={isLoading}
                  timeFilter={timeFilter}
                />
              </motion.div>
            </Box>

            <Box sx={{ display: 'grid', gap: 3 }}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <TelemetryGraph
                  data={telemetryData}
                  title="VSWR"
                  dataKey="vswr"
                  unit=""
                  isLoading={isLoading}
                  timeFilter={timeFilter}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                <TelemetryGraph
                  data={telemetryData}
                  title="Return Loss"
                  dataKey="returnLoss"
                  unit="dB"
                  isLoading={isLoading}
                  timeFilter={timeFilter}
                />
              </motion.div>
            </Box>
          </Box>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 3,
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: '#667eea' }}>
                <Settings />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Reports & Analysis
              </Typography>
            </Box>
            <ReportGenerator 
              nodes={nodes} 
              onError={(error) => setError(error.message)}
              currentNode={selectedNode}
              currentTimeRange={timeFilter}
            />
          </Paper>
        </motion.div>
      </Container>
    </ErrorBoundary>
  );
};

export default NodeDetail;
