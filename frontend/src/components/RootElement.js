import { useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

export default function RootElement({ children }) {
  const theme = useTheme();

  useEffect(() => {
    const rootElement = document.getElementById('root');
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

    // Ensure proper contrast for accessibility
    rootElement.style.color = theme.palette.text.primary;
    rootElement.style.backgroundColor = theme.palette.background.default;

    // Clean up the observer when the component unmounts
    return () => {
      observer.disconnect();
    };
  }, [theme]);

  return children;
}
