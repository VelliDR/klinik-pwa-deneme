/**
 * klinik-pwa - Smart Prescription & Drug Safety Engine
 * 
 * Clinical Safety Features:
 * 1. eGFR-Based Renal Drug Dose Adjustments & Contraindications (KDIGO Guidelines)
 * 2. "Triple Whammy" Acute Kidney Injury (AKI) Interaction Detection (ACEi/ARB + Diuretic + NSAID)
 * 3. Teratogenic & Fetal Toxicity Alerts in Pregnancy & Lactation
 * 
 * Standards & Guidelines:
 * - KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease
 * - Turkish Ministry of Health / TITCK Approved Summary of Product Characteristics (KÜB)
 * - FDA & EMA Drug Interaction Bulletins on Triple Whammy AKI Risk
 * - Briggs Drugs in Pregnancy and Lactation: A Reference Guide to Fetal and Neonatal Risk
 */

/**
 * 1. RENAL DOSE ADJUSTMENT DATABASE (eGFR cut-offs in mL/min/1.73m²)
 */
export const RENAL_DRUG_DATABASE = [
  {
    generic: 'metformin',
    aliases: ['glukofen', 'diaformin', 'matofin', 'glifor'],
    atcPrefix: 'A10BA02',
    name: 'Metformin',
    rules: [
      { maxEgfr: 29, status: 'CONTRAINDICATED', message: 'KONTRENDİKE! eGFR < 30 mL/dk durumunda laktik asidoz riski nedeniyle kesinlikle kullanılmamalıdır.' },
      { maxEgfr: 44, status: 'DOSE_REDUCTION', message: 'Maksimum doz 500-1000 mg/gün ile sınırlandırılmalıdır. Yeni tedavi başlanması önerilmez.' },
      { maxEgfr: 59, status: 'MONITORING', message: 'Maksimum doz 1000-2000 mg/gün. 3-6 ayda bir eGFR ve renal fonksiyon kontrolü yapılmalıdır.' }
    ]
  },
  {
    generic: 'ciprofloxacin',
    aliases: ['siprofloksasin', 'cipro', 'ciflosin', 'roksin'],
    atcPrefix: 'J01MA02',
    name: 'Siprofloksasin (Ciprofloxacin)',
    rules: [
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'eGFR < 30 mL/dk: Doz %50 azaltılmalı veya doz aralığı 24 saate çıkarılmalıdır (Maks 500 mg/gün oral veya 400 mg/gün IV).' }
    ]
  },
  {
    generic: 'levofloxacin',
    aliases: ['levofloksasin', 'tavanic', 'levonidin', 'kravit'],
    atcPrefix: 'J01MA12',
    name: 'Levofloksasin (Levofloxacin)',
    rules: [
      { maxEgfr: 19, status: 'DOSE_REDUCTION', message: 'eGFR < 20 mL/dk: İlk doz 500 mg, ardından her 24 saatte 125 mg idame dozu verilmelidir.' },
      { maxEgfr: 49, status: 'DOSE_REDUCTION', message: 'eGFR 20-49 mL/dk: İlk doz 500 mg, ardından her 24 saatte 250 mg idame dozu verilmelidir.' }
    ]
  },
  {
    generic: 'enoxaparin',
    aliases: ['enoksaparin', 'clexane', 'innohep', 'oxapar'],
    atcPrefix: 'B01AB05',
    name: 'Enoksaparin (Clexane)',
    rules: [
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'eGFR < 30 mL/dk: Terapötik doz %50 azaltılarak günde tek doz 1 mg/kg uygulanmalıdır. Profilakside ise günde 20 mg önerilir. Anti-Xa düzeyi izlenmelidir.' }
    ]
  },
  {
    generic: 'gabapentin',
    aliases: ['neurontin', 'gabateva', 'neruda'],
    atcPrefix: 'N02BF01',
    name: 'Gabapentin',
    rules: [
      { maxEgfr: 14, status: 'DOSE_REDUCTION', message: 'eGFR < 15 mL/dk: Maksimum doz 100-300 mg/gün veya günaşırı verilmelidir (Ciddi nörotoksisite riski).' },
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'eGFR 15-29 mL/dk: Maksimum doz 200-700 mg/gün (günde 1-2 doz).' },
      { maxEgfr: 59, status: 'DOSE_REDUCTION', message: 'eGFR 30-59 mL/dk: Maksimum doz 400-1400 mg/gün (günde 2 doza bölünmüş).' }
    ]
  },
  {
    generic: 'pregabalin',
    aliases: ['lyrica', 'gerica', 'neopres', 'lyrpre'],
    atcPrefix: 'N02BF02',
    name: 'Pregabalin',
    rules: [
      { maxEgfr: 14, status: 'DOSE_REDUCTION', message: 'eGFR < 15 mL/dk: Doz %85 azaltılmalıdır (25-75 mg/gün tek doz).' },
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'eGFR 15-29 mL/dk: Doz %75 azaltılmalıdır (25-150 mg/gün tek veya iki doz).' },
      { maxEgfr: 59, status: 'DOSE_REDUCTION', message: 'eGFR 30-59 mL/dk: Doz %50 azaltılmalıdır (75-300 mg/gün iki doza bölünmüş).' }
    ]
  },
  {
    generic: 'allopurinol',
    aliases: ['allopürinol', 'ürikoliz', 'uricid'],
    atcPrefix: 'M04AA01',
    name: 'Allopürinol (Allopurinol)',
    rules: [
      { maxEgfr: 9, status: 'DOSE_REDUCTION', message: 'eGFR < 10 mL/dk: Maksimum 100 mg günaşırı veya haftalık (DRESS ve Stevens-Johnson riski).' },
      { maxEgfr: 19, status: 'DOSE_REDUCTION', message: 'eGFR 10-19 mL/dk: Maksimum 100 mg/gün ile sınırlandırılmalıdır.' },
      { maxEgfr: 49, status: 'DOSE_REDUCTION', message: 'eGFR 20-49 mL/dk: Maksimum 200 mg/gün ile sınırlandırılmalıdır.' }
    ]
  },
  {
    generic: 'spironolactone',
    aliases: ['spironolakton', 'aldactone'],
    atcPrefix: 'C03DA01',
    name: 'Spironolakton',
    rules: [
      { maxEgfr: 29, status: 'CONTRAINDICATED', message: 'KONTRENDİKE! eGFR < 30 mL/dk durumunda ölümcül hiperkalemi riski nedeniyle kullanılmamalıdır.' },
      { maxEgfr: 49, status: 'WARNING', message: 'eGFR 30-49 mL/dk: Başlangıç dozu günde 12.5-25 mg olmalı, serum potasyumu 1. ve 4. haftalarda sık izlenmelidir.' }
    ]
  },
  {
    generic: 'colchicine',
    aliases: ['kolşisin', 'kolposin', 'kolsin'],
    atcPrefix: 'M04AC01',
    name: 'Kolşisin (Colchicine)',
    rules: [
      { maxEgfr: 29, status: 'CONTRAINDICATED', message: 'KONTRENDİKE veya ŞİDDETLİ UYARI! eGFR < 30 mL/dk: Şiddetli miyopati, nöropati ve kemik iliği baskılanması riski.' },
      { maxEgfr: 49, status: 'DOSE_REDUCTION', message: 'eGFR 30-49 mL/dk: Doz %50 azaltılmalı ve ataklar arası tedavi aralıkları uzatılmalıdır.' }
    ]
  },
  {
    generic: 'nitrofurantoin',
    aliases: ['piyeloseptil', 'pyeloseptyl'],
    atcPrefix: 'J01XE01',
    name: 'Nitrofurantoin',
    rules: [
      { maxEgfr: 29, status: 'CONTRAINDICATED', message: 'KONTRENDİKE! eGFR < 30 mL/dk (yaşlılarda < 45 mL/dk) idrarda terapötik konsantrasyon sağlayamaz ve toksik periferik nöropati riski artar.' }
    ]
  },
  {
    generic: 'dabigatran',
    aliases: ['pradaxa'],
    atcPrefix: 'B01AE07',
    name: 'Dabigatran',
    rules: [
      { maxEgfr: 29, status: 'CONTRAINDICATED', message: 'KONTRENDİKE! eGFR < 30 mL/dk durumunda birikim ve kontrolsüz major kanama riski.' },
      { maxEgfr: 49, status: 'DOSE_REDUCTION', message: 'eGFR 30-49 mL/dk: Doz günde iki kez 110 mg olarak azaltılmalıdır (Kanama riski yüksekse).' }
    ]
  },
  {
    generic: 'rivaroxaban',
    aliases: ['xarelto'],
    atcPrefix: 'B01AF01',
    name: 'Rivaroksaban',
    rules: [
      { maxEgfr: 14, status: 'CONTRAINDICATED', message: 'KONTRENDİKE / ÖNERİLMEZ! eGFR < 15 mL/dk klinik çalışma verisi yetersiz ve kanama riski yüksek.' },
      { maxEgfr: 49, status: 'DOSE_REDUCTION', message: 'eGFR 15-49 mL/dk: AF inme profilaksisinde standart 20 mg yerine 15 mg/gün önerilir.' }
    ]
  },
  {
    generic: 'clarithromycin',
    aliases: ['klaritromisin', 'klacid', 'claricide', 'macrol', 'largopen'],
    atcPrefix: 'J01FA09',
    name: 'Klaritromisin (Clarithromycin)',
    rules: [
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'eGFR < 30 mL/dk: Doz %50 azaltılmalıdır (Günde 250 mg veya şiddetli enfeksiyonda günde iki kez 250 mg).' }
    ]
  }
];

