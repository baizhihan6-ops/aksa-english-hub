const CACHE_NAME = 'aksa-hub-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// Install: cache core files
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('AKSA Hub: caching core files');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('AKSA Hub: deleting old cache', name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: keep the app shell fresh, fall back to cache when offline.
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  var indexUrl = new URL('./index.html', self.location.href).toString();

  if (url.origin === self.location.origin) {
    var isPageRequest = event.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
    if (isPageRequest) {
      event.respondWith(
        fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
              cache.put(indexUrl, response.clone());
            });
          }
          return response;
        }).catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match(indexUrl);
          });
        })
      );
      return;
    }

    // Stale-while-revalidate for same-origin assets.
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        var fetched = fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(function() {
          return cached;
        });
        return cached || fetched;
      })
    );
  } else {
    // Cross-origin: network-only (fonts, etc.)
    event.respondWith(fetch(event.request));
  }
});
