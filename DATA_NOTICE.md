# Lisans Yönetişimi (PolyForm Noncommercial 1.0.0 + CC BY-NC-SA 4.0) ve Açık Veri Kaynakları Bildirimi

**Proje:** Klinik Karar Destek Asistanı (Klinik PWA)  
**Yazar / Geliştirici:** Veli Özkul — Tıp Fakültesi Öğrencisi (VelliDR) `<veliozkul45@gmail.com>`  
**Depo:** https://github.com/VelliDR/klinik-pwa-deneme

---

## 1. Üç Katmanlı Lisans ve Temiz-Oda (Clean-Room) Veri Yönetişimi

Bu depo; yazılım kaynak kodu, yazar tarafından derlenen özgün Türkçe klinik içerikler/monograflar ve üçüncü parti resmi/akademik veri kaynakları arasında açık hukuki ayrım gözetir:

| Katman | Kapsam | Lisans / Hukuki Statü |
| :--- | :--- | :--- |
| **1. Yazılım Kaynak Kodu** | `src/`, `scripts/`, `tests/`, `index.html`, `vite.config.ts`, yapılandırma ve arayüz kodları | **PolyForm Noncommercial License 1.0.0 (`PolyForm-Noncommercial-1.0.0`)** — bkz. [`LICENSE`](LICENSE) |
| **2. Özgün Küratörlü Klinik İçerik & PDDI/HDI Monografları** | Yazar tarafından kaleme alınan 136 çekirdek Türkçe ilaç monografı (`public/data/clinical_monographs.json`), W3C PDDI-CDS uyumlu özgün Türkçe etkileşim monografları (`public/data/pddi_monographs_tr.json`), takviye/vitamin/bitki çayı etkileşim ve kümülatif yığılma kuralları (`public/data/supplement_interactions_tr.json`), farmakolojik yığılma/çoklu-CYP kuralları ve dokümantasyon (`README.md`) | **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (`CC BY-NC-SA 4.0`)** — bkz. [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md) (Madde 4 Sui Generis Veri Tabanı Hakları dahil) |
| **3. Üçüncü Parti Resmi & Açık Veri Kaynakları** | TİTCK KÜB/SKRS, SGK EK-4/A, EMA HMPC/EPAR, EFSA, OpenFDA/DailyMed SPL, FDA CYP Tablosu, ANSM Thésaurus (Eylül 2023 arşivi), NLM RxNorm/RxClass, NCBI PubMed/PubChem/LiverTox/LactMed, ChEMBL ve geçici ikincil DDInter 2.0 katmanı | İlgili kaynak kurum/veritabanlarının kendi kamu malı, açık veri veya ticari olmayan kullanım koşullarına tabidir (aşağıda Bölüm 3). |

---

## 2. PolyForm Noncommercial 1.0.0 Kullanım Sınırları ve Zorunlu Bildirim

Yazılım kaynak kodu **PolyForm Noncommercial License 1.0.0** ile lisanslanmıştır:

1. **İzin Verilen Kullanımlar:** Kişisel eğitim/çalışma, akademik araştırma, kâr amacı gütmeyen kuruluşlar, eğitim kurumları, kamu sağlığı kuruluşları ve devlet kurumları tarafından ticari olmayan amaçlarla serbestçe kullanılabilir, değiştirilebilir ve dağıtılabilir.
2. **Ticari Kullanım Kısıtı:** Ticari yazılım ürünlerine, özel/ticari HBYS platformlarına entegrasyon veya ticari amaçlı SaaS/API sunumu bu lisans kapsamı dışındadır; ticari kullanım için yazarın ayrı yazılı izni gereklidir.
3. **Zorunlu Bildirim (`Required Notice`):** Yazılımın herhangi bir parçasını yeniden dağıtan herkes [`LICENSE`](LICENSE) metnini (veya resmi bağlantısını) ve şu satırı korumak zorundadır:
   `Required Notice: Copyright (c) 2026 Veli Özkul (VelliDR) <veliozkul45@gmail.com> (https://github.com/VelliDR/klinik-pwa-deneme)`
4. **Türev Ayrıştırması:** Değiştirilmiş türevlerde orijinal yazarın adı (*Veli Özkul / VelliDR*) klinik doğrulama veya onay damgası izlenimi verecek biçimde kullanılamaz.

---

## 3. Temiz-Oda (Clean-Room) Veri Kaynakları ve Atıf Bildirimi (`public/data/`)

