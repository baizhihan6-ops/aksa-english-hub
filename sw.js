const CACHE_NAME = 'aksa-english-corner-v9';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './assets/site.css',
  './assets/aksa-diesel-generator-hero-bw.webp',
  './app.js',
  './word-challenge.js',
  './topics.js',
  './data/words.js',
  './data/phrases.js',
  './data/lessons.js',
  './data/topics/bootstrap.js',
  './data/topics/index.json',
  './data/topics/archive.json',
  './data/topics/2026-09-19.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const navigation = event.request.mode === 'navigate';
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || (navigation ? caches.match('./index.html') : undefined)))
  );
});
