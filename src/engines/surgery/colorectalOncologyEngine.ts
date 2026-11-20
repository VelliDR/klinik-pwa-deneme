// ============================================================================
// KOLOREKTAL KANSER VE MALİGN POLİPLER MOTORU (AJCC 8. Baskı, ESMO, ESGE)
// 1. AJCC / UICC TNM Kolorektal Kanser Evrelemesi (8. Baskı, 2017–2018 / 2026)
// 2. Haggitt Sınıflandırması — Pedünküllü (Saplı) pT1 Malign Polipler (1985)
// 3. Kikuchi Sınıflandırması — Sesil (Sapsız) pT1 Kanserler (1995) & Mikrometrik (<1000 µm) Karşılaştırma
// ============================================================================

export type TNMStagingPrefix = 'c' | 'p' | 'yp';
export type ColorectalTCategory = 'TX' | 'T0' | 'Tis' | 'T1' | 'T2' | 'T3' | 'T4a' | 'T4b';
export type ColorectalNCategory = 'NX' | 'N0' | 'N1a' | 'N1b' | 'N1c' | 'N2a' | 'N2b';
export type ColorectalMCategory = 'M0' | 'M1a' | 'M1b' | 'M1c';
export type ColorectalTumorSite = 'colon_peritonealized' | 'colon_posterior_non_peritonealized' | 'rectum_upper_mid' | 'rectum_lower';

export interface ColorectalTNMParams {
    prefix?: TNMStagingPrefix;
    tCategory: ColorectalTCategory;
    nCategory?: ColorectalNCategory;
    positiveLymphNodeCount?: number | null;
    hasTumorDeposits?: boolean;
    mCategory?: ColorectalMCategory;
    tumorSite?: ColorectalTumorSite;
}

export interface ColorectalTNMResult {
    tnmCode: string; // Örn: "pT3 N1b M0"
    tCategory: ColorectalTCategory;
    nCategory: ColorectalNCategory;
    mCategory: ColorectalMCategory;
    tDescription: string;
    nDescription: string;
    mDescription: string;
    stageGroup: 'Evre 0' | 'Evre I' | 'Evre IIA' | 'Evre IIB' | 'Evre IIC' | 'Evre IIIA' | 'Evre IIIB' | 'Evre IIIC' | 'Evre IVA' | 'Evre IVB' | 'Evre IVC' | 'Evre Belirlenemedi (TX/NX/T0)';
    alertClass: 'success' | 'info' | 'warning' | 'danger';
    oncologicManagement: string;
    survivalParadoxWarning?: string;
    nonPeritonealizedT4aWarning?: string;
    tumorDepositNote?: string;
    ajccVersionNote: string;
}

const T_DESCRIPTIONS: Record<ColorectalTCategory, string> = {
    'TX': 'TX: Primer tümör değerlendirilemiyor',
    'T0': 'T0: Primer tümör kanıtı yok',
    'Tis': 'Tis: Karsinoma in situ / İntramukozal karsinom (lamina propriya invazyonu var, muskularis mukoza aşımı yok)',
    'T1': 'T1: Tümör submukozayı invaze eder (muskularis mukozayı aşmış ancak muskularis propriyayı tutmamış)',
    'T2': 'T2: Tümör muskularis propriyayı invaze eder',
    'T3': 'T3: Tümör muskularis propriyayı aşarak perikolorektal dokulara invaze olur',
    'T4a': 'T4a: Tümör visseral periton yüzeyini (serozayı) penetre eder veya tümör üzerinden serbest perforasyon mevcuttur',
    'T4b': 'T4b: Tümör komşu diğer organ veya yapılara doğrudan invaze olur veya yapışıktır'
};

