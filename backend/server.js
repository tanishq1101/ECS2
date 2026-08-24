/**
 * Smart Food Wastage Analyser — prototype API server.
 *
 * Runs in DEMO MODE: no database, no ESP32 fingerprint hardware, no ML service.
 * All data comes from mockData.js through routes/api.js.
 */

const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'demo',
    database: 'not_connected',
    mlService: 'not_connected',
    fingerprintHardware: 'not_connected',
  });
});

/**
 * Reserved for the future ESP32 bridge. Left unimplemented on purpose so the
 * prototype never claims a fingerprint scan happened when none did.
 *
 *   POST /api/hardware/attendance  { studentId, mealId, scannedAt, deviceId }
 *     -> writes an attendance row with source: 'fingerprint'
 *     -> the student dashboard picks it up on its next poll, no UI change needed
 */
app.all('/api/hardware/attendance', (req, res) => {
  res.status(501).json({
    error: 'not_implemented',
    message: 'Fingerprint hardware is not connected in prototype mode.',
  });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `No route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[api error]', err);
  res.status(500).json({ error: 'server_error', message: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Smart Food Wastage Analyser API (demo mode) -> http://localhost:${PORT}`);
});
