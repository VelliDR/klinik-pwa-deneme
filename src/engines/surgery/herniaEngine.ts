// ============================================================================
// KARIN DUVARI VE KASIK FITIKLARI MOTORU (EHS 2007, EHS 2009, Nyhus, HerniaSurge 2023)
// 1. EHS Kasık Fıtığı Sınıflandırması (2007) & Nyhus Sınıflandırması (1991/1993) Yan Yana
// 2. EHS Primer ve İnsizyonel Karın Duvarı Fıtıkları Sınıflandırması (Muysoms 2009)
// ============================================================================

export type EHSDefectSize = 0 | 1 | 2 | 3 | 'x';
export type NyhusType = 'I' | 'II' | 'IIIA' | 'IIIB' | 'IIIC' | 'IVA' | 'IVB' | 'IVC' | 'IVD';

export interface GroinHerniaParams {
    isRecurrent?: boolean; // P (false) vs R (true)
    lateralSize?: EHSDefectSize; // L0, L1 (<1.5cm), L2 (1.5-3cm), L3 (>3cm), Lx
    medialSize?: EHSDefectSize;  // M0, M1, M2, M3, Mx
    femoralSize?: EHSDefectSize; // F0, F1, F2, F3, Fx
    // Nyhus Tip II vs Tip IIIB ayrımı için arka duvar / skrotal / sliding durumu
    isPosteriorWallDefectiveOrScrotalOrSliding?: boolean;
    isBilateral?: boolean;
    isFemale?: boolean;
    isPediatricOrInfant?: boolean;
    nyhusDirectOverride?: NyhusType | null;
}

export interface GroinHerniaResult {
    ehsCode: string; // Örn: "P L2" veya "P L2 M1" veya "R F1"
    ehsComponents: string[];
    isCombinedHernia: boolean;
    nyhusType: NyhusType;
    nyhusTitle: string;
    nyhusPathophysiology: string;
    alertClass: 'info' | 'warning' | 'danger';
    herniaSurge2023Recommendation: string;
    ehsVsNyhusComparison: string;
}

