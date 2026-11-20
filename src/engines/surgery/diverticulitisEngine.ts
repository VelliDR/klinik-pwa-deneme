// ============================================================================
// AKUT KOLONİK DİVERTİKÜLİT MOTORU (WSES 2020, ASCRS & Kaiser / Ambrosetti)
// 1. Kaiser BT-Modifiye Hinchey Sınıflandırması (1978 / 2005)
// 2. WSES Akut Sol Kolon Divertiküliti BT Sınıflandırması (2015 / 2020)
// 3. Ambrosetti BT Sınıflandırması (1997 / 2002)
// 4. Ortak BT Bulgularından 3'lü Sistem Karşılaştırma Sentezleyicisi
// ============================================================================

export type KaiserHincheyStage = '0' | 'Ia' | 'Ib' | 'II' | 'III' | 'IV';
export type WSESDiverticulitisStage = '0' | '1a' | '1b' | '2a' | '2b' | '3' | '4';
export type AmbrosettiSeverity = 'moderate' | 'severe';

export interface DiverticulitisParams {
    // Doğrudan evre seçimi VEYA yapılandırılmış BT bulguları
    kaiserStageDirect?: KaiserHincheyStage | null;
    wsesStageDirect?: WSESDiverticulitisStage | null;
    ambrosettiDirect?: AmbrosettiSeverity | null;

    // Yapılandırılmış BT ve Klinik Bulgular (3 sistemi aynı anda türetir)
    wallThickeningAndFatStranding?: boolean; // Kolon duvar kalınlaşması (≥5 mm) + perikolik yağ kirlenmesi
    pericolicAirBubblesLe5cm?: boolean;      // İnflame segmente ≤5 cm mesafede perikolik hava kabarcığı / az sıvı
    abscessPresent?: boolean;
    abscessDiameterCm?: number | null;       // ≤4 cm vs >4 cm
    abscessSizeCategory?: 'none' | 'le_4cm' | 'gt_4cm';
    abscessLocation?: 'pericolic_mesocolic' | 'pelvic_distant_retroperitoneal';
    distantFreeAirGt5cm?: boolean;           // İnflame segmentten >5 cm uzaklıkta ekstralüminal serbest hava
    diffusePeritonealFluid?: boolean;        // Yaygın peritoneal serbest sıvı / generalize peritonit
    extraluminalContrastLeak?: boolean;      // Ekstralüminal kontrast madde ekstravazasyonu
    fecalPeritonitisIntraop?: boolean;       // İntraoperatif serbest fekal kontaminasyon (Hinchey IV)

    // Hasta Risk & Hemodinamik Faktörleri
    isImmunocompromisedOrSeptic?: boolean;
    isHemodynamicallyUnstable?: boolean;
}

export interface KaiserHincheyResult {
    stage: KaiserHincheyStage;
    stageTitle: string;
    originalHinchey1978Equivalent: string;
    ctAndClinicalDefinition: string;
    alertClass: 'success' | 'info' | 'warning' | 'danger';
    managementRecommendation: string;
    limitationNote?: string;
}

export interface WSESDiverticulitisResult {
    stage: WSESDiverticulitisStage;
    group: 'Komplike Olmayan (Uncomplicated)' | 'Komplike (Complicated)';
    stageTitle: string;
    ctDefinition: string;
    alertClass: 'success' | 'warning' | 'danger';
    managementRecommendation: string;
}

export interface AmbrosettiResult {
    grade: AmbrosettiSeverity;
    gradeTitle: 'Orta Divertikülit (Moderate — Komplike Olmayan)' | 'Şiddetli Divertikülit (Severe — Komplike)';
    ctCriteriaTriggered: string[];
    alertClass: 'success' | 'danger';
    prognosticMeaning: string;
}

export interface DiverticulitisTriadResult {
    kaiserHinchey: KaiserHincheyResult;
    wses: WSESDiverticulitisResult;
    ambrosetti: AmbrosettiResult;
    systemComparisonNote: string;
}

