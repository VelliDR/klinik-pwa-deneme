// ============================================================================
// WORKSTATION CONTROLLER
// Hasta Başlığı (Banner), Canlı Klinik Alarm Denetleyicisi (Inspector),
// Canlı SOAP Epikriz Senkronizasyonu ve Akıllı İstasyon / Kısayol Yöneticisi
// ============================================================================
import { appState } from '../state';
import { escapeHtml, getEl, getVal } from '../utils/domUtils';
import { generateSOAP, sanitizeForHbys } from '../utils/soapGenerator';
import { expandDotPhrases, appendTemplateToText } from '../utils/soapTemplates';
import { resetAnaphylaxisTimer, resetStatusStopwatch, resetEmergencyWeightMode } from '../utils/emergencyManager';
import { initEmergencyUiController, resetEmergencyUi } from './emergencyUiController';
import { initTheme, toggleTheme } from '../utils/themeManager';
import { getSvgIcon } from '../utils/icons';
import { QuickSwitcherItem, QUICK_SWITCHER_ITEMS, searchQuickSwitcher, jumpToMotor } from '../utils/quickSwitcher';
import { initMonographModalController } from './monographModalController';
import { initEquivalentsModalController } from './equivalentsModalController';
import { initPrescriptionModalController, resetPrescriptionData } from './prescriptionModalController';
import { initEcgUiController } from './ecgUiController';
import { initVaccineModalController } from './vaccineModalController';
import {
    WorkstationPackage,
    ClinicalMotorDefinition,
    SidebarGroupDefinition,
    CLINICAL_MOTORS,
    PRESET_PACKAGES,
    SIDEBAR_GROUPS,
    DEFAULT_SIDEBAR_GROUP_ID,
    getCustomPackages,
    saveCustomPackage,
    deleteCustomPackage,
    resolveMotorDependencies
} from '../workstationPackages';
import { renderSelectedDrugs, executeDrugSearch, updateSearchModeUI } from './safetyAlertsController';

let onTabsUpdateCallback: () => void = () => {};

export function setWorkstationUpdateCallback(callback: () => void): void {
    onTabsUpdateCallback = callback;
}

// ----------------------------------------------------------------------------
// 1. HASTA BAŞLIĞI VE DEMOGRAFİ ŞERİDİ (PATIENT CONTEXT BANNER)
// ----------------------------------------------------------------------------
export function updatePatientBanner(): void {
    const bannerAge = getEl('banner-age');
    const bannerGender = getEl('banner-gender');
    const bannerBiometry = getEl('banner-biometry');
    const bannerBSA = getEl('banner-bsa');
    const bannerEGFR = getEl('banner-egfr');

    const headerPatientInfo = getEl('header-patient-info');
    const headerPatientAge = getEl('header-patient-age');
    const headerPatientGender = getEl('header-patient-gender');
    const badgeAgeGroup = getEl('badge-age-group');

    // 1. Yaş Metni
    let ageDisplay = '--';
    let shortAgeDisplay = '--';
    const y = appState.biometry.ageYears;
    const m = appState.biometry.ageMonths;
    const d = appState.biometry.ageDays;

    if (d !== null && d !== undefined && d >= 0 && d <= 28) {
        shortAgeDisplay = `${d} Günlük`;
        ageDisplay = appState.biometry.ageFormatted && appState.biometry.ageFormatted !== '--' 
            ? appState.biometry.ageFormatted 
            : `${d} Günlük Yenidoğan`;
    } else if (m !== null && m !== undefined && m >= 0 && (y === null || y < 1)) {
        shortAgeDisplay = `${Math.floor(m)} Aylık`;
        ageDisplay = `${Math.floor(m)} Aylık`;
    } else if (y !== null && y !== undefined && y >= 0) {
        shortAgeDisplay = `${Math.floor(y)} Yaş`;
        ageDisplay = `${Math.floor(y)} Yaş`;
    } else if (appState.biometry.ageFormatted && appState.biometry.ageFormatted !== '--') {
        ageDisplay = appState.biometry.ageFormatted;
        shortAgeDisplay = appState.biometry.ageFormatted;
    }

    if (bannerAge) {
        bannerAge.textContent = ageDisplay;
    }

    // 2. Cinsiyet Metni
    let genderDisplay = '--';
    if (appState.biometry.gender === 'male' || appState.biometry.gender === 'M') {
        genderDisplay = 'Erkek';
    } else if (appState.biometry.gender === 'female' || appState.biometry.gender === 'F') {
        genderDisplay = (y !== null && y !== undefined && y >= 18) ? 'Kadın' : 'Kız';
    }

    if (bannerGender) {
        bannerGender.textContent = genderDisplay;
    }

    // 3. Üst Bar (Header) Hasta Yaş & Cinsiyet Rozeti
    const hasAge = (shortAgeDisplay !== '--');
    const hasGender = (genderDisplay !== '--');

    if (headerPatientInfo) {
        if (hasAge || hasGender) {
            headerPatientInfo.classList.remove('hidden');
            headerPatientInfo.classList.add('flex');

            if (headerPatientAge) {
                headerPatientAge.textContent = hasAge ? shortAgeDisplay : '--';
            }
            if (headerPatientGender) {
                headerPatientGender.textContent = hasGender ? genderDisplay : '--';
            }
            const headerPatientWeight = getEl('header-patient-weight');
            if (headerPatientWeight) {
                const w = appState.biometry.weightKg;
                headerPatientWeight.textContent = (w !== null && w !== undefined && w > 0) ? `${w} kg` : '--';
            }
        } else {
            headerPatientInfo.classList.add('hidden');
            headerPatientInfo.classList.remove('flex');
        }
    }

    // 4. Kategori / Yaş Grubu Rozeti
    if (badgeAgeGroup) {
        if (appState.biometry.ageGroupTag) {
            badgeAgeGroup.textContent = appState.biometry.ageGroupTag;
            badgeAgeGroup.classList.remove('hidden');
        } else {
            badgeAgeGroup.classList.add('hidden');
        }
    }

    // 5. Biyometri, BSA, eGFR
    if (bannerBiometry) {
        const w = appState.biometry.weightKg;
        const h = appState.biometry.heightCm;
        if (w && h) {
            bannerBiometry.textContent = `${w}kg / ${h}cm`;
        } else if (w) {
            bannerBiometry.textContent = `${w} kg`;
        } else if (h) {
            bannerBiometry.textContent = `${h} cm`;
        } else {
            bannerBiometry.textContent = '--';
        }
    }

    if (bannerBSA) {
        bannerBSA.textContent = appState.biometry.bsa ? `${appState.biometry.bsa.toFixed(2)} m²` : '--';
    }

    if (bannerEGFR) {
        const egfr = appState.biometry.egfr;
        if (egfr !== null && egfr !== undefined) {
            bannerEGFR.textContent = `${egfr} mL/dk`;
            if (egfr >= 90) bannerEGFR.className = 'font-bold text-emerald-400';
            else if (egfr >= 60) bannerEGFR.className = 'font-bold text-cyan-400';
            else if (egfr >= 30) bannerEGFR.className = 'font-bold text-amber-400';
            else bannerEGFR.className = 'font-bold text-rose-400';
        } else {
            bannerEGFR.textContent = '--';
            bannerEGFR.className = 'font-bold text-slate-400';
        }
    }
}

