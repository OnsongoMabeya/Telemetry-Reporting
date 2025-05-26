import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { useParams } from 'react-router-dom';
import { Container, Box, Typography, FormControl, InputLabel, Select, MenuItem, Alert, Paper, Tab, Tabs, Stack } from '@mui/material';
import { Grid } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

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
      return '#00BCD4'; // Cyan
    case 'power':
      return '#009688'; // Teal
    default:
      return '#8884d8';
  }
};

const TelemetryGraph = memo(({ data, title, dataKey, unit, isLoading }) => {
  const getYAxisDomain = () => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    
    // Calculate actual min and max from data
    const values = data.map(item => Number(item[dataKey]));
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    
    // Add 10% padding to the range
    const range = dataMax - dataMin;
    const padding = range * 0.1;
    
    switch (dataKey) {
      case 'returnLoss':
        return [Math.max(0, dataMin - padding), dataMax + padding];
      case 'vswr':
        return [Math.max(1, dataMin - padding), dataMax + padding];
      case 'temperature':
        return [Math.max(0, dataMin - padding), dataMax + padding];
      case 'voltage':
        return [Math.max(0, dataMin - padding), dataMax + padding];
      case 'current':
        return [Math.max(0, dataMin - padding), dataMax + padding];
      case 'power':
      case 'forwardPower':
        return [Math.max(0, dataMin - padding), dataMax + padding];
      case 'reflectedPower':
        return [0, Math.max(1, dataMax + padding)];
      default:
        return [dataMin - padding, dataMax + padding];
    }
  };
  // Downsample data points for smoother rendering
  const downsampledData = useMemo(() => {
    const targetPoints = 100;
    if (!data || data.length <= targetPoints) return data;
    
    const step = Math.floor(data.length / targetPoints);
    return data.filter((_, index) => index % step === 0);
  }, [data]);
  return (
    <Paper 
      sx={{ 
        p: 1, 
        mb: 2, 
        opacity: isLoading ? 0.7 : 1, 
        transition: 'all 0.3s ease',
        borderRadius: 2,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 12px rgba(0,0,0,0.15)'
        }
      }}
    >
      <Typography 
        variant="h6" 
        gutterBottom 
        sx={{ 
          fontWeight: 600,
          color: (theme) => theme.palette.grey[800],
          display: 'flex',
          alignItems: 'center',
          '&::before': {
            content: '""',
            width: 4,
            height: 24,
            backgroundColor: getGraphColor(dataKey),
            marginRight: 1.5,
            borderRadius: 2
          }
        }}
      >
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart 
          data={downsampledData}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
          <XAxis 
            dataKey="sample_time" 
            tickFormatter={(time) => {
              if (!time) return '';
              const [, timeStr] = time.split(' ');
              const [hours, minutes] = timeStr.split(':');
              return `${hours}:${minutes}`;
            }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            unit={unit} 
            domain={getYAxisDomain()}
            allowDataOverflow={false}
            tick={{ fontSize: 12 }}
            width={50}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255,255,255,0.95)', 
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
            itemStyle={{ color: getGraphColor(dataKey) }}
            cursor={{ stroke: 'rgba(0,0,0,0.2)' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={getGraphColor(dataKey)}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, stroke: getGraphColor(dataKey), strokeWidth: 2, fill: '#fff' }}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
        <Typography 
          variant="subtitle1" 
          gutterBottom 
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
  if (!data || data.length === 0) return "No data available for analysis.";

  const values = data.map(item => Number(item[dataKey]));
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const latest = values[0];

  return `Current ${title}: ${latest.toFixed(2)}
    Average: ${avg.toFixed(2)}
    Maximum: ${max.toFixed(2)}
    Minimum: ${min.toFixed(2)}
    ${generateRecommendation(title, latest, avg, max, min)}`;
};

const generateRecommendation = (metric, current, avg, max, min) => {
  // Add specific recommendations based on the metric and values
  switch (metric) {
    case "Forward Power":
      if (current < avg * 0.8) return "Warning: Forward power is significantly below average. Check transmitter output.";
      break;
    case "VSWR":
      if (current > 1.5) return "Warning: High VSWR detected. Check antenna system for potential issues.";
      break;
    case "Temperature":
      if (current > 50) return "Warning: High temperature detected. Check cooling system.";
      break;
    default:
      return "System is operating within normal parameters.";
  }
  return "System is operating within normal parameters.";
};

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

