import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Person,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import DashboardControls from '../dashboard/DashboardControls';
import GenerateReportButton from '../dashboard/GenerateReportButton';

const TopHeader = () => {
  const theme = useTheme();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const isDashboard = location.pathname === '/';

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = async () => {
    handleUserMenuClose();
    await logout();
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        left: { xs: 60, lg: 220 },
        width: { xs: 'calc(100% - 60px)', lg: 'calc(100% - 220px)' },
        backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
        color: theme.palette.mode === 'dark' ? '#f1f5f9' : '#1a202c',
        borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
        transition: theme.transitions.create(['left', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64 }}>
        {/* Left Section: Dashboard Controls (conditionally rendered) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          {isDashboard && <DashboardControls />}
        </Box>

        {/* Right Section: Generate Report Button & User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isDashboard && <GenerateReportButton />}

          {/* User Profile Menu */}
          <IconButton
            onClick={handleUserMenuOpen}
            sx={{
              background: 'linear-gradient(135deg, #30a1e4 0%, #163d90 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2891d4 0%, #0f2d70 100%)',
              },
            }}
          >
            <Person sx={{ color: 'white' }} />
          </IconButton>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {user?.username || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {user?.role || 'viewer'}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={handleLogout}
              sx={{
                py: 1.5,
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 0.08)',
                },
              }}
            >
              <Logout sx={{ mr: 1.5, fontSize: 20 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopHeader;
