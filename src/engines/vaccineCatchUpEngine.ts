/**
 * KLİNİK KARAR DESTEK ASİSTANI - AŞI YAKALAMA MOTORU (VACCINE CATCH-UP ENGINE)
 * 
 * T.C. Sağlık Bakanlığı Genişletilmiş Bağışıklama Programı (GBP) ve
 * güncel ulusal/uluslararası immünoloji rehberleri doğrultusunda:
 * - Doz aralıkları ne kadar uzarsa uzasın asla baştan başlamama kuralı
 * - Kayıt esası (kart / ATS / e-Nabız) ve sözlü beyan geçersizliği
 * - 4 Gün Minimum Aralık Kuralı (Grace Period)
 * - Eş zamanlı uygulama ve enjeksiyon mesafe kuralı (min 2.5 cm)
 * - İki parenteral canlı aşı arasında min 28 gün kuralı (oral canlılar muaf)
 * - TDT (PPD) & BCG / Canlı Aşı Çakışma Önleme Protokolü
 * - Yaşa göre elenen aşılar (BCG <72 ay, Hib <60 ay, KPA <60 ay, DaBT vs Td >=72 ay, Rotavirüs katı penceresi)
 * - 14 Nisan 2025 6'lı Karma (DaBT-İPA-Hib-HepB) ve 1 Eylül 2026 Suçiçeği 2. doz entegrasyonu
 */

export interface VaccineCatchUpInput {
    ageInMonths: number;
    scenario?: 'unvaccinated_12_71' | 'unvaccinated_ge_72' | 'unvaccinated_infant' | 'custom_partial';
    familyCanReturnIn3Days?: boolean; // TDT okuma için 48-72 saat sonra gelebilir mi?
    dosesReceived?: {
        dabt_hepb_hib?: number; // DaBT-İPA-Hib-HepB veya DaBT-İPA-Hib
        hepb?: number;
        kpa?: number;
        kkk?: number;
        varicella?: number;
        bcg?: boolean;
        hepa?: number;
        opa?: number;
    };
}

export type VaccineEliminationStatus = 'ELIMINATED' | 'MODIFIED_PROTOCOL' | 'ACTIVE_APPLIED' | 'CONTRAINDICATED';

export interface EliminatedVaccineInfo {
    code: string;
    name: string;
    isEliminated: boolean;
    status: VaccineEliminationStatus;
    title: string;
    rationale: string;
    ageCutoffNote: string;
    badgeText: string;
    badgeClass: string;
}

export interface CatchUpDoseItem {
    vaccine: string;
    component: string;
    doseLabel: string;
    doseNumber: number | string;
    route: 'IM' | 'SC' | 'ID' | 'Oral';
    site: string;
    type: 'inactivated' | 'live_parenteral' | 'live_oral' | 'diagnostic';
    isPriority?: boolean;
    notes?: string;
}

export interface CatchUpVisit {
    id: string;
    visitTitle: string;
    timingLabel: string;
    intervalFromStart: string;
    minimumIntervalRule: string;
    doses: CatchUpDoseItem[];
    clinicalNotes: string[];
    warningNote?: string;
}

export interface MinimumIntervalRule {
    vaccine: string;
    shortName: string;
    intervalBetweenDoses: string;
    absoluteMinimumDays: number;
    minAgeRequirement?: string;
    graceRule4Days: string;
    clinicalPearl: string;
}

export interface VaccineIntervalCheckResult {
    vaccine: string;
    intervalDays: number;
    minimumRequiredDays: number;
    isValid: boolean;
    isGracePeriodValid: boolean;
    daysDifference: number;
    statusText: string;
    explanation: string;
    recommendation: string;
    severity: 'success' | 'warning' | 'danger';
}

export interface ClinicalTrapScenario {
    id: string;
    title: string;
    trapSummary: string;
    whyItHappens: string;
    idealSolution: {
        title: string;
        step1: string;
        step2: string;
        pros: string;
    };
    alternativeSolution: {
        title: string;
        step1: string;
        step2: string;
        pros: string;
        cons: string;
    };
}

export interface VaccineCatchUpResult {
    ageInMonths: number;
    ageYearsFormatted: string;
    ageGroupLabel: string;
    targetScenario: string;
    scenarioKey: string;
    familyCanReturnIn3Days: boolean;
    eliminatedVaccines: EliminatedVaccineInfo[];
    visits: CatchUpVisit[];
    minimumIntervals: MinimumIntervalRule[];
    goldRules: {
        title: string;
        desc: string;
    }[];
    clinicalTraps: ClinicalTrapScenario[];
    quickBadge: {
        text: string;
        badgeClass: string;
    };
}

/**
 * Üst Yaş Sınırları ve Kesim Noktaları Değerlendiricisi
 */
