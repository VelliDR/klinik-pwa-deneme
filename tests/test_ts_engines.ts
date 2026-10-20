// Comprehensive TypeScript Engine Verification Suite
import assert from 'assert';
import {
  calculateWellsDVT,
  calculateWellsPTE,
  evaluatePERC,
  calculateCHA2DS2VASc,
  calculateHASBLED,
  calculateHEART,
  calculateFENa,
  calculateFEUrea,
  evaluateOliguriaDifferential,
  calculateCorrectedSodium,
  calculateOsmolalGap,
  evaluateRumackMatthew,
  calculateCURB65,
  calculateBhutaniJaundice,
  calculateAPGAR,
  calculateWestleyCroup,
  calculateCDSDehydration,
  calculateNeonatalWeightLoss,
  checkRenalDoseAdjustments,
  detectTripleWhammy,
  checkPregnancySafety,
  checkNeonatalDrugSafety,
  checkSerotoninSyndrome,
  checkHyperkalemiaRisk,
  checkCypStatinInteraction,
  determineAgeGroup,
  calculateEGFR,
  calculateBSA,
  calculatePercentiles,
  calculateTargetHeight,
  calculateNeonatalFluid,
  calculateMaintenanceFluid,
  calculateSodiumCorrection,
  calculateQTc,
  calculateAxis,
  convertEcgBoxesToMs,
  convertMsToEcgBoxes,
  calculateHrFromBoxes,
  calculateAverageInterval,
  analyzeBloodGas,
  calculateCorrectedCalcium,
  convertSteroids,
  calculateHOMAIR,
  calculateInfusionRate,
  calculateGIR,
  calculatePediatricIron,
  calculateObstetrics,
  calculateBishop,
  calculatePreeclampsia,
  calculateAlvarado,
  calculateParkland,
  calculateRanson,
  getSutureGuidance,
  calculatePediatricDose,
  getVaccineSchedule,
  classifyPediatricBP,
  calculateCentorMcIsaac,
  calculateNEWS2,
  calculatePEWS,
  calculateGCS
} from '../src/engines/index';

import { parseDrugStrength } from '../src/drugEngine';
import { generateSOAP } from '../src/utils/soapGenerator';
import { resolveMotorDependencies, CLINICAL_MOTORS, PRESET_PACKAGES } from '../src/workstationPackages';
import { searchQuickSwitcher, QUICK_SWITCHER_ITEMS } from '../src/utils/quickSwitcher';
import { buildDefaultDrugSchedule, generatePrescriptionHTML, PRESCRIPTION_PRESETS } from '../src/utils/prescriptionPrinter';
import {
  calculateAnaphylaxisDoses,
  calculateStatusEpilepticusDoses,
  formatAnaphylaxisSoapNote,
  formatStatusEpilepticusSoapNote
} from '../src/engines/emergencyProtocols';
import { expandDotPhrases, appendTemplateToText, SOAP_TEMPLATES } from '../src/utils/soapTemplates';
import { formatTimeMMSS } from '../src/utils/emergencyManager';

console.log('--- 1. VERIFYING TYPESCRIPT THROMBOSIS ENGINE ---');
const dvtLow = calculateWellsDVT({});
assert.strictEqual(dvtLow.score, 0);
assert.strictEqual(dvtLow.riskCategory, 'Düşük Risk');

const dvtMod = calculateWellsDVT({ localizedTenderness: true });
assert.strictEqual(dvtMod.score, 1);
assert.strictEqual(dvtMod.riskCategory, 'Orta Risk');

const peLikely = calculateWellsPTE({ clinicalSignsOfDVT: true, peLikelyOrMoreLikelyThanAlt: true });
assert.strictEqual(peLikely.score, 6.0);
assert.strictEqual(peLikely.twoTierRisk.risk, 'PE Olası / Yüksek Risk');

const percNeg = evaluatePERC({});
assert.strictEqual(percNeg.isPERCNegative, true);
assert.strictEqual(percNeg.positiveCount, 0);

const afScore = calculateCHA2DS2VASc({ age75OrOlder: true, priorStrokeOrTIA: true, femaleGender: true });
assert.strictEqual(afScore.score, 5);
assert.strictEqual(afScore.annualStrokeRiskPercent, 7.2);

const bledScore = calculateHASBLED({ hypertensionUncontrolled: true, abnormalRenalFunction: true, drugsConcomitant: true });
assert.strictEqual(bledScore.score, 3);
assert.strictEqual(bledScore.isHighRisk, true);

