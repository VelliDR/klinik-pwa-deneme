// ============================================================================
// KLİNİK ASİSTAN - CORE WORKSTATION & CLINICAL ENGINE ORCHESTRATOR
// Modüler mimari orkestratörü: 21 Klinik Motor, Reçete ve Güvenlik Denetleyicileri
// ============================================================================

import { appState } from './state';
import { scheduleUpdate } from './utils/domUtils';
import {
    calculatePatientAge,
    updateBiometryAndGrowth,
    type PatientAgeResult,
    type ClinicalCardResultOptions,
    renderClinicalCardResult
} from './controllers/biometryController';
import { updatePediatricCard } from './controllers/pediatricsController';
import { updateEmergencyNeuroCard } from './controllers/emergencyNeuroController';
import { updateSurgeryObgynCard } from './controllers/surgeryObgynController';
import { updateNeonatologyCard } from './controllers/neonatologyController';
import { updateInternalMedicineCard } from './controllers/internalMedicineController';
import {
    initExtendedScoresUI,
    updateExtendedScoresCard
} from './controllers/extendedScoresController';
import {
    updateSafetyAlertsCard,
    renderSelectedDrugs,
    initDrugSearch
} from './controllers/safetyAlertsController';
import { initDataSnapshotBubbleController } from './controllers/dataSnapshotBubbleController';
import { injectCardGuidelineFooters } from './engines/guidelineRegistry';
import {
    updatePatientBanner,
    updateClinicalAlertsInspector,
    updateLiveSOAP,
    activateSidebarGroup,
    showAllWorkstationMotors,
    initWorkstationPackages,
    initResponsiveWorkstation,
    resetAllPatientData
} from './controllers/workstationController';

// ----------------------------------------------------------------------------
// TÜM RE-EXPORT EDİLEN TİPLER VE FONKSİYONLAR (GERİYE DÖNÜK TAM UYUMLULUK)
// ----------------------------------------------------------------------------
export type { PatientAgeResult, ClinicalCardResultOptions };
export {
    calculatePatientAge,
    renderClinicalCardResult,
    renderSelectedDrugs,
    updatePatientBanner,
    updateClinicalAlertsInspector,
    updateLiveSOAP,
    activateSidebarGroup,
    showAllWorkstationMotors,
    initWorkstationPackages,
    initResponsiveWorkstation,
    resetAllPatientData
};

// ----------------------------------------------------------------------------
// VİTAL BULGULAR & EKG ERKEN SENKRONİZASYONU (HATA-M24-002)
// ----------------------------------------------------------------------------
type HrSyncSource = 'hr' | 'rr' | 'rrBoxes';
let lastHrSyncSource: HrSyncSource | null = null;
let prevSyncedHr = '';
let prevSyncedRr = '';
let prevSyncedRrBoxes = '';

function formatBoxesValue(rrMs: number, msPerBox: number): string {
    return String(Number((rrMs / msPerBox).toFixed(1)));
}

