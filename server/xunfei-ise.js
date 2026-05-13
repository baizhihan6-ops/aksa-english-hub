const crypto = require('crypto');
const WebSocket = require('ws');
const { XMLParser } = require('fast-xml-parser');

const HOST = 'ise-api.xfyun.cn';
const PATH = '/v2/open-ise';
const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 1280;

function isConfigured() {
  return !!(process.env.XFYUN_APP_ID && process.env.XFYUN_API_KEY && process.env.XFYUN_API_SECRET);
}

function createAuthUrl() {
  const apiKey = process.env.XFYUN_API_KEY;
  const apiSecret = process.env.XFYUN_API_SECRET;
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${HOST}\ndate: ${date}\nGET ${PATH} HTTP/1.1`;
  const signature = crypto.createHmac('sha256', apiSecret).update(signatureOrigin).digest('base64');
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');
  return `wss://${HOST}${PATH}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${HOST}`;
}

function stripWavHeader(buffer) {
  if (buffer.length > 44 && buffer.slice(0, 4).toString('ascii') === 'RIFF') {
    const dataIndex = buffer.indexOf(Buffer.from('data'));
    if (dataIndex >= 0 && dataIndex + 8 < buffer.length) {
      return buffer.slice(dataIndex + 8);
    }
    return buffer.slice(44);
  }
  return buffer;
}

function normalizeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (number <= 10) return Math.round(number * 10);
  return Math.max(0, Math.min(100, Math.round(number)));
}

function collectScores(node, out) {
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    const lower = key.toLowerCase();
    if (/total.*score|score$/.test(lower) && out.score == null) out.score = normalizeScore(value);
    if (/accuracy/.test(lower) && out.accuracy == null) out.accuracy = normalizeScore(value);
    if (/fluency/.test(lower) && out.fluency == null) out.fluency = normalizeScore(value);
    if (/standard|phone/.test(lower) && out.standard == null) out.standard = normalizeScore(value);
    if (/content|text|sentence/.test(lower) && typeof value === 'string' && !out.text) out.text = value;
    if (value && typeof value === 'object') collectScores(value, out);
  }
}

function parseIseXml(xml, targetText) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'value',
  });
  const parsed = parser.parse(xml);
  const result = { text: targetText };
  collectScores(parsed, result);
  if (result.score == null) {
    result.score = Math.round(((result.accuracy || 0) + (result.fluency || 0) + (result.standard || 0)) / 3) || 0;
  }
  return result;
}

function buildParamFrame(targetText) {
  return JSON.stringify({
    common: {
      app_id: process.env.XFYUN_APP_ID,
    },
    business: {
      category: process.env.XFYUN_ISE_CATEGORY || 'read_sentence',
      sub: process.env.XFYUN_ISE_SUB || 'ise',
      ent: process.env.XFYUN_ISE_ENT || 'en_vip',
      cmd: 'ssb',
      auf: `audio/L16;rate=${SAMPLE_RATE}`,
      aue: 'raw',
      text: `\uFEFF${targetText}`,
      tte: 'utf-8',
      rstcd: 'utf8',
      ttp_skip: true,
    },
    data: {
      status: 0,
      data: '',
    },
  });
}

function buildAudioFrame(status, aus, audioChunk) {
  return JSON.stringify({
    business: {
      cmd: 'auw',
      aus,
      aue: 'raw',
    },
    data: {
      status,
      data: audioChunk.toString('base64'),
      data_type: 1,
      encoding: 'raw',
    },
  });
}

function sendChunks(ws, pcmBuffer, targetText) {
  return new Promise((resolve, reject) => {
    let offset = 0;
    let first = true;

    function sendNext() {
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Speech WebSocket closed while sending audio.'));
        return;
      }

      const isLast = offset + CHUNK_SIZE >= pcmBuffer.length;
      const chunk = pcmBuffer.slice(offset, offset + CHUNK_SIZE);
      offset += CHUNK_SIZE;
      const status = isLast ? 2 : 1;
      const aus = isLast ? 4 : (first ? 1 : 2);
      ws.send(buildAudioFrame(status, aus, chunk), (err) => {
        if (err) {
          reject(err);
          return;
        }
        first = false;
        if (isLast) {
          resolve();
          return;
        }
        setTimeout(sendNext, 40);
      });
    }

    ws.send(buildParamFrame(targetText), (err) => {
      if (err) {
        reject(err);
        return;
      }
      setTimeout(sendNext, 40);
    });
  });
}

function evaluatePronunciation({ targetText, audioBuffer }) {
  if (!isConfigured()) {
    return Promise.reject(new Error('Xunfei speech service is not configured. Set XFYUN_APP_ID, XFYUN_API_KEY and XFYUN_API_SECRET on the backend.'));
  }

  const pcmBuffer = stripWavHeader(audioBuffer);
  const authUrl = createAuthUrl();

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(authUrl);
    const timeout = setTimeout(() => {
      try { ws.close(); } catch (e) {}
      reject(new Error('Speech evaluation timed out.'));
    }, Number(process.env.XFYUN_TIMEOUT_MS || 30000));

    let xmlResult = '';
    let settled = false;

    function finish(fn, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { ws.close(); } catch (e) {}
      fn(value);
    }

    ws.on('open', () => {
      sendChunks(ws, pcmBuffer, targetText).catch((err) => finish(reject, err));
    });

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.code && payload.code !== 0) {
          finish(reject, new Error(payload.message || `Xunfei error ${payload.code}`));
          return;
        }
        if (payload.data && payload.data.data) {
          xmlResult += Buffer.from(payload.data.data, 'base64').toString('utf8');
        }
        if (payload.data && payload.data.status === 2) {
          finish(resolve, parseIseXml(xmlResult, targetText));
        }
      } catch (err) {
        finish(reject, err);
      }
    });

    ws.on('error', (err) => finish(reject, err));
    ws.on('close', () => {
      if (!settled && xmlResult) finish(resolve, parseIseXml(xmlResult, targetText));
    });
  });
}

module.exports = {
  evaluatePronunciation,
  isConfigured,
  stripWavHeader,
  parseIseXml,
};
