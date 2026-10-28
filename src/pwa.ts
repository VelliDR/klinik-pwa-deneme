/**
 * Modern PWA & Ağ Durumu Yöneticisi
 * Workbox + Service Worker Yaşam Döngüsü, Güncelleme Bildirimi ve Çevrimdışı Önbellek Doğrulaması
 */

export let isCacheWarm = false;

export async function checkCacheWarming(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof caches === 'undefined') {
        return false;
    }
    try {
        // 1. Kritik ilaç veritabanı önbellekte var mı kontrol et
        const match = await caches.match('data/medicines.json') || await caches.match('./data/medicines.json');
        if (match) {
            isCacheWarm = true;
            return true;
        }

        // 2. CacheStorage anahtarlarını denetle
        const keys = await caches.keys();
        if (keys.length > 0 && keys.some(k => k.includes('drug') || k.includes('workbox') || k.includes('precache'))) {
            isCacheWarm = true;
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

export function showUpdatePrompt(registration: ServiceWorkerRegistration): HTMLElement | null {
    if (typeof document === 'undefined') return null;

    let toast = document.getElementById('pwa-update-toast');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'pwa-update-toast';
    toast.className = 'fixed bottom-4 right-4 z-50 max-w-md bg-slate-900 border border-sky-500/80 rounded-2xl shadow-2xl p-4 flex items-start gap-3 text-slate-100 backdrop-blur-md bg-opacity-95';
    toast.innerHTML = `
        <div class="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
            <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </div>
        <div class="flex-1 text-xs">
            <div class="font-bold text-sm text-sky-300">Yeni Güncelleme Hazır</div>
            <p class="mt-1 text-slate-300 leading-relaxed">Yeni klinik algoritmalar ve güncel ilaç veritabanı indirildi. Hemen uygulamak için güncelleyiniz.</p>
            <div class="mt-3 flex items-center gap-2">
                <button id="pwa-btn-refresh" type="button" class="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg shadow-sm transition-all text-xs">
                    Şimdi Güncelle
                </button>
                <button id="pwa-btn-dismiss" type="button" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs">
                    Daha Sonra
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(toast);

    const btnRefresh = document.getElementById('pwa-btn-refresh');
    const btnDismiss = document.getElementById('pwa-btn-dismiss');

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            toast?.remove();
        });
    }

    if (btnDismiss) {
        btnDismiss.addEventListener('click', () => {
            toast?.remove();
        });
    }

    return toast;
}

export function setupPWA(): void {
    if (typeof window === 'undefined') return;

    const badge = document.getElementById('badge-offline-status');

    async function updateNetworkStatus(): Promise<void> {
        if (!badge) return;

        if (!navigator.onLine) {
            badge.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block shrink-0 shadow-sm';
            badge.innerHTML = '';
            badge.title = 'Çevrimdışı Mod (Tam Fonksiyonel)';
            badge.setAttribute('aria-label', 'PWA Çevrimdışı Mod');
            return;
        }

        // Çevrimiçi durum: Önbellek hazır mı (Cache Warming) denetle
        if (!isCacheWarm) {
            badge.className = 'w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block shrink-0 shadow-sm';
            badge.innerHTML = '';
            badge.title = 'Çevrimiçi • Önbellek Hazırlanıyor...';
            badge.setAttribute('aria-label', 'PWA Önbellek Hazırlanıyor');

            const warmed = await checkCacheWarming();
            if (warmed) {
                badge.className = 'w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0 shadow-sm';
                badge.title = 'Çevrimiçi • Çevrimdışı Kullanıma Hazır (PWA)';
                badge.setAttribute('aria-label', 'PWA Çevrimdışı Hazır');
            } else {
                // Henüz indirilmediyse 2.5 saniye sonra tekrar dene
                setTimeout(updateNetworkStatus, 2500);
            }
        } else {
            badge.className = 'w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0 shadow-sm';
            badge.innerHTML = '';
            badge.title = 'Çevrimiçi • Çevrimdışı Kullanıma Hazır (PWA)';
            badge.setAttribute('aria-label', 'PWA Çevrimdışı Hazır');
        }
    }

    window.addEventListener('online', () => { updateNetworkStatus(); });
    window.addEventListener('offline', () => { updateNetworkStatus(); });
    updateNetworkStatus();

    if ('serviceWorker' in navigator) {
        if (import.meta.env.DEV) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                for (const reg of regs) {
                    reg.unregister();
                    console.log('[PWA DEV] Yerel geliştirme ortamında eski Service Worker devreden çıkarıldı:', reg.scope);
                }
            });
        } else {
            // Service Worker kontrolcü değişimi (SKIP_WAITING sonrası sayfayı otomatik yenile)
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });

            // Aktif kayıt veya manuel kayıt
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('[PWA] Service Worker kaydedildi ve aktif:', registration.scope);

                // Halihazırda bekleyen bir worker var mı?
                if (registration.waiting) {
                    showUpdatePrompt(registration);
                }

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[PWA] Yeni sürüm indirildi, bildirim gösteriliyor.');
                                showUpdatePrompt(registration);
                            }
                        });
                    }
                });
            }).catch(err => {
                console.warn('[PWA] Service Worker kayıt hatası:', err);
            });
        }
    }
}
