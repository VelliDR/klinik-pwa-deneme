// Comprehensive Verification Script for All Clinical Engines & DOM ID integrity
import assert from 'assert';
import fs from 'fs';
import path from 'path';

import { calculateWellsDVT, calculateWellsPTE, evaluatePERC, calculateCHA2DS2VASc, calculateHASBLED, calculateHEART } from '../js/engines/thrombosisEngine.js';
import { calculateFENa, calculateFEUrea, calculateCorrectedSodium, calculateOsmolalGap, evaluateRumackMatthew, calculateCURB65 } from '../js/engines/nephroToxEngine.js';
import { calculateBhutaniJaundice, calculateAPGAR, calculateWestleyCroup, calculateCDSDehydration, calculateNeonatalWeightLoss } from '../js/engines/neonatologyEngine.js';
import { checkRenalDoseAdjustments, detectTripleWhammy, checkPregnancySafety, checkNeonatalDrugSafety } from '../js/engines/safetyPrescriptionEngine.js';
import { determineAgeGroup, calculateEGFR } from '../js/engines/biometricsEngine.js';
import { calculatePercentiles } from '../js/engines/percentileEngine.js';
import { calculateNeonatalFluid } from '../js/engines/fluidEngine.js';

console.log('--- 1. TESTING THROMBOSIS ENGINE ---');
// Wells DVT
const dvtLow = calculateWellsDVT({});
assert.strictEqual(dvtLow.score, 0);
assert.strictEqual(dvtLow.riskCategory, 'Düşük Risk');

const dvtMod = calculateWellsDVT({ localizedTenderness: true });
assert.strictEqual(dvtMod.score, 1);
assert.strictEqual(dvtMod.riskCategory, 'Orta Risk');

const dvtHigh = calculateWellsDVT({ localizedTenderness: true, entireLegSwollen: true, pittingEdema: true });
assert.strictEqual(dvtHigh.score, 3);
assert.strictEqual(dvtHigh.riskCategory, 'Yüksek Risk');
console.log('✓ Wells DVT passed');

// Wells PTE
const peUnlikely = calculateWellsPTE({ heartRateOver100: true, hemoptysis: true });
assert.strictEqual(peUnlikely.score, 2.5);
assert.strictEqual(peUnlikely.twoTierRisk.risk, 'PE Düşük / Olası Değil');

const peLikely = calculateWellsPTE({ clinicalSignsOfDVT: true, peLikelyOrMoreLikelyThanAlt: true });
assert.strictEqual(peLikely.score, 6.0);
assert.strictEqual(peLikely.twoTierRisk.risk, 'PE Olası / Yüksek Risk');
console.log('✓ Wells PTE passed');

// PERC
const percNeg = evaluatePERC({});
assert.strictEqual(percNeg.isPERCNegative, true);
assert.strictEqual(percNeg.positiveCount, 0);

const percPos = evaluatePERC({ ageGte50: true, spo2Lt95OnRoomAir: true });
assert.strictEqual(percPos.isPERCNegative, false);
assert.strictEqual(percPos.positiveCount, 2);
console.log('✓ PERC Rule passed');

// CHA2DS2-VASc
const afScore = calculateCHA2DS2VASc({ age75OrOlder: true, priorStrokeOrTIA: true, femaleGender: true });
assert.strictEqual(afScore.score, 5);
assert.strictEqual(afScore.annualStrokeRiskPercent, 7.2);
console.log('✓ CHA2DS2-VASc passed');

// HAS-BLED
const bledScore = calculateHASBLED({ hypertensionUncontrolled: true, abnormalRenalFunction: true, drugsConcomitant: true });
assert.strictEqual(bledScore.score, 3);
assert.strictEqual(bledScore.isHighRisk, true);
console.log('✓ HAS-BLED passed');

