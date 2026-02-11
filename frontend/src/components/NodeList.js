import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CardActionArea, 
  CircularProgress, 
  Alert,
  IconButton,
  useTheme,
  useMediaQuery,
  Button,
  Grid,
  Paper,
  Avatar,
  Chip,
  Tooltip,
  alpha
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WifiIcon from '@mui/icons-material/Wifi';
import RouterIcon from '@mui/icons-material/Router';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer, SectionContainer } from './layout/PageContainer';
import axios from '../services/axiosInterceptor';
import { API_BASE_URL } from '../config/api';

const NodeList = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchNodes = async () => {
    console.log('Fetching nodes...');
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/nodes`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('Nodes response:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setNodes(response.data);
      } else {
        console.warn('Unexpected response format:', response.data);
        setNodes([]);
      }
    } catch (error) {
      const errorMessage = error.response 
        ? `Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`
        : `Error: ${error.message}`;
      
      console.error('Error fetching nodes:', {
        error,
        response: error.response?.data,
        status: error.response?.status
      });
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadNodes = async () => {
      await fetchNodes();
    };
    
    if (isMounted) {
      loadNodes();
    }
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        console.log('Refreshing nodes...');
        fetchNodes();
      }
    }, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []);

  const handleNodeClick = (nodeName) => {
    // URL encode the node name to handle special characters
    const encodedNodeName = encodeURIComponent(nodeName);
    navigate(`/node/${encodedNodeName}`);
  };

  const handleRefresh = () => {
    fetchNodes();
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <PageContainer maxWidth="xl">
      <SectionContainer>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 3,
            mb: 4
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
                  }}
                >
                  <RouterIcon sx={{ fontSize: 32, color: 'white' }} />
                </Avatar>
              </motion.div>
              <Box>
                <Typography 
                  variant={isMobile ? 'h5' : 'h4'} 
                  component="h1" 
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 0.5
                  }}
                >
                  Network Nodes
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {nodes.length} nodes available
                </Typography>
              </Box>
            </Box>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="contained" 
                onClick={handleRefresh}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  py: 1.5,
                  px: 3,
                  borderRadius: 2,
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                  },
                  '&:disabled': {
                    background: 'rgba(0,0,0,0.12)',
                    color: 'rgba(0,0,0,0.26)'
                  }
                }}
              >
                {loading ? 'Refreshing...' : 'Refresh Nodes'}
              </Button>
            </motion.div>
          </Box>
        </motion.div>

        <AnimatePresence>
          {loading && nodes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4 }}
            >
              <Box display="flex" flexDirection="column" alignItems="center" my={8} gap={3}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <CircularProgress 
                    size={80} 
                    thickness={4}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      },
                    }}
                  />
                </motion.div>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#666' }}>
                  Loading network nodes...
                </Typography>
              </Box>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1), rgba(244, 67, 54, 0.05))',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(244, 67, 54, 0.2)',
                  '& .MuiAlert-message': {
                    fontWeight: 500
                  }
                }}
                action={
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton 
                      onClick={handleRefresh}
                      color="primary"
                      aria-label="refresh nodes"
                      sx={{
                        background: 'rgba(255,255,255,0.9)',
                        '&:hover': {
                          background: 'rgba(255,255,255,1)',
                        }
                      }}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </motion.div>
                }
              >
                {error}
              </Alert>
            </motion.div>
          ) : nodes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <Paper 
                elevation={8}
                sx={{ 
                  p: 6, 
                  textAlign: 'center',
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Avatar 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: '#f5f5f5',
                      mx: 'auto',
                      mb: 3
                    }}
                  >
                    <WifiIcon sx={{ fontSize: 40, color: '#999' }} />
                  </Avatar>
                </motion.div>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
                  No nodes available
                </Typography>
                <Typography variant="body1" sx={{ color: '#666', mb: 4, maxWidth: 400, mx: 'auto' }}>
                  There are currently no network nodes available to display. Please check your connection or try refreshing.
                </Typography>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    variant="outlined" 
                    onClick={handleRefresh}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: 600,
                      borderColor: '#667eea',
                      color: '#667eea',
                      '&:hover': {
                        background: 'rgba(102, 126, 234, 0.1)',
                        borderColor: '#667eea'
                      }
                    }}
                  >
                    Check Again
                  </Button>
                </motion.div>
              </Paper>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Grid container spacing={{ xs: 2, md: 3 }}>
                <AnimatePresence>
                  {nodes.map((node, index) => (
                    <Grid 
                      item 
                      xs={12} 
                      sm={6} 
                      md={4} 
                      lg={3} 
                      key={node.name} 
                      sx={{ display: 'flex' }}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{ 
                          duration: 0.4, 
                          delay: index * 0.1,
                          type: "spring",
                          stiffness: 100
                        }}
                        whileHover={{ 
                          scale: 1.05,
                          y: -8,
                          transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <Card 
                          elevation={0}
                          sx={{ 
                            height: '100%',
                            width: '100%',
                            borderRadius: 3,
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            position: 'relative',
                            '&:hover': {
                              boxShadow: '0 12px 40px rgba(102, 126, 234, 0.15)',
                              border: '1px solid rgba(102, 126, 234, 0.3)',
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '4px',
                                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                transform: 'translateX(-100%)',
                                animation: 'slideIn 0.3s ease forwards'
                              }
                            },
                            '@keyframes slideIn': {
                              to: {
                                transform: 'translateX(0)'
                              }
                            }
                          }}
                        >
                          <CardActionArea 
                            onClick={() => handleNodeClick(node.name)}
                            sx={{ 
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              p: 3,
                              gap: 2
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              <motion.div
                                initial={{ rotate: 0 }}
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.6 }}
                              >
                                <Avatar
                                  sx={{
                                    width: 48,
                                    height: 48,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                                  }}
                                >
                                  <RouterIcon sx={{ fontSize: 24, color: 'white' }} />
                                </Avatar>
                              </motion.div>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography 
                                  variant="h6" 
                                  component="div"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    color: '#333',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    mb: 0.5
                                  }}
                                >
                                  {node.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    <Box 
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: '#4caf50',
                                        boxShadow: '0 0 8px rgba(76, 175, 80, 0.6)'
                                      }}
                                    />
                                  </motion.div>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: '#4caf50',
                                      fontWeight: 600,
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    ONLINE
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SignalCellularAltIcon sx={{ fontSize: 16, color: '#667eea' }} />
                                <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                                  Signal Strength: Excellent
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUpIcon sx={{ fontSize: 16, color: '#764ba2' }} />
                                <Typography variant="body2" sx={{ color: '#666', fontSize: '0.85rem' }}>
                                  Status: Active
                                </Typography>
                              </Box>
                            </Box>
                            
                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Chip 
                                label="View Details" 
                                size="small"
                                sx={{
                                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
                                  color: '#667eea',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  border: '1px solid rgba(102, 126, 234, 0.2)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
                                  }
                                }}
                              />
                              <motion.div
                                animate={{ x: [0, 5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem' }}>
                                  →
                                </Typography>
                              </motion.div>
                            </Box>
                          </CardActionArea>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </AnimatePresence>
              </Grid>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionContainer>
    </PageContainer>
  );
};

export default NodeList;
