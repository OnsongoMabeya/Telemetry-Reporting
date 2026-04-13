import React, { useState, useEffect, memo, useRef, useCallback, useMemo } from 'react';
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
  Button,
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  FullscreenExit as FullscreenExitIcon,
  WifiOff as WifiOffIcon,
  ErrorOutline as ErrorOutlineIcon,
  Refresh as RefreshIcon,
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
import { useAuth } from '../context/AuthContext';

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

// Fetch telemetry for multiple metrics in staggered chunks to avoid rate limiting
const fetchTelemetryStaggered = async (metrics, buildUrl, chunkSize = 5, delayMs = 150) => {
  const failedIds = new Set();
  const results = [];

  for (let i = 0; i < metrics.length; i += chunkSize) {
    const chunk = metrics.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (metric) => {
        try {
          const response = await axios.get(buildUrl(metric));
          return { metricId: metric.id, data: response.data.data || [], failed: false };
        } catch (err) {
          console.error(`Error fetching telemetry for metric ${metric.id}:`, err);
          failedIds.add(metric.id);
          return { metricId: metric.id, data: [], failed: true };
        }
      })
    );
    results.push(...chunkResults);
    // Small delay between chunks to stay under rate limits
    if (i + chunkSize < metrics.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const telemetryMap = {};
  results.forEach(result => { telemetryMap[result.metricId] = result.data; });
  return { telemetryMap, failedIds };
};

// Telemetry Graph Component (matching NodeDetail quality)
const TelemetryGraph = memo(({ data, title, dataKey, unit, isLoading, lineColor = '#30a1e4', hasCustomColor = false, hasError = false, onRetry = null }) => {
  const theme = useTheme();

  // Determine the actual color to use for line and area
  const actualLineColor = hasCustomColor
    ? lineColor
    : (theme.palette.mode === 'dark' ? '#60a5fa' : '#30a1e4');

  // Transform data: convert sample_time string to numeric timestamp for proper time scale
  const transformedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(item => ({
      ...item,
      timestamp: new Date(item.sample_time).getTime()
    })).filter(item => !isNaN(item.timestamp));
  }, [data]);

  // Downsample data for smooth rendering (max 200 points)
  const downsampledData = useMemo(() => {
    if (!transformedData || transformedData.length === 0) return [];
    const maxPoints = 200;
    if (transformedData.length <= maxPoints) return transformedData;
    const step = Math.ceil(transformedData.length / maxPoints);
    return transformedData.filter((_, index) => index % step === 0);
  }, [transformedData]);

  // Smart X-axis formatter with Nairobi timezone
  const formatXAxis = useCallback((tickItem) => {
    if (!tickItem) return '';
    try {
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return '';

      if (!transformedData || transformedData.length < 2) {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi', hour12: false
        }).format(date);
      }

      const timeRange = transformedData[transformedData.length - 1].timestamp - transformedData[0].timestamp;
      const hours = timeRange / (1000 * 60 * 60);

      if (hours <= 24) {
        return new Intl.DateTimeFormat('en-US', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi', hour12: false
        }).format(date);
      } else if (hours <= 168) {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', timeZone: 'Africa/Nairobi', hour12: false
        }).format(date);
      } else {
        return new Intl.DateTimeFormat('en-US', {
          month: 'short', day: 'numeric', timeZone: 'Africa/Nairobi'
        }).format(date);
      }
    } catch (error) {
      return '';
    }
  }, [transformedData]);

  // Calculate time domain from data
  const getTimeDomain = useCallback(() => {
    if (!transformedData || transformedData.length === 0) return ['auto', 'auto'];
    const timestamps = transformedData.map(d => d.timestamp);
    return [Math.min(...timestamps), Math.max(...timestamps)];
  }, [transformedData]);

  // Calculate nice Y-axis scale with round ticks
  const getYAxisScale = useCallback(() => {
    if (!transformedData || transformedData.length === 0) {
      return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] };
    }

    const values = transformedData.map(item => Number(item[dataKey]) || 0).filter(v => !isNaN(v));
    if (values.length === 0) {
      return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] };
    }

    const max = Math.max(...values);
    if (max === 0) {
      return { domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1] };
    }

    const padding = max * 0.1;
    const domainMax = max + padding;
    const step = domainMax / 4;
    const ticks = [0, step, step * 2, step * 3, domainMax];

    return { domain: [0, domainMax], ticks };
  }, [transformedData, dataKey]);

  // Y-axis tick formatter with unit awareness
  const formatYAxis = useCallback((value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0);
  }, []);

  // Latest value for bottom-left display
  const latestDisplay = useMemo(() => {
    if (!transformedData || transformedData.length === 0) return null;
    const latestItem = transformedData[transformedData.length - 1];
    const rawValue = latestItem?.[dataKey];
    if (rawValue == null || isNaN(Number(rawValue))) return null;
    return `${formatYAxis(Number(rawValue))}${unit ? ` ${unit}` : ''}`;
  }, [transformedData, dataKey, unit, formatYAxis]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
        <CircularProgress size={40} sx={{ color: actualLineColor }} />
      </Box>
    );
  }

  if (hasError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200, gap: 1 }}>
        <ErrorOutlineIcon sx={{ fontSize: 32, color: 'error.main' }} />
        <Typography variant="body2" color="text.secondary">
          Failed to load data
        </Typography>
        {onRetry && (
          <Button size="small" variant="outlined" color="primary" onClick={onRetry} startIcon={<RefreshIcon />}>
            Retry
          </Button>
        )}
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Graph Title & Unit */}
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
              tickFormatter={formatYAxis}
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
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
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

      {/* Latest Value */}
      {latestDisplay && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: actualLineColor }}>
            {latestDisplay}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

