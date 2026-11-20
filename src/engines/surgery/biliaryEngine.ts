// ============================================================================
// AKUT KOLESİSTİT VE SAFRA YOLU HASTALIKLARI MOTORU (TG18 & WSES BDI 2021)
// 1. Tokyo Kılavuzu (TG18 / TG13 Karşılaştırmalı) Tanı Kriterleri ve Şiddet Derecelendirmesi
// 2. Parkland Kolesistit Derecelendirme Ölçeği (PGS, Madni 2018/2019)
// 3. Strasberg-Bismuth Safra Yolu Yaralanması Sınıflandırması (1982 / 1995 / WSES 2021)
// ============================================================================

export type TokyoGuidelineVersion = 'TG18' | 'TG13';

export interface TokyoCholecystitisParams {
    // Bölüm 1: Tanı Kriterleri (A, B, C)
    murphySign?: boolean;               // A1
    ruqMassPainTenderness?: boolean;    // A2
    fever?: boolean;                    // B1
    tempC?: number | null;
    elevatedCrp?: boolean;              // B2
    crpMgL?: number | null;
    elevatedWbc?: boolean;              // B3
    wbcCount?: number | null;           // /mm³ veya x10^9/L
    imagingCharacteristic?: boolean;    // C (Duvar >=4mm, kese >=8x4cm, taş/çamur, perikolesistik sıvı)

    // Bölüm 2: Derece II (Orta) Kriterleri
    wbcOver18000?: boolean;
    palpableRuqMass?: boolean;
    durationOver72h?: boolean;
    symptomHours?: number | null;
    markedLocalInflammation?: boolean;  // Gangrenöz, perikolesistik/hepatik apse, biliyer peritonit, amfizematöz

    // Bölüm 3: Derece III (Şiddetli) Organ Disfonksiyonu Kriterleri
    cvDysfunction?: boolean;            // Dopamin >=5 mcg/kg/dk veya herhangi dozda norepinefrin
    neuroDysfunction?: boolean;         // Bilinç düzeyinde azalma (GCS <15 / AVPU != A)
    respDysfunction?: boolean;          // PaO2/FiO2 < 300
    pao2Fio2Ratio?: number | null;
    renalDysfunction?: boolean;         // Oligüri veya Kreatinin > 2.0 mg/dL
    creatinineMgDl?: number | null;
    hepaticDysfunction?: boolean;       // PT-INR > 1.5
    ptInr?: number | null;
    hematologicDysfunction?: boolean;   // Trombosit < 100.000/mm³
    plateletCount?: number | null;      // /mm³ veya x10^9/L

    // Yönetim Akış Şeması İçin Cerrahi Risk Faktörleri (Okamoto 2018)
    asaClass?: 1 | 2 | 3 | 4 | 5 | 6 | number | null;
    charlsonCci?: number | null;
    guidelineVersion?: TokyoGuidelineVersion;
}

export interface TokyoCholecystitisResult {
    diagnosisStatus: 'Kesin Tanı (Definite)' | 'Şüpheli Tanı (Suspected)' | 'Tanı Kriterleri Karşılanmadı';
    hasGroupA: boolean;
    hasGroupB: boolean;
    hasGroupC: boolean;
    severityGrade: 'Derece I (Hafif)' | 'Derece II (Orta)' | 'Derece III (Şiddetli)';
    gradeNumber: 1 | 2 | 3;
    grade2Triggers: string[];
    grade3OrganFailures: string[];
    isLowSurgicalRisk: boolean;
    guidelineVersion: TokyoGuidelineVersion;
    alertClass: 'success' | 'warning' | 'danger';
    managementRecommendation: string;
    bailOutNote: string;
    tg18VsTg13Comparison: {
        tg18Action: string;
        tg13Action: string;
        hasVersionDifference: boolean;
    };
}

function normalizeWbcPerMm3(wbc: number | null | undefined): number | null {
    if (wbc === null || wbc === undefined || !Number.isFinite(wbc) || wbc <= 0) return null;
    return wbc < 200 ? wbc * 1000 : wbc;
}

