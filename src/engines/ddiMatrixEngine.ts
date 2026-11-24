/**
 * DDINTER 2.0 + KÜRATÖRLÜ TÜRKÇE DDI, BESİN-İLAÇ VE DUPLİKASYON MOTORU
 *
 * Tek kompakt dosya (`public/data/ddi_matrix.json`, ~58 KB GZIP) üzerinden O(1) hızda:
 *   1. 28 küratörlü Türkçe klinik ATC önek etkileşim kuralı
 *   2. 81.327 DDInter 2.0 Major (K) ve Moderate (O) ilaç-ilaç etkileşimi
 *   3. 502 ATC Terapötik Duplikasyon Grubu kontrolü
 *   4. 545 ATC için 24 benzersiz besin-ilaç etkileşimi (Türkçe etiket + kısa klinik kılavuz)
 *   5. Ortak hastalık etkileşimi Türkçe etiket çeviricisi
 *
 * Alarm Yorgunluğu Koruması:
 *   - Mevcut 4-Kademeli interactionTierEngine tarafından yakalanan çiftler tekilleştirilir.
 *   - Major (K) & küratörlü kritik kurallar öne çıkarılır; Moderate (O) kurallar ayrı akordeon listesinde döner.
 */

import {
  inferDrugRoute,
  isMealTimingApplicableForRoute,
  isOralOrEnteralRoute,
  isLocalNonSystemicRoute,
  shouldSuppressFoodWarningForRoute,
  type DrugRouteCode
} from './drugRouteEngine';

export interface CuratedDdiRule {
  a: string;
  b: string;
  s: 'K' | 'O' | 'H' | string;
  t: string;
  u: string;
  g1: string;
  g2: string;
}

export interface CompactDdiMatrixPayload {
  v: number;
  atcs: string[];
  names: string[];
  rules: CuratedDdiRule[];
  K: Record<string, number[]>;
  O: Record<string, number[]>;
  dup: Record<string, string[]>;
  foodQuick: Record<string, Array<[string, 'K' | 'O' | 'H']>>;
}

export interface DdiDrugRef {
  brand?: string;
  name?: string;
  generic?: string;
  atc?: string;
  atcCode?: string;
  mealTiming?: string;
  mealTimingCode?: number;
  drivingRisk?: string;
  drivingRiskCode?: number;
  route?: DrugRouteCode | string;
  allergens?: string[];
}

export interface DdiMatrixAlert {
  id: string;
  source: 'CURATED' | 'DDINTER';
  severity: 'K' | 'O' | 'H';
  severityLabel: string;
  title: string;
  message: string;
  drugA: string;
  drugB: string;
  atcA: string;
  atcB: string;
  genericA: string;
  genericB: string;
}

export interface TherapeuticDuplicationAlert {
  groupKey: string;
  groupLabelTr: string;
  drugs: Array<{ brand: string; atc: string; generic: string }>;
  isExactIngredient: boolean;
}

export interface FoodDictionaryEntry {
  key: string;
  labelTr: string;
  shortGuidanceTr: string;
  category: 'alcohol' | 'citrus' | 'electrolyte' | 'meal' | 'stimulant' | 'fiber' | 'other';
}

export interface PrescriptionFoodItem {
  foodKey: string;
  foodLabelTr: string;
  severity: 'K' | 'O' | 'H';
  shortGuidanceTr: string;
  drugs: string[];
}

export interface PrescriptionCounselingSummary {
  foods: PrescriptionFoodItem[];
  mealTimings: Array<{ drug: string; timing: string }>;
  drivingWarnings: Array<{ drug: string; risk: string; isHigh: boolean }>;
  criticalExcipients: Array<{ excipient: string; drugs: string[]; note: string }>;
  totalSignals: number;
}

export interface DdiMatrixEvaluationResult {
  curatedAlerts: DdiMatrixAlert[];
  majorAlerts: DdiMatrixAlert[];
  moderateAlerts: DdiMatrixAlert[];
  duplications: TherapeuticDuplicationAlert[];
  counseling: PrescriptionCounselingSummary;
  totalInteractionCount: number;
}

/**
 * 24 BENZERSİZ DDINTER BESİN ETKİLEŞİMİ — TÜRKÇE SÖZLÜK VE KISA KLİNİK YÖNETİM
 */
