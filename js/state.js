export const appState = {
    patient: {
        ageUnit: 'years', 
        ageValue: null, 
        dob: null, 
        isPremature: false, 
        gestationalWeeks: 40,
        gender: 'male',
        heightCm: null, 
        weightKg: null,
        creatinine: null, // 👈 EKLENDİ (eGFR için)
        derived: { 
            totalMonths: 0, 
            correctedMonths: 0, 
            ageGroup: null, 
            bsa: null,
            egfr: null   // 👈 EKLENDİ (eGFR sonucu için)
        }
    },
    vitals: {
        systolicBP: null, 
        diastolicBP: null, 
        heartRate: null, 
        respRate: null, 
        bodyTemp: null, 
        spo2: null,
        derived: { evaluation: null }
    },
    fluid: { 
        derived: { fluidResult: null } 
    },
    glycemia: {
        currentGlucose: null, 
        targetGlucose: 100, 
        carbsGrams: 0, 
        isf: null, 
        icRatio: null,
        derived: { insulinResult: null }
    },
    drugs: {
        searchQuery: '', 
        searchResults: [], 
        selectedDrugs: [], // 👈 GÜNCELLENDİ (Tekil 'selectedDrug' yerine çoklu dizi yapıldı)
        derived: { dosageResult: null }
    },
    infusion: {
        drugAmountMg: null,
        totalVolumeMl: 50,
        targetDose: null,
        doseUnit: 'mcg_kg_min',
        derived: { infusionResult: null }
    }
    
};

const listeners = [];
export function subscribeState(listener) { 
    listeners.push(listener); 
}
export function notifySubscribers() { 
    listeners.forEach(fn => fn(appState)); 
}