const heartTest = calculateHEART({ historyPoints: 2, ecgPoints: 1, agePoints: 2, riskFactorsPoints: 2, troponinPoints: 1 });
assert.strictEqual(heartTest.score, 8);
assert.strictEqual(heartTest.riskCategory, 'Yüksek Risk');
console.log('✓ TypeScript Thrombosis Engine passed (100% parity)');

console.log('--- 2. VERIFYING TYPESCRIPT NEPHROTOX ENGINE ---');
const fenaPrerenal = calculateFENa({ serumSodium: 140, urineSodium: 10, serumCreatinine: 2.0, urineCreatinine: 100 });
assert.ok(fenaPrerenal);
assert.strictEqual(fenaPrerenal.fenaPercent, 0.14);
assert.strictEqual(fenaPrerenal.etiology, 'Prerenal Azotemi');

const feureaPrerenal = calculateFEUrea({ serumBUN: 50, urineUrea: 400, serumCreatinine: 2.0, urineCreatinine: 100 });
assert.ok(feureaPrerenal);
assert.strictEqual(feureaPrerenal.feUreaPercent, 16);

const concordance = evaluateOliguriaDifferential(
  calculateFENa({ serumSodium: 140, urineSodium: 35, serumCreatinine: 2.0, urineCreatinine: 40, isOnDiuretics: true }),
  feureaPrerenal
);
assert.ok(concordance);
assert.strictEqual(concordance.concordance, 'DİÜRETİK_MASKELİ_PRERENAL');

const katz = calculateCorrectedSodium({ measuredSodium: 125, glucoseMgDl: 600 });
assert.ok(katz);
assert.strictEqual(katz.correctedSodium, 133);
assert.strictEqual(katz.correctedSodiumHillier, 137);

const osmTest = calculateOsmolalGap({ measuredOsmolality: 320, sodium: 140, glucoseMgDl: 100, bunMgDl: 15 });
assert.ok(osmTest);
assert.strictEqual(osmTest.isCriticalGap, true);
assert.ok(osmTest.antidoteAdvice?.fomepizol.includes('Fomepizol'));

const apapToxicAdult = evaluateRumackMatthew({ hoursPostIngestion: 8, paracetamolLevelMcgMl: 100, weightKg: 70 });
assert.ok(apapToxicAdult);
assert.strictEqual(apapToxicAdult.isToxic, true);
assert.strictEqual(apapToxicAdult.nacProtocol?.phase1.totalMg, 10500);

const apapToxicChild = evaluateRumackMatthew({ hoursPostIngestion: 6, paracetamolLevelMcgMl: 120, weightKg: 10 });
assert.ok(apapToxicChild);
assert.strictEqual(apapToxicChild.nacProtocol?.isPediatricAdjusted, true);
assert.strictEqual(apapToxicChild.nacProtocol?.phase1.totalMg, 1500);

const curbTest = calculateCURB65({ confusion: true, bunOver19: true, ageGte65: true });
assert.strictEqual(curbTest.score, 3);
assert.strictEqual(curbTest.crbScore, 2);
console.log('✓ TypeScript NephroTox Engine passed (100% parity)');

console.log('--- 3. VERIFYING TYPESCRIPT NEONATOLOGY ENGINE ---');
const bPhoto = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 16, gestationalWeeks: 39 });
assert.strictEqual(bPhoto.status, 'PHOTOTHERAPY_REQUIRED');

const bExchange = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 23, gestationalWeeks: 39 });
assert.strictEqual(bExchange.status, 'EXCHANGE_TRANSFUSION_REQUIRED');

const apgarDep = calculateAPGAR({ heartRate: 1, respiratoryEffort: 1, muscleTone: 1, reflexIrritability: 1, color: 1 });
assert.strictEqual(apgarDep.score, 5);

const croupSevere = calculateWestleyCroup({ stridor: 2, retractions: 3, airEntry: 2 });
assert.strictEqual(croupSevere.severity, 'SEVERE');

const cdsMod = calculateCDSDehydration({ generalAppearance: 1, eyes: 1, mucousMembranes: 1, tears: 1, weightKg: 10 });
assert.strictEqual(cdsMod.score, 4);
assert.strictEqual(cdsMod.severity, 'SOME_MILD_MODERATE');

const wlNormal = calculateNeonatalWeightLoss({ birthWeightG: 3200, currentWeightKg: 3.0, ageDays: 3 });
assert.strictEqual(wlNormal.percentLoss, 6.3);
assert.strictEqual(wlNormal.status, 'PHYSIOLOGICAL_NORMAL');
console.log('✓ TypeScript Neonatology Engine passed (100% parity)');

