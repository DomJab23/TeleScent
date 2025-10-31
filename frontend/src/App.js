import React, { useEffect, useState } from 'react';
import SignIn from './loginPage';
import Register from './registerPage';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'dashboard'

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setCurrentView('dashboard');
      } catch (error) {
        // Invalid user data, clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
  };

  const handleSwitchToRegister = () => {
    setCurrentView('register');
  };

  const handleSwitchToLogin = () => {
    setCurrentView('login');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (currentView === 'dashboard' && user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  if (currentView === 'register') {
    return (
      <Register
        onSwitchToLogin={handleSwitchToLogin}
        onRegisterSuccess={handleRegisterSuccess}
      />
    );
  }

  return (
    <SignIn
      onLoginSuccess={handleLoginSuccess}
      onSwitchToRegister={handleSwitchToRegister}
    />
  );
}

export default App;
