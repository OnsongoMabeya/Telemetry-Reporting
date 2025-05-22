import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Grid, Paper, Box, Tab, Tabs } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const TelemetryGraph = ({ data, title, dataKey, unit }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
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
};

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

const NodeDetail = () => {
  const { nodeName } = useParams();
  const [baseStations, setBaseStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [telemetryData, setTelemetryData] = useState([]);

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
    const fetchTelemetryData = async () => {
      if (!selectedStation) return;
      
      try {
        const response = await axios.get(
          `http://localhost:5000/api/telemetry/${nodeName}/${selectedStation}`
        );
        setTelemetryData(response.data);
      } catch (error) {
        console.error('Error fetching telemetry data:', error);
      }
    };

    fetchTelemetryData();
  }, [nodeName, selectedStation]);

  const handleStationChange = (event, newValue) => {
    setSelectedStation(newValue);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {nodeName}
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
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
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TelemetryGraph
            data={telemetryData}
            title="Forward Power"
            dataKey="forwardPower"
            unit="W"
          />
        </Grid>
        <Grid item xs={12}>
          <TelemetryGraph
            data={telemetryData}
            title="Reflected Power"
            dataKey="reflectedPower"
            unit="W"
          />
        </Grid>
        <Grid item xs={12}>
          <TelemetryGraph
            data={telemetryData}
            title="VSWR"
            dataKey="vswr"
            unit=""
          />
        </Grid>
        <Grid item xs={12}>
          <TelemetryGraph
            data={telemetryData}
            title="Return Loss"
            dataKey="returnLoss"
            unit="dB"
          />
        </Grid>
        <Grid item xs={12}>
          <TelemetryGraph
            data={telemetryData}
            title="Temperature"
            dataKey="temperature"
            unit="°C"
          />
        </Grid>
        <Grid item xs={12}>
          <TelemetryGraph
            data={telemetryData}
            title="Voltage"
            dataKey="voltage"
            unit="V"
          />
        </Grid>
        <Grid item xs={12}>
          <TelemetryGraph
            data={telemetryData}
            title="Current"
            dataKey="current"
            unit="A"
          />
        </Grid>
        <Grid item xs={12}>
          <TelemetryGraph
            data={telemetryData}
            title="Power"
            dataKey="power"
            unit="W"
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default NodeDetail;
