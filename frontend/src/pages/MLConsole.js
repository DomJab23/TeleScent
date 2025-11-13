import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Slider,
  Button,
  TextField,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

export default function MLConsole() {
  const navigate = useNavigate();

  // Dataset management (placeholder data)
  const [dataset, setDataset] = useState([
    { label: 'Coffee', samples: 240 },
    { label: 'Lavender', samples: 180 },
    { label: 'Smoke', samples: 120 },
  ]);

  // Model/training options
  const [algorithm, setAlgorithm] = useState('cnn');
  const [learningRate, setLearningRate] = useState(0.001);
  const [epochs, setEpochs] = useState(20);
  const [batchSize, setBatchSize] = useState(32);

  // Training simulation state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [accuracyHistory, setAccuracyHistory] = useState([]);
  const [lossHistory, setLossHistory] = useState([]);
  const trainingTimerRef = useRef(null);

  // Evaluation metrics
  const [confusion, setConfusion] = useState({ tp: 810, fp: 190, fn: 240, tn: 876 });
  const [f1Score, setF1Score] = useState(0.78);

  // Model versions
  const [models, setModels] = useState([
    { id: 'm1', name: 'model_v1.0', created: '2025-11-01' },
  ]);

  useEffect(() => {
    return () => {
      if (trainingTimerRef.current) clearInterval(trainingTimerRef.current);
    };
  }, []);

  function handleUploadDataset(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // Placeholder: in real app, upload to backend
    alert(`Uploaded dataset file: ${file.name} (not processed in frontend demo)`);
  }

  function handleUploadModel(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // Placeholder: upload model and add to list
    const id = `m_upload_${Date.now()}`;
    setModels((m) => [...m, { id, name: file.name, created: new Date().toLocaleDateString() }]);
  }

  function startTraining() {
    setIsTraining(true);
    setTrainingProgress(0);
    setAccuracyHistory([]);
    setLossHistory([]);

    const totalSteps = epochs;
    let step = 0;

    trainingTimerRef.current = setInterval(() => {
      step += 1;
      const progress = Math.round((step / totalSteps) * 100);
      setTrainingProgress(progress);

      // Simulate accuracy/loss
      setAccuracyHistory((h) => [...h, Math.min(1, 0.6 + step * (0.35 / totalSteps))]);
      setLossHistory((h) => [...h, Math.max(0.1, 1.2 - step * (1.0 / totalSteps))]);

      if (step >= totalSteps) {
        clearInterval(trainingTimerRef.current);
        trainingTimerRef.current = null;
        setIsTraining(false);
        // update evaluation metrics with simulated values
        setConfusion({ tp: 820, fp: 180, fn: 210, tn: 890 });
        setF1Score(0.82);
      }
    }, 800);
  }

  function stopTraining() {
    if (trainingTimerRef.current) {
      clearInterval(trainingTimerRef.current);
      trainingTimerRef.current = null;
    }
    setIsTraining(false);
  }

  function saveModel(name) {
    const id = `model_${Date.now()}`;
    setModels((m) => [...m, { id, name: name || `model_${id}`, created: new Date().toLocaleDateString() }]);
    alert('Model saved (placeholder)');
  }

  function deleteModel(id) {
    setModels((m) => m.filter((x) => x.id !== id));
  }

  // Simple SVG sparkline for arrays (values in [0,1])
  function Sparkline({ data = [], color = '#1976d2', height = 40 }) {
    if (!data || data.length === 0) return <Box sx={{ height }} />;
    const w = Math.max(120, data.length * 6);
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = Math.max(0.0001, max - min);
    const points = data
      .map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * height}`)
      .join(' ');
    return (
      <svg width={w} height={height} style={{ display: 'block' }}>
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    );
  }

  return (
    <Container component="main" maxWidth="lg">
      <Box sx={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Machine Learning / Training
          </Typography>
          <Typography color="text.secondary">
            Purpose: Train and manage the smell classification model.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Dataset management */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }} elevation={2}>
              <Typography variant="h6">Dataset management</Typography>
              <Typography variant="caption" color="text.secondary">List of labels and sample counts</Typography>
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Label</TableCell>
                      <TableCell align="right">Samples</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataset.map((d) => (
                      <TableRow key={d.label}>
                        <TableCell>{d.label}</TableCell>
                        <TableCell align="right">{d.samples}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                  Upload dataset
                  <input hidden type="file" onChange={handleUploadDataset} />
                </Button>
                <Button variant="text" onClick={() => alert('Open dataset viewer (placeholder)')}>View samples</Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }} elevation={2}>
              <Typography variant="h6">Model versions</Typography>
              <List dense>
                {models.map((m) => (
                  <ListItem key={m.id} secondaryAction={
                    <Box>
                      <IconButton size="small" onClick={() => saveModel(m.name)} title="Save">
                        <SaveIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => deleteModel(m.id)} title="Delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }>
                    <ListItemText primary={m.name} secondary={m.created} />
                  </ListItem>
                ))}
              </List>

              <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                  Upload model
                  <input hidden type="file" onChange={handleUploadModel} />
                </Button>
                <Button variant="contained" onClick={() => saveModel()}>Save current model</Button>
              </Box>
            </Paper>
          </Grid>

          {/* Training controls & progress */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }} elevation={2}>
              <Typography variant="h6">Model training options</Typography>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="algo-label">Algorithm</InputLabel>
                  <Select labelId="algo-label" value={algorithm} label="Algorithm" onChange={(e) => setAlgorithm(e.target.value)}>
                    <MenuItem value="cnn">CNN</MenuItem>
                    <MenuItem value="svm">SVM</MenuItem>
                    <MenuItem value="rf">Random Forest</MenuItem>
                  </Select>
                </FormControl>

                <Box>
                  <Typography gutterBottom>Learning Rate: {learningRate}</Typography>
                  <Slider value={learningRate} min={0.0001} max={0.01} step={0.0001} onChange={(e, v) => setLearningRate(Number(v))} />
                </Box>
                <Box>
                  <Typography gutterBottom>Epochs: {epochs}</Typography>
                  <Slider value={epochs} min={1} max={200} step={1} onChange={(e, v) => setEpochs(Number(v))} />
                </Box>
                <Box>
                  <Typography gutterBottom>Batch size: {batchSize}</Typography>
                  <Slider value={batchSize} min={1} max={256} step={1} onChange={(e, v) => setBatchSize(Number(v))} />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained" disabled={isTraining} onClick={startTraining}>{isTraining ? 'Training...' : 'Start training'}</Button>
                  <Button variant="outlined" onClick={stopTraining} disabled={!isTraining}>Stop</Button>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Progress</Typography>
                  <LinearProgress variant="determinate" value={trainingProgress} sx={{ height: 10, borderRadius: 2, mt: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption">{trainingProgress}%</Typography>
                    <Typography variant="caption">Epochs: {epochs}</Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }} elevation={2}>
              <Typography variant="h6">Progress visualization</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption">Accuracy</Typography>
                  <Sparkline data={accuracyHistory} color="#2e7d32" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption">Loss</Typography>
                  <Sparkline data={lossHistory} color="#c62828" />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Evaluation & metrics */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }} elevation={2}>
              <Typography variant="h6">Evaluation metrics</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography>F1 score: <strong>{f1Score}</strong></Typography>
                <Typography sx={{ mt: 1 }}>Confusion matrix</Typography>
                <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>TP: {confusion.tp}</Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>FP: {confusion.fp}</Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>FN: {confusion.fn}</Paper>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>TN: {confusion.tn}</Paper>
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }} elevation={2}>
              <Typography variant="h6">Logs & model artifacts</Typography>
              <TextField multiline rows={6} value={accuracyHistory.map((a, i) => `Epoch ${i+1} acc=${(a*100).toFixed(1)}%`).join('\n')} fullWidth />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button variant="outlined">Download Logs</Button>
                <Button variant="outlined">Export Model</Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

