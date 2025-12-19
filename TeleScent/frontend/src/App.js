import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import NavBar from './components/NavBar';
import './App.css';
import { ColorModeProvider } from './contexts/ColorModeContext';

function AppContent() {
  const location = useLocation();
  
  // Hide NavBar on login and register pages
  const hideNavBar = location.pathname === '/login' || location.pathname === '/register';

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
