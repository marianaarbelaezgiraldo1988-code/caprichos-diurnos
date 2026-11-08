const CACHE_NAME = 'dulce-equilibrio-v6';
const PRECACHE_URLS = ["./antojos creativos/index.html", "./assets/hero.svg", "./assets/img/Pfresa-creativo.jpg", "./assets/img/galleta-cacao.jpg", "./assets/img/galleta-creativa.jpg", "./assets/img/galleta-mantequilla.jpg", "./assets/img/galleta-vainilla.jpg", "./assets/img/galletas-chocolate.jpg", "./assets/img/mini-panqueques.jpg", "./assets/img/mousse-chocolate.jpg", "./assets/img/mousse-fresa.jpg", "./assets/img/napoleon-limon.jpg", "./assets/img/postre-napoleon.jpg", "./assets/img/postre-saludable-p.jpg", "./assets/img/postres-portada.jpg", "./assets/img/torta-avena.jpg", "./assets/img/torta-banano.jpg", "./assets/img/torta-naranja.jpg", "./assets/img/torta-vainilla.jpg", "./consejos/index.html", "./contactanos/index.html", "./css/style.css", "./ejercicios/index.html", "./galletas/index.html", "./index.html", "./js/catalogo.js", "./js/script.js", "./juego/assets/carretera.png", "./juego/assets/enemy1.png", "./juego/assets/enemy2.png", "./juego/assets/enemy3.png", "./juego/assets/fondo.jpg", "./juego/assets/raccoon1.png", "./juego/assets/tronco.jpg", "./juego/assets/tronco.png", "./juego/game.js", "./juego/index.html", "./juego/style.css", "./offline.html", "./postres/index.html", "./tortas/index.html"];
const scopeURL = self.registration.scope;
const absolute = (path) => new URL(path, scopeURL).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Guardamos cada archivo por separado: un recurso opcional ausente
    // no debe impedir que se instale el modo sin conexión.
    await Promise.all(PRECACHE_URLS.map(async (path) => {
      const url = absolute(path);
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) await cache.put(url, response);
        else console.warn('No se pudo guardar en caché:', url, response.status);
      } catch (error) {
        console.warn('No se pudo guardar este archivo:', path, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith('dulce-equilibrio-') && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const requestURL = new URL(request.url);
  if (requestURL.origin !== self.location.origin) return;

  // El panel de administración y la API nunca deben guardarse en caché.
  if (requestURL.pathname.startsWith('/admin') || requestURL.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        const path = requestURL.pathname;
        // El iframe de la pantalla sin conexión debe poder abrir el juego
        // guardado, en vez de recibir otra copia de offline.html.
        if (path.endsWith('/juego/') || path.endsWith('/juego/index.html')) {
          const gamePage = await caches.match(request) ||
            await caches.match(absolute('./juego/index.html'));
          if (gamePage) return gamePage;
        }
        if (path.endsWith('/offline.html')) {
          const offlinePage = await caches.match(request) ||
            await caches.match(absolute('./offline.html'));
          if (offlinePage) return offlinePage;
        }
        const offlinePage = await caches.match(absolute('./offline.html'));
        if (offlinePage) return offlinePage;
        return new Response('No hay conexión y la página sin conexión no está disponible todavía.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      return new Response('Recurso no disponible sin conexión.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
