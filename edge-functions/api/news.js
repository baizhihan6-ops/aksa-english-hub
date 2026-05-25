import { XMLParser } from 'fast-xml-parser';

const FEEDS = [
  { url: 'http://www.chinadaily.com.cn/rss/china_rss.xml',    src: 'China Daily', cat: 'China' },
  { url: 'http://www.chinadaily.com.cn/rss/world_rss.xml',    src: 'China Daily', cat: 'World' },
  { url: 'http://www.chinadaily.com.cn/rss/bizchina_rss.xml', src: 'China Daily', cat: 'Business' },
  { url: 'http://www.chinanews.com.cn/rss/english.xml',        src: 'chinanews',   cat: 'General' },
];

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function stripHtml(str) {
  return String(str || '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

async function fetchFeed(feed) {
  const res = await fetch(feed.url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return [];
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, htmlEntities: true });
  const parsed = parser.parse(xml);
  const raw = parsed?.rss?.channel?.item;
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : [raw];
  return items.slice(0, 5).map(item => ({
    title:   stripHtml(item.title).slice(0, 140),
    summary: stripHtml(item.description || item['content:encoded'] || '').slice(0, 180),
    pubDate: item.pubDate || item['dc:date'] || new Date().toUTCString(),
    src:     feed.src,
    cat:     feed.cat,
  })).filter(i => i.title.length > 5);
}

export default async function onRequest(context) {
  const request = context.request || context;
  const method  = String(request.method || '').toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const results  = await Promise.allSettled(FEEDS.map(fetchFeed));
  const articles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 8);

  return new Response(JSON.stringify({ articles, updated: new Date().toISOString() }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
