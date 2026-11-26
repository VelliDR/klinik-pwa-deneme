/**
 * UYGULAMA YOLU (ROUTE OF ADMINISTRATION) ÇIKARIM VE BAĞLAMSAL FİLTRE MOTORU
 *
 * Referanslar:
 * - Bailey DG, Dresser G, Arnold JMO. Grapefruit-medication interactions. CMAJ 2013;185(4):309-316.
 *   (IV/IM/SC formlar gastrointestinal kanal ve enterosit CYP3A4 ilk-geçiş metabolizmasını atlar.)
 * - Tilson H et al. Recommendations for selecting DDIs for CDS. AJHP 2016;73(8):576-585.
 *   (İnhale/intra-artiküler kortikosteroidler güçlü CYP3A4 inhibitörleriyle sistemik Cushing oluşturabilir;
 *    transdermal selejilin oral MAO-A profilinden ayrılır.)
 */

export type DrugRouteCode =
  | 'ORAL'
  | 'ENTERAL'
  | 'IV'
  | 'IM'
  | 'SC'
  | 'IA'
  | 'EPIDURAL'
  | 'INTRALESIONAL'
  | 'PARENTERAL'
  | 'INH'
  | 'TOP'
  | 'OPH'
  | 'OTIC'
  | 'NASAL'
  | 'RECT'
  | 'VAG'
  | 'TD'
  | 'SL'
  | 'UNKNOWN';

export type CompactRouteCode =
  | 'O'
  | 'ENT'
  | 'IV'
  | 'IM'
  | 'SC'
  | 'IA'
  | 'EPI'
  | 'IL'
  | 'P'
  | 'IH'
  | 'T'
  | 'OP'
  | 'OT'
  | 'N'
  | 'R'
  | 'V'
  | 'TD'
  | 'SL';

export const COMPACT_TO_ROUTE: Record<string, DrugRouteCode> = {
  O: 'ORAL',
  ORAL: 'ORAL',
  ENT: 'ENTERAL',
  ENTERAL: 'ENTERAL',
  IV: 'IV',
  INTRAVENOUS: 'IV',
  IM: 'IM',
  INTRAMUSCULAR: 'IM',
  SC: 'SC',
  SUBCUTANEOUS: 'SC',
  IA: 'IA',
  INTRAARTICULAR: 'IA',
  'INTRA-ARTICULAR': 'IA',
  EPI: 'EPIDURAL',
  EPIDURAL: 'EPIDURAL',
  IL: 'INTRALESIONAL',
  INTRALESIONAL: 'INTRALESIONAL',
  P: 'PARENTERAL',
  PARENTERAL: 'PARENTERAL',
  IH: 'INH',
  INH: 'INH',
  INHAL: 'INH',
  INHALED: 'INH',
  T: 'TOP',
  TOP: 'TOP',
  TOPICAL: 'TOP',
  OP: 'OPH',
  OPH: 'OPH',
  OPHTHALMIC: 'OPH',
  OT: 'OTIC',
  OTIC: 'OTIC',
  N: 'NASAL',
  NASAL: 'NASAL',
  INTRANASAL: 'NASAL',
  R: 'RECT',
  RECT: 'RECT',
  RECTAL: 'RECT',
  V: 'VAG',
  VAG: 'VAG',
  VAGINAL: 'VAG',
  TD: 'TD',
  TRANSDERMAL: 'TD',
  SL: 'SL',
  SUBLINGUAL: 'SL'
};

export const ROUTE_LABELS_TR: Record<DrugRouteCode, string> = {
  ORAL: 'Oral',
  ENTERAL: 'Enteral',
  IV: 'İntravenöz (IV)',
  IM: 'İntramüsküler (IM)',
  SC: 'Subkutan (SC)',
  IA: 'İntra-artiküler (Eklem İçi)',
  EPIDURAL: 'Epidural',
  INTRALESIONAL: 'İntralezyonel',
  PARENTERAL: 'Parenteral (IV/IM/SC)',
  INH: 'İnhalasyon',
  TOP: 'Topikal / Dermal',
  OPH: 'Oftalmik (Göz)',
  OTIC: 'Otik (Kulak)',
  NASAL: 'Nazal (Burun)',
  RECT: 'Rektal',
  VAG: 'Vajinal',
  TD: 'Transdermal',
  SL: 'Sublingual / Oromukozal',
  UNKNOWN: 'Belirtilmedi'
};

