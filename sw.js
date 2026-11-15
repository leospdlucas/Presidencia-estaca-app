// Service worker do painel. A versão e a lista de arquivos são preenchidas
// por scripts/build.mjs a cada deploy — não edite à mão.
const CACHE = 'presidencia-estaca-__VERSAO__';
const ASSETS = __ASSETS__;

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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();

  // Limpa e regenera o cache do app (chamado durante sincronização manual)
  if (e.data?.type === 'CLEAR_AND_REFRESH_CACHE') {
    e.waitUntil(
      caches.delete(CACHE)
        .then(() => caches.open(CACHE))
        .then(cache => Promise.all(ASSETS.map(url =>
          fetch(url, { cache: 'no-store' }).then(res => { if (res.ok) cache.put(url, res); }).catch(() => {})
        )))
        .then(() => self.clients.matchAll())
        .then(clients => clients.forEach(c => c.postMessage({ type: 'CACHE_REFRESHED' })))
    );
  }
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API: sempre rede e nunca cache (as respostas são pessoais e exigem login)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'sem_conexao' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // Navegação: rede primeiro (pega versão nova), cache se estiver offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put('/', copia));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Arquivos versionados (?v=hash): cache primeiro
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
      }
      return res;
    }))
  );
});