const NYHUS_CATALOG: Record<NyhusType, { title: string; patho: string; repair: string }> = {
    'I': {
        title: 'Nyhus Tip I (İndirekt İnguinal — Normal İç Halka)',
        patho: 'İç inguinal halka normal boyut (<1.5 cm) ve yapıdadır; fascia transversalis (posterior duvar) tamamen sağlamdır ve kese inguinal kanal içindedir.',
        repair: 'Pediatrik/genç olgularda fıtık kesesinin yüksek ligasyonu; erişkinlerde HerniaSurge kılavuzuna göre yama (mesh) destekli onarım.'
    },
    'II': {
        title: 'Nyhus Tip II (İndirekt İnguinal — Genişlemiş İç Halka, Sağlam Arka Duvar)',
        patho: 'İç inguinal halka genişlemiş (1.5–3 cm) ve distorsiyone olmuştur, ancak posterior inguinal duvar sağlamdır ve kese skrotuma inmemiştir.',
        repair: 'Erişkinlerde yama (mesh) ile açık (Lichtenstein) veya laparoskopik preperitoneal (TEP/TAPP) onarım.'
    },
    'IIIA': {
        title: 'Nyhus Tip IIIA (Direkt İnguinal Fıtık — Posterior Duvar Defekti)',
        patho: 'Boyutundan bağımsız olarak tüm direkt inguinal fıtıklar; herniasyon Hesselbach üçgenindeki zayıflamış fascia transversalis üzerinden gerçekleşir.',
        repair: 'Posterior duvarın prostetik yama (mesh) ile güçlendirilmesi (Açık Lichtenstein veya laparoskopik TEP/TAPP).'
    },
    'IIIB': {
        title: 'Nyhus Tip IIIB (Posterior Duvar Yıkımlı İndirekt / Skrotal / Sliding / Pantalon Fıtık)',
        patho: 'İleri derecede genişlemiş (>3 cm) iç halka posterior inguinal duvarı da yıkmıştır; büyük inguinoskrotal fıtıklar, sliding fıtıklar ve direkt+indirekt kombine ("pantalon") fıtıklar bu gruba dahildir.',
        repair: 'Prostetik yama ile geniş posterior duvar rekonstrüksiyonu (TEP/TAPP, açık preperitoneal Nyhus-Stoppa veya Lichtenstein).'
    },
    'IIIC': {
        title: 'Nyhus Tip IIIC (Femoral Fıtık)',
        patho: 'Posterior duvar defektinin özel bir formu olarak femoral halkadan herniasyon (inkarserasyon/strangülasyon riski en yüksek kasık fıtığı tipidir).',
        repair: 'HerniaSurge 2023 Güçlü Öneri: Tüm miyopektineal orifisi örten Laparoskopik Preperitoneal (TEP/TAPP) yama onarımı ilk tercihtir (Lichtenstein femoral halkayı örtmez!).'
    },
    'IVA': {
        title: 'Nyhus Tip IVA (Nüks Direkt İnguinal Fıtık)',
        patho: 'Daha önce onarılmış kasık fıtığının medial (direkt) defekt olarak nüksü.',
        repair: 'Önceki ameliyat açık anterior yapıldıysa laparoskopik posterior (TEP/TAPP); önceki ameliyat laparoskopik yapıldıysa açık anterior (Lichtenstein) yaklaşım.'
    },
    'IVB': {
        title: 'Nyhus Tip IVB (Nüks İndirekt İnguinal Fıtık)',
        patho: 'Daha önce onarılmış kasık fıtığının lateral (indirekt) defekt olarak nüksü.',
        repair: 'Önceki cerrahi yaklaşımdan farklı anatomik plandan (açık sonrası TEP/TAPP; TEP/TAPP sonrası Lichtenstein) yama onarımı.'
    },
    'IVC': {
        title: 'Nyhus Tip IVC (Nüks Femoral Fıtık)',
        patho: 'Femoral kanalda nüks veya önceki açık inguinal onarım sonrası gözden kaçmış femoral fıtık.',
        repair: 'Laparoskopik preperitoneal (TEP/TAPP) veya açık preperitoneal yama onarımı.'
    },
    'IVD': {
        title: 'Nyhus Tip IVD (Nüks Kombine / Mikst Kasık Fıtığı)',
        patho: 'Direkt, indirekt ve/veya femoral komponentlerin birlikte bulunduğu kompleks nüks kasık fıtığı.',
        repair: 'Deneyimli fıtık cerrahı tarafından tüm miyopektineal orifisi kapsayan preperitoneal (TEP/TAPP / Stoppa) veya açık yama onarımı.'
    }
};

function hasActiveSize(s: EHSDefectSize | undefined): boolean {
    return s === 1 || s === 2 || s === 3 || s === 'x';
}

