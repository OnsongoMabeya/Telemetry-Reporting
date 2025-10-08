import React from 'react';
import { Box, Container } from '@mui/material';

export const PageContainer = ({ children, maxWidth = 'xl', ...props }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      <Container 
        maxWidth={maxWidth} 
        sx={{
          flex: 1,
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 1.5, sm: 2, md: 3 },
          width: '100%',
          maxWidth: '100% !important',
        }}
        {...props}
      >
        {children}
      </Container>
    </Box>
  );
};

export const SectionContainer = ({ children, ...props }) => {
  return (
    <Box
      sx={{
        width: '100%',
        mb: { xs: 2, sm: 3, md: 4 },
        '&:last-child': {
          mb: 0,
        },
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export const ResponsiveGrid = ({ children, ...props }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, sm: 3 },
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(auto-fill, minmax(300px, 1fr))',
        },
        width: '100%',
      }}
      {...props}
    >
      {children}
    </Box>
  );
};