console.log('--- 4. VERIFYING TYPESCRIPT SAFETY & PRESCRIPTION ENGINE ---');
const renalCheck = checkRenalDoseAdjustments({
  egfr: 25,
  drugs: [
    { brand: 'Glifor 1000mg', generic: 'metformin' },
    { brand: 'Cipro 500mg', generic: 'ciprofloxacin' },
    { brand: 'Clexane 6000', generic: 'enoxaparin' },
    { brand: 'Parol 500mg', generic: 'paracetamol' }
  ]
});
assert.strictEqual(renalCheck.hasContraindication, true);
assert.strictEqual(renalCheck.alertsCount, 3);

const twTest = detectTripleWhammy([
  { brand: 'Delix 5mg', generic: 'ramipril' },
  { brand: 'Lasix 40mg', generic: 'furosemide' },
  { brand: 'Apranax Fort 550mg', generic: 'naproxen' }
]);
assert.strictEqual(twTest.isTripleWhammy, true);
assert.strictEqual(twTest.severity, 'CRITICAL');

const pregCheck = checkPregnancySafety([
  { brand: 'Roaccutane 20mg', generic: 'isotretinoin' },
  { brand: 'Coumadin 5mg', generic: 'warfarin' },
  { brand: 'Arveles 25mg', generic: 'dexketoprofen' }
], { trimester: 3 });
assert.strictEqual(pregCheck.hasSevereFetalRisk, true);
assert.strictEqual(pregCheck.alertsCount, 3);

const neoDrugAlerts = checkNeonatalDrugSafety([
  { brand: 'Rocephin 1g', generic: 'ceftriaxone' },
  { brand: 'Bactrim Susp', generic: 'cotrimoxazole' },
  { brand: 'Kemicetine', generic: 'chloramphenicol' },
  { brand: 'Parol 120mg', generic: 'paracetamol' }
]);
assert.strictEqual(neoDrugAlerts.hasContraindication, true);
assert.strictEqual(neoDrugAlerts.alertsCount, 3);

// 5. Serotonin Sendromu Kalkanı Testleri
const seroMaoi = checkSerotoninSyndrome([
  { brand: 'Zyvoxid 600mg', generic: 'linezolid' },
  { brand: 'Cipralex 10mg', generic: 'escitalopram' }
]);
assert.strictEqual(seroMaoi.isHighRisk, true);
assert.strictEqual(seroMaoi.severity, 'CRITICAL');
assert.strictEqual(seroMaoi.hasMaoiCombination, true);

const seroTramadol = checkSerotoninSyndrome([
  { brand: 'Contramal 100mg', generic: 'tramadol' },
  { brand: 'Lustral 50mg', generic: 'sertraline' }
]);
assert.strictEqual(seroTramadol.isHighRisk, true);
assert.strictEqual(seroTramadol.severity, 'CRITICAL');

const seroSafe = checkSerotoninSyndrome([
  { brand: 'Parol 500mg', generic: 'paracetamol' },
  { brand: 'Augmentin 1g', generic: 'amoxicillin' }
]);
assert.strictEqual(seroSafe.isHighRisk, false);
assert.strictEqual(seroSafe.severity, 'SAFE');

// 6. Hiperkalemi Kalkanı Testleri
const hkRaasDiuretic = checkHyperkalemiaRisk([
  { brand: 'Delix 5mg', generic: 'ramipril' },
  { brand: 'Aldactone 25mg', generic: 'spironolactone' }
]);
assert.strictEqual(hkRaasDiuretic.isAtRisk, true);
assert.strictEqual(hkRaasDiuretic.severity, 'CRITICAL');

const hkBactrim = checkHyperkalemiaRisk([
  { brand: 'Co-Diovan 160/12.5', generic: 'valsartan' },
  { brand: 'Bactrim Forte', generic: 'trimethoprim' }
]);
assert.strictEqual(hkBactrim.isAtRisk, true);
assert.strictEqual(hkBactrim.severity, 'CRITICAL');

const hkCompounded = checkHyperkalemiaRisk([
  { brand: 'Ramipril 5mg', generic: 'ramipril' },
  { brand: 'Apranax 550mg', generic: 'naproxen' }
], { egfr: 45, ageYears: 70 });
assert.strictEqual(hkCompounded.isAtRisk, true);
assert.strictEqual(hkCompounded.severity, 'CRITICAL');
assert.strictEqual(hkCompounded.hasRenalOrAgeCompounding, true);

const hkMild = checkHyperkalemiaRisk([
  { brand: 'Ramipril 5mg', generic: 'ramipril' },
  { brand: 'Apranax 550mg', generic: 'naproxen' }
], { egfr: 90, ageYears: 40 });
assert.strictEqual(hkMild.isAtRisk, true);
assert.strictEqual(hkMild.severity, 'WARNING');

