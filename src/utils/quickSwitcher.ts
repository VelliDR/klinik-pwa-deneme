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
    id: 'card-demografi',
    name: 'Hasta Yaş & Demografi',
    shortName: 'Yaş & Demografi',
    category: 'demografi',
    icon: '👤',
    desc: 'Doğum tarihi, kronolojik yaş, ay/gün hesabı ve cinsiyet',
    keywords: ['yas', 'age', 'dogum tarihi', 'cinsiyet', 'demografi', 'prematüre', 'bebek', 'gun', 'ay']
  },
  {
    id: 'card-biyometri',
    name: 'Biyometri, eGFR & Persentil',
    shortName: 'Kilo, Boy & eGFR',
    category: 'demografi',
    icon: '📐',
    desc: 'Boy, kilo, BSA (Mosteller), serum kreatinin ve eGFR (Schwartz / CKD-EPI)',
    keywords: ['kilo', 'boy', 'bsa', 'vucut yuzey alani', 'egfr', 'kreatinin', 'bobrek', 'persentil', 'kdh', 'ckd']
  },
  {
    id: 'card-vitaller',
    name: 'Vital Bulgular & Triyaj Skoru',
    shortName: 'Vitaller & Triyaj',
    category: 'demografi',
    icon: '🩺',
    desc: 'Nabız, tansiyon, solunum, SpO2, ateş, NEWS2, PEWS ve AAP tansiyon',
    keywords: ['nabiz', 'tansiyon', 'ates', 'spo2', 'solunum', 'news2', 'pews', 'triyaj', 'vital', 'hipertansiyon']
  },
  {
    id: 'card-gcs',
    name: 'Glasgow Koma Skalası (GCS / pGCS)',
    shortName: 'GCS Koma Skoru',
    category: 'demografi',
    icon: '🧠',
    desc: 'Erişkin ve pediatrik Glasgow Koma Skalası (Göz, Sözel, Motor yanıt)',
    keywords: ['gcs', 'glasgow', 'koma', 'bilinc', 'pediatrik gcs', 'travma', 'kafa travmasi']
  },
  {
    id: 'card-tromboz',
    name: 'Tromboemboli & Kardiyak Acil',
    shortName: 'Tromboemboli & Acil',
    category: 'acil',
    icon: '🩸',
    desc: 'Wells DVT, Wells PTE, PERC Kuralı, CHA2DS2-VASc, HAS-BLED, HEART Skoru',
    keywords: ['wells', 'dvt', 'pte', 'pe', 'emboli', 'pulmoner emboli', 'perc', 'cha2ds2', 'hasbled', 'heart', 'gogus agrisi', 'af', 'inme']
  },
  {
    id: 'card-nefrotox',
    name: 'Nefroloji, Toksikoloji & Solunum',
    shortName: 'Nefro & Toksikoloji',
    category: 'lab',
    icon: '🧪',
    desc: 'FENa, FEUrea, Düzeltilmiş Sodyum, Osmolal Açık, Parasetamol (Rumack), CURB-65',
    keywords: ['fena', 'feurea', 'akut bobrek', 'oliguri', 'duzeltilmis sodyum', 'osmolal', 'parasetamol', 'apap', 'rumack', 'nac', 'curb65', 'pnomoni', 'zehirlenme']
  },
  {
    id: 'card-neonatoloji',
    name: 'Neonatoloji & Pediatrik Acil',
    shortName: 'Neonatoloji & Acil',
    category: 'pediatri',
    icon: '🍼',
    desc: 'Bhutani Sarılık, APGAR, Westley Krup, CDS Dehidratasyon, Yenidoğan Tartı Takibi',
    keywords: ['bhutani', 'sarilik', 'bilirubin', 'fototerapi', 'apgar', 'krup', 'westley', 'dehidratasyon', 'cds', 'ors', 'yenidogan', 'tarti kaybi']
  },
  {
    id: 'card-kangazi',
    name: 'Kan Gazı Analizi (ABG / VBG)',
    shortName: 'Kan Gazı (ABG/VBG)',
    category: 'lab',
    icon: '🫁',
    desc: 'Asit-baz dengesi, Winter formülü, Anion Gap, Delta-Delta ve laktat',
    keywords: ['kan gazi', 'abg', 'vbg', 'ph', 'pco2', 'hco3', 'asidoz', 'alkaloz', 'winter', 'anyon acigi', 'anion gap', 'laktat']
  },
  {
    id: 'card-idame',
    name: 'İdame Sıvı Tedavisi',
    shortName: 'İdame Sıvı',
    category: 'lab',
    icon: '💧',
    desc: 'Holliday-Segar kuralı, ateş düzeltmesi ve TND kademeli yenidoğan sıvısı',
    keywords: ['idame', 'sivi', 'holliday segar', 'yenidogan sivi', 'tnd', 'dehidratasyon', 'izotonik', 'infuzyon']
  },
  {
    id: 'card-elektrolit',
    name: 'Sodyum Açığı & Düzeltilmiş Kalsiyum',
    shortName: 'Sodyum & Kalsiyum',
    category: 'lab',
    icon: '🧂',
    desc: 'Adrogué-Madias sodyum düzeltme formülü ve albümin-düzeltilmiş kalsiyum',
    keywords: ['sodyum', 'adrogue', 'hiponatremi', 'hipernatremi', 'kalsiyum', 'albumin', 'elektrolit']
  },
  {
    id: 'card-kardiyo',
    name: 'Kardiyoloji & EKG Hesaplamaları',
    shortName: 'Kardiyoloji & EKG',
    category: 'acil',
    icon: '❤️',
    desc: 'QTc (Bazett, Fridericia, Bogossian), Tisdale risk skoru ve EKG frontal aksı',
    keywords: ['qtc', 'ekg', 'bazett', 'fridericia', 'tisdale', 'torsades', 'aks', 'kardiyo', 'ritim']
  },
  {
    id: 'card-endokrin',
    name: 'Endokrinoloji & Steroid Dönüşümü',
    shortName: 'Endokrin & Steroid',
    category: 'dahiliye',
    icon: '💊',
    desc: 'Sistemik glukokortikoid eşdeğer doz dönüşümü ve HOMA-IR insülin direnci',
    keywords: ['steroid', 'prednizol', 'metilprednizolon', 'deksametazon', 'kortizol', 'homa-ir', 'insulin', 'diyabet', 'glukoz']
  },
  {
    id: 'card-infuzyon',
    name: 'İnfüzyon Hızı (Perfüzör & GIR)',
    shortName: 'Perfüzör & GIR',
    category: 'ilac',
    icon: '⏱️',
    desc: 'İlaç perfüzör infüzyon hızları (mcg/kg/dk) ve Glukoz İnfüzyon Hızı (GIR)',
    keywords: ['infuzyon', 'perfuzor', 'gir', 'glukoz', 'dopamin', 'noradrenalin', 'hipoglisemi']
  },
  {
    id: 'card-demir',
    name: 'Ganzoni Demir Açığı Hesabı',
    shortName: 'Demir Açığı (Ganzoni)',
    category: 'dahiliye',
    icon: '🩸',
    desc: 'Toplam elemental demir açığı ve parenteral demir (Ferinject/Venofer) ampul hesabı',
    keywords: ['demir', 'ganzoni', 'anemi', 'ferinject', 'venofer', 'ferritin', 'hemoglobin']
  },
  {
    id: 'card-pediatri-surup',
    name: 'Pediatrik Şurup & Süspansiyon Dozu',
    shortName: 'Pediatrik Şurup',
    category: 'pediatri',
    icon: '🥄',
    desc: 'Kilo bazlı mg/kg dozlama, ölçek (5 mL) ve günlük doz aralığı hesabı',
    keywords: ['surup', 'suspansiyon', 'pediatrik doz', 'parol surup', 'calpol', 'dolven', 'olcek', 'mg/kg']
  },
  {
    id: 'card-asi',
    name: 'Aşı Takvimi Sorgulama',
    shortName: 'Aşı Takvimi',
    category: 'pediatri',
    icon: '💉',
    desc: 'T.C. Sağlık Bakanlığı Çocukluk Dönemi Ulusal Aşı Takvimi',
    keywords: ['asi', 'asi takvimi', 'hepatit', 'kpa', 'kizamik', 'bcg', 'dabtt', 'saglik bakanligi']
  },
  {
    id: 'card-faranjit',
    name: 'Centor / McIsaac Akılcı Antibiyotik',
    shortName: 'Centor Faranjit',
    category: 'pediatri',
    icon: '🔬',
    desc: 'Akut tonsillofaranjitte GAS olasılığı ve antibiyotik endikasyon skoru',
    keywords: ['centor', 'mcisaac', 'faranjit', 'tonsillit', 'streptokok', 'bogaz agrisi', 'antibiyotik']
  },
  {
    id: 'card-obgyn',
    name: 'Kadın Doğum & Obstetrik Hesaplayıcı',
    shortName: 'Obstetrik & Doğum',
    category: 'cerrahi',
    icon: '🤰',
    desc: 'Naegele tahmini doğum tarihi (TDT), Bishop doğum indüksiyon skoru ve Preeklampsi',
    keywords: ['naegele', 'tdt', 'gebelik', 'hamilelik', 'dogum', 'bishop', 'induksiyon', 'preeklampsi', 'sat']
  },
  {
    id: 'card-cerrahi',
    name: 'Cerrahi Skorlar & Yanık',
    shortName: 'Cerrahi & Yanık',
    category: 'cerrahi',
    icon: '🔪',
    desc: 'Alvarado akut apandisit, Parkland yanık resüsitasyonu, Ranson pankreatit ve Sütür',
    keywords: ['alvarado', 'apandisit', 'parkland', 'yanik', 'ranson', 'pankreatit', 'sutur', 'cerrahi']
  },
  {
    id: 'card-ilac',
    name: 'Akılcı Reçete, TİTCK & İlaç Güvenlik Kalkanı',
    shortName: 'Akılcı Reçete & İlaç Güvenliği',
    category: 'ilac',
    icon: '🛡️',
    desc: '18.200+ TİTCK ilacı, O(1) arama, muadil bulucu, Triple Whammy, Serotonin, Hiperkalemi ve CYP3A4 kalkanı',
    keywords: ['recete', 'ilac', 'titck', 'muadil', 'etkilesim', 'triple whammy', 'serotonin', 'hiperkalemi', 'statin', 'cyp3a4', 'gebelik', 'yenidogan ilac', 'prospektus']
  },
  {
    id: 'card-soap',
    name: 'Canlı SOAP Hasta Notu',
    shortName: 'SOAP Hasta Notu',
    category: 'all',
    icon: '📋',
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

export function jumpToMotor(motorId: string): boolean {
  const card = document.getElementById(motorId);
  if (!card) return false;

  // 1. Kart gizli ise (kategori filtresi nedeniyle), 'Tümü' filtresini tetikle
  if (card.classList.contains('hidden') || card.style.display === 'none') {
    const allPill = document.querySelector<HTMLButtonElement>('.cat-pill[data-cat="all"]');
    if (allPill) allPill.click();
  }

  // 2. Kart <details> ise açık yap
  if (card.tagName.toLowerCase() === 'details') {
    (card as HTMLDetailsElement).open = true;
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
