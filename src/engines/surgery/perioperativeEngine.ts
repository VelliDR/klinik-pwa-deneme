// ============================================================================
// CERRAHİ KOMPLİKASYON VE PERİOPERATİF RİSK MOTORU
// 1. Clavien-Dindo Cerrahi Komplikasyon Sınıflandırması (1992 / 2004 / 2009)
// 2. Comprehensive Complication Index (CCI®, Slankamenac et al., 2013)
// 3. ASA Fiziksel Durum Sınıflandırması (ASA-PS, 13 Aralık 2020 Güncel Sürümü)
// ============================================================================

export type ClavienDindoGrade = 'I' | 'II' | 'IIIa' | 'IIIb' | 'IVa' | 'IVb' | 'V';

export interface ClavienDindoCounts {
    I?: number;
    II?: number;
    IIIa?: number;
    IIIb?: number;
    IVa?: number;
    IVb?: number;
    V?: number;
}

export interface ClavienDindoCCIParams {
    // Tekil en yüksek derece VEYA çoklu komplikasyon sayıları / listesi
    primaryGrade?: ClavienDindoGrade | null;
    counts?: ClavienDindoCounts;
    gradesList?: ClavienDindoGrade[];
    hasDisabilityAtDischarge?: boolean; // "d" soneki (Suffix "d")
}

export interface ClavienDindoCCIResult {
    totalComplicationCount: number;
    highestGrade: ClavienDindoGrade | 'Komplikasyon Yok';
    formattedClavienDindo: string; // Örn: "Derece IIIb-d"
    isMajorComplication: boolean; // >= IIIa
    cciScore: number;             // 0.0 – 100.0
    singleHighestGradeCciScore: number;
    totalRawWeightWc: number;
    breakdownText: string;
    highestGradeDefinition: string;
    clinicalExamples: string;
    alertClass: 'success' | 'warning' | 'danger';
    clavienVsCciComparison: string;
    exclusionReminderNote: string;
}

export const CLAVIEN_DINDO_WEIGHTS: Record<ClavienDindoGrade, number> = {
    'I': 300,
    'II': 1750,
    'IIIa': 2750,
    'IIIb': 4550,
    'IVa': 7200,
    'IVb': 8550,
    'V': 40000 // Doğrudan CCI = 100.0 atanır
};

const GRADE_RANK: Record<ClavienDindoGrade, number> = {
    'I': 1,
    'II': 2,
    'IIIa': 3,
    'IIIb': 4,
    'IVa': 5,
    'IVb': 6,
    'V': 7
};