// ----------------------------------------------------------------------------
// 2. CANLI KLİNİK ALARM DENETLEYİCİSİ (CLINICAL ALERTS INSPECTOR)
// ----------------------------------------------------------------------------
export function updateClinicalAlertsInspector(): void {
    let alertCount = 0;

    // 1. eGFR Renal Risk Alert
    const alertEgfr = getEl('alert-item-egfr');
    const textEgfr = getEl('alert-text-egfr');
    const egfr = appState.biometry.egfr;
    if (alertEgfr && textEgfr) {
        if (egfr !== null && egfr !== undefined && egfr < 60) {
            alertEgfr.classList.remove('hidden');
            const stage = egfr < 15 ? '5 (Böbrek Yetmezliği / Diyaliz)' : (egfr < 30 ? '4 (Ciddi eGFR Kaybı)' : '3 (Orta Derece Azalma)');
            textEgfr.textContent = `eGFR: ${egfr} mL/dk - Evre ${stage}. Dozaj kısıtlamalarını kontrol edin.`;
            alertCount++;
        } else {
            alertEgfr.classList.add('hidden');
        }
    }

    // 2. Triple Whammy AKI Alert
    const alertTw = getEl('alert-item-tw');
    const textTw = getEl('alert-text-tw');
    const tw = appState.safetyPrescription?.tripleWhammy;
    if (alertTw && textTw) {
        if (tw?.isTripleWhammy) {
            alertTw.classList.remove('hidden');
            textTw.textContent = `ACEi/ARB + Diüretik + NSAİİ üçlüsü saptandı! Akut böbrek hasarı (AKI) riski çok yüksek.`;
            alertCount++;
        } else if (tw?.isDoubleRisk) {
            alertTw.classList.remove('hidden');
            textTw.textContent = `İkili riskli kombinasyon: ${tw.mechanism || 'Renal perfüzyon bozulabilir'}`;
            alertCount++;
        } else {
            alertTw.classList.add('hidden');
        }
    }

    // 2b. Serotonin Sendromu Alert
    const alertSero = getEl('alert-item-serotonin');
    const textSero = getEl('alert-text-serotonin');
    const sero = appState.safetyPrescription?.serotoninSyndrome;
    if (alertSero && textSero) {
        if (sero && sero.isHighRisk) {
            alertSero.classList.remove('hidden');
            textSero.textContent = `${sero.title} - ${sero.mechanism || 'Serotonin toksisitesi riski'}`;
            alertCount++;
        } else {
            alertSero.classList.add('hidden');
        }
    }

    // 2c. Ölümcül Hiperkalemi Alert
    const alertHyperK = getEl('alert-item-hyperkalemia');
    const textHyperK = getEl('alert-text-hyperkalemia');
    const hyperK = appState.safetyPrescription?.hyperkalemiaRisk;
    if (alertHyperK && textHyperK) {
        if (hyperK && hyperK.isAtRisk) {
            alertHyperK.classList.remove('hidden');
            textHyperK.textContent = `${hyperK.title} - ${hyperK.mechanism || 'Renal K+ atılımı bozulabilir'}`;
            alertCount++;
        } else {
            alertHyperK.classList.add('hidden');
        }
    }

    // 2d. CYP3A4 Güçlü İnhibisyonu & Statin Rabdomiyoliz Alert
    const alertCypStatin = getEl('alert-item-cyp-statin');
    const textCypStatin = getEl('alert-text-cyp-statin');
    const cypStatin = appState.safetyPrescription?.cypStatinInteraction;
    if (alertCypStatin && textCypStatin) {
        if (cypStatin && cypStatin.hasInteraction) {
            alertCypStatin.classList.remove('hidden');
            textCypStatin.textContent = `${cypStatin.title} - ${cypStatin.mechanism || 'Rabdomiyoliz riski'}`;
            alertCount++;
        } else {
            alertCypStatin.classList.add('hidden');
        }
    }

    // 3. QTc Prolongation Alert
    const alertQtc = getEl('alert-item-qtc');
    const textQtc = getEl('alert-text-qtc');
    const cardiac = appState.other?.cardiac;
    if (alertQtc && textQtc) {
        if (cardiac && (cardiac.colorCode === 'danger' || cardiac.interpretation?.toLowerCase().includes('uzamış') || cardiac.status === 'BLOCKED')) {
            alertQtc.classList.remove('hidden');
            textQtc.textContent = `${cardiac.interpretation || 'Uzamış QTc aralığı'} (QTcB: ${cardiac.qtcBazett || '--'} ms) - Torsades de Pointes riski!`;
            alertCount++;
        } else {
            alertQtc.classList.add('hidden');
        }
    }

    // 4. Neonatal Jaundice / Hyperbilirubinemia Alert
    const alertJaundice = getEl('alert-item-jaundice');
    const textJaundice = getEl('alert-text-jaundice');
    const bhutani = appState.neonatology?.bhutani;
    if (alertJaundice && textJaundice) {
        if (bhutani && (bhutani.alertClass === 'danger' || bhutani.alertClass === 'warning')) {
            alertJaundice.classList.remove('hidden');
            textJaundice.textContent = `TSB: ${bhutani.totalBilirubin} mg/dL (${bhutani.riskGroupLabel || ''}) - ${bhutani.interpretation}`;
            alertCount++;
        } else {
            alertJaundice.classList.add('hidden');
        }
    }

    // 5. Thrombosis / Embolism Alert
    const alertThrombosis = getEl('alert-item-thrombosis');
    const textThrombosis = getEl('alert-text-thrombosis');
    const pte = appState.thrombosis?.wellsPTE;
    const dvt = appState.thrombosis?.wellsDVT;
    if (alertThrombosis && textThrombosis) {
        const isPteHigh = Boolean(pte && (pte.alertClass === 'danger' || pte.alertClass.includes('rose') || pte.isPELikely));
        const isDvtHigh = Boolean(dvt && (dvt.alertClass === 'danger' || dvt.alertClass.includes('rose') || dvt.score >= 3));
        if (isPteHigh || isDvtHigh) {
            alertThrombosis.classList.remove('hidden');
            textThrombosis.textContent = `${isPteHigh && pte ? `PTE: ${pte.riskCategory} (${pte.score}p)` : ''} ${isDvtHigh && dvt ? `DVT: ${dvt.riskCategory} (${dvt.score}p)` : ''}`.trim();
            alertCount++;
        } else {
            alertThrombosis.classList.add('hidden');
        }
    }

    // 6. Neonatal Toxic/Contraindicated Drug Alert
    const alertNeoDrug = getEl('alert-item-neonatal-drug');
    const textNeoDrug = getEl('alert-text-neonatal-drug');
    const neoDrug = appState.safetyPrescription?.neonatalDrugSafety;
    if (alertNeoDrug && textNeoDrug) {
        if (neoDrug && neoDrug.alertsCount > 0) {
            alertNeoDrug.classList.remove('hidden');
            textNeoDrug.textContent = neoDrug.alerts.map((a: any) => `${a.drugName}: ${a.title}`).join(' | ');
            alertCount++;
        } else {
            alertNeoDrug.classList.add('hidden');
        }
    }

    // 7. Neonatal Excessive Weight Loss Alert
    const alertNeoWeight = getEl('alert-item-neonatal-weight');
    const textNeoWeight = getEl('alert-text-neonatal-weight');
    const neoWeight = appState.neonatology?.weightLoss;
    if (alertNeoWeight && textNeoWeight) {
        if (neoWeight && (neoWeight.alertClass === 'danger' || neoWeight.alertClass === 'warning')) {
            alertNeoWeight.classList.remove('hidden');
            textNeoWeight.textContent = `${neoWeight.interpretation} (Doğum: ${neoWeight.birthWeightG}g, Mevcut: ${neoWeight.currentWeightG}g)`;
            alertCount++;
        } else {
            alertNeoWeight.classList.add('hidden');
        }
    }

    // 8. Nephrology, Toxicology & Respiratory Alert
    const alertNephrotox = getEl('alert-item-nephrotox');
    const textNephrotox = getEl('alert-text-nephrotox');
    const nt = appState.nephroTox;
    if (alertNephrotox && textNephrotox) {
        const alerts: string[] = [];
        if (nt?.paracetamol?.isToxic) alerts.push('Parasetamol Toksisitesi: Acil IV NAC Protokolü Başlatılmalı');
        if (nt?.osmolalGap?.isCriticalGap) alerts.push(`Kritik Osmolal Açık (${nt.osmolalGap.osmolalGap} mOsm/kg): Toksik Alkol Zehirlenmesi`);
        if (nt?.curb65 && nt.curb65.score >= 3) alerts.push(`Ağır Pnömoni (CURB-65: ${nt.curb65.score}/5): YBÜ/Yatış gereklidir`);
        if (alerts.length > 0) {
            alertNephrotox.classList.remove('hidden');
            textNephrotox.textContent = alerts.join(' | ');
            alertCount++;
        } else {
            alertNephrotox.classList.add('hidden');
        }
    }

    // Counter & Empty state update
    const badgeTotal = getEl('badge-total-alerts');
    const emptyState = getEl('alert-item-empty');
    const bannerRisk = getEl('banner-risk-badge');
    const bannerRiskText = getEl('banner-risk-text');

    if (badgeTotal) badgeTotal.textContent = `${alertCount} Uyarı`;
    if (emptyState) {
        if (alertCount > 0) emptyState.classList.add('hidden');
        else emptyState.classList.remove('hidden');
    }

    if (bannerRisk && bannerRiskText) {
        if (alertCount > 0) {
            bannerRisk.classList.remove('hidden');
            bannerRisk.classList.add('flex');
            bannerRiskText.textContent = `${alertCount} Risk`;
        } else {
            bannerRisk.classList.add('hidden');
            bannerRisk.classList.remove('flex');
        }
    }
}

/**
 * Evrensel Pano Kopyalama Yöneticisi (W3C Clipboard API + execCommand Fallback)
 * Güvensiz bağlamlarda (HTTP/yerel hastane intranetleri) veya pano izni reddedildiğinde
 * gizli bir textarea üzerinden kopyalama yaparak sessiz çökmeleri ve unhandled promise rejection'ları engeller.
 */
export function copyToClipboardWithFallback(
    text: string,
    onSuccess: () => void,
    onError?: (err: unknown) => void
): void {
    const cleanText = sanitizeForHbys(text);

    function fallbackCopy(): void {
        try {
            if (typeof document === 'undefined') {
                onError?.(new Error('DOM ortamı bulunamadı.'));
                return;
            }
            const textarea = document.createElement('textarea');
            textarea.value = cleanText;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, 99999);
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (successful) {
                onSuccess();
            } else {
                onError?.(new Error('Pano kopyalama işlemi başarısız oldu.'));
            }
        } catch (err) {
            onError?.(err);
        }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(cleanText)
            .then(() => {
                onSuccess();
            })
            .catch(() => {
                fallbackCopy();
            });
    } else {
        fallbackCopy();
    }
}

// ----------------------------------------------------------------------------
// 3. CANLI SOAP EPİKRİZ GÜNCELLEMESİ (LIVE SOAP)
// ----------------------------------------------------------------------------
export function updateLiveSOAP(): void {
    const soapText = generateSOAP();
    const mainOutput = getEl<HTMLTextAreaElement>('text-soap-output');
    if (mainOutput) mainOutput.value = soapText;
    const modalOutput = getEl<HTMLTextAreaElement>('text-soap-modal');
    if (modalOutput) modalOutput.value = soapText;
}