// HEART
const heartTest = calculateHEART({ historyPoints: 2, ecgPoints: 1, agePoints: 2, riskFactorsPoints: 2, troponinPoints: 1 });
assert.strictEqual(heartTest.score, 8);
assert.strictEqual(heartTest.riskCategory, 'Yüksek Risk');
console.log('✓ HEART Score passed');


console.log('\n--- 2. TESTING NEPHROTOX ENGINE ---');
// FENa
const fenaPrerenal = calculateFENa({ serumSodium: 140, urineSodium: 10, serumCreatinine: 2.0, urineCreatinine: 100 });
assert.strictEqual(fenaPrerenal.fenaPercent, 0.14);
assert.strictEqual(fenaPrerenal.etiology, 'Prerenal Azotemi');

const fenaATN = calculateFENa({ serumSodium: 140, urineSodium: 60, serumCreatinine: 2.0, urineCreatinine: 40 });
assert.strictEqual(fenaATN.fenaPercent, 2.14);
assert.strictEqual(fenaATN.etiology, 'İntrensek Renal / ATN');
console.log('✓ FENa passed');

// FEUrea
const feureaPrerenal = calculateFEUrea({ serumBUN: 50, urineUrea: 400, serumCreatinine: 2.0, urineCreatinine: 100 });
assert.strictEqual(feureaPrerenal.feUreaPercent, 16);
assert.strictEqual(feureaPrerenal.etiology, 'Prerenal Azotemi (Diüretik Kullanımında Güvenilir)');
console.log('✓ FEUrea passed');

// Katz Corrected Sodium
const katz = calculateCorrectedSodium({ measuredSodium: 125, glucoseMgDl: 600 });
assert.strictEqual(katz.correctedSodium, 133);
console.log('✓ Katz Corrected Sodium passed');

// Osmolal Gap
const osmTest = calculateOsmolalGap({ measuredOsmolality: 320, sodium: 140, glucoseMgDl: 100, bunMgDl: 15 });
assert.strictEqual(osmTest.isElevated, true); // calculated approx 291, gap ~29
console.log('✓ Osmolal Gap passed');

// Rumack-Matthew
const apapEarly = evaluateRumackMatthew({ hoursPostIngestion: 2, paracetamolLevelMcgMl: 200 });
assert.strictEqual(apapEarly.status, 'TOO_EARLY');

const apapToxic = evaluateRumackMatthew({ hoursPostIngestion: 8, paracetamolLevelMcgMl: 100, weightKg: 70 });
assert.strictEqual(apapToxic.isToxic, true);
assert.ok(apapToxic.nacProtocol.phase1.totalMg > 0);
console.log('✓ Rumack-Matthew & NAC passed');

// CURB-65
const curbTest = calculateCURB65({ confusion: true, bunOver19: true, ageGte65: true });
assert.strictEqual(curbTest.score, 3);
assert.strictEqual(curbTest.mortalityGroup, 'Şiddetli Pnömoni (Yüksek Risk)');
console.log('✓ CURB-65 passed');


console.log('\n--- 3. TESTING NEONATOLOGY ENGINE ---');
// Bhutani
const bEarly = calculateBhutaniJaundice({ ageHours: 12, totalBilirubin: 8 });
assert.strictEqual(bEarly.status, 'FIRST_24_HOURS_CRITICAL');

const bNormal = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 8, gestationalWeeks: 39 });
assert.strictEqual(bNormal.status, 'LOW_RISK');

const bPhoto = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 16, gestationalWeeks: 39 });
assert.strictEqual(bPhoto.status, 'PHOTOTHERAPY_REQUIRED');

const bExchange = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 23, gestationalWeeks: 39 });
assert.strictEqual(bExchange.status, 'EXCHANGE_TRANSFUSION_REQUIRED');
console.log('✓ Bhutani Hyperbilirubinemia passed');

// APGAR
const apgarDep = calculateAPGAR({ heartRate: 1, respiratoryEffort: 1, muscleTone: 1, reflexIrritability: 1, color: 1 });
assert.strictEqual(apgarDep.score, 5);
assert.strictEqual(apgarDep.status, 'MODERATELY_DEPRESSED');
console.log('✓ APGAR Score passed');