export function evaluateEliminatedVaccines(ageInMonths: number): EliminatedVaccineInfo[] {
    const list: EliminatedVaccineInfo[] = [];

    // 1. BCG
    if (ageInMonths >= 72) {
        list.push({
            code: 'BCG',
            name: 'BCG (Verem Aşısı)',
            isEliminated: true,
            status: 'ELIMINATED',
            title: 'BCG Uygulanmaz (Üst Yaş Sınırı)',
            rationale: '6 yaşını doldurmuş (72 ay ve üzeri) çocuklara daha önce hiç aşılanmamış olsalar dahi BCG aşısı yapılmaz.',
            ageCutoffNote: 'Üst Yaş Sınırı: 72 Ay (6 Yaş)',
            badgeText: 'YAPILMAZ (6+ Yaş)',
            badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800'
        });
    } else if (ageInMonths >= 3) {
        list.push({
            code: 'BCG',
            name: 'BCG (Verem Aşısı)',
            isEliminated: false,
            status: 'MODIFIED_PROTOCOL',
            title: 'TDT (PPD) Kontrolü ile Uygulanır',
            rationale: '3 ayını doldurmuş çocukta BCG öncesi TDT yapılması zorunludur. 48-72 saat sonra TDT negatif çıkarsa BCG uygulanır.',
            ageCutoffNote: '3–71 Ay Arası: TDT şartı var',
            badgeText: 'TDT İLE YAPILIR',
            badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800'
        });
    } else {
        list.push({
            code: 'BCG',
            name: 'BCG (Verem Aşısı)',
            isEliminated: false,
            status: 'ACTIVE_APPLIED',
            title: 'Doğrudan Uygulanabilir',
            rationale: 'İlk 3 ayda TDT aranmaksızın doğrudan BCG aşısı uygulanabilir.',
            ageCutoffNote: '0–2 Ay: Doğrudan uygulanır',
            badgeText: 'UYGULANIR',
            badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
        });
    }

    // 2. Hib (Haemophilus influenzae tip b)
    if (ageInMonths >= 60) {
        list.push({
            code: 'HIB',
            name: 'Hib (H. influenzae tip b)',
            isEliminated: true,
            status: 'ELIMINATED',
            title: 'Hib Uygulanmaz (Üst Yaş Sınırı)',
            rationale: '5 yaşını doldurmuş (60 ay ve üzeri) sağlıklı çocuklara Hib aşısı uygulanmaz (doğal antikor gelişimi yeterlidir).',
            ageCutoffNote: 'Üst Yaş Sınırı: 60 Ay (5 Yaş)',
            badgeText: 'YAPILMAZ (5+ Yaş)',
            badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800'
        });
    } else if (ageInMonths >= 15) {
        list.push({
            code: 'HIB',
            name: 'Hib (H. influenzae tip b)',
            isEliminated: false,
            status: 'MODIFIED_PROTOCOL',
            title: 'Tek Doz Hib Yeterlidir',
            rationale: '15–59 ay arasında ilk kez yapılıyorsa tek doz yeterlidir; rapel doza gerek kalmaz.',
            ageCutoffNote: '15–59 Ay: Tek doz kuralı',
            badgeText: 'TEK DOZ YETERLİ',
            badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800'
        });
    } else if (ageInMonths >= 12) {
        list.push({
            code: 'HIB',
            name: 'Hib (H. influenzae tip b)',
            isEliminated: false,
            status: 'ACTIVE_APPLIED',
            title: '2 Doz Şeması',
            rationale: 'İlk doz 12–14 ay arasında yapıldıysa en az 2 ay (8 hafta) arayla toplam 2 doz yapılır.',
            ageCutoffNote: '12–14 Ay: 2 doz şeması',
            badgeText: '2 DOZ',
            badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800'
        });
    } else {
        list.push({
            code: 'HIB',
            name: 'Hib (H. influenzae tip b)',
            isEliminated: false,
            status: 'ACTIVE_APPLIED',
            title: 'Rutin Primer Seri',
            rationale: '1 yaş altında 6\'lı karma içinde 4 hafta arayla rutin primer dozlar uygulanır.',
            ageCutoffNote: '<12 Ay: Rutin seri',
            badgeText: 'UYGULANIR',
            badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
        });
    }

    // 3. KPA (Konjuge Pnömokok Aşısı)
    if (ageInMonths >= 60) {
        list.push({
            code: 'KPA',
            name: 'KPA (Konjuge Pnömokok)',
            isEliminated: true,
            status: 'ELIMINATED',
            title: 'KPA Uygulanmaz (Üst Yaş Sınırı)',
            rationale: '5 yaşını doldurmuş (60 ay ve üzeri) sağlıklı çocuklara KPA aşısı yapılmaz.',
            ageCutoffNote: 'Üst Yaş Sınırı: 60 Ay (5 Yaş)',
            badgeText: 'YAPILMAZ (5+ Yaş)',
            badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800'
        });
    } else if (ageInMonths >= 24) {
        list.push({
            code: 'KPA',
            name: 'KPA (Konjuge Pnömokok)',
            isEliminated: false,
            status: 'MODIFIED_PROTOCOL',
            title: 'Tek Doz KPA Yeterlidir',
            rationale: '24–59 ay arası hiç aşılanmamış sağlıklı çocukta tek doz KPA yeterlidir; 2. doz yapılmaz.',
            ageCutoffNote: '24–59 Ay: Tek doz kuralı',
            badgeText: 'TEK DOZ YETERLİ',
            badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800'
        });
    } else if (ageInMonths >= 12) {
        list.push({
            code: 'KPA',
            name: 'KPA (Konjuge Pnömokok)',
            isEliminated: false,
            status: 'ACTIVE_APPLIED',
            title: '2 Doz Şeması',
            rationale: '12–23 ay arası hiç aşılanmamışsa en az 8 hafta arayla 2 doz yapılır.',
            ageCutoffNote: '12–23 Ay: 2 doz (min 8 hafta arayla)',
            badgeText: '2 DOZ',
            badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800'
        });
    } else {
        list.push({
            code: 'KPA',
            name: 'KPA (Konjuge Pnömokok)',
            isEliminated: false,
            status: 'ACTIVE_APPLIED',
            title: 'Rutin Primer Seri',
            rationale: '1 yaş altında 4 hafta arayla primer dozlar ve 12. ayda rapel uygulanır.',
            ageCutoffNote: '<12 Ay: Rutin seri',
            badgeText: 'UYGULANIR',
            badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
        });
    }

    // 4. Boğmaca Bileşeni (DaBT vs. Td)
    if (ageInMonths >= 72) {
        list.push({
            code: 'PERTUSSIS_TD',
            name: 'Boğmaca (DaBT vs. Td)',
            isEliminated: true,
            status: 'MODIFIED_PROTOCOL',
            title: 'DaBT Yerine Td Kullanılır',
            rationale: '6 yaşını doldurmuş (72 ay ve üzeri) çocuklarda DaBT (tam veya asellüler çocuk dozu karma aşı) yerine Td (Erişkin tip difteri-tetanos) aşısı kullanılır.',
            ageCutoffNote: '≥72 Ay: DaBT yerine Td',
            badgeText: 'Td KULLANILIR',
            badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800'
        });
    } else {
        list.push({
            code: 'PERTUSSIS_DABT',
            name: 'Karma Aşı (DaBT)',
            isEliminated: false,
            status: 'ACTIVE_APPLIED',
            title: 'DaBT Bileşenli Karma Aşı Kullanılır',
            rationale: '6 yaş altındaki çocuklarda heksavalan (6\'lı karma: DaBT-İPA-Hib-HepB) veya pentavalan karma aşı güvenle kullanılır.',
            ageCutoffNote: '<72 Ay: DaBT bileşeni uygundur',
            badgeText: '6\'LI KARMA',
            badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
        });
    }

    // 5. Rotavirüs
    // Rotavirüs ilk doz en geç 14 hafta 6 gün (~3.5 ay), son doz en geç 8 ay (32 hafta 0 gün)
    if (ageInMonths > 3.5) {
        list.push({
            code: 'ROTAVIRUS',
            name: 'Rotavirüs (Özel Aşı)',
            isEliminated: true,
            status: 'CONTRAINDICATED',
            title: 'Aşıya Başlanamaz (Katı Zaman Penceresi Aşılmış)',
            rationale: 'İlk doz en geç 14 hafta 6 günlükken uygulanmalıdır. Bu pencereyi kaçıran çocukta invajinasyon (barsak düğümlenmesi) riski nedeniyle aşıya ASLA başlanmaz.',
            ageCutoffNote: 'Pencere: İlk doz ≤14hf 6gün, son doz ≤32hf',
            badgeText: 'BAŞLANAMAZ',
            badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800'
        });
    } else {
        list.push({
            code: 'ROTAVIRUS',
            name: 'Rotavirüs (Özel Aşı)',
            isEliminated: false,
            status: 'ACTIVE_APPLIED',
            title: '1. Doz Penceresinde',
            rationale: 'Bebek henüz 15 haftalıktan küçük; ilk doz Rotarix veya RotaTeq hemen başlanabilir. Son doz en geç 32. haftada (8. ay) tamamlanmalıdır.',
            ageCutoffNote: '1. Doz için uygun pencere',
            badgeText: 'BAŞLANABİLİR',
            badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
        });
    }

    return list;
}

/**
 * Minimum Aralık ve 4 Gün Kuralı Tablosu
 */