const NodeDetail = () => {
  const { nodeName } = useParams();
  const [telemetryData, setTelemetryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('1h');
  const [baseStations, setBaseStations] = useState([]);
  const [selectedBaseStation, setSelectedBaseStation] = useState('');
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  const debouncedTimeFilter = useMemo(
    () =>
      debounce((filter) => {
        setTimeFilter(filter);
        setTelemetryData([]);
      }, 300),
    []
  );

  const fetchBaseStations = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/basestations/${nodeName}`);
      setBaseStations(response.data);
      if (response.data.length > 0) {
        setSelectedBaseStation(response.data[0].NodeBaseStationName);
      }
    } catch (error) {
      console.error('Error fetching base stations:', error);
      setError('Failed to fetch base stations');
    }
  };

  useEffect(() => {
    fetchBaseStations();
  }, [nodeName]);

  const fetchTelemetryData = useCallback(async () => {
    if (!selectedBaseStation || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`http://localhost:5000/api/telemetry/${nodeName}/${selectedBaseStation}?timeFilter=${timeFilter}`);

      const { data } = response.data;
      setTelemetryData(data);
    } catch (error) {
      console.error('Error fetching telemetry data:', error);
      setError(error.message || 'Failed to fetch telemetry data');
    } finally {
      setIsLoading(false);
    }
  }, [nodeName, selectedBaseStation, timeFilter, isLoading]);

  useEffect(() => {
    fetchTelemetryData();
  }, [fetchTelemetryData]);

  const handleTimeFilterChange = (event) => {
    if (!isLoading) {
      debouncedTimeFilter(event.target.value);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#ffebee' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
      <Typography variant="h4" gutterBottom>
        {nodeName}
      </Typography>
      
      <Box 
        sx={{ 
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          p: 2,
          backgroundColor: '#f8f9fa',
          borderRadius: 2,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
        }}
      >
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
              }
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0'
            }
          }}
        >
          {baseStations.map((station) => (
            <Tab 
              key={station.NodeBaseStationName} 
              label={station.NodeBaseStationName}
              value={station.NodeBaseStationName}
            />
          ))}
        </Tabs>
        <FormControl
          sx={{ 
            minWidth: 200,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#fff',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: (theme) => theme.palette.primary.main,
                }
              }
            }
          }}
        >
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeFilter}
            onChange={handleTimeFilterChange}
            label="Time Range"
          >
            {TIME_FILTERS.map((filter) => (
              <MenuItem key={filter.value} value={filter.value}>
                {filter.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid 
        container 
        spacing={2} 
        sx={{ 
          mt: 2,
          mx: 'auto',
          maxWidth: 1920,
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
        <Grid item sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 0.5 }}>
          <TelemetryGraph
            data={telemetryData}
            title="Forward Power"
            dataKey="forwardPower"
            unit="W"
            isLoading={isLoading}
          />
        </Grid>
        <Grid item sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 0.5 }}>
          <TelemetryGraph
            data={telemetryData}
            title="Reflected Power"
            dataKey="reflectedPower"
            unit="W"
            isLoading={isLoading}
          />
        </Grid>
        <Grid item sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 0.5 }}>
          <TelemetryGraph
            data={telemetryData}
            title="VSWR"
            dataKey="vswr"
            unit=""
            isLoading={isLoading}
          />
        </Grid>
        <Grid item sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 0.5 }}>
          <TelemetryGraph
            data={telemetryData}
            title="Return Loss"
            dataKey="returnLoss"
            unit="dB"
            isLoading={isLoading}
          />
        </Grid>
        <Grid item sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 0.5 }}>
          <TelemetryGraph
            data={telemetryData}
            title="Temperature"
            dataKey="temperature"
            unit="°C"
            isLoading={isLoading}
          />
        </Grid>
        <Grid item sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 0.5 }}>
          <TelemetryGraph
            data={telemetryData}
            title="Voltage"
            dataKey="voltage"
            unit="V"
            isLoading={isLoading}
          />
        </Grid>
        <Grid item sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 0.5 }}>
          <TelemetryGraph
            data={telemetryData}
            title="Current"
            dataKey="current"
            unit="A"
            isLoading={isLoading}
          />
        </Grid>
        <Grid item sx={{ width: { xs: '100%', sm: '50%', md: '33.333%' }, p: 0.5 }}>
          <TelemetryGraph
            data={telemetryData}
            title="Power"
            dataKey="power"
            unit="W"
            isLoading={isLoading}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default NodeDetail;