const N_DESCRIPTIONS: Record<ColorectalNCategory, string> = {
    'NX': 'NX: Bölgesel lenf nodları değerlendirilemiyor',
    'N0': 'N0: Bölgesel lenf nodu metastazı yok',
    'N1a': 'N1a: 1 bölgesel lenf nodunda metastaz',
    'N1b': 'N1b: 2–3 bölgesel lenf nodunda metastaz',
    'N1c': 'N1c: Bölgesel lenf nodu metastazı yok (N0), ancak subseroza/mezenter/perirektal dokularda tümör depozitleri (satellit nodüller) mevcut',
    'N2a': 'N2a: 4–6 bölgesel lenf nodunda metastaz',
    'N2b': 'N2b: ≥7 bölgesel lenf nodunda metastaz'
};

const M_DESCRIPTIONS: Record<ColorectalMCategory, string> = {
    'M0': 'M0: Uzak metastaz yok',
    'M1a': 'M1a: Peritoneal tutulum olmaksızın tek bir uzak organ veya bölgede metastaz (örn. yalnız karaciğer veya yalnız akciğer)',
    'M1b': 'M1b: Peritoneal tutulum olmaksızın ≥2 uzak organ veya bölgede metastaz',
    'M1c': 'M1c: Diğer uzak organ metastazları olsun veya olmasın periton yüzeyine metastaz (peritoneal karsinomatozis — AJCC 8. Baskı yeniliği)'
};

