# 🩺 Klinik Karar Destek Asistanı (Klinik PWA)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Workbox_Offline_First-008080?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Lisans: AGPL v3](https://img.shields.io/badge/Lisans-GNU_AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TİTCK Data](https://img.shields.io/badge/TİTCK-18%2C212_İlaç_%2B_135_Monograf-E11D48)](https://www.titck.gov.tr/)
[![Clinical Motors](https://img.shields.io/badge/Klinik_Motor-21_Modül-8B5CF6)](https://github.com/VelliDR/klinik-pwa-deneme)
[![Tests](https://img.shields.io/badge/Test_Suite-42_Bölüm_Doğrulandı-10B981)](https://github.com/VelliDR/klinik-pwa-deneme)
[![Privacy](https://img.shields.io/badge/Veri_Gizliliği-İstemci_Taraflı_(Client--Side)-blue)](https://kvkk.gov.tr/)

Klinik Karar Destek Asistanı, acil servis, poliklinik ve yataklı servislerde görev yapan hekimler ve sağlık çalışanları için tasarlanmış, açık kaynaklı ve çevrimdışı öncelikli (offline-first) bir klinik hesaplama ve dokümantasyon aracıdır.

Projenin temel amacı; yoğun klinik çalışma temposunda sık başvurulan kılavuz formüllerini, pediatrik ve erişkin doz hesaplamalarını, olası ilaç etkileşim uyarılarını ve epikriz dokümantasyonunu tek bir arayüzde toplayarak hekimin karar verme sürecine pratik bir yardımcı sunmaktır.

---

> [!IMPORTANT]
> ### ⚠️ Klinik ve Yasal Sorumluluk Reddi (Disclaimer)
> Bu uygulama, yalnızca **tıp hekimleri, asistan hekimler, tıp öğrencileri ve yetkili sağlık profesyonellerine yönelik bir klinik karar destek ve eğitim aracıdır**.
> 
> Uygulamada yer alan hesaplama sonuçları, dozaj önerileri, etkileşim uyarıları ve skorlama yorumları bir hekimin bağımsız klinik muhakemesi, hasta başı fizik muayenesi ve profesyonel tıbbi değerlendirmesi yerine geçemez. İlaç uygulamaları, sıvı tedavileri ve klinik kararlar her zaman hastanın bireysel özelliklerine, alerji öyküsüne, güncel laboratuvar verilerine ve resmi ürün kılavuzlarına (KÜB/KT) göre sorumlu hekim tarafından doğrulanmalıdır.

---

## 📌 İçindekiler
- [🎯 Tasarım İlkeleri](#-tasarım-ilkeleri)
- [⚡ Hızlı Başlangıç & PWA Kurulumu](#-hızlı-başlangıç--pwa-kurulumu)
- [🫀 Klinik Karar Destek Motorları (21 Modül)](#-klinik-karar-destek-motorları-21-modül)
  - [1. Demografi, Doğum Tarihi & Gestasyonel Yaş](#1-demografi-doğum-tarihi--gestasyonel-yaş)
  - [2. Biyometri, Mosteller BSA & eGFR (KDIGO 2024 / Schwartz / CKD-EPI)](#2-biyometri-mosteller-bsa--egfr-kdigo-2024--schwartz--ckd-epi)
  - [3. Vital Bulgular & Triyaj Skorları (NEWS2 / PEWS / AAP 2017 BP)](#3-vital-bulgular--triyaj-skorları-news2--pews--aap-2017-bp)
  - [4. Bilinç & Nöroloji Skorlaması (GCS & Pediatrik pGCS)](#4-bilinç--nöroloji-skorlaması-gcs--pediatrik-pgcs)
  - [5. Tromboemboli & Kardiyovasküler Skorlar (Wells / PERC / HEART / AF)](#5-tromboemboli--kardiyovasküler-skorlar-wells--perc--heart--af)
  - [6. Nefroloji, Toksikoloji & Enfeksiyon (FENa / FEUrea / NAC / CURB-65)](#6-nefroloji-toksikoloji--enfeksiyon-fena--feurea--nac--curb-65)
  - [7. Yenidoğan & Hiperbilirubinemi (AAP 2022 / TND 2014 / Maisels)](#7-yenidoğan--hiperbilirubinemi-aap-2022--tnd-2014--maisels)
  - [8. Kan Gazı Analizi & Asit-Baz Dengesi (ABG / VBG)](#8-kan-gazı-analizi--asit-baz-dengesi-abg--vbg)
  - [9. İdame Sıvı Tedavisi (Holliday-Segar & TND Yenidoğan)](#9-idame-sıvı-tedavisi-holliday-segar--tnd-yenidoğan)
  - [10. Sıvı-Elektrolit Dengesi (Adrogué-Madias Sodyum & Kalsiyum)](#10-sıvı-elektrolit-dengesi-adrogué-madias-sodyum--kalsiyum)
  - [11. Kardiyoloji & EKG Analizi (QTc / Aks / Tisdale Risk Skoru)](#11-kardiyoloji--ekg-analizi-qtc--aks--tisdale-risk-skoru)
  - [12. Endokrinoloji & Glukokortikoid Eşdeğerlik Dönüşümü](#12-endokrinoloji--glukokortikoid-eşdeğerlik-dönüşümü)
  - [13. İnfüzyon Hızı & Glukoz İnfüzyon Hızı (GIR)](#13-infüzyon-hızı--glukoz-infüzyon-hızı-gir)
  - [14. Pediatrik Büyüme Hızı & Kraniyal Tarama (NICE / WHO / Neyzi)](#14-pediatrik-büyüme-hızı--kraniyal-tarama-nice--who--neyzi)
  - [15. Pediatrik Demir Eksikliği & Talasemi Ayrımı (TPHD & Mentzer)](#15-pediatrik-demir-eksikliği--talasemi-ayrımı-tphd--mentzer)
  - [16. Pediatrik Şurup & Süspansiyon Dozlama Motoru](#16-pediatrik-şurup--süspansiyon-dozlama-motoru)
  - [17. Ulusal Çocukluk Çağı Aşı Takvimi Sorgulama](#17-ulusal-çocukluk-çağı-aşı-takvimi-sorgulama)
  - [18. Centor / McIsaac Farenjit Değerlendirmesi](#18-centor--mcisaac-farenjit-değerlendirmesi)
  - [19. Kadın Doğum & Obstetrik Hesaplayıcı (Naegele / Bishop / Preeklampsi)](#19-kadın-doğum--obstetrik-hesaplayıcı-naegele--bishop--preeklampsi)
  - [20. Cerrahi Skorlar & Yanık Sıvı Resüsitasyonu (ATLS 10 / Alvarado / Ranson)](#20-cerrahi-skorlar--yanık-sıvı-resüsitasyonu-atls-10--alvarado--ranson)
  - [21. Akılcı Reçete, İlaç Güvenliği & Etkileşim Denetimi](#21-akılcı-reçete-ilaç-güvenliği--etkileşim-denetimi)
- [📝 Canlı SOAP Klinik Notu Sentezi](#-canlı-soap-klinik-notu-sentezi)
- [📦 TİTCK İlaç Kataloğu & 135 Klinik Monograf](#-titck-ilaç-kataloğu--135-klinik-monograf)
- [🚨 Acil Durum Protokolleri & Canlı Zamanlayıcılar](#-acil-durum-protokolleri--canlı-zamanlayıcılar)
- [🖨️ A4 Hasta Reçete & Dozaj Çizelgesi](#️-a4-hasta-reçete--dozaj-çizelgesi)
- [🔒 Gizlilik ve Veri Güvenliği (KVKK / GDPR)](#-gizlilik-ve-veri-güvenliği-kvkk--gdpr)
- [🛠️ Geliştirici ve Kurulum Rehberi](#️-geliştirici-ve-kurulum-rehberi)

---

## 🎯 Tasarım İlkeleri

1. **Kılavuz Temelli Modelleme:** Algoritmalar uluslararası ve ulusal tıp kılavuzları (KDIGO 2024, AAP 2022, ATLS-10, AHA/ACC, WHO 2022/2023, TND, TPHD, T.C. Sağlık Bakanlığı) referans alınarak kurgulanmış ve test paketleriyle doğrulanmıştır.
2. **Çevrimdışı Çalışma (Offline-First):** PWA mimarisi sayesinde uygulama, internet erişiminin bulunmadığı hastane alanlarında da 18.212 ruhsatlı ilaç kaydı, 135 çevrimdışı klinik monograf ve tüm hesaplama motorlarıyla yerel olarak çalışmayı sürdürür.
3. **Klinik Ergonomi & Reaktivite:** Veri girişleri reaktif olarak hesaplanır; mükerrer girişleri azaltmak adına laboratuvar değerleri (örneğin serum sodyumu veya kreatinin) ilgili alt motorlara otomatik olarak aktarılır.
4. **Modüler İş İstasyonu Yapısı:** Farklı uzmanlık alanlarına (Pediatri, Acil, Yoğun Bakım, Kadın Doğum vb.) uygun hazır paketler veya hekimin özelleştirebileceği kalıcı kart kombinasyonları sunulur.

---

## ⚡ Hızlı Başlangıç & PWA Kurulumu

Uygulama standart bir web tarayıcısı üzerinden doğrudan çalıştırılabilir. Progressive Web App (PWA) desteği sayesinde masaüstü veya mobil cihazlarda yerel bir yazılım gibi yüklenebilir:

- **Canlı Uygulama:** [https://vellidr.github.io/klinik-pwa-deneme/](https://vellidr.github.io/klinik-pwa-deneme/)
- **Yükleme:** Tarayıcı adres çubuğundaki *"Yükle"* veya tarayıcı menüsündeki *"Ana Ekrana Ekle"* seçeneğini kullanabilirsiniz.

---

## 🫀 Klinik Karar Destek Motorları (21 Modül)

### 1. Demografi, Doğum Tarihi & Gestasyonel Yaş
- **Kronolojik Yaş:** Gün, ay ve yıl bazında hassas yaş hesaplaması.
- **Prematüre Düzeltilmiş Yaş:** $<37$ gestasyonel haftada doğan bebeklerde düzeltilmiş ay ve hafta hesabı; persentil eğrilerine otomatik uyarlama.
- **Postnatal Saat:** Yenidoğan sarılığı değerlendirmesinde ilk 14 gün (336 saat) için saat bazlı yaş takibi.

### 2. Biyometri, Mosteller BSA & eGFR (KDIGO 2024 / Schwartz / CKD-EPI)
- **Vücut Yüzey Alanı (BSA):** Mosteller formülü ($\text{BSA} = \sqrt{\frac{\text{Boy (cm)} \times \text{Kilo (kg)}}{3600}}$).
- **Pediatrik eGFR ($<18$ yaş):** IDMS izlenebilir yatakbaşı Schwartz ($k=0.413$) veya klasik Jaffe tahlil seçimi; $<1$ yaş bebeklerde term ($k=0.45$) ve prematüre ($k=0.33$) sabitleri.
- **Erişkin eGFR ($\ge 18$ yaş):** KDIGO 2024 önerili 2021 CKD-EPI Kombine Kreatinin + Sistatin C ($\text{eGFR}_{\text{cr-cys}}$), izole Kreatinin veya izole Sistatin C denklemleri.
- **Dozlama İçin Mutlak GFR:** Obez ve kaşektik hastalarda dar terapötik indeksli ilaçlar için BSA de-indekslemesi ($\text{eGFR}_{\text{mutlak}} = \text{eGFR} \times \frac{\text{BSA}}{1.73}\text{ mL/dk}$).

### 3. Vital Bulgular & Triyaj Skorları (NEWS2 / PEWS / AAP 2017 BP)
- **NEWS2 (National Early Warning Score 2):** Erişkin hastalarda solunum sayısı, $\text{SpO}_2$, oksijen desteği, sistolik tansiyon, nabız, bilinç düzeyi ve ateş üzerinden klinik dekompansasyon risk analizi.
- **Pediatrik PEWS:** Yaşa göre fizyolojik parametrelerden pediatrik erken uyarı puanlaması.
- **AAP 2017 Pediatrik Tansiyon:** Yaş, cinsiyet ve boy persantiline göre normotansif, evre 1 ve evre 2 hipertansiyon evrelemesi.

### 4. Bilinç & Nöroloji Skorlaması (GCS & Pediatrik pGCS)
- **Erişkin GCS:** Göz açma, sözel yanıt ve motor yanıt bileşenleri (3–15 puan).
- **Pediatrik pGCS ($<2$ yaş):** Konuşma öncesi (preverbal) çocuklara uygun sözel ve motor değerlendirme kriterleri.

### 5. Tromboemboli & Kardiyovasküler Skorlar (Wells / PERC / HEART / AF)
- **Wells DVT & Wells PTE:** Derin ven trombozu ve pulmoner emboli klinik olasılık skorlamaları.
- **PERC Kuralı:** Düşük riskli olgularda gereksiz D-Dimer ve radyolojik tetkik yükünü azaltmaya yönelik dışlama kriterleri.
- **HEART Skoru:** Acil servise göğüs ağrısıyla başvuran hastalarda 6 haftalık majör kardiyak olay (MACE) risk analizi.
- **CHA₂DS₂-VASc & HAS-BLED:** Atriyal fibrilasyon hastalarında inme riski ile antikoagülan kullanımına bağlı majör kanama riski dengesi.

### 6. Nefroloji, Toksikoloji & Enfeksiyon (FENa / FEUrea / NAC / CURB-65)
- **FENa & FEUrea:** Prerenal azotemi ile Akut Tubuler Nekroz (ATN) ayrımı; diüretik kullanan hastalarda FEUrea önceliği.
- **Düzeltilmiş Sodyum (Katz & Hillier):** Hiperglisemi varlığında ölçülen sodyumun düzeltilmesi ve osmolal açık hesabı.
- **Rumack-Matthew Nomogramı & NAC:** Parasetamol intoksikasyonunda saat bazlı toksisite değerlendirmesi ve pediatrik sıvı kısıtlamalı 3 kademeli IV NAC protokolü.
- **CURB-65 & CRB-65:** Toplum kökenli pnömoni ciddiyet derecesi ve ayaktan/yatarak takip önerisi.

### 7. Yenidoğan & Hiperbilirubinemi (AAP 2022 / TND 2014 / Maisels)
- **AAP 2022 Rehberi (Varsayılan):**
  - 35–40+ gebelik haftaları ve nörotoksisite risk faktörlerine göre saatlik fototerapi ve kan değişimi eşikleri (doğrusal enterpolasyonlu).
  - Bakım eskalasyonu acil protokolü (`Kan Değişimi Eşiği - 2.0 mg/dL`).
  - Bilirubin/Albümin (B/A) oranı kontrolü.
  - TcB doğrulaması (fototerapi eşiğine $\le 3\text{ mg/dL}$ farkta TSB doğrulama uyarısı).
  - Fototerapi sonlandırma ve rebound izlem aralıkları (KAS 14-15).
  - Taburculuk sonrası kontrol zamanlama matrisi (AAP 2022 Tablo 4).
- **TND 2014 / AAP 2004 Klasik Mod:** Türk Neonatoloji Derneği eğrileriyle karşılaştırmalı değerlendirme seçeneği.
- **Maisels 2012 Preterm Yaklaşımı:** $<35$ hafta prematüre bebeklerde postmenstrüel yaşa göre fototerapi ve kan değişimi eşikleri.
- **Fizyolojik/Patolojik Kilo Kaybı:** Doğum ağırlığına göre yüzde kaybı hesabı ($>\%10$ uyarı sinyali).
- **APGAR Skoru:** 1. ve 5. dakika resüsitasyon değerlendirmesi.
- **Westley Krup Skoru & CDS Dehidratasyon Skalası.**

### 8. Kan Gazı Analizi & Asit-Baz Dengesi (ABG / VBG)
- pH, $\text{pCO}_2$, $\text{HCO}_3^-$ üzerinden metabolik ve solunumsal primer asit-baz bozukluğu tespiti.
- **Winter Formülü:** Metabolik asidozda solunumsal kompanzasyonun yeterliliği.
- **Anyon Açığı (AG) & Delta-Delta ($\Delta/\Delta$):** HAGMA, NAGMA ve eşlik eden mikst bozuklukların incelenmesi.

### 9. İdame Sıvı Tedavisi (Holliday-Segar & TND Yenidoğan)
- **Holliday-Segar (4-2-1 Kuralı):** Günlük toplam sıvı hacmi ve saatlik infüzyon hızı.
- **Ateş Kaybı Ayarlaması:** 37°C üzerindeki her 1°C artış için hidrasyon ekleme seçeneği.
- **TND Kademeli Yenidoğan Sıvısı:** Yaşam gününe göre dinamik sıvı önerisi.

### 10. Sıvı-Elektrolit Dengesi (Adrogué-Madias Sodyum & Kalsiyum)
- **Sodyum Açığı Hesabı:** Seçilen infüzyon sıvısının (SF, %3 NaCl vb.) serum sodyumu üzerindeki tahmini değişimi ve güvenli infüzyon hızı önerisi.
- **Yaşa Uygun TBW Fraksiyonu:** Yenidoğanda 0.70, infantta 0.65, çocukta 0.60 ve erişkin/geriatride cinsiyete özel toplam vücut sıvısı katsayıları.
- **Düzeltilmiş Kalsiyum:** Hipoalbüminemi varlığında iyonize kalsiyum tahmini.

### 11. Kardiyoloji & EKG Analizi (QTc / Aks / Tisdale Risk Skoru)
- **Çoklu QTc Denklemleri:** Bazett, Fridericia ve dal bloklarında (LBBB, RBBB, Pace) Bogossian (QTcBog) formülü.
- **EKG Kağıt Giriş Desteği:** Küçük kare (1 mm) sayısından doğrudan ms çevrimi; 25 mm/sn ve 50 mm/sn kağıt hızı seçenekleri.
- **AHA/ACC Teğet Yöntemi Kılavuzu:** T dalgası iniş eğimi teğeti ile kesin QT ölçümü rehberi.
- **EKG Aksı & Tisdale Skoru:** D1 ve aVF derivasyonlarından frontal düzlem aksı ve QT uzama risk skoru.

### 12. Endokrinoloji & Glukokortikoid Eşdeğerlik Dönüşümü
- Prednizol, Metilprednizolon, Deksametazon, Hidrokortizon ve Deflazakort arası doz dönüşüm tablosu.
- **HOMA-IR:** Açlık kan şekeri ve açlık insülininden insülin direnci hesabı.

### 13. İnfüzyon Hızı & Glukoz İnfüzyon Hızı (GIR)
- **İlaç Perfüzörü:** $\mu\text{g/kg/dk}$, $\mu\text{g/dk}$ veya $\text{mg/kg/saat}$ hedef dozlarından $\text{mL/saat}$ pompa hızı hesabı.
- **Glukoz İnfüzyon Hızı (GIR):** Dekstroz yüzdesi ve infüzyon hızından yenidoğanda $\text{mg/kg/dk}$ glukoz akış hesabı.

### 14. Pediatrik Büyüme Hızı & Kraniyal Tarama (NICE / WHO / Neyzi)
- **Cole & Green Kısıtlı LMS Persentilleri:** WHO Child Growth Standards (0-5 yaş) ve Neyzi 2015 (0-18 yaş) standartları; persentil ve SDS (Z-skoru) hesabı.
- **10-Kanallı Centile Yapısı & Büyüme Hızı:** NICE/WHO kılavuzları doğrultusunda $\text{cm/yıl}$ büyüme hızı ve kanal düşüşü (growth faltering) tespiti.
- **WHO 2022/2023 Akut Malnütrisyon:** Boya göre ağırlık Z-skoruna dayalı SAM (Ağır Akut Malnütrisyon) ve MAM (Orta Akut Malnütrisyon) sınıflandırması ve beslenme protokolü uyarıları.
- **Kraniyal Tarama (0-18 yaş):** Baş çevresi persentil analizi, mikrosefali ve hidrosefali risk tabakalandırması.

### 15. Pediatrik Demir Eksikliği & Talasemi Ayrımı (TPHD & Mentzer)
- **TPHD & T.C. Sağlık Bakanlığı Protokolü:** Term ve preterm bebeklerde profilaktik demir takvimi ($1-2\text{ mg/kg/gün}$).
- **Yaşa Özgü Anemi Eşikleri:** Fizyolojik nadir dönemi dahil yaş gruplarına göre eşikler ve terapötik doz hesabı ($3-6\text{ mg/kg/gün}$).
- **Mentzer İndeksi ($\text{MCV}/\text{RBC}$):** Mikrositik anemide demir eksikliği ile $\beta$-talasemi taşıyıcılığı ayrımına yardımcı gösterge.

### 16. Pediatrik Şurup & Süspansiyon Dozlama Motoru
- Kilo bazlı miligram dozlama, konsantrasyon kilitleri ve ölçek (5 mL) / oral şırınga (mL) hacim dönüşümü.
- **Yaş Bilgisi Eksikliği Güvenlik Kalkanı:** Kodein, tramadol, TMP-SMX ve ondansetron gibi yaşa bağlı mutlak kontrendikasyonu veya kısıtlaması bulunan ilaçlarda yaş girilmeden doz hesaplaması bloke edilir; hekimden yaş doğrulaması istenir.
- **TİTCK & BNFc Çift Eşik Denetimi:** Türkiye ruhsatlı konsantrasyonlar ile BNFc referansları arasında doz doğrulama (örn. İbuprofen için $<3$ ay kontrendikasyonu ve BNFc MenB aşı sonrası ateş dar istisnası; TİTCK $<6$ ay / $<7\text{ kg}$ ruhsat kısıtı).
- **Erişkin Tavan Doz Kısıtlaması (Cap Clamping):** Çocuklarda hesaplanan dozun erişkin maksimum tekil veya günlük dozunu aşmasını önleyen sınırlama.
- **Pediatrik Obezitede Ağırlık Metriği & IBW:** BMI persantili $>95$ olan obez çocuklarda hidrofilik parasetamol için İdeal Vücut Ağırlığı ($\text{IBW}$), vankomisin için Düzeltilmiş Ağırlık ($\text{AdjBW}$), amoksisilinde gerçek kilo ($\text{TBW}$) ile tavan budaması.

### 17. Çocukluk Çağı Aşı Takvimi & Gecikmiş Yakalama (Catch-Up) Motoru
- **T.C. Sağlık Bakanlığı Rutin Aşı Takvimi:** Doğumdan 65 yaş üstüne kadar yaşa uygun ulusal rutin aşılar.
- **Özel Aşı Takvimleri:**
  - **Rotavirüs (Rotarix / RotaTeq):** İlk doz için 6 hafta ile 14 hafta 6 gün altın standart penceresi ($15\text{ hafta }0\text{ gün}$ ve sonrasında invajinasyon riski nedeniyle ilk doz başlanamaz); son doz en geç 32. haftada (8 ay) tamamlanmalıdır.
  - **Meningokok (MenACWY & MenB):** İnfant (2-3. aydan itibaren Bexsero / Nimenrix / Menveo), 1-2 yaş pekiştirme ve adölesan rapel rejimleri.
- **Gecikmiş Aşı Yakalama (Catch-Up) Kuralları:** Seriye asla baştan başlanmadan kalınan yerden devam edilmesi, minimum doz aralıkları (DaBT için min. 4 hafta, KKK için min. 4 hafta, HepB için 0-1-6 ay şeması) ve PPD gereksinimleri.

### 18. Centor / McIsaac Farenjit Değerlendirmesi
- Grup A Streptokok farenjiti olasılığı, hızlı antijen testi gereksinimi ve ampirik antibiyotik kararına destek.

### 19. Kadın Doğum & Obstetrik Hesaplayıcı (Naegele / Bishop / Preeklampsi)
- **Naegele Tahmini Doğum Tarihi (TDT):** Son adet tarihinden gestasyonel hafta ve tahmini doğum tarihi.
- **Bishop Skoru:** Servikal olgunluk ve doğum indüksiyonu başarı değerlendirmesi.
- **Preeklampsi Riski:** Kan basıncı ve proteinüri bulgularına göre acil magnezyum sülfat ve antihipertansif protokolü rehberi.

### 20. Cerrahi Skorlar & Yanık Sıvı Resüsitasyonu (ATLS 10 / Alvarado / Ranson)
- **Üçlü Yanık Sıvı Protokolü (ATLS 10. Baskı):**
  - Modifiye Brooke / ATLS-10 ($2\text{ mL/kg/}\%$ erişkin, $3\text{ mL/kg/}\%$ pediatrik).
  - Yüksek voltajlı Elektrik Yanığı ($4\text{ mL/kg/}\%$).
  - Klasik Parkland ($4\text{ mL/kg/}\%$).
  - İlk 8 ve sonraki 16 saatlik sıvı dağılımı; $<30\text{ kg}$ çocuklarda hipoglisemiyi önleyen %5 Dekstrozlu ek idame sıvısı.
- **Alvarado Skoru:** Akut apandisit klinik olasılığı.
- **Ranson Skoru:** Akut pankreatit başvuru ve 48. saat mortalite göstergeleri.
- **Sütür Alma Rehberi:** Anatomik bölgeye göre dikiş materyali ve dikiş alma günleri.

### 21. Akılcı Reçete, İlaç Güvenliği & Etkileşim Denetimi
- **4 Kademeli Etkileşim Hiyerarşisi:**
  - *Tier 1 (Kontrendike):* Birlikte kullanımı kontrendike kombinasyonlar.
  - *Tier 2 (Ciddi):* Yakın klinik ve laboratuvar takibi veya doz ayarlaması gerektiren etkileşimler.
  - *Tier 3 (Orta Düzey):* Potansiyel yan etki veya etkinlik değişikliği izlemi.
  - *Tier 4 (Minör / İzlem):* Genel klinik izlem.
- **ACORN Çalışması Güncellemesi:** Vankomisin + Piperasilin/Tazobaktam kombinasyonunda nefrotoksisite riskinin güncel kanıtlar ışığında değerlendirilmesi.
- **Özel Risk Kombinasyonları:**
  - *Triple Whammy:* ACEi/ARB + Diüretik + NSAİİ ile hemodinamik akut böbrek hasarı riski.
  - *Serotonin Sendromu:* Çoklu serotonerjik ajanlarda Hunter kriterleri izlem uyarısı.
  - *Hiperkalemi Riski:* Spironolakton, ACEi/ARB, TMP-SMX ve NSAİİ kombinasyonları.
  - *Statin - CYP3A4 Etkileşimi:* Simvastatin/Atorvastatin ile güçlü CYP3A4 inhibitörleri (Klaritromisin vb.) riski.
- **Böbrek Fonksiyonuna Göre Doz Uyarlaması:** Hastanın o anki eGFR veya Cockcroft-Gault CrCl değerine göre renal kısıtlamalar.
- **Gebelik & Emzirme Güvenliği:** Trimester bazlı FDA/Avustralya kategorileri ve teratojenite uyarıları.
- **Yenidoğan Kontrendikasyonları:** Seftriakson + Kalsiyum presipitasyonu, sülfonamidlerde kernikterus riski gibi yaşa özel güvenlik kuralları.

---

## 📝 Canlı SOAP Klinik Notu Sentezi

Tüm aktif motorların girdi ve çıktıları, hekimin hasta kaydını kolaylaştırmak amacıyla dinamik olarak yapılandırılmış bir **SOAP (Subjektif, Objektif, Değerlendirme, Plan)** notuna dönüştürülür:

- **[S] Subjektif:** Şikayet, anamnez ve girilen semptomlar.
- **[O] Objektif:** Vital bulgular, biyometrik ölçümler, laboratuvar değerleri, persentiller ve hesaplanan skorlar.
- **[A] Değerlendirme:** Skorlara ve kılavuz eşiklerine dayalı olası klinik riskler ve ön tanılar.
- **[P] Plan & Tedavi:** İlaç dozajları, infüzyon hızları, aşı takibi, resüsitasyon sıvıları ve taburculuk/kontrol zamanlamaları.
- **HBYS / AHBS Uyumluluğu:** Tek tıkla panoya kopyalanarak hastane bilgi yönetim sistemlerine aktarılabilir.

---

## 📦 TİTCK İlaç Kataloğu & 135 Klinik Monograf

- **18.212 Ruhsatlı İlaç:** Türkiye İlaç ve Tıbbi Cihaz Kurumu veritabanı temelinde barkod, ticari isim, etkin madde ve ATC kodları yerel olarak indekslenmiştir.
- **135 Çevrimdışı Klinik Monograf Kartı:** En sık reçete edilen moleküller ve 25 kritik pediatrik ilaç için dozaj, maksimum günlük limit, kontrendikasyon, renal uyarlama ve gebelik güvenliği bilgileri çevrimdışı sunulur.
- **Çevrimdışı RxNorm CUI & ATC Kavram Eşleme:** Dış ağ servislerine bağımlılığı ortadan kaldıran yerel kavram eşleme altyapısı.
- **Ağ Farkındalıklı KÜB/KT Köprüsü:** İnternet erişimi olduğunda resmi KÜB/KT belgelerine bağlantı sağlarken, çevrimdışı durumda yerel monograf kartını açar.

---

## 🚨 Acil Durum Protokolleri & Canlı Zamanlayıcılar

- **Anafilaksi Yönetimi & 5 Dakikalık Adrenalin Sayacı:** Hastanın ağırlığına göre IM Adrenalin, IV hidrasyon ve ek ilaç dozları hesaplanır; adrenalin uygulandığı anda başlayan geri sayım sayacı sayfa yenilense veya arka plana alınsa dahi gerçek zaman damgasıyla (`Date.now()`) senkronize kalır.
- **Status Epileptikus (AES Rehberi):** Amerikan Epilepsi Derneği evrelerine göre (0-5 dk, 5-20 dk, 20-40 dk, >40 dk) ilaç önerileri ve canlı nöbet kronometresi.
- **SOAP Aktarımı:** Acil protokollerde uygulanan ilaçlar ve zaman damgaları tek tıkla hasta notuna eklenebilir.

---

## 🖨️ A4 Hasta Reçete & Dozaj Çizelgesi

Hekimin reçetelediği ilaçları, hastanın ve hasta yakınının anlayabileceği sade bir dille yazdırılabilir A4 kullanım çizelgesine dönüştürür:
- Sabah, öğle, akşam, gece zamanlamaları ve aç/tok kullanım uyarıları (örn. PPI için aç karnına, statin için gece kullanımı).
- Reçete başlığı, tanı/ICD-10, alerji uyarısı ve hekim imza alanı.
- Hazır poliklinik şablonları (Akut Tonsillit, Gastrit vb.).

---

## 🔒 Gizlilik ve Veri Güvenliği (KVKK / GDPR)

- **%100 İstemci Taraflı İşleme:** Hastaya ait hiçbir isim, kimlik numarası, doğum tarihi veya laboratuvar verisi dış sunuculara gönderilmez.
- **Sıfır Telemetri / Sıfır İzleyici:** Uygulama içerisinde analitik araçları, reklam kütüphaneleri veya üçüncü taraf çerezler yer almaz.
- **Yerel Depolama:** Özelleştirilmiş iş istasyonu paketleri yalnızca kullanıcının tarayıcısında (`localStorage`) saklanır.

---

## 🛠️ Geliştirici ve Kurulum Rehberi

Proje Node.js, TypeScript ve Vite altyapısı ile inşa edilmiştir:

```bash
# 1. Depoyu klonlayın
git clone https://github.com/VelliDR/klinik-pwa-deneme.git
cd klinik-pwa-deneme

# 2. Bağımlılıkları yükleyin
npm install

# 3. Yerel geliştirme sunucusunu başlatın
npm run dev

# 4. Kapsamlı doğrulama test paketini çalıştırın
npm test

# 5. TypeScript tip denetimini yürütün
npm run typecheck

# 6. Üretim (Production) PWA paketini derleyin
npm run build
```

### 🧪 Test Mimarisi
Testler `tests/` dizini altında modüler ve kapsamlı olarak yürütülür:
- `test_ts_engines.ts`: 21 klinik motor, sınır değerler, kılavuz doğrulukları ve 42 doğrulama bölümü (100% yeşil).
- `test_drug_search.js`: TİTCK ilaç kataloğu, monograflar ve çoklu arama algoritmaları.
- `test_workstation_packages.js`: İş istasyonu motorları ve geçişli bağımlılık zincirleri.
- `test_ts_app.ts`: Reaktif hesaplama döngüsü, global lab fallback'leri, kardiyo/obstetrik senkronizasyonu ve canlı SOAP sentezi.
- `test_cross_engine_stress.ts`: Çapraz motor entegrasyonu, boş ve uç değer dayanıklılığı, sıfır sonsuz döngü kalkanı.
- `test_pwa_offline.ts`: Service Worker, Workbox önbelleği ve çevrimdışı varlık bütünlüğü.
- `test_atc_knowledge.ts`: Çevrimdışı ATC konsept haritası ve farmakolojik taksonomi motoru.

---

## 📜 Lisans

Bu yazılım **GNU Affero General Public License v3.0 (GNU AGPLv3)** kapsamında lisanslanmıştır. Tam lisans metni için [LICENSE](LICENSE) dosyasına bakabilirsiniz.

**Geliştirici:** Dr. Velli & Katkıda Bulunanlar  
**Lisans:** GNU AGPLv3 — Açık Kaynak Klinik Yazılım Girişimi