function normalizePlateletsPerMm3(plt: number | null | undefined): number | null {
    if (plt === null || plt === undefined || !Number.isFinite(plt) || plt <= 0) return null;
    // 85 (x10^9/L) veya 85000 (/mm³)
    return plt < 1000 ? plt * 1000 : plt;
}

export function calculateTokyoCholecystitis(params: TokyoCholecystitisParams | null | undefined): TokyoCholecystitisResult | null {
    if (!params) return null;

    const wbcMm3 = normalizeWbcPerMm3(params.wbcCount);
    const pltMm3 = normalizePlateletsPerMm3(params.plateletCount);

    const hasGroupA = Boolean(params.murphySign || params.ruqMassPainTenderness || params.palpableRuqMass);
    const hasFever = Boolean(params.fever) || (params.tempC !== null && params.tempC !== undefined && params.tempC >= 37.8);
    const hasCrp = Boolean(params.elevatedCrp) || (params.crpMgL !== null && params.crpMgL !== undefined && params.crpMgL >= 10);
    const hasWbcElev = Boolean(params.elevatedWbc || params.wbcOver18000) || (wbcMm3 !== null && wbcMm3 > 10000);
    const hasGroupB = hasFever || hasCrp || hasWbcElev;
    const hasGroupC = Boolean(params.imagingCharacteristic);

    let diagnosisStatus: TokyoCholecystitisResult['diagnosisStatus'] = 'Tanı Kriterleri Karşılanmadı';
    if (hasGroupA && hasGroupB && hasGroupC) {
        diagnosisStatus = 'Kesin Tanı (Definite)';
    } else if (hasGroupA && hasGroupB) {
        diagnosisStatus = 'Şüpheli Tanı (Suspected)';
    }

    // Derece II Tetikleyicileri
    const grade2Triggers: string[] = [];
    if (Boolean(params.wbcOver18000) || (wbcMm3 !== null && wbcMm3 > 18000)) {
        grade2Triggers.push('WBC > 18.000/mm³');
    }
    if (params.palpableRuqMass) {
        grade2Triggers.push('Sağ üst kadranda (RUQ) palpabl hassas kitle');
    }
    if (Boolean(params.durationOver72h) || (params.symptomHours !== null && params.symptomHours !== undefined && params.symptomHours > 72)) {
        grade2Triggers.push('Şikayet süresi > 72 saat');
    }
    if (params.markedLocalInflammation) {
        grade2Triggers.push('Belirgin lokal inflamasyon (gangrenöz, apse, biliyer peritonit, amfizematöz)');
    }

    // Derece III Organ Yetmezlikleri
    const grade3OrganFailures: string[] = [];
    if (params.cvDysfunction) {
        grade3OrganFailures.push('Kardiyovasküler disfonksiyon (Dopamin ≥5 µg/kg/dk veya norepinefrin gerektiren hipotansiyon)');
    }
    if (params.neuroDysfunction) {
        grade3OrganFailures.push('Nörolojik disfonksiyon (Bilinç düzeyinde azalma)');
    }
    if (Boolean(params.respDysfunction) || (params.pao2Fio2Ratio !== null && params.pao2Fio2Ratio !== undefined && params.pao2Fio2Ratio > 0 && params.pao2Fio2Ratio < 300)) {
        grade3OrganFailures.push('Respiratuvar disfonksiyon (PaO2/FiO2 < 300)');
    }
    if (Boolean(params.renalDysfunction) || (params.creatinineMgDl !== null && params.creatinineMgDl !== undefined && params.creatinineMgDl > 2.0)) {
        grade3OrganFailures.push('Renal disfonksiyon (Oligüri veya Kreatinin > 2.0 mg/dL)');
    }
    if (Boolean(params.hepaticDysfunction) || (params.ptInr !== null && params.ptInr !== undefined && params.ptInr > 1.5)) {
        grade3OrganFailures.push('Hepatik disfonksiyon (PT-INR > 1.5)');
    }
    if (Boolean(params.hematologicDysfunction) || (pltMm3 !== null && pltMm3 < 100000)) {
        grade3OrganFailures.push('Hematolojik disfonksiyon (Trombosit < 100.000/mm³)');
    }

    let gradeNumber: 1 | 2 | 3 = 1;
    let severityGrade: TokyoCholecystitisResult['severityGrade'] = 'Derece I (Hafif)';
    let alertClass: 'success' | 'warning' | 'danger' = 'success';

    if (grade3OrganFailures.length > 0) {
        gradeNumber = 3;
        severityGrade = 'Derece III (Şiddetli)';
        alertClass = 'danger';
    } else if (grade2Triggers.length > 0) {
        gradeNumber = 2;
        severityGrade = 'Derece II (Orta)';
        alertClass = 'warning';
    }

    const asa = params.asaClass ?? 2;
    const cci = params.charlsonCci ?? 0;
    const isLowSurgicalRiskForG1G2 = asa <= 2 && cci <= 5;
    // Derece III'te TG18 erken LC kriteri: nörolojik/respiratuvar negatif prediktif faktör olmaması, CCI <=3 ve ASA-PS <=2 (veya hızlı düzelen organ yetmezliği)
    const hasNegativePredictiveFactors = Boolean(params.neuroDysfunction || params.respDysfunction || (params.pao2Fio2Ratio !== null && params.pao2Fio2Ratio !== undefined && params.pao2Fio2Ratio < 300));
    const isSelectedGrade3Candidate = gradeNumber === 3 && !hasNegativePredictiveFactors && asa <= 2 && cci <= 3;

    const guidelineVersion: TokyoGuidelineVersion = params.guidelineVersion || 'TG18';

    let tg18Action = '';
    let tg13Action = '';
    let hasVersionDifference = false;

    if (gradeNumber === 1) {
        tg18Action = isLowSurgicalRiskForG1G2
            ? 'TG18 Derece I (Düşük Cerrahi Risk: ASA-PS ≤II, CCI ≤5): Antibiyotik + Erken Laparoskopik Kolesistektomi (LC) ilk tercihtir.'
            : 'TG18 Derece I (Yüksek Cerrahi Risk: ASA-PS ≥III veya CCI ≥6): Antibiyotik ve genel destek tedavisi; inflamasyon kontrol altına alındıktan sonra cerrahi değerlendirilir.';
        tg13Action = 'TG13 Derece I: Erken Laparoskopik Kolesistektomi (LC) standart yaklaşımdır (komorbidite yüksekse konservatif hazırlık).';
    } else if (gradeNumber === 2) {
        tg18Action = isLowSurgicalRiskForG1G2
            ? 'TG18 Derece II (Deneyimli Merkez & ASA-PS ≤II, CCI ≤5): Erken LC önerilir. Ciddi operatif zorlukta subtotal kolesistektomi veya açık konversiyon (bail-out) uygulanır.'
            : 'TG18 Derece II (Yüksek Risk: ASA-PS ≥III / CCI ≥6): Acil/erken safra kesesi drenajı (PTGBD) + antibiyotik ve geciktirilmiş elektif LC önerilir.';
        tg13Action = isLowSurgicalRiskForG1G2
            ? 'TG13 Derece II: İleri laparoskopik deneyim varsa erken LC, yoksa veya yanıtsızsa erken safra kesesi drenajı (PTGBD).'
            : 'TG13 Derece II: Acil/erken safra kesesi drenajı (PTGBD) ardından geciktirilmiş elektif LC.';
    } else {
        hasVersionDifference = true;
        tg18Action = isSelectedGrade3Candidate
            ? 'TG18 Derece III (Güncel 2018 Akış Şeması): Acil organ desteği + antibiyotik. Negatif prediktif faktör (nörolojik/respiratuvar yetmezlik) yok ve performans uygun (ASA ≤II, CCI ≤3) olduğundan ileri HPB/yoğun bakım merkezinde ERKEN LC veya PTGBD değerlendirilebilir.'
            : 'TG18 Derece III (Yüksek Risk / Negatif Prediktif Faktör Var): Acil yoğun bakım organ desteği + antibiyotik + ACİL Safra Kesesi Drenajı (PTGBD). Genel durum düzeldikten sonra elektif LC.';
        tg13Action = 'TG13 Derece III (Klasik 2013 Akış Şeması): Tüm Derece III hastalarda doğrudan erken kolesistektomiden kaçınılarak acil organ desteği + ACİL Safra Kesesi Drenajı (PTGBD) ve geciktirilmiş elektif LC uygulanır.';
    }

    const managementRecommendation = guidelineVersion === 'TG18' ? tg18Action : tg13Action;
    const bailOutNote = 'TG18 Güvenli Kolesistektomi İlkesi: Calot üçgeninde ağır fibrozis/inflamasyon nedeniyle Güvenli Kritik Görüş (CVS) elde edilemiyorsa safra yolu yaralanmasını önlemek için Subtotal Kolesistektomi (fenestre veya rekonstrüktif), Fundus-First veya Açık Konversiyon gibi kurtarma (bail-out) prosedürlerine geçilmelidir.';

    return {
        diagnosisStatus,
        hasGroupA,
        hasGroupB,
        hasGroupC,
        severityGrade,
        gradeNumber,
        grade2Triggers,
        grade3OrganFailures,
        isLowSurgicalRisk: gradeNumber === 3 ? isSelectedGrade3Candidate : isLowSurgicalRiskForG1G2,
        guidelineVersion,
        alertClass,
        managementRecommendation,
        bailOutNote,
        tg18VsTg13Comparison: {
            tg18Action,
            tg13Action,
            hasVersionDifference
        }
    };
}

