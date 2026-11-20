import assert from 'assert';
import {
  ensureDdiMatrixReady,
  isDdiMatrixReady,
  evaluateDdiMatrixForPrescription,
  detectTherapeuticDuplications,
  checkSingleDrugAgainstPrescription,
  translateFoodEntry,
  translateDiseaseName,
  FOOD_DICTIONARY_TR
} from '../src/engines/ddiMatrixEngine';

console.log('--- TESTING DDINTER 2.0 DDI MATRIX, FOOD & DUPLICATION ENGINE ---');

// 1. Load Compact DDI Matrix
const matrix = await ensureDdiMatrixReady();
assert.ok(matrix && isDdiMatrixReady(), 'ddi_matrix.json must load cleanly');
assert.ok(matrix.atcs.length >= 1000, `Matrix must cover >= 1,000 ATCs (Found: ${matrix.atcs.length})`);
assert.ok(matrix.rules.length >= 25, `Matrix must include >= 25 curated Turkish rules (Found: ${matrix.rules.length})`);
console.log(`✓ DDI Matrix loaded (${matrix.atcs.length} ATCs, ${matrix.rules.length} curated rules)`);

// 2. Curated Critical Rule: Warfarin (B01AA03) + Ibuprofen (M01AE01) -> Bleeding K
const evalWarfIbu = evaluateDdiMatrixForPrescription([
  { brand: 'COUMADIN 5 MG', generic: 'warfarin', atcCode: 'B01AA03' },
  { brand: 'ADVIL 400 MG', generic: 'ibuprofen', atcCode: 'M01AE01' }
]);
assert.ok(evalWarfIbu.curatedAlerts.length >= 1, 'Warfarin + Ibuprofen must trigger curated Turkish bleeding rule');
assert.strictEqual(evalWarfIbu.curatedAlerts[0].severity, 'K');
assert.ok(evalWarfIbu.counseling.foods.some(f => f.foodKey === 'alcohol'), 'Warfarin/Ibuprofen counseling must flag Alcohol');
assert.ok(evalWarfIbu.counseling.foods.some(f => f.foodKey === 'food high in vitamin k'), 'Warfarin counseling must flag Vitamin K');
console.log(`✓ Curated Critical DDI + Food counseling verified (${evalWarfIbu.curatedAlerts[0].title})`);

// 3. DDInter 2.0 Major (K): Atorvastatin (C10AA05) + Clarithromycin (J01FA09)
const evalStatinMacrolide = evaluateDdiMatrixForPrescription([
  { brand: 'LIPITOR 20 MG', generic: 'atorvastatin', atcCode: 'C10AA05', mealTiming: 'Tok karnına / Yemekle birlikte', mealTimingCode: 2 },
  { brand: 'KLACID 500 MG', generic: 'clarithromycin', atcCode: 'J01FA09' }
]);
assert.ok(
  evalStatinMacrolide.majorAlerts.length >= 1 || evalStatinMacrolide.curatedAlerts.length >= 1,
  'Atorvastatin + Clarithromycin must trigger Major DDI'
);
assert.ok(
  evalStatinMacrolide.counseling.foods.some(f => f.foodKey === 'grapefruit juice'),
  'Atorvastatin must surface Turkish Grapefruit Juice food warning'
);
assert.ok(evalStatinMacrolide.counseling.mealTimings.length === 1, 'Meal timing must be captured in counseling summary');
console.log('✓ DDInter 2.0 Major DDI + Grapefruit Juice + Meal Timing verified');

// 4. Deduplication against existingCoveredPairs (Alert Fatigue Guard)
const covered = new Set<string>(['B01AA03:M01AE01']);
const evalDedup = evaluateDdiMatrixForPrescription(
  [
    { brand: 'COUMADIN 5 MG', generic: 'warfarin', atcCode: 'B01AA03' },
    { brand: 'ADVIL 400 MG', generic: 'ibuprofen', atcCode: 'M01AE01' }
  ],
  { existingCoveredPairs: covered }
);
assert.strictEqual(evalDedup.totalInteractionCount, 0, 'Already covered ATC pairs must be deduplicated cleanly');
console.log('✓ Alert-fatigue deduplication guard verified');

// 5. Therapeutic Duplication Detection (Class duplication + Exact ingredient duplication)
const dupsClass = detectTherapeuticDuplications([
  { brand: 'LIPITOR 20 MG', generic: 'atorvastatin', atcCode: 'C10AA05' },
  { brand: 'CRESTOR 10 MG', generic: 'rosuvastatin', atcCode: 'C10AA07' }
]);
assert.ok(dupsClass.length >= 1, 'Two statins must trigger Therapeutic Duplication alert');
assert.ok(dupsClass[0].groupLabelTr.includes('Statin'), `Duplication label must be translated to Turkish (Got: ${dupsClass[0].groupLabelTr})`);

const dupsExact = detectTherapeuticDuplications([
  { brand: 'PAROL 500 MG', generic: 'paracetamol', atcCode: 'N02BE01' },
  { brand: 'MINOSET 500 MG', generic: 'paracetamol', atcCode: 'N02BE01' }
]);
assert.ok(dupsExact.some(d => d.isExactIngredient), 'Two brands with same ATC-5 must trigger exact ingredient duplication');
console.log('✓ Therapeutic Duplication (class & exact ATC-5) verified');

// 6. Single-drug vs active prescription check (for Monograph Modal Etkileşimler tab)
const singleAlerts = checkSingleDrugAgainstPrescription(
  { brand: 'KLACID 500 MG', atcCode: 'J01FA09', generic: 'clarithromycin' },
  [{ brand: 'LIPITOR 20 MG', atcCode: 'C10AA05', generic: 'atorvastatin' }]
);
assert.ok(singleAlerts.length >= 1, 'Single-drug modal check must detect interaction with active prescription');
console.log('✓ Single-drug vs active prescription cross-check verified');

// 7. All 24 Food Turkish translations & Critical Excipients
assert.strictEqual(Object.keys(FOOD_DICTIONARY_TR).length, 24, 'Must have Turkish translations for all 24 DDInter foods');
assert.strictEqual(translateFoodEntry('grapefruit juice').labelTr, 'Greyfurt Suyu');
assert.strictEqual(translateDiseaseName('Liver Diseases'), 'Karaciğer Hastalıkları');

const excEval = evaluateDdiMatrixForPrescription(
  [{ brand: 'NAXODER %1 KREM', atcCode: 'D01AE22', allergens: ['Sodyum', 'Benzil Alkol'], drivingRisk: 'Kullanılmamalı / Yüksek Risk', drivingRiskCode: 4 }],
  { isPediatricOrNeonate: true }
);
assert.ok(excEval.counseling.criticalExcipients.some(e => e.excipient === 'Benzil Alkol'), 'Must flag Benzil Alkol excipient');
assert.ok(excEval.counseling.drivingWarnings.some(w => w.isHigh), 'Must flag high driving risk');
console.log('✓ All 24 Food TR dictionary + Disease TR + Critical Excipient & Driving checks verified');

console.log('\n🎉 ALL DDINTER 2.0 DDI, FOOD & DUPLICATION TESTS PASSED! 🎉\n');
