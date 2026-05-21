const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist-edgeone');
const staticFiles = [
  'index.html',
  'manifest.json',
  'sw.js',
  'icon.png',
  'speech-cloud.js',
  'speech-config.js',
  'AKSA-English-Hub.apk',
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of staticFiles) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}

fs.cpSync(path.join(root, 'edge-functions'), path.join(out, 'edge-functions'), {
  recursive: true,
});

console.log('EdgeOne build output written to dist-edgeone');
