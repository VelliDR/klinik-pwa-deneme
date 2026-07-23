const CACHE_NAME = 'klinik-pwa-v1.2'; // Versiyon güncellendi

// Çevrimdışı Kullanım İçin Önbelleğe Alınacak Yerel Dosyalar (App Shell)
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './js/app.js',
    './js/state.js',
    './js/db.js',
    './js/drugEngine.js', // Eksik olan modül eklendi
    './js/engines/biometricsEngine.js',
    './js/engines/percentileEngine.js',
    './data/medicines.json'
];

// 1. SERVICE WORKER KURULUMU (INSTALL)
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Kuruluyor...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Statik dosyalar önbelleğe alınıyor...');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting()) // Yeni SW'nin hemen aktif olması için
    );
});

// 2. SERVICE WORKER AKTİFLEŞTİRME (ACTIVATE) & ESKİ CACHE TEMİZLİĞİ
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
        }).then(() => self.clients.claim()) // Tüm açık sekmeleri hemen devral
    );
});

// 3. İSTEKLERİ YAKALAMA VE ÇEVRİMDIŞI SUNMA (FETCH)
self.addEventListener('fetch', (event) => {
    // Sadece GET isteklerini önbelleğe al
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Önbellekte varsa doğrudan diskten ver
            if (cachedResponse) {
                return cachedResponse;
            }

            // Önbellekte yoksa ağa git ve yeni gelen cevabı da cache'e ekle
            return fetch(event.request).then((networkResponse) => {
                // Geçersiz veya hatalı yanıtları önbelleğe alma
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                // Sadece kendi origin'imizdeki veya geçerli yanıtları sakla
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