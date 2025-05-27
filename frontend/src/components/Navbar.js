import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box } from '@mui/material';

const Navbar = () => {
  return (
    <AppBar position="static">
      <Container>
        <Toolbar disableGutters>
          <Box
            component="img"
            src="/bsilogo512.png"
            alt="BSI Logo"
            sx={{
              height: 40,
              width: 'auto',
              marginRight: 2
            }}
          />
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
