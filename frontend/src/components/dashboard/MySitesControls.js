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
} from '@mui/icons-material';

const MySitesControls = ({ 
  clients, 
  selectedClient, 
  setSelectedClient,
  services,
  selectedService,
  setSelectedService 
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
    </Box>
  );
};

export default MySitesControls;
