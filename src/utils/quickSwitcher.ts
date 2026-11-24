/**
 * KLİNİK KARAR DESTEK ASİSTANI - HIZLI MOTOR ATLAMA (QUICK SWITCHER / CTRL+K)
 * 
 * Hekimin 21 klinik motor arasında sayfayı kaydırmadan klavye veya arama
 * paleti ile anında istediği karta odaklanmasını sağlar.
 */

export interface QuickSwitcherItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  icon: string;
  desc: string;
  keywords: string[];
}

export const QUICK_SWITCHER_ITEMS: QuickSwitcherItem[] = [
  {
    id: 'action-reset-patient',
    name: 'Yeni Hasta / Formu Sıfırla',
    shortName: 'Yeni Hasta',
    category: 'eylem',
    icon: 'refresh',
    desc: 'Tüm hasta verilerini, klinik hesaplamaları ve reçeteyi sıfırla',
    keywords: ['sifirla', 'reset', 'yeni hasta', 'temizle', 'clear', 'hasta sifirla', 'yeni']
  },
  {
    id: 'card-demografi',
    name: 'Hasta Yaş & Demografi',
    shortName: 'Yaş & Demografi',
    category: 'demografi',
    icon: 'user',
    desc: 'Doğum tarihi, kronolojik yaş, ay/gün hesabı ve cinsiyet',
    keywords: ['yas', 'age', 'dogum tarihi', 'cinsiyet', 'demografi', 'prematüre', 'bebek', 'gun', 'ay']
  },
  {
    id: 'card-biyometri',
    name: 'Biyometri, eGFR & Persentil',
    shortName: 'Kilo, Boy & eGFR',
    category: 'demografi',
    icon: 'activity',
    desc: 'Boy, kilo, BSA (Mosteller), serum kreatinin ve eGFR (Schwartz / CKD-EPI)',
    keywords: ['kilo', 'boy', 'bsa', 'vucut yuzey alani', 'egfr', 'kreatinin', 'bobrek', 'persentil', 'kdh', 'ckd']
  },
  {
    id: 'card-vitaller',
    name: 'Vital Bulgular & Triyaj Skoru',
    shortName: 'Vitaller & Triyaj',
    category: 'demografi',
    icon: 'stethoscope',
    desc: 'Nabız, tansiyon, solunum, SpO2, ateş, NEWS2, PEWS ve AAP tansiyon',
    keywords: ['nabiz', 'tansiyon', 'ates', 'spo2', 'solunum', 'news2', 'pews', 'triyaj', 'vital', 'hipertansiyon']
  },
  {
    id: 'card-gcs',
    name: 'Glasgow Koma Skalası (GCS / pGCS)',
    shortName: 'GCS Koma Skoru',
    category: 'demografi',
    icon: 'activity',
    desc: 'Erişkin ve pediatrik Glasgow Koma Skalası (Göz, Sözel, Motor yanıt)',
    keywords: ['gcs', 'glasgow', 'koma', 'bilinc', 'pediatrik gcs', 'travma', 'kafa travmasi']
  },
  {
    id: 'card-tromboz',
    name: 'Tromboemboli & Kardiyak Acil',
    shortName: 'Tromboemboli & Acil',
    category: 'acil',
    icon: 'emergency',
    desc: 'Wells DVT, Wells PTE, PERC Kuralı, CHA2DS2-VASc, HAS-BLED, HEART Skoru',
    keywords: ['wells', 'dvt', 'pte', 'pe', 'emboli', 'pulmoner emboli', 'perc', 'cha2ds2', 'hasbled', 'heart', 'gogus agrisi', 'af', 'inme']
  },
  {
    id: 'card-nefro',
    name: 'Nefroloji, Toksikoloji & Solunum',
    shortName: 'Nefro & Toksikoloji',
    category: 'lab',
    icon: 'microscope',
    desc: 'FENa, FEUrea, Düzeltilmiş Sodyum, Osmolal Açık, Parasetamol (Rumack), CURB-65',
    keywords: ['fena', 'feurea', 'akut bobrek', 'oliguri', 'duzeltilmis sodyum', 'osmolal', 'parasetamol', 'apap', 'rumack', 'nac', 'curb65', 'pnomoni', 'zehirlenme']
  },
  {
    id: 'card-dahiliye-skorlar',
    name: 'Hepatoloji, Nöroloji, Sepsis & GİS Skorları',
    shortName: 'Hepato, Nöro & SOFA',
    category: 'dahiliye',
    icon: 'activity',
    desc: 'Child-Pugh, MELD 3.0, NIHSS, ABCD², SOFA, qSOFA ve Glasgow-Blatchford (GBS) skorları',
    keywords: ['child pugh', 'child-pugh', 'siroz', 'karaciger', 'meld', 'meld 3.0', 'hepatoloji', 'nihss', 'inme', 'stroke', 'abcd2', 'gia', 'tia', 'sofa', 'qsofa', 'sepsis', 'ybu', 'gbs', 'glasgow blatchford', 'ust gis', 'kanama', 'melena', 'dahiliye']
  },
  {
    id: 'card-neonatoloji',
    name: 'Neonatoloji & Pediatrik Acil',
    shortName: 'Neonatoloji & Acil',
    category: 'pediatri',
    icon: 'baby',
    desc: 'AAP 2022 & TND Yenidoğan Sarılığı, APGAR, Westley Krup, CDS Dehidratasyon, Tartı Takibi',
    keywords: ['aap 2022', 'tnd', 'bhutani', 'sarilik', 'bilirubin', 'fototerapi', 'escalation', 'apgar', 'krup', 'westley', 'dehidratasyon', 'cds', 'ors', 'yenidogan', 'tarti kaybi']
  },
  {
    id: 'card-kangazi',
    name: 'Kan Gazı Analizi (ABG / VBG)',
    shortName: 'Kan Gazı (ABG/VBG)',
    category: 'lab',
    icon: 'lungs',
    desc: 'Asit-baz dengesi, Winter formülü, Anion Gap, Delta-Delta ve laktat',
    keywords: ['kan gazi', 'abg', 'vbg', 'ph', 'pco2', 'hco3', 'asidoz', 'alkaloz', 'winter', 'anyon acigi', 'anion gap', 'laktat']
  },
  {
    id: 'card-idame',
    name: 'İdame Sıvı Tedavisi',
    shortName: 'İdame Sıvı',
    category: 'lab',
    icon: 'droplet',
    desc: 'Holliday-Segar kuralı, ateş düzeltmesi ve TND kademeli yenidoğan sıvısı',
    keywords: ['idame', 'sivi', 'holliday segar', 'yenidogan sivi', 'tnd', 'dehidratasyon', 'izotonik', 'infuzyon']
  },
  {
    id: 'card-elektrolit',
    name: 'Sodyum Açığı & Düzeltilmiş Kalsiyum',
    shortName: 'Sodyum & Kalsiyum',
    category: 'lab',
    icon: 'flask',
    desc: 'Adrogué-Madias sodyum düzeltme formülü ve albümin-düzeltilmiş kalsiyum',
    keywords: ['sodyum', 'adrogue', 'hiponatremi', 'hipernatremi', 'kalsiyum', 'albumin', 'elektrolit']
  },
  {
    id: 'card-kardiyo',
    name: 'Kardiyoloji & EKG Hesaplamaları',
    shortName: 'Kardiyoloji & EKG',
    category: 'acil',
    icon: 'heart',
    desc: 'QTc (Bazett, Fridericia, Bogossian), Tisdale risk skoru ve EKG frontal aksı',
    keywords: ['qtc', 'ekg', 'bazett', 'fridericia', 'tisdale', 'torsades', 'aks', 'kardiyo', 'ritim']
  },
  {
    id: 'card-endokrin',
    name: 'Endokrinoloji & Steroid Dönüşümü',
    shortName: 'Endokrin & Steroid',
    category: 'dahiliye',
    icon: 'flask',
    desc: 'Sistemik glukokortikoid eşdeğer doz dönüşümü ve HOMA-IR insülin direnci',
    keywords: ['steroid', 'prednizol', 'metilprednizolon', 'deksametazon', 'kortizol', 'homa-ir', 'insulin', 'diyabet', 'glukoz']
  },
  {
    id: 'card-infuzyon',
    name: 'İnfüzyon Hızı (Perfüzör & GIR)',
    shortName: 'Perfüzör & GIR',
    category: 'ilac',
    icon: 'clock',
    desc: 'İlaç perfüzör infüzyon hızları (mcg/kg/dk) ve Glukoz İnfüzyon Hızı (GIR)',
    keywords: ['infuzyon', 'perfuzor', 'gir', 'glukoz', 'dopamin', 'noradrenalin', 'hipoglisemi']
  },
  {
    id: 'card-demir',
    name: 'Pediatrik Demir Eksikliği & Talasemi Kalkanı',
    shortName: 'Demir & Anemi (TPHD)',
    category: 'pediatri',
    icon: 'droplet',
    desc: 'TPHD & Sağlık Bakanlığı demir profilaksisi, Mentzer (talasemi) indeksi ve damla/şurup dozu',
    keywords: ['demir', 'anemi', 'tphd', 'mentzer', 'talasemi', 'mcv', 'rbc', 'profilaksi', 'ferrum', 'maltofer', 'sidefer', 'ferritin', 'hemoglobin', 'damla']
  },
  {
    id: 'card-pediatri-surup',
    name: 'Pediatrik Şurup & Süspansiyon Dozu',
    shortName: 'Pediatrik Şurup',
    category: 'pediatri',
    icon: 'baby',
    desc: 'Kilo bazlı mg/kg dozlama, ISMP mililitre (mL) ve oral enjektör hesabı',
    keywords: ['surup', 'suspansiyon', 'pediatrik doz', 'parol surup', 'calpol', 'dolven', 'enjektor', 'ml', 'mg/kg']
  },
  {
    id: 'card-asi',
    name: 'Aşı Takvimi & Kılavuz Tabloları',
    shortName: 'Aşı Takvimi (GBP 2026)',
    category: 'pediatri',
    icon: 'stethoscope',
    desc: 'T.C. Sağlık Bakanlığı Ulusal (6\'lı Karma & Suçiçeği 2. Doz) ve Özel Aşı Protokolleri Bilgi Bankası',
    keywords: ['asi', 'asi takvimi', 'hepatit', 'kpa', 'kizamik', 'bcg', 'dabtt', 'saglik bakanligi', '6li karma', 'heksavalan', 'sucicegi', 'rotavirus', 'meningokok', 'bexsero', 'nimenrix', 'hpv', 'shingrix', 'gardasil', 'gebelik', 'tdab']
  },
  {
    id: 'card-antibiyotik',
    name: 'Centor / McIsaac Akılcı Antibiyotik',
    shortName: 'Centor Faranjit',
    category: 'pediatri',
    icon: 'microscope',
    desc: 'Akut tonsillofaranjitte GAS olasılığı ve antibiyotik endikasyon skoru',
    keywords: ['centor', 'mcisaac', 'faranjit', 'tonsillit', 'streptokok', 'bogaz agrisi', 'antibiyotik']
  },
  {
    id: 'card-obgyn',
    name: 'Kadın Doğum & Obstetrik Hesaplayıcı',
    shortName: 'Obstetrik & Doğum',
    category: 'cerrahi',
    icon: 'stethoscope',
    desc: 'Naegele tahmini doğum tarihi (TDT), Bishop doğum indüksiyon skoru ve Preeklampsi',
    keywords: ['naegele', 'tdt', 'gebelik', 'hamilelik', 'dogum', 'bishop', 'induksiyon', 'preeklampsi', 'sat']
  },
  {
    id: 'card-cerrahi',
    name: 'Genel Cerrahi, Sınıflandırma & Yanık',
    shortName: 'Genel Cerrahi & Yanık',
    category: 'cerrahi',
    icon: 'scalpel',
    desc: '10 klinik alanda 30 cerrahi sınıflandırma/skorlama sistemi (Alvarado/AIR/AAS, TG18, PGS, Strasberg, Atlanta/Marshall/BISAP/mCTSI/Ranson, Hinchey/WSES, EHS/Nyhus, Goligher/BPRST/PNR, Parks/SJUH/Garg, AJCC TNM/Haggitt/Kikuchi, AAST/WSES, Clavien-Dindo/CCI/ASA, Yanık & Sütür)',
    keywords: [
      'alvarado', 'air', 'aas', 'apandisit', 'strappscore',
      'tokyo', 'tg18', 'tg13', 'kolesistit', 'pgs', 'strasberg', 'bismuth', 'safra',
      'atlanta', 'marshall', 'bisap', 'mctsi', 'balthazar', 'ranson', 'pankreatit',
      'hinchey', 'kaiser', 'wses', 'ambrosetti', 'divertikulit',
      'ehs', 'nyhus', 'fitik', 'herni', 'kasik fitigi', 'insizyonel',
      'goligher', 'bprst', 'pnr', 'hss', 'hemoroid',
      'parks', 'st james', 'sjuh', 'garg', 'fistul', 'perianal',
      'ajcc', 'tnm', 'kolorektal', 'kanser', 'haggitt', 'kikuchi', 'polip',
      'aast', 'dalak', 'karaciger', 'travma', 'solid organ',
      'clavien', 'dindo', 'cci', 'komplikasyon', 'asa',
      'atls', 'brooke', 'parkland', 'yanik', 'elektrik yanigi', 'sutur', 'cerrahi'
    ]
  },
  {
    id: 'card-ilac',
    name: 'Akılcı Reçete, TİTCK & Çevrimdışı İlaç Monografları',
    shortName: 'Akılcı Reçete & İlaç Güvenliği',
    category: 'ilac',
    icon: 'shield',
    desc: '18.212 TİTCK ilacı, 135 çevrimdışı ilaç monografı, muadil bulucu, Triple Whammy, Serotonin ve Renal kalkan',
    keywords: ['recete', 'ilac', 'monograf', 'titck', 'muadil', 'etkilesim', 'triple whammy', 'serotonin', 'hiperkalemi', 'statin', 'cyp3a4', 'gebelik', 'yenidogan ilac', 'prospektus', 'kub', 'kt', 'parol', 'parasetamol', 'aspirin', 'augmentin', 'arveles', 'apap', 'analjezik', 'antibiyotik']
  },
  {
    id: 'card-notlar',
    name: 'Klinik Notlar & Anamnez',
    shortName: 'Anamnez Notu',
    category: 'demografi',
    icon: 'copy',
    desc: 'Serbest klinik öykü, şikayet, muayene notu ve nokta kısayolları (.dot)',
    keywords: ['notlar', 'klinik not', 'anamnez', 'oyku', 'sikayet', 'muayene', 'serbest not', 'dot phrase']
  },
  {
    id: 'card-soap',
    name: 'Canlı SOAP Hasta Notu',
    shortName: 'SOAP Hasta Notu',
    category: 'all',
    icon: 'copy',
    desc: 'Subjektif, Objektif, Değerlendirme ve Plan formatında otomatik klinik dokümantasyon',
    keywords: ['soap', 'hasta notu', 'epikriz', 'anamnez', 'rapor', 'dokumantasyon', 'plan']
  }
];