export const FOOD_DICTIONARY_TR: Record<string, FoodDictionaryEntry> = {
  alcohol: {
    key: 'alcohol',
    labelTr: 'Alkol',
    shortGuidanceTr: 'Tedavi süresince alkolden kaçınılmalıdır; MSS depresyonu, hepatotoksisite, kanama veya hipoglisemi/asidoz riskini artırır.',
    category: 'alcohol'
  },
  'grapefruit juice': {
    key: 'grapefruit juice',
    labelTr: 'Greyfurt Suyu',
    shortGuidanceTr: 'Bağırsak CYP3A4 enzimini inhibe ederek ilaç plazma düzeyini ve toksisite riskini yükseltebilir; greyfurt tüketiminden kaçınılmalıdır.',
    category: 'citrus'
  },
  'food high in potassium': {
    key: 'food high in potassium',
    labelTr: 'Potasyum Zengini Besinler',
    shortGuidanceTr: 'Muz, kayısı, ıspanak, avokado ve potasyumlu tuz ikamelerinin aşırı tüketimi hiperkalemi riskini artırabilir; serum K+ izlenmelidir.',
    category: 'electrolyte'
  },
  'food high in vitamin k': {
    key: 'food high in vitamin k',
    labelTr: 'K Vitamini Zengini Besinler',
    shortGuidanceTr: 'Ispanak, brokoli, lahana gibi yeşil yapraklı sebzelerin tüketimi sabit tutulmalıdır; ani artış/azalış INR dengesini bozar.',
    category: 'electrolyte'
  },
  food: {
    key: 'food',
    labelTr: 'Yemek / Öğün Zamanlaması',
    shortGuidanceTr: 'İlacın oral biyoyararlanımı öğünle anlamlı değişebilir; resmi KÜB aç/tok talimatına göre düzenli zamanlama uygulanmalıdır.',
    category: 'meal'
  },
  'high-fat foods': {
    key: 'high-fat foods',
    labelTr: 'Yüksek Yağlı Yemekler',
    shortGuidanceTr: 'Yağlı öğünler ilacın emilim hızını ve pik konsantrasyonunu değiştirebilir; tutarlı öğün düzeniyle alınmalıdır.',
    category: 'meal'
  },
  'dairy products': {
    key: 'dairy products',
    labelTr: 'Süt ve Süt Ürünleri (Kalsiyum)',
    shortGuidanceTr: 'Süt, yoğurt, peynir ve kalsiyum takviyeleri şelasyonla ilaç emilimini azaltabilir; en az 2 saat arayla alınmalıdır.',
    category: 'electrolyte'
  },
  'orange juice': {
    key: 'orange juice',
    labelTr: 'Portakal Suyu (Kalsiyum/OATP)',
    shortGuidanceTr: 'Kalsiyumla zenginleştirilmiş veya taze portakal suyu ilaç emilimini azaltabilir; ilaç su ile ve en az 2 saat arayla alınmalıdır.',
    category: 'citrus'
  },
  coffee: {
    key: 'coffee',
    labelTr: 'Kahve / Kafein',
    shortGuidanceTr: 'Kafein CYP1A2 üzerinden etkileşebilir veya MSS/kardiyovasküler yan etkileri artırabilir; aşırı tüketim sınırlandırılmalıdır.',
    category: 'stimulant'
  },
  cola: {
    key: 'cola',
    labelTr: 'Kola / Kafeinli Asidik İçecekler',
    shortGuidanceTr: 'Gastrik pH ve kafein içeriği ilaç emilimini veya yan etki profilini değiştirebilir; ilaç sade su ile alınmalıdır.',
    category: 'stimulant'
  },
  'green tea': {
    key: 'green tea',
    labelTr: 'Yeşil Çay',
    shortGuidanceTr: 'Kateşin ve K vitamini içeriği ilaç etkinliğini azaltabilir veya taşıyıcı proteinleri etkileyebilir; yüksek miktardan kaçınılmalıdır.',
    category: 'stimulant'
  },
  cigarette: {
    key: 'cigarette',
    labelTr: 'Sigara / Tütün',
    shortGuidanceTr: 'Sigara dumanı CYP1A2 enzimini indükleyerek ilaç kan düzeyini düşürebilir; sigara bırakma durumunda doz yeniden değerlendirilmelidir.',
    category: 'stimulant'
  },
  'tyrosine-rich foods': {
    key: 'tyrosine-rich foods',
    labelTr: 'Tiramin / Tirozin Zengini Besinler',
    shortGuidanceTr: 'Eski peynir, fermente/kurutulmuş etler, soya sosu ve kırmızı şarap hipertansif kriz riski nedeniyle sınırlandırılmalıdır.',
    category: 'other'
  },
  soybean: {
    key: 'soybean',
    labelTr: 'Soya Ürünleri',
    shortGuidanceTr: 'Soya proteini/izoflavonlar bağırsak emilimini azaltabilir; özellikle tiroid hormonu gibi ilaçlarla arasına 3-4 saat konmalıdır.',
    category: 'fiber'
  },
  'dietary fiber': {
    key: 'dietary fiber',
    labelTr: 'Yüksek Diyet Lifi',
    shortGuidanceTr: 'Yoğun lifli besinler ilaç emilimini geciktirebilir veya azaltabilir; ilaçla arasına en az 2 saat bırakılmalıdır.',
    category: 'fiber'
  },
  'high-fiber meal': {
    key: 'high-fiber meal',
    labelTr: 'Yüksek Lifli Öğün',
    shortGuidanceTr: 'Dar terapötik aralıklı ilaçlarda düzenli lif alımı korunmalı, doz alımı yüksek lifli öğünlerle çakıştırılmamalıdır.',
    category: 'fiber'
  },
  grain: {
    key: 'grain',
    labelTr: 'Tam Tahıllar (Fitat)',
    shortGuidanceTr: 'Tahıllardaki fitik asit mineral ve bazı ilaçların emilimini bağlayabilir; en az 2 saat ara bırakılmalıdır.',
    category: 'fiber'
  },
  bran: {
    key: 'bran',
    labelTr: 'Kepek',
    shortGuidanceTr: 'Yüksek kepek içeriği oral emilimi azaltabilir; ilaç alımı ile arasında en az 2 saat olmalıdır.',
    category: 'fiber'
  },
  cereal: {
    key: 'cereal',
    labelTr: 'Tahıl Gevreği (Katyon/Kalsiyum)',
    shortGuidanceTr: 'Mineral katkılı kahvaltılık gevrekler ilaçla şelasyon yapabilir; en az 2 saat ayrı alınması önerilir.',
    category: 'fiber'
  },
  'cranberry juice': {
    key: 'cranberry juice',
    labelTr: 'Kızılcık (Turna Yemişi) Suyu',
    shortGuidanceTr: 'CYP2C9/CYP3A4 etkileşimi veya antikoagülan etki artışı nedeniyle yüksek miktarda tüketimden kaçınılmalı, klinik izlem yapılmalıdır.',
    category: 'citrus'
  },
  pomegranates: {
    key: 'pomegranates',
    labelTr: 'Nar / Nar Suyu',
    shortGuidanceTr: 'Greyfurta benzer şekilde CYP3A4 metabolizmasını baskılayarak ilaç düzeyini yükseltebilir; birlikte tüketilmemelidir.',
    category: 'citrus'
  },
  spinach: {
    key: 'spinach',
    labelTr: 'Ispanak (Oksalat / K Vit.)',
    shortGuidanceTr: 'Yüksek oksalat içeriği mineral emilimini azaltabilir; antikoagülan kullananlarda K vitamini miktarı sabit tutulmalıdır.',
    category: 'electrolyte'
  },
  rhubarb: {
    key: 'rhubarb',
    labelTr: 'Ravent (Oksalat)',
    shortGuidanceTr: 'Yüksek oksalik asit içeriği kalsiyum ve bazı ilaçların bağırsak emilimini azaltabilir; en az 2 saat ara verilmelidir.',
    category: 'electrolyte'
  },
  'foods containing photosensitizing components': {
    key: 'foods containing photosensitizing components',
    labelTr: 'Işığa Duyarlılaştırıcı Besinler',
    shortGuidanceTr: 'Kereviz, maydanoz, incir, limon ve misket limonu gibi psoralen içeren gıdalar fototoksik cilt reaksiyonlarını şiddetlendirebilir.',
    category: 'other'
  }
};