// Westley Croup
const croupMild = calculateWestleyCroup({ stridor: 1 });
assert.strictEqual(croupMild.severity, 'MILD');

const croupSevere = calculateWestleyCroup({ stridor: 2, retractions: 3, airEntry: 2 });
assert.strictEqual(croupSevere.severity, 'SEVERE');
console.log('✓ Westley Croup passed');

// CDS Dehydration
const cdsMod = calculateCDSDehydration({ generalAppearance: 1, eyes: 1, mucousMembranes: 1, tears: 1, weightKg: 10 });
assert.strictEqual(cdsMod.score, 4);
assert.strictEqual(cdsMod.severity, 'SOME_MILD_MODERATE');
assert.ok(cdsMod.orsRecommendedMl.includes('mL'));
console.log('✓ CDS Dehydration & ORS passed');


console.log('\n--- 4. TESTING SMART SAFETY PRESCRIPTION ENGINE ---');
// Renal Dose Adjustments
const renalCheck = checkRenalDoseAdjustments({
    egfr: 25,
    drugs: [
        { brand: 'Glifor 1000mg', generic: 'metformin' },
        { brand: 'Cipro 500mg', generic: 'ciprofloxacin' },
        { brand: 'Clexane 6000', generic: 'enoxaparin' },
        { brand: 'Parol 500mg', generic: 'paracetamol' }
    ]
});
assert.strictEqual(renalCheck.hasContraindication, true); // Metformin contraindication at eGFR < 30
assert.strictEqual(renalCheck.alertsCount, 3); // Metformin, Cipro, Enoxaparin
console.log('✓ Renal Dose Adjustments passed');

// Triple Whammy
const twTest = detectTripleWhammy([
    { brand: 'Delix 5mg', generic: 'ramipril' },
    { brand: 'Lasix 40mg', generic: 'furosemide' },
    { brand: 'Apranax Fort 550mg', generic: 'naproxen' }
]);
assert.strictEqual(twTest.isTripleWhammy, true);
assert.strictEqual(twTest.severity, 'CRITICAL');
console.log('✓ Triple Whammy Detection passed');

// Pregnancy Safety
const pregCheck = checkPregnancySafety([
    { brand: 'Roaccutane 20mg', generic: 'isotretinoin' },
    { brand: 'Coumadin 5mg', generic: 'warfarin' },
    { brand: 'Arveles 25mg', generic: 'dexketoprofen' }
], { trimester: 3 });
assert.strictEqual(pregCheck.hasSevereFetalRisk, true);
assert.strictEqual(pregCheck.alertsCount, 3);
console.log('✓ Pregnancy Safety passed');


console.log('\n--- 5. CHECKING INDEX.HTML DOM IDS REFERENCED IN APP.JS ---');
const htmlPath = fs.existsSync('./index.html') ? './index.html' : '../index.html';
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

