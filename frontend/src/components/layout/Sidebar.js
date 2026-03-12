import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  Brightness4,
  Brightness7,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useThemeMode } from '../../context/ThemeContext';

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 60;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  
  const [collapsed, setCollapsed] = useState(false);

  const hasRole = (role) => {
    if (!user || !user.role) return false;
    return user.role === role || user.role === 'admin';
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      roles: ['admin', 'manager', 'viewer'],
    },
    {
      title: 'Visualization Settings',
      icon: <SettingsIcon />,
      path: '/visualization-settings',
      roles: ['admin'],
    },
    {
      title: 'User Management',
      icon: <PeopleIcon />,
      path: '/users',
      roles: ['admin'],
    },
    {
      title: 'Alerts',
      icon: <NotificationsIcon />,
      path: '/alerts',
      roles: ['admin'],
    },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    item.roles.some(role => hasRole(role))
  );

  const handleNavigation = (path) => {
    navigate(path);
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: sidebarWidth,
          boxSizing: 'border-box',
          backgroundColor: mode === 'dark' ? '#0f172a' : '#163d90',
          color: 'white',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
        },
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: collapsed ? 1 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 80,
          backgroundColor: mode === 'dark' ? '#1e293b' : '#0f1f4d',
          position: 'relative',
        }}
      >
        <Box
          component="img"
          src="/bsilogo512.png"
          alt="BSI Logo"
          sx={{
            height: collapsed ? 32 : 48,
            width: 'auto',
            maxWidth: '100%',
            objectFit: 'contain',
            transition: theme.transitions.create('height', {
              duration: theme.transitions.duration.standard,
            }),
          }}
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Tooltip
              key={item.path}
              title={collapsed ? item.title : ''}
              placement="right"
              arrow
            >
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    mx: 1,
                    borderRadius: 2,
                    backgroundColor: isActive 
                      ? 'rgba(48, 161, 228, 0.15)' 
                      : 'transparent',
                    borderLeft: isActive ? '3px solid #30a1e4' : '3px solid transparent',
                    '&:hover': {
                      backgroundColor: isActive
                        ? 'rgba(48, 161, 228, 0.25)'
                        : 'rgba(255, 255, 255, 0.08)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? '#30a1e4' : 'rgba(255, 255, 255, 0.7)',
                      minWidth: collapsed ? 0 : 40,
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.title}
                      sx={{
                        '& .MuiTypography-root': {
                          fontSize: '0.9rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#30a1e4' : 'rgba(255, 255, 255, 0.9)',
                        },
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </Tooltip>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      {/* Bottom Section: Dark Mode Toggle & Collapse Button */}
      <Box sx={{ p: 1 }}>
        <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'} placement="right" arrow>
          <IconButton
            onClick={toggleTheme}
            sx={{
              width: '100%',
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#30a1e4',
              },
              mb: 1,
            }}
          >
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            {!collapsed && (
              <Box component="span" sx={{ ml: 1, fontSize: '0.875rem' }}>
                {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Box>
            )}
          </IconButton>
        </Tooltip>

        {!isMobile && (
          <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right" arrow>
            <IconButton
              onClick={toggleCollapse}
              sx={{
                width: '100%',
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#30a1e4',
                },
              }}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;
