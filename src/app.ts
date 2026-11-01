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
    updateSafetyAlertsCard,
    renderSelectedDrugs,
    initDrugSearch
} from './controllers/safetyAlertsController';
import {
    updatePatientBanner,
    updateClinicalAlertsInspector,
    updateLiveSOAP,
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
    initWorkstationPackages,
    initResponsiveWorkstation,
    resetAllPatientData
};

// ----------------------------------------------------------------------------
// VİTAL BULGULAR & EKG ERKEN SENKRONİZASYONU (HATA-M24-002)
// ----------------------------------------------------------------------------
export function syncVitalsAndEcg(): void {
    if (typeof document === 'undefined') return;
    const hrInput = document.getElementById('input-hr') as HTMLInputElement | null;
    const rrBoxesInput = document.getElementById('input-ecg-rr-boxes') as HTMLInputElement | null;
    const rrInput = document.getElementById('input-ecg-rr') as HTMLInputElement | null;
    const speedSelect = document.getElementById('select-ecg-paper-speed') as HTMLSelectElement | null;
    const msPerBox = (speedSelect && speedSelect.value === '50') ? 20 : 40;

    if (rrBoxesInput && rrBoxesInput.value) {
        const bVal = Number(rrBoxesInput.value);
        if (!isNaN(bVal) && bVal > 0) {
            const calculatedRr = Math.round(bVal * msPerBox);
            if (rrInput && document.activeElement !== rrInput) {
                rrInput.value = String(calculatedRr);
            }
            if (hrInput && document.activeElement !== hrInput) {
                const calculatedHr = Math.round(60000 / calculatedRr);
                hrInput.value = String(calculatedHr);
                appState.biometry.heartRate = calculatedHr;
            }
        }
    } else if (rrInput && rrInput.value) {
        const rVal = Number(rrInput.value);
        if (!isNaN(rVal) && rVal > 0) {
            if (rrBoxesInput && document.activeElement !== rrBoxesInput) {
                rrBoxesInput.value = String(Math.round(rVal / msPerBox));
            }
            if (hrInput && document.activeElement !== hrInput) {
                const calculatedHr = Math.round(60000 / rVal);
                hrInput.value = String(calculatedHr);
                appState.biometry.heartRate = calculatedHr;
            }
        }
    } else if (hrInput && hrInput.value) {
        const numHr = Number(hrInput.value);
        if (!isNaN(numHr) && numHr > 0) {
            appState.biometry.heartRate = numHr;
            const calculatedRr = Math.round(60000 / numHr);
            if (rrInput && !rrInput.value && document.activeElement !== rrInput) {
                rrInput.value = String(calculatedRr);
            }
            if (rrBoxesInput && !rrBoxesInput.value && document.activeElement !== rrBoxesInput) {
                rrBoxesInput.value = String(Math.round(calculatedRr / msPerBox));
            }
        } else {
            appState.biometry.heartRate = null;
        }
    } else {
        appState.biometry.heartRate = null;
    }
}

// ----------------------------------------------------------------------------
// ANA REAKTİF GÜNCELLEME DÖNGÜSÜ (ORCHESTRATOR)
// ----------------------------------------------------------------------------
let isUpdatingTabs = false;

export function updateAllTabs(): void {
    if (typeof document === 'undefined' || isUpdatingTabs) return;

    try {
        isUpdatingTabs = true;

        // 0. Vital Bulgular ve EKG Nabız Senkronizasyonu (HATA-M24-002)
        syncVitalsAndEcg();

        // 1. Hasta Biyometrisi ve Yaş Hesaplama
        const ageData = calculatePatientAge();
        updateBiometryAndGrowth(ageData);

        // 2. Pediatri & Gelişim & Şurup & Aşı
        updatePediatricCard(ageData);

        // 3. Acil, Nöroloji & Tromboemboli Skorlamaları
        updateEmergencyNeuroCard(ageData);

        // 4. Cerrahi & Kadın Doğum & Yanık
        updateSurgeryObgynCard(ageData);

        // 5. Yenidoğan, Sarılık & Dehidratasyon
        updateNeonatologyCard(ageData);

        // 6. Dahiliye, EKG, Sıvı-Elektrolit, Toksikoloji & Nefroloji
        updateInternalMedicineCard(ageData);

        // 7. Akılcı İlaç & Güvenlik Kalkanı
        updateSafetyAlertsCard(ageData);

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
const NON_CLINICAL_INPUT_IDS = new Set(['input-drug-search', 'input-custom-pack-name', 'input-custom-pack-icon']);

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initResponsiveWorkstation(updateAllTabs));
    } else {
        initResponsiveWorkstation(updateAllTabs);
    }
}
