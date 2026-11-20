import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'data/medicines.json',
        'data/clinical_monographs.json',
        'data/atc_knowledge_base.json',
        'data/atc_icd10_sozluk.json',
        'data/ddi_matrix.json',
        'data/data_manifest.json'
      ],
      manifest: {
        name: 'Klinik Karar Destek Asistanı',
        short_name: 'KlinikPWA',
        description: 'Çevrimdışı Klinik Anamnez, Dozaj ve Triyaj Asistanı',
        start_url: './index.html',
        scope: './',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Çekirdek uygulama kabuğu (JS/CSS/HTML) otomatik precache edilir;
        // JSON/PNG varlıkları mükerrer kayıt oluşmaması için yalnızca yukarıdaki includeAssets ile yönetilir.
        // Ağır katmanlar (clinical_monographs_master.json 8.1 MB + 14 kub_*.json 9.5 MB)
        // talep üzerine CacheFirst + isteğe bağlı tam çevrimdışı paket indiricisi ile önbelleklenir.
        globPatterns: ['**/*.{js,css,html,svg}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'klinik-drug-catalog-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 yıl çevrimdışı önbellekleme
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    open: false
  },
  build: {
    chunkSizeWarningLimit: 2500
  }
});
