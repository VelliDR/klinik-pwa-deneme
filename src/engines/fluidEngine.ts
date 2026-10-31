// Fluid Engine: Holliday-Segar, NICE CG174, AAP 2018, GIFTASUP, KDIGO, EASL & Elektrolit Güvenlik Rehberi

export type ClinicalFluidCondition = 
    | 'standard' 
    | 'heart_failure' 
    | 'renal_failure' 
    | 'cirrhosis_ascites' 
    | 'siadh' 
    | 'elderly_frail';

export interface MaintenanceFluidOptions {
    ibwKg?: number | null;
    ageYears?: number | null;
    isObese?: boolean;
    useFourTwoOneHourly?: boolean;
    gender?: 'male' | 'female' | 'M' | 'F' | string | null;
    heightCm?: number | null;
    clinicalCondition?: ClinicalFluidCondition | null;
    urineOutputMl24h?: number | null;
    fluidCreepMl24h?: number | null;
    bsaM2?: number | null;
    serumSodium?: number | null;
    serumChloride?: number | null;
    serumPotassium?: number | null;
    hasOralIntake?: boolean;
    adultRatePerKg?: number | null;
}

export interface IvSolutionDetail {
    id: string;
    name: string;
    naMeqL: number;
    clMeqL: number;
    kMeqL: number;
    glucoseGPerL: number;
    buffer: string;
    theoreticalOsm: number;
    inVivoTonicity: string;
    clinicalNote: string;
}

export interface FluidKnowledgeTopic {
    id: string;
    title: string;
    icon: string;
    badgeText: string;
    summary: string;
    bullets: string[];
    guidelineRef: string;
}

export interface MaintenanceFluidResult {
    originalVolume?: number;
    feverExtraVolume?: number;
    dailyVolume: number;
    hourlyRate: number;
    fluidTypeRecommendation: string;
    isNeonate?: boolean;
    dayTitle?: string;
    contraindicationNotice?: string;
    isIbwUsed?: boolean;
    isAdultCapApplied?: boolean;
    effectiveWeightKg?: number;
    warnings?: string[];
    methodUsed?: 'HOLLIDAY_SEGAR' | 'ADULT_WEIGHT_BASED' | 'ADULT_OBESITY_ABW' | 'ORGAN_RESTRICTION_HF' | 'ORGAN_RESTRICTION_AKI' | 'ORGAN_RESTRICTION_CIRRHOSIS' | 'ORGAN_RESTRICTION_SIADH' | 'ELDERLY_FRAIL';
    adultNiceRange?: {
        minDailyMl: number;
        maxDailyMl: number;
        minHourlyMl: number;
        maxHourlyMl: number;
    };
    electrolytes?: {
        sodiumMmolDaily: { min: number; max: number; target: number; unit: string };
        potassiumMmolDaily: { min: number; max: number; target: number; unit: string; warning?: string };
        chlorideMmolDaily: { min: number; max: number; target: number; unit: string };
        glucoseGramsDaily: { min: number; max: number; target: number; unit: string; kcal: number };
    };
    fluidCreepDeduction?: {
        fluidCreepMl: number;
        netDailyVolume: number;
        netHourlyRate: number;
        warning?: string;
    };
    specialConditionNote?: string;
    potassiumSafetyRules?: {
        maxPeripheralConcentration: string;
        maxInfusionRate: string;
        manualInjectionForbidden: boolean;
        requiresUrineCheck: boolean;
    };
    guidelineCitations?: string[];
}

export const IV_SOLUTIONS_CATALOG: IvSolutionDetail[] = [
    {
        id: 'ns',
        name: '%0.9 NaCl (Serum Fizyolojik)',
        naMeqL: 154,
        clMeqL: 154,
        kMeqL: 0,
        glucoseGPerL: 0,
        buffer: 'Yok',
        theoreticalOsm: 308,
        inVivoTonicity: 'İzotonik',
        clinicalNote: 'Klasik izotonik solüsyon. Masif infüzyonunda Güçlü İyon Farkı (SID) düşerek hiperkloremik asidoz ve renal kortikal vazokonstriksiyon riski doğurur.'
    },
    {
        id: 'rl',
        name: 'Ringer Laktat (Hartmann)',
        naMeqL: 131,
        clMeqL: 111,
        kMeqL: 5,
        glucoseGPerL: 0,
        buffer: 'Laktat (29 mmol/L)',
        theoreticalOsm: 278,
        inVivoTonicity: 'Dengeli / Hafif Hipotonik',
        clinicalNote: 'Karaciğerde bikarbonata dönüşen laktat içerir. Plazma kloruna daha yakındır, asidoz riski düşüktür.'
    },
    {
        id: 'plasmalyte',
        name: 'Plasma-Lyte 148 / İzoleks',
        naMeqL: 140,
        clMeqL: 98,
        kMeqL: 5,
        glucoseGPerL: 0,
        buffer: 'Asetat (27) + Glukonat (23)',
        theoreticalOsm: 294,
        inVivoTonicity: 'Dengeli / İzotonik',
        clinicalNote: 'Tam dengeli kristaloid. Asidoz yapmaz, renal perfüzyonu korur. Karaciğer dışı periferik dokularda da tampon metabolize olur.'
    },
    {
        id: 'd5_ns',
        name: '%5 Dekstroz + %0.9 NaCl',
        naMeqL: 154,
        clMeqL: 154,
        kMeqL: 0,
        glucoseGPerL: 50,
        buffer: 'Yok',
        theoreticalOsm: 560,
        inVivoTonicity: 'İn vitro hipertonik, in vivo izotonik',
        clinicalNote: 'AAP 2018 Grade A ve NICE NG29 tarafından önerilen temel izotonik idame solüsyonu. Glukoz hücreye girdikten sonra plazmada izotonik kalır.'
    },
    {
        id: 'd5_half_ns',
        name: '%5 Dekstroz + %0.45 NaCl',
        naMeqL: 77,
        clMeqL: 77,
        kMeqL: 0,
        glucoseGPerL: 50,
        buffer: 'Yok',
        theoreticalOsm: 406,
        inVivoTonicity: 'İn vitro hipertonik, in vivo hipotonik',
        clinicalNote: 'Yarı hipotonik solüsyon. ADH salınımı olan akut yatan çocuklarda akut hiponatremi riski taşır; rutin idame olarak önerilmez.'
    },
    {
        id: 'd4_fifth_ns',
        name: '%4 Dekstroz + %0.18 NaCl',
        naMeqL: 31,
        clMeqL: 31,
        kMeqL: 0,
        glucoseGPerL: 40,
        buffer: 'Yok',
        theoreticalOsm: 284,
        inVivoTonicity: 'İn vitro izotonik, in vivo derin hipotonik',
        clinicalNote: 'Glukoz metabolize olduktan sonra sadece 31 mmol/L Na kalır. AAP ve NICE tarafından rutin idame için KESİNLİKLE YASAKLANMIŞTIR.'
    },
    {
        id: 'd5w',
        name: '%5 Dekstroz (Sudaki)',
        naMeqL: 0,
        clMeqL: 0,
        kMeqL: 0,
        glucoseGPerL: 50,
        buffer: 'Yok',
        theoreticalOsm: 278,
        inVivoTonicity: 'İn vitro izotonik, in vivo saf serbest su',
        clinicalNote: 'Rutin idame sıvısı DEĞİLDİR. Yalnızca hipernatremi serbest su açığı (FWD) düzeltmesinde veya hipoglisemide kullanılır.'
    }
];

