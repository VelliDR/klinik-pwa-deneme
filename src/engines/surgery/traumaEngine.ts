// ============================================================================
// SOLİD ORGAN TRAVMALARI MOTORU — DALAK VE KARACİĞER (AAST OIS 2018 & WSES 2017/2020)
// 1. AAST Dalak Yaralanma Ölçeği (2018 Revizyonu vs 1994 Klasik Karşılaştırmalı)
// 2. AAST Karaciğer Yaralanma Ölçeği (2018 Revizyonu vs 1994 Klasik Karşılaştırmalı)
// 3. WSES Dalak (2017) ve Karaciğer (2020) Entegre Travma Sınıflandırması
// ============================================================================

export type SolidOrganType = 'spleen' | 'liver';
export type AASTGrade = 1 | 2 | 3 | 4 | 5;
export type AASTVersionMode = '2018_revision' | '1994_classic';
export type WSESTraumaClass = 'I' | 'II' | 'III' | 'IV';
export type WSESClass3LabelMode = 'wses_2017_moderate' | 'wses_2020_severe';

export interface SolidOrganTraumaParams {
    organ?: SolidOrganType;
    aastVersion?: AASTVersionMode;
    directParenchymalGrade?: AASTGrade | null;

    // Yapılandırılmış Morfolojik / Parankimal Bulgular (BT / Operatif / Patolojik)
    subcapsularHematomaTier?: 'none' | 'lt_10_percent' | '10_to_50_percent' | 'gt_50_or_expanding_or_ruptured';
    intraparenchymalHematomaCm?: number | null; // Dalakta <5 vs >=5 cm; Karaciğerde <10 vs >10 cm!
    intraparenchymalHematomaRuptured?: boolean;
    lacerationDepthCm?: number | null;          // <1 cm (I), 1-3 cm (II), >3 cm (III)
    liverLacerationLengthGt10Cm?: boolean;      // Karaciğerde >10 cm uzunluk -> Derece III
    spleenDevascularizationGt25Percent?: boolean; // Dalakta segmental/hiler >%25 devaskülarizasyon -> Derece IV
    shatteredSpleenOrCompleteDevascularization?: boolean; // Dalakta parçalanmış / tam hiler devaskülarizasyon -> Derece V
    liverLobarDisruptionTier?: 'none' | '25_to_75_percent' | 'gt_75_percent'; // Karaciğer %25-75 (IV), >%75 (V)
    juxtahepaticVenousInjury?: boolean;         // Retrohepatik vena kava / santral majör hepatik ven -> Karaciğer Derece V

    // AAST 2018 Vasküler Yaralanma (Psödoanevrizma / AV Fistül) ve Aktif Kontrast Ekstravazasyonu
    hasContainedVascularInjuryOrActiveBleeding?: boolean; // Dalakta Derece IV; Karaciğerde Derece III!
    hasActiveBleedingIntoPeritoneum?: boolean;            // Dalakta Derece V; Karaciğerde Derece IV!

    // Multipl Yaralanma Kuralı (Derece III'e kadar +1 derece artırılır)
    hasMultipleInjuries?: boolean;

    // WSES Fizyolojik / Hemodinamik ve Hasta Parametreleri
    isHemodynamicallyUnstable?: boolean;
    systolicBpMmHg?: number | null;
    heartRateBpm?: number | null;
    hasPeritonitisOrOtherLaparotomyIndication?: boolean;
    ageYears?: number | null;
    mechanism?: 'blunt' | 'penetrating';
    wsesClass3LabelMode?: WSESClass3LabelMode;
}

export interface SolidOrganTraumaResult {
    organ: SolidOrganType;
    organLabelTr: 'Dalak' | 'Karaciğer';
    aastVersion: AASTVersionMode;
    aastGrade2018: AASTGrade;
    aastGrade1994: AASTGrade;
    activeAastGrade: AASTGrade;
    aisSeverityScore: 2 | 3 | 4 | 5;
    wasAdvancedForMultiplicity: boolean;
    wasUpstagedBy2018VascularRule: boolean;
    wsesClass: WSESTraumaClass;
    wsesSeverityCategory: 'Minör (Minor — WSES Sınıf I)' | 'Orta (Moderate — WSES Sınıf II)' | 'Orta (Moderate — WSES Sınıf III)' | 'Şiddetli (Severe — WSES Sınıf III)' | 'Şiddetli / Kritik (Severe — WSES Sınıf IV)';
    isHemodynamicallyUnstable: boolean;
    isPediatricPatient: boolean; // <15 yaş
    alertClass: 'success' | 'warning' | 'danger';
    anatomicalSummary: string;
    wsesManagementRecommendation: string;
    aast2018Vs1994Comparison: {
        grade2018: AASTGrade;
        grade1994: AASTGrade;
        explanation: string;
    };
    spleenVsLiverOrganDifferenceNote: string;
    postEmbolizationFollowUpNote?: string;
}

