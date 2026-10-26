import { appState } from '../state';
import {
  buildDefaultDrugSchedule,
  generatePrescriptionHTML,
  PRESCRIPTION_PRESETS,
  type PrintableDrugSchedule,
  type PrescriptionPrintPatientInfo
} from '../utils/prescriptionPrinter';
import { evaluatePrescriptionInteractions } from '../engines/interactionTierEngine';


const escapeHtml = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const getEl = <T extends HTMLElement = HTMLElement>(id: string): T | null => {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id) as T | null;
};

export function initPrescriptionModalController(): void {
  if (typeof document === 'undefined') return;

  const btnPrintRx = getEl('btn-print-rx');
  const modalPrint = getEl('modal-prescription-print');
  const btnClosePrint = getEl('btn-close-print-modal');
  const btnTriggerPrint = getEl('btn-trigger-print');
  const containerPreview = getEl('container-prescription-preview');
  const printableArea = getEl('printable-prescription-container');
  const inputPatientName = getEl<HTMLInputElement>('input-print-patient-name');
  const inputDoctorName = getEl<HTMLInputElement>('input-print-doctor-name');
  const inputPrintDate = getEl<HTMLInputElement>('input-print-date');
  const inputPrintDiagnosis = getEl<HTMLInputElement>('input-print-diagnosis');
  const inputPrintRxNumber = getEl<HTMLInputElement>('input-print-rx-number');
  const inputPrintAllergy = getEl<HTMLInputElement>('input-print-allergy');
  const btnTabRxEditor = getEl('btn-tab-rx-editor');
  const btnTabRxPreview = getEl('btn-tab-rx-preview');
  const panelRxEditor = getEl('panel-rx-editor');
  const panelRxPreview = getEl('panel-rx-preview');
  const selectRxPreset = getEl<HTMLSelectElement>('select-rx-preset');
  const btnAddRxDrug = getEl('btn-add-rx-drug');
  const containerRxEditorList = getEl('container-rx-editor-list');
  const rxDrugsCountBadge = getEl('rx-drugs-count-badge');

  let activePrescriptionDrugs: PrintableDrugSchedule[] = [];

  function switchRxTab(tab: 'editor' | 'preview'): void {
    if (!btnTabRxEditor || !btnTabRxPreview || !panelRxEditor || !panelRxPreview) return;
    if (tab === 'editor') {
      btnTabRxEditor.className = 'px-3 py-1.5 rounded-lg bg-slate-800 text-rose-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all';
      btnTabRxPreview.className = 'px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all';
      panelRxEditor.classList.remove('hidden');
      panelRxPreview.classList.add('hidden');
    } else {
      btnTabRxPreview.className = 'px-3 py-1.5 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all';
      btnTabRxEditor.className = 'px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all';
      panelRxPreview.classList.remove('hidden');
      panelRxEditor.classList.add('hidden');
      refreshPrescriptionPreview();
    }
  }

  function refreshPrescriptionPreview(): void {
    if (!containerPreview) return;
    const patientInfo: PrescriptionPrintPatientInfo = {
      patientName: inputPatientName?.value || 'Sayın Hasta',
      age: appState.biometry.ageFormatted || getEl('banner-age')?.textContent || '--',
      gender: appState.biometry.gender === 'male' ? 'Erkek' : (appState.biometry.gender === 'female' ? 'Kadın' : '--'),
      weightKg: appState.biometry.weightKg || undefined,
      dateStr: inputPrintDate?.value || new Date().toLocaleDateString('tr-TR'),
      doctorName: inputDoctorName?.value || 'Dr. Hekim Kaşe & İmza',
      diagnosis: inputPrintDiagnosis?.value || 'Klinik Muayene & Tedavi',
      rxNumber: inputPrintRxNumber?.value || `RX-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      allergyNotes: inputPrintAllergy?.value || 'Bilinen İlaç Alerjisi Yok'
    };

    const html = generatePrescriptionHTML(patientInfo, activePrescriptionDrugs);
    containerPreview.innerHTML = html;
    if (printableArea) {
      printableArea.innerHTML = html;
    }
  }

  function renderRxEditorList(): void {
    if (!containerRxEditorList) return;
    if (rxDrugsCountBadge) {
      rxDrugsCountBadge.textContent = `${activePrescriptionDrugs.length} İlaç`;
    }

    if (activePrescriptionDrugs.length === 0) {
      containerRxEditorList.innerHTML = `
        <div class="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-400 space-y-1.5">
          <p class="text-xs font-semibold text-slate-300">Reçeteye henüz ilaç eklenmedi.</p>
          <p class="text-[11px] text-slate-500">Yukarıdaki <strong>"+ İlaç Ekle"</strong> butonunu kullanabilir veya hazır bir reçete paketi seçebilirsiniz.</p>
        </div>
      `;
      refreshPrescriptionPreview();
      return;
    }

    const safetyResult = evaluatePrescriptionInteractions(
      activePrescriptionDrugs.map(d => ({ name: d.name, generic: d.generic })),
      {
        ageYears: appState.biometry.ageYears,
        ageDays: appState.biometry.ageDays,
        weightKg: appState.biometry.weightKg || undefined,
        diagnosis: inputPrintDiagnosis?.value || undefined
      }
    );

    let safetyBannerHTML = '';
    if (safetyResult.totalAlertsCount > 0) {
      safetyBannerHTML = `
        <div class="space-y-2 mb-3">
          ${safetyResult.alerts.map(a => {
            if (a.tier === 1) {
              return `
                <div class="p-3 rounded-xl bg-rose-950/70 border-2 border-rose-600 text-rose-200 text-xs space-y-1">
                  <div class="flex items-center justify-between font-bold text-rose-300">
                    <span class="flex items-center gap-1.5">${a.badgeLabel}</span>
                    <span class="text-[10px] font-mono uppercase bg-rose-900/80 px-2 py-0.5 rounded border border-rose-500">${a.ruleId}</span>
                  </div>
                  <p class="font-semibold text-white">${escapeHtml(a.alertTitle)}</p>
                  <p class="text-rose-100/90 leading-relaxed">${escapeHtml(a.message)}</p>
                  <div class="text-[10px] text-rose-300 font-mono pt-1">
                    Kılavuz / Kaynak: ${escapeHtml(a.guidelineSource)}
                  </div>
                </div>
              `;
            } else if (a.tier === 2) {
              return `
                <div class="p-3 rounded-xl bg-amber-950/60 border border-amber-600 text-amber-200 text-xs space-y-1">
                  <div class="flex items-center justify-between font-bold text-amber-300">
                    <span class="flex items-center gap-1.5">${a.badgeLabel}</span>
                    <span class="text-[10px] font-mono uppercase bg-amber-900/80 px-2 py-0.5 rounded border border-amber-500">${a.ruleId}</span>
                  </div>
                  <p class="font-semibold text-white">${escapeHtml(a.alertTitle)}</p>
                  <p class="text-amber-100/90 leading-relaxed">${escapeHtml(a.message)}</p>
                </div>
              `;
            } else if (a.tier === 3) {
              return `
                <div class="p-2.5 rounded-xl bg-yellow-950/40 border border-yellow-700/60 text-yellow-200 text-xs space-y-1">
                  <div class="flex items-center justify-between font-semibold text-yellow-300">
                    <span>${a.badgeLabel}</span>
                    <span class="text-[10px] font-mono">${a.ruleId}</span>
                  </div>
                  <p class="text-yellow-100/90">${escapeHtml(a.message)}</p>
                </div>
              `;
            } else {
              return `
                <div class="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800 text-cyan-200 text-xs space-y-1">
                  <div class="flex items-center justify-between font-semibold text-cyan-300">
                    <span>${a.badgeLabel}</span>
                    <span class="text-[10px] font-mono text-cyan-400">${a.ruleId}</span>
                  </div>
                  <p class="text-cyan-100/90 leading-relaxed">${escapeHtml(a.message)}</p>
                  <div class="text-[10px] text-cyan-400 font-mono">
                    Kanıt: ${escapeHtml(a.evidenceLevel)}
                  </div>
                </div>
              `;
            }
          }).join('')}
        </div>
      `;
    }

    if (btnTriggerPrint) {
      if (safetyResult.hasHardStop) {
        btnTriggerPrint.classList.add('opacity-50');
        btnTriggerPrint.title = 'Reçetede kesin kontrendikasyon (Hard Stop) bulunmaktadır!';
      } else {
        btnTriggerPrint.classList.remove('opacity-50');
        btnTriggerPrint.title = 'Reçeteyi Yazdır / PDF İndir';
      }
    }

    const itemsHTML = activePrescriptionDrugs.map((d, idx) => `
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2.5 transition-all hover:border-slate-700" data-rx-idx="${idx}">
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center font-mono">${idx + 1}</span>
            <input type="text" class="rx-input-name flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-rose-500" value="${escapeHtml(d.name)}" placeholder="İlaç Adı ve Formu">

          </div>
          <div class="flex items-center gap-1.5">
            <select class="rx-select-form bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300">
              <option value="Tablet" ${d.form === 'Tablet' ? 'selected' : ''}>Tablet</option>
              <option value="Kapsül" ${d.form === 'Kapsül' ? 'selected' : ''}>Kapsül</option>
              <option value="Şurup" ${d.form === 'Şurup' ? 'selected' : ''}>Şurup</option>
              <option value="Damla" ${d.form === 'Damla' ? 'selected' : ''}>Damla</option>
              <option value="Sprey/İnhaler" ${d.form === 'Sprey/İnhaler' ? 'selected' : ''}>Sprey/İnhaler</option>
              <option value="Krem/Merhem" ${d.form === 'Krem/Merhem' ? 'selected' : ''}>Krem/Merhem</option>
              <option value="Gargara" ${d.form === 'Gargara' ? 'selected' : ''}>Gargara</option>
              <option value="Saşe" ${d.form === 'Saşe' ? 'selected' : ''}>Saşe</option>
              <option value="Fitil" ${d.form === 'Fitil' ? 'selected' : ''}>Fitil</option>
            </select>
            <button type="button" class="rx-btn-delete text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800 text-xs font-bold transition-colors" title="İlacı Kaldır">✕</button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-7 gap-1.5 text-xs">
          <div>
            <label class="text-[9px] text-slate-400 block mb-0.5">Tek Doz:</label>
            <input type="text" class="rx-input-dosage w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 font-mono" value="${escapeHtml(d.dosage)}" placeholder="1 Tablet">
          </div>
          <div class="text-center">
            <label class="text-[9px] text-amber-300 block mb-0.5">Sabah</label>
            <input type="text" class="rx-input-morning w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[11px] text-center font-mono ${d.morningDose !== '-' ? 'text-amber-300 font-bold' : 'text-slate-500'}" value="${escapeHtml(d.morningDose || (d.morning ? '1' : '-'))}" placeholder="-">
          </div>
          <div class="text-center">
            <label class="text-[9px] text-amber-300 block mb-0.5">Öğle</label>
            <input type="text" class="rx-input-noon w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[11px] text-center font-mono ${d.noonDose !== '-' ? 'text-amber-300 font-bold' : 'text-slate-500'}" value="${escapeHtml(d.noonDose || (d.noon ? '1' : '-'))}" placeholder="-">
          </div>
          <div class="text-center">
            <label class="text-[9px] text-amber-300 block mb-0.5">Akşam</label>
            <input type="text" class="rx-input-evening w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[11px] text-center font-mono ${d.eveningDose !== '-' ? 'text-amber-300 font-bold' : 'text-slate-500'}" value="${escapeHtml(d.eveningDose || (d.evening ? '1' : '-'))}" placeholder="-">
          </div>
          <div class="text-center">
            <label class="text-[9px] text-indigo-300 block mb-0.5">Gece</label>
            <input type="text" class="rx-input-night w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[11px] text-center font-mono ${d.nightDose !== '-' ? 'text-indigo-300 font-bold' : 'text-slate-500'}" value="${escapeHtml(d.nightDose || (d.night ? '1' : '-'))}" placeholder="-">
          </div>
          <div>
            <label class="text-[9px] text-slate-400 block mb-0.5">Öğün Durumu:</label>
            <select class="rx-select-meal w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-200">
              <option value="TOK" ${d.mealTiming === 'TOK' ? 'selected' : ''}>TOK</option>
              <option value="AC" ${d.mealTiming === 'AC' ? 'selected' : ''}>AÇ</option>
              <option value="YEMEKLE" ${d.mealTiming === 'YEMEKLE' ? 'selected' : ''}>YEMEKLE</option>
              <option value="GECE" ${d.mealTiming === 'GECE' ? 'selected' : ''}>YATARKEN</option>
              <option value="FARKETMEZ" ${d.mealTiming === 'FARKETMEZ' ? 'selected' : ''}>Farketmez</option>
            </select>
          </div>
          <div>
            <label class="text-[9px] text-slate-400 block mb-0.5">Kullanım Süresi:</label>
            <input type="text" class="rx-input-duration w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200" value="${escapeHtml(d.duration || '7 Gün')}" placeholder="Örn: 7 Gün">
          </div>
        </div>

        <div>
          <label class="text-[9px] text-slate-400 block mb-0.5">Kullanım Talimatı & Uyarılar:</label>
          <input type="text" class="rx-input-instructions w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-rose-500" value="${escapeHtml(d.instructions)}">
        </div>
      </div>
    `).join('');

    containerRxEditorList.innerHTML = safetyBannerHTML + itemsHTML;

    const rowCards = containerRxEditorList.querySelectorAll<HTMLDivElement>('[data-rx-idx]');

    rowCards.forEach(card => {
      const idx = parseInt(card.getAttribute('data-rx-idx') || '0', 10);
      const target = activePrescriptionDrugs[idx];
      if (!target) return;

      const nameInp = card.querySelector<HTMLInputElement>('.rx-input-name');
      const formSel = card.querySelector<HTMLSelectElement>('.rx-select-form');
      const dosageInp = card.querySelector<HTMLInputElement>('.rx-input-dosage');
      const morningInp = card.querySelector<HTMLInputElement>('.rx-input-morning');
      const noonInp = card.querySelector<HTMLInputElement>('.rx-input-noon');
      const eveningInp = card.querySelector<HTMLInputElement>('.rx-input-evening');
      const nightInp = card.querySelector<HTMLInputElement>('.rx-input-night');
      const mealSel = card.querySelector<HTMLSelectElement>('.rx-select-meal');
      const durationInp = card.querySelector<HTMLInputElement>('.rx-input-duration');
      const instrInp = card.querySelector<HTMLInputElement>('.rx-input-instructions');
      const delBtn = card.querySelector<HTMLButtonElement>('.rx-btn-delete');

      if (nameInp) nameInp.addEventListener('input', () => { target.name = nameInp.value; refreshPrescriptionPreview(); });
      if (formSel) formSel.addEventListener('change', () => { target.form = formSel.value; refreshPrescriptionPreview(); });
      if (dosageInp) dosageInp.addEventListener('input', () => { target.dosage = dosageInp.value; refreshPrescriptionPreview(); });
      if (morningInp) morningInp.addEventListener('input', () => {
        target.morningDose = morningInp.value;
        target.morning = morningInp.value !== '-' && morningInp.value !== '0' && morningInp.value.trim() !== '';
        refreshPrescriptionPreview();
      });
      if (noonInp) noonInp.addEventListener('input', () => {
        target.noonDose = noonInp.value;
        target.noon = noonInp.value !== '-' && noonInp.value !== '0' && noonInp.value.trim() !== '';
        refreshPrescriptionPreview();
      });
      if (eveningInp) eveningInp.addEventListener('input', () => {
        target.eveningDose = eveningInp.value;
        target.evening = eveningInp.value !== '-' && eveningInp.value !== '0' && eveningInp.value.trim() !== '';
        refreshPrescriptionPreview();
      });
      if (nightInp) nightInp.addEventListener('input', () => {
        target.nightDose = nightInp.value;
        target.night = nightInp.value !== '-' && nightInp.value !== '0' && nightInp.value.trim() !== '';
        refreshPrescriptionPreview();
      });
      if (mealSel) mealSel.addEventListener('change', () => { target.mealTiming = mealSel.value as PrintableDrugSchedule['mealTiming']; refreshPrescriptionPreview(); });
      if (durationInp) durationInp.addEventListener('input', () => { target.duration = durationInp.value; refreshPrescriptionPreview(); });
      if (instrInp) instrInp.addEventListener('input', () => { target.instructions = instrInp.value; refreshPrescriptionPreview(); });

      if (delBtn) {
        delBtn.addEventListener('click', () => {
          activePrescriptionDrugs.splice(idx, 1);
          renderRxEditorList();
        });
      }
    });

    refreshPrescriptionPreview();
  }

  function openPrescriptionModal(): void {
    if (!modalPrint) return;
    modalPrint.classList.remove('hidden');

    if (inputPrintDate && !inputPrintDate.value) {
      inputPrintDate.value = new Date().toLocaleDateString('tr-TR');
    }
    if (inputPrintRxNumber && !inputPrintRxNumber.value) {
      inputPrintRxNumber.value = `RX-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const selectedDrugs = (appState.treatment && appState.treatment.selectedDrugs) ? appState.treatment.selectedDrugs : [];
    if (activePrescriptionDrugs.length === 0 && selectedDrugs.length > 0) {
      const isChild = !!appState.biometry.isNeonate || (appState.biometry.ageYears !== null && appState.biometry.ageYears < 18);
      activePrescriptionDrugs = selectedDrugs.map(d => buildDefaultDrugSchedule(d, appState.biometry.weightKg || undefined, isChild));
    }

    renderRxEditorList();
    switchRxTab('editor');
  }

  function closePrescriptionModal(): void {
    if (!modalPrint) return;
    modalPrint.classList.add('hidden');
  }

  if (btnPrintRx) btnPrintRx.addEventListener('click', openPrescriptionModal);
  if (btnClosePrint) btnClosePrint.addEventListener('click', closePrescriptionModal);
  if (modalPrint) {
    modalPrint.addEventListener('click', (e) => {
      if (e.target === modalPrint) closePrescriptionModal();
    });
  }

  if (btnTabRxEditor) btnTabRxEditor.addEventListener('click', () => switchRxTab('editor'));
  if (btnTabRxPreview) btnTabRxPreview.addEventListener('click', () => switchRxTab('preview'));

  if (btnAddRxDrug) {
    btnAddRxDrug.addEventListener('click', () => {
      const newDrug: PrintableDrugSchedule = {
        id: `rx-custom-${Date.now()}`,
        name: 'Yeni İlaç',
        form: 'Tablet',
        dosage: '1 Tablet',
        morning: true,
        noon: false,
        evening: true,
        night: false,
        morningDose: '1',
        noonDose: '-',
        eveningDose: '1',
        nightDose: '-',
        mealTiming: 'TOK',
        duration: '7 Gün',
        instructions: 'Günde 2 kez tok karnına alınız.'
      };
      activePrescriptionDrugs.push(newDrug);
      renderRxEditorList();
    });
  }

  if (selectRxPreset) {
    selectRxPreset.addEventListener('change', () => {
      const presetId = selectRxPreset.value;
      if (!presetId) return;
      const preset = PRESCRIPTION_PRESETS.find(p => p.id === presetId);
      if (preset) {
        activePrescriptionDrugs = JSON.parse(JSON.stringify(preset.drugs));
        if (inputPrintDiagnosis) inputPrintDiagnosis.value = preset.diagnosis;
        renderRxEditorList();
      }
      selectRxPreset.value = '';
    });
  }

  if (inputPatientName) inputPatientName.addEventListener('input', refreshPrescriptionPreview);
  if (inputDoctorName) inputDoctorName.addEventListener('input', refreshPrescriptionPreview);
  if (inputPrintDate) inputPrintDate.addEventListener('input', refreshPrescriptionPreview);
  if (inputPrintDiagnosis) inputPrintDiagnosis.addEventListener('input', refreshPrescriptionPreview);
  if (inputPrintRxNumber) inputPrintRxNumber.addEventListener('input', refreshPrescriptionPreview);
  if (inputPrintAllergy) inputPrintAllergy.addEventListener('input', refreshPrescriptionPreview);

  if (btnTriggerPrint) {
    btnTriggerPrint.addEventListener('click', () => {
      refreshPrescriptionPreview();
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    });
  }
}
