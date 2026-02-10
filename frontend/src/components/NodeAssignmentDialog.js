import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Box,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  Switch,
  Chip,
  Divider
} from '@mui/material';
import axios from '../services/axiosInterceptor';
import { API_BASE_URL } from '../config/api';

const NodeAssignmentDialog = ({ open, onClose, user, onSuccess }) => {
  const [availableNodes, setAvailableNodes] = useState([]);
  const [assignedNodes, setAssignedNodes] = useState([]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [accessAllNodes, setAccessAllNodes] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch available nodes
      const nodesResponse = await axios.get(`${API_BASE_URL}/api/node-assignments/available-nodes`);
      setAvailableNodes(nodesResponse.data.nodes || []);

      // Fetch user's current assignments
      const assignmentsResponse = await axios.get(`${API_BASE_URL}/api/node-assignments/user/${user.id}`);
      const currentAssignments = assignmentsResponse.data.assignments || [];
      const assignedNodeNames = currentAssignments.map(a => a.nodeName);
      setAssignedNodes(assignedNodeNames);
      setSelectedNodes(assignedNodeNames);

      // Set access all nodes flag
      setAccessAllNodes(user.accessAllNodes || false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeToggle = (nodeName) => {
    setSelectedNodes(prev => {
      if (prev.includes(nodeName)) {
        return prev.filter(n => n !== nodeName);
      } else {
        return [...prev, nodeName];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedNodes.length === availableNodes.length) {
      setSelectedNodes([]);
    } else {
      setSelectedNodes([...availableNodes]);
    }
  };

  const handleAccessAllNodesToggle = async () => {
    try {
      setError(null);
      const newValue = !accessAllNodes;
      
      await axios.put(`${API_BASE_URL}/api/node-assignments/user/${user.id}/access-all`, {
        accessAllNodes: newValue
      });

      setAccessAllNodes(newValue);
      setSuccess(`User ${newValue ? 'granted' : 'revoked'} access to all nodes`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating access:', err);
      setError(err.response?.data?.message || 'Failed to update access');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine nodes to add and remove
      const nodesToAdd = selectedNodes.filter(n => !assignedNodes.includes(n));
      const nodesToRemove = assignedNodes.filter(n => !selectedNodes.includes(n));

      // Add new assignments
      if (nodesToAdd.length > 0) {
        await axios.post(`${API_BASE_URL}/api/node-assignments`, {
          userId: user.id,
          nodeNames: nodesToAdd,
          notes
        });
      }

      // Remove unselected assignments
      for (const nodeName of nodesToRemove) {
        await axios.delete(`${API_BASE_URL}/api/node-assignments/user/${user.id}/node/${nodeName}`);
      }

      setSuccess('Node assignments updated successfully');
      setTimeout(() => {
        setSuccess(null);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving assignments:', err);
      setError(err.response?.data?.message || 'Failed to save assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedNodes([]);
    setNotes('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Assign Nodes to {user?.username}
      </DialogTitle>
      <DialogContent>
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

        {loading && !success ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={accessAllNodes}
                    onChange={handleAccessAllNodesToggle}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Access to All Nodes
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Grant this user access to all nodes without specific assignments
                    </Typography>
                  </Box>
                }
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {!accessAllNodes && (
              <>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    Select Nodes ({selectedNodes.length} of {availableNodes.length})
                  </Typography>
                  <Button onClick={handleSelectAll} size="small">
                    {selectedNodes.length === availableNodes.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Currently Assigned:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {assignedNodes.length > 0 ? (
                      assignedNodes.map(node => (
                        <Chip key={node} label={node} size="small" color="primary" />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No nodes assigned
                      </Typography>
                    )}
                  </Box>
                </Box>

                <FormControl component="fieldset" fullWidth>
                  <FormGroup>
                    <Box sx={{ 
                      maxHeight: 300, 
                      overflowY: 'auto',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2
                    }}>
                      {availableNodes.map((nodeName) => (
                        <FormControlLabel
                          key={nodeName}
                          control={
                            <Checkbox
                              checked={selectedNodes.includes(nodeName)}
                              onChange={() => handleNodeToggle(nodeName)}
                            />
                          }
                          label={nodeName}
                        />
                      ))}
                    </Box>
                  </FormGroup>
                </FormControl>

                <TextField
                  label="Notes (Optional)"
                  multiline
                  rows={2}
                  fullWidth
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  sx={{ mt: 2 }}
                  placeholder="Add any notes about this assignment..."
                />
              </>
            )}

            {accessAllNodes && (
              <Alert severity="info">
                This user has access to all nodes. Individual node assignments are not needed.
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={loading || accessAllNodes}
        >
          Save Assignments
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NodeAssignmentDialog;
