const CACHE_NAME = 'netgamer-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/network-test.js',
    '/js/chart-manager.js',
    '/js/report-generator.js',
    '/js/monetization.js',
    '/manifest.json',
    '/icon.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    // Ignorar requisições de API para não cachear os testes
    if (event.request.url.includes('/api/test/')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;
                return fetch(event.request).catch(() => {
                    // Ignora silenciosamente se uma requisição externa (como anúncios) falhar offline
                    console.warn('Network request failed for:', event.request.url);
                });
            })
    );
});
