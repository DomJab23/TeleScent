import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './loginPage/login';
import Dashboard from './pages/Dashboard';
import Testing from './pages/Testing';
import MLConsole from './pages/MLConsole';
import Register from './pages/Register';
import SensorData from './pages/SensorData';
import ProtectedRoute from './components/ProtectedRoute';

const PROTECTED_ROUTES = [
  { path: '/dashboard',   element: <Dashboard /> },
  { path: '/testing',     element: <Testing /> },
  { path: '/ml',          element: <MLConsole /> },
  { path: '/sensor-data', element: <SensorData /> },
];

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      {PROTECTED_ROUTES.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<ProtectedRoute>{element}</ProtectedRoute>}
        />
      ))}
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;