import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Button, Box } from '@mui/material';
import ReportConfigModal from './ReportConfigModal';
import { generateHTMLReport } from './HTMLReport';
import { generatePDFReport } from './PDFReport';
import { API_BASE_URL } from '../../config/api';

const ReportGenerator = ({ nodes, onError, currentNode, currentTimeRange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

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

      // The base stations are already in the correct format from the backend
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
      setProgress(90);
      setProgress(100);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      onError(error.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [onError]);

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
            {progress < 100 ? 'Generating report...' : 'Finalizing...'}
          </Box>
        </Box>
      )}
      <ReportConfigModal
        open={isModalOpen}
        onClose={() => {
          console.log('Closing modal');
          setIsModalOpen(false);
        }}
        onGenerate={handleGenerateReport}
        currentNode={currentNode}
        currentTimeRange={currentTimeRange}
      />
    </Box>
  );
};

export default ReportGenerator;
