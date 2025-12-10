import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PsychologyIcon from '@mui/icons-material/Psychology';
import DatasetIcon from '@mui/icons-material/Dataset';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import { apiClient } from '../config/apiConfig';

export default function MLConsole() {
  // ML Model Information
  const [modelInfo] = useState({
    name: 'TeleScent Random Forest Classifier',
    version: '1.0',
    scents: ['apple', 'banana', 'coconut', 'coffee', 'grape', 'icecream', 'lavender', 'lemon', 'mango', 'melon', 'orange', 'pineapple'],
    features: ['gas_bme', 'srawVoc', 'srawNox', 'NO2', 'ethanol', 'VOC_multichannel', 'COandH2'],
    trained: true
  });

  // Real-time prediction data from backend
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  // Dataset info from master_dataset1.csv
  const [datasetInfo] = useState({
    totalSamples: 9070,
    scents: [
      { label: 'apple', samples: 756 },
      { label: 'banana', samples: 756 },
      { label: 'coconut', samples: 756 },
      { label: 'coffee', samples: 756 },
      { label: 'grape', samples: 756 },
      { label: 'icecream', samples: 756 },
      { label: 'lavender', samples: 756 },
      { label: 'lemon', samples: 756 },
      { label: 'mango', samples: 756 },
      { label: 'melon', samples: 756 },
      { label: 'orange', samples: 756 },
      { label: 'pineapple', samples: 756 }
    ],
    phases: ['baseline', 'exposure', 'recovery', 'outside_protocol']
  });

  // Fetch all devices and their predictions
  const fetchDevicesWithPredictions = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/api/sensor-data');
      
      // Extract recent predictions from devices
      const predictions = [];
      Object.entries(data.devices || {}).forEach(([deviceId, deviceData]) => {
        if (deviceData.latestReading?.ml_prediction) {
          predictions.push({
            deviceId,
            ...deviceData.latestReading.ml_prediction,
            timestamp: deviceData.lastUpdate
          });
        }
      });
      setRecentPredictions(predictions);
      setError(null);
    } catch (err) {
      console.error('Error fetching ML predictions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevicesWithPredictions();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchDevicesWithPredictions, 3000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh]);

  // Helper functions
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <PsychologyIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4">
            Machine Learning Console
          </Typography>
        </Box>
        <Typography color="text.secondary">
          Real-time ML model status, predictions, and dataset information
        </Typography>
      </Box>

      {/* Auto-refresh control */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Chip 
          label={autoRefresh ? 'Auto-refresh ON (3s)' : 'Auto-refresh OFF'}
          color={autoRefresh ? 'success' : 'default'}
          onClick={() => setAutoRefresh(!autoRefresh)}
        />
        <Button variant="outlined" size="small" onClick={fetchDevicesWithPredictions}>
          Refresh Now
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading ML data: {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 3 }} />}

      <Grid container spacing={3}>
        {/* Model Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ModelTrainingIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Current ML Model</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Model Name</Typography>
                <Typography variant="body1" fontWeight="bold">{modelInfo.name}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Version</Typography>
                <Typography variant="body1" fontWeight="bold">{modelInfo.version}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip 
                  label={modelInfo.trained ? 'Trained & Active' : 'Not Trained'} 
                  color={modelInfo.trained ? 'success' : 'warning'}
                  icon={<CheckCircleIcon />}
                  size="small"
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Detectable Scents ({modelInfo.scents.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {modelInfo.scents.map((scent) => (
                    <Chip key={scent} label={scent} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Features Used ({modelInfo.features.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {modelInfo.features.join(', ')}
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                Model files located at: <code>ml/model/</code>
                <br />• scent_pipeline.joblib
                <br />• label_encoder.joblib
                <br />• metrics.json
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Dataset Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DatasetIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Training Dataset</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Dataset File</Typography>
                <Typography variant="body1" fontWeight="bold">master_dataset1.csv</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Total Samples</Typography>
                <Typography variant="body1" fontWeight="bold">{datasetInfo.totalSamples.toLocaleString()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Phases
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {datasetInfo.phases.map((phase) => (
                    <Chip key={phase} label={phase} size="small" color="primary" variant="outlined" />
                  ))}
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 3 }}>
                Samples per Scent
              </Typography>
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Scent</TableCell>
                      <TableCell align="right">Samples</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {datasetInfo.scents.map((item) => (
                      <TableRow key={item.label}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell align="right">{item.samples}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Predictions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent ML Predictions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Live predictions from connected devices
              </Typography>
              
              {recentPredictions.length === 0 ? (
                <Alert severity="info">
                  No predictions yet. Waiting for sensor data from Arduino devices...
                </Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Device ID</TableCell>
                        <TableCell>Predicted Scent</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Top 3 Predictions</TableCell>
                        <TableCell>Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentPredictions.map((pred, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Chip label={pred.deviceId} size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body1" fontWeight="bold">
                              {pred.scent}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={`${(pred.confidence * 100).toFixed(1)}%`}
                                color={getConfidenceColor(pred.confidence)}
                                size="small"
                              />
                              <LinearProgress 
                                variant="determinate" 
                                value={pred.confidence * 100}
                                sx={{ width: 100, height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            {pred.top_predictions && (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {Object.entries(pred.top_predictions).slice(0, 3).map(([scent, prob]) => (
                                  <Typography key={scent} variant="caption">
                                    {scent}: {(prob * 100).toFixed(1)}%
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatTime(pred.timestamp)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Instructions */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              💡 ML Model Information
            </Typography>
            <Typography variant="body2">
              • Model is served by Python script at <code>ml/serve.py</code>
              <br />• Training performed in <code>ml/scentdetection.ipynb</code>
              <br />• To retrain: Run the Jupyter notebook with your dataset
              <br />• Expected accuracy: 85-95% on 12 scent classes
              <br />• Best performance during exposure phase when sensors respond strongest
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Container>
  );
}

