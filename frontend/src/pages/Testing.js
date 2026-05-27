import React, { useState, useCallback, useEffect } from 'react';
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
  useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiClient } from '../config/apiConfig';

const SAMPLE_PAYLOAD = JSON.stringify(
  {
    deviceId: 'test-device',
    temperature: 22.5,
    humidity: 45,
    pressure: 101.3,
    gas: 12.4,
    voc: 120,
    voc_raw: 24000,
    nox_raw: 16000,
    no2: 80,
    ethanol: 150,
    co_h2: 200,
  },
  null,
  2,
);

function ts() {
  return new Date().toLocaleTimeString();
}

export default function TestingConsole() {
  const theme = useTheme();
  const [sendText, setSendText] = useState(SAMPLE_PAYLOAD);
  const [backendStatus, setBackendStatus] = useState('unknown');
  const [log, setLog] = useState([]);

  const pushLog = useCallback((entry) => {
    setLog((l) => [{ ...entry, ts: ts() }, ...l].slice(0, 500));
  }, []);

  const pingBackend = useCallback(async () => {
    pushLog({ dir: 'out', text: 'GET /api' });
    try {
      const data = await apiClient.get('/api');
      setBackendStatus('ok');
      pushLog({ dir: 'in', text: `200 ${JSON.stringify(data)}` });
    } catch (err) {
      setBackendStatus('error');
      pushLog({ dir: 'in', text: `error: ${err.message}` });
    }
  }, [pushLog]);

  useEffect(() => {
    pingBackend();
  }, [pingBackend]);

  const sendSensorPayload = async () => {
    let payload;
    try {
      payload = JSON.parse(sendText);
    } catch (err) {
      pushLog({ dir: 'in', text: `invalid JSON: ${err.message}` });
      return;
    }
    pushLog({ dir: 'out', text: `POST /api/sensor-data ${JSON.stringify(payload)}` });
    try {
      const response = await apiClient.post('/api/sensor-data', payload);
      pushLog({ dir: 'in', text: `200 ${JSON.stringify(response)}` });
    } catch (err) {
      pushLog({ dir: 'in', text: `error: ${err.message}` });
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
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Testing</Typography>
        <Stack direction="row" spacing={1}>
          <Chip
            size="small"
            label={backendStatus === 'ok' ? 'Backend OK' : backendStatus === 'error' ? 'Backend error' : 'Pinging…'}
            color={backendStatus === 'ok' ? 'success' : backendStatus === 'error' ? 'error' : 'default'}
            variant={backendStatus === 'ok' ? 'filled' : 'outlined'}
          />
          <Button size="small" onClick={pingBackend}>Re-test</Button>
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 3,
        }}
      >
        <Paper elevation={0} sx={cardSx}>
          <Typography variant="overline" color="text.secondary">Send sensor payload</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            POSTs JSON to <code>/api/sensor-data</code> — same shape the Arduino sends.
          </Typography>
          <TextField
            value={sendText}
            onChange={(e) => setSendText(e.target.value)}
            fullWidth
            multiline
            minRows={10}
            maxRows={20}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            sx={{ mt: 2 }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={sendSensorPayload}>Send</Button>
            <Button variant="outlined" onClick={() => setSendText(SAMPLE_PAYLOAD)}>Reset payload</Button>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="overline" color="text.secondary">Request log</Typography>
            <Tooltip title="Clear log">
              <IconButton size="small" onClick={() => setLog([])}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Divider sx={{ my: 1 }} />
          <List dense sx={{ maxHeight: 480, overflow: 'auto', py: 0 }}>
            {log.length === 0 ? (
              <ListItem disableGutters>
                <ListItemText primary="No requests yet." primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} />
              </ListItem>
            ) : (
              log.map((item, idx) => (
                <ListItem key={idx} disableGutters alignItems="flex-start" divider>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        <Box component="span" sx={{ color: item.dir === 'out' ? 'primary.main' : 'success.main' }}>
                          {item.dir === 'out' ? '→ ' : '← '}
                        </Box>
                        {item.text}
                      </Typography>
                    }
                    secondary={<Typography variant="caption" color="text.secondary">{item.ts}</Typography>}
                  />
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      </Box>
    </Container>
  );
}
