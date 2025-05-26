import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Box, Typography, FormControl, InputLabel, Select, MenuItem, Paper, CircularProgress, Alert } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
        <Alert severity="error" sx={{ m: 2 }}>
          Something went wrong. Please try refreshing the page.
        </Alert>
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
const TelemetryGraph = memo(({ data, title, dataKey, unit, isLoading }) => {
  // Downsample data points for smoother rendering
  const downsampledData = useMemo(() => {
    const targetPoints = 100;
    if (!data || data.length <= targetPoints) return data;
    
    const step = Math.ceil(data.length / targetPoints);
    return data.filter((_, index) => index % step === 0);
  }, [data]);

  const getYAxisDomain = () => {
    if (!data || data.length === 0) return [0, 1];
    
    const values = data.map(item => item[dataKey]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    
    return [min - padding, max + padding];
  };

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

      <Box height={300} mt={2}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={downsampledData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(timestamp) => {
                const date = new Date(timestamp);
                return date.toLocaleTimeString();
              }}
            />
            <YAxis
              domain={getYAxisDomain()}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip
              labelFormatter={(timestamp) => {
                const date = new Date(timestamp);
                return date.toLocaleString();
              }}
              formatter={(value) => [`${value}${unit}`, title]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={getGraphColor(dataKey)}
              dot={false}
              activeDot={{ r: 8 }}
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
  switch (metric) {
    case 'vswr':
      if (current > 2) return "Warning: High VSWR detected. Check antenna and transmission line.";
      break;
    case 'temperature':
      if (current > 50) return "Warning: High temperature detected. Check cooling system.";
      break;
    default:
      return "System is operating within normal parameters.";
  }
  return "System is operating within normal parameters.";
};

// Main Component
const NodeDetail = () => {
  const { nodeName } = useParams();
  const [telemetryData, setTelemetryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('1h');
  const [baseStations, setBaseStations] = useState([]);
  const [selectedBaseStation, setSelectedBaseStation] = useState(null);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    const fetchBaseStations = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/basestations/${nodeName}`);
        const formattedStations = response.data.map(station => ({
          id: station.NodeBaseStationName,
          name: station.NodeBaseStationName
        }));
        setBaseStations(formattedStations);
        if (formattedStations.length > 0) {
          setSelectedBaseStation(formattedStations[0].id);
        }
      } catch (err) {
        console.error('Error fetching base stations:', err);
        setError('Failed to fetch base stations. Please try again later.');
      }
    };

    fetchBaseStations();
  }, [nodeName]);

  const fetchTelemetryData = useCallback(async () => {
    if (!selectedBaseStation || !timeFilter || !nodeName) return;

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/telemetry/${nodeName}/${selectedBaseStation}`, {
        params: {
          timeFilter
        },
        timeout: 10000 // 10 second timeout
      });

      // The response.data.data contains the actual telemetry records
      const formattedData = response.data.data.map(item => ({
        timestamp: new Date(item.sample_time).getTime(),
        temperature: item.temperature,
        voltage: item.voltage,
        current: item.current,
        power: item.power,
        forwardPower: item.forwardPower,
        reflectedPower: item.reflectedPower,
        vswr: item.vswr,
        returnLoss: item.returnLoss
      }));

      setTelemetryData(formattedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching telemetry data:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to fetch telemetry data. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedBaseStation, timeFilter, nodeName]);

  useEffect(() => {
    fetchTelemetryData();
  }, [fetchTelemetryData]);

  return (
    <ErrorBoundary>
    <Container sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Node Details: {nodeName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <FormControl sx={{ minWidth: 200 }}>
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
          <FormControl sx={{ minWidth: 200 }}>
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
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Forward Power"
            dataKey="forwardPower"
            unit="W"
            isLoading={isLoading}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Reflected Power"
            dataKey="reflectedPower"
            unit="W"
            isLoading={isLoading}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="VSWR"
            dataKey="vswr"
            unit=""
            isLoading={isLoading}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Return Loss"
            dataKey="returnLoss"
            unit="dB"
            isLoading={isLoading}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Temperature"
            dataKey="temperature"
            unit="°C"
            isLoading={isLoading}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Voltage"
            dataKey="voltage"
            unit="V"
            isLoading={isLoading}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Current"
            dataKey="current"
            unit="A"
            isLoading={isLoading}
          />
        </Box>
        <Box>
          <TelemetryGraph
            data={telemetryData}
            title="Power"
            dataKey="power"
            unit="W"
            isLoading={isLoading}
          />
        </Box>
      </Box>
    </Container>
    </ErrorBoundary>
  );
};

export default NodeDetail;