export function calculateColorectalTNM(params: ColorectalTNMParams | null | undefined): ColorectalTNMResult | null {
    if (!params || !params.tCategory) return null;

    const prefix: TNMStagingPrefix = params.prefix || 'p';
    const t = params.tCategory;
    const m: ColorectalMCategory = params.mCategory || 'M0';

    // N kategorisini pozitif LN sayısı ve tümör depozitinden otomatik türet (veya doğrudan seçileni kullan)
    let n: ColorectalNCategory = params.nCategory || 'N0';
    let tumorDepositNote: string | undefined = undefined;

    if (params.positiveLymphNodeCount !== null && params.positiveLymphNodeCount !== undefined && Number.isFinite(params.positiveLymphNodeCount) && params.positiveLymphNodeCount >= 0) {
        const ln = Math.floor(params.positiveLymphNodeCount);
        if (ln === 0) {
            n = params.hasTumorDeposits ? 'N1c' : 'N0';
        } else if (ln === 1) {
            n = 'N1a';
        } else if (ln <= 3) {
            n = 'N1b';
        } else if (ln <= 6) {
            n = 'N2a';
        } else {
            n = 'N2b';
        }
        if (ln > 0 && params.hasTumorDeposits) {
            tumorDepositNote = `⚠️ Tümör Depoziti (TD) + Pozitif Lenf Nodu (${ln} LN+) Metodolojik Notu: AJCC 8. Baskı'da N1c yalnızca bölgesel lenf nodu negatif (N0) hastalarda tanımlanmıştır. Lenf nodu pozitif hastalarda eşlik eden tümör depozitleri N kategorisini resmi olarak yükseltmez ancak prognozu kötüleştirir (AJCC 9. Baskı akademik önerilerinde TD sayısının pozitif LN sayısına eklenmesi tartışılmaktadır).`;
        }
    } else if (params.hasTumorDeposits && n === 'N0') {
        n = 'N1c';
    }

    const isN1Group = n === 'N1a' || n === 'N1b' || n === 'N1c';

    let stageGroup: ColorectalTNMResult['stageGroup'] = 'Evre Belirlenemedi (TX/NX/T0)';
    let alertClass: ColorectalTNMResult['alertClass'] = 'info';
    let oncologicManagement = '';

    if (m === 'M1c') {
        stageGroup = 'Evre IVC';
        alertClass = 'danger';
        oncologicManagement = 'Evre IVC (M1c — Peritoneal Karsinomatozis): Moleküler profile (KRAS, NRAS, BRAF, MSI/dMMR) göre sistemik kemoterapi/hedefli tedavi/immünoterapi; seçilmiş sınırlı peritoneal hastalıkta (PCI uygun) Sitoredüktif Cerrahi (CRS) + HİPEK değerlendirilir.';
    } else if (m === 'M1b') {
        stageGroup = 'Evre IVB';
        alertClass = 'danger';
        oncologicManagement = 'Evre IVB (M1b — Çoklu Organ Metastazı): Moleküler profile (KRAS, BRAF, MSI/dMMR, HER2) göre sistemik tedavi; obstrüksiyon/kanama/perforasyon halinde palyatif cerrahi veya stentleme.';
    } else if (m === 'M1a') {
        stageGroup = 'Evre IVA';
        alertClass = 'danger';
        oncologicManagement = 'Evre IVA (M1a — Tek Organ Metastazı): Multidisipliner tümör konseyi değerlendirmesi; rezektabl (veya konversiyon tedavisiyle rezektabl hale gelen) karaciğer/akciğer metastazlarında cerrahi rezeksiyon/ablasyon + perioperatif sistemik tedavi.';
    } else if (t === 'TX' || t === 'T0' || n === 'NX') {
        stageGroup = 'Evre Belirlenemedi (TX/NX/T0)';
        alertClass = 'info';
        oncologicManagement = 'Primer tümör (T) veya bölgesel lenf nodu (N) durumu tam olarak belirlenemedi (ypT0N0M0 neoadjuvan sonrası patolojik tam yanıt ise yakın onkolojik izlem).';
    } else if (t === 'Tis' && n === 'N0') {
        stageGroup = 'Evre 0';
        alertClass = 'success';
        oncologicManagement = 'Evre 0 (Tis N0 M0): Mukozada lenfatik damar bulunmadığından R0 endoskopik polipektomi / EMR / ESD tamamen küratiftir; ek onkolojik rezeksiyon gerekmez.';
    } else if ((t === 'T1' || t === 'T2') && n === 'N0') {
        stageGroup = 'Evre I';
        alertClass = 'success';
        oncologicManagement = t === 'T1'
            ? 'Evre I (pT1 N0 M0): Düşük riskli pT1 polipte (Haggitt 1–3 veya Kikuchi sm1 / <1000 µm, LVI-, G1/2, budding-, R0 sınır) yalnız endoskopik/lokal eksizyon (EMR/ESD/TAMIS) yeterlidir; yüksek riskli pT1\'de onkolojik segmenter kolektomi veya TME uygulanır.'
            : 'Evre I (T2 N0 M0): Onkolojik radikal cerrahi rezeksiyon (kolonda CME + kolektomi, rektumda TME); adjuvan kemoterapi rutin önerilmez.';
    } else if (t === 'T3' && n === 'N0') {
        stageGroup = 'Evre IIA';
        alertClass = 'warning';
        oncologicManagement = 'Evre IIA (T3 N0 M0): Kolonda onkolojik rezeksiyon; MSI/MMR durumuna ve yüksek risk faktörlerine (<12 incelenen LN, LVI+, PNI+, G3, obstrüksiyon/perforasyon, yüksek tumor budding) göre adjuvan kemoterapi değerlendirilir. Rektumda lokal ileri hastalıkta neoadjuvan tedavi + TME.';
    } else if (t === 'T4a' && n === 'N0') {
        stageGroup = 'Evre IIB';
        alertClass = 'warning';
        oncologicManagement = 'Evre IIB (T4a N0 M0): Onkolojik cerrahi rezeksiyon + yüksek riskli Evre II kriteri olan T4 nedeniyle (dMMR/MSI-H değilse) adjuvan sistemik kemoterapi önerilir.';
    } else if (t === 'T4b' && n === 'N0') {
        stageGroup = 'Evre IIC';
        alertClass = 'danger';
        oncologicManagement = 'Evre IIC (T4b N0 M0): Tutulan komşu organ/yapı ile birlikte En-Blok R0 multivisseral onkolojik rezeksiyon + adjuvan sistemik kemoterapi (rektumda total neoadjuvan tedavi / KRT + cerrahi).';
    } else if (((t === 'T1' || t === 'T2') && isN1Group) || (t === 'T1' && n === 'N2a')) {
        stageGroup = 'Evre IIIA';
        alertClass = 'warning';
        oncologicManagement = 'Evre IIIA (Erken Nod-Pozitif Hastalık): Kolonda radikal onkolojik kolektomi + adjuvan kemoterapi (CAPOX / FOLFOX); rektumda neoadjuvan KRT/TNT + TME.';
    } else if (
        ((t === 'T3' || t === 'T4a') && isN1Group) ||
        ((t === 'T2' || t === 'T3') && n === 'N2a') ||
        ((t === 'T1' || t === 'T2') && n === 'N2b')
    ) {
        stageGroup = 'Evre IIIB';
        alertClass = 'danger';
        oncologicManagement = 'Evre IIIB: Kolonda radikal onkolojik kolektomi + adjuvan kemoterapi (3 veya 6 ay CAPOX/FOLFOX); rektumda neoadjuvan tedavi (TNT / KRT) + TME (tam klinik yanıtta seçilmiş hastada Watch & Wait).';
    } else {
        // T4a N2a | T3-T4a N2b | T4b N1-N2
        stageGroup = 'Evre IIIC';
        alertClass = 'danger';
        oncologicManagement = 'Evre IIIC (İleri Nod-Pozitif / T4bN+): Kolonda radikal en-blok kolektomi + 6 ay adjuvan FOLFOX/CAPOX; rektumda Total Neoadjuvan Tedavi (TNT) + TME / multivisseral rezeksiyon.';
    }

    let survivalParadoxWarning: string | undefined = undefined;
    if (stageGroup === 'Evre IIC' || stageGroup === 'Evre IIB') {
        survivalParadoxWarning = `⚠️ AJCC 8. BASKI SAĞKALIM PARADOKSU (${stageGroup} [${t}N0] vs Evre IIIA [T1–2N1]): Çok merkezli kohort çalışmalarında derin lokal invazyonlu nod-negatif Evre IIC (T4bN0) ve T4N0 hastaların progresyonsuz sağkalımının (p=0.008) ve genel sağkalımının (p=0.02–0.04) erken nod-pozitif Evre IIIA (T1–2N1) hastalardan anlamlı derecede DAHA KÖTÜ olduğu gösterilmiştir! Bu nedenle T4N0 hastalar adjuvan tedavi açısından yüksek riskli kabul edilmelidir.`;
    } else if (stageGroup === 'Evre IIIA') {
        survivalParadoxWarning = '💡 Sağkalım Paradoksu Notu: Evre IIIA (T1–2N1) hastaların uzun dönem sağkalımı, evre numarası daha yüksek olmasına rağmen Evre IIC (T4bN0) hastalardan anlamlı olarak daha iyidir.';
    }

    let nonPeritonealizedT4aWarning: string | undefined = undefined;
    if (t === 'T4a' && (params.tumorSite === 'colon_posterior_non_peritonealized' || params.tumorSite === 'rectum_lower')) {
        nonPeritonealizedT4aWarning = '⚠️ ANATOMİK T4a UYARISI (AJCC 8. Baskı Kuralı): Çıkan/inen kolonun peritonize olmayan arka (retroperitoneal) duvarında ve peritoneal refleksiyon altındaki orta-alt rektumda visseral periton (seroza) örtüsü bulunmadığından bu bölgelerdeki tümörler için "T4a" kategorisi uygulanamaz (doğrudan T3 veya komşu yapı invazyonu varsa T4b olarak sınıflandırılır).';
    }

    const ajccVersionNote = 'AJCC Sürüm Durumu (2026): 2023\'te Apendiks ve Anüs, 2024\'te Kolorektal Nöroendokrin Tümörler (NET) için AJCC Version 9 yürürlüğe girmiş olup, Kolon ve Rektum Adenokarsinomları için resmi güncel standart halen AJCC 8. Baskı\'dır.';

    return {
        tnmCode: `${prefix}${t} ${n} ${m}`,
        tCategory: t,
        nCategory: n,
        mCategory: m,
        tDescription: T_DESCRIPTIONS[t],
        nDescription: N_DESCRIPTIONS[n],
        mDescription: M_DESCRIPTIONS[m],
        stageGroup,
        alertClass,
        oncologicManagement,
        survivalParadoxWarning,
        nonPeritonealizedT4aWarning,
        tumorDepositNote,
        ajccVersionNote
    };
}