export function classifyGroinHernia(params: GroinHerniaParams | null | undefined): GroinHerniaResult | null {
    if (!params) return null;

    const l = params.lateralSize ?? 0;
    const m = params.medialSize ?? 0;
    const f = params.femoralSize ?? 0;

    const hasL = hasActiveSize(l);
    const hasM = hasActiveSize(m);
    const hasF = hasActiveSize(f);

    if (!hasL && !hasM && !hasF && !params.nyhusDirectOverride) return null;

    const prefix = params.isRecurrent ? 'R' : 'P';
    const ehsComponents: string[] = [];
    if (hasL) ehsComponents.push(`L${l}`);
    if (hasM) ehsComponents.push(`M${m}`);
    if (hasF) ehsComponents.push(`F${f}`);

    const ehsCode = ehsComponents.length > 0 ? `${prefix} ${ehsComponents.join(' ')}` : `${prefix} (Nyhus ${params.nyhusDirectOverride})`;
    const activeCount = (hasL ? 1 : 0) + (hasM ? 1 : 0) + (hasF ? 1 : 0);
    const isCombinedHernia = activeCount > 1;

    // Nyhus Tipini Türet (veya doğrudan seçileni kullan)
    let nyhusType: NyhusType = 'II';
    if (params.nyhusDirectOverride) {
        nyhusType = params.nyhusDirectOverride;
    } else if (params.isRecurrent) {
        if (isCombinedHernia) nyhusType = 'IVD';
        else if (hasF) nyhusType = 'IVC';
        else if (hasL) nyhusType = 'IVB';
        else nyhusType = 'IVA';
    } else {
        if (hasF && !hasL && !hasM) {
            nyhusType = 'IIIC';
        } else if (isCombinedHernia || (hasL && (l === 3 || params.isPosteriorWallDefectiveOrScrotalOrSliding))) {
            nyhusType = 'IIIB';
        } else if (hasM && !hasL) {
            nyhusType = 'IIIA';
        } else if (hasL && l === 1 && !params.isPosteriorWallDefectiveOrScrotalOrSliding) {
            nyhusType = 'I';
        } else {
            nyhusType = 'II';
        }
    }

    const nyhusMeta = NYHUS_CATALOG[nyhusType];

    // HerniaSurge 2023 Özel Önerisi
    let herniaSurge2023Recommendation = nyhusMeta.repair;
    if (params.isPediatricOrInfant && nyhusType === 'I') {
        herniaSurge2023Recommendation = 'Pediatrik İndirekt Fıtık (Nyhus Tip I / EHS L1): Yama (mesh) kullanılmaksızın fıtık kesesinin yüksek ligasyonu standarttır.';
    } else if (params.isFemale || hasF || params.isBilateral) {
        herniaSurge2023Recommendation = 'HerniaSurge 2023 Güncellemesi: Kadın hastalarda (gözden kaçan femoral fıtık riskini önlemek için), femoral fıtıklarda (F1–F3) ve bilateral kasık fıtıklarında Laparoskopik/Endoskopik Preperitoneal Onarım (TEP/TAPP) 1. basamak standarttır.';
    } else if (params.isRecurrent) {
        herniaSurge2023Recommendation = 'HerniaSurge 2023 Nüks Fıtık Kuralı: İlk ameliyat açık anterior (Lichtenstein) yapıldıysa laparoskopik posterior (TEP/TAPP); ilk ameliyat laparoskopik (TEP/TAPP) yapıldıysa açık anterior (Lichtenstein) onarım önerilir.';
    }

    const ehsVsNyhusComparison = `EHS 2007 Kodu: [${ehsCode}] vs Nyhus: [Tip ${nyhusType}]. Karşılaştırma: EHS sistemi defekt çapını santimetrik eşiklerle (<1.5 / 1.5–3 / >3 cm; açıkta parmak ucu, laparoskopide grasper çenesi ~1.5 cm) ve kombine komponentleri ayrı ayrı kodlarken; Nyhus direkt fıtıklarda (Tip IIIA) boyutu ayırmaz ancak büyük indirekt/pantalon fıtıkların arka duvarı yıktığını (Tip IIIB) patofizyolojik olarak vurgular.`;

    return {
        ehsCode,
        ehsComponents,
        isCombinedHernia,
        nyhusType,
        nyhusTitle: nyhusMeta.title,
        nyhusPathophysiology: nyhusMeta.patho,
        alertClass: hasF || params.isRecurrent || l === 3 || m === 3 ? 'warning' : 'info',
        herniaSurge2023Recommendation,
        ehsVsNyhusComparison
    };
}

// ============================================================================
// 2. EHS PRİMER VE İNSİZYONEL KARIN DUVARI FITIKLARI (Muysoms et al., 2009)
// ============================================================================

