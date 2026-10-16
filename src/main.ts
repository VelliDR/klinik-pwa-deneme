// ============================================================================
// KLİNİK KARAR DESTEK ASİSTANI - VİTE & TYPESCRIPT ANA GİRİŞ NOKTASI
// ============================================================================
import './styles/main.css';

// TypeScript klinik uygulama motoru ve UI başlatıcı
import './app';
import { setupPWA } from './pwa';

// PWA yaşam döngüsü ve ağ durumu takibini başlat
setupPWA();

console.log('[KlinikPWA] Vite + TypeScript altyapısı başarıyla yüklendi.');

