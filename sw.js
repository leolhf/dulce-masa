// ══════════════ SERVICE WORKER - PWA ══════════════
const CACHE_NAME = 'dulce-masa-v15';
const STATIC_CACHE = 'dulce-masa-static-v15';
const DYNAMIC_CACHE = 'dulce-masa-dynamic-v15';

// Archivos estáticos — rutas RELATIVAS para funcionar en cualquier subpath
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  // CSS modular
  './css/base.css',
  './css/nav.css',
  './css/dashboard.css',
  './css/autocomplete.css',
  './css/responsive.css',
  './css/components.css',
  // CAPA 0: Base
  './js/timezone.js',
  './js/globals.js',
  './js/helpers.js',
  './js/paginator.js',
  // CAPA 1: Datos y persistencia
  './js/data-init.js',
  './js/exportar.js',
  // CAPA 2: UI base y navegación
  './js/navigation.js',
  './js/pwa.js',
  // CAPA 3: Módulos de negocio
  './js/inventario.js',
  './js/recetas.js',
  './js/variaciones.js',
  './js/produccion.js',
  './js/costos.js',
  './js/gastos-fijos.js',
  './js/autocomplete.js',
  './js/ventas.js',
  './js/historial-autocomplete.js',
  './js/historial.js',
  './js/proveedores.js',
  './js/pedidos-calendario.js',
  './js/pedidos.js',
  // CAPA 4: Finanzas
  './js/extracciones.js',
  './js/prestamos-mod.js',
  './js/finanzas-kpi.js',
  './js/finanzas-tabs.js',
  './js/app-settings.js',
  './js/rentabilidad.js',
  './js/metas.js',
  './js/finanzas-extras.js',
  './js/core/capital-adjustment.js',
  './js/core/capital-ui.js',
  './js/core/capital-validator.js',
  './js/finanzas.js',
  './js/prestamos.js',
  // CAPA 5: Dashboard, estadísticas e integración
  './js/dashboard.js',
  './js/estadisticas.js',
  './js/google-drive.js',
  './js/nav-indicators.js',
  // CAPA 6: Inicialización
  './js/init.js',
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