// ============================================================================
// 2. HAGGITT (1985) VE KIKUCHI (1995) pT1 MALİGN POLİP MOTORU
// ============================================================================

export type PolypMorphology = 'pedunculated' | 'sessile_flat';
export type HaggittLevel = 0 | 1 | 2 | 3 | 4;
export type KikuchiLevel = 'sm1' | 'sm2' | 'sm3';
export type KikuchiSm1Subtype = 'sm1a' | 'sm1b' | 'sm1c';
export type KikuchiSm2ApproachMode = 'esge_high_risk' | 'individualized_gray_zone';

export interface MalignantPolypParams {
    morphology?: PolypMorphology;
    // 1. Pedünküllü Polip — Haggitt Düzeyi (0-4)
    haggittLevel?: HaggittLevel;
    // 2. Sesil Polip — Kikuchi Düzeyi (sm1, sm2, sm3) & Mikrometrik Derinlik (µm)
    kikuchiLevel?: KikuchiLevel;
    sm1HorizontalSubtype?: KikuchiSm1Subtype;
    hasMuscularisPropriaInSpecimen?: boolean; // NICE NG151: Endoskopik EMR'lerin %88.1'inde MP yoktur -> mikrometrik ölçüm!
    invasionDepthMicrometers?: number | null; // <1000 µm vs >=1000 µm
    sm2ApproachMode?: KikuchiSm2ApproachMode; // sm2 gri alan kılavuz karşılaştırması

