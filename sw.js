// ══════════════ SERVICE WORKER - PWA ══════════════
const CACHE_NAME = 'dulce-masa-v14';
const STATIC_CACHE = 'dulce-masa-static-v14';
const DYNAMIC_CACHE = 'dulce-masa-dynamic-v14';

// Archivos estáticos — rutas RELATIVAS para funcionar en cualquier subpath
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/helpers.js',
  './js/init.js',
  './js/dashboard.js',
  './js/inventario.js',
  './js/recetas.js',
  './js/produccion.js',
  './js/ventas.js',
  './js/pedidos.js',
  './js/historial.js',
  './js/proveedores.js',
  './js/finanzas.js',
  './js/prestamos.js',
  './js/estadisticas.js',
  './js/costos.js',
  './js/gastos-fijos.js',
  './js/exportar.js',
  './js/google-drive.js',
  './js/autocomplete.js',
  './js/pwa.js',
  './js/nav-indicators.js',
  './js/navigation.js',
  './js/variaciones.js',
  './js/data-init.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&family=DM+Sans:wght@300;400;500&display=swap'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker instalado');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Cacheando archivos estáticos');
        // Cachear uno a uno para no fallar si alguno no existe
        return Promise.allSettled(
          STATIC_ASSETS.map(url => cache.add(url).catch(e => console.warn('No se pudo cachear:', url)))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activado');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch — Network First con fallback a cache
self.addEventListener('fetch', event => {
  const { request } = event;

  // Ignorar requests no-GET y extensiones de Chrome
  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cachear respuesta válida del server
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: buscar en cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // Fallback para páginas HTML
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Escuchar mensaje para forzar actualización
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
