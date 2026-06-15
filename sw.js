const CACHE = 'freezone-v1';
const PRECACHE = ['/css/styles.min.css', '/css/variables.css', '/js/main.min.js', '/pages/home.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(PRECACHE.map((u) => c.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((k) =>
      Promise.all(k.filter((v) => v !== CACHE).map((v) => caches.delete(v)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  if (request.headers.get('Accept')?.includes('text/html')) {
    e.respondWith(networkFirst(request));
  } else if (/\.(css|js|json|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(request));
  } else {
    e.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const hit = await caches.match(request);
    return hit || new Response('', { status: 503 });
  }
}
