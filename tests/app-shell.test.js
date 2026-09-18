const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

test('app shell contains the seven approved views and no removed feature hooks', () => {
  const files = ['index.html', 'app.js', 'assets/site.css', 'sw.js'];
  const text = files.map(read).join('\n');
  const views = [...read('index.html').matchAll(/data-view="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(views, ['home', 'dialogue', 'vocabulary', 'challenge', 'grammar', 'topics', 'dashboard']);
  assert.doesNotMatch(text, /view-ai|ai2\.html|microphone|speech-recognition|pronunciation assessment|btn-speak|AKSA-English-Hub\.apk/i);
});

test('HTML and service worker references point to existing local files', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(value => !value.startsWith('#') && !/^https?:/.test(value));
  for (const ref of refs) assert.ok(fs.existsSync(path.join(root, ref)), `missing HTML asset: ${ref}`);
  const shell = read('sw.js');
  const cached = [...shell.matchAll(/'\.\/([^']+)'/g)].map(match => match[1]).filter(Boolean);
  for (const ref of cached) assert.ok(fs.existsSync(path.join(root, ref)), `missing cached asset: ${ref}`);
});

test('approved visual system remains monochrome and gradient-free', () => {
  const css = read('assets/site.css');
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|conic-gradient/i);
  assert.doesNotMatch(css, /\b(red|green|blue|purple|orange|pink|yellow|brown)\b/i);
});

