import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { apiClient } from '../config/apiConfig';

export default function SignIn(props) {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // BYPASS MODE: Direct navigation to dashboard without any API call
    // Store fake token and user data
    localStorage.setItem('token', 'bypass-token-' + Date.now());
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      username: 'admin',
      email: 'admin@telescent.com',
      firstName: 'Admin',
      lastName: 'User'
    }));

    // Call parent callback if provided
    if (props && typeof props.onLoginSuccess === 'function') {
      props.onLoginSuccess({ username: 'admin' });
    }

    // Navigate directly to dashboard
    navigate('/dashboard');
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            fullWidth
            id="username"
            label="Username (optional)"
            name="username"
            autoComplete="username"
            autoFocus
          />
          <TextField
            margin="normal"
            fullWidth
            name="password"
            label="Password (optional)"
            type="password"
            id="password"
            autoComplete="current-password"
          />
          <FormControlLabel
            control={<Checkbox value="remember" color="primary" />}
            label="Remember me"
          />
          {error && (
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>

          {/* Registration button styled light gray, similar size to Sign In */}
          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate('/register')}
            sx={{
              mt: 1,
              mb: 2,
              backgroundColor: 'grey.200',
              color: 'text.primary',
              '&:hover': { backgroundColor: 'grey.300' },
            }}
          >
            Create an account
          </Button>

          <Grid container>
            <Grid item xs>
              <Link href="#" variant="body2">
                Forgot password?
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}