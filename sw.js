const CACHE = 'presidencia-estaca-v3.17.0';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Limpa e regenera o cache do app (chamado durante sincronização manual)
  if (e.data?.type === 'CLEAR_AND_REFRESH_CACHE') {
    e.waitUntil(
      caches.delete(CACHE).then(() =>
        caches.open(CACHE).then(cache =>
          Promise.all(
            ASSETS.map(url =>
              fetch(url, { cache: 'no-store' }).then(res => {
                if (res.ok) cache.put(url, res);
              }).catch(() => {})
            )
          )
        )
      ).then(() => {
        self.clients.matchAll().then(clients =>
          clients.forEach(client =>
            client.postMessage({ type: 'CACHE_REFRESHED' })
          )
        );
      })
    );
  }
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API — sempre rede, sem cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'sem_conexao' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // App — cache primeiro, depois rede
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