export function evaluateSolidOrganTrauma(params: SolidOrganTraumaParams | null | undefined): SolidOrganTraumaResult | null {
    if (!params) return null;

    const organ: SolidOrganType = params.organ || 'spleen';
    const organLabelTr = organ === 'spleen' ? 'Dalak' : 'Karaciğer';
    const aastVersion: AASTVersionMode = params.aastVersion || '2018_revision';

    // 1. Parankimal / Morfolojik Baz Dereceyi (1994 Klasik) Hesapla
    let baseGrade = params.directParenchymalGrade ?? 1;

    // Subkapsüler hematom
    if (params.subcapsularHematomaTier === 'gt_50_or_expanding_or_ruptured') {
        baseGrade = Math.max(baseGrade, 3) as AASTGrade;
    } else if (params.subcapsularHematomaTier === '10_to_50_percent') {
        baseGrade = Math.max(baseGrade, 2) as AASTGrade;
    }

    // İntraparenkimal hematom (Dalak eşiği: 5 cm | Karaciğer eşiği: 10 cm!)
    if (params.intraparenchymalHematomaRuptured) {
        baseGrade = Math.max(baseGrade, 3) as AASTGrade;
    } else if (params.intraparenchymalHematomaCm !== null && params.intraparenchymalHematomaCm !== undefined && params.intraparenchymalHematomaCm > 0) {
        const cm = params.intraparenchymalHematomaCm;
        if (organ === 'spleen') {
            if (cm >= 5) baseGrade = Math.max(baseGrade, 3) as AASTGrade;
            else baseGrade = Math.max(baseGrade, 2) as AASTGrade;
        } else {
            if (cm > 10) baseGrade = Math.max(baseGrade, 3) as AASTGrade;
            else baseGrade = Math.max(baseGrade, 2) as AASTGrade;
        }
    }

    // Laserasyon derinliği (<1 cm = I, 1-3 cm = II, >3 cm = III)
    if (params.lacerationDepthCm !== null && params.lacerationDepthCm !== undefined && params.lacerationDepthCm > 0) {
        const d = params.lacerationDepthCm;
        if (d > 3) baseGrade = Math.max(baseGrade, 3) as AASTGrade;
        else if (d >= 1) baseGrade = Math.max(baseGrade, 2) as AASTGrade;
        else baseGrade = Math.max(baseGrade, 1) as AASTGrade;
    }

    if (organ === 'liver' && params.liverLacerationLengthGt10Cm) {
        baseGrade = Math.max(baseGrade, 3) as AASTGrade;
    }

    // Multipl yaralanma kuralı (Kozar 2018 & Moore 1994: "Advance one grade for multiple injuries up to grade III")
    let wasAdvancedForMultiplicity = false;
    if (params.hasMultipleInjuries && baseGrade < 3) {
        baseGrade = (baseGrade + 1) as AASTGrade;
        wasAdvancedForMultiplicity = true;
    }

    // İleri Parankimal / Hiler / Lobar Yıkım (Derece IV ve V)
    if (organ === 'spleen') {
        if (params.spleenDevascularizationGt25Percent) {
            baseGrade = Math.max(baseGrade, 4) as AASTGrade;
        }
        if (params.shatteredSpleenOrCompleteDevascularization) {
            baseGrade = 5;
        }
    } else {
        if (params.liverLobarDisruptionTier === '25_to_75_percent') {
            baseGrade = Math.max(baseGrade, 4) as AASTGrade;
        } else if (params.liverLobarDisruptionTier === 'gt_75_percent' || params.juxtahepaticVenousInjury) {
            baseGrade = 5;
        }
    }

    const aastGrade1994: AASTGrade = baseGrade;

    // 2. AAST 2018 Vasküler Yaralanma (Psödoanevrizma / AVF) ve Aktif Kanama Güncellemesi
    // Dalak: Kapsül içi vasküler/aktif kanama = Derece IV, Peritona aktif kanama = Derece V
    // Karaciğer: Parankim içi vasküler/aktif kanama = Derece III, Peritona aktif kanama = Derece IV
    let aastGrade2018: AASTGrade = aastGrade1994;
    if (organ === 'spleen') {
        if (params.hasActiveBleedingIntoPeritoneum) {
            aastGrade2018 = 5;
        } else if (params.hasContainedVascularInjuryOrActiveBleeding) {
            aastGrade2018 = Math.max(aastGrade2018, 4) as AASTGrade;
        }
    } else {
        if (params.hasActiveBleedingIntoPeritoneum) {
            aastGrade2018 = Math.max(aastGrade2018, 4) as AASTGrade;
        } else if (params.hasContainedVascularInjuryOrActiveBleeding) {
            aastGrade2018 = Math.max(aastGrade2018, 3) as AASTGrade;
        }
    }

    const wasUpstagedBy2018VascularRule = aastGrade2018 > aastGrade1994;
    const activeAastGrade: AASTGrade = aastVersion === '2018_revision' ? aastGrade2018 : aastGrade1994;
    const aisSeverityScore: 2 | 3 | 4 | 5 = activeAastGrade <= 2 ? 2 : (activeAastGrade as 3 | 4 | 5);

    // 3. Hemodinamik Stabilite ve WSES Sınıfı (Sınıf I, II, III, IV)
    const sbpHypotensive = params.systolicBpMmHg !== null && params.systolicBpMmHg !== undefined && params.systolicBpMmHg > 0 && params.systolicBpMmHg < 90;
    const isHemodynamicallyUnstable = Boolean(params.isHemodynamicallyUnstable) || sbpHypotensive;
    const isPediatricPatient = params.ageYears !== null && params.ageYears !== undefined && params.ageYears < 15;

    let wsesClass: WSESTraumaClass = 'I';
    if (isHemodynamicallyUnstable) {
        wsesClass = 'IV';
    } else if (activeAastGrade >= 4) {
        wsesClass = 'III';
    } else if (activeAastGrade === 3) {
        wsesClass = 'II';
    } else {
        wsesClass = 'I';
    }

    const class3LabelMode: WSESClass3LabelMode = params.wsesClass3LabelMode
        || (organ === 'spleen' ? 'wses_2017_moderate' : 'wses_2020_severe');

    let wsesSeverityCategory: SolidOrganTraumaResult['wsesSeverityCategory'] = 'Minör (Minor — WSES Sınıf I)';
    if (wsesClass === 'IV') {
        wsesSeverityCategory = 'Şiddetli / Kritik (Severe — WSES Sınıf IV)';
    } else if (wsesClass === 'III') {
        wsesSeverityCategory = class3LabelMode === 'wses_2017_moderate'
            ? 'Orta (Moderate — WSES Sınıf III)'
            : 'Şiddetli (Severe — WSES Sınıf III)';
    } else if (wsesClass === 'II') {
        wsesSeverityCategory = 'Orta (Moderate — WSES Sınıf II)';
    }

    let alertClass: 'success' | 'warning' | 'danger' = 'success';
    if (wsesClass === 'IV' || wsesClass === 'III' || params.hasPeritonitisOrOtherLaparotomyIndication) {
        alertClass = 'danger';
    } else if (wsesClass === 'II' || params.hasContainedVascularInjuryOrActiveBleeding) {
        alertClass = 'warning';
    }

    // Anatomik Özet
    const multTag = wasAdvancedForMultiplicity ? ' [Multipl yaralanma kuralıyla +1 derece artırıldı]' : '';
    const vascTag = params.hasActiveBleedingIntoPeritoneum
        ? ` + Periton boşluğuna uzanan aktif kanama (AAST 2018 Derece ${organ === 'spleen' ? 'V' : 'IV'})`
        : params.hasContainedVascularInjuryOrActiveBleeding
            ? ` + Organ içinde sınırlı vasküler yaralanma / psödoanevrizma / aktif kanama (AAST 2018 Derece ${organ === 'spleen' ? 'IV' : 'III'})`
            : '';
    const anatomicalSummary = `${organLabelTr} Travması — AAST Derece ${activeAastGrade} (AIS: ${aisSeverityScore})${multTag}${vascTag}.`;

    // WSES Yönetim Yaklaşımı
    let wsesManagementRecommendation = '';
    if (isHemodynamicallyUnstable || params.hasPeritonitisOrOtherLaparotomyIndication) {
        const headerLabel = isHemodynamicallyUnstable
            ? '🛑 WSES SINIF IV (Hemodinamik İnstabil — AAST Derecesinden Bağımsız)'
            : `🛑 ACİL LAPAROTOMİ ENDİKASYONU (WSES Sınıf ${wsesClass} — Peritonit / Eşlik Eden Cerrahi Endikasyon)`;
        wsesManagementRecommendation = `${headerLabel}: Non-operatif yönetim (NOM) ve BT çekimi kontrendikedir! Derhal ameliyathaneye alınarak Acil Operatif Yönetim (OM: ${organ === 'spleen' ? 'Splenektomi / kanama kontrolü' : 'Perihepatik packing / Pringle manevrası / hasar kontrol cerrahisi'}) uygulanmalıdır.`;
    } else if (wsesClass === 'I') {
        wsesManagementRecommendation = `WSES Sınıf I (Hemodinamik Stabil — AAST Derece ${activeAastGrade}): Non-Operatif Yönetim (NOM) altın standarttır. Yakın klinik ve seri hemoglobin (4–6 saat arayla) takibi; vasküler lezyon yoksa anjiyoembolizasyon gerekmez.`;
    } else if (wsesClass === 'II') {
        const hasVasc = Boolean(params.hasContainedVascularInjuryOrActiveBleeding || params.hasActiveBleedingIntoPeritoneum);
        wsesManagementRecommendation = `WSES Sınıf II (Hemodinamik Stabil — AAST Derece III): Non-Operatif Yönetim (NOM) + yakın hemodinamik/Hb izlemi.${hasVasc ? ' BT\'de kontrast ekstravazasyonu (blush) / psödoanevrizma saptandığından Anjiyografi ve Selektif Anjiyoembolizasyon endikedir!' : ' BT\'de kontrast blush veya klinik Hb düşüşü gelişirse anjiyografi/anjiyoembolizasyon uygulanır.'}`;
    } else {
        // WSES Sınıf III (Stabil AAST IV-V)
        if (isPediatricPatient) {
            wsesManagementRecommendation = `WSES Sınıf III Pediatrik Hasta (<15 Yaş — Hemodinamik Stabil AAST Derece ${activeAastGrade}): Çocuklarda yüksek dereceli dalak/karaciğer yaralanmalarının büyük çoğunluğu tek başına NOM ile iyileşir; pediatrik travma merkezinde yakın yoğun bakım izlemi (yalnız devam eden kanama/transfüzyon ihtiyacında anjiyoembolizasyon veya cerrahi).`;
        } else {
            wsesManagementRecommendation = `🚨 WSES Sınıf III Erişkin Hasta (Hemodinamik Stabil — AAST Derece ${activeAastGrade}): Tek başına gözlemle NOM başarısızlık riski yüksek olduğundan, 7/24 ameliyathane ve girişimsel radyoloji olanaklarına sahip travma merkezinde Anjiyografi ve ${organ === 'spleen' ? 'Splenik Arter Embolizasyonu (SAE)' : 'Selektif Hepatik Anjiyoembolizasyon'} + YBÜ izlemi önerilir.`;
        }
    }

    const aast2018Vs1994Comparison = {
        grade2018: aastGrade2018,
        grade1994: aastGrade1994,
        explanation: wasUpstagedBy2018VascularRule
            ? `⚡ AAST 2018 vs 1994 Farkı: Parankimal hasar 1994 ölçeğine göre Derece ${aastGrade1994} düzeyinde olmasına karşın, dual-faz BT'de saptanan vasküler yaralanma / aktif kontrast ekstravazasyonu nedeniyle 2018 revizyonu yaralanmayı Derece ${aastGrade2018}'e yükselterek anjiyoembolizasyon gereksinimini ve NOM başarısızlık riskini yakalamıştır.`
            : `AAST 2018 (Derece ${aastGrade2018}) ve 1994 (Derece ${aastGrade1994}) ölçekleri bu parankimal yaralanma için aynı dereceyi vermektedir.`
    };

    const spleenVsLiverOrganDifferenceNote = 'Dalak vs Karaciğer AAST 2018 Eşik Farkı: (1) İntraparenkimal hematom Derece III eşiği Dalakta ≥5 cm iken Karaciğerde >10 cm\'dir; (2) Organ içinde sınırlı vasküler yaralanma/aktif kanama Dalakta Derece IV iken Karaciğerde Derece III\'tür; (3) Peritona uzanan aktif kanama Dalakta Derece V iken Karaciğerde Derece IV\'tür (Karaciğer Derece V >%75 lob yıkımı ve jukstahepatik venöz yaralanmalara ayrılmıştır).';

    const postEmbolizationFollowUpNote = organ === 'spleen' && activeAastGrade >= 4
        ? 'Splenik Arter Embolizasyonu (SAE) Takip Notu: AAST 2018 Derece V olgularda distal SAE ile %85.7 dalak kurtarma oranı bildirilmiştir; ancak ≥%50 parankimal enfarkt gelişen hastalarda 16–21. günlerde splenik apse riskine karşı dikkatli olunmalıdır.'
        : undefined;

    return {
        organ,
        organLabelTr,
        aastVersion,
        aastGrade2018,
        aastGrade1994,
        activeAastGrade,
        aisSeverityScore,
        wasAdvancedForMultiplicity,
        wasUpstagedBy2018VascularRule,
        wsesClass,
        wsesSeverityCategory,
        isHemodynamicallyUnstable,
        isPediatricPatient,
        alertClass,
        anatomicalSummary,
        wsesManagementRecommendation,
        aast2018Vs1994Comparison,
        spleenVsLiverOrganDifferenceNote,
        postEmbolizationFollowUpNote
    };
}
