# Ek Lisans Hükümleri (AGPLv3 Bölüm 7) ve Veri Kaynakları Bildirimi

**Proje:** Klinik Karar Destek Asistanı (Klinik PWA)  
**Yazar / Geliştirici:** Veli Özkul — Tıp Fakültesi Öğrencisi (VelliDR) `<veliozkul45@gmail.com>`  
**Depo:** https://github.com/VelliDR/klinik-pwa-deneme

---

## 1. Üç Katmanlı Lisans Yapısı

Bu depo, yazılım kodu, yazar tarafından derlenen özgün Türkçe klinik içerikler ve üçüncü parti dış veri kaynakları arasında açık hukuki ayrım gözetir:

| Katman | Kapsam | Lisans / Hukuki Statü |
| :--- | :--- | :--- |
| **1. Yazılım Kaynak Kodu** | `src/`, `scripts/`, `tests/`, `index.html`, `vite.config.ts`, yapılandırma ve arayüz kodları | **GNU Affero General Public License v3.0 veya üstü (`AGPL-3.0-or-later`)** — bkz. [`LICENSE`](LICENSE) |
| **2. Özgün Küratörlü Klinik İçerik** | Yazar tarafından kaleme alınan 136 çekirdek Türkçe ilaç monografı (`public/data/clinical_monographs.json` özgün metinleri), klinik özetler, kılavuz erratum notları ve eğitim dokümantasyonu (`README.md`) | **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (`CC BY-NC-SA 4.0`)** — bkz. [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md) |
| **3. Üçüncü Parti Dış Veri Kaynakları** | TİTCK, SGK, ecza deposu fiyat anlık görüntüleri ve uluslararası açık biyomedikal veritabanlarından derlenen ham/yapılandırılmış veri katmanları | İlgili kaynak kurum/veritabanlarının kendi lisans ve kullanım koşullarına tabidir (aşağıda Bölüm 3). |

---

## 2. GNU AGPLv3 Bölüm 7 Ek Şartları (Türev Güvenliği ve Marka Koruması)

GNU Affero General Public License v3.0 **Bölüm 7** uyarınca, bu yazılımın değiştirilmiş veya ağ üzerinden sunulan türevleri için aşağıdaki ek standart şartlar geçerlidir:

1. **Bölüm 7(b) — Orijinal Hukuki Bildirimlerin Korunması:** Yazılımın değiştirilmemiş kopyalarında telif hakkı bildirimi, lisans bilgisi ve klinik/yasal sorumluluk reddi metinleri korunmalıdır.
2. **Bölüm 7(c) — Değiştirilmiş Türevlerde Açık Ayrıştırma ve Onay İması Yasağı:** Bu yazılımı çatallayan (fork), değiştiren veya klinik hesaplama/dozaj formüllerinde herhangi bir değişiklik yaparak dağıtan ya da ağ üzerinden sunan her kişi veya kurum:
   - Değiştirilmiş sürümün orijinalden **farklı bir ad/marka** taşımasını sağlamak,
   - Yazılımın değiştirildiğini ve değişiklik tarihini **açıkça beyan etmek**,
   - Orijinal yazarın adını (*Veli Özkul / VelliDR*) değiştirilmiş türevin arayüzünde **onay, doğrulama veya klinik garanti damgası izlenimi verecek biçimde kullanmamak** zorundadır.  
   *(Amaç: Üçüncü kişilerin yaptığı hatalı doz veya algoritma değişikliklerinin orijinal yazarın sorumluluğundaymış gibi görünmesini önlemektir.)*
3. **Bölüm 7(e) — Marka ve İsim Hakkı Devredilmemesi:** Bu lisans, orijinal yazarın kişisel adı, mahlası (`VelliDR`) veya proje adları üzerinde herhangi bir ticari marka ya da onay hakkı devretmez.

---

## 3. Üçüncü Parti Veri Kaynakları ve Atıf Bildirimi (`public/data/`)