export const FOOD_MECHANISM_TR: Record<string, string> = {
  Synergy: 'Sinerji (Etki / Toksisite Artışı)',
  Metabolism: 'Metabolizma (CYP / Enzim Etkileşimi)',
  Absorption: 'Emilim (Biyoyararlanım Değişimi)',
  Antagonism: 'Antagonizma (Etkinlik Azalması)',
  'Synergy Metabolism': 'Sinerji & Metabolizma Etkileşimi',
  Others: 'Klinik Etkileşim'
};

export const DISEASE_TR_MAP: Record<string, string> = {
  'liver diseases': 'Karaciğer Hastalıkları',
  'kidney diseases': 'Böbrek Hastalıkları',
  'diabetes mellitus': 'Diabetes Mellitus (Diyabet)',
  'heart failure': 'Kalp Yetmezliği',
  hypotension: 'Hipotansiyon',
  'depressive disorder': 'Depresif Bozukluk',
  seizures: 'Nöbet / Konvülsiyon',
  'water-electrolyte imbalance': 'Sıvı-Elektrolit Dengesizliği',
  colitis: 'Kolit / İnflamatuar Bağırsak Hast.',
  hyperkalemia: 'Hiperkalemi',
  'diseases requiring hemodialysis': 'Hemodiyaliz Gerektiren Böbrek Hast.',
  epilepsy: 'Epilepsi',
  'long qt syndrome': 'Uzun QT Sendromu',
  asthma: 'Astım',
  hypertension: 'Hipertansiyon',
  hemorrhage: 'Kanama / Hemoraji Riski',
  rhabdomyolysis: 'Rabdomiyoliz',
  alcoholism: 'Alkolizm / Alkol Kullanım Bozukluğu',
  'arrhythmias, cardiac': 'Kardiyak Aritmiler',
  'peptic ulcer': 'Peptik Ülser',
  glaucoma: 'Glokom',
  'myasthenia gravis': 'Myastenia Gravis',
  bradycardia: 'Bradikardi',
  'atrioventricular block': 'Atriyoventriküler (AV) Blok',
  'coronary artery disease': 'Koroner Arter Hastalığı',
  'myocardial infarction': 'Miyokard Enfarktüsü',
  'bone marrow diseases': 'Kemik İliği Baskılanması / Hast.',
  neutropenia: 'Nötropeni',
  thrombocytopenia: 'Trombositopeni',
  anemia: 'Anemi',
  gout: 'Gut / Hiperürisemi',
  porphyrias: 'Porfiri',
  phenylketonurias: 'Fenilketonüri',
  'cognitive dysfunction': 'Bilişsel Bozukluk / Demans',
  parkinson: 'Parkinson Hastalığı',
  'parkinson disease': 'Parkinson Hastalığı',
  'suicidal ideation': 'İntihar Düşüncesi / Riski',
  'bipolar disorder': 'Bipolar Bozukluk',
  psychoses: 'Psikotik Bozukluklar',
  'pulmonary disease, chronic obstructive': 'KOAH',
  'respiratory insufficiency': 'Solunum Yetmezliği',
  'sleep apnea syndromes': 'Uyku Apne Sendromu',
  'prostatic hyperplasia': 'Benign Prostat Hiperplazisi (BPH)',
  'urinary retention': 'İdrar Retansiyonu',
  'gastrointestinal hemorrhage': 'Gastrointestinal Kanama',
  pancreatitis: 'Pankreatit',
  'thyroid diseases': 'Tiroid Hastalıkları',
  hyperthyroidism: 'Hipertiroidi',
  hypothyroidism: 'Hipotiroidi',
  osteoporosis: 'Osteoporoz',
  'venous thromboembolism': 'Venöz Tromboembolizm (VTE)',
  stroke: 'İnme / Serebrovasküler Olay',
  'drug hypersensitivity': 'İlaç Aşırı Duyarlılığı / Alerji',
  infection: 'Aktif Enfeksiyonlar',
  infections: 'Aktif Enfeksiyonlar',
  immunocompromised: 'İmmünsüpresyon',
  'hepatic insufficiency': 'Karaciğer Yetmezliği',
  'liver failure': 'Karaciğer Yetmezliği',
  'renal insufficiency': 'Böbrek Yetmezliği',
  'cardiovascular diseases': 'Kardiyovasküler Hastalıklar',
  'heart diseases': 'Kalp Hastalıkları',
  'bone marrow failure disorders': 'Kemik İliği Yetmezliği / Baskılanması',
  'hematologic diseases': 'Hematolojik Hastalıklar',
  hyperlipidemias: 'Hiperlipidemi',
  'psychotic disorders': 'Psikotik Bozukluklar',
  angioedema: 'Anjiyoödem',
  'premature birth': 'Prematüre / Erken Doğum',
  'lung diseases': 'Akciğer Hastalıkları',
  'peptic ulcer perforation': 'Peptik Ülser Perforasyonu',
  'intestinal obstruction': 'İntestinal Obstrüksiyon (İleus)',
  'alcoholic intoxication': 'Alkol İntoksikasyonu'
};

