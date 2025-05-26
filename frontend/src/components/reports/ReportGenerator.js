import React, { useState, useCallback } from 'react';
import { Button, Box } from '@mui/material';
import ReportConfigModal from './ReportConfigModal';
import { generateHTMLReport } from './HTMLReport';
import { generatePDFReport } from './PDFReport';

const ReportGenerator = ({ nodes, baseStations }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGenerateReport = useCallback(async (config) => {
    try {
      // Filter base stations for the selected node
      const nodeBaseStations = baseStations.filter(station => station.node === config.node).map(station => ({
        name: station.name,
        id: station.id
      }));

      if (config.format === 'html') {
        await generateHTMLReport(config);
      } else {
        await generatePDFReport(config, nodeBaseStations);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      // TODO: Add error handling UI
    }
  }, [nodes, baseStations]);

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