const CLAVIEN_CATALOG: Record<ClavienDindoGrade, {
    singleCci: number;
    def: string;
    examples: string;
}> = {
    'I': {
        singleCci: 8.7,
        def: 'Farmakolojik tedavi veya cerrahi, endoskopik ve radyolojik girişim gerektirmeksizin normal postoperatif seyirden her türlü sapma. İzin verilen ilaçlar: Antiemetikler, antipiretikler, analjezikler, diüretikler, elektrolitler ve fizyoterapi. Yatak başında (at the bedside) açılan yara yeri enfeksiyonları bu dereceye dahildir.',
        examples: 'Yatak başında drene edilen yüzeyel kesi yeri enfeksiyonu (SSI), diüretik verilen hafif sıvı yüklenmesi, geçici iskemik atak (TİA), ileus için NG sonda.'
    },
    'II': {
        singleCci: 20.9,
        def: 'Derece I için izin verilen ilaçlar dışındaki ilaçlarla farmakolojik tedavi gerektiren komplikasyonlar. Kan transfüzyonları ve Total Parenteral Nütrisyon (TPN) da bu dereceye dahildir.',
        examples: 'Pnömoni veya İYE için sistemik antibiyotik tedavisi, DVT/PTE için terapötik antikoagülasyon, taşiaritmi/HT için ilaç, eritrosit süspansiyonu transfüzyonu, TPN.'
    },
    'IIIa': {
        singleCci: 26.2,
        def: 'Genel anestezi altında YAPILMAYAN cerrahi, endoskopik veya radyolojik girişim gerektiren komplikasyonlar.',
        examples: 'Lokal anestezi altında BT/US eşliğinde perkütan intraabdominal apse/biloma drenajı, lokal anesteziyle toraks tüpü, bilinçli sedasyonla endoskopik hemostaz veya ERCP biliyer stent.'
    },
    'IIIb': {
        singleCci: 33.7,
        def: 'Genel anestezi altında YAPILAN cerrahi, endoskopik veya radyolojik girişim gerektiren komplikasyonlar.',
        examples: 'Anastomoz kaçağı, fasiyal eviserasyon (yara ayrışması) veya postoperatif kanama nedeniyle genel anestezi altında re-laparotomi / re-operasyon.'
    },
    'IVa': {
        singleCci: 42.4,
        def: 'Ara yoğun bakım veya yoğun bakım ünitesi (IC/ICU) yönetimi gerektiren, yaşamı tehdit eden TEK ORGAN disfonksiyonu (diyaliz gereksinimi ve TİA dışındaki SSS komplikasyonları: inme/beyin kanaması dahil).',
        examples: 'Mekanik ventilasyon gerektiren akut solunum yetmezliği (ARDS), hemodiyaliz/CRRT gerektiren akut böbrek yetmezliği, iskemik inme.'
    },
    'IVb': {
        singleCci: 46.2,
        def: 'Yoğun bakım ünitesi (IC/ICU) yönetimi gerektiren, yaşamı tehdit eden ÇOKLU ORGAN disfonksiyonu (Multiorgan dysfunction).',
        examples: 'Vazopressör desteği, mekanik ventilasyon ve renal replasman tedavisi gerektiren septik şok / çoklu organ yetmezliği (MOF).'
    },
    'V': {
        singleCci: 100.0,
        def: 'Hastanın ölümü (Postoperatif komplikasyona bağlı mortalite).',
        examples: 'Postoperatif dönemde komplikasyona bağlı eksitus (Doğrudan CCI® = 100.0 atanır).'
    }
};

