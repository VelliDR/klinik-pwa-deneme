// ============================================================================
// EXTENDED CLINICAL SCORES CONTROLLER
// Hepatoloji (Child-Pugh & MELD 3.0), Nöroloji (NIHSS & ABCD²),
// Sepsis / YBÜ (SOFA & qSOFA) ve Üst GİS Kanama (Glasgow-Blatchford)
// ============================================================================

import { appState } from '../state';
import { escapeHtml, getEl, getNum } from '../utils/domUtils';
import type { PatientAgeResult } from './biometryController';
import {
  renderDeclarativeScoreFormHTML,
  renderDeclarativeScoreSummaryHTML,
  type DeclarativeScoreEvaluation,
  type DeclarativeScoreInputs,
  type DeclarativeScoreSchema
} from '../engines/declarativeScoreEngine';
import {
  CHILD_PUGH_SCHEMA,
  NIHSS_SCHEMA,
  ABCD2_SCHEMA,
  SOFA_SCHEMA,
  QSOFA_SCHEMA,
  GLASGOW_BLATCHFORD_SCHEMA,
  evaluateChildPugh,
  calculateMeld3,
  evaluateNIHSS,
  evaluateABCD2,
  evaluateSOFA,
  evaluateQSOFA,
  evaluateGlasgowBlatchford
} from '../engines/extendedClinicalScores';

export type ExtendedScoreTabId = 'hepatology' | 'neurology' | 'sepsis' | 'ugib';

let currentExtendedTab: ExtendedScoreTabId = 'hepatology';
const initializedMounts = new WeakSet<HTMLElement>();

const TAB_DEFS: Array<{ id: ExtendedScoreTabId; label: string }> = [
  { id: 'hepatology', label: '1. Hepatoloji (Child-Pugh & MELD 3.0)' },
  { id: 'neurology', label: '2. Nöroloji (NIHSS & ABCD²)' },
  { id: 'sepsis', label: '3. Sepsis / YBÜ (SOFA & qSOFA)' },
  { id: 'ugib', label: '4. Üst GİS Kanama (GBS)' }
];

function readSchemaInputs(schema: DeclarativeScoreSchema): { inputs: DeclarativeScoreInputs; hasNonDefault: boolean } {
  const inputs: DeclarativeScoreInputs = {};
  let hasNonDefault = false;

  for (const c of schema.criteria) {
    const id = `decl-${schema.id}-${c.id}`;
    const el = getEl<HTMLInputElement | HTMLSelectElement>(id);
    if (!el) continue;

    if (c.type === 'boolean') {
      const checked = Boolean((el as HTMLInputElement).checked);
      inputs[c.id] = checked;
      if (checked) hasNonDefault = true;
    } else {
      const val = el.value;
      inputs[c.id] = val;
      const firstOptVal = c.options?.[0]?.value ?? '';
      if (val && val !== firstOptVal) hasNonDefault = true;
    }
  }
  return { inputs, hasNonDefault };
}

function setFieldIfNotModified(id: string, value: string | boolean): void {
  const el = getEl<HTMLInputElement | HTMLSelectElement>(id);
  if (!el || el.dataset.userModified === 'true') return;
  if (typeof document !== 'undefined' && document.activeElement === el) return;

  if (typeof value === 'boolean') {
    const inp = el as HTMLInputElement;
    if (inp.checked !== value) inp.checked = value;
  } else {
    if (el.value !== value) el.value = value;
  }
}

export function activateExtendedScoreTab(tab: ExtendedScoreTabId): void {
  currentExtendedTab = tab;
  if (typeof document === 'undefined') return;

  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-ext-tab]');
  buttons.forEach(btn => {
    const isActive = btn.dataset.extTab === tab;
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.className = isActive
      ? 'ext-score-tab-btn px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-colors bg-sky-950/75 text-sky-200 border-sky-500/70'
      : 'ext-score-tab-btn px-2.5 py-1.5 rounded-md border text-xs font-normal transition-colors bg-slate-800/60 text-slate-300 border-slate-700/80 hover:text-white hover:border-slate-500';
  });

  const panels = document.querySelectorAll<HTMLElement>('[data-ext-panel]');
  panels.forEach(panel => {
    if (panel.dataset.extPanel === tab) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });
}