export const FLUID_KNOWLEDGE_TOPICS: FluidKnowledgeTopic[] = [
    {
        id: '5r_rule',
        title: 'İntravenöz Sıvı Tedavisinde 5R Kuralı',
        icon: '🛡️',
        badgeText: 'NICE CG174 / GIFTASUP',
        summary: 'İntravenöz sıvılar sıradan taşıyıcı veya hidrasyon araçları değil; farmakodinamik, farmakokinetik ve toksisite profili olan bağımsız ilaçlardır.',
        bullets: [
            '1. Resuscitation (Resüsitasyon): Şok, derin hipotansiyon ve doku hipoperfüzyonunda acil kristaloid bolusları (250-500 mL / 15 dk). Rutin idame bu tabloda KONTRENDİKEDİR.',
            '2. Routine Maintenance (Rutin İdame): Enteral alamayan stabil bireylerde günlük fizyolojik idrar, gaita ve hissolunmayan kayıpların karşılanması (Su: 25-30 mL/kg/gün; Na, K, Cl: ~1 mmol/kg/gün; Glukoz: 50-100 g/gün).',
            '3. Replacement (Replasman): NG drenaj, diyare, ileostomi veya fistül gibi devam eden anormal kayıpların uygun kristaloidlerle hacim-hacim yerine konması.',
            '4. Redistribution (Yeniden Dağılım): Sepsis, inflamasyon veya organ yetmezliklerinde üçüncü boşluğa sıvı kaçışının ve kümülatif dengenin yönetilmesi.',
            '5. Reassessment (Yeniden Değerlendirme): Sıvı alan her hasta en az 24 saatte bir klinik, kümülatif balans, kilo ve biyokimya (üre, kreatinin, Na, K, Cl) ile değerlendirilmelidir.'
        ],
        guidelineRef: 'NICE Clinical Guideline 174 & GIFTASUP 2020'
    },
    {
        id: 'aap_paradigm',
        title: 'Pediatride Paradigma Değişimi: Hipotonikten İzotoniğe',
        icon: '⚡',
        badgeText: 'AAP 2018 Grade A / NICE NG29',
        summary: '50 yıllık hipotonik sıvı (%0.18 - %0.45 NaCl) geleneği, yatan çocuklarda fatal akut hiponatremi ve beyin ödemine yol açtığı için terk edilmiştir.',
        bullets: [
            'Hastanede yatan çocuklarda ağrı, bulantı, cerrahi stres, enfeksiyon ve akciğer hastalıkları güçlü non-osmotik ADH (arginin vazopressin) salınımını tetikler.',
            'Yüksek ADH serbest suyun böbrekten atılımını engeller. Bu zemin üzerine hipotonik sıvı verildiğinde serbest su hızla hücre içine dolarak akut serebral ödem ve tentoryal herniasyona yol açar.',
            'AAP 2018 (Grade A - Güçlü Öneri) & NICE NG29: 28 gün - 18 yaş arası akut yatan tüm çocuklarda rutin idame sıvısı olarak İZOTONİK kristaloidler (%0.9 NaCl veya dengeli solüsyonlar + %5 Dekstroz) şarttır.',
            'Yenidoğan döneminde (0-28 gün) ise TND kademeli sıvı protokolü uygulanır.'
        ],
        guidelineRef: 'American Academy of Pediatrics (AAP) 2018 & NICE NG29'
    },
    {
        id: 'dextrose_paradox',
        title: 'Dekstrozun Tonisite Paradoksu',
        icon: '🧪',
        badgeText: 'Fizyopatoloji',
        summary: 'Torbada izotonik veya hipertonik görünen dekstrozlu solüsyonlar, damara girdiği anda fizyolojik olarak saf serbest suya dönüşür.',
        bullets: [
            'Sudaki %5 Dekstroz şişede 278 mOsm/L ile plazmaya izoozmotiktir; ancak damara girdiği anda glukoz dakikalar içinde hücre içine alınıp metabolize olur.',
            'Geride kalan sıvı fizyolojik olarak saf SERBEST SU gibi davranarak plazma sodyumunu hızla dilüe eder.',
            '%4 Dekstroz / %0.18 NaCl torbada 284 mOsm/L iken metabolizma sonrası sadece 31 mmol/L Na içeren derin hipotonik bir sıvıya dönüşür.',
            'Kural: Biyolojik in vivo tonisiteyi glukoz değil, hücre zarını serbestçe geçemeyen ve ekstraselüler alanda ozmotik güç oluşturan SODYUM iyonu belirler.'
        ],
        guidelineRef: 'AAP Guidelines & BAPEN GIFTASUP'
    },
    {
        id: 'potassium_safety',
        title: 'Potasyum İlavesi ve Güvenlik Limitleri',
        icon: '⚠️',
        badgeText: 'Klinik Güvenlik Kuralı',
        summary: 'İdame sıvılarında ölümcül kardiyak aritmileri önlemek için katı güvenlik limitleri zorunludur.',
        bullets: [
            'Hedef idame potasyum konsantrasyonu 20 - 40 mmol/L aralığındadır.',
            'Periferik venöz yoldan infüzyonda konsantrasyon KESİNLİKLE >40 mmol/L (mEq/L) düzeyini aşmamalıdır (şiddetli kimyasal flebit, endotel hasarı ve ağrı).',
            'İnfüzyon hızı kardiyak elektrofizyolojik güvenlik için saatte 10 - 20 mmol sınırının altında tutulmalıdır.',
            'HAYATİ YASAK: Hasta başında asılı torbaya manuel enjektörle konsantre KCl ampulü enjekte etmek KESİNLİKLE YASAKTIR! Potasyum homojen karışmaz, tabana çökerek hastaya ani ölümcül bolus aritmi ve asistoli yaşatabilir. Mutlaka fabrikasyon hazır premiks torbalar kullanılmalıdır.',
            'İdrar çıkışı teyit edilmeden ve serum K⁺ düzeyi kontrol edilmeden idame sıvısına potasyum eklenmemelidir.'
        ],
        guidelineRef: 'NICE CG174 & EMed Ireland IV Potassium Protocols'
    },
    {
        id: 'fluid_creep',
        title: 'Gizli Sıvı (Fluid Creep) ve Aşırı Hidrasyon',
        icon: '💧',
        badgeText: 'Yoğun Bakım & Dahiliye',
        summary: 'Parenteral antibiyotikler, analjezikler ve ilaç sulandırmaları hastaya fark edilmeden masif su ve sodyum yükler.',
        bullets: [
            'Piperasilin/tazobaktam, vankomisin ve parasetamol gibi IV ilaç infüzyonları günde 500 - 1000 mL fazladan taşıyıcı sıvı yükleyebilir.',
            'Bu gizli sıvı hastaya her gün 50 - 150 mmol fazladan sodyum taşır.',
            'Gizli sıvı hekim tarafından reçete edilen idame hesabından düşülmediğinde kardiyak dekompansasyon, akciğer ödemi ve uzamış ileus kaçınılmaz hale gelir.',
            'Motorumuzda "Gizli Sıvı (Fluid Creep)" girişi yapılarak net infüzyon hızı otomatik olarak revize edilir.'
        ],
        guidelineRef: 'Aiming for Zero Fluid Accumulation & Intensive Care Med'
    },
    {
        id: 'organ_restrictions',
        title: 'Özel Popülasyonlarda Sıvı Kısıtlama Stratejileri',
        icon: '🫀',
        badgeText: 'KDIGO / EASL / NICE',
        summary: 'Kalp yetersizliği, karaciğer sirozu ve böbrek hasarında standart idame formülleri doğrudan klinik dekompansasyona yol açar.',
        bullets: [
            'Kalp Yetersizliği: İdame hızı 20 - 25 mL/kg/gün veya (Önceki gün idrar çıkışı + 500 mL hissolunmayan kayıp) ile sınırlandırılmalıdır. Günlük >1 kg veya 3 günde >2 kg ağırlık artışı sıvı retansiyonudur; idame kesilip loop diüretik başlanmalıdır.',
            'Akut Böbrek Hasarı / KBY (KDIGO): Oligürik evrede günlük sıvı (Hissolunmayan Kayıp ~450 mL + İdrar Çıkışı) kadar sınırlandırılmalıdır. Potasyum idame sıvısından TAMAMEN ÇIKARILMALIDIR! Renal vazokonstriksiyonu önlemek için dengeli kristalloid tercih edilmeli, yüksek klorlu (%0.9 NaCl) sıvılardan kaçınılmalıdır.',
            'Karaciğer Sirozu & Assit (EASL): Sodyum alımı 80 - 120 mmol/gün (4.6 - 6.9 g tuz) ile sınırlandırılır. Normal sodyumlu sirotikte sıvı kısıtlamasının yararı yoktur; sıvı kısıtlaması (1000 - 1500 mL/gün) yalnızca dilüsyonel hiponatremi (Na < 125 mEq/L) geliştiğinde endikedir.',
            'SIADH: Serbest su atılımı bozulduğundan idame hacmi %50 - 80 oranında kısıtlanır; hipotonik sıvı KESİNLİKLE KONTRENDİKEDİR.'
        ],
        guidelineRef: 'KDIGO 2012, EASL 2018, NICE CG174'
    },
    {
        id: 'complications',
        title: 'Sıvı Tedavisi Komplikasyon Kalkanı & Önleme',
        icon: '🚨',
        badgeText: 'Güvenlik Protokolü',
        summary: 'İntravenöz sıvı tedavisinin en sık 4 mortal komplikasyonu ve koruyucu hekimlik ilkeleri.',
        bullets: [
            '1. Akut Hiponatremi: Non-osmotik ADH zemininde hipotonik sıvı verilmesiyle astrosit ödemi. Semptomatik olguda %3 NaCl (2-3 mL/kg) ile intrakraniyal basınç hızla düşürülmelidir.',
            '2. Hiperkloremik Asidoz: Yüksek klorlu (%0.9 NaCl) sıvıların infüzyonuyla Güçlü İyon Farkı (SID) düşüşü. Klor >110 mmol/L ise dengeli kristalloidlere (İzoleks/RL) geçilmelidir.',
            '3. Aşırı Hacim Yüklenmesi (Fluid Overload): Fazla kristaloidle endotelyal glikokaliks tabakasının yırtılması ve doku ödemi. Kümülatif balans ve günlük kilo izlenmelidir.',
            '4. Yeniden Besleme (Refeeding) Sendromu: Malnütre hastada dekstroz verilmesiyle fosfat, magnezyum ve potasyumun hücre içine çöküşü. İnfüzyon öncesi fosfat/tiamin desteği şarttır.'
        ],
        guidelineRef: 'NICE CG174, Stewart Acid-Base & British Consensus'
    }
];

