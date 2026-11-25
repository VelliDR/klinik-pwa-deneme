# Erişilebilirlik Beyanı ve Rehberi (Accessibility)

**Proje:** Klinik Karar Destek Asistanı (`VelliDR/klinik-pwa-deneme`)  
**Canlı Uygulama:** [https://vellidr.github.io/klinik-pwa-deneme/](https://vellidr.github.io/klinik-pwa-deneme/)

---

## 1. Taahhüt ve Hedef

Klinik Karar Destek Asistanı; yoğun acil servis nöbetlerinde, gündüz poliklinik aydınlatmasında, mobil hasta başı kullanımında ve masaüstü iş istasyonlarında tüm sağlık çalışanları ve tıp öğrencileri tarafından rahatça kullanılabilmeyi amaçlar.

Projenin erişilebilirlik hedefi, arayüz bileşenlerini aşamalı olarak **WCAG 2.1 Seviye AA** ilkeleriyle (*algılanabilir, kullanılabilir, anlaşılabilir, sağlam*) tam uyumlu hâle getirmektir.

---

## 2. Projede Mevcut Erişilebilirlik Özellikleri

Aşağıdaki özellikler güncel kod tabanında doğrudan uygulanmıştır:

- **6 Kademeli Yazı Boyutu Ölçekleme (`src/utils/fontScaleManager.ts`):**
  - Kullanıcı arayüzün kök yazı boyutunu `%85`, `%92`, `%100`, `%108`, `%116` ve `%125` kademeleri arasında `A-` / `A+` düğmeleriyle ölçekleyebilir; tercih tarayıcıda (`localStorage`) saklanır.
  - Sınır kademelerinde ilgili düğmelerde `disabled` ve `aria-disabled` durumları güncellenir.
  - `src/styles/main.css` içinde `overflow-x: clip`, `min-width: 0` ve `overflow-wrap: anywhere` kuralları ile büyütülmüş metinlerde yatay kaydırma taşması önlenir.
- **Çift Tema & Klinik Okunabilirlik (`src/utils/themeManager.ts`, `src/styles/main.css`):**
  - Gece nöbetlerinde göz yorgunluğunu azaltan varsayılan **Karanlık Arduvaz Tema** (`#0f172a`) ve gündüz poliklinik ışığında okunabilirliği artıran yüksek kontrastlı **Aydınlık Tema** (`html.light-theme`) sunulur.
  - Sayısal klinik çıktılar, zamanlayıcılar ve referans tablolarında hizalı okuma için `tabular-nums` (`font-variant-numeric: tabular-nums`) kullanılır.
- **Hareket Hassasiyeti Desteği (`prefers-reduced-motion`):**
  - `src/styles/main.css` içinde `@media (prefers-reduced-motion: reduce)` kuralı ile modal giriş animasyonları (`.animate-in`) devre dışı bırakılır.
- **Klavye Kısayolları ve Alternatif Giriş Yolları:**
  - **`Ctrl+K` / `Cmd+K` (`src/utils/quickSwitcher.ts`, `src/controllers/workstationController.ts`):** Hızlı Komut Paleti ile 24 hedef arasında `ArrowUp` / `ArrowDown` ve `Enter` tuşlarıyla gezilerek ilgili klinik kart açılır, görünür yapılır ve kart içi ilk girdi alanına odaklanılır.
  - **`Escape`:** Açık modallar (`#modal-quick-switcher`, `#modal-soap-sheet`, `#modal-prescription-print`, `#modal-emergency-protocols`, `#modal-drug-monograph`, `#modal-drug-equivalents`, `#modal-vaccine-tables`, `#modal-surgery-reference`, `#modal-barcode-scanner`) ve veri anlık görüntü baloncuğu (`#popover-price-date-bubble`) `Escape` tuşu ile kapatılabilir.
  - **Kamerasız / Fiziksel Alternatif (`src/utils/barcodeScanner.ts`):** İlaç barkod ve İTS karekod tarama penceresinde kameraya alternatif olarak USB barkod okuyucu ve manuel metin girişi (`Enter` ile ekleme) desteklenir.
- **Semantik HTML ve ARIA İşaretlemeleri (`index.html`, `src/controllers/`):**
  - Sayfa dili `<html lang="tr">` olarak tanımlıdır ve `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` semantik bölgeleri ile yerel `<details>`/`<summary>` açılır kartlar kullanılır.
  - Modallarda `role="dialog"` ve `aria-modal="true"` (ayrıca `aria-labelledby` veya `aria-label`), monograf sekmelerinde `aria-selected`, arama filtre çiplerinde `aria-pressed`, özel paket açılır düğmesinde `aria-expanded`, veri tarihi baloncuklarında `aria-haspopup="dialog"`, dekoratif SVG ikonlarda `aria-hidden="true"` ve ikon butonlarında `.sr-only` / `aria-label` kullanılır.
- **Mobil Dokunmatik & Yazdırma Desteği (`src/styles/main.css`):**
  - Küçük ekranlarda (`<= 640px`) form alanlarında iOS Safari istemsiz yakınlaştırmasını engelleyen `max(16px, 1rem)` yazı boyutu, dokunmatik düğmelerde `min-height: 40px` hedef alanı ve A4 reçete / aşı tablosu yazdırma stilleri (`@media print`) tanımlıdır.

---

## 3. Bilinen Sınırlamalar ve İyileştirme Yol Haritası

Aşağıdaki noktalar mevcut sürümde tespit edilmiş eksikler olup gelecek iyileştirmeler için önceliklendirilmektedir:

1. **Form Etiket İlişkilendirmesi (`label for`):** `index.html` içindeki form kontrollerinin önemli bir bölümünde henüz açık `for`+`id` eşleştirmesi yerine görsel başlık/yerleşim kullanılmaktadır (`387` girdi elemanının yalnızca `19` tanesinde açık `label for=` bulunmaktadır).
2. **İçeriğe Atlama Bağlantısı (Skip Link):** Klavye ve ekran okuyucu kullanıcılarının üst çubuk ile sol menüyü atlayarak doğrudan `#clinical-workspace` alanına geçebileceği *"Ana içeriğe atla"* bağlantısı henüz eklenmemiştir.
3. **Modal Odak Tuzağı ve Odak İadesi:** Açık modallar `Escape` ile kapanabilse de tam `Tab` odak döngüsü (*focus trap*) ve modal kapandığında odağın tetikleyici düğmeye otomatik dönüşü henüz tüm modallarda uygulanmamıştır. Ayrıca Hızlı Komut Paleti öğeleri tam `role="listbox"`/`role="option"` veya `<button>` semantiğine dönüştürülmeyi beklemektedir.
4. **Canlı Bölgeler (`aria-live`):** Sağ sütundaki canlı klinik güvenlik uyarıları (`#panel-clinical-alerts`) ve PWA güncelleme bildirimi (`#pwa-update-toast`) için ekran okuyucu duyurusu sağlayan `aria-live` nitelikleri henüz eklenmemiştir.
5. **Yazı Ölçekleme Klavye Kısayolu:** Başlıktaki `A-` / `A+` düğmeleri `title` ipucunda `(Alt+-)` / `(Alt++)` gösterse de şu an yalnızca tıklama/dokunma olaylarına bağlıdır; doğrudan klavye dinleyicisi henüz eklenmemiştir.
6. **Otomatik Erişilebilirlik Testleri:** CI hattında (`deploy.yml`) henüz otomatik `axe-core` / Lighthouse WCAG kontrast veya ekran okuyucu (NVDA, VoiceOver, TalkBack) doğrulaması çalıştırılmamaktadır.

---

## 4. Katkı Sağlayanlar İçin Beklentiler

Arayüz veya bileşen katkısı gönderirken lütfen şu kurallara uyunuz (ayrıca bkz. [`CONTRIBUTING.md`](CONTRIBUTING.md)):
- Yeni tüm `<input>`, `<select>` ve `<textarea>` öğelerine benzersiz `id` ve eşleşen `<label for="...">` (veya zorunlu durumlarda `aria-label`) ekleyiniz.
- Etkileşimli eylemlerde `<div>` yerine yerel `<button type="button">` kullanınız ve klavye odak halkasını (`focus-visible` / focus ring) kaldırmayınız.
- Renk kodlu klinik uyarıları (kırmızı/amber/yeşil) her zaman açık metin etiketi veya metinsel durum rozeti ile destekleyiniz.
- Değişikliklerinizi hem **Karanlık** hem **Aydınlık** temada ve `%125` yazı ölçeğinde kontrol ediniz.

---

## 5. Erişilebilirlik Engeli Bildirme

Klavye erişimi, ekran okuyucu uyumu, renk kontrastı, yazı ölçekleme veya mobil kullanım sırasında bir engelle karşılaşırsanız lütfen bildirin:

- **GitHub Issue:** [Teknik Hata / Arayüz Önerisi Formu](.github/ISSUE_TEMPLATE/bug-or-feature.yml) üzerinden başlıkta `[Erişilebilirlik]` belirterek cihaz, tarayıcı ve yardımcı teknoloji bilgisini paylaşabilirsiniz.
- **E-posta:** `veliozkul45@gmail.com` (`Veli Özkul — VelliDR`)

> Lütfen erişilebilirlik bildirimlerinize hiçbir zaman gerçek hasta verisi eklemeyiniz.

<details>
<summary>English Summary</summary>

**Klinik Karar Destek Asistanı (Klinik PWA)** aims toward **WCAG 2.1 Level AA** alignment across desktop and mobile bedside clinical workflows.
- **Implemented:** 6-step persisted font scaling (`85%`–`125%`) with horizontal overflow protection, Dark/Light themes, `@media (prefers-reduced-motion: reduce)`, `Ctrl+K`/`Cmd+K` Quick Switcher, `Escape` modal dismissal, `role="dialog"` / `aria-modal="true"` / `aria-selected` / `aria-pressed` / `aria-expanded`, USB/manual barcode fallback, and A4 `@media print` layouts.
- **Known Limitations:** Incomplete explicit `<label for>` associations across all inputs, no skip-to-content link yet, no full modal focus trap/return or `aria-live` alert announcements yet, unbound `Alt+-`/`Alt++` shortcuts, and no automated `axe-core` checks in CI yet.
- **Feedback:** Report barriers via `.github/ISSUE_TEMPLATE/bug-or-feature.yml` (prefix `[Erişilebilirlik]`) or email `veliozkul45@gmail.com`.

</details>
