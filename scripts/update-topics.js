const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TOPICS_DIR = path.join(ROOT, 'data', 'topics');
const INDUSTRY_FEED = 'https://news.google.com/rss/search?q=%22diesel+generator%22+OR+%22backup+power%22+data+center&hl=en-US&gl=US&ceid=US:en';
const WORLD_FEED = 'https://news.un.org/feed/subscribe/en/news/all/rss.xml';

function beijingDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    [...url.searchParams.keys()].forEach(key => { if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key); });
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    return String(value || '').trim().toLowerCase().replace(/\/$/, '');
  }
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

function pickCandidate(items, keywordPattern, seen) {
  return items.find(item => {
    const text = `${item.title || ''} ${item.summary || ''}`;
    return item.link && keywordPattern.test(text) && !seen.has(normalizeUrl(item.link));
  }) || null;
}

function unavailableTopic(category, date, sourceUrl) {
  const labels = { industry: 'Genset & Standby Power', world: 'International Focus', culture: 'Festival & Culture' };
  const titles = { industry: 'No suitable genset report was verified today', world: 'No suitable international report was verified today', culture: 'No suitable festival or culture item was verified today' };
  const zhTitles = { industry: '今日暂无经核实的发电机组行业报道', world: '今日暂无经核实的国际热点报道', culture: '今日暂无经核实的节日文化内容' };
  return {
    id: `${date}-${category}-unavailable`, date, category, label: labels[category], status: 'unavailable',
    titleEn: titles[category], titleZh: zhTitles[category], sourceName: 'Configured source feed', sourceUrl, publishedAt: date, fetchedAt: new Date().toISOString(),
    summaryEn: 'No suitable source-backed item passed the relevance and duplicate checks today. The previous successful topic remains available in the archive.',
    summaryZh: '今天没有通过相关性、来源和重复检查的合格内容。上一期有效内容仍保留在历史库中。',
    vocabulary: [
      { en: 'source-backed', zh: '有来源支持的' }, { en: 'relevance check', zh: '相关性检查' }, { en: 'duplicate', zh: '重复项' }, { en: 'archive', zh: '档案库' },
      { en: 'verify', zh: '核实' }, { en: 'reliable source', zh: '可靠来源' }, { en: 'publication date', zh: '发布日期' }, { en: 'quality threshold', zh: '质量门槛' }
    ],
    questions: [
      { question: 'Why is it better to publish no item than an irrelevant item?', starter: 'Quality matters because...' },
      { question: 'How should a team verify an industry report?', starter: 'The team should check...' },
      { question: 'What makes a news source reliable for business discussion?', starter: 'A reliable source usually...' }
    ]
  };
}

