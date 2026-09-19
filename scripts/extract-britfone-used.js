const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = process.env.BRITFONE_CSV;
if (!source || !fs.existsSync(source)) {
  throw new Error('Set BRITFONE_CSV to britfone.main.3.0.1.csv');
}

const words = require(path.join(root, 'data', 'words.js'));
const tokens = new Set(words.flatMap(word => word.term.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []));
const result = {};

for (const line of fs.readFileSync(source, 'utf8').split(/\r?\n/)) {
  const comma = line.indexOf(',');
  if (comma < 1) continue;
  const key = line.slice(0, comma).trim().replace(/\(\d+\)$/, '').replaceAll('_', ' ').toLowerCase();
  if (!tokens.has(key) || result[key]) continue;
  result[key] = line.slice(comma + 1).trim().replace(/\s+/g, '');
}

const ordered = Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
const output = path.join(root, 'data', 'pronunciation', 'britfone-used.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(ordered, null, 2) + '\n');
console.log(`Saved ${Object.keys(ordered).length} of ${tokens.size} vocabulary tokens.`);
