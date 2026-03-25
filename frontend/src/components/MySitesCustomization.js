import React, { useState, useEffect, useCallback } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
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
  const [users, setUsers] = useState([]);
  const [metricMappings, setMetricMappings] = useState([]);
  const [clientServices, setClientServices] = useState([]);
  const [serviceMetrics, setServiceMetrics] = useState([]);
  const [userClients, setUserClients] = useState([]);
  
  // State for loading and errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for dialogs
  const [clientDialog, setClientDialog] = useState({ open: false, mode: 'create', data: null });
  const [serviceDialog, setServiceDialog] = useState({ open: false, mode: 'create', data: null });
  const [assignDialog, setAssignDialog] = useState({ open: false, type: '', data: null });

  // State for form data
  const [clientForm, setClientForm] = useState({ name: '', description: '' });
  const [serviceForm, setServiceForm] = useState({ name: '', description: '' });
  const [assignForm, setAssignForm] = useState({ clientId: '', serviceId: '', userId: '', metricMappingId: '' });

  // Fetch data on component mount
  useEffect(() => {
    fetchClients();
    fetchServices();
    fetchUsers();
    fetchMetricMappings();
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

  // Fetch users and metric mappings
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`);
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };

  const fetchMetricMappings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/metric-mappings`);
      setMetricMappings(response.data.data || []);
    } catch (err) {
      console.error('Error fetching metric mappings:', err);
      setMetricMappings([]);
    }
  };

  // Assignment operations
  const handleAssignServiceToClient = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(`${API_BASE_URL}/api/clients/${assignForm.clientId}/services`, {
        serviceId: assignForm.serviceId
      });
      setSuccess('Service assigned to client successfully');
      setAssignDialog({ open: false, type: '', data: null });
      setAssignForm({ clientId: '', serviceId: '', userId: '', metricMappingId: '' });
      fetchClientServices();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign service to client');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMetricToService = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(`${API_BASE_URL}/api/services/${assignForm.serviceId}/metrics`, {
        metricMappingId: assignForm.metricMappingId
      });
      setSuccess('Metric assigned to service successfully');
      setAssignDialog({ open: false, type: '', data: null });
      setAssignForm({ clientId: '', serviceId: '', userId: '', metricMappingId: '' });
      fetchServiceMetrics();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign metric to service');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClientToUser = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.post(`${API_BASE_URL}/api/user-client-assignments`, {
        userId: assignForm.userId,
        clientId: assignForm.clientId
      });
      setSuccess('Client assigned to user successfully');
      setAssignDialog({ open: false, type: '', data: null });
      setAssignForm({ clientId: '', serviceId: '', userId: '', metricMappingId: '' });
      fetchUserClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign client to user');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientServices = useCallback(async () => {
    try {
      const allAssignments = [];
      for (const client of clients) {
        const response = await axios.get(`${API_BASE_URL}/api/clients/${client.id}/services`);
        const assignments = (response.data.data || []).map(s => ({
          ...s,
          client_id: client.id,
          client_name: client.name
        }));
        allAssignments.push(...assignments);
      }
      setClientServices(allAssignments);
    } catch (err) {
      console.error('Error fetching client services:', err);
    }
  }, [clients]);

  const fetchServiceMetrics = useCallback(async () => {
    try {
      const allAssignments = [];
      for (const service of services) {
        const response = await axios.get(`${API_BASE_URL}/api/services/${service.id}/metrics`);
        const assignments = (response.data.data || []).map(m => ({
          ...m,
          service_id: service.id,
          service_name: service.name
        }));
        allAssignments.push(...assignments);
      }
      setServiceMetrics(allAssignments);
    } catch (err) {
      console.error('Error fetching service metrics:', err);
    }
  }, [services]);

  const fetchUserClients = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user-client-assignments`);
      setUserClients(response.data.data || []);
    } catch (err) {
      console.error('Error fetching user clients:', err);
    }
  };

  const handleRemoveServiceFromClient = async (clientId, serviceId) => {
    if (!window.confirm('Are you sure you want to remove this service from the client?')) return;
    
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_BASE_URL}/api/clients/${clientId}/services/${serviceId}`);
      setSuccess('Service removed from client successfully');
      fetchClientServices();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove service from client');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMetricFromService = async (serviceId, metricMappingId) => {
    if (!window.confirm('Are you sure you want to remove this metric from the service?')) return;
    
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_BASE_URL}/api/services/${serviceId}/metrics/${metricMappingId}`);
      setSuccess('Metric removed from service successfully');
      fetchServiceMetrics();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove metric from service');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClientFromUser = async (userId, clientId) => {
    if (!window.confirm('Are you sure you want to remove this client from the user?')) return;
    
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_BASE_URL}/api/user-client-assignments/${userId}/${clientId}`);
      setSuccess('Client removed from user successfully');
      fetchUserClients();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove client from user');
    } finally {
      setLoading(false);
    }
  };

  // Fetch assignments when clients/services/users change
  useEffect(() => {
    if (clients.length > 0) {
      fetchClientServices();
    }
  }, [clients, fetchClientServices]);

  useEffect(() => {
    if (services.length > 0) {
      fetchServiceMetrics();
    }
  }, [services, fetchServiceMetrics]);

  useEffect(() => {
    if (users.length > 0) {
      fetchUserClients();
    }
  }, [users]);

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

      {/* 3. Client-Service Assignments */}
      <Accordion 
        expanded={expanded === 'clientServices'} 
        onChange={handleAccordionChange('clientServices')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinkIcon color="primary" />
            <Box>
              <Typography variant="h6">Client-Service Assignments</Typography>
              <Typography variant="caption" color="text.secondary">
                Assign services to clients ({clientServices.length} assignments)
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
                setAssignForm({ clientId: '', serviceId: '', userId: '', metricMappingId: '' });
                setAssignDialog({ open: true, type: 'clientService', data: null });
              }}
              sx={{ mb: 2 }}
              disabled={clients.length === 0 || services.length === 0}
            >
              Assign Service to Client
            </Button>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Client</strong></TableCell>
                    <TableCell><strong>Service</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clientServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No client-service assignments yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientServices.map((assignment, index) => (
                      <TableRow key={`${assignment.client_id}-${assignment.id}-${index}`}>
                        <TableCell>{assignment.client_name}</TableCell>
                        <TableCell>{assignment.name}</TableCell>
                        <TableCell>{assignment.description || '-'}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveServiceFromClient(assignment.client_id, assignment.id)}
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

      {/* 4. Service-Metric Assignments */}
      <Accordion 
        expanded={expanded === 'serviceMetrics'} 
        onChange={handleAccordionChange('serviceMetrics')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon color="primary" />
            <Box>
              <Typography variant="h6">Service-Metric Assignments</Typography>
              <Typography variant="caption" color="text.secondary">
                Assign metrics to services ({serviceMetrics.length} assignments)
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
                setAssignForm({ clientId: '', serviceId: '', userId: '', metricMappingId: '' });
                setAssignDialog({ open: true, type: 'serviceMetric', data: null });
              }}
              sx={{ mb: 2 }}
              disabled={services.length === 0 || metricMappings.length === 0}
            >
              Assign Metric to Service
            </Button>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Service</strong></TableCell>
                    <TableCell><strong>Metric Name</strong></TableCell>
                    <TableCell><strong>Node</strong></TableCell>
                    <TableCell><strong>Base Station</strong></TableCell>
                    <TableCell><strong>Unit</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {serviceMetrics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No service-metric assignments yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    serviceMetrics.map((assignment, index) => (
                      <TableRow key={`${assignment.service_id}-${assignment.id}-${index}`}>
                        <TableCell>{assignment.service_name}</TableCell>
                        <TableCell>{assignment.metric_name}</TableCell>
                        <TableCell>{assignment.node_name}</TableCell>
                        <TableCell>{assignment.base_station_name}</TableCell>
                        <TableCell>{assignment.unit}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveMetricFromService(assignment.service_id, assignment.id)}
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

      {/* 5. User-Client Assignments */}
      <Accordion 
        expanded={expanded === 'userClients'} 
        onChange={handleAccordionChange('userClients')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PeopleIcon color="primary" />
            <Box>
              <Typography variant="h6">User-Client Assignments</Typography>
              <Typography variant="caption" color="text.secondary">
                Assign clients to users ({userClients.length} assignments)
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
                setAssignForm({ clientId: '', serviceId: '', userId: '', metricMappingId: '' });
                setAssignDialog({ open: true, type: 'userClient', data: null });
              }}
              sx={{ mb: 2 }}
              disabled={users.length === 0 || clients.length === 0}
            >
              Assign Client to User
            </Button>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>User</strong></TableCell>
                    <TableCell><strong>Client</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Assigned Date</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No user-client assignments yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    userClients.map((assignment) => (
                      <TableRow key={`${assignment.user_id}-${assignment.client_id}`}>
                        <TableCell>{assignment.username}</TableCell>
                        <TableCell>{assignment.client_name}</TableCell>
                        <TableCell>{assignment.email}</TableCell>
                        <TableCell>{new Date(assignment.assigned_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveClientFromUser(assignment.user_id, assignment.client_id)}
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

      {/* Assignment Dialog */}
      <Dialog 
        open={assignDialog.open} 
        onClose={() => setAssignDialog({ open: false, type: '', data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {assignDialog.type === 'clientService' && 'Assign Service to Client'}
          {assignDialog.type === 'serviceMetric' && 'Assign Metric to Service'}
          {assignDialog.type === 'userClient' && 'Assign Client to User'}
        </DialogTitle>
        <DialogContent>
          {assignDialog.type === 'clientService' && (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel>Client</InputLabel>
                <Select
                  value={assignForm.clientId}
                  onChange={(e) => setAssignForm({ ...assignForm, clientId: e.target.value })}
                  label="Client"
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Service</InputLabel>
                <Select
                  value={assignForm.serviceId}
                  onChange={(e) => setAssignForm({ ...assignForm, serviceId: e.target.value })}
                  label="Service"
                >
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          {assignDialog.type === 'serviceMetric' && (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel>Service</InputLabel>
                <Select
                  value={assignForm.serviceId}
                  onChange={(e) => setAssignForm({ ...assignForm, serviceId: e.target.value })}
                  label="Service"
                >
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Metric Mapping</InputLabel>
                <Select
                  value={assignForm.metricMappingId}
                  onChange={(e) => setAssignForm({ ...assignForm, metricMappingId: e.target.value })}
                  label="Metric Mapping"
                >
                  {metricMappings.map((mapping) => (
                    <MenuItem key={mapping.id} value={mapping.id}>
                      {mapping.metric_name} ({mapping.node_name} - {mapping.base_station_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          {assignDialog.type === 'userClient' && (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel>User</InputLabel>
                <Select
                  value={assignForm.userId}
                  onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                  label="User"
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>Client</InputLabel>
                <Select
                  value={assignForm.clientId}
                  onChange={(e) => setAssignForm({ ...assignForm, clientId: e.target.value })}
                  label="Client"
                >
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, type: '', data: null })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (assignDialog.type === 'clientService') handleAssignServiceToClient();
              else if (assignDialog.type === 'serviceMetric') handleAssignMetricToService();
              else if (assignDialog.type === 'userClient') handleAssignClientToUser();
            }}
            variant="contained"
            disabled={loading || 
              (assignDialog.type === 'clientService' && (!assignForm.clientId || !assignForm.serviceId)) ||
              (assignDialog.type === 'serviceMetric' && (!assignForm.serviceId || !assignForm.metricMappingId)) ||
              (assignDialog.type === 'userClient' && (!assignForm.userId || !assignForm.clientId))
            }
          >
            {loading ? <CircularProgress size={24} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for success/error messages */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MySitesCustomization;