// ----------------------------------------------------------------------------
// 4. SOL MENÜ GRUP FİLTRELEME, AKILLI PAKETLER VE PAKET ÖZELLEŞTİRME
// ----------------------------------------------------------------------------
let currentActivePackId: string | null = null;
let currentActiveGroupId: string | null = DEFAULT_SIDEBAR_GROUP_ID;

function closeMobileSidebarDrawer(): void {
    const leftSidebar = getEl('left-sidebar');
    const mobileBackdrop = getEl('mobile-sidebar-backdrop');
    const legacyDrawer = getEl('mobile-sidebar-drawer');
    if (leftSidebar) leftSidebar.classList.add('hidden');
    if (mobileBackdrop) mobileBackdrop.classList.add('hidden');
    if (legacyDrawer) legacyDrawer.classList.add('hidden');
}

function syncWorkspaceGridColumns(visibleCount: number): void {
    const grid = getEl('workspace-cards-grid');
    if (!grid) return;
    if (visibleCount <= 1) {
        grid.classList.remove('md:grid-cols-2');
    } else {
        grid.classList.add('md:grid-cols-2');
    }
}

function computeMotorCardOrder(cardId: string, resolvedMotors: string[], primaryMotors: string[]): number {
    if (cardId === 'card-demografi') return 1;
    if (cardId === 'card-biyometri') return 2;
    const primaryIdx = primaryMotors.indexOf(cardId);
    if (primaryIdx !== -1) return 10 + primaryIdx;
    const resolvedIdx = resolvedMotors.indexOf(cardId);
    return 30 + (resolvedIdx !== -1 ? resolvedIdx : 0);
}

function applyWorkspaceCardLayout(resolvedMotors: string[], primaryMotors: string[]): number {
    if (typeof document === 'undefined') return 0;
    const allCards = document.querySelectorAll<HTMLDetailsElement>('#clinical-workspace details[id^="card-"], #clinical-workspace > details');
    let visibleCount = 0;

    allCards.forEach(card => {
        if (resolvedMotors.includes(card.id)) {
            card.classList.remove('hidden');
            card.open = true;
            if (card.style) {
                card.style.order = String(computeMotorCardOrder(card.id, resolvedMotors, primaryMotors));
            }
            visibleCount++;
        } else {
            card.classList.add('hidden');
            if (card.style) {
                card.style.order = '';
            }
        }
    });

    return visibleCount;
}

