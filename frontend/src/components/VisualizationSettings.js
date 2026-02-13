import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import axios from '../services/axiosInterceptor';
import { API_BASE_URL } from '../config/api';

const VisualizationSettings = () => {
  const { hasRole } = useAuth();
  const [mappings, setMappings] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [unmappedNodes, setUnmappedNodes] = useState([]);
  const [availableColumns, setAvailableColumns] = useState({ analog: [], digital: [], output: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [selectedNode, setSelectedNode] = useState('');
  const [selectedBaseStation, setSelectedBaseStation] = useState('');
  const [formData, setFormData] = useState({
    metric_name: '',
    column_name: '',
    unit: '',
    display_order: 0
  });

  const isAdmin = hasRole('admin');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mappingsRes, nodesRes, columnsRes, unmappedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/metric-mappings`),
        axios.get(`${API_BASE_URL}/api/metric-mappings/nodes`),
        axios.get(`${API_BASE_URL}/api/metric-mappings/columns`),
        isAdmin ? axios.get(`${API_BASE_URL}/api/metric-mappings/unmapped`) : Promise.resolve({ data: { nodes: [] } })
      ]);

      setMappings(mappingsRes.data);
      setNodes(nodesRes.data);
      setAvailableColumns(columnsRes.data);
      setUnmappedNodes(unmappedRes.data.nodes || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load visualization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mapping = null) => {
    if (mapping) {
      setEditingMapping(mapping);
      setSelectedNode(mapping.node_name);
      setSelectedBaseStation(mapping.base_station_name);
      setFormData({
        metric_name: mapping.metric_name,
        column_name: mapping.column_name,
        unit: mapping.unit || '',
        display_order: mapping.display_order
      });
    } else {
      setEditingMapping(null);
      setSelectedNode('');
      setSelectedBaseStation('');
      setFormData({
        metric_name: '',
        column_name: '',
        unit: '',
        display_order: 0
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMapping(null);
    setSelectedNode('');
    setSelectedBaseStation('');
    setFormData({
      metric_name: '',
      column_name: '',
      unit: '',
      display_order: 0
    });
  };

  const handleSave = async () => {
    try {
      if (editingMapping) {
        // Update existing mapping
        await axios.put(`${API_BASE_URL}/api/metric-mappings/${editingMapping.id}`, formData);
      } else {
        // Create new mapping
        await axios.post(`${API_BASE_URL}/api/metric-mappings`, {
          node_name: selectedNode,
          base_station_name: selectedBaseStation,
          ...formData
        });
      }
      handleCloseDialog();
      fetchData();
    } catch (err) {
      console.error('Error saving mapping:', err);
      setError(err.response?.data?.error || 'Failed to save mapping');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this metric mapping?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/metric-mappings/${id}`);
      fetchData();
    } catch (err) {
      console.error('Error deleting mapping:', err);
      setError(err.response?.data?.error || 'Failed to delete mapping');
    }
  };

  const getNodeMappings = (nodeName, baseStationName) => {
    return mappings.filter(
      m => m.node_name === nodeName && m.base_station_name === baseStationName
    );
  };

  const uniqueNodes = nodes.reduce((acc, node) => {
    const key = `${node.node_name}|${node.base_station_name}`;
    if (!acc.some(n => `${n.node_name}|${n.base_station_name}` === key)) {
      acc.push(node);
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SettingsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              Visualization Settings
            </Typography>
          </Box>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="large"
            >
              Add Metric Mapping
            </Button>
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          Configure metric mappings for telemetry data visualization. Map database columns to custom metric names per node/base station.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Unmapped Nodes Alert */}
      {isAdmin && unmappedNodes.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {unmappedNodes.length} node(s) without metric mappings
          </Typography>
          <Typography variant="body2">
            The following nodes have no configured metrics: {unmappedNodes.slice(0, 5).map(n => `${n.node_name}/${n.base_station_name}`).join(', ')}
            {unmappedNodes.length > 5 && ` and ${unmappedNodes.length - 5} more`}
          </Typography>
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TimelineIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {mappings.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Mappings
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {nodes.filter(n => n.has_mappings).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configured Nodes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WarningIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {unmappedNodes.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unmapped Nodes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Nodes and Mappings Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Node Metric Mappings
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {uniqueNodes.length === 0 ? (
          <Alert severity="info">No nodes found in the system.</Alert>
        ) : (
          uniqueNodes.map((node) => {
            const nodeMappings = getNodeMappings(node.node_name, node.base_station_name);
            return (
              <Box key={`${node.node_name}-${node.base_station_name}`} sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                      {node.node_name} / {node.base_station_name}
                    </Typography>
                    {node.has_mappings ? (
                      <Chip label="Configured" color="success" size="small" />
                    ) : (
                      <Chip label="Not Configured" color="warning" size="small" icon={<WarningIcon />} />
                    )}
                  </Box>
                  {isAdmin && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setSelectedNode(node.node_name);
                        setSelectedBaseStation(node.base_station_name);
                        handleOpenDialog();
                      }}
                    >
                      Add Metric
                    </Button>
                  )}
                </Box>

                {nodeMappings.length === 0 ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No metrics configured for this node. Click "Add Metric" to configure visualization metrics.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Metric Name</strong></TableCell>
                          <TableCell><strong>Database Column</strong></TableCell>
                          <TableCell><strong>Unit</strong></TableCell>
                          <TableCell><strong>Display Order</strong></TableCell>
                          <TableCell><strong>Created By</strong></TableCell>
                          <TableCell><strong>Updated</strong></TableCell>
                          {isAdmin && <TableCell align="right"><strong>Actions</strong></TableCell>}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {nodeMappings.map((mapping) => (
                          <TableRow key={mapping.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {mapping.metric_name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={mapping.column_name} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>{mapping.unit || '-'}</TableCell>
                            <TableCell>{mapping.display_order}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {mapping.created_by_name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(mapping.updated_at).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            {isAdmin && (
                              <TableCell align="right">
                                <Tooltip title="Edit">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDialog(mapping)}
                                    color="primary"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(mapping.id)}
                                    color="error"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            );
          })
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMapping ? 'Edit Metric Mapping' : 'Add Metric Mapping'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {!editingMapping && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Node</InputLabel>
                  <Select
                    value={selectedNode}
                    onChange={(e) => setSelectedNode(e.target.value)}
                    label="Node"
                  >
                    {uniqueNodes.map((node) => (
                      <MenuItem
                        key={`${node.node_name}-${node.base_station_name}`}
                        value={node.node_name}
                        onClick={() => setSelectedBaseStation(node.base_station_name)}
                      >
                        {node.node_name} / {node.base_station_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            <TextField
              label="Metric Name"
              value={formData.metric_name}
              onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
              fullWidth
              placeholder="e.g., Forward Power, VSWR, Return Loss"
              helperText="Custom name to display in graphs"
            />

            <FormControl fullWidth>
              <InputLabel>Database Column</InputLabel>
              <Select
                value={formData.column_name}
                onChange={(e) => setFormData({ ...formData, column_name: e.target.value })}
                label="Database Column"
              >
                <MenuItem disabled><em>Analog Columns</em></MenuItem>
                {availableColumns.analog.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
                <MenuItem disabled><em>Digital Columns</em></MenuItem>
                {availableColumns.digital.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
                <MenuItem disabled><em>Output Columns</em></MenuItem>
                {availableColumns.output.map((col) => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Unit"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              fullWidth
              placeholder="e.g., dBm, W, dB"
              helperText="Optional unit of measurement"
            />

            <TextField
              label="Display Order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              fullWidth
              helperText="Order in which metrics appear in graphs (lower numbers first)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.metric_name || !formData.column_name || (!editingMapping && (!selectedNode || !selectedBaseStation))}
          >
            {editingMapping ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VisualizationSettings;
