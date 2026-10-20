/**
 * KLİNİK KARAR DESTEK ASİSTANI - HASTA REÇETE VE DOZAJ ÇİZELGESİ YAZDIRMA MOTORU
 * 
 * Hekimin hastaya doğrudan teslim edebileceği, anlaşılır ve görsel
 * ilaç kullanım planı (A4 / PDF yazdırılabilir formatı).
 */

import type { SelectedDrugItem } from '../types/clinical';

export interface PrescriptionPrintPatientInfo {
  patientName?: string;
  tcNo?: string;
  age?: string;
  gender?: string;
  weightKg?: number;
  dateStr?: string;
  doctorName?: string;
  doctorTitle?: string;
  doctorDiplomaNo?: string;
  diagnosis?: string;      // ICD-10 & Ön Tanı
  rxNumber?: string;       // E-Reçete No
  allergyNotes?: string;   // Alerji durumu
  clinicTitle?: string;    // Kurum / Poliklinik
  clinicalNotes?: string;
}

export interface PrintableDrugSchedule {
  id?: string;
  name: string;
  generic?: string;
  form?: string;          // Tablet, Şurup, Damla, vb.
  dosage: string;         // '1 Tablet', '1 Ölçek (5 mL)', vb.
  morning: boolean;
  noon: boolean;
  evening: boolean;
  night: boolean;
  morningDose?: string;   // '1', '1/2', '2', '1 Ölçek'
  noonDose?: string;
  eveningDose?: string;
  nightDose?: string;
  mealTiming: 'TOK' | 'AC' | 'YEMEKLE' | 'FARKETMEZ' | 'GECE';
  duration?: string;      // '5 Gün', '10 Gün', 'Kutu Bitene Kadar', 'Düzenli'
  instructions: string;
}

export interface PrescriptionPreset {
  id: string;
  title: string;
  diagnosis: string;
  drugs: PrintableDrugSchedule[];
}

/**
 * Verilen ilacı ve hastanın demografisini analiz ederek klinik gerçekçi,
 * akılcı dozaj, kullanım zamanı, aç/tok durumu ve özel uyarıları türetir.
 */