export function getMinimumIntervalRules(): MinimumIntervalRule[] {
    return [
        {
            vaccine: 'DaBT-İPA-Hib-HepB / DaBT-İPA (Karma)',
            shortName: 'Karma Aşı',
            intervalBetweenDoses: '1-2. doz arası: min 4 hafta (28 gün)\n2-3. doz arası: min 4 hafta (28 gün)\n3. doz ile rapel (4. doz): min 6 ay (ve çocuk ≥12 aylık)',
            absoluteMinimumDays: 28,
            minAgeRequirement: '1. doz: min 6 hafta; Rapel: min 12 ay',
            graceRule4Days: '4 güne kadar erken (24-27. gün) yapılan dozlar GEÇERLİ kabul edilir; 5 gün ve daha erken yapılanlar GEÇERSİZDİR ve tekrarlanmalıdır.',
            clinicalPearl: 'Doz aralığı ne kadar uzarsa uzasın en baştan başlanmaz, kalınan dozdan devam edilir.'
        },
        {
            vaccine: 'Hepatit B',
            shortName: 'HepB',
            intervalBetweenDoses: '1-2. doz arası: min 4 hafta (28 gün)\n2-3. doz arası: min 8 hafta (56 gün)\n1 ve 3. doz arası: min 16 hafta (112 gün)',
            absoluteMinimumDays: 28,
            minAgeRequirement: '3. doz bebek EN AZ 24 haftalık (6 aylık) olduğunda uygulanabilir.',
            graceRule4Days: '1-2. doz arasında en fazla 4 gün erken (24. gün) tolerans tanınır; ancak 3. dozun 24. haftadan önce uygulanması kesinlikle geçersizdir.',
            clinicalPearl: 'HBsAg pozitif anne bebeğinde ilk 12 saatte monovalan HepB + HBIG şarttır.'
        },
        {
            vaccine: 'KPA (Konjuge Pnömokok Aşısı)',
            shortName: 'KPA',
            intervalBetweenDoses: '1 yaş altında primer dozlar arası: min 4 hafta (28 gün)\n1 yaş üzerinde dozlar arası: min 8 hafta (56 gün)',
            absoluteMinimumDays: 28,
            minAgeRequirement: 'İlk doz min 6 haftalıkken verilebilir; 24-59 ayda tek doz yeterlidir.',
            graceRule4Days: 'Min 4 haftalık aralıkta 24 gün geçerli; min 8 haftalık aralıkta 52 gün geçerlidir.',
            clinicalPearl: '5 yaşını dolduran (≥60 ay) sağlıklı çocuklarda KPA gereksinimi biter.'
        },
        {
            vaccine: 'KKK (Kızamık-Kızamıkçık-Kabakulak) & Suçiçeği',
            shortName: 'KKK & Suçiçeği',
            intervalBetweenDoses: '1. ve 2. doz arası: min 4 hafta (28 gün)\n(Suçiçeği rutin aralık <13 yaş çocukta 3 aydır; ancak yakalamada min 4 hafta yeterlidir)',
            absoluteMinimumDays: 28,
            minAgeRequirement: 'İlk doz min 12 aylıkken uygulanabilir (Salgın durumunda 9. ayda yapılan KKK geçerli 1. doz SAYILMAZ, 12. ayda tekrarlanır).',
            graceRule4Days: '1. doz 12. aydan en fazla 4 gün erken yapılmışsa geçerli; 2. doz min 28 günden en fazla 4 gün erken (24. gün) yapılmışsa geçerlidir.',
            clinicalPearl: 'İki parenteral canlı aşı aynı gün yapılmadıysa aralarında MUTLAKA 28 gün beklenmelidir!'
        },
        {
            vaccine: 'Hepatit A',
            shortName: 'HepA',
            intervalBetweenDoses: '1. ve 2. doz arası: min 6 ay (180 gün)',
            absoluteMinimumDays: 180,
            minAgeRequirement: 'İlk doz min 12 aylıkken (Türkiye rutin takviminde 18. ayda) uygulanır.',
            graceRule4Days: '6 aylık süreden en fazla 4 gün erken (yaklaşık 176 gün) yapılan 2. doz geçerli sayılır.',
            clinicalPearl: 'İnaktif aşıdır; diğer tüm canlı veya inaktif aşılarla aynı gün veya herhangi bir aralıkla uygulanabilir.'
        },
        {
            vaccine: 'İki Parenteral Canlı Aşı (KKK, Suçiçeği, BCG)',
            shortName: 'Canlı-Canlı Kuralı',
            intervalBetweenDoses: 'Aynı gün yapılmadıysa: min 4 hafta (28 gün)',
            absoluteMinimumDays: 28,
            graceRule4Days: '28 günden 5 gün veya daha erken (≤23 gün) yapılan 2. canlı aşı GEÇERSİZDİR. Hatalı dozdan 28 gün sonra tekrar edilmelidir.',
            clinicalPearl: 'Oral canlı aşılar (OPA, Rotavirüs) bu kuraldan muaftır; parenteral canlı aşılarla herhangi bir aralıkla verilebilir.'
        }
    ];
}

/**
 * 4 Gün Kuralı ve Minimum Aralık Denetleme Fonksiyonu
 */
export function checkDoseValidity(
    vaccineType: 'karma' | 'hepb_1_2' | 'hepb_2_3' | 'kpa_infant' | 'kpa_older' | 'live_live' | 'hepa',
    actualIntervalDays: number
): VaccineIntervalCheckResult {
    let minDays = 28;
    let vaccineLabel = '';

    switch (vaccineType) {
        case 'karma':
            minDays = 28;
            vaccineLabel = 'Karma Aşı (DaBT-İPA-Hib)';
            break;
        case 'hepb_1_2':
            minDays = 28;
            vaccineLabel = 'Hepatit B (1. - 2. Doz)';
            break;
        case 'hepb_2_3':
            minDays = 56;
            vaccineLabel = 'Hepatit B (2. - 3. Doz)';
            break;
        case 'kpa_infant':
            minDays = 28;
            vaccineLabel = 'KPA Primer (<1 Yaş)';
            break;
        case 'kpa_older':
            minDays = 56;
            vaccineLabel = 'KPA (≥1 Yaş)';
            break;
        case 'live_live':
            minDays = 28;
            vaccineLabel = 'İki Parenteral Canlı Aşı Aralığı';
            break;
        case 'hepa':
            minDays = 180;
            vaccineLabel = 'Hepatit A (1. - 2. Doz)';
            break;
    }

    const daysEarly = minDays - actualIntervalDays;

    if (daysEarly <= 0) {
        return {
            vaccine: vaccineLabel,
            intervalDays: actualIntervalDays,
            minimumRequiredDays: minDays,
            isValid: true,
            isGracePeriodValid: false,
            daysDifference: Math.abs(daysEarly),
            statusText: 'GEÇERLİ (Standart Minimum Aralık Karşılandı)',
            explanation: `Uygulanan dozlar arasındaki ${actualIntervalDays} günlük süre, kılavuzda şart koşulan ${minDays} günlük minimum süreyi tam olarak karşılamaktadır.`,
            recommendation: 'Doz koruyucu ve geçerlidir. Sonraki vizit dozuna planlanan takvimle devam ediniz.',
            severity: 'success'
        };
    } else if (daysEarly <= 4) {
        return {
            vaccine: vaccineLabel,
            intervalDays: actualIntervalDays,
            minimumRequiredDays: minDays,
            isValid: true,
            isGracePeriodValid: true,
            daysDifference: daysEarly,
            statusText: 'GEÇERLİ (4 Gün Kuralı / Grace Period Kapsamında)',
            explanation: `Doz, şart koşulan ${minDays} günlük süreden ${daysEarly} gün erken (${actualIntervalDays}. gün) yapılmıştır. Sağlık Bakanlığı ve CDC kurallarına göre 4 güne kadar olan erken uygulamalar geçerli kabul edilir.`,
            recommendation: 'Doz geçerlidir, tekrarına gerek yoktur. Sonraki dozu bu uygulanan tarihten itibaren hesaplayınız.',
            severity: 'warning'
        };
    } else {
        return {
            vaccine: vaccineLabel,
            intervalDays: actualIntervalDays,
            minimumRequiredDays: minDays,
            isValid: false,
            isGracePeriodValid: false,
            daysDifference: daysEarly,
            statusText: 'GEÇERSİZ! (Hatalı Erken Doz)',
            explanation: `Doz, şart koşulan ${minDays} günlük minimum süreden ${daysEarly} gün önce (${actualIntervalDays}. gün) uygulanmıştır. 4 gün toleransı aşılmış olduğundan bu doz immünolojik olarak GEÇERSİZDİR.`,
            recommendation: `Bu hatalı doz GEÇERSİZ sayılmalı ve yapılan hatalı doz tarihinden itibaren EN AZ ${minDays} gün beklenerek doz tekrarlanmalıdır!`,
            severity: 'danger'
        };
    }
}

