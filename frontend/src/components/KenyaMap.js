import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Alert, 
  Chip, 
  IconButton, 
  Tooltip,
  Paper,
  Avatar,
  Badge,
  useTheme,
  alpha
} from '@mui/material';
import { 
  LocationOn, 
  Refresh, 
  Wifi, 
  WifiOff, 
  HelpOutline,
  ZoomIn,
  ZoomOut,
  MyLocation
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Enhanced custom marker icons with animations
const createCustomIcon = (status, isSelected = false) => {
  const colors = {
    online: '#4CAF50',
    offline: '#F44336', 
    unknown: '#FF9800'
  };
  
  const color = colors[status] || colors.unknown;
  const scale = isSelected ? 1.5 : 1;
  const pulseAnimation = status === 'online' ? `
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
      100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
    }
  ` : '';

  return L.divIcon({
    html: `
      <style>${pulseAnimation}</style>
      <div style="
        background: linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%);
        width: ${24 * scale}px; 
        height: ${24 * scale}px; 
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ${status === 'online' ? 'pulse 2s infinite' : 'none'};
        position: relative;
      ">
        <div style="
          background: white;
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

// Component to auto-fit map to markers
const MapBounds = ({ markers }) => {
  const map = useMap();
  
  useEffect(() => {
    if (markers && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(marker => [marker.lat, marker.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [markers, map]);

  return null;
};

const KenyaMap = ({ selectedNode }) => {
  const [baseStations, setBaseStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [hoveredStation, setHoveredStation] = useState(null);
  const theme = useTheme();

  const fetchBaseStations = async () => {
    try {
      setLoading(true);
      const url = selectedNode 
        ? `${API_BASE_URL}/api/basestations-map?nodeName=${encodeURIComponent(selectedNode)}`
        : `${API_BASE_URL}/api/basestations-map`;
      
      console.log('Fetching base stations from:', url);
      const response = await axios.get(url);
      console.log('Base stations response:', response.data);
      setBaseStations(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching base stations:', err);
      setError('Failed to load base stations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseStations();
    const interval = setInterval(fetchBaseStations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedNode]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <Wifi />;
      case 'offline': return <WifiOff />;
      default: return <HelpOutline />;
    }
  };

  const onlineCount = baseStations.filter(station => station.status === 'online').length;
  const offlineCount = baseStations.filter(station => station.status === 'offline').length;
  const unknownCount = baseStations.filter(station => station.status === 'unknown').length;

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
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
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Alert 
            severity="error" 
            action={
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <IconButton size="small" onClick={fetchBaseStations}>
                  <Refresh />
                </IconButton>
              </motion.div>
            }
            sx={{
              background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1), rgba(244, 67, 54, 0.05))',
              border: '1px solid rgba(244, 67, 54, 0.2)',
              borderRadius: 2
            }}
          >
            {error}
          </Alert>
        </motion.div>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Paper 
          elevation={4}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            p: 2,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a' }}>
              Kenya Base Stations
              {selectedNode && (
                <Typography component="span" variant="caption" sx={{ ml: 1, color: '#666' }}>
                  • {selectedNode}
                </Typography>
              )}
            </Typography>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton size="small" onClick={fetchBaseStations}>
                <Refresh />
              </IconButton>
            </motion.div>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Chip
                icon={<Wifi />}
                label={`${onlineCount} Online`}
                color="success"
                size="small"
                sx={{ 
                  background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                  color: 'white',
                  fontWeight: 600
                }}
              />
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Chip
                icon={<WifiOff />}
                label={`${offlineCount} Offline`}
                color="error"
                size="small"
                sx={{ 
                  background: 'linear-gradient(135deg, #F44336, #d32f2f)',
                  color: 'white',
                  fontWeight: 600
                }}
              />
            </motion.div>
            {unknownCount > 0 && (
              <motion.div whileHover={{ scale: 1.05 }}>
                <Chip
                  icon={<HelpOutline />}
                  label={`${unknownCount} Unknown`}
                  color="warning"
                  size="small"
                  sx={{ 
                    background: 'linear-gradient(135deg, #FF9800, #f57c00)',
                    color: 'white',
                    fontWeight: 600
                  }}
                />
              </motion.div>
            )}
          </Box>
        </Paper>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ height: '100%' }}
      >
        <MapContainer
          center={[-1.2921, 36.8219]}
          zoom={6}
          style={{ 
            height: '100%', 
            width: '100%',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            style={{
              filter: 'brightness(0.9) contrast(1.1)'
            }}
          />
          
          <MapBounds markers={baseStations} />
          
          {baseStations.map((station, index) => (
            <motion.div
              key={station.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 260
              }}
            >
              <Marker
                position={[station.lat, station.lng]}
                icon={createCustomIcon(station.status, selectedStation === station.id)}
                eventHandlers={{
                  click: () => setSelectedStation(station.id),
                  mouseover: () => setHoveredStation(station.id),
                  mouseout: () => setHoveredStation(null)
                }}
              >
                <Popup>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box sx={{ p: 1, minWidth: 200 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                        {station.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(station.status)}
                        <Typography variant="body2" sx={{ 
                          fontWeight: 600,
                          color: station.status === 'online' ? '#4CAF50' : 
                                 station.status === 'offline' ? '#F44336' : '#FF9800'
                        }}>
                          {station.status?.toUpperCase()}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        Lat: {station.lat.toFixed(4)}, Lng: {station.lng.toFixed(4)}
                      </Typography>
                    </Box>
                  </motion.div>
                </Popup>
              </Marker>
            </motion.div>
          ))}
        </MapContainer>
      </motion.div>

      <AnimatePresence>
        {hoveredStation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000
            }}
          >
            <Paper
              elevation={8}
              sx={{
                p: 2,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {baseStations.find(s => s.id === hoveredStation)?.name}
              </Typography>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default KenyaMap;
