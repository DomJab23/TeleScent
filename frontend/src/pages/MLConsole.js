import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Skeleton,
  Divider,
  useTheme,
} from '@mui/material';
import { apiClient } from '../config/apiConfig';
import { timeAgo, formatScent, pct } from '../utils/format';

const POLL_MS = 3000;

export default function MLConsole() {
  const theme = useTheme();
  const [mlInfo, setMlInfo] = useState(null);
  const [mlInfoError, setMlInfoError] = useState(null);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchPredictions = async () => {
    try {
      const [s, p] = await Promise.all([
        apiClient.get('/api/sensor-data'),
        apiClient.get('/api/predictions'),
      ]);
      const devices = s.devices || {};
      const preds = p.predictions || {};
      const merged = Object.keys(devices).map((id) => {
        const pred = preds[id] || devices[id]?.latestReading?.ml_prediction;
        if (!pred?.scent) return null;
        return {
          deviceId: id,
          scent: pred.scent,
          confidence: pred.confidence || 0,
          top_predictions: pred.top_predictions || null,
          timestamp: pred.timestamp || devices[id]?.lastUpdate,
        };
      }).filter(Boolean);
      setRecentPredictions(merged);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.get('/api/ml/info')
      .then(setMlInfo)
      .catch((err) => setMlInfoError(err.message || 'Failed to load model info'));
    fetchPredictions();
    intervalRef.current = setInterval(fetchPredictions, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, []);

  const cardSx = {
    p: 3,
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
  };

  const model = mlInfo?.model;
  const metrics = mlInfo?.metrics;
  const perClass = mlInfo?.perClass || [];

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>ML Console</Typography>
        {model?.name && (
          <Chip size="small" label={`${model.name}${model.kind ? ` · ${model.kind}` : ''}`} variant="outlined" />
        )}
      </Box>

      {mlInfoError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Could not load model info: {mlInfoError}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={cardSx}>
          <Typography variant="overline" color="text.secondary">Production model</Typography>
          {!mlInfo ? (
            <Skeleton variant="rectangular" height={120} sx={{ mt: 1.5, borderRadius: 1 }} />
          ) : (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {(model.classes || []).map((c) => (
                  <Chip key={c} size="small" label={formatScent(c)} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                ))}
              </Box>

              <MetricRow label="Holdout accuracy" value={pct(metrics?.holdoutAccuracy)} />
              <MetricRow label="Holdout macro-F1" value={pct(metrics?.holdoutMacroF1)} />
              <MetricRow label="CV macro-F1" value={pct(metrics?.cvMacroF1)} />
              <MetricRow
                label="Inference latency"
                value={metrics?.latencyMs != null ? `${metrics.latencyMs.toFixed(1)} ms` : '—'}
              />
              <MetricRow
                label="Test rows (holdout)"
                value={metrics?.testRows != null ? metrics.testRows.toString() : '—'}
              />
              <MetricRow
                label="Features"
                value={`${model.featuresIn?.length || 0} raw · ${model.featuresEngineered?.length || 0} engineered`}
              />
            </Box>
          )}
        </Paper>

        <Paper elevation={0} sx={cardSx}>
          <Typography variant="overline" color="text.secondary">Per-class performance (holdout)</Typography>
          {!mlInfo ? (
            <Skeleton variant="rectangular" height={160} sx={{ mt: 1.5, borderRadius: 1 }} />
          ) : perClass.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              No per-class metrics available.
            </Typography>
          ) : (
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Scent</TableCell>
                  <TableCell align="right">Precision</TableCell>
                  <TableCell align="right">Recall</TableCell>
                  <TableCell align="right">F1</TableCell>
                  <TableCell align="right">n</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {perClass.map((row) => (
                  <TableRow key={row.scent}>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{formatScent(row.scent)}</TableCell>
                    <TableCell align="right">{pct(row.precision)}</TableCell>
                    <TableCell align="right">{pct(row.recall)}</TableCell>
                    <TableCell align="right">{pct(row.f1)}</TableCell>
                    <TableCell align="right">{row.support ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>

      <Paper elevation={0} sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="overline" color="text.secondary">Live predictions per device</Typography>
          {loading ? <LinearProgress sx={{ width: 80 }} /> : (
            <Chip size="small" label={`${recentPredictions.length} device${recentPredictions.length === 1 ? '' : 's'}`} variant="outlined" />
          )}
        </Box>
        <Divider sx={{ mb: 1 }} />

        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

        {recentPredictions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No predictions yet — waiting for sensor data.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Device</TableCell>
                  <TableCell>Scent</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Top 3</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentPredictions.map((pred) => {
                  const top = pred.top_predictions && typeof pred.top_predictions === 'object'
                    ? (Array.isArray(pred.top_predictions)
                        ? pred.top_predictions
                        : Object.entries(pred.top_predictions).map(([scent, c]) => ({ scent, confidence: c })))
                      .slice()
                      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
                      .slice(0, 3)
                    : [];
                  return (
                    <TableRow key={pred.deviceId}>
                      <TableCell><Chip label={pred.deviceId} size="small" /></TableCell>
                      <TableCell sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {formatScent(pred.scent)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 160 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, pred.confidence * 100))}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {pct(pred.confidence)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {top.length === 0 ? '—' : (
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            {top.map((t) => (
                              <Typography key={t.scent} variant="caption" sx={{ textTransform: 'capitalize' }}>
                                {formatScent(t.scent)} · {pct(t.confidence)}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{timeAgo(pred.timestamp)}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}

function MetricRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  );
}