// ============================================================================
// 2. PARKLAND KOLESİSTİT DERECELENDİRME ÖLÇEĞİ (PGS — Madni et al., 2018/2019)
// Not: Yanık Parkland formülü (calculateParkland) ile karışmaması için
// calculateParklandCholecystitis olarak adlandırılmıştır.
// ============================================================================

export type ParklandCholecystitisGrade = 1 | 2 | 3 | 4 | 5;

export interface ParklandCholecystitisParams {
    directGrade?: ParklandCholecystitisGrade | null;
    // Veya intraoperatif görsel bulgu bayrakları (en yüksek derece geçerlidir)
    neckAdhesionsOnly?: boolean;            // Derece 2
    hyperemiaOrFluidOrBodyAdhesionsOrDistended?: boolean; // Derece 3
    adhesionsObscuringMajority?: boolean;   // Derece 4
    abnormalAnatomyOrIntrahepaticOrMirizzi?: boolean; // Derece 4
    perforationOrNecrosisOrCompletelyObscured?: boolean; // Derece 5
}

export interface ParklandCholecystitisResult {
    grade: ParklandCholecystitisGrade;
    gradeTitle: string;
    anatomicalDescription: string;
    operativeDifficulty: 'Düşük' | 'Orta' | 'Yüksek' | 'Çok Yüksek';
    cvsFailureRisk: 'Düşük' | 'Orta' | 'Yüksek (Kurtarma / Bail-Out Hazırlığı)' | 'Çok Yüksek (Doğrudan Bail-Out / Subtotal Düşünün)';
    requiresBailOutAlert: boolean;
    alertClass: 'success' | 'info' | 'warning' | 'danger';
    recommendation: string;
}

