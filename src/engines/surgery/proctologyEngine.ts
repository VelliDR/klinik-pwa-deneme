// ============================================================================
// KOLOPROKTOLOJİ MOTORU: HEMOROİDAL HASTALIK VE PERİANAL FİSTÜL (ESCP 2020, ASCRS 2022/2024)
// Bölüm 6: Goligher (1980/2024), BPRST (Sobrado 2020), PNR-Bleed & HSS (Khan 2020)
// Bölüm 7: Parks (1976), St. James's University Hospital MRG (2000), Garg (2017/2020)
// ============================================================================

export type GoligherGrade = 1 | 2 | 3 | 4;
export type BPRSTStage = 'I' | 'II' | 'III' | 'Asemptomatik';
export type PNRGrade = 1 | 2 | 3 | 4 | 5;

export interface HemorrhoidTriadParams {
    // Ortak veya bireysel girdiler
    goligherDirect?: GoligherGrade | null;
    // BPRST Girdileri
    bBleeding?: 0 | 1;          // B0: Yok, B1: Var
    pProlapseCount?: 0 | 1 | 2; // P0: Yok, P1: 1 pake, P2: >=2 pake
    rReduction?: 0 | 1 | 2;     // R0: Spontan (veya prolapsus yok), R1: Manuel, R2: İrredüktabl
    sSkinTag?: 0 | 1;           // S0: Yok, S1: Semptomatik fibrotik skin tag
    tThrombosis?: 0 | 1;        // T0: Yok, T1: Medikal tedaviye dirençli akut tromboz

    // PNR-Bleed (1-5) Girdileri
    pnrProlapse?: PNRGrade;     // P1: Yok, P2: Spontan, P3: Manuel, P4: İrredüktabl non-iskemik, P5: İrredüktabl iskemik/gangrenöz
    pnrNumberColumns?: PNRGrade;// N1: 1 kolon, N2: 2 kolon, N3: 3 kolon, N4: 4 kolon, N5: Sirkümferensiyal + sekonder
    pnrDentateRelation?: PNRGrade; // R1: Normal yastıkçık, R2: Eksternal, R3: İnternal, R4: İnterno-eksternal, R5: Tromboze eksternal
    pnrBleeding?: PNRGrade;     // B1: Yok, B2: Hafif/ara sıra, B3: Orta/sık, B4: Şiddetli (Hb <10, demir), B5: Çok şiddetli (fışkırır, Hb <7, transfüzyon)
    hemoglobinGdl?: number | null; // Global #input-hb veya yerel Hb senkronizasyonu
}

export interface GoligherResult {
    grade: GoligherGrade;
    gradeTitle: string;
    prolapseDefinition: string;
    escpAscrsManagement: string;
    limitationNote: string;
}

export interface BPRSTResult {
    code: string; // Örn: "B1 P2 R1 S0 T0"
    stage: BPRSTStage;
    stageTitle: string;
    alertClass: 'success' | 'warning' | 'danger';
    therapeuticApproach: string;
}

export interface PNRBleedResult {
    code: string; // Örn: "P3 N2 R4 B4"
    hssScore: number; // 4 - 20 Puan
    minScore: 4;
    maxScore: 20;
    severityBand: 'Normal / Minimal (4–6)' | 'Hafif (7–10)' | 'Orta (11–14)' | 'Şiddetli / Acil Girişim (15–20)';
    isIschemicGangrenous: boolean; // P5
    requiresTransfusionOrIron: boolean; // B4 veya B5
    alertClass: 'success' | 'warning' | 'danger';
    clinicalSummary: string;
}

export interface HemorrhoidTriadResult {
    goligher: GoligherResult;
    bprst: BPRSTResult;
    pnrBleed: PNRBleedResult;
    discordanceAndComparisonNote: string;
}