const KAISER_CATALOG: Record<KaiserHincheyStage, {
    title: string;
    orig1978: string;
    def: string;
    alert: KaiserHincheyResult['alertClass'];
    mgmt: string;
}> = {
    '0': {
        title: 'Kaiser Modifiye Hinchey Evre 0 (Hafif Klinik Divertikülit)',
        orig1978: 'Yok (2005 Kaiser Eki)',
        def: 'Klasik klinik bulgular (sol alt kadran ağrısı, ateş, lökositoz); BT\'de divertiküller ± kolon duvar kalınlaşması (belirgin perikolik inflamasyon, apse veya peritonit yok).',
        alert: 'success',
        mgmt: 'Ayaktan konservatif izlem (%93–100 başarı). İmmünkompetan, düşük riskli hastalarda rutin antibiyotik önerilmez (WSES 2020 & ASCRS).'
    },
    'Ia': {
        title: 'Kaiser Modifiye Hinchey Evre Ia (Sınırlı Perikolik İnflamasyon / Flegmon)',
        orig1978: 'Evre I (Kısmen)',
        def: 'BT\'de kolon duvar kalınlaşması ve komşu perikolik yağ/yumuşak dokuda inflamatuvar reaksiyon (fat stranding); apse veya serbest perforasyon yok.',
        alert: 'success',
        mgmt: 'Konservatif tedavi. İmmünkompetan ve sepsis bulgusu olmayan hafif olgularda antibiyotiksiz yakın izlem; komorbidite, immünsüpresyon, yüksek CRP/lökositoz veya perikolik gaz varlığında antibiyotik.'
    },
    'Ib': {
        title: 'Kaiser Modifiye Hinchey Evre Ib (Sınırlı Perikolik veya Mezokolik Apse)',
        orig1978: 'Evre I',
        def: 'BT\'de inflame kolon segmenti komşuluğunda / mezokolonla sınırlı lokalize perikolik apse.',
        alert: 'warning',
        mgmt: 'Hastaneye yatış ve geniş spektrumlu IV antibiyotik (<4 cm apselerde tek başına antibiyotik ~%70 başarılıdır; >4 cm apselerde veya yanıtsızlıkta BT/US eşliğinde perkütan drenaj).'
    },
    'II': {
        title: 'Kaiser Modifiye Hinchey Evre II (Pelvik, Uzak İntraabdominal veya Retroperitoneal Apse)',
        orig1978: 'Evre II',
        def: 'Perikolik apsenin lokal perforasyonu sonucu gelişen pelvik, uzak intraabdominal veya retroperitoneal apse.',
        alert: 'danger',
        mgmt: 'Geniş spektrumlu IV antibiyotik + BT/US eşliğinde Perkütan Kateter Drenajı (%81 başarı; drenaj başarısızlığında cerrahi rezeksiyon). İyileşme sonrası yüksek nüks riski nedeniyle kolonoskopi ve elektif cerrahi değerlendirmesi.'
    },
    'III': {
        title: 'Kaiser Modifiye Hinchey Evre III (Generalize Pürülan Peritonit)',
        orig1978: 'Evre III',
        def: 'Apse rüptürüne bağlı yaygın pürülan peritonit; BT\'de diffüz peritoneal serbest sıvı ve ekstralüminal serbest hava (tarihsel mortalite ~%13).',
        alert: 'danger',
        mgmt: '🚨 ACİL CERRAHİ MÜDAHALE: Acil sıvı resüsitasyonu + IV antibiyotik + Sigmoid Rezeksiyon (hemodinamik olarak stabil, immünkompetan hastada primer anastomoz ± saptırıcı ileostomi; instabil/kritik hastada Hartmann prosedürü).'
    },
    'IV': {
        title: 'Kaiser Modifiye Hinchey Evre IV (Generalize Fekal Peritonit)',
        orig1978: 'Evre IV',
        def: 'Perfore divertikül üzerinden serbest fekal kontaminasyon (BT bulguları Evre III ile aynıdır, kesin ayrım intraoperatif yapılır; tarihsel mortalite ~%43).',
        alert: 'danger',
        mgmt: '🛑 ACİL CERRAHİ EKSPLORASYON: Hartmann prosedürü (veya çok seçilmiş stabil hastalarda rezeksiyon) + agresif yoğun bakım sepsis yönetimi.'
    }
};

