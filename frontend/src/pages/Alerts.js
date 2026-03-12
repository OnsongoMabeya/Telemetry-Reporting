import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';

const Alerts = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Alerts
      </Typography>

      <Paper
        sx={{
          p: 4,
          borderRadius: 4,
          textAlign: 'center',
          backgroundColor: 'background.paper',
        }}
      >
        <NotificationsIcon sx={{ fontSize: 64, color: '#30a1e4', mb: 2 }} />
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          Alerts System
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
          Alert management functionality will be implemented here.
        </Typography>
        <Alert severity="info">
          This feature is under development. Stay tuned for updates!
        </Alert>
      </Paper>
    </Box>
  );
};

export default Alerts;
