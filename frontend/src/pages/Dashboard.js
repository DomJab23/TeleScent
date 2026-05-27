import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  useTheme,
} from '@mui/material';
import { apiClient } from '../config/apiConfig';
import { timeAgo, formatScent } from '../utils/format';

const POLL_MS = 3000;

export default function Dashboard() {
  const theme = useTheme();
  const [devices, setDevices] = useState({});
  const [predictions, setPredictions] = useState({});
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detectError, setDetectError] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [, setTick] = useState(0);
  const intervalRef = useRef(null);

  const fetchAll = async () => {
    try {
      const [s, p] = await Promise.all([
        apiClient.get('/api/sensor-data'),
        apiClient.get('/api/predictions'),
      ]);
      setDevices(s.devices || {});
      setPredictions(p.predictions || {});
    } catch (err) {
      // Keep last good state on transient network errors.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, POLL_MS);
    apiClient.get('/api/ml/info').then(setModelInfo).catch(() => {});
    const ticker = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(ticker);
    };
  }, []);

  const deviceIds = Object.keys(devices);
  const firstDeviceId = deviceIds[0];
  const firstDevice = firstDeviceId ? devices[firstDeviceId] : null;
  const reading = firstDevice?.latestReading || null;
  const prediction = firstDeviceId ? (predictions[firstDeviceId] || reading?.ml_prediction) : null;

  const recent = deviceIds
    .map((id) => {
      const dev = devices[id];
      const pred = predictions[id] || dev?.latestReading?.ml_prediction;
      if (!pred?.scent || pred.scent === 'error') return null;
      return {
        id,
        deviceId: id,
        scent: pred.scent,
        confidence: pred.confidence || 0,
        time: pred.timestamp || dev?.lastUpdate,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const updatedAt = firstDevice?.lastUpdate || prediction?.timestamp;
  const fromDb = firstDevice?.source === 'database' || prediction?.source === 'database';

  const startDetection = async () => {
    setIsDetecting(true);
    setDetectError(null);
    try {
      await apiClient.post('/api/predictions/detect', { deviceId: 'web-interface', simulate: false });
      await fetchAll();
    } catch (err) {
      setDetectError(err.message || 'Detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  const cardSx = {
    p: 3,
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`${deviceIds.length} device${deviceIds.length === 1 ? '' : 's'}`}
            color={deviceIds.length ? 'success' : 'default'}
            variant={deviceIds.length ? 'filled' : 'outlined'}
          />
          {modelInfo?.model?.name && (
            <Chip size="small" label={`Model: ${modelInfo.model.name}`} variant="outlined" />
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 3,
        }}
      >
        <Paper elevation={0} sx={cardSx}>
          <Typography variant="overline" color="text.secondary">Latest detection</Typography>
          {loading ? (
            <Box sx={{ mt: 2 }}><LinearProgress /></Box>
          ) : !prediction ? (
            <Box sx={{ py: 3 }}>
              <Typography variant="h5" color="text.secondary">No prediction yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {deviceIds.length === 0
                  ? 'Waiting for an Arduino to POST /api/sensor-data.'
                  : 'Sensor data received — prediction pending.'}
              </Typography>
            </Box>
          ) : (
            <>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.05,
                  textTransform: 'capitalize',
                  fontSize: { xs: '2.25rem', sm: '3rem' },
                  wordBreak: 'break-word',
                  mt: 1,
                }}
              >
                {formatScent(prediction.scent)}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, (prediction.confidence || 0) * 100))}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Typography variant="h6" sx={{ minWidth: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round((prediction.confidence || 0) * 100)}%
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                {firstDeviceId} · {timeAgo(updatedAt)}{fromDb && ' · from database'}
              </Typography>
            </>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="overline" color="text.secondary">Manual detection</Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={startDetection}
              disabled={isDetecting || deviceIds.length === 0}
              startIcon={isDetecting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isDetecting ? 'Detecting…' : 'Trigger detection'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              Predictions also run automatically as sensor data arrives.
            </Typography>
          </Box>
          {detectError && <Alert severity="error" sx={{ mt: 2 }}>{detectError}</Alert>}
        </Paper>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" color="text.secondary">Live sensors</Typography>
            {reading ? (
              <Box sx={{ mt: 1.5 }}>
                <SensorRow label="Gas" value={reading.gas} unit="kΩ" />
                <SensorRow label="VOC" value={reading.voc} />
                <SensorRow label="NO₂" value={reading.no2} unit="ppb" />
                <SensorRow label="Ethanol" value={reading.ethanol} unit="ppm" />
                <SensorRow label="Temp" value={reading.temperature} unit="°C" />
                <SensorRow label="Humidity" value={reading.humidity} unit="%" />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                No sensor data yet.
              </Typography>
            )}
          </Paper>

          <Paper elevation={0} sx={cardSx}>
            <Typography variant="overline" color="text.secondary">Recent detections</Typography>
            {recent.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                None yet.
              </Typography>
            ) : (
              <List dense sx={{ mt: 0.5 }}>
                {recent.slice(0, 5).map((r) => (
                  <ListItem
                    key={r.id}
                    disableGutters
                    secondaryAction={
                      <Chip
                        size="small"
                        label={`${Math.round(r.confidence * 100)}%`}
                        color="primary"
                        variant="outlined"
                      />
                    }
                  >
                    <ListItemText
                      primary={<span style={{ textTransform: 'capitalize' }}>{formatScent(r.scent)}</span>}
                      secondary={`${r.deviceId} · ${timeAgo(r.time)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}

function SensorRow({ label, value, unit }) {
  const text = value == null || Number.isNaN(value)
    ? '—'
    : typeof value === 'number'
      ? (Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2))
      : String(value);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {text}{unit && value != null && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{unit}</Typography>}
      </Typography>
    </Box>
  );
}