const expectedIds = [
    'chk-dvt-cancer', 'chk-dvt-paralysis', 'chk-dvt-bedridden', 'chk-dvt-tenderness',
    'chk-dvt-swelling-entire', 'chk-dvt-calf-diff', 'chk-dvt-pitting-edema', 'chk-dvt-collateral',
    'chk-dvt-previous-dvt', 'chk-dvt-alt-likely', 'output-wells-dvt',
    'chk-pe-dvt-symptoms', 'chk-pe-alt-less-likely', 'chk-pe-hr-100', 'chk-pe-immobilization',
    'chk-pe-previous-pe', 'chk-pe-hemoptysis', 'chk-pe-malignancy', 'output-wells-pe',
    'chk-perc-age', 'chk-perc-hr', 'chk-perc-spo2', 'chk-perc-swelling', 'chk-perc-hemoptysis',
    'chk-perc-surgery', 'chk-perc-history', 'chk-perc-estrogen', 'output-perc',
    'select-heart-history', 'select-heart-ecg', 'select-heart-age', 'select-heart-risk', 'select-heart-troponin', 'output-heart-score',
    'chk-af-chf', 'chk-af-htn', 'chk-af-age75', 'chk-af-dm', 'chk-af-stroke', 'chk-af-vasc', 'chk-af-age65', 'chk-af-female', 'output-cha2ds2vasc',
    'chk-bleeding-htn', 'chk-bleeding-renal', 'chk-bleeding-liver', 'chk-bleeding-stroke', 'chk-bleeding-history', 'chk-bleeding-inr', 'chk-bleeding-elderly', 'chk-bleeding-drugs', 'chk-bleeding-alcohol', 'output-hasbled',
    'input-fena-s-na', 'input-fena-u-na', 'input-fena-s-cr', 'input-fena-u-cr', 'input-feurea-s-bun', 'input-feurea-u-urea', 'chk-fena-diuretic', 'output-fena-feurea',
    'input-corr-na-meas', 'input-corr-glucose', 'input-osm-measured', 'output-corr-na-osm',
    'input-apap-hours', 'input-apap-level', 'output-apap-rumack',
    'chk-curb-c', 'chk-curb-u', 'chk-curb-r', 'chk-curb-b', 'chk-curb-65', 'output-curb65',
    'input-bhutani-age-hours', 'input-bhutani-tsb', 'input-bhutani-gw', 'chk-bhutani-risk-factors', 'output-bhutani-result',
    'select-apgar-minute', 'select-apgar-hr', 'select-apgar-resp', 'select-apgar-tone', 'select-apgar-reflex', 'select-apgar-color', 'output-apgar-result',
    'select-croup-stridor', 'select-croup-retractions', 'select-croup-air', 'select-croup-cyanosis', 'select-croup-consciousness', 'output-croup-result',
    'select-cds-appearance', 'select-cds-eyes', 'select-cds-mucosa', 'select-cds-tears', 'output-cds-result',
    'input-safety-egfr', 'select-safety-trimester', 'badge-safety-status',
    'output-safety-triple-whammy', 'output-safety-renal', 'output-safety-pregnancy', 'output-safety-neonatal',
    'input-dob', 'input-birth-time', 'input-birth-weight', 'output-dob-breakdown',
    'output-neonatal-weight-loss', 'container-neonatal-fluid-banner',
    'text-neonatal-fluid-day', 'text-neonatal-fluid-target', 'text-neonatal-fluid-desc',
    'alert-item-neonatal-drug', 'alert-text-neonatal-drug',
    'alert-item-neonatal-weight', 'alert-text-neonatal-weight'
];

let missing = 0;
for (const id of expectedIds) {
    if (!htmlContent.includes(`id="${id}"`)) {
        console.error(`❌ Missing DOM ID in index.html: ${id}`);
        missing++;
    }
}

if (missing === 0) {
    console.log(`✓ All ${expectedIds.length} expected DOM IDs confirmed present in index.html!`);
} else {
    throw new Error(`Failed: ${missing} missing DOM IDs in index.html`);
}

console.log('\n--- 6. TESTING NEONATAL & DOB DEMOGRAPHY ENGINE ---');
// 1. determineAgeGroup for days and weeks
const neonateGroup = determineAgeGroup(14, 'days');
assert.strictEqual(neonateGroup.id, 'NEONATE');
const infantGroup = determineAgeGroup(6, 'weeks');
assert.strictEqual(infantGroup.id, 'INFANT');
console.log('✓ determineAgeGroup for days and weeks passed');

// 2. Fractional months percentiles for 14-day old neonate
const neonatePerc = calculatePercentiles({
    ageMonths: 14 / 30.4375,
    gender: 'female',
    weightKg: 3.5,
    heightCm: 51,
    headCircCm: 35
});
assert.ok(neonatePerc.weightPercentile > 0 && neonatePerc.weightPercentile < 100);
assert.ok(neonatePerc.heightPercentile > 0 && neonatePerc.heightPercentile < 100);
console.log(`✓ Neonate Percentile passed (Weight %${neonatePerc.weightPercentile}, Height %${neonatePerc.heightPercentile})`);