const DUP_GROUP_TR_MAP: Record<string, string> = {
  'hmg co-a reductase inhibitors': 'Statinler (HMG-KoA Redüktaz İnhibitörleri)',
  'nonsteroidal anti-inflammatory agents': 'NSAİİ (Nonsteroid Antiinflamatuar İlaçlar)',
  'nonsteroidal anti-inflammatories': 'NSAİİ (Nonsteroid Antiinflamatuar İlaçlar)',
  'proton pump inhibitors': 'Proton Pompa İnhibitörleri (PPI)',
  'acid suppressant agents': 'Asit Baskılayıcı İlaçlar (PPI / H2RA)',
  'angiotensin converting enzyme inhibitors': 'ACE İnhibitörleri',
  'angiotensin converting enzyme in': 'ACE İnhibitörleri',
  'angiotensin receptor blockers': 'ARB (Anjiyotensin Reseptör Blokerleri)',
  'angiotensin ii inhibitors': 'ARB (Anjiyotensin II Reseptör İnhibitörleri)',
  'selective serotonin reuptake inhibitors': 'SSRI Antidepresanlar',
  'serotonin-norepinephrine reuptake inhibitors': 'SNRI Antidepresanlar',
  antidepressants: 'Antidepresanlar',
  'beta adrenergic blocking agents': 'Beta Blokerler',
  'beta blockers': 'Beta Blokerler',
  'calcium channel blocking agents': 'Kalsiyum Kanal Blokerleri',
  'calcium channel blockers': 'Kalsiyum Kanal Blokerleri',
  benzodiazepines: 'Benzodiazepinler',
  tranquilizers: 'Trankilizanlar / Anksiyolitikler',
  hypnotics: 'Hipnotikler (Uyku İlaçları)',
  'opioid analgesics': 'Opioid Analjezikler',
  'opiate antagonists': 'Opioid Antagonistleri',
  'loop diuretics': 'Loop Diüretikler',
  'thiazide diuretics': 'Tiyazid Diüretikler',
  'thiazide and thiazide-like diure': 'Tiyazid ve Benzeri Diüretikler',
  'potassium-sparing diuretics': 'Potasyum Tutucu Diüretikler',
  'potassium sparing diuretics': 'Potasyum Tutucu Diüretikler',
  'h2 antagonists': 'H2 Reseptör Antagonistleri',
  antihistamines: 'Antihistaminikler',
  fluoroquinolones: 'Florokinolon Antibiyotikler',
  macrolides: 'Makrolid Antibiyotikler',
  'macrolide-type antibiotics': 'Makrolid Antibiyotikler',
  cephalosporins: 'Sefalosporinler',
  penicillins: 'Penisilinler',
  'beta-lactam antibiotics': 'Beta-Laktam Antibiyotikler',
  'tetracycline-type antibiotics': 'Tetrasiklin Antibiyotikler',
  sulfonamides: 'Sülfonamidler',
  'rifamycin derivatives': 'Rifamisin Türevleri',
  'miscellaneous antituberculosis a': 'Antitüberküloz Ajanlar',
  'urinary anti-infectives': 'Üriner Antiinfektifler',
  'antipneumocystis agents': 'Anti-Pneumocystis Ajanlar',
  antimalarials: 'Antimalaryal İlaçlar',
  amebicides: 'Amibisitler',
  glucocorticoids: 'Sistemik Kortikosteroidler',
  cortisones: 'Kortikosteroidler (Kortizon Türevleri)',
  anticoagulants: 'Antikoagülanlar',
  'antiplatelet agents': 'Antiagreganlar',
  sulfonylureas: 'Sülfonilüreler',
  'insulin secretagogues': 'İnsülin Sekretagogları',
  'incretin-based therapies': 'İnkretin Bazlı Antidiyabetikler (DPP-4 / GLP-1)',
  'intermediate- and long-acting in': 'Orta ve Uzun Etkili İnsülinler',
  'dpp-4 inhibitors': 'DPP-4 İnhibitörleri',
  'sglt2 inhibitors': 'SGLT2 İnhibitörleri',
  'tricyclic antidepressants': 'Trisiklik Antidepresanlar (TCA)',
  'atypical antipsychotics': 'Atipik Antipsikotikler',
  antipsychotics: 'Antipsikotikler',
  triptans: 'Triptanlar (Migren Ajanları)',
  'ergot-like drugs': 'Ergot Türevleri ve Triptanlar',
  'inhaled smooth muscle relaxants': 'İnhale Bronkodilatörler',
  'anticholinergics/antispasmodics': 'Antikolinerjikler / Antispazmodikler',
  'local injectable anesthetics': 'Lokal Enjektabl Anestezikler',
  antiarrhythmics: 'Antiaritmikler',
  'group i antiarrhythmics': 'Sınıf I Antiaritmikler',
  'group iv antiarrhythmics': 'Sınıf IV Antiaritmikler',
  'antineoplastic antibiotics': 'Antineoplastik Antibiyotikler',
  'antineoplastic hormones': 'Antineoplastik Hormonlar',
  cholinergics: 'Kolinerjikler',
  progestins: 'Progestinler',
  estrogens: 'Östrojenler',
  decongestants: 'Dekonjestanlar',
  'agents for pulmonary hypertensio': 'Pulmoner Hipertansiyon Ajanları',
  'biologic dmards': 'Biyolojik DMARD Ajanlar',
  'sympathomimetic amines': 'Sempatomimetik Aminler',
  'muscle relaxants': 'Kas Gevşeticiler',
  'stimulant and hyperosmotic laxat': 'Stimülan ve Hiperozmotik Laksatifler',
  nnrtis: 'NNRTI Antiviraller',
  'protease inhibitors': 'Proteaz İnhibitörleri',
  'integrase strand transfer inhibi': 'İntegraz İnhibitörleri (INSTI)',
  'antiviral boosters': 'Antiviral Farmakokinetik Güçlendiriciler',
  'ns5a inhibitors': 'HCV NS5A İnhibitörleri',
  'vitamin d analogs': 'D Vitamini Analogları',
  'alpha-adrenoreceptor antagonists': 'Alfa-Adrenoseptör Antagonistleri',
  'erectile dysfunction agents': 'Erektil Disfonksiyon Ajanları (PDE-5)',
  'phosphodiesterase inhibitors': 'Fosfodiesteraz İnhibitörleri',
  nitrates: 'Nitratlar',
  'nmda antagonists': 'NMDA Reseptör Antagonistleri',
  barbiturates: 'Barbitüratlar',
  'barbiturate anticonvulsant agent': 'Barbitürat Antikonvülzanlar',
  'bone resorption inhibitors': 'Kemik Rezorpsiyon İnhibitörleri (Bisfosfonatlar)',
  'cerebral stimulants': 'Santral Uyarıcılar (Stimülanlar)',
  magnesium: 'Magnezyum Preparatları',
  'peripherally acting antihyperten': 'Periferik Etkili Antihipertansifler',
  'centrally acting antihypertensiv': 'Santral Etkili Antihipertansifler',
  '5ht3 receptor antagonists': '5-HT3 Reseptör Antagonistleri (Antiemetik)',
  'nk1 receptor antagonists': 'NK1 Reseptör Antagonistleri (Antiemetik)',
  'antidopaminergic-like antiemetic': 'Antidopaminerjik Antiemetikler',
  antiemetics: 'Antiemetikler',
  'antivertigo agents': 'Antivertigo Ajanlar',
  'carbonic anhydrase inhibitor ant': 'Karbonik Anhidraz İnhibitörü Antikonvülzanlar',
  'carbonic anhydrase inhibitor oph': 'Oftalmik Karbonik Anhidraz İnhibitörleri',
  'cdk 4/6 inhibitors': 'CDK 4/6 İnhibitörleri',
  'retinoic acid derivatives': 'Retinoidler (Retinoik Asit Türevleri)',
  'anti-gout agents': 'Gut (Ürik Asit) İlaçları',
  'anticholinergics for parkinsonis': 'Antiparkinson Antikolinerjikler',
  'comt inhibitors for parkinsonism': 'Antiparkinson COMT İnhibitörleri',
  'cardiac stressing agents': 'Kardiyak Stres Ajanları',
  'cd20 monoclonal antibodies': 'Anti-CD20 Monoklonal Antikorlar',
  'dna methyltransferase inhibitors': 'DNA Metiltransferaz İnhibitörleri'
};

