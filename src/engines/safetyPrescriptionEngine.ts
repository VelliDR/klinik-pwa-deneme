/**
 * klinik-pwa - Smart Prescription & Drug Safety Engine (TypeScript)
 * 
 * Clinical Safety Features:
 * 1. eGFR-Based Renal Drug Dose Adjustments & Contraindications (KDIGO Guidelines)
 * 2. "Triple Whammy" Acute Kidney Injury (AKI) Interaction Detection (ACEi/ARB + Diuretic + NSAID)
 * 3. Teratogenic & Fetal Toxicity Alerts in Pregnancy & Lactation
 * 4. Neonatal Drug Toxicity & Contraindication Shield (Kernicterus, Gray Baby, etc.)
 * 
 * Standards & Guidelines:
 * - KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease
 * - Turkish Ministry of Health / TITCK Approved Summary of Product Characteristics (KÜB)
 * - FDA & EMA Drug Interaction Bulletins on Triple Whammy AKI Risk
 * - Briggs Drugs in Pregnancy and Lactation: A Reference Guide to Fetal and Neonatal Risk
 * - Türk Neonatoloji Derneği (TND) Yenidoğan Farmakoterapi İlkeleri
 */

import type {
  DrugInputItem,
  RenalDrugEntry,
  RenalDoseWarning,
  RenalDoseCheckParams,
  RenalDoseCheckResult,
  TripleWhammyResult,
  PregnancySafetyAlert,
  PregnancySafetyResult,
  NeonatalContraindicatedDrug,
  NeonatalDrugAlert,
  NeonatalDrugSafetyResult,
  SerotoninSyndromeResult,
  HyperkalemiaRiskResult,
  CypStatinInteractionResult
} from '../types/engines';
import {
  evaluateComprehensiveRenalFunction,
  identifyRenalDrugCategory
} from './renalDoseEngine';
import { resolveToRxNormConcept } from './rxNormMappingEngine';
import { calculateDetailedEGFR } from './biometricsEngine';

/**
 * 1. RENAL DOSE ADJUSTMENT DATABASE (eGFR cut-offs in mL/min/1.73m²)
 */
export const RENAL_DRUG_DATABASE: RenalDrugEntry[] = [
  {
    generic: 'metformin',
    aliases: ['glukofen', 'glucophage', 'diaformin', 'matofin', 'glifor'],
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
    aliases: ['klaritromisin', 'klacid', 'claricide', 'macrol'],
    atcPrefix: 'J01FA09',
    name: 'Klaritromisin (Clarithromycin)',
    rules: [
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'eGFR < 30 mL/dk: Doz %50 azaltılmalıdır (Günde 250 mg veya şiddetli enfeksiyonda günde iki kez 250 mg).' }
    ]
  },
  {
    generic: 'amoxicillin',
    aliases: ['amoksisilin', 'largopen', 'alfoxil', 'amoklavin', 'augmentin', 'klavunat', 'bioment', 'klamoks', 'croxilex', 'amoksilav', 'aktil'],
    atcPrefix: 'J01CA04',
    name: 'Amoksisilin (Amoxicillin)',
    rules: [
      { maxEgfr: 9, status: 'DOSE_REDUCTION', message: 'eGFR < 10 mL/dk: Doz aralığı 24 saate çıkarılmalıdır (250-500 mg / 24 saat). Yüksek doz ve uzatılmış salımlı formlardan kaçınılmalıdır.' },
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'eGFR 10-29 mL/dk: Doz aralığı 12 saate çıkarılmalıdır (250-500 mg / 12 saat).' }
    ]
  },
  {
    generic: 'apixaban',
    aliases: ['apiksaban', 'eliquis'],
    atcPrefix: 'B01AF02',
    name: 'Apiksaban (Eliquis)',
    rules: [
      { maxEgfr: 14, status: 'CONTRAINDICATED', message: 'KONTRENDİKE / ÖNERİLMEZ! CrCl < 15 mL/dak: Klinik veri yetersizdir, kanama riski nedeniyle kullanılmamalıdır (EHRA 2021).' },
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'CrCl 15-29 mL/dak: Doz günde iki kez 2.5 mg olarak azaltılmalıdır (veya Serum kreatinin ≥1.5 mg/dL + Yaş ≥80 veya Kilo ≤60 kg kriterlerinden en az ikisi varsa 2x2.5 mg; EHRA 2021).' }
    ]
  },
  {
    generic: 'edoxaban',
    aliases: ['edoksaban', 'lixiana'],
    atcPrefix: 'B01AF03',
    name: 'Edoksaban (Lixiana)',
    rules: [
      { maxEgfr: 14, status: 'CONTRAINDICATED', message: 'KONTRENDİKE! CrCl < 15 mL/dak: Kullanımı önerilmez.' },
      { maxEgfr: 50, status: 'DOSE_REDUCTION', message: 'CrCl 15-50 mL/dak: Doz günde tek doz 30 mg olarak azaltılmalıdır (Standart 60 mg yerine; EHRA 2021).' }
    ]
  },
  {
    generic: 'vancomycin',
    aliases: ['vankomisin', 'vancocin', 'edicin', 'vancomax'],
    atcPrefix: 'J01XA01',
    name: 'Vankomisin (Vancomycin)',
    rules: [
      { maxEgfr: 20, status: 'DOSE_REDUCTION', message: 'Mutlak GFR < 20 mL/dak: Doz aralığı 48-72 saate çıkarılmalı veya seviye bazlı (AUC/MIC veya trough düzeyi) verilmelidir; TDM zorunludur.' },
      { maxEgfr: 49, status: 'DOSE_REDUCTION', message: 'Mutlak GFR 20-49 mL/dak: Doz aralığı 24 saate çıkarılmalıdır (15-20 mg/kg / 24 saat); vadi düzeyi (trough) izlenmelidir.' }
    ]
  },
  {
    generic: 'digoxin',
    aliases: ['digoksin', 'digoxin-sandoz'],
    atcPrefix: 'C01AA05',
    name: 'Digoksin (Digoxin)',
    rules: [
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'CrCl / GFR < 30 mL/dak: Doz %50 azaltılmalı (0.0625 mg günaşırı veya günde 1 kez); serum digoksin düzeyi sıkı izlenmelidir.' },
      { maxEgfr: 50, status: 'DOSE_REDUCTION', message: 'CrCl / GFR 30-50 mL/dak: Doz %25-33 azaltılmalıdır (0.125 mg/gün).' }
    ]
  },
  {
    generic: 'ibuprofen',
    aliases: ['ibufen', 'dolven', 'pedifen', 'aradon', 'brufen', 'ibu-baby', 'advil', 'nurofen', 'suprafen', 'profeno'],
    atcPrefix: 'M01AE01',
    name: 'İbuprofen (Ibuprofen)',
    rules: [
      { maxEgfr: 29, status: 'CONTRAINDICATED', message: 'KONTRENDİKE! eGFR < 30 mL/dk: Akut böbrek hasarı, sıvı retansiyonu ve renal prostaglandin inhibisyonu nedeniyle kontrendikedir.' },
      { maxEgfr: 59, status: 'WARNING', message: 'eGFR 30-59 mL/dk: Dehidratasyon düzeltilmeden verilmemeli, en düşük doz ve en kısa süre tercih edilmelidir.' }
    ]
  },
  {
    generic: 'methotrexate',
    aliases: ['metotreksat', 'trexan', 'methotrexate-ebewe', 'emthexate'],
    atcPrefix: 'L01BA01',
    name: 'Metotreksat (Methotrexate)',
    rules: [
      { maxEgfr: 29, status: 'CONTRAINDICATED', message: 'KONTRENDİKE! CrCl / Mutlak GFR < 30 mL/dak: %80-90 renal atılım; şiddetli kemik iliği baskılanması ve nefrotoksisite riski nedeniyle kontrendikedir.' },
      { maxEgfr: 59, status: 'DOSE_REDUCTION', message: 'CrCl / Mutlak GFR 30-59 mL/dak: Haftalık doz %50 azaltılmalı, yakın hemogram ve renal fonksiyon izlenmelidir.' }
    ]
  },
  {
    generic: 'sitagliptin',
    aliases: ['januvia', 'glactiv', 'sitaglip', 'janumet'],
    atcPrefix: 'A10BH01',
    name: 'Sitagliptin',
    rules: [
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'eGFR < 30 mL/dk: Doz günde tek doz 25 mg olarak sınırlandırılmalıdır (Standart 100 mg yerine %75 azaltım).' },
      { maxEgfr: 44, status: 'DOSE_REDUCTION', message: 'eGFR 30-44 mL/dk: Doz günde tek doz 50 mg olarak sınırlandırılmalıdır (Standart 100 mg yerine %50 azaltım).' }
    ]
  },
  {
    generic: 'acyclovir',
    aliases: ['asiklovir', 'aklovir', 'asiviral', 'herpavir', 'virosil', 'zovirax'],
    atcPrefix: 'J01EA01',
    name: 'Asiklovir (Acyclovir)',
    rules: [
      { maxEgfr: 10, status: 'DOSE_REDUCTION', message: 'eGFR < 10 mL/dk: Doz %50 azaltılmalı ve doz aralığı 24 saate açılmalıdır (Kristalüri ve nörotoksisite riski).' },
      { maxEgfr: 25, status: 'DOSE_REDUCTION', message: 'eGFR 10-25 mL/dk: Doz aralığı 24 saate çıkarılmalıdır.' },
      { maxEgfr: 50, status: 'DOSE_REDUCTION', message: 'eGFR 26-50 mL/dk: Doz aralığı 12 saate çıkarılmalıdır.' }
    ]
  },
  {
    generic: 'gentamicin',
    aliases: ['gentamisin', 'getamisin', 'gensu', 'gencina'],
    atcPrefix: 'J01GB03',
    name: 'Gentamisin (Gentamicin)',
    rules: [
      { maxEgfr: 29, status: 'DOSE_REDUCTION', message: 'Mutlak GFR < 30 mL/dak: Doz aralığı uzatılmalı ve çukur (trough) serum düzeyi (<1 mcg/mL) kontrol edilerek dozlanmalıdır; TDM ve nefrotoksisite izlemi şarttır.' },
      { maxEgfr: 50, status: 'DOSE_REDUCTION', message: 'Mutlak GFR 30-50 mL/dak: Doz aralığı 24-36 saate uzatılmalı, vadi düzeyi izlenmelidir.' }
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
      'ibuprofen', 'ibufen', 'naproxen', 'naproksen', 'diclofenac', 'diklofenak', 'meloxicam', 'meloksikam',
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
    category: 'PLLR: Kontrendike (X)',
    name: 'İzotretinoin (Roaccutane / Zoretanin)',
    atcPrefixes: ['D10BA01'],
    keywords: ['isotretinoin', 'izotretinoin', 'roaccutane', 'zoretanin', 'aknetrent'],
    warning: 'KESİN KONTRENDİKE (FDA PLLR: Majör Teratojen; TİTCK: Kategori X). Majör kraniofasiyal, kardiyovasküler ve timik malformasyon riski çok yüksektir. Gebelikten en az 1 ay önce kesilmelidir.'
  },
  {
    category: 'PLLR: Kontrendike (X)',
    name: 'Metotreksat (Methotrexate)',
    atcPrefixes: ['L01BA01', 'L04AX03'],
    keywords: ['methotrexate', 'metotreksat', 'emthexate', 'trexan'],
    warning: 'KESİN KONTRENDİKE (FDA PLLR: Fetal Ölüm / Teratojenite; TİTCK: Kategori X). Güçlü teratojen ve abortifasyan. Kraniyofasiyal defektler ve fetal ölüm riski.'
  },
  {
    category: 'PLLR: Kontrendike (X)',
    name: 'Statinler (Atorvastatin, Rosuvastatin)',
    atcPrefixes: ['C10AA'],
    keywords: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'lovastatin', 'pitavastatin', 'pravastatin', 'fluvastatin', 'lipitor', 'crestor', 'tarden', 'kolestor', 'zocor', 'lipovas'],
    warning: 'KONTRENDİKE (FDA PLLR: Fetal Kolesterol Sentezi İnhibisyonu; TİTCK: Kategori X). Kolesterol sentezi fetal organogenez için elzemdir. Gebelikte ve emzirme döneminde kullanılmamalıdır.'
  },
  {
    category: 'PLLR: Kontrendike / Yüksek Risk (D/X)',
    name: 'Varfarin (Warfarin / Coumadin)',
    atcPrefixes: ['B01AA03'],
    keywords: ['warfarin', 'varfarin', 'coumadin'],
    warning: 'KONTRENDİKE (FDA PLLR: Fetal Varfarin Sendromu, kondrodisplazi punktata, MSS anomalileri; TİTCK: Kategori D/X). Gebelikte DMAH (Enoksaparin) tercih edilmelidir.'
  },
  {
    category: 'PLLR: Yüksek Risk / Fetal Toksisite (D)',
    name: 'ACE İnhibitörleri ve ARB\'ler (Ramipril, Losartan vb.)',
    atcPrefixes: ['C09A', 'C09B', 'C09C', 'C09D'],
    keywords: [
      'ramipril', 'enalapril', 'lisinopril', 'perindopril', 'captopril', 'kaptopril', 'kapril', 'fosinopril', 'zofenopril',
      'losartan', 'valsartan', 'candesartan', 'kandesartan', 'telmisartan', 'irbesartan', 'olmesartan',
      'delix', 'vasoxen', 'atacand', 'co-diovan', 'coversyl', 'micardis', 'karvea', 'karvezid', 'enap', 'renitec'
    ],
    warning: '2. VE 3. TRİMESTERDE KONTRENDİKE (FDA PLLR: Fetal Toksisite; TİTCK: Kategori D). Fetal renal disgenezis, oligohidramniyoz, pulmoner hipoplazi ve neonatal anüri riski.'
  },
  {
    category: 'PLLR: Yüksek Risk / Majör Malformasyon (D)',
    name: 'Valproik Asit (Depakin)',
    atcPrefixes: ['N03AG01'],
    keywords: ['valproate', 'valproik', 'depakin', 'convulex'],
    warning: 'YÜKSEK TERATOJENİTE RİSKİ (FDA PLLR: Nörogelişimsel Gerilik ve Malformasyon; TİTCK: Kategori D). Nöral tüp defektleri (spina bifida) ve bilişsel gerilik riski. Mümkünse alternatif antiepileptik seçilmelidir.'
  },
  {
    category: 'PLLR: 3. Trimesterde Kontrendike (D)',
    name: 'NSAİİ\'ler (3. Trimesterde İbuprofen, Diklofenak vb.)',
    atcPrefixes: ['M01A'],
    keywords: ['ibuprofen', 'ibufen', 'naproxen', 'naproksen', 'diclofenac', 'diklofenak', 'dexketoprofen', 'deksketoprofen', 'ketoprofen', 'etodolac', 'etodolak', 'meloxicam', 'meloksikam', 'flurbiprofen', 'celecoxib', 'selekoksib', 'indomethacin', 'indometazin', 'arveles', 'apranax', 'voltaren', 'dolorex', 'majezik'],
    warning: '3. TRİMESTERDE KONTRENDİKE (≥28. Hafta) (FDA PLLR: Erken Duktus Arteriozus Kapanması ve Oligohidramniyoz; TİTCK: Kategori D). Fetal duktus arteriozusun erken kapanması, pulmoner hipertansiyon ve oligohidramniyoz riski.'
  },
  {
    category: 'PLLR: 2-3. Trimesterde Önerilmez (D)',
    name: 'Tetrasiklinler / Doksisiklin',
    atcPrefixes: ['J01AA'],
    keywords: ['doxycycline', 'doksisiklin', 'monodox', 'tetradox', 'tetracycline', 'tetrasiklin'],
    warning: '2. VE 3. TRİMESTERDE ÖNERİLMEZ (FDA PLLR: Diş ve Kemik Toksisitesi; TİTCK: Kategori D). Fetal dişlerde kalıcı sarı-kahverengi renk değişimi ve kemik büyüme geriliği.'
  }
];

