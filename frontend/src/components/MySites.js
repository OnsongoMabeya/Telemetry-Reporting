import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Container,
} from '@mui/material';
import { LocationOn as LocationOnIcon } from '@mui/icons-material';

const MySites = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 6,
          textAlign: 'center',
          backgroundColor: 'background.paper',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <LocationOnIcon
            sx={{
              fontSize: 80,
              color: 'primary.main',
              opacity: 0.6,
            }}
          />
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
            My Sites
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600 }}>
            This page will display all sites assigned to you. You'll be able to view site details,
            monitor status, and access site-specific information.
          </Typography>
          <Typography
            variant="caption"
            sx={{
              mt: 2,
              px: 3,
              py: 1,
              backgroundColor: 'action.hover',
              color: 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            Coming Soon - Feature Under Development
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default MySites;
