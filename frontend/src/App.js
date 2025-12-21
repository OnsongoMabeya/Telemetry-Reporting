import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import NodeDetail from './components/NodeDetail';
import RootElement from './components/RootElement';
import './styles/global.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#8b9aff',
      dark: '#4c63d2',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#764ba2',
      light: '#9d6fb8',
      dark: '#5a3a7f',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#6fcf97',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f44336',
      light: '#ef5350',
      dark: '#d32f2f',
      contrastText: '#ffffff',
    },
    info: {
      main: '#2196f3',
      light: '#42a5f5',
      dark: '#1976d2',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a202c',
      secondary: '#4a5568',
      disabled: '#718096',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
    },
    overline: {
      fontSize: '0.625rem',
      fontWeight: 600,
      lineHeight: 1.2,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
    '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',
    '0 14px 28px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.10)',
    '0 20px 40px rgba(0, 0, 0, 0.15), 0 6px 12px rgba(0, 0, 0, 0.10)',
    '0 25px 50px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.10)',
    '0 30px 60px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.10)',
    '0 35px 70px rgba(0, 0, 0, 0.15), 0 12px 24px rgba(0, 0, 0, 0.10)',
    '0 40px 80px rgba(0, 0, 0, 0.15), 0 14px 28px rgba(0, 0, 0, 0.10)',
    '0 45px 90px rgba(0, 0, 0, 0.15), 0 16px 32px rgba(0, 0, 0, 0.10)',
    '0 50px 100px rgba(0, 0, 0, 0.15), 0 18px 36px rgba(0, 0, 0, 0.10)',
    '0 55px 110px rgba(0, 0, 0, 0.15), 0 20px 40px rgba(0, 0, 0, 0.10)',
    '0 60px 120px rgba(0, 0, 0, 0.15), 0 22px 44px rgba(0, 0, 0, 0.10)',
    '0 65px 130px rgba(0, 0, 0, 0.15), 0 24px 48px rgba(0, 0, 0, 0.10)',
    '0 70px 140px rgba(0, 0, 0, 0.15), 0 26px 52px rgba(0, 0, 0, 0.10)',
    '0 75px 150px rgba(0, 0, 0, 0.15), 0 28px 56px rgba(0, 0, 0, 0.10)',
    '0 80px 160px rgba(0, 0, 0, 0.15), 0 30px 60px rgba(0, 0, 0, 0.10)',
    '0 85px 170px rgba(0, 0, 0, 0.15), 0 32px 64px rgba(0, 0, 0, 0.10)',
    '0 90px 180px rgba(0, 0, 0, 0.15), 0 34px 68px rgba(0, 0, 0, 0.10)',
    '0 95px 190px rgba(0, 0, 0, 0.15), 0 36px 72px rgba(0, 0, 0, 0.10)',
    '0 100px 200px rgba(0, 0, 0, 0.15), 0 38px 76px rgba(0, 0, 0, 0.10)',
    '0 105px 210px rgba(0, 0, 0, 0.15), 0 40px 80px rgba(0, 0, 0, 0.10)',
    '0 110px 220px rgba(0, 0, 0, 0.15), 0 42px 84px rgba(0, 0, 0, 0.10)',
    '0 115px 230px rgba(0, 0, 0, 0.15), 0 44px 88px rgba(0, 0, 0, 0.10)',
    '0 120px 240px rgba(0, 0, 0, 0.15), 0 46px 92px rgba(0, 0, 0, 0.10)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 24px',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease-in-out',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
        },
        elevation2: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        },
        elevation3: {
          boxShadow: '0 6px 30px rgba(0, 0, 0, 0.10)',
        },
        elevation4: {
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12)',
        },
        elevation8: {
          boxShadow: '0 12px 60px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        colorPrimary: {
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
          color: '#667eea',
          border: '1px solid rgba(102, 126, 234, 0.2)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(102, 126, 234, 0.4)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(102, 126, 234, 0.4)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#667eea',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 20px rgba(0, 0, 0, 0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        colorDefault: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          animationDuration: '1.5s',
        },
        circle: {
          strokeLinecap: 'round',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RootElement>
        <div className="App">
          <Navbar />
          <NodeDetail />
        </div>
      </RootElement>
    </ThemeProvider>
  );
}

export default App;