/**
 * Metin normalizasyonu (Türkçe büyük İ/I ve küçük harf uyumlu)
 */
function normalizeStr(str: unknown): string {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFC')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/**
 * Kısa anahtar kelimelerde (<=4 karakter, örn. 'ator', 'enap') kelime içi yanlış pozitifleri
 * ("inhalator" -> "ator") önleyen güvenli eşleştirici
 */
function matchesNormalizedKeyword(normText: string, rawKeyword: string): boolean {
  const normK = normalizeStr(rawKeyword);
  if (!normK || !normText) return false;
  if (normK.length <= 4) {
    const escaped = normK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
    return regex.test(normText);
  }
  return normText.includes(normK);
}

/**
 * 1. eGFR Bazlı Renal Doz ve Kontrendikasyon Analiz Motoru
 * (KDIGO 2024 + Mosteller BSA De-indeksleme + EHRA 2021 Cockcroft-Gault Standardizasyonu)
 */
export function checkRenalDoseAdjustments(params: RenalDoseCheckParams = {}): RenalDoseCheckResult {
  let egfr = Number(params.egfr);
  const drugs = Array.isArray(params.drugs) ? params.drugs : [];

  // Eğer doğrudan eGFR verilmemişse ama Scr, yaş ve cinsiyet verilmişse CKD-EPI/Schwartz hesapla
  if ((isNaN(egfr) || egfr <= 0) && params.serumCreatinineMgDl && params.ageYears !== undefined && params.ageYears !== null && params.gender) {
    const detailed = calculateDetailedEGFR(
      Number(params.serumCreatinineMgDl),
      Number(params.ageYears),
      params.gender,
      params.heightCm ?? undefined,
      { bsa: params.bsa ?? undefined }
    );
    if (detailed && detailed.egfrIndexed > 0) {
      egfr = detailed.egfrIndexed;
    }
  }

  if (isNaN(egfr) || egfr <= 0) {
    return {
      isValid: false,
      message: 'Lütfen geçerli bir eGFR veya Serum Kreatinin değeri giriniz.'
    };
  }

  // Kapsamlı habitus ve de-indeksleme analizi
  let compEvaluation: import('../engines/renalDoseEngine').ComprehensiveRenalEvaluation | null = null;
  const hasHabitus = (params.heightCm && params.heightCm > 0) || (params.weightKg && params.weightKg > 0);
  if (hasHabitus || params.serumCreatinineMgDl) {
    compEvaluation = evaluateComprehensiveRenalFunction({
      ageYears: params.ageYears ?? null,
      gender: params.gender ?? null,
      heightCm: params.heightCm ?? null,
      weightKg: params.weightKg ?? null,
      serumCreatinineMgDl: params.serumCreatinineMgDl ?? null,
      egfrIndexed: egfr
    }, drugs);
  }

  const warnings: RenalDoseWarning[] = [];

  for (const drugInput of drugs) {
    let drugName = '';
    let searchCombined = '';
    let atc = '';

    if (typeof drugInput === 'string') {
      drugName = drugInput;
      searchCombined = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      drugName = (drugInput.name || drugInput.brandName || drugInput.brand || drugInput.generic || '') as string;
      searchCombined = `${drugInput.brand || ''} ${drugInput.brandName || ''} ${drugInput.name || ''} ${drugInput.generic || ''}`.trim();
      atc = (drugInput.atcCode || drugInput.atc || '') as string;
    }

    const normName = normalizeStr(searchCombined);
    const normAtc = normalizeStr(atc);
    const resolvedConcept = resolveToRxNormConcept(drugInput);

    // Veritabanında eşleşen ilacı bul
    const matchedEntry = RENAL_DRUG_DATABASE.find(entry => {
      if (entry.atcPrefix && normAtc.startsWith(normalizeStr(entry.atcPrefix))) {
        return true;
      }
      if (entry.generic === 'amoxicillin' && normAtc.startsWith('j01cr02')) {
        return true;
      }
      if (matchesNormalizedKeyword(normName, entry.generic)) {
        return true;
      }
      if (resolvedConcept && (resolvedConcept.canonicalKey === entry.generic || entry.aliases.includes(resolvedConcept.canonicalKey))) {
        return true;
      }
      return entry.aliases.some(alias => matchesNormalizedKeyword(normName, alias));
    });

    if (matchedEntry) {
      const drugCategoryInfo = identifyRenalDrugCategory(matchedEntry.generic);
      let effectiveClearance = egfr;
      let metricUsed: 'INDEXED_EGFR' | 'ABSOLUTE_EGFR' | 'COCKCROFT_GAULT_CRCL' = 'INDEXED_EGFR';
      let clearanceUnit: string = 'mL/dak/1.73 m²';
      const tdm = drugCategoryInfo.tdmRecommended;

      if (compEvaluation) {
        if (drugCategoryInfo.metric === 'COCKCROFT_GAULT_CRCL' && compEvaluation.cockcroftGault) {
          effectiveClearance = compEvaluation.cockcroftGault.recommendedCrCl;
          metricUsed = 'COCKCROFT_GAULT_CRCL';
          clearanceUnit = 'mL/dak';
        } else if (drugCategoryInfo.metric === 'ABSOLUTE_EGFR' && compEvaluation.egfrAbsolute !== null) {
          effectiveClearance = compEvaluation.egfrAbsolute;
          metricUsed = 'ABSOLUTE_EGFR';
          clearanceUnit = 'mL/dak';
        } else if (compEvaluation.bsa?.isDeviatedFromStandard && compEvaluation.egfrAbsolute !== null) {
          effectiveClearance = compEvaluation.egfrAbsolute;
          metricUsed = 'ABSOLUTE_EGFR';
          clearanceUnit = 'mL/dak';
        }
      }

      // Kural kontrolü (en katı kuraldan başla; ondalıklı eGFR değerlerinde 29.5 gibi boşlukları önlemek için Math.floor kullan)
      const sortedRules = [...matchedEntry.rules].sort((a, b) => a.maxEgfr - b.maxEgfr);
      const triggeredRule = sortedRules.find(r => Math.floor(effectiveClearance) <= r.maxEgfr);

      if (triggeredRule) {
        let msg = triggeredRule.message;
        if (metricUsed === 'COCKCROFT_GAULT_CRCL' && Math.abs(effectiveClearance - egfr) >= 5) {
          msg += ` [EHRA 2021: Cockcroft-Gault CrCl (${effectiveClearance} mL/dak) esas alındı; eGFR: ${egfr}]`;
        } else if (metricUsed === 'ABSOLUTE_EGFR' && Math.abs(effectiveClearance - egfr) >= 5) {
          msg += ` [KDIGO 2024: De-indekslenmiş Mutlak GFR (${effectiveClearance} mL/dak) esas alındı; BSA: ${compEvaluation?.bsa?.bsaMosteller} m²]`;
        }

        warnings.push({
          drug: matchedEntry.name,
          userDrugQuery: drugName,
          status: triggeredRule.status,
          alertClass: triggeredRule.status === 'CONTRAINDICATED' ? 'danger' : 'warning',
          message: msg,
          thresholdEgfr: triggeredRule.maxEgfr,
          currentEgfr: egfr,
          metricUsed,
          effectiveClearanceValue: effectiveClearance,
          clearanceUnit,
          tdmRecommended: tdm
        });
      }
    }
  }

  const hasContraindication = warnings.some(w => w.status === 'CONTRAINDICATED');

  return {
    isValid: true,
    egfr,
    deindexedAbsoluteGfr: compEvaluation?.egfrAbsolute ?? null,
    cockcroftGaultCrCl: compEvaluation?.cockcroftGault?.recommendedCrCl ?? null,
    totalChecked: drugs.length,
    alertsCount: warnings.length,
    hasContraindication,
    alertClass: hasContraindication ? 'danger' : (warnings.length > 0 ? 'warning' : 'success'),
    warnings,
    comprehensiveEvaluation: compEvaluation
  };
}

/**
 * 2. "Triple Whammy" Akut Böbrek Hasarı İlaç Etkileşim Tespit Motoru
 * (ACEi/ARB + Diüretik + NSAİİ eşzamanlı kullanımı)
 */
export function detectTripleWhammy(drugs: DrugInputItem[] = []): TripleWhammyResult {
  if (!Array.isArray(drugs) || drugs.length === 0) {
    return {
      isTripleWhammy: false,
      isDoubleRisk: false,
      alertClass: 'success',
      title: 'Triple Whammy Riski Tespit Edilmedi',
      detectedDrugs: {},
      presentClasses: []
    };
  }

  const detected: { rasBlocker: string[]; diuretic: string[]; nsaid: string[] } = {
    rasBlocker: [],
    diuretic: [],
    nsaid: []
  };

  for (const drugInput of drugs) {
    let displayName = '';
    let searchCombined = '';
    let atc = '';
    if (typeof drugInput === 'string') {
      displayName = drugInput;
      searchCombined = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      displayName = (drugInput.name || drugInput.brandName || drugInput.brand || drugInput.generic || '') as string;
      searchCombined = `${drugInput.brand || ''} ${drugInput.brandName || ''} ${drugInput.name || ''} ${drugInput.generic || ''}`.trim();
      atc = (drugInput.atcCode || drugInput.atc || '') as string;
    }

    const normName = normalizeStr(searchCombined);
    const normAtc = normalizeStr(atc);

    // RAS Blocker Check
    const isRas = TRIPLE_WHAMMY_CLASSES.rasBlockers.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
                  TRIPLE_WHAMMY_CLASSES.rasBlockers.keywords.some(k => matchesNormalizedKeyword(normName, k));
    if (isRas) detected.rasBlocker.push(displayName || 'ACEi/ARB');

    // Diuretic Check
    const isDiuretic = TRIPLE_WHAMMY_CLASSES.diuretics.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
                       TRIPLE_WHAMMY_CLASSES.diuretics.keywords.some(k => matchesNormalizedKeyword(normName, k));
    if (isDiuretic) detected.diuretic.push(displayName || 'Diüretik');

    // NSAID Check
    const isNsaid = TRIPLE_WHAMMY_CLASSES.nsaids.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
                    TRIPLE_WHAMMY_CLASSES.nsaids.keywords.some(k => matchesNormalizedKeyword(normName, k));
    if (isNsaid) detected.nsaid.push(displayName || 'NSAİİ');
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
 */
export function checkPregnancySafety(
  drugs: DrugInputItem[] = [],
  options: { trimester?: number } = {}
): PregnancySafetyResult {
  const trimester = Number(options?.trimester || 1);
  const alerts: PregnancySafetyAlert[] = [];

  if (!Array.isArray(drugs)) {
    return {
      totalChecked: 0,
      alertsCount: 0,
      hasSevereFetalRisk: false,
      alerts: []
    };
  }

  for (const drugInput of drugs) {
    let name = '';
    let atc = '';
    if (typeof drugInput === 'string') {
      name = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      name = `${drugInput.brand || ''} ${drugInput.brandName || ''} ${drugInput.name || ''} ${drugInput.generic || ''}`.trim();
      atc = (drugInput.atcCode || drugInput.atc || '') as string;
    }

    const normName = normalizeStr(name);
    const normAtc = normalizeStr(atc);

    for (const entry of PREGNANCY_RISK_DATABASE) {
      const isAtcMatched = entry.atcPrefixes?.some(p => normAtc.startsWith(normalizeStr(p))) ?? false;
      const isKeywordMatched = entry.keywords.some(k => matchesNormalizedKeyword(normName, k));
      if (isAtcMatched || isKeywordMatched) {
        // Trimester spesifik kontroller (NSAİİ 1-2. trimesterde Kategori C / düşük risk, 3. trimesterde Kategori D / kontrendike)
        if (entry.name.includes('3. Trimesterde') && trimester < 3) {
          continue;
        }

        const isCatX = entry.category.includes('X');
        alerts.push({
          drugName: entry.name,
          userDrug: name,
          category: entry.category,
          warning: entry.warning,
          isHighRisk: isCatX || entry.category.includes('D')
        });
      }
    }
  }

  return {
    totalChecked: drugs.length,
    alertsCount: alerts.length,
    hasSevereFetalRisk: alerts.some(a => a.category.includes('X')),
    alerts
  };
}

/**
 * 4. Yenidoğan İlaç Toksisite ve Kontrendikasyon Kalkanı
 */
export const NEONATAL_CONTRAINDICATED_DRUGS: NeonatalContraindicatedDrug[] = [
  {
    name: 'Seftriakson (Ceftriaxone / Rocephin)',
    keywords: ['ceftriaxone', 'seftriakson', 'rocephin', 'unacefin', 'novosef', 'ceftinex', 'forsef'],
    status: 'CONTRAINDICATED',
    severity: 'CRITICAL',
    title: '🚨 YENİDOĞANDA KESİN KONTRENDİKE (Fatal Kernikterus & Presipitasyon Riski)',
    warning: 'Bilirubini albüminden ayırarak fatal KERNİKTERUS riskini katlar. Kalsiyumlu IV solüsyonlarla (Ringer Laktat vb.) kalsiyum-seftriakson kristal presipitasyonu yaparak akciğer ve böbreklerde ölümcül embolizasyona yol açar! Güvenli Alternatif: Sefotaksim veya Ampisilin + Gentamisin.'
  },
  {
    name: 'Ko-trimoksazol / Sülfonamidler (Bactrim / Trimetoprim-Sulfametoksazol)',
    keywords: ['cotrimoxazole', 'co-trimoxazole', 'trimethoprim', 'sulfamethoxazole', 'bactrim', 'kemoprim', 'trifen', 'sulfonamid'],
    status: 'CONTRAINDICATED',
    severity: 'CRITICAL',
    title: '🚨 YENİDOĞANDA KONTRENDİKE (Bilirubin Deplasmanı & Kernikterus)',
    warning: 'Yaşamın ilk 6-8 haftasında kontrendikedir. Bilirubini plazma albümin bağlama bölgelerinden ayırarak serbest bilirubini artırır ve kernikterusa yol açar.'
  },
  {
    name: 'Kloramfenikol (Chloramphenicol / Kemicetine)',
    keywords: ['chloramphenicol', 'kloramfenikol', 'kemicetine'],
    status: 'CONTRAINDICATED',
    severity: 'CRITICAL',
    title: '🚨 YENİDOĞANDA KESİN KONTRENDİKE (Ölümcül Gri Bebek Sendromu)',
    warning: 'Yenidoğanlarda immatür hepatik glukuronidasyon (glukuronil transferaz eksikliği) ve düşük renal klirens ilacın toksik birikimine yol açar. Gri Bebek Sendromu: Asidoz, hipotermi, siyanoz, kardiyovasküler kollaps ve ölüm.'
  },
  {
    name: 'Benzil Alkol İçeren Preparatlar (Benzyl Alcohol)',
    keywords: ['benzyl alcohol', 'benzil alkol'],
    status: 'CONTRAINDICATED',
    severity: 'CRITICAL',
    title: '🚨 YENİDOĞANDA KONTRENDİKE (Gasping Sendromu)',
    warning: 'Yenidoğan ve prematürelerde koruyucu olarak benzil alkol içeren IV solüsyon/ilaçlar fatal Gasping Sendromuna (metabolik asidoz, solunum yetmezliği, hipotansiyon) neden olur.'
  },
  {
    name: 'Florokinolonlar (Siprofloksasin / Levofloksasin)',
    keywords: ['ciprofloxacin', 'siprofloksasin', 'cipro', 'ciflosin', 'levofloxacin', 'levofloksasin', 'tavanic'],
    status: 'WARNING',
    severity: 'WARNING',
    title: '⚠️ Yenidoğanda Dikkat / Rölatif Kontrendikasyon (Kıkırdak ve Eklem Toksisitesi)',
    warning: 'Gelişmekte olan eklem kıkırdaklarında artropati ve erozyon riski. Yalnızca çoklu dirençli Gram-negatif sepsiste güvenli alternatif bulunmadığında kullanılabilir.'
  },
  {
    name: 'Tetrasiklinler / Doksisiklin (Tetracycline / Doxycycline)',
    keywords: ['doxycycline', 'doksisiklin', 'monodox', 'tetradox', 'tetracycline', 'tetrasiklin'],
    status: 'CONTRAINDICATED',
    severity: 'CRITICAL',
    title: '🚨 YENİDOĞAN & SÜT ÇOCUĞUNDA KONTRENDİKE (Kemik Büyüme & Diş Mine Toksisitesi)',
    warning: 'Kalsiyumla şelat oluşturarak kemiklerde büyüme duraklaması ve diş germlerinde kalıcı sarı-gri-kahverengi renk değişimi ile mine hipoplazisine yol açar.'
  }
];

export function checkNeonatalDrugSafety(
  drugs: DrugInputItem[] = [],
  _options: Record<string, unknown> = {}
): NeonatalDrugSafetyResult {
  const alerts: NeonatalDrugAlert[] = [];
  if (!Array.isArray(drugs)) {
    return {
      totalChecked: 0,
      alertsCount: 0,
      hasContraindication: false,
      alertClass: 'success',
      alerts: []
    };
  }

  for (const drugInput of drugs) {
    let name = '';
    if (typeof drugInput === 'string') {
      name = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      name = `${drugInput.brand || ''} ${drugInput.brandName || ''} ${drugInput.name || ''} ${drugInput.generic || ''}`.trim();
    }

    const normName = normalizeStr(name);

    for (const entry of NEONATAL_CONTRAINDICATED_DRUGS) {
      const isMatched = entry.keywords.some(k => normName.includes(normalizeStr(k)));
      if (isMatched) {
        alerts.push({
          drugName: entry.name,
          userDrug: name,
          status: entry.status,
          severity: entry.severity,
          title: entry.title,
          warning: entry.warning
        });
      }
    }
  }

  const hasContraindication = alerts.some(a => a.status === 'CONTRAINDICATED');

  return {
    totalChecked: drugs.length,
    alertsCount: alerts.length,
    hasContraindication,
    alertClass: hasContraindication ? 'danger' : (alerts.length > 0 ? 'warning' : 'success'),
    alerts
  };
}

/**
 * 5. SEROTONİN SENDROMU KALKANI (Hunter Kriterleri Uyumlu)
 * 
 * Mekanizma:
 * MAO inhibitörleri, SSRI, SNRI, TCA, serotonerjik opioidler (Tramadol, Fentanil),
 * dekstrometorfan ve triptanların aşırı birikimi ve kombine kullanımı ölümcül
 * serotonin toksisitesine yol açar.
 * 
 * Hunter Toksisite Kriterleri:
 * Serotonerjik ajan zemininde:
 * - Spontan klonus VEYA
 * - İndüklenebilir klonus + ajitasyon veya diyaforez VEYA
 * - Oküler klonus + ajitasyon veya diyaforez VEYA
 * - Titreme (tremor) + hiperrefleksi VEYA
 * - Hipertermi (>38°C) + hipertonisite + oküler veya indüklenebilir klonus.
 */
export const SEROTONERGIC_DRUG_DATABASE = {
  maoi: {
    label: 'MAO İnhibitörü (MAOI / Antibiyotik Linezolid)',
    atcPrefixes: ['N06AG', 'N04BD', 'J01XX08'],
    keywords: [
      'moklobemid', 'moclobemide', 'aurorix',
      'selegilin', 'selegiline', 'movergan',
      'rasajilin', 'rasagiline', 'azilect',
      'linezolid', 'zyvoxid', 'linerez', 'linezid',
      'metilen mavisi', 'methylene blue',
      'fenelzin', 'phenelzine', 'tranilsipromin', 'tranylcypromine'
    ]
  },
  ssriSnriTca: {
    label: 'SSRI / SNRI / TCA Antidepresan',
    atcPrefixes: ['N06AB', 'N06AA', 'N06AX16', 'N06AX17', 'N06AX21', 'N06AX23'],
    keywords: [
      'fluoksetin', 'fluoxetine', 'prozac', 'deprex', 'zedprex', 'fulsac',
      'sertralin', 'sertraline', 'lustral', 'selectra', 'serdep', 'misol',
      'essitalopram', 'escitalopram', 'cipralex', 'citoles', 'eslorex', 'secita', 'esmax',
      'sitalopram', 'citalopram', 'cipram', 'citol', 'vodalex',
      'paroksetin', 'paroxetine', 'paxil', 'seroxat', 'paxera',
      'fluvoksamin', 'fluvoxamine', 'faverin',
      'venlafaksin', 'venlafaxine', 'efexor', 'venegis', 'dorex',
      'duloksetin', 'duloxetine', 'cymbalta', 'duxet', 'dulsevia', 'nexetin',
      'milnasipran', 'ixel',
      'desvenlafaksin', 'desvenlafaxine', 'pristiq',
      'amitriptilin', 'amitriptyline', 'laroxyl',
      'klomipramin', 'clomipramine', 'anafranil',
      'imipramin', 'imipramine', 'tofranil',
      'opipramol', 'insidon', 'insomin',
      'nortriptilin', 'nortriptyline'
    ]
  },
  opioids: {
    label: 'Serotonerjik Opioid / Analjezik',
    atcPrefixes: ['N02AX02', 'N02AB03', 'N02AX06', 'N02AB02'],
    keywords: [
      'tramadol', 'contramal', 'ultracet', 'tramadolor',
      'tapentadol', 'palexia',
      'fentanil', 'fentanyl', 'durogesic',
      'petidin', 'pethidine', 'meperidin', 'meperidine', 'aldolan',
      'metadon', 'methadone'
    ]
  },
  triptans: {
    label: 'Triptan (5-HT1B/1D Agonisti - Migren)',
    atcPrefixes: ['N02CC'],
    keywords: [
      'sumatriptan', 'imigran',
      'zolmitriptan', 'zomig',
      'eletriptan', 'relpax',
      'rizatriptan', 'maxalt',
      'frovatriptan', 'migreva',
      'naratriptan'
    ]
  },
  others: {
    label: 'Diğer Serotonerjik Ajanlar',
    atcPrefixes: ['N06AX05', 'N06AX11', 'N06AX26', 'N05AN01', 'R05DA09'],
    keywords: [
      'dekstrometorfan', 'dextromethorphan', 'benical', 'tylol hot', 'vicks', 'actifed', 'rhinathiol',
      'vortioksetin', 'vortioxetine', 'brintellix',
      'trazodon', 'trazodone', 'desyrel',
      'mirtazapin', 'mirtazapine', 'remeron', 'remeril', 'redepra',
      'lityum', 'lithium', 'lituril',
      'sari kantaron', 'st john', 'hypericum',
      '5-htp', 'triptofan', 'tryptophan'
    ]
  }
};

export function checkSerotoninSyndrome(drugs: DrugInputItem[] = []): SerotoninSyndromeResult {
  if (!Array.isArray(drugs) || drugs.length === 0) {
    return {
      isHighRisk: false,
      severity: 'SAFE',
      alertClass: 'success',
      title: 'Serotonin Sendromu Riski Tespit Edilmedi',
      detectedDrugs: { maoi: [], ssriSnriTca: [], opioids: [], triptans: [], others: [] },
      totalSerotonergicCount: 0,
      hasMaoiCombination: false,
      recommendations: []
    };
  }

  const detected: {
    maoi: string[];
    ssriSnriTca: string[];
    opioids: string[];
    triptans: string[];
    others: string[];
  } = {
    maoi: [],
    ssriSnriTca: [],
    opioids: [],
    triptans: [],
    others: []
  };

  for (const drugInput of drugs) {
    let name = '';
    let atc = '';
    if (typeof drugInput === 'string') {
      name = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      name = `${drugInput.brand || ''} ${drugInput.brandName || ''} ${drugInput.name || ''} ${drugInput.generic || ''}`.trim();
      atc = (drugInput.atcCode || drugInput.atc || '') as string;
    }

    const normName = normalizeStr(name);
    const normAtc = normalizeStr(atc);

    // 1. MAOI
    if (
      SEROTONERGIC_DRUG_DATABASE.maoi.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      SEROTONERGIC_DRUG_DATABASE.maoi.keywords.some(k => matchesNormalizedKeyword(normName, k))
    ) {
      detected.maoi.push(name || 'MAOI / Linezolid');
    }
    // 2. SSRI / SNRI / TCA
    else if (
      SEROTONERGIC_DRUG_DATABASE.ssriSnriTca.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      SEROTONERGIC_DRUG_DATABASE.ssriSnriTca.keywords.some(k => matchesNormalizedKeyword(normName, k))
    ) {
      detected.ssriSnriTca.push(name || 'Antidepresan');
    }
    // 3. Opioidler
    else if (
      SEROTONERGIC_DRUG_DATABASE.opioids.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      SEROTONERGIC_DRUG_DATABASE.opioids.keywords.some(k => matchesNormalizedKeyword(normName, k))
    ) {
      detected.opioids.push(name || 'Serotonerjik Opioid');
    }
    // 4. Triptanlar
    else if (
      SEROTONERGIC_DRUG_DATABASE.triptans.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      SEROTONERGIC_DRUG_DATABASE.triptans.keywords.some(k => matchesNormalizedKeyword(normName, k))
    ) {
      detected.triptans.push(name || 'Triptan');
    }
    // 5. Diğerleri
    else if (
      SEROTONERGIC_DRUG_DATABASE.others.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      SEROTONERGIC_DRUG_DATABASE.others.keywords.some(k => matchesNormalizedKeyword(normName, k))
    ) {
      detected.others.push(name || 'Serotonerjik Ajan');
    }
  }

  const activeCategoriesCount =
    (detected.maoi.length > 0 ? 1 : 0) +
    (detected.ssriSnriTca.length > 0 ? 1 : 0) +
    (detected.opioids.length > 0 ? 1 : 0) +
    (detected.triptans.length > 0 ? 1 : 0) +
    (detected.others.length > 0 ? 1 : 0);

  const totalSerotonergicCount =
    detected.maoi.length +
    detected.ssriSnriTca.length +
    detected.opioids.length +
    detected.triptans.length +
    detected.others.length;

  const hasMaoi = detected.maoi.length > 0;
  const hasOtherSerotonergic = (detected.ssriSnriTca.length + detected.opioids.length + detected.triptans.length + detected.others.length) > 0;
  const hasMaoiCombination = hasMaoi && hasOtherSerotonergic;
  const hasOpioidAntidepressant = detected.opioids.length > 0 && (detected.ssriSnriTca.length > 0 || detected.triptans.length > 0);

  const hunterInfo = 'Hunter Toksisite Kriterleri: Serotonerjik ajan zemininde (1) Spontan klonus VEYA (2) İndüklenebilir klonus + ajitasyon/terleme VEYA (3) Oküler klonus + ajitasyon/terleme VEYA (4) Tremor + hiperrefleksi VEYA (5) Hipertermi (>38°C) + hipertonisite + klonus.';

  // 1. ÖLÜMCÜL KOMBİNASYON: MAOI + Serotonerjik Ajan
  if (hasMaoiCombination) {
    return {
      isHighRisk: true,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 ÖLÜMCÜL SEROTONİN SENDROMU KONTRENDİKASYONU (MAOI / Linezolid + Serotonerjik Ajan)!',
      mechanism: 'MAO enzim inhibisyonu (Moklobemid, Selegilin veya antibiyotik Linezolid) serotonin yıkımını tamamen bloke ederken eşzamanlı serotonerjik ajan sinaptik serotonin birikimini fatal hipertermi, klonus, rabdomiyoliz ve otonomik kollaps düzeyine çıkarır.',
      hunterCriteriaInfo: hunterInfo,
      detectedDrugs: detected,
      totalSerotonergicCount,
      hasMaoiCombination: true,
      recommendations: [
        'Kombinasyon KESİNLİKLE KONTRENDİKEDİR! Eşzamanlı reçete edilmemelidir.',
        'Linezolid tedavisi gerekiyorsa serotonerjik antidepresanlar acilen kesilmeli veya alternatif antibiyotik (örn. Vankomisin, Daptomisin) seçilmelidir.',
        'MAOI kesildikten sonra serotonerjik ajan başlanması için en az 14 gün (Fluoksetin sonrası MAOI için en az 5 hafta) arınma (wash-out) periyodu beklenmelidir.',
        'Hunter Kriterleri ile acil değerlendirme: Klonus, hiperrefleksi, taşikardi, terleme ve rijidite varlığında acil servise yönlendirilmeli; Siproheptadin (antiserotonerjik) hazır bulundurulmalıdır.'
      ]
    };
  }

  // 2. YÜKSEK RİSK: Opioid (Tramadol / Fentanil) + Antidepresan / Triptan
  if (hasOpioidAntidepressant) {
    return {
      isHighRisk: true,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 YÜKSEK SEROTONİN SENDROMU RİSKİ (Tramadol/Fentanil + Antidepresan/Triptan)!',
      mechanism: 'Tramadol ve Fentanil güçlü serotonin geri alım inhibisyonu yapar. SSRI/SNRI/TCA veya triptanlarla eşzamanlı kullanım klinik serotonin sendromunun en sık hastane yatışı nedenidir.',
      hunterCriteriaInfo: hunterInfo,
      detectedDrugs: detected,
      totalSerotonergicCount,
      hasMaoiCombination: false,
      recommendations: [
        'Ağrı tedavisinde serotonin geri alımını bloke etmeyen alternatif analjezikler tercih edilmelidir (örn. Parasetamol, düşük riskli zayıf opioidler).',
        'Birlikte kullanım kaçınılmazsa hasta miyoklonus, tremor, hiperrefleksi, terleme ve konfüzyon semptomları yönünden bilgilendirilmelidir.',
        'En küçük etkin dozlar seçilmeli ve tedavi süresi mümkün olan en kısa tutulmalıdır.'
      ]
    };
  }

  // 3. ÇOKLU SEROTONERJİK POLİFARMASİ (3 veya daha fazla ajan VEYA 2+ farklı aktif sınıf)
  if (totalSerotonergicCount >= 3) {
    return {
      isHighRisk: true,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 AŞIRI SEROTONERJİK POLİFARMASİ RİSKİ (3+ Serotonerjik Ajan)!',
      mechanism: 'Reçetedeki 3 veya daha fazla serotonerjik ajanın kümülatif etkisi santral ve periferik serotonin reseptör aşırı uyarımına yol açar.',
      hunterCriteriaInfo: hunterInfo,
      detectedDrugs: detected,
      totalSerotonergicCount,
      hasMaoiCombination: false,
      recommendations: [
        'Reçete edilen rejimdeki serotonerjik ajan sayısı acilen rasyonalize edilmeli, mükerrer veya gereksiz ajanlar elenmelidir.',
        'Hastanın vital bulguları (ateş, tansiyon dalgalanmaları, taşikardi) ve nörolojik bulguları (klonus, rijidite) izlenmelidir.'
      ]
    };
  }

  // 4. İKİLİ KOMBİNASYON (Örn. SSRI + Triptan, SSRI + SNRI, SSRI + Dekstrometorfan)
  if (activeCategoriesCount >= 2 || totalSerotonergicCount >= 2) {
    return {
      isHighRisk: true,
      severity: 'WARNING',
      alertClass: 'warning',
      title: '⚠️ Serotonerjik İlaç Kombinasyonu (Serotonin Toksisitesi Riski)',
      mechanism: 'İki serotonerjik ajanın eşzamanlı kullanımı sinaptik serotonin düzeyini artırarak hafif/orta derecede serotonin toksisitesi veya sendromu tetikleyebilir.',
      hunterCriteriaInfo: hunterInfo,
      detectedDrugs: detected,
      totalSerotonergicCount,
      hasMaoiCombination: false,
      recommendations: [
        'Özellikle tedaviye yeni başlanırken veya doz artırıldığında hasta ajitasyon, terleme, diyare ve tremor açısından uyarılmalıdır.',
        'Öksürük şuruplarındaki dekstrometorfana veya migren tedavisindeki triptanlara dikkat edilmelidir.'
      ]
    };
  }

  return {
    isHighRisk: false,
    severity: 'SAFE',
    alertClass: 'success',
    title: 'Serotonin Sendromu Riski Tespit Edilmedi',
    detectedDrugs: detected,
    totalSerotonergicCount,
    hasMaoiCombination: false,
    recommendations: []
  };
}

/**
 * 6. ÖLÜMCÜL HİPERKALEMİ KALKANI
 * 
 * Mekanizma:
 * RAAS blokörleri (ACEi/ARB/ARNI) aldosteron sentezini azaltır.
 * Potasyum tutucu diüretikler (Spironolakton/Eplerenon) aldosteron reseptörlerini bloke eder.
 * Trimetoprim (Bactrim), distal nefrondaki ENaC (epitelyal sodyum) kanallarını amilorid gibi
 * doğrudan bloke ederek potasyum atılımını durdurur.
 * NSAİİ'ler renal prostaglandin inhibisyonu ile hiporeninemik hipoaldosteronizm yapar.
 * Bu kombinasyonlar eGFR < 60 mL/dk veya yaş ≥ 65 olan hastalarda kardiyak arrest
 * ve öldürücü ventriküler disritmiler ile sonuçlanır!
 */
export const HYPERKALEMIA_DRUG_DATABASE = {
  raasBlockers: {
    label: 'RAAS Blokörü (ACEi / ARB / ARNI)',
    atcPrefixes: ['C09A', 'C09B', 'C09C', 'C09D', 'C09DX'],
    keywords: [
      'ramipril', 'enalapril', 'lisinopril', 'perindopril', 'captopril', 'kaptopril', 'fosinopril', 'zofenopril',
      'losartan', 'valsartan', 'candesartan', 'kandesartan', 'telmisartan', 'irbesartan', 'olmesartan',
      'sakubitril', 'sacubitril', 'entresto',
      'aliskiren', 'rasilez',
      'delix', 'co-diovan', 'karvezid', 'micardis', 'atacand', 'coversyl', 'enap', 'renitec'
    ]
  },
  kSparingDiuretics: {
    label: 'Potasyum Tutucu Diüretik / MRA',
    atcPrefixes: ['C03D', 'C03E', 'C03DA'],
    keywords: [
      'spironolakton', 'spironolactone', 'aldactone',
      'eplerenon', 'eplerenone', 'inspra',
      'amilorid', 'amiloride', 'triamteren', 'triamterene',
      'triamteril', 'finerenon', 'finerenone', 'kerendia'
    ]
  },
  trimethoprim: {
    label: 'Trimetoprim (ENaC Kanal Blokörü)',
    atcPrefixes: ['J01EE01', 'J01EA01'],
    keywords: [
      'trimetoprim', 'trimethoprim', 'bactrim', 'cotrimoxazole', 'ko-trimoksazol',
      'kemoprim', 'trifen', 'metoprim'
    ]
  },
  nsaids: {
    label: 'NSAİİ (Renal PG & Renin İnhibisyonu)',
    atcPrefixes: ['M01A'],
    keywords: [
      'ibuprofen', 'ibufen', 'naproxen', 'naproksen', 'diclofenac', 'diklofenak', 'meloxicam', 'meloksikam',
      'etodolac', 'etodolak', 'ketoprofen', 'dexketoprofen', 'deksketoprofen', 'flurbiprofen', 'celecoxib',
      'selekoksib', 'indomethacin', 'indometazin', 'arveles', 'apranax', 'voltaren', 'dolorex', 'majezik'
    ]
  },
  kSupplements: {
    label: 'Potasyum Preparatı',
    atcPrefixes: ['A12BA'],
    keywords: [
      'potasyum klorur', 'potassium chloride', 'k-contin', 'kardiyolit', 'potasium', 'potasyum sitrat'
    ]
  },
  other: {
    label: 'Diğer Potasyum Artırıcı Ajanlar',
    atcPrefixes: ['L04AD'],
    keywords: [
      'siklosporin', 'cyclosporine', 'sandimmun',
      'takrolimus', 'tacrolimus', 'prograf', 'advagraf',
      'heparin', 'dmah'
    ]
  }
};

export function checkHyperkalemiaRisk(
  drugs: DrugInputItem[] = [],
  patientContext?: { egfr?: number | null; ageYears?: number | null; baselineK?: number | null }
): HyperkalemiaRiskResult {
  if (!Array.isArray(drugs) || drugs.length === 0) {
    return {
      isAtRisk: false,
      severity: 'SAFE',
      alertClass: 'success',
      title: 'Hiperkalemi Riski Tespit Edilmedi',
      riskFactorsIdentified: [],
      detectedDrugs: { raasBlockers: [], kSparingDiuretics: [], trimethoprim: [], nsaids: [], kSupplements: [], other: [] },
      totalHyperkalemicCount: 0,
      hasRenalOrAgeCompounding: false,
      recommendations: []
    };
  }

  const detected: {
    raasBlockers: string[];
    kSparingDiuretics: string[];
    trimethoprim: string[];
    nsaids: string[];
    kSupplements: string[];
    other: string[];
  } = {
    raasBlockers: [],
    kSparingDiuretics: [],
    trimethoprim: [],
    nsaids: [],
    kSupplements: [],
    other: []
  };

  for (const drugInput of drugs) {
    let name = '';
    let atc = '';
    if (typeof drugInput === 'string') {
      name = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      name = `${drugInput.brand || ''} ${drugInput.brandName || ''} ${drugInput.name || ''} ${drugInput.generic || ''}`.trim();
      atc = (drugInput.atcCode || drugInput.atc || '') as string;
    }

    const normName = normalizeStr(name);
    const normAtc = normalizeStr(atc);

    // 1. RAAS Blokörü
    if (
      HYPERKALEMIA_DRUG_DATABASE.raasBlockers.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      HYPERKALEMIA_DRUG_DATABASE.raasBlockers.keywords.some(k => normName.includes(normalizeStr(k)))
    ) {
      detected.raasBlockers.push(name || 'RAAS Blokörü');
    }

    // 2. K-Tutucu Diüretik
    if (
      HYPERKALEMIA_DRUG_DATABASE.kSparingDiuretics.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      HYPERKALEMIA_DRUG_DATABASE.kSparingDiuretics.keywords.some(k => normName.includes(normalizeStr(k)))
    ) {
      detected.kSparingDiuretics.push(name || 'Potasyum Tutucu Diüretik');
    }

    // 3. Trimetoprim (Bactrim)
    if (
      HYPERKALEMIA_DRUG_DATABASE.trimethoprim.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      HYPERKALEMIA_DRUG_DATABASE.trimethoprim.keywords.some(k => normName.includes(normalizeStr(k)))
    ) {
      detected.trimethoprim.push(name || 'Trimetoprim (Bactrim)');
    }

    // 4. NSAİİ
    if (
      HYPERKALEMIA_DRUG_DATABASE.nsaids.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      HYPERKALEMIA_DRUG_DATABASE.nsaids.keywords.some(k => normName.includes(normalizeStr(k)))
    ) {
      detected.nsaids.push(name || 'NSAİİ');
    }

    // 5. Potasyum Preparatları
    if (
      HYPERKALEMIA_DRUG_DATABASE.kSupplements.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      HYPERKALEMIA_DRUG_DATABASE.kSupplements.keywords.some(k => normName.includes(normalizeStr(k)))
    ) {
      detected.kSupplements.push(name || 'Potasyum Preparatı');
    }

    // 6. Diğerleri
    if (
      HYPERKALEMIA_DRUG_DATABASE.other.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      HYPERKALEMIA_DRUG_DATABASE.other.keywords.some(k => normName.includes(normalizeStr(k)))
    ) {
      detected.other.push(name || 'Potasyum Artırıcı Ajan');
    }
  }

  const activeClassesCount =
    (detected.raasBlockers.length > 0 ? 1 : 0) +
    (detected.kSparingDiuretics.length > 0 ? 1 : 0) +
    (detected.trimethoprim.length > 0 ? 1 : 0) +
    (detected.nsaids.length > 0 ? 1 : 0) +
    (detected.kSupplements.length > 0 ? 1 : 0) +
    (detected.other.length > 0 ? 1 : 0);

  const totalHyperkalemicCount =
    detected.raasBlockers.length +
    detected.kSparingDiuretics.length +
    detected.trimethoprim.length +
    detected.nsaids.length +
    detected.kSupplements.length +
    detected.other.length;

  const egfr = patientContext?.egfr !== undefined && patientContext?.egfr !== null ? Number(patientContext.egfr) : null;
  const age = patientContext?.ageYears !== undefined && patientContext?.ageYears !== null ? Number(patientContext.ageYears) : null;
  const baseK = patientContext?.baselineK !== undefined && patientContext?.baselineK !== null ? Number(patientContext.baselineK) : null;

  const riskFactors: string[] = [];
  const hasEgfrRisk = egfr !== null && !isNaN(egfr) && egfr < 60;
  const hasAgeRisk = age !== null && !isNaN(age) && age >= 65;
  const hasKRisk = baseK !== null && !isNaN(baseK) && baseK >= 5.0;

  if (hasEgfrRisk) riskFactors.push(`Böbrek Yetmezliği / Azalmış eGFR (${egfr} mL/dk < 60)`);
  if (hasAgeRisk) riskFactors.push(`İleri Yaş (≥65 Yaş: ${age})`);
  if (hasKRisk) riskFactors.push(`Sınırda/Yüksek Serum Potasyumu (${baseK} mEq/L ≥ 5.0)`);

  const hasRaas = detected.raasBlockers.length > 0;
  const hasKSparing = detected.kSparingDiuretics.length > 0;
  const hasTrimethoprim = detected.trimethoprim.length > 0;
  const hasNsaid = detected.nsaids.length > 0;

  const hasRenalOrAgeCompounding = hasEgfrRisk || hasAgeRisk || hasKRisk;

  // 1. ÖLÜMCÜL KOMBİNASYON 1: RAAS Blokörü + Potasyum Tutucu Diüretik (MRA)
  if (hasRaas && hasKSparing) {
    riskFactors.unshift('RAAS Blokörü + Potasyum Tutucu Diüretik (Çift Renin-Aldosteron Blokajı)');
    return {
      isAtRisk: true,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 ÖLÜMCÜL HİPERKALEMİ RİSKİ (RAAS Blokörü + Spironolakton/Eplerenon)!',
      mechanism: 'ACEi/ARB aldosteron üretimini azaltırken, spironolakton/eplerenon toplayıcı kanallarda aldosteron reseptörlerini tam bloke eder. Serum potasyumu hızla ölümcül düzeylere (>6.5 mEq/L) tırmanabilir.',
      riskFactorsIdentified: riskFactors,
      detectedDrugs: detected,
      totalHyperkalemicCount,
      hasRenalOrAgeCompounding,
      recommendations: [
        'Serum potasyumu ve böbrek fonksiyonları (kreatinin, eGFR) kombinasyona başlandıktan sonra 1. ve 4. haftalarda mutlaka ölçülmelidir.',
        'Spironolakton dozu günlük maksimum 25 mg ile sınırlandırılmalı, eGFR < 30 mL/dk veya K > 5.0 mEq/L ise KESİNLİKLE KULLANILMAMALIDIR.',
        'Hastaya potasyumdan zengin diyet ve tuz ikamelerinden (potasyumlu diyet tuzları) kaçınması tembihlenmelidir.',
        'EKG kontrolü yapılmalı (sivri T dalgaları, PR uzaması, QRS genişlemesi ani kardiyak arrest öncüsüdür).'
      ]
    };
  }

  // 2. ÖLÜMCÜL KOMBİNASYON 2: RAAS Blokörü + Trimetoprim (Bactrim)
  if (hasRaas && hasTrimethoprim) {
    riskFactors.unshift('RAAS Blokörü + Trimetoprim (Sinsi ENaC Kanal Blokajı)');
    return {
      isAtRisk: true,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 SİNSİ ÖLÜMCÜL HİPERKALEMİ RİSKİ (ACEi/ARB + Trimetoprim / Bactrim)!',
      mechanism: 'Trimetoprim, distal nefrondaki epitelyal sodyum kanallarını (ENaC) tıpkı amilorid gibi doğrudan bloke ederek potasyum atılımını keser. ACEi/ARB zemininde birkaç günlük Bactrim kullanımı ani kardiyak arrest ve açıklanamayan ani ölümlerle ilişkilidir!',
      riskFactorsIdentified: riskFactors,
      detectedDrugs: detected,
      totalHyperkalemicCount,
      hasRenalOrAgeCompounding,
      recommendations: [
        'Özellikle ileri yaşta (≥65) veya böbrek fonksiyonu azalmış (eGFR < 60) hastalarda Bactrim yerine alternatif antibiyotikler (örn. Fosfomisin, Nitrofurantoin, Siprofloksasin veya Beta-laktamlar) öncelikle değerlendirilmelidir.',
        'Bactrim kullanımı zorunluysa, tedavi başlangıcından itibaren 3-5 gün içinde acil serum potasyum kontrolü yapılmalıdır.',
        'Eşzamanlı NSAİİ veya potasyum takviyeleri derhal kesilmelidir.'
      ]
    };
  }

  // 3. ÇOKLU KOMBİNASYON: 3 veya daha fazla hiperkalemik sınıf
  if (activeClassesCount >= 3) {
    return {
      isAtRisk: true,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 ÇOKLU POLİFARMASİ HİPERKALEMİ ALARMI (3+ Potasyum Artırıcı İlaç Grubu)!',
      mechanism: 'Reçetedeki 3 farklı potasyum tutucu mekanizmanın sinerjisi renal atılım rezervini aşarak ani hiperkalemik kardiyak arreste zemin hazırlar.',
      riskFactorsIdentified: riskFactors,
      detectedDrugs: detected,
      totalHyperkalemicCount,
      hasRenalOrAgeCompounding,
      recommendations: [
        'Kombinasyon acilen sadeleştirilmeli, özellikle gereksiz NSAİİ veya potasyum takviyeleri derhal stoplanmalıdır.',
        'Acil bazal potasyum ve kreatinin kontrolü yapılmalıdır.'
      ]
    };
  }

  // 4. İKİLİ KOMBİNASYON + RENAL VEYA YAŞ RİSKİ
  if (activeClassesCount >= 2 && hasRenalOrAgeCompounding) {
    return {
      isAtRisk: true,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 YÜKSEK HİPERKALEMİ RİSKİ (İkili İlaç Etkileşimi + Azalmış Renal Rezerv / İleri Yaş)!',
      mechanism: `İkili potasyum tutucu ilaç kombinasyonu (${Object.keys(detected).filter(k => (detected as any)[k].length > 0).join(', ')}) hastadaki zemin risk faktörleriyle birleştiğinde (${riskFactors.join(', ')}) hiperkalemi kompansasyonunu imkansız kılar.`,
      riskFactorsIdentified: riskFactors,
      detectedDrugs: detected,
      totalHyperkalemicCount,
      hasRenalOrAgeCompounding: true,
      recommendations: [
        'NSAİİ veya ek nefrotoksik ajanlar tedaviden çıkarılmalıdır.',
        'Serum potasyumu ve eGFR yakından takip edilmelidir.',
        'Potasyum > 5.5 mEq/L durumunda RAAS blokörü dozu azaltılmalı veya geçici olarak askıya alınmalıdır.'
      ]
    };
  }

  // 5. İKİLİ KOMBİNASYON (Normal eGFR ve genç hasta)
  if (activeClassesCount >= 2) {
    return {
      isAtRisk: true,
      severity: 'WARNING',
      alertClass: 'warning',
      title: '⚠️ Potasyum Artırıcı İlaç Kombinasyonu (Hiperkalemi İzlemi Gerekir)',
      mechanism: 'İki potasyum tutucu ajanın birlikte kullanımı serum potasyum seviyesinde artışa neden olabilir.',
      riskFactorsIdentified: riskFactors,
      detectedDrugs: detected,
      totalHyperkalemicCount,
      hasRenalOrAgeCompounding: false,
      recommendations: [
        'Rutin potasyum ve böbrek fonksiyon testleri planlanmalıdır.',
        'Hastanın ek OTC NSAİİ veya potasyum tuzu kullanmaması konusunda uyarılması gerekir.'
      ]
    };
  }

  return {
    isAtRisk: false,
    severity: 'SAFE',
    alertClass: 'success',
    title: 'Hiperkalemi Riski Tespit Edilmedi',
    riskFactorsIdentified: riskFactors,
    detectedDrugs: detected,
    totalHyperkalemicCount,
    hasRenalOrAgeCompounding,
    recommendations: []
  };
}

/**
 * 7. CYP3A4 GÜÇLÜ İNHİBİSYONU & STATİN RABDOMİYOLİZ KALKANI
 * 
 * Mekanizma:
 * Simvastatin ve Atorvastatin hepatik Sitokrom P450 3A4 (CYP3A4) izoenzimi tarafından
 * metabolize edilir. Güçlü CYP3A4 inhibitörleri (Klaritromisin, Eritromisin, İtrakonazol,
 * Ketokonazol, Vorikonazol, Posakonazol, Ritonavir) enzimi bloke ederek statin plazma
 * konsantrasyonunu (AUC) 5-20 kat artırır!
 * Sonuç: Masif miyoglobinüri, rabdomiyoliz, akut tübüler nekroz ve ölümcül böbrek yetmezliği.
 * 
 * Güvenli Statin Alternatifleri:
 * Rosuvastatin (CYP2C9 ile minimal metabolizma) ve Pravastatin (CYP enzimlerinden bağımsız).
 * Güvenli Antibiyotik Alternatifi:
 * Azitromisin (CYP3A4'ü inhibe etmez!).
 */
export const CYP3A4_STATIN_DATABASE = {
  cyp3a4Statins: {
    label: 'CYP3A4 Bağımlı Statin (Yüksek Rabdomiyoliz Riski)',
    atcPrefixes: ['C10AA01', 'C10AA02', 'C10AA05'],
    highRiskAtcPrefixes: ['C10AA01', 'C10AA02'],
    keywords: [
      'simvastatin', 'zocor', 'lipovas', 'simva',
      'atorvastatin', 'lipitor', 'tarden', 'kolestor', 'ator', 'atordep', 'ateroz', 'saphire',
      'lovastatin'
    ],
    highRiskKeywords: ['simvastatin', 'zocor', 'lipovas', 'simva', 'lovastatin']
  },
  strongInhibitors: {
    label: 'Güçlü CYP3A4 İnhibitörü',
    atcPrefixes: ['J01FA09', 'J01FA01', 'J02AB02', 'J02AC02', 'J02AC03', 'J05AE'],
    keywords: [
      'klaritromisin', 'clarithromycin', 'klacid', 'macrol', 'claricide', 'uniclar', 'laricid',
      'eritromisin', 'erythromycin', 'erythrocin',
      'itrakonazol', 'itraconazole', 'sporanox', 'funxit', 'itraspor',
      'ketokonazol', 'ketoconazole', 'fungoral', 'nizoral',
      'vorikonazol', 'voriconazole', 'vfend',
      'posakonazol', 'posaconazole', 'noxafil',
      'ritonavir', 'norvir', 'kaletra', 'paxlovid',
      'kobicistat', 'cobicistat'
    ]
  },
  moderateInhibitors: {
    label: 'Orta Düzey CYP3A4 İnhibitörü (Doz Kısıtlaması Gerekir)',
    atcPrefixes: ['C08DB01', 'C08DA01', 'C01BD01'],
    keywords: [
      'diltiazem', 'diltizem', 'altizem',
      'verapamil', 'isoptin',
      'amiodaron', 'amiodarone', 'cordarone',
      'flukonazol', 'fluconazole', 'diflucan', 'flucan', 'triflucan'
    ]
  }
};

export function checkCypStatinInteraction(drugs: DrugInputItem[] = []): CypStatinInteractionResult {
  if (!Array.isArray(drugs) || drugs.length === 0) {
    return {
      hasInteraction: false,
      severity: 'SAFE',
      alertClass: 'success',
      title: 'CYP3A4 / Statin Etkileşimi Tespit Edilmedi',
      detectedDrugs: { statins: [], inhibitors: [] },
      safeAlternatives: {
        antibiotics: ['Azitromisin (Azitro / Zitromax) - CYP3A4 inhibisyonu yapmaz'],
        statins: ['Rosuvastatin (Crestor) veya Pravastatin - CYP3A4 metabolizmasından bağımsızdır']
      },
      recommendations: []
    };
  }

  const detected: {
    cyp3a4Statins: string[];
    highRiskStatins: string[];
    strongInhibitors: string[];
    moderateInhibitors: string[];
  } = {
    cyp3a4Statins: [],
    highRiskStatins: [],
    strongInhibitors: [],
    moderateInhibitors: []
  };

  for (const drugInput of drugs) {
    let name = '';
    let atc = '';
    if (typeof drugInput === 'string') {
      name = drugInput;
    } else if (drugInput && typeof drugInput === 'object') {
      name = `${drugInput.brand || ''} ${drugInput.brandName || ''} ${drugInput.name || ''} ${drugInput.generic || ''}`.trim();
      atc = (drugInput.atcCode || drugInput.atc || '') as string;
    }

    const normName = normalizeStr(name);
    const normAtc = normalizeStr(atc);

    // CYP3A4 Statin Check
    const isCypStatin =
      CYP3A4_STATIN_DATABASE.cyp3a4Statins.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      CYP3A4_STATIN_DATABASE.cyp3a4Statins.keywords.some(k => matchesNormalizedKeyword(normName, k));

    if (isCypStatin) {
      detected.cyp3a4Statins.push(name || 'Statin');
      const isHighRisk =
        CYP3A4_STATIN_DATABASE.cyp3a4Statins.highRiskAtcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
        CYP3A4_STATIN_DATABASE.cyp3a4Statins.highRiskKeywords.some(k => matchesNormalizedKeyword(normName, k));
      if (isHighRisk) detected.highRiskStatins.push(name || 'Simvastatin');
    }

    // Strong Inhibitor Check
    const isStrong =
      CYP3A4_STATIN_DATABASE.strongInhibitors.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      CYP3A4_STATIN_DATABASE.strongInhibitors.keywords.some(k => matchesNormalizedKeyword(normName, k));

    if (isStrong) {
      detected.strongInhibitors.push(name || 'Güçlü CYP3A4 İnhibitörü');
    }

    // Moderate Inhibitor Check
    const isModerate =
      CYP3A4_STATIN_DATABASE.moderateInhibitors.atcPrefixes.some(p => normAtc.startsWith(normalizeStr(p))) ||
      CYP3A4_STATIN_DATABASE.moderateInhibitors.keywords.some(k => matchesNormalizedKeyword(normName, k));

    if (isModerate) {
      detected.moderateInhibitors.push(name || 'Orta CYP3A4 İnhibitörü');
    }
  }

  const hasCypStatin = detected.cyp3a4Statins.length > 0;
  const hasHighRiskStatin = detected.highRiskStatins.length > 0;
  const hasStrong = detected.strongInhibitors.length > 0;
  const hasModerate = detected.moderateInhibitors.length > 0;

  const safeAlternatives = {
    antibiotics: [
      'Azitromisin (Azitro, Zitromax): Makrolid endikasyonunda CYP3A4 inhibisyonu yapmayan birinci basamak güvenli seçenektir.',
      'Amoksisilin / Klavulanat veya Seftriakson: Bakteriyel endikasyona göre CYP etkileşimsiz alternatifler.'
    ],
    statins: [
      'Rosuvastatin (Crestor): CYP2C9 ile minimal metabolize olur; hidrofiliktir, güçlü CYP3A4 inhibitörleri ile klinik rabdomiyoliz riski oluşturmaz.',
      'Pravastatin: Hepatik CYP sisteminden tamamen bağımsız olarak sülfasyonla temizlenir.',
      'Geçici Tedavi Molası: Klaritromisin/Azol antifungal tedavi süresince (7-14 gün) statin tedavisinin geçici olarak durdurulması en pratik ve güvenli yaklaşımdır.'
    ]
  };

  // 1. ÖLÜMCÜL / KONTRENDİKE: Güçlü CYP3A4 İnhibitörü + Simvastatin / Lovastatin
  if (hasHighRiskStatin && hasStrong) {
    return {
      hasInteraction: true,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 KESİN KONTRENDİKE! ŞİDDETLİ RABDOMİYOLİZ RİSKİ (Simvastatin + Güçlü CYP3A4 İnhibitörü)!',
      mechanism: `Klaritromisin, İtrakonazol veya Ketokonazol gibi güçlü inhibitörler Simvastatin plazma eğri altı alanını (AUC) 10-20 kat artırarak toksik plazma düzeylerine fırlatır. Akut rabdomiyoliz, miyoglobinürik böbrek yetmezliği ve ölüm vakaları bildirilmiştir (FDA & TİTCK Kara Kutu Uyarısı).`,
      detectedDrugs: {
        statins: detected.highRiskStatins,
        inhibitors: detected.strongInhibitors
      },
      safeAlternatives,
      recommendations: [
        'KOMBİNASYON KESİNLİKLE YASAKTIR! Birlikte reçete edilmemelidir.',
        'Makrolid gerekiyorsa derhal AZİTROMİSİN tercih edilmelidir.',
        'Antifungal veya Klaritromisin kullanımı zorunluysa, antibiyotik/antifungal kürü bitene kadar Simvastatin DERHAL KESİLMELİDİR.',
        'Hasta kas ağrısı, aşırı halsizlik ve çay rengi/koyu idrar (miyoglobinüri) yönünden uyarılmalı; bu belirtilerde acil CPK ve kreatinin bakılmalıdır.'
      ]
    };
  }

  // 2. YÜKSEK RİSK: Güçlü CYP3A4 İnhibitörü + Atorvastatin
  if (hasCypStatin && hasStrong) {
    return {
      hasInteraction: true,
      severity: 'CRITICAL',
      alertClass: 'danger',
      title: '🚨 YÜKSEK RABDOMİYOLİZ & MİYOPATİ RİSKİ (Atorvastatin + Güçlü CYP3A4 İnhibitörü)!',
      mechanism: 'Güçlü CYP3A4 inhibisyonu Atorvastatin maruziyetini 3 ila 4 kat artırır. Miyopati ve rabdomiyoliz riskini dramatik şekilde katlar.',
      detectedDrugs: {
        statins: detected.cyp3a4Statins,
        inhibitors: detected.strongInhibitors
      },
      safeAlternatives,
      recommendations: [
        'Enfeksiyon tedavisi süresince (7-14 gün) Atorvastatin tedavisine ara verilmesi (statin hold) kuvvetle önerilir.',
        'Antibiyotik olarak CYP3A4 etkileşimsiz AZİTROMİSİN tercih edilmelidir.',
        'Statin kesilemiyorsa Rosuvastatin (düşük doz) veya Pravastatine geçilmelidir.',
        'Kas ağrısı, hassasiyet veya koyu idrar durumunda acil başvuru önerilmelidir.'
      ]
    };
  }

  // 3. ORTA DÜZEY RİSK: Orta İnhibitör (Diltiazem, Verapamil, Amiodaron) + Simvastatin
  if (hasHighRiskStatin && hasModerate) {
    return {
      hasInteraction: true,
      severity: 'WARNING',
      alertClass: 'warning',
      title: '⚠️ Statin Doz Sınırı Uyarısı (Simvastatin + Diltiazem/Verapamil/Amiodaron)',
      mechanism: 'Diltiazem, Verapamil ve Amiodaron CYP3A4 aracılı Simvastatin klirensini yavaşlatarak serum düzeyini 2-3 kat artırır.',
      detectedDrugs: {
        statins: detected.highRiskStatins,
        inhibitors: detected.moderateInhibitors
      },
      safeAlternatives,
      recommendations: [
        'Diltiazem veya Verapamil ile eşzamanlı kullanımda Simvastatin dozu maksimum 10 mg/gün ile sınırlandırılmalıdır.',
        'Amiodaron ile eşzamanlı kullanımda Simvastatin dozu maksimum 20 mg/gün ile sınırlandırılmalıdır.',
        'Alternatif olarak Rosuvastatin tercih edilebilir.'
      ]
    };
  }

  return {
    hasInteraction: false,
    severity: 'SAFE',
    alertClass: 'success',
    title: 'CYP3A4 / Statin Etkileşimi Tespit Edilmedi',
    detectedDrugs: {
      statins: detected.cyp3a4Statins,
      inhibitors: [...detected.strongInhibitors, ...detected.moderateInhibitors]
    },
    safeAlternatives,
    recommendations: []
  };
}

/**
 * 8. ÇEVRİMDİŞI RXNORM CUI & ATC İLAÇ EŞLEŞTİRME VE DDI MOTORU
 * (Sunset/deprecated NLM RxNav Drug Interaction API yerine %100 çevrimdışı yerel motor)
 */
export {
  OFFLINE_RXNORM_CONCEPTS,
  normalizeRxText,
  isRxNavApiDeprecated,
  getOfflineOntologyStats,
  getRxNormConceptByCui,
  getRxNormConceptByAtc,
  getRxNormConceptByKey,
  resolveToRxNormConcept,
  resolveBatchRxNormConcepts,
  type RxNormConceptDefinition,
  type ConceptMatchConfidence,
  type ResolvedRxConcept,
  type OfflineOntologyStats
} from './rxNormMappingEngine';

/**
 * 9. 4 KADEMELİ ETKİLEŞİM HİYERARŞİSİ (TIER 1-4) & ACORN VPT DOWNGRADE MOTORU
 */
export {
  evaluatePrescriptionInteractions,
  isAcornVptRegimen,
  type AlertTierLevel,
  type InteractionAlertCode,
  type PatientSafetyContext,
  type DrugInvolvedRef,
  type InteractionAlert,
  type InteractionEvaluationResult
} from './interactionTierEngine';


