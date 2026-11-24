/**
 * SENTETİK ÖRNEK VAKA KÜTÜPHANESİ (EĞİTİM & HIZLI DEMO)
 *
 * Tamamen anonim ve sentetik 5 klinik senaryo. Gerçek hasta verisi içermez.
 * İlk kez uygulamayı açan hekim veya tıp öğrencisinin çapraz motor akışını,
 * güvenlik kalkanlarını ve canlı SOAP sentezini tek tıkla incelemesi içindir.
 */

export interface SyntheticCaseDrugRef {
  barcode: string;
  brand: string;
  generic: string;
  atcCode: string;
}

export interface SyntheticClinicalCase {
  id: string;
  title: string;
  badge: string;
  summary: string;
  targetSidebarGroup: string;
  /** İsteğe bağlı alt sekme (örn. Genel Cerrahi veya Dahiliye Skorları sekmesi) */
  targetSubTab?: { type: 'surgery' | 'extended'; tab: string };
  /** DOM input/select değerleri (`id -> string`) */
  fieldValues: Record<string, string>;
  /** DOM checkbox değerleri (`id -> boolean`) */
  checkboxValues?: Record<string, boolean>;
  /** İsteğe bağlı TİTCK reçete ilaçları (barkod ile O(1) katalogdan zenginleştirilir) */
  drugs?: SyntheticCaseDrugRef[];
}

