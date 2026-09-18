const words = require('../data/words.js');
const phrases = require('../data/phrases.js');
const lessons = require('../data/lessons.js');

const errors = [];
if (words.length < 1882) errors.push(`Vocabulary count is ${words.length}`);
if (new Set(words.map(item => item.id)).size !== words.length) errors.push('Vocabulary IDs are not unique');
for (const word of words) {
  if (!word.term || !word.zh || !word.ipa || !word.example || !word.example.en || !word.example.zh) errors.push(`Incomplete word: ${word.id}`);
}
if (phrases.length < 2000) errors.push(`Phrase count is ${phrases.length}`);
if (new Set(phrases.map(item => item.en.toLowerCase())).size !== phrases.length) errors.push('Phrase text is not unique');
const lineCount = lessons.reduce((total, lesson) => total + lesson.lines.length, 0);
if (lessons.length < 14 || lineCount < 100) errors.push(`Dialogue count is ${lessons.length} lessons / ${lineCount} lines`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Content valid: ${words.length} words, ${phrases.length} phrases, ${lessons.length} lessons, ${lineCount} dialogue lines.`);

