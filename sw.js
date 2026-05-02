const CACHE_NAME = 'aksa-hub-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// 1. 安装阶段：强行把核心文件塞进手机本地缓存
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 运行阶段：拦截网络请求，优先从手机本地拿数据（实现离线秒开）
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果本地有缓存，直接秒开；如果没有，再耗费流量去网上去拉取
        return response || fetch(event.request);
      })
  );
});