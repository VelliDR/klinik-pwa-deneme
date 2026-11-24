import {
  calculateAverageInterval,
  calculateHrFromBoxes,
  convertEcgBoxesToMs,
  convertMsToEcgBoxes
} from '../engines/cardiacEngine';

const parseNum = (val: unknown): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

const getEl = <T extends HTMLElement = HTMLElement>(id: string): T | null => {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id) as T | null;
};

const boundDocuments = new WeakSet<Document>();

export function initEcgUiController(onUpdateAllTabs: () => void): void {
  if (typeof document === 'undefined' || boundDocuments.has(document)) return;
  boundDocuments.add(document);

  const btnModeMs = getEl('btn-ecg-mode-ms');
  const btnModeBoxes = getEl('btn-ecg-mode-boxes');
  const panelMs = getEl('panel-ecg-ms');
  const panelBoxes = getEl('panel-ecg-boxes');
  const btnToggleGuide = getEl('btn-toggle-ecg-guide');
  const detailsGuide = getEl('details-ecg-guide');
  const selectSpeed = getEl<HTMLSelectElement>('select-ecg-paper-speed');

  if (selectSpeed) {
    selectSpeed.addEventListener('change', () => {
      onUpdateAllTabs();
    });
  }

  if (btnModeMs && btnModeBoxes && panelMs && panelBoxes) {
    btnModeMs.addEventListener('click', () => {
      btnModeMs.className = 'px-2 py-0.5 rounded font-semibold transition-all bg-sky-600 text-white';
      btnModeBoxes.className = 'px-2 py-0.5 rounded font-semibold transition-all text-slate-400 hover:text-white';
      panelMs.classList.remove('hidden');
      panelBoxes.classList.add('hidden');
      onUpdateAllTabs();
    });
    btnModeBoxes.addEventListener('click', () => {
      btnModeBoxes.className = 'px-2 py-0.5 rounded font-semibold transition-all bg-amber-600 text-white';
      btnModeMs.className = 'px-2 py-0.5 rounded font-semibold transition-all text-slate-400 hover:text-white';
      panelBoxes.classList.remove('hidden');
      panelMs.classList.add('hidden');
      onUpdateAllTabs();
    });
  }

  if (btnToggleGuide && detailsGuide) {
    btnToggleGuide.addEventListener('click', () => {
      detailsGuide.classList.toggle('hidden');
    });
  }

  // Hızlı RR Büyük Kare Butonları (3, 4, 5 Büyük Kare)
  const preset3 = getEl('btn-ecg-rr-preset-3');
  const preset4 = getEl('btn-ecg-rr-preset-4');
  const preset5 = getEl('btn-ecg-rr-preset-5');
  const ecgRrBoxesInput = getEl<HTMLInputElement>('input-ecg-rr-boxes');
  const ecgRrInput = getEl<HTMLInputElement>('input-ecg-rr');
  const ecgHrInput = getEl<HTMLInputElement>('input-hr');

  const applyRrPreset = (largeBoxes: number): void => {
    const speed: 25 | 50 = selectSpeed && selectSpeed.value === '50' ? 50 : 25;
    const smallBoxes = largeBoxes * 5;
    const rrMs = convertEcgBoxesToMs(smallBoxes, speed);
    const hr = calculateHrFromBoxes(largeBoxes, true, speed);
    if (ecgRrBoxesInput) {
      ecgRrBoxesInput.value = String(smallBoxes);
    }
    if (ecgRrInput && rrMs !== null) {
      ecgRrInput.value = String(rrMs);
    }
    if (ecgHrInput && hr !== null) {
      ecgHrInput.value = String(hr);
    }
    onUpdateAllTabs();
  };

  if (preset3) preset3.addEventListener('click', () => applyRrPreset(3));
  if (preset4) preset4.addEventListener('click', () => applyRrPreset(4));
  if (preset5) preset5.addEventListener('click', () => applyRrPreset(5));

  // Aritmi / AFib 3-Vuru Hızlı Ortalama Alıcı
  const avgV1 = getEl<HTMLInputElement>('input-ecg-avg-v1');
  const avgV2 = getEl<HTMLInputElement>('input-ecg-avg-v2');
  const avgV3 = getEl<HTMLInputElement>('input-ecg-avg-v3');
  const btnApplyAvg = getEl('btn-apply-ecg-avg-qt');
  const ecgQtInput = getEl<HTMLInputElement>('input-ecg-qt');
  const ecgQtBoxesInput = getEl<HTMLInputElement>('input-ecg-qt-boxes');

  if (btnApplyAvg && avgV1 && avgV2 && avgV3) {
    btnApplyAvg.addEventListener('click', () => {
      const v1 = parseNum(avgV1.value);
      const v2 = parseNum(avgV2.value);
      const v3 = parseNum(avgV3.value);
      const avg = calculateAverageInterval([v1, v2, v3]);
      if (avg === null) return;

      const isBoxesMode = panelBoxes && !panelBoxes.classList.contains('hidden');
      const speed: 25 | 50 = selectSpeed && selectSpeed.value === '50' ? 50 : 25;

      if (isBoxesMode || avg < 30) {
        const msVal = convertEcgBoxesToMs(avg, speed);
        if (ecgQtBoxesInput) ecgQtBoxesInput.value = String(avg);
        if (ecgQtInput && msVal !== null) ecgQtInput.value = String(msVal);
      } else {
        const boxesVal = convertMsToEcgBoxes(avg, speed);
        if (ecgQtInput) ecgQtInput.value = String(Math.round(avg));
        if (ecgQtBoxesInput && boxesVal !== null) ecgQtBoxesInput.value = String(boxesVal);
      }
      onUpdateAllTabs();
    });
  }
}
