import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  styled
} from '@mui/material';

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

const ReportConfigModal = ({ open, onClose, onGenerate, currentNode, currentTimeRange }) => {
  // Debug logs
  React.useEffect(() => {
    if (open) {
      console.log('ReportConfigModal opened with props:', {
        currentNode,
        currentTimeRange,
        hasCurrentNode: !!currentNode,
        hasCurrentTimeRange: !!currentTimeRange
      });
    }
  }, [open, currentNode, currentTimeRange]);

  const handleGenerate = () => {
    if (currentNode && currentTimeRange) {
      onGenerate({
        node: currentNode,
        timeRange: currentTimeRange,
        format: 'pdf'  // Always use PDF format
      });
      onClose();
    }
  };

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <StyledDialogTitle>Generate Report</StyledDialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Node:</strong> {currentNode || 'None selected'}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            <strong>Time Range:</strong> {getTimeRangeLabel(currentTimeRange) || 'None selected'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: 3, gap: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '8px' }}>Cancel</Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          sx={{ borderRadius: '8px', px: 3 }}
          disabled={!currentNode || !currentTimeRange}
        >
          Generate Report
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default ReportConfigModal;
