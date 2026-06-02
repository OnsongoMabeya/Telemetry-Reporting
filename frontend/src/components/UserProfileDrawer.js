import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  IconButton,
  Avatar,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import axios from '../services/axiosInterceptor';

const UserProfileDrawer = ({ open, onClose }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
    role: ''
  });

  const [originalData, setOriginalData] = useState({});

  // Fetch user profile when drawer opens
  useEffect(() => {
    if (open) {
      fetchProfile();
    }
  }, [open]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await axios.get('/api/users/profile');
      if (response.data.success) {
        const user = response.data.user;
        const data = {
          username: user.username || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role || ''
        };
        setFormData(data);
        setOriginalData(data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError(null);
    setSuccess(null);
  };

  const hasChanges = () => {
    return (
      formData.email !== originalData.email ||
      formData.phoneNumber !== originalData.phoneNumber ||
      formData.firstName !== originalData.firstName ||
      formData.lastName !== originalData.lastName
    );
  };

  const validateForm = () => {
    if (!formData.email) {
      setError('Email is required');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email format');
      return false;
    }

    if (formData.phoneNumber) {
      const phoneRegex = /^\+[\d\s]+$/;
      if (!phoneRegex.test(formData.phoneNumber)) {
        setError('Phone number must be in international format (e.g., +254712345678)');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        email: formData.email,
        phoneNumber: formData.phoneNumber || null,
        firstName: formData.firstName || null,
        lastName: formData.lastName || null
      };

      const response = await axios.put('/api/users/profile', payload);
      
      if (response.data.success) {
        setSuccess('Profile updated successfully');
        setOriginalData(formData);
        
        // Update localStorage user data if email changed
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser) {
          storedUser.email = formData.email;
          storedUser.firstName = formData.firstName;
          storedUser.lastName = formData.lastName;
          storedUser.phoneNumber = formData.phoneNumber;
          localStorage.setItem('user', JSON.stringify(storedUser));
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleCancel}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400 },
          backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 3,
            background: 'linear-gradient(135deg, #30a1e4 0%, #163d90 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                width: 48,
                height: 48,
              }}
            >
              <PersonIcon sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                My Profile
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Manage your account details
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={handleCancel}
            sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
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

              {/* Read-only Username and Role */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                  Account Information
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Username"
                    value={formData.username}
                    disabled
                    fullWidth
                    size="small"
                    InputProps={{
                      startAdornment: <BadgeIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />,
                    }}
                  />
                  <TextField
                    label="Role"
                    value={formData.role}
                    disabled
                    fullWidth
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Editable Fields */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Contact Information
                </Typography>

                <TextField
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  fullWidth
                  required
                  size="small"
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />,
                  }}
                  placeholder="your@email.com"
                />

                <TextField
                  label="Phone Number (WhatsApp)"
                  value={formData.phoneNumber}
                  onChange={handleChange('phoneNumber')}
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 18 }} />,
                  }}
                  placeholder="+254712345678"
                  helperText="International format for WhatsApp alerts"
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="First Name"
                    value={formData.firstName}
                    onChange={handleChange('firstName')}
                    fullWidth
                    size="small"
                    placeholder="John"
                  />
                  <TextField
                    label="Last Name"
                    value={formData.lastName}
                    onChange={handleChange('lastName')}
                    fullWidth
                    size="small"
                    placeholder="Doe"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Info Box */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(48, 161, 228, 0.1)' : 'rgba(48, 161, 228, 0.08)',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(48, 161, 228, 0.2)' : 'rgba(48, 161, 228, 0.15)'}`,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  <strong>Note:</strong> Your phone number will be used for WhatsApp alerts when a site goes offline. 
                  Make sure it's in international format starting with + (e.g., +254 for Kenya).
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {/* Footer Actions */}
        <Box
          sx={{
            p: 3,
            borderTop: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="outlined"
            onClick={handleCancel}
            startIcon={<CancelIcon />}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
            disabled={saving || loading || !hasChanges()}
            sx={{
              background: 'linear-gradient(135deg, #30a1e4 0%, #163d90 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2891d4 0%, #0f2d70 100%)',
              },
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default UserProfileDrawer;
