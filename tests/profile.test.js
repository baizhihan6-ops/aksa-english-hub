const test = require('node:test');
const assert = require('node:assert/strict');

const Profile = require('../profile.js');

test('imports the old aksa_user_data profile into a version 3 store', () => {
  const oldProfile = JSON.stringify({ name: 'Jason Bo', dept: 'Domestic Sales' });
  const result = Profile.migrate(null, oldProfile);
  assert.equal(result.version, 3);
  assert.deepEqual(result.profile, { name: 'Jason Bo', department: 'Domestic Sales' });
});

test('preserves version 2 learning records while adding a profile', () => {
  const v2 = JSON.stringify({ version: 2, progress: { w1: { mastery: 80 } }, sessions: [], dailySummaries: {}, favorites: ['w1'], incomplete: null });
  const result = Profile.migrate(v2, JSON.stringify({ name: 'Mei', dept: 'Sales' }));
  assert.equal(result.progress.w1.mastery, 80);
  assert.deepEqual(result.favorites, ['w1']);
  assert.deepEqual(result.profile, { name: 'Mei', department: 'Sales' });
});

test('clearing learning data keeps the employee profile', () => {
  const result = Profile.clearLearning({ version: 3, profile: { name: 'Mei', department: 'Sales' }, progress: { w1: {} }, sessions: [{}], dailySummaries: {}, favorites: ['w1'], incomplete: {} });
  assert.deepEqual(result.profile, { name: 'Mei', department: 'Sales' });
  assert.deepEqual(result.progress, {});
  assert.deepEqual(result.sessions, []);
});
