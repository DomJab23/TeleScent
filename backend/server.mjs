// backend/server.mjs
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  DEVICE_API_KEY,
  PORT = 5000,
} = process.env;

const required = { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEVICE_API_KEY };
for (const [key, val] of Object.entries(required)) {
  if (!val) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.post('/api/data', async (req, res) => {
  try {
    const apiKey = req.header('x-api-key') || req.body.api_key;
    if (apiKey !== DEVICE_API_KEY) {
      return res.status(401).json({ error: 'invalid api key' });
    }

    const { device_hw_id, name, ts, value1, value2, raw } = req.body;
    if (!device_hw_id) {
      return res.status(400).json({ error: 'device_hw_id is required' });
    }

    const { data: deviceRow, error: deviceLookupErr } = await supabase
      .from('devices')
      .select('id')
      .eq('hw_id', device_hw_id)
      .maybeSingle();

    if (deviceLookupErr) {
      console.error('Device lookup failed', deviceLookupErr);
      return res.status(500).json({ error: 'device lookup failed' });
    }

    let deviceId = deviceRow?.id;
    if (!deviceId) {
      const { data: insertedDevice, error: deviceInsertErr } = await supabase
        .from('devices')
        .insert({
          name: name || `Device ${device_hw_id}`,
          hw_id: device_hw_id,
        })
        .select('id')
        .single();

      if (deviceInsertErr) {
        console.error('Device insert failed', deviceInsertErr);
        return res.status(500).json({ error: 'device insert failed' });
      }
      deviceId = insertedDevice.id;
    }

    const payload = {
      device_id: deviceId,
      ts: ts || new Date().toISOString(),
      value1,
      value2,
      raw,
    };

    const { data: measurement, error: measurementErr } = await supabase
      .from('measurements')
      .insert(payload)
      .select('id, ts')
      .single();

    if (measurementErr) {
      console.error('Measurement insert failed', measurementErr);
      return res.status(500).json({ error: 'measurement insert failed' });
    }

    return res.json({ ok: true, device_id: deviceId, measurement_id: measurement.id });
  } catch (err) {
    console.error('Unhandled error', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
