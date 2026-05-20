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
  CircularProgress
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
  People as PeopleIcon
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
      showSnackbar(`Test email sent to ${response.data.recipients} recipients`, 'success');
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
