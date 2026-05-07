import React, { useState, useEffect, useCallback } from 'react';
import {
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Settings,
  Merge,
  CallSplit,
  Visibility,
  Speed,
  ShowChart,
  Save,
  Cancel,
  Refresh,
  CheckCircle
} from '@mui/icons-material';
import axios from '../services/axiosInterceptor';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

/**
 * MetricViewSettings - Admin page for configuring graph/dial views
 * Allows admins to:
 * 1. Toggle individual metrics between Line Graph and Dial views
 * 2. Create merge groups (multiple metrics on one graph)
 * 3. Ungroup metrics
 */
const MetricViewSettings = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // State
  const [settings, setSettings] = useState([]);
  const [grouped, setGrouped] = useState({ individual: [], merged: {} });
  const [metricMappings, setMetricMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [groupName, setGroupName] = useState('');

  // Batch action state
  const [batchViewType, setBatchViewType] = useState('line');

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch view settings
      const settingsRes = await axios.get(`${API_BASE_URL}/api/metric-view-settings`);
      if (settingsRes.data.success) {
        setSettings(settingsRes.data.data || []);
        setGrouped(settingsRes.data.grouped || { individual: [], merged: {} });
      }

      // Fetch all metric mappings
      const mappingsRes = await axios.get(`${API_BASE_URL}/api/metric-mappings`);
      if (mappingsRes.data.data) {
        setMetricMappings(mappingsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load view settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update individual metric view type
  const updateViewType = async (metricMappingId, viewType) => {
    try {
      await axios.post(`${API_BASE_URL}/api/metric-view-settings`, {
        metric_mapping_id: metricMappingId,
        view_type: viewType
      });

      setSuccess(`View updated to ${viewType === 'line' ? 'Line Graph' : 'Dial'}`);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating view:', err);
      setError('Failed to update view type');
    }
  };

  // Create merge group
  const createMergeGroup = async () => {
    if (selectedMetrics.length < 2) {
      setError('Select at least 2 metrics to merge');
      return;
    }
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/metric-view-settings/merge`, {
        metric_mapping_ids: selectedMetrics,
        merge_group_name: groupName.trim(),
        view_type: 'line'
      });

      setSuccess(`Created merge group: ${groupName}`);
      setMergeDialogOpen(false);
      setSelectedMetrics([]);
      setGroupName('');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error creating merge group:', err);
      setError('Failed to create merge group');
    }
  };

  // Ungroup metrics
  const ungroupMetrics = async (groupId) => {
    try {
      await axios.post(`${API_BASE_URL}/api/metric-view-settings/ungroup/${groupId}`);

      setSuccess('Metrics ungrouped successfully');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error ungrouping:', err);
      setError('Failed to ungroup metrics');
    }
  };

  // Batch update all metrics
  const batchUpdateViewType = async () => {
    try {
      // Update all individual metrics
      const updatePromises = metricMappings.map(mapping => {
        // Check if metric has a setting
        const existingSetting = settings.find(s => s.metric_mapping_id === mapping.id);

        return axios.post(`${API_BASE_URL}/api/metric-view-settings`, {
          metric_mapping_id: mapping.id,
          view_type: batchViewType,
          merge_group_id: existingSetting?.merge_group_id || null,
          merge_group_name: existingSetting?.merge_group_name || null
        });
      });

      await Promise.all(updatePromises);

      setSuccess(`All metrics set to ${batchViewType === 'line' ? 'Line Graph' : 'Dial'}`);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error batch updating:', err);
      setError('Failed to batch update');
    }
  };

  // Ungroup all
  const ungroupAll = async () => {
    try {
      // Get all unique group IDs
      const groupIds = [...new Set(settings
        .filter(s => s.merge_group_id)
        .map(s => s.merge_group_id))];

      // Ungroup each
      await Promise.all(groupIds.map(groupId =>
        axios.post(`${API_BASE_URL}/api/metric-view-settings/ungroup/${groupId}`)
      ));

      setSuccess('All metrics ungrouped');
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error ungrouping all:', err);
      setError('Failed to ungroup all metrics');
    }
  };

  // Toggle metric selection for merge
  const toggleMetricSelection = (metricId) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Admin access required to configure view settings
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
          Metric View Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure how metrics are displayed in Dashboard and My Sites
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Batch Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Batch Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            value={batchViewType}
            exclusive
            onChange={(e, value) => value && setBatchViewType(value)}
            size="small"
          >
            <ToggleButton value="line">
              <ShowChart sx={{ mr: 0.5, fontSize: 18 }} />
              All Line Graphs
            </ToggleButton>
            <ToggleButton value="dial">
              <Speed sx={{ mr: 0.5, fontSize: 18 }} />
              All Dials
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            onClick={batchUpdateViewType}
            startIcon={<Save />}
            size="small"
          >
            Apply to All
          </Button>

          <Divider orientation="vertical" flexItem />

          <Button
            variant="outlined"
            color="warning"
            onClick={ungroupAll}
            startIcon={<CallSplit />}
            size="small"
          >
            Ungroup All
          </Button>

          <Button
            variant="outlined"
            onClick={fetchData}
            startIcon={<Refresh />}
            size="small"
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Merge Dialog */}
      <Dialog
        open={mergeDialogOpen}
        onClose={() => setMergeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Merge sx={{ mr: 1, verticalAlign: 'middle' }} />
          Create Merge Group
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select metrics to combine into a single multi-line graph
          </Typography>

          <TextField
            fullWidth
            label="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., Power Metrics, Temperature Sensors"
            sx={{ mb: 3 }}
          />

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">Select</TableCell>
                  <TableCell>Metric Name</TableCell>
                  <TableCell>Node</TableCell>
                  <TableCell>Base Station</TableCell>
                  <TableCell>Current View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metricMappings
                  .filter(m => !settings.find(s => s.metric_mapping_id === m.id && s.merge_group_id))
                  .map((mapping) => (
                    <TableRow
                      key={mapping.id}
                      selected={selectedMetrics.includes(mapping.id)}
                      onClick={() => toggleMetricSelection(mapping.id)}
                      hover
                    >
                      <TableCell padding="checkbox">
                        <CheckCircle
                          color={selectedMetrics.includes(mapping.id) ? 'primary' : 'disabled'}
                        />
                      </TableCell>
                      <TableCell>{mapping.metric_name}</TableCell>
                      <TableCell>{mapping.node_name}</TableCell>
                      <TableCell>{mapping.base_station_name}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={settings.find(s => s.metric_mapping_id === mapping.id)?.view_type === 'dial' ? <Speed /> : <ShowChart />}
                          label={settings.find(s => s.metric_mapping_id === mapping.id)?.view_type === 'dial' ? 'Dial' : 'Line'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          {selectedMetrics.length > 0 && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Selected: {selectedMetrics.length} metrics
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeDialogOpen(false)} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button
            onClick={createMergeGroup}
            variant="contained"
            startIcon={<Merge />}
            disabled={selectedMetrics.length < 2 || !groupName.trim()}
          >
            Create Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Individual Metrics Section */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Individual Metrics</Typography>
          <Button
            variant="outlined"
            onClick={() => setMergeDialogOpen(true)}
            startIcon={<Merge />}
            size="small"
          >
            Create Merge Group
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell>Node / Base Station</TableCell>
                <TableCell>View Type</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {metricMappings
                .filter(m => !settings.find(s => s.metric_mapping_id === m.id && s.merge_group_id))
                .map((mapping) => {
                  const setting = settings.find(s => s.metric_mapping_id === mapping.id);
                  const viewType = setting?.view_type || 'line';

                  return (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {mapping.metric_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {mapping.unit}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {mapping.node_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {mapping.base_station_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={viewType === 'dial' ? <Speed /> : <ShowChart />}
                          label={viewType === 'dial' ? 'Dial' : 'Line Graph'}
                          color={viewType === 'dial' ? 'secondary' : 'primary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <ToggleButtonGroup
                          value={viewType}
                          exclusive
                          onChange={(e, value) => value && updateViewType(mapping.id, value)}
                          size="small"
                        >
                          <ToggleButton value="line" title="Line Graph">
                            <ShowChart />
                          </ToggleButton>
                          <ToggleButton value="dial" title="Dial/Gauge">
                            <Speed />
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Merged Groups Section */}
      {Object.keys(grouped.merged).length > 0 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Merged Groups
            </Typography>

            {Object.values(grouped.merged).map((group) => (
              <Paper
                key={group.groupId}
                variant="outlined"
                sx={{ mb: 2, p: 2, bgcolor: 'background.default' }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      <Merge sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: 20 }} />
                      {group.groupName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.metrics.length} metrics combined
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={() => ungroupMetrics(group.groupId)}
                    startIcon={<CallSplit />}
                  >
                    Ungroup
                  </Button>
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      {group.metrics.map((metric) => (
                        <TableRow key={metric.id}>
                          <TableCell>{metric.metric_name}</TableCell>
                          <TableCell>{metric.node_name}</TableCell>
                          <TableCell>{metric.base_station_name}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              icon={<ShowChart />}
                              label="Line (Merged)"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default MetricViewSettings;
