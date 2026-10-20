/**
 * Modern PWA & Ağ Durumu Yöneticisi
 * Workbox + Service Worker Yaşam Döngüsü ve Canlı Çevrimdışı/Çevrimiçi Takibi
 */

export function setupPWA(): void {
    if (typeof window === 'undefined') return;

    const badge = document.getElementById('badge-offline-status');

    function updateNetworkStatus(): void {
        if (!badge) return;
        if (navigator.onLine) {
            badge.className = 'text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1.5';
            badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> <span class="hidden sm:inline">Çevrimiçi •</span> PWA Hazır';
            badge.title = 'Çevrimiçi bağlantı aktif — Çevrimdışı kullanım için tüm veriler önbellekte hazır';
        } else {
            badge.className = 'text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1.5';
            badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Çevrimdışı Mod (Tam Fonksiyonel)';
            badge.title = 'İnternet bağlantısı yok - Tüm motorlar ve ilaç kataloğu yerel önbellekten çalışıyor';
        }
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
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
            navigator.serviceWorker.ready.then(registration => {
                console.log('[PWA] Service Worker aktif ve kapsamda:', registration.scope);
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('[PWA] Yeni sürüm indirildi, bir sonraki ziyarette güncellenecek.');
                            }
                        });
                    }
                });
            }).catch(err => {
                console.warn('[PWA] Service Worker hazır olma hatası:', err);
            });
        }
    }
}
