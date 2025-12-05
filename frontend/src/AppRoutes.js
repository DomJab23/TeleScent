import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './loginPage/login';
import Dashboard from './pages/Dashboard';
import Testing from './pages/Testing';
import MLConsole from './pages/MLConsole';
import EmitterSetup from './pages/EmitterSetup';
import Register from './pages/Register';

function AppRoutes() {
  // Authentication gating disabled for now so all pages are directly accessible
  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />
      <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/register" element={<Register />} />
        <Route path="/testing" element={<Testing />} />
      <Route path="/ml" element={<MLConsole />} />
      <Route path="/emitter" element={<EmitterSetup />} />
  <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;