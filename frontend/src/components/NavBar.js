import React, { useContext, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Tooltip from '@mui/material/Tooltip';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { ColorModeContext } from '../contexts/ColorModeContext';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate, useLocation } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openLogoutDialog, setOpenLogoutDialog] = useState(false);

  const pages = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Sensor Data', path: '/sensor-data' },
    { label: 'ML Console', path: '/ml' },
    { label: 'Testing', path: '/testing' }
  ];

  const currentPath = pages.some((p) => p.path === location.pathname)
    ? location.pathname
    : '/dashboard';

  const handleTabChange = (event, newValue) => {
    navigate(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          {/* Logo on the left */}
          <Typography
            variant="h6"
            component="div"
            sx={{ cursor: 'pointer', mr: 2 }}
            onClick={() => navigate('/dashboard')}
          >
            TeleScent
          </Typography>

          {/* Centered horizontal page selector (Tabs) */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <Tabs
              value={currentPath}
              onChange={handleTabChange}
              textColor="inherit"
              indicatorColor="secondary"
              aria-label="page selector"
              sx={{
                '& .MuiTab-root': {
                  color: 'inherit',
                  textTransform: 'none',
                },
              }}
            >
              {pages.map((p) => (
                <Tab key={p.path} label={p.label} value={p.path} />
              ))}
            </Tabs>
          </Box>

          {/* Right-side icons */}
          {/* Theme toggle moved to navbar */}
          <ThemeToggle />

          <Tooltip title={localStorage.getItem('token') ? 'Logout' : 'Login'}>
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              onClick={() => {
                if (localStorage.getItem('token')) {
                  // Show logout confirmation dialog
                  setOpenLogoutDialog(true);
                } else {
                  navigate('/login');
                }
              }}
            >
              <AccountCircleIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={openLogoutDialog}
        onClose={() => setOpenLogoutDialog(false)}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Are you sure you want to log out?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogoutDialog(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setOpenLogoutDialog(false);
              navigate('/login');
            }} 
            color="error"
            variant="contained"
            autoFocus
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ThemeToggle() {
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  return (
    <Tooltip title="Toggle theme">
      <IconButton size="large" color="inherit" onClick={toggleColorMode}>
        {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
}