function normalizeSearch(str: string): string {
  if (!str) return '';
  return str
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

export function searchQuickSwitcher(query: string): QuickSwitcherItem[] {
  const normQuery = normalizeSearch(query);
  if (!normQuery) {
    return QUICK_SWITCHER_ITEMS;
  }

  return QUICK_SWITCHER_ITEMS.filter(item => {
    const matchName = normalizeSearch(item.name).includes(normQuery);
    const matchShort = normalizeSearch(item.shortName).includes(normQuery);
    const matchDesc = normalizeSearch(item.desc).includes(normQuery);
    const matchCategory = normalizeSearch(item.category).includes(normQuery);
    const matchKeywords = item.keywords.some(k => normalizeSearch(k).includes(normQuery));
    return matchName || matchShort || matchDesc || matchCategory || matchKeywords;
  });
}

const MOTOR_DOM_ID_ALIASES: Record<string, string> = {
  'card-nefrotox': 'card-nefro',
  'card-faranjit': 'card-antibiyotik',
  'card-asi': 'card-pediatri-surup',
  'card-yanik': 'card-cerrahi',
  'card-parkland': 'card-cerrahi',
  'card-alvarado': 'card-cerrahi',
  'card-air': 'card-cerrahi',
  'card-aas': 'card-cerrahi',
  'card-tg18': 'card-cerrahi',
  'card-tokyo': 'card-cerrahi',
  'card-pgs': 'card-cerrahi',
  'card-strasberg': 'card-cerrahi',
  'card-ranson': 'card-cerrahi',
  'card-atlanta': 'card-cerrahi',
  'card-marshall': 'card-cerrahi',
  'card-bisap': 'card-cerrahi',
  'card-mctsi': 'card-cerrahi',
  'card-hinchey': 'card-cerrahi',
  'card-divertikulit': 'card-cerrahi',
  'card-ambrosetti': 'card-cerrahi',
  'card-ehs': 'card-cerrahi',
  'card-nyhus': 'card-cerrahi',
  'card-fitik': 'card-cerrahi',
  'card-goligher': 'card-cerrahi',
  'card-bprst': 'card-cerrahi',
  'card-pnr': 'card-cerrahi',
  'card-hemoroid': 'card-cerrahi',
  'card-parks': 'card-cerrahi',
  'card-sjuh': 'card-cerrahi',
  'card-garg': 'card-cerrahi',
  'card-fistul': 'card-cerrahi',
  'card-tnm': 'card-cerrahi',
  'card-haggitt': 'card-cerrahi',
  'card-kikuchi': 'card-cerrahi',
  'card-aast': 'card-cerrahi',
  'card-travma': 'card-cerrahi',
  'card-clavien': 'card-cerrahi',
  'card-cci': 'card-cerrahi',
  'card-asa': 'card-cerrahi',
  'card-sutur': 'card-cerrahi',
  'card-child-pugh': 'card-dahiliye-skorlar',
  'card-meld': 'card-dahiliye-skorlar',
  'card-nihss': 'card-dahiliye-skorlar',
  'card-abcd2': 'card-dahiliye-skorlar',
  'card-sofa': 'card-dahiliye-skorlar',
  'card-qsofa': 'card-dahiliye-skorlar',
  'card-gbs': 'card-dahiliye-skorlar'
};

const EXTENDED_ALIAS_TO_TAB: Record<string, ExtendedScoreTabId> = {
  'card-child-pugh': 'hepatology',
  'card-meld': 'hepatology',
  'card-nihss': 'neurology',
  'card-abcd2': 'neurology',
  'card-sofa': 'sepsis',
  'card-qsofa': 'sepsis',
  'card-gbs': 'ugib'
};

const SURGERY_ALIAS_TO_TAB: Record<string, SurgeryTabId> = {
  'card-alvarado': 'appendicitis',
  'card-air': 'appendicitis',
  'card-aas': 'appendicitis',
  'card-tg18': 'biliary',
  'card-tokyo': 'biliary',
  'card-pgs': 'biliary',
  'card-strasberg': 'biliary',
  'card-ranson': 'pancreatitis',
  'card-atlanta': 'pancreatitis',
  'card-marshall': 'pancreatitis',
  'card-bisap': 'pancreatitis',
  'card-mctsi': 'pancreatitis',
  'card-hinchey': 'diverticulitis',
  'card-divertikulit': 'diverticulitis',
  'card-ambrosetti': 'diverticulitis',
  'card-ehs': 'hernia',
  'card-nyhus': 'hernia',
  'card-fitik': 'hernia',
  'card-goligher': 'hemorrhoid',
  'card-bprst': 'hemorrhoid',
  'card-pnr': 'hemorrhoid',
  'card-hemoroid': 'hemorrhoid',
  'card-parks': 'fistula',
  'card-sjuh': 'fistula',
  'card-garg': 'fistula',
  'card-fistul': 'fistula',
  'card-tnm': 'oncology',
  'card-haggitt': 'oncology',
  'card-kikuchi': 'oncology',
  'card-aast': 'trauma',
  'card-travma': 'trauma',
  'card-clavien': 'periop',
  'card-cci': 'periop',
  'card-asa': 'periop',
  'card-yanik': 'burn',
  'card-parkland': 'burn',
  'card-sutur': 'burn'
};

import { findSidebarGroupByMotor } from '../workstationPackages';
import { activateSurgeryTab, type SurgeryTabId } from '../controllers/surgeryObgynController';
import { activateExtendedScoreTab, type ExtendedScoreTabId } from '../controllers/extendedScoresController';

export function jumpToMotor(motorId: string): boolean {
  if (typeof document === 'undefined') return false;
  if (motorId === 'action-reset-patient') {
    const btnReset = document.getElementById('btn-reset-patient') as HTMLButtonElement | null;
    if (btnReset) {
      btnReset.click();
      return true;
    }
    return false;
  }

  const resolvedId = MOTOR_DOM_ID_ALIASES[motorId] || motorId;
  const card = document.getElementById(resolvedId) || document.getElementById(motorId);
  if (!card) return false;

  // 1. Kart gizli ise, ait olduğu sol menü grubunu etkinleştir (tüm 20 kartı açıp kalabalık yaratmadan)
  if (card.classList.contains('hidden') || card.style.display === 'none') {
    const group = findSidebarGroupByMotor(card.id) || findSidebarGroupByMotor(resolvedId);
    const groupLink = group
      ? (document.querySelector<HTMLElement>(`.nav-sidebar-link[data-group="${group.id}"]`) ||
         document.querySelector<HTMLElement>(`.nav-sidebar-link[href="${group.href}"]`))
      : null;
    if (groupLink) {
      groupLink.click();
    } else {
      card.classList.remove('hidden');
    }
  }

  // 2. Kart <details> ise açık yap
  if (card.tagName.toLowerCase() === 'details') {
    (card as HTMLDetailsElement).open = true;
  }

  // 2.1. Eğer Genel Cerrahi veya Genişletilmiş Dahiliye alt motor kısayolu ise ilgili sekmeyi aç
  if (SURGERY_ALIAS_TO_TAB[motorId]) {
    activateSurgeryTab(SURGERY_ALIAS_TO_TAB[motorId]);
  } else if (EXTENDED_ALIAS_TO_TAB[motorId]) {
    activateExtendedScoreTab(EXTENDED_ALIAS_TO_TAB[motorId]);
  }

  // 3. Ekrana yumuşakça kaydır
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 4. Kart vurgulama animasyonu ekle (pulse-ring)
  card.classList.remove('card-highlight');
  // DOM reflow tetikle
  void card.offsetWidth;
  card.classList.add('card-highlight');

  setTimeout(() => {
    card.classList.remove('card-highlight');
  }, 2200);

  // 5. Kart içindeki ilk girdi alanına odaklan
  const firstInput = card.querySelector<HTMLInputElement | HTMLSelectElement>('input:not([type="hidden"]), select');
  if (firstInput) {
    setTimeout(() => {
      firstInput.focus();
    }, 350);
  }

  return true;
}
