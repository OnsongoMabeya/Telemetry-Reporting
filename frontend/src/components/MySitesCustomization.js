import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Wifi as WifiIcon,
  Link as LinkIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import axios from '../services/axiosInterceptor';
import { API_BASE_URL } from '../config/api';

const MySitesCustomization = () => {
  // State for accordion expansion
  const [expanded, setExpanded] = useState('clients');

  // State for data
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for dialogs
  const [clientDialog, setClientDialog] = useState({ open: false, mode: 'create', data: null });
  const [serviceDialog, setServiceDialog] = useState({ open: false, mode: 'create', data: null });

  // State for form data
  const [clientForm, setClientForm] = useState({ name: '', description: '' });
  const [serviceForm, setServiceForm] = useState({ name: '', description: '' });

  // Fetch data on component mount
  useEffect(() => {
    fetchClients();
    fetchServices();
  }, []);

  // Fetch functions
  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/clients`);
      setClients(response.data.data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/services`);
      setServices(response.data.data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  };

  // Handle accordion change
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Client CRUD operations
  const handleCreateClient = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(`${API_BASE_URL}/api/clients`, clientForm);
      setSuccess('Client created successfully');
      setClientDialog({ open: false, mode: 'create', data: null });
      setClientForm({ name: '', description: '' });
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.put(`${API_BASE_URL}/api/clients/${clientDialog.data.id}`, clientForm);
      setSuccess('Client updated successfully');
      setClientDialog({ open: false, mode: 'create', data: null });
      setClientForm({ name: '', description: '' });
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update client');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_BASE_URL}/api/clients/${id}`);
      setSuccess('Client deleted successfully');
      fetchClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete client');
    } finally {
      setLoading(false);
    }
  };

  // Service CRUD operations
  const handleCreateService = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(`${API_BASE_URL}/api/services`, serviceForm);
      setSuccess('Service created successfully');
      setServiceDialog({ open: false, mode: 'create', data: null });
      setServiceForm({ name: '', description: '' });
      fetchServices();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateService = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.put(`${API_BASE_URL}/api/services/${serviceDialog.data.id}`, serviceForm);
      setSuccess('Service updated successfully');
      setServiceDialog({ open: false, mode: 'create', data: null });
      setServiceForm({ name: '', description: '' });
      fetchServices();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_BASE_URL}/api/services/${id}`);
      setSuccess('Service deleted successfully');
      fetchServices();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          My Sites Customization
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage clients, services, and assignments for the My Sites feature
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

      {/* Accordion Sections */}
      
      {/* 1. Clients Section */}
      <Accordion 
        expanded={expanded === 'clients'} 
        onChange={handleAccordionChange('clients')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BusinessIcon color="primary" />
            <Box>
              <Typography variant="h6">Clients</Typography>
              <Typography variant="caption" color="text.secondary">
                Manage client organizations ({clients.length} total)
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setClientForm({ name: '', description: '' });
                setClientDialog({ open: true, mode: 'create', data: null });
              }}
              sx={{ mb: 2 }}
            >
              Add Client
            </Button>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Services</strong></TableCell>
                    <TableCell><strong>Created</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No clients found. Create your first client to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>{client.name}</TableCell>
                        <TableCell>{client.description || '-'}</TableCell>
                        <TableCell>
                          <Chip label={client.service_count || 0} size="small" color="primary" />
                        </TableCell>
                        <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setClientForm({ name: client.name, description: client.description || '' });
                              setClientDialog({ open: true, mode: 'edit', data: client });
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClient(client.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 2. Services Section */}
      <Accordion 
        expanded={expanded === 'services'} 
        onChange={handleAccordionChange('services')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WifiIcon color="primary" />
            <Box>
              <Typography variant="h6">Services</Typography>
              <Typography variant="caption" color="text.secondary">
                Manage radio services ({services.length} total)
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setServiceForm({ name: '', description: '' });
                setServiceDialog({ open: true, mode: 'create', data: null });
              }}
              sx={{ mb: 2 }}
            >
              Add Service
            </Button>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Metrics</strong></TableCell>
                    <TableCell><strong>Users</strong></TableCell>
                    <TableCell><strong>Clients</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No services found. Create your first service to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>{service.name}</TableCell>
                        <TableCell>{service.description || '-'}</TableCell>
                        <TableCell>
                          <Chip label={service.metric_count || 0} size="small" color="success" />
                        </TableCell>
                        <TableCell>
                          <Chip label={service.user_count || 0} size="small" color="info" />
                        </TableCell>
                        <TableCell>
                          <Chip label={service.client_count || 0} size="small" color="warning" />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setServiceForm({ name: service.name, description: service.description || '' });
                              setServiceDialog({ open: true, mode: 'edit', data: service });
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteService(service.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Placeholder sections for remaining accordions - to be implemented */}
      <Accordion disabled sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinkIcon color="disabled" />
            <Box>
              <Typography variant="h6" color="text.disabled">Client-Service Assignments</Typography>
              <Typography variant="caption" color="text.disabled">
                Assign services to clients (Coming soon)
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
      </Accordion>

      <Accordion disabled sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon color="disabled" />
            <Box>
              <Typography variant="h6" color="text.disabled">Service Metric Assignments</Typography>
              <Typography variant="caption" color="text.disabled">
                Assign metrics to services with custom display names (Coming soon)
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
      </Accordion>

      <Accordion disabled sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PeopleIcon color="disabled" />
            <Box>
              <Typography variant="h6" color="text.disabled">User-Service Assignments</Typography>
              <Typography variant="caption" color="text.disabled">
                Assign services to users (Coming soon)
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
      </Accordion>

      {/* Client Dialog */}
      <Dialog 
        open={clientDialog.open} 
        onClose={() => setClientDialog({ open: false, mode: 'create', data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {clientDialog.mode === 'create' ? 'Create New Client' : 'Edit Client'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Client Name"
            fullWidth
            value={clientForm.name}
            onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={clientForm.description}
            onChange={(e) => setClientForm({ ...clientForm, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientDialog({ open: false, mode: 'create', data: null })}>
            Cancel
          </Button>
          <Button
            onClick={clientDialog.mode === 'create' ? handleCreateClient : handleUpdateClient}
            variant="contained"
            disabled={loading || !clientForm.name.trim()}
          >
            {loading ? <CircularProgress size={24} /> : clientDialog.mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Service Dialog */}
      <Dialog 
        open={serviceDialog.open} 
        onClose={() => setServiceDialog({ open: false, mode: 'create', data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {serviceDialog.mode === 'create' ? 'Create New Service' : 'Edit Service'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Service Name"
            fullWidth
            value={serviceForm.name}
            onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={serviceForm.description}
            onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceDialog({ open: false, mode: 'create', data: null })}>
            Cancel
          </Button>
          <Button
            onClick={serviceDialog.mode === 'create' ? handleCreateService : handleUpdateService}
            variant="contained"
            disabled={loading || !serviceForm.name.trim()}
          >
            {loading ? <CircularProgress size={24} /> : serviceDialog.mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MySitesCustomization;
