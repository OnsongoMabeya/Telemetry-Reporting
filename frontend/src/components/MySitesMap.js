import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Refresh,
  Business,
  Room
} from '@mui/icons-material';
import axios from '../services/axiosInterceptor';
import { API_BASE_URL } from '../config/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Helper function for color alpha (since alpha from @mui/material/styles may not work as expected)
const getAlphaColor = (color, opacity) => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Custom marker icon with status tier color and online/offline distinction
// Offline stations: 80% opacity, gray center, no pulse
// Online stations: full opacity, white center, pulsing animation
const createCustomIcon = (statusColor, isOnline, isSelected = false) => {
  const scale = isSelected ? 1.5 : 1;
  const opacity = isOnline ? '1' : '0.8';
  const centerColor = isOnline ? 'white' : '#999999';
  const borderColor = isOnline ? 'white' : '#cccccc';

  const pulseAnimation = isOnline ? `
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 ${statusColor}B3; }
      70% { box-shadow: 0 0 0 10px ${statusColor}00; }
      100% { box-shadow: 0 0 0 0 ${statusColor}00; }
    }
  ` : '';

  const alphaColor = getAlphaColor(statusColor, 0.8);

  return L.divIcon({
    html: `
      <style>${pulseAnimation}</style>
      <div style="
        background: linear-gradient(135deg, ${statusColor} 0%, ${alphaColor} 100%);
        width: ${24 * scale}px;
        height: ${24 * scale}px;
        border-radius: 50%;
        border: 3px solid ${borderColor};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ${isOnline ? 'pulse 2s infinite' : 'none'};
        position: relative;
        opacity: ${opacity};
        filter: ${isOnline ? 'none' : 'grayscale(30%)'};
      ">
        <div style="
          background: ${centerColor};
          width: ${8 * scale}px;
          height: ${8 * scale}px;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24 * scale, 24 * scale],
    iconAnchor: [12 * scale, 12 * scale],
    popupAnchor: [0, -15 * scale],
    className: 'custom-marker'
  });
};


const MySitesMap = ({ 
  clientId, 
  serviceId, 
  clientName,
  serviceName,
  isPlaying = false,
  isFullscreen = false 
}) => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  
  // Filter states
  const [viewType, setViewType] = useState('client'); // 'client' or 'service'
  const [showGreen, setShowGreen] = useState(true);
  const [showOrange, setShowOrange] = useState(true);
  const [showRed, setShowRed] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(true);

  // Fetch stations when clientId, serviceId, or viewType changes
  const fetchStations = useCallback(async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      
      // Build URL based on view type
      let url = `${API_BASE_URL}/api/my-sites/clients/${clientId}/map-stations`;
      
      // If service view is selected and we have a serviceId, include it
      if (viewType === 'service' && serviceId) {
        url += `?serviceId=${serviceId}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data.success) {
        setStations(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to fetch stations');
      }
    } catch (err) {
      console.error('Error fetching map stations:', err);
      setError(err.response?.data?.message || 'Failed to fetch stations');
    } finally {
      setLoading(false);
    }
  }, [clientId, serviceId, viewType]);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Auto-refresh when slideshow changes service (if in service view)
  useEffect(() => {
    if (isPlaying && viewType === 'service' && serviceId) {
      fetchStations();
    }
  }, [serviceId, isPlaying, viewType, fetchStations]);

  // Apply filters to stations
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      // Status tier filter
      if (!showGreen && station.statusTier === 'good') return false;
      if (!showOrange && station.statusTier === 'warning') return false;
      if (!showRed && station.statusTier === 'critical') return false;
      
      // Online/offline filter
      if (!showOnline && station.status === 'online') return false;
      if (!showOffline && station.status === 'offline') return false;
      
      return true;
    });
  }, [stations, showGreen, showOrange, showRed, showOnline, showOffline]);

  // Count stations by status
  const statusCounts = useMemo(() => {
    return {
      good: stations.filter(s => s.statusTier === 'good').length,
      warning: stations.filter(s => s.statusTier === 'warning').length,
      critical: stations.filter(s => s.statusTier === 'critical').length,
      online: stations.filter(s => s.status === 'online').length,
      offline: stations.filter(s => s.status === 'offline').length
    };
  }, [stations]);

  const handleViewTypeChange = (event, newViewType) => {
    if (newViewType !== null) {
      setViewType(newViewType);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (stations.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No base stations found for this {viewType === 'client' ? 'client' : 'service'}.
      </Alert>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with title, view toggle, and refresh */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        flexWrap: 'wrap',
        gap: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Room sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {clientName} - Base Stations
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* View Type Toggle */}
          <ToggleButtonGroup
            value={viewType}
            exclusive
            onChange={handleViewTypeChange}
            size="small"
          >
            <ToggleButton value="client">
              <Business sx={{ fontSize: 16, mr: 0.5 }} />
              Client
            </ToggleButton>
            <ToggleButton value="service" disabled={!serviceId}>
              <Room sx={{ fontSize: 16, mr: 0.5 }} />
              Service
            </ToggleButton>
          </ToggleButtonGroup>
          
          <IconButton onClick={fetchStations} size="small">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1, 
        mb: 2,
        alignItems: 'center'
      }}>
        {/* Status Tier Filters */}
        <Chip
          label={`Good (${statusCounts.good})`}
          size="small"
          onClick={() => setShowGreen(!showGreen)}
          sx={{
            backgroundColor: showGreen ? '#1FC700' : 'transparent',
            color: showGreen ? 'white' : '#1FC700',
            border: '1px solid #1FC700',
            cursor: 'pointer'
          }}
        />
        <Chip
          label={`Warning (${statusCounts.warning})`}
          size="small"
          onClick={() => setShowOrange(!showOrange)}
          sx={{
            backgroundColor: showOrange ? '#CF8700' : 'transparent',
            color: showOrange ? 'white' : '#CF8700',
            border: '1px solid #CF8700',
            cursor: 'pointer'
          }}
        />
        <Chip
          label={`Critical (${statusCounts.critical})`}
          size="small"
          onClick={() => setShowRed(!showRed)}
          sx={{
            backgroundColor: showRed ? '#D92A00' : 'transparent',
            color: showRed ? 'white' : '#D92A00',
            border: '1px solid #D92A00',
            cursor: 'pointer'
          }}
        />
        
        <Box sx={{ width: 8 }} />
        
        {/* Online/Offline Filters */}
        <FormControlLabel
          control={
            <Switch
              checked={showOnline}
              onChange={(e) => setShowOnline(e.target.checked)}
              size="small"
            />
          }
          label={`Online (${statusCounts.online})`}
        />
        <FormControlLabel
          control={
            <Switch
              checked={showOffline}
              onChange={(e) => setShowOffline(e.target.checked)}
              size="small"
            />
          }
          label={`Offline (${statusCounts.offline})`}
        />
      </Box>

      {/* Map Container */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 300 }}>
        <MapContainer
          center={[0.1769, 37.9083]} // Kenya center
          zoom={6}
          style={{ height: '100%', width: '100%', borderRadius: 8 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {filteredStations.map((station) => (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={createCustomIcon(
                station.statusColor,
                station.status === 'online',
                selectedStation === station.id
              )}
              eventHandlers={{
                click: () => setSelectedStation(station.id),
                popupclose: () => setSelectedStation(null)
              }}
            >
              <Popup>
                <Box sx={{ p: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    {station.name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: station.statusColor
                      }}
                    />
                    <Typography variant="body2">
                      Status: {station.statusTier} ({station.statusValue})
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: station.status === 'online' ? '#1FC700' : '#D92A00'
                      }}
                    />
                    <Typography variant="body2">
                      {station.status === 'online' ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                  
                  {station.lastStatusUpdate && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Last update: {new Date(station.lastStatusUpdate).toLocaleString()}
                    </Typography>
                  )}
                  
                  {!station.hasLiveData && (
                    <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
                      Using fallback coordinates
                    </Typography>
                  )}
                </Box>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Station count overlay */}
        <Paper
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            p: 1,
            bgcolor: 'background.paper',
            zIndex: 1000
          }}
        >
          <Typography variant="caption">
            Showing {filteredStations.length} of {stations.length} stations
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default MySitesMap;
