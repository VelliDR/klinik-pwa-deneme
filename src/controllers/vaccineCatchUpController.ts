/**
 * KLİNİK KARAR DESTEK ASİSTANI - AŞI YAKALAMA MOTORU DENETLEYİCİSİ
 * (VACCINE CATCH-UP CONTROLLER)
 * 
 * Emojisiz, saf SVG çizimlerle zenginleştirilmiş, T.C. Sağlık Bakanlığı GBP
 * ve güncel kılavuzlarla %100 uyumlu interaktif yakalama motoru arayüz kontrolcüsü.
 */

import { appState } from '../state';
import { getEl, getNum } from '../utils/domUtils';
import { 
    calculateVaccineCatchUp, 
    checkDoseValidity, 
    type VaccineCatchUpResult,
    type CatchUpVisit,
    type EliminatedVaccineInfo,
    type CatchUpDoseItem,
    type MinimumIntervalRule
} from '../engines/vaccineCatchUpEngine';

// Saf SVG İkon Fonksiyonları (Sıfır Emoji!)
const SVG_ICONS = {
    syringe: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>`,
    
    ban: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    
    checkCircle: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    
    alertTriangle: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    
    calendar: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    
    clock: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    
    shield: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    
    crosshair: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,

    info: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,

    refresh: (cls = 'w-4 h-4'): string =>
        `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`
};

/**
 * Aşı Yakalama Motoru UI'sini Oluşturur ve Günceller
 */
export function updateVaccineCatchUpView(preferredAgeInMonths?: number): void {
    if (typeof document === 'undefined') return;

    // 1. Yaş Tespiti: Parametre -> input-catchup-age-months -> appState.biometry -> varsayılan 18 ay
    let ageInMonths: number = 18;

    if (preferredAgeInMonths !== undefined && preferredAgeInMonths >= 0) {
        ageInMonths = preferredAgeInMonths;
    } else {
        const inputMonths = getNum('input-catchup-age-months');
        const inputYears = getNum('input-catchup-age-years');

        if (inputMonths !== null && inputMonths >= 0) {
            ageInMonths = inputMonths;
        } else if (inputYears !== null && inputYears >= 0) {
            ageInMonths = Math.round(inputYears * 12);
        } else if (appState.biometry.ageMonths !== null) {
            ageInMonths = appState.biometry.ageMonths;
        } else if (appState.biometry.ageYears !== null) {
            ageInMonths = Math.round(appState.biometry.ageYears * 12);
        }
    }

    // Inputları senkronize et
    const monthsInput = getEl('input-catchup-age-months') as HTMLInputElement | null;
    const yearsInput = getEl('input-catchup-age-years') as HTMLInputElement | null;
    if (monthsInput && document.activeElement !== monthsInput) {
        monthsInput.value = ageInMonths.toString();
    }
    if (yearsInput && document.activeElement !== yearsInput) {
        yearsInput.value = (ageInMonths / 12).toFixed(1);
    }

    // TDT 3 gün sonra gelebilir mi seçeneği
    const tdtReturnChk = getEl('chk-catchup-tdt-return') as HTMLInputElement | null;
    const familyCanReturnIn3Days = tdtReturnChk ? tdtReturnChk.checked : true;

    // Hesaplamayı çalıştır
    const result: VaccineCatchUpResult = calculateVaccineCatchUp({
        ageInMonths,
        familyCanReturnIn3Days
    });

    // Rozet ve Başlık Güncellemesi
    const badgeEl = getEl('badge-catchup-summary');
    if (badgeEl) {
        badgeEl.textContent = result.quickBadge.text;
        badgeEl.className = `text-[0.75rem] px-2 py-0.5 rounded font-mono font-semibold border ${result.quickBadge.badgeClass}`;
    }

    const titleEl = getEl('title-catchup-scenario');
    if (titleEl) {
        titleEl.textContent = result.targetScenario;
    }

    // 1. ÜST YAŞ SINIRLARI VE ELENEN AŞILAR KARTI
    renderEliminatedVaccines(result.eliminatedVaccines);

    // 2. VİZİT BAZLI YAKALAMA PLANI
    renderCatchUpVisits(result.visits);

    // 3. MİNİMUM ARALIKLAR VE 4 GÜN KURALI
    renderMinimumIntervals(result.minimumIntervals);

    // 4. KLİNİK TUZAKLAR VE ÇÖZÜM REHBERİ
    renderClinicalTraps(result.clinicalTraps, familyCanReturnIn3Days);
}

/**
 * Üst Yaş Sınırları ve Elenen Aşılar Kartını Render Eder
 */
function renderEliminatedVaccines(items: EliminatedVaccineInfo[]): void {
    const container = getEl('output-catchup-eliminated');
    if (!container) return;

    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
    `;

    items.forEach(item => {
        let borderClass = 'border-slate-800 bg-slate-950/70';
        let iconSvg = SVG_ICONS.checkCircle('w-4 h-4 text-emerald-400 shrink-0');
        let titleColor = 'text-slate-200';

        if (item.status === 'ELIMINATED' || item.status === 'CONTRAINDICATED') {
            borderClass = 'border-rose-900/60 bg-rose-950/20';
            iconSvg = SVG_ICONS.ban('w-4 h-4 text-rose-400 shrink-0');
            titleColor = 'text-rose-200';
        } else if (item.status === 'MODIFIED_PROTOCOL') {
            borderClass = 'border-amber-900/60 bg-amber-950/20';
            iconSvg = SVG_ICONS.alertTriangle('w-4 h-4 text-amber-400 shrink-0');
            titleColor = 'text-amber-200';
        }

        html += `
            <div class="p-2.5 rounded-xl border ${borderClass} flex flex-col justify-between gap-1.5 transition-all">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-1.5 min-w-0">
                        ${iconSvg}
                        <span class="font-bold text-xs ${titleColor} truncate">${item.name}</span>
                    </div>
                    <span class="text-[0.75rem] px-1.5 py-0.2 rounded font-mono font-semibold border ${item.badgeClass} shrink-0">
                        ${item.badgeText}
                    </span>
                </div>
                <div class="text-[0.8125rem] text-slate-300 font-medium leading-tight">${item.title}</div>
                <div class="text-[0.75rem] text-slate-400 leading-relaxed">${item.rationale}</div>
                <div class="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[0.75rem] text-slate-500 font-mono">
                    <span>${item.ageCutoffNote}</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Vizit Bazlı Aşı Yakalama Planını Render Eder
 */
function renderCatchUpVisits(visits: CatchUpVisit[]): void {
    const container = getEl('output-catchup-visits');
    if (!container) return;

    let html = `<div class="space-y-3">`;

    visits.forEach((v, idx) => {
        const isFirst = idx === 0;
        const borderClass = isFirst 
            ? 'border-sky-600/70 bg-gradient-to-br from-slate-900 via-sky-950/20 to-slate-900' 
            : 'border-slate-800 bg-slate-900/50';

        html += `
            <div class="rounded-xl border ${borderClass} p-3.5 space-y-2.5 shadow-sm">
                <!-- Vizit Başlığı -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-6 h-6 rounded-lg bg-sky-950 border border-sky-600/60 flex items-center justify-center shrink-0 text-sky-300 font-bold text-xs">
                            ${idx + 1}
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-bold text-xs sm:text-sm text-slate-100 truncate">${v.visitTitle}</h4>
                            <p class="text-[0.75rem] text-sky-400 font-medium">${v.intervalFromStart} • ${v.minimumIntervalRule}</p>
                        </div>
                    </div>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[0.75rem] font-mono border border-slate-700 shrink-0 self-start sm:self-auto">
                        ${SVG_ICONS.clock('w-3 h-3 text-sky-400')}
                        <span>${v.timingLabel}</span>
                    </span>
                </div>

                <!-- Uyarı Notu (Varsa) -->
                ${v.warningNote ? `
                    <div class="p-2 rounded-lg bg-amber-950/40 border border-amber-700/60 text-amber-200 text-[0.75rem] flex items-center gap-2">
                        ${SVG_ICONS.alertTriangle('w-4 h-4 text-amber-400 shrink-0')}
                        <span>${v.warningNote}</span>
                    </div>
                ` : ''}

                <!-- Aşı Dozları Listesi -->
                <div class="space-y-1.5">
                    <div class="text-[0.75rem] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        ${SVG_ICONS.syringe('w-3.5 h-3.5 text-sky-400')}
                        <span>Uygulanacak Aşılar &amp; Enjeksiyon Protokolü:</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        ${v.doses.map((d: CatchUpDoseItem) => renderDoseCard(d)).join('')}
                    </div>
                </div>

                <!-- Klinik Notlar -->
                ${v.clinicalNotes && v.clinicalNotes.length > 0 ? `
                    <div class="p-2 rounded-lg bg-[#0c1322] border border-slate-800 text-[0.75rem] text-slate-400 space-y-1">
                        ${v.clinicalNotes.map(n => `
                            <div class="flex items-start gap-1.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 shrink-0"></span>
                                <span class="leading-relaxed">${n}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Tekil Aşı Dozu Kartını Render Eder
 */
function renderDoseCard(dose: CatchUpDoseItem): string {
    let typeBadge = '';
    let typeBorder = 'border-slate-800 bg-slate-950';

    if (dose.type === 'live_parenteral') {
        typeBadge = '<span class="text-[0.75rem] px-1.5 py-0.2 rounded bg-violet-950 text-violet-300 border border-violet-800 font-semibold shrink-0">Canlı Parenteral</span>';
        typeBorder = 'border-violet-900/50 bg-violet-950/10';
    } else if (dose.type === 'live_oral') {
        typeBadge = '<span class="text-[0.75rem] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold shrink-0">Canlı Oral (28g Muaf)</span>';
        typeBorder = 'border-amber-900/50 bg-amber-950/10';
    } else if (dose.type === 'diagnostic') {
        typeBadge = '<span class="text-[0.75rem] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold shrink-0">Teşhis Testi</span>';
        typeBorder = 'border-cyan-900/50 bg-cyan-950/10';
    } else {
        typeBadge = '<span class="text-[0.75rem] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold shrink-0">İnaktif Aşı</span>';
        typeBorder = 'border-emerald-900/50 bg-emerald-950/10';
    }

    const priorityBadge = dose.isPriority 
        ? '<span class="text-[0.6875rem] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold shrink-0">ÖNCELİKLİ</span>' 
        : '';

    return `
        <div class="p-2.5 rounded-lg border ${typeBorder} space-y-1">
            <div class="flex items-center justify-between gap-1.5">
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-1.5 h-1.5 rounded-full ${dose.type === 'live_parenteral' ? 'bg-violet-400' : (dose.type === 'live_oral' ? 'bg-amber-400' : 'bg-emerald-400')} shrink-0"></span>
                    <span class="font-bold text-xs text-slate-100 truncate">${dose.vaccine}</span>
                </div>
                <div class="flex items-center gap-1">
                    ${priorityBadge}
                    ${typeBadge}
                </div>
            </div>
            <div class="text-[0.75rem] text-slate-400 font-mono flex items-center justify-between gap-1">
                <span>Doz: <strong class="text-slate-200">${dose.doseLabel}</strong></span>
                <span class="text-sky-300 font-semibold">${dose.route}</span>
            </div>
            <div class="text-[0.75rem] text-slate-300 flex items-start gap-1 leading-tight">
                ${SVG_ICONS.crosshair('w-3 h-3 text-cyan-400 shrink-0 mt-0.5')}
                <span>${dose.site}</span>
            </div>
            ${dose.notes ? `
                <div class="text-[0.75rem] text-slate-500 italic border-t border-slate-800/80 pt-1 mt-1 leading-relaxed">
                    ${dose.notes}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Minimum Aralıklar ve 4 Gün Kuralı Tablosunu Render Eder
 */
function renderMinimumIntervals(rules: MinimumIntervalRule[]): void {
    const container = getEl('output-catchup-rules');
    if (!container) return;

    let html = `
        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
            <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-900 text-slate-300 text-[0.75rem] uppercase font-semibold border-b border-slate-800">
                    <tr>
                        <th class="p-2.5 w-40">Aşı Adı</th>
                        <th class="p-2.5 w-48">Minimum Doz Aralığı</th>
                        <th class="p-2.5 w-48">4 Gün Tolerans Kuralı</th>
                        <th class="p-2.5">Klinik Not &amp; İmmünolojik İlke</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/80 text-[0.8125rem]">
    `;

    rules.forEach(r => {
        html += `
            <tr class="hover:bg-slate-900/50 transition-colors">
                <td class="p-2.5 font-bold text-slate-100 align-top">
                    <div class="flex items-center gap-1.5">
                        ${SVG_ICONS.syringe('w-3.5 h-3.5 text-sky-400 shrink-0')}
                        <span>${r.shortName}</span>
                    </div>
                    <div class="text-[0.75rem] text-slate-500 font-normal mt-0.5">${r.vaccine}</div>
                </td>
                <td class="p-2.5 text-slate-300 font-mono text-[0.75rem] align-top whitespace-pre-line leading-relaxed">
                    ${r.intervalBetweenDoses}
                </td>
                <td class="p-2.5 text-amber-300/90 text-[0.75rem] align-top leading-relaxed">
                    ${r.graceRule4Days}
                </td>
                <td class="p-2.5 text-slate-400 text-[0.75rem] align-top leading-relaxed">
                    ${r.clinicalPearl}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Klinik Tuzaklar ve Çözüm Şemasını Render Eder
 */
function renderClinicalTraps(traps: any[], familyCanReturnIn3Days: boolean): void {
    const container = getEl('output-catchup-traps');
    if (!container) return;

    const tdtTrap = traps.find(t => t.id === 'tdt_live_clash');
    if (!tdtTrap) return;

    let html = `
        <div class="p-3.5 rounded-xl border border-rose-900/70 bg-gradient-to-r from-rose-950/20 via-slate-900 to-amber-950/20 space-y-3">
            <div class="flex items-center justify-between gap-2 border-b border-rose-800/60 pb-2">
                <div class="flex items-center gap-2">
                    ${SVG_ICONS.alertTriangle('w-4 h-4 text-rose-400 shrink-0')}
                    <h4 class="font-bold text-xs sm:text-sm text-rose-200">${tdtTrap.title}</h4>
                </div>
                <span class="text-[0.75rem] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono font-semibold">
                    Kritik İmmünolojik Tuzak
                </span>
            </div>

            <p class="text-[0.8125rem] text-slate-300 leading-relaxed font-medium">
                ${tdtTrap.trapSummary}
            </p>

            <div class="p-2 rounded bg-slate-950 border border-slate-800 text-[0.75rem] text-slate-400 leading-relaxed">
                <strong class="text-slate-200">Neden Meydana Gelir?</strong> ${tdtTrap.whyItHappens}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                <!-- Çözüm 1 (İdeal) -->
                <div class="p-3 rounded-lg border ${familyCanReturnIn3Days ? 'border-emerald-600/70 bg-emerald-950/20 ring-1 ring-emerald-500/30' : 'border-slate-800 bg-slate-950/60'} space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                            ${SVG_ICONS.checkCircle('w-3.5 h-3.5 text-emerald-400')}
                            <span>${tdtTrap.idealSolution.title}</span>
                        </span>
                        ${familyCanReturnIn3Days ? '<span class="text-[0.6875rem] bg-emerald-900 text-emerald-200 px-1.5 py-0.2 rounded font-bold">SEÇİLEN AKTİF ŞEMA</span>' : ''}
                    </div>
                    <div class="text-[0.75rem] text-slate-300 leading-relaxed space-y-1">
                        <div><strong class="text-emerald-200">Adım 1:</strong> ${tdtTrap.idealSolution.step1}</div>
                        <div><strong class="text-emerald-200">Adım 2:</strong> ${tdtTrap.idealSolution.step2}</div>
                    </div>
                    <div class="text-[0.75rem] text-emerald-400/90 pt-1 border-t border-emerald-900/50 font-medium">
                        ${tdtTrap.idealSolution.pros}
                    </div>
                </div>

                <!-- Çözüm 2 (Pratik) -->
                <div class="p-3 rounded-lg border ${!familyCanReturnIn3Days ? 'border-amber-600/70 bg-amber-950/20 ring-1 ring-amber-500/30' : 'border-slate-800 bg-slate-950/60'} space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                            ${SVG_ICONS.alertTriangle('w-3.5 h-3.5 text-amber-400')}
                            <span>${tdtTrap.alternativeSolution.title}</span>
                        </span>
                        ${!familyCanReturnIn3Days ? '<span class="text-[0.6875rem] bg-amber-900 text-amber-200 px-1.5 py-0.2 rounded font-bold">SEÇİLEN AKTİF ŞEMA</span>' : ''}
                    </div>
                    <div class="text-[0.75rem] text-slate-300 leading-relaxed space-y-1">
                        <div><strong class="text-amber-200">Adım 1:</strong> ${tdtTrap.alternativeSolution.step1}</div>
                        <div><strong class="text-amber-200">Adım 2:</strong> ${tdtTrap.alternativeSolution.step2}</div>
                    </div>
                    <div class="text-[0.75rem] text-amber-400/90 pt-1 border-t border-amber-900/50 font-medium">
                        ${tdtTrap.alternativeSolution.pros} • <em>${tdtTrap.alternativeSolution.cons}</em>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * 4 Gün Kuralı İnteraktif Test Aracını Çalıştırır
 */
export function runInteractiveIntervalTester(): void {
    if (typeof document === 'undefined') return;

    const selectVax = getEl('select-catchup-test-vax') as HTMLSelectElement | null;
    const inputDays = getEl('input-catchup-test-days') as HTMLInputElement | null;
    const outputEl = getEl('output-catchup-test-result');

    if (!selectVax || !inputDays || !outputEl) return;

    const vaxType = selectVax.value as any;
    const days = parseInt(inputDays.value, 10);

    if (isNaN(days) || days < 0) {
        outputEl.innerHTML = `
            <div class="p-2 rounded bg-slate-900 border border-slate-800 text-[0.75rem] text-slate-400">
                Lütfen iki doz arasında geçen gün sayısını giriniz.
            </div>
        `;
        return;
    }

    const testResult = checkDoseValidity(vaxType, days);

    let badgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-700';
    let iconSvg = SVG_ICONS.checkCircle('w-4 h-4 text-emerald-400 shrink-0');

    if (testResult.severity === 'danger') {
        badgeClass = 'bg-rose-950 text-rose-300 border-rose-700';
        iconSvg = SVG_ICONS.ban('w-4 h-4 text-rose-400 shrink-0');
    } else if (testResult.severity === 'warning') {
        badgeClass = 'bg-amber-950 text-amber-300 border-amber-700';
        iconSvg = SVG_ICONS.alertTriangle('w-4 h-4 text-amber-400 shrink-0');
    }

    outputEl.innerHTML = `
        <div class="p-2.5 rounded-lg border ${testResult.severity === 'danger' ? 'border-rose-800 bg-rose-950/20' : (testResult.severity === 'warning' ? 'border-amber-800 bg-amber-950/20' : 'border-emerald-800 bg-emerald-950/20')} space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5">
                    ${iconSvg}
                    <span class="font-bold text-xs ${testResult.severity === 'danger' ? 'text-rose-200' : (testResult.severity === 'warning' ? 'text-amber-200' : 'text-emerald-200')}">${testResult.statusText}</span>
                </div>
                <span class="text-[0.75rem] px-2 py-0.5 rounded font-mono font-bold border ${badgeClass}">
                    Min: ${testResult.minimumRequiredDays} Gün | Gerçekleşen: ${testResult.intervalDays} Gün
                </span>
            </div>
            <p class="text-[0.8125rem] text-slate-300 leading-relaxed">${testResult.explanation}</p>
            <div class="text-[0.75rem] font-semibold ${testResult.severity === 'danger' ? 'text-rose-300' : 'text-emerald-300'} pt-1 border-t border-slate-800/80">
                Öneri: ${testResult.recommendation}
            </div>
        </div>
    `;
}

/**
 * Controller Dinleyicilerini Başlatır
 */
export function initVaccineCatchUpController(): void {
    if (typeof document === 'undefined') return;

    // 1. Yaş Input Dinleyicileri (Ay ve Yıl Çift Yönlü Senkronizasyonu)
    const monthsInput = getEl('input-catchup-age-months') as HTMLInputElement | null;
    const yearsInput = getEl('input-catchup-age-years') as HTMLInputElement | null;

    if (monthsInput) {
        monthsInput.addEventListener('input', () => {
            const m = parseFloat(monthsInput.value);
            if (!isNaN(m) && m >= 0) {
                if (yearsInput && document.activeElement === monthsInput) {
                    yearsInput.value = (m / 12).toFixed(1);
                }
                updateVaccineCatchUpView(m);
            }
        });
    }

    if (yearsInput) {
        yearsInput.addEventListener('input', () => {
            const y = parseFloat(yearsInput.value);
            if (!isNaN(y) && y >= 0) {
                const m = Math.round(y * 12);
                if (monthsInput && document.activeElement === yearsInput) {
                    monthsInput.value = m.toString();
                }
                updateVaccineCatchUpView(m);
            }
        });
    }

    // 2. Senaryo Hızlı Butonları
    const btn12to71 = getEl('btn-catchup-scen-12-71');
    if (btn12to71) {
        btn12to71.addEventListener('click', (e) => {
            e.preventDefault();
            if (monthsInput) monthsInput.value = '24';
            if (yearsInput) yearsInput.value = '2.0';
            updateVaccineCatchUpView(24);
        });
    }

    const btnGe72 = getEl('btn-catchup-scen-ge-72');
    if (btnGe72) {
        btnGe72.addEventListener('click', (e) => {
            e.preventDefault();
            if (monthsInput) monthsInput.value = '84';
            if (yearsInput) yearsInput.value = '7.0';
            updateVaccineCatchUpView(84);
        });
    }

    const btnInfant = getEl('btn-catchup-scen-infant');
    if (btnInfant) {
        btnInfant.addEventListener('click', (e) => {
            e.preventDefault();
            if (monthsInput) monthsInput.value = '5';
            if (yearsInput) yearsInput.value = '0.4';
            updateVaccineCatchUpView(5);
        });
    }

    // 3. TDT 3 Gün Sonra Gelme Seçeneği
    const tdtReturnChk = getEl('chk-catchup-tdt-return');
    if (tdtReturnChk) {
        tdtReturnChk.addEventListener('change', () => {
            const m = getNum('input-catchup-age-months') ?? 24;
            updateVaccineCatchUpView(m);
        });
    }

    // 4. "Hasta Yaşını Al" Butonu
    const btnSyncPatientAge = getEl('btn-catchup-sync-patient-age');
    if (btnSyncPatientAge) {
        btnSyncPatientAge.addEventListener('click', (e) => {
            e.preventDefault();
            let m = appState.biometry.ageMonths;
            if (m === null && appState.biometry.ageYears !== null) {
                m = Math.round(appState.biometry.ageYears * 12);
            }
            if (m !== null && m >= 0) {
                if (monthsInput) monthsInput.value = m.toString();
                if (yearsInput) yearsInput.value = (m / 12).toFixed(1);
                updateVaccineCatchUpView(m);
            }
        });
    }

    // 5. 4 Gün Kuralı İnteraktif Test Aracı Dinleyicileri
    const selectVax = getEl('select-catchup-test-vax');
    const inputDays = getEl('input-catchup-test-days');
    const btnRunTest = getEl('btn-run-catchup-interval-test');

    if (selectVax) selectVax.addEventListener('change', runInteractiveIntervalTester);
    if (inputDays) inputDays.addEventListener('input', runInteractiveIntervalTester);
    if (btnRunTest) btnRunTest.addEventListener('click', (e) => {
        e.preventDefault();
        runInteractiveIntervalTester();
    });

    // İlk test sonucunu çiz
    runInteractiveIntervalTester();
}