const GOLIGHER_CATALOG: Record<GoligherGrade, { title: string; def: string; mgmt: string }> = {
    1: {
        title: 'Goligher Derece I (Prolapsus Yok)',
        def: 'Hemoroidal yastıkçıklar anal kanal içine büyümüştür (proktoskopta görülür) ve kanayabilir; ancak ıkınma sırasında anal kanal dışına prolabe olmaz.',
        mgmt: 'ESCP 2020 & ASCRS 2024: 1. Basamak: Diyet lifi, sıvı artırımı ve tuvalet alışkanlığı eğitimi (güçlü öneri). 2. Basamak (dirençli kanamada): Ofis bazlı Lastik Bant Ligasyonu (RBL), skleroterapi veya infrared koagülasyon.'
    },
    2: {
        title: 'Goligher Derece II (Spontan Redükte Olan Prolapsus)',
        def: 'Hemoroidal pakeler defekasyon veya ıkınma sırasında linea dentata altına / dışarı prolabe olur, ancak ıkınma bittiğinde kendiliğinden (spontan) içeri girer.',
        mgmt: 'ESCP 2020 & ASCRS 2024: Konservatif önlemler + 1. tercih Ofis Bazlı Lastik Bant Ligasyonu (RBL — ASCRS güçlü öneri). Tekrarlayan/dirençli olgularda DG-HAL/THD veya stapler hemoroidopeksi.'
    },
    3: {
        title: 'Goligher Derece III (Manuel Redüksiyon Gerektiren Prolapsus)',
        def: 'Hemoroidal pakeler defekasyon/ıkınma sırasında dışarı prolabe olur ve anal kanala geri dönmesi için hastanın parmakla itmesini (manuel redüksiyon) gerektirir.',
        mgmt: 'ESCP 2020 & ASCRS 2024: Seçilmiş olgularda RBL veya non-eksizyonel cerrahi (DG-HAL / THD — daha az ağrı; veya stapler hemoroidopeksi [SH]). Kombine internal-eksternal bileşenli veya ileri olgularda Eksizyonel Hemoroidektomi (Milligan-Morgan / Ferguson).'
    },
    4: {
        title: 'Goligher Derece IV (İrredüktabl / Sürekli Prolabe Hemoroidler)',
        def: 'Sürekli dışarıda olan ve manuel manevralarla dahi anal kanal içine redükte edilemeyen (irredüktabl) prolabe hemoroidler (akut tromboze/inkarsere kriz ve sirkümferensiyal prolapsus dahil).',
        mgmt: 'ESCP 2020 & ASCRS 2024 (Güçlü Öneri): Eksizyonel Hemoroidektomi (Milligan-Morgan açık veya Ferguson kapalı; enerji cihazları ile) en düşük nüks oranını sağladığı için standarttır.'
    }
};