/**
 * 2. TRIPLE WHAMMY DRUG CLASS DEFINITIONS
 */
const TRIPLE_WHAMMY_CLASSES = {
  rasBlockers: {
    label: 'RAS Blokörü (ACEi / ARB)',
    atcPrefixes: ['C09A', 'C09B', 'C09C', 'C09D'],
    keywords: [
      'ramipril', 'enalapril', 'lisinopril', 'perindopril', 'captopril', 'kaptopril', 'fosinopril', 'zofenopril',
      'losartan', 'valsartan', 'candesartan', 'kandesartan', 'telmisartan', 'irbesartan', 'olmesartan',
      'delix', 'vasoxen', 'co-diovan', 'karvezid', 'micardis', 'atacand', 'coversyl', 'enap', 'renitec'
    ]
  },
  diuretics: {
    label: 'Diüretik (Kıvrım / Tiyazid / K-Tutucu)',
    atcPrefixes: ['C03'],
    keywords: [
      'furosemide', 'furosemid', 'lasix', 'desal', 'torasemide', 'torasemid', 'torem',
      'hydrochlorothiazide', 'hidroklorotiyazid', 'hctz', 'indapamide', 'indapamid', 'fludex',
      'chlorthalidone', 'klortalidon', 'spironolactone', 'spironolakton', 'aldactone', 'eplerenone', 'inspra'
    ]
  },
  nsaids: {
    label: 'NSAİİ (Non-Steroid Antiinflamatuar İlaç)',
    atcPrefixes: ['M01A'],
    keywords: [
      'ibuprofen', 'naproxen', 'naproksen', 'diclofenac', 'diklofenak', 'meloxicam', 'meloksikam',
      'etodolac', 'etodolak', 'ketoprofen', 'dexketoprofen', 'deksketoprofen', 'flurbiprofen', 'celecoxib',
      'selekoksib', 'indomethacin', 'indometazin', 'arveles', 'apranax', 'voltaren', 'dolorex', 'majezik',
      'advil', 'nurofen', 'iprofen', 'tilcotil', 'bi-profenid'
    ]
  }
};

