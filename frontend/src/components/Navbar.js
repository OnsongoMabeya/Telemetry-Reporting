import React from 'react';
import { AppBar, Toolbar, Typography, Container } from '@mui/material';

const Navbar = () => {
  return (
    <AppBar position="static">
      <Container>
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            sx={{
              color: 'inherit',
              fontWeight: 700,
            }}
          >
            BSI Telemetry Reports
          </Typography>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