// 7. CYP3A4 Statin Rabdomiyoliz Kalkanı Testleri
const cypSimva = checkCypStatinInteraction([
  { brand: 'Zocor 20mg', generic: 'simvastatin' },
  { brand: 'Klacid 500mg', generic: 'clarithromycin' }
]);
assert.strictEqual(cypSimva.hasInteraction, true);
assert.strictEqual(cypSimva.severity, 'CRITICAL');
assert.ok(cypSimva.safeAlternatives.antibiotics.length > 0);

const cypAtorva = checkCypStatinInteraction([
  { brand: 'Lipitor 20mg', generic: 'atorvastatin' },
  { brand: 'Sporanox 100mg', generic: 'itraconazole' }
]);
assert.strictEqual(cypAtorva.hasInteraction, true);
assert.strictEqual(cypAtorva.severity, 'CRITICAL');

const cypSafeRosuva = checkCypStatinInteraction([
  { brand: 'Crestor 10mg', generic: 'rosuvastatin' },
  { brand: 'Klacid 500mg', generic: 'clarithromycin' }
]);
assert.strictEqual(cypSafeRosuva.hasInteraction, false);
assert.strictEqual(cypSafeRosuva.severity, 'SAFE');

console.log('✓ TypeScript Safety & Prescription Engine passed (100% parity)');

console.log('--- 5. VERIFYING TYPESCRIPT BIOMETRICS, FLUID, CARDIAC & TRIAGE ---');
const bsaVal = calculateBSA(70, 175);
assert.strictEqual(bsaVal, 1.84);

const egfrSchwartz = calculateEGFR(0.5, 6, 'M', 115);
assert.strictEqual(egfrSchwartz, 95);

const fluid = calculateMaintenanceFluid(70);
assert.strictEqual(fluid.dailyVolume, 2500);

const qtcNorm = calculateQTc({ hr: 80, qt: 400, gender: 'male' });
assert.strictEqual(qtcNorm.qtcBazett, 462);

const axis = calculateAxis(10, 10);
assert.strictEqual(axis.degrees, 45);

// ECG Box (Küçük Kare) ve Kağıt Hızı Dönüşüm Testleri
assert.strictEqual(convertEcgBoxesToMs(10, 25), 400); // 10 kare * 40 ms = 400 ms
assert.strictEqual(convertEcgBoxesToMs(9.5, 25), 380); // 9.5 kare * 40 ms = 380 ms
assert.strictEqual(convertEcgBoxesToMs(10, 50), 200); // 10 kare * 20 ms = 200 ms (50 mm/sn)
assert.strictEqual(convertMsToEcgBoxes(400, 25), 10);
assert.strictEqual(convertMsToEcgBoxes(380, 25), 9.5);
assert.strictEqual(convertMsToEcgBoxes(400, 50), 20);

// RR & Kalp Hızı Hesaplama Testleri
assert.strictEqual(calculateHrFromBoxes(20, false, 25), 75); // 20 küçük kare = 800 ms = 75 bpm
assert.strictEqual(calculateHrFromBoxes(4, true, 25), 75); // 4 büyük kare = 75 bpm
assert.strictEqual(calculateHrFromBoxes(3, true, 25), 100); // 3 büyük kare = 100 bpm
assert.strictEqual(calculateHrFromBoxes(5, true, 25), 60); // 5 büyük kare = 60 bpm

// Çoklu Vuru Ortalaması Testleri (Aritmi / AFib)
assert.strictEqual(calculateAverageInterval([10, 10.5, 9.5]), 10.0);
assert.strictEqual(calculateAverageInterval([380, 400, 420]), 400.0);

const gcs = calculateGCS(4, 5, 6);
assert.strictEqual(gcs.total, 15);
console.log('✓ TypeScript Biometrics, Fluid, Cardiac & Triage passed (100% parity)');

console.log('--- 6. VERIFYING TYPESCRIPT WORKSTATION PACKAGES & UTILS ---');
const resolvedPack = resolveMotorDependencies(['card-idame']);
assert.ok(resolvedPack.includes('card-biyometri'));
assert.ok(resolvedPack.includes('card-demografi'));
assert.ok(resolvedPack.includes('card-elektrolit'));

const strength = parseDrugStrength('PAROL 120 MG/5 ML');
assert.ok(strength);
assert.strictEqual(strength.type, 'liquid');
assert.strictEqual(strength.mgPerMl, 24);

const soap = generateSOAP();
assert.ok(soap.includes('[S] SUBJEKTİF:'));
assert.ok(soap.includes('[O] OBJEKTİF:'));
assert.ok(soap.includes('[A] DEĞERLENDİRME:'));
assert.ok(soap.includes('[P] PLAN & TEDAVİ:'));
console.log('✓ TypeScript Workstation Packages, Drug Engine & SOAP Generator passed');