export function calculateClavienDindoCCI(params: ClavienDindoCCIParams | null | undefined): ClavienDindoCCIResult | null {
    if (!params) return null;

    const counts: Record<ClavienDindoGrade, number> = {
        'I': Math.max(0, Math.floor(params.counts?.I || 0)),
        'II': Math.max(0, Math.floor(params.counts?.II || 0)),
        'IIIa': Math.max(0, Math.floor(params.counts?.IIIa || 0)),
        'IIIb': Math.max(0, Math.floor(params.counts?.IIIb || 0)),
        'IVa': Math.max(0, Math.floor(params.counts?.IVa || 0)),
        'IVb': Math.max(0, Math.floor(params.counts?.IVb || 0)),
        'V': Math.max(0, Math.floor(params.counts?.V || 0))
    };

    if (params.gradesList && params.gradesList.length > 0) {
        params.gradesList.forEach(g => {
            if (counts[g] !== undefined) counts[g] += 1;
        });
    }

    const sumFromCounts = Object.values(counts).reduce((a, b) => a + b, 0);
    if (sumFromCounts === 0 && params.primaryGrade) {
        counts[params.primaryGrade] = 1;
    }

    const totalComplicationCount = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalComplicationCount === 0) {
        return {
            totalComplicationCount: 0,
            highestGrade: 'Komplikasyon Yok',
            formattedClavienDindo: 'Komplikasyon Yok (Normal Postoperatif Seyir)',
            isMajorComplication: false,
            cciScore: 0.0,
            singleHighestGradeCciScore: 0.0,
            totalRawWeightWc: 0,
            breakdownText: 'Komplikasyon kaydedilmedi',
            highestGradeDefinition: 'Postoperatif dönemde normal cerrahi seyirden sapma yoktur.',
            clinicalExamples: '-',
            alertClass: 'success',
            clavienVsCciComparison: 'Clavien-Dindo: 0 | CCI®: 0.0 / 100',
            exclusionReminderNote: 'Clavien-Dindo Kuralı: Ameliyatın asıl hedefine ulaşamaması (örn. R2 rezeksiyon / erken fıtık nüksü) "tedavi başarısızlığı" (failure to cure), doğası gereği kaçınılmaz sonuçlar ise "sekel" (sequelae) sayılır ve bu sınıflamaya dahil edilmez.'
        };
    }

    const gradesOrder: ClavienDindoGrade[] = ['I', 'II', 'IIIa', 'IIIb', 'IVa', 'IVb', 'V'];
    let highestGrade: ClavienDindoGrade = 'I';
    let totalRawWeightWc = 0;
    const breakdownParts: string[] = [];

    gradesOrder.forEach(g => {
        const c = counts[g];
        if (c > 0) {
            if (GRADE_RANK[g] >= GRADE_RANK[highestGrade]) {
                highestGrade = g;
            }
            if (g !== 'V') {
                totalRawWeightWc += c * CLAVIEN_DINDO_WEIGHTS[g];
            }
            breakdownParts.push(`${c}× Derece ${g}`);
        }
    });

    const hasDeath = counts['V'] > 0;
    const rawCci = hasDeath ? 100.0 : Math.min(100.0, Math.sqrt(totalRawWeightWc) / 2);
    const cciScore = Math.round(rawCci * 10) / 10;
    const singleHighestGradeCciScore = CLAVIEN_CATALOG[highestGrade].singleCci;

    const suffixD = params.hasDisabilityAtDischarge && !hasDeath ? '-d' : '';
    const formattedClavienDindo = `Derece ${highestGrade}${suffixD}`;
    const isMajorComplication = GRADE_RANK[highestGrade] >= GRADE_RANK['IIIa'];

    const alertClass: 'success' | 'warning' | 'danger' =
        GRADE_RANK[highestGrade] >= GRADE_RANK['IIIb'] || cciScore >= 33.7
            ? 'danger'
            : (GRADE_RANK[highestGrade] >= GRADE_RANK['II'] || cciScore >= 20.0)
                ? 'warning'
                : 'success';

    const meta = CLAVIEN_CATALOG[highestGrade];
    let clavienVsCciComparison = `En Yüksek Tekil Clavien-Dindo: ${formattedClavienDindo} (Tekil CCI karşılığı: ${singleHighestGradeCciScore}) vs Kümülatif CCI®: ${cciScore}/100 (${breakdownParts.join(' + ')}).`;
    if (totalComplicationCount > 1 && !hasDeath) {
        clavienVsCciComparison += ` 💡 Çoklu Komplikasyon Farkı: Klasik Clavien-Dindo yalnızca en ağır tek komplikasyonu (${highestGrade}) raporlarken, CCI® hastadaki tüm ${totalComplicationCount} komplikasyonun toplam morbidite yükünü √(ΣwC)/2 = ${cciScore} puana yükseltmiştir.`;
    }

    return {
        totalComplicationCount,
        highestGrade,
        formattedClavienDindo,
        isMajorComplication,
        cciScore,
        singleHighestGradeCciScore,
        totalRawWeightWc,
        breakdownText: breakdownParts.join(' + '),
        highestGradeDefinition: meta.def,
        clinicalExamples: meta.examples,
        alertClass,
        clavienVsCciComparison,
        exclusionReminderNote: 'Kaskad & Hariç Tutma Kuralı: Tek bir birincil komplikasyon (örn. anastomoz kaçağı) sırasıyla antibiyotik (II) -> perkütan drenaj (IIIa) -> re-laparotomi (IIIb) kaskadına yol açarsa yalnızca en yüksek basamak (IIIb) girilir; bağımsız farklı komplikasyonlar ise CCI® hesabına ayrı ayrı eklenir.'
    };
}

// ============================================================================
// 3. ASA FİZİKSEL DURUM SINIFLANDIRMASI (ASA-PS — 13 Aralık 2020 Güncel Sürümü)
// ============================================================================

export type ASAPhysicalStatusClass = 1 | 2 | 3 | 4 | 5 | 6;
export type ASAExampleContext = 'adult' | 'pediatric' | 'obstetric';

export interface ASAPhysicalStatusParams {
    asaClassDirect?: ASAPhysicalStatusClass | null;
    isEmergency?: boolean; // "E" soneki (Acil ameliyat)
    exampleContext?: ASAExampleContext;