export function translateFoodEntry(rawFood: string): FoodDictionaryEntry {
  const key = String(rawFood || '').trim().toLowerCase();
  const hit = FOOD_DICTIONARY_TR[key];
  if (hit) return hit;
  return {
    key,
    labelTr: rawFood,
    shortGuidanceTr: 'Besin-ilaç etkileşimi nedeniyle klinik izlem ve düzenli kullanım zamanlaması önerilir.',
    category: 'other'
  };
}

export function translateFoodMechanism(rawMech?: string): string {
  const m = String(rawMech || '').trim();
  return FOOD_MECHANISM_TR[m] || m || 'Klinik Etkileşim';
}

export function translateDiseaseName(rawDisease: string): string {
  const clean = String(rawDisease || '').trim();
  const hit = DISEASE_TR_MAP[clean.toLowerCase()];
  return hit || clean;
}

export function translateDupGroup(rawGroup: string): string {
  const clean = String(rawGroup || '').trim();
  return DUP_GROUP_TR_MAP[clean.toLowerCase()] || clean;
}

// ----------------------------------------------------------------------------
// BELLEK İÇİ O(1) MATRİS ÖNBELLEĞİ
// ----------------------------------------------------------------------------
let cachedMatrix: CompactDdiMatrixPayload | null = null;
let matrixLoadingPromise: Promise<CompactDdiMatrixPayload | null> | null = null;
const atcToIdx = new Map<string, number>();
const majorSets = new Map<number, Set<number>>();
const moderateSets = new Map<number, Set<number>>();

export function isDdiMatrixReady(): boolean {
  return cachedMatrix !== null;
}

export function setDdiMatrixCache(data: CompactDdiMatrixPayload): void {
  cachedMatrix = data;
  atcToIdx.clear();
  majorSets.clear();
  moderateSets.clear();

  if (Array.isArray(data.atcs)) {
    for (let i = 0; i < data.atcs.length; i++) {
      atcToIdx.set(data.atcs[i].toUpperCase(), i);
    }
  }
  if (data.K) {
    for (const [k, arr] of Object.entries(data.K)) {
      majorSets.set(Number(k), new Set(arr));
    }
  }
  if (data.O) {
    for (const [k, arr] of Object.entries(data.O)) {
      moderateSets.set(Number(k), new Set(arr));
    }
  }
}

export async function ensureDdiMatrixReady(): Promise<CompactDdiMatrixPayload | null> {
  if (cachedMatrix) return cachedMatrix;
  if (matrixLoadingPromise) return matrixLoadingPromise;

  matrixLoadingPromise = (async () => {
    if (typeof fetch !== 'undefined') {
      const candidatePaths = [
        './data/ddi_matrix.json',
        '/data/ddi_matrix.json',
        'data/ddi_matrix.json'
      ];
      for (const p of candidatePaths) {
        try {
          const res = await fetch(p);
          if (res && res.ok) {
            const parsed = (await res.json()) as CompactDdiMatrixPayload;
            if (parsed && Array.isArray(parsed.atcs)) {
              setDdiMatrixCache(parsed);
              return parsed;
            }
          }
        } catch {
          // sonraki yolu dene
        }
      }
    }

    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fsMod = 'fs';
        const pathMod = 'path';
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);
        const fsCandidates = [
          path.join(process.cwd(), 'public', 'data', 'ddi_matrix.json'),
          path.join(process.cwd(), 'dist', 'data', 'ddi_matrix.json')
        ];
        for (const fp of fsCandidates) {
          if (fs.existsSync(fp)) {
            const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as CompactDdiMatrixPayload;
            setDdiMatrixCache(parsed);
            return parsed;
          }
        }
      } catch {
        // yoksay
      }
    }

    return null;
  })();

  try {
    return await matrixLoadingPromise;
  } finally {
    matrixLoadingPromise = null;
  }
}

function pairCanonicalKey(atc1: string, atc2: string): string {
  return atc1 < atc2 ? `${atc1}:${atc2}` : `${atc2}:${atc1}`;
}

/**
 * İki ATC kodu arasında O(1) DDInter 2.0 + 28 Küratörlü Türkçe Kural kontrolü
 */
