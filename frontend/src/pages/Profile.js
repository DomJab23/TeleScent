import React from 'react';
import { Container, Box, Typography } from '@mui/material';

export default function Profile() {
  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ marginTop: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Profile
        </Typography>
        <Typography>
          This is a placeholder Profile page. Add your UI and components here.
        </Typography>
      </Box>
    </Container>
  );
}
