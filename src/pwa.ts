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
            badge.className = 'w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0 shadow-sm';
            badge.innerHTML = '';
            badge.title = 'Çevrimiçi • Çevrimdışı Kullanıma Hazır (PWA)';
            badge.setAttribute('aria-label', 'PWA Çevrimdışı Hazır');
        } else {
            badge.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block shrink-0 shadow-sm';
            badge.innerHTML = '';
            badge.title = 'Çevrimdışı Mod (Tam Fonksiyonel)';
            badge.setAttribute('aria-label', 'PWA Çevrimdışı Mod');
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