async function fetchFeed(url) {
  const { XMLParser } = require('fast-xml-parser');
  const response = await fetch(url, { headers: { 'user-agent': 'AKSA-English-Corner-Topics/1.0' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Feed returned ${response.status}: ${url}`);
  const xml = await response.text();
  const parsed = new XMLParser({ ignoreAttributes: false, trimValues: true }).parse(xml);
  const channel = parsed.rss && parsed.rss.channel;
  const rawItems = channel && channel.item ? channel.item : [];
  return (Array.isArray(rawItems) ? rawItems : [rawItems]).map(item => ({
    title: stripHtml(typeof item.title === 'object' ? item.title['#text'] : item.title),
    link: typeof item.link === 'object' ? item.link['#text'] : item.link,
    summary: stripHtml(item.description || item.summary || item['content:encoded']),
    publishedAt: item.pubDate || item.published || item.updated || '',
    source: typeof item.source === 'object' ? item.source['#text'] : item.source || (channel.title || 'Source feed')
  })).filter(item => item.title && item.link);
}

function commonQuestions(category) {
  if (category === 'industry') return [
    { question: 'What does this development mean for generator-set suppliers?', starter: 'For suppliers, the main implication is...' },
    { question: 'Which technical detail should a customer clarify first?', starter: 'The first detail to confirm is...' },
    { question: 'How could this affect a project quotation?', starter: 'The quotation may need to include...' }
  ];
  return [
    { question: 'Why is this issue receiving international attention?', starter: 'This issue matters internationally because...' },
    { question: 'Which stakeholders are most affected?', starter: 'The most affected stakeholders include...' },
    { question: 'What should companies monitor next?', starter: 'Companies should watch...' }
  ];
}

function buildNewsTopic(candidate, category, date) {
  const industry = category === 'industry';
  const safeSummary = candidate.summary && candidate.summary.length > 80 ? candidate.summary.slice(0, 700) : `The latest report, “${candidate.title},” has been selected for today's English Corner because it is relevant, source-backed and suitable for workplace discussion.`;
  return {
    id: `${date}-${category}-${candidate.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52)}`,
    date, category, label: industry ? 'Genset & Standby Power' : 'International Focus', status: 'complete',
    titleEn: candidate.title, titleZh: industry ? `发电机组行业动态：${candidate.source}` : `国际热点：${candidate.source}`,
    sourceName: candidate.source || 'Source feed', sourceUrl: candidate.link, publishedAt: candidate.publishedAt || date, fetchedAt: new Date().toISOString(),
    summaryEn: safeSummary,
    summaryZh: industry ? '本条内容通过发电机组、备用电源或数据中心供电关键词筛选，可用于讨论客户需求、可靠性和市场变化。请结合英文摘要与原始来源核实具体事实。' : '本条内容来自配置的国际新闻源，适合练习说明事件背景、相关方和后续影响。请结合英文摘要与原始来源核实具体事实。',
    vocabulary: industry ? [
      { en: 'generator set', zh: '发电机组' }, { en: 'backup power', zh: '备用电源' }, { en: 'rated output', zh: '额定输出' }, { en: 'reliability', zh: '可靠性' },
      { en: 'power demand', zh: '电力需求' }, { en: 'project scope', zh: '项目范围' }, { en: 'lead time', zh: '交期' }, { en: 'market outlook', zh: '市场展望' }
    ] : [
      { en: 'international response', zh: '国际反应' }, { en: 'policy priority', zh: '政策重点' }, { en: 'stakeholder', zh: '相关方' }, { en: 'negotiation', zh: '谈判' },
      { en: 'cooperation', zh: '合作' }, { en: 'long-term impact', zh: '长期影响' }, { en: 'public statement', zh: '公开声明' }, { en: 'follow-up action', zh: '后续行动' }
    ],
    questions: commonQuestions(category)
  };
}

function cultureTopic(date) {
  const key = date.slice(5);
  const events = {
    '03-08': ['International Women’s Day', '国际妇女节', 'https://www.un.org/en/observances/womens-day'],
    '04-22': ['International Mother Earth Day', '国际地球母亲日', 'https://www.un.org/en/observances/earth-day'],
    '05-01': ['International Workers’ Day', '国际劳动节', 'https://www.ilo.org/'],
    '06-05': ['World Environment Day', '世界环境日', 'https://www.un.org/en/observances/environment-day'],
    '09-21': ['International Day of Peace', '国际和平日', 'https://www.un.org/en/observances/international-day-peace'],
    '12-10': ['Human Rights Day', '人权日', 'https://www.un.org/en/observances/human-rights-day']
  };
  const event = events[key] || ['Cross-cultural business: confirming expectations', '跨文化商务：确认彼此预期', 'https://www.un.org/en/observances/list-days-weeks'];
  return {
    id: `${date}-culture-${event[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, date, category: 'culture', label: 'Festival & Culture', status: 'complete',
    titleEn: event[0], titleZh: event[1], sourceName: 'United Nations observances', sourceUrl: event[2], publishedAt: date, fetchedAt: new Date().toISOString(),
    summaryEn: events[key] ? `${event[0]} offers a useful starting point for respectful workplace discussion. Learners can practise explaining the observance, comparing traditions and asking open questions without making assumptions.` : 'Cross-cultural teamwork is clearer when people confirm deadlines, decision roles, feedback styles and the meaning of urgent. This topic helps learners replace assumptions with short, respectful questions.',
    summaryZh: events[key] ? `${event[1]}适合作为职场英语讨论的文化切入点。学习者可以练习介绍纪念日、比较不同传统，并用开放式问题避免主观假设。` : '跨文化团队应明确截止时间、决策角色、反馈方式以及“紧急”的具体含义。本话题帮助学习者用简短、尊重的问题代替主观猜测。',
    vocabulary: [
      { en: 'cultural context', zh: '文化背景' }, { en: 'shared expectation', zh: '共同预期' }, { en: 'open question', zh: '开放式问题' }, { en: 'respectful', zh: '尊重的' },
      { en: 'clarify', zh: '澄清' }, { en: 'assumption', zh: '假设' }, { en: 'custom', zh: '习俗' }, { en: 'common ground', zh: '共同点' }
    ],
    questions: [
      { question: 'How would you introduce this topic to an overseas colleague?', starter: 'I would begin by explaining...' },
      { question: 'Which question helps avoid cultural assumptions?', starter: 'A useful question is...' },
      { question: 'How can teams confirm expectations more clearly?', starter: 'Teams can be clearer by...' }
    ]
  };
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function rebuildBootstrap(index, archive) {
  const days = {};
  for (const entry of index.days) days[entry.date] = readJson(path.join(TOPICS_DIR, entry.file));
  fs.writeFileSync(path.join(TOPICS_DIR, 'bootstrap.js'), `(function(root){root.AKSA_TOPICS_BOOTSTRAP=${JSON.stringify({ index, archive, days })};})(typeof globalThis!=='undefined'?globalThis:this);\n`);
}

async function updateTopics() {
  const date = process.env.TOPICS_DATE || beijingDate();
  const indexFile = path.join(TOPICS_DIR, 'index.json');
  const archiveFile = path.join(TOPICS_DIR, 'archive.json');
  const index = readJson(indexFile);
  const archive = readJson(archiveFile);
  if (index.days.some(item => item.date === date)) {
    console.log(`${date} already exists; no historical data was changed.`);
    return;
  }
  const seen = new Set();
  archive.forEach(item => { if (item.sourceUrl) seen.add(normalizeUrl(item.sourceUrl)); });
  for (const entry of index.days) {
    const payload = readJson(path.join(TOPICS_DIR, entry.file));
    payload.items.forEach(item => { if (item.sourceUrl) seen.add(normalizeUrl(item.sourceUrl)); });
  }
  let industry = null;
  let world = null;
  try { industry = pickCandidate(await fetchFeed(INDUSTRY_FEED), /diesel generator|generator set|backup power|standby power|data cent(?:er|re)/i, seen); } catch (error) { console.warn(error.message); }
  if (industry) seen.add(normalizeUrl(industry.link));
  try { world = pickCandidate(await fetchFeed(WORLD_FEED), /./, seen); } catch (error) { console.warn(error.message); }
  const items = [
    industry ? buildNewsTopic(industry, 'industry', date) : unavailableTopic('industry', date, INDUSTRY_FEED),
    world ? buildNewsTopic(world, 'world', date) : unavailableTopic('world', date, WORLD_FEED),
    cultureTopic(date)
  ];
  const payload = { date, generatedAt: new Date().toISOString(), status: items.some(item => item.status === 'unavailable') ? 'partial' : 'complete', items };
  const file = `${date}.json`;
  fs.writeFileSync(path.join(TOPICS_DIR, file), `${JSON.stringify(payload, null, 2)}\n`);
  index.days.unshift({ date, file, status: payload.status, count: items.length });
  index.lastSuccessfulUpdate = payload.generatedAt;
  fs.writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`);
  rebuildBootstrap(index, archive);
  console.log(`Appended ${file} with ${items.length} Topics.`);
}

module.exports = { normalizeUrl, stripHtml, pickCandidate, unavailableTopic, buildNewsTopic, cultureTopic, updateTopics };

if (require.main === module) updateTopics().catch(error => { console.error(error); process.exit(1); });