    // 3. Histopatolojik Yüksek Risk Faktörleri (ESGE / ESMO / ASGE)
    isPiecemealOrPositiveMargin?: boolean;    // En-blok değil veya sınır ≤1 mm / R1
    resectionMarginMm?: number | null;
    hasLymphovascularInvasion?: boolean;      // LVI (+)
    isPoorlyDifferentiatedG3?: boolean;       // Kötü diferansiye / taşlı yüzük / müsinöz (G3)
    hasHighTumorBudding?: boolean;            // Yüksek tümör tomurcuklanması (Bd2 / Bd3)
    isLowerThirdRectum?: boolean;             // Alt 1/3 rektum yerleşimi (Nascimbeni 2002 bağımsız LNM prediktörü, p=0.007)
}

export interface MalignantPolypResult {
    morphology: PolypMorphology;
    primaryClassificationTitle: string;
    tnmEquivalent: 'Tis' | 'pT1';
    haggittLevel: HaggittLevel;
    kikuchiLevel: KikuchiLevel | null;
    micrometricCategory: 'Yüzeyel (<1000 µm / <1 mm)' | 'Derin (≥1000 µm / ≥1 mm)' | null;
    estimatedLnmRiskPercent: string;
    highRiskHistologyFlags: string[];
    requiresOncologicResection: boolean;
    alertClass: 'success' | 'warning' | 'danger';
    clinicalRecommendation: string;
    sm2AndMicrometricComparison: {
        esgeGuidelineDecision: string;
        individualizedNascimbeniDecision: string;
        muscularisPropriaNote: string;
    };
}