function renderWorkspaceContextBar(
    title: string,
    badgeText: string,
    resolvedMotors: string[],
    primaryMotors: string[] = []
): void {
    const titleEl = getEl('workspace-context-title');
    const badgeEl = getEl('workspace-context-badge');
    const pillsEl = getEl('workspace-context-pills');

    if (titleEl) titleEl.textContent = title;
    if (badgeEl) badgeEl.textContent = badgeText;
    if (!pillsEl || typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    pillsEl.innerHTML = '';

    if (resolvedMotors.length === 0) {
        const span = document.createElement('span');
        span.className = 'text-[10px] text-slate-400';
        span.textContent = 'Tüm klinik motorlar açık';
        pillsEl.appendChild(span);
        return;
    }

    const orderedIds = [...resolvedMotors]
        .filter(id => id !== 'card-soap')
        .sort((a, b) => computeMotorCardOrder(a, resolvedMotors, primaryMotors) - computeMotorCardOrder(b, resolvedMotors, primaryMotors));

    orderedIds.forEach(mId => {
        const mDef = CLINICAL_MOTORS[mId];
        if (!mDef) return;
        const isPrimary = primaryMotors.includes(mId);
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = isPrimary
            ? 'px-2 py-0.5 rounded-md bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-700/60 text-[10px] font-medium flex items-center gap-1 transition-colors'
            : 'px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-[10px] flex items-center gap-1 transition-colors';
        pill.innerHTML = `<span class="${isPrimary ? 'text-cyan-400' : 'text-amber-400'}">${getSvgIcon(mDef.icon, 'w-3 h-3')}</span><span>${escapeHtml(mDef.shortName)}</span>`;
        pill.title = isPrimary
            ? `${mDef.name} — Seçili grup motoru (Gitmek için tıklayın)`
            : `${mDef.name} — Otomatik bağlı motor (Gitmek için tıklayın)`;
        pill.addEventListener('click', () => {
            const targetEl = getEl<HTMLDetailsElement>(mId);
            if (targetEl) {
                targetEl.open = true;
                if (typeof targetEl.scrollIntoView === 'function') {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                targetEl.classList.remove('card-highlight');
                targetEl.classList.add('card-highlight');
                setTimeout(() => targetEl.classList.remove('card-highlight'), 1600);
            }
        });
        pillsEl.appendChild(pill);
    });
}

function syncNavigationHighlights(options: { groupId?: string | null; allActive?: boolean }): void {
    if (typeof document === 'undefined') return;
    const activeGroup = options.groupId
        ? SIDEBAR_GROUPS.find(g => g.id === options.groupId)
        : undefined;

    document.querySelectorAll('.nav-sidebar-link').forEach(l => {
        const lGroup = l.getAttribute('data-group');
        const lHref = l.getAttribute('href');
        const isMatch = Boolean(
            activeGroup && (lGroup === activeGroup.id || (!lGroup && lHref === activeGroup.href))
        );
        if (isMatch) {
            l.classList.remove('text-slate-400', 'border-transparent');
            l.classList.add('active', 'border-l-2', 'border-cyan-400', 'bg-slate-900', 'text-cyan-300', 'font-semibold');
        } else {
            l.classList.remove('active', 'border-cyan-400', 'bg-slate-900', 'text-cyan-300', 'font-semibold', 'font-medium');
            l.classList.add('border-l-2', 'border-transparent', 'text-slate-400');
        }
    });

    document.querySelectorAll('.cat-pill').forEach(p => {
        const pGroup = p.getAttribute('data-group');
        const pCat = p.getAttribute('data-cat');
        const isMatch = Boolean(
            (options.allActive && pCat === 'all') ||
            (activeGroup && pGroup === activeGroup.id)
        );
        if (isMatch) {
            p.classList.remove('bg-slate-900/90', 'text-slate-300', 'border-slate-800', 'bg-slate-800', 'bg-sky-500/15', 'text-sky-400');
            p.classList.add('active', 'bg-cyan-950/60', 'text-cyan-300', 'border-cyan-500/60');
        } else {
            p.classList.remove('active', 'bg-cyan-950/60', 'text-cyan-300', 'border-cyan-500/60', 'bg-sky-500/15', 'text-sky-400');
            p.classList.add('bg-slate-900/90', 'text-slate-300', 'border-slate-800');
        }
    });
}

export function activateSidebarGroup(
    groupIdOrHref: string,
    options: { scroll?: boolean; highlightCardId?: string } = {}
): SidebarGroupDefinition | null {
    if (typeof document === 'undefined') return null;

    const normalized = groupIdOrHref.trim();
    const group =
        SIDEBAR_GROUPS.find(g => g.id === normalized || g.href === normalized || g.href === `#${normalized}`) ||
        SIDEBAR_GROUPS.find(g => g.id === DEFAULT_SIDEBAR_GROUP_ID) ||
        SIDEBAR_GROUPS[0];
    if (!group) return null;

    currentActiveGroupId = group.id;
    currentActivePackId = null;

    // Seçilen grubun motorlarını VE matematiksel/klinik olarak bağımlı olduğu tüm kardeş motorları çöz
    const resolvedMotors = resolveMotorDependencies(group.motors);
    const visibleCount = applyWorkspaceCardLayout(resolvedMotors, group.motors);

    syncWorkspaceGridColumns(visibleCount > 0 ? visibleCount : resolvedMotors.length);
    syncNavigationHighlights({ groupId: group.id });

    const depCount = Math.max(0, resolvedMotors.length - group.motors.length);
    const badgeLabel = depCount > 0
        ? `${resolvedMotors.length} Motor (${depCount} Bağlı)`
        : `${resolvedMotors.length} Motor`;
    renderWorkspaceContextBar(group.name, badgeLabel, resolvedMotors, group.motors);

    // Üst Paketler popover seçim durumunu temizle ve aktif grup rozetini güncelle
    const containerButtons = getEl('container-package-buttons');
    if (containerButtons && typeof containerButtons.querySelectorAll === 'function') {
        containerButtons.querySelectorAll('.btn-workstation-pack').forEach(btn => {
            btn.classList.remove('border-cyan-500/60', 'bg-cyan-950/30', 'text-cyan-300');
            btn.classList.add('border-slate-800', 'bg-[#0B111E]', 'text-slate-200');
        });
    }

    const containerInfo = getEl('container-package-info');
    if (containerInfo) containerInfo.classList.add('hidden');

    const badgeActive = getEl('badge-active-pack');
    if (badgeActive) {
        badgeActive.textContent = `${group.name} (${resolvedMotors.length} Motor)`;
        badgeActive.className = 'text-[9px] px-2 py-0.5 rounded-full tabular-nums font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60';
    }

    const cardShortcuts = getEl('card-custom-shortcuts');
    if (cardShortcuts) cardShortcuts.classList.add('hidden');
    const backdropPackages = getEl('backdrop-packages');
    if (backdropPackages) backdropPackages.classList.add('hidden');

    closeMobileSidebarDrawer();
    onTabsUpdateCallback();

    if (options.scroll !== false) {
        const targetId = options.highlightCardId || group.motors[0];
        const targetCard = targetId ? getEl<HTMLDetailsElement>(targetId) : null;
        if (options.highlightCardId && targetCard && typeof targetCard.scrollIntoView === 'function') {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (targetCard && typeof targetCard.scrollIntoView === 'function') {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (targetCard) {
            targetCard.classList.remove('card-highlight');
            targetCard.classList.add('card-highlight');
            setTimeout(() => targetCard.classList.remove('card-highlight'), 1600);
        }
    }

    return group;
}

export function showAllWorkstationMotors(): void {
    if (typeof document === 'undefined') return;

    const allCards = document.querySelectorAll<HTMLDetailsElement>('#clinical-workspace details[id^="card-"], #clinical-workspace > details');
    allCards.forEach(c => {
        c.classList.remove('hidden');
        c.open = true;
        if (c.style) {
            c.style.order = '';
        }
    });

    currentActivePackId = null;
    currentActiveGroupId = null;

    syncWorkspaceGridColumns(allCards.length || 20);
    syncNavigationHighlights({ groupId: null, allActive: true });
    renderWorkspaceContextBar('Tüm Klinik Motorlar', '21/21 Açık', []);

    const cardShortcuts = getEl('card-custom-shortcuts');
    if (cardShortcuts) cardShortcuts.classList.add('hidden');
    const backdropPackages = getEl('backdrop-packages');
    if (backdropPackages) backdropPackages.classList.add('hidden');

    closeMobileSidebarDrawer();

    const containerButtons = getEl('container-package-buttons');
    if (containerButtons && typeof containerButtons.querySelectorAll === 'function') {
        containerButtons.querySelectorAll('.btn-workstation-pack').forEach(btn => {
            btn.classList.remove('border-cyan-500/60', 'bg-cyan-950/30', 'text-cyan-300');
            btn.classList.add('border-slate-800', 'bg-[#0B111E]', 'text-slate-200');
        });
    }

    const badgeActive = getEl('badge-active-pack');
    if (badgeActive) {
        badgeActive.textContent = 'Tüm Motorlar Açık (21/21)';
        badgeActive.className = 'text-[10px] px-2 py-0.5 rounded-full tabular-nums font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60';
    }

    const containerInfo = getEl('container-package-info');
    if (containerInfo) {
        containerInfo.classList.add('hidden');
    }

    onTabsUpdateCallback();
}

export function initWorkstationPackages(): void {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;

    const cardShortcuts = getEl('card-custom-shortcuts');
    if (!cardShortcuts) return;

    const btnShowAll = getEl('btn-show-all-motors');
    const btnToggleCustom = getEl('btn-toggle-custom-pack');
    const iconCustomChevron = getEl('icon-custom-pack-chevron');
    const drawerCustom = getEl('drawer-custom-pack');
    const containerButtons = getEl('container-package-buttons');
    const containerInfo = getEl('container-package-info');
    const badgeActive = getEl('badge-active-pack');
    const packIcon = getEl('pack-info-icon');
    const packName = getEl('pack-info-name');
    const packBadge = getEl('pack-info-badge');
    const packDesc = getEl('pack-info-desc');
    const packPills = getEl('pack-info-pills');

    // Sol menüdeki Paket Özelleştirme çekmecesi elemanları
    const inputPackName = getEl<HTMLInputElement>('input-custom-pack-name');
    const btnSavePack = getEl('btn-save-custom-pack');
    const btnApplyNow = getEl('btn-apply-custom-pack-now');
    const btnClearSelection = getEl('btn-clear-selection');
    const containerChecklist = getEl('container-motor-checklist');
    const labelResolvedCount = getEl('label-resolved-count');
    const boxResolvedSummary = getEl('box-resolved-summary');
    const textResolvedList = getEl('text-resolved-list');
    const sectionSavedPacks = getEl('section-saved-packs');
    const containerSavedList = getEl('container-saved-packs-list');

    function setCustomDrawerOpen(open: boolean): void {
        if (!drawerCustom) return;
        if (open) {
            drawerCustom.classList.remove('hidden');
            btnToggleCustom?.setAttribute('aria-expanded', 'true');
            iconCustomChevron?.classList.add('rotate-180');
        } else {
            drawerCustom.classList.add('hidden');
            btnToggleCustom?.setAttribute('aria-expanded', 'false');
            iconCustomChevron?.classList.remove('rotate-180');
        }
    }

    // A. Kartları Paket Motorlarına Göre Aç / Kapat & Vurgula
    function activatePackage(packOrMotors: string[] | WorkstationPackage | any, optName?: string, optDesc?: string, optIcon?: string, packId?: string): void {
        let baseMotors: string[] = [];
        let motors: string[] = [];
        let title = optName || '';
        let desc = optDesc || '';
        let icon = optIcon || 'package';
        let primaryId: string | null = null;

        if (Array.isArray(packOrMotors)) {
            baseMotors = [...packOrMotors];
            motors = resolveMotorDependencies(packOrMotors);
            title = optName || `${motors.length} Motor Paketi`;
            desc = optDesc || `${motors.length} klinik motor hazır`;
            primaryId = packOrMotors[0];
            currentActivePackId = packId || null;
        } else if (packOrMotors && typeof packOrMotors === 'object') {
            baseMotors = packOrMotors.baseMotors || packOrMotors.fullMotors || [];
            motors = resolveMotorDependencies(baseMotors);
            title = packOrMotors.name || '';
            desc = packOrMotors.desc || '';
            icon = packOrMotors.icon || 'package';
            primaryId = (packOrMotors.baseMotors && packOrMotors.baseMotors[0]) || motors[0];
            currentActivePackId = packOrMotors.id || null;
        }

        if (!motors || motors.length === 0) return;

        currentActiveGroupId = null;

        // Workspace içindeki tüm klinik motor kartlarını bağımlılık sırasıyla göster
        const visibleWorkspaceCount = applyWorkspaceCardLayout(motors, baseMotors);

        syncWorkspaceGridColumns(visibleWorkspaceCount > 0 ? visibleWorkspaceCount : motors.length);
        syncNavigationHighlights({ groupId: null, allActive: false });

        const cleanTitle = title.replace(/^[^\w\sğüşöçıİĞÜŞÖÇ]+/, '').trim();
        renderWorkspaceContextBar(cleanTitle || title, `${motors.length} Motor Paketi`, motors, baseMotors);

        // Popover dropdown ve mobil sol çekmece açıksa kapat
        if (cardShortcuts && !cardShortcuts.classList.contains('hidden')) {
            cardShortcuts.classList.add('hidden');
        }
        const backdropPackages = getEl('backdrop-packages');
        if (backdropPackages) backdropPackages.classList.add('hidden');
        closeMobileSidebarDrawer();

        onTabsUpdateCallback();

        // Sayfayı başa al ve birincil kartı nabız animasyonuyla vurgula
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        const targetCard = (primaryId ? getEl<HTMLDetailsElement>(primaryId) : null) || getEl<HTMLDetailsElement>(motors[0]);
        if (targetCard) {
            targetCard.classList.remove('card-highlight');
            targetCard.classList.add('card-highlight');
            setTimeout(() => targetCard.classList.remove('card-highlight'), 1800);
        }

        // Paket Butonları Aktiflik Durumunu Güncelle
        if (containerButtons && typeof containerButtons.querySelectorAll === 'function') {
            containerButtons.querySelectorAll('.btn-workstation-pack').forEach(btn => {
                const bId = btn.getAttribute('data-pack-id');
                if (bId && bId === currentActivePackId) {
                    btn.classList.add('border-cyan-500/60', 'bg-cyan-950/30', 'text-cyan-300');
                    btn.classList.remove('border-slate-800', 'bg-[#0B111E]', 'text-slate-200');
                } else {
                    btn.classList.remove('border-cyan-500/60', 'bg-cyan-950/30', 'text-cyan-300');
                    btn.classList.add('border-slate-800', 'bg-[#0B111E]', 'text-slate-200');
                }
            });
        }

        // Üst Bar Durum Rozetini Güncelle
        if (badgeActive) {
            badgeActive.textContent = `${cleanTitle} (${motors.length} Motor Aktif)`;
            badgeActive.className = 'text-[10px] px-2.5 py-0.5 rounded-full tabular-nums font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60';
        }

        // Aktif Paket Bilgi Şeridini Doldur
        if (containerInfo) {
            containerInfo.classList.remove('hidden');
            if (packIcon) packIcon.innerHTML = getSvgIcon(icon);
            if (packName) packName.textContent = title;
            if (packBadge) packBadge.textContent = `${motors.length} Motor Bağlı`;
            if (packDesc) packDesc.textContent = desc;

            if (packPills) {
                packPills.innerHTML = '';
                motors.forEach(mId => {
                    const mDef = CLINICAL_MOTORS[mId];
                    if (!mDef) return;
                    const pill = document.createElement('button');
                    pill.type = 'button';
                    pill.className = 'btn-jump-motor px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 text-[10px] flex items-center gap-1 transition-colors';
                    pill.innerHTML = `<span class="text-cyan-400">${getSvgIcon(mDef.icon, 'w-3 h-3')}</span><span>${mDef.shortName}</span>`;
                    pill.title = `${mDef.name} motoruna git`;
                    pill.addEventListener('click', () => {
                        const targetEl = getEl<HTMLDetailsElement>(mId);
                        if (targetEl) {
                            targetEl.open = true;
                            if (typeof targetEl.scrollIntoView === 'function') {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                            targetEl.classList.add('card-highlight');
                            setTimeout(() => targetEl.classList.remove('card-highlight'), 1800);
                        }
                    });
                    packPills.appendChild(pill);
                });
            }
        }
    }

    if (btnShowAll) {
        btnShowAll.addEventListener('click', showAllWorkstationMotors);
    }

    // C. Paket Butonlarını Render Et (Üstteki Paketler Popover)
    function renderPackageButtons(): void {
        if (!containerButtons) return;
        containerButtons.innerHTML = '';

        const customPacks = getCustomPackages();
        const allPacks: WorkstationPackage[] = [...PRESET_PACKAGES, ...customPacks];

        allPacks.forEach(pack => {
            const btn = document.createElement('button');
            btn.type = 'button';
            const isPackActive = Boolean(currentActivePackId && currentActivePackId === pack.id);
            btn.className = isPackActive
                ? 'btn-workstation-pack w-full flex items-center gap-2 px-2.5 py-2 rounded-md border border-cyan-500/60 bg-cyan-950/30 text-cyan-300 text-xs text-left transition'
                : 'btn-workstation-pack w-full flex items-center gap-2 px-2.5 py-2 rounded-md bg-[#0B111E] hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 text-left transition';
            btn.setAttribute('data-pack-id', pack.id);
            btn.title = pack.desc || pack.badge || pack.name;

            btn.innerHTML = `
                <span class="text-cyan-400 shrink-0">${getSvgIcon(pack.icon, 'w-3.5 h-3.5')}</span>
                <span class="truncate flex-1 font-medium">${escapeHtml(pack.name)}</span>
                ${pack.isCustom ? '<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded font-mono shrink-0">Özel</span>' : ''}
            `;

            btn.addEventListener('click', () => {
                activatePackage(pack);
            });

            containerButtons.appendChild(btn);
        });
    }

    // D. Motor Seçim Listesini (Checklist) Doldur (Sol menü akordeonuna uyumlu tek sütun kompakt yapı)
    function renderMotorChecklist(): void {
        if (!containerChecklist) return;
        containerChecklist.innerHTML = '';

        (Object.values(CLINICAL_MOTORS) as ClinicalMotorDefinition[]).forEach((m: ClinicalMotorDefinition) => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 px-2 py-1.5 rounded-md bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/90 cursor-pointer text-[11px] select-none transition-colors';
            label.innerHTML = `
                <input type="checkbox" class="chk-custom-motor rounded border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-slate-800 shrink-0" value="${m.id}">
                <div class="min-w-0 flex-1">
                    <div class="font-medium text-slate-200 flex items-center gap-1.5">
                        <span class="text-sky-400 shrink-0">${getSvgIcon(m.icon, 'w-3 h-3')}</span>
                        <span class="truncate flex-1">${m.shortName}</span>
                        <span id="dep-badge-${m.id}" class="hidden text-[8px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono shrink-0">Oto</span>
                    </div>
                </div>
            `;
            label.title = `${m.name} — ${m.desc}`;
            containerChecklist.appendChild(label);
        });

        if (typeof containerChecklist.querySelectorAll === 'function') {
            const checkBoxes = containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor');
            checkBoxes.forEach(cb => {
                cb.addEventListener('change', updateChecklistDependencies);
            });
        }
    }

    // E. Canlı Bağımlılık Hesaplayıcı & Checkbox Güncelleyici
    function updateChecklistDependencies(): void {
        if (!containerChecklist || typeof containerChecklist.querySelectorAll !== 'function') return;
        const checkBoxes = containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor');

        const explicitlyChecked: string[] = [];
        checkBoxes.forEach(cb => {
            if (cb.checked && !cb.disabled) {
                explicitlyChecked.push(cb.value);
            }
        });

        const fullResolved = resolveMotorDependencies(explicitlyChecked);

        checkBoxes.forEach(cb => {
            const depBadge = getEl(`dep-badge-${cb.value}`);
            const isExplicit = explicitlyChecked.includes(cb.value);
            const isResolved = fullResolved.includes(cb.value);

            if (isExplicit) {
                cb.checked = true;
                cb.disabled = false;
                if (depBadge) depBadge.classList.add('hidden');
            } else if (isResolved) {
                cb.checked = true;
                cb.disabled = true;
                if (depBadge) depBadge.classList.remove('hidden');
            } else {
                cb.checked = false;
                cb.disabled = false;
                if (depBadge) depBadge.classList.add('hidden');
            }
        });

        if (labelResolvedCount) {
            labelResolvedCount.textContent = `${fullResolved.length} motor`;
        }

        if (boxResolvedSummary && textResolvedList) {
            if (fullResolved.length > 0) {
                boxResolvedSummary.classList.remove('hidden');
                textResolvedList.textContent = fullResolved.map((m: string) => CLINICAL_MOTORS[m]?.shortName || m).join(' + ');
            } else {
                boxResolvedSummary.classList.add('hidden');
                textResolvedList.textContent = '';
            }
        }
    }

    // F. Kaydedilmiş Özel Paketleri Listele
    function renderSavedCustomPacks(): void {
        if (!containerSavedList || !sectionSavedPacks) return;
        const customPacks = getCustomPackages();
        if (customPacks.length === 0) {
            sectionSavedPacks.classList.add('hidden');
            containerSavedList.innerHTML = '';
            return;
        }

        sectionSavedPacks.classList.remove('hidden');
        containerSavedList.innerHTML = '';

        customPacks.forEach((pack: WorkstationPackage) => {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-[11px]';
            row.innerHTML = `
                <div class="flex items-center gap-1.5 min-w-0 flex-1">
                    <span class="text-amber-400 shrink-0">${getSvgIcon(pack.icon || 'star', 'w-3 h-3')}</span>
                    <span class="font-medium text-slate-200 truncate" title="${escapeHtml(pack.name)}">${escapeHtml(pack.name)}</span>
                    <span class="text-[9px] text-slate-500 font-mono shrink-0">(${pack.fullMotors ? pack.fullMotors.length : pack.baseMotors.length})</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" class="btn-run-saved-pack btn-compact px-1.5 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] font-medium transition-colors" data-pack-id="${escapeHtml(pack.id)}">
                        Aç
                    </button>
                    <button type="button" class="btn-del-saved-pack btn-compact px-1.5 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[10px] transition-colors" data-pack-id="${escapeHtml(pack.id)}" title="Paketi Sil">
                        Sil
                    </button>
                </div>
            `;

            row.querySelector('.btn-run-saved-pack')?.addEventListener('click', () => {
                activatePackage(pack);
                setCustomDrawerOpen(false);
            });

            row.querySelector('.btn-del-saved-pack')?.addEventListener('click', () => {
                if (confirm(`"${pack.name}" paketi silinsin mi?`)) {
                    const wasActive = currentActivePackId === pack.id;
                    deleteCustomPackage(pack.id);
                    renderPackageButtons();
                    renderSavedCustomPacks();
                    if (wasActive) {
                        activateSidebarGroup(currentActiveGroupId || DEFAULT_SIDEBAR_GROUP_ID, { scroll: false });
                    }
                }
            });

            containerSavedList.appendChild(row);
        });
    }

    // G. Sol Menü Paket Özelleştirme Akordeon Çekmecesi Aç/Kapa
    if (btnToggleCustom && drawerCustom) {
        btnToggleCustom.addEventListener('click', () => {
            const isHidden = drawerCustom.classList.contains('hidden');
            if (isHidden) {
                if (containerChecklist && containerChecklist.children.length === 0) {
                    renderMotorChecklist();
                }
                renderSavedCustomPacks();
                setCustomDrawerOpen(true);
            } else {
                setCustomDrawerOpen(false);
            }
        });
    }

    // H. Seçimi Temizle
    if (btnClearSelection) {
        btnClearSelection.addEventListener('click', () => {
            if (containerChecklist && typeof containerChecklist.querySelectorAll === 'function') {
                containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor').forEach(cb => {
                    cb.checked = false;
                    cb.disabled = false;
                });
            }
            if (inputPackName) inputPackName.value = '';
            updateChecklistDependencies();
        });
    }

    // I. Hemen Uygula (Kaydetmeden Ekrana Getir)
    if (btnApplyNow) {
        btnApplyNow.addEventListener('click', () => {
            if (!containerChecklist || typeof containerChecklist.querySelectorAll !== 'function') return;
            const checked: string[] = [];
            containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor:checked').forEach(cb => {
                checked.push(cb.value);
            });
            if (checked.length === 0) {
                alert('Lütfen en az bir klinik motor seçin.');
                return;
            }
            const resolved = resolveMotorDependencies(checked);
            activatePackage(resolved, 'Özel Seçim Paketi', `${resolved.length} motor ekranda aktif`, 'activity');
            setCustomDrawerOpen(false);
        });
    }

    // J. Paketi Kaydet & Ekle
    if (btnSavePack) {
        btnSavePack.addEventListener('click', () => {
            const name = inputPackName ? inputPackName.value.trim() : '';
            if (!name) {
                alert('Lütfen özel paketiniz için bir isim yazın (Örn: Nöbetçi Pediatri / Acil Sıvı Paketi).');
                if (inputPackName && typeof inputPackName.focus === 'function') inputPackName.focus();
                return;
            }

            if (!containerChecklist || typeof containerChecklist.querySelectorAll !== 'function') return;
            const checkedBase: string[] = [];
            containerChecklist.querySelectorAll<HTMLInputElement>('.chk-custom-motor').forEach(cb => {
                if (cb.checked && !cb.disabled) {
                    checkedBase.push(cb.value);
                }
            });

            if (checkedBase.length === 0) {
                alert('Lütfen pakete eklenecek en az bir klinik motor seçin.');
                return;
            }

            const newPack = saveCustomPackage(name, checkedBase);
            if (newPack) {
                renderPackageButtons();
                renderSavedCustomPacks();
                activatePackage(newPack);
                if (inputPackName) inputPackName.value = '';
                setCustomDrawerOpen(false);
            }
        });
    }

    // Header Paketler Dropdown Butonu ve Dışarı Tıklama Dinleyicisi
    const btnHeaderDropdown = getEl('btn-header-packages-dropdown');
    const backdropPackages = getEl('backdrop-packages');
    if (btnHeaderDropdown && cardShortcuts) {
        btnHeaderDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = cardShortcuts.classList.toggle('hidden');
            if (backdropPackages) {
                if (isHidden) {
                    backdropPackages.classList.add('hidden');
                } else {
                    backdropPackages.classList.remove('hidden');
                }
            }
        });
    }

    if (backdropPackages && cardShortcuts) {
        backdropPackages.addEventListener('click', () => {
            cardShortcuts.classList.add('hidden');
            backdropPackages.classList.add('hidden');
        });
    }

    if (typeof document !== 'undefined') {
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (cardShortcuts && !cardShortcuts.classList.contains('hidden')) {
                const headerContainer = getEl('header-packages-container');
                if (headerContainer && typeof headerContainer.contains === 'function' && !headerContainer.contains(target)) {
                    cardShortcuts.classList.add('hidden');
                    if (backdropPackages) backdropPackages.classList.add('hidden');
                }
            }
        });
    }

    // Başlangıçta Butonları, Motor Seçim Listesini ve Özel Paketleri Hazırla
    renderPackageButtons();
    renderMotorChecklist();
    renderSavedCustomPacks();
}

