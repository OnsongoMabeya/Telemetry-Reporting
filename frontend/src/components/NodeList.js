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
  Paper
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageContainer, SectionContainer } from './layout/PageContainer';
import axios from 'axios';
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
        <Box sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 4
        }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" sx={{ 
            textAlign: { xs: 'center', sm: 'left' },
            mb: { xs: 1, sm: 0 }
          }}>
            Available Nodes
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleRefresh}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            sx={{
              alignSelf: { xs: 'stretch', sm: 'center' },
              width: { xs: '100%', sm: 'auto' },
              maxWidth: { sm: '300px' }
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh Nodes'}
          </Button>
        </Box>

        {loading && nodes.length === 0 ? (
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <IconButton 
              onClick={handleRefresh}
              color="primary"
              aria-label="refresh nodes"
              sx={{
                alignSelf: { xs: 'center', sm: 'flex-end' },
                backgroundColor: theme.palette.background.paper,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                }
              }}
            >
              <RefreshIcon />
              {!isMobile && <Box component="span" ml={1}>Refresh</Box>}
            </IconButton>}
          >
            {error}
          </Alert>
        ) : nodes.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No nodes found
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              There are no nodes available to display.
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={handleRefresh}
            >
              Check Again
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {nodes.map((node) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={node.name} sx={{ display: 'flex' }}>
                <Card 
                  elevation={2}
                  sx={{ 
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    },
                    height: '100%',
                    width: '100%'
                  }}
                >
                  <CardActionArea 
                    onClick={() => handleNodeClick(node.name)}
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      p: 2,
                    }}
                  >
                    <CardContent sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box 
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            mr: 1,
                          }}
                        />
                        <Typography 
                          variant="subtitle1" 
                          component="div"
                          sx={{
                            fontWeight: 'medium',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            width: '100%'
                          }}
                        >
                          {node.name}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Click to view details and telemetry data
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </SectionContainer>
    </PageContainer>
  );
};

export default NodeList;
