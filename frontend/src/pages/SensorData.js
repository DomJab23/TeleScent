import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  LinearProgress,
  Alert,
  Skeleton,
  Divider,
  useTheme,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { apiClient } from '../config/apiConfig';
import { timeAgo, formatScent } from '../utils/format';

const POLL_MS = 3000;
const STALE_MS = 15000;

function SensorPill({ label, value, unit }) {
  const text = value == null || Number.isNaN(value)
    ? '—'
    : typeof value === 'number'
      ? (Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2))
      : String(value);
  return (
    <Box sx={{ minWidth: 90 }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
        {text}{unit && value != null && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{unit}</Typography>}
      </Typography>
    </Box>
  );
}

export default function SensorData() {
  const theme = useTheme();
  const [devices, setDevices] = useState({});
  const [predictions, setPredictions] = useState({});
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);
  const pollRef = useRef(null);
  const sseRef = useRef(null);
  const selectedDeviceRef = useRef(null);
  useEffect(() => { selectedDeviceRef.current = selectedDevice; }, [selectedDevice]);

  const fetchAll = async () => {
    try {
      const [s, p] = await Promise.all([
        apiClient.get('/api/sensor-data'),
        apiClient.get('/api/predictions'),
      ]);
      setDevices(s.devices || {});
      setPredictions(p.predictions || {});
      setError(null);
      setSelectedDevice((cur) => {
        if (cur && (s.devices || {})[cur]) return cur;
        const first = Object.keys(s.devices || {})[0] || null;
        return first;
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, POLL_MS);

    const evt = new EventSource('/api/sensor-data/stream');
    sseRef.current = evt;
    evt.addEventListener('sensor', (e) => {
      try {
        const payload = JSON.parse(e.data);
        const dataEntry = payload.data;
        const incomingPrediction = payload.prediction;
        const deviceId = dataEntry.deviceId;

        setDevices((prev) => ({
          ...prev,
          [deviceId]: {
            lastUpdate: dataEntry.receivedAt,
            dataCount: (prev[deviceId]?.dataCount || 0) + 1,
            latestReading: dataEntry,
          },
        }));
        if (incomingPrediction) {
          setPredictions((prev) => ({ ...prev, [deviceId]: incomingPrediction }));
        }
        if (!selectedDeviceRef.current) setSelectedDevice(deviceId);
      } catch (_) {}
    });
    evt.onerror = () => {};

    const ticker = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(ticker);
      evt.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deviceIds = Object.keys(devices);
  const activeId = selectedDevice && devices[selectedDevice] ? selectedDevice : deviceIds[0];
  const device = activeId ? devices[activeId] : null;
  const reading = device?.latestReading || null;
  const prediction = activeId ? (predictions[activeId] || reading?.ml_prediction) : null;

  const updatedAt = device?.lastUpdate || prediction?.timestamp;
  const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : null;
  const live = ageMs != null && ageMs < STALE_MS;
  const fromDb = device?.source === 'database' || prediction?.source === 'database';

  const confidence = prediction?.confidence != null
    ? Math.max(0, Math.min(1, prediction.confidence))
    : 0;
  const scent = prediction?.scent && prediction.scent !== 'error' ? prediction.scent : null;

  const top = Array.isArray(prediction?.top_predictions)
    ? prediction.top_predictions
    : prediction?.top_predictions && typeof prediction.top_predictions === 'object'
      ? Object.entries(prediction.top_predictions).map(([scent, c]) => ({ scent, confidence: c }))
      : [];
  const top3 = top
    .slice()
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 3);

  const statusColor = !device ? 'default' : fromDb ? 'info' : live ? 'success' : 'warning';
  const statusLabel = !device
    ? 'No device'
    : fromDb
      ? 'Last DB record'
      : live
        ? 'Live'
        : `Stale · ${timeAgo(updatedAt)}`;

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Prediction</Typography>
        <Chip
          icon={<FiberManualRecordIcon sx={{ fontSize: 14 }} />}
          label={statusLabel}
          color={statusColor}
          size="small"
          variant={live ? 'filled' : 'outlined'}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {deviceIds.length > 1 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {deviceIds.map((id) => (
            <Chip
              key={id}
              label={id}
              variant={id === activeId ? 'filled' : 'outlined'}
              color={id === activeId ? 'primary' : 'default'}
              onClick={() => setSelectedDevice(id)}
            />
          ))}
        </Stack>
      )}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, rgba(0,0,0,0.2) 100%)`
            : `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
        }}
      >
        {loading ? (
          <Stack spacing={2}>
            <Skeleton variant="text" width="60%" height={64} />
            <Skeleton variant="rectangular" height={12} sx={{ borderRadius: 1 }} />
            <Skeleton variant="text" width="40%" />
          </Stack>
        ) : !device ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="h5" color="text.secondary">No device connected</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Waiting for an Arduino to POST <code>/api/sensor-data</code>.
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
                fontSize: { xs: '2.5rem', sm: '3.5rem' },
                wordBreak: 'break-word',
                color: scent ? 'text.primary' : 'text.secondary',
              }}
            >
              {scent ? formatScent(scent) : 'no prediction yet'}
            </Typography>

            <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={confidence * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="h5" sx={{ minWidth: 64, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {(confidence * 100).toFixed(0)}%
              </Typography>
            </Box>

            {top3.length > 1 && (
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
                {top3.map((t, i) => (
                  <Chip
                    key={`${t.scent}-${i}`}
                    label={`${formatScent(t.scent)} · ${(t.confidence * 100).toFixed(0)}%`}
                    size="small"
                    variant={i === 0 ? 'filled' : 'outlined'}
                    color={i === 0 ? 'primary' : 'default'}
                    sx={{ textTransform: 'capitalize' }}
                  />
                ))}
              </Stack>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              {activeId} · updated {timeAgo(updatedAt)}
              {fromDb && ' · loaded from database'}
            </Typography>
          </>
        )}
      </Paper>

      {reading && (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 3,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="overline" color="text.secondary">Live sensors</Typography>
          <Divider sx={{ my: 1 }} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(7, 1fr)' },
              gap: 2,
            }}
          >
            <SensorPill label="Gas" value={reading.gas} unit="kΩ" />
            <SensorPill label="VOC" value={reading.voc} />
            <SensorPill label="NO₂" value={reading.no2} unit="ppb" />
            <SensorPill label="Ethanol" value={reading.ethanol} unit="ppm" />
            <SensorPill label="CO+H₂" value={reading.co_h2} unit="ppm" />
            <SensorPill label="Temp" value={reading.temperature} unit="°C" />
            <SensorPill label="Humidity" value={reading.humidity} unit="%" />
          </Box>
        </Paper>
      )}
    </Container>
  );
}