export function syncVitalsAndEcg(): void {
    if (typeof document === 'undefined') return;
    const hrInput = document.getElementById('input-hr') as HTMLInputElement | null;
    const rrBoxesInput = document.getElementById('input-ecg-rr-boxes') as HTMLInputElement | null;
    const rrInput = document.getElementById('input-ecg-rr') as HTMLInputElement | null;
    const speedSelect = document.getElementById('select-ecg-paper-speed') as HTMLSelectElement | null;
    const msPerBox = (speedSelect && speedSelect.value === '50') ? 20 : 40;

    const hrRaw = hrInput ? hrInput.value.trim() : '';
    const rrRaw = rrInput ? rrInput.value.trim() : '';
    const rrBoxesRaw = rrBoxesInput ? rrBoxesInput.value.trim() : '';

    const activeEl = document.activeElement;
    let source: HrSyncSource | null = null;

    if (hrInput && activeEl === hrInput) {
        source = 'hr';
    } else if (rrInput && activeEl === rrInput) {
        source = 'rr';
    } else if (rrBoxesInput && activeEl === rrBoxesInput) {
        source = 'rrBoxes';
    } else if (speedSelect && activeEl === speedSelect) {
        if (lastHrSyncSource === 'rrBoxes' && rrBoxesRaw !== '') {
            source = 'rrBoxes';
        } else if (lastHrSyncSource === 'rr' && rrRaw !== '') {
            source = 'rr';
        } else if (hrRaw !== '') {
            source = 'hr';
        } else if (rrBoxesRaw !== '') {
            source = 'rrBoxes';
        } else if (rrRaw !== '') {
            source = 'rr';
        }
    } else {
        const hrChanged = hrRaw !== prevSyncedHr;
        const rrChanged = rrRaw !== prevSyncedRr;
        const rrBoxesChanged = rrBoxesRaw !== prevSyncedRrBoxes;

        if (rrBoxesChanged && rrBoxesRaw !== '' && !hrChanged) {
            source = 'rrBoxes';
        } else if (rrChanged && rrRaw !== '' && !hrChanged && (!rrBoxesChanged || rrBoxesRaw === '')) {
            source = 'rr';
        } else if (hrChanged && hrRaw !== '' && !rrChanged && !rrBoxesChanged) {
            source = 'hr';
        } else if (hrRaw === '' && rrRaw === '' && rrBoxesRaw === '') {
            source = null;
        } else if (lastHrSyncSource === 'hr' && hrRaw !== '') {
            source = 'hr';
        } else if (lastHrSyncSource === 'rr' && rrRaw !== '') {
            source = 'rr';
        } else if (lastHrSyncSource === 'rrBoxes' && rrBoxesRaw !== '') {
            source = 'rrBoxes';
        } else if (rrBoxesRaw !== '' && Number(rrBoxesRaw) > 0) {
            source = 'rrBoxes';
        } else if (rrRaw !== '' && Number(rrRaw) > 0) {
            source = 'rr';
        } else if (hrRaw !== '' && Number(hrRaw) > 0) {
            source = 'hr';
        }
    }

    if (source === 'hr') {
        if (hrRaw === '') {
            if (rrInput) rrInput.value = '';
            if (rrBoxesInput) rrBoxesInput.value = '';
            appState.biometry.heartRate = null;
            lastHrSyncSource = null;
        } else {
            const numHr = Number(hrRaw);
            if (Number.isFinite(numHr) && numHr > 0) {
                appState.biometry.heartRate = numHr;
                const calculatedRr = Math.round(60000 / numHr);
                if (rrInput) rrInput.value = String(calculatedRr);
                if (rrBoxesInput) rrBoxesInput.value = formatBoxesValue(calculatedRr, msPerBox);
                lastHrSyncSource = 'hr';
            } else {
                appState.biometry.heartRate = null;
            }
        }
    } else if (source === 'rr') {
        if (rrRaw === '') {
            if (hrInput) hrInput.value = '';
            if (rrBoxesInput) rrBoxesInput.value = '';
            appState.biometry.heartRate = null;
            lastHrSyncSource = null;
        } else {
            const rVal = Number(rrRaw);
            if (Number.isFinite(rVal) && rVal > 0) {
                const calculatedHr = Math.round(60000 / rVal);
                if (rrBoxesInput) rrBoxesInput.value = formatBoxesValue(rVal, msPerBox);
                if (hrInput) hrInput.value = String(calculatedHr);
                appState.biometry.heartRate = calculatedHr;
                lastHrSyncSource = 'rr';
            } else {
                appState.biometry.heartRate = null;
            }
        }
    } else if (source === 'rrBoxes') {
        if (rrBoxesRaw === '') {
            if (rrInput) rrInput.value = '';
            if (hrInput) hrInput.value = '';
            appState.biometry.heartRate = null;
            lastHrSyncSource = null;
        } else {
            const bVal = Number(rrBoxesRaw);
            if (Number.isFinite(bVal) && bVal > 0) {
                const calculatedRr = Math.round(bVal * msPerBox);
                const calculatedHr = Math.round(60000 / calculatedRr);
                if (rrInput) rrInput.value = String(calculatedRr);
                if (hrInput) hrInput.value = String(calculatedHr);
                appState.biometry.heartRate = calculatedHr;
                lastHrSyncSource = 'rrBoxes';
            } else {
                appState.biometry.heartRate = null;
            }
        }
    } else {
        appState.biometry.heartRate = null;
        lastHrSyncSource = null;
    }

    prevSyncedHr = hrInput ? hrInput.value.trim() : '';
    prevSyncedRr = rrInput ? rrInput.value.trim() : '';
    prevSyncedRrBoxes = rrBoxesInput ? rrBoxesInput.value.trim() : '';
}

// ----------------------------------------------------------------------------
// ANA REAKTİF GÜNCELLEME DÖNGÜSÜ (ORCHESTRATOR — AKILLI GÖRÜNÜRLÜK KAPISI)
// ----------------------------------------------------------------------------
let isUpdatingTabs = false;

