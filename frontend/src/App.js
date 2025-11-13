import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import NavBar from './components/NavBar';
import './App.css';
import { ColorModeProvider } from './contexts/ColorModeContext';

function App() {
  return (
    <ColorModeProvider>
      <BrowserRouter>
        <NavBar />
        <AppRoutes />
      </BrowserRouter>
    </ColorModeProvider>
  );
}

export default App;
