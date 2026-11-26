import { appState } from '../state';
import {
  buildDefaultDrugSchedule,
  generatePrescriptionHTML,
  generatePrescriptionPlainText,
  PRESCRIPTION_PRESETS,
  type PrintableDrugSchedule,
  type PrescriptionPrintPatientInfo
} from '../utils/prescriptionPrinter';
import {
  evaluateUnifiedPrescriptionSafety,
  renderUnifiedModalSafetyBannerHTML
} from '../engines/unifiedSafetyOrchestrator';
import {
  loadOverrideAuditLog,
  recordOverrideAuditEntry
} from '../engines/cdsHooksActionEngine';
import { copyToClipboardWithFallback, updateLiveSOAP } from './workstationController';
import { renderSelectedDrugs } from './safetyAlertsController';
import {
  searchDrugsAsync,
  findCatalogDrugSync,
  type NormalizedDrugRecord
} from '../db/titckIndexedDB';
import { getSvgIcon } from '../utils/icons';
import { getChk, getNum } from '../utils/domUtils';

const STORAGE_DOCTOR_NAME_KEY = 'klinik_rx_doctor_name';
const STORAGE_DOCTOR_TITLE_KEY = 'klinik_rx_doctor_title';
const STORAGE_DOCTOR_DIPLOMA_KEY = 'klinik_rx_doctor_diploma';

function safeStorageGet(key: string): string {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) || '';
    }
  } catch {
    // Private browsing or Node without --localstorage-file
  }
  return '';
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (value.trim()) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore quota or disabled storage errors
  }
}

function clampBoxCount(raw: unknown): number {
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1) return 1;
  return Math.min(99, Math.floor(num));
}


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

let activePrescriptionDrugs: PrintableDrugSchedule[] = [];
let activeHardStopOverride: { signature: string; code: string; display: string; note?: string } | null = null;
let lastModalHasCritical = false;
const boundDocuments = new WeakSet<Document>();
let onPrescriptionTabsUpdate: (() => void) | undefined;

function getPrescriptionSignature(): string {
  return activePrescriptionDrugs
    .map(d => `${(d.atcCode || '').toUpperCase()}:${(d.name || '').toLowerCase()}`)
    .sort()
    .join('|');
}

export function resetPrescriptionData(): void {
  activePrescriptionDrugs = [];
  const containerPreview = getEl('container-prescription-preview');
  if (containerPreview) containerPreview.innerHTML = '';
  const printableArea = getEl('printable-prescription-container');
  if (printableArea) printableArea.innerHTML = '';
  const inputPatientName = getEl<HTMLInputElement>('input-print-patient-name');
  if (inputPatientName) inputPatientName.value = '';
  const inputPatientTc = getEl<HTMLInputElement>('input-print-patient-tc');
  if (inputPatientTc) inputPatientTc.value = '';
  const inputPrintDiagnosis = getEl<HTMLInputElement>('input-print-diagnosis');
  if (inputPrintDiagnosis) inputPrintDiagnosis.value = '';
  const inputPrintRxNumber = getEl<HTMLInputElement>('input-print-rx-number');
  if (inputPrintRxNumber) inputPrintRxNumber.value = '';
  const inputPrintAllergy = getEl<HTMLInputElement>('input-print-allergy');
  if (inputPrintAllergy) inputPrintAllergy.value = 'Bilinen İlaç Alerjisi Yok';
  const inputPrintClinicalNotes = getEl<HTMLTextAreaElement>('input-print-clinical-notes');
  if (inputPrintClinicalNotes) inputPrintClinicalNotes.value = '';
  const inputModalDrugSearch = getEl<HTMLInputElement>('input-rx-modal-drug-search');
  if (inputModalDrugSearch) inputModalDrugSearch.value = '';
  const listModalDrugResults = getEl('list-rx-modal-drug-results');
  if (listModalDrugResults) {
    listModalDrugResults.innerHTML = '';
    listModalDrugResults.classList.add('hidden');
  }
  const rxDrugsCountBadge = getEl('rx-drugs-count-badge');
  if (rxDrugsCountBadge) rxDrugsCountBadge.textContent = '0 İlaç';
  const containerRxEditorList = getEl('container-rx-editor-list');
  if (containerRxEditorList) {
    containerRxEditorList.innerHTML = `
      <div class="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-400 space-y-1.5">
        <p class="text-xs font-semibold text-slate-300">Reçeteye henüz ilaç eklenmedi.</p>
        <p class="text-[0.8125rem] text-slate-500">Yukarıdaki <strong>"+ İlaç Ekle"</strong> butonunu kullanabilir veya hazır bir reçete paketi seçebilirsiniz.</p>
      </div>
    `;
  }
}

