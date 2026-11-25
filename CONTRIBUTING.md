# Katkı Sağlama Rehberi (Contributing Guide)

**Klinik Karar Destek Asistanı (Klinik PWA)** projesine katkıda bulunmayı düşündüğünüz için teşekkür ederiz. Bu belge; klinik algoritmalardan ilaç verisi düzeltmelerine, arayüz/erişilebilirlik iyileştirmelerinden testlere kadar her tür katkının güvenli, doğrulanabilir ve proje hukukuyla uyumlu biçimde yapılabilmesi için hazırlanmıştır.

> [!IMPORTANT]
> Katkı sunmadan önce [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), [`DATA_NOTICE.md`](DATA_NOTICE.md), [`LICENSE`](LICENSE) ve [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md) belgelerini gözden geçiriniz.

---

## 1. Temel Kurallar: Gizlilik, Temiz-Oda Veri ve Lisans

1. **Hasta Gizliliği (KVKK / GDPR — Sıfır Gerçek Hasta Verisi):**
   - Issue, Pull Request, test verisi, commit mesajı veya ekran görüntülerine kesinlikle gerçek hastaya ait ad, T.C. kimlik numarası, doğum tarihi, protokol numarası ya da kimliği belirlenebilir veri eklemeyiniz.
   - Örnek vakalar ve test senaryoları yalnızca sentetik/anonimleştirilmiş değerler kullanmalıdır (bkz. `src/engines/syntheticCases.ts`).
