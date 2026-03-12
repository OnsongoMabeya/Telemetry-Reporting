import React from 'react';
import { Button } from '@mui/material';
import { Assessment } from '@mui/icons-material';
import { useDashboard } from '../../context/DashboardContext';
import ReportGenerator from '../reports/ReportGenerator';

const GenerateReportButton = () => {
  const {
    selectedNode,
    selectedBaseStation,
    timeFilter,
    telemetryData,
    metricMappings,
    reportModalOpen,
    openReportModal,
    closeReportModal,
  } = useDashboard();

  const isDisabled = !selectedNode || !selectedBaseStation || telemetryData.length === 0;

  return (
    <>
      <Button
        variant="contained"
        onClick={openReportModal}
        disabled={isDisabled}
        startIcon={<Assessment />}
        sx={{
          background: 'linear-gradient(135deg, #30a1e4 0%, #163d90 100%)',
          color: 'white',
          fontWeight: 600,
          px: 3,
          '&:hover': {
            background: 'linear-gradient(135deg, #2891d4 0%, #0f2d70 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(48, 161, 228, 0.4)',
          },
          '&:disabled': {
            background: 'rgba(0, 0, 0, 0.12)',
            color: 'rgba(0, 0, 0, 0.26)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        Generate Report
      </Button>

      <ReportGenerator
        open={reportModalOpen}
        onClose={closeReportModal}
        selectedNode={selectedNode}
        selectedBaseStation={selectedBaseStation}
        timeFilter={timeFilter}
        telemetryData={telemetryData}
        metricMappings={metricMappings}
      />
    </>
  );
};

export default GenerateReportButton;
