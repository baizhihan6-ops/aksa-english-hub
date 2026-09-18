const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('vocabulary meets the approved size and field contract', () => {
  const words = require('../data/words.js');
  assert.ok(words.length >= 1882, `expected at least 1882 words, received ${words.length}`);
  const ids = new Set();
  for (const word of words) {
    for (const field of ['id', 'term', 'ipa', 'zh', 'category', 'topic', 'difficulty']) {
      assert.notEqual(word[field], undefined, `${word.id || word.term} is missing ${field}`);
      assert.notEqual(word[field], '', `${word.id || word.term} has empty ${field}`);
    }
    assert.ok(word.example && word.example.en && word.example.zh, `${word.id} needs a bilingual example`);
    assert.ok(!ids.has(word.id), `duplicate word id: ${word.id}`);
    ids.add(word.id);
  }
});

test('phrase bank contains at least 2000 unique bilingual expressions', () => {
  const phrases = require('../data/phrases.js');
  assert.ok(phrases.length >= 2000, `expected at least 2000 phrases, received ${phrases.length}`);
  const normalized = new Set(phrases.map(item => item.en.trim().toLowerCase()));
  assert.equal(normalized.size, phrases.length, 'phrase bank contains duplicate English text');
  assert.ok(phrases.every(item => item.en && item.zh && item.scenario), 'every phrase needs English, Chinese, and scenario');
});

test('Dialogue contains at least 14 lessons and 100 bilingual lines', () => {
  const lessons = require('../data/lessons.js');
  assert.ok(lessons.length >= 14, `expected at least 14 lessons, received ${lessons.length}`);
  const lineCount = lessons.reduce((total, lesson) => total + lesson.lines.length, 0);
  assert.ok(lineCount >= 100, `expected at least 100 lines, received ${lineCount}`);
  assert.ok(lessons.every(lesson => lesson.summary && lesson.tag && lesson.focus.length >= 3));
  assert.ok(lessons.every(lesson => lesson.lines.every(line => line.speaker && line.en && line.zh)));
});

test('Topics index is append-only shaped and includes all three daily categories', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'data/topics/index.json'), 'utf8'));
  const archive = JSON.parse(fs.readFileSync(path.join(root, 'data/topics/archive.json'), 'utf8'));
  assert.ok(archive.length >= 10, 'the ten existing Topics must be migrated');
  assert.ok(index.days.length >= 1, 'at least one dated Topics set is required');
  const current = JSON.parse(fs.readFileSync(path.join(root, `data/topics/${index.days[0].file}`), 'utf8'));
  assert.deepEqual(new Set(current.items.map(item => item.category)), new Set(['industry', 'world', 'culture']));
  assert.ok(current.items.every(item => item.sourceUrl && item.summaryEn && item.summaryZh));
});

