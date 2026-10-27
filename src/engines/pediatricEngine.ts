// Pediatric Engine: Şurup dozu, Aşı takvimi, AAP Tansiyon, Centor/McIsaac, Adult Cap & IBW
import { getGrowthNorms, calculateRestrictedLMSZScore } from './percentileEngine';

export interface IdealBodyWeightInput {
    ageMonths: number;
    gender?: 'male' | 'female' | string;
    heightCm: number;
    weightKg: number;
}

export interface IdealBodyWeightResult {
    ibwKg: number;
    adjBwKg: number;
    bmi: number;
    bmi50: number;
    bmiZScore: number;
    isObese: boolean;
    isOverweight: boolean;
}

/**
 * Çocukluk Çağı Obezitesinde İdeal Vücut Ağırlığı (IBW) ve Düzeltilmiş Ağırlık (AdjBW)
 * Dosya 2 (PPAG Kılavuzu) Formülü:
 * IBW = BMI_50 * (Boy in m)^2
 * AdjBW = IBW + 0.4 * (TBW - IBW)
 */
export function calculateIdealBodyWeight({
    ageMonths,
    gender = 'male',
    heightCm,
    weightKg
}: IdealBodyWeightInput): IdealBodyWeightResult | null {
    if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0 || ageMonths === null || ageMonths === undefined || isNaN(ageMonths)) {
        return null;
    }

    const heightM = heightCm / 100;
    const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
    const norms = getGrowthNorms(ageMonths, gender, 'neyzi_2015');
    const bmi50 = Math.round(norms.bmi.m * 10) / 10;

    // IBW = BMI_50 * (Boy in m)^2
    const ibwKg = Math.round(bmi50 * (heightM * heightM) * 10) / 10;
    
    // AdjBW = IBW + 0.4 * (TBW - IBW)
    const adjBwKg = Math.round((ibwKg + 0.4 * Math.max(0, weightKg - ibwKg)) * 10) / 10;

    // LMS Z-skoru hesaplaması
    const bmiZScoreRaw = calculateRestrictedLMSZScore(bmi, norms.bmi.l, norms.bmi.m, norms.bmi.s);
    const bmiZScore = bmiZScoreRaw !== null ? Math.round(bmiZScoreRaw * 100) / 100 : 0;
    
    // ≥ 95. persentil (Z ≥ +1.645 SD) Obez, 85-95. persentil (Z ≥ +1.036 SD) Fazla Kilolu
    const isObese = bmiZScore >= 1.645;
    const isOverweight = bmiZScore >= 1.036 && bmiZScore < 1.645;

    return {
        ibwKg,
        adjBwKg,
        bmi,
        bmi50,
        bmiZScore,
        isObese,
        isOverweight
    };
}

export interface PediatricDoseResult {
    name: string;
    targetDoseMg: number;
    volumeMl: number | null;
    metricDoseText: string;
    syringeWarning: string;
    freq: string;
    isLocked?: boolean;
    lockReason?: string;
    concentrationText?: string;
    olcekText?: string; // Strictly metric backward-compatible string without "ölçek" / "kaşık"
    // Adım 6: Adult Cap & Obezite Kalkanı
    isCapped?: boolean;
    uncappedDoseMg?: number;
    maxDoseCeiling?: number;
    maxDailyDoseMg?: number;
    capNotice?: string;
    isObeseAlert?: boolean;
    tbwKg?: number;
    ibwKg?: number;
    adjBwKg?: number;
    ibwDoseMg?: number;
    ibwVolumeMl?: number | null;
    obesityWarning?: string;
    usedWeightType?: 'TBW' | 'IBW';
    // Adım 7: Kontrendikasyon Hard Stopları, İkili Eşik & Amoksisilin Oran Kilidi
    isBlocked?: boolean;
    blockReason?: string;
    hasDualStandardAlert?: boolean;
    dualStandardWarning?: string;
    hasSoftStopWarning?: boolean;
    softStopReason?: string;
    ratio?: '7:1' | '14:1';
    ratioNotice?: string;
    negativeGuidelineWarning?: string;
    offLabelNotice?: string;
    confusionWarning?: string;
    reconstitutionStability?: string;
    indicationBandNote?: string;
    ageWarning?: string;
}

export interface CommercialSyrupProfile {
    name: string;
    doseMgPerKg: number;
    maxDose: number;            // Mutlak erişkin tek doz tavanı (mg)
    maxDailyDose?: number;      // Mutlak erişkin günlük azami tavan (mg)
    concentration: number;      // mg per mL (if 0 or <= 0, concentration lock is triggered)
    freq: string;
    concentrationText?: string;
    isHydrophilic?: boolean;    // Obez çocuklarda IBW gerektiren hidrofilik ajanlar (örn. Parasetamol)
    ratio?: '7:1' | '14:1';
    reconstitutionStability?: string;
    confusionWarning?: string;
    negativeGuidelineWarning?: string;
    offLabelNotice?: string;
}