    // Hasta profilinden otomatik ASA önerisi / doğrulaması için opsiyonel klinik bulgular
    ageYears?: number | null;
    bmi?: number | null;
    isPregnant?: boolean;
    isCurrentSmokerOrSocialAlcohol?: boolean;
    hasControlledDmOrHtnOrMildLungDisease?: boolean;
    hasPoorlyControlledDmOrHtnOrActiveHepatitisOrPacemaker?: boolean;
     isRegularScheduledDialysisEsrd?: boolean;
    miCvaTiaOrStentHistory?: 'none' | 'gt_3_months' | 'lt_3_months';
    hasOngoingCardiacIschemiaOrSevereValveOrEfUnder40?: boolean;
    hasSepsisOrShockOrDic?: boolean;
    hasUnscheduledDialysisArdOrEsrd?: boolean;
    isMoribundRupturedAneurysmMassiveTraumaIschemicBowel?: boolean;
    isBrainDeadOrganDonor?: boolean;
}

export interface ASAPhysicalStatusResult {
    asaClass: ASAPhysicalStatusClass;
    romanClass: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
    isEmergency: boolean;
    formattedCode: string; // Örn: "ASA II", "ASA IIIE"
    officialDefinition: string;
    activeContext: ASAExampleContext;
    approvedExamplesAdult2020: string;
    approvedExamplesPediatric2020: string;
    approvedExamplesObstetric2020: string;
    autoSuggestedClass: ASAPhysicalStatusClass | null;
    autoSuggestionTriggers: string[];
    isLowRiskForTokyoGuidelines: boolean; // ASA <= II
    alertClass: 'success' | 'warning' | 'danger';
    clinicalAndTg18Guidance: string;
    limitationNote: string;
}

const ROMAN_MAP: Record<ASAPhysicalStatusClass, ASAPhysicalStatusResult['romanClass']> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI'
};

const ASA_2020_CATALOG: Record<ASAPhysicalStatusClass, {
    def: string;
    adult: string;
    peds: string;
    ob: string;
}> = {
    1: {
        def: 'Normal, sağlıklı bir hasta (A normal healthy patient).',
        adult: 'Sağlıklı, sigara içmeyen, hiç alkol kullanmayan veya minimal alkol kullanan birey (BMI <30 kg/m²).',
        peds: 'Sağlıklı (akut veya kronik hastalığı olmayan), yaşına göre normal BMI persentilinde çocuk.',
        ob: 'Gebelik fizyolojik değişiklikler nedeniyle ASA I kabul edilmez (Normal gebelik en az ASA II\'dir).'
    },
    2: {
        def: 'Hafif sistemik hastalığı olan bir hasta (Belirgin fonksiyonel kısıtlılık yoktur).',
        adult: 'Halen sigara içen (current smoker), sosyal alkol tüketicisi, gebelik, obezite (30 < BMI < 40 kg/m²), iyi kontrol edilen DM veya HT, hafif akciğer hastalığı.',
        peds: 'Yaşa göre anormal BMI persentili, hafif/orta OSA, remisyonda onkolojik durum, hafif kısıtlılıklı otizm.',
        ob: 'Komplikasyonsuz normal gebelik, iyi kontrol edilen gestasyonel HT veya diyetle kontrol edilen gestasyonel DM.'
    },
    3: {
        def: 'Ciddi/şiddetli sistemik hastalığı olan bir hasta — Belirgin (substantive) fonksiyonel kısıtlılık vardır.',
        adult: 'Morbid obezite (BMI ≥40 kg/m²), >3 ay önce geçirilmiş MI, CVA (inme), TİA veya KAH/stent öyküsü, kötü kontrol edilen DM/HT, KOAH, aktif hepatit, kalıcı kalp pili, EF\'de orta azalma, düzenli programlı diyalize giren ESRD.',
        peds: '<6 haftalık term yenidoğan, düzeltilmemiş stabil konjenital kalp anomalisi, alevlenmeli astım, kötü kontrol edilen epilepsi, insülin bağımlı DM, morbid obezite, malnütrisyon, şiddetli OSA, aktif onkolojik durum, böbrek yetmezliği, musküler distrofi, kistik fibrozis, organ nakli.',
        ob: 'Şiddetli özellikli preeklampsi, komplikasyonlu veya yüksek insülin gereksinimli gestasyonel DM, antikoagülasyon gerektiren trombofilik hastalık.'
    },
    4: {
        def: 'Yaşamı sürekli tehdit eden şiddetli sistemik hastalığı olan bir hasta.',
        adult: 'Yakın zamanda (<3 ay) geçirilmiş MI, CVA, TİA veya KAH/stent, devam eden kardiyak iskemi veya şiddetli kapak disfonksiyonu, ejeksiyon fraksiyonunda ağır azalma (EF <%40), şok, sepsis, DIC, düzenli programlı diyalize girmeyen akut veya son dönem böbrek yetmezliği (ARD/ESRD).',
        peds: 'Semptomatik konjenital kalp anomalisi, konjestif kalp yetmezliği, prematüritenin aktif sekelleri, akut hipoksik-iskemik ensefalopati, şok, sepsis, DIC.',
        ob: 'HELLP sendromu veya diğer advers olayla komplike şiddetli preeklampsi, EF <%40 peripartum kardiyomiyopati, düzeltilmemiş/dekompanse kalp hastalığı.'
    },
    5: {
        def: 'Ameliyat edilmediği takdirde hayatta kalması beklenmeyen, ölmek üzere olan (moribund) bir hasta.',
        adult: 'Rüptüre abdominal veya torasik aort anevrizması, masif travma, kitle etkisi olan intrakraniyal kanama, ciddi kardiyak patoloji veya çoklu organ/sistem disfonksiyonu eşliğinde iskemik bağırsak.',
        peds: 'Masif travma, kitle etkili intrakraniyal kanama, ECMO gerektiren solunum yetmezliği, dekompanse septik şok.',
        ob: 'Uterus rüptürü (anne-fetüs yaşamını tehdit eden hemorajik şok).'
    },
    6: {
        def: 'Organları donör amacıyla çıkarılmakta olan, beyin ölümü bildirilmiş bir hasta.',
        adult: 'Beyin ölümü bildirilmiş organ donörü.',
        peds: 'Beyin ölümü bildirilmiş pediatrik organ donörü.',
        ob: 'Beyin ölümü bildirilmiş organ donörü.'
    }
};

