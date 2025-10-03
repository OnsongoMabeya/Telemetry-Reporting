import { useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

export default function RootElement({ children }) {
  const theme = useTheme();

  useEffect(() => {
    // Remove any aria-hidden attributes from the root element
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.removeAttribute('aria-hidden');
      // Ensure proper contrast for accessibility
      rootElement.style.color = theme.palette.text.primary;
      rootElement.style.backgroundColor = theme.palette.background.default;
    }
  }, [theme]);

  return children;
}