export const PEDIATRIC_SYRUPS: Record<string, CommercialSyrupProfile> = {
    // Parasetamol
    'paracetamol_120': {
        name: 'Parasetamol (120 mg / 5 mL - Calpol / Parol)',
        doseMgPerKg: 15,
        maxDose: 1000,
        maxDailyDose: 4000,
        concentration: 120 / 5, // 24 mg/mL
        freq: '4-6 saatte bir (Maks 4 doz/gün, en az 4 saat ara)',
        concentrationText: '120 mg / 5 mL (24 mg/mL)',
        isHydrophilic: true
    },
    'paracetamol_250': {
        name: 'Parasetamol (250 mg / 5 mL - Calpol 6 Plus / Parol Plus)',
        doseMgPerKg: 15,
        maxDose: 1000,
        maxDailyDose: 4000,
        concentration: 250 / 5, // 50 mg/mL
        freq: '4-6 saatte bir (Maks 4 doz/gün, en az 4 saat ara)',
        concentrationText: '250 mg / 5 mL (50 mg/mL)',
        isHydrophilic: true
    },
    'paracetamol_no_conc': {
        name: 'Parasetamol (Konsantrasyon Belirtilmedi 🔒)',
        doseMgPerKg: 15,
        maxDose: 1000,
        maxDailyDose: 4000,
        concentration: 0,
        freq: '4-6 saatte bir (Maks 4 doz/gün)',
        concentrationText: undefined,
        isHydrophilic: true
    },

    // İbuprofen
    'ibuprofen_100': {
        name: 'İbuprofen (100 mg / 5 mL - Dolven / Pedifen / Supafen)',
        doseMgPerKg: 10,
        maxDose: 400,
        maxDailyDose: 1200,
        concentration: 100 / 5, // 20 mg/mL
        freq: '6-8 saatte bir (Tok karnına, maks 30-40 mg/kg/gün)',
        concentrationText: '100 mg / 5 mL (20 mg/mL)',
        isHydrophilic: false
    },

    // Amoksisilin-Klavulanat
    'amoklavin_200': {
        name: 'Amoksisilin-Klavulanat (BID 200/28.5 mg / 5 mL - 7:1)',
        doseMgPerKg: 20, // 40 mg/kg/gün amoksisilin bazında / 2 doz
        maxDose: 1000,
        maxDailyDose: 2000,
        concentration: 200 / 5, // 40 mg/mL amoksisilin
        freq: '12 saatte bir (Hafif-orta enfeksiyon, tok karnına)',
        concentrationText: '200/28.5 mg / 5 mL (40 mg/mL Amoksisilin - 7:1)',
        isHydrophilic: false,
        ratio: '7:1',
        reconstitutionStability: '🧊 Saklama Koşulu: Sulandırıldıktan sonra buzdolabında (2-8°C) saklanmalı, dondurulmamalı ve 7-10 gün içinde tüketilmelidir.'
    },
    'amoklavin_400': {
        name: 'Amoksisilin-Klavulanat (BID 400/57 mg / 5 mL - 7:1)',
        doseMgPerKg: 20, // 40 mg/kg/gün amoksisilin bazında / 2 doz
        maxDose: 1000,
        maxDailyDose: 2000,
        concentration: 400 / 5, // 80 mg/mL amoksisilin
        freq: '12 saatte bir (Standart enfeksiyon, tok karnına)',
        concentrationText: '400/57 mg / 5 mL (80 mg/mL Amoksisilin - 7:1)',
        isHydrophilic: false,
        ratio: '7:1',
        reconstitutionStability: '🧊 Saklama Koşulu: Sulandırıldıktan sonra buzdolabında (2-8°C) saklanmalı, dondurulmamalı ve 7-10 gün içinde tüketilmelidir.'
    },
    'amoklavin_600': {
        name: 'Amoksisilin-Klavulanat ES (600/42.9 mg / 5 mL - 14:1)',
        doseMgPerKg: 45, // 90 mg/kg/gün amoksisilin bazında / 2 doz (Yüksek Doz AOM)
        maxDose: 2000,
        maxDailyDose: 4000,
        concentration: 600 / 5, // 120 mg/mL amoksisilin
        freq: '12 saatte bir (Yüksek Doz AOM / Dirençli Pnömokok - 14:1 ES)',
        concentrationText: '600/42.9 mg / 5 mL (120 mg/mL Amoksisilin - 14:1 ES)',
        isHydrophilic: false,
        ratio: '14:1',
        reconstitutionStability: '🧊 Saklama Koşulu: Sulandırıldıktan sonra buzdolabında (2-8°C) saklanmalı, dondurulmamalı ve 10 gün içinde tüketilmelidir.'
    },

    // Sefalosporinler & Makrolidler
    'cefuroxime_125': {
        name: 'Sefuroksim Aksetil (125 mg / 5 mL - Zinnat 125)',
        doseMgPerKg: 15, // 30 mg/kg/gün / 2 doz
        maxDose: 500,
        maxDailyDose: 1000,
        concentration: 125 / 5, // 25 mg/mL
        freq: '12 saatte bir (Yemekle birlikte)',
        concentrationText: '125 mg / 5 mL (25 mg/mL)',
        isHydrophilic: false,
        reconstitutionStability: '🧊 Saklama Koşulu: Sulandırıldıktan sonra buzdolabında (2-8°C) saklanmalı, 10 gün stabildir.'
    },
    'cefuroxime_250': {
        name: 'Sefuroksim Aksetil (250 mg / 5 mL - Zinnat 250)',
        doseMgPerKg: 15,
        maxDose: 500,
        maxDailyDose: 1000,
        concentration: 250 / 5, // 50 mg/mL
        freq: '12 saatte bir (Yemekle birlikte)',
        concentrationText: '250 mg / 5 mL (50 mg/mL)',
        isHydrophilic: false,
        reconstitutionStability: '🧊 Saklama Koşulu: Sulandırıldıktan sonra buzdolabında (2-8°C) saklanmalı, 10 gün stabildir.'
    },
    'cefixime_100': {
        name: 'Sefiksim (100 mg / 5 mL - Suprax / Zimaks)',
        doseMgPerKg: 8,
        maxDose: 400,
        maxDailyDose: 400,
        concentration: 100 / 5, // 20 mg/mL
        freq: 'Günde tek doz (veya 12 saatte bir 4 mg/kg)',
        concentrationText: '100 mg / 5 mL (20 mg/mL)',
        isHydrophilic: false,
        reconstitutionStability: '🧊 Saklama Koşulu: Sulandırıldıktan sonra oda sıcaklığında veya buzdolabında (2-8°C) 14 gün stabildir.'
    },
    'azithromycin_200': {
        name: 'Azitromisin (200 mg / 5 mL - Zitromax)',
        doseMgPerKg: 10,
        maxDose: 500,
        maxDailyDose: 500,
        concentration: 200 / 5, // 40 mg/mL
        freq: 'Günde 1 kez (3 gün süresince, aç karnına)',
        concentrationText: '200 mg / 5 mL (40 mg/mL)',
        isHydrophilic: false,
        reconstitutionStability: '🌡️ Saklama Koşulu: Sulandırıldıktan sonra oda sıcaklığında (15-25°C) saklanmalı, 5 gün stabildir.'
    },
    'clarithromycin_125': {
        name: 'Klaritromisin (125 mg / 5 mL - Klacid 125)',
        doseMgPerKg: 7.5, // 15 mg/kg/gün / 2 doz
        maxDose: 500,
        maxDailyDose: 1000,
        concentration: 125 / 5, // 25 mg/mL
        freq: '12 saatte bir',
        concentrationText: '125 mg / 5 mL (25 mg/mL)',
        isHydrophilic: false,
        reconstitutionStability: '🌡️ Saklama Koşulu: Sulandırıldıktan sonra ODA SICAKLIĞINDA (15-30°C) saklanmalıdır; buzdolabına konulursa acı tat kristalleşir! (14 gün stabildir).'
    },
    'clarithromycin_250': {
        name: 'Klaritromisin (250 mg / 5 mL - Klacid Forte 250)',
        doseMgPerKg: 7.5,
        maxDose: 500,
        maxDailyDose: 1000,
        concentration: 250 / 5, // 50 mg/mL
        freq: '12 saatte bir',
        concentrationText: '250 mg / 5 mL (50 mg/mL)',
        isHydrophilic: false,
        reconstitutionStability: '🌡️ Saklama Koşulu: Sulandırıldıktan sonra ODA SICAKLIĞINDA (15-30°C) saklanmalıdır; buzdolabına konulursa acı tat kristalleşir! (14 gün stabildir).'
    },

    // Diğer Pediatrik Sıvı İlaçlar
    'tmp_smx_200_40': {
        name: 'Trimetoprim-Sulfametoksazol (40/200 mg / 5 mL - Bactrim)',
        doseMgPerKg: 4, // TMP bazında (8 mg/kg/gün TMP 2'ye bölünmüş)
        maxDose: 160,
        maxDailyDose: 320,
        concentration: 40 / 5, // 8 mg TMP/mL
        freq: '12 saatte bir (TMP içeriğine göre hesaplanmıştır)',
        concentrationText: '40 mg TMP + 200 mg SMX / 5 mL (8 mg TMP/mL)',
        isHydrophilic: false
    },
    'ondansetron_4': {
        name: 'Ondansetron (4 mg / 5 mL - Zofran)',
        doseMgPerKg: 0.15,
        maxDose: 8,
        maxDailyDose: 16,
        concentration: 4 / 5, // 0.8 mg/mL
        freq: 'Akut gastroenteritte tek oral doz (veya 8 saatte bir)',
        concentrationText: '4 mg / 5 mL (0.8 mg/mL)',
        isHydrophilic: false,
        offLabelNotice: 'ℹ️ TİTCK KÜB & Kılavuz Karşılaştırması: KÜB\'de akut gastroenterit ruhsatı yoktur (kemoterapi ve post-op onaylıdır); ancak AAP, NICE ve Canadian Paediatric Society hafif-orta dehidratasyonlu viral AGE kusmasında tek doz oral ondansetronu Düzey 1 kanıtla önermektedir.'
    },
    'hydroxyzine_10': {
        name: 'Hidroksizin (10 mg / 5 mL - Atarax)',
        doseMgPerKg: 0.5,
        maxDose: 25,
        maxDailyDose: 100,
        concentration: 10 / 5, // 2 mg/mL
        freq: 'Gece yatarken (veya 6-8 saatte bir)',
        concentrationText: '10 mg / 5 mL (2 mg/mL)',
        isHydrophilic: false
    },
    'cetirizine_5': {
        name: 'Setirizin (5 mg / 5 mL - Zyrtec / Allerset)',
        doseMgPerKg: 0.25,
        maxDose: 10,
        maxDailyDose: 10,
        concentration: 5 / 5, // 1 mg/mL
        freq: 'Günde 1 kez (veya 12 saatte bir bölünmüş)',
        concentrationText: '5 mg / 5 mL (1 mg/mL)',
        isHydrophilic: false
    },
    'loratadine_5': {
        name: 'Loratadin (5 mg / 5 mL - Claritine)',
        doseMgPerKg: 0.25,
        maxDose: 10,
        maxDailyDose: 10,
        concentration: 5 / 5, // 1 mg/mL
        freq: 'Günde 1 kez tek doz',
        concentrationText: '5 mg / 5 mL (1 mg/mL)',
        isHydrophilic: false
    },
    'prednisolone_5': {
        name: 'Prednizolon (5 mg / 5 mL - Prednol)',
        doseMgPerKg: 1,
        maxDose: 40,
        maxDailyDose: 60,
        concentration: 5 / 5, // 1 mg/mL
        freq: 'Günde 1-2 kez (3-5 gün kısa kür)',
        concentrationText: '5 mg / 5 mL (1 mg/mL)',
        isHydrophilic: false
    },
    'iron_fe3_syrup': {
        name: 'Demir III Polimaltoz (50 mg / 5 mL - Ferrum Hausmann Şurup)',
        doseMgPerKg: 3,
        maxDose: 100,
        maxDailyDose: 200,
        concentration: 50 / 5, // 10 mg/mL elementer demir
        freq: 'Günde 1-2 doza bölünmüş (Yemekle veya yemekten sonra)',
        concentrationText: '50 mg / 5 mL (10 mg/mL Elementer Fe)',
        isHydrophilic: false,
        confusionWarning: '⚠️ Damla ve Şurup Ayrımı: Ferrum Hausmann Şurup (50 mg/5 mL = 10 mg/mL) ile Ferrum Damla (50 mg/mL, 1 damla = 2.5 mg Fe) formülasyonlarını karıştırmayınız!'
    },
    'salbutamol_syrup': {
        name: 'Salbutamol (2 mg / 5 mL - Ventolin Şurup)',
        doseMgPerKg: 0.1,
        maxDose: 4,
        maxDailyDose: 12,
        concentration: 2 / 5, // 0.4 mg/mL
        freq: '6-8 saatte bir (Oral şurup formu)',
        concentrationText: '2 mg / 5 mL (0.4 mg/mL)',
        isHydrophilic: false,
        negativeGuidelineWarning: '⚠️ GINA / AAP Negatif Kılavuz Uyarısı: Oral beta-2 agonist şurup formu astım alevlenmesinde ÖNERİLMEZ; taşikardi ve kas titremesi riski yüksektir, inhaler form altın standarttır.'
    },
    'codeine_syrup': {
        name: 'Kodein Şurup (5 mg / 5 mL - 🛑 <12 Yaş Kontrendike)',
        doseMgPerKg: 0.5,
        maxDose: 30,
        maxDailyDose: 120,
        concentration: 5 / 5, // 1 mg/mL
        freq: '6 saatte bir (Semptomatik, q6h)',
        concentrationText: '5 mg / 5 mL (1 mg/mL)',
        isHydrophilic: false
    },
    'tramadol_drop': {
        name: 'Tramadol Damla (100 mg / mL - Contramal 🛑 <12 Yaş Kontrendike)',
        doseMgPerKg: 1,
        maxDose: 50,
        maxDailyDose: 400,
        concentration: 100, // 100 mg/mL (1 damla = 2.5 mg)
        freq: '6-8 saatte bir (q6-8h)',
        concentrationText: '100 mg / mL (2.5 mg/damla - 40 damla/mL)',
        isHydrophilic: false,
        confusionWarning: '⚠️ Damla Formülasyonu: 1 mL = 40 damla = 100 mg (1 damla = 2.5 mg tramadol). Şurup hacmi ile karıştırmayınız!'
    }
};