const PGS_DEFINITIONS: Record<ParklandCholecystitisGrade, {
    title: string;
    desc: string;
    difficulty: ParklandCholecystitisResult['operativeDifficulty'];
    cvsRisk: ParklandCholecystitisResult['cvsFailureRisk'];
    alert: ParklandCholecystitisResult['alertClass'];
    rec: string;
}> = {
    1: {
        title: 'Parkland Derece 1 (Normal Görünümlü Kese)',
        desc: 'Tamamen normal görünümlü safra kesesi ("robin\'s egg blue" / ardıç kuşu yumurtası mavisi); hiç adezyon veya inflamasyon yok.',
        difficulty: 'Düşük',
        cvsRisk: 'Düşük',
        alert: 'success',
        rec: 'Standart laparoskopik kolesistektomi ve Güvenli Kritik Görüş (CVS) kolaylıkla uygulanır; konversiyon ve safra kaçağı riski minimaldir.'
    },
    2: {
        title: 'Parkland Derece 2 (Boyunda Minör Adezyonlar)',
        desc: 'Safra kesesinin yalnızca boyun kısmında (veya alt bölümünde) minör omental/peritoneal adezyonlar mevcut; kese duvarı normal.',
        difficulty: 'Düşük',
        cvsRisk: 'Düşük',
        alert: 'success',
        rec: 'Boyundaki minör adezyonların künt/keskin açılmasıyla standart LC ve CVS güvenle elde edilir.'
    },
    3: {
        title: 'Parkland Derece 3 (Orta İnflamasyon / Gövde Adezyonu / Distansiyon)',
        desc: 'Hiperemi, perikolesistik sıvı, safra kesesi gövdesine (body) uzanan adezyonlar veya distandü (gerilmiş) safra kesesinden en az birinin varlığı.',
        difficulty: 'Orta',
        cvsRisk: 'Orta',
        alert: 'warning',
        rec: 'Dikkatli diseksiyon ve gergin kesede grasper tutuşunu kolaylaştırmak için intraoperatif kese dekompresyonu (aspirasyon) önerilir.'
    },
    4: {
        title: 'Parkland Derece 4 (Ağır Adezyonlar / Mirizzi / Anormal Anatomi)',
        desc: 'Safra kesesinin büyük çoğunluğunu örten adezyonlar VEYA anormal karaciğer anatomisi, intrahepatik safra kesesi ya da impakte taş (Mirizzi sendromu) eşlik eden Derece 1–3 kese.',
        difficulty: 'Yüksek',
        cvsRisk: 'Yüksek (Kurtarma / Bail-Out Hazırlığı)',
        alert: 'danger',
        rec: '⚠️ ERKEN UYARI (PGS ≥4): Güvenli Kritik Görüş (CVS) elde edilememe ve safra yolu yaralanması riski belirgin artmıştır! Kıdemli cerrah desteği çağrılmalı, kolanjiyografi veya Subtotal Kolesistektomi / Açık Konversiyon gibi kurtarma (bail-out) stratejileri hazır tutulmalıdır.'
    },
    5: {
        title: 'Parkland Derece 5 (Perforasyon / Nekroz / Tamamen Gizli Kese)',
        desc: 'Kese duvarında perforasyon, gangren/nekroz VEYA yoğun fibröz adezyonlar nedeniyle safra kesesinin hiç görüntülenememesi.',
        difficulty: 'Çok Yüksek',
        cvsRisk: 'Çok Yüksek (Doğrudan Bail-Out / Subtotal Düşünün)',
        alert: 'danger',
        rec: '🛑 KRİTİK OPERATİF ZORLUK (PGS 5): Calot üçgeninde kör ve tehlikeli diseksiyonda kesinlikle ısrar edilmemelidir! İyatrojenik majör safra yolu/vasküler yaralanmayı önlemek için Subtotal Kolesistektomi veya Açık Konversiyon gibi güvenli kurtarma (bail-out) manevralarına geçilmelidir.'
    }
};