export function evaluateHemorrhoidTriad(params: HemorrhoidTriadParams | null | undefined): HemorrhoidTriadResult | null {
    if (!params) return null;

    // Hemoglobin senkronizasyonu: Hb < 7 ise B5, Hb < 10 ise en az B4
    let pnrB: PNRGrade = params.pnrBleeding ?? (params.bBleeding === 0 ? 1 : 2);
    if (params.hemoglobinGdl !== null && params.hemoglobinGdl !== undefined && Number.isFinite(params.hemoglobinGdl) && params.hemoglobinGdl > 0) {
        if (params.hemoglobinGdl < 7 && pnrB < 5) pnrB = 5;
        else if (params.hemoglobinGdl < 10 && pnrB < 4) pnrB = 4;
    }

    // PNR Prolapsus (P1..P5) ve Goligher (1..4) çapraz türetme
    let pnrP: PNRGrade = params.pnrProlapse ?? 1;
    if (params.pnrProlapse === undefined) {
        if (params.goligherDirect) {
            pnrP = params.goligherDirect as PNRGrade;
        } else if (params.rReduction === 2) {
            pnrP = 4;
        } else if (params.rReduction === 1) {
            pnrP = 3;
        } else if ((params.pProlapseCount ?? 0) >= 1) {
            pnrP = 2;
        } else {
            pnrP = 1;
        }
    }

    const goligherGrade: GoligherGrade = params.goligherDirect
        ? params.goligherDirect
        : (pnrP <= 1 ? 1 : pnrP === 2 ? 2 : pnrP === 3 ? 3 : 4);

    // BPRST Bileşenlerini Türet
    const bVal: 0 | 1 = params.bBleeding !== undefined ? params.bBleeding : (pnrB >= 2 ? 1 : 0);
    const pnrN: PNRGrade = params.pnrNumberColumns ?? (params.pProlapseCount === 2 ? 3 : 1);
    const pVal: 0 | 1 | 2 = params.pProlapseCount !== undefined
        ? params.pProlapseCount
        : (goligherGrade === 1 ? 0 : pnrN >= 2 ? 2 : 1);
    const rVal: 0 | 1 | 2 = params.rReduction !== undefined
        ? params.rReduction
        : (goligherGrade >= 4 ? 2 : goligherGrade === 3 ? 1 : 0);
    const sVal: 0 | 1 = params.sSkinTag ?? 0;
    const pnrR: PNRGrade = params.pnrDentateRelation ?? (params.tThrombosis === 1 ? 5 : sVal === 1 ? 4 : 3);
    const tVal: 0 | 1 = params.tThrombosis !== undefined ? params.tThrombosis : (pnrR === 5 ? 1 : 0);

    // 1. Goligher Sonucu
    const gMeta = GOLIGHER_CATALOG[goligherGrade];
    const goligher: GoligherResult = {
        grade: goligherGrade,
        gradeTitle: gMeta.title,
        prolapseDefinition: gMeta.def,
        escpAscrsManagement: gMeta.mgmt,
        limitationNote: 'Goligher Sınırlılığı: Yalnızca internal hemoroid prolapsusunu derecelendirir; eksternal komponentleri (fibrotik skin tag, tromboz), tutulan pake sayısını ve anemi/kanama şiddetini kapsamaz.'
    };

    // 2. BPRST Evrelemesi (Sobrado 2020)
    const bprstCode = `B${bVal} P${pVal} R${rVal} S${sVal} T${tVal}`;
    let bprstStage: BPRSTStage = 'I';
    let bprstTitle = '';
    let bprstAlert: BPRSTResult['alertClass'] = 'success';
    let bprstTx = '';

    if (rVal === 2 || sVal === 1 || tVal === 1) {
        bprstStage = 'III';
        bprstTitle = `BPRST Evre III (${bprstCode} — R2, S1 veya T1 Varlığı)`;
        bprstAlert = 'danger';
        bprstTx = 'BPRST Evre III: İrredüktabl prolapsus (R2), semptomatik fibrotik skin tag (S1) veya medikal tedaviye dirençli akut tromboz (T1) bulunduğundan Eksizyonel Cerrahi (Milligan-Morgan, Ferguson, Lazer veya eksternal skin tag eksizyonlu kombine işlem) endikedir.';
    } else if (pVal === 1 || pVal === 2 || rVal === 1) {
        bprstStage = 'II';
        bprstTitle = `BPRST Evre II (${bprstCode} — Redüktabl Prolapsus, S0 ve T0)`;
        bprstAlert = 'warning';
        bprstTx = `BPRST Evre II (${pVal === 1 ? 'Tek pake prolapsusu [P1]' : '≥2 pake prolapsusu [P2]'}): Ofis bazlı RBL (özellikle P1'de makro-bant) veya Non-Eksizyonel Cerrahi (THD / DG-HAL, stapler anopeksi [PPH] veya radyofrekans ablasyon — özellikle P2 sirkümferensiyal prolapsusta) önerilir.`;
    } else if (bVal === 1) {
        bprstStage = 'I';
        bprstTitle = `BPRST Evre I (${bprstCode} — Yalnızca Kanama, Prolapsus ve Dış Komponent Yok)`;
        bprstAlert = 'success';
        bprstTx = 'BPRST Evre I: Yaşam tarzı / lif / oturma banyosu + Poliklinik Ofis İşlemleri (Lastik bant ligasyonu [RBL], infrared fotokoagülasyon veya skleroterapi).';
    } else {
        bprstStage = 'Asemptomatik';
        bprstTitle = `BPRST Asemptomatik (${bprstCode})`;
        bprstAlert = 'success';
        bprstTx = 'Aktif kanama, prolapsus veya eksternal komponent yok; koruyucu lifli diyet ve takip.';
    }

    const bprst: BPRSTResult = {
        code: bprstCode,
        stage: bprstStage,
        stageTitle: bprstTitle,
        alertClass: bprstAlert,
        therapeuticApproach: bprstTx
    };

    // 3. PNR-Bleed & HSS (Khan 2020: 4 - 20 Puan)
    const pnrCode = `P${pnrP} N${pnrN} R${pnrR} B${pnrB}`;
    const hssScore = pnrP + pnrN + pnrR + pnrB;
    const isIschemicGangrenous = pnrP === 5;
    const requiresTransfusionOrIron = pnrB >= 4;

    let severityBand: PNRBleedResult['severityBand'] = 'Normal / Minimal (4–6)';
    let pnrAlert: PNRBleedResult['alertClass'] = 'success';
    if (hssScore >= 15 || isIschemicGangrenous || pnrB === 5 || pnrR === 5) {
        severityBand = 'Şiddetli / Acil Girişim (15–20)';
        pnrAlert = 'danger';
    } else if (hssScore >= 11 || pnrB === 4) {
        severityBand = 'Orta (11–14)';
        pnrAlert = 'warning';
    } else if (hssScore >= 7) {
        severityBand = 'Hafif (7–10)';
        pnrAlert = 'success';
    }

    const pnrNotes: string[] = [
        `Hemoroid Şiddet Skoru (HSS): ${hssScore}/20 (${pnrCode} — ${pnrN === 5 ? 'Sirkümferensiyal tutulum' : `${pnrN} primer kolon`}).`
    ];
    if (isIschemicGangrenous) {
        pnrNotes.push('🛑 P5 (İrredüktabl + İskemik/Gangrenöz Prolapsus): Goligher Derece IV içindeki en ağır alt gruptur; acil cerrahi değerlendirme ve sepsis/nekroz kontrolü gerektirir!');
    }
    if (pnrB === 5) {
        pnrNotes.push('🚨 B5 (Çok Şiddetli Kanama — Hb <7 g/dL): Kan transfüzyonu, hemodinamik stabilizasyon ve acil definitif hemostatik girişim endikedir!');
    } else if (pnrB === 4) {
        pnrNotes.push('⚠️ B4 (Şiddetli Kanama — Hb <10 g/dL): Anemi düzeltilmesi (oral/IV demir replasmanı) ve öncelikli girişimsel hemostaz gerektirir.');
    }

    const pnrBleed: PNRBleedResult = {
        code: pnrCode,
        hssScore,
        minScore: 4,
        maxScore: 20,
        severityBand,
        isIschemicGangrenous,
        requiresTransfusionOrIron,
        alertClass: pnrAlert,
        clinicalSummary: pnrNotes.join(' ')
    };

    // 4. Sistemler Arası Uyumsuzluk ve Klinik Karşılaştırma Analizi
    const compNotes: string[] = [];
    if (goligherGrade <= 2 && bprstStage === 'III') {
        compNotes.push(`⚠️ KRİTİK SİSTEM FARKI (Goligher Derece ${goligherGrade} vs BPRST Evre III): İnternal prolapsus düşük dereceli olmasına karşın ${sVal === 1 ? 'semptomatik fibrotik skin tag (S1)' : ''} ${tVal === 1 ? 'medikal tedaviye dirençli akut tromboz (T1)' : ''} nedeniyle yalnız ofis işlemi (RBL) veya THD/PPH yetersiz kalacaktır; BPRST Evre III'e göre anodermal/eksizyonel cerrahi gereklidir!`);
    }
    if (goligherGrade <= 2 && pnrB >= 4) {
        compNotes.push(`⚠️ KANAMA UYUMSUZLUĞU (Goligher Derece ${goligherGrade} vs PNR-Bleed B${pnrB}): Prolapsus derecesi düşük olsa da Hb <${pnrB === 5 ? '7' : '10'} g/dL anemiye yol açan ağır kanama mevcuttur; PNR-Bleed sistemi kanama şiddetini yakalayarak acil hemostaz ve ${pnrB === 5 ? 'transfüzyon' : 'demir tedavisi'} önceliğini belirler.`);
    }
    if (compNotes.length === 0) {
        compNotes.push(`3'lü Sistem Özeti: Goligher Derece ${goligherGrade} | BPRST Evre ${bprstStage} (${bprstCode}) | PNR-Bleed: ${pnrCode} (HSS: ${hssScore}/20).`);
    }

    return {
        goligher,
        bprst,
        pnrBleed,
        discordanceAndComparisonNote: compNotes.join(' ')
    };
}

