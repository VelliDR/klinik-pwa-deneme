# 🩺 Klinik Karar Destek Asistanı (Klinik PWA v2.0)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Workbox_Offline_First-008080?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![TİTCK Data](https://img.shields.io/badge/TİTCK-18%2C212_İlaç_%2B_125_Monograf-E11D48)](https://www.titck.gov.tr/)
[![Clinical Motors](https://img.shields.io/badge/Klinik_Motor-21_Adet-8B5CF6)](https://github.com/VelliDR/klinik-pwa-deneme)
[![Tests](https://img.shields.io/badge/Tests-100%25_Passing-10B981)](https://github.com/VelliDR/klinik-pwa-deneme)
[![Privacy](https://img.shields.io/badge/KVKK%2FGDPR-Sıfır_Sunucu_Kaydı-blue)](https://kvkk.gov.tr/)

Acil servis, poliklinik, yoğun bakım ve nöbet şartlarında hekimlerin zihinsel yükünü hafifletmek, karmaşık medikal hesaplama hatalarını önlemek, ilaç etkileşimlerini engellemek ve hasta dokümantasyonunu saniyeler içinde tamamlamak için geliştirilmiş **yeni nesil, çevrimdışı öncelikli (offline-first) klinik karar destek asistanı**.

---

## 📌 İçindekiler
- [🎯 Temel Amaç ve Felsefe](#-temel-amaç-ve-felsefe)
- [⚡ Hızlı Başlangıç & Canlı Uygulama](#-hızlı-başlangıç--canlı-uygulama)
- [🫀 21 Klinik Karar Destek Motoru](#-21-klinik-karar-destek-motoru)
  - [1. Demografi, Doğum Tarihi & Gestasyon](#1-demografi-doğum-tarihi--gestasyon)
  - [2. Biyometri, Mosteller BSA & eGFR (KDIGO 2024 / Schwartz)](#2-biyometri-mosteller-bsa--egfr-kdigo-2024--schwartz)
  - [3. Vital Bulgular & Triyaj Skorları (NEWS2 / PEWS / AAP BP)](#3-vital-bulgular--triyaj-skorları-news2--pews--aap-bp)
  - [4. Glasgow Koma Skalası (GCS & Pediatrik pGCS)](#4-glasgow-koma-skalası-gcs--pediatrik-pgcs)
  - [5. Tromboemboli & Kardiyak Acil Skorlamaları](#5-tromboemboli--kardiyak-acil-skorlamaları)
  - [6. Nefroloji, Toksikoloji & Enfeksiyon](#6-nefroloji-toksikoloji--enfeksiyon)
  - [7. Yenidoğan (Neonatoloji) & Doğum Saati Analizi](#7-yenidoğan-neonatoloji--doğum-saati-analizi)
  - [8. Kan Gazı Analizi (ABG / VBG) & Asit-Baz](#8-kan-gazı-analizi-abg--vbg--asit-baz)
  - [9. İdame Sıvı Tedavisi (Holliday-Segar & TND Yenidoğan)](#9-idame-sıvı-tedavisi-holliday-segar--tnd-yenidoğan)
  - [10. Sıvı-Elektrolit (Sodyum Açığı & Düzeltilmiş Kalsiyum)](#10-sıvı-elektrolit-sodyum-açığı--düzeltilmiş-kalsiyum)
  - [11. Kardiyoloji & Gelişmiş EKG (QTc / Aks / Tisdale)](#11-kardiyoloji--gelişmiş-ekg-qtc--aks--tisdale)
  - [12. Endokrinoloji & Steroid Eşdeğerlik Dönüşümü](#12-endokrinoloji--steroid-eşdeğerlik-dönüşümü)
  - [13. İnfüzyon Hızı (Perfüzör & Glukoz İnfüzyon Hızı GIR)](#13-infüzyon-hızı-perfüzör--glukoz-infüzyon-hızı-gir)
  - [14. Pediatrik Demir Eksikliği & Talasemi Kalkanı (TPHD & Sağlık Bakanlığı)](#14-pediatrik-demir-eksikliği--talasemi-kalkanı-tphd--sağlık-bakanlığı)
  - [15. Pediatrik Şurup & Süspansiyon Dozlama Motoru](#15-pediatrik-şurup--süspansiyon-dozlama-motoru)
  - [16. Ulusal Aşı Takvimi Sorgulama Motoru](#16-ulusal-aşı-takvimi-sorgulama-motoru)
  - [17. Centor / McIsaac Akılcı Antibiyotik Motoru](#17-centor--mcisaac-akılcı-antibiyotik-motoru)
  - [18. Kadın Doğum & Obstetrik Hesaplayıcı (Naegele / Bishop / Preeklampsi)](#18-kadın-doğum--obstetrik-hesaplayıcı-naegele--bishop--preeklampsi)
  - [19. Cerrahi Skorlar & Yanık Sıvısı (ATLS 10 / Alvarado / Ranson / Sütür)](#19-cerrahi-skorlar--yanık-sıvısı-atls-10--alvarado--ranson--sütür)
  - [20. Akılcı Reçete, TİTCK & İlaç Güvenlik Kalkanı](#20-akılcı-reçete-titck--ilaç-güvenlik-kalkanı)
  - [21. Canlı SOAP Hasta Notu & Otomatik Klinik Dokümantasyon](#21-canlı-soap-hasta-notu--otomatik-klinik-dokümantasyon)
- [📦 TİTCK Çevrimdışı İlaç Kataloğu, 125 Klinik Monograf & KÜB/KT Sistemi](#-titck-çevrimdışı-ilaç-kataloğu-125-klinik-monograf--kübkt-sistemi)
- [🚨 Acil Durum Protokolleri & Canlı Zamanlayıcılar](#-acil-durum-protokolleri--canlı-zamanlayıcılar)
- [🖨️ Akıllı A4 Reçete & Dozaj Çizelgesi](#️-akıllı-a4-reçete--dozaj-çizelgesi)
- [✍️ SOAP Akıllı Şablonları & Nokta Kısayolları (Dot Phrases)](#️-soap-akıllı-şablonları--nokta-kısayolları-dot-phrases)
- [💻 Klinik İş İstasyonu & Ergonomi (Quick Switcher Ctrl+K)](#-klinik-iş-istasyonu--ergonomi-quick-switcher-ctrlk)
- [🔒 Gizlilik, KVKK ve Güvenlik İlkeleri](#-gizlilik-kvkk-ve-güvenlik-ilkeleri)
- [🛠️ Geliştirici & Kurulum Rehberi](#️-geliştirici--kurulum-rehberi)
- [⚠️ Yasal Uyarı & Sorumluluk Reddi](#️-yasal-uyarı--sorumluluk-reddi)

---

## 🎯 Temel Amaç ve Felsefe

Yoğun poliklinik ve acil servis şartlarında bir hekimin karşılaştığı en büyük riskler; **zaman baskısı**, **yorgunluk**, **hesaplama hataları** ve **ilaç etkileşimleridir**. Bu proje üç temel ilke üzerine inşa edilmiştir:

1. **Sıfır Hata (Kılavuz Bütünlüğü):** Hesaplanan her formül (AHA/ACC, AAP 2022, ATLS 10, KDIGO 2024, GINA, AES, TND, TPHD, T.C. Sağlık Bakanlığı) güncel tıp literatürü referans alınarak test güdümlü (TDD) kodlanmıştır.
2. **Sıfır Gecikme (Offline-First):** Hastane bodrum katlarında, internetin çekmediği sarı/kırmızı alanlarda dahi hiçbir sunucuya bağımlı olmadan 18.212 ruhsatlı ilaç, 125 çevrimdışı klinik ilaç monografı ve 21 hesaplama motoru mikrosaniyeler içinde çalışır.
3. **Maksimum Klinik Ergonomi:** Tek ekranda reaktif hesaplama, klavyeden `Ctrl+K` hızlı motor erişimi ve doğrudan ilaç arama, gece nöbet modu ve tek tıkla resmi A4 hasta reçetesi çıktısı.

---

## ⚡ Hızlı Başlangıç & Canlı Uygulama

Uygulama doğrudan tarayıcı üzerinden çalışır ve Progressive Web App (PWA) standardındadır. Tarayıcınızdan *"Ana Ekrana Ekle"* seçeneğini kullanarak masaüstü veya mobil cihazınıza yerel bir uygulama gibi kurabilirsiniz.

🌐 **Canlı Web Uygulaması:** [https://vellidr.github.io/klinik-pwa-deneme/](https://vellidr.github.io/klinik-pwa-deneme/)

---

## 🫀 21 Klinik Karar Destek Motoru

Sistem bünyesinde 21 bağımsız, birbiriyle reaktif iletişim kurabilen klinik motor barındırır:

### 1. Demografi, Doğum Tarihi & Gestasyon
- **Hassas Yaş Hesabı:** Kronolojik gün, ay ve yıl hesabı.
- **Prematüre Düzeltilmiş Yaş:** Gestasyonel haftaya göre düzeltilmiş yaş hesabı ve persentil uyarlaması.
- **Yenidoğan Doğum Saati:** İlk 72 saatteki fototerapi ve sarılık kararı için saatlik hassasiyette yaş belirleme.

### 2. Biyometri, Mosteller BSA & eGFR (KDIGO 2024 / Schwartz)
- **Vücut Yüzey Alanı (BSA):** Mosteller formülü ($\text{BSA} = \sqrt{\frac{\text{Boy} \times \text{Kilo}}{3600}}$).
- **KDIGO 2024 Uyumlu Gelişmiş eGFR Motoru:**
  - *Pediatrik ($<18$ yaş):* $<1$ yaş bebeklerde prematüre ($k = 0.33$) ve term ($k = 0.45$) Schwartz sabitleri; $1-17$ yaşta **IDMS-izlenebilir Yatakbaşı Schwartz ($k = 0.413$, varsayılan)** veya **Klasik Jaffe** ($k = 0.55$ çocuk/adolesan kız, $k = 0.70$ $\ge 13$ yaş erkek) tahlil seçimi.
  - *Erişkin ($\ge 18$ yaş):* **KDIGO 2024 önerili 2021 CKD-EPI Kombine Kreatinin + Sistatin C ($\text{eGFR}_{\text{cr-cys}}$)** denklemi, izole Kreatinin veya izole Sistatin C geri dönüş desteği.
  - *İlaç Dozlama İçin BSA De-İndekslemesi:* Obez veya kaşektik hastalarda dar terapötik indeksli ilaç dozlama güvenliği için mutlak GFR ($\text{eGFR}_{\text{mutlak}} = \text{eGFR} \times \frac{\text{BSA}}{1.73}\text{ mL/dk}$) hesabı.
- **Otomatik Güvenlik Entegrasyonu:** Düşük eGFR saptandığında İlaç Güvenliği motoruna anında renal doz kısıtlama sinyali gönderir.

### 3. Vital Bulgular & Triyaj Skorları (NEWS2 / PEWS / AAP BP)
- **Erişkin NEWS2:** Solunum sayısı, $\text{SpO}_2$, nabız, sistolik tansiyon, bilinç (ACVPU) ve ateş üzerinden erken uyarı skoru.
- **Pediatrik PEWS:** Yaşa göre vital parametrelerden dekompansasyon riski skoru.
- **AAP 2017 Pediatrik Tansiyon:** Yaş, cinsiyet ve boy persantiline göre normotansif, evre 1 ve evre 2 hipertansiyon evrelemesi.

### 4. Glasgow Koma Skalası (GCS & Pediatrik pGCS)
- **Erişkin GCS:** Göz, sözel ve motor yanıt puanlaması (3-15).
- **Pediatrik pGCS (<2 Yaş):** Preverbal çocuklara özel sözel (gülümseme, ağlama) ve motor skorlaması.

### 5. Tromboemboli & Kardiyak Acil Skorlamaları
- **Wells DVT Skoru:** 10 parametreli derin ven trombozu olasılığı (Düşük / Orta / Yüksek).
- **Wells PTE Skoru:** Pulmoner emboli 2-kademeli ve 3-kademeli klinik olasılık analizi.
- **PERC Dışlama Kuralı:** Düşük riskli olgularda gereksiz D-Dimer ve BT Anjiyo tetkikini önleme protokolü.
- **HEART Skoru:** Acil serviste göğüs ağrısı ile başvuran hastada 6 haftalık majör kardiyak olay (MACE) risk tahmini.
- **CHA₂DS₂-VASc & HAS-BLED:** Atriyal fibrilasyonda inme riskine karşı antikoagülasyon endikasyonu ve kanama riski dengesi.

### 6. Nefroloji, Toksikoloji & Enfeksiyon
- **FENa & FEUrea:** Prerenal azotemi vs. Akut Tubuler Nekroz (ATN) ayrımı; diüretik kullanan hastalarda FEUrea devreye girer.
- **Düzeltilmiş Sodyum (Katz & Hillier):** Ağır hiperglisemide gerçek ve yalancı hiponatremi ayrımı.
- **Kritik Osmolal Açık:** Toksik alkol (Metanol, Etilen Glikol) intoksikasyonunda antidot protokolü.
- **Rumack-Matthew Nomogramı:** Saat bazlı Parasetamol toksisitesi; **Pediatrik Sıvı Yüklenmesini Önleyen 3 Kademeli NAC Protokolü** (10 kg bebekte sıvı hacmini 1000 mL'den 100 mL'ye güvenle düşürür).
- **CURB-65 & CRB-65:** Toplum kökenli pnömoni ciddiyet derecesi ve Sağlık Bakanlığı uyumlu ampirik antibiyotik önerisi.

### 7. Yenidoğan (Neonatoloji) & Doğum Saati Analizi
- **İkili Hiperbilirubinemi Kılavuz Seçicisi (`AAP 2022 Güncel` & `TND 2014 / AAP 2004 Klasik`):**
  - *AAP 2022 Güncel Kılavuzu (Varsayılan):* 35–40+ gebelik haftasına ve nörotoksisite risk faktörlerine özgü saatlik (1–336 saat / 14 gün) fototerapi ve kan değişimi eşikleri, **Bakım Eskalasyonu (`Kan Değişimi Eşiği - 2.0 mg/dL`)** acil protokolü, **TcB (Transkutanöz Bilirubin)** doğrulama kuralı ve taburculuk sonrası izlem zamanlaması (AAP 2022 Figür 7).
  - *TND 2014 / AAP 2004 Klasik Modu:* Türk Neonatoloji Derneği (2014) risk grupları ile karşılaştırmalı izlem seçeneği ve $<35$ hafta prematüre koruması.
- **Fizyolojik vs. Patolojik Kilo Kaybı:** Doğum kilosuna göre kayıp yüzdesi (>%10 kritik dehidratasyon alarmı).
- **TND Yenidoğan Kademeli Sıvı Protokolü:** Yaşam gününe göre (1. gün 60-70 mL/kg, 2. gün 70-80 mL/kg, 3. gün 80-90 mL/kg) idame, fototerapi/eskalasyon ek sıvısı (+15 mL/kg/gün) ve Glukoz İnfüzyon Hızı (GIR: mg/kg/dk) hesabı.
- **APGAR Skoru:** 1. ve 5. dakika resüsitasyon rehberi.
- **Westley Krup Skoru & CDS Dehidratasyon Skalası.**

### 8. Kan Gazı Analizi (ABG / VBG) & Asit-Baz
- **Asit-Baz Ayrımı:** pH, $\text{pCO}_2$, $\text{HCO}_3^-$ üzerinden metabolik/solunumsal asidoz/alkaloz analizi.
- **Winter Formülü:** Solunumsal kompanzasyonun tam olup olmadığını denetler.
- **Anyon Açığı (Anion Gap):** HAGMA / NAGMA ayrımı ve gizli mikst bozukluklar için Delta-Delta ($\Delta/\Delta$) oranı.

### 9. İdame Sıvı Tedavisi (Holliday-Segar & TND Yenidoğan)
- **Holliday-Segar (4-2-1 Kuralı):** Günlük toplam sıvı ve saatlik infüzyon hızı.
- **Ateş Kaybı Düzeltmesi:** 37°C üzerindeki her 1°C artış için +%10 ek hidrasyon payı.
- **TND Kademeli Yenidoğan Sıvısı:** Yenidoğan gününe özel dinamik sıvı önerisi.

### 10. Sıvı-Elektrolit (Sodyum Açığı & Düzeltilmiş Kalsiyum)
- **Adrogué-Madias Sodyum Açığı:** Seçilen sıvı türüne göre (SF, %3 NaCl, İzolite) 1 litrenin Na üzerindeki etkisi, hedef infüzyon hızı ve Ozmotik Demiyelinizasyon Sendromu (ODS) güvenlik kalkanı.
- **Düzeltilmiş Kalsiyum:** Albümin düşüklüğünde iyonize kalsiyum tahmini.

### 11. Kardiyoloji & Gelişmiş EKG (QTc / Aks / Tisdale)
- **Üçlü QTc Formülü:** Bazett, Fridericia ve geniş QRS / Dal blokları (LBBB, RBBB, Pace) için **Bogossian (QTcBog)** formülü.
- **EKG Kağıdı Küçük Kutucuk (mm) Giriş Modu:** Doğrudan EKG kağıdından sayılan küçük kare (1 mm) sayısı ile çift yönlü anlık ms-kutu senkronizasyonu.
- **Kağıt Hızı Seçicisi:** Standart **25 mm/sn** (1 kare = 40 ms) ve **50 mm/sn** (1 kare = 20 ms) desteği.
- **AHA/ACC/HRS Tanjant Rehberi:** T dalgası iniş eğimi teğetinden kesin QT ölçümü; U dalgası ayrımı.
- **EKG Aksı & Tisdale Risk Skoru:** D1 ve aVF derivasyonlarından net aks derecesi ve Tisdale QT uzama riski.

### 12. Endokrinoloji & Steroid Eşdeğerlik Dönüşümü
- **Glukokortikoid Eşdeğerlik Tablosu:** Prednizol, Metilprednizolon, Deksametazon, Hidrokortizon, Deflazakort doz dönüşümleri.
- **HOMA-IR:** Açlık glukozu ve insülin değerlerinden insülin direnci hesaplaması.

### 13. İnfüzyon Hızı (Perfüzör & Glukoz İnfüzyon Hızı GIR)
- **İlaç Perfüzör Hesabı:** Konsantrasyon, hasta kilosu ve istenen $\mu\text{g/kg/dk}$ hızından $\text{mL/saat}$ perfüzör hızı hesabı (Dopamin, Noradrenalin, Adrenalin).
- **Glukoz İnfüzyon Hızı (GIR):** Dekstroz yüzdesi ve infüzyon hızından yenidoğan için kritik $\text{mg/kg/dk}$ hesabı.

### 14. Pediatrik Demir Eksikliği & Talasemi Kalkanı (TPHD & Sağlık Bakanlığı)
- **TPHD & T.C. Sağlık Bakanlığı ("Demir Gibi Türkiye") Protokolü:** Term bebeklerde 4–12 ay $1\text{ mg/kg/gün}$, prematüre/düşük doğum ağırlıklı bebeklerde 2–12 ay $2\text{ mg/kg/gün}$ profilaksi.
- **Yaşa Özgü Anemi Eşikleri & Terapötik Dozlama:** Fizyolojik nadir dönemi dahil ($3-6$ ay $<9.5\text{ g/dL}$ term / $<9.0\text{ g/dL}$ preterm; $6-59$ ay $<11.0\text{ g/dL}$; $5-11$ yaş $<11.5\text{ g/dL}$; $12-14$ yaş $<12.0\text{ g/dL}$) $3-6\text{ mg/kg/gün}$ elementer demir ve damla/şurup/ölçek çevirici.
- **Mentzer İndeksi ($\text{MCV}/\text{RBC}$) & $\beta$-Talasemi Taşıyıcılığı Güvenlik Kalkanı:** Yaşa göre mikrositoz analizi, $\text{Mentzer} < 13$ ve $\text{RDW}$ uyumu ile talasemi taşıyıcılığı uyarısı; ferritin normal/yüksekken ampirik demir yüklemesini durduran koruma kalkanı ve eşlik eden DEA'da yalancı düşük $\text{HbA}_2$ maskelenme uyarısı.

### 15. Pediatrik Şurup & Süspansiyon Dozlama Motoru
- **Kilo Bazlı mg/kg Dozlama:** Parasetamol ($10-15\text{ mg/kg}$), İbuprofen ($5-10\text{ mg/kg}$), Amoksisilin vb.
- **Ölçek (5 mL) Çevirici:** Ebeveynlerin uygulayabilmesi için miligram dozunu doğrudan ölçek/kaşık birimine çevirir.
- **Maksimum Doz Güvenlik Sınırı:** Günlük azami doz aşımlarını kırmızı uyarı ile engeller.

### 16. Ulusal Aşı Takvimi Sorgulama Motoru
- **T.C. Sağlık Bakanlığı En Güncel Takvim:** Doğumdan 8. sınıfa kadar tüm rutin aşılar.
- **Özel Aşılar:** Rotavirüs ve Meningokok takvimleri, gecikmiş aşı yakalama şemaları.

### 17. Centor / McIsaac Akılcı Antibiyotik Motoru
- **GAS Farenjit Olasılığı:** Ateş, eksüda, lenfadenopati, öksürük yokluğu ve yaş kriterleri.
- **Klinik Öneri:** Antibiyotik endikasyonu, boğaz kültürü / hızlı antijen testi gereksinimi.

### 18. Kadın Doğum & Obstetrik Hesaplayıcı (Naegele / Bishop / Preeklampsi)
- **Naegele Tahmini Doğum Tarihi (TDT):** Son adet tarihinden (SAT) gebelik haftası ve tahmini doğum tarihi.
- **Bishop Skoru:** Servikal olgunlaşma ve doğum indüksiyonu başarı öngörüsü.
- **Preeklampsi Risk Değerlendirmesi:** Tansiyon ve proteinüriye göre acil magnezyum sülfat protokolü önerisi.

### 19. Cerrahi Skorlar & Yanık Sıvısı (ATLS 10 / Alvarado / Ranson / Sütür)
- **Üçlü Yanık Resüsitasyon Protokolü (ATLS 10. Baskı):** Termal yanıkta **Modifiye Brooke / ATLS-10** ($2\text{ mL/kg/}\%$ erişkin, $<14$ yaş ve bebeklerde $3\text{ mL/kg/}\%$), yüksek voltaj **Elektrik Yanığı ($4\text{ mL/kg/}\%$)** ve **Klasik Parkland ($4\text{ mL/kg/}\%$)** seçicisi; ilk 8 ve sonraki 16 saatlik Ringer Laktat infüzyon hızı, hedef idrar çıkışı ve **$<30\text{ kg}$ çocuklarda hipoglisemiyi önleyen %5 Dekstrozlu Holliday-Segar ek idame sıvısı**.
- **Alvarado Akut Apandisit Skoru:** Semptom, bulgu ve laboratuvar parametrelerinden ameliyat/gözlem kararı.
- **İnteraktif Ranson Akut Pankreatit Skoru:** Başvuru (0. saat) ve 48. saat kriterlerinden mortalite yüzdesi ve yoğun bakım triyajı.
- **Sütür & Dikiş Alma Rehberi:** Anatomik bölgeye göre dikiş materyali, iğne kalınlığı ve dikiş alma günleri.

### 20. Akılcı Reçete, TİTCK & İlaç Güvenlik Kalkanı
Reçetelenen veya sorgulanan ilaçlar arasında arka planda çalışan kesintisiz klinik koruma kalkanı:
- **Triple Whammy Dedektörü:** ACEi/ARB + Diüretik + NSAİİ ölümcül kombinasyonunu tespit ederek hemodinamik akut böbrek hasarı uyarısı üretir.
- **Serotonin Sendromu Kalkanı:** MAOI, SSRI/SNRI, Tramadol, Linezolid ve Triptan kombinasyonlarında Hunter kriterleri uyarısı verir.
- **Ölümcül Hiperkalemi Kalkanı:** Spironolakton + ACEi/ARB + TMP-SMX + NSAİİ kombinasyonlarında kardiyak arrest ve aritmi koruması.
- **CYP3A4 Statin Rabdomiyoliz Kalkanı:** Simvastatin/Atorvastatin ile Klaritromisin, Eritromisin, Ketokonazol ve Diltiazem etkileşimlerini yakalar.
- **Akıllı Renal Doz Uyarlaması:** Hastanın o anki eGFR değerine göre nefrotoksik veya doz azaltımı gereken ilaçları kırmızı bayrakla işaretler.
- **Gebelik & Trimester Güvenliği:** Trimester bazlı FDA/Avustralya kategorileri ve teratojenite uyarıları.
- **Yenidoğan Kontrendikasyon Kalkanı:** Seftriakson+Kalsiyum ölümcül presipitasyonu, sülfonamid kernikterus riski, florokinolon ve tetrasiklin kıkırdak/diş toksisitesi koruması.

### 21. Canlı SOAP Hasta Notu & Otomatik Klinik Dokümantasyon
- **Klinik Motorlarla Tam Bütünleşik:** Girilen tüm vitaller, demografi, yapılan hesaplamalar, acil müdahaleler ve reçete edilen ilaçlar otomatik olarak SOAP (Subjektif, Objektif, Değerlendirme, Plan) formatında toplanır.
- **Tek Tıkla Kopyalama:** HBYS / AHBS sistemlerine yapıştırılmaya hazır epikriz metni üretir.

---

## 📦 TİTCK Çevrimdışı İlaç Kataloğu, 125 Klinik Monograf & KÜB/KT Sistemi

Uygulamanın ilaç arama motoru, **Türkiye İlaç ve Tıbbi Cihaz Kurumu (TİTCK)** güncel veritabanı temel alınarak geliştirilmiştir:

- **18.212 Ruhsatlı İlaç (Optimize Tekil Veri Mimarisi):** Aktif ve pasif tüm ruhsatlı ilaçlar, barkodlar, ATC kodları ve ruhsat sahibi firmalar yerel bellekte indekslenir.
- **📋 125 Çevrimdışı Klinik İlaç Monograf Kartı & Ağ Farkındalıklı KÜB/KT Köprüsü:**
  - Türkiye'de en sık reçete edilen ve acil kritik 125 etken madde için %100 çevrimdışı erişkin/pediatrik doz, maksimum günlük sınır, renal/hepatik uyarlama, gebelik/emzirme güvenliği ve kontrendikasyon kartları.
  - İnternet bağlantısı yokken (`navigator.onLine === false`) harici PDF veya portal linklerine tıklandığında tarayıcı ağ hatası ekranına düşmek yerine otomatik olarak yerel çevrimdışı klinik özet modalı açılır.
- **🎯 4 Farklı Arama Modu:**
  1. **✨ Tümü:** İlaç adı, etken madde, barkod, ATC ve firma üzerinde akıllı fonetik arama.
  2. **💊 İlaç Adı:** Yalnızca ticari marka adlarına göre odaklı arama (örn. *Parol, Augmentin, Arveles*).
  3. **🔬 Etken Madde:** Yalnızca jenerik molekül adına göre arama (örn. *Parasetamol, Amoksisilin*).
  4. **🏷️ Barkod / ATC:** 13 haneli barkod numarası veya ATC kodu ile $O(1)$ sürede anında arama.
- **📄 Resmi Prospektüs (KT) & KÜB PDF Erişimi:**
  - TİTCK sisteminde doğrudan PDF linki tanımlı 780+ ilaç için tek tıkla resmi **Kullanma Talimatı (KT)** ve **Kısa Ürün Bilgisi (KÜB)** açma.
  - Doğrudan linki bulunmayan müstahzarlar için otomatik **Google PDF Arama** ve resmi **TİTCK KÜB/KT Portalı** sorgulama köprüsü.
- **⚡ Yüksek Performanslı İndeksleme:** Inverted Prefix Index, Two-Pointer kesişim algoritması ve LRU sorgu önbelleği ile aramalar $<5\text{ ms}$ içinde sonuç verir.
- **🔄 Akıllı Eşdeğer (Muadil) Arama:** Aynı ATC kodu ve etken maddeye sahip eşdeğer ilaçları tek tıkla listeleme.

---

## 🚨 Acil Durum Protokolleri & Canlı Zamanlayıcılar

Acil servis kırmızı alan ve resüsitasyon yönetimi için sıfır kaymalı (`Date.now()` duvar saati tabanlı) ve `sessionStorage` kurtarmalı iki kritik interaktif protokol:

1. **⚡ Anafilaksi Yönetimi & 5-Dakikalık Canlı Adrenalin Sayacı:**
   - Hastanın kilosuna göre IM Adrenalin (1:1000), IV Sıvı Bolusu (20 mL/kg), Antihistaminik (Feniramin) ve Kortikosteroid (Prednol) dozları otomatik hesaplanır.
   - **Sıfır Kaymalı Canlı Geri Sayım Sayacı:** Adrenalin uygulandığı an 5 dakikalık geri sayım başlar; sekme arka plana alınsa, telefon ekranı kilitlense veya sayfa yenilense dahi gerçek zaman damgası (`targetEndTimestampMs`) üzerinden saniyesi saniyesine senkronize kalır.
2. **🧠 Status Epileptikus AES Kılavuzu & Kronometre:**
   - Amerikan Epilepsi Derneği (AES) evreleme rehberi:
     - *0–5 dk (Stabilizasyon & Kan Şekeri)*
     - *5–20 dk (1. Basamak - Kilo bazlı Midazolam / Diazepam)*
     - *20–40 dk (2. Basamak - Levetirasetam, Fenitoin, Valproat)*
     - *>40 dk (3. Basamak - Refrakter Status)*
   - Canlı durdurulabilir/sıfırlanabilir ve oturum korumalı nöbet kronometresi.
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

## 💻 Klinik İş İstasyonu & Ergonomi (Quick Switcher Ctrl+K)

- **⌨️ Ctrl+K / Cmd+K Hızlı Motor & İlaç Değiştirici:**
  - Klavyeden sayfayı kaydırmadan herhangi bir motora (*"Parkland", "Bhutani", "Wells", "Tanjant"*) anında atlama.
  - Quick Switcher içine **Parol, Aspirin, Augmentin, Arveles** gibi ilaç isimleri yazıldığında doğrudan Akılcı Reçete motoruna atlar ve aramayı otomatik başlatır.
- **🌙 Gece / Gündüz Teması (Dark & Light Mode):** Gece nöbetlerinde gözü yormayan derin koyu tema ve gündüz poliklinik ışığına uygun aydınlık tema.
- **📦 Klinik Paketler (Workstation Packages):** 9 hazır branş paketi (Pediatri, Acil Travma, Kardiyo, Yoğun Bakım vb.) ve hekimin kendi çalışma ortamını kaydedebileceği kalıcı özel paketler.
- **🔗 Özyinelemeli Bağımlılık Çözücü:** İdame sıvı seçildiğinde arka plandaki Kilo-Boy, Yaş ve Elektrolit motorlarını otomatik olarak görünür kılar.

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
git clone https://github.com/VelliDR/klinik-pwa-deneme.git
cd klinik-pwa-deneme

# 2. Bağımlılıkları yükleyin
npm install

# 3. Geliştirme sunucusunu başlatın
npm run dev

# 4. Kapsamlı test paketini çalıştırın (21 motor + TİTCK + DOM testleri)
npm test

# 5. TypeScript derleme ve tip kontrolü
npm run typecheck

# 6. Üretim (Production) PWA paketini derleyin
npm run build
```

### 🧪 Test & Modüler Kontrolcü Mimarisi
Uygulama arayüzü `src/controllers/` altındaki modüler denetleyicilere (`ecgUiController`, `emergencyUiController`, `prescriptionModalController`, `monographModalController`) ayrıştırılmış olup testler `tests/` dizininde katı doğrulamalarla yürütülür:
- `test_engines.js`: 21 klinik motorun kılavuz doğruluk testleri ve tüm DOM kimliklerinin eksiksiz varlık kontrolü.
- `test_ts_engines.ts`: TypeScript motorlarının sınır değer, KDIGO 2024, AAP 2022 / TND 2014, TPHD/Mentzer, ATLS-10/Ranson ve acil zamanlayıcı testleri.
- `test_drug_search.js`: 18.212 ilaçlık TİTCK kataloğu, 125 çevrimdışı klinik ilaç monografı eşleştirmesi, çok modlu arama ve muadil algoritması doğrulaması.
- `test_workstation_packages.js`: 21 klinik motorun özyinelemeli bağımlılık zincirleri ve paket yönetimi.
- `test_workstation_shortcuts.js` & `test_ts_app.ts`: İş istasyonu kısayolları, reaktif döngü ve modüler UI denetleyicileri.
- `test_pwa_offline.ts`: Service Worker, Workbox, 125 çevrimdışı monograf paketi ve çevrimdışı önbellek dayanıklılığı.

---

## ⚠️ Yasal Uyarı & Sorumluluk Reddi

Bu yazılım yalnızca **tıp hekimleri, asistan hekimler, tıp öğrencileri ve yetkili sağlık profesyonellerine yönelik bir klinik karar destek ve eğitim aracıdır**. 

Hesaplanan hiçbir dozaj, sıvı hacmi veya skorlama sonucu bir hekimin bağımsız klinik muhakemesi, hasta başı fizik muayenesi ve profesyonel tıbbi kanaati yerine geçemez. İlaç uygulamaları ve tedaviler her zaman hastanın bireysel durumuna, alerji öyküsüne ve güncel prospektüs/kılavuz bilgilerine göre hekim tarafından teyit edilmelidir.

---

**Geliştirici:** Dr. Velli & Klinik Karar Destek Ekibi  
**Lisans:** MIT License — Açık Kaynak Klinik Yazılım Girişimi