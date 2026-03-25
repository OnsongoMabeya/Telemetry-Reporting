import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  Wifi as WifiIcon,
  DateRange as DateRangeIcon,
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

const MySitesControls = ({ 
  clients, 
  selectedClient, 
  setSelectedClient,
  services,
  selectedService,
  setSelectedService,
  timeFilter,
  setTimeFilter
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
    </Box>
  );
};

export default MySitesControls;