// ============================================================================
// BÖLÜM 7: PERİANAL FİSTÜL VE APSE MOTORU (Parks 1976, SJUH MRG 2000, Garg 2017/2020)
// ============================================================================

export type ParksFistulaType = 'I' | 'II' | 'III' | 'IV';
export type SJUHMriGrade = 1 | 2 | 3 | 4 | 5;
export type GargFistulaGrade = 'I' | 'II' | 'III' | 'IV' | 'V';
export type SphincterInvolvementLevel = 'intersphincteric_only' | 'low_transsphincteric_le_1_3' | 'high_transsphincteric_gt_1_3' | 'suprasphincteric' | 'extrasphincteric_or_supralevator';

export interface PerianalFistulaTriadParams {
    // Ortak Anatomik ve MRG Bulguları
    sphincterInvolvement?: SphincterInvolvementLevel;
    hasAbscessOrSecondaryTractOrHorseshoe?: boolean;
    abscessInIschiorectalFossa?: boolean; // SJUH Grade 2 (intersfinkterik at nalı/apse) vs Grade 4 (iskiorektal apse/sekonder trakt)
    hasSupralevatorOrTranslevatorExtension?: boolean;

    // Garg (2017/2020) Kontinans Risk & Komorbidite Faktörleri (Herhangi biri -> en az Garg Derece III Kompleks!)
    isAnteriorFistulaInFemale?: boolean;
    hasCrohnsDisease?: boolean;
    hasPreExistingSphincterInjuryOrIncontinence?: boolean;
    hasPostRadiationExposure?: boolean;