Uygulamanın çevrimdışı ilaç arama, etkileşim ve bilgi katmanlarında kullanılan aşağıdaki dış veri setleri yazarın özgün telif kapsamı dışındadır; yalnızca **ticari olmayan eğitim ve klinik referans** amacıyla derlenmiştir ve her biri kendi kaynak kurumunun kullanım koşullarına tabidir:

| Veri Katmanı / Dosya | Birincil Kaynak(lar) | Güncellenme Niteliği & Doğrulama Uyarısı |
| :--- | :--- | :--- |
| **İlaç Sicili, SKRS, Ruhsat, ▼ Ek İzlem, KÜB/KT PDF ve KÜB Metinleri** (`medicines.json`, `public/data/kub/*.json`) | T.C. Sağlık Bakanlığı **TİTCK** açık yayınları (`titck.gov.tr`) | Kurumsal kamu verisi. Ruhsat askı/iptal ve KÜB güncellemeleri düzenli değişebilir; kesin karar için resmi TİTCK KÜB/KT esas alınmalıdır. |
| **SGK Geri Ödeme, Eşdeğer Grubu & 4 Kademeli KKİ** (`medicines.json`) | **SGK** Bedeli Ödenecek İlaçlar Listesi (EK-4/A) | SUT/EK-4/A tebliğleriyle sık güncellenir; uygulama içindeki **Veri Anlık Görüntüsü Tarihi** kontrol edilmelidir. |
| **TL Perakende Satış Fiyatı & GKF Euro** (`medicines.json`) | TİTCK Referans Fiyat Listesi ve açık web ecza deposu fiyat anlık görüntüsü | **Yüksek volatiliteli piyasa verisidir.** Yalnızca yaklaşık maliyet farkındalığı içindir; güncel eczane/SGK fiyatı değişmiş olabilir. |
| **İlaç-İlaç / İlaç-Besin / İlaç-Hastalık Etkileşim Matrisi** (`ddi_matrix.json`, `clinical_monographs_master.json`) | **DDInter 2.0** (SCBDD, akademik araştırma veritabanı) + yazarın 28 küratörlü Türkçe ATC kuralı | DDInter 2.0 verisi akademik/referans amaçlıdır; klinik karar için resmi KÜB ve güncel farmakovijilans kaynakları esas alınır. |
| **Farmakoloji, CYP450, Hepatotoksisite & Emzirme Profilleri** (`clinical_monographs_master.json`, `atc_icd10_sozluk.json`) | **ChEMBL** (EMBL-EBI, CC BY-SA 3.0), **PubChem** (NIH/NLM), **OpenFDA**, **DailyMed**, **RxNorm**, **LiverTox** (NIDDK/NIH), **LactMed** (NIH/NLM), **WHO ATC/DDD** | İlgili uluslararası kamu/akademik kurumların açık API yayınlarından derlenmiştir; ilgili kaynak koşullarına tabidir. |
| **Antropometri & Bağışıklama Referansları** | **WHO** 2006/2007 LMS Büyüme Standartları, **Neyzi ve ark. (2015)** Türk Çocukları Referansı, **T.C. Sağlık Bakanlığı GBP 2025/2026** | Resmi klinik kılavuz ve yayınlanmış akademik referans tablolarına dayanır. |

---

## 4. Klinik ve Yasal Sorumluluk Reddi (AS-IS)

Bu yazılım ve içerdiği tüm veri katmanları GNU AGPLv3 Bölüm 15 ve 16 uyarınca **"OLDUĞU GİBİ" (AS-IS)** ve hiçbir açık veya zımni garanti (doğruluk, güncellik, tıbbi amaca uygunluk dahil) verilmeksizin sunulmaktadır. Uygulama tıbbi cihaz (SaMD) niteliğinde değildir; tanı, tedavi ve reçete kararları her zaman yetkili hekimin bağımsız klinik muhakemesi ve güncel resmi ürün kılavuzları (KÜB/KT) doğrultusunda verilmelidir.