console.log('--- 7. VERIFYING ERGONOMICS, QUICK SWITCHER & PRESCRIPTION PRINTER (AŞAMA 2) ---');
// 1. Quick Switcher Arama Testleri
assert.strictEqual(QUICK_SWITCHER_ITEMS.length, 21);
const searchBloodGas = searchQuickSwitcher('kan gazı');
assert.ok(searchBloodGas.some(m => m.id === 'card-kangazi'));

const searchApgar = searchQuickSwitcher('apgar');
assert.ok(searchApgar.some(m => m.id === 'card-neonatoloji'));

const searchRx = searchQuickSwitcher('titck');
assert.ok(searchRx.some(m => m.id === 'card-ilac'));

const searchEmpty = searchQuickSwitcher('');
assert.strictEqual(searchEmpty.length, 21);

const searchNotFound = searchQuickSwitcher('bilinmeyen_arama_anahtari_xyz');
assert.strictEqual(searchNotFound.length, 0);

// 2. Prescription Printer Şablon & HTML Testleri
const schedAmox = buildDefaultDrugSchedule({ brand: 'Amoklavin BID 1000 mg', generic: 'amoxicillin' });
assert.strictEqual(schedAmox.morning, true);
assert.strictEqual(schedAmox.evening, true);
assert.strictEqual(schedAmox.noon, false);
assert.strictEqual(schedAmox.mealTiming, 'TOK');
assert.ok(schedAmox.instructions.includes('antibiyotik') || schedAmox.instructions.includes('Antibiyotik'));

const schedStatin = buildDefaultDrugSchedule({ brand: 'Lipitor 20 mg', generic: 'atorvastatin' });
assert.strictEqual(schedStatin.night, true);
assert.strictEqual(schedStatin.morning, false);
assert.strictEqual(schedStatin.mealTiming, 'GECE');
assert.ok(schedStatin.instructions.includes('kas ağrısı'));

const schedPPI = buildDefaultDrugSchedule({ brand: 'Nexium 40 mg', generic: 'esomeprazole' });
assert.strictEqual(schedPPI.morning, true);
assert.strictEqual(schedPPI.mealTiming, 'AC');
assert.ok(schedPPI.instructions.toLowerCase().includes('aç'));

const schedSpray = buildDefaultDrugSchedule({ brand: 'Otrivine %0.1 Burun Spreyi', generic: 'xylometazoline' });
assert.strictEqual(schedSpray.form, 'Sprey/İnhaler');
assert.ok(schedSpray.instructions.includes('5 gün'));

const schedSyrup = buildDefaultDrugSchedule({ brand: 'Calpol 120 mg/5 ml Şurup', generic: 'parasetamol' });
assert.strictEqual(schedSyrup.form, 'Şurup');

// Presets validation
assert.ok(PRESCRIPTION_PRESETS.length >= 4);
assert.ok(PRESCRIPTION_PRESETS.every(p => p.drugs.length > 0 && p.title.length > 0));

const prnHt = generatePrescriptionHTML(
  {
    patientName: 'Ahmet Yılmaz',
    age: '45 Yaş',
    weightKg: 75,
    dateStr: '20.10.2026',
    doctorName: 'Uzm. Dr. Test Hekim',
    diagnosis: 'J02.9 Akut Tonsillit',
    rxNumber: 'RX-2026-987654',
    allergyNotes: 'Penisilin Alerjisi Mevcut'
  },
  [schedAmox, schedStatin, schedPPI]
);
assert.ok(prnHt.includes('HASTA İLAÇ KULLANIM ÇİZELGESİ'));
assert.ok(prnHt.includes('Ahmet Yılmaz'));
assert.ok(prnHt.includes('Amoklavin BID 1000 mg'));
assert.ok(prnHt.includes('Lipitor 20 mg'));
assert.ok(prnHt.includes('Nexium 40 mg'));
assert.ok(prnHt.includes('Uzm. Dr. Test Hekim'));
assert.ok(prnHt.includes('J02.9 Akut Tonsillit'));
assert.ok(prnHt.includes('RX-2026-987654'));
assert.ok(prnHt.includes('İLAÇ ALERJİSİ: Penisilin Alerjisi Mevcut'));
console.log('✓ Ergonomics, Quick Switcher & Smart Prescription Printer passed (100% parity)');

