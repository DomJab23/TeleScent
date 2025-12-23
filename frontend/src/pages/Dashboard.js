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
import { apiClient } from '../config/apiConfig';

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
  // Real-time data from backend
  const [devices, setDevices] = useState({});
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  // Calculate system status from real data
  const systemStatus = {
    devicesConnected: Object.keys(devices).length,
    enose: Object.keys(devices).length > 0,
    emitter: false,
    mlModel: 'v1.0 (Random Forest)',
  };

  // Get latest readings from first device
  const latestDevice = Object.values(devices)[0];
  const latestReading = latestDevice?.latestReading;
  const mlPrediction = latestReading?.ml_prediction;

  const readings = {
    odorIntensity: latestReading ? Math.round((latestReading.gas || 0) * 10) : 0,
    classificationConfidence: mlPrediction ? Math.round(mlPrediction.confidence * 100) : 0,
    sensors: [
      { name: 'Gas (BME)', value: latestReading?.gas || 0 },
      { name: 'VOC Raw', value: (latestReading?.voc_raw || 0) / 1000 },
      { name: 'NO2', value: (latestReading?.no2 || 0) / 100 },
      { name: 'Ethanol', value: (latestReading?.ethanol || 0) / 100 },
    ],
  };

  const errors = Object.keys(devices).length === 0 ? [
    { id: 1, level: 'warning', text: 'No devices connected' },
  ] : [];

  // Fetch devices and predictions from backend
  const fetchDevices = async () => {
    try {
      const data = await apiClient.get('/api/sensor-data');
      setDevices(data.devices || {});
      
      // Extract recent predictions
      const predictions = [];
      Object.entries(data.devices || {}).forEach(([deviceId, deviceData]) => {
        if (deviceData.latestReading?.ml_prediction) {
          predictions.push({
            id: predictions.length + 1,
            smell: deviceData.latestReading.ml_prediction.scent,
            time: new Date(deviceData.lastUpdate).toLocaleString(),
            confidence: Math.round(deviceData.latestReading.ml_prediction.confidence * 100)
          });
        }
      });
      setRecentPredictions(predictions.slice(0, 10));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    intervalRef.current = setInterval(fetchDevices, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Set current detection from latest prediction
  const [currentDetection, setCurrentDetection] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionMessage, setDetectionMessage] = useState('');
  const [detectionStep, setDetectionStep] = useState(''); // Track current step

  useEffect(() => {
    if (recentPredictions.length > 0) {
      setCurrentDetection(recentPredictions[0]);
    }
  }, [recentPredictions]);

  // Complete detection flow: capture → process → predict
  const startDetection = async () => {
    setIsDetecting(true);
    setDetectionMessage('');
    setDetectionStep('🤖 Processing sensor data with ML model...');
    
    try {
      // Call detection endpoint - no simulation, only real data
      const response = await apiClient.post('/api/predictions/detect', {
        deviceId: 'web-interface',
        simulate: false // Explicitly disable simulation
      });
      
      console.log('Detection complete:', response);
      
      setDetectionStep('✅ Analysis complete!');
      
      if (response.prediction) {
        // Update current detection with the new result
        const newDetection = {
          id: Date.now(),
          smell: response.prediction.scent,
          confidence: Math.round(response.prediction.confidence * 100),
          time: new Date().toLocaleString()
        };
        
        setCurrentDetection(newDetection);
        
        // Add to recent predictions
        setRecentPredictions(prev => [newDetection, ...prev].slice(0, 10));
        
        setDetectionMessage(`✅ Detected: ${response.prediction.scent} (${(response.prediction.confidence * 100).toFixed(1)}% confidence)`);
      } else {
        setDetectionMessage('⚠️ Detection completed but no prediction available');
      }
      
      // Refresh device data
      await fetchDevices();
      
    } catch (err) {
      console.error('Detection error:', err);
      
      if (err.message.includes('No sensor data available')) {
        setDetectionMessage('⚠️ No sensor data available. Please ensure the e-nose Arduino is connected and sending data to POST /api/sensor-data');
      } else {
        setDetectionMessage(`❌ Detection failed: ${err.message}`);
      }
    } finally {
      setIsDetecting(false);
      setDetectionStep('');
      // Clear message after 8 seconds
      setTimeout(() => setDetectionMessage(''), 8000);
    }
  };

  // Determine system status based on real data
  const getPipelineStatus = () => {
    if (loading) return 'loading';
    if (Object.keys(devices).length === 0) return 'idle';
    if (recentPredictions.length > 0) {
      const lastPrediction = recentPredictions[0];
      const predictionAge = new Date() - new Date(lastPrediction.time);
      // If prediction is less than 10 seconds old, show as active
      if (predictionAge < 10000) return 'active';
    }
    return 'monitoring';
  };

  const pipelineStatus = getPipelineStatus();

  return (
    <Container component="main" maxWidth="lg">
      <Box sx={{ marginTop: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
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
                <Typography variant="body2">Smell intensity</Typography>
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

          {/* Middle column: Pipeline status and current detection */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ p: 2, mb: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="h6">Pipeline Status</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                {pipelineStatus === 'loading' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={40} color="primary" />
                    <Box>
                      <Typography>Loading...</Typography>
                      <Typography variant="caption" color="text.secondary">Connecting to backend</Typography>
                    </Box>
                  </Box>
                )}

                {pipelineStatus === 'idle' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '4px', bgcolor: 'grey.300' }} />
                    <Box>
                      <Typography>Idle</Typography>
                      <Typography variant="caption" color="text.secondary">No devices connected</Typography>
                    </Box>
                  </Box>
                )}

                {pipelineStatus === 'monitoring' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={40} color="primary" />
                    <Box>
                      <Typography>Monitoring</Typography>
                      <Typography variant="caption" color="text.secondary">Waiting for sensor data</Typography>
                    </Box>
                  </Box>
                )}

                {pipelineStatus === 'active' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'success.main', boxShadow: 3, animation: 'pulse 1200ms infinite' }} />
                    <Box>
                      <Typography>Active</Typography>
                      <Typography variant="caption" color="text.secondary">Processing sensor data</Typography>
                    </Box>
                  </Box>
                )}

                <style>{`@keyframes pulse {0% { transform: scale(1); opacity: 1;}50% { transform: scale(1.3); opacity: 0.6;}100% { transform: scale(1); opacity: 1;}}`}</style>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6">Latest Detection</Typography>
              <Box sx={{ mt: 1 }}>
                {currentDetection ? (
                  <Box>
                    <Typography variant="h5" color="primary.main">{currentDetection.smell}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Confidence: {currentDetection.confidence}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {currentDetection.time}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={currentDetection.confidence} 
                      sx={{ mt: 2, height: 8, borderRadius: 1 }}
                    />
                  </Box>
                ) : (
                  <Alert severity="info">No smell detected yet. Send sensor data from Arduino devices.</Alert>
                )}
              </Box>
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Detection Control</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Place a smell under the e-nose, then click the button to start the detection process.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={startDetection}
                disabled={isDetecting}
                sx={{ mb: 2, py: 1.5 }}
                size="large"
              >
                {isDetecting ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Detecting...
                  </>
                ) : (
                  'Start Smell Detection'
                )}
              </Button>
              
              {/* Detection progress */}
              {detectionStep && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="info.dark">
                    {detectionStep}
                  </Typography>
                  {isDetecting && <LinearProgress sx={{ mt: 1 }} />}
                </Box>
              )}
              
              {/* Detection result message */}
              {detectionMessage && (
                <Alert 
                  severity={detectionMessage.includes('✅') ? 'success' : detectionMessage.includes('⚠️') ? 'warning' : 'error'} 
                  sx={{ mt: 1 }}
                >
                  {detectionMessage}
                </Alert>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="caption" color="text.secondary" display="block">
                <strong>How it works:</strong>
                <br />1. Place smell under e-nose sensors
                <br />2. Click "Start Smell Detection"
                <br />3. System captures sensor readings
                <br />4. ML model analyzes the data
                <br />5. Prediction appears above
              </Typography>
              
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Note: Automatic processing also runs every 5 seconds when Arduino devices send data.
              </Typography>
            </Paper>
          </Grid>

          {/* Right column: Recent detections and Notifications */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ p: 2, mb: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
              <Typography variant="h6">Recent detected smells</Typography>
              {loading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : recentPredictions.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>No detections yet. Waiting for sensor data...</Alert>
              ) : (
                <List>
                  {recentPredictions.map((r) => (
                    <ListItem key={r.id} secondaryAction={
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" display="block">{r.time}</Typography>
                        <Chip label={`${r.confidence}%`} size="small" color="primary" />
                      </Box>
                    }>
                      <ListItemText primary={r.smell} />
                    </ListItem>
                  ))}
                </List>
              )}
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