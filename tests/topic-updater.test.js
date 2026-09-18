const test = require('node:test');
const assert = require('node:assert/strict');

const updater = require('../scripts/update-topics.js');

test('normalizes URLs for duplicate detection', () => {
  assert.equal(updater.normalizeUrl('https://Example.com/story/?utm_source=test#top'), 'https://example.com/story');
});

test('candidate selection rejects seen and irrelevant items', () => {
  const items = [
    { title: 'Unrelated sports result', link: 'https://example.com/sport', summary: '' },
    { title: 'New diesel generator set for data centres', link: 'https://example.com/power', summary: 'Backup power' },
    { title: 'Standby generator project', link: 'https://example.com/seen', summary: 'Power' }
  ];
  const seen = new Set(['https://example.com/seen']);
  assert.equal(updater.pickCandidate(items, /generator|backup power/i, seen).link, 'https://example.com/power');
});

test('unavailable entries remain explicit and source-backed', () => {
  const item = updater.unavailableTopic('industry', '2026-09-20', 'https://example.com/feed');
  assert.equal(item.status, 'unavailable');
  assert.equal(item.category, 'industry');
  assert.match(item.summaryEn, /No suitable/i);
  assert.equal(item.sourceUrl, 'https://example.com/feed');
});