const WSES_CATALOG: Record<WSESDiverticulitisStage, {
    group: WSESDiverticulitisResult['group'];
    title: string;
    def: string;
    alert: WSESDiverticulitisResult['alertClass'];
    mgmtStable: string;
    mgmtUnstableOrImmuno: string;
}> = {
    '0': {
        group: 'Komplike Olmayan (Uncomplicated)',
        title: 'WSES Evre 0 (Komplike Olmayan Akut Divertikülit)',
        def: 'Divertiküller, kolon duvarında kalınlaşma ve perikolik yağ dokusunda dansite artışı (enfeksiyon peritona uzanmaz, ekstralüminal hava veya apse yok).',
        alert: 'success',
        mgmtStable: 'WSES 2020: İmmünkompetan ve sepsis bulgusu olmayan hastalarda ANTİBİYOTİKSİZ konservatif tedavi ve ayaktan izlem.',
        mgmtUnstableOrImmuno: 'WSES 2020 (İmmünsüprese / Komorbid / Sepsis Bulgulu Hasta): Geniş spektrumlu antibiyotik tedavisi ve yakın klinik takip.'
    },
    '1a': {
        group: 'Komplike (Complicated)',
        title: 'WSES Evre 1a (Perikolik Hava Kabarcıkları / Az Sıvı ≤5 cm)',
        def: 'Apse olmaksızın perikolik hava kabarcıkları (pericolic air bubbles) veya az miktarda perikolik sıvı (inflame bağırsak segmentinden ≤5 cm mesafe içinde).',
        alert: 'warning',
        mgmtStable: 'WSES 2020: Non-operatif yönetim — Geniş spektrumlu antibiyotik tedavisi ve yakın klinik/laboratuvar gözlem.',
        mgmtUnstableOrImmuno: 'WSES 2020: Hastaneye yatış, IV geniş spektrumlu antibiyotik ve klinik bozulma halinde cerrahi değerlendirme.'
    },
    '1b': {
        group: 'Komplike (Complicated)',
        title: 'WSES Evre 1b (Küçük Apse ≤4 cm)',
        def: 'Çapı ≤4 cm olan perikolik veya mezokolik apse.',
        alert: 'warning',
        mgmtStable: 'WSES 2020: Tek başına geniş spektrumlu IV antibiyotik tedavisi (klinik yanıtsızlıkta perkütan drenaj değerlendirilir).',
        mgmtUnstableOrImmuno: 'WSES 2020: IV geniş spektrumlu antibiyotik; yakın sepsis takibi ve gerekirse drenaj/cerrahi.'
    },
    '2a': {
        group: 'Komplike (Complicated)',
        title: 'WSES Evre 2a (Büyük Apse >4 cm)',
        def: 'Çapı >4 cm olan divertiküler apse.',
        alert: 'danger',
        mgmtStable: 'WSES 2020: BT/US eşliğinde Perkütan Kateter Drenajı + geniş spektrumlu IV antibiyotik (ve kültür-antibiogram).',
        mgmtUnstableOrImmuno: 'WSES 2020: Acil perkütan drenaj + IV antibiyotik; drenaj mümkün değilse veya sepsis kontrol edilemiyorsa cerrahi rezeksiyon.'
    },
    '2b': {
        group: 'Komplike (Complicated)',
        title: 'WSES Evre 2b (Uzak Serbest Hava >5 cm, Diffüz Sıvı Yok)',
        def: 'İnflame bağırsak segmentinden >5 cm uzaklıkta ekstralüminal serbest hava (distant air); diffüz peritoneal serbest sıvı yoktur.',
        alert: 'danger',
        mgmtStable: 'WSES 2020: Çok seçilmiş, peritonit bulgusu olmayan stabil hastalarda yakın yoğun gözlem + IV antibiyotik denenebilir; ancak klinik bozulmada derhal cerrahi rezeksiyon (stabil hastada primer anastomoz).',
        mgmtUnstableOrImmuno: '🚨 WSES 2020 (İnstabil / Peritonit / İmmünsüprese): Acil cerrahi rezeksiyon (Hartmann prosedürü).'
    },
    '3': {
        group: 'Komplike (Complicated)',
        title: 'WSES Evre 3 (Uzak Hava Olmaksızın Diffüz Peritoneal Sıvı)',
        def: 'Uzak serbest hava olmaksızın diffüz peritoneal serbest sıvı (kolonda kalıcı açık delik yok / pürülan peritonit).',
        alert: 'danger',
        mgmtStable: '🚨 WSES 2020 Acil Cerrahi (Hemodinamik Stabil): Sigmoid rezeksiyon ve primer anastomoz (± saptırıcı stoma).',
        mgmtUnstableOrImmuno: '🛑 WSES 2020 Acil Cerrahi (Hemodinamik İnstabil / Kritik): Hartmann rezeksiyonu (veya fizyolojik tükenmişlikte hasar kontrol cerrahisi).'
    },
    '4': {
        group: 'Komplike (Complicated)',
        title: 'WSES Evre 4 (Uzak Serbest Hava ile Birlikte Diffüz Peritoneal Sıvı)',
        def: 'Uzak serbest hava (>5 cm) ile birlikte diffüz peritoneal sıvı (kolonda kalıcı açık perforasyon).',
        alert: 'danger',
        mgmtStable: '🛑 WSES 2020 Acil Cerrahi: Hartmann prosedürü veya seçilmiş stabil/immünkompetan hastalarda rezeksiyon + primer anastomoz (± ileostomi).',
        mgmtUnstableOrImmuno: '🛑 WSES 2020 Acil Cerrahi (Şok / Fekal Peritonit): Hartmann prosedürü veya açık karın ile hasar kontrol cerrahisi.'
    }
};

