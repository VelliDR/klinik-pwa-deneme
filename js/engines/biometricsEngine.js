export const AGE_GROUPS = {
    NEONATE: { id: 'NEONATE', label: 'Yenidoğan (0-28 Gün)', isPediatric: true },
    INFANT: { id: 'INFANT', label: 'Süt Çocuğu (1-12 Ay)', isPediatric: true },
    TODDLER: { id: 'TODDLER', label: 'Oyun Çocuğu (1-3 Yaş)', isPediatric: true },
    PRESCHOOL: { id: 'PRESCHOOL', label: 'Okul Öncesi (3-4 Yaş)', isPediatric: true },
    CHILD: { id: 'CHILD', label: 'Okul Çağı (5-11 Yaş)', isPediatric: true },
    ADOLESCENT: { id: 'ADOLESCENT', label: 'Adolesan (12-17 Yaş)', isPediatric: true },
    ADULT: { id: 'ADULT', label: 'Erişkin (18-64 Yaş)', isPediatric: false },
    GERIATRIC: { id: 'GERIATRIC', label: 'Geriatrik (65+ Yaş)', isPediatric: false }
};

export function calculateBSA(heightCm, weightKg) {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
    return Number(Math.sqrt((heightCm * weightKg) / 3600).toFixed(2));
}

export function determineAgeGroup(ageValue, ageUnit) {
    if (!ageValue || ageValue <= 0) return null;

    // 1. Gelen değeri matematiksel kıyaslama için aya çeviriyoruz
    let totalMonths = 0;
    if (ageUnit === 'years') totalMonths = ageValue * 12;
    else if (ageUnit === 'months') totalMonths = ageValue;
    else if (ageUnit === 'days') totalMonths = ageValue / 30; 

    // 2. Yenidoğan Sınırı (Gün seçildiyse 28 gün kuralı katı işler)
    if (ageUnit === 'days' && ageValue <= 28) return AGE_GROUPS.NEONATE;
    if (ageUnit !== 'days' && totalMonths <= 1) return AGE_GROUPS.NEONATE;

    // 3. Diğer Yaş Grupları
    if (totalMonths <= 12) return AGE_GROUPS.INFANT;
    if (totalMonths <= 36) return AGE_GROUPS.TODDLER;
    if (totalMonths <= 48) return AGE_GROUPS.PRESCHOOL;
    
    const years = Math.floor(totalMonths / 12);
    if (years <= 11) return AGE_GROUPS.CHILD;
    if (years <= 17) return AGE_GROUPS.ADOLESCENT;
    if (years <= 64) return AGE_GROUPS.ADULT;
    return AGE_GROUPS.GERIATRIC;
}