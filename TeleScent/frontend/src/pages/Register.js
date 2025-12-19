import React from 'react';
import { Container, Box, Typography, TextField, Button } from '@mui/material';

export default function Register() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Implement registration logic later
    alert('Register submitted (stub)');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Create an account
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField margin="normal" required fullWidth id="name" label="Full Name" name="name" />
          <TextField margin="normal" required fullWidth id="email" label="Email Address" name="email" />
          <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>
            Register
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
