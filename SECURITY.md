# Güvenlik Politikası (Security Policy)

**Proje:** Klinik Karar Destek Asistanı (`VelliDR/klinik-pwa-deneme`)  
**Canlı Uygulama:** [https://vellidr.github.io/klinik-pwa-deneme/](https://vellidr.github.io/klinik-pwa-deneme/)

---

## 1. Desteklenen Sürümler

Güvenlik güncellemeleri ve yamalar yalnızca aktif ana dal (`main`) üzerinden yayımlanan güncel sürüm için sağlanmaktadır:

| Sürüm / Dal | Destek Durumu | Açıklama |
| :--- | :--- | :--- |
| `3.0.x` (`main` & GitHub Pages) | Destekleniyor | Aktif geliştirme ve güvenlik yamaları uygulanır |
| `< 3.0.0` (eski anlık görüntüler) | Desteklenmiyor | Lütfen güncel sürüme geçiniz |

---

## 2. Güvenlik Açığı Nasıl Bildirilir?

> [!CAUTION]
> **Lütfen tespit ettiğiniz güvenlik açıklarını herkese açık bir GitHub Issue veya Pull Request olarak paylaşmayınız.**

Olası bir güvenlik açığı bulduğunuzda aşağıdaki gizli kanallardan birini kullanınız:

1. **GitHub Private Vulnerability Reporting (Önerilen):**
   - Depo sayfasında **Security → Advisories → Report a vulnerability** adımını izleyerek özel bildirim oluşturabilirsiniz.
2. **Doğrudan E-posta Bildirimi:**
   - **Alıcı:** Veli Özkul (VelliDR) — `veliozkul45@gmail.com`
   - **Konu:** `[SECURITY] klinik-pwa-deneme — <kısa özet>`

### Bildiriminizde Neler Yer Almalı?
- Etkilenen dosya, modül veya bileşen (ör. `src/utils/domUtils.ts`, `src/utils/barcodeScanner.ts`, `vite.config.ts`, bağımlılık adı).
- Açığın nasıl yeniden üretilebileceğine dair adım adım açıklama veya zararsız kavram kanıtı (PoC).
- Olası etki değerlendirmesi (ör. DOM XSS, Service Worker önbellek zehirlenmesi, hatalı harici yönlendirme).
- *(Zorunlu)* Bildirimin gerçek hasta verisi içermediğinden emin olunuz.

### Yanıt Süreci
Bu proje bireysel bir açık kaynak geliştirici tarafından gönüllü olarak sürdürülmektedir. En iyi çaba (*best-effort*) esasıyla:
- Bildirimin alındığının **72 saat içinde** onaylanması,
- İlk teknik incelemenin **7 gün içinde** paylaşılması,
- Doğrulanan açıklar için yama yayımlandıktan sonra koordineli açıklama (*coordinated disclosure*) yapılması hedeflenir.

---

## 3. Mimari Güvenlik ve Gizlilik Modeli

Klinik Karar Destek Asistanı tasarım gereği **%100 istemci taraflı (client-side)** çalışan statik bir Progressive Web App (PWA) olarak kurgulanmıştır:

- **Sunucu Tarafı Hasta Verisi İşleme Yoktur:** Hasta yaş, kilo, laboratuvar, anamnez, SOAP notu ve reçete bilgileri kullanıcının tarayıcısı dışına gönderilmez.
- **Sıfır Telemetri ve Üçüncü Taraf İzleyici:** Uygulamada analitik betiği, reklam ağı veya izleme çerezi bulunmaz.
- **Yerel Tarayıcı Depolaması (`localStorage`, `IndexedDB`, `CacheStorage`):**
  - `localStorage`: Yalnızca tema (`klinik_theme_mode`), yazı ölçeği (`klinik_font_scale`), özel iş istasyonu paketleri ve isteğe bağlı A4 yazdırma hekim başlığı gibi tercih verilerini tutar.
  - `IndexedDB` (`v27`) ve Workbox `CacheStorage`: Yalnızca statik ilaç kataloğu (`public/data/*.json`) ve uygulama kabuğu varlıklarını önbellekler.
  - **Paylaşılan Bilgisayar Uyarısı:** Ortak kullanılan hastane/poliklinik terminallerinde muayene bitiminde *"Yeni Hasta"* sıfırlaması yapılması ve gerekiyorsa tarayıcı oturum/depolama verilerinin temizlenmesi önerilir.
- **Kamera ve Barkod İşleme (`src/utils/barcodeScanner.ts`):** Kamera erişimi (`navigator.mediaDevices.getUserMedia`) yalnızca kullanıcı *"Barkod / İTS Karekod Tara"* düğmesine bastığında istenir; video kareleri cihaz belleğinde yerel olarak çözümlenir, kaydedilmez ve dış sunucuya aktarılmaz.
- **XSS ve Çıktı Güvenliği:** Dinamik HTML parçaları `src/utils/domUtils.ts` içindeki `escapeHtml` yardımcısıyla arındırılır; harici bağlantılar (`titck.gov.tr` vb.) `rel="noopener noreferrer"` niteliğiyle açılır.

---

## 4. Kapsam İçi ve Kapsam Dışı Konular

### Güvenlik Bildirimi Kapsamında Olanlar
- DOM/HTML enjeksiyonu (XSS), `escapeHtml` atlatmaları veya güvensiz `innerHTML` kullanımı.
- Barkod / İTS karekod (`itsBarcodeParser.ts`), URL parametresi veya yerel JSON ayrıştırıcılarındaki tehlikeli girdi işleme hataları.
- Service Worker (`vite-plugin-pwa` / `src/pwa.ts`) önbellek bütünlüğü veya istenmeyen harici URL yönlendirme açıkları.
- Üretim bağımlılıklarındaki (`package.json` — ör. `@zxing/browser`) sömürülebilir güvenlik açıkları.

### Güvenlik Açığı Sayılmayan Durumlar (Lütfen İlgili Issue Şablonunu Kullanın)
- Klinik hesaplama formülleri, kılavuz eşikleri veya dozaj yorumları hakkındaki akademik tartışmalar ([Klinik Bildirim Formu](.github/ISSUE_TEMPLATE/clinical-guideline-report.yml)).
- TİTCK ruhsat listesi, SGK EK-4/A ödeme durumu veya piyasa ilaç fiyat anlık görüntülerinin güncelliği ([İlaç Verisi Formu](.github/ISSUE_TEMPLATE/drug-data-report.yml)).
- Tarayıcı Geliştirici Araçları (DevTools) konsoluna kullanıcının kendisinin zararlı kod yapıştırması (*Self-XSS*).

---

## 5. Tıbbi Cihaz Olmama ve Sorumluluk Notu

Bu yazılım eğitim ve klinik karar destek amacıyla **"OLDUĞU GİBİ" (AS-IS)** sunulur; tıbbi cihaz (SaMD) değildir. Klinik kararlar sorumlu hekimin bağımsız değerlendirmesine ve resmi KÜB/KT belgelerine dayanmalıdır (bkz. [`LICENSE`](LICENSE) ve [`DATA_NOTICE.md`](DATA_NOTICE.md)).

<details>
<summary>English Summary</summary>

**Please do not report security vulnerabilities via public GitHub issues.**
- **Supported Version:** `3.0.x` (`main` branch / GitHub Pages).
- **Private Reporting:** Use **GitHub Security Advisories** (`Security -> Advisories -> Report a vulnerability`) or email `veliozkul45@gmail.com` with subject `[SECURITY] klinik-pwa-deneme`.
- **Architecture:** 100% client-side PWA with zero telemetry; patient inputs, local SOAP notes, and on-demand camera barcode scans stay strictly on the user's device. Please never include real patient data in security reports.

</details>
