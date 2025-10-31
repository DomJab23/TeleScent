import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Container,
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import { SitemarkIcon } from './components/CustomIcons';

export default function Dashboard({ user, onLogout }) {
  const [message, setMessage] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    fetch('/api')
      .then(response => response.json())
      .then(data => setMessage(data.message))
      .catch(error => {
        console.log('Backend not available:', error);
        setMessage('Backend not connected');
      });
  }, []);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    handleClose();
    onLogout();
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <SitemarkIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            TeleScent Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user.firstName} {user.lastName}
            </Typography>
            <Avatar
              sx={{ cursor: 'pointer' }}
              onClick={handleMenu}
            >
              {user.firstName?.charAt(0) || user.email.charAt(0)}
            </Avatar>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Welcome to TeleScent!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Hello {user.firstName || user.email}, you have successfully logged in.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Backend message: {message}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Information
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {user.email}
            </Typography>
            <Typography variant="body2">
              <strong>Name:</strong> {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="body2">
              <strong>Account created:</strong> {new Date(user.createdAt).toLocaleDateString()}
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}