import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Container, Box, Typography, FormControl, InputLabel, Select, MenuItem, Grid, Paper, CircularProgress, Alert } from '@mui/material';
import ReportGenerator from './reports/ReportGenerator';
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
              type="number"
              scale="time"
              domain={['auto', 'auto']}
              tickFormatter={(timestamp) => {
                const date = new Date(timestamp);
                if (timeFilter === '5m' || timeFilter === '10m' || timeFilter === '30m') {
                  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
                } else if (timeFilter === '1h' || timeFilter === '2h' || timeFilter === '6h') {
                  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                } else if (timeFilter === '1d' || timeFilter === '2d') {
                  return `${date.getHours()}:00`;
                } else if (timeFilter === '5d' || timeFilter === '1w') {
                  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
                } else {
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }
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

  // Fetch available nodes
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/nodes`);
        setNodes(response.data);
        if (response.data.length > 0) {
          setSelectedNode(response.data[0].NodeName);
        }
      } catch (err) {
        console.error('Error fetching nodes:', err);
        setError('Failed to fetch nodes. Please try again later.');
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

  useEffect(() => {
    const fetchBaseStations = async () => {
      if (!selectedNode) return;
      try {
        const response = await axios.get(`${API_BASE_URL}/api/basestations/${selectedNode}`);
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
  }, [selectedNode]);

  const fetchTelemetryData = useCallback(async () => {
    if (!selectedBaseStation || !timeFilter || !selectedNode) return;

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/telemetry/${selectedNode}/${selectedBaseStation}`, {
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
  }, [selectedBaseStation, timeFilter, selectedNode]);

  useEffect(() => {
    fetchTelemetryData();
  }, [fetchTelemetryData]);

  return (
    <ErrorBoundary>
      <Container sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Telemetry Dashboard
          </Typography>
          <ReportGenerator nodes={nodes} baseStations={baseStations} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Node</InputLabel>
            <Select
              value={selectedNode || ''}
              label="Node"
              onChange={(e) => setSelectedNode(e.target.value)}
            >
              {nodes.map((node) => (
                <MenuItem key={node.NodeName} value={node.NodeName}>
                  {node.NodeName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