/**
 * Klinik Tuzaklar ve Çözüm Protokolleri
 */
export function getClinicalTraps(): ClinicalTrapScenario[] {
    return [
        {
            id: 'tdt_live_clash',
            title: 'Klinik Tuzak: TDT (PPD) / BCG ve KKK - Suçiçeği Canlı Aşı Çakışması',
            trapSummary: '3 ayını doldurmuş çocukta BCG öncesi TDT yapılması zorunludur. İlk vizitte TDT uygulanırken aynı gün KKK ve Suçiçeği (canlı) yapılırsa, 48–72 saat sonra TDT negatif çıksa dahi BCG YAPILAMAZ.',
            whyItHappens: 'KKK ve Suçiçeği parenteral canlı aşılardır. BCG de parenteral canlı aşıdır. İki parenteral canlı aşı aynı gün verilmediyse, ilk aşıya karşı salgılanan endojen interferonun ikinci canlı aşının replike olmasını engellememesi için aralarında en az 28 gün (4 hafta) beklenmesi şarttır.',
            idealSolution: {
                title: 'Çözüm 1 (İdeal Şema - Aile 3 gün sonra gelebiliyorsa):',
                step1: '0. Gün: İnaktif aşıları (6\'lı Karma, KPA, HepA) uygulayın ve TDT\'yi (PPD) yapın. KKK ve Suçiçeği aşılarını bekletin.',
                step2: '48–72 Saat Sonra (TDT Okuma Günü): TDT negatif okunduğunda BCG + KKK + Suçiçeği aşılarını AYNI GÜN BİRLİKTE uygulayın. Eş zamanlı yapıldıkları için 28 gün kuralı engeli kalmaz!',
                pros: 'Tüm canlı aşılar 3. günde aynı anda verilerek çocuk en kısa sürede tam korumaya kavuşturulur.'
            },
            alternativeSolution: {
                title: 'Çözüm 2 (Ailenin 3 gün sonra gelmeme / takip kaybı riski varsa):',
                step1: '0. Gün: KKK 1 + Suçiçeği 1 + İnaktif aşılar (Karma, KPA) + TDT hepsini ilk gün yapın.',
                step2: 'BCG\'yi 4 hafta sonraki 2. vizite erteleyin! (3 gün sonra TDT negatif çıksa dahi canlı aşı kuralı gereği BCG o gün yapılamaz; 28 gün beklenip 2. vizitte yapılır).',
                pros: 'Kızamık salgını ortamında KKK geciktirilmemiş olur.',
                cons: 'BCG aşısı 1 ay gecikir.'
            }
        },
        {
            id: 'never_restart_rule',
            title: 'Altın Kural: Aşılamaya Asla En Baştan Başlanmaz',
            trapSummary: 'Dozlar arasındaki süre ne kadar uzamış olursa olsun (aylar veya yıllar geçse bile) aşı serisine baştan başlanmaz; kaldığı yerden devam edilir.',
            whyItHappens: 'İmmünolojik bellek hücreleri (hafıza B ve T lenfositleri) aşı antijenini yıllarca tanımaya devam eder. Zamanın uzaması antikor titresi düşüşüne yol açsa da hafıza yanıtını silmez; verilen yeni doz kuvvetli bir sekonder (anamnestik) rapel yanıtı başlatır.',
            idealSolution: {
                title: 'Klinik Yaklaşım:',
                step1: 'Aşı kartı veya ATS/e-Nabız kayıtlarındaki geçerli doz sayısını tespit edin.',
                step2: 'Örneğin 1 yaşında sadece 2. ay aşıları yapılmış çocukta 1. doz DaBT geçerlidir; doğrudan 2. doz karma yapılarak şema tamamlanır.',
                pros: 'Gereksiz enjeksiyon, aşırı antijen yükü ve aşı tereddüdü önlenir.'
            },
            alternativeSolution: {
                title: 'Kayıt Olmayan Durumlar (Sözlü Beyan Tuzağı):',
                step1: 'Ailenin sözlü beyanıyla kanıtlanamayan veya resmi belgesi bulunmayan aşılar HİÇ YAPILMAMIŞ kabul edilir.',
                step2: 'Belgesi olmayan aşılar sıfırdan şemaya dahil edilir.',
                pros: 'Eksik veya hatalı korumaya bağlı çocukluk çağı salgınları önlenir.',
                cons: 'Önceden yapılmış olma ihtimali olan aşılar belgesiz olduğu için tekrarlanır (ancak güvenlidir).'
            }
        }
    ];
}

/**
 * Ana Aşı Yakalama Takvimi Motoru
 */
