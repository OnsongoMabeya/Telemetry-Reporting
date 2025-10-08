import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Button, Box } from '@mui/material';
import ReportConfigModal from './ReportConfigModal';
import { generateHTMLReport } from './HTMLReport';
import { generatePDFReport } from './PDFReport';
import { API_BASE_URL } from '../../config/api';

const ReportGenerator = ({ nodes, onError, currentNode, currentTimeRange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleGenerateReport = useCallback(async (config) => {
    setIsGenerating(true);
    setProgress(10);
    try {
      console.log('Generating report for node:', config.node);
      
      // Fetch base stations for the selected node
      const response = await axios.get(`${API_BASE_URL}/api/basestations/${config.node}`);
      console.log('Base stations API response:', response.data);

      if (!response.data || response.data.length === 0) {
        throw new Error('No base stations found for this node');
      }

      const nodeBaseStations = response.data;
      console.log('Base stations:', nodeBaseStations);
      console.log('Formatted node base stations:', nodeBaseStations);

      if (nodeBaseStations.length === 0) {
        throw new Error(`No base stations available for node: ${config.node}`);
      }

      setProgress(30);

      if (config.format === 'pdf') {
        console.log('Generating PDF report with base stations:', nodeBaseStations);
        await generatePDFReport(config, nodeBaseStations);
      } else {
        console.log('Generating HTML report with base stations:', nodeBaseStations);
        await generateHTMLReport(config, nodeBaseStations);
      }
      
      showSnackbar('Report generated successfully!');
      setProgress(100);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate report';
      onError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [onError]);

  const handleSendEmail = useCallback(async (config) => {
    setIsSending(true);
    try {
      // First generate the report to get the file
      const reportBlob = await generateReportBlob(config);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('file', reportBlob, `report_${config.node}_${new Date().toISOString().split('T')[0]}.pdf`);
      formData.append('recipients', config.recipients.join(','));
      formData.append('subject', `Telemetry Report - ${config.node} (${config.timeRange})`);
      formData.append('message', config.message || 'Please find the attached telemetry report.');
      
      // Send email with attachment
      const response = await axios.post(`${API_BASE_URL}/api/send-report`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      showSnackbar('Report sent successfully!');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error sending email:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send email';
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsSending(false);
    }
  }, []);
  
  const generateReportBlob = async (config) => {
    // Fetch base stations for the selected node
    const response = await axios.get(`${API_BASE_URL}/api/basestations/${config.node}`);
    const nodeBaseStations = response.data;
    
    // Generate PDF report and return as blob
    const pdfDoc = await generatePDFReport(config, nodeBaseStations, true);
    return pdfDoc;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setIsModalOpen(true)}
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Report'}
      </Button>
      {isGenerating && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: 4,
              bgcolor: 'background.paper',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${progress}%`,
                height: '100%',
                bgcolor: 'primary.main',
                transition: 'width 0.3s ease-in-out'
              }}
            />
          </Box>
          <Box sx={{ typography: 'caption', color: 'text.secondary' }}>
          </Box>
        </Box>
      )}
      <ReportConfigModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGenerateReport}
        onSendEmail={handleSendEmail}
        isSending={isSending}
        isGenerating={isGenerating}
        progress={progress}
        currentNode={currentNode}
        currentTimeRange={currentTimeRange}
      />
    </Box>
  );
};

export default ReportGenerator;
