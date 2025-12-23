import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './loginPage/login';
import Dashboard from './pages/Dashboard';
import Testing from './pages/Testing';
import MLConsole from './pages/MLConsole';
import Register from './pages/Register';
import SensorData from './pages/SensorData';
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  // All routes except login and register require authentication
  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/testing" 
        element={
          <ProtectedRoute>
            <Testing />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/ml" 
        element={
          <ProtectedRoute>
            <MLConsole />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sensor-data" 
        element={
          <ProtectedRoute>
            <SensorData />
          </ProtectedRoute>
        } 
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;