// Aliases for full backward compatibility
PEDIATRIC_SYRUPS['paracetamol'] = PEDIATRIC_SYRUPS['paracetamol_120'];
PEDIATRIC_SYRUPS['ibuprofen'] = PEDIATRIC_SYRUPS['ibuprofen_100'];
PEDIATRIC_SYRUPS['laroxyl_25'] = PEDIATRIC_SYRUPS['hydroxyzine_10'];
PEDIATRIC_SYRUPS['codeine'] = PEDIATRIC_SYRUPS['codeine_syrup'];
PEDIATRIC_SYRUPS['tramadol'] = PEDIATRIC_SYRUPS['tramadol_drop'];
PEDIATRIC_SYRUPS['salbutamol'] = PEDIATRIC_SYRUPS['salbutamol_syrup'];

export interface PediatricDoseOptions {
    ageMonths?: number | null;
    ageDays?: number | null;
    ageYears?: number | null;
    heightCm?: number | null;
    gender?: 'male' | 'female' | string;
    useIbw?: boolean;
    allowOffLabelTitck?: boolean;
    allowSoftStop?: boolean;
    indication?: 'general' | 'gastroenteritis' | 'aom_high_dose' | 'pain_fever' | string;
}

export function calculatePediatricDose(
    weightKgOrInput: number | ({ weightKg: number; drugKey: string } & PediatricDoseOptions) | null | undefined, 
    drugKeyArg?: string,
    optionsArg?: PediatricDoseOptions
): PediatricDoseResult | null {
    let weightKg: number | null | undefined;
    let drugKey: string;
    let options: PediatricDoseOptions = {};

    if (typeof weightKgOrInput === 'object' && weightKgOrInput !== null) {
        weightKg = weightKgOrInput.weightKg;
        drugKey = weightKgOrInput.drugKey;
        options = weightKgOrInput;
    } else {
        weightKg = weightKgOrInput;
        drugKey = drugKeyArg || '';
        options = optionsArg || {};
    }

    if (!weightKg || weightKg <= 0 || !drugKey) return null;

    const drug = PEDIATRIC_SYRUPS[drugKey];
    if (!drug) return null;

    // Yaş normalizasyonu (ay ve gün cinsinden)
    let effectiveAgeMonths: number | null = null;
    if (options.ageMonths !== undefined && options.ageMonths !== null && !isNaN(options.ageMonths)) {
        effectiveAgeMonths = options.ageMonths;
    } else if (options.ageDays !== undefined && options.ageDays !== null && !isNaN(options.ageDays)) {
        effectiveAgeMonths = options.ageDays / 30.4375;
    } else if (options.ageYears !== undefined && options.ageYears !== null && !isNaN(options.ageYears)) {
        effectiveAgeMonths = options.ageYears * 12;
    }

    let effectiveAgeDays: number | null = null;
    if (options.ageDays !== undefined && options.ageDays !== null && !isNaN(options.ageDays)) {
        effectiveAgeDays = options.ageDays;
    } else if (effectiveAgeMonths !== null) {
        effectiveAgeDays = Math.round(effectiveAgeMonths * 30.4375);
    }

    // A. KODEİN & TRAMADOL KONTRENDİKASYON HARD STOP (<12 Yaş / CYP2D6 Polimorfizmi)
    if (drugKey === 'codeine_syrup' || drugKey === 'tramadol_drop' || drugKey.startsWith('codeine') || drugKey.startsWith('tramadol')) {
        if (effectiveAgeMonths === null) {
            return {
                name: drug.name,
                targetDoseMg: 0,
                volumeMl: null,
                metricDoseText: '0 mg (0 mL) - YAŞ BİLGİSİ ZORUNLUDUR 🛑',
                syringeWarning: '🛑 YAŞ BİLGİSİ GEREKLİ: Kodein ve tramadol <12 yaş çocuklarda CYP2D6 toksisitesi nedeniyle kesin kontrendikedir.',
                freq: 'YAŞ GEREKLİ',
                isLocked: true,
                isBlocked: true,
                blockReason: '🛑 YAŞ BİLGİSİ ZORUNLUDUR: Kodein ve tramadol <12 yaş çocuklarda ve emziren annelerde CYP2D6 ultra-hızlı metabolizör toksisitesi (ölümcül solunum arresti) riski nedeniyle kesin kontrendikedir (FDA Black Box / EMA PRAC). Güvenli doz hesabı için hastanın yaşı girilmelidir.',
                olcekText: 'YAŞ GİRİNİZ (BLOKE)',
                isCapped: false,
                tbwKg: weightKg
            };
        }
        if (effectiveAgeMonths < 144) {
            return {
                name: drug.name,
                targetDoseMg: 0,
                volumeMl: null,
                metricDoseText: '0 mg (0 mL) - REÇETE BLOKE EDİLDİ 🛑',
                syringeWarning: '🛑 KESİN KONTRENDİKASYON: 12 yaş altındaki çocuklarda kullanımı yasaktır.',
                freq: 'KONTRENDİKE',
                isLocked: true,
                isBlocked: true,
                blockReason: '🛑 KESİN KONTRENDİKASYON (FDA Black Box / EMA PRAC): CYP2D6 ultra-hızlı metabolizör toksisitesi nedeniyle <12 yaş çocuklarda ve emziren annelerde ölümcül morfin intoksikasyonu ve solunum arresti riski! Reçete BLOKE edilmiştir.',
                olcekText: 'KONTRENDİKE (BLOKE)',
                isCapped: false,
                tbwKg: weightKg
            };
        }
    }

    // B. TRİMETOPRİM-SULFAMETOKSAZOL (BACTRIM) İKİ KATMANLI NEONATAL GÜVENLİK MOTORU
    // Katman 1: <42 Gün (<6 Hafta) -> TİTCK KÜB Mutlak Kontrendikasyon (HARD_STOP)
    // Katman 2: 42 - 60 Gün arası -> AAP Red Book Kesintiye Uğratıcı Onay (SOFT_STOP)
    let hasSoftStopWarning = false;
    let softStopReason: string | undefined;

    if (drugKey === 'tmp_smx_200_40' || drugKey.startsWith('tmp_smx')) {
        if (effectiveAgeMonths === null && effectiveAgeDays === null) {
            return {
                name: drug.name,
                targetDoseMg: 0,
                volumeMl: null,
                metricDoseText: '0 mg (0 mL) - YAŞ BİLGİSİ ZORUNLUDUR 🛑',
                syringeWarning: '🛑 YAŞ BİLGİSİ GEREKLİ: TMP-SMX yaşamın ilk 6–8 haftasında kernikterus riski nedeniyle kontrendikedir.',
                freq: 'YAŞ GEREKLİ',
                isLocked: true,
                isBlocked: true,
                blockReason: '🛑 YAŞ BİLGİSİ ZORUNLUDUR (TİTCK KÜB & AAP Red Book): Trimetoprim-Sulfametoksazol postnatal <42 gün (TİTCK KÜB: 6 hafta altı kontrendikedir) ve <60 gün (AAP Red Book / FDA etiketi: 2 ay altı) infantlarda bilirubini albüminden kopararak ölümcül Kernikterus riski yaratır. Güvenli doz hesabı için bebeğin postnatal yaşı (gün veya ay) girilmelidir.',
                olcekText: 'YAŞ GİRİNİZ (BLOKE)',
                isCapped: false,
                tbwKg: weightKg
            };
        }

        const isUnder42Days = (options.ageDays !== undefined && options.ageDays !== null)
            ? options.ageDays < 42
            : (effectiveAgeMonths !== null && effectiveAgeMonths < (42 / 30.4375));
        
        if (isUnder42Days) {
            return {
                name: drug.name,
                targetDoseMg: 0,
                volumeMl: null,
                metricDoseText: '0 mg (0 mL) - REÇETE BLOKE EDİLDİ 🛑',
                syringeWarning: '🛑 KESİN KONTRENDİKASYON (HARD_STOP): Yaşamın ilk 6 haftasında (postnatal <42 gün) kontrendikedir.',
                freq: 'KONTRENDİKE',
                isLocked: true,
                isBlocked: true,
                blockReason: '🛑 KESİN KONTRENDİKASYON (TİTCK KÜB - HARD_STOP): Yaşamın ilk 6 haftasında (postnatal <42 gün) sülfametoksazol serbest bilirubini albüminden kopararak ölümcül Kernikterus riski yaratır. Kesinlikle kontrendikedir! Hesaplama tamamen kilitlenmiştir.',
                olcekText: 'KONTRENDİKE (BLOKE)',
                isCapped: false,
                tbwKg: weightKg
            };
        }

        const isBetween42And60Days = (options.ageDays !== undefined && options.ageDays !== null)
            ? (options.ageDays >= 42 && options.ageDays <= 60)
            : (effectiveAgeMonths !== null && effectiveAgeMonths >= (42 / 30.4375) && effectiveAgeMonths <= (60 / 30.4375));

        if (isBetween42And60Days) {
            if (!options.allowSoftStop && !options.allowOffLabelTitck) {
                return {
                    name: drug.name,
                    targetDoseMg: 0,
                    volumeMl: null,
                    metricDoseText: '0 mg (0 mL) - HEKİM ONAYI BEKLENİYOR ⚠️',
                    syringeWarning: '⚠️ KESİNTİYE UĞRATICI UYARI (SOFT_STOP): 42-60 gün arası kernikterus riski nedeniyle hekim onayı gereklidir.',
                    freq: 'BEKLEMEDE',
                    isLocked: true,
                    isBlocked: true,
                    hasSoftStopWarning: true,
                    softStopReason: '⚠️ HEKİM ONAYI BEKLENİYOR (AAP Red Book - SOFT_STOP): Postnatal 42-60 gün arası bebeklerde kernikterus riski nedeniyle hekim tarafından sarılık ve prematürite olmadığı teyit edilmelidir. Onay verilmeden doz hesaplanamaz.',
                    blockReason: '⚠️ HEKİM ONAYI BEKLENİYOR (AAP Red Book - SOFT_STOP): 42-60 gün arası kernikterus riski (Hekim sarılık/prematürite olmadığını onaylarsa hesaplanır).',
                    olcekText: 'ONAY BEKLENİYOR (SOFT_STOP)',
                    isCapped: false,
                    tbwKg: weightKg
                };
            } else {
                hasSoftStopWarning = true;
                softStopReason = '⚠️ KESİNTİYE UĞRATICI ONAY GEÇİLDİ (SOFT_STOP_OVERRIDDEN): Hekim sarılık ve prematürite olmadığını teyit etti. Doz 4 mg/kg TMP (12 saatte bir) olarak hesaplandı.';
            }
        }
    }

    // C. İBUPROFEN İKİLİ EŞİK (TİTCK vs BNFc/EMA/AAP) VE MUTLAK ALT SINIR DENETİMİ
    let hasDualStandardAlert = false;
    let dualStandardWarning: string | undefined;

    if (drugKey === 'ibuprofen' || drugKey === 'ibuprofen_100') {
        const isAgeKnown = (options.ageDays !== undefined && options.ageDays !== null) || (effectiveAgeMonths !== null);
        const isUnder3Months = (options.ageDays !== undefined && options.ageDays !== null)
            ? options.ageDays < 90
            : (effectiveAgeMonths !== null && effectiveAgeMonths < 3);
        const isUnder5Kg = weightKg < 5.0;

        // Mutlak Alt Sınır: <3 ay veya <5 kg -> Farmakokinetik ve renal immatürite
        if (isUnder3Months || isUnder5Kg) {
            return {
                name: drug.name,
                targetDoseMg: 0,
                volumeMl: null,
                metricDoseText: '0 mg (0 mL) - REÇETE BLOKE EDİLDİ 🛑',
                syringeWarning: '🛑 KESİN KONTRENDİKASYON: <3 ay veya <5 kg infantlarda kontrendikedir.',
                freq: 'KONTRENDİKE',
                isLocked: true,
                isBlocked: true,
                blockReason: '🛑 KESİN KONTRENDİKASYON: İbuprofen <3 ay veya <5 kg infantlarda farmakokinetik ve renal immatürite nedeniyle kontrendikedir (BNFc: Yalnızca 2–3 aylık infantlarda MenB Meningokok aşı sonrası ateş için hekim gözetiminde dar bir istisna tanımlanmıştır).',
                olcekText: 'KONTRENDİKE (BLOKE)',
                isCapped: false,
                tbwKg: weightKg
            };
        }

        const isUnder6Months = (options.ageDays !== undefined && options.ageDays !== null)
            ? options.ageDays < 180
            : (effectiveAgeMonths !== null && effectiveAgeMonths < 6);
        const isUnder7Kg = weightKg < 7.0;

        // TİTCK Eşiği: <6 ay veya <7 kg -> TİTCK onaylı KÜB'de önerilmez
        if (isUnder6Months || isUnder7Kg) {
            if (!options.allowOffLabelTitck) {
                return {
                    name: drug.name,
                    targetDoseMg: 0,
                    volumeMl: null,
                    metricDoseText: '0 mg (0 mL) - TİTCK RUHSAT KİLİDİ ⚠️',
                    syringeWarning: '⚠️ TİTCK KÜB Uyarısı: <6 ay veya <7 kg çocuklarda hekim bilinçli onayı olmadan kullanılamaz.',
                    freq: 'HEKİM ONAYI GEREKLİ',
                    isLocked: true,
                    isBlocked: true,
                    hasDualStandardAlert: true,
                    blockReason: isUnder7Kg
                        ? '⚠️ TİTCK KÜB Ruhsat Sınırı Uyarısı: Vücut ağırlığı 7 kg altındadır. TİTCK KÜB uyarınca 7 kg altındaki çocuklarda renal papiller nekroz riski nedeniyle kullanımı önerilmemektedir. Hekim onayı olmadan mL dozu hesaplanamaz. (Uluslararası kılavuzlar ≥3 ay ve ≥5 kg için izin verir).'
                        : '⚠️ TİTCK KÜB Ruhsat Sınırı Uyarısı: Hasta 6 aydan küçüktür. TİTCK KÜB uyarınca 6 aydan küçük bebeklerde renal papiller nekroz riski nedeniyle kullanımı önerilmemektedir. Hekim onayı olmadan mL dozu hesaplanamaz. (Uluslararası kılavuzlar ≥3 ay ve ≥5 kg için izin verir).',
                    dualStandardWarning: '⚠️ TİTCK Ruhsat Sınırı Uyarısı (<6 ay veya <7 kg): Hasta 6 aydan küçük veya 7 kg altındadır. TİTCK onaylı KÜB uyarınca bu yaş/kilo grubunda renal papiller nekroz riski nedeniyle önerilmemektedir. Uluslararası kılavuzlar (BNFc, EMA, AAP: ≥3 ay ve ≥5 kg) dehidratasyon yokluğunda ve hekim onayıyla izin verir.',
                    olcekText: 'HEKİM ONAYI BEKLENİYOR',
                    isCapped: false,
                    tbwKg: weightKg
                };
            } else {
                hasDualStandardAlert = true;
                dualStandardWarning = '⚠️ TİTCK Ruhsat Sınırı Uyarısı (<6 ay veya <7 kg): Hasta 6 aydan küçük veya 7 kg altındadır. TİTCK onaylı KÜB uyarınca bu yaş/kilo grubunda renal papiller nekroz riski nedeniyle önerilmemektedir. Uluslararası kılavuzlar (BNFc, EMA, AAP: ≥3 ay ve ≥5 kg) dehidratasyon yokluğunda ve hekim inisiyatifinde izin verir.';
            }
        } else if (!isAgeKnown) {
            hasDualStandardAlert = true;
            dualStandardWarning = '⚠️ YAŞ BİLGİSİ BELİRTİLMEDİ: İbuprofen <3 ay infantlarda kontrendikedir (BNFc MenB aşı sonrası ateş dar istisnası hariç) ve TİTCK ruhsatı <6 ay için kısıtlıdır. Hastanın ≥3 ay (ve TİTCK için ≥6 ay) olduğu doğrulanmalıdır.';
        }
    }

    // D. AMOKSİSİLİN-KLAVULANAT 7:1 vs 14:1 (ES) ORAN KİLİDİ (TC-009, TC-010)
    let ratioNotice: string | undefined;
    if (drug.ratio === '7:1') {
        if (options.indication === 'aom_high_dose') {
            return {
                name: drug.name,
                targetDoseMg: 0,
                volumeMl: null,
                metricDoseText: '0 mg (0 mL) - ORAN KİLİDİ 🚫',
                syringeWarning: '🚫 7:1 Formülasyon ile yüksek doz AOM uygulanamaz.',
                freq: '14:1 ES GEREKLİ',
                isLocked: true,
                isBlocked: true,
                ratio: '7:1',
                blockReason: '🚫 Klavulanat Toksisitesi ve Şiddetli Diyare Riski: 90 mg/kg amoksisilin hedefine 7:1 formülasyon ile çıkılırsa klavulanik asit dozu toksik sınıra (12.8 mg/kg) ulaşır. Lütfen 14:1 (ES 600/42.9) formunu seçiniz veya standart doza (40-45 mg/kg) dönünüz.',
                ratioNotice: '🚫 Klavulanat Toksisitesi ve Şiddetli Diyare Riski: 80-90 mg/kg/gün amoksisilin dozu 7:1 formülasyonla verildiğinde günlük klavulanat dozu 12.8 mg/kg\'a ulaşır. Yüksek doz AOM rejimlerinde mutlaka 14:1 (ES 600/42.9 mg) formülasyonu tercih edilmelidir!',
                olcekText: '14:1 ES SEÇİNİZ',
                isCapped: false,
                tbwKg: weightKg
            };
        } else {
            ratioNotice = '🚫 Klavulanat Toksisitesi Uyarısı: 80-90 mg/kg/gün amoksisilin dozu 7:1 formülasyonla verildiğinde günlük klavulanat dozu 12.8 mg/kg\'a ulaşır. Yüksek doz AOM rejimlerinde mutlaka 14:1 (ES 600/42.9 mg) formülasyonu tercih edilmelidir!';
        }
    } else if (drug.ratio === '14:1') {
        ratioNotice = '✅ 14:1 ES Formülasyonu: Yüksek doz amoksisilin (90 mg/kg/gün) rejimlerinde klavulanat yükünü (6.4 mg/kg/gün) toksik eşik altında tutarak dirençli S. pneumoniae tedavisinde güvenle kullanılır.';
    }

    // E. ONDANSETRON KİLO BANDI VE GASTROENTERİT GÜVENLİK DENETİMİ (TC-012, TC-013)
    let ondansetronDoseMg: number | null = null;
    let indicationBandNote: string | undefined;

    if (drugKey === 'ondansetron_4' || drugKey.startsWith('ondansetron')) {
        if (effectiveAgeMonths === null) {
            return {
                name: drug.name,
                targetDoseMg: 0,
                volumeMl: null,
                metricDoseText: '0 mg (0 mL) - YAŞ BİLGİSİ ZORUNLUDUR 🛑',
                syringeWarning: '🛑 YAŞ BİLGİSİ GEREKLİ: Ondansetron <6 ay infantlarda önerilmez; yaş teyit edilmelidir.',
                freq: 'YAŞ GEREKLİ',
                isLocked: true,
                isBlocked: true,
                blockReason: '🛑 YAŞ BİLGİSİ ZORUNLUDUR (AAP / CPS / NICE): Ondansetron <6 ay infantlarda viral akut gastroenteritte güvenlik ve etkinlik verisi bulunmadığından ve altta yatan invajinasyon, sepsis, cerrahi obstrüksiyon gibi sistemik patolojileri maskeleme riski nedeniyle önerilmez. Güvenli doz hesabı için hastanın yaşı girilmelidir.',
                offLabelNotice: drug.offLabelNotice,
                olcekText: 'YAŞ GİRİNİZ (BLOKE)',
                isCapped: false,
                tbwKg: weightKg
            };
        }

        const isUnder6m = effectiveAgeMonths < 6;
        const isUnder8kg = weightKg < 8.0;

        if (isUnder6m || isUnder8kg) {
            return {
                name: drug.name,
                targetDoseMg: 0,
                volumeMl: null,
                metricDoseText: '0 mg (0 mL) - KONTRENDİKE / UYARI 🛑',
                syringeWarning: '🛑 AAP/CPS/NICE: <6 ay veya <8 kg infantlarda viral gastroenteritte önerilmez.',
                freq: 'KONTRENDİKE',
                isLocked: true,
                isBlocked: true,
                blockReason: '🛑 KONTRENDİKASYON / UYARI (AAP / CPS / NICE): <6 ay veya <8 kg infantlarda viral akut gastroenterit kusmasında antiemetik güvenlilik ve etkinlik verisi yetersizdir; altta yatan invajinasyon, sepsis, nekrotizan enterokolit veya cerrahi obstrüksiyonu maskeleme riski nedeniyle önerilmez. Öncelikli yaklaşım oral rehidrasyondur (ORS).',
                offLabelNotice: drug.offLabelNotice,
                olcekText: 'KONTRENDİKE (BLOKE)',
                isCapped: false,
                tbwKg: weightKg
            };
        }

        // Kılavuz kilo bandı: 8–15 kg: 2 mg (2.5 mL), 15.1–30 kg: 4 mg (5.0 mL), >30 kg: 8 mg (10.0 mL)
        if (options.indication === 'gastroenteritis' || (options.indication === undefined && weightKg <= 30.0)) {
            if (weightKg <= 15.0) {
                ondansetronDoseMg = 2;
            } else if (weightKg <= 30.0) {
                ondansetronDoseMg = 4;
            } else {
                ondansetronDoseMg = 8;
            }
            indicationBandNote = 'Akut Gastroenterit Kilo Bandı: 8-15 kg arası tek doz 2 mg (2.5 mL); 15.1-30 kg arası tek doz 4 mg (5.0 mL); >30 kg tek doz 8 mg (10.0 mL).';
        }
    }

    // F. DİĞER YAŞ VE GÜVENLİK SINIRLARI (Azitromisin, Klaritromisin, Sefiksim, Sefuroksim)
    let ageWarning: string | undefined;
    if (effectiveAgeMonths !== null) {
        if ((drugKey === 'azithromycin_200' || drugKey.startsWith('azithromycin')) && effectiveAgeMonths < 6) {
            ageWarning = '⚠️ Yaş Sınırı Uyarısı (<6 ay): Erken infant döneminde makrolid maruziyeti İnfantil Hipertrofik Pilor Stenozu (IHPS) riski taşır.';
        } else if ((drugKey === 'clarithromycin_125' || drugKey === 'clarithromycin_250' || drugKey.startsWith('clarithromycin')) && effectiveAgeMonths < 6) {
            ageWarning = '⚠️ Yaş Sınırı Uyarısı (<6 ay): Erken infant döneminde klaritromisin maruziyeti İnfantil Hipertrofik Pilor Stenozu (IHPS) ve QT uzaması riski taşır.';
        } else if ((drugKey === 'cefixime_100' || drugKey.startsWith('cefixime')) && effectiveAgeMonths < 6) {
            ageWarning = '⚠️ Yaş Sınırı Uyarısı (<6 ay): 6 ay altında farmakokinetik güvenlilik verisi yetersizdir.';
        } else if ((drugKey === 'cefuroxime_125' || drugKey === 'cefuroxime_250' || drugKey.startsWith('cefuroxime')) && effectiveAgeMonths < 3) {
            ageWarning = '⚠️ Yaş Sınırı Uyarısı (<3 ay): 3 ay altında intestinal absorpsiyon tutarsızdır.';
        }
    }

    // 1. Obezite ve İdeal Vücut Ağırlığı (IBW) Kontrolü (PPAG Guidelines)
    let ibwInfo: IdealBodyWeightResult | null = null;
    if (options.ageMonths !== undefined && options.ageMonths !== null && options.heightCm && options.heightCm > 0) {
        ibwInfo = calculateIdealBodyWeight({
            ageMonths: options.ageMonths,
            gender: options.gender || 'male',
            heightCm: options.heightCm,
            weightKg
        });
    }

    const isObese = ibwInfo ? ibwInfo.isObese : false;
    let activeWeightKg = weightKg;
    let usedWeightType: 'TBW' | 'IBW' = 'TBW';

    if (isObese && options.useIbw && ibwInfo) {
        activeWeightKg = ibwInfo.ibwKg;
        usedWeightType = 'IBW';
    }

    // 2. Kilo Bazlı Doz ve Yetişkin Tavan Doz Budaması (Adult Cap Clamping Engine)
    const rawDoseMg = ondansetronDoseMg !== null 
        ? ondansetronDoseMg 
        : Math.round(activeWeightKg * drug.doseMgPerKg * 10) / 10;
        
    const isCapped = drug.maxDose ? rawDoseMg > drug.maxDose : false;
    const targetDoseMg = isCapped ? drug.maxDose : rawDoseMg;

    let capNotice: string | undefined;
    if (isCapped) {
        capNotice = `🛡️ Yetişkin Tavan Doz Kilidi Aktif: Kilo bazlı hesaplanan ${rawDoseMg} mg dozu, azami yetişkin tek doz tavanı olan ${drug.maxDose} mg ile sınırlandırıldı. (Günlük azami tavan: ${drug.maxDailyDose || drug.maxDose * 4} mg).`;
    }

    // 3. Obezite Uyarısı ve IBW Karşılaştırma Dozu
    let isObeseAlert = false;
    let ibwDoseMg: number | undefined;
    let ibwVolumeMl: number | null | undefined;
    let obesityWarning: string | undefined;

    if (isObese && ibwInfo) {
        isObeseAlert = true;
        const rawIbwDose = ondansetronDoseMg !== null 
            ? ondansetronDoseMg 
            : Math.round(ibwInfo.ibwKg * drug.doseMgPerKg * 10) / 10;
        ibwDoseMg = drug.maxDose ? Math.min(rawIbwDose, drug.maxDose) : rawIbwDose;
        ibwVolumeMl = drug.concentration ? Math.round((ibwDoseMg / drug.concentration) * 10) / 10 : null;

        if (drug.isHydrophilic) {
            obesityWarning = `⚠️ Pediatrik Obezite Uyarısı (BMI > 95.p): Toplam vücut ağırlığı (${weightKg} kg) üzerinden hidrofilik parasetamol dozlaması hepatotoksisite ve toksik NAPQI birikimi riski taşır. İdeal Vücut Ağırlığı (IBW: ${ibwInfo.ibwKg} kg) üzerinden hesaplanan güvenli doz: ${ibwDoseMg} mg (${ibwVolumeMl !== null ? ibwVolumeMl + ' mL' : 'Hacim kilitli'}) önerilir.`;
        } else {
            obesityWarning = `ℹ️ Pediatrik Obezite Bildirimi (BMI > 95.p): Hasta obez persentildedir. Hesaplanan doz o endikasyondaki erişkin tavanı (${drug.maxDose} mg) ile sınırlandırılmıştır. İsteğe bağlı IBW dozu: ${ibwDoseMg} mg.`;
        }
    }

    // 4. Şişe Konsantrasyon Güvenlik Kilidi
    if (!drug.concentration || drug.concentration <= 0) {
        return {
            name: drug.name,
            targetDoseMg,
            volumeMl: null,
            metricDoseText: `${targetDoseMg} mg (Hacim kilitli 🔒)${usedWeightType === 'IBW' ? ' [IBW Bazlı]' : ''}`,
            syringeWarning: 'Ticari preparat konsantrasyonu (mg/5 mL veya mg/mL) seçilmeden hacim (mL) hesabı yapılamaz.',
            freq: drug.freq,
            isLocked: true,
            isBlocked: false,
            lockReason: '🔒 Hacim (mL) hesaplaması için lütfen ticari şişe konsantrasyonunu seçiniz.',
            concentrationText: drug.concentrationText,
            olcekText: 'Konsantrasyon seçilmedi (kilitli)',
            isCapped,
            uncappedDoseMg: isCapped ? rawDoseMg : undefined,
            maxDoseCeiling: drug.maxDose,
            maxDailyDoseMg: drug.maxDailyDose,
            capNotice,
            isObeseAlert,
            tbwKg: weightKg,
            ibwKg: ibwInfo?.ibwKg,
            adjBwKg: ibwInfo?.adjBwKg,
            ibwDoseMg,
            ibwVolumeMl,
            obesityWarning,
            usedWeightType,
            hasDualStandardAlert,
            dualStandardWarning,
            hasSoftStopWarning,
            softStopReason,
            ratio: drug.ratio,
            ratioNotice,
            negativeGuidelineWarning: drug.negativeGuidelineWarning,
            offLabelNotice: drug.offLabelNotice,
            confusionWarning: drug.confusionWarning,
            reconstitutionStability: drug.reconstitutionStability,
            indicationBandNote,
            ageWarning
        };
    }

    // 5. Hacim (mL) Hesabı ve 0.1 mL Enjektör Çizgisi Yuvarlaması (ISMP Standart)
    const rawVolume = targetDoseMg / drug.concentration;
    const volumeMl = Math.round(rawVolume * 10) / 10;
    const metricDoseText = `${targetDoseMg} mg (${volumeMl} mL)${usedWeightType === 'IBW' ? ' [IBW Bazlı Doz]' : ''}`;

    // <10 mL Dozlarda Oral Enjektör Güvenlik Kilidi
    let syringeWarning = '';
    if (volumeMl < 10) {
        syringeWarning = '⚠️ <10 mL Doz: Hatalı dozajı önlemek için ev tipi kaşık/ölçek kullanmayınız. Dozajı dereceli oral dozaj enjektörü ile uygulayınız.';
    } else {
        syringeWarning = 'ℹ️ Ölçüm Tavsiyesi: Dereceli oral şırınga veya mililitre (mL) taksimatlı tıbbi ölçü kabı ile uygulayınız.';
    }

    return {
        name: drug.name,
        targetDoseMg,
        volumeMl,
        metricDoseText,
        syringeWarning,
        freq: drug.freq,
        isLocked: false,
        isBlocked: false,
        concentrationText: drug.concentrationText,
        olcekText: `${volumeMl} mL (Oral Enjektör)`,
        isCapped,
        uncappedDoseMg: isCapped ? rawDoseMg : undefined,
        maxDoseCeiling: drug.maxDose,
        maxDailyDoseMg: drug.maxDailyDose,
        capNotice,
        isObeseAlert,
        tbwKg: weightKg,
        ibwKg: ibwInfo?.ibwKg,
        adjBwKg: ibwInfo?.adjBwKg,
        ibwDoseMg,
        ibwVolumeMl,
        obesityWarning,
        usedWeightType,
        hasDualStandardAlert,
        dualStandardWarning,
        hasSoftStopWarning,
        softStopReason,
        ratio: drug.ratio,
        ratioNotice,
        negativeGuidelineWarning: drug.negativeGuidelineWarning,
        offLabelNotice: drug.offLabelNotice,
        confusionWarning: drug.confusionWarning,
        reconstitutionStability: drug.reconstitutionStability,
        indicationBandNote,
        ageWarning
    };
}

