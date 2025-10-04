import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

export default function AppTheme({ children, ...props }) {
  const theme = createTheme({
    palette: {
      mode: 'light',
    },
  });

  return (
    <ThemeProvider theme={theme} {...props}>
      {children}
    </ThemeProvider>
  );
}
