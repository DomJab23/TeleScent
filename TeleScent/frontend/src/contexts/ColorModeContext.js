import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ColorModeContext = React.createContext({
  mode: 'light',
  toggleColorMode: () => {},
});

function ColorModeProvider({ children }) {
  // Initialize mode from localStorage or default to 'light'
  const [mode, setMode] = React.useState(() => {
    const savedMode = localStorage.getItem('colorMode');
    return savedMode || 'light';
  });

  const colorMode = React.useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((prev) => {
          const newMode = prev === 'light' ? 'dark' : 'light';
          // Save to localStorage
          localStorage.setItem('colorMode', newMode);
          return newMode;
        });
      },
    }),
    [mode]
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorMode.mode,
        },
      }),
    [colorMode.mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export { ColorModeContext, ColorModeProvider };
