# 🩺 Klinik Karar Destek Asistanı (PWA)

Acil servis, poliklinik ve yoğun bakım nöbetlerinde hekimlerin zihinsel yükünü hafifletmek, karmaşık medikal hesaplama hatalarını engellemek ve hasta notlarını standartlaştırmak için geliştirilmiş **offline-first (çevrimdışı öncelikli)** PWA uygulaması. Modern akordiyon (dikey) UI mimarisi ile mobil cihazlarda rahat ve hızlı kullanım sağlar.

---

## ✨ Öne Çıkan Özellikler ve Motorlar

- **🧬 Biyometri & eGFR Motoru:** 
  - Erişkinlerde **CKD-EPI 2021** formülü ile eGFR hesabı.
  - Pediatrik yaş grubunda **Bedside Schwartz** formülü ve Vücut Yüzey Alanı (BSA) hesabı.
- **📊 Büyüme Persentil & Pediatrik Motor:** 
  - Yaşa ve cinsiyete göre boy, kilo persentil analizi.
  - En güncel **2025 T.C. Sağlık Bakanlığı Ulusal Çocukluk Dönemi Aşılama Takvimi** (6'lı Karma, KKK ek doz güncellemeleri dahil).
  - Şurup dozaj (Parasetamol, İbuprofen, vb.) hesaplamaları.
- **🚨 NEWS2 & PEWS Acil Triyaj Skorlama:** 
  - Vital bulgulara göre otomatik risk skorlaması ve klinik uyarı bayrakları (Hipoksi, Hipotansiyon, Anormal Nabız vb.).
- **💧 İdame Sıvı ve Sodyum Düzeltme Motoru:** 
  - **Holliday-Segar** metodolojisi ve ateşe bağlı sıvı ihtiyacı düzeltmesi.
  - ODS riskini önlemek için modern kılavuzlara uygun (24 saatte max 8 mEq/L) **Sodyum açığı ve infüzyon hesabı**.
- **🔥 Yanık ve Cerrahi (Alvarado, Parkland) Motoru:** 
  - **ATLS 10. Baskı (2018)** uyumlu güncel Parkland formülü (Yetişkinler 2mL/kg, Çocuklar 3mL/kg başlangıç).
  - Yara yerine göre otomatik **sütür materyali ve alınma zamanı** rehberi.
- **🤰 Obstetrik ve Jinekoloji Motoru:**
  - SAT'a göre Tahmini Doğum Tarihi (TDT) ve Gestasyonel Hafta (GH) hesabı.
  - Bishop Skoru ve Preeklampsi kriterleme algoritması.
- **🧪 Majör İyonlar & Kan Gazı (ABG/VBG) Motoru:** 
  - Asit-Baz analizi, primer ve sekonder kompanzasyon hesabı (Winter formülü).
  - Düzeltilmiş (Albümine göre) kalsiyum hesabı.
- **🧠 Glasgow Koma Skalası (GCS):** 
  - Erişkin ve Pediatrik (<2 yaş) modlarla beyin hasar derecesi skorlaması.
- **💊 TİTCK İlaç Veritabanı & Muadil Motoru:** 
  - Cihazda çevrimdışı (IndexedDB) çalışan 10.000+ TİTCK ilaç listesi.
  - Akıllı **Muadil arama** ve reçeteleme sistemi. 
  - Temel İlaç Listesindeki ilaçlar için anlık **Pediatrik** ve **Neonatal** rozet gösterimleri.
- **📋 Otomatik SOAP Hasta Notu:** 
  - Tüm hesaplamaları ve seçilen tedavi protokollerini anında önizlenebilir, tek tıkla kopyalanabilir klinik nota dönüştürür.

---

## 🤖 AI (Yapay Zekâ) İle Geliştirme Süreci

Bu proje, bir tıp öğrencisinin/hekimin klinik ihtiyaçları ve saha gözlemleri doğrultusunda **Yapay Zekâ (AI) iş birliğiyle** sıfırdan tasarlanmış ve kodlanmıştır.

- **Klinik Algoritmalar & Medikal Matematik:** Tüm tıp formülleri (ATLS 10 Parkland, 2025 Aşı Takvimi, CKD-EPI 2021, Holliday-Segar vb.), AI iş birliğiyle en güncel kılavuzlar ve literatür referans alınarak bağımsız (decoupled) JavaScript motorlarına dönüştürülmüştür.
- **Yazılım Mimarisi & UX:** İstemci tarafında sıfır bağımlılıkla çalışan, PWA standartlarına uygun, KVKK/GDPR uyumlu ve çevrimdışı öncelikli, modern dikey akordiyon (`<details>`) UI yapısı AI yönlendirmeleriyle inşa edilmiştir.

---

## 🚀 Kurulum & Kullanım

Uygulama **Progressive Web App (PWA)** standartlarında geliştirilmiştir. Herhangi bir uygulama mağazasına ihtiyaç duymadan doğrudan tarayıcınız üzerinden kullanabilir veya cihazınıza *"Ana Ekrana Ekle"* seçeneğiyle yükleyebilirsiniz.

🔗 **PWA Uygulama Bağlantısı:** 
https://vellidr.github.io/klinik-pwa-deneme/

---

## 🔒 Gizlilik & KVKK Uyumsuzluğu

- **Sıfır Sunucu Kaydı:** Girilen hiçbir hasta verisi, biyometri veya vital bulgu dış sunuculara gönderilmez.
- **Yerel İşleme:** Tüm hesaplamalar ve veritabanı sorguları tamamen kullanıcının cihazında (browser/IndexedDB) yerel olarak gerçekleşir.

---

## ⚠️ Yasal Uyarı & Sorumluluk Reddi

Bu uygulama yalnızca **klinik karar destek (decision support) ve eğitim** amacıyla geliştirilmiştir. Hesaplanan biyometri, eGFR, sıvı, insülin, infüzyon ve dozaj verileri bir hekimin profesyonel tıbbi kanaati veya teşhisi yerine geçmez. Tüm sonuçlar uygulamayı kullanan sağlık profesyoneli tarafından doğrulanmalıdır.