2. **Temiz-Oda (Clean-Room) Veri Politikası:**
   - Bu proje kapalı/ticari kaynakları (UpToDate/Lexidrug, BNF, Stockley's, Micromedex, DrugBank) ve yeniden dağıtımı yasaklı ham dökümleri (KEGG ham dump, CredibleMeds ham listesi vb.) **içermez**.
   - İlaç, etkileşim (DDI), KÜB veya dozaj katkılarında yalnızca **resmi düzenleyici kaynaklara** (TİTCK KÜB/KT, SGK EK-4/A, OpenFDA/DailyMed SPL, FDA CYP Tablosu, ANSM 2023 arşivi, NLM RxNorm/LiverTox/LactMed) veya **hakemli açık klinik kılavuzlara** dayanınız.
3. **Üç Katmanlı Lisans Yapısı:**
   - **Yazılım Kodu (`src/`, `scripts/`, `tests/`, `index.html`):** [PolyForm Noncommercial License 1.0.0](LICENSE) (`PolyForm-Noncommercial-1.0.0`)
   - **Özgün Türkçe Klinik İçerik, PDDI Monografları ve Dokümantasyon:** [CC BY-NC-SA 4.0](LICENSE-CONTENT.md)
   - **Üçüncü Parti Resmi / Akademik Veriler (`public/data/`):** Kendi kaynak koşullarına tabidir ([DATA_NOTICE.md](DATA_NOTICE.md)).
   - Katkı göndererek kod katkınızın `PolyForm-Noncommercial-1.0.0`, özgün klinik metin/dokümantasyon katkınızın `CC BY-NC-SA 4.0` altında yayımlanmasına onay vermiş olursunuz.
4. **Unvan ve Sorumluluk Şeffaflığı:**
   - Dokümantasyonda veya arayüzde orijinal yazar için gerçek dışı unvan (*ör. mezuniyet öncesi `Dr.` ifadesi*) veya resmi tıbbi cihaz (SaMD) onayı izlenimi veren ifadeler kullanmayınız (`tests/test_governance_and_manifest.ts` tarafından da denetlenir).

---

## 2. Nasıl Katkı Sağlayabilirsiniz?

### A. Hata veya Kılavuz / İlaç Verisi Bildirimi Açma
Kod yazmadan da mevcut [Issue Şablonları](.github/ISSUE_TEMPLATE/config.yml) üzerinden çok değerli katkılar sağlayabilirsiniz:
- **Klinik Hesaplama / Kılavuz Bildirimi** ([`clinical-guideline-report.yml`](.github/ISSUE_TEMPLATE/clinical-guideline-report.yml)): Formül hatası, kılavuz eşiği veya erratum güncellemesi, yeni klinik skor önerisi.
- **İlaç Verisi / KÜB / DDI Bildirimi** ([`drug-data-report.yml`](.github/ISSUE_TEMPLATE/drug-data-report.yml)): TİTCK kaydı, ICD-10 endikasyon/kontrendikasyon eşleşmesi, SGK/fiyat veya etkileşim (DDI) uyuşmazlığı.
- **Teknik Hata / Arayüz / Erişilebilirlik Önerisi** ([`bug-or-feature.yml`](.github/ISSUE_TEMPLATE/bug-or-feature.yml)): Mobil/masaüstü arayüz hatası, PWA önbellek sorunu, klavye/ekran okuyucu erişilebilirlik engeli.

### B. Kod, Klinik Motor, Test veya Dokümantasyon Katkısı
1. Depoyu **Fork** edin ve `main` dalından anlamlı bir geliştirme dalı oluşturun:
   - `feat/...` (yeni klinik modül veya özellik)
   - `fix/...` (hesaplama, UI, DDI veya PWA düzeltmesi)
   - `docs/...` (dokümantasyon veya erişilebilirlik iyileştirmesi)
   - `test/...` (regresyon veya karşı-olgusal test eklemesi)
2. Yerel ortamınızı kurup doğrulamaları çalıştırın.
3. Değişikliklerinizi PR şablonu ([`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md)) ile gönderin.

---

## 3. Geliştirme Ortamı ve Komutlar

### Gereksinimler
- **Node.js 22+** ve **npm** (CI ortamıyla uyumlu sürüm; bkz. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
- *(İsteğe bağlı)* Python 3: Yalnızca `scripts/` altındaki ham veri senkronizasyon/zenginleştirme betikleri için gerekir.

### Kurulum ve Çalıştırma
```bash
# 1. Kendi fork'unuzu klonlayın
git clone https://github.com/<kullanici-adiniz>/klinik-pwa-deneme.git
cd klinik-pwa-deneme

# 2. Bağımlılıkları yükleyin
npm ci

# 3. Yerel geliştirme sunucusunu başlatın (http://localhost:5173)
npm run dev
```

### Doğrulama Komutları (`package.json`)
Her Pull Request öncesinde aşağıdaki komutların tamamının hatasız geçmesi gerekir:
```bash
# TypeScript tip denetimi
npm run typecheck

# 15 modüler test paketinin tamamı (motorlar, DDI, PWA, yönetişim, regresyon)
npm test

# Üretim PWA derlemesi (dist/ çıktısı)
npm run build
```

İsteğe bağlı ek komutlar:
```bash
# Yalnızca TypeScript testlerini çalıştır
npm run test:ts

# İlaç kataloğu, klinik master ve DDI matrisi PWA katmanlarını yeniden üret
npm run data:build
```

---

## 4. Proje Mimarisi ve Kod Standartları

| Dizin / Dosya | Görev |
| :--- | :--- |
| `src/engines/` | 22 klinik karar destek motoru, `guidelineRegistry.ts`, `declarativeScoreEngine.ts`, `dataManifestEngine.ts`, `surgery/` |
| `src/controllers/` | Modüler DOM olay ve UI denetleyicileri (`workstationController.ts`, `safetyAlertsController.ts`, vb.) |
| `src/workers/` | Arka plan Web Worker arama katmanı (`drugSearchWorker.ts`) |
| `src/db/` | İstemci taraflı katalog & PDF köprüsü (`titckIndexedDB.ts`) |
| `src/utils/` | `domUtils.ts` (`escapeHtml`), `fontScaleManager.ts`, `themeManager.ts`, `quickSwitcher.ts`, `soapGenerator.ts`, `barcodeScanner.ts`, `prescriptionPrinter.ts` |
| `src/styles/main.css` | Tailwind katmanı, Aydınlık/Karanlık tema kuralları ve `@media print` A4 yazdırma stili |
| `public/data/` | Çalışma zamanı JSON varlıkları, `data_manifest.json` ve 14 adet `kub/kub_{A..V}.json` parçası |
| `tests/` | 15 modüler doğrulama paketi (`npm test` ile çalıştırılır) |

### Dikkat Edilmesi Gereken Mimari Kurallar
- **Kılavuz Atfı Zorunluluğu:** Yeni veya güncellenmiş klinik modül kartları [`src/engines/guidelineRegistry.ts`](src/engines/guidelineRegistry.ts) içinde birincil kılavuz, yıl ve hakemli kaynakla eşleştirilmelidir.
- **Yatak Başında 15 Saniye Kuralı:** Varsayılan kart ekranı yalın tutulmalıdır; alternatif kılavuz sürümleri veya erratum kıyaslamaları ikincil açılır katmanlarda (`.surg-academic-control`, `<details>` veya kılavuz modalı) sunulmalıdır.
- **Güvenlik ve XSS Koruması:** Kullanıcı girdisi veya harici katalog verisi `innerHTML` içine yazılırken mutlaka [`escapeHtml`](src/utils/domUtils.ts) kullanılmalıdır.
- **Erişilebilirlik & Çift Tema:** Yeni UI bileşenleri hem varsayılan koyu temada hem `html.light-theme` aydınlık temada yeterli kontrast sağlamalı, form kontrollerinde açık `<label for="...">` ilişkilendirmesi ve klavye (`Escape` / odak) uyumu gözetilmelidir (bkz. [`ACCESSIBILITY.md`](ACCESSIBILITY.md)).
- **PWA & Veri Bütçesi:** `vite.config.ts` içindeki `includeAssets` ve `globPatterns` ayrımı (mükerrer precache kaydı oluşturmama) ile `tests/test_pwa_offline.ts` içindeki GZIP boyut bütçeleri korunmalıdır.
- **Depo Hijyeni (`.gitignore`):** Ham veri dökümleri (`turkiye_ilac_master_veritabani.json`, `*.xlsx`, `*.db`, `dist/`) sürüm kontrolüne eklenmemelidir.

---

## 5. Pull Request Kontrol Akışı

1. PR başlığını açıklayıcı tutun (örn. `fix(jaundice): AAP 2022 37w risk eşiği düzeltmesi`).
2. Klinik değişikliklerde kullandığınız kılavuz/DOI veya resmi TİTCK KÜB bölümünü belirtin ve ilgili testleri (`tests/`) ekleyin/güncelleyin.
3. GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) üzerinde derleme, `npm run typecheck` ve `npm test` adımlarının geçtiğinden emin olun.

<details>
<summary>English Summary</summary>

Thank you for considering contributing to **Klinik Karar Destek Asistanı (Klinik PWA)**!
- **Privacy & Clean-Room Data:** Never submit real patient data (KVKK/GDPR/PHI) or proprietary/closed clinical databases (UpToDate, BNF, Micromedex, DrugBank, etc.). Rely only on official public/regulatory sources or peer-reviewed guidelines.
- **Licensing:** Code contributions fall under `PolyForm-Noncommercial-1.0.0` (`LICENSE`), and original Turkish clinical content/docs under `CC BY-NC-SA 4.0` (`LICENSE-CONTENT.md`).
- **Local Verification (Node.js 22+):** Run `npm ci`, then verify changes with `npm run typecheck && npm test && npm run build` before opening a PR using `.github/PULL_REQUEST_TEMPLATE.md`.

</details>