export function calculateParklandCholecystitis(params: ParklandCholecystitisParams | null | undefined): ParklandCholecystitisResult | null {
    if (!params) return null;

    let derivedGrade: ParklandCholecystitisGrade | null = params.directGrade ?? null;

    if (params.perforationOrNecrosisOrCompletelyObscured) {
        derivedGrade = 5;
    } else if (params.adhesionsObscuringMajority || params.abnormalAnatomyOrIntrahepaticOrMirizzi) {
        derivedGrade = derivedGrade ? (Math.max(derivedGrade, 4) as ParklandCholecystitisGrade) : 4;
    } else if (params.hyperemiaOrFluidOrBodyAdhesionsOrDistended) {
        derivedGrade = derivedGrade ? (Math.max(derivedGrade, 3) as ParklandCholecystitisGrade) : 3;
    } else if (params.neckAdhesionsOnly) {
        derivedGrade = derivedGrade ? (Math.max(derivedGrade, 2) as ParklandCholecystitisGrade) : 2;
    }

    if (!derivedGrade || derivedGrade < 1 || derivedGrade > 5) return null;

    const def = PGS_DEFINITIONS[derivedGrade];
    return {
        grade: derivedGrade,
        gradeTitle: def.title,
        anatomicalDescription: def.desc,
        operativeDifficulty: def.difficulty,
        cvsFailureRisk: def.cvsRisk,
        requiresBailOutAlert: derivedGrade >= 4,
        alertClass: def.alert,
        recommendation: def.rec
    };
}