export function calculateDevineWeight(
    heightCm: number | null | undefined, 
    actualWeightKg: number | null | undefined, 
    gender: 'male' | 'female' | 'M' | 'F' | string | null | undefined
): { ibwKg: number; abwKg: number; bmi: number | null } | null {
    if (!heightCm || heightCm < 100 || !actualWeightKg || actualWeightKg <= 0) return null;
    const isMale = gender === 'male' || gender === 'M';
    const ibwKg = isMale
        ? Number((50 + 0.9 * (heightCm - 152)).toFixed(1))
        : Number((45.5 + 0.9 * (heightCm - 152)).toFixed(1));
    
    const abwKg = actualWeightKg > ibwKg
        ? Number((ibwKg + 0.4 * (actualWeightKg - ibwKg)).toFixed(1))
        : actualWeightKg;
    
    const heightM = heightCm / 100;
    const bmi = Number((actualWeightKg / (heightM * heightM)).toFixed(1));

    return { ibwKg: Math.max(10, ibwKg), abwKg: Math.max(10, abwKg), bmi };
}

export function calculateMaintenanceFluid(
    weightKg: number | null | undefined, 
    tempCelsius: number | null = null,
    options?: MaintenanceFluidOptions
): MaintenanceFluidResult | null {
    if (!weightKg || weightKg <= 0) return null;

    let effectiveWeightKg = weightKg;
    let isIbwUsed = false;
    const warnings: string[] = [];
    const condition = options?.clinicalCondition || 'standard';
    let methodUsed: MaintenanceFluidResult['methodUsed'] = 'HOLLIDAY_SEGAR';

    const isAdult = (options?.ageYears !== undefined && options?.ageYears !== null && options.ageYears >= 18) || 
                    (options?.ageYears === undefined && weightKg >= 50);

    // HATA-M9-001: Pediatrik Obezitede İdeal Vücut Ağırlığı (IBW) Kalkanı
    if (!isAdult && options?.ibwKg && options.ibwKg > 0 && options.ibwKg < weightKg) {
        if (options.isObese || weightKg >= (options.ibwKg * 1.2)) {
            effectiveWeightKg = options.ibwKg;
            isIbwUsed = true;
            warnings.push(`⚠️ Obezite Kalkanı: Sıvı yüklenmesini önlemek için İdeal Vücut Ağırlığı (${options.ibwKg} kg) kullanıldı.`);
        }
    }

    // Yetişkin Obezitede DVA / İVA Kalkanı (NICE CG174 / Devine)
    if (isAdult && (options?.isObese || (options?.ibwKg && weightKg >= (options.ibwKg * 1.2)))) {
        const devine = calculateDevineWeight(options.heightCm, weightKg, options.gender);
        const resolvedIbw = options.ibwKg || devine?.ibwKg;
        if (resolvedIbw && resolvedIbw < weightKg) {
            const abw = Number((resolvedIbw + 0.4 * (weightKg - resolvedIbw)).toFixed(1));
            // Sadece spesifik klinik şart yoksa veya standart obezitede DVA'yı aktif kıl
            if (condition === 'standard') {
                effectiveWeightKg = abw;
                isIbwUsed = true;
                methodUsed = 'ADULT_OBESITY_ABW';
                warnings.push(`⚠️ Yetişkin Obezite Kalkanı (NICE/Devine): Yağ dokusu hidrasyon düşüklüğü nedeniyle Düzeltilmiş Vücut Ağırlığı (DVA: ${abw} kg) üzerinden hesaplandı.`);
            }
        }
    }

    let dailyVolume = 0;
    
    // Standart Holliday-Segar Baz Hacmi
    if (effectiveWeightKg <= 10) {
        dailyVolume = effectiveWeightKg * 100;
    } else if (effectiveWeightKg <= 20) {
        dailyVolume = 1000 + (effectiveWeightKg - 10) * 50;
    } else {
        dailyVolume = 1500 + (effectiveWeightKg - 20) * 20;
    }

    // Adult maintenance baseline cap (~2500 mL/gün)
    let isAdultCapApplied = false;
    if (effectiveWeightKg > 70) {
        if (dailyVolume > 2500) {
            dailyVolume = 2500;
            isAdultCapApplied = true;
        }
    }

    let specialConditionNote: string | undefined;

    // Özel Klinik Popülasyon Kısıtlamaları (KDIGO, EASL, NICE, ESC)
    if (condition === 'heart_failure') {
        methodUsed = 'ORGAN_RESTRICTION_HF';
        if (options?.urineOutputMl24h && options.urineOutputMl24h > 0) {
            dailyVolume = options.urineOutputMl24h + 500;
            specialConditionNote = `Kalp Yetersizliği Protokolü: 24s İdrar (${options.urineOutputMl24h} mL) + 500 mL hissolunmayan kayıp formüle edildi.`;
        } else {
            dailyVolume = Math.round(effectiveWeightKg * 22);
            specialConditionNote = 'Kalp Yetersizliği Protokolü: 20-25 mL/kg/gün (22 mL/kg) kısıtlı hacim uygulandı.';
        }
        warnings.push('⚠️ Kalp Yetersizliği Kısıtlaması (ESC/NICE): Kardiyak dekompansasyonu önlemek için kısıtlı hacim uygulandı. Günde >1 kg veya 3 günde >2 kg ağırlık artışı bariz sıvı retansiyonudur; idameyi kesip IV loop diüretik başlayınız.');
    } else if (condition === 'renal_failure') {
        methodUsed = 'ORGAN_RESTRICTION_AKI';
        const insensibleMl = options?.bsaM2 ? Math.round(options.bsaM2 * 350) : 450;
        if (options?.urineOutputMl24h !== undefined && options?.urineOutputMl24h !== null) {
            dailyVolume = options.urineOutputMl24h + insensibleMl;
            specialConditionNote = `KDIGO AKI / KBY Protokolü: İdrar (${options.urineOutputMl24h} mL) + Hissolunmayan Kayıp (${insensibleMl} mL). Potasyum TAMAMEN ÇIKARILDI.`;
        } else {
            dailyVolume = Math.round(effectiveWeightKg * 15);
            specialConditionNote = 'KDIGO AKI / KBY Protokolü: Oligürik/anürik faz sıvı kısıtlaması uygulandı. Potasyum TAMAMEN ÇIKARILDI.';
        }
        warnings.push('🚨 KDIGO AKI / KBY Kılavuzu: Böbrek yetmezliğinde potasyum idame sıvısından TAMAMEN ÇIKARILMALIDIR (Ölümcül hiperkalemi ve ventriküler aritmi riski)!');
        warnings.push('⚠️ Renal Kortikal Vazokonstriksiyon Kalkanı: Yüksek klorlu (%0.9 NaCl) sıvılardan kaçınınız; makula densa tübüloglomerüler feedback uyarısı ile GFR düşüşünü engellemek için dengeli kristalloid (İzoleks / Plasma-Lyte) tercih edilmelidir.');
    } else if (condition === 'cirrhosis_ascites') {
        methodUsed = 'ORGAN_RESTRICTION_CIRRHOSIS';
        if (options?.serumSodium && options.serumSodium < 125) {
            dailyVolume = 1200; // 1000 - 1500 mL/gün
            specialConditionNote = `EASL Siroz Kılavuzu: Dilüsyonel hiponatremi (Na: ${options.serumSodium} mEq/L < 125) nedeniyle günlük sıvı 1200 mL ile kısıtlandı.`;
            warnings.push(`🚨 EASL Siroz Assiti Kılavuzu: Dilüsyonel hiponatremi (Na: ${options.serumSodium} mEq/L) saptandığından günlük sıvı 1000-1500 mL ile kısıtlandı. Na < 120 mEq/L, ensefalopati veya AKI gelişirse diüretikler derhal stoplanmalıdır!`);
        } else {
            specialConditionNote = 'EASL Siroz Kılavuzu: Sodyum 80-120 mmol/gün (4.6-6.9 g tuz) ile sınırlandırılmalıdır. Normal sodyumlu sirotik hastada rutin sıvı kısıtlamasının klinik yararı yoktur.';
            warnings.push('ℹ️ EASL Kılavuzu: Serum sodyumu normal olan kompanse/dekompanse sirotik hastalarda rutin sıvı kısıtlaması önerilmez; sodyum alımı 80-120 mmol/gün ile kısıtlanmalıdır.');
        }
    } else if (condition === 'siadh') {
        methodUsed = 'ORGAN_RESTRICTION_SIADH';
        dailyVolume = Math.round(dailyVolume * 0.65);
        specialConditionNote = 'SIADH / Non-Ozmotik ADH Kısıtlaması: İdame hacmi standart ihtiyacın %65\'ine kısıtlandı. Hipotonik sıvı KESİNLİKLE KONTRENDİKEDİR!';
        warnings.push('🚨 SIADH / Non-Ozmotik ADH Kalkanı (NICE NG29): Serbest su birikimini ve akut serebral ödemi önlemek için idame hacmi %65 oranında kısıtlandı. Hipotonik sıvılar KESİNLİKLE KONTRENDİKEDİR! Mutlaka izotonik kristaloid (%0.9 NaCl veya dengeli solüsyon) kullanılmalıdır.');
    } else if (condition === 'elderly_frail') {
        methodUsed = 'ELDERLY_FRAIL';
        dailyVolume = Math.round(effectiveWeightKg * 22);
        specialConditionNote = 'Geriatrik / Kırılgan Hasta: Düşük idame hacmi (20-25 mL/kg/gün) uygulandı.';
        warnings.push('ℹ️ NICE CG174 Geriatri Önerisi: Yaşlı ve kırılgan hastalarda kardiyak ve renal tolerans sınırları dar olduğundan alt sınır (20-25 mL/kg/gün) hedeflenmiştir.');
    }

    const originalVolume = dailyVolume;
    let feverExtraVolume = 0;

    // Ateş Düzeltmesi (Her 1°C > 37.5°C için %12 hissolunmayan kayıp artışı)
    if (tempCelsius && tempCelsius > 37.5) {
        const excessTemp = tempCelsius - 37.5;
        const increaseRatio = excessTemp * 0.12;
        feverExtraVolume = originalVolume * increaseRatio;
        dailyVolume = originalVolume + feverExtraVolume;

        // HATA-M9-002: Ateş Düzeltmesinde Yetişkin Tavanı (Maksimum 2800 mL/gün)
        const isAdultOrHeavy = effectiveWeightKg >= 50 || (options?.ageYears !== undefined && options?.ageYears !== null && options.ageYears >= 18);
        const adultFeverCap = 2800;
        if (isAdultOrHeavy && dailyVolume > adultFeverCap) {
            dailyVolume = adultFeverCap;
            isAdultCapApplied = true;
            warnings.push(`⚠️ Yetişkin Sıvı Güvenlik Tavanı: Ateş artışına rağmen kardiyopulmoner aşırı yüklenme riskini önlemek için tavan ${adultFeverCap} mL/gün ile sınırlandırıldı.`);
        }
    }

    // Adolesan Tavan Sınırları (Erkek 2500 mL, Kız 2000 mL)
    if (!isAdult && options?.ageYears && options.ageYears >= 12 && options.ageYears < 18) {
        const isFemale = options.gender === 'female' || options.gender === 'F';
        const adolescentCap = isFemale ? 2000 : 2500;
        if (dailyVolume > adolescentCap) {
            dailyVolume = adolescentCap;
            warnings.push(`⚠️ Adolesan Tavan Sınırı: Aşırı yüklenmeyi engellemek adına günlük hacim ${adolescentCap} mL/gün tavanı ile sınırlandırıldı.`);
        }
    }

    // Yetişkin Mutlak Güvenlik Tavanı (Maksimum 3000 mL/gün)
    if (isAdult && dailyVolume > 3000) {
        dailyVolume = 3000;
        isAdultCapApplied = true;
        warnings.push('⚠️ Kılavuz Tavan Sınırı: Yetişkin rutin idamesinde aşırı hidrasyonu önlemek için günlük hacim 3000 mL/gün ile sınırlandırılmıştır.');
    }

    let hourlyRate = dailyVolume / 24;
    if (options?.useFourTwoOneHourly && !isAdultCapApplied) {
        if (effectiveWeightKg <= 10) hourlyRate = effectiveWeightKg * 4;
        else if (effectiveWeightKg <= 20) hourlyRate = 40 + (effectiveWeightKg - 10) * 2;
        else hourlyRate = 60 + (effectiveWeightKg - 20) * 1;
    }

    // HATA-M9-003: Yaş Kriteri (Düşük kilolu yetişkinlere AAP basılmamalıdır)
    let fluidTypeRecommendation = '';
    if (isAdult) {
        fluidTypeRecommendation = '%0.9 NaCl veya İzoleks / Dengeli Kristaloid (Erişkin Standart İdame Sıvısı)';
    } else {
        // HATA-M9-004: İdrar çıkışı teyit edilmeden KCl eklenmeme uyarısı
        fluidTypeRecommendation = '%0.9 NaCl + %5 Dekstroz (AAP Güncel Önerisi: İzotonik İdame). ⚠️ DİKKAT: İdrar çıkışı teyit edilmeden ve bazal serum K⁺ düzeyi görülmeden idame sıvısına KCl eklenmemelidir (Akut böbrek hasarı ve hiperkalemi riski).';
    }

    // Enteral Alım Başlama Uyarısı
    if (options?.hasOralIntake) {
        warnings.push('⚠️ Enteral Geçiş Kuralı (NICE CG174): Hasta oral/enteral alımı tolere edebildiği anda intravenöz idame sıvı infüzyonu kademeli olarak azaltılmalı ve en kısa sürede tamamen kesilmelidir.');
    }

    // Gizli Sıvı (Fluid Creep) Düşümü
    let fluidCreepDeduction: MaintenanceFluidResult['fluidCreepDeduction'];
    if (options?.fluidCreepMl24h && options.fluidCreepMl24h > 0) {
        const creepMl = options.fluidCreepMl24h;
        const netDaily = Math.max(0, dailyVolume - creepMl);
        const netHourly = +(netDaily / 24).toFixed(1);
        fluidCreepDeduction = {
            fluidCreepMl: creepMl,
            netDailyVolume: Math.round(netDaily),
            netHourlyRate: Math.round(netHourly),
            warning: `Parenteral ilaç sulandırıcılarından gelen ${creepMl} mL/gün gizli sıvı düşülerek net infüzyon hızı ${Math.round(netHourly)} mL/saat (${Math.round(netDaily)} mL/gün) olarak hesaplandı.`
        };
        warnings.push(`💧 Gizli Sıvı (Fluid Creep): Günlük ${creepMl} mL taşıyıcı ilaç sıvısı net idame hesabından düşüldü.`);
    }

    // Elektrolit ve Glukoz Hesaplamaları (NICE CG174 & AAP)
    let naTarget = 0, naMin = 0, naMax = 0;
    let kTarget = 0, kMin = 0, kMax = 0, kWarning: string | undefined;
    let clTarget = 0, clMin = 0, clMax = 0;
    let gluTarget = 0, gluMin = 0, gluMax = 0;

    if (isAdult) {
        if (condition === 'cirrhosis_ascites') {
            naTarget = 100; naMin = 80; naMax = 120;
        } else {
            naTarget = Math.round(effectiveWeightKg * 1.0);
            naMin = Math.round(effectiveWeightKg * 0.9);
            naMax = Math.round(effectiveWeightKg * 1.2);
        }

        if (condition === 'renal_failure') {
            kTarget = 0; kMin = 0; kMax = 0;
            kWarning = 'Böbrek yetmezliğinde potasyum KONTRENDİKEDİR.';
        } else {
            kTarget = Math.round(effectiveWeightKg * 1.0);
            kMin = Math.round(effectiveWeightKg * 0.8);
            kMax = Math.round(effectiveWeightKg * 1.0);
        }

        clTarget = Math.round(effectiveWeightKg * 1.0);
        clMin = Math.round(effectiveWeightKg * 0.8);
        clMax = Math.round(effectiveWeightKg * 1.2);

        gluTarget = 75; gluMin = 50; gluMax = 100;
    } else {
        naTarget = Math.round(effectiveWeightKg * 2.5);
        naMin = Math.round(effectiveWeightKg * 2.0);
        naMax = Math.round(effectiveWeightKg * 3.0);

        if (condition === 'renal_failure') {
            kTarget = 0; kMin = 0; kMax = 0;
            kWarning = 'Böbrek yetmezliğinde potasyum KONTRENDİKEDİR.';
        } else {
            kTarget = Math.round(effectiveWeightKg * 1.5);
            kMin = Math.round(effectiveWeightKg * 1.0);
            kMax = Math.round(effectiveWeightKg * 2.0);
        }

        clTarget = Math.round(effectiveWeightKg * 2.0);
        clMin = Math.round(effectiveWeightKg * 1.5);
        clMax = Math.round(effectiveWeightKg * 2.5);

        gluTarget = Math.round(dailyVolume * 0.05);
        gluMin = Math.round(gluTarget * 0.8);
        gluMax = Math.round(gluTarget * 1.2);
    }

    const adultNiceRange = isAdult ? {
        minDailyMl: Math.round(effectiveWeightKg * 25),
        maxDailyMl: Math.round(effectiveWeightKg * 30),
        minHourlyMl: +(effectiveWeightKg * 25 / 24).toFixed(1),
        maxHourlyMl: +(effectiveWeightKg * 30 / 24).toFixed(1)
    } : undefined;

    return {
        originalVolume: Math.round(originalVolume),
        feverExtraVolume: Math.round(feverExtraVolume),
        dailyVolume: Math.round(dailyVolume),
        hourlyRate: Math.round(hourlyRate),
        fluidTypeRecommendation,
        isIbwUsed,
        isAdultCapApplied,
        effectiveWeightKg,
        warnings,
        methodUsed,
        adultNiceRange,
        electrolytes: {
            sodiumMmolDaily: { min: naMin, max: naMax, target: naTarget, unit: 'mmol/gün' },
            potassiumMmolDaily: { min: kMin, max: kMax, target: kTarget, unit: 'mmol/gün', warning: kWarning },
            chlorideMmolDaily: { min: clMin, max: clMax, target: clTarget, unit: 'mmol/gün' },
            glucoseGramsDaily: { min: gluMin, max: gluMax, target: gluTarget, unit: 'g/gün', kcal: gluTarget * 4 }
        },
        fluidCreepDeduction,
        specialConditionNote,
        potassiumSafetyRules: {
            maxPeripheralConcentration: 'Maksimum 40 mmol/L',
            maxInfusionRate: '10 - 20 mmol/saat',
            manualInjectionForbidden: true,
            requiresUrineCheck: true
        },
        guidelineCitations: [
            'NICE CG174 (Adult Intravenous Fluid Therapy)',
            'AAP 2018 (Maintenance IV Fluids in Children - Grade A)',
            'NICE NG29 (IV Fluids in Children & Young People)',
            'GIFTASUP (British Consensus Guidelines for Surgical Patients)',
            'KDIGO 2012 (Clinical Practice Guideline for Acute Kidney Injury)',
            'EASL 2018 (Management of Patients with Decompensated Cirrhosis)'
        ]
    };
}

