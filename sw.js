const CACHE_NAME = 'klinik-pwa-v8';

const ASSETS_TO_CACHE = [
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './js/app.js',
    './js/state.js',
    './js/drugEngine.js',
    './js/db/titckIndexedDB.js',
    './js/engines/biometricsEngine.js',
    './js/engines/percentileEngine.js',
    './js/engines/infusionEngine.js',
    './js/engines/endocrineEngine.js',
    './js/engines/bloodGasEngine.js',
    './js/engines/calciumEngine.js',
    './js/engines/pediatricEngine.js',
    './js/engines/ironEngine.js',
    './js/engines/surgeryEngine.js',
    './js/engines/obgynEngine.js',
    './js/engines/cardiacEngine.js',
    './js/engines/triageEngine.js',
    './js/engines/labGuideEngine.js',
    './js/engines/fluidEngine.js',
    './js/engines/thrombosisEngine.js',
    './js/engines/nephroToxEngine.js',
    './js/engines/neonatologyEngine.js',
    './js/engines/safetyPrescriptionEngine.js',
    './js/utils/soapGenerator.js',
    './data/medicines.json'
];

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Kuruluyor...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Statik dosyalar önbelleğe alınıyor...');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Aktifleştiriliyor...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Eski önbellek siliniyor:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return networkResponse;
            }).catch(() => {
                console.warn('[Service Worker] İstek başarısız oldu (Çevrimdışı duruma takıldı).');
            });
        })
    );
});
