/**
 * Service Report Button
 * 
 * Button component that triggers the service report generation modal.
 * Can be placed on service cards or in the service header area.
 * 
 * @module components/reports/ServiceReportButton
 */

import React, { useState } from 'react';
import { Button } from '@mui/material';
import { Assessment } from '@mui/icons-material';
import ServiceReportModal from './ServiceReportModal';

const ServiceReportButton = ({ 
  service, 
  clientName,
  clientId,
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
  initialTab = 'service'
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpen = () => setModalOpen(true);
  const handleClose = () => setModalOpen(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={handleOpen}
        startIcon={<Assessment />}
        sx={variant === 'contained' ? {
          background: 'linear-gradient(135deg, #30a1e4 0%, #163d90 100%)',
          color: 'white',
          fontWeight: 600,
          '&:hover': {
            background: 'linear-gradient(135deg, #2891d4 0%, #0f2d70 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(48, 161, 228, 0.4)',
          },
          transition: 'all 0.3s ease',
        } : {}}
      >
        Generate Report
      </Button>

      <ServiceReportModal
        open={modalOpen}
        onClose={handleClose}
        service={service}
        clientName={clientName}
        clientId={clientId}
        initialTab={initialTab}
      />
    </>
  );
};

export default ServiceReportButton;