export interface SodiumCorrectionOptions {
    glucoseMgDl?: number | null | undefined;
    isHighRiskODS?: boolean | null | undefined;
    ageYears?: number | null | undefined;
    totalMonths?: number | null | undefined;
    isPreterm?: boolean | null | undefined;
}

export interface SodiumCorrectionResult {
    deficit: number;
    warning: string;
    deltaNa3Percent: number;
    deltaNa09Percent: number;
    required3PercentMl: number;
    isPseudohyponatremia?: boolean;
    correctedNa?: number;
    isHypernatremia?: boolean;
    freeWaterDeficitLiters?: number;
    freeWaterHourlyD5WRateMl?: number;
    deltaD5W?: number;
    isHighRiskODS?: boolean;
    maxRecommendedDelta?: number;
    tbwLiters: number;
}

export function calculateSodiumCorrection(
    measuredNa: number | null | undefined, 
    targetNa: number | null | undefined, 
    weightKg: number | null | undefined, 
    tbwFactor: number = 0.6,
    options?: SodiumCorrectionOptions
): SodiumCorrectionResult | null {
    if (!measuredNa || !weightKg || measuredNa <= 0 || weightKg <= 0) return null;
    
    // Total Body Water (TBW)
    const tbw = weightKg * (tbwFactor || 0.6);
    
    // HATA-M10-001: Hiperglisemik Yalancı Hiponatremi (Pseudohyponatremia) Kalkanı
    let correctedNa = measuredNa;
    let isPseudohyponatremia = false;
    let glucoseWarning = '';

    if (options?.glucoseMgDl && options.glucoseMgDl > 150) {
        const glu = options.glucoseMgDl;
        // HATA-M10-003: Glukoz > 400 ise Hillier (0.024), aksi halde Katz (0.016)
        const factor = glu > 400 ? 0.024 : 0.016;
        correctedNa = Number((measuredNa + factor * (glu - 100)).toFixed(1));
        
        if (measuredNa < 135 && correctedNa >= 135) {
            isPseudohyponatremia = true;
            glucoseWarning = `🚨 Hiperglisemik Yalancı Hiponatremi (Pseudohyponatremia): Ölçülen Na (${measuredNa} mEq/L) hiperglisemiye (Glukoz: ${glu} mg/dL) bağlı dilüsyonel olarak düşüktür. Düzeltilmiş fizyolojik sodyum ${correctedNa} mEq/L'dir (Normal/Övolemik). İnsülin tedavisiyle glukoz geriledikçe sodyum kendiliğinden yükselecektir. Hipertonik (%3) NaCl infüzyonu KONTRENDİKEDİR (Ölümcül hipernatremi riski)!`;
        }
    }

    const effectiveNa = isPseudohyponatremia ? correctedNa : measuredNa;

    // HATA-M10-004: Yüksek Riskli ODS Kalkanı (Na < 115 mEq/L, Siroz, Malnütrisyon, Alkolizm)
    const isHighRiskODS = Boolean(options?.isHighRiskODS || measuredNa < 115);
    const maxRecommendedDelta = isHighRiskODS ? 6 : 8;

    let resolvedTargetNa = targetNa;
    if (!resolvedTargetNa) {
        if (effectiveNa < 135) resolvedTargetNa = Math.min(135, effectiveNa + maxRecommendedDelta);
        else if (effectiveNa > 145) resolvedTargetNa = Math.max(145, effectiveNa - maxRecommendedDelta);
        else resolvedTargetNa = 140;
    }
    
    let warning = '';
    if (glucoseWarning) {
        warning = glucoseWarning;
    } else if (isHighRiskODS && Math.abs(resolvedTargetNa - measuredNa) > 6) {
        warning = '🚨 Yüksek ODS Riski (Derin Hiponatremi <115 mEq/L / Karaciğer Yetmezliği / Malnütrisyon): 24 saatte maksimum 4-6 mEq/L düzeltme hedeflenmelidir! Hızlı yükseltme kalıcı beyin sapı demiyelinizasyonuna (Santral Pontin Miyelinoliz / ODS) yol açar.';
    } else if (Math.abs(resolvedTargetNa - measuredNa) > 8) {
        warning = '⚠️ ODS / Serebral Ödem Riski! 24 saatte max 8 mEq/L düzeltme önerilir.';
    }

    // HATA-M10-002: Hipernatremi Durumu ve Serbest Su Açığı (FWD)
    const isHypernatremia = effectiveNa > 145;
    let deficit = 0;
    let freeWaterDeficitLiters = 0;
    let freeWaterHourlyD5WRateMl = 0;
    const deltaD5W = Number(((0 - effectiveNa) / (tbw + 1)).toFixed(2)); // Adrogué-Madias 1L D5W

    if (isHypernatremia) {
        // FWD = TBW * ((Serum Na / 140) - 1)
        const fwdRaw = tbw * ((effectiveNa / 140) - 1);
        freeWaterDeficitLiters = Number(Math.max(0, fwdRaw).toFixed(2));
        freeWaterHourlyD5WRateMl = Math.round((freeWaterDeficitLiters * 1000) / 48);
        deficit = 0; // Negatif sodyum açığı basılmaz!

        const hyperWarning = `⚠️ Hipernatremi (Na: ${effectiveNa} mEq/L): Serbest Su Açığı (FWD) ${freeWaterDeficitLiters} Litre olarak hesaplandı. Serebral ödemi önlemek için serum sodyumu 24 saatte maksimum 10-12 mEq/L (saatte ~0.5 mEq/L) hızında düşürülmeli, açık 48 saate yayılarak %5 Dekstroz ile karşılanmalıdır (Önerilen: ~${freeWaterHourlyD5WRateMl} mL/saat).`;
        warning = warning ? `${warning} | ${hyperWarning}` : hyperWarning;
    } else if (isPseudohyponatremia) {
        deficit = 0;
    } else {
        // Standart Hiponatremi: Na Deficit = TBW * (Target Na - Measured Na)
        deficit = Math.max(0, tbw * (resolvedTargetNa - measuredNa));
    }

    // Adrogué-Madias Formula for 1L of solution
    // Change in serum Na = (Infusate Na - Serum Na) / (TBW + 1)
    const deltaNa3Percent = (513 - measuredNa) / (tbw + 1);
    const deltaNa09Percent = (154 - measuredNa) / (tbw + 1);

    // Required 3% NaCl volume in mL to achieve targetNa (only when raising Na in real hyponatremia)
    const desiredRise = resolvedTargetNa - measuredNa;
    const required3PercentMl = (!isPseudohyponatremia && !isHypernatremia && desiredRise > 0 && deltaNa3Percent > 0)
        ? Math.round((desiredRise / deltaNa3Percent) * 1000)
        : 0;
    
    return {
        deficit: Math.round(deficit),
        warning,
        deltaNa3Percent: Number(deltaNa3Percent.toFixed(2)),
        deltaNa09Percent: Number(deltaNa09Percent.toFixed(2)),
        required3PercentMl,
        isPseudohyponatremia,
        correctedNa,
        isHypernatremia,
        freeWaterDeficitLiters,
        freeWaterHourlyD5WRateMl,
        deltaD5W,
        isHighRiskODS,
        maxRecommendedDelta,
        tbwLiters: Number(tbw.toFixed(1))
    };
}

