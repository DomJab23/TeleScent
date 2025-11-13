import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './loginPage/login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import MLConsole from './pages/MLConsole';
import Register from './pages/Register';

function AppRoutes() {
  // Authentication gating disabled for now so all pages are directly accessible
  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />
      <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="/register" element={<Register />} />
      <Route path="/reports" element={<Reports />} />
  <Route path="/ml" element={<MLConsole />} />
  <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;