export function initPrescriptionModalController(onUpdateAllTabs?: () => void): void {
  if (onUpdateAllTabs) {
    onPrescriptionTabsUpdate = onUpdateAllTabs;
  }
  if (typeof document === 'undefined' || boundDocuments.has(document)) return;
  boundDocuments.add(document);

  const btnPrintRx = getEl('btn-print-rx');
  const modalPrint = getEl('modal-prescription-print');
  const btnClosePrint = getEl('btn-close-print-modal');
  const btnTriggerPrint = getEl('btn-trigger-print');
  const containerPreview = getEl('container-prescription-preview');
  const printableArea = getEl('printable-prescription-container');
  const inputPatientName = getEl<HTMLInputElement>('input-print-patient-name');
  const inputPatientTc = getEl<HTMLInputElement>('input-print-patient-tc');
  const inputDoctorName = getEl<HTMLInputElement>('input-print-doctor-name');
  const inputDoctorTitle = getEl<HTMLInputElement>('input-print-doctor-title');
  const inputDoctorDiploma = getEl<HTMLInputElement>('input-print-doctor-diploma');
  const inputPrintDate = getEl<HTMLInputElement>('input-print-date');
  const inputPrintDiagnosis = getEl<HTMLInputElement>('input-print-diagnosis');
  const inputPrintRxNumber = getEl<HTMLInputElement>('input-print-rx-number');
  const inputPrintAllergy = getEl<HTMLInputElement>('input-print-allergy');
  const inputPrintClinicalNotes = getEl<HTMLTextAreaElement>('input-print-clinical-notes');
  const containerRxCatalogSearch = getEl('container-rx-catalog-search');
  const inputRxModalDrugSearch = getEl<HTMLInputElement>('input-rx-modal-drug-search');
  const listRxModalDrugResults = getEl('list-rx-modal-drug-results');
  const btnTabRxEditor = getEl('btn-tab-rx-editor');
  const btnTabRxPreview = getEl('btn-tab-rx-preview');
  const panelRxEditor = getEl('panel-rx-editor');
  const panelRxPreview = getEl('panel-rx-preview');
  const selectRxPreset = getEl<HTMLSelectElement>('select-rx-preset');
  const btnAddRxDrug = getEl('btn-add-rx-drug');
  const containerRxEditorList = getEl('container-rx-editor-list');
  const rxDrugsCountBadge = getEl('rx-drugs-count-badge');

  // Kalıcı hekim kaşe bilgilerini (Ad, Ünvan, Diploma No) güvenli localStorage'dan yükle
  if (inputDoctorName && !inputDoctorName.value) {
    const savedDoc = safeStorageGet(STORAGE_DOCTOR_NAME_KEY);
    if (savedDoc) inputDoctorName.value = savedDoc;
  }
  if (inputDoctorTitle && !inputDoctorTitle.value) {
    const savedTitle = safeStorageGet(STORAGE_DOCTOR_TITLE_KEY);
    if (savedTitle) inputDoctorTitle.value = savedTitle;
  }
  if (inputDoctorDiploma && !inputDoctorDiploma.value) {
    const savedDiploma = safeStorageGet(STORAGE_DOCTOR_DIPLOMA_KEY);
    if (savedDiploma) inputDoctorDiploma.value = savedDiploma;
  }

  function buildPatientInfo(): PrescriptionPrintPatientInfo {
    const rxFallback = inputPrintRxNumber?.value || `RX-${new Date().getFullYear()}-0001`;
    const isMale = appState.biometry.gender === 'male' || appState.biometry.gender === 'M';
    const isFemale = appState.biometry.gender === 'female' || appState.biometry.gender === 'F';
    return {
      patientName: inputPatientName?.value || 'Sayın Hasta',
      tcNo: inputPatientTc?.value.trim() || undefined,
      age: appState.biometry.ageFormatted || getEl('banner-age')?.textContent || '--',
      gender: isMale ? 'Erkek' : (isFemale ? 'Kadın' : '--'),
      weightKg: appState.biometry.weightKg || undefined,
      dateStr: inputPrintDate?.value || new Date().toLocaleDateString('tr-TR'),
      doctorName: inputDoctorName?.value || 'Dr. Hekim Kaşe & İmza',
      doctorTitle: inputDoctorTitle?.value.trim() || undefined,
      doctorDiplomaNo: inputDoctorDiploma?.value.trim() || undefined,
      diagnosis: inputPrintDiagnosis?.value || 'Klinik Muayene & Tedavi',
      rxNumber: rxFallback,
      allergyNotes: inputPrintAllergy?.value || 'Bilinen İlaç Alerjisi Yok',
      clinicalNotes: inputPrintClinicalNotes?.value.trim() || undefined
    };
  }

  function switchRxTab(tab: 'editor' | 'preview'): void {
    if (!btnTabRxEditor || !btnTabRxPreview || !panelRxEditor || !panelRxPreview) return;
    if (tab === 'editor') {
      btnTabRxEditor.className = 'px-3 py-1.5 rounded-lg bg-slate-800 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all';
      btnTabRxPreview.className = 'px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all';
      panelRxEditor.classList.remove('hidden');
      panelRxPreview.classList.add('hidden');
    } else {
      btnTabRxPreview.className = 'px-3 py-1.5 rounded-lg bg-slate-800 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all';
      btnTabRxEditor.className = 'px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all';
      panelRxPreview.classList.remove('hidden');
      panelRxEditor.classList.add('hidden');
      refreshPrescriptionPreview();
    }
  }

  function buildSafetyBannerHTML(): string {
    if (activePrescriptionDrugs.length === 0) {
      if (btnTriggerPrint) {
        btnTriggerPrint.classList.remove('opacity-50');
        btnTriggerPrint.title = 'Reçeteyi Yazdır / PDF İndir';
      }
      return '';
    }
    const safetyEgfr = getNum('input-safety-egfr') ?? appState.biometry.egfr;
    const scrVal = getNum('input-creatinine');
    const safetyTrim = getNum('select-safety-trimester') || (appState.obgyn.trimester || appState.obgyn.eddData?.trimester || appState.medicine.pregnancyTrimester || 0);
    const gestWeeks = appState.obgyn.eddData?.weeks ?? null;
    const baselineK = getNum('input-serum-k') ?? getNum('input-bg-k');
    const pretermGw = getChk('chk-preterm') ? getNum('input-gestational-weeks') : null;
    const cpState = appState.medicine.childPugh;
    const meldState = appState.medicine.meld3;
    const cardiacQtc = (appState.other?.cardiac as { bazett?: number; fridericia?: number } | null);
    const baselineQtcMs = typeof cardiacQtc?.fridericia === 'number'
      ? cardiacQtc.fridericia
      : (typeof cardiacQtc?.bazett === 'number' ? cardiacQtc.bazett : null);

    const unifiedResult = evaluateUnifiedPrescriptionSafety(
      activePrescriptionDrugs.map(d => ({
        name: d.name,
        brand: d.name,
        generic: d.generic,
        atcCode: d.atcCode,
        barcode: d.barcode,
        route: d.route
      })),
      {
        egfr: safetyEgfr,
        serumCreatinineMgDl: scrVal,
        ageYears: appState.biometry.ageYears,
        ageMonths: appState.biometry.ageMonths,
        ageDays: appState.biometry.ageDays,
        isNeonate: appState.biometry.isNeonate,
        gestationalAgeWeeks: pretermGw,
        heightCm: appState.biometry.heightCm,
        weightKg: appState.biometry.weightKg || undefined,
        gender: appState.biometry.gender,
        trimester: safetyTrim,
        isPregnant: safetyTrim > 0 || (typeof gestWeeks === 'number' && gestWeeks > 0),
        pregnancyWeeks: gestWeeks,
        baselineK,
        baselineQtcMs,
        childPughClass: cpState?.childClass ?? null,
        childPughScore: cpState?.score ?? null,
        meldScore: meldState?.score ?? null,
        diagnosis: inputPrintDiagnosis?.value || undefined,
        recentDiscontinuedDrugs: appState.safetyPrescription.recentDiscontinuedDrugs || []
      }
    );

    const currentSig = getPrescriptionSignature();
    if (activeHardStopOverride && activeHardStopOverride.signature !== currentSig) {
      activeHardStopOverride = null;
    }
    lastModalHasCritical = unifiedResult.counts.hasCritical;

    if (btnTriggerPrint) {
      if (unifiedResult.counts.hasCritical && !activeHardStopOverride) {
        btnTriggerPrint.classList.add('opacity-50');
        btnTriggerPrint.title = 'Reçetede kesin kontrendikasyon (Hard Stop) bulunmaktadır — yazdırmak için kodlu override gerekçesi seçiniz!';
      } else {
        btnTriggerPrint.classList.remove('opacity-50');
        btnTriggerPrint.title = activeHardStopOverride
          ? `Kodlu Override Onaylı (${activeHardStopOverride.display}) — Yazdır / PDF İndir`
          : 'Reçeteyi Yazdır / PDF İndir';
      }
    }

    return renderUnifiedModalSafetyBannerHTML(unifiedResult, activeHardStopOverride);
  }

  function refreshPrescriptionPreview(): void {
    if (!containerPreview) return;
    const patientInfo = buildPatientInfo();

    const safetyContainer = getEl('container-rx-safety-banners');
    if (safetyContainer) {
      safetyContainer.innerHTML = buildSafetyBannerHTML();
    }

    const html = generatePrescriptionHTML(patientInfo, activePrescriptionDrugs);
    containerPreview.innerHTML = html;
    if (printableArea) {
      printableArea.innerHTML = html;
    }

    if (appState.treatment) {
      appState.treatment.selectedDrugs = activePrescriptionDrugs.map(d => {
        const activeDosesCount = [
          d.morningDose ?? (d.morning ? '1' : '0'),
          d.noonDose ?? (d.noon ? '1' : '0'),
          d.eveningDose ?? (d.evening ? '1' : '0'),
          d.nightDose ?? (d.night ? '1' : '0')
        ].filter(v => v !== null && v !== undefined && String(v).trim() !== '' && v !== '0' && v !== '-').length;
        return {
          name: d.name,
          brand: d.name,
          generic: d.generic,
          atcCode: d.atcCode,
          barcode: d.barcode,
          rx: d.rx,
          company: d.company,
          kt: d.kt,
          kub: d.kub,
          esdegerGroup: d.esdegerGroup,
          sgkReimbursed: d.sgkReimbursed,
          retailPriceTl: d.retailPriceTl,
          isExtraMonitoring: d.isExtraMonitoring,
          allergens: d.allergens,
          mealTimingCode: d.mealTimingCode,
          drivingRiskCode: d.drivingRiskCode,
          drivingRisk: d.drivingRisk,
          route: d.route,
          dosage: d.dosage,
          boxCount: clampBoxCount(d.boxCount),
          frequency: activeDosesCount > 0 ? `${activeDosesCount}x1` : undefined,
          morning: d.morning,
          noon: d.noon,
          evening: d.evening,
          night: d.night,
          morningDose: d.morningDose,
          noonDose: d.noonDose,
          eveningDose: d.eveningDose,
          nightDose: d.nightDose,
          mealTiming: d.mealTiming,
          duration: d.duration,
          instructions: d.instructions
        };
      });
      renderSelectedDrugs();
    }
    if (onPrescriptionTabsUpdate) {
      onPrescriptionTabsUpdate();
    } else {
      updateLiveSOAP();
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
          <p class="text-[0.8125rem] text-slate-500">Yukarıdaki <strong>"+ İlaç Ekle"</strong> butonunu kullanabilir veya hazır bir reçete paketi seçebilirsiniz.</p>
        </div>
      `;
      refreshPrescriptionPreview();
      return;
    }

    const safetyBannerHTML = `<div id="container-rx-safety-banners">${buildSafetyBannerHTML()}</div>`;

    const itemsHTML = activePrescriptionDrugs.map((d, idx) => `
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2.5 transition-all hover:border-slate-700" data-rx-idx="${idx}">
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[0.75rem] font-bold flex items-center justify-center font-mono">${idx + 1}</span>
            <input type="text" class="rx-input-name flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-sky-400" value="${escapeHtml(d.name)}" placeholder="İlaç Adı ve Formu">

          </div>
          <div class="flex items-center gap-1.5">
            <select class="rx-select-form bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[0.8125rem] text-slate-300">
              <option value="Tablet" ${d.form === 'Tablet' ? 'selected' : ''}>Tablet</option>
              <option value="Kapsül" ${d.form === 'Kapsül' ? 'selected' : ''}>Kapsül</option>
              <option value="Şurup" ${d.form === 'Şurup' ? 'selected' : ''}>Şurup</option>
              <option value="Damla" ${d.form === 'Damla' ? 'selected' : ''}>Damla</option>
              <option value="Sprey/İnhaler" ${d.form === 'Sprey/İnhaler' ? 'selected' : ''}>Sprey/İnhaler</option>
              <option value="Krem/Merhem" ${d.form === 'Krem/Merhem' ? 'selected' : ''}>Krem/Merhem</option>
              <option value="Gargara" ${d.form === 'Gargara' ? 'selected' : ''}>Gargara</option>
              <option value="Saşe" ${d.form === 'Saşe' ? 'selected' : ''}>Saşe</option>
              <option value="Fitil" ${d.form === 'Fitil' ? 'selected' : ''}>Fitil</option>
              <option value="Enjeksiyon" ${d.form === 'Enjeksiyon' ? 'selected' : ''}>Enjeksiyon</option>
            </select>
            <button type="button" class="rx-btn-delete text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800 transition-colors flex items-center justify-center" title="İlacı Kaldır">${getSvgIcon('close', 'w-3.5 h-3.5')}</button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-8 gap-1.5 text-xs">
          <div>
            <label class="text-xs text-slate-300 block mb-0.5">Tek Doz:</label>
            <input type="text" class="rx-input-dosage w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-base text-slate-200" value="${escapeHtml(d.dosage)}" placeholder="1 Tablet">
          </div>
          <div class="text-center">
            <label class="text-xs text-sky-300 block mb-0.5">Kutu:</label>
            <input type="number" min="1" max="99" step="1" class="rx-input-box-count w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-base text-center tabular-nums text-sky-200 font-bold" value="${clampBoxCount(d.boxCount)}" title="Kutu Adedi (DİB)">
          </div>
          <div class="text-center">
            <label class="text-xs text-amber-300 block mb-0.5">Sabah</label>
            <input type="text" class="rx-input-morning w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-base text-center tabular-nums ${d.morningDose !== '-' ? 'text-amber-300 font-bold' : 'text-slate-400'}" value="${escapeHtml(d.morningDose || (d.morning ? '1' : '-'))}" placeholder="-">
          </div>
          <div class="text-center">
            <label class="text-xs text-amber-300 block mb-0.5">Öğle</label>
            <input type="text" class="rx-input-noon w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-base text-center tabular-nums ${d.noonDose !== '-' ? 'text-amber-300 font-bold' : 'text-slate-400'}" value="${escapeHtml(d.noonDose || (d.noon ? '1' : '-'))}" placeholder="-">
          </div>
          <div class="text-center">
            <label class="text-xs text-amber-300 block mb-0.5">Akşam</label>
            <input type="text" class="rx-input-evening w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-base text-center tabular-nums ${d.eveningDose !== '-' ? 'text-amber-300 font-bold' : 'text-slate-400'}" value="${escapeHtml(d.eveningDose || (d.evening ? '1' : '-'))}" placeholder="-">
          </div>
          <div class="text-center">
            <label class="text-xs text-indigo-300 block mb-0.5">Gece</label>
            <input type="text" class="rx-input-night w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-base text-center tabular-nums ${d.nightDose !== '-' ? 'text-indigo-300 font-bold' : 'text-slate-400'}" value="${escapeHtml(d.nightDose || (d.night ? '1' : '-'))}" placeholder="-">
          </div>
          <div>
            <label class="text-xs text-slate-300 block mb-0.5">Öğün Durumu:</label>
            <select class="rx-select-meal w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-base text-slate-200">
              <option value="TOK" ${d.mealTiming === 'TOK' ? 'selected' : ''}>TOK</option>
              <option value="AC" ${d.mealTiming === 'AC' ? 'selected' : ''}>AÇ</option>
              <option value="YEMEKLE" ${d.mealTiming === 'YEMEKLE' ? 'selected' : ''}>YEMEKLE</option>
              <option value="GECE" ${d.mealTiming === 'GECE' ? 'selected' : ''}>YATARKEN</option>
              <option value="FARKETMEZ" ${d.mealTiming === 'FARKETMEZ' ? 'selected' : ''}>Farketmez</option>
            </select>
          </div>
          <div>
            <label class="text-[0.75rem] text-slate-400 block mb-0.5">Kullanım Süresi:</label>
            <input type="text" class="rx-input-duration w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[0.8125rem] text-slate-200" value="${escapeHtml(d.duration || '7 Gün')}" placeholder="Örn: 7 Gün">
          </div>
        </div>

        <div>
          <label class="text-[0.75rem] text-slate-400 block mb-0.5">Kullanım Talimatı & Uyarılar:</label>
          <input type="text" class="rx-input-instructions w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-[0.8125rem] text-slate-300 focus:outline-none focus:border-sky-400" value="${escapeHtml(d.instructions)}">
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
      const boxCountInp = card.querySelector<HTMLInputElement>('.rx-input-box-count');
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
      if (boxCountInp) {
        const onBoxChange = () => {
          const nextCount = clampBoxCount(boxCountInp.value);
          target.boxCount = nextCount;
          refreshPrescriptionPreview();
        };
        boxCountInp.addEventListener('input', onBoxChange);
        boxCountInp.addEventListener('change', () => {
          const nextCount = clampBoxCount(boxCountInp.value);
          boxCountInp.value = String(nextCount);
          target.boxCount = nextCount;
          refreshPrescriptionPreview();
        });
      }
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
    const isChild = !!appState.biometry.isNeonate || (appState.biometry.ageYears !== null && appState.biometry.ageYears < 18);
    if (selectedDrugs.length === 0) {
      activePrescriptionDrugs = [];
    } else if (activePrescriptionDrugs.length === 0) {
      activePrescriptionDrugs = selectedDrugs.map(d => buildDefaultDrugSchedule(d, appState.biometry.weightKg || undefined, isChild));
    } else {
      const selectedNameSet = new Set(
        selectedDrugs.map(d => (d.brand || d.brandName || d.name || d.generic || '').trim().toLocaleLowerCase('tr-TR')).filter(Boolean)
      );
      activePrescriptionDrugs = activePrescriptionDrugs.filter(d =>
        selectedNameSet.has((d.name || '').trim().toLocaleLowerCase('tr-TR'))
      );
      const existingNames = new Set(activePrescriptionDrugs.map(d => (d.name || '').trim().toLocaleLowerCase('tr-TR')));
      selectedDrugs.forEach(d => {
        const dName = (d.brand || d.brandName || d.name || d.generic || '').trim().toLocaleLowerCase('tr-TR');
        if (dName && !existingNames.has(dName)) {
          existingNames.add(dName);
          activePrescriptionDrugs.push(buildDefaultDrugSchedule(d, appState.biometry.weightKg || undefined, isChild));
        }
      });
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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalPrint && !modalPrint.classList.contains('hidden')) {
      closePrescriptionModal();
    }
  });

  if (btnTabRxEditor) btnTabRxEditor.addEventListener('click', () => switchRxTab('editor'));
  if (btnTabRxPreview) btnTabRxPreview.addEventListener('click', () => switchRxTab('preview'));

  if (btnAddRxDrug) {
    btnAddRxDrug.addEventListener('click', () => {
      const newDrug: PrintableDrugSchedule = {
        id: `rx-custom-${Date.now()}`,
        name: 'Yeni İlaç',
        form: 'Tablet',
        dosage: '1 Tablet',
        boxCount: 1,
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

  // TİTCK Katalog İçi Akıllı Autocomplete (#input-rx-modal-drug-search -> #list-rx-modal-drug-results)
  let modalDrugSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let modalDrugSearchSeq = 0;
  let modalDrugLastResults: NormalizedDrugRecord[] = [];

  function hideModalDrugResults(): void {
    if (!listRxModalDrugResults) return;
    listRxModalDrugResults.classList.add('hidden');
    listRxModalDrugResults.innerHTML = '';
    modalDrugLastResults = [];
  }

  function addCatalogDrugIntoModal(record: NormalizedDrugRecord): void {
    const resolved = findCatalogDrugSync({
      barcode: record.barcode,
      brand: record.brand,
      atc: record.atcCode
    }) || record;

    const normBrand = (resolved.brand || '').trim().toLocaleLowerCase('tr-TR');
    const alreadyExists = activePrescriptionDrugs.some(d =>
      (resolved.barcode && d.barcode && d.barcode === resolved.barcode) ||
      (normBrand && (d.name || '').trim().toLocaleLowerCase('tr-TR') === normBrand)
    );

    if (!alreadyExists) {
      const isChild = !!appState.biometry.isNeonate || (appState.biometry.ageYears !== null && appState.biometry.ageYears < 18);
      const schedule = buildDefaultDrugSchedule(
        {
          brand: resolved.brand,
          generic: resolved.generic,
          atcCode: resolved.atcCode,
          barcode: resolved.barcode,
          rx: resolved.prescriptionType,
          company: resolved.company,
          kt: resolved.kt_pdf_prospektus_url,
          kub: resolved.kub_pdf_url,
          esdegerGroup: resolved.esdegerGroup,
          sgkReimbursed: resolved.sgkReimbursed,
          retailPriceTl: resolved.retailPriceTl,
          isExtraMonitoring: resolved.isExtraMonitoring,
          allergens: resolved.allergens,
          mealTimingCode: resolved.mealTimingCode,
          drivingRiskCode: resolved.drivingRiskCode,
          drivingRisk: resolved.drivingRisk,
          route: resolved.route,
          boxCount: 1
        },
        appState.biometry.weightKg || undefined,
        isChild
      );
      activePrescriptionDrugs.push(schedule);
      renderRxEditorList();
    }

    if (inputRxModalDrugSearch) inputRxModalDrugSearch.value = '';
    hideModalDrugResults();
  }

  async function executeModalDrugSearch(rawQuery: string): Promise<void> {
    if (!listRxModalDrugResults) return;
    const q = rawQuery.trim();
    if (q.length < 2) {
      hideModalDrugResults();
      return;
    }

    const thisSeq = ++modalDrugSearchSeq;
    try {
      const results = await searchDrugsAsync(q, 'all');
      if (thisSeq !== modalDrugSearchSeq) return;

      const sliced = (results || []).slice(0, 12);
      modalDrugLastResults = sliced;

      if (sliced.length === 0) {
        listRxModalDrugResults.classList.remove('hidden');
        listRxModalDrugResults.innerHTML = `<div class="p-2 text-center text-[0.75rem] text-slate-400">Eşleşen TİTCK müstahzarı bulunamadı.</div>`;
        return;
      }

      listRxModalDrugResults.classList.remove('hidden');
      listRxModalDrugResults.innerHTML = sliced.map((r, idx) => {
        const rxCls = r.prescriptionType === 'Kırmızı'
          ? 'bg-rose-950/80 text-rose-200 border-rose-700/70'
          : r.prescriptionType === 'Yeşil'
            ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700/70'
            : 'bg-slate-800 text-slate-300 border-slate-700';
        return `
          <button type="button" data-rx-catalog-idx="${idx}" class="btn-rx-modal-pick-drug w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-800/90 border border-transparent hover:border-sky-600/60 transition-colors flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-slate-100 truncate">${escapeHtml(r.brand)}</div>
              <div class="text-[0.6875rem] text-emerald-300/90 truncate">${escapeHtml(r.generic || '')}${r.atcCode ? ` <span class="text-slate-400 font-mono">• ${escapeHtml(r.atcCode)}</span>` : ''}${r.esdegerGroup ? ` <span class="text-sky-300 font-mono">• E:${escapeHtml(r.esdegerGroup)}</span>` : ''}</div>
            </div>
            <span class="text-[0.625rem] px-1.5 py-0.5 rounded border font-semibold shrink-0 ${rxCls}">${escapeHtml(r.prescriptionType || 'Normal')}</span>
          </button>
        `;
      }).join('');
    } catch (err) {
      if (thisSeq !== modalDrugSearchSeq) return;
      console.warn('[PrescriptionModal] Katalog arama hatası:', err);
      listRxModalDrugResults.classList.remove('hidden');
      listRxModalDrugResults.innerHTML = `<div class="p-2 text-center text-[0.75rem] text-rose-400">Katalog araması şu an yapılamadı.</div>`;
    }
  }

  if (inputRxModalDrugSearch) {
    inputRxModalDrugSearch.addEventListener('input', (e: Event) => {
      const q = inputRxModalDrugSearch.value.trim();
      if (modalDrugSearchTimer) {
        clearTimeout(modalDrugSearchTimer);
        modalDrugSearchTimer = null;
      }
      if (q.length < 2) {
        hideModalDrugResults();
        return;
      }
      if (e.isTrusted === false) {
        void executeModalDrugSearch(q);
      } else {
        modalDrugSearchTimer = setTimeout(() => {
          void executeModalDrugSearch(q);
        }, 150);
      }
    });

    inputRxModalDrugSearch.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (modalDrugLastResults.length > 0) {
          addCatalogDrugIntoModal(modalDrugLastResults[0]);
        } else {
          const q = inputRxModalDrugSearch.value.trim();
          if (q.length >= 2) {
            if (modalDrugSearchTimer) {
              clearTimeout(modalDrugSearchTimer);
              modalDrugSearchTimer = null;
            }
            void executeModalDrugSearch(q);
          }
        }
      } else if (e.key === 'Escape') {
        hideModalDrugResults();
      }
    });
  }

  if (listRxModalDrugResults) {
    listRxModalDrugResults.addEventListener('click', (e: MouseEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('.btn-rx-modal-pick-drug');
      if (!btn) return;
      const idx = parseInt(btn.dataset.rxCatalogIdx || '-1', 10);
      const rec = modalDrugLastResults[idx];
      if (rec) {
        addCatalogDrugIntoModal(rec);
      }
    });
  }

  document.addEventListener('click', (e: MouseEvent) => {
    if (!listRxModalDrugResults || listRxModalDrugResults.classList.contains('hidden')) return;
    const target = e.target as Node | null;
    if (containerRxCatalogSearch && target && !containerRxCatalogSearch.contains(target)) {
      hideModalDrugResults();
    }
  });

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
  if (inputPatientTc) inputPatientTc.addEventListener('input', refreshPrescriptionPreview);
  if (inputDoctorName) {
    inputDoctorName.addEventListener('input', () => {
      safeStorageSet(STORAGE_DOCTOR_NAME_KEY, inputDoctorName.value);
      refreshPrescriptionPreview();
    });
  }
  if (inputDoctorTitle) {
    inputDoctorTitle.addEventListener('input', () => {
      safeStorageSet(STORAGE_DOCTOR_TITLE_KEY, inputDoctorTitle.value);
      refreshPrescriptionPreview();
    });
  }
  if (inputDoctorDiploma) {
    inputDoctorDiploma.addEventListener('input', () => {
      safeStorageSet(STORAGE_DOCTOR_DIPLOMA_KEY, inputDoctorDiploma.value);
      refreshPrescriptionPreview();
    });
  }
  if (inputPrintDate) inputPrintDate.addEventListener('input', refreshPrescriptionPreview);
  if (inputPrintDiagnosis) inputPrintDiagnosis.addEventListener('input', refreshPrescriptionPreview);
  if (inputPrintRxNumber) inputPrintRxNumber.addEventListener('input', refreshPrescriptionPreview);
  if (inputPrintAllergy) inputPrintAllergy.addEventListener('input', refreshPrescriptionPreview);
  if (inputPrintClinicalNotes) inputPrintClinicalNotes.addEventListener('input', refreshPrescriptionPreview);

  const btnCopyRxText = getEl('btn-copy-rx-text');
  const copyRxFeedback = getEl('copy-rx-feedback');
  if (btnCopyRxText) {
    btnCopyRxText.addEventListener('click', () => {
      const patientInfo = buildPatientInfo();
      const plainText = generatePrescriptionPlainText(patientInfo, activePrescriptionDrugs);
      copyToClipboardWithFallback(
        plainText,
        () => {
          if (copyRxFeedback) {
            copyRxFeedback.classList.remove('hidden');
            setTimeout(() => copyRxFeedback.classList.add('hidden'), 2000);
          }
        },
        (err) => {
          console.warn('[Prescription] Panoya kopyalama hatası:', err);
        }
      );
    });
  }

  // Faz 4: Modal İçi Kodlu Override (Marcilly 2018) & Tek Tıkla CDS Hooks Aksiyonları
  if (containerRxEditorList) {
    containerRxEditorList.addEventListener('click', (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement | null;

      const overrideBtn = targetEl?.closest<HTMLButtonElement>('.btn-cds-override');
      if (overrideBtn) {
        const code = overrideBtn.dataset.overrideCode || '';
        const display = overrideBtn.dataset.overrideDisplay || '';
        const bar = overrideBtn.closest<HTMLElement>('[data-override-status="locked"]');
        const ruleId = bar?.dataset.overrideRule || 'CRITICAL_SAFETY_LOCK';
        const pairLabel = bar?.dataset.overridePair || '';
        const noteEl = getEl<HTMLInputElement>('input-cds-override-note');
        const note = noteEl?.value?.trim() || undefined;
        activeHardStopOverride = { signature: getPrescriptionSignature(), code, display, note };
        const entry = recordOverrideAuditEntry({
          cardUuid: `card-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          ruleId,
          pairLabel,
          overrideCode: code,
          overrideDisplay: display,
          note
        });
        appState.safetyPrescription.overrideAuditLog = [entry, ...loadOverrideAuditLog().filter(x => x.cardUuid !== entry.cardUuid)].slice(0, 100);
        if (inputPrintClinicalNotes) {
          const logLine = `[CDS Override: ${display}${note ? ` — ${note}` : ''} | ${ruleId}]`;
          if (!inputPrintClinicalNotes.value.includes(logLine)) {
            inputPrintClinicalNotes.value = inputPrintClinicalNotes.value ? `${inputPrintClinicalNotes.value}\n${logLine}` : logLine;
          }
        }
        refreshPrescriptionPreview();
        return;
      }

      const clearBtn = targetEl?.closest<HTMLButtonElement>('.btn-clear-cds-override');
      if (clearBtn) {
        activeHardStopOverride = null;
        refreshPrescriptionPreview();
        return;
      }

      const cdsBtn = targetEl?.closest<HTMLButtonElement>('.btn-cds-action');
      if (cdsBtn) {
        const action = cdsBtn.dataset.cdsAction || '';
        const targetBrand = (cdsBtn.dataset.targetBrand || '').toLowerCase();
        const targetAtc = (cdsBtn.dataset.targetAtc || '').toUpperCase();
        const targetKey = (cdsBtn.dataset.targetKey || '').toLowerCase();
        const findIdx = () => activePrescriptionDrugs.findIndex(d => {
          const n = (d.name || '').toLowerCase();
          const g = (d.generic || '').toLowerCase();
          const a = (d.atcCode || '').toUpperCase();
          return (targetAtc && a === targetAtc) || (targetBrand && n === targetBrand) || (targetKey && (n.includes(targetKey) || g.includes(targetKey)));
        });

        if (action === 'REMOVE_DRUG') {
          const idx = findIdx();
          if (idx >= 0) {
            activePrescriptionDrugs.splice(idx, 1);
            activeHardStopOverride = null;
            renderRxEditorList();
          }
        } else if (action === 'SWITCH_ALTERNATIVE') {
          const idx = findIdx();
          const repBrand = cdsBtn.dataset.repBrand || '';
          const repGeneric = cdsBtn.dataset.repGeneric || '';
          const repAtc = cdsBtn.dataset.repAtc || '';
          if (repBrand && repAtc) {
            const cat = findCatalogDrugSync({ atc: repAtc, brand: repBrand });
            const isChild = !!appState.biometry.isNeonate || (appState.biometry.ageYears !== null && appState.biometry.ageYears < 18);
            const sched = buildDefaultDrugSchedule(
              cat
                ? { brand: cat.brand, generic: cat.generic, atcCode: cat.atcCode, barcode: cat.barcode, rx: cat.prescriptionType, route: cat.route }
                : { brand: repBrand, generic: repGeneric, atcCode: repAtc },
              appState.biometry.weightKg || undefined,
              isChild
            );
            if (idx >= 0) activePrescriptionDrugs[idx] = sched;
            else activePrescriptionDrugs.push(sched);
            activeHardStopOverride = null;
            renderRxEditorList();
          }
        } else if (action === 'ADD_LAB_ORDER') {
          const orderText = cdsBtn.dataset.labOrder || '';
          if (orderText && inputPrintClinicalNotes && !inputPrintClinicalNotes.value.includes(orderText)) {
            inputPrintClinicalNotes.value = inputPrintClinicalNotes.value ? `${inputPrintClinicalNotes.value}\n${orderText}` : orderText;
            refreshPrescriptionPreview();
          }
        }
      }
    });
  }

  if (btnTriggerPrint) {
    btnTriggerPrint.addEventListener('click', () => {
      refreshPrescriptionPreview();
      if (lastModalHasCritical && !activeHardStopOverride) {
        const safetyBox = getEl('container-rx-safety-banners');
        safetyBox?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        getEl<HTMLInputElement>('input-cds-override-note')?.focus?.();
        return;
      }
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    });
  }
}
