import React, { useState, useEffect, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Container,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import axios from '../services/axiosInterceptor';
import { API_BASE_URL } from '../config/api';
import { useMySites } from '../context/MySitesContext';

// Telemetry Graph Component (similar to NodeDetail)
const TelemetryGraph = memo(({ data, title, dataKey, unit, isLoading, lineColor = '#30a1e4', hasCustomColor = false }) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke={theme.palette.mode === 'dark' ? '#374151' : '#e5e7eb'}
        />
        <XAxis
          dataKey="sample_time"
          stroke={theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280'}
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          }}
        />
        <YAxis
          stroke={theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280'}
          style={{ fontSize: '12px' }}
          domain={[0, 'auto']}
          padding={{ top: 40 }}
          label={{ 
            value: unit, 
            angle: -90, 
            position: 'insideLeft',
            style: { fill: theme.palette.mode === 'dark' ? '#9ca3af' : '#6b7280' }
          }}
        />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: theme.palette.mode === 'dark' ? '#1f2937' : '#ffffff',
            border: `1px solid ${theme.palette.mode === 'dark' ? '#374151' : '#e5e7eb'}`,
            color: theme.palette.mode === 'dark' ? '#f3f4f6' : '#111827',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          labelFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleString();
          }}
          formatter={(value) => [`${parseFloat(value).toFixed(2)} ${unit}`, title]}
        />
        {hasCustomColor && (
          <Area
            type="monotone"
            dataKey={dataKey}
            fill={lineColor}
            fillOpacity={0.3}
            stroke="none"
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        )}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={lineColor}
          strokeWidth={theme.palette.mode === 'dark' ? 3 : 2}
          dot={false}
          activeDot={{
            r: 6,
            fill: lineColor,
            stroke: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
            strokeWidth: 2
          }}
          animationDuration={1500}
          animationEasing="ease-in-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});

const MySites = () => {
  const { clients, setClients, selectedClient, setSelectedClient, services, setServices, selectedService, setSelectedService, timeFilter } = useMySites();
  
  const [serviceDetails, setServiceDetails] = useState(null);
  const [telemetryData, setTelemetryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's assigned clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/my-sites/clients`);
        setClients(response.data.data || []);
        
        // Auto-select first client if available
        if (response.data.data && response.data.data.length > 0) {
          setSelectedClient(response.data.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError('Failed to load your assigned clients');
      }
    };

    fetchClients();
  }, [setClients, setSelectedClient]);

  // Fetch services for selected client
  useEffect(() => {
    if (!selectedClient) return;

    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services`);
        setServices(response.data.data || []);
        
        // Auto-select first service if available
        if (response.data.data && response.data.data.length > 0) {
          setSelectedService(response.data.data[0].id);
        } else {
          setSelectedService('');
          setServiceDetails(null);
          setTelemetryData({});
        }
      } catch (err) {
        console.error('Error fetching services:', err);
        setError('Failed to load services for this client');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [selectedClient, setServices, setSelectedService]);

  // Fetch service details and telemetry when service is selected
  useEffect(() => {
    if (!selectedClient || !selectedService) return;

    const fetchServiceData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch service details with metrics
        const detailsResponse = await axios.get(
          `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${selectedService}`
        );
        setServiceDetails(detailsResponse.data.data);

        // Fetch telemetry for each metric
        const metrics = detailsResponse.data.data.metrics || [];
        const telemetryPromises = metrics.map(async (metric) => {
          try {
            const telemetryResponse = await axios.get(
              `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${selectedService}/metrics/${metric.id}/telemetry?timeFilter=${timeFilter}`
            );
            return {
              metricId: metric.id,
              data: telemetryResponse.data.data || []
            };
          } catch (err) {
            console.error(`Error fetching telemetry for metric ${metric.id}:`, err);
            return { metricId: metric.id, data: [] };
          }
        });

        const telemetryResults = await Promise.all(telemetryPromises);
        const telemetryMap = {};
        telemetryResults.forEach(result => {
          telemetryMap[result.metricId] = result.data;
        });
        setTelemetryData(telemetryMap);
      } catch (err) {
        console.error('Error fetching service data:', err);
        setError('Failed to load service data');
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, [selectedClient, selectedService, timeFilter]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <LocationOnIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            My Sites
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          View telemetry data for your assigned services
        </Typography>
      </Box>

      {/* Info Messages */}
      {clients.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No clients have been assigned to you yet. Please contact your administrator.
        </Alert>
      )}

      {selectedClient && services.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No services are assigned to this client yet.
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Service Details and Telemetry Graphs */}
      {selectedService && serviceDetails && (
        <>
          {/* Service Info */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              {serviceDetails.name}
            </Typography>
            {serviceDetails.description && (
              <Typography variant="body2" color="text.secondary">
                {serviceDetails.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {serviceDetails.metrics?.length || 0} metric(s) assigned
            </Typography>
          </Paper>

          {/* Telemetry Graphs */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
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
              {serviceDetails.metrics && serviceDetails.metrics.length > 0 ? (
                serviceDetails.metrics.map((metric) => (
                  <Paper 
                    key={metric.id} 
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
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      {metric.display_name || metric.metric_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      {metric.node_name} - {metric.base_station_name}
                    </Typography>
                    <TelemetryGraph
                      data={telemetryData[metric.id] || []}
                      title={metric.display_name || metric.metric_name}
                      dataKey={metric.metric_name}
                      unit={metric.unit}
                      isLoading={false}
                      lineColor={metric.color || '#30a1e4'}
                      hasCustomColor={!!metric.color}
                    />
                  </Paper>
                ))
              ) : (
                <Paper sx={{ p: 6, gridColumn: '1 / -1', textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No metrics have been assigned to this service yet.
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default MySites;
