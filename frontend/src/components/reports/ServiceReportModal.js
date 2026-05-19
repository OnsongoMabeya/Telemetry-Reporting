/**
 * Service Report Modal
 * 
 * Modal for configuring and generating service-centric telemetry reports.
 * Allows users to select time range and preview what metrics will be included.
 * 
 * @module components/reports/ServiceReportModal
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  Assessment,
  Speed,
  ShowChart,
  CalendarToday,
  LocationOn,
  RadioButtonChecked,
  Business
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

// Time filter options (matching My Sites)
const TIME_FILTERS = [
  { value: '5m', label: 'Last 5 minutes' },
  { value: '10m', label: 'Last 10 minutes' },
  { value: '30m', label: 'Last 30 minutes' },
  { value: '1h', label: 'Last hour' },
  { value: '2h', label: 'Last 2 hours' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '1d', label: 'Last 24 hours' },
  { value: '2d', label: 'Last 2 days' },
  { value: '5d', label: 'Last 5 days' },
  { value: '1w', label: 'Last week' },
  { value: '2w', label: 'Last 2 weeks' },
  { value: '30d', label: 'Last 30 days' }
];

const ServiceReportModal = ({ 
  open, 
  onClose, 
  service,
  clientName,
  clientId,
  initialTab = 'service'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [timeFilter, setTimeFilter] = useState('1d');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [clientPreview, setClientPreview] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [clientGenerating, setClientGenerating] = useState(false);

  // Reset tab when modal opens with different initialTab
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Fetch service preview function
  const fetchPreview = useCallback(async () => {
    if (!service?.id) return;
    setPreviewLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/services/${service.id}/report-preview`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch report preview');
      }
      
      const data = await response.json();
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }, [service?.id]);

  // Fetch client preview function
  const fetchClientPreview = useCallback(async () => {
    if (!clientId) return;
    setPreviewLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/reports/client/${clientId}/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ timeFilter })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch client report preview');
      }
      
      const data = await response.json();
      setClientPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }, [clientId, timeFilter]);

  // Fetch preview when modal opens
  useEffect(() => {
    if (open) {
      if (activeTab === 'service' && service?.id) {
        fetchPreview();
      } else if (activeTab === 'client' && clientId) {
        fetchClientPreview();
      }
    }
  }, [open, activeTab, service?.id, clientId, fetchPreview, fetchClientPreview]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/services/${service.id}/generate-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            timeFilter,
            format: 'pdf'
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const reportData = await response.json();
      
      // Import and generate PDF
      const { generateServicePDF } = await import('./ServicePDFReport');
      const pdfBlob = await generateServicePDF(reportData);
      
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${service.name}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateClientReport = async () => {
    setClientGenerating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/reports/client/${clientId}/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ timeFilter })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate client report');
      }
      
      const clientReportData = await response.json();
      
      // Transform client report data to match service report structure
      const reportData = {
        reportInfo: {
          ...clientReportData.reportInfo,
          clientName: clientReportData.reportInfo?.client_name,
          service_name: `${clientReportData.reportInfo.client_name} - All Services`,
          report_type: 'client_comprehensive',
          timeRange: {
            label: clientReportData.reportInfo?.time_range || timeFilter,
            start: clientReportData.reportInfo?.start_time,
            end: clientReportData.reportInfo?.end_time
          }
        },
        summaryTable: clientReportData.summary?.quickStats?.flatMap(service => 
          service.metrics?.map(metric => ({
            display_name: metric.metric_name,
            latest: metric.current,
            unit: metric.unit,
            node_name: metric.node_name || service.node_name,
            base_station_name: metric.base_station_name || service.base_station_name
          })) || []
        ) || [],
        totalMetrics: clientReportData.summary?.totalMetrics || 0,
        totalBaseStations: clientReportData.summary?.totalBaseStations || 0,
        baseStations: clientReportData.services?.flatMap(service => 
          service.baseStations?.map(bs => ({
            ...bs,
            service_name: service.service_name,
            metrics: bs.metrics?.map(m => ({
              ...m,
              metric_mapping_id: m.metric_mapping_id,
              merge_group_id: m.merge_group_id,
              merge_group_name: m.merge_group_name,
              view_type: m.view_type
            })) || []
          })) || []
        ) || []
      };
      
      // Import and generate PDF
      const { generateServicePDF } = await import('./ServicePDFReport');
      const pdfBlob = await generateServicePDF(reportData);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${clientName}_All_Services_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setClientGenerating(false);
    }
  };

  const getViewTypeIcon = (viewType) => {
    return viewType === 'dial' ? <Speed fontSize="small" /> : <ShowChart fontSize="small" />;
  };

  const getViewTypeLabel = (viewType) => {
    return viewType === 'dial' ? 'Dial/Gauge' : 'Time Series Graph';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '60vh',
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          <Typography variant="h6">
            Generate Report
          </Typography>
        </Box>
        <Box sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newVal) => setActiveTab(newVal)} variant="fullWidth">
            <Tab label="Service Report" value="service" />
            <Tab label="Client Report" value="client" />
          </Tabs>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Time Range Selection */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CalendarToday fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight={500}>
              Time Range
            </Typography>
          </Box>
          
          <FormControl fullWidth size="small">
            <InputLabel>Select time period for report</InputLabel>
            <Select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              label="Select time period for report"
            >
              {TIME_FILTERS.map((filter) => (
                <MenuItem key={filter.value} value={filter.value}>
                  {filter.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Service Report Content */}
        {activeTab === 'service' && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <RadioButtonChecked fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={500}>
                Report Contents Preview
              </Typography>
              {service && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                  {service.service_name || service.name}
                </Typography>
              )}
            </Box>

            {previewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : preview ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    This report will include <strong>{preview.totalMetrics}</strong> metrics from{' '}
                    <strong>{preview.baseStations.length}</strong> base station(s):
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {preview.baseStations.map((baseStation, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5,
                          bgcolor: 'background.default'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="subtitle2" fontWeight={600}>
                            {baseStation.base_station_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({baseStation.node_name})
                          </Typography>
                      </Box>

                      <List dense disablePadding>
                        {baseStation.metrics.map((metric, mIndex) => (
                          <ListItem key={mIndex} disablePadding sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              {getViewTypeIcon(metric.view_type)}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">
                                    {metric.display_name}
                                  </Typography>
                                  <Chip
                                    label={getViewTypeLabel(metric.view_type)}
                                    size="small"
                                    variant="outlined"
                                    color={metric.view_type === 'dial' ? 'secondary' : 'primary'}
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                  />
                                </Box>
                              }
                              secondary={`${metric.metric_name} — ${metric.unit || 'no unit'}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  icon={<Speed />} 
                  label={`${preview.baseStations.reduce((acc, bs) => 
                    acc + bs.metrics.filter(m => m.view_type === 'dial').length, 0
                  )} Dial/Gauge views`}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
                <Chip 
                  icon={<ShowChart />} 
                  label={`${preview.baseStations.reduce((acc, bs) => 
                    acc + bs.metrics.filter(m => m.view_type === 'graph').length, 0
                  )} Time Series graphs`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </Box>

              {/* Report Format Info */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.contrastText">
                  <strong>Report Format:</strong> Portrait PDF with 2-column metric layout.
                  {' '}Each base station will have its own page with all assigned metrics.
                  {' '}A summary table with latest values will be included on the first page.
                </Typography>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              No preview available. Select a service to see the preview.
            </Alert>
          )}
        </Paper>
      )} 

        {/* Client Report Content */}
        {activeTab === 'client' && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Assessment fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={500}>
                Client Report Preview
              </Typography>
              {clientName && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                  {clientName}
                </Typography>
              )}
            </Box>

            {previewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : clientPreview ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    This report will include <strong>{clientPreview.summary?.totalServices || 0}</strong> services
                    with <strong>{clientPreview.summary?.totalMetrics || 0}</strong> metrics total:
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {clientPreview.services?.map((service, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5,
                          bgcolor: 'background.default'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Business fontSize="small" color="action" />
                          <Typography variant="subtitle2" fontWeight={600}>
                            {service.service_name}
                          </Typography>
                        </Box>

                        <List dense disablePadding>
                          {service.baseStations?.slice(0, 1).map((bs) => (
                            <ListItem key={bs.base_station_name} disablePadding sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <LocationOn fontSize="small" color="disabled" />
                              </ListItemIcon>
                              <ListItemText
                                primary={bs.base_station_name}
                                secondary={`${bs.metrics?.length || 0} metrics`}
                              />
                            </ListItem>
                          ))}
                          {service.baseStations?.length > 1 && (
                            <ListItem disablePadding sx={{ py: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <Speed fontSize="small" color="disabled" />
                              </ListItemIcon>
                              <ListItemText
                                secondary={`+${service.baseStations.length - 1} more base station(s)`}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </>
            ) : (
              <Alert severity="info">
                No client data available. Select a client to see the preview.
              </Alert>
            )}
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={generating || clientGenerating}>
          Cancel
        </Button>
        
        {activeTab === 'service' ? (
          <Button
            variant="contained"
            onClick={handleGenerateReport}
            disabled={!preview || preview.totalMetrics === 0 || generating}
            startIcon={generating ? <CircularProgress size={20} /> : <Assessment />}
            sx={{
              background: 'linear-gradient(135deg, #30a1e4 0%, #163d90 100%)',
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #2891d4 0%, #0f2d70 100%)',
              }
            }}
          >
            {generating ? 'Generating...' : 'Generate Service Report'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleGenerateClientReport}
            disabled={!clientPreview || !clientPreview.services || clientGenerating}
            startIcon={clientGenerating ? <CircularProgress size={20} /> : <Assessment />}
            sx={{
              background: 'linear-gradient(135deg, #30a1e4 0%, #163d90 100%)',
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #2891d4 0%, #0f2d70 100%)',
              }
            }}
          >
            {clientGenerating ? 'Generating...' : 'Generate Client Report'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ServiceReportModal;
