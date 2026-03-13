import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Drawer,
  IconButton,
  Typography,
  Fab,
} from '@mui/material';
import {
  Wifi,
  LocationOn,
  DateRange,
  FilterList,
  Close,
} from '@mui/icons-material';
import { useDashboard } from '../../context/DashboardContext';

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

const DashboardControls = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTabletOrPhone = useMediaQuery(theme.breakpoints.down('lg'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const {
    nodes,
    selectedNode,
    handleNodeChange,
    baseStations,
    selectedBaseStation,
    handleBaseStationChange,
    timeFilter,
    handleTimeFilterChange,
    isLoading,
  } = useDashboard();

  if (isMobile) {
    return null; // Hide controls on mobile to save space
  }

  const controlsContent = (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Node Selector */}
      <FormControl 
        size="small" 
        sx={{ 
          minWidth: 200,
          '& .MuiOutlinedInput-root': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          }
        }}
      >
        <InputLabel sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Wifi fontSize="small" sx={{ color: '#30a1e4' }} />
          Node
        </InputLabel>
        <Select
          value={selectedNode || ''}
          onChange={handleNodeChange}
          label="Node"
          disabled={isLoading || nodes.length === 0}
        >
          {nodes.map((node) => (
            <MenuItem key={node.id} value={node.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: '#30a1e4', fontSize: '0.75rem' }}>
                  {node.name.charAt(0).toUpperCase()}
                </Avatar>
                {node.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Base Station Selector */}
      <FormControl 
        size="small" 
        sx={{ 
          minWidth: 200,
          '& .MuiOutlinedInput-root': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          }
        }}
      >
        <InputLabel sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <LocationOn fontSize="small" sx={{ color: '#163d90' }} />
          Base Station
        </InputLabel>
        <Select
          value={selectedBaseStation || ''}
          onChange={handleBaseStationChange}
          label="Base Station"
          disabled={isLoading || !selectedNode || baseStations.length === 0}
        >
          {baseStations.map((station) => (
            <MenuItem key={station.id} value={station.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: '#163d90', fontSize: '0.75rem' }}>
                  {station.name.charAt(0).toUpperCase()}
                </Avatar>
                {station.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Time Range Selector */}
      <FormControl 
        size="small" 
        sx={{ 
          minWidth: 180,
          '& .MuiOutlinedInput-root': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          }
        }}
      >
        <InputLabel sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <DateRange fontSize="small" sx={{ color: '#f59e0b' }} />
          Time Range
        </InputLabel>
        <Select
          value={timeFilter}
          onChange={handleTimeFilterChange}
          label="Time Range"
          disabled={isLoading}
        >
          {TIME_FILTERS.map((filter) => (
            <MenuItem key={filter.value} value={filter.value}>
              {filter.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Loading Indicator */}
      {isLoading && (
        <CircularProgress size={24} sx={{ color: '#30a1e4' }} />
      )}
    </Box>
  );

  // Show bottom sheet on tablet/phone
  if (isTabletOrPhone) {
    return (
      <>
        {/* Floating Action Button */}
        <Fab
          color="primary"
          onClick={() => setDrawerOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            background: 'linear-gradient(135deg, #30a1e4 0%, #163d90 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #2891d4 0%, #0f2d70 100%)',
            },
          }}
        >
          <FilterList />
        </Fab>

        {/* Bottom Sheet Drawer */}
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '70vh',
              backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
            },
          }}
        >
          <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Dashboard Filters
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)} size="small">
                <Close />
              </IconButton>
            </Box>

            {/* Controls in vertical layout */}
            {controlsContent}
          </Box>
        </Drawer>
      </>
    );
  }

  return controlsContent;
};

export default DashboardControls;