export interface ComprehensiveVaccineScheduleResult {
    ageInMonths: number;
    routineVaccines: string[];
    specialVaccines: string[];
    rotavirusRule?: {
        eligible: boolean;
        windowStatus: 'NOT_YET' | 'OPTIMAL_FIRST_DOSE' | 'OPTIMAL_SUBSEQUENT_DOSE' | 'EXPIRED_CONTRAINDICATED';
        details: string;
        warning?: string;
    };
    meningococcalSchedule?: {
        eligible: boolean;
        recommendations: string[];
        details: string;
    };
    catchUpRules?: string[];
}

export function getVaccineSchedule(
    ageInMonths: number | null | undefined,
    options: { includeSpecial?: boolean } = {}
): string[] | null {
    if (ageInMonths === null || ageInMonths === undefined || isNaN(ageInMonths) || ageInMonths < 0) return null;
    
    let vaccines: string[] = [];
    if (ageInMonths < 1 && ageInMonths >= 0) vaccines = ["Hepatit B (1. Doz) - Doğumda"];
    else if (ageInMonths >= 1 && ageInMonths < 2) vaccines = ["Hepatit B (2. Doz)"];
    else if (ageInMonths >= 2 && ageInMonths < 4) {
        vaccines = ["BCG (Verem)", "KPA (1. Doz)", "DaBT-İPA-Hib-HepB (1. Doz)"];
        if (options.includeSpecial) {
            vaccines.push("Rotavirüs (1. Doz - Rotarix/RotaTeq: 6-14 hf 6 gün penceresi)", "MenB (1. Doz - Bexsero)", "MenACWY (Erken Doz - Nimenrix)");
        }
    }
    else if (ageInMonths >= 4 && ageInMonths < 6) {
        vaccines = ["KPA (2. Doz)", "DaBT-İPA-Hib-HepB (2. Doz)"];
        if (options.includeSpecial) {
            vaccines.push("Rotavirüs (2. Doz)", "MenB (2. Doz)");
        }
    }
    else if (ageInMonths >= 6 && ageInMonths < 9) {
        vaccines = ["DaBT-İPA-Hib-HepB (3. Doz)", "OPA (1. Doz)"];
        if (options.includeSpecial) {
            vaccines.push("Rotavirüs (3. Doz - RotaTeq için; en geç 32. haftada/8. ayda tamamlanmalı)", "İnfluenza (Grip - 6 aydan büyüklerde mevsimsel)");
        }
    }
    else if (ageInMonths >= 9 && ageInMonths < 12) {
        vaccines = ["KKK (Ek Doz)"];
        if (options.includeSpecial) {
            vaccines.push("MenACWY (1. Doz - Menveo/Nimenrix)");
        }
    }
    else if (ageInMonths >= 12 && ageInMonths < 18) {
        vaccines = ["KPA (Rapel)", "Suçiçeği", "KKK (1. Doz)"];
        if (options.includeSpecial) {
            vaccines.push("MenACWY (Rapel)", "MenB (Rapel)");
        }
    }
    else if (ageInMonths >= 18 && ageInMonths < 24) {
        vaccines = ["DaBT-İPA-Hib-HepB (Rapel)", "OPA (2. Doz)", "Hepatit A (1. Doz)"];
        if (options.includeSpecial) {
            vaccines.push("MenACWY / MenB (Eksik doz tamamlama)");
        }
    }
    else if (ageInMonths >= 24 && ageInMonths < 48) vaccines = ["Hepatit A (2. Doz)"];
    else if (ageInMonths >= 48 && ageInMonths < 156) {
        vaccines = ["KKK (2. Doz)", "DaBT-İPA (Rapel)"];
        if (options.includeSpecial && ageInMonths >= 108) {
            vaccines.push("HPV (9-14 yaş 2 doz şeması)");
        }
    }
    else if (ageInMonths >= 156 && ageInMonths < 216) {
        vaccines = ["Td (Rapel) - 13 Yaş"];
        if (options.includeSpecial) {
            vaccines.push("MenACWY (Adölesan tek rapel doz)", "HPV (3 doz şeması)");
        }
    }
    else if (ageInMonths >= 216 && ageInMonths < 780) vaccines = ["Erişkin Dönemi: Td (Tetanos-Difteri) Rapeli (10 yılda bir)"];
    else if (ageInMonths >= 780) vaccines = ["65 Yaş ve Üzeri: Pnömokok", "65 Yaş ve Üzeri: Yıllık Grip (İnfluenza)", "Td (Tetanos-Difteri) Rapeli"];

    return vaccines;
}

