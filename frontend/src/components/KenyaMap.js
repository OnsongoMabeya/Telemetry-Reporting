import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Box, Typography, CircularProgress, Alert, Chip, IconButton, Tooltip } from '@mui/material';
import { LocationOn, Refresh } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons based on status
const createCustomIcon = (status) => {
  const color = status === 'online' ? '#4CAF50' : status === 'offline' ? '#F44336' : '#FF9800';
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
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

  const fetchBaseStations = async () => {
    try {
      setLoading(true);
      // Build URL with optional node filter
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
      console.error('Error details:', err.response?.status, err.response?.data);
      setError('Failed to load base stations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseStations();
    // Refresh data every 5 minutes for real-time updates
    const interval = setInterval(fetchBaseStations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedNode]); // Re-fetch when selectedNode changes

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'error';
      default: return 'warning';
    }
  };

  const onlineCount = baseStations.filter(station => station.status === 'online').length;
  const offlineCount = baseStations.filter(station => station.status === 'offline').length;
  const unknownCount = baseStations.filter(station => station.status === 'unknown').length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" action={
          <IconButton size="small" onClick={fetchBaseStations}>
            <Refresh />
          </IconButton>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with BSI branding */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', backgroundColor: '#1976d2' }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
          BSI Base Stations - Kenya
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`Online: ${onlineCount}`} 
            color="success" 
            size="small" 
            variant="outlined"
            sx={{ backgroundColor: 'white', color: '#4CAF50' }}
          />
          <Chip 
            label={`Offline: ${offlineCount}`} 
            color="error" 
            size="small" 
            variant="outlined"
            sx={{ backgroundColor: 'white', color: '#F44336' }}
          />
          <Chip 
            label={`Unknown: ${unknownCount}`} 
            color="warning" 
            size="small" 
            variant="outlined"
            sx={{ backgroundColor: 'white', color: '#FF9800' }}
          />
          <Tooltip title="Refresh data">
            <IconButton 
              size="small" 
              onClick={fetchBaseStations}
              sx={{ color: 'white', ml: 'auto' }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Map Container */}
      <Box sx={{ flex: 1, minHeight: 400 }}>
        <MapContainer
          center={[-1.2921, 36.8219]} // Nairobi coordinates
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapBounds markers={baseStations} />
          
          {baseStations.map((station) => (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={createCustomIcon(station.status)}
              eventHandlers={{
                click: () => setSelectedStation(station),
              }}
            >
              <Popup>
                <Box sx={{ p: 1, minWidth: 200 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    <LocationOn sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 16 }} />
                    {station.name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2">Status:</Typography>
                    <Chip 
                      label={station.status} 
                      color={getStatusColor(station.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Coordinates:</strong><br />
                    Lat: {station.lat.toFixed(4)}<br />
                    Lng: {station.lng.toFixed(4)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {new Date().toLocaleTimeString()}
                  </Typography>
                </Box>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Box>

      {/* Selected Station Details */}
      {selectedStation && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: '#f5f5f5' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Selected Station: {selectedStation.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip 
              label={selectedStation.status} 
              color={getStatusColor(selectedStation.status)}
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              {selectedStation.lat.toFixed(4)}, {selectedStation.lng.toFixed(4)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default KenyaMap;