    // Doğrudan override seçenekleri
    parksDirect?: ParksFistulaType | null;
    sjuhDirect?: SJUHMriGrade | null;
    gargDirect?: GargFistulaGrade | null;
}

export interface ParksFistulaResult {
    type: ParksFistulaType;
    typeTitle: string;
    anatomicalCourse: string;
    fistulotomySuitabilityRateNote: string;
}

export interface SJUHMriResult {
    grade: SJUHMriGrade;
    gradeTitle: string;
    mriCriteria: string;
    prognosticOutcome: string;
}

export interface GargFistulaResult {
    grade: GargFistulaGrade;
    complexityCategory: 'Basit Fistül (Simple — Garg Derece I–II)' | 'Kompleks Fistül (Complex — Garg Derece III–V)';
    isFistulotomySafe: boolean;
    comorbidityTriggers: string[];
    alertClass: 'success' | 'danger';
    surgicalRule: string;
}

export interface PerianalFistulaTriadResult {
    parks: ParksFistulaResult;
    sjuhMri: SJUHMriResult;
    garg: GargFistulaResult;
    discordanceHighlight: string;
}

const PARKS_CATALOG: Record<ParksFistulaType, { title: string; course: string; rateNote: string }> = {
    'I': {
        title: 'Parks Tip I — İntersfinkterik Fistül (Ia–If)',
        course: 'Fistül traktı internal anal sfinkteri geçerek internal ve eksternal sfinkterler arasındaki intersfinkterik planda aşağı ilerler; eksternal sfinkteri delmeden perianal cilde açılır.',
        rateNote: 'Garg 2020 (n=848) serisinde Parks Tip I olguların %93.5\'i fistülotomiye uygundur (ancak yüksek uzanım veya komorbidite varsa kompleksleşebilir).'
    },
    'II': {
        title: 'Parks Tip II — Transsfinkterik Fistül (IIa–IIb)',
        course: 'Fistül traktı intersfinkterik plandan geçerek eksternal anal sfinkter kasını (puborektalis altından) deler ve iskiorektal fossadan perianal cilde açılır.',
        rateNote: 'Parks Tip II tutulan eksternal sfinkter oranını (≤1/3 vs >1/3) ayırmaz; olguların %34.8–46.2\'si aslında düşük transsfinkterik olup güvenle fistülotomi yapılabilir.'
    },
    'III': {
        title: 'Parks Tip III — Suprasfinkterik Fistül',
        course: 'Fistül traktı intersfinkterik planda yukarı çıkar, puborektalis kasının (tüm sfinkter kompleksinin) üzerinden aşarak levator ani kasını delip iskiorektal fossadan cilde açılır.',
        rateNote: 'Tüm sfinkter kompleksini çevrelediği için fistülotomi fekal inkontinansa yol açar (uygunluk ~%5.4); sfinkter koruyucu cerrahi (TROPIS, ilerletme flebi, seton) uygulanır.'
    },
    'IV': {
        title: 'Parks Tip IV — Ekstrasfinkterik Fistül (IVa–IVd)',
        course: 'Anal kanal ve sfinkter mekanizmasıyla ilişki kurmaksızın perianal ciltten iskiorektal fossaya, oradan levator ani kasını delerek doğrudan rektuma açılır.',
        rateNote: 'Fistülotomi uygunluğu %0\'dır; altta yatan pelvik sepsis / rektal patolojinin kontrolü ve gerekirse saptırıcı stoma gerekir.'
    }
};

