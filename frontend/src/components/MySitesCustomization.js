import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Container,
} from '@mui/material';
import { Tune as TuneIcon } from '@mui/icons-material';

const MySitesCustomization = () => {
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
          <TuneIcon
            sx={{
              fontSize: 80,
              color: 'primary.main',
              opacity: 0.6,
            }}
          />
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
            My Sites Customization
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600 }}>
            This admin page will allow you to customize site configurations, manage site settings,
            and configure site-specific parameters for all sites in the system.
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

export default MySitesCustomization;
