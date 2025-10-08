import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  styled,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
  Alert,
  Collapse,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '12px',
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));


const getTimeRangeLabel = (timeRange) => {
  const timeRangeLabels = {
    '5m': 'Last 5 minutes',
    '10m': 'Last 10 minutes',
    '1h': 'Last 1 hour',
    '2h': 'Last 2 hours',
    '6h': 'Last 6 hours',
    '1d': 'Last 1 day',
    '2d': 'Last 2 days',
    '5d': 'Last 5 days',
    '1w': 'Last 1 week',
  };

  return timeRange ? (timeRangeLabels[timeRange] || timeRange) : 'None selected';
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

const ReportConfigModal = ({ open, onClose, onGenerate, onSendEmail, isSending, currentNode, currentTimeRange }) => {
  const [sendEmail, setSendEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleEmailToggle = (event) => {
    setSendEmail(event.target.checked);
    if (!event.target.checked) {
      setError('');
    }
  };

  const handleSubmit = () => {
    if (!currentNode || !currentTimeRange) return;

    if (sendEmail) {
      if (!email.trim()) {
        setError('Email is required');
        return;
      }
      
      const emails = email.split(',').map(e => e.trim()).filter(e => e);
      const invalidEmails = emails.filter(e => !validateEmail(e));
      
      if (invalidEmails.length > 0) {
        setError(`Invalid email${invalidEmails.length > 1 ? 's' : ''}: ${invalidEmails.join(', ')}`);
        return;
      }

      onSendEmail({
        node: currentNode,
        timeRange: currentTimeRange,
        format: 'pdf',
        recipients: emails,
        message: message
      });
    } else {
      onGenerate({
        node: currentNode,
        timeRange: currentTimeRange,
        format: 'pdf'
      });
      onClose();
    }
  };

  const handleClose = () => {
    setSendEmail(false);
    setEmail('');
    setMessage('');
    setError('');
    onClose();
  };

  return (
    <StyledDialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <StyledDialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <span>Generate Report</span>
          <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </StyledDialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Node:</strong> {currentNode || 'None selected'}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Time Range:</strong> {getTimeRangeLabel(currentTimeRange) || 'None selected'}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={sendEmail}
                onChange={handleEmailToggle}
                color="primary"
              />
            }
            label="Send via Email"
            sx={{ mt: 2 }}
          />

          <Collapse in={sendEmail}>
            <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <TextField
                fullWidth
                label="Recipient Email(s)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com, another@example.com"
                margin="normal"
                helperText="Multiple emails can be separated by commas"
                error={!!error}
              />
              <TextField
                fullWidth
                label="Message (Optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a custom message..."
                margin="normal"
                multiline
                rows={3}
              />
              <Collapse in={!!error}>
                <Alert 
                  severity="error" 
                  sx={{ mt: 2 }}
                  action={
                    <IconButton
                      aria-label="close"
                      color="inherit"
                      size="small"
                      onClick={() => setError('')}
                    >
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  }
                >
                  {error}
                </Alert>
              </Collapse>
            </Box>
          </Collapse>
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: 3, gap: 2 }}>
        <Button 
          onClick={handleClose} 
          variant="outlined" 
          sx={{ borderRadius: '8px' }}
          disabled={isSending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{ borderRadius: '8px', px: 3, minWidth: 150 }}
          disabled={!currentNode || !currentTimeRange || isSending}
          startIcon={isSending ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSending ? (sendEmail ? 'Sending...' : 'Generating...') : (sendEmail ? 'Send Email' : 'Download')}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default ReportConfigModal;