export function calculateVaccineCatchUp(input: VaccineCatchUpInput): VaccineCatchUpResult {
    const ageInMonths = Math.max(0, input.ageInMonths);
    const ageYears = (ageInMonths / 12).toFixed(1);
    const familyCanReturnIn3Days = input.familyCanReturnIn3Days !== false; // Varsayılan: true

    const eliminated = evaluateEliminatedVaccines(ageInMonths);
    const minimumIntervals = getMinimumIntervalRules();
    const clinicalTraps = getClinicalTraps();

    // Altın Kurallar Metni
    const goldRules = [
        {
            title: 'Dozlar Asla Baştan Başlamaz',
            desc: 'Dozlar arasındaki süre ne kadar uzamış olursa olsun aşılamaya asla en baştan başlanmaz; önceden yapılmış ve belgelenmiş her geçerli doz kabul edilerek şemaya kaldığı yerden devam edilir.'
        },
        {
            title: 'Yalnızca Yazılı Kayıt Esastır',
            desc: 'Aşı kartı veya elektronik sistemde (ATS / e-Nabız) yazılı olarak belgelenmiş dozlar geçerli sayılır. Sözlü aile beyanı geçersizdir; belgesiz aşılar hiç yapılmamış kabul edilir.'
        },
        {
            title: 'Minimum Yaş ve 4 Gün Tolerans Kuralı',
            desc: 'Hızlandırılmış şemada rutin takvim değil minimum doz aralıkları kullanılır. Bir doz, minimum yaş veya aralıktan en fazla 4 gün erken yapılmışsa geçerli; 5 gün ve daha erken yapılmışsa geçersizdir ve tekrarlanmalıdır.'
        },
        {
            title: 'Eş Zamanlı (Simültane) Uygulama',
            desc: 'Aynı gün yaşına uygun eksik tüm aşılar farklı ekstremitelerden veya aynı ekstremitede en az 2,5 cm mesafe bırakılarak güvenle uygulanmalıdır.'
        },
        {
            title: '28 Gün Canlı Aşı Kuralı (Oral Aşılar Muaf)',
            desc: 'İki parenteral canlı aşı (KKK, Suçiçeği, BCG) aynı gün yapılmadıysa aralarında en az 4 hafta (28 gün) beklenmelidir. Oral canlı aşılar (OPA, Rotavirüs) bu kuraldan muaftır.'
        }
    ];

    let targetScenario = '';
    let scenarioKey = '';
    let visits: CatchUpVisit[] = [];
    let quickBadge = { text: '', badgeClass: '' };

    // --- SENARYO 1: 12 AY - 6 YAŞ ARASI (12-71 AY) HİÇ AŞILANMAMIŞ ÇOCUK ---
    if (ageInMonths >= 12 && ageInMonths < 72) {
        targetScenario = '12–71 Ay (1–6 Yaş) Arası Hiç Aşılanmamış Çocuk Yakalama Şeması';
        scenarioKey = 'unvaccinated_12_71';
        quickBadge = {
            text: `${ageYears} Yaş (${ageInMonths} Ay) • GBP 12-71 Ay Şeması`,
            badgeClass: 'bg-cyan-950 text-cyan-300 border-cyan-700'
        };

        // KPA Kuralı Kontrolü: 24-59 ay tek doz, 12-23 ay 2 doz
        const isKpaSingleDose = ageInMonths >= 24;
        // Hib Kuralı: 15-59 ay tek doz yeterlidir
        const isHibSingleDose = ageInMonths >= 15;

        // VİZİT 1: İlk Karşılaşma (0. Gün)
        const v1Doses: CatchUpDoseItem[] = [
            {
                vaccine: '6\'lı Karma (DaBT-İPA-Hib-HepB)',
                component: 'Difteri, Tetanos, Asellüler Boğmaca, İnaktif Polio, Hib, Hepatit B',
                doseLabel: '1. Doz',
                doseNumber: 1,
                route: 'IM',
                site: 'Sol Vastus Lateralis (uyluk) veya Deltoid',
                type: 'inactivated',
                isPriority: true,
                notes: '14 Nisan 2025 GBP reformu gereği 6\'lı karma kullanılır (DaBT-İPA-Hib + HepB tek enjektörde).'
            },
            {
                vaccine: 'KPA (Konjuge Pnömokok)',
                component: 'Pnömokok serotipleri',
                doseLabel: '1. Doz',
                doseNumber: 1,
                route: 'IM',
                site: 'Sağ Vastus Lateralis veya Deltoid',
                type: 'inactivated',
                isPriority: true,
                notes: isKpaSingleDose 
                    ? 'Çocuk ≥24 aylık olduğundan TEK DOZ KPA ömür boyu yeterlidir; 2. doza gerek kalmayacaktır.' 
                    : '12–23 ay arasında olduğundan en az 8 hafta sonra 2. doz KPA gerekecektir.'
            },
            {
                vaccine: 'TDT (PPD Testi)',
                component: 'Tuberkülin Saflaştırılmış Protein Türevi (0.1 mL)',
                doseLabel: 'Teşhis Testi',
                doseNumber: 'TDT',
                route: 'ID',
                site: 'Sol Ön Kol Volar Yüzü (İntradermal)',
                type: 'diagnostic',
                isPriority: true,
                notes: '3 aydan büyük çocukta BCG öncesi TDT zorunludur. 48–72 saat sonra endürasyon okunur.'
            }
        ];

        if (familyCanReturnIn3Days) {
            // İdeal Yol: KKK ve Suçiçeği 3. güne bırakılır, böylece BCG ile aynı gün çakışmasız yapılır
            // v1Doses'a eklenmez, not düşülür
        } else {
            // Alternatif Yol: Canlı aşılar ilk gün verilir, BCG 2. vizite (1 ay sonraya) ertelenir
            v1Doses.push(
                {
                    vaccine: 'KKK (Kızamık-Kızamıkçık-Kabakulak)',
                    component: 'Canlı Attenuated Virüs',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'SC',
                    site: 'Sol Deltoid (veya vastus lateralis)',
                    type: 'live_parenteral',
                    isPriority: true,
                    notes: 'Kızamık morbiditesine karşı ilk gün verilir. BCG 1 ay sonraya ertelenmek zorundadır!'
                },
                {
                    vaccine: 'Suçiçeği (Varisella)',
                    component: 'Canlı Attenuated VZV',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'SC',
                    site: 'Sağ Kol Deltoid (KKK\'den farklı bölge veya min 2.5 cm mesafe)',
                    type: 'live_parenteral',
                    notes: 'Parenteral canlı aşı. KKK ile aynı gün yapılmalıdır.'
                }
            );
        }

        visits.push({
            id: 'visit_1',
            visitTitle: '1. Vizit: İlk Karşılaşma (Bugün / 0. Gün)',
            timingLabel: 'Bugün',
            intervalFromStart: '0. Gün',
            minimumIntervalRule: 'Tüm inaktif aşılar ve TDT ilk gün eş zamanlı uygulanır.',
            doses: v1Doses,
            clinicalNotes: [
                'Tüm aşılar aynı gün farklı enjeksiyon bölgelerinden (veya aynı kolda min 2.5 cm aralıkla) uygulanmalıdır.',
                familyCanReturnIn3Days 
                    ? 'İdeal Şema: KKK ve Suçiçeği 48–72 saat sonraki TDT okuma gününe bırakılmıştır; böylece BCG ile aynı gün verilip 28 gün çakışması önlenir.'
                    : 'Pratik Şema: Ailenin gelmeme riskine karşı KKK ve Suçiçeği bugün yapılmıştır; BCG aşısı 28 gün canlı aşı kuralı gereği 2. vizite (1 ay sonraya) ERTELENMİŞTİR.'
            ],
            warningNote: !familyCanReturnIn3Days ? 'DİKKAT: KKK ve Suçiçeği canlı aşıları bugün yapıldığından 3 gün sonra TDT negatif çıksa dahi BCG BUGÜN YAPILAMAZ; 28 gün beklenmelidir!' : undefined
        });

        // VİZİT 1b: 48–72 Saat Sonra (TDT Okuma Günü)
        const v1bDoses: CatchUpDoseItem[] = [];
        if (familyCanReturnIn3Days) {
            v1bDoses.push(
                {
                    vaccine: 'BCG (Verem Aşısı)',
                    component: 'Canlı Attenuated Mycobacterium bovis',
                    doseLabel: 'Tek Doz',
                    doseNumber: 'BCG',
                    route: 'ID',
                    site: 'Sol Omuz Deltoid İntradermal (0.05 mL)',
                    type: 'live_parenteral',
                    isPriority: true,
                    notes: 'TDT endürasyonu negatifse (<5 mm veya aşı skarı durumuna göre <6 mm) uygulanır.'
                },
                {
                    vaccine: 'KKK (Kızamık-Kızamıkçık-Kabakulak)',
                    component: 'Canlı Attenuated Virüs',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'SC',
                    site: 'Sol Kol Deltoid Altı',
                    type: 'live_parenteral',
                    isPriority: true,
                    notes: 'BCG ile AYNI GÜN uygulandığından 28 gün bekleme engeli oluşmaz.'
                },
                {
                    vaccine: 'Suçiçeği (Varisella)',
                    component: 'Canlı Attenuated VZV',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'SC',
                    site: 'Sağ Kol Deltoid',
                    type: 'live_parenteral',
                    notes: 'BCG ve KKK ile aynı gün simültane yapılır.'
                },
                {
                    vaccine: 'Hepatit A',
                    component: 'İnaktif Virüs',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'IM',
                    site: 'Sağ Vastus Lateralis veya Deltoid',
                    type: 'inactivated',
                    notes: 'İnaktif aşı; canlı aşılarla aynı gün güvenle verilir.'
                }
            );
        } else {
            v1bDoses.push(
                {
                    vaccine: 'Hepatit A',
                    component: 'İnaktif Virüs',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'IM',
                    site: 'Sağ Vastus Lateralis veya Deltoid',
                    type: 'inactivated',
                    notes: 'İnaktif aşı; TDT okuma gününde verilebilir.'
                }
            );
        }

        visits.push({
            id: 'visit_1b',
            visitTitle: '1b. Vizit: TDT Okuma Günü (2–3 Gün / 48–72 Saat Sonra)',
            timingLabel: 'İlk Karşılaşmadan 48–72 Saat Sonra',
            intervalFromStart: '+2-3 Gün',
            minimumIntervalRule: 'TDT transvers endürasyon çapı okunur (Negatifse BCG yapılır).',
            doses: v1bDoses,
            clinicalNotes: [
                'TDT okuması transvers eksende sertlik (endürasyon) milimetre cinsinden ölçülür (kızarıklık değil sertlik dikkate alınır).',
                familyCanReturnIn3Days
                    ? 'İdeal şema sayesinde BCG, KKK ve Suçiçeği 3 canlı aşı aynı gün verilerek koruma başlatılmıştır.'
                    : 'Canlı aşılar 0. günde verildiği için BCG bugün uygulanamaz; 2. vizite bırakılmıştır.'
            ]
        });

        // VİZİT 2: İlk Karşılaşmadan 2 Ay Sonra (Min 4–8 Hafta Sonra)
        const v2Doses: CatchUpDoseItem[] = [
            {
                vaccine: isHibSingleDose ? 'DaBT-İPA + HepB' : '6\'lı Karma (DaBT-İPA-Hib-HepB)',
                component: isHibSingleDose ? 'DaBT-İPA + HepB (Hib tek dozu tamamlandı)' : 'DaBT-İPA-Hib-HepB',
                doseLabel: '2. Doz',
                doseNumber: 2,
                route: 'IM',
                site: 'Sol Deltoid veya Vastus Lateralis',
                type: 'inactivated',
                isPriority: true,
                notes: isHibSingleDose 
                    ? 'İlk doz ≥15 ayda yapıldığı için tek doz Hib yeterlidir; 2. dozda Hib rapeli gerekmez.' 
                    : '1. dozdan en az 4 hafta sonra uygulanır.'
            },
            {
                vaccine: 'OPA (Oral Polio Aşısı)',
                component: 'Canlı Bivalan Oral Polio (Tip 1 & 3)',
                doseLabel: '1. Doz',
                doseNumber: 1,
                route: 'Oral',
                site: 'Ağızdan 2 damla',
                type: 'live_oral',
                notes: 'Oral canlı aşı. Parenteral aşılarla aynı gün veya herhangi bir aralıkla verilebilir.'
            }
        ];

        // KPA 2 Dozu Kuralı
        if (!isKpaSingleDose) {
            v2Doses.push({
                vaccine: 'KPA (Konjuge Pnömokok)',
                component: 'Pnömokok serotipleri',
                doseLabel: '2. Doz (Son Doz)',
                doseNumber: 2,
                route: 'IM',
                site: 'Sağ Vastus Lateralis',
                type: 'inactivated',
                notes: 'İlk doz 12–23 ay arasında başladığı için 1. dozdan en az 8 hafta sonra 2. doz uygulanarak seri tamamlanır.'
            });
        }

        // KKK 2. Doz
        v2Doses.push({
            vaccine: 'KKK (Kızamık-Kızamıkçık-Kabakulak)',
            component: 'Canlı Attenuated Virüs',
            doseLabel: '2. Doz',
            doseNumber: 2,
            route: 'SC',
            site: 'Sağ Kol Deltoid',
            type: 'live_parenteral',
            notes: 'Hızlandırılmış şemada 1. dozdan en az 4 hafta sonra KKK 2 yapılabilir (Çocuk <4 yaş ise rutin 48. aya da bırakılabilir).'
        });

        if (!familyCanReturnIn3Days) {
            v2Doses.push({
                vaccine: 'BCG (Verem Aşısı)',
                component: 'Canlı Attenuated Mycobacterium bovis',
                doseLabel: 'Tek Doz',
                doseNumber: 'BCG',
                route: 'ID',
                site: 'Sol Omuz İntradermal (0.05 mL)',
                type: 'live_parenteral',
                notes: '0. gündeki KKK/Suçiçeği aşılarının üzerinden 28 gün geçtiği için bugün güvenle uygulanır (TDT kontrolü ile).'
            });
        }

        visits.push({
            id: 'visit_2',
            visitTitle: '2. Vizit: İlk Karşılaşmadan 2 Ay Sonra (Min 4–8 Hafta)',
            timingLabel: 'İlk Karşılaşmadan 2 Ay Sonra',
            intervalFromStart: '+2 Ay (min 4-8 hf)',
            minimumIntervalRule: 'Karma ve HepB için min 4 hafta; KPA için min 8 hafta; KKK için min 4 hafta aralık.',
            doses: v2Doses,
            clinicalNotes: [
                isKpaSingleDose ? 'DİKKAT: Çocuk ilk dozda ≥24 aylık olduğu için KPA 2 yapılmaz (tek doz yeterlidir).' : 'KPA 2. dozu tamamlanmıştır.',
                'HepB 2. dozu uygulanmıştır (1. dozdan en az 4 hafta geçmiş olmalıdır).'
            ]
        });

        // VİZİT 3: İlk Karşılaşmadan 8 Ay Sonra (2. Dozdan 6 Ay Sonra)
        const v3Doses: CatchUpDoseItem[] = [
            {
                vaccine: 'DaBT-İPA',
                component: 'Difteri, Tetanos, Asellüler Boğmaca, İnaktif Polio',
                doseLabel: '3. Doz',
                doseNumber: 3,
                route: 'IM',
                site: 'Sol Deltoid',
                type: 'inactivated',
                isPriority: true,
                notes: '2. dozdan en az 6 ay sonra uygulanmalıdır.'
            },
            {
                vaccine: 'Hepatit B',
                component: 'Rekombinant HBsAg',
                doseLabel: '3. Doz (Son Doz)',
                doseNumber: 3,
                route: 'IM',
                site: 'Sağ Deltoid',
                type: 'inactivated',
                notes: '1. dozdan en az 16 hafta, 2. dozdan en az 8 hafta geçmiş olmalı ve çocuk en az 24 haftalık olmalıdır.'
            },
            {
                vaccine: 'OPA (Oral Polio Aşısı)',
                component: 'Canlı Bivalan Oral Polio',
                doseLabel: '2. Doz (Son Doz)',
                doseNumber: 2,
                route: 'Oral',
                site: 'Ağızdan 2 damla',
                type: 'live_oral',
                notes: '1. OPA dozundan en az 4 hafta sonra verilir.'
            },
            {
                vaccine: 'Hepatit A',
                component: 'İnaktif Virüs',
                doseLabel: '2. Doz (Son Doz)',
                doseNumber: 2,
                route: 'IM',
                site: 'Sağ Uyluk / Deltoid',
                type: 'inactivated',
                notes: '1. Hepatit A dozundan en az 6 ay sonra uygulanarak ömür boyu bağışıklık sağlanır.'
            }
        ];

        visits.push({
            id: 'visit_3',
            visitTitle: '3. Vizit: İlk Karşılaşmadan 8 Ay Sonra (2. Dozdan 6 Ay Sonra)',
            timingLabel: 'İlk Karşılaşmadan 8 Ay Sonra',
            intervalFromStart: '+8 Ay',
            minimumIntervalRule: 'DaBT ve HepA için 2. dozdan min 6 ay; HepB 3 için 1. dozdan min 16 hf ve 2. dozdan min 8 hf.',
            doses: v3Doses,
            clinicalNotes: [
                'Bu vizit ile 12–71 ay yakalama serisi temel bağışıklaması tamamlanmış olur.',
                '1 Eylül 2026 reformu gereği 48. ayını dolduran çocukta Suçiçeği 2. dozu da takvime eklenir.'
            ]
        });
    }

    // --- SENARYO 2: 6 YAŞ VE ÜZERİ (≥ 72 AY) HİÇ AŞILANMAMIŞ ÇOCUK ---
    else if (ageInMonths >= 72) {
        targetScenario = '6 Yaş ve Üzeri (≥72 Ay) Hiç Aşılanmamış Çocuk Yakalama Şeması';
        scenarioKey = 'unvaccinated_ge_72';
        quickBadge = {
            text: `${ageYears} Yaş (${ageInMonths} Ay) • GBP ≥6 Yaş Şeması (Td Esaslı)`,
            badgeClass: 'bg-indigo-950 text-indigo-300 border-indigo-700'
        };

        // VİZİT 1: İlk Karşılaşma (Bugün / 0. Gün)
        visits.push({
            id: 'visit_1_ge6',
            visitTitle: '1. Vizit: İlk Karşılaşma (Bugün / 0. Gün)',
            timingLabel: 'Bugün',
            intervalFromStart: '0. Gün',
            minimumIntervalRule: 'BCG, Hib ve KPA UYGULANMAZ. DaBT yerine Td kullanılır.',
            doses: [
                {
                    vaccine: 'Td (Erişkin Tip Tetanos-Difteri)',
                    component: 'Difteri ve Tetanos Toksoidi (Erişkin Doz)',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'IM',
                    site: 'Sol Deltoid',
                    type: 'inactivated',
                    isPriority: true,
                    notes: '≥6 yaş çocukta DaBT (boğmaca) yerine Td kullanılır.'
                },
                {
                    vaccine: 'OPA (Oral Polio Aşısı)',
                    component: 'Canlı Bivalan Oral Polio',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'Oral',
                    site: 'Ağızdan 2 damla',
                    type: 'live_oral',
                    notes: 'Oral polio aşısı.'
                },
                {
                    vaccine: 'Hepatit B',
                    component: 'Rekombinant HBsAg',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'IM',
                    site: 'Sağ Deltoid',
                    type: 'inactivated',
                    isPriority: true,
                    notes: 'Hepatit B primer serisi 1. dozu.'
                },
                {
                    vaccine: 'KKK (Kızamık-Kızamıkçık-Kabakulak)',
                    component: 'Canlı Attenuated Virüs',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'SC',
                    site: 'Sol Kol Deltoid Altı (SC)',
                    type: 'live_parenteral',
                    isPriority: true,
                    notes: 'Suçiçeği ile aynı gün simültane uygulanır.'
                },
                {
                    vaccine: 'Suçiçeği (Varisella)',
                    component: 'Canlı Attenuated VZV',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'SC',
                    site: 'Sağ Kol Deltoid Altı (KKK\'den min 2.5 cm uzakta veya farklı kol)',
                    type: 'live_parenteral',
                    notes: 'KKK ile aynı gün farklı koldan verilir.'
                },
                {
                    vaccine: 'Hepatit A',
                    component: 'İnaktif Virüs',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'IM',
                    site: 'Sağ Deltoid (veya uyluk)',
                    type: 'inactivated',
                    notes: 'Hepatit A 1. dozu.'
                }
            ],
            clinicalNotes: [
                '6 yaş ve üzeri çocuklara BCG, Hib ve KPA kesinlikle uygulanmaz.',
                'Tüm aşılar aynı gün farklı enjeksiyon bölgelerinden (veya aynı ekstremitede min 2.5 cm aralıkla) simültane yapılır.'
            ]
        });

        // VİZİT 2: İlk Karşılaşmadan 1–2 Ay Sonra (Min 4 Hafta Sonra)
        visits.push({
            id: 'visit_2_ge6',
            visitTitle: '2. Vizit: İlk Karşılaşmadan 1–2 Ay Sonra (Min 4 Hafta)',
            timingLabel: 'İlk Karşılaşmadan 1–2 Ay Sonra',
            intervalFromStart: '+1-2 Ay (min 4 hf)',
            minimumIntervalRule: 'Td, OPA, HepB ve KKK için min 4 hafta (28 gün) aralık.',
            doses: [
                {
                    vaccine: 'Td (Erişkin Tip Tetanos-Difteri)',
                    component: 'Difteri ve Tetanos Toksoidi',
                    doseLabel: '2. Doz',
                    doseNumber: 2,
                    route: 'IM',
                    site: 'Sol Deltoid',
                    type: 'inactivated',
                    isPriority: true,
                    notes: '1. Td dozundan en az 4 hafta sonra.'
                },
                {
                    vaccine: 'OPA (Oral Polio Aşısı)',
                    component: 'Canlı Bivalan Oral Polio',
                    doseLabel: '2. Doz (Son Doz)',
                    doseNumber: 2,
                    route: 'Oral',
                    site: 'Ağızdan 2 damla',
                    type: 'live_oral',
                    notes: '1. OPA dozundan en az 4 hafta sonra.'
                },
                {
                    vaccine: 'Hepatit B',
                    component: 'Rekombinant HBsAg',
                    doseLabel: '2. Doz',
                    doseNumber: 2,
                    route: 'IM',
                    site: 'Sağ Deltoid',
                    type: 'inactivated',
                    notes: '1. HepB dozundan en az 4 hafta sonra.'
                },
                {
                    vaccine: 'KKK (Kızamık-Kızamıkçık-Kabakulak)',
                    component: 'Canlı Attenuated Virüs',
                    doseLabel: '2. Doz (Son Doz)',
                    doseNumber: 2,
                    route: 'SC',
                    site: 'Sağ Deltoid (SC)',
                    type: 'live_parenteral',
                    notes: '1. KKK dozundan en az 4 hafta sonra uygulanır ve seri tamamlanır.'
                }
            ],
            clinicalNotes: [
                'KKK 2. dozu tamamlanır.',
                'Suçiçeği 2. dozu rutin olarak en az 3 ay sonra (veya min 4 hafta sonra) planlanabilir.'
            ]
        });

        // VİZİT 3: İlk Karşılaşmadan 8 Ay Sonra (2. Dozdan 6 Ay Sonra)
        visits.push({
            id: 'visit_3_ge6',
            visitTitle: '3. Vizit: İlk Karşılaşmadan 8 Ay Sonra (2. Dozdan 6 Ay Sonra)',
            timingLabel: 'İlk Karşılaşmadan 8 Ay Sonra',
            intervalFromStart: '+8 Ay',
            minimumIntervalRule: 'Td ve HepA için 2. dozdan min 6 ay; HepB 3 için 1. dozdan min 16 hf ve 2. dozdan min 8 hf.',
            doses: [
                {
                    vaccine: 'Td (Erişkin Tip Tetanos-Difteri)',
                    component: 'Difteri ve Tetanos Toksoidi',
                    doseLabel: '3. Doz (Son Doz)',
                    doseNumber: 3,
                    route: 'IM',
                    site: 'Sol Deltoid',
                    type: 'inactivated',
                    isPriority: true,
                    notes: '2. Td dozundan en az 6 ay sonra uygulanır ve primer seri tamamlanır. Sonrasında 10 yılda bir Td rapeli önerilir.'
                },
                {
                    vaccine: 'Hepatit B',
                    component: 'Rekombinant HBsAg',
                    doseLabel: '3. Doz (Son Doz)',
                    doseNumber: 3,
                    route: 'IM',
                    site: 'Sağ Deltoid',
                    type: 'inactivated',
                    notes: '1. dozdan en az 16 hafta ve 2. dozdan en az 8 hafta geçmiş olmalıdır.'
                },
                {
                    vaccine: 'Hepatit A',
                    component: 'İnaktif Virüs',
                    doseLabel: '2. Doz (Son Doz)',
                    doseNumber: 2,
                    route: 'IM',
                    site: 'Sağ Deltoid / Uyluk',
                    type: 'inactivated',
                    notes: '1. dozdan en az 6 ay sonra verilerek ömür boyu koruma sağlanır.'
                }
            ],
            clinicalNotes: [
                '6 yaş üstü çocukta 3 vizitte primer bağışıklama tamamen tamamlanmış olur.',
                'Erişkin hayatında her 10 yılda bir Td rapeli hatırlatılmalıdır.'
            ]
        });
    }

    // --- SENARYO 3: <12 AY BEBEK (GECİKMİŞ AŞILAMA) ---
    else {
        targetScenario = '<12 Ay Bebek Hızlandırılmış Yakalama Şeması';
        scenarioKey = 'unvaccinated_infant';
        quickBadge = {
            text: `${ageInMonths} Aylık Bebek • GBP Süt Çocuğu Yakalama Şeması`,
            badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-700'
        };

        const v1InfantDoses: CatchUpDoseItem[] = [
            {
                vaccine: '6\'lı Karma (DaBT-İPA-Hib-HepB)',
                component: 'DaBT-İPA-Hib-HepB',
                doseLabel: '1. Doz',
                doseNumber: 1,
                route: 'IM',
                site: 'Sol Vastus Lateralis (uyluk)',
                type: 'inactivated',
                isPriority: true,
                notes: '14 Nisan 2025 GBP reformu heksavalan aşı.'
            },
            {
                vaccine: 'KPA (Konjuge Pnömokok)',
                component: 'Pnömokok serotipleri',
                doseLabel: '1. Doz',
                doseNumber: 1,
                route: 'IM',
                site: 'Sağ Vastus Lateralis',
                type: 'inactivated',
                isPriority: true,
                notes: '<1 yaş bebeklerde 4 hafta arayla primer dozlar verilir.'
            }
        ];

        // BCG: <3 ay doğrudan, ≥3 ay TDT ile
        if (ageInMonths < 3) {
            v1InfantDoses.push({
                vaccine: 'BCG (Verem Aşısı)',
                component: 'Canlı Attenuated M. bovis',
                doseLabel: 'Tek Doz',
                doseNumber: 'BCG',
                route: 'ID',
                site: 'Sol Omuz Deltoid İntradermal (0.05 mL)',
                type: 'live_parenteral',
                isPriority: true,
                notes: '<3 ay bebekte TDT gerekmeksizin doğrudan BCG uygulanabilir.'
            });
        } else {
            v1InfantDoses.push({
                vaccine: 'TDT (PPD Testi)',
                component: 'Tuberkülin Testi',
                doseLabel: 'Teşhis Testi',
                doseNumber: 'TDT',
                route: 'ID',
                site: 'Sol Ön Kol Volar Yüzü',
                type: 'diagnostic',
                isPriority: true,
                notes: '≥3 ay bebekte BCG öncesi TDT şarttır. Negatifse 48–72 saat sonra BCG yapılır.'
            });
        }

        // Rotavirüs kontrolü
        if (ageInMonths <= 3.5) {
            v1InfantDoses.push({
                vaccine: 'Rotavirüs (Özel Aşı)',
                component: 'Canlı Oral Rotavirüs (Rotarix / RotaTeq)',
                doseLabel: '1. Doz',
                doseNumber: 1,
                route: 'Oral',
                site: 'Ağızdan',
                type: 'live_oral',
                notes: 'İlk doz penceresi (<15 hafta) henüz kaçırılmamıştır, hemen başlanabilir.'
            });
        }

        visits.push({
            id: 'visit_1_infant',
            visitTitle: '1. Vizit: İlk Karşılaşma (Bugün / 0. Gün)',
            timingLabel: 'Bugün',
            intervalFromStart: '0. Gün',
            minimumIntervalRule: 'Süt çocuğunda primer dozlar arası min 4 hafta (28 gün) aralık esastır.',
            doses: v1InfantDoses,
            clinicalNotes: [
                ageInMonths >= 3 
                    ? '3 ayını doldurduğu için TDT yapılmıştır; 48–72 saat sonra TDT negatifse BCG aşısı uygulanacaktır.' 
                    : '<3 ay bebekte TDT aramadan BCG doğrudan uygulanmıştır.',
                'Primer 6\'lı karma ve KPA serisi başlatılmıştır.'
            ]
        });

        // 2. Vizit (4 Hafta Sonra)
        visits.push({
            id: 'visit_2_infant',
            visitTitle: '2. Vizit: 1. Dozdan 4 Hafta Sonra (Min 28 Gün)',
            timingLabel: 'İlk Karşılaşmadan 1 Ay Sonra',
            intervalFromStart: '+4 Hafta',
            minimumIntervalRule: '6\'lı Karma ve KPA için min 4 hafta aralık.',
            doses: [
                {
                    vaccine: '6\'lı Karma (DaBT-İPA-Hib-HepB)',
                    component: 'DaBT-İPA-Hib-HepB',
                    doseLabel: '2. Doz',
                    doseNumber: 2,
                    route: 'IM',
                    site: 'Sol Vastus Lateralis',
                    type: 'inactivated',
                    isPriority: true,
                    notes: '1. dozdan en az 4 hafta sonra.'
                },
                {
                    vaccine: 'KPA (Konjuge Pnömokok)',
                    component: 'Pnömokok serotipleri',
                    doseLabel: '2. Doz',
                    doseNumber: 2,
                    route: 'IM',
                    site: 'Sağ Vastus Lateralis',
                    type: 'inactivated',
                    isPriority: true,
                    notes: '1. dozdan en az 4 hafta sonra.'
                }
            ],
            clinicalNotes: [
                'Primer serinin 2. dozları uygulanır.',
                'Bebek 6 ayı doldurduğunda 3. doz 6\'lı karma ve 1. OPA dozu planlanır.'
            ]
        });

        // 3. Vizit (2. Dozdan 4 Hafta Sonra)
        visits.push({
            id: 'visit_3_infant',
            visitTitle: '3. Vizit: 2. Dozdan 4 Hafta Sonra (Bebek ≥6 Ay Olduğunda)',
            timingLabel: 'İlk Karşılaşmadan 2 Ay Sonra',
            intervalFromStart: '+8 Hafta',
            minimumIntervalRule: 'Karma 3 için 2. dozdan min 4 hafta; OPA 1 için bebek ≥6 aylık olmalıdır.',
            doses: [
                {
                    vaccine: '6\'lı Karma (DaBT-İPA-Hib-HepB)',
                    component: 'DaBT-İPA-Hib-HepB',
                    doseLabel: '3. Doz',
                    doseNumber: 3,
                    route: 'IM',
                    site: 'Sol Vastus Lateralis',
                    type: 'inactivated',
                    isPriority: true,
                    notes: '2. dozdan en az 4 hafta sonra.'
                },
                {
                    vaccine: 'OPA (Oral Polio Aşısı)',
                    component: 'Canlı Bivalan Oral Polio',
                    doseLabel: '1. Doz',
                    doseNumber: 1,
                    route: 'Oral',
                    site: 'Ağızdan 2 damla',
                    type: 'live_oral',
                    notes: 'Bebek ≥6 ay olduğunda 1. doz OPA verilir.'
                }
            ],
            clinicalNotes: [
                'Primer 3 dozluk seri tamamlanır. Rapel dozu çocuk 18. ayda alacaktır.',
                '12. aya ulaştığında KKK 1, Suçiçeği 1 ve KPA rapeli planlanır.'
            ]
        });
    }

    return {
        ageInMonths,
        ageYearsFormatted: ageYears,
        ageGroupLabel: ageInMonths < 12 
            ? `${ageInMonths} Aylık Süt Çocuğu` 
            : (ageInMonths < 72 ? `${ageYears} Yaş (${ageInMonths} Ay) Çocuk` : `${ageYears} Yaş (Okul Çağı/Adölesan)`),
        targetScenario,
        scenarioKey,
        familyCanReturnIn3Days,
        eliminatedVaccines: eliminated,
        visits,
        minimumIntervals,
        goldRules,
        clinicalTraps,
        quickBadge
    };
}