/**
 * Kapsamlı Pediatrik Aşı ve Yakalama (Catch-Up) Motoru
 * - Rotavirüs zaman pencereleri (ilk doz 6 - 14 hf 6 gün, son doz en geç 32. hafta)
 * - Meningokok (MenACWY ve MenB) özel aşı planlaması
 * - Gecikmiş aşı yakalama (Catch-up / CDC & Sağlık Bakanlığı) minimum aralık kuralları
 */
export function getComprehensiveVaccineSchedule(
    ageInMonths: number | null | undefined,
    options: { isDelayed?: boolean } = {}
): ComprehensiveVaccineScheduleResult | null {
    if (ageInMonths === null || ageInMonths === undefined || isNaN(ageInMonths) || ageInMonths < 0) return null;

    const routineVaccines = getVaccineSchedule(ageInMonths, { includeSpecial: false }) || [];
    const specialVaccines: string[] = [];

    // 1. Rotavirüs Zaman Penceresi Kuralları
    // Yaş haftası hesabı: 1 ay ~= 4.348 hafta
    const ageWeeks = ageInMonths * (365.25 / 12 / 7);
    let rotavirusRule: ComprehensiveVaccineScheduleResult['rotavirusRule'];

    if (ageWeeks < 6.0) {
        rotavirusRule = {
            eligible: false,
            windowStatus: 'NOT_YET',
            details: 'Rotavirüs aşısı en erken 6. haftadan (yaklaşık 1.5 ay) itibaren başlanabilir.'
        };
    } else if (ageWeeks >= 6.0 && ageWeeks <= 14.857) { // 14 hafta 6 gün ~= 14.86 hafta
        rotavirusRule = {
            eligible: true,
            windowStatus: 'OPTIMAL_FIRST_DOSE',
            details: 'Rotavirüs 1. Doz için altın standart zaman penceresi (6 hafta ile 14 hafta 6 gün arası). Rotarix (2 doz) veya RotaTeq (3 doz) başlanmalıdır.'
        };
        specialVaccines.push('Rotavirüs (1. Doz - Rotarix / RotaTeq)');
    } else if (ageWeeks > 14.857 && ageWeeks <= 32.0) { // 15 hafta ile 32 hafta (8 ay) arası
        rotavirusRule = {
            eligible: true,
            windowStatus: 'OPTIMAL_SUBSEQUENT_DOSE',
            details: 'Eğer 1. doz 15. haftadan önce başlanmışsa 2. ve 3. dozlar uygulanabilir. Son doz en geç 32. haftada (8 ay 0 gün) tamamlanmalıdır.',
            warning: 'DİKKAT: Eğer bebek hiç aşılanmamışsa (1. doz verilmemişse), 15 hafta 0 günden sonra İNVAJİNASYON (barsak düğümlenmesi) riski nedeniyle 1. doz KESİNLİKLE BAŞLANAMAZ!'
        };
        specialVaccines.push('Rotavirüs (Devam Dozları - Yalnızca 1. dozu 15. haftadan önce almış bebekler için)');
    } else {
        rotavirusRule = {
            eligible: false,
            windowStatus: 'EXPIRED_CONTRAINDICATED',
            details: 'Bebek 32 haftayı (8 ayı) doldurmuştur. Rotavirüs serisi bu yaştan sonra uygulanamaz (invajinasyon riski ve etkinlik düşüşü nedeniyle kontrendikedir).'
        };
    }

    // 2. Meningokok (MenACWY & MenB) Kuralları
    let meningococcalSchedule: ComprehensiveVaccineScheduleResult['meningococcalSchedule'];
    const menRecs: string[] = [];

    if (ageInMonths >= 2 && ageInMonths < 12) {
        menRecs.push('Meningokok B (MenB - Bexsero): 2. veya 3. aydan itibaren 2+1 veya 3+1 şeması (Aşı sonrası ateş profilaksisi için parasetamol önerilir).');
        menRecs.push('Meningokok ACWY (Nimenrix: 6 haftadan itibaren; Menveo: 2. aydan itibaren).');
        specialVaccines.push('MenB (Bexsero)', 'MenACWY (Nimenrix / Menveo)');
        meningococcalSchedule = {
            eligible: true,
            recommendations: menRecs,
            details: 'İnfant döneminde invaziv meningokok menenjiti ve meningokoksemiye karşı MenB ve MenACWY aşı serisi başlanabilir.'
        };
    } else if (ageInMonths >= 12 && ageInMonths < 24) {
        menRecs.push('MenACWY rapel dozu (12-14. aylarda).');
        menRecs.push('MenB rapel dozu (son infant dozundan en az 6 ay sonra, 12-15. aylarda).');
        specialVaccines.push('MenACWY (Rapel)', 'MenB (Rapel)');
        meningococcalSchedule = {
            eligible: true,
            recommendations: menRecs,
            details: '1-2 yaş arasında infant döneminde başlanan meningokok aşılarının rapel (pekiştirme) dozları tamamlanmalıdır.'
        };
    } else if (ageInMonths >= 24) {
        menRecs.push('Daha önce aşılanmamış çocuklarda tek doz MenACWY ve 2 doz MenB (en az 1 ay arayla).');
        menRecs.push('Adölesan rapeli: 11-12 yaşta MenACWY tek doz, 16 yaşta rapel.');
        if (ageInMonths < 216) {
            specialVaccines.push('MenACWY (Yakalama/Adölesan Dozu)', 'MenB (Yakalama Serisi)');
        }
        meningococcalSchedule = {
            eligible: true,
            recommendations: menRecs,
            details: '2 yaş ve üzeri çocuklarda risk durumuna veya aile isteğine bağlı olarak tamamlama şeması uygulanır.'
        };
    }

    // 3. Gecikmiş Aşı Yakalama (Catch-Up) Kuralları
    const catchUpRules: string[] = [
        '📌 Genel Yakalama Kuralı: Aşı serisi gecikmişse ASLA baştan başlanmaz; kalınan yerden devam edilir (önceki dozlar geçerlidir).',
        '⏱️ DaBT-İPA-Hib (5\'li Karma): İlk 3 doz arasında minimum 4 hafta (1 ay) ara olmalıdır. 4. pekiştirme dozu ile 3. doz arasında en az 6 ay bulunmalıdır.',
        '⏱️ Hepatit B: 1. ve 2. doz arası minimum 4 hafta; 2. ve 3. doz arası minimum 8 hafta; 1. ve 3. doz arası minimum 16 hafta ve bebek en az 24 haftalık (6 aylık) olmalıdır.',
        '⏱️ KKK (Kızamık-Kabakulak-Kızamıkçık): Minimum yaş 12 aydır. İki doz arasında minimum 4 hafta bulunmalıdır.',
        '⏱️ Hepatit A: Minimum yaş 18 aydır. 1. ve 2. doz arasında en az 6 ay bulunmalıdır.',
        '⏱️ BCG (Verem): 3. aydan sonra ilk kez yapılacaksa PPD (Tüberkülin Cilt Testi) kontrolü şarttır.'
    ];

    if (options.isDelayed) {
        specialVaccines.push(...catchUpRules);
    }

    return {
        ageInMonths,
        routineVaccines,
        specialVaccines,
        rotavirusRule,
        meningococcalSchedule,
        catchUpRules
    };
}

