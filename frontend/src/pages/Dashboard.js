import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Stack,
  Grid,
  Paper,
  Chip,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

function StatusChip({ label, online = true }) {
  return (
    <Chip
      label={label}
      color={online ? 'success' : 'default'}
      size="small"
      sx={{ mr: 1, mb: 1 }}
    />
  );
}

export default function Dashboard() {
  // Placeholder data — replace these with live values from your backend or web sockets
  const systemStatus = {
    devicesConnected: 3,
    enose: true,
    emitter: false,
    mlModel: 'v1.2.0',
  };

  const readings = {
    odorIntensity: 72, // percent
    classificationConfidence: 88, // percent
    sensors: [
      { name: 'Sensor A', value: 0.76 },
      { name: 'Sensor B', value: 0.42 },
      { name: 'Sensor C', value: 0.91 },
    ],
  };

  const recent = [
    { id: 1, smell: 'Coffee', time: '2025-11-13 10:12' },
    { id: 2, smell: 'Lavender', time: '2025-11-13 09:58' },
    { id: 3, smell: 'Smoke', time: '2025-11-13 08:44' },
  ];

  const errors = [
    { id: 1, level: 'warning', text: 'Emitter disconnected' },
  ];

  // Auto-pipeline states
  const [currentDetection, setCurrentDetection] = useState(null);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoStatus, setAutoStatus] = useState('idle');
  const timersRef = useRef([]);
  const [processingProgress, setProcessingProgress] = useState(0);

  useEffect(() => {
    return () => {
      // cleanup timers on unmount
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  // simulate a processing progress while in 'processing' state
  useEffect(() => {
    let interval = null;
    if (autoStatus === 'processing') {
      setProcessingProgress(0);
      interval = setInterval(() => {
        setProcessingProgress((p) => {
          const next = Math.min(100, p + 8);
          if (next === 100) {
            clearInterval(interval);
          }
          return next;
        });
      }, 180);
    } else {
      setProcessingProgress(0);
    }

    return () => clearInterval(interval);
  }, [autoStatus]);

  function AnimatedDisplay({ status, progress }) {
    return (
      <Paper sx={{ p: 2, mb: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography variant="h6">Pipeline display</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          {status === 'detecting' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress color="primary" />
              <Box>
                <Typography>Detecting...</Typography>
                <Typography variant="caption" color="text.secondary">Scanning sensors for odors</Typography>
              </Box>
            </Box>
          )}

          {status === 'processing' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress variant="determinate" value={progress} color="secondary" />
              <Box>
                <Typography>Analyzing...</Typography>
                <Typography variant="caption" color="text.secondary">ML inference in progress — {progress}%</Typography>
              </Box>
            </Box>
          )}

          {status === 'emitting' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'secondary.main', boxShadow: 3, animation: 'pulse 1200ms infinite' }} />
              <Box>
                <Typography>Emitting...</Typography>
                <Typography variant="caption" color="text.secondary">Releasing selected odor pattern</Typography>
              </Box>
            </Box>
          )}

          {status === 'idle' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '4px', bgcolor: 'grey.300' }} />
              <Box>
                <Typography>Idle</Typography>
                <Typography variant="caption" color="text.secondary">Pipeline ready</Typography>
              </Box>
            </Box>
          )}

          <style>{`@keyframes pulse {0% { transform: scale(1); opacity: 1;}50% { transform: scale(1.3); opacity: 0.6;}100% { transform: scale(1); opacity: 1;}}`}</style>
        </Box>
      </Paper>
    );
  }

  const startAutoCycle = () => {
    // single automatic cycle: detecting -> processing -> emitting -> done
    setIsAutoRunning(true);
    setAutoStatus('detecting');
    setCurrentDetection(null);

    const t1 = setTimeout(() => {
      // detection result (placeholder)
      const detected = {
        smell: 'Banana',
        confidence: 92,
        time: new Date().toLocaleString(),
      };
      setCurrentDetection(detected);
      setAutoStatus('processing');
    }, 1200);

    const t2 = setTimeout(() => {
      // ML processing complete
      setAutoStatus('emitting');
    }, 2600);

    const t3 = setTimeout(() => {
      // emission complete — finish cycle
      setAutoStatus('idle');
      setIsAutoRunning(false);
    }, 4200);

    timersRef.current = [t1, t2, t3];
  };

  const stopAutoCycle = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setIsAutoRunning(false);
    setAutoStatus('idle');
  };

  return (
    <Container component="main" maxWidth="lg">
      <Box sx={{ marginTop: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard (Home Page)
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Purpose: Give an overview of the system’s current state and quick access to major functions.
        </Typography>

  <Grid container spacing={3} alignItems="stretch" sx={{ minHeight: '60vh' }}>
          {/* Left column: System status and Real-time readings */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6">System status</Typography>
              <Box sx={{ mt: 1 }}>
                <StatusChip label={`Devices: ${systemStatus.devicesConnected}`} online />
                <StatusChip label="E-nose" online={systemStatus.enose} />
                <StatusChip label="Emitter" online={systemStatus.emitter} />
                <StatusChip label={`ML: ${systemStatus.mlModel}`} online />
              </Box>
            </Paper>

            <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <Typography variant="h6">Real-time readings summary</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">Odor intensity</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress variant="determinate" value={readings.odorIntensity} />
                  </Box>
                  <Typography>{readings.odorIntensity}%</Typography>
                </Box>

                <Typography variant="body2">Classification confidence</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress variant="determinate" value={readings.classificationConfidence} color="secondary" />
                  </Box>
                  <Typography>{readings.classificationConfidence}%</Typography>
                </Box>

                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Sensor values
                </Typography>
                <List dense>
                  {readings.sensors.map((s) => (
                    <ListItem key={s.name} disablePadding>
                      <ListItemText primary={s.name} secondary={`Value: ${s.value}`} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Paper>
          </Grid>

          {/* Middle column: Pipeline display, current detection, quick controls */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <AnimatedDisplay status={autoStatus} progress={processingProgress} />

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6">Currently detected smell</Typography>
              <Box sx={{ mt: 1 }}>
                {currentDetection ? (
                  <Box>
                    <Typography variant="subtitle1">{currentDetection.smell}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confidence: {currentDetection.confidence}% — {currentDetection.time}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>Pipeline: {autoStatus}</Typography>
                  </Box>
                ) : (
                  <Typography color="text.secondary">No smell detected</Typography>
                )}
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6">Quick controls</Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" color="success" onClick={() => alert('Manual detection not implemented yet')}>Start detection</Button>
                <Button variant="outlined" color="error" onClick={() => alert('Manual stop not implemented yet')}>Stop</Button>
                <Button variant="contained" color="secondary" onClick={() => alert('Emit smell action not implemented')}>Emit smell</Button>
              </Stack>
              <Box sx={{ mt: 2 }}>
                {isAutoRunning ? (
                  <Button variant="contained" color="warning" onClick={stopAutoCycle}>
                    Stop automatic pipeline
                  </Button>
                ) : (
                  <Button variant="contained" color="primary" onClick={startAutoCycle}>
                    Run automatic pipeline
                  </Button>
                )}
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Automatic pipeline simulates: detect → ML processing → emit
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Right column: Recent detections and Notifications */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ p: 2, mb: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <Typography variant="h6">Recent detected smells</Typography>
              <List>
                {recent.map((r) => (
                  <ListItem key={r.id} secondaryAction={<Typography variant="caption">{r.time}</Typography>}>
                    <ListItemText primary={r.smell} />
                  </ListItem>
                ))}
              </List>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Notifications</Typography>
              <Box sx={{ mt: 1 }}>
                {errors.length === 0 ? (
                  <Alert severity="info">No errors or warnings</Alert>
                ) : (
                  errors.map((e) => (
                    <Alert key={e.id} severity={e.level} sx={{ mb: 1 }}>
                      {e.text}
                    </Alert>
                  ))
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}