/**
 * 3. PREGNANCY & LACTATION HIGH RISK DATABASE
 */
const PREGNANCY_RISK_DATABASE = [
  {
    category: 'X',
    name: 'İzotretinoin (Roaccutane / Zoretanin)',
    keywords: ['isotretinoin', 'izotretinoin', 'roaccutane', 'zoretanin', 'aknetrent'],
    warning: 'KESİN KONTRENDİKE (Kategori X). Majör kraniofasiyal, kardiyovasküler ve timik malformasyon riski çok yüksektir. Gebelikten en az 1 ay önce kesilmelidir.'
  },
  {
    category: 'X',
    name: 'Metotreksat (Methotrexate)',
    keywords: ['methotrexate', 'metotreksat', 'emthexate', 'trexan'],
    warning: 'KESİN KONTRENDİKE (Kategori X). Güçlü teratojen ve abortifasyan. Kraniyofasiyal defektler ve fetal ölüm riski.'
  },
  {
    category: 'X',
    name: 'Statinler (Atorvastatin, Rosuvastatin)',
    keywords: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'lipitor', 'crestor', 'tarden', 'kolestor'],
    warning: 'KONTRENDİKE. Kolesterol sentezi fetal organogenez için elzemdir. Gebelikte ve emzirme döneminde kullanılmamalıdır.'
  },
  {
    category: 'D/X',
    name: 'Varfarin (Warfarin / Coumadin)',
    keywords: ['warfarin', 'varfarin', 'coumadin'],
    warning: 'KONTRENDİKE (Fetal Varfarin Sendromu, kondrodisplazi punktata, MSS anomalileri). Gebelikte DMAH (Enoksaparin) tercih edilmelidir.'
  },
  {
    category: 'D',
    name: 'ACE İnhibitörleri ve ARB\'ler (Ramipril, Losartan vb.)',
    keywords: ['ramipril', 'enalapril', 'lisinopril', 'losartan', 'valsartan', 'candesartan', 'delix', 'atacand', 'co-diovan'],
    warning: '2. VE 3. TRİMESTERDE KONTRENDİKE. Fetal renal disgenezis, oligohidramniyoz, pulmoner hipoplazi ve neonatal anüri riski.'
  },
  {
    category: 'D',
    name: 'Valproik Asit (Depakin)',
    keywords: ['valproate', 'valproik', 'depakin', 'convulex'],
    warning: 'YÜKSEK TERATOJENİTE RİSKİ. Nöral tüp defektleri (spina bifida) ve bilişsel gerilik riski. Mümkünse alternatif antiepileptik seçilmelidir.'
  },
  {
    category: 'D',
    name: 'NSAİİ\'ler (3. Trimesterde İbuprofen, Diklofenak vb.)',
    keywords: ['ibuprofen', 'naproxen', 'naproksen', 'diclofenac', 'diklofenak', 'dexketoprofen', 'deksketoprofen', 'ketoprofen', 'etodolac', 'etodolak', 'meloxicam', 'meloksikam', 'flurbiprofen', 'celecoxib', 'selekoksib', 'arveles', 'apranax', 'voltaren', 'dolorex', 'majezik'],
    warning: '3. TRİMESTERDE KONTRENDİKE (≥28. Hafta). Fetal duktus arteriozusun erken kapanması, pulmoner hipertansiyon ve oligohidramniyoz riski.'
  },
  {
    category: 'D',
    name: 'Tetrasiklinler / Doksisiklin',
    keywords: ['doxycycline', 'doksisiklin', 'monodox', 'tetradox'],
    warning: '2. VE 3. TRİMESTERDE ÖNERİLMEZ. Fetal dişlerde kalıcı sarı-kahverengi renk değişimi ve kemik büyüme geriliği.'
  }
];