const MySites = () => {
  const { 
    clients, setClients, selectedClient, setSelectedClient, 
    services, setServices, selectedService, setSelectedService, 
    timeFilter,
    isPlaying, setIsPlaying,
    currentServiceIndex, setCurrentServiceIndex,
    slideInterval,
    enterFullscreenRef
  } = useMySites();
  const { refreshToken } = useAuth();
  
  const [serviceDetails, setServiceDetails] = useState(null);
  const [telemetryData, setTelemetryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Slideshow state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [slideCountdown, setSlideCountdown] = useState(0);
  const [, setNextServiceData] = useState(null);
  const [connectionError, setConnectionError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [failedMetrics, setFailedMetrics] = useState(new Set());
  const containerRef = useRef(null);
  const slideshowTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const keepAliveRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const nextServiceDataRef = useRef(null);
  const skipNextFetchRef = useRef(false);

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
  // Skip if slideshow has already preloaded the data
  useEffect(() => {
    if (!selectedClient || !selectedService) return;
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const fetchServiceData = async () => {
      try {
        setLoading(true);
        setError(null);
        setFailedMetrics(new Set());

        // Fetch service details with metrics
        const detailsResponse = await axios.get(
          `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${selectedService}`
        );
        setServiceDetails(detailsResponse.data.data);

        // Fetch telemetry for each metric (staggered to avoid rate limiting)
        const metrics = detailsResponse.data.data.metrics || [];
        const { telemetryMap, failedIds } = await fetchTelemetryStaggered(
          metrics,
          (metric) => `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${selectedService}/metrics/${metric.id}/telemetry?timeFilter=${timeFilter}`
        );
        setTelemetryData(telemetryMap);
        setFailedMetrics(failedIds);
      } catch (err) {
        console.error('Error fetching service data:', err);
        if (err.response?.status === 403 && isPlaying) {
          // Access denied during slideshow — skip to next service
          setTimeout(() => switchToNextService(), 500);
        } else {
          setError('Failed to load service data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchServiceData();
  }, [selectedClient, selectedService, timeFilter, isPlaying, switchToNextService]);

  // Retry a single failed metric
  const retryMetric = useCallback(async (metricId) => {
    if (!selectedClient || !selectedService) return;
    try {
      const telemetryResponse = await axios.get(
        `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${selectedService}/metrics/${metricId}/telemetry?timeFilter=${timeFilter}`
      );
      setTelemetryData(prev => ({ ...prev, [metricId]: telemetryResponse.data.data || [] }));
      setFailedMetrics(prev => {
        const next = new Set(prev);
        next.delete(metricId);
        return next;
      });
    } catch (err) {
      console.error(`Retry failed for metric ${metricId}:`, err);
    }
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
      // Fullscreen may fail if not triggered by user gesture — non-critical
      console.warn('Fullscreen not available:', err.message);
    }
  }, []);

  // Expose enterFullscreen to context so the click handler can call it
  // within the user gesture stack (browsers require this for requestFullscreen)
  useEffect(() => {
    enterFullscreenRef.current = enterFullscreen;
  }, [enterFullscreen, enterFullscreenRef]);

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
      const { telemetryMap, failedIds } = await fetchTelemetryStaggered(
        metrics,
        (metric) => `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${nextService.id}/metrics/${metric.id}/telemetry?timeFilter=${timeFilter}`
      );
      const preloadedData = { details: detailsResponse.data.data, telemetry: telemetryMap, failedMetrics: failedIds };
      setNextServiceData(preloadedData);
      nextServiceDataRef.current = preloadedData;
      setConnectionError(false);
    } catch (err) {
      console.error('Error preloading next service:', err);
      if (err.response?.status === 403) {
        // Access denied — mark as inaccessible so slideshow skips it
        const inaccessibleData = { details: null, telemetry: {}, failedMetrics: new Set(), inaccessible: true };
        setNextServiceData(inaccessibleData);
        nextServiceDataRef.current = inaccessibleData;
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        // Only set connectionError for actual network errors, not server errors (5xx)
        setConnectionError(true);
      }
    }
  }, [selectedClient, services, timeFilter]);

  // Switch to next service in slideshow
  const switchToNextService = useCallback(() => {
    if (services.length === 0) return;

    // Fade out transition
    setIsTransitioning(true);

    setTimeout(() => {
      // Use preloaded data from ref (avoids stale closure)
      const preloaded = nextServiceDataRef.current;
      if (preloaded?.inaccessible) {
        // Service returned 403 — skip it and move to the next one
        nextServiceDataRef.current = null;
        setNextServiceData(null);
        const nextIndex = (currentServiceIndex + 1) % services.length;
        setCurrentServiceIndex(nextIndex);
        setSelectedService(services[nextIndex].id);
        setIsTransitioning(false);
        // Immediately trigger another switch to skip the inaccessible service
        setTimeout(() => switchToNextService(), 100);
        return;
      }
      if (preloaded) {
        setServiceDetails(preloaded.details);
        setTelemetryData(preloaded.telemetry);
        setFailedMetrics(preloaded.failedMetrics || new Set());
        setNextServiceData(null);
        nextServiceDataRef.current = null;
        // Skip the normal fetch since we already have the data
        skipNextFetchRef.current = true;
      }

      const nextIndex = (currentServiceIndex + 1) % services.length;
      setCurrentServiceIndex(nextIndex);
      setSelectedService(services[nextIndex].id);
      if (!preloaded) {
        setFailedMetrics(new Set());
      }

      // Fade in
      setIsTransitioning(false);
    }, 300);
  }, [services, currentServiceIndex, setCurrentServiceIndex, setSelectedService]);

  // Auto-skip to next service if all metrics failed during slideshow
  useEffect(() => {
    if (!isPlaying || !isFullscreen || !serviceDetails) return;
    const totalMetrics = serviceDetails.metrics?.length || 0;
    if (totalMetrics === 0) return;
    if (failedMetrics.size === totalMetrics && totalMetrics > 0) {
      console.warn('All metrics failed to load, auto-skipping to next service in 5s');
      const skipTimer = setTimeout(() => {
        switchToNextService();
      }, 5000);
      return () => clearTimeout(skipTimer);
    }
  }, [failedMetrics, isPlaying, isFullscreen, serviceDetails, switchToNextService]);

  // Start slideshow when isPlaying becomes true
  useEffect(() => {
    if (isPlaying && !isPaused && services.length > 0) {
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
      // Also refreshes the JWT token to prevent session expiry
      keepAliveRef.current = setInterval(async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/keep-alive`);
          if (response.data.token) {
            refreshToken(response.data.token);
          }
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
  }, [isPlaying, isPaused, services.length, slideInterval, switchToNextService, preloadNextService, currentServiceIndex, refreshToken]);

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

  // ========== AUTO-HIDE CONTROLS ==========
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  }, []);

  // Show controls on mouse move during slideshow
  useEffect(() => {
    if (!isPlaying || !isFullscreen) return;

    const handleMouseMove = () => showControls();
    const handleClick = () => showControls();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    // Initial auto-hide
    showControls();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying, isFullscreen, showControls]);

  // ========== INTERNET DISCONNECTION DETECTION ==========
  const [wasDisconnected, setWasDisconnected] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const checkConnection = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/keep-alive`, { timeout: 5000 });
        if (response.data.token) {
          refreshToken(response.data.token);
        }
        if (connectionError) {
          setConnectionError(false);
          setWasDisconnected(true);
        }
      } catch (err) {
        if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
          setConnectionError(true);
        }
      }
    };

    // Check connection every 10 seconds during slideshow
    retryTimerRef.current = setInterval(checkConnection, 10000);

    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, [isPlaying, connectionError, refreshToken]);

  // Reload current service data when connection is restored after disconnection
  useEffect(() => {
    if (!wasDisconnected || !selectedClient || !selectedService) return;

    const reloadCurrentService = async () => {
      try {
        const detailsResponse = await axios.get(
          `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${selectedService}`
        );
        setServiceDetails(detailsResponse.data.data);

        const metrics = detailsResponse.data.data.metrics || [];
        const { telemetryMap } = await fetchTelemetryStaggered(
          metrics,
          (metric) => `${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services/${selectedService}/metrics/${metric.id}/telemetry?timeFilter=${timeFilter}`
        );
        setTelemetryData(telemetryMap);
        setWasDisconnected(false);
      } catch (err) {
        console.error('Error reloading service data after reconnection:', err);
      }
    };

    reloadCurrentService();
  }, [wasDisconnected, selectedClient, selectedService, timeFilter]);

  // ========== DYNAMIC SERVICE LIST REFRESH ==========
  useEffect(() => {
    if (!isPlaying || !selectedClient) return;

    // Refresh service list every full cycle (services.length * slideInterval seconds)
    const cycleDuration = services.length * slideInterval * 1000;
    const minRefreshInterval = 60000; // At least every 60 seconds
    const refreshInterval = Math.max(cycleDuration, minRefreshInterval);

    const refreshServices = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/my-sites/clients/${selectedClient}/services`);
        const refreshedServices = response.data.data || [];
        if (JSON.stringify(refreshedServices.map(s => s.id)) !== JSON.stringify(services.map(s => s.id))) {
          setServices(refreshedServices);
        }
      } catch (err) {
        console.error('Error refreshing services:', err);
      }
    };

    const refreshTimer = setInterval(refreshServices, refreshInterval);

    return () => clearInterval(refreshTimer);
  }, [isPlaying, selectedClient, services, slideInterval, setServices]);

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
      {/* Header - hidden during fullscreen slideshow */}
      {!isFullscreen && (
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
      )}

      {/* Info Messages - hidden during fullscreen slideshow */}
      {!isFullscreen && clients.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No clients have been assigned to you yet. Please contact your administrator.
        </Alert>
      )}

      {!isFullscreen && selectedClient && services.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No services are assigned to this client yet.
        </Alert>
      )}

      {/* Error Display - hidden during fullscreen slideshow */}
      {!isFullscreen && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Service Details and Telemetry Graphs */}
      {selectedService && serviceDetails ? (
        <Box 
          sx={{ 
            flex: isFullscreen ? 1 : 'unset', 
            overflow: isFullscreen ? 'hidden' : 'visible',
            opacity: isTransitioning ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
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
                gap: isFullscreen ? 1.5 : 3,
                gridAutoRows: isFullscreen ? '1fr' : '300px',
                flex: isFullscreen ? 1 : 'unset',
                overflow: isFullscreen ? 'auto' : 'visible',
                ...(isFullscreen && {
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                }),
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
                    <TelemetryGraph
                      data={telemetryData[metric.id] || []}
                      title={`${metric.display_name || metric.metric_name} — ${metric.node_name} - ${metric.base_station_name}`}
                      dataKey={metric.metric_name}
                      unit={metric.unit}
                      isLoading={false}
                      lineColor={metric.color || '#30a1e4'}
                      hasCustomColor={!!metric.color}
                      hasError={failedMetrics.has(metric.id)}
                      onRetry={() => retryMetric(metric.id)}
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

      {/* ========== SLIDESHOW TOP HEADER ========== */}
      {isPlaying && isFullscreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
            color: 'white',
            p: 2,
            pb: 4,
            zIndex: 9999,
            opacity: controlsVisible ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: controlsVisible ? 'auto' : 'none',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            {services[currentServiceIndex]?.name || 'Unknown Service'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
              {clients.find(c => c.id === selectedClient)?.name || 'Unknown Client'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              Time Range: {TIME_FILTERS.find(f => f.value === timeFilter)?.label || timeFilter}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              Speed: {slideInterval}s per service
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              Service {currentServiceIndex + 1} of {services.length}
            </Typography>
          </Box>
        </Box>
      )}

      {/* ========== SLIDESHOW BOTTOM CONTROLS ========== */}
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
            opacity: controlsVisible ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: controlsVisible ? 'auto' : 'none',
          }}
        >
          {/* Left: Countdown */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {slideCountdown}s
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              until next service
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

      {/* ========== INTERNET DISCONNECTION OVERLAY ========== */}
      {isPlaying && isFullscreen && connectionError && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
          }}
        >
          <WifiOffIcon sx={{ fontSize: 64, color: '#f44336', mb: 2 }} />
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
            No Internet Connection
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
            Please check your network connection
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Retrying automatically...
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default MySites;