export type VentralHerniaCategory = 'primary' | 'incisional';
export type PrimaryVentralLocation = 'epigastric' | 'umbilical' | 'spigelian' | 'lumbar';
export type IncisionalMedialZone = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
export type IncisionalLateralZone = 'L1' | 'L2' | 'L3' | 'L4';
export type EHSWidthCategory = 'W1' | 'W2' | 'W3';
export type EHSW3CutoffMode = 'gte_10cm' | 'gt_10cm';

export interface VentralHerniaParams {
    category?: VentralHerniaCategory;
    // 1. Primer Fıtık Parametreleri
    primaryLocation?: PrimaryVentralLocation;
    diameterCm?: number | null;
    primarySizeDirect?: 'small_lt2' | 'medium_2_4' | 'large_gt4';

    // 2. İnsizyonel Fıtık Parametreleri
    medialZones?: IncisionalMedialZone[];
    lateralZones?: IncisionalLateralZone[];
    widthCm?: number | null;
    lengthCm?: number | null;
    widthCategoryDirect?: EHSWidthCategory;
    w3CutoffMode?: EHSW3CutoffMode; // 'gte_10cm' (Muysoms 2009: W3 >=10 cm) vs 'gt_10cm' (W2: 4-10, W3: >10 cm)
    isRecurrentIncisional?: boolean;
    ihvPvPercent?: number | null; // İnsizyonel fıtık hacmi / periton hacmi oranı (>%20 Loss of Domain)
}

export interface VentralHerniaResult {
    category: VentralHerniaCategory;
    ehsCode: string;
    locationDescription: string;
    sizeOrWidthCategory: string;
    isLossOfDomain: boolean;
    alertClass: 'success' | 'warning' | 'danger';
    surgicalStrategy: string;
    w3BoundaryComparison?: {
        widthCm: number;
        muysomsOriginal: 'W2 (≥4–<10 cm)' | 'W3 (≥10 cm)';
        clinicalVariant: 'W2 (4–10 cm)' | 'W3 (>10 cm)';
        isBoundary10cm: boolean;
    };
    lossOfDomainWarning?: string;
}

const MEDIAL_ZONE_LABELS: Record<IncisionalMedialZone, string> = {
    'M1': 'M1 — Subksifoidal (Ksifoidden kaudale 3 cm)',
    'M2': 'M2 — Epigastrik (Ksifoid 3 cm altından umblikus 3 cm üstüne)',
    'M3': 'M3 — Umblikal (Umblikusun 3 cm üstü ile 3 cm altı arası)',
    'M4': 'M4 — İnfraumblikal (Umblikus 3 cm altından pubis 3 cm üstüne)',
    'M5': 'M5 — Suprapubik (Pubisten kraniale 3 cm)'
};

const LATERAL_ZONE_LABELS: Record<IncisionalLateralZone, string> = {
    'L1': 'L1 — Subkostal (Kosta arkı ile umblikus 3 cm üstü arası)',
    'L2': 'L2 — Flank / Yan (Rektus kılıfı lateralinde umblikus ±3 cm şeridi)',
    'L3': 'L3 — İliak (Umblikus 3 cm altı ile inguinal bölge arası)',
    'L4': 'L4 — Lomber (Ön aksiller hattın latero-dorsali)'
};

