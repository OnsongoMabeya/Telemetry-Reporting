import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Button, Box } from '@mui/material';
import ReportConfigModal from './ReportConfigModal';
import { generateHTMLReport } from './HTMLReport';
import { generatePDFReport } from './PDFReport';

const ReportGenerator = ({ nodes, onError }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleGenerateReport = useCallback(async (config) => {
    try {
      console.log('Generating report for node:', config.node);
      
      // Fetch base stations for the selected node
      const response = await axios.get(`${API_BASE_URL}/api/basestations/${config.node}`);
      console.log('Base stations API response:', response.data);

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid base stations data format');
      }

      // Format and validate base stations
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

      console.log('Formatted base stations:', nodeBaseStations);

      if (nodeBaseStations.length === 0) {
        throw new Error(`No base stations available for node: ${config.node}`);
      }

      if (config.format === 'html') {
        await generateHTMLReport(config);
      } else {
        await generatePDFReport(config, nodeBaseStations);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      if (onError) {
        onError(error);
      }
    }
  }, [nodes]);

  return (
    <Box>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setIsModalOpen(true)}
      >
        Generate Report
      </Button>
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