const AAP_BP_THRESHOLDS: Record<'male' | 'female', Record<number, { s90: number; d90: number; s95: number; d95: number }>> = {
    male: {
        1: { s90: 98, d90: 52, s95: 102, d95: 56 },
        2: { s90: 100, d90: 55, s95: 104, d95: 58 },
        3: { s90: 101, d90: 58, s95: 105, d95: 61 },
        4: { s90: 102, d90: 60, s95: 106, d95: 64 },
        5: { s90: 103, d90: 63, s95: 107, d95: 66 },
        6: { s90: 105, d90: 66, s95: 109, d95: 69 },
        7: { s90: 106, d90: 68, s95: 110, d95: 71 },
        8: { s90: 107, d90: 69, s95: 111, d95: 72 },
        9: { s90: 108, d90: 71, s95: 112, d95: 74 },
        10: { s90: 110, d90: 72, s95: 114, d95: 75 },
        11: { s90: 111, d90: 74, s95: 115, d95: 77 },
        12: { s90: 113, d90: 75, s95: 117, d95: 78 }
    },
    female: {
        1: { s90: 98, d90: 54, s95: 101, d95: 58 },
        2: { s90: 101, d90: 58, s95: 104, d95: 61 },
        3: { s90: 102, d90: 60, s95: 105, d95: 63 },
        4: { s90: 104, d90: 62, s95: 107, d95: 65 },
        5: { s90: 105, d90: 64, s95: 108, d95: 67 },
        6: { s90: 106, d90: 66, s95: 109, d95: 69 },
        7: { s90: 107, d90: 67, s95: 111, d95: 70 },
        8: { s90: 109, d90: 69, s95: 112, d95: 71 },
        9: { s90: 110, d90: 70, s95: 114, d95: 72 },
        10: { s90: 112, d90: 72, s95: 115, d95: 74 },
        11: { s90: 113, d90: 73, s95: 117, d95: 75 },
        12: { s90: 115, d90: 74, s95: 119, d95: 76 }
    }
};

