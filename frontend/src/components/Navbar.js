import React, { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Fade
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Home, 
  Assessment, 
  Map, 
  Settings,
  Brightness4,
  Brightness7
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const menuItems = [
    { icon: <Home />, label: 'Dashboard', path: '/' },
    { icon: <Assessment />, label: 'Analytics', path: '/analytics' },
    { icon: <Map />, label: 'Map View', path: '/map' },
    { icon: <Settings />, label: 'Settings', path: '/settings' }
  ];

  return (
    <AnimatePresence>
      <AppBar 
        position="fixed"
        sx={{
          background: scrolled 
            ? 'rgba(17, 25, 40, 0.95)' 
            : 'rgba(17, 25, 40, 0.85)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: scrolled 
            ? '1px solid rgba(255, 255, 255, 0.125)' 
            : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: scrolled
            ? '0 4px 30px rgba(0, 0, 0, 0.1)'
            : '0 4px 20px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease',
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Container maxWidth="xl">
          <Toolbar 
            sx={{
              minHeight: { xs: 64, md: 72 },
              padding: { xs: 1, md: 2 }
            }}
          >
            {/* Logo Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                flexGrow: 1
              }}
            >
              <Box
                component="img"
                src="/bsilogo512.png"
                alt="BSI Logo"
                sx={{
                  height: { xs: 32, md: 40 },
                  width: 'auto',
                  marginRight: { xs: 1.5, md: 2 },
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  transition: 'transform 0.3s ease'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              />
              
              <Typography
                variant="h5"
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 800,
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                  letterSpacing: '-0.5px'
                }}
              >
                BSI Telemetry
              </Typography>
              
              <Typography
                variant="caption"
                component={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginLeft: 1,
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                }}
              >
                Real-time Monitoring
              </Typography>
            </motion.div>

            {/* Desktop Navigation */}
            {!isMobile && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1
                }}
              >
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)'
                        }
                      }}
                    >
                      <Box sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        {item.icon}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontWeight: 500
                        }}
                      >
                        {item.label}
                      </Typography>
                    </Box>
                  </motion.div>
                ))}
                
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <IconButton
                    onClick={toggleDarkMode}
                    sx={{
                      ml: 2,
                      background: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)'
                      }
                    }}
                  >
                    {darkMode ? (
                      <Brightness7 sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                    ) : (
                      <Brightness4 sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                    )}
                  </IconButton>
                </motion.div>
              </motion.div>
            )}

            {/* Mobile Menu */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <IconButton
                  edge="end"
                  onClick={handleMenuOpen}
                  sx={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  <MenuIcon sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                </IconButton>
              </motion.div>
            )}
          </Toolbar>
        </Container>

        {/* Mobile Menu Dropdown */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          TransitionComponent={Fade}
          PaperProps={{
            sx: {
              background: 'rgba(17, 25, 40, 0.95)',
              backdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.125)',
              mt: 2,
              minWidth: 200
            }
          }}
        >
          {menuItems.map((item) => (
            <MenuItem
              key={item.label}
              onClick={handleMenuClose}
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {item.icon}
                <Typography>{item.label}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </AppBar>
    </AnimatePresence>
  );
};

export default Navbar;
