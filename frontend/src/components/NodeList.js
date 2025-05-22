import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const NodeList = () => {
  const [nodes, setNodes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/nodes');
        setNodes(response.data);
      } catch (error) {
        console.error('Error fetching nodes:', error);
      }
    };

    fetchNodes();
  }, []);

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Telemetry Nodes
      </Typography>
      <Grid container spacing={3}>
        {nodes.map((node) => (
          <Grid item xs={12} sm={6} md={4} key={node.NodeName}>
            <Card>
              <CardActionArea onClick={() => navigate(`/node/${node.NodeName}`)}>
                <CardContent>
                  <Typography variant="h6" component="div">
                    {node.NodeName}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default NodeList;