export interface PediatricBPResult {
    stage: string;
    alertClass: string;
    thresholds?: string;
}

export function classifyPediatricBP({ 
    ageYears, 
    gender, 
    sbp, 
    dbp 
}: { 
    ageYears: number | null | undefined; 
    gender?: 'male' | 'female' | string; 
    sbp: number | null | undefined; 
    dbp: number | null | undefined; 
}): PediatricBPResult | null {
    if (!sbp || !dbp || sbp <= 0 || dbp <= 0 || ageYears === null || ageYears === undefined || isNaN(sbp) || isNaN(dbp)) return null;
    const isFemale = gender === 'female' || gender === 'F';
    const sex: 'male' | 'female' = isFemale ? 'female' : 'male';

    // 13 yaş ve üzeri adolesanlarda yetişkin kılavuz eşikleri geçerlidir
    if (ageYears >= 13) {
        if (sbp >= 140 || dbp >= 90) {
            return { stage: 'Evre 2 Hipertansiyon (≥140/90)', alertClass: 'text-purple-400 bg-purple-950/40 border-purple-800' };
        }
        if (sbp >= 130 || dbp >= 80) {
            return { stage: 'Evre 1 Hipertansiyon (130-139 / 80-89)', alertClass: 'text-rose-400 bg-rose-950/40 border-rose-800' };
        }
        if (sbp >= 120 && dbp < 80) {
            return { stage: 'Yükselmiş Kan Basıncı / Pre-HT (120-129 / <80)', alertClass: 'text-amber-400 bg-amber-950/40 border-amber-800' };
        }
        return { stage: 'Normal Kan Basıncı (<120/80)', alertClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800' };
    }

    const t = AAP_BP_THRESHOLDS[sex][Math.max(1, Math.min(12, Math.floor(ageYears)))];
    if (!t) return null;

    const s95_plus12 = t.s95 + 12;
    const d95_plus12 = t.d95 + 12;

    if (sbp >= s95_plus12 || dbp >= d95_plus12 || sbp >= 140 || dbp >= 90) {
        return { 
            stage: 'Evre 2 Hipertansiyon (≥95.p + 12 mmHg)', 
            alertClass: 'text-purple-400 bg-purple-950/40 border-purple-800',
            thresholds: `90.p: ${t.s90}/${t.d90} | 95.p: ${t.s95}/${t.d95} | Evre 2: ${s95_plus12}/${d95_plus12}`
        };
    }
    if (sbp >= t.s95 || dbp >= t.d95 || (sbp >= 130 && sbp < 140) || (dbp >= 80 && dbp < 90)) {
        return { 
            stage: 'Evre 1 Hipertansiyon (≥95.p)', 
            alertClass: 'text-rose-400 bg-rose-950/40 border-rose-800',
            thresholds: `90.p: ${t.s90}/${t.d90} | 95.p: ${t.s95}/${t.d95}`
        };
    }
    if (sbp >= t.s90 || dbp >= t.d90 || (sbp >= 120 && sbp < 130)) {
        return { 
            stage: 'Yükselmiş Kan Basıncı / Pre-HT (≥90.p)', 
            alertClass: 'text-amber-400 bg-amber-950/40 border-amber-800',
            thresholds: `90.p: ${t.s90}/${t.d90} | 95.p: ${t.s95}/${t.d95}`
        };
    }
    return { 
        stage: 'Normal Kan Basıncı (<90.p)', 
        alertClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-800',
        thresholds: `90.p: ${t.s90}/${t.d90} | 95.p: ${t.s95}/${t.d95}`
    };
}

export interface CentorInput {
    feverOver38?: boolean;
    noCough?: boolean;
    tenderCervicalNodes?: boolean;
    tonsillarExudate?: boolean;
    ageYears: number | null | undefined;
}

export interface CentorResult {
    score: number;
    riskPercent: string;
    recommendation: string;
    alertClass: string;
}

export function calculateCentorMcIsaac({ 
    feverOver38, 
    noCough, 
    tenderCervicalNodes, 
    tonsillarExudate, 
    ageYears 
}: CentorInput): CentorResult {
    let score = 0;
    if (feverOver38) score += 1;
    if (noCough) score += 1;
    if (tenderCervicalNodes) score += 1;
    if (tonsillarExudate) score += 1;

    let agePoints = 0;
    if (ageYears !== null && ageYears !== undefined && !isNaN(ageYears)) {
        if (ageYears >= 3 && ageYears <= 14) agePoints = 1;
        else if (ageYears >= 15 && ageYears <= 44) agePoints = 0;
        else if (ageYears >= 45) agePoints = -1;
    }
    score += agePoints;

    let riskPercent = '%1 - %10';
    let recommendation = '';
    let alertClass = 'text-emerald-400';

    if (score <= 1) {
        riskPercent = '%1 - %10 (Çok Düşük)';
        recommendation = 'Streptokok olasılığı çok düşüktür. Boğaz kültürü ve antibiyotik ÖNERİLMEZ. Semptomatik / analjezik takip yeterlidir.';
        alertClass = 'text-emerald-400';
    } else if (score <= 3) {
        riskPercent = '%15 - %32 (Orta)';
        recommendation = 'Hızlı Antijen Testi (Strep-A) veya Boğaz Kültürü önerilir. Yalnızca test pozitif çıkarsa antibiyotik başlanmalıdır.';
        alertClass = 'text-amber-400';
    } else {
        riskPercent = '%51 - %53 (Yüksek)';
        recommendation = 'Yüksek AGBHS olasılığı. Hızlı test/kültürle doğrulayınız veya klinik karara göre ampirik antibiyotik (Amoksisilin/Penisilin V) değerlendiriniz.';
        alertClass = 'text-rose-400';
    }

    return {
        score,
        riskPercent,
        recommendation,
        alertClass
    };
}
