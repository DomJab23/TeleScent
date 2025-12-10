import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SensorsIcon from '@mui/icons-material/Sensors';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { apiClient } from '../config/apiConfig';

export default function SensorData() {
  const [devices, setDevices] = useState({});
  const [predictions, setPredictions] = useState({});
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const eventSourceRef = useRef(null);

  // Fetch all devices and their latest data
  const fetchDevices = async () => {
    try {
      const data = await apiClient.get('/api/sensor-data');
      setDevices(data.devices || {});
      
      // Auto-select first device if none selected
      if (!selectedDevice && Object.keys(data.devices).length > 0) {
        setSelectedDevice(Object.keys(data.devices)[0]);
      }
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Fetch predictions for all devices
  const fetchPredictions = async () => {
    try {
      const data = await apiClient.get('/api/predictions');
      setPredictions(data.predictions || {});
    } catch (err) {
      console.error('Error fetching predictions:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDevices();
    fetchPredictions();
    
    // Set up SSE connection for live sensor updates
    if (liveUpdates) {
      const evtSource = new EventSource('/api/sensor-data/stream');
      eventSourceRef.current = evtSource;
      
      evtSource.addEventListener('sensor', (e) => {
        try {
          const payload = JSON.parse(e.data);
          const dataEntry = payload.data;
          
          // Update devices state with new reading
          setDevices((prev) => {
            const deviceId = dataEntry.deviceId;
            const updated = { ...prev };
            
            if (!updated[deviceId]) {
              updated[deviceId] = {
                lastUpdate: dataEntry.receivedAt,
                dataCount: 1,
                latestReading: dataEntry
              };
            } else {
              updated[deviceId] = {
                ...updated[deviceId],
                lastUpdate: dataEntry.receivedAt,
                dataCount: updated[deviceId].dataCount + 1,
                latestReading: dataEntry
              };
            }
            
            // Auto-select first device
            if (!selectedDevice) {
              setSelectedDevice(deviceId);
            }
            
            return updated;
          });
          
          // Fetch latest predictions after new sensor data
          fetchPredictions();
          
        } catch (err) {
          console.error('Failed to parse SSE payload', err);
        }
      });
      
      evtSource.onerror = (err) => {
        console.error('EventSource failed:', err);
      };
    }
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveUpdates]);

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Render sensor value with bar
  const renderSensorBar = (name, value, unit = '') => {
    const percentage = Math.min(Math.max(value * 10, 0), 100); // Rough scaling
    
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2">{name}</Typography>
          <Typography variant="body2" fontWeight="bold">
            {value !== null ? `${value.toFixed(2)} ${unit}` : 'N/A'}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={percentage} 
          sx={{ height: 6, borderRadius: 1 }}
        />
      </Box>
    );
  };

  const latestData = selectedDevice ? devices[selectedDevice]?.latestReading : null;
  const mlPrediction = selectedDevice ? predictions[selectedDevice] : null;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <SensorsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Real-Time Sensor Data & ML Predictions
          </Typography>
          <Typography color="text.secondary">
            Live sensor readings from Arduino devices with AI-powered scent detection
          </Typography>
        </Box>
        <Box>
          <Tooltip title={liveUpdates ? 'Live updates ON (SSE)' : 'Live updates OFF'}>
            <Chip 
              label={liveUpdates ? 'Live Updates (SSE)' : 'Paused'}
              color={liveUpdates ? 'success' : 'default'}
              onClick={() => setLiveUpdates(!liveUpdates)}
              sx={{ mr: 1 }}
            />
          </Tooltip>
          <Tooltip title="Refresh now">
            <IconButton onClick={() => { fetchDevices(); fetchPredictions(); }} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to fetch device data: {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Loading devices...</Typography>
          <LinearProgress sx={{ mt: 2 }} />
        </Box>
      )}

      {/* No devices */}
      {!loading && Object.keys(devices).length === 0 && (
        <Alert severity="info">
          No devices found. Waiting for Arduino to send sensor data...
        </Alert>
      )}

      {/* Device selector */}
      {!loading && Object.keys(devices).length > 0 && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Connected Devices ({Object.keys(devices).length})</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.keys(devices).map((deviceId) => (
                <Chip
                  key={deviceId}
                  label={deviceId}
                  color={selectedDevice === deviceId ? 'primary' : 'default'}
                  onClick={() => setSelectedDevice(deviceId)}
                  icon={<CheckCircleIcon />}
                />
              ))}
            </Box>
          </Box>

          {/* Main content */}
          <Grid container spacing={3}>
            {/* Left: ML Prediction Card */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PsychologyIcon sx={{ fontSize: 40, color: 'white', mr: 2 }} />
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                      AI Detection
                    </Typography>
                  </Box>

                  {mlPrediction && mlPrediction.scent !== 'error' ? (
                    <>
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="h2" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                          {mlPrediction.scent}
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          Confidence: {(mlPrediction.confidence * 100).toFixed(1)}%
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={mlPrediction.confidence * 100}
                          sx={{ 
                            mt: 2, 
                            height: 10, 
                            borderRadius: 5,
                            backgroundColor: 'rgba(255,255,255,0.3)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: 'white'
                            }
                          }}
                        />
                      </Box>

                      <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.3)', my: 2 }} />

                      <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                        Top Predictions:
                      </Typography>
                      {mlPrediction.top_predictions && Object.entries(mlPrediction.top_predictions).map(([scent, prob]) => (
                        <Box key={scent} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ color: 'rgba(255,255,255,0.9)' }}>{scent}</Typography>
                          <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                            {(prob * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      ))}

                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mt: 2 }}>
                        Last updated: {formatTime(mlPrediction.timestamp)}
                      </Typography>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <ErrorIcon sx={{ fontSize: 60, color: 'rgba(255,255,255,0.5)', mb: 2 }} />
                      <Typography sx={{ color: 'white' }}>
                        {mlPrediction?.error || 'Waiting for prediction...'}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Right: Sensor Readings */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Sensor Readings - {selectedDevice}
                </Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Last update: {latestData ? formatTime(latestData.receivedAt) : 'N/A'}
                </Typography>

                {latestData ? (
                  <Box sx={{ mt: 3 }}>
                    <Grid container spacing={3}>
                      {/* Environmental Sensors (Not used for ML) */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Environmental (Not used for ML)
                        </Typography>
                        {renderSensorBar('Temperature', latestData.temperature, '°C')}
                        {renderSensorBar('Humidity', latestData.humidity, '%')}
                        {renderSensorBar('Pressure', latestData.pressure, 'kPa')}
                      </Grid>

                      {/* Chemical Sensors (Used for ML) */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                          Chemical Sensors (Used for ML) ✅
                        </Typography>
                        {renderSensorBar('Gas Resistance', latestData.gas, 'kΩ')}
                        {renderSensorBar('Raw VOC', latestData.voc_raw, '')}
                        {renderSensorBar('Raw NOx', latestData.nox_raw, '')}
                        {renderSensorBar('NO2', latestData.no2, 'ppb')}
                        {renderSensorBar('Ethanol', latestData.ethanol, 'ppm')}
                        {renderSensorBar('VOC Index', latestData.voc, '')}
                        {renderSensorBar('CO + H2', latestData.co_h2, 'ppm')}
                      </Grid>
                    </Grid>

                    {/* Raw data table */}
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Raw Sensor Values
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Sensor</TableCell>
                              <TableCell align="right">Value</TableCell>
                              <TableCell>Used for ML</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>Temperature</TableCell>
                              <TableCell align="right">{latestData.temperature?.toFixed(2) || 'N/A'} °C</TableCell>
                              <TableCell>❌</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Humidity</TableCell>
                              <TableCell align="right">{latestData.humidity?.toFixed(2) || 'N/A'} %</TableCell>
                              <TableCell>❌</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Pressure</TableCell>
                              <TableCell align="right">{latestData.pressure?.toFixed(2) || 'N/A'} kPa</TableCell>
                              <TableCell>❌</TableCell>
                            </TableRow>
                            <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                              <TableCell>Gas Resistance</TableCell>
                              <TableCell align="right">{latestData.gas?.toFixed(2) || 'N/A'} kΩ</TableCell>
                              <TableCell>✅</TableCell>
                            </TableRow>
                            <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                              <TableCell>Raw VOC</TableCell>
                              <TableCell align="right">{latestData.voc_raw || 'N/A'}</TableCell>
                              <TableCell>✅</TableCell>
                            </TableRow>
                            <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                              <TableCell>Raw NOx</TableCell>
                              <TableCell align="right">{latestData.nox_raw || 'N/A'}</TableCell>
                              <TableCell>✅</TableCell>
                            </TableRow>
                            <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                              <TableCell>NO2</TableCell>
                              <TableCell align="right">{latestData.no2 || 'N/A'} ppb</TableCell>
                              <TableCell>✅</TableCell>
                            </TableRow>
                            <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                              <TableCell>Ethanol</TableCell>
                              <TableCell align="right">{latestData.ethanol || 'N/A'} ppm</TableCell>
                              <TableCell>✅</TableCell>
                            </TableRow>
                            <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                              <TableCell>VOC Index</TableCell>
                              <TableCell align="right">{latestData.voc || 'N/A'}</TableCell>
                              <TableCell>✅</TableCell>
                            </TableRow>
                            <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)' }}>
                              <TableCell>CO + H2</TableCell>
                              <TableCell align="right">{latestData.co_h2 || 'N/A'} ppm</TableCell>
                              <TableCell>✅</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Box>
                ) : (
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    No data available for this device
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
}