export function checkAtcPairInteraction(
  drugA: { brand: string; atc: string; generic: string; route?: DrugRouteCode | string },
  drugB: { brand: string; atc: string; generic: string; route?: DrugRouteCode | string }
): DdiMatrixAlert | null {
  if (!cachedMatrix || !drugA.atc || !drugB.atc || drugA.atc === drugB.atc) return null;

  const atc1 = drugA.atc.toUpperCase();
  const atc2 = drugB.atc.toUpperCase();
  const routeA = inferDrugRoute({ route: drugA.route as string | undefined, brand: drugA.brand, atcCode: atc1 });
  const routeB = inferDrugRoute({ route: drugB.route as string | undefined, brand: drugB.brand, atcCode: atc2 });

  // Topikal / Oftalmik / Otik lokal ajanlarda sistemik DDI matris gürültüsünü bastır
  if (isLocalNonSystemicRoute(routeA) || isLocalNonSystemicRoute(routeB)) {
    return null;
  }

  // 1. Önce 28 küratörlü zengin Türkçe klinik önek kuralını kontrol et
  for (const rule of cachedMatrix.rules || []) {
    const fwd = atc1.startsWith(rule.a) && atc2.startsWith(rule.b);
    const rev = atc1.startsWith(rule.b) && atc2.startsWith(rule.a);
    if (fwd || rev) {
      // GI şelasyon kuralları (florokinolon/tetrasiklin + kalsiyum/demir) yalnızca her iki ilaç oral/enteral ise geçerlidir
      const isGiChelationRule =
        rule.s === 'H' &&
        (rule.t.toLowerCase().includes('şelasyon') || rule.t.toLowerCase().includes('emilim'));
      if (isGiChelationRule && (!isOralOrEnteralRoute(routeA) || !isOralOrEnteralRoute(routeB))) {
        continue;
      }
      const sev = (rule.s === 'K' ? 'K' : (rule.s === 'H' ? 'H' : 'O')) as 'K' | 'O' | 'H';
      return {
        id: `CUR:${rule.a}:${rule.b}:${pairCanonicalKey(atc1, atc2)}`,
        source: 'CURATED',
        severity: sev,
        severityLabel: sev === 'K' ? 'Kritik / Major' : (sev === 'O' ? 'Orta / İzlem' : 'Hafif'),
        title: rule.t,
        message: rule.u,
        drugA: drugA.brand,
        drugB: drugB.brand,
        atcA: atc1,
        atcB: atc2,
        genericA: drugA.generic || rule.g1,
        genericB: drugB.generic || rule.g2
      };
    }
  }

  // 2. O(1) DDInter 2.0 Major (K) ve Moderate (O) kontrolü
  const i1 = atcToIdx.get(atc1);
  const i2 = atcToIdx.get(atc2);
  if (i1 === undefined || i2 === undefined || i1 === i2) return null;

  const lo = Math.min(i1, i2);
  const hi = Math.max(i1, i2);
  const trNameA = cachedMatrix.names[i1] || drugA.generic || atc1;
  const trNameB = cachedMatrix.names[i2] || drugB.generic || atc2;

  if (majorSets.get(lo)?.has(hi)) {
    return {
      id: `DDI:K:${pairCanonicalKey(atc1, atc2)}`,
      source: 'DDINTER',
      severity: 'K',
      severityLabel: 'DDInter 2.0 Major',
      title: `Major İlaç Etkileşimi: ${trNameA} + ${trNameB}`,
      message: `${trNameA} (${drugA.brand}) ve ${trNameB} (${drugB.brand}) arasında ciddi (Major) etkileşim bildirilmiştir. Alternatif ajan değerlendirilmeli veya yakın klinik/laboratuvar izlemi yapılmalıdır.`,
      drugA: drugA.brand,
      drugB: drugB.brand,
      atcA: atc1,
      atcB: atc2,
      genericA: trNameA,
      genericB: trNameB
    };
  }

  if (moderateSets.get(lo)?.has(hi)) {
    return {
      id: `DDI:O:${pairCanonicalKey(atc1, atc2)}`,
      source: 'DDINTER',
      severity: 'O',
      severityLabel: 'DDInter 2.0 Orta',
      title: `Orta Düzey Etkileşim: ${trNameA} + ${trNameB}`,
      message: `${trNameA} + ${trNameB} eşzamanlı kullanımında klinik etkinlik veya yan etki profili değişebilir; izlem ve gerekirse doz/zamanlama uyarlaması önerilir.`,
      drugA: drugA.brand,
      drugB: drugB.brand,
      atcA: atc1,
      atcB: atc2,
      genericA: trNameA,
      genericB: trNameB
    };
  }

  return null;
}

/**
 * Terapötik Duplikasyon Tespiti (Aynı etken madde veya aynı farmakolojik duplikasyon sınıfı)
 */