const SJUH_CATALOG: Record<SJUHMriGrade, { title: string; mri: string; outcome: string }> = {
    1: {
        title: 'SJUH MRG Derece 1 (Basit Lineer İntersfinkterik Fistül)',
        mri: 'Perine cildinden anal kanala uzanan tek, dallanmasız lineer intersfinkterik trakt; iskiorektal ve iskioanal fossalar tamamen temizdir.',
        outcome: 'Olumlu sonuç (Satisfactory outcome): Basit fistülotomi ile ek ameliyat gerektirmeksizin iyileşme (%99.1 fistülotomi uygunluğu).'
    },
    2: {
        title: 'SJUH MRG Derece 2 (Apse veya Sekonder/At Nalı Traktlı İntersfinkterik Fistül)',
        mri: 'Primer trakt ve eşlik eden apse veya sekonder (at nalı / horseshoe) uzanımlar tamamen eksternal sfinkter sınırları içinde (intersfinkterik planda) kalmıştır; iskiorektal fossa temizdir.',
        outcome: 'Olumlu sonuç: İskiorektal fossa tutulmadığından sekonder uzanımların intersfinkterik planda uygun drenajı/cerrahisi ile prognoz iyidir (%82.1 fistülotomi uygunluğu).'
    },
    3: {
        title: 'SJUH MRG Derece 3 (Basit Lineer Transsfinkterik Fistül)',
        mri: 'Fistül traktı internal ve eksternal sfinkteri delerek iskiorektal/iskioanal fossayı kateder; apse veya sekonder trakt eşlik etmez.',
        outcome: 'SJUH sisteminde "kompleks" sayılır; ancak Garg (2017) çalışmasında SJUH Derece 3 hastaların %46.2\'sinin düşük (≤1/3 EAS) tutulumlu olduğu ve güvenle fistülotomi yapılabildiği gösterilmiştir.'
    },
    4: {
        title: 'SJUH MRG Derece 4 (Apse veya Sekonder Trakt Eşlik Eden Transsfinkterik Fistül)',
        mri: 'Transsfinkterik primer trakta iskiorektal veya iskioanal fossada apse veya sekonder/at nalı uzanımlar eşlik eder.',
        outcome: 'Yüksek nüks riski; ancak EAS tutulumu ≤1/3 ise (Garg Derece II, olguların %29\'u) apse drenajı + fistülotomi uygulanabilir, >1/3 ise (Garg Derece IV) fistülotomi kontrendikedir.'
    },
    5: {
        title: 'SJUH MRG Derece 5 (Supralevator ve Translevator Hastalık)',
        mri: 'Fistülizasyon pelvik tabanı oluşturan levator ani kasının üstüne uzanır (supralevator uzanım veya pelvik hastalıktan kaynaklanan translevator fistül).',
        outcome: 'En kompleks grup (Fistülotomi uygunluğu %5.4): Translevator olgularda mutlaka pelvik sepsis kaynağı araştırılmalı ve ileri sfinkter koruyucu cerrahi (TROPIS vb.) uygulanmalıdır.'
    }
};

