import { useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box } from '@mui/material';

export default function RootElement({ children }) {
  const theme = useTheme();

  useEffect(() => {
    const rootElement = document.getElementById('root');
    const bodyElement = document.body;
    const htmlElement = document.documentElement;
    
    if (!rootElement) return;

    // Remove any aria-hidden attributes from the root element
    rootElement.removeAttribute('aria-hidden');
    
    // Set up a mutation observer to prevent aria-hidden from being added back
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          rootElement.removeAttribute('aria-hidden');
        }
      });
    });

    // Start observing the root element for attribute changes
    observer.observe(rootElement, {
      attributes: true,
      attributeFilter: ['aria-hidden']
    });

    // Apply theme colors to root, body, and html elements for full coverage
    rootElement.style.color = theme.palette.text.primary;
    rootElement.style.backgroundColor = theme.palette.background.default;
    rootElement.style.minHeight = '100vh';
    
    bodyElement.style.backgroundColor = theme.palette.background.default;
    bodyElement.style.color = theme.palette.text.primary;
    bodyElement.style.minHeight = '100vh';
    
    htmlElement.style.backgroundColor = theme.palette.background.default;
    htmlElement.style.minHeight = '100vh';

    // Clean up the observer when the component unmounts
    return () => {
      observer.disconnect();
    };
  }, [theme]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        color: 'text.primary',
      }}
    >
      {children}
    </Box>
  );
}
