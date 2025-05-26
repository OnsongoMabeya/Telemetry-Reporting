import React, { useState, useEffect } from 'react';
import { Container, Box, Card, CardContent, Typography, CardActionArea, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';

const NodeList = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const fetchNodes = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/nodes');
        if (mounted) {
          setNodes(response.data);
          setError(null);
        }
      } catch (error) {
        if (mounted) {
          setError('Error fetching nodes. Please try again later.');
          console.error('Error fetching nodes:', error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchNodes();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Telemetry Nodes
      </Typography>
      
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)'
            },
            gap: 3
          }}
        >
          {nodes.map((node) => (
            <Card key={node.NodeName}>
              <CardActionArea onClick={() => navigate(`/node/${node.NodeName}`)}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {node.NodeName}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default NodeList;