// ----------------------------------------------------------------------------
// 4.1. HASTA SIFIRLAMA MOTORU (IN-PLACE COMPLETE PATIENT & WORKSTATION RESET)
// ----------------------------------------------------------------------------
export function resetAllPatientData(options: { skipConfirm?: boolean } = {}): boolean {
    if (typeof window !== 'undefined' && !options.skipConfirm) {
        const confirmed = window.confirm('Tüm hasta verileri, klinik hesaplamalar ve reçete sıfırlanıp yeni hasta kaydı açılsın mı?');
        if (!confirmed) return false;
    }

    if (typeof document === 'undefined') return true;

    // 1. Acil durum zamanlayıcıları, kronometre ve oturum verilerini sıfırla
    resetEmergencyUi();
    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('klinik_pwa_emergency_timers_v2');
        }
    } catch {
        // sessionStorage erişimi kısıtlıysa sessizce devam et
    }

    // 2. Reçete modalı durumunu sıfırla
    resetPrescriptionData();

    // 3. Tedavi ve Güvenlik İlaç Listelerini Sıfırla
    if (appState.treatment) {
        appState.treatment.selectedDrugs = [];
    }
    if (appState.safetyPrescription) {
        appState.safetyPrescription.selectedSafetyDrugs = [];
    }
    renderSelectedDrugs();

    // 4. Klinik AppState Motor Durumlarını Başlangıç Değerlerine Döndür
    appState.biometry = {
        ageYears: null,
        ageMonths: null,
        ageWeeks: null,
        ageDays: null,
        ageHours: null,
        dob: null,
        birthTime: null,
        ageFormatted: null,
        ageGroupTag: null,
        isNeonate: false,
        birthWeightG: null,
        gender: null,
        weightKg: null,
        heightCm: null,
        bsa: null,
        bmi: null,
        ibwKg: null,
        adjBwKg: null,
        isObese: false,
        egfr: null,
        egfrAbsolute: null,
        egfrFormula: null,
        cystatinC: null,
        heartRate: null
    };

    appState.pediatrics = {
        active: false,
        percentiles: null,
        targetHeight: null,
        correctedAge: null,
        bp: null,
        centor: null,
        vaccines: null,
        syrupDose: null,
        pews: null,
        pgcs: null,
        growthVelocity: null,
        cranialScreening: null
    };

    appState.surgery = {
        active: false,
        alvarado: null,
        ranson: null,
        parkland: null,
        suture: null
    };

    appState.obgyn = {
        active: false,
        trimester: null,
        eddData: null,
        bishop: null,
        preeclampsia: null
    };

    appState.medicine = {
        active: false,
        pregnancyTrimester: null,
        bloodGas: null,
        fluid: null,
        neonatalFluid: null,
        sodium: null,
        calcium: null,
        infusion: null,
        gir: null,
        steroid: null,
        homaIR: null,
        news2: null,
        gcs: null
    };

    appState.other = {
        active: false,
        cardiac: null,
        drugPrescription: null
    };

    appState.thrombosis = {
        active: false,
        wellsDVT: null,
        wellsPTE: null,
        perc: null,
        cha2ds2vasc: null,
        hasbled: null,
        heart: null
    };

    appState.nephroTox = {
        active: false,
        fena: null,
        feurea: null,
        correctedSodium: null,
        osmolalGap: null,
        paracetamol: null,
        curb65: null
    };

    appState.neonatology = {
        active: false,
        bhutani: null,
        apgar: null,
        westleyCroup: null,
        cdsDehydration: null,
        weightLoss: null
    };

    appState.emergency = {
        active: false,
        anaphylaxis: null,
        statusEpilepticus: null
    };

    // 5. DOM Form Elemanlarını Sıfırla (HTML Varsayılan Değerlerine Döndür)
    const NON_PATIENT_ELEMENT_IDS = new Set([
        'input-custom-pack-name',
        'input-custom-pack-icon',
        'input-vaccine-filter',
        'input-print-doctor-name'
    ]);

    const allInputs = document.querySelectorAll<HTMLInputElement>('input');
    allInputs.forEach(input => {
        if (input.id && NON_PATIENT_ELEMENT_IDS.has(input.id)) return;

        if (input.type === 'checkbox' || input.type === 'radio' || input.id.startsWith('chk-') || input.id.startsWith('check-')) {
            input.checked = Boolean(input.defaultChecked);
        }
        if (input.type !== 'checkbox' && input.type !== 'radio') {
            input.value = input.defaultValue || '';
        }

        delete input.dataset.userModified;
        delete input.dataset.userOverridden;
        delete input.dataset.autofilled;
    });

    const allSelects = document.querySelectorAll<HTMLSelectElement>('select');
    allSelects.forEach(select => {
        if (select.id && NON_PATIENT_ELEMENT_IDS.has(select.id)) return;

        let restored = false;
        for (let i = 0; i < select.options.length; i++) {
            const opt = select.options[i];
            if (opt.defaultSelected) {
                select.selectedIndex = i;
                select.value = opt.value;
                restored = true;
                break;
            }
        }
        if (!restored) {
            select.selectedIndex = 0;
            select.value = select.options.length > 0 ? select.options[0].value : '';
        }

        delete select.dataset.userModified;
    });

    const allTextareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
    allTextareas.forEach(textarea => {
        if (textarea.id && NON_PATIENT_ELEMENT_IDS.has(textarea.id)) return;
        textarea.value = textarea.defaultValue || '';
        delete textarea.dataset.userModified;
    });

    // 6. Görünümü Başlangıç Grubu (Demografi & Biyometri) Moduna Döndür ve Hesaplamaları Yenile
    activateSidebarGroup(DEFAULT_SIDEBAR_GROUP_ID, { scroll: false });

    // 7. Sayfayı Başa Yumuşakça Kaydır ve Demografi Kartındaki İlk Alana Odaklan
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => {
        const inputDob = document.getElementById('input-dob') as HTMLInputElement | null;
        const inputAge = document.getElementById('input-age') as HTMLInputElement | null;
        if (inputDob && typeof inputDob.focus === 'function') {
            inputDob.focus();
        } else if (inputAge && typeof inputAge.focus === 'function') {
            inputAge.focus();
        }
    }, 150);

    return true;
}

