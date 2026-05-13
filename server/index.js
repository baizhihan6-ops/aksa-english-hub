const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: `${__dirname}/.env` });
const { evaluatePronunciation, isConfigured } = require('./xunfei-ise');

const app = express();
const port = Number(process.env.PORT || 8787);
const origins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes('*') || origins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed.'));
  },
}));

app.use(express.json({ limit: process.env.JSON_LIMIT || '12mb' }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    provider: 'xunfei-ise',
    configured: isConfigured(),
  });
});

app.post('/api/pronunciation', async (req, res) => {
  try {
    const { targetText, audio, mimeType, durationSec } = req.body || {};
    if (!targetText || typeof targetText !== 'string') {
      res.status(400).json({ error: 'targetText is required.' });
      return;
    }
    if (!audio || typeof audio !== 'string') {
      res.status(400).json({ error: 'audio data URL is required.' });
      return;
    }
    if (durationSec && Number(durationSec) > 180) {
      res.status(400).json({ error: 'Audio is too long. Keep pronunciation clips under 3 minutes.' });
      return;
    }

    const match = audio.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'audio must be a base64 data URL.' });
      return;
    }

    const audioBuffer = Buffer.from(match[2], 'base64');
    if (audioBuffer.length < 1000) {
      res.status(400).json({ error: 'Audio is too short.' });
      return;
    }

    const result = await evaluatePronunciation({
      targetText,
      audioBuffer,
      mimeType: mimeType || match[1],
    });
    res.json(result);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    const status = /not configured/i.test(message) ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`AKSA speech backend listening on ${port}`);
});
