// ============================================================================
// GENEL CERRAHİ KANITA DAYALI KILAVUZ, ÇELİŞKİ NOTLARI VE KAYNAKÇA VERİTABANI
// Referans Rapor: 10 Klinik Başlık, 30 Sınıflandırma Sistemi, 8 Metodolojik Çelişki/Erratum
// ============================================================================

export interface SurgeryDiscrepancyEntry {
    id: number;
    domain: string;
    systemName: string;
    title: string;
    optionA: string;
    optionB: string;
    clinicalResolution: string;
    primaryCitations: string;
}

export const SURGERY_DISCREPANCY_NOTES: SurgeryDiscrepancyEntry[] = [
    {
        id: 1,
        domain: '1. Akut Apandisit',
        systemName: 'AIR Skoru (2008 / 2012 Erratum / 2021 STRAPPSCORE)',
        title: 'CRP Birimi Baskı Hatası (g/L vs mg/L) ve Alt Eşik Değeri Revizyonu (0–4 vs 0–3)',
        optionA: '2021 STRAPPSCORE Revizyonu (n=3.878): Düşük Risk 0–3 Puan, Orta Risk 4–8 Puan, Yüksek Risk 9–12 Puan (CRP: mg/L)',
        optionB: '2008 Orijinal Yayın / WSES 2020: Düşük Risk 0–4 Puan, Orta Risk 5–8 Puan, Yüksek Risk 9–12 Puan (2008 baskı hatası: g/L)',
        clinicalResolution: 'Andersson ve ark. 2012 resmi Erratum yayınıyla doğru CRP biriminin "mg/L" (10–49 ve ≥50 mg/L) olduğunu doğrulamış; 2021 STRAPPSCORE çalışmasında ise komplike apandisit duyarlılığını %99.0\'a çıkarmak için düşük risk üst sınırını 3 puana (orta risk ≥4) çekmiştir.',
        primaryCitations: 'Andersson 2008 (World J Surg); Erratum 2012; STRAPPSCORE 2021 (World J Surg)'
    },
    {
        id: 2,
        domain: '1. Akut Apandisit',
        systemName: 'Alvarado Skoru (MANTRELS, 1986)',
        title: 'Düşük / Orta Risk Kesim Noktası Farklılığı (<5 Puan vs ≤3 Puan)',
        optionA: 'WSES 2020 & Orijinal 1986 (Ohle 2011): Dışlama eşiği <5 Puan (0–4 Düşük, 5–6 Orta, ≥7 Yüksek)',
        optionB: 'Acil Tıp BT Karar Kuralı (McKay & Shepherd 2007): 0–3 Düşük, 4–6 BT Endikasyonu, ≥7 Cerrahi Konsültasyon',
        clinicalResolution: 'Ohle 2011 meta-analizinde (n=14.397) <5 kesim noktasında dışlama duyarlılığı %99 olarak doğrulanmıştır; ancak 4 puanlık hastalarda bazı acil servis protokolleri BT/USG görüntülemeyi başlatmaktadır.',
        primaryCitations: 'Alvarado 1986 (Ann Emerg Med); Ohle 2011 (BMC Med); WSES Jerusalem 2020'
    },
    {
        id: 3,
        domain: '2. Safra Yolu Yaralanmaları & Akut Kolesistit',
        systemName: 'Strasberg-Bismuth (1995) & Tokyo Kılavuzu (TG18 vs TG13)',
        title: 'Tip E1 / E2 İçin 2 cm Konfluens Eşiği (>2 cm vs ≥2 cm) ve TG18 Derece III Erken LC Opsiyonu',
        optionA: 'Birincil Kaynaklar & TG18: Tip E1 >2 cm (E2 ≤2 cm); TG18 Derece III seçilmiş hastada ileri merkezde erken LC opsiyonu',
        optionB: 'Klinik Seri Varyantı & TG13: Tip E1 ≥2 cm (E2 <2 cm); TG13 Derece III tüm hastalarda öncelikle PTGBD drenajı',
        clinicalResolution: 'Hepatik konfluensten tam 2.0 cm mesafedeki kesi/darlıklarda her iki gösterim birlikte raporlanmalı; Strasberg sisteminin eşzamanlı hepatik arter/portal ven yaralanmasını içermediği unutulmamalıdır.',
        primaryCitations: 'Strasberg 1995 (J Am Coll Surg); Yokoe/Okamoto TG18 2018; WSES BDI 2021'
    },
    {
        id: 4,
        domain: '3. Akut Pankreatit',
        systemName: 'Revize Atlanta (2012) & Modifiye Marshall Skorlaması',
        title: 'Renal Kreatinin Birim Dönüşüm Çakışması (134 µmol/L ve 3.6 mg/dL) ve KBY Düzeltmesi',
        optionA: 'Üst Kategori (Strict): 134 µmol/L = Skor 1 (134–169); 3.6 mg/dL = Skor 3 (3.6–4.9)',
        optionB: 'Alt Kategori (Conservative): 134 µmol/L = Skor 0 (≤134); 3.6 mg/dL = Skor 2 (1.9–3.6)',
        clinicalResolution: 'Banks ve ark. (2013) tablosunda yuvarlama kaynaklı olarak 134 µmol/L (Skor 0 ve 1) ile 3.6 mg/dL (Skor 2 ve 3) her iki komşu sütunda da yer almaktadır. 3.6 mg/dL her iki seçenekte de Skor ≥2 (Organ Yetmezliği +) eşiğini aşar. Bazal KBY için resmi düzeltme yoktur.',
        primaryCitations: 'Banks et al. 2013 (Gut — Revised Atlanta Classification)'
    },
    {
        id: 5,
        domain: '3. Akut Pankreatit',
        systemName: 'Modifiye BT Şiddet İndeksi (mCTSI, Mortele 2004) vs Balthazar CTSI (1990)',
        title: '%30 Pankreatik Nekroz Sınır İşareti (≤%30 vs <%30) ve Ekstrapankreatik (+2p) Farkı',
        optionA: 'Mortele 2004 Orijinal mCTSI: ≤%30 Nekroz = 2 Puan, >%30 Nekroz = 4 Puan (+ Ekstrapankreatik 2 Puan)',
        optionB: 'İkincil Kaynak Varyantı & 1990 Balthazar: <%30 = 2 Puan, ≥%30 = 4 Puan (1990 Balthazar\'da >%50 = 6 Puan, Ekstrapankreatik 0 Puan)',
        clinicalResolution: 'Orijinal 2004 Mortele yayını ≤%30 nekrozu 2 puan olarak tanımlar ve bütün bileşenler çift sayı (0, 2, 4) olduğundan yalnızca çift toplam skorlar (0–10) üretir.',
        primaryCitations: 'Mortele et al. 2004 (AJR Am J Roentgenol); Balthazar 1990'
    },
    {
        id: 6,
        domain: '5. Karın Duvarı ve Kasık Fıtıkları',
        systemName: 'EHS İnsizyonel Karın Duvarı Fıtığı Sınıflandırması (Muysoms 2009)',
        title: 'W2 ve W3 Defekt Genişliği 10 cm Sınır Gösterimi (≥10 cm vs >10 cm)',
        optionA: 'Muysoms 2009 Orijinal Tablo: W1 <4 cm, W2 ≥4–10 cm, W3 ≥10 cm',
        optionB: 'Klinik Referans Gösterimi: W1 <4 cm, W2 4–10 cm, W3 >10 cm',
        clinicalResolution: 'Tam 10.0 cm transvers defekt genişliği her iki gösterimde sınır noktasını oluşturur; klinik pratikte ≥10 cm defektler komponent ayrıştırma (TAR) açısından W3 kompleks fıtık olarak yönetilir.',
        primaryCitations: 'Muysoms et al. 2009 (Hernia); HerniaSurge 2023 (BJS Open)'
    },
    {
        id: 7,
        domain: '8. Kolorektal Kanser ve Malign Polipler',
        systemName: 'Kikuchi (1995) sm2 Risk Grubu, Mikrometrik Ölçüm ve AJCC 8. Baskı Sağkalım Paradoksu',
        title: 'Sesil pT1 Kanserlerde sm2 Yaklaşımı, Muskularis Propriya Yokluğu ve Evre IIC vs IIIA Paradoksu',
        optionA: 'Güncel ESGE/ESMO Kılavuzları: sm2 / ≥1000 µm derin invazyon = Yüksek Risk -> Tamamlayıcı Onkolojik Rezeksiyon',
        optionB: 'Nascimbeni 2002 / Bireyselleştirilmiş Model: Yalnız sm3 (p=0.001), LVI+ (p=0.005) ve alt 1/3 rektum (p=0.007) bağımsız LNM prediktörüdür',
        clinicalResolution: 'Endoskopik EMR materyallerinin %88.1\'inde muskularis propriya bulunmadığından (NICE NG151) Kikuchi yerine <1000 µm vs ≥1000 µm derinlik kullanılır. Ayrıca AJCC 8. Baskı\'da Evre IIC (T4bN0) sağkalımı Evre IIIA\'dan (T1–2N1) daha kötüdür.',
        primaryCitations: 'Kikuchi 1995; Nascimbeni 2002; AJCC 8th Ed. 2017/2018; ESGE 2017'
    },
    {
        id: 8,
        domain: '9. Solid Organ Travmaları (Dalak ve Karaciğer)',
        systemName: 'AAST 2018 OIS Revizyonu ve WSES (2017 / 2020) Travma Sınıflandırması',
        title: 'Dalak vs Karaciğer AAST 2018 Vasküler/Hematom Derece Farkı ve WSES Sınıf III Adlandırması',
        optionA: 'Dalak AAST 2018 & WSES 2017: Kapsül içi aktif kanama = Derece IV, Peritona kanama = Derece V, Hematom ≥5 cm = III; WSES Sınıf III = "Orta (Moderate)"',
        optionB: 'Karaciğer AAST 2018 & WSES 2020: Parankim içi aktif kanama = Derece III, Peritona kanama = Derece IV, Hematom >10 cm = III; WSES Sınıf III = "Orta / Şiddetli (Severe)"',
        clinicalResolution: 'Karaciğerde Derece V >%75 lob yıkımı ve jukstahepatik venöz yaralanmalara ayrıldığı için vasküler lezyonlar Dalaktan 1 derece düşük numaralandırılmıştır. Her iki organda da WSES Sınıf III "Hemodinamik stabil AAST IV–V" yaralanmayı tanımlar.',
        primaryCitations: 'Kozar et al. 2018 (J Trauma Acute Care Surg); Coccolini WSES 2017 & 2020'
    }
];
