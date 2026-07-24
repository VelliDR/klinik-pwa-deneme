/**
 * SODIUM & ELECTROLYTE ENGINE
 * Adrogué-Madias hiponatremi/hipernatremi düzeltme ve majör iyon uyarısı motoru.
 */

export function calculateElectrolyteAdjustments({
    weightKg,
    gender = 'male',
    ageGroup = 'ADULT',
    serumNa,
    serumK,
    serumCa,
    infusateNa,
    targetNaChangePerDay = 8
}) {
    const warnings = [];
    let naResult = null;

    // 1. SODYUM SEVİYE UYARILARI (Mutlak Seviye Kontrolü)
    if (serumNa) {
        if (serumNa < 120) {
            warnings.push('🔴 AĞIR / DERİN HİPONATREMİ (<120 mEq/L): Semptomatik ise acil %3 NaCl bolus (100-150 ml) & yakın nörolojik izlem gerekir!');
        } else if (serumNa < 130) {
            warnings.push('⚠️ ORTA HİPONATREMİ (<130 mEq/L): Sıvı kısıtlaması veya etiyoloji (SIADH, dehidratasyon) değerlendirilmeli.');
        } else if (serumNa > 150) {
            warnings.push('🔴 AĞIR HİPERNATREMİ (>150 mEq/L): Serebral ödem riski! Serbest su açığı hesabı yapılmalı.');
        }
    }

    // 2. POTASYUM KONTROLÜ
    if (serumK) {
        if (serumK < 3.0) warnings.push('⚠️ ŞİDDETLİ HİPOKALEMİ: IV KCl replasmanı gerekir (Max 20 mEq/saat perfüzör ile).');
        else if (serumK > 5.5) warnings.push('⚠️ HİPERKALEMİ: EKG çekilmeli, K tutucu ajanlar kesilmeli, İnsülin+Dextroz / Kalsiyum düşünülmeli.');
    }

    // 3. KALSİYUM KONTROLÜ
    if (serumCa) {
        if (serumCa < 7.5) warnings.push('⚠️ HİPOKALSİYUMİ: Trousseau/Chvostek bulguları kontrol edilmeli, IV Kalsiyum Glukonat düşünülmeli.');
    }

    // 4. SODYUM ADROGUÉ-MADIAS HESABI VE HIZ SINIRI KONTROLÜ
    if (weightKg && serumNa && infusateNa !== undefined && infusateNa !== null) {
        let tbwFactor = 0.6;
        if (['NEONATE', 'INFANT', 'TODDLER', 'PRESCHOOL', 'CHILD'].includes(ageGroup)) {
            tbwFactor = 0.6;
        } else if (ageGroup === 'GERIATRIC') {
            tbwFactor = gender === 'male' ? 0.5 : 0.45;
        } else {
            tbwFactor = gender === 'male' ? 0.6 : 0.5;
        }

        const tbw = weightKg * tbwFactor;
        const deltaNaPerLiter = (infusateNa - serumNa) / (tbw + 1);

        if (deltaNaPerLiter !== 0) {
            const requiredLitersPerDay = targetNaChangePerDay / deltaNaPerLiter;
            const hourlyRateMl = (Math.abs(requiredLitersPerDay) * 1000) / 24;

            // Günlük Düzeltme Hızı Sınırı (CPM / Serebral Ödem Riski)
            if (serumNa < 120 && targetNaChangePerDay > 10) {
                warnings.push('⛔ KRİTİK UYARI: Günlük Na artış hedefi >10 mEq/L seçildi! Santral Pontin Miyelinolizis (CPM) riski!');
            } else if (serumNa > 160 && targetNaChangePerDay > 10) {
                warnings.push('⛔ KRİTİK UYARI: Hipernatremi hızlı düşürülürse Serebral Ödem riski!');
            }

            naResult = {
                tbw: Number(tbw.toFixed(1)),
                deltaNaPerLiter: Number(deltaNaPerLiter.toFixed(2)),
                hourlyRateMl: Number(hourlyRateMl.toFixed(1))
            };
        }
    }

    return { naResult, warnings };
}