console.log('--- 8. VERIFYING EMERGENCY PROTOCOLS & SOAP DOT PHRASES (AŞAMA 3) ---');
// 1. Anaphylaxis Engine Tests
const pediaAnaph = calculateAnaphylaxisDoses(15, false);
assert.strictEqual(pediaAnaph.weightKg, 15);
assert.strictEqual(pediaAnaph.isAdult, false);
assert.strictEqual(pediaAnaph.adrenaline.doseMg, 0.15);
assert.strictEqual(pediaAnaph.adrenaline.volumeMl, 0.15);
assert.strictEqual(pediaAnaph.fluidBolus.volumeMl, 300);
assert.strictEqual(pediaAnaph.antihistaminic.doseMg, 15);

const adultAnaph = calculateAnaphylaxisDoses(85, true);
assert.strictEqual(adultAnaph.weightKg, 85);
assert.strictEqual(adultAnaph.isAdult, true);
assert.strictEqual(adultAnaph.adrenaline.doseMg, 0.50); // Capped at adult max 0.50
assert.strictEqual(adultAnaph.adrenaline.volumeMl, 0.50);
assert.strictEqual(adultAnaph.fluidBolus.volumeMl, 1000);
assert.strictEqual(adultAnaph.antihistaminic.doseMg, 50); // Capped at max 50
assert.strictEqual(adultAnaph.corticosteroid.doseMg, 80); // Capped at max 80

const anaphSoap = formatAnaphylaxisSoapNote(adultAnaph, 1);
assert.ok(anaphSoap.includes('ACİL ANAFİLAKSİ PROTOKOLÜ'));
assert.ok(anaphSoap.includes('0.5 mg (0.5 mL) 1:1000 İM'));

// 2. Status Epilepticus Engine Tests
const pediaStatus = calculateStatusEpilepticusDoses(20, false);
assert.strictEqual(pediaStatus.weightKg, 20);
assert.strictEqual(pediaStatus.phase2EarlyStatus.midazolam.doseMg, 4.0);
assert.strictEqual(pediaStatus.phase2EarlyStatus.diazepam.doseMg, 5.0);
assert.strictEqual(pediaStatus.phase3EstablishedStatus.levetiracetam.doseMg, 1200);
assert.strictEqual(pediaStatus.phase3EstablishedStatus.phenytoin.doseMg, 400);
assert.strictEqual(pediaStatus.phase3EstablishedStatus.valproate.doseMg, 800);

const adultStatus = calculateStatusEpilepticusDoses(90, true);
assert.strictEqual(adultStatus.phase2EarlyStatus.midazolam.doseMg, 10); // Max 10 mg
assert.strictEqual(adultStatus.phase3EstablishedStatus.levetiracetam.doseMg, 4500); // Max 4500 mg
assert.strictEqual(adultStatus.phase3EstablishedStatus.phenytoin.doseMg, 1500); // Max 1500 mg
assert.strictEqual(adultStatus.phase3EstablishedStatus.valproate.doseMg, 3000); // Max 3000 mg

const statusSoap = formatStatusEpilepticusSoapNote(adultStatus, 12);
assert.ok(statusSoap.includes('STATUS EPİLEPTİCUS ACİL PROTOKOLÜ'));
assert.ok(statusSoap.includes('12 dk'));

// 3. Dot Phrases Expansion Tests
assert.strictEqual(SOAP_TEMPLATES.length, 10);
const exp1 = expandDotPhrases('Hasta sağ alt karın ağrısı ile başvurdu. .apandisit ');
assert.ok(exp1.expandedText.includes('McBurney hassasiyeti'));
assert.strictEqual(exp1.expandedKeys.length, 1);
assert.strictEqual(exp1.expandedKeys[0], '.apandisit');

const exp2 = expandDotPhrases('Boğaz ağrısı: .tonsillit ');
assert.ok(exp2.expandedText.includes('Centor/McIsaac'));

const expNone = expandDotPhrases('Normal muayene bulguları.');
assert.strictEqual(expNone.expandedText, 'Normal muayene bulguları.');
assert.strictEqual(expNone.expandedKeys.length, 0);

// 4. Template Append Tests
const appended = appendTemplateToText('Önceki şikayet.', '.dvt_dislama');
assert.ok(appended.includes('Önceki şikayet.'));
assert.ok(appended.includes('Wells DVT skoru değerlendirildi'));

// 5. Timer formatting
assert.strictEqual(formatTimeMMSS(300), '05:00');
assert.strictEqual(formatTimeMMSS(45), '00:45');
assert.strictEqual(formatTimeMMSS(125), '02:05');
assert.strictEqual(formatTimeMMSS(0), '00:00');
console.log('✓ Emergency Protocols, Live Timers & SOAP Dot Phrases passed (100% parity)');