export function detectTherapeuticDuplications(drugs: DdiDrugRef[]): TherapeuticDuplicationAlert[] {
  if (!Array.isArray(drugs) || drugs.length < 2) return [];

  const normalized = drugs
    .map(d => ({
      brand: String(d.brand || d.name || 'İlaç').trim(),
      atc: String(d.atcCode || d.atc || '').trim().toUpperCase(),
      generic: String(d.generic || '').trim()
    }))
    .filter(d => d.atc.length >= 5);

  if (normalized.length < 2) return [];

  const alerts: TherapeuticDuplicationAlert[] = [];
  const seenKeys = new Set<string>();

  // 1. Birebir aynı ATC-5 (aynı etken maddeli iki farklı marka)
  const byAtc = new Map<string, Array<{ brand: string; atc: string; generic: string }>>();
  for (const d of normalized) {
    const arr = byAtc.get(d.atc) || [];
    arr.push(d);
    byAtc.set(d.atc, arr);
  }
  for (const [atc, list] of byAtc.entries()) {
    if (list.length >= 2) {
      const idx = atcToIdx.get(atc);
      const label = (idx !== undefined && cachedMatrix?.names[idx]) || list[0].generic || atc;
      alerts.push({
        groupKey: `ATC:${atc}`,
        groupLabelTr: `Aynı Etken Madde Tekrarı: ${label} (${atc})`,
        drugs: list,
        isExactIngredient: true
      });
      seenKeys.add(`ATC:${atc}`);
    }
  }

  // 2. DDInter / Klinik Terapötik Duplikasyon Grubu (502 ATC)
  if (cachedMatrix?.dup) {
    const byDupGroup = new Map<string, Array<{ brand: string; atc: string; generic: string }>>();
    for (const d of normalized) {
      const groups = cachedMatrix.dup[d.atc];
      if (!groups) continue;
      for (const g of groups) {
        const gKey = g.toLowerCase();
        const arr = byDupGroup.get(gKey) || [];
        if (!arr.some(item => item.brand === d.brand)) {
          arr.push(d);
        }
        byDupGroup.set(gKey, arr);
      }
    }

    for (const [gKey, list] of byDupGroup.entries()) {
      const distinctAtcs = new Set(list.map(x => x.atc));
      if (distinctAtcs.size >= 2 && !seenKeys.has(`DUP:${gKey}`)) {
        alerts.push({
          groupKey: `DUP:${gKey}`,
          groupLabelTr: translateDupGroup(gKey),
          drugs: list,
          isExactIngredient: false
        });
        seenKeys.add(`DUP:${gKey}`);
      }
    }
  }

  // 3. ATC-4 Sınıf Bazlı Terapötik Duplikasyon Koruması (Türkiye/AB etken maddeleri dahil: Deksketoprofen, Flurbiprofen vb.)
  const ATC_CLASS_DUP_RULES: Array<{ key: string; labelTr: string; prefixes: string[] }> = [
    { key: 'NSAID_SYS', labelTr: 'Çift Sistemik NSAİİ Kullanımı (GİS Kanama & ABH Riski)', prefixes: ['M01AB', 'M01AC', 'M01AE', 'M01AG', 'M01AH', 'M01AX'] },
    { key: 'PPI', labelTr: 'Çift Proton Pompa İnhibitörü (PPI)', prefixes: ['A02BC'] },
    { key: 'ACEI', labelTr: 'Çift ACE İnhibitörü', prefixes: ['C09AA'] },
    { key: 'ARB', labelTr: 'Çift Anjiyotensin Reseptör Blokeri (ARB)', prefixes: ['C09CA'] },
    { key: 'STATIN', labelTr: 'Çift Statin (HMG-CoA Redüktaz İnhibitörü)', prefixes: ['C10AA'] },
    { key: 'SSRI', labelTr: 'Çift SSRI Antidepresan (Serotonin Sendromu Riski)', prefixes: ['N06AB'] },
    { key: 'BZD', labelTr: 'Çift Benzodiazepin (Aşırı Sedasyon & Solunum Depresyonu)', prefixes: ['N05BA', 'N05CD'] }
  ];

  const alreadyGroupedAtcs = new Set<string>();
  for (const al of alerts) {
    if (!al.isExactIngredient) {
      al.drugs.forEach(x => alreadyGroupedAtcs.add(x.atc));
    }
  }

  for (const rule of ATC_CLASS_DUP_RULES) {
    const matched = normalized.filter(d => rule.prefixes.some(p => d.atc.startsWith(p)));
    const distinctAtcs = new Set(matched.map(x => x.atc));
    if (distinctAtcs.size >= 2) {
      const allAlreadyReported = Array.from(distinctAtcs).every(a => alreadyGroupedAtcs.has(a));
      if (!allAlreadyReported && !seenKeys.has(`ATC4:${rule.key}`)) {
        alerts.push({
          groupKey: `ATC4:${rule.key}`,
          groupLabelTr: rule.labelTr,
          drugs: matched,
          isExactIngredient: false
        });
        seenKeys.add(`ATC4:${rule.key}`);
      }
    }
  }

  return alerts;
}

const CRITICAL_EXCIPIENT_NOTES: Record<string, string> = {
  'Benzil Alkol': 'Yenidoğan ve prematürelerde "Gasping Sendromu" riski nedeniyle kontrendike/dikkatli olunmalıdır.',
  'Propilen Glikol': 'Yenidoğan ve bebeklerde yüksek dozlarda hiperozmolarite ve laktik asidoz riski oluşturabilir.',
  'Etanol / Alkol': 'Pediatrik, gebe, karaciğer hastalığı veya disülfiram/metronidazol kullananlarda dikkat gerektirir.',
  'Aspartam / Fenilalanin': 'Fenilketonüri (PKU) hastalarında kullanılmamalıdır.',
  'Gluten / Buğday Nişastası': 'Çölyak hastalığı / buğday alerjisi olanlarda dikkat edilmelidir.',
  'Soya / Yer Fıstığı': 'Yer fıstığı veya soya alerjisinde anafilaksi riski nedeniyle kontrendike olabilir.',
  'Sülfit / Metabisülfit': 'Astımlı hastalarda bronkospazm ve aşırı duyarlılık reaksiyonu tetikleyebilir.',
  Laktoz: 'Nadir kalıtımsal galaktoz intoleransı / laktaz yetmezliğinde göz önünde bulundurulmalıdır.'
};

/**
 * Seçili reçetedeki tüm ilaçlar için Besin, Aç/Tok, Araç Riski ve Kritik Eksipiyan danışmanlık özeti
 */
export function getPrescriptionFoodAndUsageSummary(
  drugs: DdiDrugRef[],
  opts?: { isPediatricOrNeonate?: boolean }
): PrescriptionCounselingSummary {
  const foodMap = new Map<string, PrescriptionFoodItem>();
  const mealTimings: Array<{ drug: string; timing: string }> = [];
  const drivingWarnings: Array<{ drug: string; risk: string; isHigh: boolean }> = [];
  const excMap = new Map<string, Set<string>>();

  const sevRank = (s: 'K' | 'O' | 'H') => (s === 'K' ? 3 : (s === 'O' ? 2 : 1));

  for (const d of drugs || []) {
    const brand = String(d.brand || d.name || 'İlaç').trim();
    const atc = String(d.atcCode || d.atc || '').trim().toUpperCase();
    const route = inferDrugRoute({
      route: d.route as string | undefined,
      brand,
      name: d.name,
      atcCode: atc
    });

    // 1. Besin Etkileşimleri (O(1) foodQuick haritasından + Uygulama yolu filtresi)
    if (atc && cachedMatrix?.foodQuick?.[atc]) {
      for (const [rawFood, sev] of cachedMatrix.foodQuick[atc]) {
        const entry = translateFoodEntry(rawFood);
        if (shouldSuppressFoodWarningForRoute(entry.key, route)) continue;
        const existing = foodMap.get(entry.key);
        if (existing) {
          if (!existing.drugs.includes(brand)) existing.drugs.push(brand);
          if (sevRank(sev) > sevRank(existing.severity)) existing.severity = sev;
        } else {
          foodMap.set(entry.key, {
            foodKey: entry.key,
            foodLabelTr: entry.labelTr,
            severity: sev,
            shortGuidanceTr: entry.shortGuidanceTr,
            drugs: [brand]
          });
        }
      }
    }

    // 2. Aç / Tok kullanımı (Parenteral IV/IM/SC ve topikal/oftalmik formlarda bastırılır)
    if (
      isMealTimingApplicableForRoute(route) &&
      d.mealTiming &&
      d.mealTimingCode &&
      (d.mealTimingCode === 1 || d.mealTimingCode === 2)
    ) {
      mealTimings.push({ drug: brand, timing: d.mealTiming });
    }

    // 3. Araç / Makine riski (sadece Dikkat [3] veya Yüksek Risk [4])
    if (d.drivingRiskCode && d.drivingRiskCode >= 3 && d.drivingRisk) {
      drivingWarnings.push({
        drug: brand,
        risk: d.drivingRisk,
        isHigh: d.drivingRiskCode === 4
      });
    }

    // 4. Kritik Alerjen / Eksipiyanlar (yalnızca klinik açıdan aksiyon gerektirenler)
    if (Array.isArray(d.allergens)) {
      for (const alg of d.allergens) {
        if (!CRITICAL_EXCIPIENT_NOTES[alg]) continue;
        // Laktoz her tablette sık olduğundan sadece diğer kritik eksipiyanları veya pediatrik/yenidoğan risklerini öne çıkar
        if (alg === 'Laktoz' && !opts?.isPediatricOrNeonate) continue;
        if (!excMap.has(alg)) excMap.set(alg, new Set());
        excMap.get(alg)!.add(brand);
      }
    }
  }

  const foods = Array.from(foodMap.values()).sort((a, b) => sevRank(b.severity) - sevRank(a.severity));
  const criticalExcipients = Array.from(excMap.entries()).map(([excipient, set]) => ({
    excipient,
    drugs: Array.from(set),
    note: CRITICAL_EXCIPIENT_NOTES[excipient] || ''
  }));

  return {
    foods,
    mealTimings,
    drivingWarnings,
    criticalExcipients,
    totalSignals: foods.length + mealTimings.length + drivingWarnings.length + criticalExcipients.length
  };
}