const GARG_CATALOG: Record<GargFistulaGrade, {
    cat: GargFistulaResult['complexityCategory'];
    safe: boolean;
    rule: string;
}> = {
    'I': {
        cat: 'Basit Fistül (Simple — Garg Derece I–II)',
        safe: true,
        rule: '✅ GARG DERECE I (Düşük [≤1/3 EAS] Lineer İntersfinkterik veya Transsfinkterik): Fistülotomi (laying open) GÜVENLE UYGULANIR (%90–98 kür, Vaizey kontinans skorunda bozulma yok).'
    },
    'II': {
        cat: 'Basit Fistül (Simple — Garg Derece I–II)',
        safe: true,
        rule: '✅ GARG DERECE II (Düşük [≤1/3 EAS] + Apse / Multipl Trakt / At Nalı): Apse drenajı / sekonder traktların açılması ile birlikte Fistülotomi GÜVENLE UYGULANIR.'
    },
    'III': {
        cat: 'Kompleks Fistül (Complex — Garg Derece III–V)',
        safe: false,
        rule: '🛑 GARG DERECE III (Yüksek [>1/3 EAS] Lineer Fistül VEYA Kontinans Risk Faktörlü/Komorbid Fistül): FİSTÜLOTOMİ KESİNLİKLE KONTRENDİKEDİR! Yalnızca sfinkter koruyucu prosedürler (LIFT, İlerletme Flebi, TROPIS, FiLaC, Gevşek Seton) uygulanmalıdır.'
    },
    'IV': {
        cat: 'Kompleks Fistül (Complex — Garg Derece III–V)',
        safe: false,
        rule: '🛑 GARG DERECE IV (Yüksek [>1/3 EAS] + Apse / Multipl Trakt / At Nalı): FİSTÜLOTOMİ KESİNLİKLE KONTRENDİKEDİR! İleri sfinkter koruyucu cerrahi (TROPIS, LIFT, Flep + Seton drenajı) uygulanmalıdır.'
    },
    'V': {
        cat: 'Kompleks Fistül (Complex — Garg Derece III–V)',
        safe: false,
        rule: '🛑 GARG DERECE V (Supralevator, Suprasfinkterik veya Ekstrasfinkterik Fistül): FİSTÜLOTOMİ KESİNLİKLE KONTRENDİKEDİR! Uzman koloproktoloji merkezinde sfinkter koruyucu cerrahi (TROPIS vb.) ve pelvik sepsis kontrolü uygulanmalıdır.'
    }
};