export type NeonatalWeightCategory = 'TERM' | 'PRETERM_VLBW' | 'PRETERM_ELBW';
export type PhototherapyDeviceType = 'LED' | 'HALOGEN' | 'NONE';

export interface NeonatalFluidInput {
    ageDays: number | null | undefined;
    weightKg: number | null | undefined;
    birthWeightKg?: number | null | undefined;
    gestationalWeeks?: number | null | undefined;
    isPreterm?: boolean;
    isPhototherapy?: boolean;
    phototherapyType?: PhototherapyDeviceType;
    incubatorHumidityPercent?: number | null | undefined;
}

export interface NeonatalWeightLossAnalysis {
    birthWeightKg: number;
    currentWeightKg: number;
    weightLossGrams: number;
    weightLossPercent: number;
    isPathological: boolean;
    warning?: string;
}

export interface NeonatalFluidResult {
    isNeonate: boolean;
    dayNumber: number;
    dayTitle: string;
    mlPerKgMin: number;
    mlPerKgMax: number;
    mlPerKgAvg: number;
    mlPerKgRange: string;
    totalDailyMl: number;
    hourlyRateMl: number;
    girMgKgMin: number;
    targetGirRange: string;
    soluteAdvice: string;
    isPreterm: boolean;
    isPhototherapy: boolean;
    contraindicationNotice: string;
    weightCategory: NeonatalWeightCategory;
    pathologicalLossThresholdPercent: number;
    weightLossAnalysis?: NeonatalWeightLossAnalysis | null;
    phototherapyAdjustmentMl: number;
    incubatorHumidityRecommendation?: string;
}