// ============================================================================
// 3. STRASBERG-BISMUTH SAFRA YOLU YARALANMASI (BDI) SINIFLANDIRMASI (1995 / WSES 2021)
// ============================================================================

export type StrasbergType = 'A' | 'B' | 'C' | 'D' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5';
export type BDIDetectionTiming = 'intraoperative' | 'postop_early' | 'postop_late';
export type StrasbergConfluenceCutoffMode = 'gt_2cm' | 'gte_2cm';

export interface StrasbergBismuthParams {
    type?: StrasbergType | null;
    // E1 vs E2 için opsiyonel konfluens mesafesi (cm) ve eşik modu (>2 cm vs >=2 cm)
    distanceFromConfluenceCm?: number | null;
    confluenceCutoffMode?: StrasbergConfluenceCutoffMode;
    detectionTiming?: BDIDetectionTiming;
    hasHpbExpertiseOnSite?: boolean;
    hasConcomitantVascularInjury?: boolean; // Sağ hepatik arter / portal ven yaralanması
    hasSepsisOrPeritonitis?: boolean;
}

export interface StrasbergBismuthResult {
    type: StrasbergType;
    bismuthEquivalent: string;
    anatomicalDefinition: string;
    isMajorDuctInjury: boolean;
    alertClass: 'warning' | 'danger';
    primaryManagement: string;
    timingAndReferralGuidance: string;
    vascularInjuryWarning?: string;
    confluenceCutoffComparison?: {
        distanceCm: number;
        gt2cmClassification: 'E1 (>2 cm — Bismuth I)' | 'E2 (≤2 cm — Bismuth II)';
        gte2cmClassification: 'E1 (≥2 cm — Bismuth I)' | 'E2 (<2 cm — Bismuth II)';
        isBoundary2cm: boolean;
    };
}