/**
 * Metin normalizasyonu (Türkçe karakter ve küçük harf)
 */
function normalizeStr(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/**
 * 1. eGFR Bazlı Renal Doz ve Kontrendikasyon Analiz Motoru
 * @param {Object} params
 * @param {number} params.egfr - Hastanın eGFR değeri (mL/dk/1.73m²)
 * @param {Array<Object|string>} params.drugs - İlaç listesi (nesne veya ilaç adı)
 * @returns {Object}
 */
export function checkRenalDoseAdjustments(params = {}) {
  const egfr = Number(params.egfr);
  const drugs = Array.isArray(params.drugs) ? params.drugs : [];

  if (isNaN(egfr) || egfr <= 0) {
    return {
      isValid: false,
      message: 'Lütfen geçerli bir eGFR değeri giriniz.'
    };
  }

  const warnings = [];

  for (const drugInput of drugs) {
    let drugName = '';
    let atc = '';

    if (typeof drugInput === 'string') {
      drugName = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      drugName = drugInput.name || drugInput.brandName || drugInput.generic || '';
      atc = drugInput.atcCode || drugInput.atc || '';
    }

    const normName = normalizeStr(drugName);
    const normAtc = normalizeStr(atc);

    // Veritabanında eşleşen ilacı bul
    const matchedEntry = RENAL_DRUG_DATABASE.find(entry => {
      if (entry.atcPrefix && normAtc.startsWith(normalizeStr(entry.atcPrefix))) {
        return true;
      }
      if (normName.includes(normalizeStr(entry.generic))) {
        return true;
      }
      return entry.aliases.some(alias => normName.includes(normalizeStr(alias)));
    });

    if (matchedEntry) {
      // Kural kontrolü (en katı kuraldan başla)
      const sortedRules = [...matchedEntry.rules].sort((a, b) => a.maxEgfr - b.maxEgfr);
      const triggeredRule = sortedRules.find(r => egfr <= r.maxEgfr);

      if (triggeredRule) {
        warnings.push({
          drug: matchedEntry.name,
          userDrugQuery: drugName,
          status: triggeredRule.status,
          alertClass: triggeredRule.status === 'CONTRAINDICATED' ? 'danger' : 'warning',
          message: triggeredRule.message,
          thresholdEgfr: triggeredRule.maxEgfr,
          currentEgfr: egfr
        });
      }
    }
  }

  const hasContraindication = warnings.some(w => w.status === 'CONTRAINDICATED');

  return {
    isValid: true,
    egfr,
    totalChecked: drugs.length,
    alertsCount: warnings.length,
    hasContraindication,
    alertClass: hasContraindication ? 'danger' : (warnings.length > 0 ? 'warning' : 'success'),
    warnings
  };
}

/**
 * 2. "Triple Whammy" Akut Böbrek Hasarı İlaç Etkileşim Tespit Motoru
 * (ACEi/ARB + Diüretik + NSAİİ eşzamanlı kullanımı)
 * @param {Array<Object|string>} drugs - Değerlendirilecek ilaç listesi
 * @returns {Object}
 */
export function detectTripleWhammy(drugs = []) {
  if (!Array.isArray(drugs) || drugs.length === 0) {
    return {
      isTripleWhammy: false,
      isDoubleRisk: false,
      presentClasses: []
    };
  }

  const detected = {
    rasBlocker: [],
    diuretic: [],
    nsaid: []
  };

  for (const drugInput of drugs) {
    let name = '';
    let atc = '';
    if (typeof drugInput === 'string') {
      name = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      name = drugInput.name || drugInput.brandName || drugInput.generic || '';
      atc = drugInput.atcCode || drugInput.atc || '';
    }

    const normName = normalizeStr(name);
    const normAtc = normalizeStr(atc);

    // RAS Blocker Check
    const isRas = TRIPLE_WHAMMY_CLASSES.rasBlockers.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
                  TRIPLE_WHAMMY_CLASSES.rasBlockers.keywords.some(k => normName.includes(normalizeStr(k)));
    if (isRas) detected.rasBlocker.push(name || 'ACEi/ARB');

    // Diuretic Check
    const isDiuretic = TRIPLE_WHAMMY_CLASSES.diuretics.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
                       TRIPLE_WHAMMY_CLASSES.diuretics.keywords.some(k => normName.includes(normalizeStr(k)));
    if (isDiuretic) detected.diuretic.push(name || 'Diüretik');

    // NSAID Check
    const isNsaid = TRIPLE_WHAMMY_CLASSES.nsaids.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
                    TRIPLE_WHAMMY_CLASSES.nsaids.keywords.some(k => normName.includes(normalizeStr(k)));
    if (isNsaid) detected.nsaid.push(name || 'NSAİİ');
  }

  const hasRas = detected.rasBlocker.length > 0;
  const hasDiuretic = detected.diuretic.length > 0;
  const hasNsaid = detected.nsaid.length > 0;

  const presentCount = (hasRas ? 1 : 0) + (hasDiuretic ? 1 : 0) + (hasNsaid ? 1 : 0);

  if (hasRas && hasDiuretic && hasNsaid) {
    return {
      isTripleWhammy: true,
      isDoubleRisk: false,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 TRIPLE WHAMMY AKUT BÖBREK HASARI (ABH) RİSKİ!',
      mechanism: 'ACEi/ARB (Efferent vazodilatasyon) + Diüretik (Hipovolemi/perfüzyon azalması) + NSAİİ (Afferent vazokonstriksiyon) kombinasyonu glomerüler filtrasyon basıncını ani olarak çökertir.',
      detectedDrugs: {
        rasBlockers: detected.rasBlocker,
        diuretics: detected.diuretic,
        nsaids: detected.nsaid
      },
      recommendations: [
        'Kombinasyon derhal gözden geçirilmeli; NSAİİ kullanımından ACİLEN kaçınılmalıdır.',
        'Ağrı tedavisinde Parasetamol ilk tercih olarak değerlendirilmelidir.',
        'Serum kreatinin ve potasyum seviyeleri yakından izlenmelidir (Ciddi hiperkalemi riski).',
        'Hasta dehidratasyon bulguları açısından uyarılmalıdır.'
      ]
    };
  }

  if (presentCount === 2) {
    let subTitle = '';
    if (hasRas && hasNsaid) subTitle = 'RAS Blokörü + NSAİİ Kombinasyonu (Renal hemodinami bozukluğu riski)';
    else if (hasDiuretic && hasNsaid) subTitle = 'Diüretik + NSAİİ Kombinasyonu (Prerenal azotemi ve ödem riski)';
    else if (hasRas && hasDiuretic) subTitle = 'RAS Blokörü + Diüretik Kombinasyonu (Rutin takip önerilir)';

    return {
      isTripleWhammy: false,
      isDoubleRisk: true,
      severity: 'WARNING',
      alertClass: 'warning',
      title: `⚠️ ${subTitle}`,
      detectedDrugs: {
        rasBlockers: detected.rasBlocker,
        diuretics: detected.diuretic,
        nsaids: detected.nsaid
      },
      recommendations: [
        'Üçüncü bir nefrotoksik ajanın (özellikle reçetesiz NSAİİ) eklenmemesi için hasta uyarılmalıdır.',
        'Özellikle yaşlı, diyabetik veya KBH öyküsü olan hastalarda renal fonksiyon takibi yapılmalıdır.'
      ]
    };
  }

  return {
    isTripleWhammy: false,
    isDoubleRisk: false,
    alertClass: 'success',
    title: 'Triple Whammy Riski Tespit Edilmedi',
    detectedDrugs: detected
  };
}

/**
 * 3. Gebelik ve Laktasyon Güvenlik Motoru
 * @param {Array<Object|string>} drugs - İlaç listesi
 * @param {Object} [options]
 * @param {number} [options.trimester=1] - Gebelik trimesteri (1, 2, 3)
 * @returns {Object}
 */
export function checkPregnancySafety(drugs = [], options = {}) {
  const trimester = Number(options.trimester || 1);
  const alerts = [];

  if (!Array.isArray(drugs)) return { alerts: [] };

  for (const drugInput of drugs) {
    let name = '';
    if (typeof drugInput === 'string') {
      name = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      name = `${drugInput.brand || ''} ${drugInput.brandName || ''} ${drugInput.name || ''} ${drugInput.generic || ''}`.trim();
    }

    const normName = normalizeStr(name);

    for (const entry of PREGNANCY_RISK_DATABASE) {
      const isMatched = entry.keywords.some(k => normName.includes(normalizeStr(k)));
      if (isMatched) {
        // Trimester spesifik kontroller
        let isRelevant = true;
        if (entry.name.includes('3. Trimesterde') && trimester < 3) {
          isRelevant = false;
        }

        alerts.push({
          drugName: entry.name,
          userDrug: name,
          category: entry.category,
          warning: entry.warning,
          isHighRisk: entry.category === 'X' || (entry.category === 'D' && isRelevant)
        });
      }
    }
  }

  return {
    totalChecked: drugs.length,
    alertsCount: alerts.length,
    hasSevereFetalRisk: alerts.some(a => a.category === 'X'),
    alerts
  };
}