export function evaluateMalignantPolyp(params: MalignantPolypParams | null | undefined): MalignantPolypResult | null {
    if (!params) return null;

    const morphology: PolypMorphology = params.morphology || 'pedunculated';
    const sm2Mode: KikuchiSm2ApproachMode = params.sm2ApproachMode || 'esge_high_risk';
    const hasMp = params.hasMuscularisPropriaInSpecimen !== false; // Varsayılan true, kullanıcı false seçebilir

    // Histolojik yüksek risk bayraklarını topla
    const highRiskHistologyFlags: string[] = [];
    const marginTight = Boolean(params.isPiecemealOrPositiveMargin)
        || (params.resectionMarginMm !== null && params.resectionMarginMm !== undefined && params.resectionMarginMm <= 1);
    if (marginTight) {
        highRiskHistologyFlags.push('Rezeksiyon sınırı pozitif/yakın (≤1 mm) veya parçalı (piecemeal) eksizyon (LNM/nüks riski %33 vs sınır >1–2 mm ise %2)');
    }
    if (params.hasLymphovascularInvasion) {
        highRiskHistologyFlags.push('Lenfovasküler İnvazyon (LVI+) (Bağımsız LNM prediktörü, p=0.005)');
    }
    if (params.isPoorlyDifferentiatedG3) {
        highRiskHistologyFlags.push('Kötü diferansiyasyon (Grade 3 / taşlı yüzük / müsinöz)');
    }
    if (params.hasHighTumorBudding) {
        highRiskHistologyFlags.push('Yüksek tümör tomurcuklanması (High tumor budding — Bd2/Bd3)');
    }
    if (params.isLowerThirdRectum) {
        highRiskHistologyFlags.push('Alt 1/3 rektum yerleşimi (Nascimbeni 2002 bağımsız LNM prediktörü, p=0.007)');
    }

    const hasAdverseHistology = Boolean(
        marginTight ||
        params.hasLymphovascularInvasion ||
        params.isPoorlyDifferentiatedG3 ||
        params.hasHighTumorBudding
    );

    let micrometricCategory: MalignantPolypResult['micrometricCategory'] = null;
    const depthUm = params.invasionDepthMicrometers;
    const isDeepMicrometric = depthUm !== null && depthUm !== undefined && Number.isFinite(depthUm) && depthUm >= 1000;
    if (depthUm !== null && depthUm !== undefined && Number.isFinite(depthUm) && depthUm > 0) {
        micrometricCategory = isDeepMicrometric
            ? 'Derin (≥1000 µm / ≥1 mm)'
            : 'Yüzeyel (<1000 µm / <1 mm)';
    }

    if (morphology === 'pedunculated') {
        const hLevel: HaggittLevel = params.haggittLevel !== undefined ? params.haggittLevel : 1;
        const tnmEquivalent: 'Tis' | 'pT1' = hLevel === 0 ? 'Tis' : 'pT1';

        const hMeta: Record<HaggittLevel, { title: string; lnm: string }> = {
            0: {
                title: 'Haggitt Düzey 0 (Tis — Mukoza İle Sınırlı Karsinoma İn Situ)',
                lnm: '%0 (Mukozada lenfatik damar yoktur)'
            },
            1: {
                title: 'Haggitt Düzey 1 (pT1 — Polip Başı [Head] Submukozası İle Sınırlı)',
                lnm: '<%1 (%0 – %0.3)'
            },
            2: {
                title: 'Haggitt Düzey 2 (pT1 — Polip Boynu [Neck / Haggitt Çizgisi] İnvazyonu)',
                lnm: '<%1 (Nivatvongs serisinde %0)'
            },
            3: {
                title: 'Haggitt Düzey 3 (pT1 — Polip Sapı [Stalk] İnvazyonu)',
                lnm: hasAdverseHistology || isDeepMicrometric ? '~%6.2 (sapta derin/kötü histoloji)' : '<%1 (düşük riskli histolojide)'
            },
            4: {
                title: 'Haggitt Düzey 4 (pT1 — Sapın Altındaki Bağırsak Duvarı Submukozası İnvazyonu)',
                lnm: '%10 – %27 (Olumsuz histoloji eşlik ediyorsa %25–27)'
            }
        };

        const requiresOncologicResection = hLevel === 4 || (hLevel >= 1 && (hasAdverseHistology || isDeepMicrometric));
        const alertClass: 'success' | 'warning' | 'danger' =
            hLevel === 0 ? 'success' : requiresOncologicResection ? 'danger' : hLevel === 3 ? 'warning' : 'success';

        let clinicalRecommendation = '';
        if (hLevel === 0) {
            clinicalRecommendation = 'Haggitt Düzey 0 (Tis): Endoskopik polipektomi tamamen küratiftir; ek cerrahi gerekmez.';
        } else if (!requiresOncologicResection) {
            clinicalRecommendation = `Haggitt Düzey ${hLevel} (Düşük Riskli Saplı pT1 Polip): Rezeksiyon sınırı temiz (>1–2 mm) ve kötü histolojik özellik (LVI, G3, yüksek budding) bulunmadığından yalnız Endoskopik Polipektomi ve kolon-rektum takip protokolü yeterlidir.`;
        } else {
            clinicalRecommendation = `🚨 Tamamlayıcı Onkolojik Cerrahi Endikasyonu (Haggitt Düzey ${hLevel}${hasAdverseHistology ? ' + Yüksek Riskli Histoloji' : ''}): Bölgesel lenf nodu metastazı riski yüksek (%10–27) olduğundan Onkolojik Segmenter Kolektomi / TME + Bölgesel Lenfadenektomi önerilir.`;
        }

        return {
            morphology: 'pedunculated',
            primaryClassificationTitle: hMeta[hLevel].title,
            tnmEquivalent,
            haggittLevel: hLevel,
            kikuchiLevel: null,
            micrometricCategory,
            estimatedLnmRiskPercent: hMeta[hLevel].lnm,
            highRiskHistologyFlags,
            requiresOncologicResection,
            alertClass,
            clinicalRecommendation,
            sm2AndMicrometricComparison: {
                esgeGuidelineDecision: 'Saplı (pedünküllü) poliplerde ESGE/ASGE standardı Haggitt Düzey 1–3 vs Düzey 4 (veya sapta derin invazyon) ayrımıdır.',
                individualizedNascimbeniDecision: 'Saplı polipte sap kesim sınırına mesafe >1–2 mm ve LVI(-)/G1-2/Budding(-) ise LNM riski <%1\'dir.',
                muscularisPropriaNote: 'Endoskopik polipektomide kesim sap boyunca yapıldığından spesimende bağırsak duvarı muskularis propriyası yer almaz; sap rezeksiyon sınırına mesafe (>1–2 mm) vekil kriterdir.'
            }
        };
    }

    // Sesil / Düz (Flat) pT1 Polip — Kikuchi (sm1, sm2, sm3) & Mikrometrik (<1000 µm) Değerlendirmesi
    let kLevel: KikuchiLevel = params.kikuchiLevel || 'sm1';
    if (!params.kikuchiLevel && depthUm !== null && depthUm !== undefined && Number.isFinite(depthUm)) {
        kLevel = depthUm < 1000 ? 'sm1' : 'sm2';
    }

    const kMeta: Record<KikuchiLevel, { title: string; lnm: string }> = {
        'sm1': {
            title: `Kikuchi sm1 — Yüzeyel Submukoza (Üst 1/3 / <1000 µm${params.sm1HorizontalSubtype ? `, Alt Tip: ${params.sm1HorizontalSubtype}` : ''})`,
            lnm: '%0 – %3.4 (Kikuchi 1995: %0; Nascimbeni 2002: %2–3)'
        },
        'sm2': {
            title: 'Kikuchi sm2 — Orta Submukoza (Orta 1/3 — Gri / Yüksek Riskli Alan)',
            lnm: '%5 – %10 (Nascimbeni 2002: %8; Meta-analizler: %8–8.5)'
        },
        'sm3': {
            title: 'Kikuchi sm3 — Derin Submukoza (Alt 1/3 — Muskularis Propriya İç Sınırına Yakın)',
            lnm: '%14.4 – %25 (Nascimbeni 2002: %23 — Bağımsız LNM prediktörü, p=0.001)'
        }
    };

    const isSm1cMassive = kLevel === 'sm1' && params.sm1HorizontalSubtype === 'sm1c';
    const esgeRequiresSurgery = kLevel === 'sm3' || kLevel === 'sm2' || isDeepMicrometric || isSm1cMassive || hasAdverseHistology;
    const individualizedRequiresSurgery = kLevel === 'sm3' || hasAdverseHistology || Boolean(params.isLowerThirdRectum && kLevel === 'sm2');

    const requiresOncologicResection = sm2Mode === 'esge_high_risk' ? esgeRequiresSurgery : individualizedRequiresSurgery;
    const alertClass: 'success' | 'warning' | 'danger' =
        kLevel === 'sm3' || hasAdverseHistology ? 'danger' : (kLevel === 'sm2' || isDeepMicrometric || params.isLowerThirdRectum) ? 'warning' : 'success';

    let clinicalRecommendation = '';
    if (!requiresOncologicResection) {
        clinicalRecommendation = `${kMeta[kLevel].title} (Düşük Riskli Sesil pT1): En-blok R0 rezeksiyon, LVI(-), G1/G2 ve düşük budding varlığında Endoskopik Rezeksiyon (EMR/ESD) veya Transanal Lokal Eksizyon (TEM/TAMIS) yeterlidir; radikal cerrahi gerekmez.`;
    } else if (kLevel === 'sm2' && !hasAdverseHistology) {
        clinicalRecommendation = `⚠️ Kikuchi sm2 (LNM Riski ~%8–10): Güncel ESGE/ESMO kılavuzlarında (≥1000 µm derin invazyon kapsamında) Onkolojik Radikal Rezeksiyon önerilir; ancak hastanın cerrahi riski/komorbiditesi yüksekse ve LVI(-), G1/2, budding(-) ise bireyselleştirilmiş yakın takip tartışılabilir.`;
    } else {
        clinicalRecommendation = `🚨 Yüksek Riskli Sesil pT1 (${kMeta[kLevel].title}${hasAdverseHistology ? ' + Olumsuz Histoloji' : ''}): Bölgesel lenf nodu metastazı riski yüksek (%14–25) olduğundan Onkolojik Radikal Kolektomi veya Total Mezorektal Eksizyon (TME) + Bölgesel Lenfadenektomi standarttır.`;
    }

    const muscularisPropriaNote = hasMp
        ? 'Spesimende Muskularis Propriya Mevcut (örn. TEM/TAMIS veya tam kat spesimen): Submukoza tam olarak 3 eşit katmana (sm1, sm2, sm3) bölünebilir.'
        : '⚠️ MUSKULARİS PROPRİYA YOK (Endoskopik Polipektomi / EMR — NICE NG151 Bulgusu: %88.1): Spesimen tabanında muskularis propriya görülmediğinde submukozayı 3 eşit parçaya (sm1–sm3) bölmek teknik olarak mümkün değildir! Bu durumda Kikuchi yerine muskularis mukozadan itibaren mutlak mikrometrik derinlik (<1000 µm [%0–4 LNM] vs ≥1000 µm [%10–18 LNM]) esas alınmalıdır.';

    return {
        morphology: 'sessile_flat',
        primaryClassificationTitle: `${kMeta[kLevel].title} (Haggitt Karşılığı: Sesil polipler tanım gereği Haggitt Düzey 4 sayılır)`,
        tnmEquivalent: 'pT1',
        haggittLevel: 4,
        kikuchiLevel: kLevel,
        micrometricCategory,
        estimatedLnmRiskPercent: kMeta[kLevel].lnm,
        highRiskHistologyFlags,
        requiresOncologicResection,
        alertClass,
        clinicalRecommendation,
        sm2AndMicrometricComparison: {
            esgeGuidelineDecision: esgeRequiresSurgery
                ? 'ESGE / ESMO Güncel Standart (sm2 / ≥1000 µm = Yüksek Risk): Tamamlayıcı onkolojik radikal rezeksiyon önerilir.'
                : 'ESGE / ESMO Güncel Standart (sm1 / <1000 µm & Düşük Risk Histoloji): Yalnız endoskopik rezeksiyon ve takip yeterlidir.',
            individualizedNascimbeniDecision: individualizedRequiresSurgery
                ? 'Nascimbeni 2002 / Bireyselleştirilmiş Model: sm3, LVI+ veya alt 1/3 rektum risk faktörü nedeniyle onkolojik rezeksiyon önerilir.'
                : 'Nascimbeni 2002 / Bireyselleştirilmiş Model (Yalnız sm3 bağımsız prediktör, p=0.001): LVI(-), G1/2, budding(-) ve üst/orta kolorektal sm2 lezyonda yüksek komorbiditeli hastada yakın izlem seçeneği değerlendirilebilir.',
            muscularisPropriaNote
        }
    };
}
