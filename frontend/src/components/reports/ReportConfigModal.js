import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
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
} from '@mui/material';

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(2),
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
}));

const ReportConfigModal = ({ open, onClose, nodes, onGenerate }) => {
  // Initialize state
  const [selectedNode, setSelectedNode] = useState('');
  const [timeRange, setTimeRange] = useState('1d');
  const [format, setFormat] = useState('html');

  // Reset selectedNode when modal opens with new nodes
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      setSelectedNode(nodes[0].id);
    }
  }, [nodes]);



  const timeRanges = [
    { value: '5m', label: 'Last 5 minutes' },
    { value: '10m', label: 'Last 10 minutes' },
    { value: '30m', label: 'Last 30 minutes' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '2h', label: 'Last 2 hours' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '1d', label: 'Last 1 day' },
    { value: '2d', label: 'Last 2 days' },
    { value: '5d', label: 'Last 5 days' },
    { value: '1w', label: 'Last 1 week' },
  ];

  const handleGenerate = () => {
    onGenerate({
      node: selectedNode,
      timeRange,
      format,
      // No longer need baseStation as we'll generate for all stations
    });
  };

  return (
    <StyledDialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <StyledDialogTitle>Generate Report</StyledDialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <StyledFormControl fullWidth>
            <InputLabel>Node</InputLabel>
            <Select
              value={selectedNode}
              label="Node"
              onChange={(e) => setSelectedNode(e.target.value)}
            >
              {nodes.map((node) => (
                <MenuItem key={node.id} value={node.id}>
                  {node.name}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>

          <StyledFormControl fullWidth>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              {timeRanges.map((range) => (
                <MenuItem key={range.value} value={range.value}>
                  {range.label}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>

          <StyledFormControl fullWidth>
            <InputLabel>Format</InputLabel>
            <Select
              value={format}
              label="Format"
              onChange={(e) => setFormat(e.target.value)}
            >
              <MenuItem value="html">HTML</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
            </Select>
          </StyledFormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: 3, gap: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '8px' }}>Cancel</Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          sx={{ borderRadius: '8px', px: 3 }}
          disabled={!selectedNode || !timeRange}
        >
          Generate Report
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default ReportConfigModal;