function normTr(raw: unknown): string {
  return String(raw || '')
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

export function decodeRouteCode(raw?: string | null): DrugRouteCode {
  if (!raw) return 'UNKNOWN';
  const key = String(raw).trim().toUpperCase();
  return COMPACT_TO_ROUTE[key] || 'UNKNOWN';
}

export function encodeRouteCode(route: DrugRouteCode): CompactRouteCode | '' {
  switch (route) {
    case 'ORAL': return 'O';
    case 'ENTERAL': return 'ENT';
    case 'IV': return 'IV';
    case 'IM': return 'IM';
    case 'SC': return 'SC';
    case 'IA': return 'IA';
    case 'EPIDURAL': return 'EPI';
    case 'INTRALESIONAL': return 'IL';
    case 'PARENTERAL': return 'P';
    case 'INH': return 'IH';
    case 'TOP': return 'T';
    case 'OPH': return 'OP';
    case 'OTIC': return 'OT';
    case 'NASAL': return 'N';
    case 'RECT': return 'R';
    case 'VAG': return 'V';
    case 'TD': return 'TD';
    case 'SL': return 'SL';
    default: return '';
  }
}

/**
 * TİTCK müstahzar adı, KÜB Bölüm 3 (Farmasötik Form), WHO rota kodu ve ATC öneklerinden
 * deterministik uygulama yolu (route) çıkarır.
 */
export function inferDrugRoute(input: {
  route?: string | null;
  brand?: string | null;
  name?: string | null;
  form?: string | null;
  kubFormText?: string | null;
  atcCode?: string | null;
  atc?: string | null;
}): DrugRouteCode {
  const explicit = decodeRouteCode(input.route);
  if (explicit !== 'UNKNOWN') return explicit;

  const text = normTr(`${input.brand || ''} ${input.name || ''} ${input.form || ''} ${input.kubFormText || ''}`);
  const atc = String(input.atcCode || input.atc || '').trim().toUpperCase();

  // 1. Göz / Kulak / Burun / Vajinal / Rektal / Transdermal (spesifik lokal yollar önce)
  if (/\b(goz\s+damla\w*|goz\s+pomad\w*|goz\s+jel\w*|goz\s+merhem\w*|oftalmik|ophthalmic|intravitreal|goz\s+ici)\b/.test(text) || atc.startsWith('S01')) {
    return 'OPH';
  }
  if (/\b(kulak\s+damla\w*|otik|otic)\b/.test(text) || atc.startsWith('S02')) {
    return 'OTIC';
  }
  if (/\b(burun\s+sprey\w*|burun\s+damla\w*|nazal\s+sprey\w*|nazal\s+damla\w*|nazal\s+merhem\w*|intranazal)\b/.test(text)) {
    return 'NASAL';
  }
  if (/\b(transdermal|flaster|\btts\b|cilt\s+bandi|flasteri)\b/.test(text)) {
    return 'TD';
  }
  if (/\b(vajinal|ovul|peser|intravajinal)\b/.test(text)) {
    return 'VAG';
  }
  if (/\b(rektal|supozituvar|suppozituvar|fitil|lavman|enema)\b/.test(text)) {
    return 'RECT';
  }

  // 2. İnhalasyon (inhalasyon anestezikleri ve solunum inhalerleri dahil)
  if (/\b(inhalasyon|inhaler|nebul|nebül|aerosol|diskus|turbuhaler|ellipta|handihaler|respimat|volatil|kuru\s+toz\s+inhal)\b/.test(text)) {
    return 'INH';
  }

  // 3. Sublingual / Oromukozal / Bukkal
  if (/\b(dil\s+alti|dilalti|sublingual|oromukozal|bukkal|pastil|nitrolingual)\b/.test(text)) {
    return 'SL';
  }

  // 3b. Eklem içi / Epidural / İntralezyonel depo enjeksiyonlar (sistemik CYP3A4 Cushing istisnası için ayrı tutulur)
  if (/\b(intra-?artikuler|eklem\s+ici|intraarticular)\b/.test(text)) {
    return 'IA';
  }
  if (/\b(epidural)\b/.test(text)) {
    return 'EPIDURAL';
  }
  if (/\b(intralezyonel|intralesional)\b/.test(text)) {
    return 'INTRALESIONAL';
  }

  // 4. Parenteral (IV / IM / SC ayrımı)
  const hasIv = /\b(i\.?\s*v\.?|intravenoz|infuzyon|infüzyon|perfuzyon|perfüzyon)\b/.test(text);
  const hasIm = /\b(i\.?\s*m\.?|intramuskuler|intramusküler)\b/.test(text);
  const hasSc = /\b(s\.?\s*c\.?|subkutan|subkütan|kalem|pen|solostar|flexpen|kwikpen|optiset|autoinjector|otoenjektor)\b/.test(text);
  const hasGenericInj = /\b(ampul|flakon|enjeksiyon|enjektabl|enj\.|liyofilize|hazir\s+siringa|dolu\s+enjektor|pre-?filled)\b/.test(text);

  if (hasIv && !hasIm && !hasSc) return 'IV';
  if (hasSc && !hasIv && !hasIm) return 'SC';
  if (hasIm && !hasIv && !hasSc) return 'IM';
  if (hasIv || hasIm || hasSc || hasGenericInj) return 'PARENTERAL';

  // 5. Topikal / Dermal / Gargara
  if (/\b(krem|merhem|pomad|losyon|sampuan|topikal|kutan|deri\s+sprey|gargara|agiz\s+sprey|agiz\s+calkalama|jel)\b/.test(text) && !/\b(oral|tablet|kapsul|yumusak\s+jelatin)\b/.test(text)) {
    return 'TOP';
  }

  // 6. Oral formlar
  if (/\b(tablet|film\s+kapli|kapsul|surup|suspansiyon|oral\s+damla|oral\s+cozelti|oral\s+toz|sase|draje|efervesan|cigneme|granul|damla)\b/.test(text)) {
    return 'ORAL';
  }

  // 7. ATC-bazlı fallback (yalnızca kesin dermatolojik veya IV anestezik/NMBA sınıfları)
  if (atc.startsWith('N01AX') || atc.startsWith('M03AC') || atc.startsWith('M03AB')) return 'IV';
  if (atc.startsWith('N01AB')) return 'INH';
  if (atc.startsWith('D01A') || atc.startsWith('D06') || atc.startsWith('D07') || atc.startsWith('D08')) return 'TOP';

  return 'UNKNOWN';
}

export function isParenteralRoute(route?: DrugRouteCode | string | null): boolean {
  const r = decodeRouteCode(route as string);
  return r === 'IV' || r === 'IM' || r === 'SC' || r === 'IA' || r === 'EPIDURAL' || r === 'INTRALESIONAL' || r === 'PARENTERAL';
}

export function isLocalNonSystemicRoute(route?: DrugRouteCode | string | null): boolean {
  const r = decodeRouteCode(route as string);
  return r === 'TOP' || r === 'OPH' || r === 'OTIC' || r === 'NASAL';
}

export function isSystemicRoute(route?: DrugRouteCode | string | null): boolean {
  const r = decodeRouteCode(route as string);
  return !isLocalNonSystemicRoute(r);
}

export function isOralOrEnteralRoute(route?: DrugRouteCode | string | null): boolean {
  const r = decodeRouteCode(route as string);
  return r === 'ORAL' || r === 'ENTERAL' || r === 'SL' || r === 'UNKNOWN';
}

/**
 * GI emilim veya bağırsak duvarı (enterosit) CYP3A4 ilk-geçiş metabolizması gerektiren besin anahtarları.
 * Bailey et al. (CMAJ 2013): IV/IM/SC parenteral uygulamalar bağırsak ilk-geçişini atladığından bastırılır.
 */
const GI_AND_GUT_CYP3A4_FOOD_KEYS = new Set<string>([
  'grapefruit juice',
  'pomegranates',
  'food',
  'high-fat foods',
  'dairy products',
  'orange juice',
  'dietary fiber',
  'high-fiber meal',
  'grain',
  'bran',
  'cereal',
  'soybean',
  'rhubarb',
  'cola',
  'green tea'
]);

/**
 * Belirli bir besin etkileşimi anahtarının verilen uygulama yolunda bastırılıp bastırılmayacağını belirler.
 */
export function shouldSuppressFoodWarningForRoute(foodKey: string, route: DrugRouteCode): boolean {
  if (isLocalNonSystemicRoute(route)) {
    // Topikal / Göz / Kulak / Nazal formlarda oral besin/greyfurt/alkol uyarılarını bastır
    return true;
  }
  if (isParenteralRoute(route) || route === 'INH' || route === 'TD' || route === 'RECT' || route === 'VAG') {
    // Parenteral ve non-oral formlarda GI emilim & bağırsak duvarı CYP3A4 (greyfurt, süt şelasyonu, öğün) bastırılır;
    // ancak alkol, potasyum, K vitamini, tiramin, kafein, sigara gibi sistemik uyarılar korunur.
    return GI_AND_GUT_CYP3A4_FOOD_KEYS.has(String(foodKey || '').trim().toLowerCase());
  }
  return false;
}

/**
 * Aç/Tok kullanım bilgisinin verilen uygulama yolunda geçerli olup olmadığını döner.
 */
export function isMealTimingApplicableForRoute(route: DrugRouteCode): boolean {
  return route === 'ORAL' || route === 'SL' || route === 'UNKNOWN';
}
