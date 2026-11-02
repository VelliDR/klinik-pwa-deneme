# Klinik Karar Destek Asistanı (Klinik PWA)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Workbox_Offline_First-008080?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Lisans: AGPL v3](https://img.shields.io/badge/Lisans-GNU_AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TİTCK Data](https://img.shields.io/badge/TİTCK-18%2C212_İlaç_%2B_135_Monograf-E11D48)](https://www.titck.gov.tr/)
[![Clinical Motors](https://img.shields.io/badge/Klinik_Motor-21_Modül-8B5CF6)](https://github.com/VelliDR/klinik-pwa-deneme)
[![Tests](https://img.shields.io/badge/Test_Suite-54_Bölüm_Doğrulandı-10B981)](https://github.com/VelliDR/klinik-pwa-deneme)
[![Privacy](https://img.shields.io/badge/Veri_Gizliliği-İstemci_Taraflı_(Client--Side)-blue)](https://kvkk.gov.tr/)

Klinik Karar Destek Asistanı; acil servis, poliklinik ve yataklı servislerde görev yapan hekimler ve sağlık çalışanları için tasarlanmış, açık kaynaklı ve çevrimdışı öncelikli (offline-first) bir klinik hesaplama, akılcı ilaç güvenliği ve dokümantasyon aracıdır.

Projenin temel amacı; yoğun klinik çalışma temposunda sık başvurulan kılavuz algoritmalarını, pediatrik ve erişkin dozaj hesaplamalarını, çoklu ilaç etkileşim denetimini ve epikriz dokümantasyonunu tek bir arayüzde toplayarak hekimin karar verme sürecine pratik ve güvenilir bir asistan sunmaktır.

---

> [!IMPORTANT]
> ### Klinik ve Yasal Sorumluluk Reddi (Disclaimer)
> Bu uygulama, yalnızca **tıp hekimleri, asistan hekimler, tıp öğrencileri ve yetkili sağlık profesyonellerine yönelik bir klinik karar destek ve eğitim aracıdır**.
> 
> Uygulamada yer alan hesaplama sonuçları, dozaj önerileri, etkileşim uyarıları ve skorlama yorumları bir hekimin bağımsız klinik muhakemesi, hasta başı fizik muayenesi ve profesyonel tıbbi değerlendirmesi yerine geçemez. İlaç uygulamaları, sıvı tedavileri ve klinik kararlar her zaman hastanın bireysel özelliklerine, alerji öyküsüne, güncel laboratuvar verilerine ve resmi ürün kılavuzlarına (KÜB/KT) göre sorumlu hekim tarafından doğrulanmalıdır.

---

## İçindekiler

- [Tasarım ve Arayüz İlkeleri](#tasarım-ve-arayüz-ilkeleri)
- [Hızlı Başlangıç ve PWA Kurulumu](#hızlı-başlangıç-ve-pwa-kurulumu)
- [Klinik Karar Destek Motorları (21 Modül)](#klinik-karar-destek-motorları-21-modül)
  - [1. Demografi, Doğum Tarihi ve Gestasyonel Yaş](#1-demografi-doğum-tarihi-ve-gestasyonel-yaş)
  - [2. Biyometri, Mosteller BSA ve eGFR (KDIGO 2024 / Schwartz / CKD-EPI)](#2-biyometri-mosteller-bsa-ve-egfr-kdigo-2024--schwartz--ckd-epi)
  - [3. Vital Bulgular ve Triyaj Skorları (NEWS2 / PEWS / AAP 2017 BP)](#3-vital-bulgular-ve-triyaj-skorları-news2--pews--aap-2017-bp)
  - [4. Bilinç ve Nöroloji Skorlaması (GCS ve Pediatrik pGCS)](#4-bilinç-ve-nöroloji-skorlaması-gcs-ve-pediatrik-pgcs)
  - [5. Tromboemboli ve Kardiyovasküler Skorlar (Wells / PERC / HEART / AF)](#5-tromboemboli-ve-kardiyovasküler-skorlar-wells--perc--heart--af)
  - [6. Nefroloji, Toksikoloji ve Enfeksiyon (FENa / FEUrea / NAC / CURB-65)](#6-nefroloji-toksikoloji-ve-enfeksiyon-fena--feurea--nac--curb-65)
  - [7. Yenidoğan ve Hiperbilirubinemi (AAP 2022 / TND 2014 / Maisels)](#7-yenidoğan-ve-hiperbilirubinemi-aap-2022--tnd-2014--maisels)
  - [8. Kan Gazı Analizi ve Fizyopatolojik Asit-Baz Motoru (ABG / VBG)](#8-kan-gazı-analizi-ve-fizyopatolojik-asit-baz-motoru-abg--vbg)
  - [9. İdame Sıvı Tedavisi (Holliday-Segar ve TND Yenidoğan)](#9-idame-sıvı-tedavisi-holliday-segar-ve-tnd-yenidoğan)
  - [10. Sıvı-Elektrolit Dengesi (Adrogué-Madias Sodyum ve Kalsiyum)](#10-sıvı-elektrolit-dengesi-adrogué-madias-sodyum-ve-kalsiyum)
  - [11. Kardiyoloji ve EKG Analizi (QTc / Aks / Tisdale Risk Skoru)](#11-kardiyoloji-ve-ekg-analizi-qtc--aks--tisdale-risk-skoru)
  - [12. Endokrinoloji ve Glukokortikoid Eşdeğerlik Dönüşümü](#12-endokrinoloji-ve-glukokortikoid-eşdeğerlik-dönüşümü)
  - [13. İnfüzyon Hızı ve Glukoz İnfüzyon Hızı (GIR)](#13-infüzyon-hızı-ve-glukoz-infüzyon-hızı-gir)
  - [14. Pediatrik Büyüme, Persentil ve Kraniyal Tarama (NICE / WHO / Neyzi 2015)](#14-pediatrik-büyüme-persentil-ve-kraniyal-tarama-nice--who--neyzi-2015)
  - [15. Pediatrik Demir Eksikliği ve Talasemi Ayrımı (TPHD ve Mentzer)](#15-pediatrik-demir-eksikliği-ve-talasemi-ayrımı-tphd-ve-mentzer)
  - [16. Pediatrik Şurup ve Süspansiyon Dozlama Motoru](#16-pediatrik-şurup-ve-süspansiyon-dozlama-motoru)
  - [17. Türkiye Ulusal ve Özel Bağışıklama Protokolleri (GBP 2026)](#17-türkiye-ulusal-ve-özel-bağışıklama-protokolleri-gbp-2026)
  - [18. Centor / McIsaac Farenjit Değerlendirmesi](#18-centor--mcisaac-farenjit-değerlendirmesi)
  - [19. Kadın Doğum ve Obstetrik Hesaplayıcı (Naegele / Bishop / Preeklampsi)](#19-kadın-doğum-ve-obstetrik-hesaplayıcı-naegele--bishop--preeklampsi)
  - [20. Cerrahi Skorlar ve Yanık Sıvı Resüsitasyonu (ATLS 10 / Alvarado / Ranson)](#20-cerrahi-skorlar-ve-yanık-sıvı-resüsitasyonu-atls-10--alvarado--ranson)
  - [21. Akılcı Reçete, İlaç Güvenliği ve Etkileşim Denetimi](#21-akılcı-reçete-ilaç-güvenliği-ve-etkileşim-denetimi)
- [Canlı SOAP Klinik Notu Sentezi](#canlı-soap-klinik-notu-sentezi)
- [TİTCK İlaç Kataloğu ve 135 Klinik Monograf](#titck-ilaç-kataloğu-ve-135-klinik-monograf)
- [Acil Durum Protokolleri ve Canlı Zamanlayıcılar](#acil-durum-protokolleri-ve-canlı-zamanlayıcılar)
- [A4 Hasta Reçete ve Dozaj Çizelgesi](#a4-hasta-reçete-ve-dozaj-çizelgesi)
- [Gizlilik ve Veri Güvenliği (KVKK / GDPR)](#gizlilik-ve-veri-güvenliği-kvkk--gdpr)
- [Geliştirici ve Kurulum Rehberi](#geliştirici-ve-kurulum-rehberi)
- [Lisans](#lisans)

---

## Tasarım ve Arayüz İlkeleri

1. **Ağırbaşlı ve Odaklı Klinik Tipografi:** Gereksiz gösterişli neon ışıklar, parıltılar ve karmaşık animasyonlar yerine gözü yormayan, klinik çalışma ortamının ciddiyetine uygun mat renk paletleri ve net tipografi tercih edilmiştir.
2. **Saf SVG İkonografisi:** Arayüz bileşenlerinde rastgele işletim sistemi emojileri yerine anlamı ve ölçeği sabit, metin hizalı saf inline SVG vektörleri kullanılır.
3. **Yaylı Mikro-Etkileşimler:** Tıklanabilir elemanlar ve uyarı rozetlerinde aşırıya kaçmayan, dokunsal geri bildirim sağlayan yaylı mikro-animasyonlar (`cubic-bezier(0.34, 1.56, 0.64, 1)`) kullanılmıştır.
4. **Çift Tema Desteği:** Poliklinik gündüz aydınlatması için optimize edilmiş yüksek kontrastlı Aydınlık Mod (`Light Theme`) ve gece nöbetleri için tasarlanmış derin Karanlık Mod (`Dark Theme`).
5. **Kılavuz Temelli Modelleme:** Algoritmalar uluslararası ve ulusal tıp kılavuzları (KDIGO 2024, AAP 2022, ATLS-10, AHA/ACC, WHO 2022/2023, TND, TPHD, T.C. Sağlık Bakanlığı) referans alınarak kurgulanmış ve test paketleriyle doğrulanmıştır.
6. **Çevrimdışı Çalışma (Offline-First):** PWA mimarisi sayesinde uygulama, internet erişiminin bulunmadığı hastane alanlarında da 18.212 ruhsatlı ilaç kaydı, 135 çevrimdışı klinik monograf ve tüm hesaplama motorlarıyla yerel olarak çalışmayı sürdürür.
7. **Klinik Ergonomi ve Reaktivite:** Veri girişleri reaktif olarak hesaplanır; mükerrer girişleri azaltmak adına laboratuvar değerleri (örneğin serum sodyumu veya kreatinin) ilgili alt motorlara otomatik olarak aktarılır.
8. **Modüler İş İstasyonu Yapısı:** Farklı uzmanlık alanlarına (Pediatri, Acil, Yoğun Bakım, Kadın Doğum vb.) uygun hazır paketler veya hekimin özelleştirebileceği kalıcı kart kombinasyonları sunulur.

---

## Hızlı Başlangıç ve PWA Kurulumu

Uygulama standart bir modern web tarayıcısı üzerinden doğrudan çalıştırılabilir. Progressive Web App (PWA) desteği sayesinde masaüstü veya mobil cihazlarda yerel bir yazılım gibi yüklenebilir:

- **Canlı Uygulama:** [https://vellidr.github.io/klinik-pwa-deneme/](https://vellidr.github.io/klinik-pwa-deneme/)
- **Yükleme:** Tarayıcı adres çubuğundaki *"Yükle"* simgesini veya tarayıcı menüsündeki *"Ana Ekrana Ekle"* seçeneğini kullanabilirsiniz.

---

## Klinik Karar Destek Motorları (21 Modül)

### 1. Demografi, Doğum Tarihi ve Gestasyonel Yaş
- **Kronolojik Yaş:** Gün, ay ve yıl bazında hassas yaş hesaplaması.
- **Prematüre Düzeltilmiş Yaş:** $<37$ gestasyonel haftada doğan bebeklerde düzeltilmiş ay ve hafta hesabı; persentil eğrilerine otomatik uyarlama.
- **Postnatal Saat:** Yenidoğan sarılığı değerlendirmesinde ilk 14 gün (336 saat) için saat bazlı yaş takibi.

### 2. Biyometri, Mosteller BSA ve eGFR (KDIGO 2024 / Schwartz / CKD-EPI)
- **Vücut Yüzey Alanı (BSA):** Mosteller formülü ($\text{BSA} = \sqrt{\frac{\text{Boy (cm)} \times \text{Kilo (kg)}}{3600}}$).
- **Pediatrik eGFR ($<18$ yaş):** IDMS izlenebilir yatakbaşı Schwartz ($k=0.413$) veya klasik Jaffe tahlil seçimi; $<1$ yaş bebeklerde term ($k=0.45$) ve prematüre ($k=0.33$) sabitleri.
- **Erişkin eGFR ($\ge 18$ yaş):** KDIGO 2024 önerili 2021 CKD-EPI Kombine Kreatinin + Sistatin C ($\text{eGFR}_{\text{cr-cys}}$), izole Kreatinin veya izole Sistatin C denklemleri.
- **Dozlama İçin Mutlak GFR:** Obez ve kaşektik hastalarda dar terapötik indeksli ilaçlar için BSA de-indekslemesi ($\text{eGFR}_{\text{mutlak}} = \text{eGFR} \times \frac{\text{BSA}}{1.73}\text{ mL/dk}$).

### 3. Vital Bulgular ve Triyaj Skorları (NEWS2 / PEWS / AAP 2017 BP)
- **NEWS2 (National Early Warning Score 2):** Erişkin hastalarda solunum sayısı, $\text{SpO}_2$, oksijen desteği, sistolik tansiyon, nabız, bilinç düzeyi ve ateş üzerinden klinik dekompansasyon risk analizi.
- **Pediatrik PEWS:** Yaşa göre fizyolojik parametrelerden pediatrik erken uyarı puanlaması.
- **AAP 2017 Pediatrik Tansiyon:** Yaş, cinsiyet ve boy persantiline göre normotansif, evre 1 ve evre 2 hipertansiyon evrelemesi.

### 4. Bilinç ve Nöroloji Skorlaması (GCS ve Pediatrik pGCS)
- **Erişkin GCS:** Göz açma, sözel yanıt ve motor yanıt bileşenleri (3–15 puan).
- **Pediatrik pGCS ($<2$ yaş):** Konuşma öncesi (preverbal) çocuklara uygun sözel ve motor değerlendirme kriterleri.

### 5. Tromboemboli ve Kardiyovasküler Skorlar (Wells / PERC / HEART / AF)
- **Wells DVT ve Wells PTE:** Derin ven trombozu ve pulmoner emboli klinik olasılık skorlamaları.
- **PERC Kuralı:** Düşük riskli olgularda gereksiz D-Dimer ve radyolojik tetkik yükünü azaltmaya yönelik dışlama kriterleri.
- **HEART Skoru:** Acil servise göğüs ağrısıyla başvuran hastalarda 6 haftalık majör kardiyak olay (MACE) risk analizi.
- **CHA₂DS₂-VASc ve HAS-BLED:** Atriyal fibrilasyon hastalarında inme riski ile antikoagülan kullanımına bağlı majör kanama riski dengesi.

### 6. Nefroloji, Toksikoloji ve Enfeksiyon (FENa / FEUrea / NAC / CURB-65)
- **FENa ve FEUrea:** Prerenal azotemi ile Akut Tubuler Nekroz (ATN) ayrımı; diüretik kullanan hastalarda FEUrea önceliği.
- **Düzeltilmiş Sodyum (Katz ve Hillier):** Hiperglisemi varlığında ölçülen sodyumun düzeltilmesi ve osmolal açık hesabı.
- **Rumack-Matthew Nomogramı ve NAC:** Parasetamol intoksikasyonunda saat bazlı toksisite değerlendirmesi ve pediatrik sıvı kısıtlamalı 3 kademeli IV NAC protokolü.
- **CURB-65 ve CRB-65:** Toplum kökenli pnömoni ciddiyet derecesi ve ayaktan/yatarak takip önerisi.

### 7. Yenidoğan ve Hiperbilirubinemi (AAP 2022 / TND 2014 / Maisels)
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
- **Westley Krup Skoru ve CDS Dehidratasyon Skalası.**

### 8. Kan Gazı Analizi ve Fizyopatolojik Asit-Baz Motoru (ABG / VBG)
- **3 Ekolün Eş Zamanlı Analizi (Boston, Kopenhag ve Stewart-Fencl):**
  - **Boston Ekolü (Henderson-Hasselbalch):** Primer asidoz/alkaloz tespiti, fizyolojik kompanzasyon sınırları (Winter formülü $pCO_2 = 1.5 \times HCO_3 + 8 \pm 2$, metabolik alkaloz kuralı $pCO_2 = 0.7 \times \Delta HCO_3 + 40 \pm 2$, akut/kronik respiratuar 1-4-2-5 kompanzasyon katsayıları) ve aşırı kompanzasyon imkansızlığı kalkanı.
  - **Kopenhag Ekolü (Siggaard-Andersen Van Slyke SBE):** $\text{SBE} = (HCO_3 - 24.8) + 16.2 \times (pH - 7.40)$ denklemiyle solunumsal dalgalanmalardan arındırılmış saf ekstrasellüler standart baz fazlalığı/açığı (normal referans: $-2$ ila $+2\text{ mEq/L}$).
  - **Stewart-Fencl Fizikokimyasal Modeli:**
    - Görünür İyon Farkı: $\text{SID}_a = [Na^+] - [Cl^-]$ (Normal: $38 - 42\text{ mEq/L}$). Düşük $\text{SID}_a$ ile iyatrojenik hiperkloremik asidoz (SF yüklemesi) ayrımı.
    - SBE Bileşen Ayrıştırması: Klor katkısı ($\text{SBE}_{Na-Cl}$), albümin tamponu ($\text{SBE}_{Alb}$) ve ölçülemeyen anyonlar ($\text{SBE}_{\text{unmeasured}}$).
    - Güçlü İyon Açığı: $\text{SIG} = \text{SID}_a - \text{SID}_e$ ile gizli patolojik anyon tespiti.
- **İç Kalite ve Kassirer-Bleich Doğrulaması:**
  - $[H^+] = 24 \times \frac{pCO_2}{HCO_3}\text{ nmol/L}$ ile ölçülen $[H^+] = 10^{(9-pH)}$ ve yatak başı kuralı $[H^+] \approx 80 - (\text{pH ondalığı})$ kıyaslaması; sapma $>\%10$ ise analizör kalibrasyonu veya preanalitik numune hatası uyarısı.
- **Anyon Açığı (AG), Figge Albümin Düzeltmesi ve Delta Analizi:**
  - Hipoalbüminemi ile maskelenen gizli HAGMA'ların tespiti ($\text{Düz. AG} = \text{AG} + 2.5 \times (4.0 - \text{Albüm})$).
  - $\Delta/\Delta$ Delta oranı ($\Delta\text{AG} / \Delta\text{HCO}_3$) ve $\Delta\text{Gap} = \Delta\text{AG} - \Delta\text{HCO}_3$ ile mikst HAGMA + NAGMA veya HAGMA + Metabolik Alkaloz üçlü bozukluk taraması.
- **Oksijenasyon, Alveolo-Arteriyel ($A\text{-}a$) Gradiyenti ve Berlin ARDS:**
  - Alveolar Gaz Denklemi ($PAO_2 = FiO_2 \times (P_B - 47) - \frac{PaCO_2}{0.8}$).
  - Ölçülen ve yaşa göre beklenen $A\text{-}a$ gradiyenti ($(\text{Yaş}/4) + 4$) ile hipoksemi mekanizma ayrımı: Normal $A\text{-}a$ (Saf hipoventilasyon, sedatif intoksikasyonu, KOAH) vs Yüksek $A\text{-}a$ (V/Q uyumsuzluğu, difüzyon defekti veya intrapulmoner sağdan sola şant).
  - Horovitz İndeksi ($PaO_2 / FiO_2$) ve Berlin 2012 ARDS evrelemesi (Hafif: $201-300$, Orta: $101-200$, Ağır: $\le 100\text{ mmHg}$).
- **Vücut Sıcaklığı Düzeltmesi (Alpha-stat vs pH-stat):**
  - Hipotermi ve hipertermide in vivo $pH$, $pCO_2$ ve $pO_2$ değerleri; erişkin yoğun bakımda Alpha-stat yaklaşımı ve pediatrik KPB için pH-stat notları.
- **Venöz (VBG) Arteriyel Eşdeğeri ve Şok Alarmı:**
  - $pH (+0.035)$, $pCO_2 (-5\text{ mmHg})$ ve $HCO_3 (-1.5\text{ mEq/L})$ düzeltmeleri. Veno-arteriyel $pCO_2$ farkının ($\Delta pCO_2 > 6\text{ mmHg}$) kardiyak debi azlığı ve doku hipoperfüzyonunu gösteren uyarısı.
- **Yenidoğan Fizyolojik Normları ($<28$ gün):**
  - Yaşamın ilk ayında fizyolojik asidoz normları ($pH\text{ 7.30–7.42}$, $HCO_3\text{ 19–24 mEq/L}$, $pCO_2\text{ 35–48 mmHg}$) ile gereksiz agresif müdahalelerin önlenmesi.

### 9. İdame Sıvı Tedavisi (Holliday-Segar ve TND Yenidoğan)
- **Holliday-Segar (4-2-1 Kuralı):** Günlük toplam sıvı hacmi ve saatlik infüzyon hızı.
- **Ateş Kaybı Ayarlaması:** 37.5°C üzerindeki her 1°C artış için hidrasyon ekleme seçeneği.
- **TND Kademeli Yenidoğan Sıvısı:** Yaşam gününe göre dinamik sıvı önerisi.

### 10. Sıvı-Elektrolit Dengesi (Adrogué-Madias Sodyum ve Kalsiyum)
- **Sodyum Açığı Hesabı:** Seçilen infüzyon sıvısının (SF, %3 NaCl vb.) serum sodyumu üzerindeki tahmini değişimi ve güvenli infüzyon hızı önerisi.
- **Yaşa Uygun TBW Fraksiyonu:** Yenidoğanda 0.70, infantta 0.65, çocukta 0.60 ve erişkin/geriatride cinsiyete özel toplam vücut sıvısı katsayıları.
- **Düzeltilmiş Kalsiyum:** Hipoalbüminemi varlığında iyonize kalsiyum tahmini.

### 11. Kardiyoloji ve EKG Analizi (QTc / Aks / Tisdale Risk Skoru)
- **Çoklu QTc Denklemleri:** Bazett, Fridericia ve dal bloklarında (LBBB, RBBB, Pace) Bogossian (QTcBog) formülü.
- **EKG Kağıt Giriş Desteği:** Küçük kare (1 mm) sayısından doğrudan ms çevrimi; 25 mm/sn ve 50 mm/sn kağıt hızı seçenekleri.
- **AHA/ACC Teğet Yöntemi Kılavuzu:** T dalgası iniş eğimi teğeti ile kesin QT ölçümü rehberi.
- **EKG Aksı ve Tisdale Skoru:** D1 ve aVF derivasyonlarından frontal düzlem aksı ve QT uzama risk skoru.

### 12. Endokrinoloji ve Glukokortikoid Eşdeğerlik Dönüşümü
- Prednizol, Metilprednizolon, Deksametazon, Hidrokortizon ve Deflazakort arası doz dönüşüm tablosu.
- **HOMA-IR:** Açlık kan şekeri ve açlık insülininden insülin direnci hesabı.

### 13. İnfüzyon Hızı ve Glukoz İnfüzyon Hızı (GIR)
- **İlaç Perfüzörü:** $\mu\text{g/kg/dk}$, $\mu\text{g/dk}$ veya $\text{mg/kg/saat}$ hedef dozlarından $\text{mL/saat}$ pompa hızı hesabı.
- **Glukoz İnfüzyon Hızı (GIR):** Dekstroz yüzdesi ve infüzyon hızından yenidoğanda $\text{mg/kg/dk}$ glukoz akış hesabı.

### 14. Pediatrik Büyüme, Persentil ve Kraniyal Tarama (NICE / WHO / Neyzi 2015)
- **Cole & Green Kısıtlı LMS Persentil Motoru:**
  - **Z-Skoru Hesabı:** $Z = \frac{(X/M)^L - 1}{L \cdot S}$ ($L \ne 0$) ve $Z = \frac{\ln(X/M)}{S}$ ($L = 0$). Sağa çarpık dağılımlarda (özellikle kilo ve VKİ) $|Z| > 3\text{ SD}$ bölgesinde Box-Cox patlamasını önleyen kısıtlı doğrusal ekstrapolasyon (WHO Restricted LMS).
  - **LMS Ters Dönüşüm (Eşik Değerleri):** $X_c = M \cdot (1 + L \cdot S \cdot Z)^{1/L}$ formülüyle hastanın yaşına ve cinsiyetine özel fiziksel persentil eğrisi ölçüm değerleri.
  - **Hassas Normal Dağılım Dönüşümü:** Abramowitz & Stegun Eq. 26.2.19 polinom yaklaşımı ile maksimum mutlak hata $<7.5 \times 10^{-8}$ olacak şekilde kesin persentil hesabı ($P_{0.13}, P_3, P_{50}, P_{97}, P_{99.87}$).
- **Standart Sapma Bandı ve Klinik İzlem Sınıflandırması:**
  - **$Z < -3.00\text{ SD}$ ($P < 0.13$ — Belirgin Sapma):** Ağır patolojik gerilik (ağır bodurluk, ağır kavrukluk veya mikrosefali); acil ileri tetkik ve müdahale.
  - **$-3.00 \le Z < -1.88\text{ SD}$ ($P_{0.13} - P_3$ — Çizili Bandın Dışı):** Normal aralığın altı (boy kısalığı, malnütrisyon); pediatrik/endokrinolojik izlem.
  - **$-1.88 \le Z < -1.04\text{ SD}$ ($P_3 - P_{15}$ — Normal Bant İçi):** Düşük-normal aralık; persentil kaybı açısından yakın takip.
  - **$-1.04 \le Z \le +1.04\text{ SD}$ ($P_{15} - P_{85}$ — Normal Bant İçi):** Optimal fizyolojik büyüme aralığı ($Z = 0 \to P_{50}$).
  - **$+1.04 < Z \le +1.88\text{ SD}$ ($P_{85} - P_{97}$ — Normal Bant İçi):** Yüksek-normal aralık; ağırlık ve VKİ için fazla kiloluluk eğilimi izlemi.
  - **$+1.88 < Z \le +3.00\text{ SD}$ ($P_{97} - P_{99.87}$ — Çizili Bandın Dışı):** Normal aralığın üstü; VKİ için obezite, baş çevresi için makrosefali/hidrosefali eşiği.
  - **$Z > +3.00\text{ SD}$ ($P > 99.87$ — Belirgin Sapma):** Morbid obezite, jigantizm veya patolojik aşırı büyüme.
- **İnteraktif Persentil Yüzdeleri Cetveli:**
  - Boy, Ağırlık, VKİ ve Baş Çevresi için `Persentil (P3, P10, P25, P50, P75, P90, P97)` ve `Z-Skor (-3 SD, -2 SD, -1 SD, 0 SD, +1 SD, +2 SD, +3 SD)` anlık geçiş düğmeleri.
  - Hastanın mevcut ölçüm değerinin cetvel üzerinde dinamik vurgulanması ve sapma rozetiyle birlikte sunumu.
- **Görsel Persentil Spektrum Çubukları:**
  - Her antropometrik parametre için 5 klinik aralığı ($<3p$, $3-15p$, $15-85p$, $85-97p$, $>97p$) renk kodlu bloklarla gösteren ve hastanın konumunu yansıtan hassas iğne göstergesi.
- **VKİ Persentili ve Çift Standart Karşılaştırması:**
  - Boy ve kilo girildiğinde VKİ Z-skoru, persentili ve DSÖ vs Neyzi 2015 ulusal referansı arası diskordans uyarısı.
- **10-Kanallı Centile Yapısı ve Büyüme Hızı (NICE Kılavuzu):**
  - Yaşa göre beklenen $\text{cm/yıl}$ büyüme hızı ve doğum persentiline göre $\ge 2$ kanal düşüşü (growth faltering) uyarısı.
- **WHO 2022/2023 Akut Malnütrisyon:** Boya göre ağırlık Z-skoruna dayalı SAM (Ağır Akut Malnütrisyon) ve MAM (Orta Akut Malnütrisyon) sınıflandırması ve beslenme protokolü uyarıları.
- **Kraniyal Tarama ve Hidrosefali Güvenlik Kalkanı (0-18 yaş):** Baş çevresi persentil analizi, fontanel kapanma yaşına duyarlı tetkik önerisi ($<24$ ay Transfontanel USG, $\ge 24$ ay MRG).

### 15. Pediatrik Demir Eksikliği ve Talasemi Ayrımı (TPHD ve Mentzer)
- **TPHD ve T.C. Sağlık Bakanlığı Protokolü:** Term ve preterm bebeklerde profilaktik demir takvimi ($1-2\text{ mg/kg/gün}$).
- **Yaşa Özgü Anemi Eşikleri:** Fizyolojik nadir dönemi dahil yaş gruplarına göre eşikler ve terapötik doz hesabı ($3-6\text{ mg/kg/gün}$).
- **Mentzer İndeksi ($\text{MCV}/\text{RBC}$):** Mikrositik anemide demir eksikliği ile $\beta$-talasemi taşıyıcılığı ayrımına yardımcı gösterge.

### 16. Pediatrik Şurup ve Süspansiyon Dozlama Motoru
- Kilo bazlı miligram dozlama, konsantrasyon kilitleri ve ölçek (5 mL) / oral şırınga (mL) hacim dönüşümü.
- **Yaş Bilgisi Eksikliği Güvenlik Kalkanı:** Kodein, tramadol, TMP-SMX ve ondansetron gibi yaşa bağlı mutlak kontrendikasyonu veya kısıtlaması bulunan ilaçlarda yaş girilmeden doz hesaplaması bloke edilir; hekimden yaş doğrulaması istenir.
- **TİTCK ve BNFc Çift Eşik Denetimi:** Türkiye ruhsatlı konsantrasyonlar ile BNFc referansları arasında doz doğrulama (örn. İbuprofen için $<3$ ay kontrendikasyonu ve BNFc MenB aşı sonrası ateş dar istisnası; TİTCK $<6$ ay / $<7\text{ kg}$ ruhsat kısıtı).
- **Erişkin Tavan Doz Kısıtlaması (Cap Clamping):** Çocuklarda hesaplanan dozun erişkin maksimum tekil veya günlük dozunu aşmasını önleyen sınırlama.
- **Pediatrik Obezitede Ağırlık Metriği ve IBW:** BMI persantili $>95$ olan obez çocuklarda hidrofilik parasetamol için İdeal Vücut Ağırlığı ($\text{IBW}$), vankomisin için Düzeltilmiş Ağırlık ($\text{AdjBW}$), amoksisilinde gerçek kilo ($\text{TBW}$) ile tavan budaması.

### 17. Türkiye Ulusal ve Özel Bağışıklama Protokolleri (GBP 2026)
- **T.C. Sağlık Bakanlığı GBP 2025/2026 Reformları:**
  - **14 Nisan 2025 Heksavalan Reformu:** Beş bileşenli karma aşının yerini altı bileşenli karma aşıya (**DaBT-İPA-Hib-HepB**) bırakması. Sağlıklı çocuklarda 1. ve 6. aylardaki ayrı monovalan Hep-B enjeksiyonları kaldırılmış; 2, 4, 6 ve 18. aylarda $3+1$ şemasıyla tek enjektörde toplanarak travma ve soğuk zincir yükü azaltılmıştır.
  - **1 Eylül 2026 Suçiçeği Reformu:** Tek doz rejiminin ilerleyen yaşlarda yol açtığı koruyuculuk kaybını (*breakthrough varisella*) engellemek amacıyla **48. aya (4 yaş) rutin 2. doz** entegre edilmiş; takvim değişikliğinden önce tek doz almış 49–72 ay arasındaki çocuklara tek dozluk yakalama protokolü tanımlanmıştır.
  - **2 Nisan 2025 Maternal Tdab Protokolü:** Yenidoğanı ilk 2 aylık savunmasız dönemde boğmaca apnesi ve komplikasyonlarından korumak için her gebelikte geçmiş aşıya bakılmaksızın 18–24 veya 27–36. gebelik haftalarında 1 doz **Tdab** aşılaması başlatılmıştır.
- **Ulusal Takvim Dışı Özel Aşı Protokolleri:**
  - **Rotavirüs (Rotarix ve RotaTeq):** 6 hafta ile 14 hafta 6 gün altın standart penceresi ($15\text{ hafta }0\text{ gün}$ ve sonrasında invajinasyon riski nedeniyle ilk doz kesinlikle başlanamaz); Rotarix 24. haftada, RotaTeq en geç 32. haftada (8 ay 0 gün) tamamlanmalıdır.
  - **Meningokok Profilaksisi:** MenACWY (*Nimenrix, Menveo, Menactra, MenQuadfi*) ile 4 bileşenli rekombinant MenB (*Bexsero*, reaktif ateşe karşı profilaktik parasetamol önerili) süt çocukluğu ($2+1$), 2 yaş üstü ve adölesan rapel şemaları.
  - **HPV (Gardasil 9):** 9 yaşından itibaren cinsiyet ayrımı gözetilmeksizin kız ve erkek çocuklarda onkojenik karsinom ve siğil profilaksisi (9–14 yaş 2 doz: 0, 6. ay; $\ge 15$ yaş 3 doz: 0, 2, 6. ay).
  - **Rekombinant Zona (Shingrix):** Canlı virüs içermeyen adjuvanlı alt ünite aşısı; $\ge 50$ yaş tüm erişkinlerde ve $\ge 19$ yaş immünsüpresif bireylerde 2 doz ($0$ ve $2-6.$ aylar).
  - **Kuadrivalan İnfluenza (IIV4):** $\ge 6$ aylık tüm bireylerde yıllık sonbahar aşısı (ilk kez aşılanan $<9$ yaş çocuklarda 4 hafta arayla 2 doz).
- **Özel Tıbbi Risk Grupları ve Karar Destek Algoritması:**
  - **HBsAg (+) Anne Bebeği:** Doğumda ilk 12 saatte monovalan Hep-B + HBIG $\to$ 1. ayda monovalan Hep-B $\to$ 2, 4, 6, 18. aylarda 6'lı heksavalan aşı $\to$ 9–12. aylarda Anti-HBs ve HBsAg serolojik teyidi.
  - **Anatomik / Fonksiyonel Aspleni (OPSI Sendromu Kalkanı):** Pnömokok konjuge/polisakkarit ardışık protokolü (KPA13 $\to$ 8 hafta sonra PPA23 [5 yıl sonra 1 rapel]), 2 doz MenACWY, 2 doz MenB ve Hib.
  - **BOS Kaçağı ve Koklear İmplant:** Retrograd menenjiti engellemek için 1 doz KPA13 $\to$ en az 8 hafta sonra 1 doz PPA23.
  - **Geriatrik Popülasyon ($\ge 65$ yaş):** 1 doz KPA13 $\to$ 1 yıl sonra PPA23, yıllık IIV4, 2 doz Shingrix ve 10 yılda bir Td pekiştirmesi.
  - **Sağlık Çalışanları:** Anti-HBs taraması ($<10\text{ mIU/mL}$ ise 3 doz HepB), Tdab/Td, KKK, Suçiçeği ve yıllık grip aşılaması.
- **Kontrendikasyonlar ve Aşı Güvenlik Kalkanı:**
  - *Kesin (Mutlak):* Önceki dozda sistemik anafilaksi, canlı aşılarda ağır immün yetmezlik (SCID, lösemi vb.), gebelik, rotavirüste invajinasyon/GİS anomalisi, boğmacada akut ensefalopati.
  - *Geçici Erteleme:* Akut orta/ağır ateşli hastalık; kan/IVIG transfüzyonundan sonra canlı parenteral aşılar için 3–11 ay erteleme.
  - *Yanlış Engeller (Aşılamaya Mani Olmayan Haller):* Ateş $<38.5^\circ\text{C}$, hafif ÜSYE, antibiyotik kullanımı, prematürite (düzeltilmiş değil kronolojik yaşla aşılanır), anne sütü, nörolojik stabilite (serebral palsi, kontrollü epilepsi), egzama/alerji, düşük doz steroid ve malnütrisyon.
- **Kompakt Arayüz ve Aşı Bilgi Bankası Modalı:**
  - Ana pediatrik kart üzerinde arayüz kalabalığı oluşturmamak için aşı bölümünün sağ üst köşesinde detay tablosu butonu yer alır.
  - Tıklandığında 4 ana tabloyu (Ulusal Takvim, Özel Aşılar, Risk Grupları, Kontrendikasyonlar ve Karar Triyaj Akışı) canlı arama destekli olarak sunan modal açılır.

### 18. Centor / McIsaac Farenjit Değerlendirmesi
- Grup A Streptokok farenjiti olasılığı, hızlı antijen testi gereksinimi ve ampirik antibiyotik kararına destek.

### 19. Kadın Doğum ve Obstetrik Hesaplayıcı (Naegele / Bishop / Preeklampsi)
- **Naegele Tahmini Doğum Tarihi (TDT):** Son adet tarihinden gestasyonel hafta ve tahmini doğum tarihi.
- **Bishop Skoru:** Servikal olgunluk ve doğum indüksiyonu başarı değerlendirmesi.
- **Preeklampsi Riski:** Kan basıncı ve proteinüri bulgularına göre acil magnezyum sülfat ve antihipertansif protokolü rehberi.

### 20. Cerrahi Skorlar ve Yanık Sıvı Resüsitasyonu (ATLS 10 / Alvarado / Ranson)
- **Üçlü Yanık Sıvı Protokolü (ATLS 10. Baskı):**
  - Modifiye Brooke / ATLS-10 ($2\text{ mL/kg/}\%$ erişkin, $3\text{ mL/kg/}\%$ pediatrik).
  - Yüksek voltajlı Elektrik Yanığı ($4\text{ mL/kg/}\%$).
  - Klasik Parkland ($4\text{ mL/kg/}\%$).
  - İlk 8 ve sonraki 16 saatlik sıvı dağılımı; $<30\text{ kg}$ çocuklarda hipoglisemiyi önleyen %5 Dekstrozlu ek idame sıvısı.
- **Alvarado Skoru:** Akut apandisit klinik olasılığı.
- **Ranson Skoru:** Akut pankreatit başvuru ve 48. saat mortalite göstergeleri.
- **Sütür Alma Rehberi:** Anatomik bölgeye göre dikiş materyali ve dikiş alma günleri.

### 21. Akılcı Reçete, İlaç Güvenliği ve Etkileşim Denetimi
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
- **Gebelik ve Emzirme Güvenliği:** Trimester bazlı FDA/Avustralya kategorileri ve teratojenite uyarıları.
- **Yenidoğan Kontrendikasyonları:** Seftriakson + Kalsiyum presipitasyonu, sülfonamidlerde kernikterus riski gibi yaşa özel güvenlik kuralları.

---

## Canlı SOAP Klinik Notu Sentezi

Tüm aktif motorların girdi ve çıktıları, hekimin hasta kaydını kolaylaştırmak amacıyla dinamik olarak yapılandırılmış bir **SOAP (Subjektif, Objektif, Değerlendirme, Plan)** notuna dönüştürülür:

- **[S] Subjektif:** Şikayet, anamnez ve girilen semptomlar.
- **[O] Objektif:** Vital bulgular, biyometrik ölçümler, laboratuvar değerleri, persentiller ve hesaplanan skorlar.
- **[A] Değerlendirme:** Skorlara ve kılavuz eşiklerine dayalı olası klinik riskler ve ön tanılar.
- **[P] Plan ve Tedavi:** İlaç dozajları, infüzyon hızları, aşı takibi, resüsitasyon sıvıları ve taburculuk/kontrol zamanlamaları.
- **HBYS / AHBS Uyumluluğu:** Tek tıkla panoya kopyalanarak hastane bilgi yönetim sistemlerine aktarılabilir.

---

## TİTCK İlaç Kataloğu ve 135 Klinik Monograf

- **18.212 Ruhsatlı İlaç:** Türkiye İlaç ve Tıbbi Cihaz Kurumu veritabanı temelinde barkod, ticari isim, etkin madde ve ATC kodları yerel olarak indekslenmiştir.
- **135 Çevrimdışı Klinik Monograf Kartı:** En sık reçete edilen moleküller ve 25 kritik pediatrik ilaç için dozaj, maksimum günlük limit, kontrendikasyon, renal uyarlama ve gebelik güvenliği bilgileri çevrimdışı sunulur.
- **Çevrimdışı RxNorm CUI ve ATC Kavram Eşleme:** Dış ağ servislerine bağımlılığı ortadan kaldıran yerel kavram eşleme altyapısı.
- **Ağ Farkındalıklı KÜB/KT Köprüsü:** İnternet erişimi olduğunda resmi KÜB/KT belgelerine bağlantı sağlarken, çevrimdışı durumda yerel monograf kartını açar.

---

## Acil Durum Protokolleri ve Canlı Zamanlayıcılar

- **Anafilaksi Yönetimi ve 5 Dakikalık Adrenalin Sayacı:** Hastanın ağırlığına göre IM Adrenalin, IV hidrasyon ve ek ilaç dozları hesaplanır; adrenalin uygulandığı anda başlayan geri sayım sayacı sayfa yenilense veya arka plana alınsa dahi gerçek zaman damgasıyla (`Date.now()`) senkronize kalır.
- **Status Epileptikus (AES Rehberi):** Amerikan Epilepsi Derneği evrelerine göre (0-5 dk, 5-20 dk, 20-40 dk, >40 dk) ilaç önerileri ve canlı nöbet kronometresi.
- **SOAP Aktarımı:** Acil protokollerde uygulanan ilaçlar ve zaman damgaları tek tıkla hasta notuna eklenebilir.

---

## A4 Hasta Reçete ve Dozaj Çizelgesi

Hekimin reçetelediği ilaçları, hastanın ve hasta yakınının anlayabileceği sade bir dille yazdırılabilir A4 kullanım çizelgesine dönüştürür:
- Sabah, öğle, akşam, gece zamanlamaları ve aç/tok kullanım uyarıları (örn. PPI için aç karnına, statin için gece kullanımı).
- Reçete başlığı, tanı/ICD-10, alerji uyarısı ve hekim imza alanı.
- Hazır poliklinik şablonları (Akut Tonsillit, Gastrit vb.).

---

## Gizlilik ve Veri Güvenliği (KVKK / GDPR)

- **%100 İstemci Taraflı İşleme:** Hastaya ait hiçbir isim, kimlik numarası, doğum tarihi veya laboratuvar verisi dış sunuculara gönderilmez.
- **Sıfır Telemetri / Sıfır İzleyici:** Uygulama içerisinde analitik araçları, reklam kütüphaneleri veya üçüncü taraf çerezler yer almaz.
- **Yerel Depolama:** Özelleştirilmiş iş istasyonu paketleri yalnızca kullanıcının tarayıcısında (`localStorage`) saklanır.

---

## Geliştirici ve Kurulum Rehberi

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

### Test Mimarisi
Testler `tests/` dizini altında modüler ve kapsamlı olarak yürütülür:
- `test_ts_engines.ts`: 21 klinik motor, sınır değerler, kılavuz doğrulukları ve 54 doğrulama bölümü (100% başarılı).
- `test_drug_search.js`: TİTCK ilaç kataloğu, monograflar ve çoklu arama algoritmaları.
- `test_workstation_packages.js`: İş istasyonu motorları ve geçişli bağımlılık zincirleri.
- `test_ts_app.ts`: Reaktif hesaplama döngüsü, global lab fallback'leri, kardiyo/obstetrik senkronizasyonu ve canlı SOAP sentezi.
- `test_cross_engine_stress.ts`: Çapraz motor entegrasyonu, boş ve uç değer dayanıklılığı, sıfır sonsuz döngü kalkanı.
- `test_pwa_offline.ts`: Service Worker, Workbox önbelleği ve çevrimdışı varlık bütünlüğü.
- `test_atc_knowledge.ts`: Çevrimdışı ATC konsept haritası ve farmakolojik taksonomi motoru.

---

## Lisans

Bu yazılım **GNU Affero General Public License v3.0 (GNU AGPLv3)** kapsamında lisanslanmıştır. Tam lisans metni için [LICENSE](LICENSE) dosyasına bakabilirsiniz.

**Geliştirici:** Dr. Velli ve Katkıda Bulunanlar  
**Lisans:** GNU AGPLv3 — Açık Kaynak Klinik Yazılım Girişimi