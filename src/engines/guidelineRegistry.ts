/**
 * KLİNİK KILAVUZ & BİRİNCİL REFERANS KAYIT DEFTERİ (GUIDELINE REGISTRY)
 *
 * Her klinik modülün dayandığı birincil kılavuz yılını ve orijinal akademik kaynağını
 * tek bir merkezi sözlükte tutar ve arayüzdeki ilgili kartların alt bilgi şeridine
 * sade, göz yormayan bir referans satırı olarak enjekte eder.
 */

export interface ModuleGuidelineMeta {
  cardId: string;
  moduleName: string;
  primaryGuideline: string;
  guidelineYear: string;
  primaryCitation: string;
  scopeNote?: string;
}

export const MODULE_GUIDELINE_REGISTRY: Record<string, ModuleGuidelineMeta> = {
  'card-demografi': {
    cardId: 'card-demografi',
    moduleName: 'Demografi & Gestasyonel Yaş',
    primaryGuideline: 'AAP Prematüre Düzeltilmiş Yaş & WHO Yaş Gruplaması',
    guidelineYear: '2022',
    primaryCitation: 'Engle WA / AAP Committee on Fetus and Newborn (Pediatrics); WHO Age Stratification'
  },
  'card-biyometri': {
    cardId: 'card-biyometri',
    moduleName: 'Biyometri, BSA, eGFR & Persentil',
    primaryGuideline: 'KDIGO 2024 CKD • 2021 CKD-EPI • Bedside Schwartz • WHO LMS & Neyzi 2015',
    guidelineYear: '2024',
    primaryCitation: 'KDIGO CKD Work Group (Kidney Int 2024); Inker LA (NEJM 2021); Schwartz GJ (JASN 2009); Neyzi O et al. (J Clin Res Pediatr Endocrinol 2015)'
  },
  'card-vitaller': {
    cardId: 'card-vitaller',
    moduleName: 'Vital Bulgular & Triyaj',
    primaryGuideline: 'RCP NEWS2 • PEWS • AAP 2017 Pediatrik Hipertansiyon',
    guidelineYear: '2017 / 2020',
    primaryCitation: 'Royal College of Physicians NEWS2 (2017); Flynn JT et al., AAP Clinical Practice Guideline (Pediatrics 2017)'
  },
  'card-gcs': {
    cardId: 'card-gcs',
    moduleName: 'Bilinç & Glasgow Koma Skalası',
    primaryGuideline: 'Teasdale & Jennett GCS / Pediatrik pGCS',
    guidelineYear: '1974 / 2014',
    primaryCitation: 'Teasdale G, Jennett B (Lancet 1974); Teasdale G et al. (Lancet Neurol 2014)'
  },
  'card-kardiyo': {
    cardId: 'card-kardiyo',
    moduleName: 'Kardiyoloji & EKG Analizi',
    primaryGuideline: 'AHA/ACC/HRS EKG Standardizasyonu • Fridericia • Bogossian • Tisdale',
    guidelineYear: '2013 / 2020',
    primaryCitation: 'Bazett HC (1920); Fridericia LS (1920); Bogossian H et al. (Heart Rhythm 2014); Tisdale JE et al. (Circ Cardiovasc Qual Outcomes 2013)'
  },
  'card-tromboz': {
    cardId: 'card-tromboz',
    moduleName: 'Tromboemboli & Kardiyak Acil',
    primaryGuideline: 'ESC 2019/2024 • Wells DVT/PE • PERC • HEART • CHA₂DS₂-VASc • HAS-BLED',
    guidelineYear: '2019–2024',
    primaryCitation: 'Wells PS (Lancet 1997; NEJM 2003); Kline JA PERC (JTH 2004); Six AJ HEART (Neth Heart J 2008); Lip GYH (Chest 2010)'
  },
  'card-cerrahi': {
    cardId: 'card-cerrahi',
    moduleName: 'Genel Cerrahi, Sınıflandırma & Yanık',
    primaryGuideline: 'WSES 2020/2021 • TG18 • Revize Atlanta 2012 • EHS 2007/2009 • AJCC 8 • AAST 2018 • ATLS-10',
    guidelineYear: '2018–2024',
    primaryCitation: 'Di Saverio S WSES (2020); Yokoe M TG18 (2018); Banks PA Atlanta (Gut 2013); Kozar RA AAST (J Trauma 2018); ATLS 10th Ed.'
  },
  'card-obgyn': {
    cardId: 'card-obgyn',
    moduleName: 'Kadın Doğum & Obstetrik',
    primaryGuideline: 'ACOG Gebelik & Preeklampsi Kılavuzu • Naegele • Bishop (1964)',
    guidelineYear: '2020',
    primaryCitation: 'ACOG Practice Bulletin No. 222 Gestational Hypertension and Preeclampsia (Obstet Gynecol 2020); Bishop EH (Obstet Gynecol 1964)'
  },
  'card-endokrin': {
    cardId: 'card-endokrin',
    moduleName: 'Endokrinoloji & Metabolizma',
    primaryGuideline: 'Glukokortikoid Eşdeğerlik Tabloları • Matthews HOMA-IR',
    guidelineYear: '1985 / 2023',
    primaryCitation: 'Matthews DR et al. (Diabetologia 1985); Goodman & Gilman / UpToDate Glucocorticoid Equivalency'
  },
  'card-kangazi': {
    cardId: 'card-kangazi',
    moduleName: 'Kan Gazı & Asit-Baz Analizi',
    primaryGuideline: 'Boston (Winter) • Kopenhag (Siggaard-Andersen SBE) • Stewart-Fencl • Berlin ARDS',
    guidelineYear: '2012 / 2020',
    primaryCitation: 'Kassirer JP & Bleich HL (NEJM 1965); Figge J et al. (Crit Care Med 1998); Stewart PA (1983); ARDS Definition Task Force (JAMA 2012)'
  },
  'card-idame': {
    cardId: 'card-idame',
    moduleName: 'İdame Sıvı Tedavisi',
    primaryGuideline: 'NICE CG174 • AAP 2018 Pediatrik İdame Sıvı • Holliday-Segar • TND Yenidoğan',
    guidelineYear: '2017–2024',
    primaryCitation: 'Holliday MA & Segar WE (Pediatrics 1957); Feld LG et al. AAP (Pediatrics 2018); NICE CG174; Türk Neonatoloji Derneği'
  },
  'card-elektrolit': {
    cardId: 'card-elektrolit',
    moduleName: 'Sıvı-Elektrolit & Kalsiyum',
    primaryGuideline: 'Adrogué-Madias Sodyum Denklemi • Payne Düzeltilmiş Kalsiyum',
    guidelineYear: '2000 / 2014',
    primaryCitation: 'Adrogué HJ & Madias NE (NEJM 2000); Spasovski G et al. European Hyponatraemia Guideline (Eur J Endocrinol 2014); Payne RB (BMJ 1973)'
  },
  'card-infuzyon': {
    cardId: 'card-infuzyon',
    moduleName: 'İnfüzyon Hızı & GIR',
    primaryGuideline: 'Klinik Perfüzör Standartları • Yenidoğan Glukoz İnfüzyon Hızı (TND/AAP)',
    guidelineYear: '2022',
    primaryCitation: 'Türk Neonatoloji Derneği Hipoglisemi Rehberi; Standart Farmakokinetik İnfüzyon Hesabı'
  },
  'card-nefro': {
    cardId: 'card-nefro',
    moduleName: 'Nefroloji, Toksikoloji & Enfeksiyon',
    primaryGuideline: 'FENa/FEUrea • Katz/Hillier Na • Rumack-Matthew NAC • BTS CURB-65',
    guidelineYear: '2003–2023',
    primaryCitation: 'Lim WS CURB-65 (Thorax 2003); Carvounis CP FEUrea (Kidney Int 2002); Rumack BH & Matthew H (Pediatrics 1975); Katz MA (NEJM 1973)'
  },
  'card-neonatoloji': {
    cardId: 'card-neonatoloji',
    moduleName: 'Yenidoğan, Hiperbilirubinemi & Akut Pediatri',
    primaryGuideline: 'AAP 2022 Hiperbilirubinemi • TND 2014 • Maisels 2012 • APGAR • Westley • CDS',
    guidelineYear: '2022',
    primaryCitation: 'Kemper AR et al. AAP Hyperbilirubinemia Guideline (Pediatrics 2022); Maisels MJ (J Perinatol 2012); Westley CR (AJDC 1978); Friedman JN CDS (J Pediatr 2008)'
  },
  'card-pediatri-surup': {
    cardId: 'card-pediatri-surup',
    moduleName: 'Pediatrik Şurup Dozlama & GBP Bağışıklama',
    primaryGuideline: 'BNFc • TİTCK KÜB • Pediatrik Obezite IBW/AdjBW • T.C. Sağlık Bakanlığı GBP 2025/2026',
    guidelineYear: '2025–2026',
    primaryCitation: 'BNF for Children; TİTCK Resmi KÜB; T.C. Sağlık Bakanlığı Genişletilmiş Bağışıklama Programı (GBP 2025/2026)'
  },
  'card-antibiyotik': {
    cardId: 'card-antibiyotik',
    moduleName: 'Akılcı Antibiyotik & Farenjit Skorlaması',
    primaryGuideline: 'Centor / McIsaac Farenjit Skoru & IDSA GAS Kılavuzu',
    guidelineYear: '1998 / 2012',
    primaryCitation: 'McIsaac WJ et al. (CMAJ 1998); Shulman ST et al. IDSA Pharyngitis Guideline (Clin Infect Dis 2012)'
  },
  'card-demir': {
    cardId: 'card-demir',
    moduleName: 'Pediatrik Demir Eksikliği & Talasemi Ayrımı',
    primaryGuideline: 'TPHD Demir Eksikliği Rehberi • T.C. Sağlık Bakanlığı Demir Gibi Türkiye • Mentzer İndeksi',
    guidelineYear: '2011 / 2023',
    primaryCitation: 'Türk Pediatrik Hematoloji Derneği (TPHD); Mentzer WC (Lancet 1973); WHO Haemoglobin Cut-offs'
  },
  'card-ilac': {
    cardId: 'card-ilac',
    moduleName: 'TİTCK İlaç Kataloğu, DDI & Akılcı Reçete',
    primaryGuideline: 'TİTCK KÜB/SKRS • SGK EK-4/A • DDInter 2.0 • ACORN (JAMA 2023) • KDIGO Renal Dozlama',
    guidelineYear: '2023–2026',
    primaryCitation: 'TİTCK / SGK Resmi Verileri; Xiong G et al. DDInter 2.0 (Nucleic Acids Res 2022); Qian ET ACORN Trial (JAMA 2023); FDA PLLR & LactMed'
  }
};

