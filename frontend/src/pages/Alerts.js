import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Autocomplete,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Tooltip,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  RadioGroup,
  Radio,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  NotificationsActive as NotificationsActiveIcon,
  WifiOff as WifiOffIcon,
  Power as PowerIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Send as SendIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import axios from '../services/axiosInterceptor';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';

// BSI Brand Colors - Executive Palette
const BSI_COLORS = {
  primary: '#0099ff',
  primaryDark: '#0077cc',
  light: '#ccebff',
  dark: '#1a1a2e',
  navy: '#16213e',
  gold: '#c9a227',
  executiveBg: '#f8f9fa',
  white: '#ffffff',
  gray: '#6c757d',
  lightGray: '#e9ecef'
};

const Alerts = () => {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [activeTab, setActiveTab] = useState(0);
  const [schedules, setSchedules] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [emailInputValue, setEmailInputValue] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Offline alert state
  const [alertConfigs, setAlertConfigs] = useState([]);
  const [baseStations, setBaseStations] = useState([]);
  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [editingAlertConfig, setEditingAlertConfig] = useState(null);
  const [alertEmailInputValue, setAlertEmailInputValue] = useState('');
  const [alertPhoneInputValue, setAlertPhoneInputValue] = useState('');
  const [alertFormData, setAlertFormData] = useState({
    base_station_name: '',
    repeat_interval_hours: 4,
    recipient_users: [],
    recipient_emails: [],
    recipient_phones: [],
    is_active: true
  });

  // Power Drop alert state
  const [powerDropAlerts, setPowerDropAlerts] = useState([]);
  const [metricMappings, setMetricMappings] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [availableBaseStations, setAvailableBaseStations] = useState([]);
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [openPowerDropDialog, setOpenPowerDropDialog] = useState(false);
  const [editingPowerDropAlert, setEditingPowerDropAlert] = useState(null);
  const [powerDropEmailInputValue, setPowerDropEmailInputValue] = useState('');
  const [powerDropPhoneInputValue, setPowerDropPhoneInputValue] = useState('');
  const [powerDropFormData, setPowerDropFormData] = useState({
    name: '',
    node_name: '',
    base_station_name: '',
    metric_mapping_id: '',
    drop_percentage: 80,
    time_window_seconds: 5,
    check_interval_seconds: 5,
    recipient_users: [],
    recipient_emails: [],
    recipient_phones: [],
    notify_email: true,
    notify_whatsapp: true,
    is_active: true
  });

  // Manual Reports state
  const [manualReports, setManualReports] = useState([]);
  const [manualReportStats, setManualReportStats] = useState(null);
  const [openManualReportDialog, setOpenManualReportDialog] = useState(false);
  const [manualReportStep, setManualReportStep] = useState(1);
  const [processingReports, setProcessingReports] = useState(new Map());
  const [manualReportEmailInputValue, setManualReportEmailInputValue] = useState('');
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [manualReportFormData, setManualReportFormData] = useState({
    reportType: 'service',
    targetIds: [],
    dateRangeStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateRangeEnd: new Date().toISOString().split('T')[0],
    deliveryMethod: 'download',
    recipients: [],
    searchQuery: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    report_type: 'service',
    target_id: '',
    frequency: 'daily',
    interval_hours: 6,
    daily_time: '08:00',
    weekly_day: 1,
    weekly_time: '08:00',
    monthly_day: 1,
    monthly_time: '08:00',
    time_range: '24h',
    recipient_users: [],
    recipient_emails: [],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  });

  useEffect(() => {
    fetchSchedules();
    fetchServices();
    fetchClients();
    fetchUsers();
    fetchAlertConfigs();
    fetchBaseStations();
    fetchPowerDropAlerts();
    fetchMetricMappings();
    fetchNodes();
    fetchManualReports();
    fetchManualReportStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/report-schedules');
      setSchedules(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showSnackbar('Failed to fetch schedules', 'error');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get('/api/services');
      const data = response.data?.data || response.data;
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      const data = response.data?.data || response.data;
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      setClients([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      const usersData = response.data?.users || response.data?.data || response.data;
      const list = Array.isArray(usersData) ? usersData : [];
      setUsers(list.filter(u => u.is_active || u.isActive));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const fetchAlertConfigs = async () => {
    try {
      const response = await axios.get('/api/site-alerts');
      setAlertConfigs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch alert configs:', error);
      setAlertConfigs([]);
    }
  };

  const fetchBaseStations = async () => {
    try {
      const response = await axios.get('/api/site-alerts/base-stations');
      setBaseStations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch base stations:', error);
      setBaseStations([]);
    }
  };

  const fetchPowerDropAlerts = async () => {
    try {
      const response = await axios.get('/api/power-drop-alerts');
      setPowerDropAlerts(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error('Failed to fetch power drop alerts:', error);
      setPowerDropAlerts([]);
    }
  };

  const fetchMetricMappings = async () => {
    try {
      const response = await axios.get('/api/metric-mappings');
      setMetricMappings(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error('Failed to fetch metric mappings:', error);
      setMetricMappings([]);
    }
  };

  const fetchNodes = async () => {
    try {
      const response = await axios.get('/api/node-assignments/available-nodes');
      setNodes(Array.isArray(response.data.nodes) ? response.data.nodes : []);
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
      setNodes([]);
    }
  };

  const fetchManualReports = async () => {
    try {
      const response = await axios.get('/api/manual-reports/history');
      setManualReports(response.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch manual reports:', error);
      setManualReports([]);
    }
  };

  const fetchManualReportStats = async () => {
    try {
      const response = await axios.get('/api/manual-reports/stats');
      setManualReportStats(response.data.statistics);
    } catch (error) {
      console.error('Failed to fetch manual report stats:', error);
      setManualReportStats(null);
    }
  };

  const fetchBaseStationsForNode = async (nodeName) => {
    if (!nodeName) {
      setAvailableBaseStations([]);
      return;
    }

    try {
      const response = await axios.get('/api/metric-mappings', { 
        params: { node_name: nodeName } 
      });
      
      // Get unique base stations for this node
      const baseStations = [...new Set(response.data.data.map(item => item.base_station_name))];
      setAvailableBaseStations(baseStations.sort());
    } catch (error) {
      console.error('Failed to fetch base stations for node:', error);
      setAvailableBaseStations([]);
    }
  };

  const fetchMetricsForNodeAndBaseStation = async (nodeName, baseStationName) => {
    if (!nodeName || !baseStationName) {
      setAvailableMetrics([]);
      return;
    }

    try {
      const response = await axios.get('/api/metric-mappings', { 
        params: { 
          node_name: nodeName,
          base_station_name: baseStationName 
        } 
      });
      
      setAvailableMetrics(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch metrics for node/base station:', error);
      setAvailableMetrics([]);
    }
  };

  const handleOpenAlertDialog = (config = null) => {
    if (config) {
      setEditingAlertConfig(config);
      setAlertFormData({
        base_station_name: config.base_station_name || '',
        repeat_interval_hours: config.repeat_interval_hours || 4,
        recipient_users: config.recipient_users || [],
        recipient_emails: config.recipient_emails || [],
        recipient_phones: config.recipient_phones || [],
        is_active: config.is_active !== false
      });
    } else {
      setEditingAlertConfig(null);
      setAlertFormData({
        base_station_name: '',
        repeat_interval_hours: 4,
        recipient_users: [],
        recipient_emails: [],
        recipient_phones: [],
        is_active: true
      });
    }
    setAlertEmailInputValue('');
    setAlertPhoneInputValue('');
    setOpenAlertDialog(true);
  };

  const handleCloseAlertDialog = () => {
    setOpenAlertDialog(false);
    setEditingAlertConfig(null);
    setAlertEmailInputValue('');
    setAlertPhoneInputValue('');
  };

  const handleSaveAlertConfig = async () => {
    if (!alertFormData.base_station_name) {
      showSnackbar('Please select a base station', 'warning');
      return;
    }
    // Flush any typed but unconfirmed email
    const finalEmails = alertEmailInputValue.trim()
      ? [...alertFormData.recipient_emails, alertEmailInputValue.trim()]
      : alertFormData.recipient_emails;
    // Flush any typed but unconfirmed phone
    const finalPhones = alertPhoneInputValue.trim()
      ? [...alertFormData.recipient_phones, alertPhoneInputValue.trim()]
      : alertFormData.recipient_phones;
    const payload = { ...alertFormData, recipient_emails: finalEmails, recipient_phones: finalPhones };
    try {
      if (editingAlertConfig) {
        await axios.put(`/api/site-alerts/${editingAlertConfig.id}`, payload);
        showSnackbar('Alert config updated successfully', 'success');
      } else {
        await axios.post('/api/site-alerts', payload);
        showSnackbar('Alert config created successfully', 'success');
      }
      handleCloseAlertDialog();
      fetchAlertConfigs();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to save alert config', 'error');
    }
  };

  const handleDeleteAlertConfig = async (id) => {
    if (!window.confirm('Delete this offline alert configuration?')) return;
    try {
      await axios.delete(`/api/site-alerts/${id}`);
      showSnackbar('Alert config deleted', 'success');
      fetchAlertConfigs();
    } catch (error) {
      showSnackbar('Failed to delete alert config', 'error');
    }
  };

  const handleOpenPowerDropDialog = (alert = null) => {
    // Reset cascading dropdowns
    setAvailableBaseStations([]);
    setAvailableMetrics([]);
    
    if (alert) {
      setEditingPowerDropAlert(alert);
      const formData = {
        name: alert.name || '',
        node_name: alert.node_name || '',
        base_station_name: alert.base_station_name || '',
        metric_mapping_id: alert.metric_mapping_id || '',
        drop_percentage: alert.drop_percentage || 80,
        time_window_seconds: alert.time_window_seconds || 5,
        check_interval_seconds: alert.check_interval_seconds || 5,
        recipient_users: alert.recipient_users || [],
        recipient_emails: alert.recipient_emails || [],
        recipient_phones: alert.recipient_phones || [],
        notify_email: alert.notify_email !== false,
        notify_whatsapp: alert.notify_whatsapp !== false,
        is_active: alert.is_active !== false
      };
      setPowerDropFormData(formData);
      
      // Load cascading data for existing alert
      if (formData.node_name) {
        fetchBaseStationsForNode(formData.node_name);
        if (formData.base_station_name) {
          fetchMetricsForNodeAndBaseStation(formData.node_name, formData.base_station_name);
        }
      }
    } else {
      setEditingPowerDropAlert(null);
      setPowerDropFormData({
        name: '',
        node_name: '',
        base_station_name: '',
        metric_mapping_id: '',
        drop_percentage: 80,
        time_window_seconds: 5,
        check_interval_seconds: 5,
        recipient_users: [],
        recipient_emails: [],
        recipient_phones: [],
        notify_email: true,
        notify_whatsapp: true,
        is_active: true
      });
    }
    setPowerDropEmailInputValue('');
    setPowerDropPhoneInputValue('');
    setOpenPowerDropDialog(true);
  };

  const handleClosePowerDropDialog = () => {
    setOpenPowerDropDialog(false);
    setEditingPowerDropAlert(null);
    setPowerDropEmailInputValue('');
    setPowerDropPhoneInputValue('');
    setAvailableBaseStations([]);
    setAvailableMetrics([]);
  };

  const handleNodeChange = (nodeName) => {
    setPowerDropFormData({ 
      ...powerDropFormData, 
      node_name: nodeName,
      base_station_name: '',
      metric_mapping_id: ''
    });
    setAvailableBaseStations([]);
    setAvailableMetrics([]);
    
    if (nodeName) {
      fetchBaseStationsForNode(nodeName);
    }
  };

  const handleBaseStationChange = (baseStationName) => {
    setPowerDropFormData({ 
      ...powerDropFormData, 
      base_station_name: baseStationName,
      metric_mapping_id: ''
    });
    setAvailableMetrics([]);
    
    if (baseStationName && powerDropFormData.node_name) {
      fetchMetricsForNodeAndBaseStation(powerDropFormData.node_name, baseStationName);
    }
  };

  const handleSavePowerDropAlert = async () => {
    if (!powerDropFormData.name?.trim() || !powerDropFormData.node_name || 
        !powerDropFormData.base_station_name || !powerDropFormData.metric_mapping_id) {
      showSnackbar('Please fill in all required fields: Name, Node, Base Station, and Metric', 'warning');
      return;
    }

    // Flush any typed but unconfirmed email
    const finalEmails = powerDropEmailInputValue.trim()
      ? [...powerDropFormData.recipient_emails, powerDropEmailInputValue.trim()]
      : powerDropFormData.recipient_emails;
    
    // Flush any typed but unconfirmed phone
    const finalPhones = powerDropPhoneInputValue.trim()
      ? [...powerDropFormData.recipient_phones, powerDropPhoneInputValue.trim()]
      : powerDropFormData.recipient_phones;

    const payload = { 
      ...powerDropFormData, 
      recipient_emails: finalEmails, 
      recipient_phones: finalPhones 
    };

    try {
      if (editingPowerDropAlert) {
        await axios.put(`/api/power-drop-alerts/${editingPowerDropAlert.id}`, payload);
        showSnackbar('Power drop alert updated successfully', 'success');
      } else {
        await axios.post('/api/power-drop-alerts', payload);
        showSnackbar('Power drop alert created successfully', 'success');
      }
      handleClosePowerDropDialog();
      fetchPowerDropAlerts();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to save power drop alert', 'error');
    }
  };

  const handleDeletePowerDropAlert = async (id) => {
    if (!window.confirm('Delete this power drop alert configuration?')) return;
    try {
      await axios.delete(`/api/power-drop-alerts/${id}`);
      showSnackbar('Power drop alert deleted', 'success');
      fetchPowerDropAlerts();
    } catch (error) {
      showSnackbar('Failed to delete power drop alert', 'error');
    }
  };

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        ...schedule,
        recipient_users: schedule.recipient_users || [],
        recipient_emails: schedule.recipient_emails || [],
        start_date: schedule.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        end_date: schedule.end_date?.split('T')[0] || ''
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        name: '',
        report_type: 'service',
        target_id: '',
        frequency: 'daily',
        interval_hours: 6,
        daily_time: '08:00',
        weekly_day: 1,
        weekly_time: '08:00',
        monthly_day: 1,
        monthly_time: '08:00',
        time_range: '24h',
        recipient_users: [],
        recipient_emails: [],
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_active: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchedule(null);
    setEmailInputValue('');
  };

  const handleSaveSchedule = async () => {
    try {
      // Flush any unconfirmed typed email into the list before saving
      const finalEmails = emailInputValue.trim()
        ? [...formData.recipient_emails, emailInputValue.trim()]
        : formData.recipient_emails;
      const dataToSave = { ...formData, recipient_emails: finalEmails };
      if (editingSchedule) {
        await axios.put(`/api/report-schedules/${editingSchedule.id}`, dataToSave);
        showSnackbar('Schedule updated successfully', 'success');
      } else {
        await axios.post('/api/report-schedules', dataToSave);
        showSnackbar('Schedule created successfully', 'success');
      }
      handleCloseDialog();
      fetchSchedules();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Failed to save schedule', 'error');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      await axios.delete(`/api/report-schedules/${id}`);
      showSnackbar('Schedule deleted successfully', 'success');
      fetchSchedules();
    } catch (error) {
      showSnackbar('Failed to delete schedule', 'error');
    }
  };

  const handleTestSchedule = async (id) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/report-schedules/${id}/test`);
      showSnackbar(response.data.message || 'Test report queued — check your email shortly.', 'success');
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Test failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    const email = prompt('Enter email address to send test:');
    if (!email) return;
    
    try {
      await axios.post('/api/report-schedules/test-email', { email });
      showSnackbar('Test email sent successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to send test email', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getFrequencyLabel = (schedule) => {
    switch (schedule.frequency) {
      case 'hourly':
        return `Every ${schedule.interval_hours} hours`;
      case 'daily':
        return `Daily at ${schedule.daily_time}`;
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[schedule.weekly_day]} at ${schedule.weekly_time}`;
      case 'monthly':
        return `Monthly on day ${schedule.monthly_day} at ${schedule.monthly_time}`;
      default:
        return schedule.frequency;
    }
  };

  const getStatusChip = (schedule) => {
    if (!schedule.is_active) {
      return <Chip size="small" label="Inactive" color="default" />;
    }
    if (schedule.end_date && new Date(schedule.end_date) < new Date()) {
      return <Chip size="small" label="Expired" color="error" />;
    }
    return <Chip size="small" label="Active" color="success" />;
  };

  // Manual Reports handler functions
  const handleCancelManualReport = async (reportId) => {
    try {
      await axios.post(`/api/manual-reports/cancel/${reportId}`);
      showSnackbar('Report generation cancelled', 'success');
      fetchManualReports();
    } catch (error) {
      showSnackbar('Failed to cancel report', 'error');
    }
  };

  const handleDownloadManualReport = async (reportId) => {
    try {
      // Download file as binary blob
      const response = await axios.get(`/api/manual-reports/download/${reportId}`, {
        responseType: 'blob'
      });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `manual_report_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      window.URL.revokeObjectURL(url);
      
      showSnackbar('Report downloaded successfully', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showSnackbar('Failed to download report', 'error');
    }
  };

  const handleEmailManualReport = async (reportId) => {
    try {
      const recipients = prompt('Enter email addresses (comma-separated):');
      if (recipients) {
        const emailArray = recipients.split(',').map(email => email.trim()).filter(email => email);
        await axios.post(`/api/manual-reports/send-email/${reportId}`, {
          recipients: emailArray
        });
        showSnackbar('Report sent via email', 'success');
      }
    } catch (error) {
      showSnackbar('Failed to send report via email', 'error');
    }
  };

  const handleGenerateManualReport = async () => {
    try {
      // Enhanced form validation
      if (manualReportFormData.targetIds.length === 0) {
        showSnackbar(`Please select at least one ${manualReportFormData.reportType}`, 'error');
        setManualReportStep(2); // Go back to target selection step
        return;
      }

      // Validate date range
      const startDate = new Date(manualReportFormData.dateRangeStart);
      const endDate = new Date(manualReportFormData.dateRangeEnd);
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 90) {
        showSnackbar('Date range cannot exceed 90 days', 'error');
        setManualReportStep(3); // Go back to date range step
        return;
      }

      if (startDate > endDate) {
        showSnackbar('Start date must be before end date', 'error');
        setManualReportStep(3); // Go back to date range step
        return;
      }

      // Validate email recipients if email delivery is selected
      if ((manualReportFormData.deliveryMethod === 'email' || manualReportFormData.deliveryMethod === 'both') && 
          manualReportFormData.recipients.length === 0) {
        showSnackbar('Please add at least one email recipient', 'error');
        setManualReportStep(4); // Go back to delivery step
        return;
      }

      // Validate that selected targets still exist
      const availableTargets = manualReportFormData.reportType === 'service' ? services : clients;
      const validTargetIds = manualReportFormData.targetIds.filter(id => 
        availableTargets.some(target => (target.id || target) === id)
      );

      if (validTargetIds.length !== manualReportFormData.targetIds.length) {
        showSnackbar('Some selected targets are no longer available. Please update your selection.', 'error');
        setManualReportFormData({
          ...manualReportFormData,
          targetIds: validTargetIds
        });
        setManualReportStep(2); // Go back to target selection step
        return;
      }

      const response = await axios.post('/api/manual-reports/generate', {
        reportType: manualReportFormData.reportType,
        targetIds: validTargetIds,
        dateRangeStart: new Date(manualReportFormData.dateRangeStart).toISOString(),
        dateRangeEnd: new Date(manualReportFormData.dateRangeEnd).toISOString(),
        deliveryMethod: manualReportFormData.deliveryMethod,
        recipients: manualReportFormData.recipients
      });

      showSnackbar(response.data.message, 'success');
      setOpenManualReportDialog(false);
      setManualReportStep(1);
      
      // Reset form data for next use
      setManualReportFormData({
        reportType: 'service',
        targetIds: [],
        dateRangeStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dateRangeEnd: new Date().toISOString().split('T')[0],
        deliveryMethod: 'download',
        recipients: [],
        searchQuery: ''
      });
      
      // Start polling for progress
      const reportId = response.data.reportId;
      const progressInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`/api/manual-reports/status/${reportId}`);
          const progress = statusResponse.data.progress;
          
          setProcessingReports(prev => new Map(prev.set(reportId, {
            progress,
            status: statusResponse.data.processorStatus
          })));

          if (progress === 100 || statusResponse.data.status === 'failed' || statusResponse.data.status === 'completed') {
            clearInterval(progressInterval);
            fetchManualReports();
            fetchManualReportStats();
          }
        } catch (error) {
          clearInterval(progressInterval);
        }
      }, 2000);

      fetchManualReports();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to generate report';
      showSnackbar(errorMessage, 'error');
      
      // Handle specific validation errors
      if (errorMessage.includes('rate limit')) {
        showSnackbar('You have reached your daily limit. Please try again tomorrow.', 'error');
      } else if (errorMessage.includes('target')) {
        setManualReportStep(2);
      } else if (errorMessage.includes('date')) {
        setManualReportStep(3);
      }
    }
  };

  // Preview handler function
  const handlePreviewReport = async () => {
    try {
      setPreviewLoading(true);
      
      const response = await axios.post('/api/manual-reports/preview', {
        reportType: manualReportFormData.reportType,
        targetIds: manualReportFormData.targetIds,
        dateRangeStart: new Date(manualReportFormData.dateRangeStart).toISOString(),
        dateRangeEnd: new Date(manualReportFormData.dateRangeEnd).toISOString()
      });

      setPreviewData(response.data.preview);
      setOpenPreviewDialog(true);
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to generate preview', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Alerts & Reports Scheduling
      </Typography>

      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)}
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .Mui-selected': { color: BSI_COLORS.primary + ' !important' },
            '& .MuiTabs-indicator': { backgroundColor: BSI_COLORS.primary }
          }}
        >
          <Tab icon={<ScheduleIcon />} iconPosition="start" label="Scheduled Reports" />
          <Tab icon={<WifiOffIcon />} iconPosition="start" label="Offline Alerts" />
          <Tab icon={<PowerIcon />} iconPosition="start" label="Power Drops" />
          <Tab icon={<EmailIcon />} iconPosition="start" label="Email Test" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">
                  Report Schedules ({schedules.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  sx={{
                    background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.dark} 100%)`,
                  }}
                >
                  New Schedule
                </Button>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: isDark ? 'rgba(0,153,255,0.15)' : BSI_COLORS.light }}>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Type</strong></TableCell>
                      <TableCell><strong>Target</strong></TableCell>
                      <TableCell><strong>Frequency</strong></TableCell>
                      <TableCell><strong>Time Range</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Last Run</strong></TableCell>
                      <TableCell><strong>Next Run</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(schedules || []).map((schedule) => (
                      <TableRow key={schedule.id} hover>
                        <TableCell>{schedule.name}</TableCell>
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={schedule.report_type === 'service' ? 'Service' : 'Client'}
                            color={schedule.report_type === 'service' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>{schedule.target_name}</TableCell>
                        <TableCell>{getFrequencyLabel(schedule)}</TableCell>
                        <TableCell>{schedule.time_range}</TableCell>
                        <TableCell>{getStatusChip(schedule)}</TableCell>
                        <TableCell>
                          {schedule.last_run ? (
                            <Tooltip title={schedule.last_run_message || ''}>
                              <Chip
                                size="small"
                                label={new Date(schedule.last_run).toLocaleDateString()}
                                color={
                                  schedule.last_run_status === 'success' ? 'success' :
                                  schedule.last_run_status === 'failed' ? 'error' : 'warning'
                                }
                              />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">Never</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {schedule.next_run ? (
                            new Date(schedule.next_run).toLocaleString()
                          ) : (
                            <Typography variant="caption" color="text.secondary">N/A</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Test Run">
                            <IconButton
                              size="small"
                              onClick={() => handleTestSchedule(schedule.id)}
                              color="primary"
                            >
                              <PlayArrowIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(schedule)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress sx={{ color: BSI_COLORS.primary }} />
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    Loading schedules...
                  </Typography>
                </Box>
              ) : schedules.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    No scheduled reports yet. Click "New Schedule" to create one.
                  </Typography>
                </Box>
              )}
            </>
          )}

          {activeTab === 1 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Offline Site Alerts ({alertConfigs.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Configure email notifications when a base station goes offline (no data for 3+ hours).
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenAlertDialog()}
                  sx={{ background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.primaryDark} 100%)` }}
                >
                  Add Alert Config
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: isDark ? 'rgba(0,153,255,0.15)' : BSI_COLORS.light }}>
                      <TableCell><strong>Base Station</strong></TableCell>
                      <TableCell><strong>Repeat Every</strong></TableCell>
                      <TableCell><strong>Recipients</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alertConfigs.map((config) => (
                      <TableRow key={config.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WifiOffIcon sx={{ fontSize: 16, color: BSI_COLORS.gray }} />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{config.base_station_name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={`Every ${config.repeat_interval_hours}h`} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {(config.recipient_users?.length || 0)} user(s), {(config.recipient_emails?.length || 0)} email(s), {(config.recipient_phones?.length || 0)} phone(s)
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={config.is_active ? 'Active' : 'Inactive'}
                            color={config.is_active ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleOpenAlertDialog(config)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeleteAlertConfig(config.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {alertConfigs.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <NotificationsActiveIcon sx={{ fontSize: 48, color: BSI_COLORS.gray, mb: 1 }} />
                  <Typography color="text.secondary">
                    No offline alert configurations yet. Click "Add Alert Config" to create one.
                  </Typography>
                </Box>
              )}
            </>
          )}

          {activeTab === 2 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography variant="h6">
                    Power Drop Alerts ({powerDropAlerts.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monitor sudden drops in metrics like Forward Power
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenPowerDropDialog()}
                  sx={{
                    background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.dark} 100%)`,
                  }}
                >
                  New Power Drop Alert
                </Button>
              </Box>

              {powerDropAlerts.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Node / Station</TableCell>
                        <TableCell>Metric</TableCell>
                        <TableCell>Drop Threshold</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Triggered</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {powerDropAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {alert.name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                              {alert.notify_email && (
                                <Chip size="small" icon={<EmailIcon />} label="Email" />
                              )}
                              {alert.notify_whatsapp && (
                                <Chip size="small" icon={<NotificationsActiveIcon />} label="WhatsApp" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {alert.node_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alert.base_station_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {alert.metric_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alert.column_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {alert.drop_percentage}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alert.time_window_seconds}s window
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={alert.status === 'active' ? 'Alert Active' : 'Normal'}
                              color={alert.status === 'active' ? 'error' : 'success'}
                              variant="outlined"
                            />
                            {alert.alert_count > 0 && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {alert.alert_count} alert(s) sent
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {alert.last_triggered ? 
                                new Date(alert.last_triggered).toLocaleString() : 
                                'Never'
                              }
                            </Typography>
                            {alert.recovered_at && (
                              <Typography variant="caption" color="success.main" display="block">
                                Recovered: {new Date(alert.recovered_at).toLocaleString()}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenPowerDropDialog(alert)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeletePowerDropAlert(alert.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PowerIcon sx={{ fontSize: 64, color: BSI_COLORS.primary, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Power Drop Alerts
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Create alerts to monitor sudden drops in metrics like Forward Power.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenPowerDropDialog()}
                    sx={{
                      background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.dark} 100%)`,
                    }}
                  >
                    Create Power Drop Alert
                  </Button>
                </Box>
              )}
            </>
          )}

          {activeTab === 3 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <EmailIcon sx={{ fontSize: 64, color: BSI_COLORS.primary, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Email Configuration Test
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Send a test email to verify SMTP configuration is working correctly.
              </Typography>
              <Button
                variant="contained"
                onClick={handleTestEmail}
                sx={{
                  background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.dark} 100%)`,
                }}
              >
                Send Test Email
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Schedule Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${BSI_COLORS.navy} 0%, ${BSI_COLORS.dark} 100%)`,
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 600,
            py: 2,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <ScheduleIcon sx={{ fontSize: 28, color: BSI_COLORS.primary }} />
          {editingSchedule ? 'Edit Report Schedule' : 'Create New Report Schedule'}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, backgroundColor: isDark ? 'background.paper' : BSI_COLORS.executiveBg }}>
            {/* Section: Schedule Identity */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <AssessmentIcon sx={{ color: BSI_COLORS.primary, fontSize: 22 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: isDark ? BSI_COLORS.primary : BSI_COLORS.navy }}>
                  Schedule Identity
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    label="Schedule Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: isDark ? 'transparent' : 'white',
                        '&:hover fieldset': { borderColor: BSI_COLORS.primary },
                        '&.Mui-focused fieldset': { borderColor: BSI_COLORS.primary }
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section: Report Configuration */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <BusinessIcon sx={{ color: BSI_COLORS.primary, fontSize: 22 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: isDark ? BSI_COLORS.primary : BSI_COLORS.navy }}>
                  Report Configuration
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth variant="outlined" sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}>
                    <InputLabel>Report Type</InputLabel>
                    <Select
                      value={formData.report_type}
                      onChange={(e) => setFormData({ ...formData, report_type: e.target.value, target_id: '' })}
                      label="Report Type"
                    >
                      <MenuItem value="service">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AssessmentIcon sx={{ fontSize: 18, color: BSI_COLORS.primary }} />
                          Service Report
                        </Box>
                      </MenuItem>
                      <MenuItem value="client">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BusinessIcon sx={{ fontSize: 18, color: BSI_COLORS.primary }} />
                          Client Report
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth variant="outlined" sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}>
                    <InputLabel>
                      {formData.report_type === 'service' ? 'Select Service' : 'Select Client'}
                    </InputLabel>
                    <Select
                      value={formData.target_id}
                      onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                      required
                      label={formData.report_type === 'service' ? 'Select Service' : 'Select Client'}
                    >
                      {formData.report_type === 'service'
                        ? (services || []).map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)
                        : (clients || []).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)
                      }
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth variant="outlined" sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}>
                    <InputLabel>Time Range</InputLabel>
                    <Select
                      value={formData.time_range}
                      onChange={(e) => setFormData({ ...formData, time_range: e.target.value })}
                      label="Time Range"
                    >
                      <MenuItem value="24h">Last 24 Hours</MenuItem>
                      <MenuItem value="7d">Last 7 Days</MenuItem>
                      <MenuItem value="30d">Last 30 Days</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Section: Schedule Timing */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <AccessTimeIcon sx={{ color: BSI_COLORS.primary, fontSize: 22 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: isDark ? BSI_COLORS.primary : BSI_COLORS.navy }}>
                  Schedule Timing
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth variant="outlined" sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}>
                    <InputLabel>Frequency</InputLabel>
                    <Select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      label="Frequency"
                    >
                      <MenuItem value="hourly">Every X Hours</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {formData.frequency === 'hourly' && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Interval (hours)"
                      value={formData.interval_hours}
                      onChange={(e) => setFormData({ ...formData, interval_hours: parseInt(e.target.value) })}
                      inputProps={{ min: 1, max: 24 }}
                      variant="outlined"
                      sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}
                    />
                  </Grid>
                )}

                {formData.frequency === 'daily' && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="time"
                      label="Time of Day"
                      value={formData.daily_time}
                      onChange={(e) => setFormData({ ...formData, daily_time: e.target.value })}
                      variant="outlined"
                      sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}
                    />
                  </Grid>
                )}

                {formData.frequency === 'weekly' && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth variant="outlined" sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}>
                        <InputLabel>Day of Week</InputLabel>
                        <Select
                          value={formData.weekly_day}
                          onChange={(e) => setFormData({ ...formData, weekly_day: e.target.value })}
                          label="Day of Week"
                        >
                          <MenuItem value={0}>Sunday</MenuItem>
                          <MenuItem value={1}>Monday</MenuItem>
                          <MenuItem value={2}>Tuesday</MenuItem>
                          <MenuItem value={3}>Wednesday</MenuItem>
                          <MenuItem value={4}>Thursday</MenuItem>
                          <MenuItem value={5}>Friday</MenuItem>
                          <MenuItem value={6}>Saturday</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        type="time"
                        label="Time of Day"
                        value={formData.weekly_time}
                        onChange={(e) => setFormData({ ...formData, weekly_time: e.target.value })}
                        variant="outlined"
                        sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}
                      />
                    </Grid>
                  </>
                )}

                {formData.frequency === 'monthly' && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Day of Month (1-31)"
                        value={formData.monthly_day}
                        onChange={(e) => setFormData({ ...formData, monthly_day: parseInt(e.target.value) })}
                        inputProps={{ min: 1, max: 31 }}
                        variant="outlined"
                        sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        type="time"
                        label="Time of Day"
                        value={formData.monthly_time}
                        onChange={(e) => setFormData({ ...formData, monthly_time: e.target.value })}
                        variant="outlined"
                        sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}
                      />
                    </Grid>
                  </>
                )}

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                    variant="outlined"
                    sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="End Date (Optional)"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    sx={{ backgroundColor: isDark ? 'transparent' : 'white' }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section: Recipients */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <PeopleIcon sx={{ color: BSI_COLORS.primary, fontSize: 22 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: isDark ? BSI_COLORS.primary : BSI_COLORS.navy }}>
                  Recipients
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Autocomplete
                    multiple
                    options={users || []}
                    getOptionLabel={(option) => `${option.email} (${option.role})`}
                    value={(users || []).filter(u => formData.recipient_users.includes(u.id))}
                    onChange={(e, newValue) => {
                      setFormData({
                        ...formData,
                        recipient_users: newValue.map(u => u.id)
                      });
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="System Users" placeholder="Select users..." />
                    )}
                  />
                </Grid>

                <Grid size={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={formData.recipient_emails}
                    inputValue={emailInputValue}
                    onInputChange={(e, val) => setEmailInputValue(val)}
                    onChange={(e, newValue) => {
                      setFormData({ ...formData, recipient_emails: newValue });
                      setEmailInputValue('');
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
                        return (
                          <Chip
                            key={key}
                            variant="outlined"
                            label={option}
                            size="small"
                            {...tagProps}
                          />
                        );
                      })
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="External Emails" placeholder="Type email and press Enter..." helperText="Press Enter to add, or just click Save" />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section: Status */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <ScheduleIcon sx={{ color: BSI_COLORS.primary, fontSize: 22 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: isDark ? BSI_COLORS.primary : BSI_COLORS.navy }}>
                  Status
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label={<Typography sx={{ fontWeight: 500 }}>Active</Typography>}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, backgroundColor: isDark ? 'background.paper' : '#f8f9fa' }}>
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{ 
              borderColor: BSI_COLORS.gray,
              color: isDark ? 'text.primary' : BSI_COLORS.dark,
              '&:hover': { borderColor: isDark ? 'text.primary' : BSI_COLORS.dark }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveSchedule}
            variant="contained"
            size="large"
            sx={{
              background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.primaryDark} 100%)`,
              px: 4,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0, 153, 255, 0.3)',
              '&:hover': {
                background: `linear-gradient(135deg, ${BSI_COLORS.primaryDark} 0%, ${BSI_COLORS.primary} 100%)`,
                boxShadow: '0 6px 16px rgba(0, 153, 255, 0.4)'
              }
            }}
          >
            {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Offline Alert Config Dialog */}
      <Dialog open={openAlertDialog} onClose={handleCloseAlertDialog} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${BSI_COLORS.navy} 0%, ${BSI_COLORS.dark} 100%)`,
            color: 'white', fontSize: '1.2rem', fontWeight: 600, py: 2, px: 3,
            display: 'flex', alignItems: 'center', gap: 2
          }}
        >
          <WifiOffIcon sx={{ fontSize: 24, color: BSI_COLORS.primary }} />
          {editingAlertConfig ? 'Edit Offline Alert Config' : 'New Offline Alert Config'}
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Autocomplete
                options={baseStations}
                value={alertFormData.base_station_name || null}
                onChange={(e, val) => setAlertFormData({ ...alertFormData, base_station_name: val || '' })}
                renderInput={(params) => <TextField {...params} label="Base Station" required />}
                disabled={!!editingAlertConfig}
              />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Repeat Notification Interval</InputLabel>
                <Select
                  value={alertFormData.repeat_interval_hours}
                  label="Repeat Notification Interval"
                  onChange={(e) => setAlertFormData({ ...alertFormData, repeat_interval_hours: e.target.value })}
                >
                  {[1, 2, 4, 6, 12, 24].map(h => (
                    <MenuItem key={h} value={h}>Every {h} hour{h > 1 ? 's' : ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <Autocomplete
                multiple
                options={users || []}
                getOptionLabel={(option) => `${option.email} (${option.role})`}
                value={(users || []).filter(u => alertFormData.recipient_users.includes(u.id))}
                onChange={(e, newValue) => setAlertFormData({ ...alertFormData, recipient_users: newValue.map(u => u.id) })}
                renderInput={(params) => <TextField {...params} label="System Users" placeholder="Select users..." />}
              />
            </Grid>
            <Grid size={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={alertFormData.recipient_emails}
                inputValue={alertEmailInputValue}
                onInputChange={(e, val) => setAlertEmailInputValue(val)}
                onChange={(e, newValue) => {
                  setAlertFormData({ ...alertFormData, recipient_emails: newValue });
                  setAlertEmailInputValue('');
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip key={key} variant="outlined" label={option} size="small" {...tagProps} />;
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="External Emails" placeholder="Type email and press Enter..." helperText="Press Enter to add" />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={alertFormData.recipient_phones}
                inputValue={alertPhoneInputValue}
                onInputChange={(e, val) => setAlertPhoneInputValue(val)}
                onChange={(e, newValue) => {
                  setAlertFormData({ ...alertFormData, recipient_phones: newValue });
                  setAlertPhoneInputValue('');
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip key={key} variant="outlined" label={option} size="small" color="success" {...tagProps} />;
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="WhatsApp Phone Numbers" placeholder="Type +254... and press Enter..." helperText="International format: +254712345678. Press Enter to add." />
                )}
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={alertFormData.is_active}
                    onChange={(e) => setAlertFormData({ ...alertFormData, is_active: e.target.checked })}
                    color="primary"
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleCloseAlertDialog} variant="outlined">Cancel</Button>
          <Button
            onClick={handleSaveAlertConfig}
            variant="contained"
            sx={{ background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.primaryDark} 100%)`, fontWeight: 600 }}
          >
            {editingAlertConfig ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Power Drop Alert Dialog */}
      <Dialog open={openPowerDropDialog} onClose={handleClosePowerDropDialog} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${BSI_COLORS.navy} 0%, ${BSI_COLORS.dark} 100%)`,
            color: 'white', fontSize: '1.2rem', fontWeight: 600, py: 2, px: 3,
            display: 'flex', alignItems: 'center', gap: 2
          }}
        >
          <PowerIcon sx={{ fontSize: 24, color: BSI_COLORS.primary }} />
          {editingPowerDropAlert ? 'Edit Power Drop Alert' : 'New Power Drop Alert'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Alert Name"
                value={powerDropFormData.name}
                onChange={(e) => setPowerDropFormData({ ...powerDropFormData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth required>
                <InputLabel>Node</InputLabel>
                <Select
                  value={powerDropFormData.node_name}
                  label="Node"
                  onChange={(e) => handleNodeChange(e.target.value)}
                >
                  {nodes.map((node) => (
                    <MenuItem key={node} value={node}>{node}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth required>
                <InputLabel>Base Station</InputLabel>
                <Select
                  value={powerDropFormData.base_station_name}
                  label="Base Station"
                  onChange={(e) => handleBaseStationChange(e.target.value)}
                  disabled={!powerDropFormData.node_name}
                >
                  {availableBaseStations.map((station) => (
                    <MenuItem key={station} value={station}>{station}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth required>
                <InputLabel>Metric to Monitor</InputLabel>
                <Select
                  value={powerDropFormData.metric_mapping_id}
                  label="Metric to Monitor"
                  onChange={(e) => setPowerDropFormData({ ...powerDropFormData, metric_mapping_id: e.target.value })}
                  disabled={!powerDropFormData.base_station_name}
                >
                  {availableMetrics.map((metric) => (
                    <MenuItem key={metric.id} value={metric.id}>
                      {metric.metric_name} ({metric.column_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={4}>
              <TextField
                fullWidth
                label="Drop Threshold (%)"
                type="number"
                value={powerDropFormData.drop_percentage}
                onChange={(e) => setPowerDropFormData({ ...powerDropFormData, drop_percentage: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 1, max: 100 }}
                helperText="Percentage drop to trigger alert"
              />
            </Grid>
            <Grid size={4}>
              <TextField
                fullWidth
                label="Time Window (seconds)"
                type="number"
                value={powerDropFormData.time_window_seconds}
                onChange={(e) => setPowerDropFormData({ ...powerDropFormData, time_window_seconds: parseInt(e.target.value) || 5 })}
                inputProps={{ min: 1, max: 300 }}
                helperText="Time period to compare"
              />
            </Grid>
            <Grid size={4}>
              <TextField
                fullWidth
                label="Check Interval (seconds)"
                type="number"
                value={powerDropFormData.check_interval_seconds}
                onChange={(e) => setPowerDropFormData({ ...powerDropFormData, check_interval_seconds: parseInt(e.target.value) || 5 })}
                inputProps={{ min: 1, max: 300 }}
                helperText="How often to check"
              />
            </Grid>
            <Grid size={6}>
              <Autocomplete
                multiple
                options={users}
                getOptionLabel={(option) => option.username || option}
                value={users.filter(u => powerDropFormData.recipient_users.includes(u.id))}
                onChange={(e, newValue) => {
                  setPowerDropFormData({ 
                    ...powerDropFormData, 
                    recipient_users: newValue.map(u => u.id) 
                  });
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Notify Users" placeholder="Select users..." />
                )}
              />
            </Grid>
            <Grid size={6}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={powerDropFormData.recipient_emails}
                inputValue={powerDropEmailInputValue}
                onInputChange={(e, val) => setPowerDropEmailInputValue(val)}
                onChange={(e, newValue) => {
                  setPowerDropFormData({ ...powerDropFormData, recipient_emails: newValue });
                  setPowerDropEmailInputValue('');
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip key={key} variant="outlined" label={option} size="small" color="primary" {...tagProps} />;
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="External Emails" placeholder="Type email and press Enter..." helperText="Press Enter to add" />
                )}
              />
            </Grid>
            <Grid size={6}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={powerDropFormData.recipient_phones}
                inputValue={powerDropPhoneInputValue}
                onInputChange={(e, val) => setPowerDropPhoneInputValue(val)}
                onChange={(e, newValue) => {
                  setPowerDropFormData({ ...powerDropFormData, recipient_phones: newValue });
                  setPowerDropPhoneInputValue('');
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return <Chip key={key} variant="outlined" label={option} size="small" color="success" {...tagProps} />;
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="WhatsApp Phone Numbers" placeholder="Type +254... and press Enter..." helperText="International format: +254712345678. Press Enter to add." />
                )}
              />
            </Grid>
            <Grid size={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={powerDropFormData.notify_email}
                      onChange={(e) => setPowerDropFormData({ ...powerDropFormData, notify_email: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Send Email Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={powerDropFormData.notify_whatsapp}
                      onChange={(e) => setPowerDropFormData({ ...powerDropFormData, notify_whatsapp: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Send WhatsApp Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={powerDropFormData.is_active}
                      onChange={(e) => setPowerDropFormData({ ...powerDropFormData, is_active: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClosePowerDropDialog} variant="outlined">Cancel</Button>
          <Button
            onClick={handleSavePowerDropAlert}
            variant="contained"
            sx={{ background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.primaryDark} 100%)`, fontWeight: 600 }}
          >
            {editingPowerDropAlert ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Report Dialog */}
      <Dialog 
        open={openManualReportDialog} 
        onClose={() => {
          setOpenManualReportDialog(false);
          setManualReportStep(1);
        }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.primaryDark} 100%)`,
          color: 'white',
          py: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DescriptionIcon />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Generate Manual Report
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* Step Indicator */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <Stepper activeStep={manualReportStep - 1} alternativeLabel>
              <Step>
                <StepLabel>Report Type</StepLabel>
              </Step>
              <Step>
                <StepLabel>Target Selection</StepLabel>
              </Step>
              <Step>
                <StepLabel>Date Range</StepLabel>
              </Step>
              <Step>
                <StepLabel>Delivery</StepLabel>
              </Step>
              <Step>
                <StepLabel>Preview</StepLabel>
              </Step>
              <Step>
                <StepLabel>Generate</StepLabel>
              </Step>
            </Stepper>
          </Box>

          {/* Step 1: Report Type */}
          {manualReportStep === 1 && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" gutterBottom>
                Select Report Type
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Choose whether to generate a service-level or client-level report
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant={manualReportFormData.reportType === 'service' ? 'contained' : 'outlined'}
                  onClick={() => setManualReportFormData({ ...manualReportFormData, reportType: 'service' })}
                  sx={{ minWidth: 150 }}
                >
                  Service Report
                </Button>
                <Button
                  variant={manualReportFormData.reportType === 'client' ? 'contained' : 'outlined'}
                  onClick={() => setManualReportFormData({ ...manualReportFormData, reportType: 'client' })}
                  sx={{ minWidth: 150 }}
                >
                  Client Report
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 2: Enhanced Target Selection */}
          {manualReportStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Select {manualReportFormData.reportType === 'service' ? 'Services' : 'Clients'}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Choose the {manualReportFormData.reportType === 'service' ? 'services' : 'clients'} to include in the report
              </Typography>

              {/* Search and Filter Controls */}
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder={`Search ${manualReportFormData.reportType === 'service' ? 'services' : 'clients'}...`}
                  value={manualReportFormData.searchQuery || ''}
                  onChange={(e) => setManualReportFormData({ 
                    ...manualReportFormData, 
                    searchQuery: e.target.value 
                  })}
                  sx={{ flexGrow: 1 }}
                  InputProps={{
                    startAdornment: <AssessmentIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const allTargets = manualReportFormData.reportType === 'service' ? services : clients;
                    setManualReportFormData({
                      ...manualReportFormData,
                      targetIds: allTargets.map(item => item.id || item)
                    });
                  }}
                >
                  Select All
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setManualReportFormData({
                      ...manualReportFormData,
                      targetIds: []
                    });
                  }}
                >
                  Clear All
                </Button>
              </Box>

              {/* Selection Summary */}
              <Box sx={{ mb: 2, p: 2, backgroundColor: isDark ? 'rgba(0,153,255,0.05)' : '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Selected: {manualReportFormData.targetIds.length} of {(manualReportFormData.reportType === 'service' ? services : clients).length} {manualReportFormData.reportType === 'service' ? 'services' : 'clients'}
                </Typography>
                {manualReportFormData.targetIds.length > 0 && (
                  <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                    {manualReportFormData.targetIds.length > 10 ? 
                      `${manualReportFormData.targetIds.length} targets selected` :
                      (manualReportFormData.reportType === 'service' ? services : clients)
                        .filter(item => manualReportFormData.targetIds.includes(item.id || item))
                        .map(item => item.name || item)
                        .join(', ')
                    }
                  </Typography>
                )}
              </Box>

              {/* Enhanced Autocomplete with Filtering */}
              <Autocomplete
                multiple
                options={(manualReportFormData.reportType === 'service' ? services : clients).filter(item => {
                  const searchQuery = manualReportFormData.searchQuery || '';
                  const itemName = (item.name || '').toLowerCase();
                  const searchLower = searchQuery.toLowerCase();
                  return itemName.includes(searchLower);
                })}
                getOptionLabel={(option) => option.name || option}
                value={(manualReportFormData.reportType === 'service' ? services : clients).filter(item => 
                  manualReportFormData.targetIds.includes(item.id || item)
                )}
                onChange={(e, newValue) => {
                  setManualReportFormData({ 
                    ...manualReportFormData, 
                    targetIds: newValue.map(item => item.id || item) 
                  });
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label={`Select ${manualReportFormData.reportType === 'service' ? 'Services' : 'Clients'}`}
                    placeholder="Choose targets..."
                    fullWidth
                    helperText={`Start typing to search ${manualReportFormData.reportType === 'service' ? 'services' : 'clients'}`}
                  />
                )}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.id || option}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Checkbox
                        checked={selected}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2">
                          {option.name || option}
                        </Typography>
                        {manualReportFormData.reportType === 'service' && option.client_name && (
                          <Typography variant="caption" color="text.secondary">
                            Client: {option.client_name}
                          </Typography>
                        )}
                        {manualReportFormData.reportType === 'client' && option.service_count !== undefined && (
                          <Typography variant="caption" color="text.secondary">
                            {option.service_count} service{option.service_count !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                      {selected && (
                        <Chip 
                          size="small" 
                          label="Selected" 
                          color="primary" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </li>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                      <Chip 
                        key={key} 
                        variant="outlined" 
                        label={option.name || option} 
                        size="small" 
                        color="primary" 
                        onDelete={() => {
                          const newTargetIds = manualReportFormData.targetIds.filter(id => 
                            id !== (option.id || option)
                          );
                          setManualReportFormData({ 
                            ...manualReportFormData, 
                            targetIds: newTargetIds 
                          });
                        }}
                        {...tagProps} 
                      />
                    );
                  })
                }
                limitTags={5}
                noOptionsText={
                  manualReportFormData.searchQuery ? 
                    `No ${manualReportFormData.reportType === 'service' ? 'services' : 'clients'} found matching "${manualReportFormData.searchQuery}"` :
                    `No ${manualReportFormData.reportType === 'service' ? 'services' : 'clients'} available`
                }
              />

              {/* Quick Selection Groups */}
              {manualReportFormData.reportType === 'client' && clients.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Quick Selection by Client Type
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {[
                      { label: 'Active Clients', filter: (c) => c.is_active || c.isActive },
                      { label: 'Inactive Clients', filter: (c) => !(c.is_active || c.isActive) }
                    ].map((group) => {
                      const filteredClients = clients.filter(group.filter);
                      return (
                        <Button
                          key={group.label}
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            const filteredIds = filteredClients.map(c => c.id || c);
                            setManualReportFormData({
                              ...manualReportFormData,
                              targetIds: [...new Set([...manualReportFormData.targetIds, ...filteredIds])]
                            });
                          }}
                          disabled={filteredClients.length === 0}
                        >
                          {group.label} ({filteredClients.length})
                        </Button>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {manualReportFormData.reportType === 'service' && services.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Quick Selection by Client
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Array.from(new Set(services.map(s => s.client_name).filter(Boolean)))
                      .sort()
                      .map((clientName) => {
                        const clientServices = services.filter(s => s.client_name === clientName);
                        return (
                          <Button
                            key={clientName}
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              const serviceIds = clientServices.map(s => s.id || s);
                              setManualReportFormData({
                                ...manualReportFormData,
                                targetIds: [...new Set([...manualReportFormData.targetIds, ...serviceIds])]
                              });
                            }}
                          >
                            {clientName} ({clientServices.length})
                          </Button>
                        );
                      })}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Step 3: Date Range */}
          {manualReportStep === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Select Date Range
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Choose the date range for the report (max 90 days)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Start Date"
                    type="date"
                    fullWidth
                    value={manualReportFormData.dateRangeStart}
                    onChange={(e) => setManualReportFormData({ ...manualReportFormData, dateRangeStart: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ max: manualReportFormData.dateRangeEnd }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="End Date"
                    type="date"
                    fullWidth
                    value={manualReportFormData.dateRangeEnd}
                    onChange={(e) => setManualReportFormData({ ...manualReportFormData, dateRangeEnd: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: manualReportFormData.dateRangeStart }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Step 4: Delivery Method */}
          {manualReportStep === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Delivery Method
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Choose how you want to receive the report
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={manualReportFormData.deliveryMethod}
                  onChange={(e) => setManualReportFormData({ ...manualReportFormData, deliveryMethod: e.target.value })}
                >
                  <FormControlLabel value="download" control={<Radio />} label="Download only" />
                  <FormControlLabel value="email" control={<Radio />} label="Email only" />
                  <FormControlLabel value="both" control={<Radio />} label="Both download and email" />
                </RadioGroup>
              </FormControl>

              {(manualReportFormData.deliveryMethod === 'email' || manualReportFormData.deliveryMethod === 'both') && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Email Recipients
                  </Typography>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={manualReportFormData.recipients}
                    inputValue={manualReportEmailInputValue}
                    onInputChange={(e, val) => setManualReportEmailInputValue(val)}
                    onChange={(e, newValue) => {
                      setManualReportFormData({ ...manualReportFormData, recipients: newValue });
                      setManualReportEmailInputValue('');
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });
                        return (
                          <Chip 
                            key={key} 
                            variant="outlined" 
                            label={option} 
                            size="small" 
                            color="primary" 
                            {...tagProps} 
                          />
                        );
                      })
                    }
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Email Addresses" 
                        placeholder="Type email and press Enter..."
                        helperText="Press Enter to add each email address"
                        fullWidth
                      />
                    )}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Step 5: Preview */}
          {manualReportStep === 5 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Report Preview
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Preview your report data before generating the full report
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  onClick={handlePreviewReport}
                  disabled={previewLoading}
                  startIcon={previewLoading ? <CircularProgress size={16} /> : <AssessmentIcon />}
                  sx={{
                    background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.primaryDark} 100%)`,
                  }}
                >
                  {previewLoading ? 'Generating Preview...' : 'Generate Preview'}
                </Button>
                
                {previewData && (
                  <Button
                    variant="outlined"
                    onClick={() => setOpenPreviewDialog(true)}
                  >
                    View Detailed Preview
                  </Button>
                )}
              </Box>

              {previewData && (
                <Paper sx={{ p: 2, backgroundColor: isDark ? 'rgba(0,153,255,0.05)' : '#f8f9fa' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Preview Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Data Quality:</Typography>
                      <Chip 
                        size="small"
                        label={previewData.quality.dataCompleteness === 'good' ? 'Good' : 'No Data'}
                        color={previewData.quality.dataCompleteness === 'good' ? 'success' : 'warning'}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Est. File Size:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {previewData.estimates.fileSizeHuman}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Est. Generation Time:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {previewData.estimates.generationTimeHuman}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Data Points:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {previewData.estimates.totalDataPoints.toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {previewData.quality.recommendedAction === 'adjust_date_range' && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      No data found for the selected date range. Consider adjusting the date range or selecting different targets.
                    </Alert>
                  )}
                  
                  {previewData.quality.recommendedAction === 'proceed' && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Data looks good! You can proceed with generating the full report.
                    </Alert>
                  )}
                </Paper>
              )}
            </Box>
          )}

          {/* Step 6: Summary */}
          {manualReportStep === 6 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Report Summary
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Review your report configuration before generating
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: isDark ? 'rgba(0,153,255,0.05)' : '#f8f9fa' }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Report Type:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {manualReportFormData.reportType === 'service' ? 'Service Report' : 'Client Report'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Targets:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {manualReportFormData.targetIds.length} selected
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Date Range:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(manualReportFormData.dateRangeStart).toLocaleDateString()} - {new Date(manualReportFormData.dateRangeEnd).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Delivery:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {manualReportFormData.deliveryMethod === 'download' ? 'Download' :
                       manualReportFormData.deliveryMethod === 'email' ? 'Email' : 'Both'}
                    </Typography>
                  </Grid>
                  {(manualReportFormData.deliveryMethod === 'email' || manualReportFormData.deliveryMethod === 'both') && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Recipients:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {manualReportFormData.recipients.length > 0 ? manualReportFormData.recipients.join(', ') : 'None'}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => {
              setOpenManualReportDialog(false);
              setManualReportStep(1);
            }} 
            variant="outlined"
          >
            Cancel
          </Button>
          {manualReportStep > 1 && (
            <Button 
              onClick={() => setManualReportStep(manualReportStep - 1)} 
              variant="outlined"
            >
              Previous
            </Button>
          )}
          <Button
            onClick={() => {
              if (manualReportStep < 5) {
                setManualReportStep(manualReportStep + 1);
              } else {
                handleGenerateManualReport();
              }
            }}
            variant="contained"
            sx={{
              background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.primaryDark} 100%)`,
              fontWeight: 600
            }}
          >
            {manualReportStep < 6 ? 'Next' : 'Generate Report'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detailed Preview Dialog */}
      <Dialog 
        open={openPreviewDialog} 
        onClose={() => setOpenPreviewDialog(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.primaryDark} 100%)`,
          color: 'white',
          py: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Report Preview Details
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {previewData && (
            <Box>
              {/* Report Overview */}
              <Paper sx={{ p: 2, mb: 3, backgroundColor: isDark ? 'rgba(0,153,255,0.05)' : '#f8f9fa' }}>
                <Typography variant="h6" gutterBottom>
                  Report Overview
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Report Type:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {previewData.reportType === 'service' ? 'Service Report' : 'Client Report'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Date Range:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(previewData.dateRange.start).toLocaleDateString()} - {new Date(previewData.dateRange.end).toLocaleDateString()} ({previewData.dateRange.days} days)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Targets Selected:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {previewData.targets.length} {previewData.reportType === 'service' ? 'services' : 'clients'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Estimated File Size:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {previewData.estimates.fileSizeHuman}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Sample Data Preview */}
              <Typography variant="h6" gutterBottom>
                Sample Data Preview
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Showing sample data from first 3 targets for a 24-hour period
              </Typography>

              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: isDark ? 'rgba(0,153,255,0.15)' : BSI_COLORS.light }}>
                      <TableCell><strong>Target Name</strong></TableCell>
                      {previewData.reportType === 'service' && <TableCell><strong>Client</strong></TableCell>}
                      <TableCell><strong>Data Points</strong></TableCell>
                      <TableCell><strong>Avg Value</strong></TableCell>
                      <TableCell><strong>Min Value</strong></TableCell>
                      <TableCell><strong>Max Value</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.sampleData.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{item.targetName}</TableCell>
                        {previewData.reportType === 'service' && (
                          <TableCell>{item.clientName || '-'}</TableCell>
                        )}
                        <TableCell>{item.dataPoints.toLocaleString()}</TableCell>
                        <TableCell>{item.avgValue.toFixed(2)}</TableCell>
                        <TableCell>{item.minValue?.toFixed(2) || '-'}</TableCell>
                        <TableCell>{item.maxValue?.toFixed(2) || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Estimates and Quality */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: isDark ? 'rgba(0,153,255,0.05)' : '#f8f9fa' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Performance Estimates
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Total Data Points:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {previewData.estimates.totalDataPoints.toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Generation Time:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {previewData.estimates.generationTimeHuman}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">File Size:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {previewData.estimates.fileSizeHuman}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, backgroundColor: isDark ? 'rgba(0,153,255,0.05)' : '#f8f9fa' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Data Quality Assessment
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Data Completeness:</Typography>
                        <Chip 
                          size="small"
                          label={previewData.quality.dataCompleteness === 'good' ? 'Good' : 'No Data'}
                          color={previewData.quality.dataCompleteness === 'good' ? 'success' : 'warning'}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Recommendation:</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, mt: 1 }}>
                          {previewData.quality.recommendedAction === 'proceed' ? 
                            'Proceed with report generation' : 
                            'Adjust date range or targets'
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>

              {/* Target List */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Selected Targets
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {previewData.targets.map((target) => (
                  <Chip
                    key={target.id}
                    label={`${target.name}${target.clientName ? ` (${target.clientName})` : ''}`}
                    variant="outlined"
                    size="small"
                    color="primary"
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={() => setOpenPreviewDialog(false)} 
            variant="contained"
            sx={{
              background: `linear-gradient(135deg, ${BSI_COLORS.primary} 0%, ${BSI_COLORS.primaryDark} 100%)`,
              fontWeight: 600
            }}
          >
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Alerts;