// ----------------------------------------------------------------------------
// 5. RESPONSIVE WORKSTATION INIT (Drawer, Sheet, Presets, Network)
// ----------------------------------------------------------------------------
export function initResponsiveWorkstation(onUpdateTabs?: () => void): void {
    if (onUpdateTabs) {
        onTabsUpdateCallback = onUpdateTabs;
    }

    // 0. Akıllı Motor Paketleri ve Sol Menü Özelleştirme Başlatıcı
    initWorkstationPackages();

    // 0.1. İlk Açılışta Sadece Varsayılan Sol Menü Grubunu (Demografi & Biyometri) Göster
    activateSidebarGroup(DEFAULT_SIDEBAR_GROUP_ID, { scroll: false });

    // 1. Mobil Yatay Hızlı Grup / Kategori Hapları
    const pills = document.querySelectorAll('.cat-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const groupAttr = pill.getAttribute('data-group');
            const cat = pill.getAttribute('data-cat');
            if (cat === 'all') {
                showAllWorkstationMotors();
                const ws = getEl('clinical-workspace');
                if (ws && typeof ws.scrollIntoView === 'function') ws.scrollIntoView({ behavior: 'smooth' });
            } else if (groupAttr) {
                activateSidebarGroup(groupAttr, { scroll: true });
            } else if (cat) {
                activateSidebarGroup(cat, { scroll: true });
            }
        });
    });

    // 2. Sol Menü (Masaüstü & Mobil Çekmece) 13 Alt Başlık Grup Seçimi
    document.querySelectorAll('.nav-sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const groupKey = link.getAttribute('data-group') || link.getAttribute('href') || DEFAULT_SIDEBAR_GROUP_ID;
            activateSidebarGroup(groupKey, { scroll: true });
        });
    });

    // 2.1. Hasta Bilgi Kapsülü Tıklandığında Demografi & Biyometri Grubunu Aç ve Vurgula
    const headerPatientCapsule = getEl('header-patient-info');
    if (headerPatientCapsule) {
        headerPatientCapsule.addEventListener('click', () => {
            activateSidebarGroup(DEFAULT_SIDEBAR_GROUP_ID, { scroll: true, highlightCardId: 'card-demografi' });
        });
    }

    // 2.2. Mobil Sol Menü Çekmecesi (Unified Responsive #left-sidebar Drawer) Etkileşimleri
    const btnMobileSidebar = getEl('btn-mobile-sidebar-toggle');
    const leftSidebarEl = getEl('left-sidebar');
    const legacyDrawerMobileSidebar = getEl('mobile-sidebar-drawer');
    const btnCloseMobileSidebar = getEl('btn-close-mobile-sidebar');
    const backdropMobileSidebar = getEl('mobile-sidebar-backdrop');

    if (btnMobileSidebar) {
        btnMobileSidebar.addEventListener('click', () => {
            if (leftSidebarEl) leftSidebarEl.classList.remove('hidden');
            if (backdropMobileSidebar) backdropMobileSidebar.classList.remove('hidden');
            if (legacyDrawerMobileSidebar) legacyDrawerMobileSidebar.classList.remove('hidden');
        });
    }
    if (btnCloseMobileSidebar) {
        btnCloseMobileSidebar.addEventListener('click', () => {
            closeMobileSidebarDrawer();
        });
    }
    if (backdropMobileSidebar) {
        backdropMobileSidebar.addEventListener('click', () => {
            closeMobileSidebarDrawer();
        });
    }

    // 3. Reset Patient Data (Yeni Hasta / Formu Sıfırla)
    const btnReset = getEl('btn-reset-patient');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            resetAllPatientData();
        });
    }

    // 4. Mobile Bottom Sheet Drawer Interactions
    const btnOpenSheet = getEl('btn-open-soap-sheet');
    const modalSheet = getEl('modal-soap-sheet');
    const sheetContent = getEl('soap-sheet-content');
    const btnCloseSheet = getEl('btn-close-soap-sheet');
    const backdrop = getEl('soap-sheet-backdrop');
    const handle = getEl('soap-sheet-handle');
    const btnCopyModal = getEl('btn-copy-soap-modal');
    const modalFeedback = getEl('copy-feedback-modal');

    function openSoapSheet(): void {
        if (!modalSheet || !sheetContent) return;
        updateLiveSOAP();
        modalSheet.classList.remove('hidden');
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                sheetContent.classList.remove('translate-y-full');
            });
        } else {
            sheetContent.classList.remove('translate-y-full');
        }
    }

    function closeSoapSheet(): void {
        if (!modalSheet || !sheetContent) return;
        sheetContent.classList.add('translate-y-full');
        setTimeout(() => {
            modalSheet.classList.add('hidden');
        }, 300);
    }

    if (btnOpenSheet) btnOpenSheet.addEventListener('click', openSoapSheet);
    if (btnCloseSheet) btnCloseSheet.addEventListener('click', closeSoapSheet);
    if (backdrop) backdrop.addEventListener('click', closeSoapSheet);
    if (handle) handle.addEventListener('click', closeSoapSheet);

    // Slim Bottom Action Bar wiring
    const btnBottomSearch = getEl('btn-bottom-search');
    if (btnBottomSearch) {
        btnBottomSearch.addEventListener('click', () => {
            const btnQuick = getEl<HTMLButtonElement>('btn-quick-switch');
            if (btnQuick) btnQuick.click();
        });
    }

    const btnBottomRx = getEl('btn-bottom-rx');
    if (btnBottomRx) {
        btnBottomRx.addEventListener('click', () => {
            const btnRx = getEl<HTMLButtonElement>('btn-print-rx');
            if (btnRx) btnRx.click();
        });
    }

    const btnBottomReset = getEl('btn-bottom-reset');
    if (btnBottomReset) {
        btnBottomReset.addEventListener('click', () => {
            resetAllPatientData();
        });
    }

    // Mobil Sanal Klavye Açıldığında Sabit Alt Barı Gizleme / Ekranı Genişletme Kuralı
    const bottomBarEl = getEl('mobile-floating-bar');
    if (bottomBarEl && typeof document !== 'undefined') {
        const isInputElement = (el: EventTarget | null): boolean => {
            if (!el || !(el instanceof HTMLElement)) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
        };

        document.addEventListener('focusin', (e) => {
            if (isInputElement(e.target)) {
                bottomBarEl.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
            }
        });

        document.addEventListener('focusout', (e) => {
            if (isInputElement(e.target)) {
                setTimeout(() => {
                    const active = document.activeElement;
                    if (!isInputElement(active)) {
                        bottomBarEl.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
                    }
                }, 100);
            }
        });

        if (typeof window !== 'undefined' && window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                if (window.visualViewport) {
                    const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.75;
                    if (isKeyboardOpen) {
                        bottomBarEl.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
                    } else if (!isInputElement(document.activeElement)) {
                        bottomBarEl.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
                    }
                }
            });
        }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape' && modalSheet && !modalSheet.classList.contains('hidden')) {
                closeSoapSheet();
            }
        });
    }

    if (btnCopyModal) {
        btnCopyModal.addEventListener('click', () => {
            const modalText = getEl<HTMLTextAreaElement>('text-soap-modal');
            const textToCopy = modalText ? modalText.value : (getEl<HTMLTextAreaElement>('text-soap-output')?.value || '');
            copyToClipboardWithFallback(
                textToCopy,
                () => {
                    if (modalFeedback) {
                        modalFeedback.classList.remove('hidden');
                        setTimeout(() => modalFeedback.classList.add('hidden'), 2000);
                    }
                    const desktopFb = getEl('copy-feedback');
                    if (desktopFb) {
                        desktopFb.classList.remove('hidden');
                        setTimeout(() => desktopFb.classList.add('hidden'), 2000);
                    }
                },
                (err) => {
                    console.warn('[SOAP] Panoya kopyalama hatası:', err);
                }
            );
        });
    }

    const btnCopyDesktop = getEl('btn-copy-soap');
    if (btnCopyDesktop) {
        btnCopyDesktop.addEventListener('click', () => {
            const text = getVal('text-soap-output');
            copyToClipboardWithFallback(
                text,
                () => {
                    const fb = getEl('copy-feedback');
                    if (fb) {
                        fb.classList.remove('hidden');
                        setTimeout(() => fb.classList.add('hidden'), 2000);
                    }
                },
                (err) => {
                    console.warn('[SOAP] Panoya kopyalama hatası:', err);
                }
            );
        });
    }

    // 6. DOB Preset Buttons Handling
    const presetBtns = document.querySelectorAll('.btn-dob-preset');
    const dobInput = getEl<HTMLInputElement>('input-dob');
    const birthTimeInput = getEl<HTMLInputElement>('input-birth-time');
    const ageInput = getEl<HTMLInputElement>('input-age');
    const ageUnitSelect = getEl<HTMLSelectElement>('select-age-unit');
    
    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const preset = btn.getAttribute('data-preset');
            const now = new Date();
            let targetDate = new Date();
            
            if (preset === '0d' || preset === 'today') {
                targetDate = new Date();
            } else if (preset === '1d') {
                targetDate.setDate(now.getDate() - 1);
            } else if (preset === '3d') {
                targetDate.setDate(now.getDate() - 3);
            } else if (preset === '7d') {
                targetDate.setDate(now.getDate() - 7);
            } else if (preset === '14d') {
                targetDate.setDate(now.getDate() - 14);
            } else if (preset === '1m') {
                targetDate.setMonth(now.getMonth() - 1);
            } else if (preset === '1y') {
                targetDate.setFullYear(now.getFullYear() - 1);
            } else if (preset === '5y') {
                targetDate.setFullYear(now.getFullYear() - 5);
            } else if (preset === '25y') {
                targetDate.setFullYear(now.getFullYear() - 25);
            }
            
            const yyyy = targetDate.getFullYear();
            const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const dd = String(targetDate.getDate()).padStart(2, '0');
            const formattedDate = `${yyyy}-${mm}-${dd}`;
            
            if (dobInput) {
                dobInput.value = formattedDate;
                
                if ((preset === '0d' || preset === 'today') && birthTimeInput && !birthTimeInput.value) {
                    const curHours = String(now.getHours()).padStart(2, '0');
                    const curMinutes = String(now.getMinutes()).padStart(2, '0');
                    birthTimeInput.value = `${curHours}:${curMinutes}`;
                } else if (preset !== '0d' && preset !== 'today' && birthTimeInput) {
                    birthTimeInput.value = '';
                }

                if (ageInput && ageUnitSelect) {
                    if (preset === '0d' || preset === 'today') {
                        ageInput.value = '0';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '1d') {
                        ageInput.value = '1';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '3d') {
                        ageInput.value = '3';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '7d') {
                        ageInput.value = '7';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '14d') {
                        ageInput.value = '14';
                        ageUnitSelect.value = 'days';
                    } else if (preset === '1m') {
                        ageInput.value = '1';
                        ageUnitSelect.value = 'months';
                    } else if (preset === '1y') {
                        ageInput.value = '1';
                        ageUnitSelect.value = 'years';
                    } else if (preset === '5y') {
                        ageInput.value = '5';
                        ageUnitSelect.value = 'years';
                    } else if (preset === '25y') {
                        ageInput.value = '25';
                        ageUnitSelect.value = 'years';
                    }
                }

                presetBtns.forEach(b => {
                    b.classList.remove('bg-rose-900/60', 'text-rose-200', 'border-rose-700', 'font-bold');
                    b.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-750');
                });
                btn.classList.remove('bg-slate-900', 'text-slate-300', 'border-slate-750');
                btn.classList.add('bg-rose-900/60', 'text-rose-200', 'border-rose-700', 'font-bold');

                onTabsUpdateCallback();
            }
        });
    });

    if (dobInput) {
        dobInput.addEventListener('input', () => {
            presetBtns.forEach(b => {
                b.classList.remove('bg-rose-900/60', 'text-rose-200', 'border-rose-700', 'font-bold');
                b.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-750');
            });
        });
    }

    if (ageInput) {
        ageInput.addEventListener('input', () => {
            presetBtns.forEach(b => {
                b.classList.remove('bg-rose-900/60', 'text-rose-200', 'border-rose-700', 'font-bold');
                b.classList.add('bg-slate-900', 'text-slate-300', 'border-slate-750');
            });
        });
    }

    // 7. AYDINLIK / KARANLIK TEMA YÖNETİCİSİ
    initTheme();
    const btnTheme = getEl('btn-theme-toggle');
    if (btnTheme) {
        btnTheme.addEventListener('click', () => {
            toggleTheme();
        });
    }

    // 8. QUICK SWITCHER (CTRL+K) HIZLI MOTOR ATLAMA KOMUT PALETİ
    const modalQuick = getEl('modal-quick-switcher');
    const inputQuick = getEl<HTMLInputElement>('input-quick-switcher');
    const listQuick = getEl('list-quick-switcher');
    const btnQuick = getEl('btn-quick-switch');
    const drugInput = getEl<HTMLInputElement>('input-drug-search');
    let activeQuickIndex = 0;
    let currentQuickResults: QuickSwitcherItem[] = [];

    function renderQuickList(items: QuickSwitcherItem[]): void {
        if (!listQuick) return;
        currentQuickResults = items;
        activeQuickIndex = 0;
        if (items.length === 0) {
            listQuick.innerHTML = '<div class="p-4 text-center text-slate-500 italic">Eşleşen klinik motor bulunamadı.</div>';
            return;
        }
        listQuick.innerHTML = items.map((item, idx) => `
            <div class="quick-item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${idx === 0 ? 'bg-rose-950/60 border border-rose-800 text-rose-200 font-semibold' : 'hover:bg-slate-800/80 text-slate-300'}" data-index="${idx}" data-motor-id="${item.id}">
                <div class="flex items-center gap-2.5">
                    <span class="text-sky-400">${getSvgIcon(item.icon, 'w-4 h-4')}</span>
                    <div>
                        <div class="font-bold text-xs ${idx === 0 ? 'text-rose-200' : 'text-slate-100'}">${item.name}</div>
                        <div class="text-[10px] text-slate-400 line-clamp-1">${item.desc}</div>
                    </div>
                </div>
                <span class="text-[9px] font-mono px-2 py-0.5 rounded uppercase bg-slate-950/50 text-slate-400 border border-slate-800">${item.category}</span>
            </div>
        `).join('');

        const handleSelectQuickMotor = (motorId: string) => {
            const query = inputQuick ? inputQuick.value.trim() : '';
            closeQuickModal();
            jumpToMotor(motorId);
            if (motorId === 'card-ilac' && query && drugInput) {
                drugInput.value = query;
                drugInput.dispatchEvent(new Event('input', { bubbles: true }));
                void executeDrugSearch(query);
            }
        };

        listQuick.querySelectorAll('.quick-item').forEach(el => {
            el.addEventListener('click', () => {
                const motorId = el.getAttribute('data-motor-id');
                if (motorId) {
                    handleSelectQuickMotor(motorId);
                }
            });
        });
    }

    function updateQuickActiveHighlight(): void {
        if (!listQuick) return;
        const items = listQuick.querySelectorAll('.quick-item');
        items.forEach((el, idx) => {
            if (idx === activeQuickIndex) {
                el.className = 'quick-item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all bg-rose-950/60 border border-rose-800 text-rose-200 font-semibold';
                (el as HTMLElement).scrollIntoView({ block: 'nearest' });
            } else {
                el.className = 'quick-item flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all hover:bg-slate-800/80 text-slate-300';
            }
        });
    }

    function openQuickModal(): void {
        if (!modalQuick || !inputQuick) return;
        modalQuick.classList.remove('hidden');
        inputQuick.value = '';
        renderQuickList(QUICK_SWITCHER_ITEMS);
        setTimeout(() => inputQuick.focus(), 60);
    }

    function closeQuickModal(): void {
        if (!modalQuick) return;
        modalQuick.classList.add('hidden');
    }

    if (btnQuick) btnQuick.addEventListener('click', openQuickModal);
    if (inputQuick) {
        inputQuick.addEventListener('input', () => {
            const val = inputQuick.value;
            const res = searchQuickSwitcher(val);
            renderQuickList(res);
        });

        inputQuick.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentQuickResults.length > 0) {
                    activeQuickIndex = (activeQuickIndex + 1) % currentQuickResults.length;
                    updateQuickActiveHighlight();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentQuickResults.length > 0) {
                    activeQuickIndex = (activeQuickIndex - 1 + currentQuickResults.length) % currentQuickResults.length;
                    updateQuickActiveHighlight();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentQuickResults[activeQuickIndex]) {
                    const motorId = currentQuickResults[activeQuickIndex].id;
                    const query = inputQuick ? inputQuick.value.trim() : '';
                    closeQuickModal();
                    jumpToMotor(motorId);
                    if (motorId === 'card-ilac' && query && drugInput) {
                        drugInput.value = query;
                        drugInput.dispatchEvent(new Event('input', { bubbles: true }));
                        void executeDrugSearch(query);
                    }
                }
            } else if (e.key === 'Escape') {
                closeQuickModal();
            }
        });
    }

    if (modalQuick) {
        modalQuick.addEventListener('click', (e) => {
            if (e.target === modalQuick) closeQuickModal();
        });
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (modalQuick && !modalQuick.classList.contains('hidden')) {
                    closeQuickModal();
                } else {
                    openQuickModal();
                }
            }
        });
    }

    // ========================================================================
    // MODÜLER UI DENETLEYİCİLERİ (Monograf, Muadil Karşılaştırma, Reçete A4, Acil Protokoller, EKG)
    // ========================================================================
    initMonographModalController();
    initEquivalentsModalController({
        onAddDrugToTreatment: (drugData) => {
            if (!appState.treatment) appState.treatment = { selectedDrugs: [] };
            if (!appState.treatment.selectedDrugs) appState.treatment.selectedDrugs = [];
            if (!appState.treatment.selectedDrugs.find((d: any) => d.brand === drugData.brand)) {
                appState.treatment.selectedDrugs.push(drugData);
                renderSelectedDrugs();
                onTabsUpdateCallback();
            }
        },
        onSendToSearch: (query, mode) => {
            const dInput = getEl<HTMLInputElement>('input-drug-search');
            if (dInput) {
                updateSearchModeUI(mode);
                dInput.value = query;
                dInput.dispatchEvent(new Event('input'));
            }
        }
    });
    initPrescriptionModalController();
    initEmergencyUiController({
        onUpdateAllTabs: onTabsUpdateCallback,
        onUpdateLiveSOAP: updateLiveSOAP
    });
    initEcgUiController(onTabsUpdateCallback);
    initVaccineModalController();

    // ========================================================================
    // SOAP AKILLI ŞABLONLARI & NOKTA KISAYOLLARI (DOT PHRASES)
    // ========================================================================
    const inputCustomNotes = getEl<HTMLTextAreaElement>('input-custom-notes');
    if (typeof document !== 'undefined') {
        // 1. Tıklanabilir Dot Phrase Hap Butonları
        const dotPhraseButtons = document.querySelectorAll<HTMLButtonElement>('.btn-dot-phrase');
        dotPhraseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key');
                if (key && inputCustomNotes) {
                    inputCustomNotes.value = appendTemplateToText(inputCustomNotes.value, key);
                    onTabsUpdateCallback();
                }
            });
        });

        // 2. Anamnez Alanında Otomatik Genişletme (Text Expansion)
        if (inputCustomNotes) {
            inputCustomNotes.addEventListener('input', () => {
                const val = inputCustomNotes.value;
                const { expandedText, expandedKeys } = expandDotPhrases(val);
                if (expandedKeys.length > 0) {
                    inputCustomNotes.value = expandedText;
                    onTabsUpdateCallback();
                }
            });
        }

        // 3. SOAP Kartındaki Dropdown Şablon Ekleme
        const selectSoapTemplate = getEl<HTMLSelectElement>('select-soap-template');
        const btnInsertSoapTemplate = getEl('btn-insert-soap-template');
        if (btnInsertSoapTemplate && selectSoapTemplate && inputCustomNotes) {
            btnInsertSoapTemplate.addEventListener('click', () => {
                const key = selectSoapTemplate.value;
                if (key) {
                    inputCustomNotes.value = appendTemplateToText(inputCustomNotes.value, key);
                    selectSoapTemplate.value = '';
                    onTabsUpdateCallback();
                }
            });
        }
    }
}
