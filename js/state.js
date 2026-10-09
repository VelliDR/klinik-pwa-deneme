export const appState = {
    // 1. Global Biometry (Ortak)
    biometry: {
        ageYears: null,
        ageMonths: null,
        gender: null, // 'M' or 'F'
        weightKg: null,
        heightCm: null,
        bsa: null,
        egfr: null
    },

    // 2. Sekme-Spesifik Veriler
    pediatrics: {
        active: false, // is this tab active/visited
        percentiles: null,
        targetHeight: null,
        correctedAge: null,
        bp: null,
        centor: null,
        vaccines: null,
        syrupDose: null,
        pews: null,
        pgcs: null
    },
    
    surgery: {
        active: false,
        alvarado: null,
        ranson: null,
        parkland: null,
        suture: null
    },

    obgyn: {
        active: false,
        eddData: null,
        bishop: null,
        preeclampsia: null
    },

    medicine: {
        active: false,
        bloodGas: null,
        fluid: null,
        sodium: null,
        calcium: null,
        infusion: null,
        gir: null,
        steroid: null,
        homaIR: null,
        news2: null,
        gcs: null
    },

    other: {
        active: false,
        cardiac: null,
        labGuide: null,
        drugPrescription: null
    },

    // 3. İleri Düzey Klinik Motorlar
    thrombosis: {
        active: false,
        wellsDVT: null,
        wellsPTE: null,
        perc: null,
        cha2ds2vasc: null,
        hasbled: null,
        heart: null
    },

    nephroTox: {
        active: false,
        fena: null,
        feurea: null,
        correctedSodium: null,
        osmolalGap: null,
        paracetamol: null,
        curb65: null
    },

    neonatology: {
        active: false,
        bhutani: null,
        apgar: null,
        westleyCroup: null,
        cdsDehydration: null
    },

    safetyPrescription: {
        active: false,
        renalAdjustments: null,
        tripleWhammy: null,
        pregnancySafety: null,
        selectedSafetyDrugs: []
    }
};