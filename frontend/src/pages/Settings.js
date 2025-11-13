import React from 'react';
import { Container, Box, Typography } from '@mui/material';

// Settings page removed — theme toggle is now available in the top-right navbar.
export default function Settings() {
  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ marginTop: 8 }}>
        <Typography variant="h5" gutterBottom>
          Settings page removed
        </Typography>
        <Typography color="text.secondary">
          Theme controls have been moved to the top-right of the navigation bar.
        </Typography>
      </Box>
    </Container>
  );
}