/**
 * Canlı tarayıcı ortamında tamamen gizli (`.hidden`) ve aktif klinik durumu olmayan
 * yan branş kartlarının her tuş vuruşunda gereksiz yeniden hesaplanmasını önler.
 * Test / headless ortamlarında (gerçek layout düğümleri yokken) tüm motorlar tam çalışır.
 */
function shouldRunSpecialtyGroup(cardIds: readonly string[], hasActiveState: boolean): boolean {
    if (hasActiveState || typeof document === 'undefined' || !document.body) return true;
    const workspace = document.getElementById('clinical-workspace');
    if (!workspace) return true;

    let foundAnyCard = false;
    for (const id of cardIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        foundAnyCard = true;
        if (!el.classList.contains('hidden')) {
            return true;
        }
    }
    return !foundAnyCard;
}

export function updateAllTabs(): void {
    if (typeof document === 'undefined' || isUpdatingTabs) return;

    try {
        isUpdatingTabs = true;

        // 0. Vital Bulgular ve EKG Nabız Senkronizasyonu (HATA-M24-002)
        syncVitalsAndEcg();

        // 1. Hasta Biyometrisi ve Yaş Hesaplama (her zaman aktif çekirdek)
        const ageData = calculatePatientAge();
        updateBiometryAndGrowth(ageData);

        // 2. Acil, Nöroloji & Tromboemboli Skorlamaları (GCS, AVPU'yu besler)
        const hasEmergencyState = Boolean(
            appState.medicine.gcs ||
            appState.pediatrics.pgcs ||
            Object.values(appState.thrombosis).some(Boolean)
        );
        if (shouldRunSpecialtyGroup(['card-gcs', 'card-tromboz', 'card-vitaller'], hasEmergencyState)) {
            updateEmergencyNeuroCard(ageData);
        }

        // 3. Pediatri & Gelişim & Şurup & Aşı (NEWS2/PEWS güncel AVPU ile tek geçişte hesaplanır)
        const hasPedState = Boolean(
            appState.medicine.news2 ||
            appState.pediatrics.active ||
            appState.pediatrics.pews ||
            appState.pediatrics.bp ||
            appState.pediatrics.syrupDose ||
            appState.pediatrics.centor ||
            appState.pediatrics.iron ||
            appState.pediatrics.vaccines
        );
        if (shouldRunSpecialtyGroup(['card-vitaller', 'card-pediatri-surup', 'card-antibiyotik', 'card-demir'], hasPedState)) {
            updatePediatricCard(ageData);
        }

        // 4. Cerrahi & Kadın Doğum & Yanık
        const hasSurgObgynState = Boolean(
            Object.values(appState.surgery).some(Boolean) ||
            Object.values(appState.obgyn).some(Boolean)
        );
        if (shouldRunSpecialtyGroup(['card-cerrahi', 'card-obgyn'], hasSurgObgynState)) {
            updateSurgeryObgynCard(ageData);
        }

        // 5. Yenidoğan, Sarılık & Dehidratasyon
        const hasNeoState = Object.values(appState.neonatology).some(Boolean);
        if (shouldRunSpecialtyGroup(['card-neonatoloji'], hasNeoState)) {
            updateNeonatologyCard(ageData);
        }

        // 6. Dahiliye, EKG, Sıvı-Elektrolit, Toksikoloji & Nefroloji
        const hasImState = Boolean(
            appState.medicine.fluid ||
            appState.medicine.neonatalFluid ||
            appState.medicine.bloodGas ||
            appState.medicine.sodium ||
            appState.medicine.calcium ||
            appState.medicine.infusion ||
            appState.medicine.gir ||
            appState.medicine.steroid ||
            appState.medicine.homaIR ||
            appState.other.cardiac ||
            appState.other.axis ||
            Object.values(appState.nephroTox).some(Boolean)
        );
        if (shouldRunSpecialtyGroup(['card-idame', 'card-elektrolit', 'card-kangazi', 'card-kardiyo', 'card-endokrin', 'card-infuzyon', 'card-nefro', 'card-antibiyotik'], hasImState)) {
            updateInternalMedicineCard(ageData);
        }

        // 6b. Genişletilmiş Dahiliye Skorları (Hepatoloji Child-Pugh/MELD 3.0, NIHSS, ABCD², SOFA/qSOFA, GBS)
        const hasExtScoreState = Boolean(
            appState.medicine.childPugh ||
            appState.medicine.meld3 ||
            appState.medicine.nihss ||
            appState.medicine.abcd2 ||
            appState.medicine.sofa ||
            appState.medicine.qsofa ||
            appState.medicine.gbs
        );
        if (shouldRunSpecialtyGroup(['card-dahiliye-skorlar'], hasExtScoreState)) {
            updateExtendedScoresCard(ageData);
        }

        // 7. Akılcı İlaç & Güvenlik Kalkanı (reçetede ilaç varsa veya temizlenmesi gereken güvenlik uyarısı varsa daima çalışır)
        const sp = appState.safetyPrescription;
        const hasDrugState = Boolean(
            appState.treatment?.selectedDrugs?.length ||
            sp.selectedSafetyDrugs?.length ||
            sp.selectedSupplements?.length ||
            sp.supplementSafety ||
            sp.interactions ||
            sp.renalAdjustments ||
            sp.tripleWhammy ||
            sp.pregnancySafety ||
            sp.neonatalDrugSafety ||
            sp.serotoninSyndrome ||
            sp.hyperkalemiaRisk ||
            sp.cypStatinInteraction ||
            sp.hepaticSafety
        );
        if (shouldRunSpecialtyGroup(['card-ilac'], hasDrugState)) {
            updateSafetyAlertsCard(ageData);
        }

        // 8. Hasta Başlığı ve Klinik Alarmlar
        updatePatientBanner();
        updateClinicalAlertsInspector();

        // 9. Canlı SOAP Epikrizi
        updateLiveSOAP();
    } finally {
        isUpdatingTabs = false;
    }
}