const STRASBERG_CATALOG: Record<StrasbergType, {
    bismuth: string;
    def: string;
    isMajor: boolean;
    mgmt: string;
}> = {
    'A': {
        bismuth: 'Yok (Laparoskopik Ek)',
        def: 'Ana safra kanallarıyla devamlılığı korunan minör kanallardan safra kaçağı: Sistik kanal güdüğü kaçağı (%75) veya karaciğer yatağındaki Luschka kanallarından kaçak (%10) (Tüm BDI olgularının ~%85\'i).',
        isMajor: false,
        mgmt: 'Perkütan biloma drenajı (koleksiyon varsa) + ERCP ile endoskopik sfinkterotomi ve biliyer stent (plastik veya tam kaplı metal stent) yerleştirilmesiyle safra yolu basıncının düşürülmesi.'
    },
    'B': {
        bismuth: 'Yok (Laparoskopik Ek)',
        def: 'Aberran sağ sektörel (genellikle sağ posterior) hepatik kanalın oklüzyonu (kliplenmesi/bağlanması); safra kaçağı yoktur.',
        isMajor: false,
        mgmt: 'Asemptomatik kalıp segmental karaciğer atrofisi gelişebilir (izlem); tekrarlayan kolanjit veya ağrı varsa perkütan drenaj veya sektörel kanala Roux-en-Y hepatikojejunostomi.'
    },
    'C': {
        bismuth: 'Yok (Laparoskopik Ek)',
        def: 'Aberran sağ sektörel hepatik kanalın oklüzyon olmaksızın kesilmesi (transeksiyonu); ana safra ağacıyla bağlantısı kesilen kanaldan peritona safra kaçağı vardır.',
        isMajor: true,
        mgmt: 'Ana safra kanalıyla bağlantı koptuğu için ERCP stentleme etkisizdir! Abdominal drenaj + deneyimli HPB merkezinde Roux-en-Y hepatikojejunostomi.'
    },
    'D': {
        bismuth: 'Yok (Laparoskopik Ek)',
        def: 'Ekstrahepatik ana safra kanallarının (ana hepatik kanal veya koledok) devamlılığı bozulmaksızın lateral (tanjansiyel) kısmi yaralanması (kanal çevresinin <%50\'sini tutan defekt).',
        isMajor: false,
        mgmt: 'ERCP + endoskopik sfinkterotomi + biliyer stent (ve varsa biloma drenajı); doku kaybı veya termal hasar büyükse cerrahi rekonstrüksiyon (hepatikojejunostomi) gerekebilir.'
    },
    'E1': {
        bismuth: 'Bismuth Tip I',
        def: 'Ana hepatik kanal (CHD) veya koledokta hepatik konfluensten (bifurkasyondan) >2 cm (bazı serilerde ≥2 cm) uzaklıkta sirkümferensiyal transeksiyon veya striktür.',
        isMajor: true,
        mgmt: 'Deneyimli HPB cerrahisi merkezinde gerilimsiz, mukoza-mukozaya Roux-en-Y hepatikojejunostomi.'
    },
    'E2': {
        bismuth: 'Bismuth Tip II',
        def: 'Ana hepatik kanalda hepatik konfluense <2 cm mesafede sirkümferensiyal transeksiyon veya striktür.',
        isMajor: true,
        mgmt: 'Deneyimli HPB cerrahisi merkezinde yüksek Roux-en-Y hepatikojejunostomi (Hepp-Couinaud yaklaşımı ile sol hepatik kanal uzatımı).'
    },
    'E3': {
        bismuth: 'Bismuth Tip III',
        def: 'Hepatik konfluens (hilum) düzeyinde, ancak sağ ve sol hepatik kanalların birleşim tavanının (iletişiminin / continuity) korunduğu hiler transeksiyon veya striktür.',
        isMajor: true,
        mgmt: 'Deneyimli HPB merkezinde hiler plak indirilerek (Hepp-Couinaud) geniş hiler Roux-en-Y hepatikojejunostomi.'
    },
    'E4': {
        bismuth: 'Bismuth Tip IV',
        def: 'Hepatik konfluensi tahrip ederek sağ ve sol hepatik kanalları birbirinden tamamen ayıran (devamlılığın kaybolduğu) yüksek hiler transeksiyon veya striktür.',
        isMajor: true,
        mgmt: 'Sağ ve sol hepatik kanalların ayrı ayrı veya birleştirilerek (portoenterostomi / çift anastomoz) Roux-en-Y hepatikojejunostomisi; eşlik eden arteriyel yaralanma/lobar nekroz varsa hepatektomi.'
    },
    'E5': {
        bismuth: 'Bismuth Tip V',
        def: 'Ana hepatik kanalın (CHD) yanı sıra aberran sağ sektörel hepatik kanalın birlikte yaralanması veya striktürü (Tip C + ana kanal yaralanması kombinasyonu).',
        isMajor: true,
        mgmt: 'Hem ana hepatik kanalı hem de aberran sağ sektörel kanalı içerecek şekilde kompleks Roux-en-Y hepatikojejunostomi.'
    }
};