export function getGuidelineMetaForCard(cardId: string): ModuleGuidelineMeta | null {
  return MODULE_GUIDELINE_REGISTRY[cardId] || null;
}

export function getAllGuidelineMetas(): ModuleGuidelineMeta[] {
  return Object.values(MODULE_GUIDELINE_REGISTRY);
}

function escapeHtmlSafe(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Her klinik kartın `.card-body` sonuna standart, tek satırlık kılavuz yılı ve birincil kaynak dipnotu ekler.
 * İdempotent çalışır (tekrar çağrıldığında kopya üretmez).
 */
export function injectCardGuidelineFooters(): number {
  if (typeof document === 'undefined') return 0;
  let injected = 0;

  for (const meta of Object.values(MODULE_GUIDELINE_REGISTRY)) {
    const card = document.getElementById(meta.cardId);
    if (!card || typeof card.querySelector !== 'function') continue;
    const body = card.querySelector('.card-body');
    if (!body || typeof body.querySelector !== 'function' || typeof body.appendChild !== 'function') continue;
    if (body.querySelector('.card-guideline-footer')) continue;

    const footer = document.createElement('div');
    footer.className = 'card-guideline-footer mt-3 pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[0.6875rem] text-slate-400';
    footer.innerHTML = `
      <span class="truncate" title="${escapeHtmlSafe(meta.primaryCitation)}">
        <strong class="text-slate-300 font-semibold">Kılavuz (${escapeHtmlSafe(meta.guidelineYear)}):</strong> ${escapeHtmlSafe(meta.primaryGuideline)}
      </span>
      <span class="font-mono text-[0.625rem] text-slate-500 truncate max-w-full sm:max-w-[45%]" title="${escapeHtmlSafe(meta.primaryCitation)}">${escapeHtmlSafe(meta.primaryCitation)}</span>
    `;
    body.appendChild(footer);
    injected++;
  }

  return injected;
}