// ----------------------------------------------------------------------------
// GLOBAL DİNLENİCİLER & RAF / COALESCING THROTLLING
// ----------------------------------------------------------------------------
const NON_CLINICAL_INPUT_IDS = new Set([
    'input-drug-search',
    'input-supplement-search',
    'input-custom-pack-name',
    'input-quick-switcher',
    'input-vaccine-filter',
    'select-soap-template',
    'select-rx-preset',
    'input-print-patient-name',
    'input-print-patient-tc',
    'input-print-doctor-name',
    'input-print-doctor-title',
    'input-print-doctor-diploma',
    'input-print-date',
    'input-print-diagnosis',
    'input-print-rx-number',
    'input-print-allergy',
    'input-print-clinical-notes',
    'input-rx-modal-drug-search',
    'select-catchup-scenario',
    'input-catchup-age-months',
    'input-catchup-age-years',
    'chk-catchup-tdt-return',
    'select-catchup-test-vax',
    'input-catchup-test-days',
    'input-catchup-dose-dabt',
    'input-catchup-dose-hepb',
    'input-catchup-dose-kpa',
    'input-catchup-dose-kkk',
    'input-catchup-dose-varicella',
    'input-catchup-dose-bcg',
    'input-catchup-dose-hepa',
    'input-catchup-dose-opa'
]);

let lastEventTarget: EventTarget | null = null;
let lastEventTimestamp = 0;

function handleFormEvent(e: Event): void {
    const target = e.target as HTMLElement | null;
    const targetId = target?.id;
    if (targetId && NON_CLINICAL_INPUT_IDS.has(targetId)) return;

    const now = Date.now();
    // HATA-M24-006 & UYUM-REACT-001: 50 ms içinde aynı hedef elemandan gelen mükerrer input/change olaylarını birleştir
    if (lastEventTarget === e.target && (now - lastEventTimestamp) < 50) {
        scheduleUpdate(updateAllTabs);
        return;
    }
    lastEventTarget = e.target;
    lastEventTimestamp = now;

    scheduleUpdate(updateAllTabs);
}

if (typeof document !== 'undefined') {
    document.addEventListener('input', handleFormEvent);
    document.addEventListener('change', handleFormEvent);
}

// ----------------------------------------------------------------------------
// BAŞLANGIÇ SENKRONİZASYONU VE ARAYÜZ BAŞLATICI
// ----------------------------------------------------------------------------
updateAllTabs();

if (typeof document !== 'undefined') {
    initDrugSearch(updateAllTabs);

    const bootWorkstationUI = () => {
        initExtendedScoresUI(updateAllTabs);
        initResponsiveWorkstation(updateAllTabs);
        initDataSnapshotBubbleController();
        injectCardGuidelineFooters();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootWorkstationUI);
    } else {
        bootWorkstationUI();
    }
}
