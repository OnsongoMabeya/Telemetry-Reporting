import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Container,
  CircularProgress,
  Alert,
  useTheme,
  IconButton,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  FullscreenExit as FullscreenExitIcon,
  WifiOff as WifiOffIcon,
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
  const { 
    clients, setClients, selectedClient, setSelectedClient, 
    services, setServices, selectedService, setSelectedService, 
    timeFilter,
    isPlaying, setIsPlaying,
    currentServiceIndex, setCurrentServiceIndex,
    slideInterval, setSlideInterval
  } = useMySites();
  
  const [serviceDetails, setServiceDetails] = useState(null);
  const [telemetryData, setTelemetryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Slideshow state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [slideCountdown, setSlideCountdown] = useState(0);
  const [nextServiceData, setNextServiceData] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const containerRef = useRef(null);
  const slideshowTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const keepAliveRef = useRef(null);

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

  // ========== SLIDESHOW LOGIC ==========

  // Enter full screen
  const enterFullscreen = useCallback(async () => {
    try {
      const element = containerRef.current;
      if (element) {
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          await element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
          await element.msRequestFullscreen();
        }
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
    }
  }, []);

  // Exit full screen
  const exitFullscreen = useCallback(() => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error('Failed to exit fullscreen:', err);
    }
  }, []);

  // Listen for fullscreen change (ESC key, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && isPlaying) {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isPlaying, setIsPlaying]);

  // Preload next service data
  const preloadNextService = useCallback(async (nextIndex) => {
    if (!selectedClient || !services.length) return;
    const nextService = services[nextIndex];
    if (!nextService) return;

    try {
      const detailsResponse = await axios.get(
        `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${nextService.id}`
      );
      const metrics = detailsResponse.data.data.metrics || [];
      const telemetryPromises = metrics.map(async (metric) => {
        try {
          const telemetryResponse = await axios.get(
            `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${nextService.id}/metrics/${metric.id}/telemetry?timeFilter=${timeFilter}`
          );
          return { metricId: metric.id, data: telemetryResponse.data.data || [] };
        } catch (err) {
          return { metricId: metric.id, data: [] };
        }
      });
      const telemetryResults = await Promise.all(telemetryPromises);
      const telemetryMap = {};
      telemetryResults.forEach(result => { telemetryMap[result.metricId] = result.data; });
      setNextServiceData({ details: detailsResponse.data.data, telemetry: telemetryMap });
      setConnectionError(false);
    } catch (err) {
      console.error('Error preloading next service:', err);
      setConnectionError(true);
    }
  }, [selectedClient, services, timeFilter]);

  // Switch to next service in slideshow
  const switchToNextService = useCallback(() => {
    if (services.length === 0) return;

    // Use preloaded data if available
    if (nextServiceData) {
      setServiceDetails(nextServiceData.details);
      setTelemetryData(nextServiceData.telemetry);
      setNextServiceData(null);
    }

    const nextIndex = (currentServiceIndex + 1) % services.length;
    setCurrentServiceIndex(nextIndex);
    setSelectedService(services[nextIndex].id);
  }, [services, currentServiceIndex, nextServiceData, setCurrentServiceIndex, setSelectedService]);

  // Start slideshow when isPlaying becomes true
  useEffect(() => {
    if (isPlaying && !isPaused && services.length > 0) {
      // Enter fullscreen
      enterFullscreen();

      // Start countdown
      setSlideCountdown(slideInterval);

      // Countdown timer (updates every second)
      countdownTimerRef.current = setInterval(() => {
        setSlideCountdown(prev => {
          if (prev <= 1) return slideInterval;
          return prev - 1;
        });
      }, 1000);

      // Slideshow switch timer
      slideshowTimerRef.current = setInterval(() => {
        switchToNextService();
      }, slideInterval * 1000);

      // Preload next service immediately
      const nextIndex = (currentServiceIndex + 1) % services.length;
      preloadNextService(nextIndex);

      // Keep-alive ping every 25 minutes (before 30-min session timeout)
      keepAliveRef.current = setInterval(async () => {
        try {
          await axios.get(`${API_BASE_URL}/api/my-sites/clients`);
        } catch (err) {
          console.error('Keep-alive ping failed:', err);
        }
      }, 25 * 60 * 1000);

    } else {
      // Clear all timers
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      slideshowTimerRef.current = null;
      countdownTimerRef.current = null;
      keepAliveRef.current = null;
    }

    return () => {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    };
  }, [isPlaying, isPaused, services.length, slideInterval, enterFullscreen, switchToNextService, preloadNextService, currentServiceIndex]);

  // Stop slideshow completely
  const stopSlideshow = useCallback(() => {
    setIsPlaying(false);
    setIsPaused(false);
    exitFullscreen();
  }, [exitFullscreen, setIsPlaying]);

  // Toggle pause
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Preload next service whenever currentServiceIndex changes during slideshow
  useEffect(() => {
    if (isPlaying && !isPaused && services.length > 1) {
      const nextIndex = (currentServiceIndex + 1) % services.length;
      preloadNextService(nextIndex);
    }
  }, [currentServiceIndex, isPlaying, isPaused, services.length, preloadNextService]);

  // Slideshow progress percentage
  const slideProgress = isPlaying && slideInterval > 0
    ? ((slideInterval - slideCountdown) / slideInterval) * 100
    : 0;

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: isFullscreen ? 0 : 4, 
        mb: isFullscreen ? 0 : 4, 
        px: isFullscreen ? 2 : 3,
        height: isFullscreen ? '100vh' : 'auto',
        display: isFullscreen ? 'flex' : 'block',
        flexDirection: 'column',
        overflow: isFullscreen ? 'hidden' : 'visible',
      }}
      ref={containerRef}
    >
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
      {selectedService && serviceDetails ? (
        <Box sx={{ flex: isFullscreen ? 1 : 'unset', overflow: isFullscreen ? 'hidden' : 'visible' }}>
          {/* Service Info */}
          <Paper sx={{ p: isFullscreen ? 1.5 : 3, mb: isFullscreen ? 1 : 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant={isFullscreen ? 'h5' : 'h6'} sx={{ fontWeight: 600 }}>
                  {serviceDetails.name}
                </Typography>
                {serviceDetails.description && (
                  <Typography variant="body2" color="text.secondary">
                    {serviceDetails.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {serviceDetails.metrics?.length || 0} metric(s) assigned
                </Typography>
              </Box>
              {isPlaying && isFullscreen && (
                <Typography variant="caption" color="text.secondary">
                  Service {currentServiceIndex + 1} of {services.length}
                </Typography>
              )}
            </Box>
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
                  md: isFullscreen ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: isFullscreen ? 2 : 3,
                gridAutoRows: isFullscreen ? '1fr' : '300px',
                flex: isFullscreen ? 1 : 'unset',
                overflow: isFullscreen ? 'auto' : 'visible',
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
                      p: isFullscreen ? 1.5 : 2,
                      backgroundColor: 'background.paper',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    <Typography variant={isFullscreen ? 'subtitle2' : 'h6'} sx={{ mb: isFullscreen ? 0.5 : 2, fontWeight: 600 }}>
                      {metric.display_name || metric.metric_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: isFullscreen ? 0.5 : 2 }}>
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
        </Box>
      ) : selectedClient && services.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <WifiOffIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No services assigned to this client
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please contact your administrator to have services assigned.
          </Typography>
        </Paper>
      ) : null}

      {/* ========== SLIDESHOW OVERLAY CONTROLS ========== */}
      {isPlaying && isFullscreen && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 9999,
          }}
        >
          {/* Left: Service info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {services[currentServiceIndex]?.name || 'Unknown Service'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Service {currentServiceIndex + 1} of {services.length} • {slideCountdown}s remaining
            </Typography>
          </Box>

          {/* Center: Progress bar */}
          <Box sx={{ flex: 1, mx: 3, maxWidth: 400 }}>
            <LinearProgress 
              variant="determinate" 
              value={slideProgress} 
              sx={{ 
                height: 4, 
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#30a1e4',
                  borderRadius: 2,
                }
              }}
            />
          </Box>

          {/* Right: Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {connectionError && (
              <Typography variant="caption" sx={{ color: '#f44336', mr: 1 }}>
                No internet connection
              </Typography>
            )}
            <Tooltip title={isPaused ? 'Resume' : 'Pause'}>
              <IconButton 
                onClick={togglePause} 
                size="small" 
                sx={{ color: 'white' }}
              >
                {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Stop Slideshow">
              <IconButton 
                onClick={stopSlideshow} 
                size="small" 
                sx={{ color: 'white' }}
              >
                <StopIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Exit Fullscreen">
              <IconButton 
                onClick={exitFullscreen} 
                size="small" 
                sx={{ color: 'white' }}
              >
                <FullscreenExitIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default MySites;
