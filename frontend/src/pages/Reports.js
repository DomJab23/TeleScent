import React from 'react';
import { Container, Box, Typography } from '@mui/material';

export default function Reports() {
  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ marginTop: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Reports
        </Typography>
        <Typography>
          This is a placeholder Reports page. Add charts or tables here.
        </Typography>
      </Box>
    </Container>
  );
}
