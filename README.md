# 🩺 Klinik Karar Destek Asistanı (Klinik PWA v2.0)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Workbox_Offline_First-008080?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![TİTCK Data](https://img.shields.io/badge/TİTCK-18%2C000%2B_İlaç-E11D48)](https://www.titck.gov.tr/)
[![Tests](https://img.shields.io/badge/Tests-100%25_Passing-10B981)](https://github.com/vellidr/klinik-pwa-deneme)
[![Privacy](https://img.shields.io/badge/KVKK%2FGDPR-Sıfır_Sunucu_Kaydı-blue)](https://kvkk.gov.tr/)

Acil servis, poliklinik, yoğun bakım ve nöbet şartlarında hekimlerin zihinsel yükünü hafifletmek, karmaşık medikal hesaplama hatalarını önlemek, ilaç etkileşimlerini engellemek ve hasta dokümantasyonunu saniyeler içinde tamamlamak için geliştirilmiş **yeni nesil, çevrimdışı öncelikli (offline-first) klinik karar destek asistanı**.

---

## 📌 İçindekiler
- [🎯 Temel Amaç ve Felsefe](#-temel-amaç-ve-felsefe)
- [⚡ Hızlı Başlangıç & Canlı Uygulama](#-hızlı-başlangıç--canlı-uygulama)
- [🫀 Klinik Karar Destek Motorları](#-klinik-karar-destek-motorları)
  - [1. Kardiyoloji & Gelişmiş EKG (QTc / Aks / Tisdale)](#1-kardiyoloji--gelişmiş-ekg-qtc--aks--tisdale)
  - [2. Akıllı İlaç Güvenlik Kalkanı & DDI Dedektörü](#2-akıllı-ilaç-güvenlik-kalkanı--ddi-dedektörü)
  - [3. Tromboemboli & Kardiyak Acil Skorlamaları](#3-tromboemboli--kardiyak-acil-skorlamaları)
  - [4. Nefroloji, Toksikoloji & Enfeksiyon](#4-nefroloji-toksikoloji--enfeksiyon)
  - [5. Yenidoğan (Neonatoloji) & Doğum Saati Analizi](#5-yenidoğan-neonatoloji--doğum-saati-analizi)
  - [6. Pediatri, Büyüme Persentil & Aşı Takvimi](#6-pediatri-büyüme-persentil--aşı-takvimi)
  - [7. Acil Triyaj, Yanık (ATLS 10) & Cerrahi](#7-acil-triyaj-yanık-atls-10--cerrahi)
  - [8. Sıvı-Elektrolit, Kan Gazı (ABG/VBG) & Endokrin](#8-sıvı-elektrolit-kan-gazı-abgvbg--endokrin)
- [🚨 Acil Durum Protokolleri & Canlı Zamanlayıcılar](#-acil-durum-protokolleri--canlı-zamanlayıcılar)
- [🖨️ Akıllı A4 Reçete & Dozaj Çizelgesi](#️-akıllı-a4-reçete--dozaj-çizelgesi)
- [✍️ SOAP Akıllı Şablonları & Nokta Kısayolları (Dot Phrases)](#️-soap-akıllı-şablonları--nokta-kısayolları-dot-phrases)
- [💻 Klinik İş İstasyonu & Ergonomi](#-klinik-iş-istasyonu--ergonomi)
- [📦 TİTCK Çevrimdışı İlaç & Muadil Veritabanı](#-titck-çevrimdışı-ilaç--muadil-veritabanı)
- [🔒 Gizlilik, KVKK ve Güvenlik İlkeleri](#-gizlilik-kvkk-ve-güvenlik-ilkeleri)
- [🛠️ Geliştirici & Kurulum Rehberi](#️-geliştirici--kurulum-rehberi)
- [⚠️ Yasal Uyarı & Sorumluluk Reddi](#️-yasal-uyarı--sorumluluk-reddi)

---

## 🎯 Temel Amaç ve Felsefe

Yoğun poliklinik ve acil servis şartlarında bir hekimin karşılaştığı en büyük riskler; **zaman baskısı**, **yorgunluk**, **hesaplama hataları** ve **ilaç etkileşimleridir**. Bu proje üç temel ilke üzerine inşa edilmiştir:

1. **Sıfır Hata (Kılavuz Bütünlüğü):** Hesaplanan her formül (AHA/ACC, ATLS 10, KDIGO, GINA, AES, TND, Sağlık Bakanlığı) güncel tıp literatürü referans alınarak test güdümlü (TDD) kodlanmıştır.
2. **Sıfır Gecikme (Offline-First):** Hastane bodrum katlarında, internetin çekmediği sarı/kırmızı alanlarda dahi hiçbir sunucuya bağımlı olmadan 18.000+ ilaç ve tüm hesaplama motorları mikrosaniyeler içinde çalışır.
3. **Maksimum Klinik Ergonomi:** Tek ekranda reaktif hesaplama, klavyeden Ctrl+K hızlı erişim, gece nöbet modu ve tek tıkla resmi A4 hasta reçetesi çıktısı.

---

## ⚡ Hızlı Başlangıç & Canlı Uygulama

Uygulama doğrudan tarayıcı üzerinden çalışır ve Progressive Web App (PWA) standardındadır. Tarayıcınızdan *"Ana Ekrana Ekle"* seçeneğini kullanarak native uygulama gibi yükleyebilirsiniz.

🌐 **Canlı Web Uygulaması:** [https://vellidr.github.io/klinik-pwa-deneme/](https://vellidr.github.io/klinik-pwa-deneme/)

---

## 🫀 Klinik Karar Destek Motorları

Sistem bünyesinde 18 bağımsız, birbiriyle reaktif iletişim kurabilen klinik motor barındırır:

### 1. Kardiyoloji & Gelişmiş EKG (QTc / Aks / Tisdale)
- **Üçlü QTc Formülü:** Bazett, Fridericia ve geniş QRS / Dal blokları (LBBB, RBBB, Pace) için **Bogossian (QTcBog)** formülü.
- **EKG Kağıdı Küçük Kutucuk (mm) Giriş Modu:** Milisaniye hesaplama zahmeti olmadan doğrudan EKG kağıdından sayılan küçük kare (1 mm) sayısı ile giriş; çift yönlü anlık ms-kutu senkronizasyonu.
- **Kağıt Hızı Seçicisi:** Standart **25 mm/sn** (1 kare = 40 ms) ve **50 mm/sn** (1 kare = 20 ms) desteği.
- **Hızlı R-R Kısayolları:** 3 Büyük Kare (100 bpm), 4 Büyük Kare (75 bpm), 5 Büyük Kare (60 bpm) butonları.
- **AHA/ACC/HRS Tanjant (Teğet) Rehberi:** T dalgası iniş eğimine teğet çizerek izoelektrik T-P kesişiminden kesin QT ölçümü; V2-V3 derivasyonlarından kaçınma kuralları ve U dalgası ayrımı.
- **Aritmi & AFib Çoklu Vuru Aracı:** Düzensiz ritimlerde 3 ardışık vuru süresini alarak otomatik ortalama hesaplama.
- **EKG Aksı & Tisdale:** D1 ve aVF sapmalarından net açı hesabı ve Tisdale QT uzama risk skoru.

### 2. Akıllı İlaç Güvenlik Kalkanı & DDI Dedektörü
Reçetelenen veya sorgulanan ilaçlar arasında arka planda çalışan kesintisiz güvenlik kalkanı:
- **Triple Whammy Dedektörü:** ACEi/ARB + Diüretik + NSAİİ ölümcül kombinasyonunu tespit ederek hemodinamik akut böbrek hasarı uyarısı üretir.
- **Serotonin Sendromu Kalkanı:** MAOI, SSRI/SNRI, Tramadol, Linezolid ve Triptan kombinasyonlarında Hunter kriterleri uyarısı verir.
- **Ölümcül Hiperkalemi Kalkanı:** Spironolakton + ACEi/ARB + TMP-SMX + NSAİİ kombinasyonlarında kardiyak arrest ve aritmi koruması.
- **CYP3A4 Statin Rabdomiyoliz Kalkanı:** Simvastatin/Atorvastatin ile Klaritromisin, Eritromisin, Ketokonazol ve Diltiazem etkileşimlerini yakalar.
- **Akıllı Renal Doz Uyarlaması:** Hastanın o anki eGFR değerine göre nefrotoksik veya doz azaltımı gereken ilaçları kırmızı bayrakla işaretler.
- **Gebelik & Trimester Güvenliği:** Trimester bazlı FDA/Avustralya kategorileri ve teratojenite uyarıları.
- **Yenidoğan Kontrendikasyon Kalkanı:** Seftriakson+Kalsiyum ölümcül presipitasyonu, sülfonamid kernikterus riski, florokinolon ve tetrasiklin kıkırdak/diş toksisitesi koruması.

### 3. Tromboemboli & Kardiyak Acil Skorlamaları
- **Wells DVT Skoru:** 10 parametreli derin ven trombozu olasılığı (Düşük / Orta / Yüksek).
- **Wells PTE Skoru:** Pulmoner emboli 2-kademeli ve 3-kademeli klinik olasılık analizi.
- **PERC Dışlama Kuralı:** Düşük riskli olgularda gereksiz D-Dimer ve BT Anjiyo tetkikini önleme protokolü.
- **HEART Skoru:** Acil serviste göğüs ağrısı ile başvuran hastada 6 haftalık majör kardiyak olay (MACE) risk tahmini.
- **CHA₂DS₂-VASc & HAS-BLED:** Atriyal fibrilasyonda inme riskine karşı antikoagülasyon endikasyonu ve kanama riski dengesi.

### 4. Nefroloji, Toksikoloji & Enfeksiyon
- **FENa & FEUrea:** Prerenal azotemi vs. Akut Tubuler Nekroz (ATN) ayrımı; diüretik kullanan hastalarda FEUrea devreye girer.
- **Düzeltilmiş Sodyum (Katz & Hillier):** Ağır hiperglisemide gerçek ve yalancı hiponatremi ayrımı.
- **Kritik Osmolal Açık:** Toksik alkol (Metanol, Etilen Glikol) intoksikasyonu şüphesinde Fomepizol ve Etanol antidot protokolü.
- **Rumack-Matthew Nomogramı:** Saat bazlı Parasetamol toksisitesi; **Pediatrik Sıvı Yüklenmesini Önleyen 3 Kademeli NAC Protokolü** (10 kg bebekte sıvı hacmini 1000 mL'den 100 mL'ye güvenle düşürür).
- **CURB-65 & CRB-65:** Toplum kökenli pnömoni ciddiyet derecesi ve Sağlık Bakanlığı uyumlu ampirik antibiyotik önerisi.

### 5. Yenidoğan (Neonatoloji) & Doğum Saati Analizi
- **Hassas Doğum Tarihi & Saati:** Yenidoğanlarda gün ve saat hesabı; ilk 72 saatteki fototerapi kararı için saatlik yaş belirlenmesi.
- **Bhutani Hiperbilirubinemi Eğrisi:** AAP kılavuzuna uygun risk persentilleri (Yüksek / Orta-Yüksek / Orta-Düşük / Düşük risk).
- **Fizyolojik vs. Patolojik Kilo Kaybı:** Doğum kilosuna göre kayıp yüzdesi (>%10 kritik dehidratasyon alarmı).
- **TND Yenidoğan Kademeli Sıvı Protokolü:** Yaşam gününe göre (1. gün 60-70 mL/kg, 2. gün 70-80 mL/kg, 3. gün 80-90 mL/kg) idame ve Glukoz İnfüzyon Hızı (GIR: mg/kg/dk) hesabı.
- **APGAR Skoru:** 1. ve 5. dakika resüsitasyon rehberi.
- **Westley Krup Skoru & CDS Dehidratasyon Skalası.**

### 6. Pediatri, Büyüme Persentil & Aşı Takvimi
- **Büyüme Persentilleri:** Boy, kilo, BMI persentilleri (WHO, CDC ve Türk Çocuk Standartları).
- **Prematüre Düzeltilmiş Yaş:** Gestasyon haftasına göre nöromotor gelişim takibi.
- **2025 Ulusal Aşı Takvimi:** T.C. Sağlık Bakanlığı en güncel aşı takvimi (6'lı Karma, KKK ek doz güncellemeleri dahil).
- **Centor-McIsaac Skoru:** Streptokokal farenjit olasılığı ve antibiyotik endikasyonu.
- **Pediatrik Kan Basıncı (AAP 2017):** Yaş, cinsiyet ve boy persantiline göre sistolik/diyastolik tansiyon evrelemesi.
- **Ganzoni Formülü:** Demir eksikliği anemisinde parenteral elemental demir açığı ve güvenli tedavi sınırları.

### 7. Acil Triyaj, Yanık (ATLS 10) & Cerrahi
- **NEWS2 & PEWS:** Vital bulgulardan otomatik yetişkin ve çocuk erken uyarı skorlaması.
- **GCS (Glasgow Koma Skalası):** Yetişkin ve <2 yaş pediatrik modları.
- **ATLS 10. Baskı Parkland Yanık Sıvısı:** Yetişkinlerde 2 mL/kg, çocuklarda 3 mL/kg başlangıç katsayısı; ilk 8 saatte yarısı, kalan 16 saatte kalanı.
- **Alvarado Skoru:** Akut apandisit klinik olasılık derecelendirmesi.
- **Sütür & Dikiş Alma Rehberi:** Anatomik bölgeye göre iplik türü (Naylon, Prolen, Vicryl vb.), kalınlık (USP) ve dikiş alma süresi.

### 8. Sıvı-Elektrolit, Kan Gazı (ABG/VBG) & Endokrin
- **Holliday-Segar İdame Sıvısı:** 4-2-1 kuralı, saatlik hız ve ateşe bağlı sıvı kaybı (%10/°C) düzeltmesi.
- **Adrogué-Madias Sodyum Açığı:** Hiponatremi / hipernatremide seçilen sıvı türüne göre (SF, %3 NaCl, İzolite) 1 litrenin Na üzerindeki etkisi ve saatlik infüzyon hızı (ODS önleme uyarısıyla).
- **Kan Gazı (ABG/VBG Analizörü):** Winter formülü ile solunumsal kompanzasyon doğrulaması, HAGMA/NAGMA ve Delta-Delta oranı.
- **Düzeltilmiş Kalsiyum:** Albümin düşüklüğünde iyonize kalsiyum tahmini.
- **Steroid Eşdeğerliği & HOMA-IR:** Glukokortikoid dönüşüm tablosu ve insülin direnci hesabı.

---

## 🚨 Acil Durum Protokolleri & Canlı Zamanlayıcılar

Acil servis kırmızı alan ve resüsitasyon yönetimi için iki kritik interaktif protokol:

1. **⚡ Anafilaksi Yönetimi & 5-Dakikalık Canlı Adrenalin Sayacı:**
   - Hastanın kilosuna göre IM Adrenalin (1:1000), IV Sıvı Bolusu (20 mL/kg), Antihistaminik (Feniramin) ve Kortikosteroid (Prednol) dozları otomatik hesaplanır.
   - **Canlı Geri Sayım Sayacı:** Adrenalin uygulandığı an 5 dakikalık geri sayım başlar. Süre dolduğunda görsel uyarı ve tekrar dozu kontrolü devreye girer.
2. **🧠 Status Epileptikus AES Kılavuzu & Kronometre:**
   - Amerikan Epilepsi Derneği (AES) evreleme rehberi:
     - *0–5 dk (Stabilizasyon & Kan Şekeri)*
     - *5–20 dk (1. Basamak - Kilo bazlı Midazolam / Diazepam)*
     - *20–40 dk (2. Basamak - Levetirasetam, Fenitoin, Valproat)*
     - *>40 dk (3. Basamak - Refrakter Status)*
   - Canlı durdurulabilir/sıfırlanabilir nöbet kronometresi.
   - **Tek Tıkla SOAP'a Aktarma:** Uygulanan tüm acil ilaçlar ve zaman damgası doğrudan hasta notuna eklenir.

---

## 🖨️ Akıllı A4 Reçete & Dozaj Çizelgesi

Hekimin yazdığı ilaçları hastanın anlayacağı dilde resmi, yazdırılabilir A4 hasta kullanım çizelgesine dönüştürür:
- **Akıllı Form ve Dozaj Algılama:** İlacın adına ve formuna göre otomatik zamanlama kuralları uygular:
  - *PPI (Mide Koruyucu):* Sabah kahvaltıdan 30 dk önce **AÇ**.
  - *Statin:* Akşam yatarken **GECE** (kas ağrısı uyarısıyla).
  - *12-Saat Antibiyotikler (BID):* Sabah-Akşam **TOK** (kutu bitene kadar / 7-10 gün).
  - *Nazal Dekonjestanlar:* Sabah-Akşam puf (**Maksimum 5 gün** rebound rinit uyarısıyla).
  - *Pediatrik Şuruplar:* Kilo bazlı mL / ölçek dozu.
- **Çift Sekmeli Düzenleyici (Dual-Tab):** Hekim modal içinden doz miktarlarını (`1/2`, `1`, `5 mL`), kullanım sürelerini ve özel notları anlık düzenleyebilir; "+ İlaç Ekle" ile serbest ilaç ekleyebilir.
- **Klinik Güvenlik & Resmi Başlık:** Ön Tanı / ICD-10, E-Reçete Takip No, Alerji Uyarı Bandı ve Hekim Kaşe & İmza alanı.
- **Hazır Poliklinik Paketleri:** Akut Tonsillit, Akut Gastrit, Kas-İskelet Ağrısı, Pediatrik Ateş reçete şablonları.

---

## ✍️ SOAP Akıllı Şablonları & Nokta Kısayolları (Dot Phrases)

Hekimlerin epikriz ve poliklinik notu yazma süresini 10 kat hızlandırır:
- **Tıklanabilir Hap Butonları:** `.uri` (ÜSYE), `.tonsillit`, `.gastro` (Gastroenterit), `.basagrisi` (Migren/Gerilim), `.idrar` (Sistit), `.bel` (Lumbago), `.gogus` (Atipik Göğüs Ağrısı), `.anemi`.
- **Otomatik Metin Genişletme (Text Expansion):** Not alanına `.uri` yazıp boşluğa basıldığında şablon anında tam anamnez, fizik muayene ve tedavi planına dönüşür.
- **Bütünleşik SOAP Motoru:** Biyometri, vital bulgular, eGFR, triyaj ve kardiyak hesaplamalar tek bir "Kopyala" butonuyla hazır klinik metne dökülür.

---

## 💻 Klinik İş İstasyonu & Ergonomi

- **⌨️ Ctrl+K / Cmd+K Hızlı Motor Değiştirici (Quick Switcher):** Klavyeden doğrudan herhangi bir motora (örn. "Parkland", "Bhutani", "Wells", "Tanjant") anında odaklanma.
- **🌙 Gece / Gündüz Teması (Dark & Light Mode):** Gece nöbetlerinde gözü yormayan derin koyu tema ve gündüz poliklinik ışığına uygun aydınlık tema.
- **📦 Klinik Paketler (Workstation Packages):** 9 hazır branş paketi (Pediatri, Acil Travma, Kardiyo, Yoğun Bakım vb.) ve hekimin kendi çalışma ortamını kaydedebileceği kalıcı özel paketler.
- **🔗 Özyinelemeli Bağımlılık Çözücü:** İdame sıvı seçildiğinde arka plandaki Kilo-Boy, Yaş ve Elektrolit motorlarını otomatik olarak görünür kılar.

---

## 📦 TİTCK Çevrimdışı İlaç & Muadil Veritabanı

- **18.000+ Ruhsatlı İlaç:** Türkiye İlaç ve Tıbbi Cihaz Kurumu (TİTCK) güncel ilaç kataloğu cihazın yerel hafızasında (IndexedDB) barındırılır.
- **Ters İndeks (Inverted Index) ile $O(1)$ Arama:** Barkod, ATC kodu, etken madde ve marka ismi üzerinden sıfır bekleme süresiyle anlık filtreleme.
- **Fonetik & Türkçe Karakter Normalizasyonu:** `İ/I`, `ş/s`, `ç/c` ve heceleme farklılıklarında akıllı eşleştirme.
- **Akıllı Eşdeğer (Muadil) Arama:** Aynı etken madde ve formdaki muadil ilaçları anında listeleme.

---

## 🔒 Gizlilik, KVKK ve Güvenlik İlkeleri

- **%100 Yerel İşleme:** Hiçbir hasta adı, doğum tarihi, laboratuvar sonucu veya vital bulgu dış sunuculara iletilmez.
- **Sıfır İzleyici / Sıfır Telemetri:** Google Analytics, çerez izleyiciler veya üçüncü parti reklam yazılımları kesinlikle barındırılmaz.
- **Tam KVKK / GDPR Uyumluluğu:** Uygulama tamamen tarayıcının güvenli kum havuzunda (client-side sandbox) çalışır.

---

## 🛠️ Geliştirici & Kurulum Rehberi

Proje modern Node.js, TypeScript ve Vite ekosistemi üzerine kuruludur:

```bash
# 1. Depoyu klonlayın
git clone https://github.com/vellidr/klinik-pwa-deneme.git
cd klinik-pwa-deneme

# 2. Bağımlılıkları yükleyin
npm install

# 3. Geliştirme sunucusunu başlatın
npm run dev

# 4. Kapsamlı test paketini çalıştırın (18 motor + DOM testleri)
npm test

# 5. TypeScript derleme ve tip kontrolü
npm run typecheck

# 6. Üretim (Production) PWA paketini derleyin
npm run build
```

### 🧪 Test Mimarisi
Proje testleri `tests/` dizini altında yer alır ve Node.js ortamında mock DOM ve katı assertion'lar ile yürütülür:
- `test_engines.js`: 18 klinik motorun doğruluk testleri ve 226 DOM kimliğinin varlık kontrolü.
- `test_ts_engines.ts`: TypeScript motorlarının kılavuz sınır değer ve eşitlik testleri.
- `test_drug_search.js`: TİTCK ters indeks arama ve muadil algoritması doğrulaması.
- `test_pwa_offline.ts`: Service Worker, Workbox ve çevrimdışı önbellek dayanıklılığı.

---

## ⚠️ Yasal Uyarı & Sorumluluk Reddi

Bu yazılım yalnızca **tıp hekimleri, asistan hekimler, tıp öğrencileri ve yetkili sağlık profesyonellerine yönelik bir klinik karar destek ve eğitim aracıdır**. 

Hesaplanan hiçbir dozaj, sıvı hacmi veya skorlama sonucu bir hekimin bağımsız klinik muhakemesi, hasta başı fizik muayenesi ve profesyonel tıbbi kanaati yerine geçemez. İlaç uygulamaları ve tedaviler her zaman hastanın bireysel durumuna, alerji öyküsüne ve güncel prospektüs/kılavuz bilgilerine göre hekim tarafından teyit edilmelidir.

---

**Geliştirici:** Dr. Velli & Klinik Karar Destek Ekibi  
**Lisans:** MIT License — Açık Kaynak Klinik Yazılım Girişimi