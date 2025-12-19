import React from 'react';
import { Navigate } from 'react-router-dom';

// Helper function to check if user is authenticated
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token; // Returns true if token exists
};

// Protected Route wrapper component
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;