export function classifyVentralHernia(params: VentralHerniaParams | null | undefined): VentralHerniaResult | null {
    if (!params) return null;

    const category: VentralHerniaCategory = params.category || 'primary';
    const isLossOfDomain = params.ihvPvPercent !== null && params.ihvPvPercent !== undefined && params.ihvPvPercent > 20;
    const lossOfDomainWarning = isLossOfDomain
        ? `🚨 LOSS OF DOMAIN (IHV/PV Oranı: %${params.ihvPvPercent} > %20): İnsizyonel fıtık hacmi / periton hacmi oranı >%20 olduğunda olguların >%80'inde standart gerilimsiz fasiyal kapama sağlanamaz ve abdominal kompartman sendromu riski doğar! Preoperatif progresif pnömoperitoneum / botulinum toksini (BTA) ve Komponent Ayrıştırma (TAR) planlanmalıdır.`
        : undefined;

    if (category === 'primary') {
        const loc: PrimaryVentralLocation = params.primaryLocation || 'umbilical';
        const locMap: Record<PrimaryVentralLocation, string> = {
            'epigastric': 'Orta Hat — Epigastrik Primer Fıtık',
            'umbilical': 'Orta Hat — Umblikal Primer Fıtık',
            'spigelian': 'Lateral — Spigelian Primer Fıtık',
            'lumbar': 'Lateral — Lomber Primer Fıtık'
        };

        let sizeTier: 'small_lt2' | 'medium_2_4' | 'large_gt4' = params.primarySizeDirect || 'small_lt2';
        if (params.diameterCm !== null && params.diameterCm !== undefined && Number.isFinite(params.diameterCm) && params.diameterCm > 0) {
            if (params.diameterCm < 2) sizeTier = 'small_lt2';
            else if (params.diameterCm <= 4) sizeTier = 'medium_2_4';
            else sizeTier = 'large_gt4';
        }

        const sizeLabel = sizeTier === 'small_lt2'
            ? 'Küçük (<2 cm)'
            : sizeTier === 'medium_2_4'
                ? 'Orta (≥2–4 cm)'
                : 'Büyük (>4 cm)';
        const alertClass = sizeTier === 'large_gt4' || isLossOfDomain ? 'danger' : sizeTier === 'medium_2_4' ? 'warning' : 'success';
        const surgicalStrategy = sizeTier === 'small_lt2'
            ? 'EHS / IEG Kılavuzu (<2 cm Primer Fıtık): >1 cm tüm umblikal/epigastrik fıtıklarda yama (mesh) ile onarım sütür onarımına göre nüksü anlamlı azaltır (<1 cm defektlerde seçilmiş olguda sütür uygulanabilir).'
            : sizeTier === 'medium_2_4'
                ? 'EHS Kılavuzu (2–4 cm Orta Primer Fıtık): Yama (mesh) ile onarım zorunludur (Açık preperitoneal / retro-rektus sublay veya laparoskopik eTEP / IPOM-Plus fasiyal defekt kapatılarak).'
                : 'EHS Kılavuzu (>4 cm Büyük Primer Fıtık): İnsizyonel W2/W3 fıtıklar gibi yönetilir; retro-rektus (Rives-Stoppa) yama onarımı ve gerekirse komponent ayrıştırma uygulanır.';

        return {
            category: 'primary',
            ehsCode: `EHS Primer — ${locMap[loc]} — ${sizeLabel}`,
            locationDescription: locMap[loc],
            sizeOrWidthCategory: sizeLabel,
            isLossOfDomain,
            alertClass,
            surgicalStrategy,
            lossOfDomainWarning
        };
    }

    // İnsizyonel Fıtık Sınıflandırması
    const mZones = params.medialZones && params.medialZones.length > 0 ? params.medialZones : (params.lateralZones && params.lateralZones.length > 0 ? [] : ['M3' as IncisionalMedialZone]);
    const lZones = params.lateralZones || [];
    const cutoffMode: EHSW3CutoffMode = params.w3CutoffMode || 'gte_10cm';

    let wCat: EHSWidthCategory = params.widthCategoryDirect || 'W1';
    let w3BoundaryComparison: VentralHerniaResult['w3BoundaryComparison'] = undefined;

    if (params.widthCm !== null && params.widthCm !== undefined && Number.isFinite(params.widthCm) && params.widthCm > 0) {
        const w = params.widthCm;
        if (w < 4) {
            wCat = 'W1';
        } else if (w === 10) {
            wCat = cutoffMode === 'gte_10cm' ? 'W3' : 'W2';
            w3BoundaryComparison = {
                widthCm: 10,
                muysomsOriginal: 'W3 (≥10 cm)',
                clinicalVariant: 'W2 (4–10 cm)',
                isBoundary10cm: true
            };
        } else if (w < 10) {
            wCat = 'W2';
            w3BoundaryComparison = {
                widthCm: w,
                muysomsOriginal: 'W2 (≥4–<10 cm)',
                clinicalVariant: 'W2 (4–10 cm)',
                isBoundary10cm: false
            };
        } else {
            wCat = 'W3';
            w3BoundaryComparison = {
                widthCm: w,
                muysomsOriginal: 'W3 (≥10 cm)',
                clinicalVariant: 'W3 (>10 cm)',
                isBoundary10cm: false
            };
        }
    }

    const rCode = params.isRecurrentIncisional ? 'R1 (Nüks+)' : 'R0 (Primer İnsizyonel)';
    const zoneCodes = [...mZones, ...lZones].join('+');
    const lenStr = params.lengthCm ? ` (Uzunluk: ${params.lengthCm} cm)` : '';
    const ehsCode = `${zoneCodes} ${wCat} ${params.isRecurrentIncisional ? 'R1' : 'R0'}${lenStr}`;

    const zoneDescriptions = [
        ...mZones.map(z => MEDIAL_ZONE_LABELS[z]),
        ...lZones.map(z => LATERAL_ZONE_LABELS[z])
    ].join(' | ');

    const wLabel = wCat === 'W1'
        ? 'W1 — Küçük Genişlik (<4 cm)'
        : wCat === 'W2'
            ? 'W2 — Orta Genişlik (4–10 cm)'
            : 'W3 — Büyük / Kompleks Genişlik (≥10 cm)';

    let surgicalStrategy = '';
    let alertClass: 'success' | 'warning' | 'danger' = 'success';

    if (wCat === 'W1') {
        alertClass = params.isRecurrentIncisional ? 'warning' : 'success';
        surgicalStrategy = 'W1 (<4 cm) İnsizyonel Fıtık: Primer fasiyal kapama + yama (retro-rektus sublay veya fasiyal kapamalı laparoskopik IPOM-Plus / eTEP).';
    } else if (wCat === 'W2') {
        alertClass = 'warning';
        surgicalStrategy = 'W2 (4–10 cm) İnsizyonel Fıtık: Açık retro-rektus sublay (Rives-Stoppa) veya laparoskopik/robotik retromusküler (eTEP) yama onarımı tercih edilir.';
    } else {
        alertClass = 'danger';
        surgicalStrategy = '🚨 W3 (≥10 cm) Kompleks Karın Duvarı Defekti: Gerilimsiz orta hat fasiyal kapanma sağlamak için Komponent Ayrıştırma (Posterior Komponent Ayrıştırma / Transversus Abdominis Release [TAR]) + geniş retromusküler yama ile kompleks karın duvarı rekonstrüksiyonu standarttır.';
    }

    if (mZones.includes('M1') || mZones.includes('M5') || lZones.length > 0) {
        surgicalStrategy += ' ⚠️ Kemik Sınır / Lateral Zon Uyarısı: M1 (subksifoidal), M5 (suprapubik) ve L1–L4 (lateral) fıtıklarda kemik yapılara yakınlık nedeniyle yeterli yama örtüşmesi (≥5 cm overlap) ve tespit için retromusküler/preperitoneal diseksiyon (Cooper ligamanı veya diyafragmatik/retroksifoidal alan) gerekir.';
    }

    return {
        category: 'incisional',
        ehsCode,
        locationDescription: zoneDescriptions,
        sizeOrWidthCategory: `${wLabel} — ${rCode}`,
        isLossOfDomain,
        alertClass: isLossOfDomain ? 'danger' : alertClass,
        surgicalStrategy,
        w3BoundaryComparison,
        lossOfDomainWarning
    };
}