export function evaluateASAPhysicalStatus(params: ASAPhysicalStatusParams | null | undefined): ASAPhysicalStatusResult | null {
    if (!params) return null;

    // Otomatik Klinik Bulgu -> ASA Önerisi
    let suggested: ASAPhysicalStatusClass | null = null;
    const triggers: string[] = [];

    const bump = (lvl: ASAPhysicalStatusClass, reason: string) => {
        if (suggested === null || lvl > suggested) {
            suggested = lvl;
        }
        triggers.push(reason);
    };

    if (params.isCurrentSmokerOrSocialAlcohol) bump(2, 'Aktif sigara / sosyal alkol kullanımı (ASA ≥II)');
    if (params.isPregnant) bump(2, 'Gebelik (ASA ≥II)');
    if (params.hasControlledDmOrHtnOrMildLungDisease) bump(2, 'Kontrollü DM/HT veya hafif akciğer hastalığı (ASA ≥II)');
    if (params.bmi !== null && params.bmi !== undefined && Number.isFinite(params.bmi)) {
        if (params.bmi >= 40) bump(3, `Morbid obezite (BMI ${params.bmi.toFixed(1)} ≥ 40 kg/m² -> ASA ≥III)`);
        else if (params.bmi > 30) bump(2, `Obezite (30 < BMI ${params.bmi.toFixed(1)} < 40 kg/m² -> ASA ≥II)`);
    }
    if (params.ageYears !== null && params.ageYears !== undefined && params.ageYears >= 0 && params.ageYears < (6 / 52)) {
        bump(3, '<6 haftalık term yenidoğan (ASA 2020 pediatrik örnek -> ASA ≥III)');
    }
    if (params.hasPoorlyControlledDmOrHtnOrActiveHepatitisOrPacemaker) {
        bump(3, 'Kötü kontrollü DM/HT, KOAH, aktif hepatit veya kalıcı kalp pili (ASA ≥III)');
    }
    if (params.isRegularScheduledDialysisEsrd) {
        bump(3, 'Düzenli programlı diyalize giren ESRD (ASA ≥III)');
    }
    if (params.miCvaTiaOrStentHistory === 'gt_3_months') {
        bump(3, '>3 ay önce geçirilmiş MI, CVA, TİA veya KAH/stent (ASA ≥III)');
    } else if (params.miCvaTiaOrStentHistory === 'lt_3_months') {
        bump(4, 'Yakın zamanda (<3 ay) geçirilmiş MI, CVA, TİA veya KAH/stent (ASA ≥IV)');
    }
    if (params.hasOngoingCardiacIschemiaOrSevereValveOrEfUnder40) {
        bump(4, 'Devam eden kardiyak iskemi, şiddetli kapak disfonksiyonu veya ağır EF azalması (ASA ≥IV)');
    }
    if (params.hasSepsisOrShockOrDic) {
        bump(4, 'Sepsis, şok veya DIC (ASA ≥IV)');
    }
    if (params.hasUnscheduledDialysisArdOrEsrd) {
        bump(4, 'Düzenli programlı diyalize girmeyen akut/son dönem böbrek yetmezliği (ASA ≥IV)');
    }
    if (params.isMoribundRupturedAneurysmMassiveTraumaIschemicBowel) {
        bump(5, 'Ameliyatsız sağkalımı beklenmeyen moribund tablo: rüptüre anevrizma / masif travma / MOF eşliğinde iskemik bağırsak (ASA V)');
    }
    if (params.isBrainDeadOrganDonor) {
        bump(6, 'Beyin ölümü bildirilmiş organ donörü (ASA VI)');
    }

    const asaClass: ASAPhysicalStatusClass | null = params.asaClassDirect ?? suggested;
    if (!asaClass || asaClass < 1 || asaClass > 6) return null;

    const isEmergency = Boolean(params.isEmergency);
    const romanClass = ROMAN_MAP[asaClass];
    const formattedCode = `ASA ${romanClass}${isEmergency ? 'E' : ''}`;
    const meta = ASA_2020_CATALOG[asaClass];

    let activeContext: ASAExampleContext = params.exampleContext || 'adult';
    if (!params.exampleContext) {
        if (params.isPregnant) activeContext = 'obstetric';
        else if (params.ageYears !== null && params.ageYears !== undefined && params.ageYears < 18) activeContext = 'pediatric';
    }

    const isLowRiskForTokyoGuidelines = asaClass <= 2;
    const alertClass: 'success' | 'warning' | 'danger' =
        asaClass >= 4 || (asaClass === 3 && isEmergency) ? 'danger' : asaClass === 3 || isEmergency ? 'warning' : 'success';

    const clinicalAndTg18Guidance = isLowRiskForTokyoGuidelines
        ? `${formattedCode}: Preoperatif sistemik komorbidite yükü düşüktür. Tokyo Kılavuzu 2018 (TG18) algoritmasında erken laparoskopik kolesistektomi için düşük cerrahi risk (ASA-PS ≤II) kriterini karşılar.`
        : `${formattedCode}: Yüksek sistemik komorbidite yükü (ASA-PS ≥III). Yoğun bakım hazırlığı, preoperatif medikal optimizasyon ve TG18 akut kolesistit algoritmasında yüksek cerrahi risk nedeniyle (Derece II/III'te) safra kesesi drenajı (PTGBD) / dikkatli merkez seçimi açısından belirleyicidir.`;

    const limitationNote = 'ASA 2020 Metodolojik Kuralı: ASA-PS tek başına bir "operatif/cerrahi risk" skoru değildir; yapılacak cerrahi işlemin büyüklüğünü (lokal eksizyon vs Whipple), kırılganlığı (frailty) ve ileri yaşı tek başına hesaba katmaz. MI/CVA/TİA/Stent için kritik geçiş sınırı 3 aydır (<3 ay: ASA IV vs >3 ay: ASA III).';

    return {
        asaClass,
        romanClass,
        isEmergency,
        formattedCode,
        officialDefinition: meta.def,
        activeContext,
        approvedExamplesAdult2020: meta.adult,
        approvedExamplesPediatric2020: meta.peds,
        approvedExamplesObstetric2020: meta.ob,
        autoSuggestedClass: suggested,
        autoSuggestionTriggers: triggers,
        isLowRiskForTokyoGuidelines,
        alertClass,
        clinicalAndTg18Guidance,
        limitationNote
    };
}