Kapalı ticari kaynaklar (UpToDate/Lexidrug, BNF, Stockley's, Micromedex, DrugBank) ve yeniden dağıtımı kısıtlı kaynaklar (KEGG ham dump, CredibleMeds ham liste) bu depoya **dahil edilmez**. Kullanılan veri katmanları yalnızca resmi düzenleyici/kamu verileri ve ticari olmayan akademik kaynaklardan oluşur:

| Veri Katmanı / Dosya | Birincil Kaynak(lar) | Hukuki Statü & Doğrulama Uyarısı |
| :--- | :--- | :--- |
| **İlaç Sicili, SKRS, Ruhsat, ▼ Ek İzlem & KÜB Metinleri** (`medicines.json`, `public/data/kub/*.json`) | T.C. Sağlık Bakanlığı **TİTCK** resmi açık yayınları (`titck.gov.tr`) | Resmi düzenleyici kamu verisi (5846 s. FSEK uyumlu özgün özet + kaynak/bölüm atfı). Kesin klinik karar için güncel resmi TİTCK KÜB/KT esas alınmalıdır. |
| **W3C PDDI-CDS Kanıtlı Türkçe Etkileşim Monografları** (`pddi_monographs_tr.json`) | **TİTCK KÜB** (Bölüm 4.2–4.5, 5.2), **OpenFDA / DailyMed SPL** (ABD Federal Kamu Malı), **FDA Clinical DDI CYP/Transporter Table** (Kamu Malı), **ANSM Thésaurus** (15.09.2023 son arşiv sürümü — Fransa CRPA / Licence Ouverte 2.0), **ONC High-Priority 15** | Özgün Türkçe klinik özet ve yönetim metinleri `CC BY-NC-SA 4.0` altındadır. ANSM Thésaurus güncellemesi Ağustos 2026'da sonlandırıldığından Eylül 2023 arşivi tarih damgasıyla sunulur ve güncel SmPC/KÜB/OpenFDA ile tamamlanır. |
| **Kanonik Terminoloji & Farmakoloji** (`clinical_monographs_master.json`, `atc_icd10_sozluk.json`) | **NLM RxNorm / RxClass**, **FDA GSRS (UNII)**, **PubChem** (NIH/NLM), **ChEMBL** (EMBL-EBI, CC BY-SA 3.0), **LiverTox** (NIDDK/NIH), **LactMed** (NIH/NLM), **WHO ATC/DDD** | Uluslararası kamu/akademik açık veri yayınları; ilgili kaynak koşullarına tabidir. |
| **İkincil Etkileşim, Besin & Duplikasyon Katmanı** (`ddi_matrix.json`) | **DDInter 2.0** (CBDD Group, `CC BY-NC-SA 4.0` akademik/ticari olmayan lisans) + küratörlü Türkçe ATC kuralları | Ticari olmayan eğitim/referans katmanıdır; özgün Türkçe PDDI monografı bulunan çiftlerde jenerik DDInter metni otomatik olarak gizlenir. |
| **Takviye, Vitamin & Bitki Çayı Etkileşim ve Kümülatif Yığılma Kataloğu** (`supplement_interactions_tr.json`) | **EMA HMPC / EPAR** (`36` alıntı), **NCBI PubMed** (`65` benzersiz PMID — `74` hakemli çalışma/kılavuz + `8` **EFSA** görüşü), **OpenFDA / DailyMed SPL** (`14` resmi `set_id` alıntısı), **NIH LiverTox** (`11` NBK bölümü), **TİTCK KÜB** (`8` yerel birebir alıntı), **ANSM 2023** (`8` alıntı) | Yalnızca kullanıcı tarafından açıkça seçildiğinde çalışan izole temiz-oda HDI/SDI & kümülatif yığılma katmanıdır (`44` bileşen, `85` kural, `159` canlı doğrulanmış alıntı, `SHA-256` kilitli; `npm run data:supplements`). Özgün Türkçe klinik derlemeler `CC BY-NC-SA 4.0` altındadır. |
| **SGK Geri Ödeme, Eşdeğer Grubu & TL/GKF Fiyat** (`medicines.json`) | **SGK EK-4/A**, TİTCK Referans Fiyat Listesi ve açık web ecza deposu fiyat anlık görüntüsü | Yüksek volatiliteli piyasa/mevzuat verisidir; uygulama içindeki **Veri Anlık Görüntüsü Tarihi** kontrol edilmelidir. |
| **Antropometri, Klinik Skorlar & Bağışıklama** | **WHO** 2006/2007 LMS, **Neyzi ve ark. (2015)**, **Tisdale (2013)**, **Hunter (2003)**, **Weersink Child-Pugh (2016)**, **T.C. Sağlık Bakanlığı GBP 2025/2026** | Hakemli klinik algoritmalar ve resmi ulusal kılavuz referanslarına dayanır. |

---

## 4. Tıbbi Cihaz Olmama Beyanı ve Sorumluluk Reddi (AS-IS)

Bu yazılım ve içerdiği tüm veri katmanları **"OLDUĞU GİBİ" (AS-IS)** ve hiçbir açık veya zımni garanti (doğruluk, güncellik, tıbbi amaca uygunluk dahil) verilmeksizin sunulmaktadır. **Uygulama tıbbi cihaz (SaMD) niteliğinde değildir; yalnızca eğitim ve klinik karar destek referansı amaçlıdır.** Tanı, tedavi ve reçete kararları her zaman yetkili hekimin bağımsız klinik muhakemesi ve güncel resmi ürün kılavuzları (KÜB/KT) doğrultusunda verilmelidir.
