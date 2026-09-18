const test = require('node:test');
const assert = require('node:assert/strict');

const topics = require('../topics.js');

const items = [
  { id: 'a', date: '2026-09-19', category: 'industry', titleEn: 'Backup power', titleZh: '备用电源', summaryEn: 'Generator set market', summaryZh: '发电机组市场', vocabulary: [{ en: 'redundancy', zh: '冗余' }] },
  { id: 'b', date: '2026-09-18', category: 'world', titleEn: 'Global meeting', titleZh: '全球会议', summaryEn: 'Leaders meet', summaryZh: '领导人会面', vocabulary: [] }
];

test('topic search covers titles, summaries, and vocabulary', () => {
  assert.deepEqual(topics.filterTopics(items, { query: 'redundancy' }).map(item => item.id), ['a']);
  assert.deepEqual(topics.filterTopics(items, { query: '全球' }).map(item => item.id), ['b']);
  assert.deepEqual(topics.filterTopics(items, { query: 'generator' }).map(item => item.id), ['a']);
});

test('topic filters combine category and date then sort newest first', () => {
  assert.deepEqual(topics.filterTopics(items, { category: 'world' }).map(item => item.id), ['b']);
  assert.deepEqual(topics.filterTopics(items, { date: '2026-09-19' }).map(item => item.id), ['a']);
  assert.deepEqual(topics.filterTopics(items.concat([{ ...items[0], id: 'c', date: '2026-09-20' }]), {}).map(item => item.id), ['c', 'a', 'b']);
});

