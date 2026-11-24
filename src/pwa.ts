/**
 * Modern PWA & Ağ Durumu Yöneticisi
 * Workbox + Service Worker Yaşam Döngüsü, Güncelleme Bildirimi ve Çevrimdışı Önbellek Doğrulaması
 */

export let isCacheWarm = false;

export const OFFLINE_DEEP_PACK_CACHE_NAME = 'klinik-drug-catalog-cache';

/**
 * İlk açılış precache yükünü hafif tutmak için talep üzerine veya kullanıcı onayıyla
 * önbelleğe alınan ağır klinik arşiv dosyaları (~17.6 MB ham / ~4 MB GZIP).
 */
export const OFFLINE_DEEP_PACK_URLS: readonly string[] = [
    './data/clinical_monographs_master.json',
    './data/kub/kub_A.json',
    './data/kub/kub_B.json',
    './data/kub/kub_C.json',
    './data/kub/kub_D.json',
    './data/kub/kub_G.json',
    './data/kub/kub_H.json',
    './data/kub/kub_J.json',
    './data/kub/kub_L.json',
    './data/kub/kub_M.json',
    './data/kub/kub_N.json',
    './data/kub/kub_P.json',
    './data/kub/kub_R.json',
    './data/kub/kub_S.json',
    './data/kub/kub_V.json'
];

export interface OfflineDeepPackStatus {
    cachedCount: number;
    totalCount: number;
    isComplete: boolean;
}

export async function getOfflineDeepPackStatus(): Promise<OfflineDeepPackStatus> {
    const totalCount = OFFLINE_DEEP_PACK_URLS.length;
    if (typeof window === 'undefined' || typeof caches === 'undefined') {
        return { cachedCount: 0, totalCount, isComplete: false };
    }
    try {
        let cachedCount = 0;
        for (const url of OFFLINE_DEEP_PACK_URLS) {
            const hit = await caches.match(url, { ignoreSearch: true });
            if (hit) cachedCount++;
        }
        return {
            cachedCount,
            totalCount,
            isComplete: cachedCount >= totalCount
        };
    } catch {
        return { cachedCount: 0, totalCount, isComplete: false };
    }
}

export async function downloadOfflineDeepPack(
    onProgress?: (completed: number, total: number, currentUrl: string) => void
): Promise<OfflineDeepPackStatus> {
    const totalCount = OFFLINE_DEEP_PACK_URLS.length;
    if (typeof window === 'undefined' || typeof caches === 'undefined' || typeof fetch === 'undefined') {
        return { cachedCount: 0, totalCount, isComplete: false };
    }

    const cache = await caches.open(OFFLINE_DEEP_PACK_CACHE_NAME);
    let cachedCount = 0;

    for (const url of OFFLINE_DEEP_PACK_URLS) {
        try {
            const existing = await cache.match(url, { ignoreSearch: true });
            if (existing) {
                cachedCount++;
            } else {
                const res = await fetch(url);
                if (res && res.ok) {
                    await cache.put(url, res.clone());
                    cachedCount++;
                }
            }
        } catch {
            // ağ kesintisinde mevcut ilerlemeyi koru
        }
        onProgress?.(cachedCount, totalCount, url);
    }

    return {
        cachedCount,
        totalCount,
        isComplete: cachedCount >= totalCount
    };
}

export async function checkCacheWarming(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof caches === 'undefined') {
        return false;
    }
    try {
        // 1. Kritik ilaç veritabanı önbellekte var mı kontrol et (Workbox __WB_REVISION__ sorgu parametresi dahil)
        const match =
            await caches.match('./data/medicines.json', { ignoreSearch: true }) ||
            await caches.match('data/medicines.json', { ignoreSearch: true });
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
            } else if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
                window.location.reload();
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

    const isDev = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
    const badge = document.getElementById('badge-offline-status');
    let cacheWarmRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let cacheWarmAttempts = 0;
    const MAX_CACHE_WARM_ATTEMPTS = 12;

    function clearCacheWarmTimer(): void {
        if (cacheWarmRetryTimer !== null) {
            clearTimeout(cacheWarmRetryTimer);
            cacheWarmRetryTimer = null;
        }
    }

    async function updateNetworkStatus(): Promise<void> {
        clearCacheWarmTimer();
        if (!badge) return;

        if (!navigator.onLine) {
            badge.className = 'w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block shrink-0 shadow-sm';
            badge.innerHTML = '';
            badge.title = 'Çevrimdışı (Yerel Veritabanı Aktif)';
            badge.setAttribute('aria-label', 'Yerel Veritabanı Aktif');
            return;
        }

        if (isDev) {
            badge.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-sm';
            badge.innerHTML = '';
            badge.title = 'Geliştirme Ortamı Aktif (SW Devre Dışı)';
            badge.setAttribute('aria-label', 'Geliştirme Ortamı Aktif');
            return;
        }

        // Çevrimiçi durum: Önbellek hazır mı (Cache Warming) denetle
        if (!isCacheWarm) {
            badge.className = 'w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping inline-block shrink-0 shadow-sm';
            badge.innerHTML = '';
            badge.title = 'Önbellek Hazırlanıyor...';
            badge.setAttribute('aria-label', 'PWA Önbellek Hazırlanıyor');

            const warmed = await checkCacheWarming();
            if (!navigator.onLine) {
                void updateNetworkStatus();
                return;
            }
            if (warmed) {
                cacheWarmAttempts = 0;
                badge.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-sm';
                badge.title = 'Yerel Veritabanı Aktif';
                badge.setAttribute('aria-label', 'Yerel Veritabanı Aktif');
            } else if (cacheWarmAttempts < MAX_CACHE_WARM_ATTEMPTS && 'serviceWorker' in navigator && typeof caches !== 'undefined') {
                cacheWarmAttempts++;
                cacheWarmRetryTimer = setTimeout(() => {
                    cacheWarmRetryTimer = null;
                    void updateNetworkStatus();
                }, 2500);
            } else {
                badge.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-sm';
                badge.title = 'Çevrimiçi (Yerel Veri Aktif)';
                badge.setAttribute('aria-label', 'Çevrimiçi');
            }
        } else {
            badge.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-sm';
            badge.innerHTML = '';
            badge.title = 'Yerel Veritabanı Aktif';
            badge.setAttribute('aria-label', 'Yerel Veritabanı Aktif');
        }
    }

    window.addEventListener('online', () => {
        cacheWarmAttempts = 0;
        void updateNetworkStatus();
    });
    window.addEventListener('offline', () => {
        void updateNetworkStatus();
    });
    void updateNetworkStatus();

    if ('serviceWorker' in navigator) {
        if (isDev) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                for (const reg of regs) {
                    reg.unregister();
                    console.log('[PWA DEV] Yerel geliştirme ortamında eski Service Worker devreden çıkarıldı:', reg.scope);
                }
            });
        } else {
            // Service Worker kontrolcü değişimi: yalnızca mevcut bir kontrolcü güncellendiğinde yenile (ilk kurulumda yenileme yapma)
            let hasController = Boolean(navigator.serviceWorker.controller);
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!hasController) {
                    hasController = true;
                    void updateNetworkStatus();
                    return;
                }
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });

            // Aktif kayıt
            navigator.serviceWorker.register('./sw.js', { scope: './' }).then(registration => {
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
