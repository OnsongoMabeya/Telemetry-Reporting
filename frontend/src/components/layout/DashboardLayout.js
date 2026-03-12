import React from 'react';
import { Box, useTheme } from '@mui/material';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { DashboardProvider } from '../../context/DashboardContext';

const DashboardLayout = ({ children }) => {
  const theme = useTheme();

  return (
    <DashboardProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            ml: { xs: '60px', md: '220px' },
            minHeight: '100vh',
            backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#f0f6fc',
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          {/* Top Header */}
          <TopHeader />

          {/* Page Content */}
          <Box
            sx={{
              mt: '64px', // Height of TopHeader
              p: { xs: 2, sm: 3, md: 4 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </DashboardProvider>
  );
};

export default DashboardLayout;
