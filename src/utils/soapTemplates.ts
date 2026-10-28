/**
 * SOAP AKILLI ŞABLONLARI & NOKTA KISAYOLLARI (DOT PHRASES)
 * 
 * Sık karşılaşılan poliklinik ve acil klinik tabloları için kanıta dayalı,
 * yapılandırılmış anamnez ve fizik muayene şablonları.
 */

export interface SoapTemplate {
  key: string;       // Örn: '.apandisit'
  label: string;     // Örn: 'Akut Apandisit'
  category: string;  // 'Cerrahi', 'Pediatri', 'Dahiliye', 'Acil'
  text: string;      // Şablon içeriği
}

export const SOAP_TEMPLATES: SoapTemplate[] = [
  {
    key: '.apandisit',
    label: 'Akut Apandisit',
    category: 'Cerrahi',
    text: 'Sağ alt kadranda McBurney hassasiyeti (+), defans (+), rebound (+). Rovsing (+). Alvarado skoru hesaplandı. Cerrahi konsültasyonu ve batın USG planlandı.'
  },
  {
    key: '.tonsillit',
    label: 'Akut Tonsillit',
    category: 'Pediatri/KBB',
    text: 'Bilateral tonsiller hipertrofik ve hiperemik, kriptik eksüda mevcut. Ön servikal LAP (+), öksürük yok. Ateş > 38°C. Centor/McIsaac değerlendirildi. AGBHS şüphesiyle akılcı antibiyoterapi planlandı.'
  },
  {
    key: '.dvt_dislama',
    label: 'DVT Dışlama (Wells)',
    category: 'Acil',
    text: 'Wells DVT skoru değerlendirildi: Düşük risk. Alt ekstremiteler simetrik, baldır çap farkı < 3 cm, gode bırakan ödem yok. D-Dimer tetkiki planlandı.'
  },
  {
    key: '.gastroenterit',
    label: 'Akut Gastroenterit',
    category: 'Dahiliye',
    text: 'Bulantı, kusma, sulu dışkılama mevcut. Dehidratasyon bulguları hafif, mukozalar nemli, turgor doğal. Batın rahat, defans/rebound yok. Oral rehidrasyon ve probiyotik önerildi.'
  },
  {
    key: '.astim_atak',
    label: 'Astım / Bronkospazm',
    category: 'Acil',
    text: 'Ekspiratuar ronküsler bilateral yaygın (+), ekspiryum uzun, taşipne (+). İnterkostal çekilme yok, SpO2 > %92 (oda havasında). İnhale SABA nebül + sistemik steroid uygulandı.'
  },
  {
    key: '.gogus_agrisi',
    label: 'Göğüs Ağrısı (AKS Dışlama)',
    category: 'Acil/Kardiyo',
    text: 'Retrosternal baskı tarzında göğüs ağrısı. EKG: Akut iskemik ST-T değişikliği izlenmedi. Seri Troponin takibi ve kardiyak monitörizasyon başlatıldı.'
  },
  {
    key: '.anafilaksi',
    label: 'Akut Anafilaksi',
    category: 'Acil',
    text: 'Akut başlangıçlı jeneralize ürtiker, anjiyoödem, inspiratuar stridor ve hipotansiyon. Uyluk anterolateral orta 1/3 İM Adrenalin 1:1000 uygulandı. IV SF bolusu ve O2 başlandı. Bifazik reaksiyon takibine alındı.'
  },
  {
    key: '.status_epilepticus',
    label: 'Status Epilepticus',
    category: 'Acil/Nöroloji',
    text: 'Jeneralize tonik-klonik nöbet. Havayolu güvenceye alındı, %100 O2 ve kapiller kan şekeri kontrolü sağlandı. AES kılavuzuna göre 1. basamak benzodiazepin uygulandı. Zaman sayacı başlatıldı.'
  },
  {
    key: '.krup',
    label: 'Krup (Laringotrakeobronşit)',
    category: 'Pediatri',
    text: 'Barking tarzda kaba havlar öksürük, ses kısıklığı, stridor mevcut. Westley krup skoru değerlendirildi. Tek doz oral/İM deksametazon planlandı.'
  },
  {
    key: '.uriner_enfeksiyon',
    label: 'Üriner Sistem Enfeksiyonu',
    category: 'Dahiliye',
    text: 'Dizüri, pollaküri, suprapubik hassasiyet mevcut. KVAH (-/-), ateş yok. TİT ve idrar kültürü planlandı. Uygun antibiyoterapi başlandı.'
  }
];

/**
 * Verilen metin içindeki nokta kısayollarını (.apandisit vb.) otomatik olarak tespit edip
 * tam şablon metniyle değiştirir (Text Expansion).
 */
export function expandDotPhrases(text: string): { expandedText: string; expandedKeys: string[] } {
  if (!text) return { expandedText: '', expandedKeys: [] };

  let result = text;
  const expandedKeys: string[] = [];

  for (const tmpl of SOAP_TEMPLATES) {
    // Kelime sınırı veya arkasından boşluk/satır sonu/noktalama gelen kısayolları eşle
    // Örn: ".apandisit ", ".apandisit\n", ".apandisit."
    const regex = new RegExp(`(^|\\s)${escapeRegex(tmpl.key)}(?=[\\s.,!?;:]|$)`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, `$1${tmpl.text} `);
      expandedKeys.push(tmpl.key);
    }
  }

  return { expandedText: result.trimEnd(), expandedKeys };
}

/**
 * Belirli bir şablonu mevcut metne akıllıca ekler.
 */
export function appendTemplateToText(currentText: string, templateKey: string): string {
  const tmpl = SOAP_TEMPLATES.find(t => t.key.toLowerCase() === templateKey.toLowerCase());
  if (!tmpl) return currentText;

  const trimmed = (currentText || '').trim();
  if (!trimmed) {
    return tmpl.text;
  }
  // Eğer şablon metni zaten eklenmişse mükerrer ekleme
  if (trimmed.includes(tmpl.text)) {
    return trimmed;
  }
  return `${trimmed}\n${tmpl.text}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
