import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiClient } from '../config/apiConfig';

// Testing console for backend API and sensor data submission
export default function TestingConsole() {
  const [address, setAddress] = useState('http://localhost:5000');
  const [port, setPort] = useState('5000');
  const [connected, setConnected] = useState(false);
  const [backendStatus, setBackendStatus] = useState('unknown');

  const [sendText, setSendText] = useState('');
  const [lastMessage, setLastMessage] = useState(null);
  const [log, setLog] = useState([]); // {dir: 'in'|'out', text, ts}

  const incomingIntervalRef = useRef(null);
  const simulatedResponseTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      // cleanup timers
      if (incomingIntervalRef.current) clearInterval(incomingIntervalRef.current);
      if (simulatedResponseTimeoutRef.current) clearTimeout(simulatedResponseTimeoutRef.current);
    };
  }, []);
  

  function timestamp() {
    return new Date().toLocaleString();
  }

  const pushLog = useCallback((entry) => {
    setLog((l) => {
      const next = [entry, ...l].slice(0, 500);
      return next;
    });
    if (entry.dir === 'in') setLastMessage(entry);
  }, []);

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      const data = await apiClient.get('/api');
      setBackendStatus('connected');
      pushLog({ dir: 'in', text: `✓ Backend connected: ${data.message}`, ts: timestamp() });
      return true;
    } catch (err) {
      setBackendStatus('error');
      pushLog({ dir: 'in', text: `✗ Backend error: ${err.message}`, ts: timestamp() });
      return false;
    }
  };

  // Mock receiving a message from device (stable reference)
  const receiveFromDevice = useCallback((text) => {
    const entry = { dir: 'in', text, ts: timestamp() };
    pushLog(entry);
  }, [pushLog]);

  // When connected, start a gentle simulated incoming-message generator
  useEffect(() => {
    if (connected) {
      incomingIntervalRef.current = setInterval(() => {
        const simulated = `+OK MOCK MSG ${Math.floor(Math.random() * 9000 + 1000)}`;
        receiveFromDevice(simulated);
      }, 14000 + Math.floor(Math.random() * 6000));
    } else {
      if (incomingIntervalRef.current) {
        clearInterval(incomingIntervalRef.current);
        incomingIntervalRef.current = null;
      }
    }

    return () => {
      if (incomingIntervalRef.current) {
        clearInterval(incomingIntervalRef.current);
        incomingIntervalRef.current = null;
      }
    };
  }, [connected, receiveFromDevice]);

  // Send test sensor data to backend
  const sendTestSensorData = async () => {
    const testData = {
      device_id: 'test_device_001',
      timestamp: Date.now(),
      temperature: 20 + Math.random() * 10,
      humidity: 30 + Math.random() * 40,
      pressure: 100 + Math.random() * 2,
      gas: 50 + Math.random() * 100,
      voc_raw: 20000 + Math.random() * 10000,
      nox_raw: 10000 + Math.random() * 5000,
      no2: 500 + Math.random() * 500,
      ethanol: 500 + Math.random() * 500,
      voc: 500 + Math.random() * 500,
      co_h2: 300 + Math.random() * 300
    };
    
    pushLog({ dir: 'out', text: `Sending test sensor data: ${JSON.stringify(testData, null, 2)}`, ts: timestamp() });
    
    try {
      const response = await apiClient.post('/api/sensor-data', testData);
      pushLog({ dir: 'in', text: `✓ Response: ${JSON.stringify(response, null, 2)}`, ts: timestamp() });
    } catch (err) {
      pushLog({ dir: 'in', text: `✗ Error: ${err.message}`, ts: timestamp() });
    }
  };

  // Mock sending — immediately logs the outgoing message and optionally simulates a response
  function sendToDevice(text) {
    if (!text) return;
    const out = { dir: 'out', text, ts: timestamp() };
    pushLog(out);

    // simulate a response after a short delay when connected, otherwise show not connected note
    if (connected) {
      simulatedResponseTimeoutRef.current = setTimeout(() => {
        const resp = `>RESP ${text} | ACK ${Math.floor(Math.random() * 99)}`;
        receiveFromDevice(resp);
      }, 600 + Math.floor(Math.random() * 900));
    } else {
      // not connected: push a local info message
      const info = { dir: 'in', text: `(Not connected) cannot deliver: ${text}`, ts: timestamp() };
      pushLog(info);
    }
  }

  function handleSend() {
    sendToDevice(sendText);
    setSendText('');
  }

  async function handleConnect() {
    pushLog({ dir: 'out', text: `Testing connection to backend at ${address}`, ts: timestamp() });
    const success = await testBackendConnection();
    if (success) {
      setConnected(true);
      pushLog({ dir: 'in', text: '✓ Connected to backend API', ts: timestamp() });
    }
  }

  function handleDisconnect() {
    pushLog({ dir: 'out', text: 'Disconnecting...', ts: timestamp() });
    setConnected(false);
    setBackendStatus('unknown');
    pushLog({ dir: 'in', text: 'Disconnected', ts: timestamp() });
  }

  function handleConnectToggle() {
    if (connected) {
      handleDisconnect();
    } else {
      handleConnect();
    }
  }

  function handleClearLog() {
    setLog([]);
    setLastMessage(null);
  }

  return (
    <Container component="main" maxWidth="lg" sx={{ mt: 3, mb: 6 }}>
      <Typography variant="h4" gutterBottom>
        Backend API Test Console
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Test backend API connection, send sensor data, and view responses in real-time.
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }} elevation={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Backend URL"
            size="small"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="Port"
            size="small"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            sx={{ width: 120 }}
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />

          <Chip
            label={connected ? `Connected` : 'Disconnected'}
            color={connected ? 'success' : 'default'}
            sx={{ ml: 1 }}
          />
          {backendStatus !== 'unknown' && (
            <Chip 
              label={`Backend: ${backendStatus}`} 
              color={backendStatus === 'connected' ? 'success' : 'error'}
              size="small"
            />
          )}

          <Box sx={{ flex: 1 }} />

          <Tooltip title={connected ? 'Disconnect' : 'Test Connection'}>
            <Button
              variant={connected ? 'outlined' : 'contained'}
              color={connected ? 'warning' : 'primary'}
              startIcon={connected ? <StopIcon /> : <PlayArrowIcon />}
              onClick={handleConnectToggle}
            >
              {connected ? 'Disconnect' : 'Connect'}
            </Button>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Quick test buttons */}
      <Paper sx={{ p: 2, mb: 2 }} elevation={1}>
        <Typography variant="subtitle1" gutterBottom>Quick Tests</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={sendTestSensorData} disabled={!connected}>
            Send Test Sensor Data
          </Button>
          <Button variant="outlined" onClick={testBackendConnection}>
            Test API Health
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
        {/* Left: Console + send area */}
        <Box>
          <Paper sx={{ p: 2, mb: 2 }} elevation={1}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Last Response from Backend
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, minHeight: 120, bgcolor: 'background.paper' }}>
              {lastMessage ? (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {lastMessage.ts}
                  </Typography>
                  <Typography component="pre" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mt: 1 }}>
                    {lastMessage.text}
                  </Typography>
                </Box>
              ) : (
                <Typography color="text.secondary">No messages received yet.</Typography>
              )}
            </Paper>

            <Divider sx={{ my: 1 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch">
              <TextField
                label="Message to send"
                placeholder="Type raw bytes or text to send"
                value={sendText}
                onChange={(e) => setSendText(e.target.value)}
                fullWidth
                multiline
                minRows={1}
                maxRows={4}
                InputProps={{ sx: { fontFamily: 'monospace' } }}
              />

              <Stack direction="column" spacing={1}>
                <Button variant="contained" onClick={handleSend} sx={{ minWidth: 120 }}>
                  Send
                </Button>
                <Button variant="outlined" color="inherit" onClick={() => receiveFromDevice('(Simulated incoming) PING')}>Simulate In</Button>
                <Tooltip title="Clear log">
                  <IconButton
                    aria-label="clear"
                    onClick={handleClearLog}
                    title="Clear log"
                    sx={{
                      bgcolor: 'error.main',
                      color: 'common.white',
                      borderRadius: '10px',
                      width: 44,
                      height: 44,
                      '&:hover': { bgcolor: 'error.dark' },
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }} elevation={0}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              History / Log (newest first)
            </Typography>
            <List sx={{ maxHeight: 380, overflow: 'auto', bgcolor: 'background.paper' }}>
              {log.length === 0 && (
                <ListItem>
                  <ListItemText primary="Log is empty" />
                </ListItem>
              )}
              {log.map((item, idx) => (
                <ListItem key={idx} alignItems="flex-start" divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                          {item.dir === 'in' ? '<-- ' : '--> '}
                          {item.text}
                        </Typography>
                      </Box>
                    }
                    secondary={<Typography variant="caption">{item.ts}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Right: Quick info / optional controls */}
        <Box>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1">Connection Status</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography>
                <strong>Address:</strong> {address}
              </Typography>
              <Typography>
                <strong>Port:</strong> {port}
              </Typography>
              <Typography sx={{ mt: 1 }}>
                <strong>State:</strong>{' '}
                <Chip label={connected ? 'Connected' : 'Disconnected'} color={connected ? 'success' : 'default'} size="small" />
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Quick actions</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Button onClick={() => receiveFromDevice('+MOCK_RESPONSE OK')} size="small">Simulate OK</Button>
              <Button onClick={() => receiveFromDevice('+MOCK_ALERT ERROR')} color="error" size="small">Simulate Error</Button>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}
