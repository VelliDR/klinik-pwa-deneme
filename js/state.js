export const appState = {
    patient: {
        ageUnit: 'years', ageValue: 5, dob: null, isPremature: false, gestationalWeeks: 40,
        heightCm: 110, weightKg: 20,
        derived: { totalMonths: 60, correctedMonths: 60, ageGroup: null, bsa: null }
    },
    vitals: {
        systolicBP: 120, diastolicBP: 80, heartRate: 75, respRate: 16, bodyTemp: 36.6, spo2: 98,
        derived: { evaluation: null }
    },
    fluid: { derived: { fluidResult: null } },
    glycemia: {
        currentGlucose: 200, targetGlucose: 100, carbsGrams: 30, isf: 25, icRatio: 20,
        derived: { insulinResult: null }
    },
    drugs: {
        searchQuery: '', searchResults: [], selectedDrug: null,
        derived: { dosageResult: null }
    }
};

const listeners = [];
export function subscribeState(listener) { listeners.push(listener); }
export function notifySubscribers() { listeners.forEach(fn => fn(appState)); }