export function initExtendedScoresUI(onTriggerUpdate: () => void): void {
  if (typeof document === 'undefined') return;
  const mount = getEl('container-extended-scores-mount');
  if (!mount || initializedMounts.has(mount)) return;

  initializedMounts.add(mount);

  const tabsHtml = TAB_DEFS.map(t => `
    <button type="button" data-ext-tab="${t.id}" role="tab" aria-selected="${t.id === currentExtendedTab ? 'true' : 'false'}" class="ext-score-tab-btn px-2.5 py-1.5 rounded-md border text-xs transition-colors">
      ${escapeHtml(t.label)}
    </button>
  `).join('');

  mount.innerHTML = `
    <div class="flex flex-wrap gap-1.5 pb-2 border-b border-slate-800/80" role="tablist" aria-label="Genişletilmiş Dahiliye Skorları">
      ${tabsHtml}
    </div>

    <!-- 1. HEPATOLOJİ: CHILD-PUGH & MELD 3.0 -->
    <div data-ext-panel="hepatology" class="space-y-3 pt-1">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs font-semibold text-sky-300">1.1. Child-Pugh (Turcotte-Pugh) Siroz Sınıflandırması</span>
          <label for="chk-child-pugh-active" class="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-300 cursor-pointer select-none">
            <input type="checkbox" id="chk-child-pugh-active" class="accent-amber-500 rounded">
            <span>Siroz Aktif (İlaç Kalkanına Bağla)</span>
          </label>
        </div>
        ${renderDeclarativeScoreFormHTML(CHILD_PUGH_SCHEMA)}
        <div id="output-ext-child-pugh" class="hidden"></div>
      </div>

      <div class="border-t border-slate-800/80 pt-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-sky-300">1.2. MELD 3.0 (OPTN / UNOS 2023)</span>
          <span class="text-[0.6875rem] text-slate-400">Cinsiyet, Kr, Na &amp; Alb otomatik senkron</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label for="input-meld-bili" class="block text-[0.75rem] text-slate-400 mb-1">Total Bilirubin (mg/dL)</label>
            <input type="number" step="0.1" min="0" id="input-meld-bili" placeholder="Örn: 2.5" inputmode="decimal" class="w-full h-9 bg-[#0c1322] border border-slate-800 rounded-md px-2.5 text-sm tabular-nums text-slate-200 focus:border-sky-400 focus:outline-none">
          </div>
          <div>
            <label for="input-meld-inr" class="block text-[0.75rem] text-slate-400 mb-1">PT-INR</label>
            <input type="number" step="0.1" min="0" id="input-meld-inr" placeholder="Örn: 1.8" inputmode="decimal" class="w-full h-9 bg-[#0c1322] border border-slate-800 rounded-md px-2.5 text-sm tabular-nums text-slate-200 focus:border-sky-400 focus:outline-none">
          </div>
          <div>
            <label for="input-meld-cr" class="block text-[0.75rem] text-slate-400 mb-1">Kreatinin (mg/dL)</label>
            <input type="number" step="0.1" min="0" id="input-meld-cr" placeholder="Biyometriden oto" inputmode="decimal" class="w-full h-9 bg-[#0c1322] border border-slate-800 rounded-md px-2.5 text-sm tabular-nums text-slate-200 focus:border-sky-400 focus:outline-none">
          </div>
          <div>
            <label for="input-meld-na" class="block text-[0.75rem] text-slate-400 mb-1">Sodyum (mEq/L)</label>
            <input type="number" step="1" min="100" max="170" id="input-meld-na" placeholder="Elektrolitten oto" inputmode="decimal" class="w-full h-9 bg-[#0c1322] border border-slate-800 rounded-md px-2.5 text-sm tabular-nums text-slate-200 focus:border-sky-400 focus:outline-none">
          </div>
          <div>
            <label for="input-meld-alb" class="block text-[0.75rem] text-slate-400 mb-1">Albümin (g/dL)</label>
            <input type="number" step="0.1" min="0.5" max="6" id="input-meld-alb" placeholder="Elektrolitten oto" inputmode="decimal" class="w-full h-9 bg-[#0c1322] border border-slate-800 rounded-md px-2.5 text-sm tabular-nums text-slate-200 focus:border-sky-400 focus:outline-none">
          </div>
          <div class="flex items-end pb-1">
            <label for="chk-meld-dialysis" class="flex items-center gap-1.5 text-[0.75rem] text-slate-300 cursor-pointer">
              <input type="checkbox" id="chk-meld-dialysis" class="accent-sky-500 rounded">
              <span>Son 1 hf ≥2 diyaliz / CVVHD</span>
            </label>
          </div>
        </div>
        <div id="output-ext-meld3" class="hidden"></div>
      </div>
    </div>

    <!-- 2. NÖROLOJİ: NIHSS & ABCD² -->
    <div data-ext-panel="neurology" class="hidden space-y-3 pt-1">
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-sky-300">2.1. ABCD² — GİA Sonrası Erken İnme Riski</span>
          <span class="text-[0.6875rem] text-slate-400">Yaş &amp; KB otomatik senkron</span>
        </div>
        ${renderDeclarativeScoreFormHTML(ABCD2_SCHEMA)}
        <div id="output-ext-abcd2" class="hidden"></div>
      </div>

      <div class="border-t border-slate-800/80 pt-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-sky-300">2.2. NIHSS — Akut İnme Şiddet Ölçeği (15 Madde, 0–42)</span>
          <button type="button" id="btn-reset-nihss" class="text-[0.75rem] text-slate-400 hover:text-sky-300 underline">NIHSS Sıfırla</button>
        </div>
        ${renderDeclarativeScoreFormHTML(NIHSS_SCHEMA, {}, { columnsClass: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' })}
        <div id="output-ext-nihss" class="hidden"></div>
      </div>
    </div>

    <!-- 3. SEPSİS / YBÜ: SOFA & qSOFA -->
    <div data-ext-panel="sepsis" class="hidden space-y-3 pt-1">
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-sky-300">3.1. qSOFA — Hızlı Yatak Başı Tarama (Sepsis-3)</span>
          <span class="text-[0.6875rem] text-slate-400">Vitaller &amp; GCS otomatik senkron</span>
        </div>
        ${renderDeclarativeScoreFormHTML(QSOFA_SCHEMA, {}, { columnsClass: 'grid-cols-1 sm:grid-cols-3' })}
        <div id="output-ext-qsofa" class="hidden"></div>
      </div>

      <div class="border-t border-slate-800/80 pt-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-sky-300">3.2. SOFA — 6 Sistem Organ Yetmezliği (0–24)</span>
          <span class="text-[0.6875rem] text-slate-400">P/F, GCS, Kr, Plt, MAP senkron</span>
        </div>
        ${renderDeclarativeScoreFormHTML(SOFA_SCHEMA)}
        <div id="output-ext-sofa" class="hidden"></div>
      </div>
    </div>

    <!-- 4. ÜST GİS KANAMA: GLASGOW-BLATCHFORD -->
    <div data-ext-panel="ugib" class="hidden space-y-2 pt-1">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-sky-300">4.1. Glasgow-Blatchford Üst GİS Kanama Skoru (GBS, 0–23)</span>
        <span class="text-[0.6875rem] text-slate-400">Hb, BUN, SKB, Nabız &amp; Siroz senkron</span>
      </div>
      ${renderDeclarativeScoreFormHTML(GLASGOW_BLATCHFORD_SCHEMA)}
      <div id="output-ext-gbs" class="hidden"></div>
    </div>
  `;

  // Sekme tıklamaları
  const tabBtns = typeof mount.querySelectorAll === 'function'
    ? mount.querySelectorAll<HTMLButtonElement>('[data-ext-tab]')
    : document.querySelectorAll<HTMLButtonElement>('[data-ext-tab]');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.extTab as ExtendedScoreTabId;
      if (target) activateExtendedScoreTab(target);
    });
  });

  // Kullanıcı manuel değişiklik işareti (otomatik senkronun üzerine yazmaması için)
  const markUserModified = (e: Event, triggerUpdate: boolean) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) {
      target.dataset.userModified = 'true';
      // Child-Pugh select değiştiğinde siroz değerlendirmesini otomatik aktive et
      if (target.dataset.declSchema === 'child_pugh') {
        const cpChk = getEl<HTMLInputElement>('chk-child-pugh-active');
        if (cpChk && !cpChk.checked) cpChk.checked = true;
      }
      if (triggerUpdate) onTriggerUpdate();
    }
  };
  mount.addEventListener('change', (e: Event) => markUserModified(e, true));
  mount.addEventListener('input', (e: Event) => markUserModified(e, false));

  // NIHSS sıfırla butonu
  const btnResetNihss = getEl('btn-reset-nihss');
  if (btnResetNihss) {
    btnResetNihss.addEventListener('click', () => {
      for (const c of NIHSS_SCHEMA.criteria) {
        const sel = getEl<HTMLSelectElement>(`decl-nihss-${c.id}`);
        if (sel) {
          sel.value = '0';
          delete sel.dataset.userModified;
        }
      }
      onTriggerUpdate();
    });
  }

  activateExtendedScoreTab(currentExtendedTab);
}

