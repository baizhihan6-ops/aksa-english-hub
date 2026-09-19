const fs = require('node:fs');
const path = require('node:path');
const { phonemize } = require('phonemize');

const root = path.resolve(__dirname, '..');
const wordsPath = path.join(root, 'data', 'words.js');
const lexicon = require(path.join(root, 'data', 'pronunciation', 'britfone-used.json'));
const overrides = require(path.join(root, 'data', 'pronunciation', 'technical-overrides.json'));
const words = require(wordsPath);
const fallbacks = new Set();

function normaliseKey(value) {
  return String(value).trim().toLowerCase().replace(/[’]/g, "'");
}

function cleanIpa(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '').replace(/\s+/g, ' ').trim();
}

function tokenIpa(token) {
  const key = normaliseKey(token);
  if (overrides[key]) return cleanIpa(overrides[key]);
  if (lexicon[key]) return cleanIpa(lexicon[key]);
  fallbacks.add(key);
  return cleanIpa(phonemize(key, { language: 'en-GB', separator: '' }));
}

function termIpa(term) {
  const whole = overrides[normaliseKey(term)];
  if (whole) return `/${cleanIpa(whole)}/`;
  const tokens = String(term).match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
  if (!tokens.length) throw new Error(`No pronounceable tokens: ${term}`);
  const ipa = tokens.map(tokenIpa).join(' ');
  const plainIpa = ipa.toLowerCase().replace(/[^a-z]/g, '');
  const plainTerm = term.toLowerCase().replace(/[^a-z]/g, '');
  if (!ipa || plainIpa === plainTerm) throw new Error(`Plain-spelling IPA rejected: ${term} -> ${ipa}`);
  return `/${ipa}/`;
}

for (const word of words) word.ipa = termIpa(word.term);

const output = `(function(root, factory) {\n  var data = factory();\n  if (typeof module === 'object' && module.exports) module.exports = data;\n  else root.AKSA_WORDS = data;\n})(typeof globalThis !== 'undefined' ? globalThis : this, function() {\n  return ${JSON.stringify(words, null, 2)};\n});\n`;
fs.writeFileSync(wordsPath, output);
console.log(`Rebuilt ${words.length} IPA entries.`);
console.log(`Fallback tokens (${fallbacks.size}): ${[...fallbacks].sort().join(', ') || 'none'}`);
