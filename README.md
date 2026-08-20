# 🩺 Klinik Karar Destek Asistanı (PWA)

Acil servis, poliklinik ve yoğun bakım nöbetlerinde hekimlerin zihinsel yükünü hafifletmek, karmaşık medikal hesaplama hatalarını engellemek ve hasta notlarını standartlaştırmak için geliştirilmiş **offline-first (çevrimdışı öncelikli)** PWA uygulaması.

---

## ✨ Öne Çıkan Özellikler ve Motorlar

- **🧬 Biyometri & eGFR Motoru:** 
  - Erişkinlerde **CKD-EPI 2021** formülü ile eGFR hesabı.
  - Pediatrik yaş grubunda **Bedside Schwartz** formülü ve Vücut Yüzey Alanı (BSA) hesabı.
- **📊 WHO / CDC Büyüme Persentil Motoru:** 
  - Pediatrik vakalarda yaşa ve cinsiyete göre boy, kilo ve BKİ persentil analizi.
- **🚨 NEWS2 & PEWS Acil Triyaj Skorlama:** 
  - Vital bulgulara göre otomatik risk skorlaması ve klinik uyarı bayrakları (Hipoksi, Hipotansiyon, Anormal Nabız vb.).
- **💧 Dinamik İdame Sıvı Hesabı:** 
  - **Holliday-Segar** metodolojisi ve ateşe bağlı ($>37.5^\circ\text{C}$) otomatik sıvı ihtiyacı düzeltmesi.
- **💉 Sürekli İnfüzyon (Perfüzör) Motoru:** 
  - Noradrenalin, Dopamin vb. kritik ilaçlar için $\text{mcg/kg/dk} \rightarrow \text{ml/saat}$ perfüzör hızı çevrimi.
- **🧪 Majör İyonlar & Adrogué-Madias Sodyum Motoru:** 
  - Hiponatremi/hipernatremi düzeltmelerinde %3 NaCl, %0.9 SF vb. çözeltiler için hedefli infüzyon hızı hesabı.
  - Derin hiponatremi, hipokalemi ve hipokalsiyumide otomatik klinik uyarılar.
- **🩸 Kan Gazı (ABG/VBG) & Asit-Baz Motoru:** 
  - Winter formülü vb. ile primer ve sekonder kompanzasyon hesabı.
  - Albümin düzeltmeli Anyon Açığı (AG) ve Delta-Delta (Δ/Δ) oranı ile HAGMA/NAGMA ayırımı.
- **🦴 Düzeltilmiş Kalsiyum Motoru:** 
  - Albümin seviyesine göre gerçek (düzeltilmiş) kalsiyumu (Payne formülü) hesaplayarak hiper/hipokalsemik acilleri (EKG takibi, kriz vb.) tespit eder.
- **🧠 Glasgow Koma Skalası (GCS):** 
  - Erişkin ve Pediatrik (<2 yaş) modlarla beyin hasar derecesi skorlaması ve GCS ≤ 8 için entübasyon (havayolu) risk uyarısı.
- **⚖️ Akıllı Sıvı Çatışma Önleyicisi (Priority Matrix):** 
  - Elektrolit düzeltme sıvılarını bazal idame sıvısından otomatik olarak düşerek hastayı iatrojenik **sıvı yüklenmesinden (fluid overload)** koruyan dinamik dengeleyici.
- **💊 TİTCK İlaç Veritabanı & Muadil Motoru:** 
  - Cihazda çevrimdışı (IndexedDB) çalışan 10.000+ TİTCK ilaç listesi, etken madde ve aktif muadil arama altyapısı.
- **📋 Otomatik SOAP Hasta Notu:** 
  - Tüm ölçüm, vital, perfüzör, elektrolit ve reçete verilerini tek tıkla panoya kopyalanabilir klinik nota dönüştürme.

---

## 🤖 AI (Yapay Zekâ) İle Geliştirme Süreci

Bu proje, bir tıp öğrencisinin/hekimin klinik ihtiyaçları ve saha gözlemleri doğrultusunda **Yapay Zekâ (AI) iş birliğiyle** sıfırdan tasarlanmış ve kodlanmıştır.

- **Klinik Algoritmalar & Medikal Matematik:** Tüm tıp formülleri (Adrogué-Madias, CKD-EPI 2021, Holliday-Segar, Bedside Schwartz, NEWS2/PEWS), AI iş birliğiyle güncel kılavuzlar ve literatür referans alınarak bağımsız (decoupled) JavaScript motorlarına dönüştürülmüştür.
- **Yazılım Mimarisi & UX:** İstemci tarafında sıfır bağımlılıkla çalışan, PWA standartlarına uygun, KVKK/GDPR uyumlu ve çevrimdışı öncelikli modüler yapı AI yönlendirmeleriyle inşa edilmiştir.

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