export function classifyStrasbergBismuth(params: StrasbergBismuthParams | null | undefined): StrasbergBismuthResult | null {
    if (!params) return null;

    const cutoffMode: StrasbergConfluenceCutoffMode = params.confluenceCutoffMode || 'gt_2cm';
    let resolvedType: StrasbergType | null = params.type ?? null;
    let confluenceCutoffComparison: StrasbergBismuthResult['confluenceCutoffComparison'] = undefined;

    if (params.distanceFromConfluenceCm !== null && params.distanceFromConfluenceCm !== undefined && Number.isFinite(params.distanceFromConfluenceCm) && params.distanceFromConfluenceCm >= 0) {
        const d = params.distanceFromConfluenceCm;
        const gt2cmClass: 'E1 (>2 cm — Bismuth I)' | 'E2 (≤2 cm — Bismuth II)' = d > 2 ? 'E1 (>2 cm — Bismuth I)' : 'E2 (≤2 cm — Bismuth II)';
        const gte2cmClass: 'E1 (≥2 cm — Bismuth I)' | 'E2 (<2 cm — Bismuth II)' = d >= 2 ? 'E1 (≥2 cm — Bismuth I)' : 'E2 (<2 cm — Bismuth II)';
        confluenceCutoffComparison = {
            distanceCm: d,
            gt2cmClassification: gt2cmClass,
            gte2cmClassification: gte2cmClass,
            isBoundary2cm: d === 2
        };
        if (!resolvedType || resolvedType === 'E1' || resolvedType === 'E2') {
            resolvedType = cutoffMode === 'gt_2cm' ? (d > 2 ? 'E1' : 'E2') : (d >= 2 ? 'E1' : 'E2');
        }
    }

    if (!resolvedType || !STRASBERG_CATALOG[resolvedType]) return null;

    const info = STRASBERG_CATALOG[resolvedType];
    const timing: BDIDetectionTiming = params.detectionTiming || 'postop_early';

    let timingAndReferralGuidance = '';
    if (timing === 'intraoperative') {
        if (params.hasHpbExpertiseOnSite) {
            timingAndReferralGuidance = 'İntraoperatif Tanı (HPB Uzmanlığı Mevcut): Aynı seansta deneyimli HPB cerrahı tarafından primer onarım / Roux-en-Y hepatikojejunostomi uygulanabilir.';
        } else {
            timingAndReferralGuidance = '🛑 İntraoperatif Tanı (HPB Uzmanlığı Yok — WSES 2020 Kuralı): Kesinlikle açık konversiyon ve uygunsuz primer onarım girişiminde BULUNMAYINIZ! Subhepatik alana sadece eksternal dren yerleştirip hastayı gecikmeksizin 3. basamak HPB merkezine sevk ediniz.';
        }
    } else if (timing === 'postop_early') {
        if (info.isMajor) {
            timingAndReferralGuidance = 'Postoperatif Erken Tanı (<6 Hafta — WSES 2020 & SAGES-AHPBA): Peritonit/biloma ve sepsisin kontrolü (perkütan biloma drenajı + PTK/biliyer diversiyon + antibiyotik) önceliklidir. Akut inflamasyon ve iskemi döneminde erken (<6 hafta) onarım striktür riskini artırdığından, definitif Roux-en-Y hepatikojejunostominin >6 hafta (genellikle 3–6 ay) geciktirilmesi önerilir.';
        } else {
            timingAndReferralGuidance = 'Postoperatif Erken Tanı (Minör / Lateral Kaçak): Perkütan biloma drenajı + ERCP sfinkterotomi ve biliyer stentleme ile yüksek oranda definitif iyileşme sağlanır.';
        }
    } else {
        timingAndReferralGuidance = 'Postoperatif Geç Tanı (>6 Hafta / Biliyer Striktür): Akut inflamasyon gerilediği ve kanal duvarı matüre olduğu için 3. basamak HPB merkezinde definitif Roux-en-Y hepatikojejunostomi planlanır.';
    }

    let vascularInjuryWarning: string | undefined = undefined;
    if (params.hasConcomitantVascularInjury) {
        vascularInjuryWarning = '🚨 EŞLİK EDEN VASKÜLER YARALANMA (Vaskülo-Biliyer Yaralanma): Strasberg-Bismuth sınıflaması eşzamanlı sağ hepatik arter / portal ven hasarını kodlamaz (Stewart-Way / Hannover / ATOM kapsamında). Özellikle E4/E5 + arteriyel yaralanmada anastomoz iskemisi, karaciğer nekrozu/apsesi ve sağ hepatektomi gereksinimi belirgin artar; BT anjiyografi ile vasküler haritalama şarttır!';
    }

    return {
        type: resolvedType,
        bismuthEquivalent: info.bismuth,
        anatomicalDefinition: info.def,
        isMajorDuctInjury: info.isMajor,
        alertClass: info.isMajor || params.hasConcomitantVascularInjury ? 'danger' : 'warning',
        primaryManagement: info.mgmt,
        timingAndReferralGuidance,
        vascularInjuryWarning,
        confluenceCutoffComparison
    };
}