/**
 * Tam Reçete DDI + Duplikasyon + Besin/Kullanım Değerlendirmesi
 * existingCoveredAtcPairs: interactionTierEngine tarafından zaten raporlanan "ATC1:ATC2" çiftleri (tekilleştirme)
 */
export function evaluateDdiMatrixForPrescription(
  drugs: DdiDrugRef[],
  options?: {
    existingCoveredPairs?: Set<string>;
    isPediatricOrNeonate?: boolean;
  }
): DdiMatrixEvaluationResult {
  const curatedAlerts: DdiMatrixAlert[] = [];
  const majorAlerts: DdiMatrixAlert[] = [];
  const moderateAlerts: DdiMatrixAlert[] = [];

  const counseling = getPrescriptionFoodAndUsageSummary(drugs, {
    isPediatricOrNeonate: options?.isPediatricOrNeonate
  });
  const duplications = detectTherapeuticDuplications(drugs);

  if (!cachedMatrix || !Array.isArray(drugs) || drugs.length < 2) {
    return {
      curatedAlerts,
      majorAlerts,
      moderateAlerts,
      duplications,
      counseling,
      totalInteractionCount: 0
    };
  }

  const valid = drugs
    .map(d => ({
      brand: String(d.brand || d.name || 'İlaç').trim(),
      atc: String(d.atcCode || d.atc || '').trim().toUpperCase(),
      generic: String(d.generic || '').trim(),
      route: d.route
    }))
    .filter(d => d.atc.length >= 3 && d.atc !== 'BELIRTILMEDI' && d.atc !== 'BELİRTİLMEDİ');

  const seenPairs = new Set<string>(options?.existingCoveredPairs || []);

  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i];
      const b = valid[j];
      if (a.atc === b.atc) continue;

      const pKey = pairCanonicalKey(a.atc, b.atc);
      if (seenPairs.has(pKey)) continue;

      const hit = checkAtcPairInteraction(a, b);
      if (!hit) continue;
      seenPairs.add(pKey);

      if (hit.source === 'CURATED') {
        curatedAlerts.push(hit);
      } else if (hit.severity === 'K') {
        majorAlerts.push(hit);
      } else {
        moderateAlerts.push(hit);
      }
    }
  }

  return {
    curatedAlerts,
    majorAlerts,
    moderateAlerts,
    duplications,
    counseling,
    totalInteractionCount: curatedAlerts.length + majorAlerts.length + moderateAlerts.length
  };
}

/**
 * Tek bir ilacın aktif reçetedeki diğer ilaçlarla etkileşimlerini kontrol eder (Monograf Etkileşimler sekmesi için)
 */
export function checkSingleDrugAgainstPrescription(
  candidate: { brand?: string; atc?: string; atcCode?: string; generic?: string; route?: DrugRouteCode | string },
  prescriptionDrugs: DdiDrugRef[]
): DdiMatrixAlert[] {
  if (!cachedMatrix || !candidate || !Array.isArray(prescriptionDrugs) || prescriptionDrugs.length === 0) {
    return [];
  }
  const candAtc = String(candidate.atcCode || candidate.atc || '').trim().toUpperCase();
  if (!candAtc) return [];

  const candRef = {
    brand: String(candidate.brand || 'Seçili İlaç').trim(),
    atc: candAtc,
    generic: String(candidate.generic || '').trim(),
    route: candidate.route
  };

  const alerts: DdiMatrixAlert[] = [];
  const seen = new Set<string>();

  for (const rxDrug of prescriptionDrugs) {
    const rxAtc = String(rxDrug.atcCode || rxDrug.atc || '').trim().toUpperCase();
    if (!rxAtc || rxAtc === candAtc) continue;
    const pKey = pairCanonicalKey(candAtc, rxAtc);
    if (seen.has(pKey)) continue;

    const hit = checkAtcPairInteraction(candRef, {
      brand: String(rxDrug.brand || rxDrug.name || 'Reçete İlacı').trim(),
      atc: rxAtc,
      generic: String(rxDrug.generic || '').trim(),
      route: rxDrug.route
    });
    if (hit) {
      seen.add(pKey);
      alerts.push(hit);
    }
  }

  // Major/Küratörlü önce
  const rank = (a: DdiMatrixAlert) => (a.severity === 'K' ? 3 : (a.source === 'CURATED' ? 2 : 1));
  return alerts.sort((a, b) => rank(b) - rank(a));
}