export function calculateNeonatalFluid({ 
    ageDays, 
    weightKg, 
    birthWeightKg,
    gestationalWeeks,
    isPreterm = false, 
    isPhototherapy = false,
    phototherapyType,
    incubatorHumidityPercent
}: NeonatalFluidInput): NeonatalFluidResult | null {
    if (weightKg === null || weightKg === undefined || weightKg <= 0 || ageDays === null || ageDays === undefined || ageDays < 0) {
        return null;
    }

    const day = Math.floor(ageDays);
    let dayTitle = '';
    let minRate = 60;
    let maxRate = 70;
    let soluteAdvice = '';

    // 1. Ağırlık ve Matürite Tabakalandırması (Dosya 4 Tablo 7)
    // - PRETERM_ELBW: <1000 g (Aşırı Düşük Doğum Ağırlıklı, Küvöz nemi %80-90)
    // - PRETERM_VLBW: 1000 - 2499 g (veya <37 hafta / isPreterm)
    // - TERM: >=2500 g ve >=37 hafta
    let weightCategory: NeonatalWeightCategory = 'TERM';
    const effectiveBirthWeight = birthWeightKg || weightKg;
    if (effectiveBirthWeight < 1.0 || weightKg < 1.0) {
        weightCategory = 'PRETERM_ELBW';
    } else if (isPreterm || (gestationalWeeks !== undefined && gestationalWeeks !== null && gestationalWeeks < 37) || effectiveBirthWeight < 2.5) {
        weightCategory = 'PRETERM_VLBW';
    } else {
        weightCategory = 'TERM';
    }

    const effectivePreterm = weightCategory !== 'TERM';

    // 2. Kademeli Günlük Sıvı Miktarları (mL/kg/gün) - TND 2021 / Dosya 4 Tablo 7
    if (day === 0) {
        dayTitle = '1. Yaşam Günü (0-24s)';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 80;
            maxRate = 90;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 70;
            maxRate = 80;
        } else {
            minRate = 60;
            maxRate = 70;
        }
        soluteAdvice = 'Yalnızca %10 Dekstroz. Diürez başlayana kadar Na ve K KONTRENDİKEDİR.';
    } else if (day === 1) {
        dayTitle = '2. Yaşam Günü (24-48s)';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 90;
            maxRate = 100;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 80;
            maxRate = 90;
        } else {
            minRate = 70;
            maxRate = 80;
        }
        soluteAdvice = 'Yalnızca %10 Dekstroz. İdrar çıkışı teyit edilmeden elektrolit eklenmez.';
    } else if (day === 2) {
        dayTitle = '3. Yaşam Günü (48-72s)';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 110;
            maxRate = 120;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 100;
            maxRate = 110;
        } else {
            minRate = 80;
            maxRate = 90;
        }
        soluteAdvice = '%10 Dekstroz + Elektrolit Başla: Na (2-3 mEq/kg/gün), K (1-2 mEq/kg/gün - idrar çıkışı normalse).';
    } else if (day === 3) {
        dayTitle = '4. Yaşam Günü';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 120;
            maxRate = 140;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 110;
            maxRate = 125;
        } else {
            minRate = 100;
            maxRate = 120;
        }
        soluteAdvice = 'Dengeli idame solüsyonu (%5-7.5 Dekstroz + Na 2-3 mEq/kg + K 1-2 mEq/kg).';
    } else if (day === 4) {
        dayTitle = '5. Yaşam Günü';
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 140;
            maxRate = 160;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 130;
            maxRate = 145;
        } else {
            minRate = 120;
            maxRate = 140;
        }
        soluteAdvice = 'Dengeli idame solüsyonu (%5 Dekstroz bazlı). GIR ve kan şekeri izlenmelidir.';
    } else {
        dayTitle = `${day + 1}. Yaşam Günü (Kararlı İdame)`;
        if (weightCategory === 'PRETERM_ELBW') {
            minRate = 150;
            maxRate = 180;
        } else if (weightCategory === 'PRETERM_VLBW') {
            minRate = 140;
            maxRate = 160;
        } else {
            minRate = 140;
            maxRate = 160;
        }
        soluteAdvice = 'Tam idame sıvısı (140-160 mL/kg/gün, %5 Dekstroz bazlı) + Na/K elektrolit desteği.';
    }

    // 3. Fototerapi Sıvı Düzeltmesi (LED vs Halojen vs Standart)
    let phototherapyAdjustmentMl = 0;
    if (isPhototherapy) {
        if (phototherapyType === 'HALOGEN') {
            phototherapyAdjustmentMl = 25;
            minRate += 20;
            maxRate += 30;
            soluteAdvice += ' (Klasik halojen/kuvars fototerapi: artmış trans-epidermal buharlaşma kaybı için +20-30 mL/kg/gün eklendi).';
        } else if (phototherapyType === 'LED') {
            phototherapyAdjustmentMl = 10;
            minRate += 10;
            maxRate += 10;
            soluteAdvice += ' (Modern LED fototerapi: hafif trans-epidermal kayıp için +10 mL/kg/gün eklendi).';
        } else {
            // Standart / Belirtilmemiş Fototerapi İdame Düzeltmesi (+15 mL/kg/gün)
            phototherapyAdjustmentMl = 15;
            minRate += 15;
            maxRate += 15;
            soluteAdvice += ' (Fototerapiye bağlı artmış trans-epidermal kayıp: +15 mL/kg/gün eklendi).';
        }
    }

    // 4. Patolojik Fizyolojik Tartı Kaybı Sınırları (Dosya 4 Tablo 7)
    // Term: >%10
    // Preterm >1000g: >%14 (%12-14)
    // Preterm <1000g (ELBW): >%15
    const pathologicalThreshold = weightCategory === 'PRETERM_ELBW' ? 15.0 : (weightCategory === 'PRETERM_VLBW' ? 14.0 : 10.0);
    
    let weightLossAnalysis: NeonatalWeightLossAnalysis | null = null;
    if (birthWeightKg && birthWeightKg > 0) {
        const lossGrams = Math.round((birthWeightKg - weightKg) * 1000);
        const lossPercent = Number((((birthWeightKg - weightKg) / birthWeightKg) * 100).toFixed(1));
        const isPathological = lossPercent > pathologicalThreshold;
        let warning: string | undefined;
        if (isPathological) {
            warning = `PATOLOJİK KİLO KAYBI ALARMI: Bebek doğum ağırlığına göre %${lossPercent} tartı kaybetmiştir (Patolojik Eşik: >%${pathologicalThreshold}). Dehidratasyon ve hipernatremi riski; hidrasyonu ve beslenmeyi acilen değerlendiriniz.`;
        }
        weightLossAnalysis = {
            birthWeightKg,
            currentWeightKg: weightKg,
            weightLossGrams: lossGrams,
            weightLossPercent: lossPercent,
            isPathological,
            warning
        };
    }

    // 5. Küvöz Nemi Önerisi (ELBW)
    let incubatorHumidityRecommendation: string | undefined;
    if (weightCategory === 'PRETERM_ELBW') {
        incubatorHumidityRecommendation = 'Aşırı düşük doğum ağırlıklı (ELBW <1000 g) prematürelerde transepidermal su kaybını (TEWL) önlemek için küvöz bağıl nemi ilk günlerde %80–90 olarak korunmalıdır.';
    }

    const avgRate = Math.round((minRate + maxRate) / 2);
    const totalDailyMl = Math.round(weightKg * avgRate);
    const hourlyRateMl = +(totalDailyMl / 24).toFixed(1);

    // Day 0-2 uses %10 Dextrose (100 mg/mL); Day 3 transitions to %7.5 (75 mg/mL); Day 4+ to %5 (50 mg/mL)
    const dextroseMgPerMl = day <= 2 ? 100 : (day === 3 ? 75 : 50);
    const girMgKgMin = +((hourlyRateMl * dextroseMgPerMl) / (weightKg * 60)).toFixed(1);

    return {
        isNeonate: true,
        dayNumber: day + 1,
        dayTitle,
        mlPerKgMin: minRate,
        mlPerKgMax: maxRate,
        mlPerKgAvg: avgRate,
        mlPerKgRange: `${minRate}-${maxRate}`,
        totalDailyMl,
        hourlyRateMl,
        girMgKgMin,
        targetGirRange: effectivePreterm ? '4 - 8 mg/kg/dk' : '4 - 6 mg/kg/dk',
        soluteAdvice,
        isPreterm: effectivePreterm,
        isPhototherapy,
        contraindicationNotice: '⚠️ Yenidoğan Dönemi: Klasik Holliday-Segar (100 mL/kg) KONTRENDİKEDİR! TND kademeli günlük sıvı protokolü uygulanmaktadır. Rutin oral su veya %5 Dekstroz verilmesi KESİNLİKLE YASAKTIR (hiponatremi riski).',
        weightCategory,
        pathologicalLossThresholdPercent: pathologicalThreshold,
        weightLossAnalysis,
        phototherapyAdjustmentMl,
        incubatorHumidityRecommendation
    };
}