export function evaluatePerianalFistulaTriad(params: PerianalFistulaTriadParams | null | undefined): PerianalFistulaTriadResult | null {
    if (!params) return null;

    const inv: SphincterInvolvementLevel = params.sphincterInvolvement || 'intersphincteric_only';
    const hasBranchOrAbscess = Boolean(params.hasAbscessOrSecondaryTractOrHorseshoe);
    const hasSupralevator = Boolean(params.hasSupralevatorOrTranslevatorExtension)
        || inv === 'suprasphincteric'
        || inv === 'extrasphincteric_or_supralevator';

    const comorbidityTriggers: string[] = [];
    if (params.isAnteriorFistulaInFemale) comorbidityTriggers.push('Kadında anterior yerleşimli fistül');
    if (params.hasCrohnsDisease) comorbidityTriggers.push('Crohn hastalığı');
    if (params.hasPreExistingSphincterInjuryOrIncontinence) comorbidityTriggers.push('Önceden mevcut sfinkter hasarı / fekal inkontinans');
    if (params.hasPostRadiationExposure) comorbidityTriggers.push('Post-radyasyon öyküsü');

    // 1. Parks Tipini Türet
    let parksType: ParksFistulaType = params.parksDirect || 'I';
    if (!params.parksDirect) {
        if (inv === 'extrasphincteric_or_supralevator') parksType = 'IV';
        else if (inv === 'suprasphincteric') parksType = 'III';
        else if (inv === 'low_transsphincteric_le_1_3' || inv === 'high_transsphincteric_gt_1_3') parksType = 'II';
        else parksType = 'I';
    }

    // 2. SJUH MRG Derecesini Türet
    let sjuhGrade: SJUHMriGrade = params.sjuhDirect || 1;
    if (!params.sjuhDirect) {
        if (hasSupralevator) {
            sjuhGrade = 5;
        } else if (inv === 'low_transsphincteric_le_1_3' || inv === 'high_transsphincteric_gt_1_3' || params.abscessInIschiorectalFossa) {
            sjuhGrade = hasBranchOrAbscess ? 4 : 3;
        } else {
            sjuhGrade = hasBranchOrAbscess ? 2 : 1;
        }
    }

    // 3. Garg Derecesini Türet
    let gargGrade: GargFistulaGrade = params.gargDirect || 'I';
    if (!params.gargDirect) {
        if (hasSupralevator) {
            gargGrade = 'V';
        } else if (inv === 'high_transsphincteric_gt_1_3') {
            gargGrade = hasBranchOrAbscess ? 'IV' : 'III';
        } else if (comorbidityTriggers.length > 0) {
            // Düşük EAS (<=1/3) olsa bile komorbidite/risk faktörü hastayı en az Garg Derece III (Kompleks) yapar!
            gargGrade = 'III';
        } else {
            // <=1/3 EAS (intersfinkterik veya düşük transsfinkterik) ve komorbidite yok
            gargGrade = hasBranchOrAbscess ? 'II' : 'I';
        }
    }

    const pMeta = PARKS_CATALOG[parksType];
    const sMeta = SJUH_CATALOG[sjuhGrade];
    const gMeta = GARG_CATALOG[gargGrade];

    // 4. Kritik Uyumsuzluk Analizi (Parks / SJUH vs Garg)
    let discordanceHighlight = `3'lü Sınıflandırma: Parks Tip ${parksType} | SJUH MRG Derece ${sjuhGrade} | Garg Derece ${gargGrade} (${gMeta.cat}).`;
    if ((parksType === 'II' || sjuhGrade === 3 || sjuhGrade === 4) && (gargGrade === 'I' || gargGrade === 'II')) {
        discordanceHighlight = `💡 KRİTİK KLİNİK FARK (Parks Tip II / SJUH Derece ${sjuhGrade} vs Garg Derece ${gargGrade}): Klasik Parks ve SJUH sınıflamaları bu transsfinkterik fistülü "Kompleks" sayarken, eksternal sfinkter tutulumu ≤1/3 olduğu ve risk faktörü bulunmadığı için Garg sınıflandırması (848 hastalık kohortta %42.7 oranındaki grup) bunu "Basit Fistül" olarak tanımlar. Gereksiz yere düşük başarılı (%40–70) sfinkter koruyucu işlemler yerine %90–98 kür sağlayan FİSTÜLOTOMİ güvenle uygulanabilir!`;
    } else if (sjuhGrade <= 2 && gargGrade === 'III' && comorbidityTriggers.length > 0) {
        discordanceHighlight = `⚠️ KONTİNANS GÜVENLİK KALKANI (SJUH Derece ${sjuhGrade} vs Garg Derece III): Anatomik olarak düşük/intersfinkterik görünmesine karşın [${comorbidityTriggers.join(', ')}] nedeniyle Garg sistemi hastayı "Derece III Kompleks Fistül"e yükseltir; fekal inkontinansı önlemek için fistülotomiden kaçınılmalıdır!`;
    }

    return {
        parks: {
            type: parksType,
            typeTitle: pMeta.title,
            anatomicalCourse: pMeta.course,
            fistulotomySuitabilityRateNote: pMeta.rateNote
        },
        sjuhMri: {
            grade: sjuhGrade,
            gradeTitle: sMeta.title,
            mriCriteria: sMeta.mri,
            prognosticOutcome: sMeta.outcome
        },
        garg: {
            grade: gargGrade,
            complexityCategory: gMeta.cat,
            isFistulotomySafe: gMeta.safe,
            comorbidityTriggers,
            alertClass: gMeta.safe ? 'success' : 'danger',
            surgicalRule: gMeta.rule
        },
        discordanceHighlight
    };
}