export const SYNTHETIC_CLINICAL_CASES: readonly SyntheticClinicalCase[] = [
  {
    id: 'dka_abg',
    title: 'DKA / HAGMA Kan Gazı (42Y Erkek)',
    badge: 'Kan Gazı • 3 Ekol',
    summary: 'Yüksek anyon açıklı metabolik asidoz, Winter kompanzasyonu, Stewart-Fencl SIG ve A-a gradiyenti.',
    targetSidebarGroup: 'kangazi',
    fieldValues: {
      'select-age-unit': 'years',
      'input-age': '42',
      'select-gender': 'male',
      'input-weight': '78',
      'input-height': '176',
      'input-creatinine': '1.1',
      'select-bg-type': 'ABG',
      'input-bg-ph': '7.22',
      'input-bg-pco2': '24',
      'input-bg-hco3': '10',
      'input-bg-po2': '76',
      'input-bg-fio2': '28',
      'input-bg-na': '136',
      'input-bg-cl': '96',
      'input-bg-alb': '3.2',
      'input-bg-lactate': '4.2',
      'input-bg-k': '4.8'
    }
  },
  {
    id: 'ckd_triple_whammy',
    title: 'Evre 3 KBH + Triple Whammy (68Y Erkek)',
    badge: 'İlaç Güvenliği • DDI',
    summary: 'eGFR 40 mL/dk hastada Ramipril + Furosemid + İbuprofen reçetesinde Triple Whammy, Hiperkalemi ve Renal kalkan.',
    targetSidebarGroup: 'ilac',
    fieldValues: {
      'select-age-unit': 'years',
      'input-age': '68',
      'select-gender': 'male',
      'input-weight': '82',
      'input-height': '174',
      'input-creatinine': '1.8'
    },
    drugs: [
      { barcode: '8699809011649', brand: 'DELIX 5 MG 28 TABLET', generic: 'ramipril', atcCode: 'C09AA05' },
      { barcode: '8699809014008', brand: 'LASIX 40 MG 12 TABLET', generic: 'furosemide', atcCode: 'C03CA01' },
      { barcode: '8699548094408', brand: 'BRUFEN 400 MG 20 FILM TABLET', generic: 'ibuprofen', atcCode: 'M01AE01' }
    ]
  },
  {
    id: 'cirrhosis_hepatic_shield',
    title: 'Dekompanze Siroz Child-Pugh C + Hepatik Kalkan (58Y Erkek)',
    badge: 'Hepatoloji • MELD 3.0',
    summary: 'Child-Pugh C & MELD 3.0 hesaplaması ve reçetedeki NSAİİ / Parasetamol / Statin için otomatik hepatik güvenlik uyarısı.',
    targetSidebarGroup: 'nefro',
    targetSubTab: { type: 'extended', tab: 'hepatology' },
    fieldValues: {
      'select-age-unit': 'years',
      'input-age': '58',
      'select-gender': 'male',
      'input-weight': '76',
      'input-height': '172',
      'input-creatinine': '1.6',
      'decl-child_pugh-bilirubin': 'gt3',
      'decl-child_pugh-albumin': 'lt2_8',
      'decl-child_pugh-inr': 'gt2_2',
      'decl-child_pugh-ascites': 'severe',
      'decl-child_pugh-encephalopathy': 'grade1_2',
      'input-meld-bili': '4.2',
      'input-meld-inr': '2.4',
      'input-meld-cr': '1.6',
      'input-meld-na': '130',
      'input-meld-alb': '2.5'
    },
    drugs: [
      { barcode: '8699548094408', brand: 'BRUFEN 400 MG 20 FILM TABLET', generic: 'ibuprofen', atcCode: 'M01AE01' },
      { barcode: '8699717010109', brand: 'PAROL 500 MG 20 TABLET', generic: 'paracetamol', atcCode: 'N02BE01' },
      { barcode: '8699532095015', brand: 'LIPITOR 20 MG 30 FILM TABLET', generic: 'atorvastatin', atcCode: 'C10AA05' }
    ]
  },
  {
    id: 'neonate_jaundice_48h',
    title: '48 Saatlik Yenidoğan Sarılığı (38 hf, DAT+)',
    badge: 'Neonatoloji • AAP 2022',
    summary: 'DAT(+) izoimmün hemolizli 48 saatlik yenidoğanda AAP 2022 fototerapi eşiği, TND 2014 kıyaslaması ve %10,9 tartı kaybı.',
    targetSidebarGroup: 'neonatoloji',
    fieldValues: {
      'select-age-unit': 'days',
      'input-age': '2',
      'select-gender': 'male',
      'input-birth-weight': '3200',
      'input-weight': '2.85',
      'input-height': '50',
      'input-head-circ': '34.5',
      'select-bhutani-guideline': 'AAP_2022',
      'input-bhutani-gw': '38',
      'input-bhutani-age-hours': '48',
      'input-bhutani-tsb': '16.8',
      'input-bhutani-direct': '0.6',
      'input-bhutani-albumin': '3.2'
    },
    checkboxValues: {
      'chk-bhutani-dat': true
    }
  },
  {
    id: 'acute_appendicitis_triad',
    title: 'Akut Apandisit 3\'lü Karşılaştırma (24Y Erkek)',
    badge: 'Genel Cerrahi • WSES',
    summary: 'Alvarado, AIR (2021 STRAPPSCORE) ve AAS skorlarının ortak cerrahi laboratuvar paneliyle yan yana değerlendirmesi.',
    targetSidebarGroup: 'cerrahi',
    targetSubTab: { type: 'surgery', tab: 'appendicitis' },
    fieldValues: {
      'select-age-unit': 'years',
      'input-age': '24',
      'select-gender': 'male',
      'input-weight': '74',
      'input-height': '178',
      'input-surg-wbc': '15.4',
      'input-surg-neut': '84',
      'input-surg-crp': '68',
      'input-surg-symptom-hours': '18',
      'select-app-guarding': '2',
      'select-aas-duration': 'under_24h'
    },
    checkboxValues: {
      'chk-alv-rlq': true,
      'chk-alv-mig': true,
      'chk-alv-ano': true,
      'chk-alv-nau': true,
      'chk-alv-reb': true,
      'chk-alv-temp': true,
      'chk-alv-leu': true,
      'chk-alv-shi': true,
      'chk-air-vomiting': true
    }
  }
];

export function getSyntheticCaseById(id: string): SyntheticClinicalCase | null {
  return SYNTHETIC_CLINICAL_CASES.find(c => c.id === id) || null;
}
