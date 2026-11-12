const CACHE_NAME = 'vaultcompress-v1';
const APP_SHELL = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './assets/vendor/tailwindcss.js',
    './assets/vendor/fontawesome.min.css',
    './assets/vendor/jszip.min.js',
    './assets/webfonts/fa-brands-400.woff2',
    './assets/webfonts/fa-brands-400.ttf',
    './assets/webfonts/fa-regular-400.woff2',
    './assets/webfonts/fa-regular-400.ttf',
    './assets/webfonts/fa-solid-900.woff2',
    './assets/webfonts/fa-solid-900.ttf',
    './assets/webfonts/fa-v4compatibility.woff2',
    './assets/webfonts/fa-v4compatibility.ttf'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName.startsWith('vaultcompress-') && cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) {
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
                    }
                    return response;
                })
                .catch(async () => (await caches.match(event.request)) || caches.match('./index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                }
                return response;
            });
        })
    );
});
