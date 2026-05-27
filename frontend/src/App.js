import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import NavBar from './components/NavBar';
import './App.css';
import { ColorModeProvider } from './contexts/ColorModeContext';

const NO_NAVBAR_PATHS = ['/login', '/register'];

function AppContent() {
  const location = useLocation();
  const hideNavBar = NO_NAVBAR_PATHS.includes(location.pathname);

  return (
    <>
      {!hideNavBar && <NavBar />}
      <AppRoutes />
    </>
  );
}

function App() {
  return (
    <ColorModeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ColorModeProvider>
  );
}

export default App;
