import React, { useState, useEffect, useMemo, memo } from 'react';
import debounce from 'lodash/debounce';
import { useParams } from 'react-router-dom';
import { Container, Typography, Paper, Box, Tab, Tabs, Stack, Select, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const TelemetryGraph = memo(({ data, title, dataKey, unit, isLoading }) => {
  // Downsample data points for smoother rendering
  const downsampledData = useMemo(() => {
    const targetPoints = 100;
    if (!data || data.length <= targetPoints) return data;
    
    const step = Math.floor(data.length / targetPoints);
    return data.filter((_, index) => index % step === 0);
  }, [data]);
  return (
    <Paper sx={{ p: 2, mb: 2, opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.3s' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={downsampledData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis unit={unit} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={dataKey} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Analysis:
        </Typography>
        <Typography variant="body2" color="text.secondary">
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
  const [baseStations, setBaseStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('1h');
  const [telemetryData, setTelemetryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  
  const debouncedTimeFilter = useMemo(
    () =>
      debounce((filter) => {
        setSelectedTimeFilter(filter);
        setCurrentPage(1); // Reset to first page when filter changes
      }, 300),
    []
  );

  useEffect(() => {
    const fetchBaseStations = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/basestations/${nodeName}`);
        setBaseStations(response.data);
        if (response.data.length > 0) {
          setSelectedStation(response.data[0].NodeBaseStationName);
        }
      } catch (error) {
        console.error('Error fetching base stations:', error);
      }
    };

    fetchBaseStations();
  }, [nodeName]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchTelemetryData = async () => {
      if (!selectedStation || isFetching) return;
      
      try {
        setIsFetching(true);
        const response = await axios.get(
          `http://localhost:5000/api/telemetry/${nodeName}/${selectedStation}?timeFilter=${selectedTimeFilter}&page=${currentPage}`
        );
        
        if (!isMounted) return;
        
        const { data, total, totalPages: pages } = response.data;
        setTotalPages(pages);
        
        // Reverse the data array so time flows from right to left
        if (currentPage === 1) {
          setTelemetryData([...data].reverse());
        } else {
          setTelemetryData(prev => [...prev, ...[...data].reverse()]);
        }
      } catch (error) {
        console.error('Error fetching telemetry data:', error);
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    };

    fetchTelemetryData();
    
    return () => {
      isMounted = false;
    };
  }, [nodeName, selectedStation, selectedTimeFilter, currentPage]);

  const handleStationChange = (event, newValue) => {
    setSelectedStation(newValue);
  };

  const handleTimeFilterChange = (event) => {
    debouncedTimeFilter(event.target.value);
  };

  // Handle scroll for infinite loading
  useEffect(() => {
    const handleScroll = debounce(() => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        if (!isFetching && currentPage < totalPages) {
          setCurrentPage(prev => prev + 1);
        }
      }
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => {
      handleScroll.cancel();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentPage, totalPages, isFetching]);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {nodeName}
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs
          value={selectedStation}
          onChange={handleStationChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          {baseStations.map((station) => (
            <Tab
              key={station.NodeBaseStationName}
              label={station.NodeBaseStationName}
              value={station.NodeBaseStationName}
            />
          ))}
        </Tabs>
        <FormControl sx={{ minWidth: 200, mb: 1 }}>
          <InputLabel id="time-filter-label">Time Range</InputLabel>
          <Select
            labelId="time-filter-label"
            value={selectedTimeFilter}
            label="Time Range"
            onChange={handleTimeFilterChange}
          >
            {TIME_FILTERS.map((filter) => (
              <MenuItem key={filter.value} value={filter.value}>
                {filter.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid xs={12} sm={6} md={4}>
          <TelemetryGraph
            data={telemetryData}
            title="Forward Power"
            dataKey="forwardPower"
            unit="W"
            isLoading={isLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <TelemetryGraph
            data={telemetryData}
            title="Reflected Power"
            dataKey="reflectedPower"
            unit="W"
            isLoading={isLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <TelemetryGraph
            data={telemetryData}
            title="VSWR"
            dataKey="vswr"
            unit=""
            isLoading={isLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <TelemetryGraph
            data={telemetryData}
            title="Return Loss"
            dataKey="returnLoss"
            unit="dB"
            isLoading={isLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <TelemetryGraph
            data={telemetryData}
            title="Temperature"
            dataKey="temperature"
            unit="°C"
            isLoading={isLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <TelemetryGraph
            data={telemetryData}
            title="Voltage"
            dataKey="voltage"
            unit="V"
            isLoading={isLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <TelemetryGraph
            data={telemetryData}
            title="Current"
            dataKey="current"
            unit="A"
            isLoading={isLoading}
          />
        </Grid>
        <Grid xs={12} sm={6} md={4}>
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
