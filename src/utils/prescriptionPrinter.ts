/**
 * KLİNİK KARAR DESTEK ASİSTANI - HASTA REÇETE VE DOZAJ ÇİZELGESİ YAZDIRMA MOTORU
 * 
 * Hekimin hastaya doğrudan teslim edebileceği, anlaşılır ve görsel
 * ilaç kullanım planı (A4 / PDF yazdırılabilir formatı).
 */

import type { SelectedDrugItem } from '../types/clinical';

export interface PrescriptionPrintPatientInfo {
  patientName?: string;
  age?: string;
  gender?: string;
  weightKg?: number;
  dateStr?: string;
  doctorName?: string;
  clinicalNotes?: string;
}

export interface PrintableDrugSchedule {
  name: string;
  generic?: string;
  dosage: string;
  morning: boolean;
  noon: boolean;
  evening: boolean;
  night: boolean;
  mealTiming: 'TOK' | 'AC' | 'FARKETMEZ';
  instructions: string;
}

export function buildDefaultDrugSchedule(drug: SelectedDrugItem): PrintableDrugSchedule {
  const brand = drug.brand || drug.brandName || drug.name || drug.generic || 'İlaç';
  const generic = (drug.generic || '').toLowerCase();
  const brandLower = brand.toLowerCase();

  let morning = true;
  let noon = false;
  let evening = true;
  let night = false;
  let mealTiming: 'TOK' | 'AC' | 'FARKETMEZ' = 'TOK';
  let instructions = 'Bol su ile içiniz.';
  let dosage = '1 Adet / Doz';

  // Klinik tipik dozlama şablonları
  if (generic.includes('amoxicillin') || brandLower.includes('amoklavin') || brandLower.includes('augmentin') || brandLower.includes('largopen')) {
    dosage = '1 Tablet (12 saat arayla)';
    instructions = 'Yemek başlangıcında veya tok karnına alınız. Antibiyotik kutusu bitene kadar düzenli kullanınız.';
    morning = true;
    noon = false;
    evening = true;
  } else if (generic.includes('clarithromycin') || brandLower.includes('klacid') || brandLower.includes('macrol')) {
    dosage = '1 Tablet (12 saat arayla)';
    instructions = 'Tok karnına alınız. Tedavi süresince greyfurt veya greyfurt suyu tüketmeyiniz.';
    morning = true;
    noon = false;
    evening = true;
  } else if (brandLower.includes('cipro') || generic.includes('ciprofloxacin')) {
    dosage = '1 Tablet (12 saat arayla)';
    instructions = 'Bol su ile alınız. Süt ürünleri, kalsiyum veya demir ilaçlarıyla aynı anda almayınız (en az 2 saat ara veriniz).';
    morning = true;
    noon = false;
    evening = true;
  } else if (generic.includes('paracetamol') || brandLower.includes('parol') || brandLower.includes('calpol')) {
    dosage = brandLower.includes('şurup') || brandLower.includes('surup') ? '1 Ölçek' : '1 Tablet';
    instructions = 'Ağrı veya ateş durumunda 6-8 saat arayla tok karnına alınız. Günlük maksimum dozu aşmayınız.';
    morning = true;
    noon = true;
    evening = true;
  } else if (brandLower.includes('arveles') || brandLower.includes('apranax') || generic.includes('dexketoprofen') || generic.includes('naproxen') || generic.includes('ibuprofen')) {
    dosage = '1 Tablet';
    instructions = 'Mutlaka TOK KARNINA alınız. Mide koruyucu ile birlikte kullanımı önerilir.';
    morning = true;
    noon = false;
    evening = true;
    mealTiming = 'TOK';
  } else if (brandLower.includes('delix') || generic.includes('ramipril') || generic.includes('perindopril') || generic.includes('losartan')) {
    dosage = '1 Tablet (Günde 1 kez)';
    instructions = 'Her gün aynı saatte (tercihen sabah) alınız.';
    morning = true;
    noon = false;
    evening = false;
  } else if (brandLower.includes('aldactone') || generic.includes('spironolactone')) {
    dosage = '1 Tablet (Sabah tok)';
    instructions = 'Sabah kahvaltısından sonra alınız. Potasyumlu tuz ikamelerinden kaçınınız.';
    morning = true;
    noon = false;
    evening = false;
  } else if (generic.includes('atorvastatin') || generic.includes('simvastatin') || brandLower.includes('lipitor') || brandLower.includes('crestor') || brandLower.includes('zocor')) {
    dosage = '1 Tablet (Akşam)';
    instructions = 'Her gün akşam yatmadan önce alınız. Açıklanamayan kas ağrısı olursa hekiminize bildiriniz.';
    morning = false;
    noon = false;
    evening = false;
    night = true;
  } else if (brandLower.includes('pantpas') || brandLower.includes('lansor') || generic.includes('pantoprazole') || generic.includes('lansoprazole')) {
    dosage = '1 Kapsül / Tablet';
    instructions = 'Sabah kahvaltıdan 30 DAKİKA ÖNCE AÇ KARNINA alınız.';
    morning = true;
    noon = false;
    evening = false;
    mealTiming = 'AC';
  }

  return {
    name: brand,
    generic: drug.generic,
    dosage,
    morning,
    noon,
    evening,
    night,
    mealTiming,
    instructions
  };
}