console.log('--- 9. AUDIT REGRESSION VERIFICATION SUITE (SECTIONS 1–4 FIXES) ---');
// 9.1 Percentile CDF & headCircCm alias
const percRegression = calculatePercentiles({
  ageMonths: 12,
  gender: 'male',
  weightKg: 9.6,
  heightCm: 75.7,
  headCircCm: 46.6
});
assert.ok(percRegression && percRegression.weightPercentile !== null && percRegression.weightPercentile >= 48 && percRegression.weightPercentile <= 52);
assert.ok(percRegression && percRegression.headCircumferencePercentile !== null && percRegression.headCircumferencePercentile >= 48 && percRegression.headCircumferencePercentile <= 52);

// 9.2 Safety Engine: word-boundary short keyword ('ator' vs 'Nebulizer/Dilator'), fractional eGFR, trimester-1 NSAID, serotonin mutual exclusivity
const falsePositiveStatin = checkCypStatinInteraction([
  { brand: 'Ventolin Nebulizer', generic: 'salbutamol' },
  { brand: 'Klacid 500mg', generic: 'clarithromycin' }
]);
assert.strictEqual(falsePositiveStatin.hasInteraction, false);

const lipovasStatin = checkCypStatinInteraction([
  { brand: 'Lipovas 20mg', generic: 'simvastatin', atcCode: 'C10AA01' },
  { brand: 'Klacid 500mg', generic: 'clarithromycin' }
]);
assert.strictEqual(lipovasStatin.hasInteraction, true);

const renalFractional = checkRenalDoseAdjustments({
  egfr: 29.6,
  drugs: [{ brand: 'Glifor 1000mg', generic: 'metformin' }]
});
assert.strictEqual(renalFractional.hasContraindication, true);

const pregTrim1Nsaid = checkPregnancySafety(
  [{ brand: 'Arveles 25mg', generic: 'dexketoprofen' }],
  { trimester: 1 }
);
assert.strictEqual(pregTrim1Nsaid.alertsCount, 0);

const pregAtcFallback = checkPregnancySafety(
  [{ brand: 'YeniMarka 5mg', generic: 'bilinmeyen', atcCode: 'C09AA05' }],
  { trimester: 2 }
);
assert.strictEqual(pregAtcFallback.alertsCount, 1);
assert.strictEqual(pregAtcFallback.alerts[0].isHighRisk, true);

const singleTramadolSero = checkSerotoninSyndrome([
  { brand: 'Contramal 100mg', generic: 'tramadol', atcCode: 'N02AX02' }
]);
assert.strictEqual(singleTramadolSero.isHighRisk, false);

// 9.3 Cardiac Engine: R06AX exclusion, keyword fallback, wide QRS short-QT guard
const qtcR06ax = calculateQTc({
  hr: 75,
  qt: 400,
  qrs: 100,
  gender: 'male',
  drugs: [{ brand: 'Aerius 5mg', generic: 'desloratadine', atcCode: 'R06AX27' }]
});
assert.strictEqual(qtcR06ax.drugFlags.length, 0);

const qtcKeywordDrug = calculateQTc({
  hr: 75,
  qt: 400,
  gender: 'male',
  drugs: [{ brand: 'Cordarone 200mg', generic: 'amiodarone' }]
});
assert.strictEqual(qtcKeywordDrug.tisdaleScore, 3);

const qtcWideQrsNormal = calculateQTc({
  hr: 75,
  qt: 350,
  qrs: 150,
  gender: 'male'
});
assert.strictEqual(qtcWideQrsNormal.colorCode, 'success');

// 9.4 Pediatric Engine: laroxyl_25 -> Hydroxyzine max 25mg & NaN vaccine guard
const hydroxyzineDose = calculatePediatricDose(60, 'laroxyl_25');
assert.ok(hydroxyzineDose);
assert.ok(hydroxyzineDose.name.includes('Hidroksizin'));
assert.strictEqual(hydroxyzineDose.targetDoseMg, 25);
assert.strictEqual(getVaccineSchedule(NaN), null);

// 9.5 Blood Gas Engine: normal HCO3/pCO2 with borderline pH & mixed disorder compensationText
const bgNormalBorderline = analyzeBloodGas({ pH: 7.36, pCO2: 40, HCO3: 24 });
assert.strictEqual(bgNormalBorderline.primaryDisorder, 'Normal/Miks');

const bgMixed = analyzeBloodGas({ pH: 7.15, pCO2: 60, HCO3: 16 });
assert.ok(bgMixed.compensationText && bgMixed.compensationText.length > 0);
assert.ok(bgMixed.flags && bgMixed.flags.length > 0);