export function evaluateDiverticulitisTriad(params: DiverticulitisParams | null | undefined): DiverticulitisTriadResult | null {
    if (!params) return null;

    const hasAbscessGt4 = params.abscessSizeCategory === 'gt_4cm'
        || (params.abscessDiameterCm !== null && params.abscessDiameterCm !== undefined && params.abscessDiameterCm > 4);
    const hasAbscessLe4 = params.abscessSizeCategory === 'le_4cm'
        || (params.abscessDiameterCm !== null && params.abscessDiameterCm !== undefined && params.abscessDiameterCm > 0 && params.abscessDiameterCm <= 4)
        || (Boolean(params.abscessPresent) && !hasAbscessGt4);
    const hasAnyAbscess = hasAbscessGt4 || hasAbscessLe4 || Boolean(params.abscessPresent);

    // 1. WSES Evresini Çıkar
    let wsesStage: WSESDiverticulitisStage = params.wsesStageDirect || '0';
    if (!params.wsesStageDirect) {
        if ((params.diffusePeritonealFluid && params.distantFreeAirGt5cm) || params.fecalPeritonitisIntraop) {
            wsesStage = '4';
        } else if (params.diffusePeritonealFluid) {
            wsesStage = '3';
        } else if (params.distantFreeAirGt5cm) {
            wsesStage = '2b';
        } else if (hasAbscessGt4) {
            wsesStage = '2a';
        } else if (hasAbscessLe4) {
            wsesStage = '1b';
        } else if (params.pericolicAirBubblesLe5cm || params.extraluminalContrastLeak) {
            wsesStage = '1a';
        } else {
            wsesStage = '0';
        }
    }

    // 2. Kaiser Modifiye Hinchey Evresini Çıkar
    let kaiserStage: KaiserHincheyStage = params.kaiserStageDirect || 'Ia';
    if (!params.kaiserStageDirect) {
        if (params.fecalPeritonitisIntraop || wsesStage === '4') {
            kaiserStage = params.fecalPeritonitisIntraop ? 'IV' : 'III';
        } else if (params.diffusePeritonealFluid || wsesStage === '3' || wsesStage === '2b') {
            kaiserStage = 'III';
        } else if (hasAnyAbscess || wsesStage === '2a' || wsesStage === '1b') {
            if (params.abscessLocation === 'pelvic_distant_retroperitoneal' || hasAbscessGt4 || wsesStage === '2a') {
                kaiserStage = 'II';
            } else {
                kaiserStage = 'Ib';
            }
        } else if (params.wallThickeningAndFatStranding || params.pericolicAirBubblesLe5cm || wsesStage === '1a') {
            kaiserStage = 'Ia';
        } else {
            kaiserStage = '0';
        }
    }

    // 3. Ambrosetti Derecesini Çıkar
    const ambTriggers: string[] = [];
    if (hasAnyAbscess || kaiserStage === 'Ib' || kaiserStage === 'II' || wsesStage === '1b' || wsesStage === '2a') {
        ambTriggers.push('Apse varlığı');
    }
    if (params.pericolicAirBubblesLe5cm || params.distantFreeAirGt5cm || wsesStage === '1a' || wsesStage === '2b' || wsesStage === '4' || kaiserStage === 'III' || kaiserStage === 'IV') {
        ambTriggers.push('Ekstralüminal hava (serbest gaz)');
    }
    if (params.extraluminalContrastLeak) {
        ambTriggers.push('Ekstralüminal kontrast madde kaçağı');
    }
    if (params.diffusePeritonealFluid || kaiserStage === 'III' || kaiserStage === 'IV') {
        ambTriggers.push('Perforasyon / yaygın peritonit');
    }

    const ambGrade: AmbrosettiSeverity = params.ambrosettiDirect
        ? params.ambrosettiDirect
        : (ambTriggers.length > 0 ? 'severe' : 'moderate');

    const kMeta = KAISER_CATALOG[kaiserStage];
    const wMeta = WSES_CATALOG[wsesStage];
    const isHighRiskPatient = Boolean(params.isHemodynamicallyUnstable || params.isImmunocompromisedOrSeptic);

    let kaiserLimitation: string | undefined = undefined;
    if (wsesStage === '1a' && kaiserStage === 'Ia') {
        kaiserLimitation = 'Sistem Farkı Notu: BT\'de apse olmaksızın izole perikolik hava kabarcığı (≤5 cm) bulunan bu olguyu Kaiser Modifiye Hinchey ayrı bir alt evre olarak tanımlamazken, WSES 2020 sistemi "Evre 1a" olarak sınıflandırıp antibiyotik tedavisi önerir.';
    } else if (kaiserStage === 'III' || kaiserStage === 'IV') {
        kaiserLimitation = 'BT Sınırlılığı Notu: Preoperatif BT, Hinchey Evre III (pürülan peritonit) ile Evre IV (fekal peritonit) ayrımını kesin olarak yapamaz; buna karşılık WSES sınıflaması uzak serbest hava varlığına göre Evre 3 ve Evre 4\'ü radyolojik olarak ayırır.';
    }

    const kaiserHinchey: KaiserHincheyResult = {
        stage: kaiserStage,
        stageTitle: kMeta.title,
        originalHinchey1978Equivalent: kMeta.orig1978,
        ctAndClinicalDefinition: kMeta.def,
        alertClass: kMeta.alert,
        managementRecommendation: kMeta.mgmt,
        limitationNote: kaiserLimitation
    };

    const wses: WSESDiverticulitisResult = {
        stage: wsesStage,
        group: wMeta.group,
        stageTitle: wMeta.title,
        ctDefinition: wMeta.def,
        alertClass: wMeta.alert,
        managementRecommendation: isHighRiskPatient ? wMeta.mgmtUnstableOrImmuno : wMeta.mgmtStable
    };

    const ambrosetti: AmbrosettiResult = {
        grade: ambGrade,
        gradeTitle: ambGrade === 'severe'
            ? 'Şiddetli Divertikülit (Severe — Komplike)'
            : 'Orta Divertikülit (Moderate — Komplike Olmayan)',
        ctCriteriaTriggered: ambTriggers.length > 0 ? ambTriggers : ['Lokalize sigmoid duvar kalınlaşması (≥5 mm) + perikolik yağ kirlenmesi (Apse / gaz / kaçak yok)'],
        alertClass: ambGrade === 'severe' ? 'danger' : 'success',
        prognosticMeaning: ambGrade === 'severe'
            ? 'Ambrosetti Şiddetli (Komplike) Divertikülit: Non-operatif tedavinin başarısızlık riski (özellikle apse veya ≥5 mm ekstralüminal gaz cepleri varlığında; Poletti 2004) ve uzun dönemde ikincil komplikasyon/cerrahi gereksinimi anlamlı olarak yüksektir.'
            : 'Ambrosetti Orta (Komplike Olmayan) Divertikülit: Konservatif tedaviyle yüksek iyileşme oranı; uzun dönem takipte nüks ve sekonder komplikasyon riski düşüktür.'
    };

    const systemComparisonNote = `3'lü Sınıflandırma Özeti: WSES Evre ${wsesStage} (${wses.group}) | Kaiser Modifiye Hinchey Evre ${kaiserStage} | Ambrosetti: ${ambGrade === 'severe' ? 'Şiddetli (Severe)' : 'Orta (Moderate)'}. (Spesifik girişim kararı için 4 cm apse eşiği ve 5 cm serbest hava mesafesini içeren WSES 2020 algoritması önceliklidir).`;

    return {
        kaiserHinchey,
        wses,
        ambrosetti,
        systemComparisonNote
    };
}
