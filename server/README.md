# AKSA Speech Backend

This backend keeps the Xunfei credentials off the GitHub Pages frontend and exposes one API used by both the PWA and APK.

## API

```text
POST /api/pronunciation
Content-Type: application/json
```

Request:

```json
{
  "targetText": "quality inspection",
  "audio": "data:audio/wav;base64,...",
  "mimeType": "audio/wav",
  "durationSec": 3
}
```

Response:

```json
{
  "text": "quality inspection",
  "score": 86,
  "accuracy": 88,
  "fluency": 82,
  "standard": 85
}
```

## Local Run

```powershell
cd "E:\English Corner"
copy server\.env.example server\.env
# Edit server\.env with real Xunfei credentials.
npm run speech:server
```

Then set the frontend endpoint for local testing:

```js
localStorage.setItem('aksaSpeechApiUrl', 'http://localhost:8787/api/pronunciation')
```

## Production

Deploy `server/` to a domestic Node.js host such as Tencent Cloud, Alibaba Cloud, or a company server. Set these environment variables on the host:

```text
XFYUN_APP_ID
XFYUN_API_KEY
XFYUN_API_SECRET
ALLOWED_ORIGINS=https://baizhihan6-ops.github.io
```

After deployment, update `speech-config.js`:

```js
window.AKSA_SPEECH_API_URL = 'https://your-backend-domain.example.com/api/pronunciation';
```

Do not put `XFYUN_API_SECRET` in `index.html`, `speech-config.js`, or any GitHub Pages file.
