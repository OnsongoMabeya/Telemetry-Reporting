import React, { useState, useCallback } from 'react';
import { Button, Box } from '@mui/material';
import ReportConfigModal from './ReportConfigModal';
import { generateHTMLReport } from './HTMLReport';
import { generatePDFReport } from './PDFReport';

const ReportGenerator = ({ nodes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGenerateReport = useCallback(async (config) => {
    try {
      if (config.format === 'html') {
        await generateHTMLReport(config);
      } else {
        await generatePDFReport(config);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      // TODO: Add error handling UI
    }
  }, []);

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