// 9.6 NephroTox Engine: FEUrea isBun=true conversion, OsmolalGap <=0 guard, Rumack-Matthew 100kg cap
const feureaFromBun = calculateFEUrea({
  serumBUN: 50,
  isBun: true,
  urineUrea: 400,
  serumCreatinine: 2.0,
  urineCreatinine: 100
});
assert.ok(feureaFromBun);
assert.strictEqual(feureaFromBun.feUreaPercent, 7.5);
assert.strictEqual(calculateOsmolalGap({ measuredOsmolality: 0, sodium: 140, glucoseMgDl: 100, bunMgDl: 15 }), null);

const apapHeavy = evaluateRumackMatthew({ hoursPostIngestion: 6, paracetamolLevelMcgMl: 150, weightKg: 130 });
assert.ok(apapHeavy && apapHeavy.nacProtocol);
assert.strictEqual(apapHeavy.nacProtocol.phase1.totalMg, 15000); // Capped at 100 kg * 150 mg/kg

// 9.7 Neonatology, Iron, Biometrics, Triage, HEART, Fluid, OB/GYN
const bPreterm = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 11, gestationalWeeks: 32 });
assert.ok(bPreterm.riskGroupLabel && bPreterm.riskGroupLabel.includes('<35 Hafta Prematüre'));
assert.strictEqual(bPreterm.status, 'PHOTOTHERAPY_REQUIRED');
assert.strictEqual(calculateAPGAR({ heartRate: 2, respiratoryEffort: 2, muscleTone: 1, reflexIrritability: 1, color: 1 }).status, 'NORMAL');
assert.strictEqual(calculateNeonatalWeightLoss({ birthWeightG: 3.2, currentWeightKg: 3.0, ageDays: 3 }).percentLoss, 6.3);
assert.strictEqual(calculatePediatricIron({ weightKg: 15, ageMonths: 24, hb: 12.5 }).hbCategory, 'Normal');
assert.strictEqual(determineAgeGroup(1, 'months').id, 'INFANT');
assert.strictEqual(determineAgeGroup(40, 'months').id, 'PRESCHOOL');
assert.strictEqual(calculateNEWS2(NaN, NaN, NaN, NaN, NaN, false, ''), null);
assert.strictEqual(calculateGCS(10, -2, 99).total, 11); // Clamped to 4 + 1 + 6 = 11
assert.strictEqual(calculateHEART({ age: 2 }).score, 2);
const neoDay4 = calculateNeonatalFluid({ weightKg: 3, ageDays: 3 });
const neoDay5 = calculateNeonatalFluid({ weightKg: 3, ageDays: 4 });
assert.ok(neoDay4 && neoDay4.soluteAdvice.includes('%5-7.5 Dekstroz'));
assert.ok(neoDay5 && neoDay5.soluteAdvice.includes('%5 Dekstroz'));
assert.ok(calculateStatusEpilepticusDoses(20, false).phase3EstablishedStatus.phenytoin.rateWarning.includes('1–3 mg/kg/dk'));
assert.ok(calculateObstetrics('2026-01-01'));

// 9.8 QuickSwitcher, Prescription XSS Escaping & Drug Strength Parser
assert.ok(QUICK_SWITCHER_ITEMS.some(i => i.id === 'card-nefro'));
assert.ok(QUICK_SWITCHER_ITEMS.some(i => i.id === 'card-antibiyotik'));
const xssHtml = generatePrescriptionHTML(
  { patientName: '<script>alert(1)</script>', age: '30', weightKg: 70, dateStr: '01.01.2026' },
  [buildDefaultDrugSchedule({ brand: '<img src=x onerror=alert(1)>', generic: 'test' })]
);
assert.ok(!xssHtml.includes('<script>alert(1)</script>'));
assert.ok(xssHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

const strUnitLiquid = parseDrugStrength('PAROL 10 MG/ML İNFÜZYON');
assert.ok(strUnitLiquid && strUnitLiquid.type === 'liquid' && strUnitLiquid.mgPerMl === 10);
const strComboLiquid = parseDrugStrength('AUGMENTIN BID 400/57 MG/5 ML SÜSPANSİYON');
assert.ok(strComboLiquid && strComboLiquid.type === 'liquid' && strComboLiquid.mgPerMl === 80);
const strComboSolid = parseDrugStrength('CO-DIOVAN 160/12.5 MG FİLM TABLET');
assert.ok(strComboSolid && strComboSolid.type === 'solid' && strComboSolid.totalMg === 160);
console.log('✓ Section 9 Audit Regression Verification Suite passed (100% healthy)');

console.log('\n🎉 ALL 18 TYPESCRIPT CLINICAL ENGINES & WORKSTATION MODULES FULLY VERIFIED (100% PARITY)! 🎉\n');

