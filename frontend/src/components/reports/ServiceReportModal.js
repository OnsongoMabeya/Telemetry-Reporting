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
  Paper
} from '@mui/material';
import {
  Assessment,
  Speed,
  ShowChart,
  CalendarToday,
  LocationOn,
  RadioButtonChecked
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
  clientName 
}) => {
  const [timeFilter, setTimeFilter] = useState('1d');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Fetch preview function - defined before useEffect to avoid ESLint warning
  const fetchPreview = useCallback(async () => {
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

  // Fetch preview when modal opens
  useEffect(() => {
    if (open && service?.id) {
      fetchPreview();
    }
  }, [open, service?.id, fetchPreview]);

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
      
      // Download the PDF
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportData.reportInfo.clientName}_${reportData.reportInfo.serviceName}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
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
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment color="primary" />
          <Typography variant="h6">
            Generate Service Report
          </Typography>
        </Box>
        {service && (
          <Typography component="span" variant="subtitle2" color="text.secondary" sx={{ mt: 0.5, ml: 4, display: 'block' }}>
            {clientName} — {service.service_name || service.name}
          </Typography>
        )}
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

        {/* Preview Section */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <RadioButtonChecked fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight={500}>
              Report Contents Preview
            </Typography>
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
            </>
          ) : (
            <Alert severity="info">
              No preview available
            </Alert>
          )}
        </Paper>

        {/* Report Format Info */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            <strong>Report Format:</strong> Landscape PDF with 2-column metric layout.
            {' '}Each base station will have its own page with all assigned metrics.
            {' '}A summary table with latest values will be included on the first page.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={generating}>
          Cancel
        </Button>
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
          {generating ? 'Generating...' : 'Generate PDF Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceReportModal;