export function buildDefaultDrugSchedule(
  drug: SelectedDrugItem,
  patientWeightKg?: number,
  isChild: boolean = false
): PrintableDrugSchedule {
  const brand = drug.brand || drug.brandName || drug.name || drug.generic || 'İlaç';
  const generic = (drug.generic || '').toLowerCase();
  const brandLower = brand.toLowerCase();
  const id = `rx-drug-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // 1. İlaç Formunu Belirle
  let form = 'Tablet';
  if (brandLower.includes('şurup') || brandLower.includes('surup') || brandLower.includes('süspansiyon') || brandLower.includes('suspansiyon')) {
    form = 'Şurup';
  } else if (brandLower.includes('kapsül') || brandLower.includes('kapsul')) {
    form = 'Kapsül';
  } else if (brandLower.includes('damla') || brandLower.includes('gutta')) {
    form = 'Damla';
  } else if (brandLower.includes('sprey') || brandLower.includes('inhaler') || brandLower.includes('nebül') || brandLower.includes('nebul')) {
    form = 'Sprey/İnhaler';
  } else if (brandLower.includes('krem') || brandLower.includes('merhem') || brandLower.includes('pomad') || brandLower.includes('jel')) {
    form = 'Krem/Merhem';
  } else if (brandLower.includes('saşe') || brandLower.includes('sase') || brandLower.includes('toz')) {
    form = 'Saşe';
  } else if (brandLower.includes('fitil') || brandLower.includes('supozituar')) {
    form = 'Fitil';
  } else if (brandLower.includes('ampul') || brandLower.includes('flakon')) {
    form = 'Enjeksiyon';
  }

  // Varsayılan Zamanlar
  let morning = true;
  let noon = false;
  let evening = true;
  let night = false;
  let morningDose = '1';
  let noonDose = '-';
  let eveningDose = '1';
  let nightDose = '-';
  let mealTiming: 'TOK' | 'AC' | 'YEMEKLE' | 'FARKETMEZ' | 'GECE' = 'TOK';
  let duration = '7 Gün';
  let dosage = form === 'Şurup' ? '1 Ölçek (5 mL)' : `1 ${form}`;
  let instructions = 'Bol su ile içiniz.';

  // 2. Klinik Farmakolojik Sınıflama & Akıllı Eşleştirme
  if (generic.includes('amoxicillin') || brandLower.includes('amoklavin') || brandLower.includes('augmentin') || brandLower.includes('largopen') || brandLower.includes('klamoks')) {
    // Antibiyotik (Günde 2 kez - 12 saatte bir)
    dosage = form === 'Şurup' ? (patientWeightKg && patientWeightKg < 15 ? '1/2 Ölçek (2.5 mL)' : '1 Ölçek (5.0 mL)') : '1 Tablet';
    duration = '10 Gün (Kutu Bitene Kadar)';
    instructions = 'Yemek başlangıcında veya tok karnına alınız. Şikayetleriniz geçse dahi antibiyotik kutusu bitene kadar aksatmayınız.';
    morning = true; noon = false; evening = true; night = false;
    morningDose = '1'; noonDose = '-'; eveningDose = '1'; nightDose = '-';
    mealTiming = 'TOK';
  } else if (generic.includes('clarithromycin') || brandLower.includes('klacid') || brandLower.includes('macrol')) {
    dosage = '1 Tablet (12 saat arayla)';
    duration = '7–14 Gün';
    instructions = 'Tok karnına alınız. Tedavi süresince greyfurt veya greyfurt suyu tüketmeyiniz.';
    morning = true; noon = false; evening = true; night = false;
    morningDose = '1'; noonDose = '-'; eveningDose = '1'; nightDose = '-';
    mealTiming = 'TOK';
  } else if (brandLower.includes('cipro') || generic.includes('ciprofloxacin')) {
    dosage = '1 Tablet (12 saat arayla)';
    duration = '7 Gün';
    instructions = 'Bol su ile alınız. Süt ürünleri, kalsiyum veya demir ilaçlarıyla aynı anda almayınız (en az 2 saat ara veriniz).';
    morning = true; noon = false; evening = true; night = false;
    morningDose = '1'; noonDose = '-'; eveningDose = '1'; nightDose = '-';
    mealTiming = 'TOK';
  } else if (generic.includes('paracetamol') || brandLower.includes('parol') || brandLower.includes('calpol') || brandLower.includes('tylol') || brandLower.includes('minoset')) {
    // Parasetamol (Günde 3 kez - 8 saat arayla veya semptomatik)
    if (form === 'Şurup') {
      const pDose = patientWeightKg ? Math.round(patientWeightKg * 15) : 120;
      const pMl = (pDose / 24).toFixed(1); // 120mg/5mL baz alınarak
      dosage = `${pMl} mL (${pDose} mg)`;
    } else {
      dosage = '1 Tablet';
    }
    duration = '3–5 Gün (Gerektiğinde)';
    instructions = 'Ağrı veya ateş durumunda 6-8 saat arayla tok karnına alınız. 24 saatte maksimum dozu aşmayınız.';
    morning = true; noon = true; evening = true; night = false;
    morningDose = '1'; noonDose = '1'; eveningDose = '1'; nightDose = '-';
    mealTiming = 'TOK';
  } else if (brandLower.includes('arveles') || brandLower.includes('apranax') || generic.includes('dexketoprofen') || generic.includes('naproxen') || generic.includes('ibuprofen') || brandLower.includes('dolven') || brandLower.includes('majezik')) {
    // NSAİİ (Günde 2 kez - Tok karnına)
    dosage = form === 'Şurup' ? '1 Ölçek (5 mL)' : '1 Tablet';
    duration = '3–5 Gün (Ağrıda)';
    instructions = 'Mutlaka TOK KARNINA alınız. Mide hassasiyeti durumunda mide koruyucu ile birlikte kullanınız.';
    morning = true; noon = false; evening = true; night = false;
    morningDose = '1'; noonDose = '-'; eveningDose = '1'; nightDose = '-';
    mealTiming = 'TOK';
  } else if (brandLower.includes('pantpas') || brandLower.includes('lansor') || brandLower.includes('nexium') || brandLower.includes('pulcet') || generic.includes('pantoprazole') || generic.includes('lansoprazole') || generic.includes('esomeprazole') || generic.includes('omeprazole')) {
    // Mide Koruyucu (Sabah Aç - Günde 1 kez)
    dosage = '1 Kapsül/Tablet';
    duration = '1 Ay';
    instructions = 'Sabah kahvaltıdan 30 DAKİKA ÖNCE AÇ KARNINA alınız.';
    morning = true; noon = false; evening = false; night = false;
    morningDose = '1'; noonDose = '-'; eveningDose = '-'; nightDose = '-';
    mealTiming = 'AC';
  } else if (brandLower.includes('delix') || brandLower.includes('coversyl') || brandLower.includes('cozaar') || generic.includes('ramipril') || generic.includes('perindopril') || generic.includes('losartan') || generic.includes('amlodipine') || brandLower.includes('norvasc') || brandLower.includes('beloc')) {
    // Antihipertansif (Günde 1 kez - Sabah Tok)
    dosage = '1 Tablet (Sabah)';
    duration = 'Düzenli Kullanım';
    instructions = 'Her gün aynı saatte, tercihen sabah kahvaltıdan sonra alınız. Tansiyonunuzu düzenli ölçünüz.';
    morning = true; noon = false; evening = false; night = false;
    morningDose = '1'; noonDose = '-'; eveningDose = '-'; nightDose = '-';
    mealTiming = 'TOK';
  } else if (brandLower.includes('aldactone') || generic.includes('spironolactone') || brandLower.includes('lasix') || generic.includes('furosemide')) {
    // Diüretik (Günde 1 kez - Sabah Tok)
    dosage = '1 Tablet (Sabah)';
    duration = 'Hekim Kontrolünde';
    instructions = 'Sabah kahvaltısından sonra alınız. İdrara çıkışı artıracağı için akşam veya gece almayınız.';
    morning = true; noon = false; evening = false; night = false;
    morningDose = '1'; noonDose = '-'; eveningDose = '-'; nightDose = '-';
    mealTiming = 'TOK';
  } else if (generic.includes('atorvastatin') || generic.includes('simvastatin') || generic.includes('rosuvastatin') || brandLower.includes('lipitor') || brandLower.includes('crestor') || brandLower.includes('zocor') || brandLower.includes('ateroz')) {
    // Statin (Günde 1 kez - Gece Yatarken)
    dosage = '1 Tablet (Gece)';
    duration = 'Düzenli Kullanım';
    instructions = 'Her gün akşam yatmadan önce alınız. Açıklanamayan kas ağrısı veya halsizlik olursa hekiminize bildiriniz.';
    morning = false; noon = false; evening = false; night = true;
    morningDose = '-'; noonDose = '-'; eveningDose = '-'; nightDose = '1';
    mealTiming = 'GECE';
  } else if (brandLower.includes('otrivine') || brandLower.includes('iliadin') || generic.includes('oxymetazoline') || generic.includes('xylometazoline')) {
    // Burun Spreyi
    dosage = 'Her burun deliğine 1 Puf';
    duration = '3–5 Gün (Maksimum 5 Gün)';
    instructions = '⚠️ DİKKAT: Günde 2-3 kez uygulayınız. Kronik burun tıkanıklığı yapmaması için 5 günden uzun KULLANMAYINIZ!';
    morning = true; noon = false; evening = true; night = false;
    morningDose = '1 Puf'; noonDose = '-'; eveningDose = '1 Puf'; nightDose = '-';
    mealTiming = 'FARKETMEZ';
  } else if (brandLower.includes('andorex') || brandLower.includes('tantum') || brandLower.includes('klotimazol') || generic.includes('chlorhexidine') || generic.includes('benzydamine')) {
    // Gargara / Ağız Spreyi
    dosage = form === 'Sprey/İnhaler' ? 'Boğaza 2–3 Puf' : '1 Ölçek Gargara';
    duration = '7 Gün';
    instructions = 'Yemeklerden sonra uygulayınız ve tükürünüz (yutmayınız). Uyguladıktan sonra 30 dakika bir şey yiyip içmeyiniz.';
    morning = true; noon = true; evening = true; night = false;
    morningDose = '1'; noonDose = '1'; eveningDose = '1'; nightDose = '-';
    mealTiming = 'TOK';
  } else if (brandLower.includes('muscoril') || brandLower.includes('cabral') || generic.includes('thiocolchicoside')) {
    // Kas Gevşetici
    dosage = '1 Kapsül/Tablet';
    duration = '5–7 Gün';
    instructions = 'Günde 2 kez sabah-akşam tok karnına alınız. Hafif uyku hali yapabilir.';
    morning = true; noon = false; evening = true; night = false;
    morningDose = '1'; noonDose = '-'; eveningDose = '1'; nightDose = '-';
    mealTiming = 'TOK';
  }

  return {
    id,
    name: brand,
    generic: drug.generic,
    form,
    dosage,
    morning,
    noon,
    evening,
    night,
    morningDose,
    noonDose,
    eveningDose,
    nightDose,
    mealTiming,
    duration,
    instructions
  };
}

/**
 * Sık Karşılaşılan Hazır Poliklinik Reçete Paketleri
 */
export const PRESCRIPTION_PRESETS: PrescriptionPreset[] = [
  {
    id: 'rx-tonsillit',
    title: 'Akut Tonsillit & Faranjit',
    diagnosis: 'J03.9 Akut Tonsillit, Tanımlanmamış',
    drugs: [
      {
        id: 'p-1',
        name: 'AMOKLAVIN BID 1000 MG 10 FILM TABLET',
        generic: 'Amoksisilin + Klavulanik Asit',
        form: 'Tablet',
        dosage: '1 Tablet (12 saatte bir)',
        morning: true, noon: false, evening: true, night: false,
        morningDose: '1', noonDose: '-', eveningDose: '1', nightDose: '-',
        mealTiming: 'TOK',
        duration: '10 Gün (Kutu Bitene Kadar)',
        instructions: 'Yemek başında veya tok karnına alınız. İyileşseniz dahi 10 günü mutlaka tamamlayınız.'
      },
      {
        id: 'p-2',
        name: 'PAROL 500 MG 20 TABLET',
        generic: 'Parasetamol',
        form: 'Tablet',
        dosage: '1 Tablet',
        morning: true, noon: true, evening: true, night: false,
        morningDose: '1', noonDose: '1', eveningDose: '1', nightDose: '-',
        mealTiming: 'TOK',
        duration: '3–5 Gün (Gerektiğinde)',
        instructions: 'Ateş ve boğaz ağrısı durumunda 8 saatte bir tok karnına alınız.'
      },
      {
        id: 'p-3',
        name: 'ANDOREX GARGARA 200 ML',
        generic: 'Klorheksidin + Benzidamin',
        form: 'Gargara',
        dosage: '1 Ölçek (15 mL)',
        morning: true, noon: true, evening: true, night: false,
        morningDose: '1', noonDose: '1', eveningDose: '1', nightDose: '-',
        mealTiming: 'TOK',
        duration: '7 Gün',
        instructions: 'Yemekten sonra ağzı çalkalayıp tükürünüz (yutmayınız). Sonrasında 30 dk su içmeyiniz.'
      }
    ]
  },
  {
    id: 'rx-gastrit',
    title: 'Akut Gastrit & Dispepsi',
    diagnosis: 'K29.7 Gastrit, Tanımlanmamış',
    drugs: [
      {
        id: 'p-4',
        name: 'PANTPAS 40 MG 28 ENTERIK TABLET',
        generic: 'Pantoprazol',
        form: 'Tablet',
        dosage: '1 Tablet (Sabah Aç)',
        morning: true, noon: false, evening: false, night: false,
        morningDose: '1', noonDose: '-', eveningDose: '-', nightDose: '-',
        mealTiming: 'AC',
        duration: '1 Ay (28 Gün)',
        instructions: 'Sabah kahvaltıdan 30 dakika önce aç karnına bir bardak su ile bütün olarak yutunuz.'
      },
      {
        id: 'p-5',
        name: 'RENNIE DUO ORAL SUSPANSIYON 100 ML',
        generic: 'Kalsiyum Karbonat + Magnezyum Karbonat',
        form: 'Şurup',
        dosage: '1–2 Ölçek',
        morning: true, noon: true, evening: true, night: true,
        morningDose: '1', noonDose: '1', eveningDose: '1', nightDose: '1',
        mealTiming: 'TOK',
        duration: '10 Gün (Şikayet Durumunda)',
        instructions: 'Yemeklerden 1 saat sonra ve gece yatarken alınız. Kullanmadan önce şişeyi çalkalayınız.'
      }
    ]
  },
  {
    id: 'rx-kas-iskelet',
    title: 'Kas-İskelet Ağrısı & Bel Spazmı',
    diagnosis: 'M54.5 Bel Ağrısı / Kas Spazmı',
    drugs: [
      {
        id: 'p-6',
        name: 'ARVELES 25 MG 20 FILM TABLET',
        generic: 'Deksketoprofen Trometamol',
        form: 'Tablet',
        dosage: '1 Tablet',
        morning: true, noon: false, evening: true, night: false,
        morningDose: '1', noonDose: '-', eveningDose: '1', nightDose: '-',
        mealTiming: 'TOK',
        duration: '5 Gün (Ağrıda)',
        instructions: 'Mutlaka tok karnına alınız. Şiddetli ağrıda 8-12 saatte bir alınabilir.'
      },
      {
        id: 'p-7',
        name: 'MUSCORIL 4 MG 20 KAPSUL',
        generic: 'Tiyokolşikosid',
        form: 'Kapsül',
        dosage: '1 Kapsül',
        morning: true, noon: false, evening: true, night: false,
        morningDose: '1', noonDose: '-', eveningDose: '1', nightDose: '-',
        mealTiming: 'TOK',
        duration: '5 Gün',
        instructions: 'Sabah-akşam tok karnına alınız. Hafif sersemlik hissi yapabilir.'
      },
      {
        id: 'p-8',
        name: 'LANSOR 30 MG 28 MIKROPELLET KAPSUL',
        generic: 'Lansoprazol',
        form: 'Kapsül',
        dosage: '1 Kapsül (Sabah)',
        morning: true, noon: false, evening: false, night: false,
        morningDose: '1', noonDose: '-', eveningDose: '-', nightDose: '-',
        mealTiming: 'AC',
        duration: 'Ağrı Kesici Tedavisi Boyunca',
        instructions: 'Mideyi korumak amacıyla sabah kahvaltıdan önce aç karnına alınız.'
      }
    ]
  },
  {
    id: 'rx-pediatrik-ates',
    title: 'Pediatrik Ateş & Ağrı',
    diagnosis: 'R50.9 Ateş, Tanımlanmamış',
    drugs: [
      {
        id: 'p-9',
        name: 'CALPOL 120 MG/5 ML SUSPANSIYON 150 ML',
        generic: 'Parasetamol',
        form: 'Şurup',
        dosage: '1–1.5 Ölçek (Kiloya Göre)',
        morning: true, noon: true, evening: true, night: false,
        morningDose: '1', noonDose: '1', eveningDose: '1', nightDose: '-',
        mealTiming: 'TOK',
        duration: '3–4 Gün (Ateş Varsa)',
        instructions: 'Ateş 38°C üzerine çıktığında 6 saat arayla tok karnına veriniz. 24 saatte en fazla 4 kez veriniz.'
      },
      {
        id: 'p-10',
        name: 'DOLVEN 100 MG/5 ML PEDIATRIK SURUP 100 ML',
        generic: 'İbuprofen',
        form: 'Şurup',
        dosage: '1 Ölçek (5 mL)',
        morning: true, noon: false, evening: true, night: false,
        morningDose: '1', noonDose: '-', eveningDose: '1', nightDose: '-',
        mealTiming: 'TOK',
        duration: '3 Gün (Dirençli Ateşte)',
        instructions: 'Parasetamole dirençli yüksek ateşte 8 saat arayla, mutlaka tok karnına veriniz. Bol sıvı tükettiriniz.'
      }
    ]
  }
];

/**
 * Resmi Hasta İlaç Kullanım Çizelgesi HTML Üreticisi (A4 Print Ready)
 */
export function generatePrescriptionHTML(
  patient: PrescriptionPrintPatientInfo,
  schedules: PrintableDrugSchedule[]
): string {
  const today = patient.dateStr || new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const doctor = patient.doctorName || 'Dr. Hekim Kaşe / İmza';
  const name = patient.patientName || 'Sayın Hasta';
  const age = patient.age || '--';
  const weight = patient.weightKg ? `${patient.weightKg} kg` : '--';
  const gender = patient.gender || '--';
  const diagnosis = patient.diagnosis || 'Klinik Muayene & Tedavi';
  const rxNumber = patient.rxNumber || `RX-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const allergy = patient.allergyNotes || 'Bilinen İlaç Alerjisi Yok';
  const clinic = patient.clinicTitle || 'T.C. SAĞLIK BAKANLIĞI / POLİKLİNİK';

  const rowsHtml = schedules.map((item, idx) => {
    const morningVal = item.morningDose && item.morningDose !== '-' ? item.morningDose : (item.morning ? '1' : '-');
    const noonVal = item.noonDose && item.noonDose !== '-' ? item.noonDose : (item.noon ? '1' : '-');
    const eveningVal = item.eveningDose && item.eveningDose !== '-' ? item.eveningDose : (item.evening ? '1' : '-');
    const nightVal = item.nightDose && item.nightDose !== '-' ? item.nightDose : (item.night ? '1' : '-');

    let mealBadge = '<span class="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Farketmez</span>';
    if (item.mealTiming === 'TOK') {
      mealBadge = '<span class="text-emerald-800 bg-emerald-100 font-bold px-1.5 py-0.5 rounded text-[10px] border border-emerald-300">TOK</span>';
    } else if (item.mealTiming === 'AC') {
      mealBadge = '<span class="text-rose-800 bg-rose-100 font-bold px-1.5 py-0.5 rounded text-[10px] border border-rose-300">AÇ</span>';
    } else if (item.mealTiming === 'GECE') {
      mealBadge = '<span class="text-indigo-800 bg-indigo-100 font-bold px-1.5 py-0.5 rounded text-[10px] border border-indigo-300">YATARKEN</span>';
    }

    return `
      <tr class="border-b border-slate-300 hover:bg-slate-50/50">
        <td class="p-2 text-xs font-semibold text-slate-900 border-r border-slate-200">
          <div class="font-bold text-slate-900">${idx + 1}. ${item.name}</div>
          <div class="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
            ${item.generic ? `<span>${item.generic}</span>` : ''}
            ${item.form ? `<span class="bg-slate-200 text-slate-700 px-1 rounded text-[9px]">${item.form}</span>` : ''}
          </div>
        </td>
        <td class="p-2 text-xs font-mono text-center text-slate-800 border-r border-slate-200 font-semibold">${item.dosage}</td>
        <td class="p-2 text-xs font-mono text-center border-r border-slate-200 ${morningVal !== '-' ? 'font-bold text-slate-900 bg-amber-100/60' : 'text-slate-300'}">
          ${morningVal}
        </td>
        <td class="p-2 text-xs font-mono text-center border-r border-slate-200 ${noonVal !== '-' ? 'font-bold text-slate-900 bg-amber-100/60' : 'text-slate-300'}">
          ${noonVal}
        </td>
        <td class="p-2 text-xs font-mono text-center border-r border-slate-200 ${eveningVal !== '-' ? 'font-bold text-slate-900 bg-amber-100/60' : 'text-slate-300'}">
          ${eveningVal}
        </td>
        <td class="p-2 text-xs font-mono text-center border-r border-slate-200 ${nightVal !== '-' ? 'font-bold text-slate-900 bg-indigo-100/60' : 'text-slate-300'}">
          ${nightVal}
        </td>
        <td class="p-2 text-xs text-center border-r border-slate-200">
          ${mealBadge}
        </td>
        <td class="p-2 text-xs font-mono text-center text-slate-700 border-r border-slate-200">
          ${item.duration || 'Biten Kadar'}
        </td>
        <td class="p-2 text-[11px] text-slate-800 leading-snug">
          <div>${item.instructions}</div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="p-6 bg-white text-slate-900 font-sans max-w-[210mm] mx-auto border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
      <!-- 1. ÜST BAŞLIK ALANI -->
      <div class="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-3">
        <div>
          <div class="text-[11px] font-bold text-slate-600 tracking-wider uppercase">${clinic}</div>
          <div class="text-base sm:text-lg font-extrabold text-slate-950 tracking-wide uppercase">HASTA İLAÇ KULLANIM ÇİZELGESİ & DOZAJ PLANI</div>
          <div class="text-[10px] text-slate-500 font-mono">Akılcı İlaç Yönetimi & Doz Takip Sistemi</div>
        </div>
        <div class="text-right text-xs font-mono space-y-0.5">
          <div><strong class="text-slate-700">Tarih:</strong> <span class="font-bold text-slate-900">${today}</span></div>
          <div class="text-[10px] bg-slate-100 px-2 py-0.5 rounded border border-slate-300"><strong>${rxNumber}</strong></div>
        </div>
      </div>

      <!-- 2. HASTA VE TANI BİLGİ KARTI -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/80 border border-slate-300 rounded-lg p-2.5 mb-3 text-xs">
        <div><span class="text-slate-500">Hasta Adı:</span> <strong class="text-slate-900 block truncate">${name}</strong></div>
        <div><span class="text-slate-500">Yaş / Cinsiyet:</span> <strong class="text-slate-900 font-mono block">${age} / ${gender}</strong></div>
        <div><span class="text-slate-500">Kilo:</span> <strong class="text-slate-900 font-mono block">${weight}</strong></div>
        <div><span class="text-slate-500">Ön Tanı:</span> <strong class="text-slate-900 block truncate" title="${diagnosis}">${diagnosis}</strong></div>
      </div>

      <!-- Alerji Uyarısı Varsa -->
      ${allergy.toLowerCase().includes('yok') ? '' : `
      <div class="bg-red-50 border border-red-300 text-red-800 px-3 py-1 rounded text-xs mb-3 font-semibold flex items-center gap-2">
        <span>⚠️</span> <span>İLAÇ ALERJİSİ: ${allergy}</span>
      </div>
      `}

      <!-- 3. İLAÇ ÇİZELGE TABLOSU -->
      <table class="w-full text-left border-collapse border border-slate-300 mb-4">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-300 text-slate-700 text-[10px] uppercase font-bold tracking-wider">
            <th class="p-2 border-r border-slate-300 w-1/4">İlaç Adı & Formu</th>
            <th class="p-2 border-r border-slate-300 text-center w-20">Tek Doz</th>
            <th class="p-2 border-r border-slate-300 text-center w-12" title="Sabah">🌅 Sabah</th>
            <th class="p-2 border-r border-slate-300 text-center w-12" title="Öğle">☀️ Öğle</th>
            <th class="p-2 border-r border-slate-300 text-center w-12" title="Akşam">🌆 Akşam</th>
            <th class="p-2 border-r border-slate-300 text-center w-12" title="Gece / Yatarken">🌙 Gece</th>
            <th class="p-2 border-r border-slate-300 text-center w-16">Öğün</th>
            <th class="p-2 border-r border-slate-300 text-center w-20">Süre</th>
            <th class="p-2 text-left">Kullanım Talimatı & Dikkat Edilecekler</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="9" class="p-4 text-center text-xs text-slate-500 italic">Reçetelenmiş ilaç bulunmamaktadır.</td></tr>`}
        </tbody>
      </table>

      <!-- 4. HASTA BİLGİLENDİRME & HEKİM KAŞE İMZA -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t-2 border-slate-800 text-xs">
        <div class="sm:col-span-2 text-[10px] text-slate-600 space-y-1">
          <div class="font-bold text-slate-800">Önemli Hasta Bilgilendirmesi & Acil Uyarılar:</div>
          <div>• İlaçlarınızı belirtilen saatlerde ve aç/tok durumuna uygun olarak düzenli alınız.</div>
          <div>• Antibiyotik tedavisi başlandıysa, şikayetleriniz azalsa dahi kutu bitene kadar ilacı kesmeyiniz.</div>
          <div>• İlaç alımından sonra ciltte döküntü, nefes darlığı, yüzde/dudakta şişme olursa derhal acil servise başvurunuz.</div>
          <div>• Başka bir hekime veya eczaneye başvurduğunuzda bu kullanım çizelgesini gösteriniz.</div>
        </div>
        <div class="border border-dashed border-slate-400 rounded-lg p-3 text-center flex flex-col justify-between min-h-[90px] bg-slate-50/50">
          <div class="text-[10px] text-slate-500 font-semibold uppercase">Hekim Kaşe & İmza</div>
          <div class="text-xs font-bold text-slate-900">${doctor}</div>
        </div>
      </div>
    </div>
  `;
}