// 3. Neonate eGFR with Schwartz
const neonateEgfr = calculateEGFR(0.4, 14 / 365.25, 'F', 51);
assert.strictEqual(neonateEgfr, 53); // (0.413 * 51) / 0.4 = 52.65 => 53
console.log('✓ Neonate eGFR passed (53 mL/dk)');

console.log('\n--- 7. TESTING NEONATAL AUTOMATED ENGINES (TND FLUID, WEIGHT LOSS & DRUG SHIELD) ---');
// 1. Neonatal Fluid Step-up
const neoFluidD1 = calculateNeonatalFluid({ ageDays: 0, weightKg: 3.2, isPreterm: false, isPhototherapy: false });
assert.strictEqual(neoFluidD1.dayNumber, 1);
assert.strictEqual(neoFluidD1.mlPerKgRange, '60-70');
assert.ok(neoFluidD1.soluteAdvice.includes('Dekstroz'));
assert.ok(neoFluidD1.girMgKgMin >= 4.0 && neoFluidD1.girMgKgMin <= 6.0);

const neoFluidD3 = calculateNeonatalFluid({ ageDays: 2, weightKg: 3.0, isPreterm: false, isPhototherapy: false });
assert.strictEqual(neoFluidD3.dayNumber, 3);
assert.strictEqual(neoFluidD3.mlPerKgRange, '80-90');
assert.ok(neoFluidD3.soluteAdvice.includes('Elektrolit'));
console.log(`✓ TND Neonatal Fluid Step-up passed (D1: ${neoFluidD1.totalDailyMl} mL, GIR: ${neoFluidD1.girMgKgMin} mg/kg/dk | D3: ${neoFluidD3.totalDailyMl} mL)`);

// 2. Neonatal Weight Loss
const wlNormal = calculateNeonatalWeightLoss({ birthWeightG: 3200, currentWeightKg: 3.0, ageDays: 3 });
assert.strictEqual(wlNormal.percentLoss, 6.3);
assert.strictEqual(wlNormal.status, 'PHYSIOLOGICAL_NORMAL');
assert.strictEqual(wlNormal.alertClass, 'success');

const wlExcessive = calculateNeonatalWeightLoss({ birthWeightG: 3200, currentWeightKg: 2.8, ageDays: 3 });
assert.strictEqual(wlExcessive.percentLoss, 12.5);
assert.strictEqual(wlExcessive.status, 'EXCESSIVE_LOSS_CRITICAL');
assert.strictEqual(wlExcessive.alertClass, 'danger');
console.log(`✓ Physiological Weight Loss passed (Normal: %${wlNormal.percentLoss} | Critical: %${wlExcessive.percentLoss})`);

// 3. Neonatal Drug Safety Shield
const neoDrugAlerts = checkNeonatalDrugSafety([
    { brand: 'Rocephin 1g', generic: 'ceftriaxone' },
    { brand: 'Bactrim Susp', generic: 'cotrimoxazole' },
    { brand: 'Kemicetine', generic: 'chloramphenicol' },
    { brand: 'Parol 120mg', generic: 'paracetamol' }
]);
assert.strictEqual(neoDrugAlerts.hasContraindication, true);
assert.strictEqual(neoDrugAlerts.alertsCount, 3); // Ceftriaxone, Bactrim, Chloramphenicol
assert.ok(neoDrugAlerts.alerts.some(a => a.warning.includes('KERNİKTERUS')));
assert.ok(neoDrugAlerts.alerts.some(a => a.warning.includes('Gri Bebek Sendromu')));
console.log(`✓ Neonatal Drug Safety Shield passed (${neoDrugAlerts.alertsCount} contraindications caught)`);

console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 100% HEALTHY.');
