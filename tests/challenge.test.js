const test = require('node:test');
const assert = require('node:assert/strict');

const challenge = require('../word-challenge.js');

test('mastery scoring follows the approved values and clamps to 0-100', () => {
  assert.equal(challenge.updateMastery(20, 'tile', true), 26);
  assert.equal(challenge.updateMastery(20, 'listening', true), 28);
  assert.equal(challenge.updateMastery(20, 'typed', true), 32);
  assert.equal(challenge.updateMastery(5, 'typed', false), 0);
  assert.equal(challenge.updateMastery(96, 'typed', true), 100);
});

test('mastery tiers and review intervals are deterministic', () => {
  assert.equal(challenge.masteryTier(0), 'new');
  assert.equal(challenge.masteryTier(25), 'learning');
  assert.equal(challenge.masteryTier(50), 'familiar');
  assert.equal(challenge.masteryTier(75), 'mastered');
  assert.equal(challenge.reviewDays(10), 1);
  assert.equal(challenge.reviewDays(30), 3);
  assert.equal(challenge.reviewDays(60), 7);
  assert.equal(challenge.reviewDays(90), 14);
});

test('question mode adapts spelling difficulty and falls back without TTS', () => {
  assert.equal(challenge.resolveQuestionType('spelling', 20, true), 'tile');
  assert.equal(challenge.resolveQuestionType('spelling', 80, true), 'typed');
  assert.equal(challenge.resolveQuestionType('listening', 50, false), 'typed');
  assert.ok(['tile', 'typed', 'listening'].includes(challenge.resolveQuestionType('mixed', 20, true)));
});

test('distractors are unique and never repeat the answer', () => {
  const words = [
    { id: 'a', term: 'alternator', category: 'technical' },
    { id: 'b', term: 'radiator', category: 'technical' },
    { id: 'c', term: 'regulator', category: 'technical' },
    { id: 'd', term: 'contactor', category: 'technical' },
    { id: 'e', term: 'meeting', category: 'office' }
  ];
  const choices = challenge.buildChoices(words[0], words, () => 0.25);
  assert.equal(choices.length, 4);
  assert.equal(new Set(choices.map(item => item.id)).size, 4);
  assert.equal(choices.filter(item => item.id === 'a').length, 1);
});

