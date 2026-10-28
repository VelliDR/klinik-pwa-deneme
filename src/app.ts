// ============================================================================
// KLİNİK ASİSTAN - CORE WORKSTATION & CLINICAL ENGINE ORCHESTRATOR
// Modüler mimari orkestratörü: 21 Klinik Motor, Reçete ve Güvenlik Denetleyicileri
// ============================================================================

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
    initResponsiveWorkstation
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
    initResponsiveWorkstation
};

// ----------------------------------------------------------------------------
// ANA REAKTİF GÜNCELLEME DÖNGÜSÜ (ORCHESTRATOR)
// ----------------------------------------------------------------------------
export function updateAllTabs(): void {
    if (typeof document === 'undefined') return;

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
}

// ----------------------------------------------------------------------------
// GLOBAL DİNLENİCİLER & RAF / COALESCING THROTLLING
// ----------------------------------------------------------------------------
const NON_CLINICAL_INPUT_IDS = new Set(['input-drug-search', 'input-custom-pack-name', 'input-custom-pack-icon']);

if (typeof document !== 'undefined') {
    document.addEventListener('input', (e: Event) => {
        const targetId = (e.target as HTMLElement | null)?.id;
        if (targetId && NON_CLINICAL_INPUT_IDS.has(targetId)) return;
        scheduleUpdate(updateAllTabs);
    });

    document.addEventListener('change', (e: Event) => {
        const targetId = (e.target as HTMLElement | null)?.id;
        if (targetId && NON_CLINICAL_INPUT_IDS.has(targetId)) return;
        scheduleUpdate(updateAllTabs);
    });
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