export function generatePrescriptionHTML(
  patient: PrescriptionPrintPatientInfo,
  schedules: PrintableDrugSchedule[]
): string {
  const today = patient.dateStr || new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const doctor = patient.doctorName || 'Dr. Hekim Kaşe / İmza';
  const name = patient.patientName || 'Sayın Hasta';
  const age = patient.age || '--';
  const weight = patient.weightKg ? `${patient.weightKg} kg` : '--';

  const rowsHtml = schedules.map((item, idx) => `
    <tr class="border-b border-slate-300">
      <td class="p-2 text-xs font-semibold text-slate-900">
        <div>${idx + 1}. ${item.name}</div>
        ${item.generic ? `<div class="text-[10px] text-slate-500 font-mono">${item.generic}</div>` : ''}
      </td>
      <td class="p-2 text-xs font-mono text-center text-slate-800">${item.dosage}</td>
      <td class="p-2 text-xs font-mono text-center ${item.morning ? 'font-bold text-slate-900 bg-amber-50/70' : 'text-slate-300'}">
        ${item.morning ? '1' : '-'}
      </td>
      <td class="p-2 text-xs font-mono text-center ${item.noon ? 'font-bold text-slate-900 bg-amber-50/70' : 'text-slate-300'}">
        ${item.noon ? '1' : '-'}
      </td>
      <td class="p-2 text-xs font-mono text-center ${item.evening ? 'font-bold text-slate-900 bg-amber-50/70' : 'text-slate-300'}">
        ${item.evening ? '1' : '-'}
      </td>
      <td class="p-2 text-xs font-mono text-center ${item.night ? 'font-bold text-slate-900 bg-blue-50/70' : 'text-slate-300'}">
        ${item.night ? '1' : '-'}
      </td>
      <td class="p-2 text-xs text-center font-bold">
        ${item.mealTiming === 'TOK' ? '<span class="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">TOK</span>' : 
          (item.mealTiming === 'AC' ? '<span class="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">AÇ</span>' : 
          '<span class="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Farketmez</span>')}
      </td>
      <td class="p-2 text-[11px] text-slate-700 leading-tight">${item.instructions}</td>
    </tr>
  `).join('');

  return `
    <div id="printable-prescription-document" class="p-6 bg-white text-slate-900 font-sans max-w-4xl mx-auto border border-slate-300 shadow-sm rounded-lg">
      <!-- Reçete Üst Başlık -->
      <div class="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-4">
        <div>
          <div class="text-base font-bold text-slate-900 tracking-wide uppercase">HASTA İLAÇ KULLANIM ÇİZELGESİ</div>
          <div class="text-[11px] text-slate-600">Klinik Karar Destek & Akılcı Farmakoterapi Asistanı</div>
        </div>
        <div class="text-right text-xs font-mono">
          <div><strong>Tarih:</strong> ${today}</div>
          <div class="text-[10px] text-slate-500">Kişiye Özel Dozaj Takip Formu</div>
        </div>
      </div>

      <!-- Hasta Demografisi -->
      <div class="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded p-2.5 mb-4 text-xs">
        <div><span class="text-slate-500">Hasta Adı:</span> <strong class="text-slate-900">${name}</strong></div>
        <div><span class="text-slate-500">Yaş:</span> <strong class="text-slate-900 font-mono">${age}</strong></div>
        <div><span class="text-slate-500">Kilo:</span> <strong class="text-slate-900 font-mono">${weight}</strong></div>
      </div>

      <!-- İlaç Çizelge Tablosu -->
      <table class="w-full text-left border-collapse border border-slate-300 mb-4">
        <thead>
          <tr class="bg-slate-100 border-b border-slate-300 text-slate-700 text-[11px] uppercase">
            <th class="p-2 border-r border-slate-300 w-1/3">İlaç Adı</th>
            <th class="p-2 border-r border-slate-300 text-center w-24">Doz</th>
            <th class="p-2 border-r border-slate-300 text-center w-12" title="Sabah">Sabah</th>
            <th class="p-2 border-r border-slate-300 text-center w-12" title="Öğle">Öğle</th>
            <th class="p-2 border-r border-slate-300 text-center w-12" title="Akşam">Akşam</th>
            <th class="p-2 border-r border-slate-300 text-center w-12" title="Gece / Yatarken">Gece</th>
            <th class="p-2 border-r border-slate-300 text-center w-20">Öğün</th>
            <th class="p-2 text-left">Kullanım Talimatı & Uyarılar</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="8" class="p-4 text-center text-xs text-slate-500 italic">Reçetelenmiş ilaç bulunmamaktadır.</td></tr>`}
        </tbody>
      </table>

      <!-- Genel Hasta Uyarıları & Hekim Kaşe/İmza -->
      <div class="grid grid-cols-3 gap-4 pt-2 border-t border-slate-300 text-xs">
        <div class="col-span-2 text-[10px] text-slate-600 space-y-1">
          <div class="font-bold text-slate-800">Önemli Hasta Bilgilendirmesi:</div>
          <div>• İlaçlarınızı hekiminizin ve eczacınızın belirttiği doz ve süre boyunca düzenli olarak alınız.</div>
          <div>• Belirtileriniz düzelse bile antibiyotik tedavinizi kutu bitmeden yarıda kesmeyiniz.</div>
          <div>• Beklenmeyen bir yan etki (alerji, döküntü, nefes darlığı, şiddetli kas ağrısı) gelişirse ilacı kesip derhal hekiminize danışınız.</div>
        </div>
        <div class="border border-dashed border-slate-400 rounded p-3 text-center flex flex-col justify-between min-h-[90px]">
          <div class="text-[10px] text-slate-500 font-semibold uppercase">Hekim Kaşe & İmza</div>
          <div class="text-xs font-bold text-slate-800">${doctor}</div>
        </div>
      </div>
    </div>
  `;
}
