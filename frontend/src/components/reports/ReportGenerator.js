import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Button, Box } from '@mui/material';
import ReportConfigModal from './ReportConfigModal';
import { generateHTMLReport } from './HTMLReport';
import { generatePDFReport } from './PDFReport';

const ReportGenerator = ({ nodes, onError }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

      // Format base stations
      const baseStations = response.data.map(station => ({
        BaseStationName: station.NodeBaseStationName || station.BaseStationName,
        NodeName: station.NodeName
      }));
      console.log('Formatted base stations:', baseStations);
      const nodeBaseStations = response.data
        .filter(station => {
          if (!station || !station.NodeBaseStationName) {
            console.log('Invalid base station:', station);
            return false;
          }
          return true;
        })
        .map(station => ({
          name: station.NodeBaseStationName,
          id: station.NodeBaseStationName
        }));

      console.log('Formatted node base stations:', nodeBaseStations);

      if (nodeBaseStations.length === 0) {
        throw new Error(`No base stations available for node: ${config.node}`);
      }

      setProgress(30);

      // Validate base stations
      if (!baseStations || baseStations.length === 0) {
        throw new Error('No base stations available for this node');
      }

      if (config.format === 'pdf') {
        console.log('Generating PDF report with base stations:', baseStations);
        await generatePDFReport(config, baseStations);
      } else {
        console.log('Generating HTML report with base stations:', baseStations);
        await generateHTMLReport(config, baseStations);
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
  }, [nodes]);

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
        onClose={() => setIsModalOpen(false)}
        nodes={nodes}
        onGenerate={handleGenerateReport}
      />
    </Box>
  );
};

export default ReportGenerator;
