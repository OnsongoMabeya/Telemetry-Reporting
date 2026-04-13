import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  Wifi as WifiIcon,
  DateRange as DateRangeIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

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

const SLIDE_SPEEDS = [
  { value: 10, label: '10 seconds' },
  { value: 20, label: '20 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
];

const MySitesControls = ({ 
  clients, 
  selectedClient, 
  setSelectedClient,
  services,
  selectedService,
  setSelectedService,
  timeFilter,
  setTimeFilter,
  isPlaying,
  setIsPlaying,
  slideInterval,
  setSlideInterval
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Client Selector */}
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Client</InputLabel>
        <Select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          label="Client"
          disabled={clients.length === 0}
        >
          {clients.map((client) => (
            <MenuItem key={client.id} value={client.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon fontSize="small" />
                {client.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Service Selector */}
      {selectedClient && (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Service</InputLabel>
          <Select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            label="Service"
            disabled={services.length === 0}
          >
            {services.map((service) => (
              <MenuItem key={service.id} value={service.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WifiIcon fontSize="small" />
                  {service.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Time Range Selector */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <DateRangeIcon fontSize="small" sx={{ color: '#f59e0b' }} />
          Time Range
        </InputLabel>
        <Select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          label="Time Range"
        >
          {TIME_FILTERS.map((filter) => (
            <MenuItem key={filter.value} value={filter.value}>
              {filter.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Speed Selector */}
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <SpeedIcon fontSize="small" sx={{ color: '#8b5cf6' }} />
          Speed
        </InputLabel>
        <Select
          value={slideInterval}
          onChange={(e) => setSlideInterval(Number(e.target.value))}
          label="Speed"
        >
          {SLIDE_SPEEDS.map((speed) => (
            <MenuItem key={speed.value} value={speed.value}>
              {speed.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Play/Stop Button */}
      <Tooltip title={isPlaying ? 'Stop Slideshow' : 'Start Slideshow'}>
        <IconButton
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={!selectedClient || services.length === 0}
          sx={{
            backgroundColor: isPlaying 
              ? 'error.main' 
              : 'success.main',
            color: 'white',
            '&:hover': {
              backgroundColor: isPlaying 
                ? 'error.dark' 
                : 'success.dark',
            },
            '&:disabled': {
              backgroundColor: 'action.disabledBackground',
              color: 'action.disabled',
            },
          }}
        >
          {isPlaying ? <StopIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default MySitesControls;
