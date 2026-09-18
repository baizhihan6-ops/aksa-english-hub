const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'data', 'topics');
const index = JSON.parse(fs.readFileSync(path.join(root, 'index.json'), 'utf8'));
const archive = JSON.parse(fs.readFileSync(path.join(root, index.archiveFile), 'utf8'));
const errors = [];
if (archive.length < 10) errors.push('Fewer than 10 archived Topics');
const ids = new Set(archive.map(item => item.id));
for (const day of index.days) {
  const payload = JSON.parse(fs.readFileSync(path.join(root, day.file), 'utf8'));
  const categories = new Set(payload.items.map(item => item.category));
  for (const category of ['industry', 'world', 'culture']) if (!categories.has(category)) errors.push(`${day.date} missing ${category}`);
  for (const item of payload.items) {
    if (ids.has(item.id)) errors.push(`Duplicate topic id ${item.id}`);
    ids.add(item.id);
    if (!item.sourceUrl || !/^https:\/\//.test(item.sourceUrl)) errors.push(`Invalid source URL for ${item.id}`);
    if (!item.titleEn || !item.titleZh || !item.summaryEn || !item.summaryZh) errors.push(`Incomplete Topic ${item.id}`);
    if (!Array.isArray(item.vocabulary) || item.vocabulary.length < 8) errors.push(`Topic ${item.id} needs 8 vocabulary items`);
    if (!Array.isArray(item.questions) || item.questions.length !== 3) errors.push(`Topic ${item.id} needs 3 questions`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Topics valid: ${index.days.length} dated set(s), ${archive.length} archived items, ${ids.size} total IDs.`);