export function resetExtendedScoresUI(): void {
  currentExtendedTab = 'hepatology';
  if (typeof document !== 'undefined') {
    activateExtendedScoreTab('hepatology');
    for (const outId of [
      'output-ext-child-pugh',
      'output-ext-meld3',
      'output-ext-abcd2',
      'output-ext-nihss',
      'output-ext-qsofa',
      'output-ext-sofa',
      'output-ext-gbs'
    ]) {
      const el = getEl(outId);
      if (el) {
        el.classList.add('hidden');
        el.innerHTML = '';
      }
    }
  }
}

function renderScoreBox(outputId: string, result: DeclarativeScoreEvaluation | null): void {
  const out = getEl(outputId);
  if (!out) return;
  if (!result) {
    out.classList.add('hidden');
    out.innerHTML = '';
    return;
  }
  out.classList.remove('hidden');
  out.innerHTML = renderDeclarativeScoreSummaryHTML(result);
}

export function updateExtendedScoresCard(ageData: PatientAgeResult): void {
  if (typeof document === 'undefined') return;
  const mount = getEl('container-extended-scores-mount');
  if (!mount || !initializedMounts.has(mount)) return;

  const ageYears = ageData.y !== undefined && ageData.y !== null ? ageData.y : appState.biometry.ageYears;
  const isFemale = appState.biometry.gender === 'F' || appState.biometry.gender === 'female';
  const globalCr = getNum('input-creatinine');
  const globalNa = getNum('input-serum-na') ?? getNum('input-bg-na');
  const globalAlb = getNum('input-albumin') ?? getNum('input-bg-alb');
  const globalInr = getNum('input-surg-inr');
  const globalPlt = getNum('input-surg-plt');
  const globalBun = getNum('input-surg-bun');
  const globalHb = getNum('input-hb');
  const globalSbp = getNum('input-sys-bp');
  const globalDbp = getNum('input-dia-bp');
  const globalHr = getNum('input-hr') ?? appState.biometry.heartRate ?? null;
  const globalRr = getNum('input-rr');
  const globalGcs = appState.medicine.gcs?.total ?? null;
  const pfRatio = appState.medicine.bloodGas?.oxygenation?.horovitzIndex ?? null;

  // --- 1.1. Child-Pugh ---
  const cpToggle = getEl<HTMLInputElement>('chk-child-pugh-active');
  const cpRead = readSchemaInputs(CHILD_PUGH_SCHEMA);
  const cpActive = Boolean(cpToggle?.checked || cpRead.hasNonDefault);
  if (cpActive) {
    const cpRes = evaluateChildPugh(cpRead.inputs);
    appState.medicine.childPugh = cpRes;
    const outCp = getEl('output-ext-child-pugh');
    if (outCp) {
      outCp.classList.remove('hidden');
      outCp.innerHTML = `${renderDeclarativeScoreSummaryHTML(cpRes)}
        <div class="mt-1 text-[0.75rem] text-slate-400 px-1">
          • ${escapeHtml(cpRes.surgicalMortalityNote)}
          ${cpRes.hepaticDoseImpact ? ' • <span class="text-amber-300 font-semibold">İlaç Güvenlik Kalkanında Hepatik Doz Kısıtlaması Aktif</span>' : ''}
        </div>`;
    }
  } else {
    appState.medicine.childPugh = null;
    renderScoreBox('output-ext-child-pugh', null);
  }

  // --- 1.2. MELD 3.0 ---
  if (globalCr !== null) setFieldIfNotModified('input-meld-cr', String(globalCr));
  if (globalNa !== null) setFieldIfNotModified('input-meld-na', String(globalNa));
  if (globalAlb !== null) setFieldIfNotModified('input-meld-alb', String(globalAlb));
  if (globalInr !== null) setFieldIfNotModified('input-meld-inr', String(globalInr));

  const meldBili = getNum('input-meld-bili');
  const meldInr = getNum('input-meld-inr');
  const meldCr = getNum('input-meld-cr');
  const meldNa = getNum('input-meld-na');
  const meldAlb = getNum('input-meld-alb');
  const meldDialysis = Boolean(getEl<HTMLInputElement>('chk-meld-dialysis')?.checked);
  const outMeld = getEl('output-ext-meld3');

  if (meldBili !== null && meldInr !== null && meldCr !== null && meldNa !== null && meldAlb !== null) {
    const meldRes = calculateMeld3({
      isFemale,
      bilirubinMgDl: meldBili,
      inr: meldInr,
      creatinineMgDl: meldCr,
      sodiumMeqL: meldNa,
      albuminGDl: meldAlb,
      dialysisTwicePastWeek: meldDialysis
    });
    appState.medicine.meld3 = meldRes;
    if (outMeld && meldRes) {
      const toneMap: Record<string, string> = {
        low: 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200',
        moderate: 'bg-amber-950/40 border-amber-700/60 text-amber-200',
        high: 'bg-rose-950/45 border-rose-700/70 text-rose-200',
        critical: 'bg-rose-950/70 border-rose-500 text-rose-100'
      };
      outMeld.classList.remove('hidden');
      outMeld.innerHTML = `
        <div class="p-2.5 rounded-lg border space-y-1.5 tabular-nums ${toneMap[meldRes.severity]}">
          <div class="flex items-center justify-between gap-2">
            <strong class="text-xs sm:text-sm">MELD 3.0 Skoru: ${meldRes.score}/40</strong>
            <span class="text-[0.75rem] font-semibold px-1.5 py-0.5 rounded bg-slate-900/60 border border-current/25">${escapeHtml(meldRes.riskLabel)} • 90g Mortalite ${escapeHtml(meldRes.ninetyDayMortality)}</span>
          </div>
          <div class="text-[0.8125rem] leading-relaxed">${escapeHtml(meldRes.recommendation)}</div>
          ${meldRes.clampingNotes.length > 0 ? `<div class="text-[0.6875rem] opacity-85">${meldRes.clampingNotes.map(n => `<div>• ${escapeHtml(n)}</div>`).join('')}</div>` : ''}
          <div class="text-[0.6875rem] opacity-75 font-mono pt-0.5">Kaynak: ${escapeHtml(meldRes.guidelineRef)}</div>
        </div>
      `;
    } else if (outMeld) {
      outMeld.classList.add('hidden');
      outMeld.innerHTML = '';
    }
  } else {
    appState.medicine.meld3 = null;
    if (outMeld) {
      outMeld.classList.add('hidden');
      outMeld.innerHTML = '';
    }
  }

  // --- 2.1. ABCD² (global yaş & KB senkron) ---
  if (ageYears !== null) setFieldIfNotModified('decl-abcd2-age60', ageYears >= 60);
  if (globalSbp !== null || globalDbp !== null) {
    setFieldIfNotModified('decl-abcd2-bp', (globalSbp !== null && globalSbp >= 140) || (globalDbp !== null && globalDbp >= 90));
  }
  const abcd2Read = readSchemaInputs(ABCD2_SCHEMA);
  const abcd2AnyUser = ABCD2_SCHEMA.criteria.some(c => getEl(`decl-abcd2-${c.id}`)?.dataset.userModified === 'true');
  if (abcd2AnyUser) {
    const res = evaluateABCD2(abcd2Read.inputs);
    appState.medicine.abcd2 = res;
    renderScoreBox('output-ext-abcd2', res);
  } else {
    appState.medicine.abcd2 = null;
    renderScoreBox('output-ext-abcd2', null);
  }

  // --- 2.2. NIHSS ---
  const nihssRead = readSchemaInputs(NIHSS_SCHEMA);
  const nihssAnyUser = NIHSS_SCHEMA.criteria.some(c => getEl(`decl-nihss-${c.id}`)?.dataset.userModified === 'true');
  if (nihssRead.hasNonDefault || nihssAnyUser) {
    const res = evaluateNIHSS(nihssRead.inputs);
    appState.medicine.nihss = res;
    renderScoreBox('output-ext-nihss', res);
  } else {
    appState.medicine.nihss = null;
    renderScoreBox('output-ext-nihss', null);
  }

  // --- 3.1. qSOFA (global SS, GCS, SKB senkron) ---
  if (globalRr !== null) setFieldIfNotModified('decl-qsofa-rr22', globalRr >= 22);
  if (globalGcs !== null) setFieldIfNotModified('decl-qsofa-mental', globalGcs < 15);
  if (globalSbp !== null) setFieldIfNotModified('decl-qsofa-sbp100', globalSbp <= 100);
  const qsofaRead = readSchemaInputs(QSOFA_SCHEMA);
  const qsofaAnyUser = QSOFA_SCHEMA.criteria.some(c => getEl(`decl-qsofa-${c.id}`)?.dataset.userModified === 'true');
  if (qsofaRead.hasNonDefault || qsofaAnyUser) {
    const res = evaluateQSOFA(qsofaRead.inputs);
    appState.medicine.qsofa = res;
    renderScoreBox('output-ext-qsofa', res);
  } else {
    appState.medicine.qsofa = null;
    renderScoreBox('output-ext-qsofa', null);
  }

  // --- 3.2. SOFA (global P/F, Plt, Bilirubin, MAP, GCS, Kr senkron) ---
  if (typeof pfRatio === 'number' && pfRatio > 0) {
    const pfCode = pfRatio < 100 ? '4' : pfRatio < 200 ? '3' : pfRatio < 300 ? '2' : pfRatio < 400 ? '1' : '0';
    setFieldIfNotModified('decl-sofa-respiration', pfCode);
  }
  if (globalPlt !== null && globalPlt > 0) {
    const pltCode = globalPlt < 20 ? '4' : globalPlt < 50 ? '3' : globalPlt < 100 ? '2' : globalPlt < 150 ? '1' : '0';
    setFieldIfNotModified('decl-sofa-coagulation', pltCode);
  }
  if (meldBili !== null && meldBili > 0) {
    const bCode = meldBili >= 12 ? '4' : meldBili >= 6 ? '3' : meldBili >= 2 ? '2' : meldBili >= 1.2 ? '1' : '0';
    setFieldIfNotModified('decl-sofa-liver', bCode);
  }
  if (globalSbp !== null && globalDbp !== null && globalSbp > 0 && globalDbp > 0) {
    const map = (globalSbp + 2 * globalDbp) / 3;
    setFieldIfNotModified('decl-sofa-cardiovascular', map < 70 ? '1' : '0');
  }
  if (globalGcs !== null) {
    const gCode = globalGcs < 6 ? '4' : globalGcs <= 9 ? '3' : globalGcs <= 12 ? '2' : globalGcs <= 14 ? '1' : '0';
    setFieldIfNotModified('decl-sofa-cns', gCode);
  }
  if (globalCr !== null && globalCr > 0) {
    const crCode = globalCr >= 5 ? '4' : globalCr >= 3.5 ? '3' : globalCr >= 2 ? '2' : globalCr >= 1.2 ? '1' : '0';
    setFieldIfNotModified('decl-sofa-renal', crCode);
  }
  const sofaRead = readSchemaInputs(SOFA_SCHEMA);
  const sofaAnyUser = SOFA_SCHEMA.criteria.some(c => getEl(`decl-sofa-${c.id}`)?.dataset.userModified === 'true');
  if (sofaAnyUser || (currentExtendedTab === 'sepsis' && sofaRead.hasNonDefault)) {
    const res = evaluateSOFA(sofaRead.inputs);
    appState.medicine.sofa = res;
    renderScoreBox('output-ext-sofa', res);
  } else {
    appState.medicine.sofa = null;
    renderScoreBox('output-ext-sofa', null);
  }

  // --- 4.1. Glasgow-Blatchford (global BUN, Hb, SKB, Nabız, Siroz senkron) ---
  if (globalBun !== null && globalBun > 0) {
    const bunCode = globalBun >= 70 ? 'ge70' : globalBun >= 28 ? '28_69_9' : globalBun >= 22.4 ? '22_4_27_9' : globalBun >= 18.2 ? '18_2_22_3' : 'lt18_2';
    setFieldIfNotModified('decl-glasgow_blatchford-bun', bunCode);
  }
  if (globalHb !== null && globalHb > 0) {
    let hbCode = 'normal';
    if (globalHb < 10) hbCode = 'lt10';
    else if (isFemale && globalHb < 12) hbCode = 'mild';
    else if (!isFemale && globalHb < 12) hbCode = 'mod_male';
    else if (!isFemale && globalHb < 13) hbCode = 'mild';
    setFieldIfNotModified('decl-glasgow_blatchford-hb', hbCode);
  }
  if (globalSbp !== null && globalSbp > 0) {
    const sbpCode = globalSbp < 90 ? 'lt90' : globalSbp < 100 ? '90_99' : globalSbp < 110 ? '100_109' : 'ge110';
    setFieldIfNotModified('decl-glasgow_blatchford-sbp', sbpCode);
  }
  if (globalHr !== null && globalHr > 0) {
    setFieldIfNotModified('decl-glasgow_blatchford-hr100', globalHr >= 100);
  }
  setFieldIfNotModified('decl-glasgow_blatchford-liverDisease', Boolean(appState.medicine.childPugh));
  const gbsRead = readSchemaInputs(GLASGOW_BLATCHFORD_SCHEMA);
  const gbsAnyUser = GLASGOW_BLATCHFORD_SCHEMA.criteria.some(c => getEl(`decl-glasgow_blatchford-${c.id}`)?.dataset.userModified === 'true');
  if (gbsAnyUser || (currentExtendedTab === 'ugib' && gbsRead.hasNonDefault)) {
    const res = evaluateGlasgowBlatchford(gbsRead.inputs);
    appState.medicine.gbs = res;
    renderScoreBox('output-ext-gbs', res);
  } else {
    appState.medicine.gbs = null;
    renderScoreBox('output-ext-gbs', null);
  }
}
