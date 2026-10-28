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
  calculateDetailedEGFR,
  calculateBSA,
  calculatePercentiles,
  calculateTargetHeight,
  calculateCorrectedAge,
  calculateLMSZScore,
  calculateRestrictedLMSZScore,
  calculateStandardLMSZScore,
  calculateValueFromLMS,
  adjustHeightForPosition,
  calculateGrowthVelocity,
  calculateCranialScreening,
  getCentileChannel,
  CENTILE_CHANNELS,
  WHO_2022_DATA,
  zToExactPercentile,
  formatPercentileDisplay,
  evaluateMalnutrition,
  standardNormalCDF,
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
  calculateIdealBodyWeight,
  getVaccineSchedule,
  getComprehensiveVaccineSchedule,
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
import { appState } from '../src/state';
import {
  formatTimeMMSS,
  startAnaphylaxisCountdown,
  getAnaphylaxisTimerState,
  resetAnaphylaxisTimer,
  computeStatusPhase,
  getCurrentAnaphylaxisDoses,
  getCurrentStatusDoses,
  getWeightAndIsAdult,
  setEmergencyWeightMode,
  resetEmergencyWeightMode
} from '../src/utils/emergencyManager';
import fs from 'fs';
import {
  findMonographSync,
  setMonographsCache,
  evaluateTrimesterRiskLevel,
  getMeasuringDeviceBadge,
  renderMonographCardHTML,
  ClinicalMonograph
} from '../src/monographEngine';
import {
  OFFLINE_RXNORM_CONCEPTS,
  normalizeRxText,
  isRxNavApiDeprecated,
  getOfflineOntologyStats,
  getRxNormConceptByCui,
  getRxNormConceptByAtc,
  getRxNormConceptByKey,
  resolveToRxNormConcept,
  resolveBatchRxNormConcepts
} from '../src/engines/rxNormMappingEngine';
import { getDrugRxNormBadge } from '../src/drugEngine';
import {
  evaluatePrescriptionInteractions,
  isAcornVptRegimen
} from '../src/engines/interactionTierEngine';
import {
  calculateMostellerBSA,
  calculateDuboisBSA,
  deindexEgfrToAbsolute,
  indexEgfrFromAbsolute,
  calculateDevineIBW,
  calculateAdjustedBodyWeight,
  analyzeBodyWeightHabitus,
  calculateCockcroftGaultCrCl,
  identifyRenalDrugCategory,
  evaluateComprehensiveRenalFunction,
  evaluateApixabanDosing
} from '../src/engines/renalDoseEngine';
import {
  AAP2022_HOURLY_MILESTONES,
  AAP2022_PT_NO_RISK_EXACT,
  AAP2022_PT_WITH_RISK_EXACT,
  AAP2022_EX_NO_RISK_EXACT,
  AAP2022_EX_WITH_RISK_EXACT,
  truncateGestationalWeeks,
  interpolateHourlyCurve,
  calculateAap2022Thresholds,
  getAap2022FollowUpRecommendation,
  evaluateBilirubinAlbuminRatio,
  getPretermGuidance,
  calculateBilirubinRateOfRise,
  evaluateAbeSymptoms,
  generateAap2022EscalationProtocol,
  evaluateAap2022Jaundice,
  MAISELS_2012_PRETERM_BANDS,
  calculatePretermTndNiceThreshold,
  evaluatePretermJaundice,
  evaluateAap2022DischargeMatrix,
  evaluatePhototherapyReboundRisk,
  evaluateTcBValidity
} from '../src/engines/jaundiceEngine';


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

const katzNormal = calculateCorrectedSodium({ measuredSodium: 125, glucoseMgDl: 300 });
assert.ok(katzNormal);
assert.strictEqual(katzNormal.correctedSodium, 128.2);
assert.strictEqual(katzNormal.correctedSodiumKatz, 128.2);

const katz = calculateCorrectedSodium({ measuredSodium: 125, glucoseMgDl: 600 });
assert.ok(katz);
assert.strictEqual(katz.correctedSodiumKatz, 133);
assert.strictEqual(katz.correctedSodiumHillier, 137);
assert.strictEqual(katz.correctedSodium, 137); // Hillier used when glucose > 400 (HATA-M10-003)

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

console.log('--- 3. VERIFYING TYPESCRIPT NEONATOLOGY ENGINE (DUAL AAP 2022 & TND 2014) ---');
const bAapClose = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 16, gestationalWeeks: 39 });
assert.strictEqual(bAapClose.status, 'CLOSE_MONITORING');

const bTndPhoto = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 16, gestationalWeeks: 39, guideline: 'TND_2014' });
assert.strictEqual(bTndPhoto.status, 'PHOTOTHERAPY_REQUIRED');

const bPhoto = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 17.0, gestationalWeeks: 39 });
assert.strictEqual(bPhoto.status, 'PHOTOTHERAPY_REQUIRED');

const bEscalation = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 22.5, gestationalWeeks: 39 });
assert.strictEqual(bEscalation.status, 'ESCALATION_OF_CARE');

const bTndExchange = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 23, gestationalWeeks: 39, guideline: 'TND_2014' });
assert.strictEqual(bTndExchange.status, 'EXCHANGE_TRANSFUSION_REQUIRED');

const bExchange = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 24.5, gestationalWeeks: 39 });
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

// --- FAZ 1 DOĞRULAMA TESTLERİ (70 kg Varsayılanının Kaldırılması & Pediatrik Güvenlik Kalkanı) ---
// Senaryo 1: Kilo Boş + Yaş Boş (Sessiz 70 kg engellendi, formüle kilitlendi)
const lockedAnaph = calculateAnaphylaxisDoses(0, false);
assert.strictEqual(lockedAnaph.isLocked, true);
assert.strictEqual(lockedAnaph.isWeightMissing, true);
assert.strictEqual(lockedAnaph.adrenaline.doseMg, 0);
assert.strictEqual(lockedAnaph.adrenaline.volumeMl, 0);
assert.ok(lockedAnaph.adrenaline.instruction.includes('KİLO GİRİNİZ'));

const lockedStatus = calculateStatusEpilepticusDoses(0, false);
assert.strictEqual(lockedStatus.isLocked, true);
assert.strictEqual(lockedStatus.isWeightMissing, true);
assert.strictEqual(lockedStatus.phase2EarlyStatus.midazolam.doseMg, 0);
assert.ok(lockedStatus.phase2EarlyStatus.midazolam.instruction.includes('KİLO GİRİNİZ'));
assert.ok(lockedStatus.phase3EstablishedStatus.levetiracetam.instruction.includes('KİLO GİRİNİZ'));

// EmergencyManager Senaryo 1 Doğrulaması (Kilo Boş + Yaş Boş)
const origWeight = appState.biometry.weightKg;
const origAge = appState.biometry.ageYears;
try {
  appState.biometry.weightKg = null;
  appState.biometry.ageYears = null;
  resetEmergencyWeightMode();
  const ctxEmpty = getWeightAndIsAdult();
  assert.strictEqual(ctxEmpty.isWeightMissing, true);
  assert.strictEqual(ctxEmpty.weightKg, 0);
  assert.strictEqual(getCurrentAnaphylaxisDoses().isLocked, true);
  assert.strictEqual(getCurrentStatusDoses().isLocked, true);

  // Senaryo 2: Kilo Boş + Yaş Pediatrik (<18) (Pediatrik Güvenlik Kalkanı)
  appState.biometry.weightKg = null;
  appState.biometry.ageYears = 5;
  const ctxPedia = getWeightAndIsAdult();
  assert.strictEqual(ctxPedia.isAdult, false);
  assert.strictEqual(ctxPedia.isPediatricShieldActive, true);
  assert.strictEqual(getCurrentAnaphylaxisDoses().isLocked, true);

  // Kullanıcı/hekim "Varsayılan Erişkin (70 kg)" seçse bile Pediatrik Güvenlik Kalkanı 70 kg'a düşmeyi ENGELLER:
  setEmergencyWeightMode('estimated-adult');
  const ctxShielded = getWeightAndIsAdult();
  assert.strictEqual(ctxShielded.isAdult, false, 'Pediatrik hastada erişkin modu kesinlikle kilitlenmelidir');
  assert.strictEqual(ctxShielded.isPediatricShieldActive, true);
  assert.ok(ctxShielded.weightKg < 70, 'Pediatrik hastaya 70 kg erişkin dozu verilmemelidir');
  assert.strictEqual(ctxShielded.weightKg, 18); // (5 + 4) * 2 = 18 kg tahmini pediatrik kilo
  const dosesShielded = getCurrentStatusDoses();
  assert.ok(dosesShielded.phase2EarlyStatus.midazolam.doseMg < 10, 'Midazolam 10 mg erişkin dozuna çıkamaz');
  assert.ok(dosesShielded.phase3EstablishedStatus.levetiracetam.doseMg < 4200, 'Keppra 4200 mg erişkin dozuna çıkamaz');
  assert.strictEqual(dosesShielded.phase3EstablishedStatus.levetiracetam.doseMg, 1080); // 18 * 60 = 1080 mg

  // Senaryo 3: Kilo Girilmiş Durum (Normal Hesaplama)
  appState.biometry.weightKg = 25;
  appState.biometry.ageYears = 7;
  resetEmergencyWeightMode();
  const ctxEntered = getWeightAndIsAdult();
  assert.strictEqual(ctxEntered.isWeightMissing, false);
  assert.strictEqual(ctxEntered.isEstimated, false);
  assert.strictEqual(ctxEntered.weightKg, 25);
  assert.strictEqual(ctxEntered.isAdult, false);
  const enteredAnaph = getCurrentAnaphylaxisDoses();
  assert.strictEqual(enteredAnaph.isLocked, false);
  assert.strictEqual(enteredAnaph.adrenaline.doseMg, 0.25);
  const enteredStatus = getCurrentStatusDoses();
  assert.strictEqual(enteredStatus.isLocked, false);
  assert.strictEqual(enteredStatus.phase2EarlyStatus.midazolam.doseMg, 5.0);
  assert.strictEqual(enteredStatus.phase3EstablishedStatus.levetiracetam.doseMg, 1500);
} finally {
  appState.biometry.weightKg = origWeight;
  appState.biometry.ageYears = origAge;
  resetEmergencyWeightMode();
}

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

// 9.4B Kapsamlı Aşı Takvimi, Rotavirüs Zaman Pencereleri ve Meningokok Kuralları
// 1. 2 aylık bebek: Rutin takvim + Rotavirüs 1. doz + MenB + MenACWY
const vax2m = getComprehensiveVaccineSchedule(2);
assert.ok(vax2m);
assert.strictEqual(vax2m.rotavirusRule?.eligible, true);
assert.strictEqual(vax2m.rotavirusRule?.windowStatus, 'OPTIMAL_FIRST_DOSE');
assert.ok(vax2m.specialVaccines.some(v => v.includes('Rotavirüs')));
assert.ok(vax2m.specialVaccines.some(v => v.includes('MenB')));
assert.strictEqual(vax2m.meningococcalSchedule?.eligible, true);

// 2. 5 aylık bebek (21.7 hafta): Rotavirüs 1. dozu almamışsa 15. haftadan sonra ilk doz BAŞLANAMAZ uyarısı
const vax5m = getComprehensiveVaccineSchedule(5);
assert.ok(vax5m);
assert.strictEqual(vax5m.rotavirusRule?.windowStatus, 'OPTIMAL_SUBSEQUENT_DOSE');
assert.ok(vax5m.rotavirusRule?.warning && vax5m.rotavirusRule.warning.includes('İNVAJİNASYON'));

// 3. 9 aylık bebek (>32 hafta / 8 ay): Rotavirüs süresi dolmuştur, uygulanamaz
const vax9m = getComprehensiveVaccineSchedule(9);
assert.ok(vax9m);
assert.strictEqual(vax9m.rotavirusRule?.eligible, false);
assert.strictEqual(vax9m.rotavirusRule?.windowStatus, 'EXPIRED_CONTRAINDICATED');

// 4. Gecikmiş aşı yakalama kuralları (Catch-up)
assert.ok(vax2m.catchUpRules && vax2m.catchUpRules.length >= 5);
assert.ok(vax2m.catchUpRules.some(r => r.includes('ASLA baştan başlanmaz')));
assert.ok(vax2m.catchUpRules.some(r => r.includes('minimum 4 hafta')));

// 5. getVaccineSchedule with includeSpecial flag
const vaxWithSpecial = getVaccineSchedule(2, { includeSpecial: true });
assert.ok(vaxWithSpecial && vaxWithSpecial.some(v => v.includes('Rotavirüs')));
assert.ok(vaxWithSpecial && vaxWithSpecial.some(v => v.includes('MenB')));

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

console.log('--- 10. CLINICAL AUDIT v2.0 UPGRADES (KDIGO 2024, AAP 2022, TPHD MENTZER, ATLS-10, TIMERS) ---');
// 10.1 KDIGO 2024 Combined Creatinine + Cystatin C & BSA De-indexing
const egfrCombined = calculateDetailedEGFR(1.2, 60, 'male', 180, { cystatinC: 1.1, bsa: 2.20 });
assert.ok(egfrCombined);
assert.strictEqual(egfrCombined.shortBadge, 'CKD-EPI Cr+Cys');
assert.ok(egfrCombined.egfrAbsolute !== null && egfrCombined.egfrAbsolute > egfrCombined.egfrIndexed);
assert.ok(egfrCombined.dosingNote && egfrCombined.dosingNote.includes('KDIGO 2024'));

const egfrCysOnly = calculateDetailedEGFR(null, 65, 'female', 162, { cystatinC: 1.0 });
assert.ok(egfrCysOnly && egfrCysOnly.shortBadge === 'CKD-EPI CysC');

const egfrJaffeAdolMale = calculateDetailedEGFR(0.8, 15, 'male', 170, { assay: 'jaffe' });
assert.ok(egfrJaffeAdolMale && egfrJaffeAdolMale.kConstantUsed === 0.70);

// 10.2 AAP 2022 TcB Confirmation Rule & 336h (14-Day) Support
const bTcbConfirm = calculateBhutaniJaundice({
  ageHours: 60,
  totalBilirubin: 15.8,
  gestationalWeeks: 38,
  measurementType: 'TcB'
});
assert.strictEqual(bTcbConfirm.requiresTsbConfirmation, true);
assert.ok(bTcbConfirm.followUpRecommendation && bTcbConfirm.followUpRecommendation.length > 0);

const bDay10 = calculateBhutaniJaundice({ ageHours: 240, totalBilirubin: 18.0, gestationalWeeks: 39 });
assert.strictEqual(bDay10.isValid, true);
assert.strictEqual(bDay10.guidelineUsed, 'AAP_2022');

// 10.3 TPHD Pediatric Iron & Mentzer Beta-Thalassemia Trait Shield
const ironEarlyInfant = calculatePediatricIron({ ageMonths: 4.5, weightKg: 6.8, hb: 9.8 });
assert.ok(ironEarlyInfant.guidelineSource.includes('TPHD'));
assert.ok(!ironEarlyInfant.guidelineSource.includes('TDB'));
assert.strictEqual(ironEarlyInfant.hbCategory, 'Normal'); // 3-6m term cutoff is 9.5 g/dL

const ironThalassemiaShield = calculatePediatricIron({
  ageMonths: 36,
  weightKg: 14,
  hb: 10.2,
  mcv: 60,
  rbc: 5.5,
  rdw: 13.2,
  ferritin: 35
});
assert.ok(ironThalassemiaShield.differential);
assert.strictEqual(ironThalassemiaShield.differential.mentzerIndex, 10.9);
assert.strictEqual(ironThalassemiaShield.differential.thalassemiaRisk, 'HIGH');
assert.strictEqual(ironThalassemiaShield.treatment.eligible, false, 'Normal ferritin + Mentzer < 13 must block empirical iron overload');

const ironCombinedIdaThal = calculatePediatricIron({
  ageMonths: 36,
  weightKg: 14,
  hb: 9.6,
  mcv: 58,
  rbc: 5.2,
  rdw: 17.5,
  ferritin: 6
});
assert.ok(ironCombinedIdaThal.differential);
assert.strictEqual(ironCombinedIdaThal.differential.thalassemiaRisk, 'POSSIBLE');
assert.strictEqual(ironCombinedIdaThal.treatment.eligible, true);

// 10.4 ATLS-10 Electrical Burn, Infant <30kg Dextrose Maintenance & Ranson Score
const elecBurn = calculateParkland(80, 15, 35, { burnType: 'electrical' });
assert.ok(elecBurn);
assert.strictEqual(elecBurn.multiplierUsed, 4);
assert.strictEqual(elecBurn.totalVolume, 4800);

const infantBurn = calculateParkland(8.5, 15, null, { ageMonths: 8 });
assert.ok(infantBurn);
assert.strictEqual(infantBurn.isPediatric, true);
assert.strictEqual(infantBurn.multiplierUsed, 3);
assert.strictEqual(infantBurn.requiresDextroseMaintenance, true);
assert.strictEqual(infantBurn.maintenanceHourlyMl, 34); // 8.5 kg * 4 mL/kg/hr

const ransonSevere = calculateRanson({ ageO55: true, wbcO16: true, gluO200: true, caU8: true, pO2U60: true });
assert.ok(ransonSevere);
assert.strictEqual(ransonSevere.admissionScore, 3);
assert.strictEqual(ransonSevere.hour48Score, 2);
assert.strictEqual(ransonSevere.score, 5);
assert.strictEqual(ransonSevere.severity, 'Ağır');
assert.strictEqual(ransonSevere.mortalityPercent, 40);

// 10.5 Zero-Drift Wall-Clock Emergency Timers & AES Phases
startAnaphylaxisCountdown();
const anaphRunning = getAnaphylaxisTimerState();
assert.strictEqual(anaphRunning.isRunning, true);
assert.strictEqual(anaphRunning.dosesGiven, 1);
assert.ok(anaphRunning.targetEndTimestampMs !== null && anaphRunning.targetEndTimestampMs > Date.now() - 1000);
resetAnaphylaxisTimer();
assert.strictEqual(getAnaphylaxisTimerState().isRunning, false);
assert.strictEqual(getAnaphylaxisTimerState().dosesGiven, 0);

assert.strictEqual(computeStatusPhase(0), 1);
assert.strictEqual(computeStatusPhase(300), 2);
assert.strictEqual(computeStatusPhase(1200), 3);
assert.strictEqual(computeStatusPhase(2400), 4);
console.log('✓ Section 10 Clinical Audit v2.0 Upgrades passed (100% healthy)');

console.log('--- 11. COLE & GREEN RESTRICTED LMS ENGINE & DATA INTEGRITY (ADIM 1) ---');
// 11.1 Abramowitz & Stegun Yüksek Hassasiyetli Normal CDF ve Exact Percentile
assert.strictEqual(standardNormalCDF(0), 0.5);
assert.strictEqual(zToExactPercentile(0, 2), 50.0);
assert.strictEqual(zToExactPercentile(2.0, 2), 97.72);
assert.strictEqual(zToExactPercentile(-2.0, 2), 2.28);
assert.strictEqual(zToExactPercentile(3.0, 2), 99.87);
assert.strictEqual(zToExactPercentile(-3.0, 2), 0.13);
assert.strictEqual(zToExactPercentile(1.88, 1), 97.0);
assert.strictEqual(zToExactPercentile(-1.88, 1), 3.0);
console.log('✓ Abramowitz & Stegun Eq. 26.2.19 Gaussian CDF & Exact Percentiles verified');

// 11.2 Standard vs Restricted LMS |Z| <= 3 Özdeşliği
const testL = -0.34;
const testM = 69.2;
const testS = 0.146;
const rawZWithin = calculateStandardLMSZScore(75, testL, testM, testS);
const restrictedZWithin = calculateRestrictedLMSZScore(75, testL, testM, testS);
assert.ok(rawZWithin !== null && restrictedZWithin !== null);
assert.strictEqual(Number(rawZWithin.toFixed(4)), Number(restrictedZWithin.toFixed(4)));

// 11.3 Restricted LMS: Z > +3 SD Doğrusal Ekstrapolasyon (Sağa Çarpık Dağılım Koruması)
const sd2Pos = calculateValueFromLMS(2, testL, testM, testS, false);
const sd3Pos = calculateValueFromLMS(3, testL, testM, testS, false);
assert.ok(sd2Pos !== null && sd3Pos !== null);
const sd23Pos = sd3Pos - sd2Pos;

// SD3 noktasındaki değer Z = 3.0 vermelidir
const zAtSd3 = calculateRestrictedLMSZScore(sd3Pos, testL, testM, testS);
assert.ok(zAtSd3 !== null && Math.abs(zAtSd3 - 3.0) < 0.001);

// SD3 + SD23 noktasındaki aşırı uç değer doğrusal olarak Z = 4.0 vermelidir
const zAtPlus4 = calculateRestrictedLMSZScore(sd3Pos + sd23Pos, testL, testM, testS);
assert.ok(zAtPlus4 !== null && Math.abs(zAtPlus4 - 4.0) < 0.001);

// Standart LMS'te ise negatif L nedeniyle yapay sıkışma oluşur (Z_raw < 4.0)
const zRawAtPlus4 = calculateStandardLMSZScore(sd3Pos + sd23Pos, testL, testM, testS);
assert.ok(zRawAtPlus4 !== null && zRawAtPlus4 < 4.0);

// 11.4 Restricted LMS: Z < -3 SD Doğrusal Ekstrapolasyon
const sd2Neg = calculateValueFromLMS(-2, testL, testM, testS, false);
const sd3Neg = calculateValueFromLMS(-3, testL, testM, testS, false);
assert.ok(sd2Neg !== null && sd3Neg !== null);
const sd23Neg = sd2Neg - sd3Neg;

const zAtSd3Neg = calculateRestrictedLMSZScore(sd3Neg, testL, testM, testS);
assert.ok(zAtSd3Neg !== null && Math.abs(zAtSd3Neg - (-3.0)) < 0.001);

const zAtMinus4 = calculateRestrictedLMSZScore(sd3Neg - sd23Neg, testL, testM, testS);
assert.ok(zAtMinus4 !== null && Math.abs(zAtMinus4 - (-4.0)) < 0.001);

// 11.5 Ters Dönüşüm Tutarlılığı (Forward & Backward Inversion)
const testExtrapolatedWeight = calculateValueFromLMS(4.5, testL, testM, testS, true);
assert.ok(testExtrapolatedWeight !== null);
const roundTripZ = calculateLMSZScore(testExtrapolatedWeight, testL, testM, testS, { restricted: true });
assert.ok(roundTripZ !== null && Math.abs(roundTripZ - 4.5) < 0.001);
console.log('✓ WHO Restricted LMS Linear Extrapolation (±3 SD) & Inverse Function verified');

// 11.6 Neyzi 2015 17-18 Yaş Veri Bütünlüğü ve Target Height Kontrolü
const boy18y = calculatePercentiles({
  ageMonths: 216,
  gender: 'male',
  heightCm: 176.2,
  weightKg: 71.8
});
assert.ok(boy18y !== null);
assert.strictEqual(boy18y.heightZ, 0.0);
assert.strictEqual(boy18y.heightPercentile, 50);
assert.strictEqual(boy18y.weightZ, 0.0);
assert.strictEqual(boy18y.weightPercentile, 50);

const girl18y = calculatePercentiles({
  ageMonths: 216,
  gender: 'female',
  heightCm: 163.1,
  weightKg: 58.1
});
assert.ok(girl18y !== null);
assert.strictEqual(girl18y.heightZ, 0.0);
assert.strictEqual(girl18y.heightPercentile, 50);
assert.strictEqual(girl18y.weightZ, 0.0);
assert.strictEqual(girl18y.weightPercentile, 50);

// Mid-parental Target Height doğrulaması (176.2 cm yetişkin erkek medyanı ile)
const targetHeightBoy = calculateTargetHeight({
  fatherHeightCm: 180,
  motherHeightCm: 165,
  childGender: 'male'
});
assert.ok(targetHeightBoy !== null);
assert.strictEqual(targetHeightBoy.targetHeightCm, 179.0); // (180 + 165 + 13) / 2 = 179.0
assert.ok(targetHeightBoy.targetZ !== null && targetHeightBoy.targetZ > 0);
console.log('✓ Neyzi 2015 18y Data Integrity & Updated Target Height verified');

console.log('--- 12. POSITIONAL TRANSITION & DUAL STANDARDS (NEYZI 2015 vs WHO 2022) (ADIM 2) ---');
// 12.1 Pozisyonel Geçiş Kırılması (24-36 Ay Arası Stadiometre vs İnfantometre)
// 30 aylık çocuk ayakta (standing) ölçüldü:
// Neyzi'de 36 aya kadar yatarak baz alındığından +0.7 cm omurga kompresyonu telafisi uygulanmalıdır
const posNeyzi30m = adjustHeightForPosition(91.2, 30, 'standing', 'neyzi_2015');
assert.strictEqual(posNeyzi30m.wasAdjusted, true);
assert.strictEqual(posNeyzi30m.adjustmentCm, 0.7);
assert.strictEqual(posNeyzi30m.adjustedHeightCm, 91.9);
assert.ok(posNeyzi30m.note !== null && posNeyzi30m.note.includes('Neyzi'));

// Aynı 30 aylık çocuk DSÖ'ye göre değerlendirildiğinde:
// DSÖ 24 aydan sonra zaten ayakta ölçüm bekler; düzeltme yapılmaz (adjustment = 0)
const posWho30m = adjustHeightForPosition(91.9, 30, 'standing', 'who_2022');
assert.strictEqual(posWho30m.wasAdjusted, false);
assert.strictEqual(posWho30m.adjustmentCm, 0);
assert.strictEqual(posWho30m.adjustedHeightCm, 91.9);

// 18 aylık infant ayakta ölçüldüğünde DSÖ kuralı gereği +0.7 cm eklenmelidir
const posWho18m = adjustHeightForPosition(81.6, 18, 'standing', 'who_2022');
assert.strictEqual(posWho18m.wasAdjusted, true);
assert.strictEqual(posWho18m.adjustedHeightCm, 82.3);

// 48 aylık çocuk yatarak ölçüldüğünde -0.7 cm çıkarılmalıdır
const posNeyzi48m = adjustHeightForPosition(104.0, 48, 'recumbent', 'neyzi_2015');
assert.strictEqual(posNeyzi48m.wasAdjusted, true);
assert.strictEqual(posNeyzi48m.adjustedHeightCm, 103.3);

// Otomatik modda protokol içi ölçüm varsayılır (0 cm düzeltme)
const posAuto = adjustHeightForPosition(87.1, 24, 'auto', 'who_2022');
assert.strictEqual(posAuto.wasAdjusted, false);
assert.strictEqual(posAuto.positionUsed, 'standing');
console.log('✓ Positional transition break (24-36m recumbent vs standing) verified');

// 12.2 DSÖ 2022 Büyüme Standartları Motoru
const whoBoy12m = calculatePercentiles({
  ageMonths: 12,
  gender: 'male',
  heightCm: 75.7,
  weightKg: 9.6,
  standard: 'who_2022'
});
assert.ok(whoBoy12m !== null);
assert.strictEqual(whoBoy12m.standardUsed, 'who_2022');
assert.strictEqual(whoBoy12m.heightZ, 0.0);
assert.strictEqual(whoBoy12m.heightPercentile, 50);
assert.strictEqual(whoBoy12m.weightZ, 0.0);
assert.strictEqual(whoBoy12m.weightPercentile, 50);

const whoBoy24m = calculatePercentiles({
  ageMonths: 24,
  gender: 'male',
  heightCm: 87.1,
  weightKg: 12.2,
  standard: 'who_2022'
});
assert.ok(whoBoy24m !== null);
assert.strictEqual(whoBoy24m.heightZ, 0.0);
assert.strictEqual(whoBoy24m.heightPercentile, 50);
assert.strictEqual(whoBoy24m.weightZ, 0.0);
assert.strictEqual(whoBoy24m.weightPercentile, 50);
console.log('✓ WHO 2022 Child Growth Standards (MGRS 0-5y) verified');

// 12.3 Çift Referans Karşılaştırması ve Klinik Uyumsuzluk Tespiti (Bundak, Neyzi 2022)
// Sınırda boy kısalığı senaryosu: Çocuk DSÖ'ye göre Z < -2.0 SD (Bodurluk) iken Neyzi'ye göre normal persentil bandında
const borderlineShortBoy = calculatePercentiles({
  ageMonths: 18,
  gender: 'male',
  heightCm: 75.6, // Neyzi M=82.3, S=0.038 => Z ~ -2.14; DSÖ M=82.3, S=0.037 => Z ~ -2.2
  weightKg: 10.9,
  standard: 'neyzi_2015'
});
assert.ok(borderlineShortBoy !== null);
assert.ok(borderlineShortBoy.comparisonWithAlternative !== null);
assert.strictEqual(borderlineShortBoy.comparisonWithAlternative?.alternativeStandard, 'who_2022');
assert.ok(borderlineShortBoy.comparisonWithAlternative?.alternativeHeightZ !== null);
console.log('✓ Dual reference comparison & discordance engine verified');

console.log('--- 13. VERIFYING GROWTH VELOCITY, CENTILE CHANNELS & ACUTE MALNUTRITION (ADIM 3) ---');
// 13.1 Persentil Kanalları (NICE / WHO 10-Kanal Yapısı)
assert.strictEqual(CENTILE_CHANNELS.length, 10);
assert.strictEqual(getCentileChannel(0.2).channelIndex, 1);
assert.strictEqual(getCentileChannel(1.5).channelIndex, 2);
assert.strictEqual(getCentileChannel(5).channelIndex, 3);
assert.strictEqual(getCentileChannel(15).channelIndex, 4);
assert.strictEqual(getCentileChannel(50).channelIndex, 6);
assert.strictEqual(getCentileChannel(95).channelIndex, 8);
assert.strictEqual(getCentileChannel(99.8).channelIndex, 10);
console.log('✓ Centile Channels (10-channel NICE/WHO structure) verified');

// 13.2 0-3 Ay Normal Büyüme Hızı (20-30 g/gün, 150-200 g/hafta)
const normalInfant2m = calculateGrowthVelocity({
  currentWeightKg: 4.62,
  previousWeightKg: 4.20,
  daysBetween: 14,
  ageMonths: 2
});
assert.strictEqual(normalInfant2m.isValid, true);
assert.strictEqual(normalInfant2m.gramsPerDay, 30.0);
assert.strictEqual(normalInfant2m.gramsPerWeek, 210.0);
assert.strictEqual(normalInfant2m.velocityStatus, 'ADEQUATE');
assert.strictEqual(normalInfant2m.malnutritionAssessment?.category, 'WELL_NOURISHED');

// 13.3 3-6 Ay Büyüme Duraklaması & Yetersiz Kilo Alımı (<15 g/gün)
const falteringInfant4m = calculateGrowthVelocity({
  currentWeightKg: 5.60,
  previousWeightKg: 5.50,
  daysBetween: 20,
  ageMonths: 4
});
assert.strictEqual(falteringInfant4m.isValid, true);
assert.strictEqual(falteringInfant4m.gramsPerDay, 5.0);
assert.strictEqual(falteringInfant4m.velocityStatus, 'INADEQUATE');
assert.strictEqual(falteringInfant4m.malnutritionAssessment?.category, 'AT_RISK_INFANT');
assert.ok(falteringInfant4m.malnutritionAssessment?.treatmentProtocol.dietRecommendation.includes('Anne sütü'));
console.log('✓ Growth velocity calculation & age-specific expected ranges verified');

// 13.4 Persentil Kanal Düşüşü Analizi (Growth Faltering - NICE Kriterleri)
// Doğum persentili 75p (Kanal 7) iken 5p (Kanal 3)'e gerileme -> 4 kanal düşüş (≥2 kanal düşüş patolojiktir)
const dropInfant = calculateGrowthVelocity({
  currentWeightKg: 5.8,
  previousWeightKg: 5.7,
  daysBetween: 30,
  ageMonths: 5,
  birthPercentile: 75,
  currentPercentile: 5
});
assert.strictEqual(dropInfant.centileDropAnalysis?.channelsDropped, 4);
assert.strictEqual(dropInfant.centileDropAnalysis?.isPathologicalFaltering, true);
assert.ok(dropInfant.centileDropAnalysis?.falteringReason?.includes('≥2 persentil kanalı düşüş'));

// Doğum persentili <9p (Kanal 3) iken 1 kanal düşüş patolojiktir
const lowBirthDrop = calculateGrowthVelocity({
  currentWeightKg: 4.0,
  previousWeightKg: 3.9,
  daysBetween: 20,
  ageMonths: 2,
  birthPercentile: 6, // Kanal 3
  currentPercentile: 1 // Kanal 2
});
assert.strictEqual(lowBirthDrop.centileDropAnalysis?.isPathologicalFaltering, true);
assert.ok(lowBirthDrop.centileDropAnalysis?.falteringReason?.includes('≥1 persentil kanalı düşüş'));
console.log('✓ Centile channel drop faltering analysis (NICE/WHO) verified');

// 13.5 Akut Malnütrisyon Taraması (DSÖ 2022/2023 Güncel Standartları)
// Senaryo A: 4 aylık bebek, MUAC < 110 mm -> DSÖ 2023 kriterine göre doğrudan SAM & RUTF KONTRENDİKASYONU
const samInfantUnder6m = calculateGrowthVelocity({
  currentWeightKg: 4.1,
  previousWeightKg: 4.0,
  daysBetween: 15,
  ageMonths: 4,
  muacMm: 105
});
assert.strictEqual(samInfantUnder6m.malnutritionAssessment?.category, 'SAM');
assert.strictEqual(samInfantUnder6m.malnutritionAssessment?.treatmentProtocol.setting, 'INPATIENT');
assert.ok(samInfantUnder6m.malnutritionAssessment?.treatmentProtocol.contraindications.some(c => c.includes('KONTRENDİKEDİR')));

// Senaryo B: 18 aylık çocuk, MUAC 112 mm (<115 mm) -> SAM, 150-185 kcal/kg/gün RUTF ayaktan tedavi
const samChildOver6m = calculateGrowthVelocity({
  currentWeightKg: 8.5,
  previousWeightKg: 8.4,
  daysBetween: 14,
  ageMonths: 18,
  muacMm: 112
});
assert.strictEqual(samChildOver6m.malnutritionAssessment?.category, 'SAM');
assert.strictEqual(samChildOver6m.malnutritionAssessment?.treatmentProtocol.setting, 'OUTPATIENT');
assert.ok(samChildOver6m.malnutritionAssessment?.treatmentProtocol.caloricTargetKcalKgDay.includes('150-185'));

// Senaryo C: Besinsel Bilateral Gode Bırakan Ödem (Kwashiorkor) -> Antropometriden bağımsız SAM
const kwashiorkorChild = calculateGrowthVelocity({
  currentWeightKg: 10.0,
  previousWeightKg: 9.8,
  daysBetween: 10,
  ageMonths: 24,
  hasBilateralEdema: true
});
assert.strictEqual(kwashiorkorChild.malnutritionAssessment?.category, 'SAM');
assert.strictEqual(kwashiorkorChild.malnutritionAssessment?.treatmentProtocol.setting, 'INPATIENT');

// Senaryo D: 10 aylık çocuk, MUAC 120 mm (115-124 mm) -> MAM, 100-130 kcal/kg/gün RUSF
const mamChild = calculateGrowthVelocity({
  currentWeightKg: 7.9,
  previousWeightKg: 7.8,
  daysBetween: 14,
  ageMonths: 10,
  muacMm: 120
});
assert.strictEqual(mamChild.malnutritionAssessment?.category, 'MAM');
assert.strictEqual(mamChild.malnutritionAssessment?.treatmentProtocol.setting, 'OUTPATIENT');
assert.ok(mamChild.malnutritionAssessment?.treatmentProtocol.caloricTargetKcalKgDay.includes('100-130'));
console.log('✓ WHO 2022/2023 Acute Malnutrition (SAM, MAM, infant dyad & RUTF locks) verified');

console.log('--- 14. VERIFYING CRANIAL HEAD CIRCUMFERENCE 0-18Y & HYDROCEPHALUS SCREENING (ADIM 4) ---');
// 14.1 0-18 Yaş (0-216 Ay) Baş Çevresi Uzatımı & 18 Yaş Medyan Doğrulaması (Kara 2016 / Neyzi 2015)
const hcBoy18y = calculatePercentiles({
  totalMonths: 216,
  gender: 'male',
  heightCm: 176.2,
  weightKg: 71.8,
  headCircumferenceCm: 57.7,
  standard: 'neyzi_2015'
});
assert.ok(hcBoy18y !== null);
assert.strictEqual(hcBoy18y.headCircZ, 0.0);
assert.strictEqual(hcBoy18y.headCircumferencePercentile, 50);

const hcGirl18y = calculatePercentiles({
  totalMonths: 216,
  gender: 'female',
  heightCm: 163.1,
  weightKg: 58.1,
  headCircumferenceCm: 56.1,
  standard: 'neyzi_2015'
});
assert.ok(hcGirl18y !== null);
assert.strictEqual(hcGirl18y.headCircZ, 0.0);
assert.strictEqual(hcGirl18y.headCircumferencePercentile, 50);

// 5 Yaşındaki (60 ay) çocukta baş çevresi hesaplama doğrulaması (>36 ay kilidinin kaldırılması)
const hcChild5y = calculatePercentiles({
  totalMonths: 60,
  gender: 'male',
  heightCm: 110.0,
  weightKg: 18.3,
  headCircumferenceCm: 51.6,
  standard: 'neyzi_2015'
});
assert.ok(hcChild5y !== null);
assert.strictEqual(hcChild5y.headCircZ, 0.0);
assert.strictEqual(hcChild5y.headCircumferencePercentile, 50);
console.log('✓ Head circumference 0-18 years (0-216m) normative extension verified');

// 14.2 İleri Makrosefali (Z > +3.0 SD) Statik Tarama
const severeMacro = calculateCranialScreening({
  currentHeadCircCm: 48.0,
  ageMonths: 6,
  gender: 'male',
  standard: 'neyzi_2015'
});
assert.strictEqual(severeMacro.isValid, true);
assert.ok((severeMacro.zScore ?? 0) > 3.0);
assert.strictEqual(severeMacro.staticClassification, 'SEVERE_MACROCEPHALY');
assert.strictEqual(severeMacro.hydrocephalusRisk, 'CRITICAL');
assert.strictEqual(severeMacro.urgencyLevel, 'EMERGENCY_IMAGING');
assert.ok(severeMacro.clinicalRecommendations.some(r => r.includes('TFUS')));

// 14.3 Dinamik Hızlı Baş Büyümesi (Crossing Percentiles Upwards)
// 2 aylık bebek: 1 ayda 3.5 cm artış (0-3 ay için normal 1.5-2.0 cm/ay, azami 2.2 cm/ay)
const rapidCranialGrowth = calculateCranialScreening({
  currentHeadCircCm: 41.5,
  previousHeadCircCm: 38.0,
  daysBetween: 30,
  ageMonths: 2,
  gender: 'male'
});
assert.strictEqual(rapidCranialGrowth.dynamicVelocity?.isVelocityElevated, true);
assert.strictEqual(rapidCranialGrowth.hydrocephalusRisk, 'WARNING');
assert.strictEqual(rapidCranialGrowth.urgencyLevel, 'PLANNED_USG');
assert.ok(rapidCranialGrowth.dynamicVelocity?.velocityStatusText.includes('Hızlı Baş Büyümesi'));

// 14.4 KİBAS Bulguları ile Kombine Acil Hidrosefali Alarmı
const emergencyHydrocephalus = calculateCranialScreening({
  currentHeadCircCm: 44.5,
  previousHeadCircCm: 42.0,
  daysBetween: 20,
  ageMonths: 4,
  gender: 'female',
  hasBulgingFontanelle: true,
  hasSunsetEyes: true,
  hasVomitingLethargy: true
});
assert.strictEqual(emergencyHydrocephalus.hydrocephalusRisk, 'CRITICAL');
assert.strictEqual(emergencyHydrocephalus.urgencyLevel, 'EMERGENCY_IMAGING');
assert.strictEqual(emergencyHydrocephalus.kibasSignsDetected.length, 3);
assert.ok(emergencyHydrocephalus.clinicalRecommendations.some(r => r.includes('KONTRENDİKEDİR')));

// 14.5 Ailesel (Benign) Makrosefali
const familialMacro = calculateCranialScreening({
  currentHeadCircCm: 49.5,
  ageMonths: 12,
  gender: 'male',
  parentalMacrocephaly: true
});
assert.strictEqual(familialMacro.staticClassification, 'MACROCEPHALY');
assert.strictEqual(familialMacro.hydrocephalusRisk, 'BENIGN_FAMILIAL');
assert.strictEqual(familialMacro.alertClass, 'success');
assert.strictEqual(familialMacro.urgencyLevel, 'ROUTINE_FOLLOWUP');

// 14.6 Ağır Mikrosefali (Z < -3.0 SD)
const severeMicro = calculateCranialScreening({
  currentHeadCircCm: 41.5,
  ageMonths: 12,
  gender: 'male'
});
assert.strictEqual(severeMicro.staticClassification, 'SEVERE_MICROCEPHALY');
assert.strictEqual(severeMicro.hydrocephalusRisk, 'CRITICAL');
assert.ok(severeMicro.clinicalRecommendations.some(r => r.includes('Kraniyosinostoz')));
console.log('✓ Combined Hydrocephalus & Microcephaly Screening Engine verified');

console.log('\n--- 15. VERIFYING METRIC PEDIATRIC DOSING, CONCENTRATION LOCK & SYRINGE PROTOCOLS (ADIM 5) ---');

// 15.1 Metrik Doz Formatı (X mg = Y mL) ve Ölçek/Kaşık Tasfiyesi
const p120 = calculatePediatricDose(15, 'paracetamol_120');
assert.ok(p120);
assert.strictEqual(p120.targetDoseMg, 225); // 15 kg * 15 mg/kg
assert.strictEqual(p120.volumeMl, 9.4);     // 225 / 24 = 9.375 -> 9.4 mL
assert.strictEqual(p120.metricDoseText, '225 mg (9.4 mL)');
assert.strictEqual(p120.isLocked, false);
assert.ok(p120.syringeWarning.includes('oral dozaj enjektörü'));
// Asla kontrolsüz "ölçek" ve "kaşık" kelimesi içermemeli (uyarıdaki olumsuz ikaz hariç)
assert.ok(!p120.metricDoseText.includes('ölçek') && !p120.metricDoseText.includes('kaşık'));
assert.ok(p120.olcekText && !p120.olcekText.includes('ölçek') && !p120.olcekText.includes('kaşık'));

// 15.2 Ticari Şişe Konsantrasyonları Karşılaştırması (Calpol 120/5 vs Calpol 6 Plus 250/5)
const p250 = calculatePediatricDose(15, 'paracetamol_250');
assert.ok(p250);
assert.strictEqual(p250.targetDoseMg, 225);
assert.strictEqual(p250.volumeMl, 4.5);     // 225 / 50 = 4.5 mL
assert.strictEqual(p250.metricDoseText, '225 mg (4.5 mL)');

// 15.3 Konsantrasyon Güvenlik Kilidi (🔒)
const pLocked = calculatePediatricDose(15, 'paracetamol_no_conc');
assert.ok(pLocked);
assert.strictEqual(pLocked.targetDoseMg, 225);
assert.strictEqual(pLocked.volumeMl, null);
assert.strictEqual(pLocked.isLocked, true);
assert.ok(pLocked.lockReason && pLocked.lockReason.includes('🔒'));
assert.ok(pLocked.metricDoseText.includes('kilitli'));
assert.ok(pLocked.syringeWarning.includes('seçilmeden'));

// 15.4 Oral Enjektör vs Ölçü Kabı Eşik Kuralı (< 10 mL vs ≥ 10 mL)
const pSub10 = calculatePediatricDose(10, 'paracetamol_120'); // 150 mg / 24 = 6.3 mL (< 10 mL)
assert.ok(pSub10);
assert.strictEqual(pSub10.volumeMl, 6.3);
assert.ok(pSub10.syringeWarning.includes('oral dozaj enjektörü'));

const pAbove10 = calculatePediatricDose(40, 'paracetamol_120'); // 600 mg / 24 = 25.0 mL (≥ 10 mL)
assert.ok(pAbove10);
assert.strictEqual(pAbove10.volumeMl, 25.0);
assert.ok(pAbove10.syringeWarning.includes('ölçü kabı'));

// 15.5 Amoksisilin-Klavulanat Standart (7:1) vs Yüksek Doz (14:1 ES)
const amoxStd = calculatePediatricDose(10, 'amoklavin_400');
assert.ok(amoxStd);
assert.strictEqual(amoxStd.targetDoseMg, 200); // 20 mg/kg
assert.strictEqual(amoxStd.volumeMl, 2.5);     // 200 / 80 = 2.5 mL

const amoxES = calculatePediatricDose(10, 'amoklavin_600');
assert.ok(amoxES);
assert.strictEqual(amoxES.targetDoseMg, 450);  // 45 mg/kg (90 mg/kg/gün 2 doz)
assert.strictEqual(amoxES.volumeMl, 3.8);      // 450 / 120 = 3.75 -> 3.8 mL

// 15.6 Geriye Dönük Uyumluluk (Legacy Aliases: paracetamol, ibuprofen, laroxyl_25)
const legacyParol = calculatePediatricDose(15, 'paracetamol');
assert.ok(legacyParol);
assert.strictEqual(legacyParol.targetDoseMg, 225);
assert.strictEqual(legacyParol.volumeMl, 9.4);

const legacyDolven = calculatePediatricDose(15, 'ibuprofen');
assert.ok(legacyDolven);
assert.strictEqual(legacyDolven.targetDoseMg, 150); // 15 * 10
assert.strictEqual(legacyDolven.volumeMl, 7.5);    // 150 / 20 = 7.5 mL

console.log('✓ Metric Pediatric Dosing, Concentration Lock & Oral Syringe Protocol verified');

console.log('\n--- 16. VERIFYING ADULT CAP CLAMPING & PEDIATRIC OBESITY IBW ENGINE (ADIM 6) ---');

// 16.1 calculateIdealBodyWeight Formül Doğrulaması (PPAG Kılavuzu)
// 10 yaş (120m) erkek, boy 140 cm (1.40 m), kilo 55 kg (Obez)
const ibwTest = calculateIdealBodyWeight({
  ageMonths: 120,
  gender: 'male',
  heightCm: 140,
  weightKg: 55
});
assert.ok(ibwTest);
assert.strictEqual(ibwTest.bmi, 28.1);      // 55 / 1.96 = 28.06 -> 28.1
assert.strictEqual(ibwTest.bmi50, 17.5);    // 10 yaş erkek Neyzi 2015 medyanı
assert.strictEqual(ibwTest.ibwKg, 34.3);     // 17.5 * 1.96 = 34.3 kg
assert.strictEqual(ibwTest.adjBwKg, 42.6);   // 34.3 + 0.4 * (55 - 34.3) = 42.58 -> 42.6 kg
assert.strictEqual(ibwTest.isObese, true);   // BMI Z-skoru > +1.645 SD (>95.p)
assert.strictEqual(ibwTest.isOverweight, false);

// 16.2 Yetişkin Tavan Doz Budaması: Parasetamol (Max 1000 mg/doz, 4000 mg/gün)
// 75 kg adölesan: 75 * 15 = 1125 mg -> 1000 mg'a budanmalı!
const paracetamolCapped = calculatePediatricDose(75, 'paracetamol_120');
assert.ok(paracetamolCapped);
assert.strictEqual(paracetamolCapped.isCapped, true);
assert.strictEqual(paracetamolCapped.uncappedDoseMg, 1125);
assert.strictEqual(paracetamolCapped.targetDoseMg, 1000); // Clamped to 1000 mg
assert.strictEqual(paracetamolCapped.volumeMl, 41.7);     // 1000 / 24 = 41.66 -> 41.7 mL
assert.ok(paracetamolCapped.capNotice && paracetamolCapped.capNotice.includes('1000 mg'));
assert.ok(paracetamolCapped.capNotice && paracetamolCapped.capNotice.includes('4000 mg'));

// 16.3 Yetişkin Tavan Doz Budaması: İbuprofen (Max 400 mg/doz, 1200 mg/gün)
// 50 kg çocuk: 50 * 10 = 500 mg -> 400 mg'a budanmalı!
const ibuprofenCapped = calculatePediatricDose(50, 'ibuprofen_100');
assert.ok(ibuprofenCapped);
assert.strictEqual(ibuprofenCapped.isCapped, true);
assert.strictEqual(ibuprofenCapped.uncappedDoseMg, 500);
assert.strictEqual(ibuprofenCapped.targetDoseMg, 400);    // Clamped to 400 mg
assert.strictEqual(ibuprofenCapped.volumeMl, 20.0);      // 400 / 20 = 20.0 mL
assert.ok(ibuprofenCapped.capNotice && ibuprofenCapped.capNotice.includes('400 mg'));

// 16.4 Yetişkin Tavan Doz Budaması: Ondansetron (Max 8 mg/doz)
// 60 kg çocuk (12 yaş): 60 * 0.15 = 9.0 mg -> 8.0 mg'a budanmalı!
const ondanCapped = calculatePediatricDose(60, 'ondansetron_4', { ageYears: 12 });
assert.ok(ondanCapped);
assert.strictEqual(ondanCapped.isCapped, true);
assert.strictEqual(ondanCapped.uncappedDoseMg, 9.0);
assert.strictEqual(ondanCapped.targetDoseMg, 8.0);
assert.strictEqual(ondanCapped.volumeMl, 10.0);          // 8 / 0.8 = 10.0 mL

// 16.5 Obez Çocukta Hidrofilik Parasetamol Dozlaması ve IBW Uyarısı
// 10 yaş erkek, 140 cm, 55 kg (TBW)
const obeseParacetamolTBW = calculatePediatricDose(55, 'paracetamol_120', {
  ageMonths: 120,
  heightCm: 140,
  gender: 'male',
  useIbw: false
});
assert.ok(obeseParacetamolTBW);
assert.strictEqual(obeseParacetamolTBW.isObeseAlert, true);
assert.strictEqual(obeseParacetamolTBW.tbwKg, 55);
assert.strictEqual(obeseParacetamolTBW.ibwKg, 34.3);
assert.strictEqual(obeseParacetamolTBW.adjBwKg, 42.6);
assert.strictEqual(obeseParacetamolTBW.targetDoseMg, 825); // 55 * 15 = 825 mg (TBW)
assert.strictEqual(obeseParacetamolTBW.ibwDoseMg, 514.5);  // 34.3 * 15 = 514.5 mg (IBW güvenli doz)
assert.strictEqual(obeseParacetamolTBW.ibwVolumeMl, 21.4); // 514.5 / 24 = 21.43 -> 21.4 mL
assert.ok(obeseParacetamolTBW.obesityWarning && obeseParacetamolTBW.obesityWarning.includes('NAPQI'));
assert.ok(obeseParacetamolTBW.obesityWarning && obeseParacetamolTBW.obesityWarning.includes('hepatotoksisite'));

// 16.6 Obez Çocukta IBW Seçimi Aktif (useIbw: true)
const obeseParacetamolIBW = calculatePediatricDose(55, 'paracetamol_120', {
  ageMonths: 120,
  heightCm: 140,
  gender: 'male',
  useIbw: true
});
assert.ok(obeseParacetamolIBW);
assert.strictEqual(obeseParacetamolIBW.usedWeightType, 'IBW');
assert.strictEqual(obeseParacetamolIBW.targetDoseMg, 514.5);
assert.strictEqual(obeseParacetamolIBW.volumeMl, 21.4);
assert.ok(obeseParacetamolIBW.metricDoseText.includes('IBW Bazlı Doz'));

// 16.7 Normal Kilo Çocukta Tavan veya Obezite Uyarısı Üretilmez
const normalChild = calculatePediatricDose(33, 'paracetamol_120', {
  ageMonths: 120,
  heightCm: 140,
  gender: 'male'
});
assert.ok(normalChild);
assert.strictEqual(normalChild.isObeseAlert, false);
assert.strictEqual(normalChild.isCapped, false);
assert.strictEqual(normalChild.targetDoseMg, 495); // 33 * 15 = 495 mg
assert.strictEqual(normalChild.volumeMl, 20.6);   // 495 / 24 = 20.625 -> 20.6 mL

console.log('✓ Adult Cap Clamping & Pediatric Obesity IBW Engine verified');

console.log('\n--- 17. VERIFYING TİTCK VS BNFC DUAL THRESHOLDS, RATIO LOCKS & HARD STOPS (ADIM 7) ---');

// 17.1 TC-001: İbuprofen Asgari Kilo Sınırı (Sınır Altı - 6.9 kg, 7 ay)
const tc001Blocked = calculatePediatricDose(6.9, 'ibuprofen_100', { ageMonths: 7 });
assert.ok(tc001Blocked);
assert.strictEqual(tc001Blocked.isBlocked, true);
assert.strictEqual(tc001Blocked.hasDualStandardAlert, true);
assert.strictEqual(tc001Blocked.targetDoseMg, 0);
assert.strictEqual(tc001Blocked.volumeMl, null);
assert.ok(tc001Blocked.blockReason && tc001Blocked.blockReason.includes('7 kg altındadır'));

// TC-001 ile Hekim Bilinçli Onayı (allowOffLabelTitck: true)
const tc001Allowed = calculatePediatricDose(6.9, 'ibuprofen_100', { ageMonths: 7, allowOffLabelTitck: true });
assert.ok(tc001Allowed);
assert.strictEqual(tc001Allowed.isBlocked, false);
assert.strictEqual(tc001Allowed.hasDualStandardAlert, true);
assert.strictEqual(tc001Allowed.targetDoseMg, 69);
assert.strictEqual(tc001Allowed.volumeMl, 3.5); // 69 / 20 = 3.45 -> 3.5 mL
assert.ok(tc001Allowed.dualStandardWarning && tc001Allowed.dualStandardWarning.includes('TİTCK'));

// 17.2 TC-002: İbuprofen Asgari Kilo Sınırı (Tam Sınır - 7.0 kg, 7 ay)
const tc002 = calculatePediatricDose(7.0, 'ibuprofen_100', { ageMonths: 7 });
assert.ok(tc002);
assert.strictEqual(tc002.isBlocked, false);
assert.strictEqual(tc002.hasDualStandardAlert, false);
assert.strictEqual(tc002.targetDoseMg, 70);
assert.strictEqual(tc002.volumeMl, 3.5);

// 17.3 TC-003: İbuprofen Asgari Yaş Sınırı (Sınır Altı - 8.5 kg, 5 ay 29 gün)
const tc003 = calculatePediatricDose(8.5, 'ibuprofen_100', { ageMonths: 5.9 });
assert.ok(tc003);
assert.strictEqual(tc003.isBlocked, true);
assert.strictEqual(tc003.hasDualStandardAlert, true);
assert.ok(tc003.blockReason && tc003.blockReason.includes('6 aydan küçüktür'));

// 17.4 TC-004: İbuprofen Asgari Yaş Sınırı (Tam Sınır - 8.5 kg, 6 ay)
const tc004 = calculatePediatricDose(8.5, 'ibuprofen_100', { ageMonths: 6.0 });
assert.ok(tc004);
assert.strictEqual(tc004.isBlocked, false);
assert.strictEqual(tc004.hasDualStandardAlert, false);
assert.strictEqual(tc004.targetDoseMg, 85);
assert.strictEqual(tc004.volumeMl, 4.3); // 85 / 20 = 4.25 -> 4.3 mL

// 17.5 İbuprofen Mutlak Alt Sınır (<3 ay veya <5 kg) - Hekim onaylasa dahi KESİN KONTRENDİKE
const tcIbAbsFloorWeight = calculatePediatricDose(4.5, 'ibuprofen_100', { ageMonths: 4, allowOffLabelTitck: true });
assert.ok(tcIbAbsFloorWeight);
assert.strictEqual(tcIbAbsFloorWeight.isBlocked, true);
assert.ok(tcIbAbsFloorWeight.blockReason && tcIbAbsFloorWeight.blockReason.includes('KESİN KONTRENDİKASYON'));

const tcIbAbsFloorAge = calculatePediatricDose(6.0, 'ibuprofen_100', { ageMonths: 2, allowOffLabelTitck: true });
assert.ok(tcIbAbsFloorAge);
assert.strictEqual(tcIbAbsFloorAge.isBlocked, true);
assert.ok(tcIbAbsFloorAge.blockReason && tcIbAbsFloorAge.blockReason.includes('KESİN KONTRENDİKASYON'));

// 17.6 PED-TC-005-006-UNIFIED: TMP-SMX İki Katmanlı Neonatal Güvenlik Motoru (41 gün vs 50 gün vs 61 gün)
// Bebek A: Postnatal 41 gün, 4.2 kg (TİTCK KÜB < 6 hafta -> HARD_STOP)
const babyA = calculatePediatricDose(4.2, 'tmp_smx_200_40', { ageDays: 41 });
assert.ok(babyA);
assert.strictEqual(babyA.isBlocked, true);
assert.strictEqual(babyA.isLocked, true);
assert.strictEqual(babyA.targetDoseMg, 0);
assert.ok(babyA.blockReason && babyA.blockReason.includes('HARD_STOP'));

// Bebek B: Postnatal 50 gün, 4.8 kg (Sarılık/Prematürite onaysız -> SOFT_STOP)
const babyB = calculatePediatricDose(4.8, 'tmp_smx_200_40', { ageDays: 50 });
assert.ok(babyB);
assert.strictEqual(babyB.isBlocked, true);
assert.strictEqual(babyB.isLocked, true);
assert.strictEqual(babyB.hasSoftStopWarning, true);
assert.strictEqual(babyB.targetDoseMg, 0);
assert.ok(babyB.softStopReason && babyB.softStopReason.includes('SOFT_STOP'));

// Bebek B-Onaylı: Postnatal 50 gün, 4.8 kg (Hekim 'Sarılık yok, matür bebek' onayı verdi)
const babyBApproved = calculatePediatricDose(4.8, 'tmp_smx_200_40', { ageDays: 50, allowSoftStop: true });
assert.ok(babyBApproved);
assert.strictEqual(babyBApproved.isBlocked, false);
assert.strictEqual(babyBApproved.hasSoftStopWarning, true);
assert.strictEqual(babyBApproved.targetDoseMg, 19.2); // 4.8 * 4 = 19.2 mg TMP
assert.strictEqual(babyBApproved.volumeMl, 2.4);     // 19.2 / 8 = 2.4 mL BID
assert.ok(babyBApproved.softStopReason && babyBApproved.softStopReason.includes('SOFT_STOP_OVERRIDDEN'));

// Bebek C: Postnatal 61 gün, 5.2 kg (Güvenli geçiş / normal hesaplama -> PASS)
const babyC = calculatePediatricDose(5.2, 'tmp_smx_200_40', { ageDays: 61 });
assert.ok(babyC);
assert.strictEqual(babyC.isBlocked, false);
assert.strictEqual(babyC.hasSoftStopWarning, false);
assert.strictEqual(babyC.targetDoseMg, 20.8); // 5.2 * 4 = 20.8 mg TMP
assert.strictEqual(babyC.volumeMl, 2.6);     // 20.8 / 8 = 2.6 mL BID

// 17.7 TC-009 & TC-010: Amoksisilin-Klavulanat 7:1 vs 14:1 (ES) Oran Kilidi
// TC-009: 16 kg, 2 yaş, Augmentin ES (600/42.9)
const tc009 = calculatePediatricDose(16, 'amoklavin_600', { ageMonths: 24, indication: 'aom_high_dose' });
assert.ok(tc009);
assert.strictEqual(tc009.isBlocked, false);
assert.strictEqual(tc009.targetDoseMg, 720); // 16 * 45 = 720 mg BID
assert.strictEqual(tc009.volumeMl, 6.0);     // 720 / 120 = 6.0 mL
assert.strictEqual(tc009.ratio, '14:1');
assert.ok(tc009.ratioNotice && tc009.ratioNotice.includes('14:1 ES Formülasyonu'));

// TC-010: 16 kg, 2 yaş, Croxilex BID 400/57 ile Yüksek Doz AOM (7:1 formülasyon BLOKE!)
const tc010 = calculatePediatricDose(16, 'amoklavin_400', { ageMonths: 24, indication: 'aom_high_dose' });
assert.ok(tc010);
assert.strictEqual(tc010.isBlocked, true);
assert.strictEqual(tc010.ratio, '7:1');
assert.ok(tc010.blockReason && tc010.blockReason.includes('Klavulanat Toksisitesi ve Şiddetli Diyare Riski'));

// Standart AOM'da 7:1 formülasyon hesaplanır ancak uyarı iliştirilir
const amoxStd7 = calculatePediatricDose(16, 'amoklavin_400', { ageMonths: 24 });
assert.ok(amoxStd7);
assert.strictEqual(amoxStd7.isBlocked, false);
assert.strictEqual(amoxStd7.targetDoseMg, 320); // 16 * 20 = 320 mg BID
assert.strictEqual(amoxStd7.volumeMl, 4.0);     // 320 / 80 = 4.0 mL
assert.ok(amoxStd7.ratioNotice && amoxStd7.ratioNotice.includes('Klavulanat Toksisitesi Uyarısı'));

// 17.8 TC-012 & TC-013: Ondansetron Akut Gastroenterit Kilo Bandı & <6 ay Kontrendikasyonu
const tc012 = calculatePediatricDose(14.8, 'ondansetron_4', { ageMonths: 36 });
assert.ok(tc012);
assert.strictEqual(tc012.isBlocked, false);
assert.strictEqual(tc012.targetDoseMg, 2);   // 8-15 kg bandı: 2 mg
assert.strictEqual(tc012.volumeMl, 2.5);     // 2 / 0.8 = 2.5 mL
assert.ok(tc012.offLabelNotice && tc012.offLabelNotice.includes('akut gastroenterit ruhsatı yoktur'));

const tc013 = calculatePediatricDose(15.2, 'ondansetron_4', { ageMonths: 42 });
assert.ok(tc013);
assert.strictEqual(tc013.isBlocked, false);
assert.strictEqual(tc013.targetDoseMg, 4);   // 15.1-30 kg bandı: 4 mg
assert.strictEqual(tc013.volumeMl, 5.0);     // 4 / 0.8 = 5.0 mL

const tcOndanInfant = calculatePediatricDose(7.5, 'ondansetron_4', { ageMonths: 5 });
assert.ok(tcOndanInfant);
assert.strictEqual(tcOndanInfant.isBlocked, true);
assert.ok(tcOndanInfant.blockReason && tcOndanInfant.blockReason.includes('AAP / CPS'));

// 17.9 TC-015: Kodein ve Tramadol <12 Yaş Mutlak Hard Stop (CYP2D6 Solunum Arresti)
const tc015Codeine = calculatePediatricDose(35, 'codeine_syrup', { ageMonths: 120 });
assert.ok(tc015Codeine);
assert.strictEqual(tc015Codeine.isBlocked, true);
assert.strictEqual(tc015Codeine.targetDoseMg, 0);
assert.ok(tc015Codeine.blockReason && tc015Codeine.blockReason.includes('CYP2D6 ultra-hızlı metabolizör'));

const tc015Tramadol = calculatePediatricDose(35, 'tramadol_drop', { ageMonths: 120 });
assert.ok(tc015Tramadol);
assert.strictEqual(tc015Tramadol.isBlocked, true);
assert.strictEqual(tc015Tramadol.targetDoseMg, 0);
assert.ok(tc015Tramadol.blockReason && tc015Tramadol.blockReason.includes('CYP2D6 ultra-hızlı metabolizör'));

// ≥12 yaş adölesanda Kodein dozu hesaplanabilir
const adolCodeine = calculatePediatricDose(50, 'codeine_syrup', { ageMonths: 168 });
assert.ok(adolCodeine);
assert.strictEqual(adolCodeine.isBlocked, false);
assert.strictEqual(adolCodeine.targetDoseMg, 25); // 50 * 0.5 = 25 mg
assert.strictEqual(adolCodeine.volumeMl, 25.0);

// 17.9B Yaş Girilmediğinde Güvenlik Kilitleri Denetimi (Kritik Klinik Güvenlik)
// 1. 12 kg çocuk için yaş girilmemişse Kodein BLOKE edilmelidir
const codeineNoAge = calculatePediatricDose(12, 'codeine_syrup');
assert.ok(codeineNoAge);
assert.strictEqual(codeineNoAge.isBlocked, true);
assert.strictEqual(codeineNoAge.targetDoseMg, 0);
assert.ok(codeineNoAge.blockReason && codeineNoAge.blockReason.includes('YAŞ BİLGİSİ ZORUNLUDUR'));

// 2. 12 kg çocuk için yaş girilmemişse Tramadol BLOKE edilmelidir
const tramadolNoAge = calculatePediatricDose(12, 'tramadol_drop');
assert.ok(tramadolNoAge);
assert.strictEqual(tramadolNoAge.isBlocked, true);
assert.strictEqual(tramadolNoAge.targetDoseMg, 0);
assert.ok(tramadolNoAge.blockReason && tramadolNoAge.blockReason.includes('YAŞ BİLGİSİ ZORUNLUDUR'));

// 3. 4 kg bebek için yaş girilmemişse TMP-SMX BLOKE edilmelidir (Kernikterus riski)
const tmpSmxNoAge = calculatePediatricDose(4, 'tmp_smx_200_40');
assert.ok(tmpSmxNoAge);
assert.strictEqual(tmpSmxNoAge.isBlocked, true);
assert.strictEqual(tmpSmxNoAge.targetDoseMg, 0);
assert.ok(tmpSmxNoAge.blockReason && tmpSmxNoAge.blockReason.includes('YAŞ BİLGİSİ ZORUNLUDUR'));

// 4. 12 kg çocuk için yaş girilmemişse Ondansetron BLOKE edilmelidir (<6 ay ve cerrahi patoloji riski)
const ondansetronNoAge = calculatePediatricDose(12, 'ondansetron_4');
assert.ok(ondansetronNoAge);
assert.strictEqual(ondansetronNoAge.isBlocked, true);
assert.strictEqual(ondansetronNoAge.targetDoseMg, 0);
assert.ok(ondansetronNoAge.blockReason && ondansetronNoAge.blockReason.includes('YAŞ BİLGİSİ ZORUNLUDUR'));

// 5. İbuprofen: Yaş girilmemiş ancak kilo >= 7kg ise hesaplanır ama yaş doğrulaması uyarısı verilir
const ibuprofenNoAge10kg = calculatePediatricDose(10, 'ibuprofen_100');
assert.ok(ibuprofenNoAge10kg);
assert.strictEqual(ibuprofenNoAge10kg.isBlocked, false);
assert.strictEqual(ibuprofenNoAge10kg.targetDoseMg, 100);
assert.strictEqual(ibuprofenNoAge10kg.hasDualStandardAlert, true);
assert.ok(ibuprofenNoAge10kg.dualStandardWarning && ibuprofenNoAge10kg.dualStandardWarning.includes('YAŞ BİLGİSİ BELİRTİLMEDİ'));

// 6. İbuprofen: Yaş girilmemiş ve kilo < 5kg ise mutlak alt sınır kilitlenir
const ibuprofenNoAge4kg = calculatePediatricDose(4.5, 'ibuprofen_100');
assert.ok(ibuprofenNoAge4kg);
assert.strictEqual(ibuprofenNoAge4kg.isBlocked, true);
assert.strictEqual(ibuprofenNoAge4kg.targetDoseMg, 0);

// 7. İbuprofen: Yaş girilmemiş ve 5-7kg arası ise TİTCK ruhsat sınırı kilitlenir
const ibuprofenNoAge6kg = calculatePediatricDose(6.5, 'ibuprofen_100');
assert.ok(ibuprofenNoAge6kg);
assert.strictEqual(ibuprofenNoAge6kg.isBlocked, true);
assert.strictEqual(ibuprofenNoAge6kg.targetDoseMg, 0);

// 17.10 GINA / AAP Negatif Kılavuz Uyarısı: Salbutamol Oral Şurup
const salbutamolOral = calculatePediatricDose(15, 'salbutamol_syrup');
assert.ok(salbutamolOral);
assert.strictEqual(salbutamolOral.targetDoseMg, 1.5);
assert.strictEqual(salbutamolOral.volumeMl, 3.8); // 1.5 / 0.4 = 3.75 -> 3.8 mL
assert.ok(salbutamolOral.negativeGuidelineWarning && salbutamolOral.negativeGuidelineWarning.includes('GINA / AAP Negatif Kılavuz Uyarısı'));

// 17.11 TC-014: Demir Preparatı Şurup ve Damla Karışıklığı Uyarısı
const feSyrup = calculatePediatricDose(10, 'iron_fe3_syrup');
assert.ok(feSyrup);
assert.ok(feSyrup.confusionWarning && feSyrup.confusionWarning.includes('Damla ve Şurup Ayrımı'));

// 17.12 Süspansiyon Sulandırma Sonrası Stabilite Bildirimi
const amoxStab = calculatePediatricDose(12, 'amoklavin_200');
assert.ok(amoxStab && amoxStab.reconstitutionStability && amoxStab.reconstitutionStability.includes('buzdolabında'));
const klacidStab = calculatePediatricDose(15, 'clarithromycin_125');
assert.ok(klacidStab && klacidStab.reconstitutionStability && klacidStab.reconstitutionStability.includes('ODA SICAKLIĞINDA'));

console.log('✓ TİTCK vs BNFc Dual Thresholds, Ratio Locks, Hard Stops & Monograph Safety Shields verified');

// --- 18. VERIFYING CLINICAL MONOGRAPH CARDS & 25 CRITICAL PEDIATRIC DRUGS (ADIM 8) ---
console.log('\n--- 18. VERIFYING CLINICAL MONOGRAPH CARDS & 25 CRITICAL PEDIATRIC DRUGS (ADIM 8) ---');
const monoDataRaw = JSON.parse(fs.readFileSync('public/data/clinical_monographs.json', 'utf8')) as ClinicalMonograph[];
assert.strictEqual(monoDataRaw.length, 136, 'Dataset must contain 136 complete monographs');
assert.ok(monoDataRaw.some(m => m.drug_id === 'amoxicillin_clavulanate_es'), 'amoxicillin_clavulanate_es must exist');
setMonographsCache(monoDataRaw);

// 18.1 Verify 25 Critical Pediatric Drugs Presence & Complete Structure
const expected25Drugs = [
  'epinephrine', 'ceftriaxone', 'cefotaxime', 'ampicillin', 'gentamicin',
  'vancomycin', 'midazolam', 'diazepam', 'levetiracetam', 'phenobarbital',
  'phenytoin', 'acyclovir', 'oseltamivir', 'budesonide', 'ipratropium',
  'morphine', 'fentanyl', 'ketamine', 'ors', 'paracetamol',
  'metronidazole', 'fluconazole', 'lorazepam', 'methylprednisolone',
  'zinc_sulfate'
];

const monoDict = new Map<string, ClinicalMonograph>(monoDataRaw.map(m => [m.id, m]));
for (const drugId of expected25Drugs) {
  const m = monoDict.get(drugId);
  assert.ok(m, `Drug ${drugId} must exist in monographs`);
  assert.strictEqual(m.drug_id, drugId, `${drugId} must have matching drug_id`);
  assert.ok(m.generic_name && m.generic_name.length > 0, `${drugId} must have generic_name`);
  assert.ok(m.atc_code && m.atc_code.length > 0, `${drugId} must have atc_code`);
  assert.ok(Array.isArray(m.formulations) && m.formulations.length > 0, `${drugId} must have formulations`);
  assert.ok(m.dosing?.pediatric_dosing && m.dosing.pediatric_dosing.length > 0, `${drugId} must have pediatric_dosing`);
  assert.ok(m.reproductive_safety?.pregnancy_trimester_risk, `${drugId} must have pregnancy_trimester_risk`);
  assert.ok(m.reproductive_safety?.lactation, `${drugId} must have lactation`);
  assert.ok(m.safety_warnings?.neonatal_specific_notes, `${drugId} must have neonatal safety notes`);
  assert.ok(m.metadata?.source_documents && m.metadata.source_documents.length > 0, `${drugId} must have source_documents`);
}

// 18.2 FDA 2015 PLLR Trimester Status Bar Evaluation
const tIbuT1 = evaluateTrimesterRiskLevel('Düşük ve kardiyak defekt riski bildirilmiştir; zorunlu değilse kaçınılmalıdır.');
assert.strictEqual(tIbuT1.level, 'CONTRAINDICATED'); // 'kaçınılmalıdır' triggers CONTRAINDICATED

const tIbuT3 = evaluateTrimesterRiskLevel('KESİN KONTRENDİKE: Ductus arteriosus vaktinden önce kapanması riski');
assert.strictEqual(tIbuT3.level, 'CONTRAINDICATED');
assert.strictEqual(tIbuT3.label, 'KONTRENDİKE');

const tParoT1 = evaluateTrimesterRiskLevel('Gebelikte en güvenli analjezik ve antipiretiktir.');
assert.strictEqual(tParoT1.level, 'SAFE');
assert.strictEqual(tParoT1.label, 'GÜVENLİ');

const tFlucoT1 = evaluateTrimesterRiskLevel('KONTRENDİKE: Yüksek doz veya uzun süreli kullanımda kraniyofasiyal anomali.');
assert.strictEqual(tFlucoT1.level, 'CONTRAINDICATED');

// 18.3 Measuring Device Badges (ISMP 2024-2026 Pediatric Liquid Standards)
const devSyringe = getMeasuringDeviceBadge('oral_syringe');
assert.ok(devSyringe.label.includes('Oral Enjektör'));
assert.strictEqual(devSyringe.icon, '💉');

const devDrop = getMeasuringDeviceBadge('dropper');
assert.ok(devDrop.label.includes('Damlalık'));
assert.strictEqual(devDrop.icon, '💧');

const devCup = getMeasuringDeviceBadge('calibrated_cup');
assert.ok(devCup.label.includes('Ölçü Kabı'));

// 18.4 LactMed Safety Verdict & Relative Infant Dose (RID %)
const mParol = monoDict.get('paracetamol')!;
assert.strictEqual(mParol.reproductive_safety?.lactation?.safety_verdict, 'COMPATIBLE');
assert.ok(mParol.reproductive_safety?.lactation?.relative_infant_dose_percent! < 10, 'Paracetamol RID must be <10%');

const mMorph = monoDict.get('morphine')!;
assert.strictEqual(mMorph.reproductive_safety?.lactation?.safety_verdict, 'USE_WITH_CAUTION');

// 18.5 Reconstitution Stability & Packaging Checks
const mAugmentin = monoDict.get('amoxicillin-clavulanate')!;
const esForm = mAugmentin.formulations?.find(f => f.form_name.includes('ES'));
assert.ok(esForm);
assert.strictEqual(esForm.reconstitution_stability_days, 10);
assert.strictEqual(esForm.measuring_device, 'oral_syringe');

const mAmox = monoDict.get('amoxicillin')!;
const amoxForm = mAmox.formulations?.[0];
assert.ok(amoxForm);
assert.strictEqual(amoxForm.reconstitution_stability_days, 14);

// 18.6 Black Box Warnings & Neonatal Rules
const mCeft = monoDict.get('ceftriaxone')!;
assert.ok(mCeft.safety_warnings?.black_box_warnings?.some(w => w.includes('kalsiyum')));
assert.ok(mCeft.safety_warnings?.neonatal_specific_notes?.includes('kernikterus'));

const mPheno = monoDict.get('phenobarbital')!;
const phenoLoad = mPheno.dosing?.pediatric_dosing?.find(d => d.indication.includes('Neonatal'));
assert.ok(phenoLoad);
assert.strictEqual(phenoLoad.dose_per_kg_single, 20); // 20 mg/kg loading dose

// 18.7 renderMonographCardHTML Verification
const htmlCeft = renderMonographCardHTML(mCeft, 'Rocephin 1g');
assert.ok(htmlCeft.includes('KARA KUTU UYARISI'));
assert.ok(htmlCeft.includes('kalsiyum'));
assert.ok(htmlCeft.includes('Trimester Durum Çubuğu'));
assert.ok(htmlCeft.includes('LactMed: Uyumlu'));

const htmlIbu = renderMonographCardHTML(monoDict.get('ibuprofen')!, 'Dolven Şurup');
assert.ok(htmlIbu.includes('Oral Enjektör Zorunlu'));
assert.ok(htmlIbu.includes('3. Trimester (T3)'));
assert.ok(htmlIbu.includes('KONTRENDİKE'));

console.log('✓ Clinical Monograph Cards, 25 Critical Pediatric Drugs & FDA PLLR Trimester Status Bar verified');

console.log('\n--- 19. VERIFYING OFFLINE RXNORM CUI & ATC MAPPING ENGINE (NLM RxNav Deprecation Replacement) ---');

// 19.1 NLM RxNav Deprecation Notice & Offline Guarantee
assert.strictEqual(isRxNavApiDeprecated(), true, 'RxNav API must be recorded as permanently deprecated in 2024');
const stats = getOfflineOntologyStats();
assert.strictEqual(stats.offlineGuaranteed, true);
assert.strictEqual(stats.rxNavApiStatus, 'PERMANENTLY_DEPRECATED_UPSTREAM');
assert.ok(stats.totalConcepts >= 80, `Expected at least 80 curated concepts, got ${stats.totalConcepts}`);
assert.ok(stats.totalAliases > 150, `Expected >150 aliases, got ${stats.totalAliases}`);

// 19.2 Direct CUI and ATC Resolvers
const ceftByCui = getRxNormConceptByCui('2193')!;
assert.ok(ceftByCui);
assert.strictEqual(ceftByCui.canonicalKey, 'ceftriaxone');
assert.strictEqual(ceftByCui.displayNameEn, 'Ceftriaxone');
assert.ok(ceftByCui.drugClasses.includes('cephalosporin_3g'));
assert.ok(ceftByCui.drugClasses.includes('calcium_incompatible_neonatal'));

const meroByAtc = getRxNormConceptByAtc('J01DH02')!;
assert.ok(meroByAtc);
assert.strictEqual(meroByAtc.canonicalKey, 'meropenem');
assert.strictEqual(meroByAtc.rxCui, '29560');
assert.ok(meroByAtc.drugClasses.includes('valproate_incompatible'));

const mtxByKey = getRxNormConceptByKey('methotrexate')!;
assert.ok(mtxByKey);
assert.strictEqual(mtxByKey.rxCui, '6851');
assert.strictEqual(mtxByKey.displayNameTr, 'Metotreksat');
assert.strictEqual(mtxByKey.boxedWarning, true);

// 19.3 Turkish Brand Names & TİTCK Trade Names Resolution
const c1 = resolveToRxNormConcept('Rocephin 1g Flakon')!;
assert.ok(c1);
assert.strictEqual(c1.canonicalKey, 'ceftriaxone');
assert.strictEqual(c1.rxCui, '2193');

const c2 = resolveToRxNormConcept('Desefin 500 mg')!;
assert.ok(c2);
assert.strictEqual(c2.canonicalKey, 'ceftriaxone');

const c3 = resolveToRxNormConcept('Depakin 500 mg Chrono')!;
assert.ok(c3);
assert.strictEqual(c3.canonicalKey, 'valproic_acid');
assert.strictEqual(c3.rxCui, '11170');
assert.ok(c3.drugClasses.includes('carbapenem_incompatible_hard_stop'));

const c4 = resolveToRxNormConcept('Meronem 1g IV')!;
assert.ok(c4);
assert.strictEqual(c4.canonicalKey, 'meropenem');
assert.strictEqual(c4.rxCui, '29560');

const c5 = resolveToRxNormConcept('Zyloric 300 mg')!;
assert.ok(c5);
assert.strictEqual(c5.canonicalKey, 'allopurinol');
assert.strictEqual(c5.rxCui, '519');

const c6 = resolveToRxNormConcept('İmuran 50 mg')!;
assert.ok(c6);
assert.strictEqual(c6.canonicalKey, 'azathioprine');
assert.strictEqual(c6.rxCui, '1256');

const c7 = resolveToRxNormConcept('Viagra 100 mg')!;
assert.ok(c7);
assert.strictEqual(c7.canonicalKey, 'sildenafil');
assert.strictEqual(c7.rxCui, '136411');
assert.ok(c7.drugClasses.includes('nitrate_contraindicated_hard_stop'));

const c8 = resolveToRxNormConcept('Perlinganit 10 mg/10 ml')!;
assert.ok(c8);
assert.strictEqual(c8.canonicalKey, 'nitroglycerin');
assert.strictEqual(c8.rxCui, '7454');
assert.ok(c8.drugClasses.includes('pde5_contraindicated_hard_stop'));

const c9 = resolveToRxNormConcept('Kolsin 0.5 mg')!;
assert.ok(c9);
assert.strictEqual(c9.canonicalKey, 'colchicine');
assert.strictEqual(c9.rxCui, '2683');

const c10 = resolveToRxNormConcept('Klacid 500 mg')!;
assert.ok(c10);
assert.strictEqual(c10.canonicalKey, 'clarithromycin');
assert.strictEqual(c10.rxCui, '21212');

const c11 = resolveToRxNormConcept('Tazocin 4.5 g')!;
assert.ok(c11);
assert.strictEqual(c11.canonicalKey, 'piperacillin_tazobactam');
assert.strictEqual(c11.rxCui, '54136');

const c12 = resolveToRxNormConcept('Contramal 50 mg Kapsül')!;
assert.ok(c12);
assert.strictEqual(c12.canonicalKey, 'tramadol');
assert.strictEqual(c12.rxCui, '10689');
assert.ok(c12.isControlledSubstance);
assert.ok(c12.drugClasses.includes('pediatric_under_12_hard_stop'));

const c13 = resolveToRxNormConcept('Bactrim Forte')!;
assert.ok(c13);
assert.strictEqual(c13.canonicalKey, 'trimethoprim_sulfamethoxazole');
assert.strictEqual(c13.rxCui, '10834');
assert.ok(c13.drugClasses.includes('neonatal_kernicterus_risk'));

const c14 = resolveToRxNormConcept('Eliquis 5 mg')!;
assert.ok(c14);
assert.strictEqual(c14.canonicalKey, 'apixaban');
assert.strictEqual(c14.rxCui, '1364430');
assert.ok(c14.drugClasses.includes('cockcroft_gault_mandatory'));

const c15 = resolveToRxNormConcept('Aldactone 25 mg')!;
assert.ok(c15);
assert.strictEqual(c15.canonicalKey, 'spironolactone');
assert.strictEqual(c15.rxCui, '9997');

const c16 = resolveToRxNormConcept('K-Contin 600 mg')!;
assert.ok(c16);
assert.strictEqual(c16.canonicalKey, 'potassium_chloride');
assert.strictEqual(c16.rxCui, '8591');

const c17 = resolveToRxNormConcept('Ringer Laktat 500 ml')!;
assert.ok(c17);
assert.strictEqual(c17.canonicalKey, 'ringer_lactate');
assert.strictEqual(c17.rxCui, '9390');

// 19.4 Turkish Uppercase & Diacritic Normalization
const tIbu = resolveToRxNormConcept('İBUFEN 100 MG SURUP')!;
assert.ok(tIbu);
assert.strictEqual(tIbu.canonicalKey, 'ibuprofen');
assert.strictEqual(tIbu.rxCui, '5640');

const tSipro = resolveToRxNormConcept('SİPROFLOKSASİN 500 MG')!;
assert.ok(tSipro);
assert.strictEqual(tSipro.canonicalKey, 'ciprofloxacin');
assert.strictEqual(tSipro.rxCui, '2551');

const tAllo = resolveToRxNormConcept('ALLOPÜRİNOL')!;
assert.ok(tAllo);
assert.strictEqual(tAllo.canonicalKey, 'allopurinol');
assert.strictEqual(tAllo.rxCui, '519');

const tKols = resolveToRxNormConcept('KOLŞİSİN')!;
assert.ok(tKols);
assert.strictEqual(tKols.canonicalKey, 'colchicine');
assert.strictEqual(tKols.rxCui, '2683');

// 19.5 Batch Prescription Resolution
const batchResults = resolveBatchRxNormConcepts([
  'Rocephin 1g',
  'Kalsiyum Glukonat %10',
  'Depakin Chrono',
  'Meronem 1g',
  'Gecersiz Ilac Adi 123'
]);
assert.strictEqual(batchResults.length, 4, 'Should resolve 4 valid drugs and ignore unrecognized input');
assert.strictEqual(batchResults[0].rxCui, '2193');
assert.strictEqual(batchResults[1].rxCui, '1908');
assert.strictEqual(batchResults[2].rxCui, '11170');
assert.strictEqual(batchResults[3].rxCui, '29560');

// 19.6 getDrugRxNormBadge Integration
const badgeRocephin = getDrugRxNormBadge({ brand: 'ROCEPHIN 1 G FLAKON' });
assert.ok(badgeRocephin.includes('RxCUI: 2193'));
assert.ok(badgeRocephin.includes('Ceftriaxone'));

const badgeDolven = getDrugRxNormBadge({ brand: 'DOLVEN 100 MG/5 ML SURUP' });
assert.ok(badgeDolven.includes('RxCUI: 5640'));
assert.ok(badgeDolven.includes('Ibuprofen'));

console.log('✓ Offline RxNorm CUI & ATC Concept Mapping Engine verified (100% offline, NLM API replacement)');

console.log('\n--- 20. VERIFYING 4-TIER INTERACTION HIERARCHY & ACORN TRIAL VPT DOWNGRADE (ADIM 10) ---');

// 20.1 TC-001: Yenidoğanda seftriakson ve kalsiyum presipitasyonu (≤28 Gün -> TIER 1 HARD STOP)
const ddiTc001 = evaluatePrescriptionInteractions(
  [
    { name: 'Seftriakson', route: 'IV', dose: '50 mg/kg/gun' },
    { name: 'Kalsiyum Glukonat', route: 'IV', dose: 'Infusyon' }
  ],
  { ageDays: 21, gestationalAgeWeeks: 39, weightKg: 3.4, gender: 'male' }
);
assert.strictEqual(ddiTc001.hasHardStop, true, 'TC-001 must trigger a Hard Stop');
assert.strictEqual(ddiTc001.canConfirmWithoutOverride, false);
assert.strictEqual(ddiTc001.highestTier, 'TIER_1_HARD_STOP');
const ddiTc001Alert = ddiTc001.alerts.find(a => a.ruleId === 'NEO_CEFT_CA_001')!;
assert.ok(ddiTc001Alert, 'Rule NEO_CEFT_CA_001 must trigger');
assert.strictEqual(ddiTc001Alert.alertLevel, 'HARD_STOP_CONTRAINDICATION');
assert.strictEqual(ddiTc001Alert.tier, 1);
assert.strictEqual(ddiTc001Alert.interruptive, true);
assert.strictEqual(ddiTc001Alert.blocksConfirmation, true);
assert.ok(ddiTc001Alert.alertTitle.includes('KESİN KONTRENDİKASYON'));
assert.ok(ddiTc001Alert.message.includes('21 günlük yenidoğanda'));
assert.ok(ddiTc001Alert.message.toLowerCase().includes('sefotaksim'));


// 20.2 TC-002: Süt çocuğunda seftriakson ve kalsiyum ardışık infüzyon (>28 Gün -> TIER 2 SOFT STOP / OPERATIONAL WARNING)
const ddiTc002 = evaluatePrescriptionInteractions(
  [
    { name: 'Seftriakson', route: 'IV', dose: '80 mg/kg/gun' },
    { name: 'Ringer Laktat', route: 'IV', dose: 'Idame' }
  ],
  { ageDays: 60, gestationalAgeWeeks: 40, weightKg: 5.2, gender: 'female' }
);
assert.strictEqual(ddiTc002.hasHardStop, false, 'TC-002 must NOT trigger a Hard Stop for infant >28 days');
const ddiTc002Alert = ddiTc002.alerts.find(a => a.ruleId === 'INF_CEFT_CA_002')!;
assert.ok(ddiTc002Alert, 'Rule INF_CEFT_CA_002 must trigger');
assert.strictEqual(ddiTc002Alert.alertLevel, 'WARNING_MONITOR');
assert.strictEqual(ddiTc002Alert.tier, 2);
assert.strictEqual(ddiTc002Alert.interruptive, false);
assert.strictEqual(ddiTc002Alert.blocksConfirmation, false);
assert.ok(ddiTc002Alert.alertTitle.includes('DİKKAT'));
assert.ok(ddiTc002Alert.message.includes('Hasta 28 günden büyüktür'));
assert.ok(ddiTc002Alert.message.includes('ardışık'));

// 20.3 TC-003: Epilepsi hastasında karbapenem ve valproik asit etkileşimi (TIER 1 HARD STOP)
const ddiTc003 = evaluatePrescriptionInteractions(
  [
    { name: 'Sodyum Valproat', route: 'Oral', dose: '1000 mg/gun' },
    { name: 'Meropenem', route: 'IV', dose: '1 g q8h' }
  ],
  { ageYears: 28, weightKg: 70, gender: 'male', history: ['Epilepsi'] }
);
assert.strictEqual(ddiTc003.hasHardStop, true);
assert.strictEqual(ddiTc003.canConfirmWithoutOverride, false);
const ddiTc003Alert = ddiTc003.alerts.find(a => a.ruleId === 'DDI_VPA_CARB_001')!;
assert.ok(ddiTc003Alert, 'Rule DDI_VPA_CARB_001 must trigger');
assert.strictEqual(ddiTc003Alert.alertLevel, 'HARD_STOP_CONTRAINDICATION');
assert.strictEqual(ddiTc003Alert.tier, 1);
assert.strictEqual(ddiTc003Alert.interruptive, true);
assert.strictEqual(ddiTc003Alert.blocksConfirmation, true);
assert.ok(ddiTc003Alert.alertTitle.includes('HAYATİ ETKİLEŞİM'));
assert.ok(ddiTc003Alert.message.includes('%80-90 oranında düşürerek'));

// 20.4 TC-005: Pediatrik tonsillektomi sonrası tramadol reçetesi (TIER 1 HARD STOP)
const ddiTc005 = evaluatePrescriptionInteractions(
  [
    { name: 'Tramadol Damla', route: 'Oral', dose: '1 mg/kg' }
  ],
  { ageYears: 8, weightKg: 25, gender: 'male', diagnosis: 'Post-tonsilektomi ağrısı' }
);
assert.strictEqual(ddiTc005.hasHardStop, true);
assert.strictEqual(ddiTc005.canConfirmWithoutOverride, false);
const ddiTc005Alert = ddiTc005.alerts.find(a => a.ruleId === 'PUD_TRAMADOL_AGE_001')!;
assert.ok(ddiTc005Alert, 'Rule PUD_TRAMADOL_AGE_001 must trigger');
assert.strictEqual(ddiTc005Alert.alertLevel, 'HARD_STOP_CONTRAINDICATION');
assert.strictEqual(ddiTc005Alert.tier, 1);
assert.strictEqual(ddiTc005Alert.interruptive, true);
assert.strictEqual(ddiTc005Alert.blocksConfirmation, true);
assert.ok(ddiTc005Alert.alertTitle.includes('12 Yaş Altında Tramadol Kullanımı'));

// 20.5 TC-006: Sepsis şüpheli hastada vankomisin ve piperasilin/tazobaktam reçetelenmesi (ACORN DDI_VAN_TZP_001 Downgrade)
const ddiTc006 = evaluatePrescriptionInteractions(
  [
    { name: 'Vankomisin', route: 'IV', dose: '15 mg/kg q12h' },
    { name: 'Piperasilin-Tazobaktam', route: 'IV', dose: '4.5 g q8h' }
  ],
  { ageYears: 62, weightKg: 75, gender: 'male', admissionUnit: 'Acil Servis' }
);
assert.strictEqual(ddiTc006.hasHardStop, false, 'ACORN VPT must NOT trigger Hard Stop');
assert.strictEqual(ddiTc006.hasSoftStop, false, 'ACORN VPT must NOT trigger Soft Stop modal');
assert.strictEqual(ddiTc006.canConfirmWithoutOverride, true, 'ACORN VPT prescription must be confirmable without disruptive override');
assert.strictEqual(ddiTc006.highestTier, 'TIER_4_INFORMATIONAL');
const ddiTc006Alert = ddiTc006.alerts.find(a => a.ruleId === 'DDI_VAN_TZP_001')!;
assert.ok(ddiTc006Alert, 'Rule DDI_VAN_TZP_001 must trigger');
assert.strictEqual(ddiTc006Alert.alertLevel, 'INFO_PASSIVE');
assert.strictEqual(ddiTc006Alert.tier, 4);
assert.strictEqual(ddiTc006Alert.interruptive, false);
assert.strictEqual(ddiTc006Alert.blocksConfirmation, false);
assert.ok(ddiTc006Alert.alertTitle.includes('BİLGİ: Vankomisin + Piperasilin/Tazobaktam Rejimi'));
assert.ok(ddiTc006Alert.message.includes('ACORN, JAMA 2023'));
assert.ok(ddiTc006Alert.message.includes('psödo-AKI'));
assert.ok(ddiTc006Alert.message.includes('diyaliz ihtiyacı veya 14 günlük mortalitede artış göstermemiştir'));
assert.ok(ddiTc006Alert.message.includes('sefepime geçiş nörotoksisite riskini artırabilir'));

// 20.6 isAcornVptRegimen Helper Verification
assert.strictEqual(isAcornVptRegimen(['Vankomisin Flakon', 'Tazocin 4.5g']), true);
assert.strictEqual(isAcornVptRegimen(['Vankomisin Flakon', 'Meronem']), false);


// 20.7 Additional Tier 1 & Tier 2 Special High-Alert Triggers
// A. Allopurinol + Azathioprine -> Hard Stop
const resAllo = evaluatePrescriptionInteractions(['Zyloric 300mg', 'İmuran 50mg']);
assert.strictEqual(resAllo.hasHardStop, true);
assert.ok(resAllo.alerts.some(a => a.ruleId === 'DDI_ALLO_THIO_001'));

// B. Sildenafil + Nitroglycerin -> Hard Stop
const resNit = evaluatePrescriptionInteractions(['Viagra 100mg', 'Perlinganit']);
assert.strictEqual(resNit.hasHardStop, true);
assert.ok(resNit.alerts.some(a => a.ruleId === 'DDI_PDE5_NITRATE_001'));

// C. Colchicine + Clarithromycin -> Hard Stop
const resColch = evaluatePrescriptionInteractions(['Kolsin 0.5mg', 'Klacid 500mg']);
assert.strictEqual(resColch.hasHardStop, true);
assert.ok(resColch.alerts.some(a => a.ruleId === 'DDI_COLCH_CYP3A4_001'));

// D. Triple Whammy (Delix + Lasix + Apranax) -> Soft Stop (Tier 2)
const resTw = evaluatePrescriptionInteractions(['Delix 5mg', 'Lasix 40mg', 'Apranax 550mg']);
assert.strictEqual(resTw.hasHardStop, false);
assert.strictEqual(resTw.hasSoftStop, true);
assert.ok(resTw.alerts.some(a => a.ruleId === 'DDI_TRIPLE_WHAMMY_001'));

// E. Clopidogrel + Omeprazole -> Monitoring (Tier 3)
const resPlavix = evaluatePrescriptionInteractions(['Plavix 75mg', 'Losec 20mg']);
assert.strictEqual(resPlavix.hasHardStop, false);
assert.strictEqual(resPlavix.hasSoftStop, false);
assert.strictEqual(resPlavix.countsByTier.tier3, 1);
assert.ok(resPlavix.alerts.some(a => a.ruleId === 'DDI_CLOPIDOGREL_PPI_001'));

console.log('✓ 4-Tier Interaction Hierarchy & ACORN Trial VPT Downgrade verified (100% parity with Dosya 3)');

console.log('\n--- 21. VERIFYING SPECIAL HIGH-RISK INTERACTIONS & HARD STOPS (ADIM 11) ---');

// 21.1 TC-HR-001: Spironolakton + Oral Potasyum Klorür (Ölümcül Hiperkalemi / Kardiyak Arrest)
// A. Normal veya bilinmeyen K+ düzeyi (TIER 1 HARD STOP)
const kHardStopRes = evaluatePrescriptionInteractions(['Aldactone 25mg', 'K-Contin 600mg'], { ageYears: 65, baselineK: 4.4 });
assert.strictEqual(kHardStopRes.hasHardStop, true);
assert.strictEqual(kHardStopRes.canConfirmWithoutOverride, false);
const kAlert = kHardStopRes.alerts.find(a => a.ruleId === 'DDI_K_SPARING_K_SUPP_001')!;
assert.ok(kAlert, 'Rule DDI_K_SPARING_K_SUPP_001 must trigger');
assert.strictEqual(kAlert.tier, 1);
assert.strictEqual(kAlert.blocksConfirmation, true);
assert.ok(kAlert.alertTitle.includes('ÖLÜMCÜL HİPERKALEMİ RİSKİ'));
assert.ok(kAlert.message.includes('sinüs arresti, ventriküler fibrilasyon'));

// B. Belgelenmiş derin hipokalemi (<3.0 mEq/L) - Monitörize replasman (TIER 2 SOFT STOP)
const kSoftStopRes = evaluatePrescriptionInteractions(['Aldactone 25mg', 'K-Contin 600mg'], { ageYears: 65, baselineK: 2.6 });
assert.strictEqual(kSoftStopRes.hasHardStop, false);
assert.strictEqual(kSoftStopRes.hasSoftStop, true);
assert.strictEqual(kSoftStopRes.canConfirmWithoutOverride, false);
const kHypoAlert = kSoftStopRes.alerts.find(a => a.ruleId === 'DDI_K_SPARING_K_SUPP_002')!;
assert.ok(kHypoAlert, 'Rule DDI_K_SPARING_K_SUPP_002 must trigger');
assert.strictEqual(kHypoAlert.tier, 2);
assert.strictEqual(kHypoAlert.blocksConfirmation, false);
assert.ok(kHypoAlert.alertTitle.includes('AĞIR HİPOKALEMİ REPLASMANI'));

// 21.2 TC-HR-002: Metotreksat + TMP-SMX (Ölümcül Pansitopeni ve Nefrotoksisite - TIER 1 HARD STOP)
const mtxBactrimRes = evaluatePrescriptionInteractions(['Metotreksat 15mg', 'Bactrim Forte']);
assert.strictEqual(mtxBactrimRes.hasHardStop, true);
assert.strictEqual(mtxBactrimRes.canConfirmWithoutOverride, false);
const mtxAlert = mtxBactrimRes.alerts.find(a => a.ruleId === 'DDI_MTX_TMPSMX_001')!;
assert.ok(mtxAlert, 'Rule DDI_MTX_TMPSMX_001 must trigger');
assert.strictEqual(mtxAlert.tier, 1);
assert.strictEqual(mtxAlert.blocksConfirmation, true);
assert.ok(mtxAlert.message.includes('dihidrofolat redüktaz'));
assert.ok(mtxAlert.recommendations.some(r => r.includes('Lökovorin')));

// 21.3 TC-HR-003: Çift "Bilinen Risk" QT Uzatıcı İlaç Kombinasyonu (TdP Hard Stop)
// A. Sotalol + Haloperidol (İki "Bilinen Risk" -> TIER 1 HARD STOP)
const qtDualKnownRes = evaluatePrescriptionInteractions(['Darob 80mg', 'Norodol 5mg']);
assert.strictEqual(qtDualKnownRes.hasHardStop, true);
assert.strictEqual(qtDualKnownRes.canConfirmWithoutOverride, false);
const qtDualAlert = qtDualKnownRes.alerts.find(a => a.ruleId === 'DDI_QT_DUAL_KNOWN_001')!;
assert.ok(qtDualAlert, 'Rule DDI_QT_DUAL_KNOWN_001 must trigger');
assert.strictEqual(qtDualAlert.tier, 1);
assert.strictEqual(qtDualAlert.blocksConfirmation, true);
assert.ok(qtDualAlert.alertTitle.includes('HAYATİ ARİTMİ (TdP) RİSKİ'));
assert.ok(qtDualAlert.message.includes('Torsades de Pointes (TdP)'));

// B. Sitalopram + Moksifloksasin (İki "Bilinen Risk" -> TIER 1 HARD STOP)
const qtMoxiRes = evaluatePrescriptionInteractions(['Cipram 20mg', 'Avelox 400mg']);
assert.strictEqual(qtMoxiRes.hasHardStop, true);
assert.ok(qtMoxiRes.alerts.some(a => a.ruleId === 'DDI_QT_DUAL_KNOWN_001'));

// C. Sitalopram + Ondansetron (Bir "Bilinen Risk" + Bir "Koşullu Risk" -> TIER 3 MONITORING ROZET)
const qtCondRes = evaluatePrescriptionInteractions(['Cipram 20mg', 'Zofran 4mg']);
assert.strictEqual(qtCondRes.hasHardStop, false);
assert.strictEqual(qtCondRes.canConfirmWithoutOverride, true);
assert.strictEqual(qtCondRes.countsByTier.tier3, 1);
const qtCondAlert = qtCondRes.alerts.find(a => a.ruleId === 'DDI_QT_POSSIBLE_001')!;
assert.ok(qtCondAlert, 'Rule DDI_QT_POSSIBLE_001 must trigger');
assert.strictEqual(qtCondAlert.tier, 3);
assert.strictEqual(qtCondAlert.blocksConfirmation, false);

// 21.4 TC-HR-004: DOAC + Güçlü CYP3A4 / P-gp Modülatörleri (TIER 1 HARD STOP)
// A. Apiksaban + Ketokonazol (İnhibitör -> Majör Kanama)
const doacInhibRes = evaluatePrescriptionInteractions(['Eliquis 5mg', 'Nizoral 200mg']);
assert.strictEqual(doacInhibRes.hasHardStop, true);
const doacInhibAlert = doacInhibRes.alerts.find(a => a.ruleId === 'DDI_DOAC_CYP3A4_001')!;
assert.ok(doacInhibAlert);
assert.strictEqual(doacInhibAlert.tier, 1);
assert.strictEqual(doacInhibAlert.blocksConfirmation, true);
assert.ok(doacInhibAlert.alertTitle.includes('ÖLÜMCÜL KANAMA RİSKİ'));

// B. Rivaroksaban + Rifampisin (İndükleyici -> Tromboemboli & İnme)
const doacInducRes = evaluatePrescriptionInteractions(['Xarelto 20mg', 'Rifadin 300mg']);
assert.strictEqual(doacInducRes.hasHardStop, true);
const doacInducAlert = doacInducRes.alerts.find(a => a.ruleId === 'DDI_DOAC_CYP3A4_001')!;
assert.ok(doacInducAlert);
assert.strictEqual(doacInducAlert.tier, 1);
assert.strictEqual(doacInducAlert.blocksConfirmation, true);
assert.ok(doacInducAlert.alertTitle.includes('HAYATİ TROMBOEMBOLİ RİSKİ'));

// 21.5 TC-HR-005: 60 Gün Altında Yenidoğan/İnfant Sülfonamid (Kernikterus - TIER 1 HARD STOP)
const neoSmxRes = evaluatePrescriptionInteractions(['Bactrim Süspansiyon'], { ageDays: 28 });
assert.strictEqual(neoSmxRes.hasHardStop, true);
const neoSmxAlert = neoSmxRes.alerts.find(a => a.ruleId === 'NEO_SULFONAMIDE_001')!;
assert.ok(neoSmxAlert, 'Rule NEO_SULFONAMIDE_001 must trigger');
assert.strictEqual(neoSmxAlert.tier, 1);
assert.strictEqual(neoSmxAlert.blocksConfirmation, true);
assert.ok(neoSmxAlert.message.includes('kernikterus'));
assert.ok(neoSmxAlert.message.includes('albümin'));

// 21.6 TC-HR-006: 8 Yaş Altında Doksisiklin ve Kene/Riketsiya İstisnası
// A. Rutin endikasyon (TIER 1 HARD STOP - Diş Lekelenmesi)
const tetChildRes = evaluatePrescriptionInteractions(['Monodoks 100mg'], { ageYears: 5, diagnosis: 'Bronşit' });
assert.strictEqual(tetChildRes.hasHardStop, true);
const tetChildAlert = tetChildRes.alerts.find(a => a.ruleId === 'PUD_TETRACYCLINE_AGE_001')!;
assert.ok(tetChildAlert);
assert.strictEqual(tetChildAlert.tier, 1);
assert.strictEqual(tetChildAlert.blocksConfirmation, true);
assert.ok(tetChildAlert.message.includes('diş renk değişikliği'));

// B. Kene / Riketsiya şüphesi (TIER 2 SOFT STOP - CDC/AAP İstisnası)
const tetTickRes = evaluatePrescriptionInteractions(['Monodoks 100mg'], { ageYears: 5, diagnosis: 'Kene ısırığı, şüpheli riketsiya' });
assert.strictEqual(tetTickRes.hasHardStop, false);
assert.strictEqual(tetTickRes.hasSoftStop, true);
const tetTickAlert = tetTickRes.alerts.find(a => a.ruleId === 'PUD_TETRACYCLINE_TICK_002')!;
assert.ok(tetTickAlert);
assert.strictEqual(tetTickAlert.tier, 2);
assert.strictEqual(tetTickAlert.blocksConfirmation, false);
assert.ok(tetTickAlert.message.includes('hayat kurtarıcıdır'));

// 21.7 TC-HR-007: Seftriakson + Kalsiyum Prematüre Postmenstrüel Yaş Kuralı (PMA ≤41 hafta)
// Hasta 35 günlük (>28 gün) ancak 33 haftalık prematüre doğmuş (PMA: 33 + 5 = 38 hafta ≤ 41 hafta) -> TIER 1 HARD STOP
const ceftPretermRes = evaluatePrescriptionInteractions(
  ['Rocephin', 'Ringer Laktat'],
  { ageDays: 35, gestationalAgeWeeks: 33 }
);
assert.strictEqual(ceftPretermRes.hasHardStop, true);
const ceftPretermAlert = ceftPretermRes.alerts.find(a => a.ruleId === 'NEO_CEFT_CA_001')!;
assert.ok(ceftPretermAlert, 'Must trigger NEO_CEFT_CA_001 for preterm with PMA <= 41 weeks');
assert.strictEqual(ceftPretermAlert.tier, 1);
assert.strictEqual(ceftPretermAlert.blocksConfirmation, true);

// 21.8 TC-HR-008: Gebelik Teratojen ve Fetotoksisite Hard Stopları (Dosya 3 Tablo 3)
// A. Retinoid (Roaccutane / Asitretin)
const pregRetRes = evaluatePrescriptionInteractions(['Roaccutane 20mg'], { isPregnant: true, trimester: 1 });
assert.strictEqual(pregRetRes.hasHardStop, true);
const pregRetAlert = pregRetRes.alerts.find(a => a.ruleId === 'PREG_RETINOID_001')!;
assert.ok(pregRetAlert);
assert.strictEqual(pregRetAlert.tier, 1);
assert.strictEqual(pregRetAlert.blocksConfirmation, true);
assert.ok(pregRetAlert.message.includes('Retinoid Embriyopatisi'));

// B. Valproik Asit
const pregVpaRes = evaluatePrescriptionInteractions(['Depakin 500mg'], { isPregnant: true });
assert.strictEqual(pregVpaRes.hasHardStop, true);
assert.ok(pregVpaRes.alerts.some(a => a.ruleId === 'PREG_VALPROATE_001'));

// C. RAAS Blokörü (Enalapril - 2. Trimester)
const pregRaasRes = evaluatePrescriptionInteractions(['Enap 10mg'], { isPregnant: true, trimester: 2 });
assert.strictEqual(pregRaasRes.hasHardStop, true);
const pregRaasAlert = pregRaasRes.alerts.find(a => a.ruleId === 'PREG_RAAS_001')!;
assert.ok(pregRaasAlert);
assert.strictEqual(pregRaasAlert.tier, 1);
assert.strictEqual(pregRaasAlert.blocksConfirmation, true);
assert.ok(pregRaasAlert.message.includes('Potter dizisi'));

// D. Metotreksat
const pregMtxRes = evaluatePrescriptionInteractions(['Trexan 10mg'], { isPregnant: true });
assert.strictEqual(pregMtxRes.hasHardStop, true);
assert.ok(pregMtxRes.alerts.some(a => a.ruleId === 'PREG_MTX_001'));

// E. Varfarin (Coumadin - 8. Gebelik Haftası)
const pregWarfRes = evaluatePrescriptionInteractions(['Coumadin 5mg'], { isPregnant: true, pregnancyWeeks: 8 });
assert.strictEqual(pregWarfRes.hasHardStop, true);
const pregWarfAlert = pregWarfRes.alerts.find(a => a.ruleId === 'PREG_WARFARIN_001')!;
assert.ok(pregWarfAlert);
assert.strictEqual(pregWarfAlert.tier, 1);
assert.strictEqual(pregWarfAlert.blocksConfirmation, true);
assert.ok(pregWarfAlert.message.includes('Fetal Varfarin Sendromu'));

// F. Sistemik NSAİİ (30. Gebelik Haftası - Duktus Kapanması)
const pregNsaidRes = evaluatePrescriptionInteractions(['Apranax 550mg'], { isPregnant: true, pregnancyWeeks: 30 });
assert.strictEqual(pregNsaidRes.hasHardStop, true);
const pregNsaidAlert = pregNsaidRes.alerts.find(a => a.ruleId === 'PREG_NSAID_001')!;
assert.ok(pregNsaidAlert);
assert.strictEqual(pregNsaidAlert.tier, 1);
assert.strictEqual(pregNsaidAlert.blocksConfirmation, true);
assert.ok(pregNsaidAlert.message.includes('duktus arteriyozus'));

// 21.9 TC-HR-009: Digoksin + Amiodaron (Zorunlu %50 Doz İndirimi - TIER 2 SOFT STOP)
const digAmioRes = evaluatePrescriptionInteractions(['Digoksin 0.25mg', 'Cordarone 200mg']);
assert.strictEqual(digAmioRes.hasHardStop, false);
assert.strictEqual(digAmioRes.hasSoftStop, true);
const digAmioAlert = digAmioRes.alerts.find(a => a.ruleId === 'DDI_DIGOXIN_AMIO_001')!;
assert.ok(digAmioAlert);
assert.strictEqual(digAmioAlert.tier, 2);
assert.strictEqual(digAmioAlert.blocksConfirmation, false);
assert.ok(digAmioAlert.alertTitle.includes('%50'));
assert.ok(digAmioAlert.recommendations.some(r => r.includes('%50')));

// 21.10 TC-HR-010: Varfarin + Flukonazol (CYP2C9 İnhibisyonu - TIER 2 SOFT STOP)
const warfFluRes = evaluatePrescriptionInteractions(['Coumadin 5mg', 'Triflucan 200mg']);
assert.strictEqual(warfFluRes.hasHardStop, false);
assert.strictEqual(warfFluRes.hasSoftStop, true);
const warfFluAlert = warfFluRes.alerts.find(a => a.ruleId === 'DDI_WARFARIN_CYP2C9_001')!;
assert.ok(warfFluAlert);
assert.strictEqual(warfFluAlert.tier, 2);
assert.strictEqual(warfFluAlert.blocksConfirmation, false);
assert.ok(warfFluAlert.message.includes('INR'));

// 21.11 TC-HR-011: Pediatrik Florokinolon (<18 Yaş - TIER 2 SOFT STOP)
const fqPedRes = evaluatePrescriptionInteractions(['Cipro 500mg'], { ageYears: 12, diagnosis: 'Sinüzit' });
assert.strictEqual(fqPedRes.hasHardStop, false);
assert.strictEqual(fqPedRes.hasSoftStop, true);
const fqPedAlert = fqPedRes.alerts.find(a => a.ruleId === 'PUD_FQ_AGE_001')!;
assert.ok(fqPedAlert);
assert.strictEqual(fqPedAlert.tier, 2);
assert.strictEqual(fqPedAlert.blocksConfirmation, false);
assert.ok(fqPedAlert.message.includes('artropati'));

// 21.12 TC-HR-012: Metformin + İyotlu Kontrast Madde (MALA Laktik Asidoz - TIER 2 SOFT STOP)
const metContrastRes = evaluatePrescriptionInteractions(['Glucophage 1000mg', 'Omnipaque 350']);
assert.strictEqual(metContrastRes.hasHardStop, false);
assert.strictEqual(metContrastRes.hasSoftStop, true);
const metContrastAlert = metContrastRes.alerts.find(a => a.ruleId === 'DDI_METFORMIN_CONTRAST_001')!;
assert.ok(metContrastAlert);
assert.strictEqual(metContrastAlert.tier, 2);
assert.strictEqual(metContrastAlert.blocksConfirmation, false);
assert.ok(metContrastAlert.alertTitle.includes('MALA'));

console.log('✓ Special High-Risk Interactions & Hard Stops verified (100% parity with Dosya 3)');

console.log('\n--- 22. VERIFYING RENAL DOSE MOSTELLER BSA DE-INDEXING & COCKCROFT-GAULT ENGINE (ADIM 12) ---');

// 22.1 TC-RD-001: Mosteller & DuBois BSA Exact Formulas
const bsaStandard = calculateMostellerBSA(175, 70);
assert.strictEqual(bsaStandard, 1.84);
const bsaDuboisStd = calculateDuboisBSA(175, 70);
assert.strictEqual(bsaDuboisStd, 1.85);

const bsaObese = calculateMostellerBSA(165, 105); // sqrt(165*105/3600) = sqrt(4.8125) = 2.1937 -> 2.19
assert.strictEqual(bsaObese, 2.19);

const bsaCachectic = calculateMostellerBSA(160, 38); // sqrt(160*38/3600) = sqrt(1.6888) = 1.2995 -> 1.30
assert.strictEqual(bsaCachectic, 1.30);

// 22.2 TC-RD-002: KDIGO 2024 Absolute GFR De-indexing & Inverse Indexing
// Obese: eGFR = 60 mL/min/1.73m², BSA = 2.19 m² -> (60 * 2.19) / 1.73 = 75.95 -> 76.0 mL/min
const absGfrObese = deindexEgfrToAbsolute(60, 2.19);
assert.strictEqual(absGfrObese, 76.0);

// Cachectic: eGFR = 60 mL/min/1.73m², BSA = 1.30 m² -> (60 * 1.30) / 1.73 = 45.08 -> 45.1 mL/min
const absGfrCachectic = deindexEgfrToAbsolute(60, 1.30);
assert.strictEqual(absGfrCachectic, 45.1);

// Inverse indexing
const indexedRestored = indexEgfrFromAbsolute(45.1, 1.30);
assert.strictEqual(indexedRestored, 60);

// 22.3 TC-RD-003: Devine IBW & ABW40 in Obesity vs Underweight
// Male 175 cm, 110 kg
const habitusObeseMale = analyzeBodyWeightHabitus(175, 110, 'male');
assert.strictEqual(habitusObeseMale.bmi, 35.9);
assert.strictEqual(habitusObeseMale.isObese, true);
assert.strictEqual(habitusObeseMale.isUnderweight, false);
assert.strictEqual(habitusObeseMale.ibwDevineKg, 70.5);
assert.strictEqual(habitusObeseMale.adjustedBodyWeightKg, 86.3); // 70.5 + 0.4*(110-70.5) = 86.3
assert.strictEqual(habitusObeseMale.recommendedCrClWeightKg, 86.3); // ABW40 used for CrCl in obesity

// Female 160 cm, 38 kg (Underweight / Cachexia)
const habitusCachecticFemale = analyzeBodyWeightHabitus(160, 38, 'female');
assert.strictEqual(habitusCachecticFemale.bmi, 14.8);
assert.strictEqual(habitusCachecticFemale.isObese, false);
assert.strictEqual(habitusCachecticFemale.isUnderweight, true);
assert.strictEqual(habitusCachecticFemale.ibwDevineKg, 52.4);
assert.strictEqual(habitusCachecticFemale.recommendedCrClWeightKg, 38); // Actual weight used to avoid overestimating

// 22.4 TC-RD-004: Cockcroft-Gault CrCl with Obesity ABW40 Adjustment
const cgObese = calculateCockcroftGaultCrCl({
  ageYears: 75,
  gender: 'male',
  serumCreatinineMgDl: 1.6,
  actualWeightKg: 110,
  heightCm: 168
});
assert.ok(cgObese);
assert.strictEqual(cgObese.isAdjustedForObesity, true);
assert.strictEqual(cgObese.crClActualWeight, 62.1); // (65 * 110) / (72 * 1.6) = 62.1
assert.strictEqual(cgObese.crClAdjustedWeight, 46.5); // (65 * 82.5) / (72 * 1.6) = 46.5
assert.strictEqual(cgObese.recommendedCrCl, 46.5); // ABW40 recommended

// 22.5 TC-RD-005: EHRA 2021 / KDIGO 2024 DOAC Obesity Discordance Detection
// Patient: Obese male, eGFR = 62 mL/min/1.73m², recommended CrCl = 46.5 mL/min (Delta = +15.5 mL/min >= 15)
const compEvalObese = evaluateComprehensiveRenalFunction({
  ageYears: 75,
  gender: 'male',
  heightCm: 168,
  weightKg: 110,
  serumCreatinineMgDl: 1.6,
  egfrIndexed: 62
}, ['Xarelto 20mg']);
assert.strictEqual(compEvalObese.isObesityDiscordant, true);
assert.strictEqual(compEvalObese.discrepancyDelta, 15.5);
assert.strictEqual(compEvalObese.clinicalAlerts.some(a => a.type === 'DOAC_OBESITY_OVERESTIMATION'), true);
const doacDrugGuide = compEvalObese.evaluatedDrugs.find(d => d.canonicalKey === 'rivaroxaban');
assert.ok(doacDrugGuide);
assert.strictEqual(doacDrugGuide.recommendedMetric, 'COCKCROFT_GAULT_CRCL');
assert.strictEqual(doacDrugGuide.clearanceValue, 46.5); // CrCl used, NOT 62!

// 22.6 TC-RD-006: Drug Category & Metric Identification
const rivaIdent = identifyRenalDrugCategory('Xarelto 15mg');
assert.strictEqual(rivaIdent.category, 'DOAC_COCKCROFT_MANDATORY');
assert.strictEqual(rivaIdent.metric, 'COCKCROFT_GAULT_CRCL');
assert.strictEqual(rivaIdent.tdmRecommended, false);

const apixIdent = identifyRenalDrugCategory('Eliquis 5mg');
assert.strictEqual(apixIdent.category, 'DOAC_COCKCROFT_MANDATORY');
assert.strictEqual(apixIdent.metric, 'COCKCROFT_GAULT_CRCL');

const vancIdent = identifyRenalDrugCategory('Vancocin 500mg');
assert.strictEqual(vancIdent.category, 'NARROW_THERAPEUTIC_INDEX');
assert.strictEqual(vancIdent.metric, 'ABSOLUTE_EGFR');
assert.strictEqual(vancIdent.tdmRecommended, true);

const digIdent = identifyRenalDrugCategory('Digoksin 0.25mg');
assert.strictEqual(digIdent.category, 'NARROW_THERAPEUTIC_INDEX');
assert.strictEqual(digIdent.metric, 'ABSOLUTE_EGFR');
assert.strictEqual(digIdent.tdmRecommended, true);

// 22.7 TC-RD-007: checkRenalDoseAdjustments Obese DOAC Clinical Hazard Prevention
// With eGFR = 62, Rivaroxaban would NOT trigger (threshold is 49).
// But with Cockcroft-Gault CrCl = 46.5, DOSE_REDUCTION is triggered!
const renalCheckObeseDoac = checkRenalDoseAdjustments({
  egfr: 62,
  ageYears: 75,
  gender: 'male',
  heightCm: 168,
  weightKg: 110,
  serumCreatinineMgDl: 1.6,
  drugs: ['Xarelto 20mg']
});
assert.strictEqual(renalCheckObeseDoac.isValid, true);
assert.strictEqual(renalCheckObeseDoac.alertsCount, 1);
const xareltoWarn = renalCheckObeseDoac.warnings![0];
assert.strictEqual(xareltoWarn.status, 'DOSE_REDUCTION');
assert.strictEqual(xareltoWarn.metricUsed, 'COCKCROFT_GAULT_CRCL');
assert.strictEqual(xareltoWarn.effectiveClearanceValue, 46.5);
assert.ok(xareltoWarn.message.includes('Cockcroft-Gault CrCl (46.5 mL/dak)'));

// 22.8 TC-RD-008: Cachectic De-indexing for Narrow Therapeutic Index (Vancomycin)
// Cachectic female: 160 cm, 38 kg, BSA = 1.30 m². Lab eGFR = 55 mL/min/1.73m² (Normal/Mild).
// De-indexed Absolute GFR = (55 * 1.30) / 1.73 = 41.3 mL/min.
// Vancomycin rule: maxEgfr: 49 -> DOSE_REDUCTION triggered!
const renalCheckCachecticVanc = checkRenalDoseAdjustments({
  egfr: 55,
  ageYears: 50,
  gender: 'female',
  heightCm: 160,
  weightKg: 38,
  drugs: ['Vancocin 1g']
});
assert.strictEqual(renalCheckCachecticVanc.isValid, true);
assert.strictEqual(renalCheckCachecticVanc.alertsCount, 1);
const vancWarn = renalCheckCachecticVanc.warnings![0];
assert.strictEqual(vancWarn.status, 'DOSE_REDUCTION');
assert.strictEqual(vancWarn.metricUsed, 'ABSOLUTE_EGFR');
assert.strictEqual(vancWarn.effectiveClearanceValue, 41.3);
assert.strictEqual(vancWarn.tdmRecommended, true);
assert.ok(vancWarn.message.includes('De-indekslenmiş Mutlak GFR (41.3 mL/dak)'));

// 22.9 TC-RD-009: Direct Creatinine input without explicit eGFR
const renalCheckScrOnly = checkRenalDoseAdjustments({
  ageYears: 65,
  gender: 'female',
  heightCm: 162,
  weightKg: 60,
  serumCreatinineMgDl: 2.2,
  drugs: ['Glucophage 1000mg']
});
assert.strictEqual(renalCheckScrOnly.isValid, true);
assert.ok(renalCheckScrOnly.egfr! < 30);
assert.strictEqual(renalCheckScrOnly.hasContraindication, true);

// 22.10 TC-RD-010: Backwards Compatibility (Legacy calls with only egfr and drugs)
const renalCheckLegacy = checkRenalDoseAdjustments({
  egfr: 25,
  drugs: ['Glifor 1000mg', 'Cipro 500mg']
});
assert.strictEqual(renalCheckLegacy.isValid, true);
assert.strictEqual(renalCheckLegacy.hasContraindication, true);
assert.strictEqual(renalCheckLegacy.alertsCount, 2);
assert.strictEqual(renalCheckLegacy.warnings![0].metricUsed, 'INDEXED_EGFR');

// 22.11 DDI-TC-004-FIXED: Obez Hastada Apiksaban Doz Uyarlaması ve CrCl / GFR İkilemi
// Hasta: 72 yaş, Kadın, 125 kg, 165 cm, Serum Kreatinin: 1.4 mg/dL, Standart eGFR: 41 mL/dak/1.73 m²
// İlaç: Apiksaban 5 mg tablet
const apixabanEval = evaluateApixabanDosing({
  ageYears: 72,
  gender: 'female',
  weightKg: 125,
  heightCm: 165,
  serumCreatinineMgDl: 1.4,
  egfrIndexed: 41,
  useInchGrid: true
});

assert.strictEqual(apixabanEval.rule_id, 'RENAL_DOAC_APIX_001');
assert.strictEqual(apixabanEval.metrics.bsa_mosteller_m2, 2.40);
assert.strictEqual(apixabanEval.metrics.absolute_gfr_ml_min, 56.9);
assert.strictEqual(apixabanEval.metrics.ibw_devine_kg, 57.0);
assert.strictEqual(apixabanEval.metrics.adjbw_kg, 84.2);
assert.strictEqual(apixabanEval.metrics.cockcroft_gault_tbw_ml_min, 71.7);
assert.strictEqual(apixabanEval.metrics.cockcroft_gault_adjbw_ml_min, 48.3);

// Apiksaban Doz Azaltım Kriterleri (Yaş ≥80, Kilo ≤60 kg, Kreatinin ≥1.5 mg/dL): 0 kriter met (< 2 kriter)
assert.strictEqual(apixabanEval.criteria.age80OrOlder, false);
assert.strictEqual(apixabanEval.criteria.weight60OrLess, false);
assert.strictEqual(apixabanEval.criteria.creatinine1Point5OrMore, false);
assert.strictEqual(apixabanEval.criteria.criteriaMetCount, 0);

// CrCl (AdjBW 48.3 mL/dak) ≥ 30 mL/dak olduğu için standart doz uygundur (5 mg BID)
assert.strictEqual(apixabanEval.isDoseReductionIndicated, false);
assert.strictEqual(apixabanEval.recommendedDose, '5 mg BID');
assert.strictEqual(apixabanEval.crClUsed, 48.3);
assert.strictEqual(apixabanEval.crClMetric, 'AdjBW');
assert.ok(apixabanEval.rationale.includes('EHRA 2021'));
assert.ok(apixabanEval.rationale.includes('5 mg BID güvenlidir'));

// Also verify comprehensive evaluation integration
const compApix = evaluateComprehensiveRenalFunction({
  ageYears: 72,
  gender: 'female',
  heightCm: 165,
  weightKg: 125,
  serumCreatinineMgDl: 1.4,
  egfrIndexed: 41,
  useInchGrid: true
}, ['Eliquis 5mg']);
const apixGuide = compApix.evaluatedDrugs.find(d => d.canonicalKey === 'apixaban');
assert.ok(apixGuide);
assert.strictEqual(apixGuide.ruleId, 'RENAL_DOAC_APIX_001');
assert.strictEqual(apixGuide.recommendedDose, '5 mg BID');
assert.strictEqual(apixGuide.clearanceValue, 48.3);

// 22.12 TC-RD-012: 135 Klinik Monograf Kartı ile Renal Kısıtlama Tutarlılığı (İbuprofen)
const ibupRenal = checkRenalDoseAdjustments({
  egfr: 22,
  drugs: ['Dolven 100mg/5ml']
});
assert.strictEqual(ibupRenal.alertsCount, 1);
assert.strictEqual(ibupRenal.hasContraindication, true);
assert.strictEqual(ibupRenal.warnings![0].status, 'CONTRAINDICATED');
assert.ok(ibupRenal.warnings![0].message.includes('Akut böbrek hasarı'));

// 22.13 TC-RD-013: Metotreksat Dar Terapötik İndeks & De-indeksleme Doğrulaması
const mtxRenal = checkRenalDoseAdjustments({
  egfr: 45,
  heightCm: 155,
  weightKg: 40, // Kaşektik: BSA = 1.31 m², Mutlak GFR = (45 * 1.31)/1.73 = 34.1 mL/dk
  drugs: ['Trexan 2.5mg']
});
assert.strictEqual(mtxRenal.alertsCount, 1);
assert.strictEqual(mtxRenal.warnings![0].status, 'DOSE_REDUCTION');
assert.strictEqual(mtxRenal.warnings![0].metricUsed, 'ABSOLUTE_EGFR');
assert.strictEqual(mtxRenal.warnings![0].tdmRecommended, true);

// 22.14 TC-RD-014: Sitagliptin Monograf Tutarlılığı (eGFR <30 -> 25 mg)
const sitaRenal = checkRenalDoseAdjustments({
  egfr: 28,
  drugs: ['Januvia 100mg']
});
assert.strictEqual(sitaRenal.alertsCount, 1);
assert.strictEqual(sitaRenal.warnings![0].status, 'DOSE_REDUCTION');
assert.ok(sitaRenal.warnings![0].message.includes('25 mg'));

// 22.15 TC-RD-015: Asiklovir Monograf Tutarlılığı (eGFR <10 -> 24 saatte bir %50 doz)
const acycRenal = checkRenalDoseAdjustments({
  egfr: 8,
  drugs: ['Zovirax 400mg']
});
assert.strictEqual(acycRenal.alertsCount, 1);
assert.strictEqual(acycRenal.warnings![0].status, 'DOSE_REDUCTION');
assert.ok(acycRenal.warnings![0].message.includes('24 saat'));

// 22.16 TC-RD-016: Gentamisin Dar Terapötik İndeks & TDM
const gentaRenal = checkRenalDoseAdjustments({
  egfr: 25,
  drugs: ['Gensu 80mg']
});
assert.strictEqual(gentaRenal.alertsCount, 1);
assert.strictEqual(gentaRenal.warnings![0].tdmRecommended, true);
assert.ok(gentaRenal.warnings![0].message.includes('TDM'));

console.log('✓ Renal Dose Mosteller BSA De-indexing & Cockcroft-Gault Engine verified (100% parity with Dosya 3)');

console.log('\n--- 23. VERIFYING AAP 2022 FULL JAUNDICE ENGINE & LINEAR INTERPOLATION (ADIM 13) ---');

// 23.1 TC-J-001: Truncation Rule (Tamamlanmış Hafta Kuralı - Paragraph 542 & 577)
const trunc36w5d = truncateGestationalWeeks(36, 5);
assert.strictEqual(trunc36w5d.truncatedWeeks, 36);
assert.strictEqual(trunc36w5d.isPreterm, false);

const trunc36_7 = truncateGestationalWeeks(36.7);
assert.strictEqual(trunc36_7.truncatedWeeks, 36);
assert.strictEqual(trunc36_7.isPreterm, false);

const trunc34w6d = truncateGestationalWeeks(34, 6);
assert.strictEqual(trunc34w6d.truncatedWeeks, 34);
assert.strictEqual(trunc34w6d.isPreterm, true);

// 23.2 TC-J-002: Exact Hourly Knot Interpolation (Table 0 Verified Values)
// 38 wk, No Risk: 24h: 11.0, 48h: 14.7, 72h: 17.3, 96h: 19.3, 120h: 20.0, 168h: 20.5, 336h: 20.5
const t38_24 = calculateAap2022Thresholds(38, false, 24);
assert.strictEqual(t38_24.phototherapy, 11.0);
assert.strictEqual(t38_24.exchange, 20.5);

const t38_48 = calculateAap2022Thresholds(38, false, 48);
assert.strictEqual(t38_48.phototherapy, 14.7); // Matches TC-01!
assert.strictEqual(t38_48.exchange, 23.0);

const t38_72 = calculateAap2022Thresholds(38, false, 72);
assert.strictEqual(t38_72.phototherapy, 17.3);
assert.strictEqual(t38_72.exchange, 25.0);

// 40 wk, No Risk at 36h: Midpoint between 24h (12.0) and 48h (16.0) -> 14.0 mg/dL (Matches TC-08!)
const t40_36 = calculateAap2022Thresholds(40, false, 36);
assert.strictEqual(t40_36.phototherapy, 14.0);
assert.strictEqual(t40_36.exchange, 22.75); // Midpoint of 21.5 and 24.0

// 36 wk, With Risk at 72h: Exactly 14.9 mg/dL (Matches TC-03!)
const t36_72_risk = calculateAap2022Thresholds(36, true, 72);
assert.strictEqual(t36_72_risk.phototherapy, 14.9);
assert.strictEqual(t36_72_risk.exchange, 21.8);

// 23.2B AAP 2022 Kan Değişimi Plato Monotonluk Denetimi (336. Saat ve Tüm Zaman Dilimleri)
// Gestasyonel yaş azaldıkça eşik kesinlikle monotonic azalmalıdır (T_40 >= T_39 >= ... >= T_35)
const exNoRisk336 = [40, 39, 38, 37, 36, 35].map(ga => calculateAap2022Thresholds(ga, false, 336).exchange);
assert.strictEqual(exNoRisk336[0], 27.0); // 40w
assert.strictEqual(exNoRisk336[1], 26.5); // 39w
assert.strictEqual(exNoRisk336[2], 26.0); // 38w
assert.strictEqual(exNoRisk336[3], 25.5); // 37w
assert.strictEqual(exNoRisk336[4], 25.0); // 36w
assert.strictEqual(exNoRisk336[5], 24.5); // 35w
for (let i = 0; i < exNoRisk336.length - 1; i++) {
  assert.ok(exNoRisk336[i] >= exNoRisk336[i + 1], `336h exchange threshold must decrease with lower GA: ${exNoRisk336[i]} >= ${exNoRisk336[i + 1]}`);
}

// Tüm saat kilometre taşlarında (0, 12, 24, 48, 72, 96, 120, 168, 336h) monotonluk denetimi
const milestoneHours = [0, 12, 24, 48, 72, 96, 120, 168, 336];
for (const h of milestoneHours) {
  const curveRow = [40, 39, 38, 37, 36, 35].map(ga => calculateAap2022Thresholds(ga, false, h).exchange);
  for (let i = 0; i < curveRow.length - 1; i++) {
    assert.ok(curveRow[i] >= curveRow[i + 1], `At ${h}h, exchange threshold for GA must be monotonic non-increasing: ${curveRow[i]} >= ${curveRow[i + 1]}`);
  }
}

// 23.3 TC-01: Sınırda Fototerapi Eşiği Kontrolü (Table 11 TC-01)
// GH: 38 0/7 hf, Postnatal Yaş: 48 saat, TSB: 16.2 mg/dL, Risk: Yok
const tc01 = evaluateAap2022Jaundice({
  gestationalWeeks: 38,
  gestationalDays: 0,
  ageHours: 48,
  totalBilirubin: 16.2,
  hasNeurotoxicityRisk: false
});
assert.strictEqual(tc01.isValid, true);
assert.strictEqual(tc01.thresholds.phototherapy, 14.7);
assert.strictEqual(tc01.deltaFromPhototherapy, -1.5);
assert.strictEqual(tc01.status, 'PHOTOTHERAPY_REQUIRED');
assert.ok(tc01.interpretation.includes('Yoğun LED Fototerapi Başlatılmalıdır'));

// 23.4 TC-02: Prematüre Güvenlik Kilidi ve Kesme Kuralı (Table 11 TC-02)
// GH: 34 6/7 hf, Postnatal Yaş: 36 saat, TSB: 11.0 mg/dL, Risk: DAT Negatif
const tc02 = evaluateAap2022Jaundice({
  gestationalWeeks: 34,
  gestationalDays: 6,
  ageHours: 36,
  totalBilirubin: 11.0,
  hasNeurotoxicityRisk: false
});
assert.strictEqual(tc02.gestationalAge.isPreterm, true);
assert.strictEqual(tc02.gestationalAge.isAapBlocked, true);
assert.strictEqual(tc02.status, 'PRETERM_ROUTED');
assert.ok(tc02.interpretation.includes('AAP 2022 uygulanamaz'));
assert.ok(tc02.clinicalAlerts.some(a => a.type === 'PRETERM_LOCK'));
assert.ok(tc02.pretermGuidance);
assert.ok(tc02.pretermGuidance.maiselsPhototherapyRange.includes('12 - 14'));

// 23.5 TC-03: Tamamlanmış Hafta ve Nörotoksisite Kayması (Table 11 TC-03)
// GH: 36 5/7 hf, Postnatal Yaş: 72 saat, TSB: 15.0 mg/dL, Risk: Albumin 2.8 g/dL
const tc03 = evaluateAap2022Jaundice({
  gestationalWeeks: 36,
  gestationalDays: 5,
  ageHours: 72,
  totalBilirubin: 15.0,
  albuminGPerDl: 2.8
});
assert.strictEqual(tc03.gestationalAge.truncatedWeeks, 36);
assert.strictEqual(tc03.hasNeurotoxicityRisk, true); // Albumin < 3.0 automatically triggered neuro risk!
assert.strictEqual(tc03.thresholds.phototherapy, 14.9);
assert.strictEqual(tc03.status, 'PHOTOTHERAPY_REQUIRED');

// 23.6 TC-04: TcB Doğrulama Eşiği Sınırı (Table 11 TC-04)
// GH: 40 0/7 hf, Postnatal Yaş: 60 saat, TcB: 17.0 mg/dL, Risk: Yok
const tc04 = evaluateAap2022Jaundice({
  gestationalWeeks: 40,
  gestationalDays: 0,
  ageHours: 60,
  totalBilirubin: 17.0,
  measurementType: 'TcB',
  hasNeurotoxicityRisk: false
});
assert.strictEqual(tc04.requiresTsbConfirmation, true);
assert.ok(tc04.clinicalAlerts.some(a => a.type === 'TCB_CONFIRMATION'));
assert.ok(tc04.tsbConfirmationReason!.includes('STAT kan TSB'));

// 23.7 TC-05: Bakım Eskalasyonu Acil Alarmı (Table 11 TC-05)
// GH: 39 0/7 hf, Postnatal Yaş: 48 saat, TSB: 22.5 mg/dL, Risk: Yok
const tc05 = evaluateAap2022Jaundice({
  gestationalWeeks: 39,
  gestationalDays: 0,
  ageHours: 48,
  totalBilirubin: 22.5,
  hasNeurotoxicityRisk: false
});
assert.strictEqual(tc05.status, 'ESCALATION_OF_CARE');
assert.strictEqual(tc05.alertClass, 'danger');
assert.ok(tc05.clinicalAlerts.some(a => a.type === 'ESCALATION'));
assert.ok(tc05.recommendations.some(r => r.includes('YYBÜ yatışı')));

// 23.8 TC-06: B/A Oranı Kan Değişimi Tetiklemesi (Table 11 TC-06)
// GH: 38 0/7 hf, Postnatal Yaş: 72 saat, TSB: 23.5 mg/dL, Albümin: 2.8 g/dL, Risk: DAT Pozitif
const tc06 = evaluateAap2022Jaundice({
  gestationalWeeks: 38,
  gestationalDays: 0,
  ageHours: 72,
  totalBilirubin: 23.5,
  albuminGPerDl: 2.8,
  hasNeurotoxicityRisk: true
});
assert.strictEqual(tc06.thresholds.exchange, 23.0);
assert.ok(tc06.bilirubinAlbuminRatio);
assert.strictEqual(tc06.bilirubinAlbuminRatio.ratio, 8.39);
assert.strictEqual(tc06.bilirubinAlbuminRatio.threshold, 7.2);
assert.strictEqual(tc06.bilirubinAlbuminRatio.isThresholdExceeded, true);
assert.strictEqual(tc06.status, 'EXCHANGE_TRANSFUSION_REQUIRED'); // Triggered by B/A ratio!
assert.ok(tc06.clinicalAlerts.some(a => a.type === 'BA_RATIO'));

// 23.9 TC-07: Yaşamın İlk 12 Saati Patoloji Alarmı (Table 11 TC-07)
// GH: 37 0/7 hf, Postnatal Yaş: 8 saat, Klinik: Belirgin Sarılık
const tc07 = evaluateAap2022Jaundice({
  gestationalWeeks: 37,
  ageHours: 8,
  totalBilirubin: 7.5
});
assert.strictEqual(tc07.status, 'FIRST_12_HOURS_CRITICAL');
assert.strictEqual(tc07.alertClass, 'danger');
assert.ok(tc07.interpretation.includes('PATOLOJİK HEMOLİZ DÜŞÜNÜLMELİDİR'));
assert.ok(tc07.clinicalAlerts.some(a => a.type === 'FIRST_12H_PATHOLOGY'));

// 23.10 TC-08: Taburculuk Sonrası Takip Şeması (Table 11 TC-08)
// GH: 40 0/7 hf, Postnatal Yaş: 36 saat, TSB: 10.0 mg/dL, Taburculuk Planı
const tc08 = evaluateAap2022Jaundice({
  gestationalWeeks: 40,
  ageHours: 36,
  totalBilirubin: 10.0,
  hasNeurotoxicityRisk: false,
  isDischargePlanning: true
});
assert.strictEqual(tc08.thresholds.phototherapy, 14.0);
assert.strictEqual(tc08.deltaFromPhototherapy, 4.0);
assert.strictEqual(tc08.status, 'LOW_RISK');
assert.ok(tc08.followUpRecommendation.includes('1 ila 2 gün (24–48 saat) içinde TSB veya TcB kontrolü'));

// 23.11 Direct Bilirubin Safety Shield (Never subtract direct from total)
const directCheck = evaluateAap2022Jaundice({
  gestationalWeeks: 39,
  ageHours: 72,
  totalBilirubin: 16.0,
  directBilirubinMgDl: 9.0 // > 50%
});
assert.strictEqual(directCheck.directBilirubinAnalysis?.isCholestasisSuspected, true);
assert.ok(directCheck.clinicalAlerts.some(a => a.type === 'CHOLESTASIS_BRONZE'));

console.log('✓ AAP 2022 Full Jaundice Engine & Linear Interpolation verified (100% parity with Dosya 4)');

console.log('\n--- 24. VERIFYING NEUROTOXICITY RISK STRATIFICATION, B/A RATIO & ESCALATION OF CARE (ADIM 14) ---');

// 24.1 TC-NR-001: Multi-Risk Factor Synthesis
const tcNr01 = evaluateAap2022Jaundice({
  gestationalWeeks: 38,
  ageHours: 48,
  totalBilirubin: 14.5,
  riskFactors: {
    hypoalbuminemia: false,
    isoimmuneHemolysis: true,
    sepsis: true
  }
});
assert.strictEqual(tcNr01.hasNeurotoxicityRisk, true);
assert.ok(tcNr01.riskFactorDetails);
assert.strictEqual(tcNr01.riskFactorDetails.isoimmuneHemolysis, true);
assert.strictEqual(tcNr01.riskFactorDetails.sepsis, true);
assert.strictEqual(tcNr01.riskFactorDetails.activeRisks.length, 2);
assert.strictEqual(tcNr01.thresholds.phototherapy, 14.0); // 38w with risk at 48h
assert.strictEqual(tcNr01.status, 'PHOTOTHERAPY_REQUIRED');

// 24.2 TC-NR-002: KAS 7 Rate of Rise in First 24 Hours (>=0.3 mg/dL/h)
const tcNr02 = evaluateAap2022Jaundice({
  gestationalWeeks: 38,
  ageHours: 20,
  totalBilirubin: 8.0,
  previousTsbMgDl: 4.5,
  previousAgeHours: 10
});
assert.ok(tcNr02.rateOfRiseAnalysis);
assert.strictEqual(tcNr02.rateOfRiseAnalysis.rateMgDlPerHour, 0.35);
assert.strictEqual(tcNr02.rateOfRiseAnalysis.isRapidRise, true);
assert.strictEqual(tcNr02.rateOfRiseAnalysis.thresholdMgDlPerHour, 0.3);
assert.strictEqual(tcNr02.hasNeurotoxicityRisk, true); // Automatic neuro risk activation!
assert.ok(tcNr02.clinicalAlerts.some(a => a.type === 'HEMOLYSIS_RATE' && a.severity === 'CRITICAL'));

// 24.3 TC-NR-003: KAS 7 Rate of Rise After 24 Hours (>=0.2 mg/dL/h)
const tcNr03 = evaluateAap2022Jaundice({
  gestationalWeeks: 39,
  ageHours: 36,
  totalBilirubin: 14.0,
  previousTsbMgDl: 11.0,
  previousAgeHours: 24
});
assert.ok(tcNr03.rateOfRiseAnalysis);
assert.strictEqual(tcNr03.rateOfRiseAnalysis.rateMgDlPerHour, 0.25);
assert.strictEqual(tcNr03.rateOfRiseAnalysis.isRapidRise, true);
assert.strictEqual(tcNr03.rateOfRiseAnalysis.thresholdMgDlPerHour, 0.2);
assert.strictEqual(tcNr03.hasNeurotoxicityRisk, true);
assert.ok(tcNr03.clinicalAlerts.some(a => a.type === 'HEMOLYSIS_RATE'));

// 24.4 TC-NR-004: Physiological Rate of Rise (<0.2 mg/dL/h)
const tcNr04 = evaluateAap2022Jaundice({
  gestationalWeeks: 40,
  ageHours: 48,
  totalBilirubin: 10.0,
  previousTsbMgDl: 8.5,
  previousAgeHours: 36
});
assert.ok(tcNr04.rateOfRiseAnalysis);
assert.strictEqual(tcNr04.rateOfRiseAnalysis.rateMgDlPerHour, 0.13);
assert.strictEqual(tcNr04.rateOfRiseAnalysis.isRapidRise, false);
assert.ok(!tcNr04.clinicalAlerts.some(a => a.type === 'HEMOLYSIS_RATE'));

// 24.5 TC-NR-005: G6PD Deficiency Alert & 3-Month Retest Advisory
const tcNr05 = evaluateAap2022Jaundice({
  gestationalWeeks: 38,
  ageHours: 60,
  totalBilirubin: 13.0,
  riskFactors: { g6pdDeficiency: true }
});
assert.strictEqual(tcNr05.hasNeurotoxicityRisk, true);
const g6pdAlert = tcNr05.clinicalAlerts.find(a => a.type === 'G6PD_RETEST_REMINDER');
assert.ok(g6pdAlert);
assert.ok(g6pdAlert.message.includes('3 ay sonra test tekrarı'));
assert.ok(g6pdAlert.message.includes('retikülosit'));

// 24.6 TC-NR-006: Acute Bilirubin Encephalopathy (ABE) Emergency Immediate Exchange
const tcNr06 = evaluateAap2022Jaundice({
  gestationalWeeks: 39,
  ageHours: 48,
  totalBilirubin: 15.0, // Below Exchange threshold of 23.5 mg/dL!
  abeSymptoms: {
    retrocollis: true,
    opisthotonos: true,
    highPitchedCry: true
  }
});
assert.ok(tcNr06.abeAssessment);
assert.strictEqual(tcNr06.abeAssessment.isImmediateExchangeTriggered, true);
assert.strictEqual(tcNr06.status, 'EXCHANGE_TRANSFUSION_REQUIRED');
assert.strictEqual(tcNr06.alertClass, 'danger');
assert.ok(tcNr06.clinicalAlerts.some(a => a.type === 'ABE_EMERGENCY' && a.severity === 'CRITICAL'));
assert.ok(tcNr06.interpretation.includes('AKUT BİLİRUBİN ENSEFALOPATİSİ'));

// 24.7 TC-NR-007: Escalation of Care Protocol & STAT Order Bundle (KAS 17)
const tcNr07 = evaluateAap2022Jaundice({
  gestationalWeeks: 38,
  ageHours: 72,
  totalBilirubin: 23.5, // 38w No Risk: Exchange is 25.0, Escalation is 23.0
  hasNeurotoxicityRisk: false
});
assert.strictEqual(tcNr07.status, 'ESCALATION_OF_CARE');
assert.ok(tcNr07.escalationProtocol);
assert.strictEqual(tcNr07.escalationProtocol.isEscalationActive, true);
assert.strictEqual(tcNr07.escalationProtocol.urgency, 'MEDICAL_EMERGENCY');
assert.strictEqual(tcNr07.escalationProtocol.statOrderBundle.length, 8);
assert.strictEqual(tcNr07.escalationProtocol.reassessmentIntervalHours, 2);
assert.ok(tcNr07.escalationProtocol.phototherapyRegimen.includes('≥ 30 µW/cm²/nm'));
assert.ok(tcNr07.escalationProtocol.hydrationProtocol.includes('kesinlikle yasaktır'));

// 24.8 TC-NR-008: Isoimmune Hemolysis in Escalation -> IVIG Protocol
const tcNr08 = evaluateAap2022Jaundice({
  gestationalWeeks: 38,
  ageHours: 72,
  totalBilirubin: 21.5, // 38w With Risk: Exchange is 23.0, Escalation is 21.0
  riskFactors: { isoimmuneHemolysis: true }
});
assert.strictEqual(tcNr08.status, 'ESCALATION_OF_CARE');
assert.ok(tcNr08.escalationProtocol);
assert.ok(tcNr08.escalationProtocol.ivigProtocol);
assert.strictEqual(tcNr08.escalationProtocol.ivigProtocol.recommended, true);
assert.strictEqual(tcNr08.escalationProtocol.ivigProtocol.dose, '0.5 – 1.0 g/kg IV infüzyon, 2 saatte verilir.');
assert.ok(tcNr08.recommendations.some(r => r.includes('IVIG infüzyonu')));

// 24.9 TC-NR-009: B/A Ratio Tiers (8.0, 7.2, 6.8 mg/g)
const baTier1 = evaluateBilirubinAlbuminRatio({ tsbMgDl: 22.0, albuminGPerDl: 3.0, gestationalWeeks: 40, hasRiskFactors: false });
assert.ok(baTier1);
assert.strictEqual(baTier1.threshold, 8.0);
assert.strictEqual(baTier1.ratio, 7.33);
assert.strictEqual(baTier1.isThresholdExceeded, false);

const baTier2 = evaluateBilirubinAlbuminRatio({ tsbMgDl: 22.0, albuminGPerDl: 3.0, gestationalWeeks: 38, hasRiskFactors: true });
assert.ok(baTier2);
assert.strictEqual(baTier2.threshold, 7.2);
assert.strictEqual(baTier2.ratio, 7.33);
assert.strictEqual(baTier2.isThresholdExceeded, true);

const baTier3 = evaluateBilirubinAlbuminRatio({ tsbMgDl: 21.0, albuminGPerDl: 3.0, gestationalWeeks: 36, hasRiskFactors: true });
assert.ok(baTier3);
assert.strictEqual(baTier3.threshold, 6.8);
assert.strictEqual(baTier3.ratio, 7.0);
assert.strictEqual(baTier3.isThresholdExceeded, true);

// 24.10 TC-NR-010: B/A Ratio Kan Değişimi Tetiklemesi (Sub-threshold TSB with High B/A)
const tcNr10 = evaluateAap2022Jaundice({
  gestationalWeeks: 38,
  ageHours: 72,
  totalBilirubin: 22.5, // Below Exchange threshold of 23.0 mg/dL!
  albuminGPerDl: 2.8,
  riskFactors: { isoimmuneHemolysis: true }
});
assert.strictEqual(tcNr10.thresholds.exchange, 23.0);
assert.ok(tcNr10.bilirubinAlbuminRatio);
assert.strictEqual(tcNr10.bilirubinAlbuminRatio.ratio, 8.04);
assert.strictEqual(tcNr10.bilirubinAlbuminRatio.threshold, 7.2);
assert.strictEqual(tcNr10.bilirubinAlbuminRatio.isThresholdExceeded, true);
assert.strictEqual(tcNr10.status, 'EXCHANGE_TRANSFUSION_REQUIRED');
assert.ok(tcNr10.interpretation.includes('B/A oranı'));
assert.ok(tcNr10.clinicalAlerts.some(a => a.type === 'BA_RATIO'));

console.log('✓ Neurotoxicity Risk Stratification, B/A Ratio & Escalation of Care verified (100% parity with Dosya 4)');

console.log('\n--- 25. VERIFYING PRETERM <35W MAISELS 2012 CONSENSUS, TND/NICE FORMULA & FLUID PROTOCOLS (ADIM 15) ---');

// 25.1 TC-PR-001: Band 1 (<28 0/7 wk PMA)
const tcPr01NoRisk = evaluatePretermJaundice({
  gestationalWeeks: 26,
  gestationalDays: 0,
  ageHours: 24, // PMA: 26.14w (<28w)
  totalBilirubin: 5.5,
  hasNeurotoxicityRisk: false
});
assert.strictEqual(tcPr01NoRisk.activeMaiselsBand.bandId, '<28');
assert.strictEqual(tcPr01NoRisk.activeMaiselsBand.phototherapyMinMgDl, 5.0);
assert.strictEqual(tcPr01NoRisk.activeMaiselsBand.phototherapyMaxMgDl, 6.0);
assert.strictEqual(tcPr01NoRisk.activeMaiselsBand.phototherapyMinUmolL, 85);
assert.strictEqual(tcPr01NoRisk.activeMaiselsBand.phototherapyMaxUmolL, 103);
assert.strictEqual(tcPr01NoRisk.activeMaiselsBand.exchangeMinMgDl, 11.0);
assert.strictEqual(tcPr01NoRisk.activeMaiselsBand.exchangeMaxMgDl, 14.0);
assert.strictEqual(tcPr01NoRisk.effectiveThresholds.phototherapy, 6.0);
assert.strictEqual(tcPr01NoRisk.status, 'CLOSE_MONITORING');

const tcPr01WithRisk = evaluatePretermJaundice({
  gestationalWeeks: 26,
  gestationalDays: 0,
  ageHours: 24,
  totalBilirubin: 5.5,
  hasNeurotoxicityRisk: true
});
assert.strictEqual(tcPr01WithRisk.effectiveThresholds.phototherapy, 5.0);
assert.strictEqual(tcPr01WithRisk.effectiveThresholds.exchange, 11.0);
assert.strictEqual(tcPr01WithRisk.status, 'PHOTOTHERAPY_REQUIRED');

// 25.2 TC-PR-002: Band 2 (28 0/7 - 29 6/7 wk PMA)
const tcPr02 = evaluatePretermJaundice({
  gestationalWeeks: 28,
  gestationalDays: 0,
  ageHours: 48, // PMA: 28.29w
  totalBilirubin: 7.0,
  hasNeurotoxicityRisk: true
});
assert.strictEqual(tcPr02.activeMaiselsBand.bandId, '28-29');
assert.strictEqual(tcPr02.activeMaiselsBand.phototherapyMinMgDl, 6.0);
assert.strictEqual(tcPr02.activeMaiselsBand.phototherapyMaxMgDl, 8.0);
assert.strictEqual(tcPr02.effectiveThresholds.phototherapy, 6.0);
assert.strictEqual(tcPr02.effectiveThresholds.exchange, 12.0);
assert.strictEqual(tcPr02.status, 'PHOTOTHERAPY_REQUIRED');

// 25.3 TC-PR-003: Band 3 (30 0/7 - 31 6/7 wk PMA)
const tcPr03 = evaluatePretermJaundice({
  gestationalWeeks: 30,
  gestationalDays: 0,
  ageHours: 72, // PMA: 30.43w
  totalBilirubin: 9.0,
  hasNeurotoxicityRisk: true
});
assert.strictEqual(tcPr03.activeMaiselsBand.bandId, '30-31');
assert.strictEqual(tcPr03.activeMaiselsBand.phototherapyMinMgDl, 8.0);
assert.strictEqual(tcPr03.activeMaiselsBand.phototherapyMaxMgDl, 10.0);
assert.strictEqual(tcPr03.activeMaiselsBand.exchangeMinMgDl, 13.0);
assert.strictEqual(tcPr03.activeMaiselsBand.exchangeMaxMgDl, 16.0);
assert.strictEqual(tcPr03.effectiveThresholds.phototherapy, 8.0);
assert.strictEqual(tcPr03.effectiveThresholds.exchange, 13.0);
assert.strictEqual(tcPr03.status, 'PHOTOTHERAPY_REQUIRED');

// 25.4 TC-PR-004: Band 4 (32 0/7 - 33 6/7 wk PMA)
const tcPr04 = evaluatePretermJaundice({
  gestationalWeeks: 32,
  gestationalDays: 0,
  ageHours: 72, // PMA: 32.43w
  totalBilirubin: 11.0,
  hasNeurotoxicityRisk: true
});
assert.strictEqual(tcPr04.activeMaiselsBand.bandId, '32-33');
assert.strictEqual(tcPr04.activeMaiselsBand.phototherapyMinMgDl, 10.0);
assert.strictEqual(tcPr04.activeMaiselsBand.phototherapyMaxMgDl, 12.0);
assert.strictEqual(tcPr04.activeMaiselsBand.exchangeMinMgDl, 15.0);
assert.strictEqual(tcPr04.activeMaiselsBand.exchangeMaxMgDl, 18.0);
assert.strictEqual(tcPr04.status, 'PHOTOTHERAPY_REQUIRED');

// 25.5 TC-PR-005: Band 5 (34 0/7 - 34 6/7 wk PMA)
const tcPr05 = evaluatePretermJaundice({
  gestationalWeeks: 34,
  gestationalDays: 0,
  ageHours: 24, // PMA: 34.14w
  totalBilirubin: 13.0,
  hasNeurotoxicityRisk: true
});
assert.strictEqual(tcPr05.activeMaiselsBand.bandId, '34');
assert.strictEqual(tcPr05.activeMaiselsBand.phototherapyMinMgDl, 12.0);
assert.strictEqual(tcPr05.activeMaiselsBand.phototherapyMaxMgDl, 14.0);
assert.strictEqual(tcPr05.activeMaiselsBand.exchangeMinMgDl, 17.0);
assert.strictEqual(tcPr05.activeMaiselsBand.exchangeMaxMgDl, 19.0);
assert.strictEqual(tcPr05.status, 'PHOTOTHERAPY_REQUIRED');

// 25.6 TC-PR-006: Stanford Premie BiliRecs Clamping Rule (PMA >= 35w)
const tcPr06 = evaluatePretermJaundice({
  gestationalWeeks: 28,
  gestationalDays: 0,
  ageHours: 1344, // 8 weeks chronological age -> PMA = 36.0w
  totalBilirubin: 13.5,
  hasNeurotoxicityRisk: false
});
assert.strictEqual(tcPr06.isPmaClamped, true);
assert.strictEqual(tcPr06.activeMaiselsBand.bandId, '34');
assert.strictEqual(tcPr06.effectiveThresholds.phototherapy, 14.0); // Clamped to 34w ceiling!
assert.strictEqual(tcPr06.effectiveThresholds.exchange, 19.0);
const clampAlert = tcPr06.clinicalAlerts.find(a => a.type === 'PRETERM_PMA_CLAMPED_WARNING');
assert.ok(clampAlert);
assert.ok(clampAlert.message.includes('Stanford Premie BiliRecs'));
assert.ok(clampAlert.message.includes('34 0/7 - 34 6/7'));

// 25.7 TC-PR-007: ELBW (<750g) Irradiance Safety Shield
const tcPr07 = evaluatePretermJaundice({
  gestationalWeeks: 26,
  birthWeightGrams: 680,
  ageHours: 48,
  totalBilirubin: 5.5
});
assert.strictEqual(tcPr07.hasElbwIrradianceShield, true);
const elbwAlert = tcPr07.clinicalAlerts.find(a => a.type === 'PRETERM_IRRADIANCE_WARNING');
assert.ok(elbwAlert);
assert.strictEqual(elbwAlert.severity, 'CRITICAL');
assert.ok(elbwAlert.message.includes('15–20 µW/cm²/nm'));
assert.ok(elbwAlert.message.includes('mortalite'));

// 25.8 TC-PR-008: TND 2023 / NICE CG98 Preterm Dynamic Ramp (36h vs 72h)
const tndRamp = calculatePretermTndNiceThreshold({ gestationalWeeks: 30, ageHours: 36 });
assert.strictEqual(tndRamp.plateauThresholdMgDl, 12.0);
assert.strictEqual(tndRamp.dynamicThresholdMgDl, 6.0); // 36/72 * 12.0 = 6.0
assert.strictEqual(tndRamp.niceUmolLPlateau, 200); // 30*10 - 100 = 200
assert.strictEqual(tndRamp.niceUmolLDynamic, 100); // 36/72 * 200 = 100
assert.strictEqual(tndRamp.isRamping, true);

const tndPlateau = calculatePretermTndNiceThreshold({ gestationalWeeks: 30, ageHours: 72 });
assert.strictEqual(tndPlateau.dynamicThresholdMgDl, 12.0);
assert.strictEqual(tndPlateau.niceUmolLDynamic, 200);
assert.strictEqual(tndPlateau.isRamping, false);

// 25.9 TC-PR-009: Preterm Fluid Protocol for ELBW (<1000g, 80-90% Humidity) - TND Table 7
const fluidElbwDay1 = calculateNeonatalFluid({ weightKg: 0.85, ageDays: 0 });
assert.ok(fluidElbwDay1);
assert.strictEqual(fluidElbwDay1.weightCategory, 'PRETERM_ELBW');
assert.strictEqual(fluidElbwDay1.mlPerKgRange, '80-90');
assert.strictEqual(fluidElbwDay1.pathologicalLossThresholdPercent, 15.0);
assert.ok(fluidElbwDay1.incubatorHumidityRecommendation && fluidElbwDay1.incubatorHumidityRecommendation.includes('%80–90'));

const fluidElbwDay2 = calculateNeonatalFluid({ weightKg: 0.85, ageDays: 1 });
assert.ok(fluidElbwDay2);
assert.strictEqual(fluidElbwDay2.mlPerKgRange, '90-100');

const fluidElbwDay3 = calculateNeonatalFluid({ weightKg: 0.85, ageDays: 2 });
assert.ok(fluidElbwDay3);
assert.strictEqual(fluidElbwDay3.mlPerKgRange, '110-120');

const fluidElbwMaint = calculateNeonatalFluid({ weightKg: 0.85, ageDays: 5 });
assert.ok(fluidElbwMaint);
assert.strictEqual(fluidElbwMaint.mlPerKgRange, '150-180');

// 25.10 TC-PR-010: Pathological Weight Loss Screening (>15% in ELBW) & Phototherapy Fluid Adjustments
const fluidWeightLoss = calculateNeonatalFluid({
  birthWeightKg: 0.90,
  weightKg: 0.75, // Loss: 150g = 16.7% (>15% threshold!)
  ageDays: 3,
  isPhototherapy: true,
  phototherapyType: 'LED'
});
assert.ok(fluidWeightLoss);
assert.ok(fluidWeightLoss.weightLossAnalysis);
assert.strictEqual(fluidWeightLoss.weightLossAnalysis.isPathological, true);
assert.strictEqual(fluidWeightLoss.weightLossAnalysis.weightLossPercent, 16.7);
assert.ok(fluidWeightLoss.weightLossAnalysis.warning && fluidWeightLoss.weightLossAnalysis.warning.includes('PATOLOJİK KİLO KAYBI ALARMI'));
assert.strictEqual(fluidWeightLoss.phototherapyAdjustmentMl, 10);
assert.ok(fluidWeightLoss.soluteAdvice.includes('+10 mL/kg/gün'));
assert.ok(fluidWeightLoss.contraindicationNotice.includes('KESİNLİKLE YASAKTIR'));

const fluidHalogen = calculateNeonatalFluid({
  weightKg: 2.0,
  ageDays: 2,
  isPhototherapy: true,
  phototherapyType: 'HALOGEN'
});
assert.ok(fluidHalogen);
assert.strictEqual(fluidHalogen.phototherapyAdjustmentMl, 25);
assert.ok(fluidHalogen.soluteAdvice.includes('+20-30 mL/kg/gün'));

console.log('✓ Preterm <35w Maisels 2012 PMA Bands, TND/NICE Dynamic Formula & Fluid Protocols verified (100% parity with Dosya 4)');

console.log('\n--- 26. VERIFYING POST-DISCHARGE DELTA MODEL, TCB-TO-TSB VALIDATION & REBOUND MONITORING (ADIM 16) ---');

// 26.1 TC-04 (Dosya 4): TcB Doğrulama Eşiği Sınırı (KAS 6)
// GH: 40 0/7 hf, Postnatal Yaş: 60 saat, TcB: 17.0 mg/dL, Risk: Yok
const tc04Jaundice = evaluateAap2022Jaundice({
  gestationalWeeks: 40,
  ageHours: 60,
  totalBilirubin: 17.0,
  measurementType: 'TcB',
  hasNeurotoxicityRisk: false
});
assert.strictEqual(tc04Jaundice.thresholds.phototherapy, 17.25); // 60h enterpolasyonlu eşik (16.0 + 18.5) / 2 = 17.25
assert.strictEqual(tc04Jaundice.deltaFromPhototherapy, 0.25);     // 17.25 - 17.0 = 0.25 mg/dL (<= 3.0 mg/dL içinde)
assert.strictEqual(tc04Jaundice.requiresTsbConfirmation, true);
assert.ok(tc04Jaundice.tsbConfirmationReason && tc04Jaundice.tsbConfirmationReason.includes('STAT kan TSB'));
assert.ok(tc04Jaundice.tcBValidity);
assert.strictEqual(tc04Jaundice.tcBValidity.trigger, 'THRESHOLD_PROXIMITY');
assert.strictEqual(tc04Jaundice.tcBValidity.isValidForTreatmentDecision, false);
assert.strictEqual(tc04Jaundice.tcBValidity.isTsbMandatory, true);

// TC-04 Part 2: Dosya 4 s.631 Eşik 19.75 mg/dL ve Fark 2.75 mg/dL Noktası (87. saat)
const tc04At87h = evaluateAap2022Jaundice({
  gestationalWeeks: 40,
  ageHours: 87,
  totalBilirubin: 17.0,
  measurementType: 'TcB',
  hasNeurotoxicityRisk: false
});
assert.strictEqual(tc04At87h.thresholds.phototherapy, 19.75); // 87h enterpolasyonlu eşik: 18.5 + (15/24)*2 = 19.75
assert.strictEqual(tc04At87h.deltaFromPhototherapy, 2.75);     // 19.75 - 17.0 = 2.75 mg/dL (<= 3.0 mg/dL içinde)
assert.strictEqual(tc04At87h.requiresTsbConfirmation, true);
assert.strictEqual(tc04At87h.tcBValidity?.trigger, 'THRESHOLD_PROXIMITY');

// 26.2 TC-07 (Dosya 4): Yaşamın İlk 12 Saati Patoloji Alarmı
// GH: 37 0/7 hf, Postnatal Yaş: 8 saat, Klinik: Belirgin Sarılık
const tc07Jaundice = evaluateAap2022Jaundice({
  gestationalWeeks: 37,
  ageHours: 8,
  totalBilirubin: 7.5,
  measurementType: 'TSB'
});
assert.strictEqual(tc07Jaundice.status, 'FIRST_12_HOURS_CRITICAL');
assert.strictEqual(tc07Jaundice.requiresTsbConfirmation, true);
assert.ok(tc07Jaundice.clinicalAlerts.some(a => a.type === 'FIRST_12H_PATHOLOGY'));
assert.ok(tc07Jaundice.interpretation.includes('PATOLOJİK HEMOLİZ'));
assert.ok(tc07Jaundice.dischargeEvaluation);
assert.strictEqual(tc07Jaundice.dischargeEvaluation.isDischargeEligible, false);
assert.strictEqual(tc07Jaundice.dischargeEvaluation.actionCode, 'FIRST_12H_CONTRAINDICATED');
assert.ok(tc07Jaundice.dischargeEvaluation.dischargeRecommendation.includes('Yaşamın ilk 12 saatinde taburculuk planlanamaz'));

// 26.3 TC-08 (Dosya 4): Taburculuk Sonrası Takip Şeması (AAP 2022 Tablo 4)
// GH: 40 0/7 hf, Postnatal Yaş: 36 saat, TSB: 10.0 mg/dL, Taburculuk Planı
const tc08Jaundice = evaluateAap2022Jaundice({
  gestationalWeeks: 40,
  ageHours: 36,
  totalBilirubin: 10.0,
  measurementType: 'TSB',
  isDischargePlanning: true
});
assert.strictEqual(tc08Jaundice.thresholds.phototherapy, 14.0);
assert.strictEqual(tc08Jaundice.deltaFromPhototherapy, 4.0); // 14.0 - 10.0 = 4.0 mg/dL (3.5 - 5.4 bandı)
assert.ok(tc08Jaundice.dischargeEvaluation);
assert.strictEqual(tc08Jaundice.dischargeEvaluation.matrixBand, '3.5 – 5.4 mg/dL');
assert.strictEqual(tc08Jaundice.dischargeEvaluation.actionCode, 'INTERMEDIATE_MONITORING');
assert.strictEqual(tc08Jaundice.dischargeEvaluation.isDischargeEligible, true);
assert.strictEqual(tc08.dischargeEvaluation.followUpModality, 'TSB_OR_TCB');
assert.ok(tc08.dischargeEvaluation.dischargeRecommendation.includes('1 ila 2 gün'));

// 26.4 TC-DC-001: Taburculuk Matrisi Band 1 (Delta <= 0 mg/dL - FT Eşiği Aşılmış)
const dcBand1 = evaluateAap2022DischargeMatrix({
  deltaMgDl: -0.8,
  ageHours: 48,
  phototherapyThreshold: 15.0,
  totalBilirubin: 15.8
});
assert.strictEqual(dcBand1.matrixBand, '≤ 0.0 mg/dL');
assert.strictEqual(dcBand1.isDischargeEligible, false);
assert.strictEqual(dcBand1.actionCode, 'CANNOT_DISCHARGE_PT_REQUIRED');
assert.strictEqual(dcBand1.followUpTiming, 'Taburcu Etmeyiniz - Fototerapi Endikasyonu');
assert.strictEqual(dcBand1.followUpModality, 'TSB_ONLY');
assert.ok(dcBand1.dischargeRecommendation.includes('Taburcu etmeyiniz; fototerapi başlatınız'));

// 26.5 TC-DC-002 & TC-DC-003: Taburculuk Matrisi Band 2 (0.1 - 1.9 mg/dL: <24h vs >=24h)
const dcBand2Under24 = evaluateAap2022DischargeMatrix({ deltaMgDl: 1.5, ageHours: 20 });
assert.strictEqual(dcBand2Under24.matrixBand, '0.1 – 1.9 mg/dL');
assert.strictEqual(dcBand2Under24.actionCode, 'DELAY_DISCHARGE_OR_ADMIT');
assert.strictEqual(dcBand2Under24.isDischargeEligible, false);
assert.strictEqual(dcBand2Under24.followUpTiming, '4–8 saat içinde TSB kontrolü');
assert.strictEqual(dcBand2Under24.followUpModality, 'TSB_ONLY');

const dcBand2Over24 = evaluateAap2022DischargeMatrix({ deltaMgDl: 1.5, ageHours: 36 });
assert.strictEqual(dcBand2Over24.matrixBand, '0.1 – 1.9 mg/dL');
assert.strictEqual(dcBand2Over24.actionCode, 'CLOSE_MONITORING_OR_HOME_PT');
assert.strictEqual(dcBand2Over24.followUpTiming, '4–24 saatte TSB kontrolü');
assert.strictEqual(dcBand2Over24.followUpModality, 'TSB_ONLY');
assert.ok(dcBand2Over24.dischargeRecommendation.includes('evde fototerapi'));

// 26.6 TC-DC-004: Taburculuk Matrisi Band 3 (2.0 - 3.4 mg/dL: Herhangi bir yaşta)
const dcBand3 = evaluateAap2022DischargeMatrix({ deltaMgDl: 2.8, ageHours: 30 });
assert.strictEqual(dcBand3.matrixBand, '2.0 – 3.4 mg/dL');
assert.strictEqual(dcBand3.actionCode, 'CLOSE_MONITORING');
assert.strictEqual(dcBand3.isDischargeEligible, true);
assert.strictEqual(dcBand3.followUpTiming, '4 ila 24 saat içinde TSB veya TcB kontrolü');
assert.strictEqual(dcBand3.followUpModality, 'TSB_OR_TCB');

// 26.7 TC-DC-005: Taburculuk Matrisi Band 5 (5.5 - 6.9 mg/dL: <72h vs >=72h)
const dcBand5Under72 = evaluateAap2022DischargeMatrix({ deltaMgDl: 6.0, ageHours: 48 });
assert.strictEqual(dcBand5Under72.matrixBand, '5.5 – 6.9 mg/dL');
assert.strictEqual(dcBand5Under72.actionCode, 'OUTPATIENT_48H');
assert.strictEqual(dcBand5Under72.followUpTiming, '2 gün içinde klinik izlem');
assert.strictEqual(dcBand5Under72.followUpModality, 'CLINICAL_OR_TEST');

const dcBand5Over72 = evaluateAap2022DischargeMatrix({ deltaMgDl: 6.0, ageHours: 96 });
assert.strictEqual(dcBand5Over72.matrixBand, '5.5 – 6.9 mg/dL');
assert.strictEqual(dcBand5Over72.actionCode, 'CLINICAL_DISCRETION');
assert.ok(dcBand5Over72.dischargeRecommendation.includes('Klinik yargıya ve risk durumuna göre'));

// 26.8 TC-DC-006: Taburculuk Matrisi Band 6 (>= 7.0 mg/dL: <72h vs >=72h)
const dcBand6Under72 = evaluateAap2022DischargeMatrix({ deltaMgDl: 8.0, ageHours: 48 });
assert.strictEqual(dcBand6Under72.matrixBand, '≥ 7.0 mg/dL');
assert.strictEqual(dcBand6Under72.actionCode, 'OUTPATIENT_72H');
assert.strictEqual(dcBand6Under72.followUpTiming, '3 gün içinde klinik izlem');

const dcBand6Over72 = evaluateAap2022DischargeMatrix({ deltaMgDl: 8.0, ageHours: 96 });
assert.strictEqual(dcBand6Over72.matrixBand, '≥ 7.0 mg/dL');
assert.strictEqual(dcBand6Over72.actionCode, 'ROUTINE_CARE');
assert.strictEqual(dcBand6Over72.followUpTiming, 'Rutin yenidoğan poliklinik izlemi');
assert.strictEqual(dcBand6Over72.followUpModality, 'CLINICAL_ROUTINE');

// 26.9 TC-DC-007: Fototerapi Kesilme Eşiği Analizi (AAP 2022 KAS 14)
// Eşik: 18.0 mg/dL -> Kesilme Eşiği: 16.0 mg/dL
const ftStopNotPermitted = evaluatePhototherapyReboundRisk({
  currentTsb: 16.5, // 16.5 > 16.0 -> Kesilemez!
  currentAgeHours: 72,
  phototherapyThreshold: 18.0,
  gestationalWeeks: 39
});
assert.strictEqual(ftStopNotPermitted.discontinuationThreshold, 16.0);
assert.strictEqual(ftStopNotPermitted.isDiscontinuationPermitted, false);
assert.ok(ftStopNotPermitted.recommendations[0].includes('Fototerapi sonlandırılamaz'));

const ftStopPermitted = evaluatePhototherapyReboundRisk({
  currentTsb: 15.2, // 15.2 <= 16.0 -> Kesilebilir!
  currentAgeHours: 72,
  phototherapyThreshold: 18.0,
  gestationalWeeks: 39
});
assert.strictEqual(ftStopPermitted.isDiscontinuationPermitted, true);
assert.strictEqual(ftStopPermitted.marginBelowThreshold, 2.8);
assert.ok(ftStopPermitted.recommendations[0].includes('Fototerapi sonlandırılabilir'));

// 26.10 TC-DC-008: Yüksek Rebound Riski Tabakalandırması (AAP 2022 KAS 15)
// Bebek 36w (<38w), FT Başlama: 24h (<48h), DAT+ -> 3 Risk Faktörü!
const rebHighRisk = evaluatePhototherapyReboundRisk({
  currentTsb: 12.0,
  currentAgeHours: 48,
  phototherapyThreshold: 15.0,
  gestationalWeeks: 36,
  phototherapyStartAgeHours: 24,
  hasIsoimmuneHemolysis: true
});
assert.strictEqual(rebHighRisk.isHighReboundRisk, true);
assert.strictEqual(rebHighRisk.riskTier, 'HIGH_REBOUND_RISK');
assert.strictEqual(rebHighRisk.reboundFollowUpHours, '6–12 saat');
assert.ok(rebHighRisk.protocol.includes('6–12 saat'));
assert.ok(rebHighRisk.protocol.includes('Taburculuk ertelenmeli'));
assert.strictEqual(rebHighRisk.riskFactors.isEarlyInitiation, true);
assert.strictEqual(rebHighRisk.riskFactors.isPositiveDatOrHemolysis, true);
assert.strictEqual(rebHighRisk.riskFactors.isNearTermGestationalAge, true);

// 26.11 TC-DC-009: Düşük Rebound Riski Tabakalandırması (AAP 2022 KAS 15)
// Bebek 39w (>=38w), FT Başlama: 60h (>=48h), DAT negatif, geniş marj
const rebLowRisk = evaluatePhototherapyReboundRisk({
  currentTsb: 14.0,
  currentAgeHours: 84,
  phototherapyThreshold: 19.0,
  gestationalWeeks: 39,
  phototherapyStartAgeHours: 60,
  hasIsoimmuneHemolysis: false
});
assert.strictEqual(rebLowRisk.isHighReboundRisk, false);
assert.strictEqual(rebLowRisk.riskTier, 'LOW_REBOUND_RISK');
assert.strictEqual(rebLowRisk.reboundFollowUpHours, '24–48 saat (1–2 gün)');
assert.ok(rebLowRisk.protocol.includes('24–48 saat'));
assert.ok(rebLowRisk.protocol.includes('DÜŞÜK REBOUND RİSKİ'));

// 26.12 TC-DC-010: TcB Güvenlik Kalkanı Triggers (AAP 2022 KAS 6)
// A. Son 24 saatte fototerapi (Cilt beyazlaması / Skin bleaching)
const tcbPriorPt = evaluateTcBValidity({
  measurementType: 'TcB',
  totalBilirubin: 10.0,
  phototherapyThreshold: 18.0,
  ageHours: 48,
  gestationalWeeks: 39,
  priorPhototherapyWithin24h: true
});
assert.strictEqual(tcbPriorPt.trigger, 'PRIOR_PHOTOTHERAPY');
assert.strictEqual(tcbPriorPt.isTsbMandatory, true);
assert.ok(tcbPriorPt.warning && tcbPriorPt.warning.includes('cilt beyazlaması'));

// B. TcB >= 15.0 mg/dL (Cihaz doygunluğu)
const tcbHighSat = evaluateTcBValidity({
  measurementType: 'TcB',
  totalBilirubin: 15.5,
  phototherapyThreshold: 20.0,
  ageHours: 72,
  gestationalWeeks: 40
});
assert.strictEqual(tcbHighSat.trigger, 'TCB_HIGH_SATURATION');
assert.strictEqual(tcbHighSat.isTsbMandatory, true);
assert.ok(tcbHighSat.warning && tcbHighSat.warning.includes('doygunluk'));

// C. Yaşamın ilk 12 saati
const tcbEarly = evaluateTcBValidity({
  measurementType: 'TcB',
  totalBilirubin: 6.0,
  phototherapyThreshold: 10.0,
  ageHours: 8,
  gestationalWeeks: 38
});
assert.strictEqual(tcbEarly.trigger, 'FIRST_12H');
assert.strictEqual(tcbEarly.isTsbMandatory, true);

// D. Prematüre bebek (<35 hafta)
const tcbPreterm = evaluateTcBValidity({
  measurementType: 'TcB',
  totalBilirubin: 8.0,
  phototherapyThreshold: 12.0,
  ageHours: 48,
  gestationalWeeks: 33
});
assert.strictEqual(tcbPreterm.trigger, 'PRETERM');
assert.strictEqual(tcbPreterm.isTsbMandatory, true);

// E. Güvenli TcB (Eşiğin >3.0 mg/dL altında ve <15.0 mg/dL)
const tcbSafe = evaluateTcBValidity({
  measurementType: 'TcB',
  totalBilirubin: 10.0,
  phototherapyThreshold: 18.5,
  ageHours: 72,
  gestationalWeeks: 40
});
assert.strictEqual(tcbSafe.trigger, 'NONE');
assert.strictEqual(tcbSafe.isTsbMandatory, false);
assert.strictEqual(tcbSafe.isValidForTreatmentDecision, true);

console.log('✓ Post-discharge Delta Model, TcB-to-TSB Validation & Rebound Monitoring verified (100% parity with Dosya 4)');

console.log('\n--- 27. VERIFYING MOTOR 1 DEMOGRAPHY & GESTATIONAL AGE FIXES (ADIM 1) ---');
// 27.1 HATA-M1-003: Preterm baby prior to term equivalent age (40w) - PMA calculated, correctedMonths = 0
const pmaBaby = calculateCorrectedAge({ chronologicalMonths: 1, gestationalWeeks: 32 });
assert.ok(pmaBaby);
assert.strictEqual(pmaBaby.isPreterm, true);
assert.strictEqual(pmaBaby.isTermEquivalent, false);
assert.strictEqual(pmaBaby.correctedMonths, 0);
assert.ok(pmaBaby.correctedMonthsFormatted?.includes('PMA: 36.3. Hafta'));
assert.strictEqual(pmaBaby.weeksMissing, 8);

// 27.2 HATA-M1-004: Preterm 2-year stop rule (>= 24 months AAP/CDC catch-up)
const catchUpChild = calculateCorrectedAge({ chronologicalMonths: 36, gestationalWeeks: 28 });
assert.ok(catchUpChild);
assert.strictEqual(catchUpChild.isPreterm, false);
assert.strictEqual(catchUpChild.stopRuleApplied, true);
assert.strictEqual(catchUpChild.weeksMissing, 0);
assert.strictEqual(catchUpChild.correctedMonths, 36);

// 27.3 HATA-M1-005: Gestational week clamping [22 - 42]
const extremePreterm = calculateCorrectedAge({ chronologicalMonths: 6, gestationalWeeks: 15 });
assert.ok(extremePreterm);
assert.strictEqual(extremePreterm.gestationalWeeks, 22);

const postTerm = calculateCorrectedAge({ chronologicalMonths: 6, gestationalWeeks: 45 });
assert.ok(postTerm);
assert.strictEqual(postTerm.isPreterm, false);
assert.strictEqual(postTerm.gestationalWeeks, 42);

// 27.4 Negative chronological months guard
const invalidAge = calculateCorrectedAge({ chronologicalMonths: -5, gestationalWeeks: 32 });
assert.strictEqual(invalidAge, null);

console.log('✓ Motor 1 Demography, Gestational Age PMA, 2-Year Stop Rule & Viability Clamping verified (100% healthy)');

console.log('\n--- 28. VERIFYING MOTOR 2 BIOMETRICS, eGFR & RENAL DOSE FIXES (ADIM 2) ---');

// 28.1 HATA-M2-001: Adult without gender must return null to prevent silent default male stage shift
const adultNoGender = calculateDetailedEGFR(1.2, 60, null, 175);
assert.strictEqual(adultNoGender, null, 'Adult without gender must return null');

const adultInvalidGender = calculateDetailedEGFR(1.2, 60, 'other', 175);
assert.strictEqual(adultInvalidGender, null, 'Adult with invalid gender must return null');

const adultWithGender = calculateDetailedEGFR(1.2, 60, 'female', 175);
assert.ok(adultWithGender !== null, 'Adult with valid gender calculates eGFR');
assert.strictEqual(adultWithGender.egfrIndexed, 52, 'Female eGFR for age 60, Scr 1.2 is 52 (CKD-EPI 2021)');

// 28.2 HATA-M2-002: Cockcroft-Gault prohibited in pediatrics (<18 years)
const childCg = calculateCockcroftGaultCrCl({
  ageYears: 5,
  gender: 'male',
  serumCreatinineMgDl: 0.4,
  actualWeightKg: 18,
  heightCm: 110
});
assert.strictEqual(childCg, null, 'Cockcroft-Gault must return null for child < 18y');

const teenCg = calculateCockcroftGaultCrCl({
  ageYears: 17,
  gender: 'female',
  serumCreatinineMgDl: 0.7,
  actualWeightKg: 55,
  heightCm: 165
});
assert.strictEqual(teenCg, null, 'Cockcroft-Gault must return null for adolescent < 18y');

// 28.3 HATA-M2-003: Sarcopenic elderly (age >= 65, Scr < 0.6) low creatinine clearance elevation shield
const sarcopenicElderly = calculateCockcroftGaultCrCl({
  ageYears: 88,
  gender: 'female',
  serumCreatinineMgDl: 0.3,
  actualWeightKg: 45,
  heightCm: 150
});
assert.ok(sarcopenicElderly !== null);
assert.strictEqual(sarcopenicElderly.isSarcopenicLowCreatinine, true);
assert.strictEqual(sarcopenicElderly.recommendedCrCl, 92.1);
assert.strictEqual(sarcopenicElderly.normalizedCrCl, 46, 'Scr=0.6 mg/dL normalized CrCl must be 46 mL/min');
assert.ok(sarcopenicElderly.sarcopeniaWarning && sarcopenicElderly.sarcopeniaWarning.includes('Sarkopeni'));

// In evaluateComprehensiveRenalFunction, sarcopenia alert is surfaced
const compSarcopenia = evaluateComprehensiveRenalFunction({
  ageYears: 88,
  gender: 'female',
  heightCm: 150,
  weightKg: 45,
  serumCreatinineMgDl: 0.3,
  drugs: ['apixaban']
});
assert.ok(compSarcopenia.clinicalAlerts.some(a => a.title.includes('Sarkopeni')));

// 28.4 HATA-M2-005: Pediatric CKiD Cystatin C equation (Schwartz 2012, height-independent)
const pedCysOnly = calculateDetailedEGFR(null, 10, 'male', null, { cystatinC: 1.2 });
assert.ok(pedCysOnly !== null);
assert.strictEqual(pedCysOnly.formulaUsed, 'CKiD Sistatin C (Pediatrik Boy Bağımsız, Schwartz 2012)');
assert.strictEqual(pedCysOnly.shortBadge, 'CKiD CysC');
assert.strictEqual(pedCysOnly.egfrIndexed, 60); // 70.69 * (1.2^-0.931) = 60.15 -> 60

// Pediatric with Scr and Cys but missing height: falls back to CKiD Cystatin C
const pedMissingHeightWithCys = calculateDetailedEGFR(1.5, 8, 'female', null, { cystatinC: 1.0 });
assert.ok(pedMissingHeightWithCys !== null);
assert.strictEqual(pedMissingHeightWithCys.shortBadge, 'CKiD CysC');
assert.strictEqual(pedMissingHeightWithCys.egfrIndexed, 71); // 70.69 * (1.0^-0.931) = 70.69 -> 71

// 28.5 HATA-M2-006 & HATA-M2-007: KDIGO 2024 BSA threshold (15%) and toFixed(1) absolute GFR
const adultDeviatedBsa = calculateDetailedEGFR(1.0, 50, 'M', 180, { bsa: 2.02 });
assert.ok(adultDeviatedBsa !== null);
// Deviation: |2.02 - 1.73| / 1.73 = 16.76% >= 15% -> Dosing note triggered
assert.ok(adultDeviatedBsa.dosingNote && adultDeviatedBsa.dosingNote.includes('KDIGO 2024'));
assert.strictEqual(typeof adultDeviatedBsa.egfrAbsolute, 'number');

console.log('✓ Motor 2 Biometrics, Adult Gender Check, Pediatric CKiD Cystatin C, CG Age Guard, Sarcopenia & KDIGO 15% verified (100% healthy)');

console.log('\n--- 29. VERIFYING MOTOR 2 EK IBW, HABITUS & OBESITY SHIELD FIXES (ADIM 3) ---');

// 29.1 HATA-M2-008: Normal weight patient (BMI 22.2) must NOT be diagnosed as cachectic/underweight
const habitusNormalMale = analyzeBodyWeightHabitus(175, 68, 'male');
assert.strictEqual(habitusNormalMale.bmi, 22.2);
assert.strictEqual(habitusNormalMale.isUnderweight, false, 'BMI 22.2 must not be underweight');
assert.strictEqual(habitusNormalMale.isObese, false);
assert.strictEqual(habitusNormalMale.recommendedCrClWeightKg, 68);
assert.ok(!habitusNormalMale.weightSelectionRationale.includes('Zayıf / Kaşektik'));

// 29.2 HATA-M2-009: Devine IBW for height < 152.4 cm (< 60 in) must NOT lock to 45.5 / 50 kg
const ibwShortFemale = calculateDevineIBW(140, 'female');
assert.strictEqual(ibwShortFemale, 34.3, 'Devine IBW for 140cm female must be 34.3 kg (not locked to 45.5)');

const ibwShortMale = calculateDevineIBW(140, 'male');
assert.strictEqual(ibwShortMale, 38.8, 'Devine IBW for 140cm male must be 38.8 kg (not locked to 50.0)');

// Standard heights remain exact
assert.strictEqual(calculateDevineIBW(160, 'female'), 52.4);
assert.strictEqual(calculateDevineIBW(175, 'male'), 70.5);

// 29.3 HATA-M2-010: Overweight patient (BMI 27.7, >120% IBW) must NOT be classified as Obese for CrCl
const habitusOverweightMale = analyzeBodyWeightHabitus(170, 80, 'male');
assert.strictEqual(habitusOverweightMale.bmi, 27.7);
assert.strictEqual(habitusOverweightMale.isObese, false, 'BMI 27.7 must be overweight, NOT obese');
assert.strictEqual(habitusOverweightMale.recommendedCrClWeightKg, 80, 'Actual weight 80kg must be used when BMI < 30');

// Truly obese patient (BMI >= 30) gets ABW40
const habitusTrulyObese = analyzeBodyWeightHabitus(170, 95, 'male');
assert.strictEqual(habitusTrulyObese.bmi, 32.9);
assert.strictEqual(habitusTrulyObese.isObese, true);
assert.strictEqual(habitusTrulyObese.recommendedCrClWeightKg, habitusTrulyObese.adjustedBodyWeightKg);

// 29.4 HATA-M2-012: Preterm infant (<37w) prior to term equivalence must NOT force term Neyzi 0-month norm
const pretermPriorToTerm = calculateIdealBodyWeight({
  ageMonths: 1,
  gender: 'male',
  heightCm: 42,
  weightKg: 2.1,
  isPreterm: true,
  gestationalWeeks: 30
});
assert.ok(pretermPriorToTerm !== null);
assert.strictEqual(pretermPriorToTerm.isPretermAdjusted, true);
assert.strictEqual(pretermPriorToTerm.ibwKg, 2.1, 'Preterm infant prior to term equivalence uses current weight for IBW');
assert.strictEqual(pretermPriorToTerm.isObese, false);

// Preterm infant with post-term corrected age uses corrected age norms
const pretermCatchUp = calculateIdealBodyWeight({
  ageMonths: 8,
  gender: 'female',
  heightCm: 64,
  weightKg: 6.8,
  isPreterm: true,
  gestationalWeeks: 32,
  correctedAgeMonths: 6.1
});
assert.ok(pretermCatchUp !== null);
assert.strictEqual(pretermCatchUp.isPretermAdjusted, true);
assert.ok(pretermCatchUp.pretermNote && pretermCatchUp.pretermNote.includes('Düzeltilmiş yaş'));

console.log('✓ Motor 2 Ek IBW, Devine < 152.4cm, Habitus Normal Weight, BMI 30 & Preterm IBW verified (100% healthy)');

console.log('--- 30. MOTOR 3: VİTAL BULGULAR & TRİYAJ SKORLARI (NEWS2, PEWS, AAP 2017 PEDİATRİK BP & PALS ŞOK KALKANI) ---');

// 30.1 HATA-M3-001: NEWS2 Kısmi Parametre Hesaplama Desteği & Eksik Parametre Raporlama
// Ateş (temp) henüz ölçülmediği halde septik şoktaki hastada monitör vitalleri (HR: 140, SBP: 75, RR: 32, SpO2: 86)
const partialNews2 = calculateNEWS2(140, 75, 32, null, 86, true, 'A');
assert.ok(partialNews2 !== null, 'calculateNEWS2 must compute score when partial numeric vitals are present');
// HR 140 -> 3 pts, SBP 75 -> 3 pts, RR 32 -> 3 pts, SpO2 86 -> 3 pts, O2 -> 2 pts, AVPU A -> 0. Toplam = 14 pts
assert.strictEqual(partialNews2.score, 14, 'Partial NEWS2 score must equal 14');
assert.strictEqual(partialNews2.hasRedScore, true, 'Tekil parametreler >= 3 olduğundan hasRedScore true olmalıdır');
assert.strictEqual(partialNews2.isPartial, true, 'Ateş girilmediği için isPartial true olmalıdır');
assert.ok(partialNews2.missingParams && partialNews2.missingParams.includes('Vücut Sıcaklığı'));
assert.strictEqual(partialNews2.risk, 'Yüksek Klinik Risk');

// 30.2 HATA-M3-003: Tekil Parametreden Kırmızı Skor (Red Score = 3) Tespiti
// Yalnızca sistolik tansiyon 85 mmHg (3 pts), diğer tüm vitaller normal
const redScoreNews2 = calculateNEWS2(75, 85, 16, 36.8, 98, false, 'A');
assert.ok(redScoreNews2 !== null);
assert.strictEqual(redScoreNews2.score, 3, 'Yalnızca SBP<=90 olduğu için skor 3 olmalıdır');
assert.strictEqual(redScoreNews2.hasRedScore, true, 'SBP 85 mmHg tekil olarak 3 puan ürettiğinden hasRedScore true olmalıdır');
assert.strictEqual(redScoreNews2.risk, 'Orta', 'Red score varlığında toplam skor < 5 olsa bile risk Orta olmalıdır');
assert.ok(redScoreNews2.recommendation.includes('Acil tıbbi değerlendirme'), 'Red score acil değerlendirme tetiklemelidir');

// 30.3 HATA-M3-004: AAP 2017 Pediatrik Hipertansiyon Motorunda Boy Persentili Duyarlılığı
// 5 yaş erkek çocuk (referans 50.p boy için s90: 103, s95: 107).
// 1. Durum: Boy 5. persentilde (kısa çocuk, delta = -3 SBP -> s90: 100, s95: 104)
const bpShortChild = classifyPediatricBP({
  ageYears: 5,
  gender: 'male',
  sbp: 104,
  dbp: 60,
  heightPercentile: 5
});
assert.ok(bpShortChild !== null);
assert.strictEqual(bpShortChild.stage, 'Evre 1 Hipertansiyon (≥95.p)', '5.p boy için s95=104 olduğundan SBP 104 Evre 1 HT olmalıdır');
assert.ok(bpShortChild.thresholds && bpShortChild.thresholds.includes('Boy 5.p'));

// 2. Durum: Boy 95. persentilde (uzun çocuk, delta = +3 SBP -> s90: 106, s95: 110)
const bpTallChild = classifyPediatricBP({
  ageYears: 5,
  gender: 'male',
  sbp: 104,
  dbp: 60,
  heightPercentile: 95
});
assert.ok(bpTallChild !== null);
assert.strictEqual(bpTallChild.stage, 'Normal Kan Basıncı (<90.p)', '95.p boy için s90=106 olduğundan SBP 104 Normal (<90.p) olmalıdır');
assert.ok(bpTallChild.thresholds && bpTallChild.thresholds.includes('Boy 95.p'));

// 30.4 HATA-M3-005: < 1 Yaş Bebekler ve PALS Dekompanse Şok / Hipotansiyon Kalkanı
// 1. Vaka: 6 aylık süt çocuğu dekompanse şokta (SBP: 45, DBP: 25)
const shockInfant = classifyPediatricBP({
  ageYears: 0.5,
  gender: 'female',
  sbp: 45,
  dbp: 25
});
assert.ok(shockInfant !== null);
assert.strictEqual(shockInfant.isShockHypotension, true);
assert.ok(shockInfant.stage.includes('Dekompanse Şok / Hipotansiyon (SBP < 70 mmHg)'));
assert.ok(shockInfant.alertClass.includes('animate-pulse'));

// 2. Vaka: 5 yaşındaki çocuk şokta (PALS hipotansiyon eşiği: 70 + 2*5 = 80 mmHg)
const shockChild5y = classifyPediatricBP({
  ageYears: 5,
  gender: 'male',
  sbp: 74,
  dbp: 40
});
assert.ok(shockChild5y !== null);
assert.strictEqual(shockChild5y.isShockHypotension, true);
assert.ok(shockChild5y.stage.includes('Dekompanse Şok / Hipotansiyon (SBP < 80 mmHg)'));

// 3. Vaka: 6 aylık sağlıklı bebek (SBP: 85, DBP: 55) -> 1 yaş eşiğine kilitlenmemeli, süt çocuğu normu dönmeli
const normalInfant = classifyPediatricBP({
  ageYears: 0.5,
  gender: 'male',
  sbp: 85,
  dbp: 55
});
assert.ok(normalInfant !== null);
assert.strictEqual(normalInfant.stage, 'Normal Süt Çocuğu Kan Basıncı (1-12 Ay)');
assert.strictEqual(normalInfant.isShockHypotension, undefined);

console.log('✓ Motor 3 Vital Bulgular, Triyaj NEWS2/PEWS, AAP 2017 BP Boy Persentili & PALS Şok Kalkanı verified (100% healthy)');

console.log('--- 31. MOTOR 4: BİLİNÇ & NÖROLOJİ SKORLAMASI (GCS, PEDİATRİK pGCS, 1T ENTÜBE & HAVAYOLU KALKANI) ---');

// 31.1 HATA-M4-001 & HATA-M4-003: Bilinci açık entübe hasta (E: 4, V: '1T', M: 6)
const entubatedConscious = calculateGCS(4, '1T', 6);
assert.ok(entubatedConscious !== null);
assert.strictEqual(entubatedConscious.total, 11);
assert.strictEqual(entubatedConscious.formattedScore, '11T');
assert.strictEqual(entubatedConscious.isEntubated, true);
assert.strictEqual(entubatedConscious.v, '1T');
assert.strictEqual(entubatedConscious.airwayRisk, 'Hasta endotrakeal entübedir (Havayolu emniyettedir).', 'Entübe hastada acil entübasyon alarmı yerine emniyet teyidi basılmalıdır');

// 31.2 HATA-M4-001: Pediatrik Preverbal Bebek (< 2 Yaş) pGCS Normallik Teyidi
// 8 aylık bebek: Göz Spontan (4), Sözel Agular/Babıldar (5), Motor Spontan amaca yönelik (6)
const pgcsNormalInfant = calculateGCS(4, 5, 6, { isPediatric: true });
assert.ok(pgcsNormalInfant !== null);
assert.strictEqual(pgcsNormalInfant.total, 15);
assert.strictEqual(pgcsNormalInfant.isPediatric, true);
assert.strictEqual(pgcsNormalInfant.interpretation, 'Pediatrik bilinç açık (Normal / Yaşına uygun).');
assert.strictEqual(pgcsNormalInfant.airwayRisk, null);

// 31.3 HATA-M4-003: Ağır Kafa Travmalı Entübe Hasta (E: 2, V: '1T', M: 3)
const severeEntubated = calculateGCS(2, '1T', 3);
assert.ok(severeEntubated !== null);
assert.strictEqual(severeEntubated.total, 6);
assert.strictEqual(severeEntubated.formattedScore, '6T');
assert.strictEqual(severeEntubated.isEntubated, true);
assert.strictEqual(severeEntubated.interpretation, 'Ağır kafa travması / koma.');
assert.strictEqual(severeEntubated.airwayRisk, 'Hasta endotrakeal entübedir (Havayolu emniyettedir).');

// 31.4 HATA-M4-004: Entübe Olmayan Ağır Koma (GCS <= 8) - Havayolu Alarmı
const severeNonEntubated = calculateGCS(2, 2, 3);
assert.ok(severeNonEntubated !== null);
assert.strictEqual(severeNonEntubated.total, 7);
assert.strictEqual(severeNonEntubated.isEntubated, false);
assert.strictEqual(severeNonEntubated.airwayRisk, 'Entübasyon / Havayolu güvenliği sağlanmalı.');

// 31.5 HATA-M4-002: SOAP Epikrizinde pGCS Formatı Teyidi
appState.pediatrics.pgcs = pgcsNormalInfant;
const soapPedOutput = generateSOAP();
assert.ok(soapPedOutput.includes('pGCS (Pediatrik Glasgow Koma Skalası): Toplam 15'), 'SOAP epikrizi pediatrik hastada pGCS başlığı basmalıdır');
appState.pediatrics.pgcs = null;

console.log('✓ Motor 4 GCS, pGCS Preverbal, 1T Entübe, Havayolu Güvenliği & SOAP pGCS verified (100% healthy)');

console.log('--- 32. MOTOR 5: TROMBOEMBOLİ & ACİL SKORLARI (WELLS DVT, WELLS PTE, PERC NEGATİF & YAŞ DÜZELTMELİ D-DİMER) ---');

// 32.1 HATA-M5-001: PERC Kuralının Bütün Kriterler Negatifken (0 Kriter) Doğru Dışlama Üretmesi
const percAllNegative = evaluatePERC({});
assert.ok(percAllNegative.isValid);
assert.strictEqual(percAllNegative.isPERCNegative, true);
assert.strictEqual(percAllNegative.isRuleOut, true);
assert.strictEqual(percAllNegative.positiveCount, 0);
assert.strictEqual(percAllNegative.status, 'PERC KURALI NEGATİF (PE DIŞLANDI)');
assert.ok(percAllNegative.recommendation.includes('D-Dimer kan testi veya Toraks BT Anjiyo gerekmez'));

// 32.2 HATA-M5-002: Wells PTE İki Kademeli ve Üç Kademeli Model Çelişki Giderimi
// Yalnızca DVT klinik bulgusu mevcut (Skor: 3.0)
const wellsPeMiddle = calculateWellsPTE({ clinicalSignsOfDVT: true });
assert.strictEqual(wellsPeMiddle.score, 3.0);
assert.strictEqual(wellsPeMiddle.twoTierRisk.risk, 'PE Düşük / Olası Değil');
assert.strictEqual(wellsPeMiddle.threeTierRisk.risk, 'Orta Risk');
assert.ok(wellsPeMiddle.recommendations[0].includes('İki kademeli modele göre PE olası değildir'), 'Orta riskte iki model ayrımı ve D-Dimer önceliği vurgulanmalıdır');

// 32.3 HATA-M5-003: Wells DVT probability formatı (Mükerrer % engellemesi)
const wellsDvtLow = calculateWellsDVT({});
assert.strictEqual(wellsDvtLow.score, 0);
assert.strictEqual(wellsDvtLow.probability, '~%5');
assert.ok(!wellsDvtLow.probability.startsWith('%%'));

// 32.4 HATA-M5-005: Yaşa Göre Düzeltilmiş D-Dimer Eşiği (ADJUST-PE / ESC 2019)
// 70 yaşındaki hasta için eşik = 70 * 10 = 700 µg/L
const wellsPeElderly = calculateWellsPTE({
  clinicalSignsOfDVT: true,
  ageYears: 70
});
assert.ok(wellsPeElderly.recommendations.some(r => r.includes('700 µg/L')), '70 yaşındaki hastada 700 µg/L eşiği önerilmelidir');

const wellsDvtElderly = calculateWellsDVT({
  activeCancer: true,
  ageYears: 65
});
assert.ok(wellsDvtElderly.recommendations.some(r => r.includes('650 µg/L')), '65 yaşındaki hastada 650 µg/L eşiği önerilmelidir');

// 32.5 HATA-M5-005: Pediatrik Yaş (<18 Yaş) Wells DVT ve PTE Kalkanı
const wellsDvtChild = calculateWellsDVT({
  activeCancer: true,
  ageYears: 8
});
assert.ok(wellsDvtChild.recommendations.some(r => r.includes('⚠️ Pediatrik Uyarı (<18 Yaş)')), 'Pediatrik olguda erişkin Wells skoru uyarı kalkanı vermelidir');

const wellsPeChild = calculateWellsPTE({
  clinicalSignsOfDVT: true,
  ageYears: 12
});
assert.ok(wellsPeChild.recommendations.some(r => r.includes('⚠️ Pediatrik Uyarı (<18 Yaş)')), 'Pediatrik PTE olgusunda uyarı kalkanı verilmelidir');

console.log('✓ Motor 5 Wells DVT, Wells PTE, PERC Negatif & Yaş Düzeltmeli D-Dimer verified (100% healthy)');

console.log('--- 33. MOTOR 5 EK: KARDİYOVASKÜLER & TROMBOEMBOLİ EK SKORLARI (CHA2DS2-VASc, HAS-BLED, HEART) ---');

// 33.1 HATA-M5-006: HEART Skoru 0 Puan Olduğunda Düşük Risk (%1.7 MACE) ve Erken Taburculuk Doğrulaması
const heartZero = calculateHEART({
  historyPoints: 0,
  ecgPoints: 0,
  agePoints: 0,
  riskFactorsPoints: 0,
  troponinPoints: 0
});
assert.strictEqual(heartZero.score, 0);
assert.strictEqual(heartZero.riskCategory, 'Düşük Risk');
assert.strictEqual(heartZero.maceRatePercent, 1.7);
assert.ok(heartZero.recommendation.includes('Erken taburculuk güvenlidir'));
assert.strictEqual(heartZero.alertClass, 'text-emerald-400');

// 33.2 HATA-M5-006 & HATA-M5-010: Troponin >3x URL (2 Puan) Olduğunda Acil Konsültasyon / KAG Alarmı
const heartTroponinHigh = calculateHEART({
  historyPoints: 1,
  ecgPoints: 0,
  agePoints: 1,
  riskFactorsPoints: 0,
  troponinPoints: 2
});
assert.strictEqual(heartTroponinHigh.score, 4);
assert.ok(heartTroponinHigh.recommendations.some(r => r.includes('🚨 Troponin belirgin pozitif (>3x URL)')));

// 33.3 HATA-M5-007: İzole Yaşlı AF Olgusunda (80 Yaş Kadın) Ek Komorbidite Olmadan CHA2DS2-VASc ve DOAC Endikasyonu
const afElderlyFemale = calculateCHA2DS2VASc({
  age: 80,
  isFemale: true
});
assert.strictEqual(afElderlyFemale.score, 3); // Yaş >= 75: 2 + Kadın: 1 = 3 Puan
assert.strictEqual(afElderlyFemale.category, 'Yüksek Tromboemboli Riski');
assert.ok(afElderlyFemale.anticoagulationRecommendation.includes('Oral Antikoagülan (DOAC'));
assert.strictEqual(afElderlyFemale.alertClass, 'text-rose-400');

// 33.4 HATA-M5-007: HAS-BLED Skorunda Yaş >= 65 Otomatik 1 Puan
const hasbledElderly = calculateHASBLED({
  age: 72
});
assert.strictEqual(hasbledElderly.score, 1);
assert.strictEqual(hasbledElderly.isHighRisk, false);
assert.strictEqual(hasbledElderly.bleedingRiskCategory, 'Düşük / Orta Kanama Riski (HAS-BLED < 3)');

// 33.5 HATA-M5-009: Pediatrik Popülasyonda (<18 Yaş) Uyarı Kalkanı
const afChild = calculateCHA2DS2VASc({ age: 10, hypertension: true });
assert.strictEqual(afChild.isPediatricWarning, true);
assert.ok(afChild.recommendations.some(r => r.includes('pediatrik yaş grubunda (<18 yaş) valide edilmemiştir')));

const hasbledChild = calculateHASBLED({ age: 12, abnormalRenal: true });
assert.strictEqual(hasbledChild.isPediatricWarning, true);
assert.ok(hasbledChild.recommendations.some(r => r.includes('pediatrik yaş grubunda (<18 yaş) valide edilmemiştir')));

const heartChild = calculateHEART({ ageYears: 14, troponinPoints: 0 });
assert.strictEqual(heartChild.isPediatricWarning, true);
assert.ok(heartChild.recommendations.some(r => r.includes('pediatrik popülasyonda (<18 yaş) göğüs ağrısı için valide edilmemiştir')));

// 33.6 HATA-M5-010: CHA2DS2-VASc'ta age75 ve age65to74 Çakışma Önleme Kalkanı
const afBothAgeChecked = calculateCHA2DS2VASc({
  age75: true,
  age65to74: true
});
assert.strictEqual(afBothAgeChecked.score, 2, 'age75 ve age65to74 aynı anda seçilse bile skor 3 değil strictly 2 olmalıdır (çakışma kalkanı)');

console.log('✓ Motor 5 Ek CHA2DS2-VASc, HAS-BLED, HEART 0 Skoru & Pediatrik Kalkan verified (100% healthy)');

console.log('\n--- 34. VERIFYING MOTOR 11: KARDIYOLOJI & EKG (QTc, AKS & TISDALE DÜZELTMELERI) ---');

// 34.1 HATA-M11-001: Yenidoğan ve Süt Çocuğu Fizyolojik Sağ Aks Normatif Aralıkları
// 10 günlük yenidoğan (ageDays: 10), D1: -2, aVF: +5 (+112°)
const neonateAxis = calculateAxis(-2, 5, { ageDays: 10 });
assert.ok(neonateAxis);
assert.strictEqual(neonateAxis.degrees, 112);
assert.strictEqual(neonateAxis.isPediatricVariant, true);
assert.ok(neonateAxis.axisCategory.includes('Fizyolojik Yenidoğan Sağ Aksı'));
assert.ok(!neonateAxis.axisCategory.includes('lateral MI'));

// 4 aylık infant (ageMonths: 4), D1: -1, aVF: +3 (+108°)
const infantAxis = calculateAxis(-1, 3, { ageMonths: 4 });
assert.ok(infantAxis);
assert.strictEqual(infantAxis.degrees, 108);
assert.strictEqual(infantAxis.isPediatricVariant, true);
assert.ok(infantAxis.axisCategory.includes('Fizyolojik Süt Çocuğu Aksı'));

// Erişkin (age: 40) aynı D1: -2, aVF: +5 (+112°) -> Sağ Aks Sapması (RAD)
const adultAxis = calculateAxis(-2, 5, 40);
assert.ok(adultAxis);
assert.strictEqual(adultAxis.degrees, 112);
assert.ok(adultAxis.axisCategory.includes('Sağ Aks Sapması (RAD)'));
assert.ok(adultAxis.axisCategory.includes('lateral MI'));

// 34.2 HATA-M11-002: Taşikardi Sınırının Yenidoğan/Süt Çocuklarında Esnetilmesi (HR 150-180 bpm)
// 2 aylık bebek (age: 0.16), HR: 155 bpm, QT: 260 ms -> Bloklanmamalı, hesaplanmalı ve uyarı verilmeli
const pediaTachycardia = calculateQTc({ hr: 155, qt: 260, age: 0.16 });
assert.strictEqual(pediaTachycardia.status, 'OK', 'Pediatrik taşikardi (HR 155) hesaplamayı kilitlememelidir');
assert.ok(pediaTachycardia.qtcFridericia !== null);
assert.ok(pediaTachycardia.warnings.some(w => w.includes('Pediatrik Taşikardi Uyarısı')));

// Erişkin (age: 30), HR: 155 bpm -> Hard-stop ile BLOCKED olmalıdır
const adultTachycardia = calculateQTc({ hr: 155, qt: 360, age: 30 });
assert.strictEqual(adultTachycardia.status, 'BLOCKED');

// Pediatrik aşırı taşikardi (HR > 180, örn: 185 bpm) -> BLOCKED olmalıdır
const pediaExtremeTachycardia = calculateQTc({ hr: 185, qt: 220, age: 0.16 });
assert.strictEqual(pediaExtremeTachycardia.status, 'BLOCKED');

// 34.3 HATA-M11-003: Pediatrik QTc Eşikleri & Prepubertal Cinsiyet Eşitliği
// <6 ay bebek (age: 0.16, gender: 'male'), QTc = 455 ms -> Normal kabul edilmeli (üst sınır <= 460 ms)
// HR: 60, QT: 455 ms -> QTcFridericia = 455 ms
const infantQtc = calculateQTc({ hr: 60, qt: 455, gender: 'male', age: 0.16 });
assert.strictEqual(infantQtc.colorCode, 'success', 'İlk 6 ayda QTc 455 ms normal kabul edilmelidir (limit 460 ms)');
assert.ok(infantQtc.interpretation.includes('Normal QTc'));

// Prepubertal kız çocuğu (8 yaş, gender: 'female'), QTc = 455 ms -> Androjenik ayrım olmadığından sınırda (450 ms üstü)
const prepubertalGirlQtc = calculateQTc({ hr: 60, qt: 455, gender: 'female', age: 8 });
assert.strictEqual(prepubertalGirlQtc.colorCode, 'warning', 'Prepubertal kız çocuğunda QTc 455 ms sınırda (borderline) olmalıdır');
assert.ok(prepubertalGirlQtc.interpretation.includes('Sınırda (Borderline) QTc'));

// Erişkin kadın (30 yaş, gender: 'female'), QTc = 455 ms -> Erişkin kadın limiti 460 ms olduğundan Normaldir
const adultFemaleQtc = calculateQTc({ hr: 60, qt: 455, gender: 'female', age: 30 });
assert.strictEqual(adultFemaleQtc.colorCode, 'success', 'Erişkin kadında QTc 455 ms normaldir');

// 34.4 HATA-M11-004: İzodifazik EKG Aksı (D1 = 0, aVF = 0)
const isodiphasicAxis = calculateAxis(0, 0);
assert.ok(isodiphasicAxis);
assert.strictEqual(isodiphasicAxis.degrees, 0);
assert.strictEqual(isodiphasicAxis.axisCategory, 'Belirsiz / İndetermine Aks (D1 ve aVF izodifazik)');

// 34.5 HATA-M11-005: Tisdale Pediatrik Validasyon Kalkanı & Kadın Puanı Bariyeri
// 5 yaşındaki kız çocuğu ek risksiz -> Kadın olduğu için otomatik +1 puan almamalıdır (Tisdale = 0)
const pediaGirlTisdale = calculateQTc({ hr: 90, qt: 380, gender: 'female', age: 5 });
assert.strictEqual(pediaGirlTisdale.tisdaleScore, 0, 'Pediatrik kız çocuğuna cinsiyetten dolayı Tisdale puanı verilmemelidir');
assert.strictEqual(pediaGirlTisdale.isPediatricTisdaleWarning, true);
assert.ok(pediaGirlTisdale.tisdaleRisk.includes('Pediatrik Yaşta Valide Değildir'));

// 5 yaşındaki çocukta QTc uzatıcı ilaç eklendiğinde Tisdale uyarısı bulunmalıdır
const pediaDrugTisdale = calculateQTc({
  hr: 90,
  qt: 380,
  age: 5,
  drugs: [{ brand: 'Klacid 250mg', generic: 'clarithromycin', atcCode: 'J01FA09' }]
});
assert.strictEqual(pediaDrugTisdale.tisdaleScore, 3);
assert.strictEqual(pediaDrugTisdale.isPediatricTisdaleWarning, true);
assert.ok(pediaDrugTisdale.warnings.some(w => w.includes('Tisdale risk skoru hastanede yatan erişkin yoğun bakım hastaları için geliştirilmiş')));

console.log('✓ Motor 11 QTc, QRS Aksı & Tisdale Skoru verified (100% healthy)');

console.log('\n--- 35. VERIFYING MOTOR 8: KAN GAZI & ASİT-BAZ (VBG, YENİDOĞAN, HENDERSON, ALBÜMİN, WİNTER & DELTA-DELTA) ---');

// 35.1 HATA-M8-001: VBG HCO3 Düzeltmesi (-1.5 mEq/L) ve Anyon Açığı Sapmasını Önleme
// VBG numunesi: pH: 7.30, pCO2: 45, HCO3: 20, Na: 140, Cl: 106
const vbgSample = analyzeBloodGas({ pH: 7.30, pCO2: 45, HCO3: 20, Na: 140, Cl: 106, sampleType: 'VBG' });
assert.ok(vbgSample);
assert.strictEqual(vbgSample.isVBG, true);
assert.strictEqual(vbgSample.pH, 7.335); // 7.30 + 0.035
assert.strictEqual(vbgSample.pCO2, 40.0); // 45 - 5
assert.strictEqual(vbgSample.HCO3, 18.5); // 20 - 1.5
// Gerçek arteriyel AG = 140 - (106 + 18.5) = 15.5 mEq/L (HAGMA!)
assert.strictEqual(vbgSample.AG, 15.5);
assert.ok(vbgSample.hagmaStatus.includes('HAGMA'), 'VBG HCO3 düzeltmesi sonrası AG 15.5 ile HAGMA yakalanmalıdır');

// 35.2 HATA-M8-002: Yenidoğan Fizyolojik Kan Gazı Normları (<28 Gün)
// 3 günlük term bebek: pH 7.32, pCO2 42, HCO3 20 (Yetişkin kriterinde asidoz, yenidoğanda fizyolojik normal)
const neonateBg = analyzeBloodGas({ pH: 7.32, pCO2: 42, HCO3: 20, ageInDays: 3 });
assert.ok(neonateBg);
assert.strictEqual(neonateBg.isNeonatalNorms, true);
assert.strictEqual(neonateBg.primaryDisorder, 'Normal / Fizyolojik Yenidoğan Kan Gazı');
assert.ok(neonateBg.flags.includes('NEONATAL_NORMS'));

// Aynı değerler yetişkinde (30 yaş) -> Asidemi & Patolojik Miks Asidoz (Winter max 40 mmHg aşıldığı için)
const adultBg = analyzeBloodGas({ pH: 7.32, pCO2: 42, HCO3: 20, ageInYears: 30 });
assert.ok(adultBg);
assert.strictEqual(adultBg.isNeonatalNorms, false);
assert.strictEqual(adultBg.primaryDisorder, 'Miks Bozukluk: Metabolik Asidoz + Respiratuar Asidoz');

// Tam kompanze saf metabolik asidoz (pCO2: 38 mmHg, Winter aralığı: 36-40 mmHg)
const adultPureBg = analyzeBloodGas({ pH: 7.32, pCO2: 38, HCO3: 20, ageInYears: 30 });
assert.ok(adultPureBg);
assert.strictEqual(adultPureBg.primaryDisorder, 'Metabolik Asidoz');

// 35.3 HATA-M8-003: Henderson Denklemine Göre İç Tutarlılık Kontrolü
// İmkansız veri: pH 7.10 ([H+] ~80 nmol/L), pCO2 40, HCO3 24 ([H+] = 40 nmol/L)
const inconsistentBg = analyzeBloodGas({ pH: 7.10, pCO2: 40, HCO3: 24 });
assert.ok(inconsistentBg);
assert.strictEqual(inconsistentBg.isInternallyConsistent, false);
assert.ok(inconsistentBg.flags.includes('HENDERSON_INCONSISTENT'));
assert.ok(inconsistentBg.warnings.some(w => w.includes('iç tutarlılık testini geçemedi')));

// Tutarlı veri: pH 7.40, pCO2 40, HCO3 24 -> diff ~0%
const consistentBg = analyzeBloodGas({ pH: 7.40, pCO2: 40, HCO3: 24 });
assert.ok(consistentBg);
assert.strictEqual(consistentBg.isInternallyConsistent, true);

// 35.4 HATA-M8-004: Albümin Uyarısı ve Hipoalbüminemi ile Maskelenmiş Gizli HAGMA
// Albüminsiz giriş -> Uyarı verilmeli
const noAlbBg = analyzeBloodGas({ pH: 7.34, pCO2: 38, HCO3: 20, Na: 138, Cl: 106 });
assert.ok(noAlbBg);
assert.strictEqual(noAlbBg.hasAlbumin, false);
assert.ok(noAlbBg.warnings.some(w => w.includes('Albümin girilmedi')));

// Hipoalbüminemik hasta (Albumin: 1.8 g/dL): Ham AG: 12 (normal görünür), Düzeltilmiş AG: 17.5 (Ağır HAGMA!)
const maskedHagmaBg = analyzeBloodGas({ pH: 7.34, pCO2: 38, HCO3: 20, Na: 138, Cl: 106, Albumin: 1.8 });
assert.ok(maskedHagmaBg);
assert.strictEqual(maskedHagmaBg.AG, 12.0);
assert.strictEqual(maskedHagmaBg.corrected_AG, 17.5);
assert.ok(maskedHagmaBg.hagmaStatus.includes('Hipoalbüminemi ile Maskelenmiş Gizli HAGMA'));
assert.ok(maskedHagmaBg.flags.includes('MASKED_HAGMA'));

// 35.5 HATA-M8-005: Winter Formülü ile Miks Solunum Yetmezliğinin Primer Başlıkta Gösterilmesi
// Ağır DKA + Solunum yetmezliği: pH 7.15, pCO2 42, HCO3 14
// Winter beklenen pCO2: 1.5*14 + 8 = 29 (aralık 27-31). Ölçülen: 42 >> 31!
const mixedRespFailureBg = analyzeBloodGas({ pH: 7.15, pCO2: 42, HCO3: 14 });
assert.ok(mixedRespFailureBg);
assert.strictEqual(mixedRespFailureBg.primaryDisorder, 'Miks Bozukluk: Metabolik Asidoz + Respiratuar Asidoz');
assert.ok(mixedRespFailureBg.compensationText.includes('Solunum Yetmezliği'));
assert.ok(mixedRespFailureBg.flags.includes('RESP_ACIDOSIS'));

// 35.6 HATA-M8-006: Delta-Delta Analizinde Tahmini Bikarbonat ve Asidoz Dışı NAGMA Önleme Kalkanı
// Alkalozdaki hastada (pH 7.46, HCO3 28, AG 12) NAGMA denmemeli, 'Normal Anyon Açığı' denmeli
const alkalosisNormalAg = analyzeBloodGas({ pH: 7.46, pCO2: 40, HCO3: 28, Na: 140, Cl: 100 });
assert.ok(alkalosisNormalAg);
assert.strictEqual(alkalosisNormalAg.hagmaStatus, 'Normal Anyon Açığı (AG Normal)');
assert.ok(!alkalosisNormalAg.flags.includes('NAGMA'), 'Alkalozdaki hastaya asla NAGMA etiketi basılmamalıdır');

// HAGMA + Ağır Metabolik Alkaloz (HCO3: 26 >= 24, Na: 145, Cl: 99): Düz. AG = 20, Tahmini HCO3 = 26 + (20-12) = 34 mEq/L
const hagmaMetAlkBg = analyzeBloodGas({ pH: 7.42, pCO2: 40, HCO3: 26, Na: 145, Cl: 99 });
assert.ok(hagmaMetAlkBg);
assert.strictEqual(hagmaMetAlkBg.deltaRatio, null);
assert.strictEqual(hagmaMetAlkBg.estimated_HCO3, 34);
assert.ok(hagmaMetAlkBg.hagmaStatus.includes('Tahmini Bikarbonat: ~34 mEq/L'));

console.log('✓ Motor 8 Kan Gazı & Asit-Baz Analizi verified (100% healthy)');

console.log('\n--- 36. VERIFYING MOTOR 9: İDAME SIVI (HOLLIDAY-SEGAR, ATEŞ TAVANI, OBESİTE IBW, AAP/POTASYUM & PARKLAND ENTEGRASYONU) ---');

// 36.1 HATA-M9-001: Pediatrik Obezitede İdeal Vücut Ağırlığı (IBW) Kalkanı
// 8 yaşında obez çocuk (Gerçek Ağırlık: 52 kg, İdeal Ağırlık: 25 kg)
const obeseChildFluid = calculateMaintenanceFluid(52, null, { ibwKg: 25, isObese: true, ageYears: 8 });
assert.ok(obeseChildFluid);
assert.strictEqual(obeseChildFluid.effectiveWeightKg, 25);
assert.strictEqual(obeseChildFluid.dailyVolume, 1600); // 1500 + 5*20 = 1600 mL (52 kg için 2140 mL yerine!)
assert.strictEqual(obeseChildFluid.hourlyRate, 67);
assert.strictEqual(obeseChildFluid.isIbwUsed, true);
assert.ok(obeseChildFluid.warnings && obeseChildFluid.warnings.some(w => w.includes('Obezite Kalkanı')));

// Normal kilolu çocuk (25 kg) -> Gerçek kilo kullanılır
const normalChildFluid = calculateMaintenanceFluid(25, null, { ibwKg: 25, isObese: false, ageYears: 8 });
assert.ok(normalChildFluid);
assert.strictEqual(normalChildFluid.effectiveWeightKg, 25);
assert.strictEqual(normalChildFluid.dailyVolume, 1600);
assert.strictEqual(normalChildFluid.isIbwUsed, false);

// 36.2 HATA-M9-002: Ateş Düzeltmesinde Yetişkin Tavanı (Maksimum 2800 mL/gün)
// 80 kg yetişkin, Ateş: 40.0°C (Artışsız hacim: 2500 mL, ateşle 3250 mL yerine 2800 mL'ye kilitlenmeli)
const febrileAdultFluid = calculateMaintenanceFluid(80, 40.0, { ageYears: 45 });
assert.ok(febrileAdultFluid);
assert.strictEqual(febrileAdultFluid.originalVolume, 2500);
assert.strictEqual(febrileAdultFluid.dailyVolume, 2800, 'Ateşli yetişkinde tavan 2800 mL/gün ile sınırlandırılmalıdır');
assert.strictEqual(febrileAdultFluid.isAdultCapApplied, true);
assert.ok(febrileAdultFluid.warnings && febrileAdultFluid.warnings.some(w => w.includes('Yetişkin Sıvı Güvenlik Tavanı')));

// 36.3 HATA-M9-003: Düşük Kilolu / Kaşektik Yetişkinlerde AAP Pediatrik Önerisinin Engellenmesi
// 75 yaşında 44 kg kaşektik kadın hasta
const cachecticAdultFluid = calculateMaintenanceFluid(44, null, { ageYears: 75 });
assert.ok(cachecticAdultFluid);
assert.ok(cachecticAdultFluid.fluidTypeRecommendation.includes('Erişkin Standart İdame Sıvısı'));
assert.ok(!cachecticAdultFluid.fluidTypeRecommendation.includes('AAP'));

// Pediatrik hastada (örn. 8 yaş 25 kg) AAP önerisi gösterilmeli
const pediaFluidRec = calculateMaintenanceFluid(25, null, { ageYears: 8 });
assert.ok(pediaFluidRec);
assert.ok(pediaFluidRec.fluidTypeRecommendation.includes('AAP Güncel Önerisi'));

// 36.4 HATA-M9-004: Rutin İdame Sıvısında İdrar Çıkışı ve Potasyum Güvenlik Uyarısı
assert.ok(pediaFluidRec.fluidTypeRecommendation.includes('İdrar çıkışı teyit edilmeden'));
assert.ok(pediaFluidRec.fluidTypeRecommendation.includes('KCl eklenmemelidir'));

// 36.5 HATA-M9-005: Parkland Yanık Motoru ile Merkezi calculateMaintenanceFluid Entegrasyonu
// calculateParkland <30 kg yanıkta dekstrozlu idame sıvısını doğru hesaplamalıdır
const burnChild = calculateParkland(20, 20, 6, { burnType: 'atls10_thermal' });
assert.ok(burnChild);
assert.strictEqual(burnChild.requiresDextroseMaintenance, true);
assert.strictEqual(burnChild.maintenanceDailyMl, 1500); // 20 kg = 1000 + 10*50 = 1500 mL
assert.strictEqual(burnChild.maintenanceHourlyMl, 60); // 4-2-1 kuralı: 40 + 20 = 60 mL/s

console.log('✓ Motor 9 İdame Sıvı Motoru verified (100% healthy)');

console.log('\n--- 37. VERIFYING MOTOR 10: SIVI-ELEKTROLİT & SODYUM DÜZELTME (ADROGUÉ-MADİAS, ODS KALKANI, DÜZ. NA & CA) ---');

// 37.1 HATA-M10-001: Hiperglisemik Yalancı Hiponatremi Kalkanı (DKA/HHS %3 NaCl İntoksikasyon Önleme)
// 70 kg erkek DKA olgusu: Ölçülen Na = 124 mEq/L, Glukoz = 850 mg/dL (Düzeltilmiş sodyum: 142.0 mEq/L)
const pseudoHypo = calculateSodiumCorrection(124, 132, 70, 0.6, { glucoseMgDl: 850 });
assert.ok(pseudoHypo, 'Sodyum düzeltme sonucu dönmelidir');
assert.strictEqual(pseudoHypo.isPseudohyponatremia, true, 'Yalancı hiponatremi tespit edilmelidir');
assert.strictEqual(pseudoHypo.correctedNa, 142.0, 'Hillier ile düzeltilmiş sodyum 142 mEq/L olmalıdır');
assert.strictEqual(pseudoHypo.deficit, 0, 'Yalancı hiponatremide yapay sodyum açığı sıfırlanmalıdır');
assert.strictEqual(pseudoHypo.required3PercentMl, 0, 'Yalancı hiponatremide %3 NaCl infüzyonu engellenmelidir');
assert.ok(pseudoHypo.warning.includes('KONTRENDİKEDİR'), 'Hipertonik NaCl kontrendikasyon uyarısı verilmelidir');

// 37.2 HATA-M10-002: Hipernatremi Durumunda Negatif Açık Yerine Serbest Su Açığı (FWD) Hesabı
// 70 kg erkek hasta: Na = 162 mEq/L, TBW = 42 L
const hyperNa = calculateSodiumCorrection(162, 154, 70, 0.6);
assert.ok(hyperNa);
assert.strictEqual(hyperNa.isHypernatremia, true, 'Hipernatremi tespit edilmelidir');
assert.strictEqual(hyperNa.deficit, 0, 'Hipernatremide negatif sodyum açığı basılmamalıdır');
assert.strictEqual(hyperNa.freeWaterDeficitLiters, 6.6, 'FWD = 42 * (162/140 - 1) = 6.6 Litre olmalıdır');
assert.strictEqual(hyperNa.freeWaterHourlyD5WRateMl, 138, '48 saatlik %5 Dekstroz hızı ~138 mL/saat olmalıdır');
assert.ok(hyperNa.deltaD5W && hyperNa.deltaD5W < 0, '1L D5W serum sodyumunu düşürmelidir');
assert.ok(hyperNa.warning.includes('Serbest Su Açığı (FWD)'), 'FWD rehber uyarısı verilmelidir');
assert.ok(hyperNa.warning.includes('24 saatte maksimum 10-12 mEq/L'), 'Serebral ödem hız limiti belirtilmelidir');

// 37.3 HATA-M10-003: Ağır Hiperglisemide (>400 mg/dL) Hillier Faktörünün (2.4) Esas Alınması
// Glukoz: 900 mg/dL, Ölçülen Na: 130 mEq/L
// Katz: 130 + 0.016 * 800 = 142.8 | Hillier: 130 + 0.024 * 800 = 149.2 (Gerçek Hipernatremi!)
const severeHyperglycemiaNa = calculateCorrectedSodium({ measuredSodium: 130, glucoseMgDl: 900 });
assert.ok(severeHyperglycemiaNa);
assert.strictEqual(severeHyperglycemiaNa.correctedSodiumKatz, 142.8);
assert.strictEqual(severeHyperglycemiaNa.correctedSodiumHillier, 149.2);
assert.strictEqual(severeHyperglycemiaNa.correctedSodium, 149.2, 'Glukoz >400 mg/dL iken Hillier 149.2 mEq/L esas alınmalıdır');
assert.ok(severeHyperglycemiaNa.interpretation.includes('Gerçek Hipernatremi'), 'Ağır hiperglisemide gerçek hipernatremi yakalanmalıdır');
assert.ok(severeHyperglycemiaNa.formulaNotes && severeHyperglycemiaNa.formulaNotes.includes('Hillier 2.4 standardı'));

// 37.4 HATA-M10-004: Yüksek Riskli ODS Kalkanı (Na < 115 mEq/L veya Siroz/Malnütrisyonda 4-6 mEq/L Sınırı)
// Derin hiponatremi: Na = 110 mEq/L
const deepHypo = calculateSodiumCorrection(110, 120, 70, 0.6); // Delta 10 istenmiş
assert.ok(deepHypo);
assert.strictEqual(deepHypo.isHighRiskODS, true, 'Na < 115 durumunda otomatik yüksek riskli ODS atanmalıdır');
assert.strictEqual(deepHypo.maxRecommendedDelta, 6, 'Maksimum önerilen hedef 6 mEq/L olmalıdır');
assert.ok(deepHypo.warning.includes('4-6 mEq/L'), '4-6 mEq/L güvenlik sınırı uyarılmalıdır');
assert.ok(deepHypo.warning.includes('Santral Pontin Miyelinoliz'), 'ODS uyarısı verilmelidir');

// Sirozlu / Malnütrisyonlu hasta seçimi
const cirrhosisHypo = calculateSodiumCorrection(122, 130, 60, 0.5, { isHighRiskODS: true });
assert.ok(cirrhosisHypo);
assert.strictEqual(cirrhosisHypo.isHighRiskODS, true);
assert.ok(cirrhosisHypo.warning.includes('4-6 mEq/L'));

// 37.5 HATA-M10-005: Yaşa Göre Kalsiyum Eşikleri, g/L Albümin Kalkanı & İyonize Ca Notu
// A: g/L Albümin girişi (40 g/L -> 4.0 g/dL normalize edilir)
const caGl = calculateCorrectedCalcium({ totalCalcium: 8.0, albumin: 40 });
assert.ok(caGl);
assert.strictEqual(caGl.correctedCa, 8.0, '40 g/L albümin 4.0 g/dL olarak normalize edilmelidir');

// B: Term Yenidoğan (3 günlük bebek: total Ca 8.0 mg/dL fizyolojiktir, hipokalsiyemi alarmı verilmez)
const termNeonateCa = calculateCorrectedCalcium({ totalCalcium: 8.0, ageDays: 3 });
assert.ok(termNeonateCa);
assert.strictEqual(termNeonateCa.referenceRange.includes('Term Yenidoğan'), true);
assert.strictEqual(termNeonateCa.flags.includes('ALERT_HYPOCALCEMIA'), false, 'Term 3 günlük bebekte 8.0 mg/dL fizyolojiktir, yalancı hipokalsiyemi verilmemelidir');

// C: Preterm Bebek (Pretermde sınır 7.0 mg/dL'dir)
const pretermNormalCa = calculateCorrectedCalcium({ totalCalcium: 7.2, isPreterm: true });
assert.ok(pretermNormalCa);
assert.strictEqual(pretermNormalCa.flags.includes('ALERT_HYPOCALCEMIA'), false, 'Pretermde 7.2 mg/dL normaldir');

const pretermHypoCa = calculateCorrectedCalcium({ totalCalcium: 6.8, isPreterm: true });
assert.ok(pretermHypoCa);
assert.strictEqual(pretermHypoCa.flags.includes('ALERT_HYPOCALCEMIA'), true, 'Pretermde <7.0 mg/dL gerçek hipokalsiyemidir');

// D: Kritik Hasta / Ağır Hipoalbüminemi (Alb = 1.5 g/dL) İyonize Ca Uyarısı
const critCa = calculateCorrectedCalcium({ totalCalcium: 7.5, albumin: 1.5, isCriticallyIll: true });
assert.ok(critCa);
assert.ok(critCa.flags.includes('WARN_IONIZED_CALCIUM_GOLD_STANDARD'));
assert.ok(critCa.alertMsg.includes('İyonize Kalsiyum (iCa) altın standarttır'));

// 37.6 HATA-M10-006: Preterm ve Term Yenidoğan TBW Katsayıları
// Preterm 2.5 kg bebekte TBW %80 (2.0 L), term yenidoğanda %75
const pretermTbwCalc = calculateSodiumCorrection(130, 138, 2.5, 0.80);
assert.ok(pretermTbwCalc);
assert.strictEqual(pretermTbwCalc.tbwLiters, 2.0, 'Preterm TBW katsayısı %80 olmalıdır');

console.log('✓ Motor 10 Sıvı-Elektrolit & Sodyum Düzeltme Motoru verified (100% healthy)');

console.log('\n--- 38. VERIFYING MOTOR 6: NEFROLOJİ & TOKSİKOLOJİ (FENA, FEUREA, OSMOLAL GAP, RUMACK-MATTHEW NAC) ---');

// 38.1 HATA-M6-001: Geç Başvuruda (>24 Saat) NAC Protokolünün Üretilmesi
const lateApap = evaluateRumackMatthew({ hoursPostIngestion: 26, paracetamolLevelMcgMl: 40, weightKg: 70 });
assert.ok(lateApap, 'Geç başvuru sonucu dönmelidir');
assert.strictEqual(lateApap.status, 'LATE_PRESENTATION');
assert.strictEqual(lateApap.treatWithNAC, true);
assert.ok(lateApap.nacProtocol, 'Geç başvuruda nacProtocol nesnesi eksiksiz üretilmelidir');
assert.strictEqual(lateApap.nacProtocol?.phase1.totalMg, 10500);
assert.strictEqual(lateApap.nacProtocol?.phase2.totalMg, 3500);
assert.strictEqual(lateApap.nacProtocol?.phase3.totalMg, 7000);
assert.ok(lateApap.interpretation.includes('Geç başvuru'));

// 38.2 HATA-M6-002: Osmolal Açıkta Gerçek BUN Kullanımı ve Üremik Sahte Toksisitenin Önlenmesi
// Üremik ABH olgusu: BUN 84 mg/dL, Na: 136, Glu: 100, Ölçülen Osm: 325
const uremicOsm = calculateOsmolalGap({ measuredOsmolality: 325, sodium: 136, glucoseMgDl: 100, bunMgDl: 84 });
assert.ok(uremicOsm);
// Hesaplanan: 2*136 + 100/18 + 84/2.8 = 272 + 5.6 + 30.0 = 307.6 -> Gap: 325 - 307.6 = 17.4
assert.strictEqual(uremicOsm.isCriticalGap, false, 'Gerçek BUN kullanıldığında sahte kritik diyaliz alarmı verilmemelidir');

// 38.3 HATA-M6-003: Yenidoğan ve Preterm Bebeklerde FENa Eşikleri
// 3 günlük term bebek: İdrar Na: 30, Serum Na: 140, Serum Cr: 0.7, İdrar Cr: 7.0 -> FENa = %2.14
const neonateFena = calculateFENa({ serumSodium: 140, urineSodium: 30, serumCreatinine: 0.7, urineCreatinine: 7.0, ageDays: 3 });
assert.ok(neonateFena);
assert.strictEqual(neonateFena.fena, 2.14);
assert.ok(neonateFena.etiology.includes('Prerenal'), 'Term yenidoğanda %2.14 FENa fizyolojik/prerenal kabul edilmelidir');
assert.strictEqual(neonateFena.etiology.includes('ATN'), false, 'Yenidoğana yanlışlıkla intrensek ATN damgası vurulmamalıdır');

// Preterm bebekte FENa %2.8
const pretermFena = calculateFENa({ serumSodium: 140, urineSodium: 39.2, serumCreatinine: 0.7, urineCreatinine: 7.0, isPreterm: true });
assert.ok(pretermFena);
assert.strictEqual(pretermFena.fena, 2.8);
assert.ok(pretermFena.etiology.includes('Prerenal'));

// 38.4 HATA-M6-004: FENa ve FEUrea Formüllerinde 0 Girişine İzin Verilmesi (Ağır Prerenal Tablo)
const zeroUrineNaFena = calculateFENa({ serumSodium: 140, urineSodium: 0, serumCreatinine: 1.2, urineCreatinine: 100 });
assert.ok(zeroUrineNaFena, 'İdrar sodyumu 0 girildiğinde fonksiyon null dönmemelidir');
assert.strictEqual(zeroUrineNaFena.fena, 0.0);
assert.ok(zeroUrineNaFena.etiology.includes('Prerenal'));

const zeroUrineUrea = calculateFEUrea({ serumBUN: 40, isBun: true, urineUrea: 0, serumCreatinine: 1.2, urineCreatinine: 100 });
assert.ok(zeroUrineUrea, 'İdrar üresi 0 girildiğinde fonksiyon null dönmemelidir');
assert.strictEqual(zeroUrineUrea.feUrea, 0.0);

// 38.5 HATA-M6-005: Kilo Girilmediğinde Gizli 70 kg Yetişkin Varsayımı Yapılmaması
const noWeightApap = evaluateRumackMatthew({ hoursPostIngestion: 6, paracetamolLevelMcgMl: 180, weightKg: undefined });
assert.ok(noWeightApap);
assert.strictEqual(noWeightApap.isToxic, true);
assert.strictEqual(noWeightApap.nacProtocol, null, 'Kilo girilmediğinde gizli 70 kg ile miligram dozu üretilmemelidir');
assert.ok(noWeightApap.interpretation.includes('Kilo girilmediğinden'));

// 38.6 HATA-M6-006: Osmolal Açık Hesaplamasında Eşlik Eden Etanol Alımı (ethanolMgDl / 4.6)
// Etanol 150 mg/dL -> 150 / 4.6 = 32.6 mOsm/kg katkı
// Ölçülen Osm: 335 mOsm/kg (Etanolsüz Gap: 44.1 > 20 Kritik; Etanol dahil edilince Gap: 11.5 -> Kritik alarm önlenir)
const ethanolOsm = calculateOsmolalGap({ measuredOsmolality: 335, sodium: 140, glucoseMgDl: 100, bunMgDl: 15, ethanolMgDl: 150 });
assert.ok(ethanolOsm);
assert.ok(ethanolOsm.calculatedOsm >= 323); // 280 + 5.6 + 5.4 + 32.6 = 323.5
assert.strictEqual(ethanolOsm.gap, 11.5);
assert.strictEqual(ethanolOsm.isCriticalGap, false, 'Etanol hesaba katıldığında yapay sahte içki/metanol alarmı önlenmelidir');

console.log('✓ Motor 6 Nefroloji & Toksikoloji Motoru verified (100% healthy)');

console.log('\n--- 39. MOTOR 6 EK: CURB-65 & CRB-65 PNÖMONİ TRİYAJI & GÜVENLİK KALKANI ---');
// 39.1 HATA-M6-007: CURB-65 / CRB-65 Skorunun Pediatrik Hastalarda Kilitlenmesi (<18 Yaş)
const pediatricPneumonia = calculateCURB65({ ageYears: 4, respiratoryRateGte30: true });
assert.strictEqual(pediatricPneumonia.isValid, false);
assert.strictEqual(pediatricPneumonia.isPediatricLocked, true);
assert.strictEqual(pediatricPneumonia.score, 0);
assert.strictEqual(pediatricPneumonia.crbScore, 0);
assert.ok(pediatricPneumonia.recommendation.includes('yalnızca ≥18 yaş erişkinler için valide edilmiştir'));
assert.strictEqual(pediatricPneumonia.empiricAntibiotic.includes('1g 3x1'), false, 'Pediatrik hastaya yetişkin Amoksisilin 1g 3x1 dozu basılmamalıdır');

// 39.2 HATA-M6-009: CRB-65 Skorunun Bağımsız Birinci Basamak Değerlendirmesi (BUN Ölçümü Olmadığında)
// CRB-65 = 0: Düşük Risk (%0.9 mortalite, evde tedavi)
const crbZero = calculateCURB65({ isCRBOnly: true });
assert.strictEqual(crbZero.isCRB65Primary, true);
assert.strictEqual(crbZero.crbScore, 0);
assert.strictEqual(crbZero.mortalityPercent, 0.9);
assert.ok(crbZero.treatmentSetting.includes('Evde ayaktan tedavi'));

// CRB-65 = 1 (Örn: 72 yaşında hasta, BUN bakılmamış birinci basamak) -> Mortalite %8.2, hastane sevk/yatış!
const crbElderly = calculateCURB65({ ageYears: 72, isCRBOnly: true });
assert.strictEqual(crbElderly.isCRB65Primary, true);
assert.strictEqual(crbElderly.crbScore, 1);
assert.strictEqual(crbElderly.mortalityPercent, 8.2);
assert.ok(crbElderly.recommendation.includes('Hastaneye sevk ve yatış değerlendirilmelidir'));

// CRB-65 = 3 (72 yaşında, konfüze, takipneik) -> Mortalite %31.3, acil hastane/YBÜ
const crbSevere = calculateCURB65({ ageYears: 72, confusion: true, respiratoryRateGte30: true, isCRBOnly: true });
assert.strictEqual(crbSevere.isCRB65Primary, true);
assert.strictEqual(crbSevere.crbScore, 3);
assert.strictEqual(crbSevere.mortalityPercent, 31.3);
assert.ok(crbSevere.recommendation.includes('Yoğun Bakım Ünitesi (YBÜ)'));

// 39.3 CURB-65 Standart Değerlendirmesi (BUN Dahil)
const curbStandard = calculateCURB65({ ageYears: 70, confusion: true, bunOver19: true, respiratoryRateGte30: true });
assert.strictEqual(curbStandard.isCRB65Primary, false);
assert.strictEqual(curbStandard.score, 4);
assert.strictEqual(curbStandard.crbScore, 3);
assert.strictEqual(curbStandard.mortalityPercent, 22.0);

// 39.4 HATA-M6-011: Yoğun Bakım ATS/IDSA Majör/Minör Kriterleri Uyarısı
assert.ok(curbStandard.icuWarning);
assert.ok(curbStandard.icuWarning?.includes('mekanik ventilasyon veya vazopressör'));

// 39.5 HATA-M6-012: Beta-Laktam Alerjisi & Pseudomonas / MRSA Rehberliği
assert.ok(curbStandard.allergyWarning);
assert.ok(curbStandard.allergyWarning?.includes('beta-laktam anafilaksisi'));
assert.ok(curbStandard.allergyWarning?.includes('Pseudomonas'));

console.log('✓ Motor 6 Ek CURB-65 & CRB-65 Pnömoni Triyajı Motoru verified (100% healthy)');

console.log('\n--- 40. MOTOR 20: CERRAHİ, YANIK & AKUT BATIN MOTORU (ALVARADO, PARKLAND ATLS-10, RANSON) ---');
// 40.1 HATA-M20-001: Parkland / ATLS-10 Yanık Resüsitasyonunda Yaralanma Saati (Time Since Burn)
// 70 kg yetişkin, %40 TBSA, yangından 4 saat sonra başvuru
const delayedBurn = calculateParkland(70, 40, 30, { burnType: 'atls10_thermal', hoursSinceBurn: 4 });
assert.ok(delayedBurn);
assert.strictEqual(delayedBurn.totalVolume, 5600); // 2 * 70 * 40 = 5600 mL
assert.strictEqual(delayedBurn.first8HrsVolume, 2800);
assert.strictEqual(delayedBurn.remainingFirst8Hours, 4);
assert.strictEqual(delayedBurn.first8HrsRate, 700); // 2800 mL / 4h = 700 mL/saat (350 mL/saat eksik sıvı faciası önlendi!)
assert.strictEqual(delayedBurn.isDelayedPresentation, true);
assert.ok(delayedBurn.clinicalNote?.includes('Gecikmiş Başvuru'));

// 40.2 HATA-M20-002: Ranson Akut Pankreatit Skorunda Safra Taşı (Biliyer) vs Non-Biliyer Eşikleri
// 60 yaşında biliyer pankreatitli hasta (Biliyerde yaş eşiği >70'tir, 60 yaş puan ALMAMALIDIR)
const biliaryAge60 = calculateRanson({ etiology: 'biliary', ageYears: 60, bunRiseMgDl: 3 });
assert.ok(biliaryAge60);
assert.strictEqual(biliaryAge60.admissionScore, 0, 'Biliyer pankreatitte 60 yaş puan almamalıdır (eşik >70)');
assert.strictEqual(biliaryAge60.hour48Score, 1, 'Biliyer pankreatitte BUN artışı >2 mg/dL puan almalıdır');
assert.strictEqual(biliaryAge60.score, 1);
assert.strictEqual(biliaryAge60.maxScore, 10, 'Biliyer Ranson maksimum 10 puandır (PaO2 değerlendirilmez)');

// 60 yaşında alkolik/non-biliyer pankreatitli hasta (Non-biliyerde yaş eşiği >55'tir, puan ALMALIDIR; BUN artışı 3 mg/dL puan ALMAMALIDIR çünkü eşik >5'tir)
const nonBiliaryAge60 = calculateRanson({ etiology: 'non_biliary', ageYears: 60, bunRiseMgDl: 3 });
assert.ok(nonBiliaryAge60);
assert.strictEqual(nonBiliaryAge60.admissionScore, 1, 'Non-biliyer pankreatitte 60 yaş puan almalıdır (eşik >55)');
assert.strictEqual(nonBiliaryAge60.hour48Score, 0, 'Non-biliyerde BUN artışı 3 mg/dL puan almamalıdır (eşik >5)');
assert.strictEqual(nonBiliaryAge60.maxScore, 11);

// 40.3 HATA-M20-003: <30 kg Pediatrik Yanıkta Birleşik İnfüzyon Hızı (Yanık + İdame)
// 20 kg çocuk, %30 TBSA termal yanık
const pedBurnCombined = calculateParkland(20, 30, 6, { burnType: 'atls10_thermal' });
assert.ok(pedBurnCombined);
assert.strictEqual(pedBurnCombined.totalVolume, 1800); // 3 * 20 * 30 = 1800 mL
assert.strictEqual(pedBurnCombined.first8HrsVolume, 900);
assert.strictEqual(pedBurnCombined.first8HrsRate, 113); // 900 / 8 = 112.5 -> 113 mL/s
assert.strictEqual(pedBurnCombined.maintenanceHourlyMl, 60); // 4-2-1 kuralı: 60 mL/s
assert.strictEqual(pedBurnCombined.combinedFirst8HoursRate, 173); // 113 + 60 = 173 mL/s bileşik hız!

// 40.4 HATA-M20-004: Ranson 0. Saatte Erken Yalancı Güven (False Reassurance) Uyarısı
const ransonEarly = calculateRanson({ etiology: 'non_biliary', ageO55: true, wbcO16: true });
assert.ok(ransonEarly);
assert.strictEqual(ransonEarly.admissionScore, 2);
assert.strictEqual(ransonEarly.hour48Score, 0);
assert.ok(ransonEarly.earlyWarning);
assert.ok(ransonEarly.earlyWarning?.includes('Ranson skoru 48. saat tamamlanmadan kesinleştirilemez'));

// 40.5 HATA-M20-005: Alvarado Apandisit Skorunda Doğurganlık Çağındaki Kadınlarda Jinekolojik Kalkan
const alvWoman = calculateAlvarado({ rlqPain: true, rebound: true, leukocytosis: true, gender: 'female', ageYears: 24 });
assert.ok(alvWoman);
assert.strictEqual(alvWoman.score, 5);
assert.ok(alvWoman.gynecologicWarning);
assert.ok(alvWoman.gynecologicWarning?.includes('Doğurganlık Çağında Kadın'));
assert.ok(alvWoman.gynecologicWarning?.includes('pelvik USG ve gebelik testi'));

const alvMan = calculateAlvarado({ rlqPain: true, rebound: true, leukocytosis: true, gender: 'male', ageYears: 24 });
assert.ok(alvMan);
assert.strictEqual(alvMan.gynecologicWarning, undefined);

console.log('✓ Motor 20 Cerrahi, Yanık & Akut Batın Motoru verified (100% healthy)');

// ==========================================
// 41. MOTOR 7: AAP 2022 YENİDOĞAN SARILIK, NOMOGRAM, B/A & ESKALASYON DENETİMİ (ADIM 15)
// ==========================================
console.log('--- 41. VERIFYING MOTOR 7: NEONATAL JAUNDICE & AAP 2022 ENGINE (ADIM 15) ---');

// 41.1 HATA-M7-001: TcB ile Kan Değişimi & Bakım Eskalasyonu Kararı Verilemez (AAP 2022 KAS 6 & 17)
const tcbExchangeBaby = evaluateAap2022Jaundice({
  ageHours: 48,
  totalBilirubin: 22.0,
  gestationalWeeks: 38,
  measurementType: 'TcB'
});
assert.ok(tcbExchangeBaby.isValid);
assert.strictEqual(tcbExchangeBaby.status, 'TCB_REQUIRES_STAT_TSB_CONFIRMATION', 'TcB ile kan değişimi kararı verilemez, STAT TSB kanı şarttır');
assert.strictEqual(tcbExchangeBaby.requiresTsbConfirmation, true);
assert.ok(tcbExchangeBaby.clinicalAlerts.some(a => a.type === 'TCB_CONFIRMATION' && a.severity === 'CRITICAL'));

const tcbEscalationBaby = evaluateAap2022Jaundice({
  ageHours: 48,
  totalBilirubin: 21.5,
  gestationalWeeks: 38,
  measurementType: 'TcB'
});
assert.strictEqual(tcbEscalationBaby.status, 'TCB_REQUIRES_STAT_TSB_CONFIRMATION', 'TcB ile eskalasyon kararı verilemez, STAT TSB kanı şarttır');

const tsbExchangeBaby = evaluateAap2022Jaundice({
  ageHours: 48,
  totalBilirubin: 23.5,
  gestationalWeeks: 38,
  measurementType: 'TSB'
});
assert.strictEqual(tsbExchangeBaby.status, 'EXCHANGE_TRANSFUSION_REQUIRED');

// 41.2 HATA-M7-002: Eksik Albüminde STAT Albümin Zorunluluğu Uyarısı (AAP 2022 KAS 18)
const missingAlbuminEscalation = evaluateAap2022Jaundice({
  ageHours: 48,
  totalBilirubin: 21.2,
  gestationalWeeks: 38,
  measurementType: 'TSB',
  albuminGPerDl: null
});
assert.ok(missingAlbuminEscalation.clinicalAlerts.some(a => a.type === 'ALBUMIN_MANDATORY_WARNING'));
assert.ok(missingAlbuminEscalation.recommendations.some(r => r.includes('STAT serum albümin')));

// 41.3 HATA-M7-003: İlk 12 Saatte ABE Varlığında Derhal Acil Kan Değişimi (AAP 2022 KAS 19 & 20)
const earlyAbeBaby = evaluateAap2022Jaundice({
  ageHours: 8,
  totalBilirubin: 10.0,
  gestationalWeeks: 39,
  measurementType: 'TSB',
  abeSymptoms: {
    retrocollis: true,
    opisthotonos: true,
    highPitchedCry: true,
    hypertonia: true
  }
});
assert.strictEqual(earlyAbeBaby.status, 'EXCHANGE_TRANSFUSION_REQUIRED', 'İlk 12 saatte ABE varsa TSB ne olursa olsun derhal acil kan değişimi yapılmalıdır');
assert.ok(earlyAbeBaby.escalationProtocol && earlyAbeBaby.escalationProtocol.isEscalationActive, 'ABE durumunda eskalasyon protokolü aktif olmalıdır');

// 41.4 HATA-M7-004: Non-subtraction Kuralı (Direkt Bilirubin TSB Değerinden Düşülmez)
const directBiliBaby = evaluateAap2022Jaundice({
  ageHours: 48,
  totalBilirubin: 16.0,
  gestationalWeeks: 38,
  directBilirubinMgDl: 2.5,
  measurementType: 'TSB'
});
assert.ok(directBiliBaby.directBilirubinAnalysis);
assert.strictEqual(directBiliBaby.directBilirubinAnalysis.directBilirubinMgDl, 2.5);
assert.strictEqual(directBiliBaby.totalBilirubin, 16.0, 'Direkt bilirubin TSB değerinden düşülmemelidir');
assert.ok(directBiliBaby.clinicalAlerts.some(a => a.type === 'NON_SUBTRACTION_RULE'));

// 41.5 HATA-M7-005: TND Preterm Keyfi (GW-25)/10 Çarpanının Kaldırılması & Maisels 2012 Entegrasyonu
const pretermMaiselsBaby = calculateBhutaniJaundice({
  ageHours: 48,
  totalBilirubin: 11.0,
  gestationalWeeks: 32,
  guideline: 'TND_2014'
});
assert.ok(pretermMaiselsBaby.riskGroupLabel?.includes('Maisels 2012 / TND Preterm'));
assert.strictEqual(pretermMaiselsBaby.phototherapyThreshold, 10.0, 'Maisels 2012 bandı 32-33w fototerapi alt eşiği 10 mg/dL olmalıdır');
assert.strictEqual(pretermMaiselsBaby.exchangeThreshold, 15.0, 'Maisels 2012 bandı 32-33w kan değişimi alt eşiği 15 mg/dL olmalıdır');
assert.strictEqual(pretermMaiselsBaby.status, 'PHOTOTHERAPY_REQUIRED');

// 41.6 HATA-M7-006: Fototerapi Kesme Kuralı (Eşiğin en az 2 mg/dL altına inme şartı - AAP KAS 14)
const ptCutoffBaby = evaluateAap2022Jaundice({
  ageHours: 48,
  totalBilirubin: 14.0,
  gestationalWeeks: 38,
  measurementType: 'TSB'
});
assert.ok(ptCutoffBaby.clinicalAlerts.some(a => a.type === 'PHOTOTHERAPY_DISCONTINUATION_WARNING'));
assert.strictEqual(ptCutoffBaby.status, 'CLOSE_MONITORING');

console.log('✓ Motor 7 Yenidoğan Sarılık Motoru verified (100% healthy)');

// ==========================================
// 42. MOTOR 7 EK: PRETERM SARILIK, MAISELS 2012, TND, REBOUND & IUGR KALKANI (ADIM 16)
// ==========================================
console.log('--- 42. VERIFYING MOTOR 7 EK: PRETERM JAUNDICE, MAISELS 2012 & REBOUND (ADIM 16) ---');

// 42.1 HATA-M7-007: Preterm Gestasyonel Hafta Değerlendirmesi (<35 Hafta AAP Block)
const pt29Baby = evaluateAap2022Jaundice({
  ageHours: 48,
  totalBilirubin: 11.0,
  gestationalWeeks: 29,
  measurementType: 'TSB'
});
assert.ok(pt29Baby.isValid);
assert.strictEqual(pt29Baby.gestationalAge.isPreterm, true);
assert.strictEqual(pt29Baby.gestationalAge.isAapBlocked, true);
assert.ok(pt29Baby.pretermGuidance);
assert.strictEqual(pt29Baby.status, 'PHOTOTHERAPY_REQUIRED');

// 42.2 HATA-M7-008: Preterm Bebeklerde Rebound İzlemi ve Fototerapi Sonlandırma
const ptReboundBaby = evaluateAap2022Jaundice({
  ageHours: 72,
  totalBilirubin: 7.5,
  gestationalWeeks: 31,
  measurementType: 'TSB',
  isPhototherapyDiscontinuationEvaluation: true
});
assert.ok(ptReboundBaby.reboundEvaluation, 'Preterm bebekte rebound değerlendirmesi null olmamalıdır');
assert.strictEqual(ptReboundBaby.reboundEvaluation.isHighReboundRisk, true);
assert.strictEqual(ptReboundBaby.reboundEvaluation.riskTier, 'HIGH_REBOUND_RISK');
assert.strictEqual(ptReboundBaby.reboundEvaluation.reboundFollowUpHours, '6–12 saat içinde kontrol TSB');
assert.ok(ptReboundBaby.clinicalAlerts.some(a => a.type === 'REBOUND_HIGH_RISK'));

// 42.3 HATA-M7-009: TND/NICE Preterm 0-72 Saat Dinamik Rampasında Yaşamın İlk Saatlerinde Fizyolojik Taban
const tndEarlyHours = calculatePretermTndNiceThreshold({ gestationalWeeks: 30, ageHours: 4 });
assert.strictEqual(tndEarlyHours.plateauThresholdMgDl, 12.0);
assert.strictEqual(tndEarlyHours.dynamicThresholdMgDl, 2.5, '0-4 saatte eşik 0.7 değil en az 2.5 mg/dL olmalıdır');
assert.strictEqual(tndEarlyHours.niceUmolLDynamic, 40);

const tndMidHours = calculatePretermTndNiceThreshold({ gestationalWeeks: 30, ageHours: 36 });
assert.strictEqual(tndMidHours.dynamicThresholdMgDl, 6.0, '36. saatte eşik 6.0 mg/dL olmalıdır');

// 42.4 HATA-M7-010: Maisels 2012 IUGR / SGA Kriteri (Daha Düşük Kilo Bandının Seçilmesi)
// 33 haftalık bebek fakat 950g doğmuş (PMA bandı 32-33w yerine <1000g Band 0 seçilmeli)
const iugrBaby = evaluatePretermJaundice({
  gestationalWeeks: 33,
  ageHours: 48,
  totalBilirubin: 7.0,
  birthWeightGrams: 950
});
assert.strictEqual(iugrBaby.activeMaiselsBand.bandId, '<28', 'IUGR 950g bebekte <1000g bandı seçilmelidir');
assert.strictEqual(iugrBaby.effectiveThresholds.phototherapy, 6.0, '<1000g fototerapi üst sınırı 6 mg/dL olmalıdır');
assert.ok(iugrBaby.clinicalAlerts.some(a => a.type === 'PRETERM_IUGR_DOWNGRADE_WARNING'));
assert.strictEqual(iugrBaby.status, 'PHOTOTHERAPY_REQUIRED');

// 42.5 HATA-M7-011: Preterm Bebeklerde B/A Oranı Analizi
const pretermBaBaby = evaluateAap2022Jaundice({
  ageHours: 48,
  totalBilirubin: 13.0,
  gestationalWeeks: 32,
  albuminGPerDl: 1.8,
  measurementType: 'TSB'
});
assert.ok(pretermBaBaby.bilirubinAlbuminRatio, 'Preterm bebekte B/A oranı null veya undefined olmamalıdır');
assert.strictEqual(pretermBaBaby.bilirubinAlbuminRatio.ratio, 7.22);
assert.strictEqual(pretermBaBaby.bilirubinAlbuminRatio.isThresholdExceeded, true);
assert.ok(pretermBaBaby.clinicalAlerts.some(a => a.type === 'BA_RATIO'));

// 42.6 HATA-M7-012: ELBW (<750 g) İrradiyans Kalkanı
const elbwBaby = evaluateAap2022Jaundice({
  ageHours: 48,
  totalBilirubin: 4.5,
  gestationalWeeks: 27,
  birthWeightGrams: 650,
  measurementType: 'TSB'
});
assert.ok(elbwBaby.clinicalAlerts.some(a => a.type === 'PRETERM_IRRADIANCE_WARNING'));

// ==========================================
// 43. MOTOR 14: PEDİATRİK BÜYÜME & PERSENTİL MOTORU (WHO/NEYZI/MALNUTRITION/CRANIAL)
// ==========================================
console.log('\n--- Section 43: Motor 14 Pediatrik Büyüme & Persentil Motoru ---');

// 43.1 HATA-M14-001: İlk Vizitte Akut Malnütrisyon (SAM/MAM) Taraması (Cross-sectional)
const samEdemaChild = calculatePercentiles({
  gender: 'female',
  ageMonths: 12,
  weightKg: 7.5,
  heightCm: 72,
  hasBilateralEdema: true
});
assert.ok(samEdemaChild.malnutritionAssessment, 'malnutritionAssessment mevcut olmalıdır');
assert.strictEqual(samEdemaChild.malnutritionAssessment.category, 'SAM');
assert.strictEqual(samEdemaChild.malnutritionAssessment.treatmentProtocol.setting, 'INPATIENT');

const samMuacChild = calculatePercentiles({
  gender: 'male',
  ageMonths: 18,
  weightKg: 8.0,
  heightCm: 78,
  muacMm: 110,
  hasMedicalComplications: false
});
assert.strictEqual(samMuacChild.malnutritionAssessment?.category, 'SAM');
assert.strictEqual(samMuacChild.malnutritionAssessment?.treatmentProtocol.setting, 'OUTPATIENT');

// 43.2 HATA-M14-002: WAZ ile WHZ/BAZ Ayrımı (Orantılı Kısa Çocukta Yanlış MAM/SAM Engeli)
const shortProportionalChild = calculatePercentiles({
  gender: 'male',
  ageMonths: 20,
  weightKg: 8.5, // WAZ is low (Z: -2.38)
  heightCm: 76,  // HAZ is also low (Z: -2.55) -> proportional
  muacMm: 135
});
assert.ok(shortProportionalChild.weightZ < -2.0, 'Kilo z-skoru düşük olmalıdır (stunting zemininde düşük WAZ)');
assert.ok(shortProportionalChild.bmiZ > -1.5, 'BMI/Boy z-skoru orantılı olduğu için normal aralıkta olmalıdır');
assert.strictEqual(shortProportionalChild.malnutritionAssessment?.category, 'WELL_NOURISHED', 'Orantılı kısa çocuk hatalı şekilde MAM veya SAM olarak etiketlenmemelidir');

// 43.3 HATA-M14-003: Çift Referansta Bağımsız Pozisyon Düzeltmesi (DSÖ vs Neyzi)
const supine30Mo = calculatePercentiles({
  gender: 'male',
  ageMonths: 30,
  weightKg: 13.5,
  heightCm: 85.0,
  measurementPosition: 'recumbent',
  standard: 'who_2022'
});
// DSÖ 24 ay geçiş: 30 ayda yatarak ölçüm ayakta ölçüme çevrilmek için 0.7 cm çıkarılır -> 84.3 cm
assert.strictEqual(supine30Mo.effectiveHeightCm, 84.3);
// Neyzi 36 ay geçiş: 30 ayda yatarak ölçüm zaten standarttır, 0.7 cm çıkarılmaz -> 85.0 cm!
assert.ok(supine30Mo.comparisonWithAlternative, 'comparisonWithAlternative tanımlı olmalıdır');
assert.strictEqual(supine30Mo.comparisonWithAlternative.alternativeEffectiveHeight, 85.0, 'Neyzi 30 ayda yatarak ölçümde 0.7 cm çıkarılmamalıdır');

// 43.4 HATA-M14-004: NICE Büyüme Duraklaması Doğum / Önceki Persentil Kanal Düşüşü
const falteringChild = calculateGrowthVelocity({
  ageMonths: 9,
  currentWeightKg: 6.8,
  previousWeightKg: 6.7,
  daysBetween: 90,
  birthPercentile: 75,
  currentPercentile: 3
});
assert.strictEqual(falteringChild.centileDropAnalysis?.isPathologicalFaltering, true, 'Doğum persentiline göre kanal düşüşü yakalanmalıdır');
assert.ok(falteringChild.centileDropAnalysis?.falteringReason?.includes('≥2 persentil kanalı düşüş'), 'Kanal düşüş kriteri açıklamalarda yer almalıdır');

// 43.5 HATA-M14-005: Uç Z-skorları ve Persentil Formatı
assert.strictEqual(formatPercentileDisplay(1, 0.01, -3.8), '%<1 (%0.01, Z: -3.8)');
assert.strictEqual(formatPercentileDisplay(99, 99.98, 3.5), '%>99 (%99.98, Z: +3.5)');
assert.strictEqual(formatPercentileDisplay(50, 50.0, 0.0), '%50');

const extremeChild = calculatePercentiles({
  gender: 'male',
  ageMonths: 12,
  weightKg: 6.0, // Extremely low weight for 12 months
  heightCm: 75.7
});
assert.ok(extremeChild.weightPercentileDisplay.startsWith('%<1'), 'Aşırı düşük kilo persentili %<1 formatında olmalıdır');

// 43.6 HATA-M14-006: Kraniyal Taramada Fontanel Kapanma Yaşı (>= 24 ayda USG yerine MR/BT)
const closedFontanelle = calculateCranialScreening({
  gender: 'male',
  ageMonths: 26,
  currentHeadCircCm: 53.0,
  previousHeadCircCm: 48.0,
  daysBetween: 60
});
assert.ok(closedFontanelle.clinicalRecommendations.some(r => r.includes('MRG') || r.includes('MR')), '24 aydan büyük çocukta fontanel kapalı olduğundan MRG önerilmelidir');

const openFontanelle = calculateCranialScreening({
  gender: 'male',
  ageMonths: 6,
  currentHeadCircCm: 47.0,
  previousHeadCircCm: 43.0,
  daysBetween: 30
});
assert.ok(openFontanelle.clinicalRecommendations.some(r => r.includes('Transfontanel USG')), 'Küçük süt çocuğunda TFUS önerilmelidir');

console.log('✓ Motor 14 Pediatrik Büyüme & Persentil Motoru verified (100% healthy)');

// ==========================================
// 44. MOTOR 15: PEDİATRİK DEMİR & TALASEMİ AYRIMI (TPHD, MENTZER, DİVİDED DOSE, PRETERM)
// ==========================================
console.log('\n--- Section 44: Motor 15 Pediatrik Demir & Talasemi Ayrımı ---');

// 44.1 HATA-M15-001: Mikrositoz Varlığında RBC Girilmediğinde Talasemi Uyarısı
const microcyticNoRbc = calculatePediatricIron({
  ageMonths: 24,
  weightKg: 12,
  hb: 9.0,
  mcv: 60
});
assert.strictEqual(microcyticNoRbc.differential?.isMicrocytic, true, 'MCV 60 fL mikrositer olarak tespit edilmelidir');
assert.strictEqual(microcyticNoRbc.differential?.thalassemiaRisk, 'POSSIBLE', 'RBC girilmediğinde talasemi riski POSSIBLE olarak işaretlenmelidir');
assert.ok(microcyticNoRbc.treatment.text.includes('Belirgin mikrositoz mevcut ancak RBC girilmediği için Mentzer İndeksi hesaplanamadı'), 'Tedavi çıktısında RBC eksikliği ve talasemi uyarısı yer almalıdır');

// 44.2 HATA-M15-002: Terapötik Demir Dozunun Günde 2-3 Doza Bölünmesi
const dividedDoseChild = calculatePediatricIron({
  ageMonths: 24,
  weightKg: 10,
  hb: 8.5
});
assert.strictEqual(dividedDoseChild.treatment.mgDay, 40);
assert.strictEqual(dividedDoseChild.treatment.ferrumDrops, 16);
assert.strictEqual(dividedDoseChild.treatment.ferrumDividedDrops, 'Günde 2x8 damla (veya 3x5 damla)');
assert.strictEqual(dividedDoseChild.treatment.ferroDividedDrops, 'Günde 2x14 damla (veya 3x9 damla)');
assert.strictEqual(dividedDoseChild.treatment.syrupDividedMl, 'Günde 2x2.0 mL (veya 3x1.3 mL)');
assert.ok(dividedDoseChild.treatment.dividedDoseText?.includes('günde 2 veya 3 doza bölünerek'), 'Bölünmüş doz metni mevcut olmalıdır');

// 44.3 HATA-M15-003: 6 Yaş Altı Çocuklarda Keyfi 60 mg Tavanının Kaldırılması
const olderChildIron = calculatePediatricIron({
  ageMonths: 60,
  weightKg: 25,
  hb: 8.5
});
assert.strictEqual(olderChildIron.treatment.mgDay, 100, '25 kg çocukta 4 mg/kg karşılığı 100 mg olmalıdır; 60 mg ile kısıtlanmamalıdır');

// 44.4 HATA-M15-004: 12-24 Ay Arası Çocuklarda TPHD 70 + Yaş MCV Kuralı
const ironToddler = calculatePediatricIron({
  ageMonths: 18,
  weightKg: 11,
  hb: 9.5,
  mcv: 70.5
});
assert.strictEqual(ironToddler.differential?.mcvLowerLimit, 71, '18 aylık (1 yaş) çocukta MCV alt sınırı 70 + 1 = 71 fL olmalıdır');
assert.strictEqual(ironToddler.differential?.isMicrocytic, true, '70.5 fL değeri 71 fL altında olduğundan mikrositer sayılmalıdır');

// 44.5 HATA-M15-005: Ferritin Değerlendirmesinde Akut Enfeksiyon / İnflamasyon Kalkanı
const ironWithFerritin = calculatePediatricIron({
  ageMonths: 24,
  weightKg: 12,
  hb: 9.0,
  ferritin: 25
});
assert.ok(ironWithFerritin.differential?.ferritinInfectionNote?.includes('akut faz reaktanıdır'), 'Ferritin akut faz reaktanı uyarısı bulunmalıdır');

// 44.6 HATA-M15-006: Preterm Bebek Profilaksisinde Tam Enteral Beslenme Şartı
const pretermIron = calculatePediatricIron({
  ageMonths: 2.5,
  weightKg: 3.5,
  isPreterm: true
});
assert.strictEqual(pretermIron.prophylaxis.eligible, true);
assert.ok(pretermIron.prophylaxis.text.includes('tam enteral beslenmeye'), 'Preterm profilaksisinde tam enteral beslenme şartı yer almalıdır');

console.log('✓ Motor 15 Pediatrik Demir & Talasemi Ayrımı verified (100% healthy)');

// --- Section 45: Motor 16 Pediatrik Şurup & Süspansiyon Dozlama Motoru (Adım 19) ---
console.log('\n--- Section 45: Motor 16 Pediatrik Şurup & Süspansiyon Dozlama Motoru ---');

// 45.1 HATA-M16-001: İbuprofen Günlük Kümülatif Doz Tavanı (Daily Adult Cap)
const ibupCumChild = calculatePediatricDose(35, 'ibuprofen_100');
assert.strictEqual(ibupCumChild.targetDoseMg, 350);
assert.ok(ibupCumChild.dailyCumulativeWarning, '35 kg çocukta 4x350 = 1400 mg/gün için günlük tavan uyarısı üretilmelidir');
assert.ok(ibupCumChild.dailyCumulativeWarning?.includes('1400 mg/gün'), 'Günlük toplam dozu belirtmelidir');
assert.ok(ibupCumChild.dailyCumulativeWarning?.includes('300 mg'), '6 saatte bir en fazla 300 mg (15 mL) önerilmelidir');

// 45.2 HATA-M16-002: Düşük Konsantrasyonlu Parasetamol Şurubunda (120 mg/5 mL) Yüksek Hacim Uyarısı
const paraHighVolChild = calculatePediatricDose(40, 'paracetamol_120');
assert.strictEqual(paraHighVolChild.volumeMl, 25.0);
assert.ok(paraHighVolChild.highVolumeWarning, '25 mL tek doz hacminde yüksek hacim uyarısı üretilmelidir');
assert.ok(paraHighVolChild.highVolumeWarning?.includes('25 mL'), 'Hacmi belirtmelidir');
assert.ok(paraHighVolChild.highVolumeWarning?.includes('250 mg/5 mL') || paraHighVolChild.highVolumeWarning?.includes('tablet'), 'Daha konsantre forma veya tablete geçiş önerilmelidir');

// 45.3 HATA-M16-003: Amoksisilin-Klavulanat 14:1 (ES 600) Endikasyon Uyarısı
const amoxEsGeneral = calculatePediatricDose(15, 'amoklavin_600', { indication: 'general' });
assert.ok(amoxEsGeneral.ratioNotice?.includes('⚠️ ES Formu Uyarısı'), 'AOM seçilmediğinde 14:1 formu için kılavuz uyarısı üretilmelidir');
assert.ok(amoxEsGeneral.ratioNotice?.includes('7:1 (BID 200 veya 400)'), 'Standart 7:1 önerilmelidir');

const amoxEsAom = calculatePediatricDose(15, 'amoklavin_600', { indication: 'aom_high_dose' });
assert.ok(amoxEsAom.ratioNotice?.includes('✅ 14:1 ES Formülasyonu'), 'AOM seçildiğinde 14:1 ES onay bildirimi üretilmelidir');

// 45.4 HATA-M16-004: Metrik Dozaj Çıktısında Oral Dozaj Enjektörü Vurgusu
const syringeDose = calculatePediatricDose(12, 'paracetamol_250');
assert.strictEqual(syringeDose.olcekText, '3.6 mL (Oral Enjektör ile)', 'olcekText oral enjektör ile vurgusunu içermelidir');

// 45.5 HATA-M16-005: Yaş Bilinmediğinde ve Kilo <10 kg İken TİTCK Kilidi
const ibupNoAge7kg = calculatePediatricDose(7.5, 'ibuprofen_100', { allowOffLabelTitck: false });
assert.strictEqual(ibupNoAge7kg.isBlocked, true, 'Yaş belirtilmediğinde ve kilo 7.5 kg (<10 kg) iken TİTCK ruhsat kilidi aktif olmalıdır');
assert.ok(ibupNoAge7kg.blockReason?.includes('<10 kg') || ibupNoAge7kg.blockReason?.includes('bebeğin <6 ay olma riski'), 'Bebeklik eşik uyarısı içermelidir');

// 45.6 HATA-M16-006: Obez Çocukta Hidrofilik İlaçlarda (Parasetamol) Varsayılan IBW Dozlaması
const obeseChildNoOpt = calculatePediatricDose(45, 'paracetamol_120', {
  ageMonths: 84,
  heightCm: 120,
  gender: 'male'
});
assert.strictEqual(obeseChildNoOpt.isObeseAlert, true);
assert.strictEqual(obeseChildNoOpt.usedWeightType, 'IBW', 'Obez çocukta hidrofilik parasetamol useIbw belirtilmediğinde varsayılan olarak IBW kullanmalıdır');

const obeseChildExplicitTbw = calculatePediatricDose(45, 'paracetamol_120', {
  ageMonths: 84,
  heightCm: 120,
  gender: 'male',
  useIbw: false
});
assert.strictEqual(obeseChildExplicitTbw.usedWeightType, 'TBW', 'Açıkça useIbw: false verildiğinde TBW kullanılmalıdır');

console.log('✓ Motor 16 Pediatrik Şurup & Süspansiyon Dozlama Motoru verified (100% healthy)');

console.log('\n--- Section 46: Motor 17 & 18 Aşı Takvimi, Yakalama & Centor/McIsaac ---');

// 46.1 HATA-M18-001: Centor/McIsaac <3 Yaş Çocuklarda Kılavuz Kalkanı
const centorToddler = calculateCentorMcIsaac({
  feverOver38: true,
  noCough: true,
  tenderCervicalNodes: true,
  tonsillarExudate: true,
  ageYears: 1.5
});
assert.strictEqual(centorToddler.isUnder3Years, true, '<3 yaş için kalkan aktif olmalıdır');
assert.ok(centorToddler.guidelineWarning?.includes('3 yaşından küçük çocuklarda geçerli değildir'), 'IDSA <3 yaş kılavuz uyarısı içermelidir');
assert.ok(centorToddler.riskPercent.includes('<3 Yaş Geçersiz'), 'Risk yüzdesi geçersiz olarak işaretlenmelidir');

// 46.2 HATA-M18-002: Yaş Belirtilmediğinde Centor Bilgilendirme Notu
const centorNoAge = calculateCentorMcIsaac({
  feverOver38: true,
  noCough: true,
  tenderCervicalNodes: true,
  tonsillarExudate: false,
  ageYears: undefined
});
assert.strictEqual(centorNoAge.isAgeUnknown, true, 'Yaş belirtilmediği tespit edilmelidir');
assert.ok(centorNoAge.guidelineWarning?.includes('yaşı belirtilmediğinden'), 'Yaş eksikliği uyarısı verilmelidir');
assert.strictEqual(centorNoAge.score, 3, 'Yaş puanı eklenmeden 3 semptom puanı olmalıdır');

// 46.3 HATA-M17-001: T.C. Sağlık Bakanlığı GBP 5'li Karma ve 18. Ay HepB Yokluğu
const vax2Schedule = getVaccineSchedule(2);
assert.ok(vax2Schedule && vax2Schedule.some(v => v.includes('DaBT-İPA-Hib (1. Doz)')), '2. ayda 5li karma DaBT-İPA-Hib bulunmalıdır');
assert.ok(!vax2Schedule?.some(v => v.includes('DaBT-İPA-Hib-HepB')), '2. ayda 6li karma adı yer almamalıdır');

const vax18Schedule = getVaccineSchedule(18);
assert.ok(vax18Schedule && vax18Schedule.some(v => v.includes('DaBT-İPA-Hib (Rapel)')), '18. ayda DaBT-İPA-Hib rapeli bulunmalıdır');
assert.ok(!vax18Schedule?.some(v => v.includes('DaBT-İPA-Hib-HepB') || v.includes('Hepatit B (Rapel)')), '18. ayda HepB rapeli bulunmamalıdır');

const vax6Schedule = getVaccineSchedule(6);
assert.ok(vax6Schedule && vax6Schedule.some(v => v.includes('DaBT-İPA-Hib (3. Doz)')), '6. ayda 5li karma 3. doz bulunmalıdır');
assert.ok(vax6Schedule && vax6Schedule.some(v => v.includes('Hepatit B (3. Doz)')), '6. ayda Hepatit B 3. doz bulunmalıdır');

// 46.4 HATA-M17-002: 48. Ay Aşılarının 4-5 Yaşla Sınırlandırılması ve 10 Yaş Rutin Aşı Boşluğu
const vax48Schedule = getVaccineSchedule(48);
assert.ok(vax48Schedule && vax48Schedule.some(v => v.includes('KKK (2. Doz)')), '48. ayda KKK 2 bulunmalıdır');
const vax120Schedule = getVaccineSchedule(120);
assert.ok(vax120Schedule && vax120Schedule.length === 0, '10 yaşında (120 ay) rutin GBP planlı aşısı bulunmamalıdır');

// 46.5 HATA-M17-003: getComprehensiveVaccineSchedule Rotavirüs İnvajinasyon Kalkanı & MenACWY/MenB
const compVax5m = getComprehensiveVaccineSchedule(5);
assert.strictEqual(compVax5m?.rotavirusRule?.windowStatus, 'OPTIMAL_SUBSEQUENT_DOSE');
assert.ok(compVax5m?.rotavirusRule?.warning?.includes('İNVAJİNASYON'), '15 haftadan sonra ilk doz için invajinasyon uyarısı bulunmalıdır');
assert.ok(compVax5m?.meningococcalSchedule?.eligible === true, 'Meningokok takvimi aktif olmalıdır');

// 46.6 HATA-M17-004: Gecikmiş Aşı Yakalama 28 Gün Canlı Aşı ve BCG 6 Yaş Sınırı
const compVaxCatchup = getComprehensiveVaccineSchedule(2, { isDelayed: true });
assert.ok(compVaxCatchup?.catchUpRules?.some(r => r.includes('Canlı Aşı İnterferans Kuralı') && r.includes('28 gün')), '28 gün canlı aşı aralığı kuralı bulunmalıdır');
assert.ok(compVaxCatchup?.catchUpRules?.some(r => r.includes('BCG (Verem)') && r.includes('6 yaşını (72 ay)')), 'BCG 6 yaş üst sınırı bulunmalıdır');

console.log('✓ Motor 17 & 18 Aşı Takvimi, Yakalama & Centor/McIsaac verified (100% healthy)');

console.log('\n--- Section 47: Motor 12 & 13 Steroid Eşdeğerliği, HOMA-IR & GIR/İnfüzyon ---');

// 47.1 HATA-M12-001: Suprafizyolojik Steroid Dozlarında HPA Aksı Baskılanma Alarmı
const highDoseSteroid = convertSteroids({ sourceDrug: 'prednisolone', doseMg: 40 });
assert.ok(highDoseSteroid);
assert.strictEqual(highDoseSteroid.hpaSuppressionAlert, true, 'Prednizolon 40 mg için HPA baskılanma alarmı aktif olmalıdır');
assert.ok(highDoseSteroid.hpaSuppressionWarning?.includes('HPA Aksı Baskılanma Uyarısı'), 'HPA uyarısı içermelidir');
assert.ok(highDoseSteroid.hpaSuppressionWarning?.includes('tapering'), 'Tapering önerisi içermelidir');

// 47.2 HATA-M12-002: Steroid Mineralokortikoid Potansiyeli ve Uyarısı
const hydroSteroid = convertSteroids({ sourceDrug: 'hydrocortisone', doseMg: 100 });
assert.ok(hydroSteroid);
assert.ok(hydroSteroid.mineralocorticoidWarning?.includes('Mineralokortikoid Etki Uyarısı'), 'Yüksek mineralokortikoid uyarısı verilmelidir');
const dexConversion = hydroSteroid.conversions.find(c => c.id === 'dexamethasone');
assert.strictEqual(dexConversion?.mineralocorticoidPotency, 0.0, 'Deksametazon mineralokortikoid etkisi 0 olmalıdır');

// 47.3 HATA-M12-003: HOMA-IR Birim Doğrulaması (<30) ve Aşırı Uç Değer (>250)
const homaMmol = calculateHOMAIR({ fastingGlucoseMgDl: 5.5, fastingInsulinUuMl: 10 });
assert.ok(homaMmol);
assert.ok(homaMmol.unitWarning?.includes('mmol/L'), '<30 mg/dL için mmol/L şüphe uyarısı verilmelidir');

const homaSevere = calculateHOMAIR({ fastingGlucoseMgDl: 280, fastingInsulinUuMl: 25 });
assert.ok(homaSevere);
assert.ok(homaSevere.validityWarning?.includes('akut hiperglisemi/ketoasidoz'), '>250 mg/dL için geçerlilik uyarısı verilmelidir');

// 47.4 HATA-M13-001: GIR Periferik Ven Dekstroz Konsantrasyon Sınırı (%12.5) & Santral Hat
const girHighDextrose = calculateGIR({ dextrosePercent: 20, rateMlHr: 10, weightKg: 3 });
assert.ok(girHighDextrose);
assert.strictEqual(girHighDextrose.centralLineRequired, true, '%20 Dekstroz için santral hat zorunlu olmalıdır');
assert.ok(girHighDextrose.centralLineWarning?.includes('PERİFERİK VEN KONTRENDİKASYONU'), 'Periferik ven kontrendikasyonu belirtilmelidir');

// 47.5 HATA-M13-002: Hipoglisemi Acil Bolusunda Erişkin vs İnfant Ayrımı
const girBaby = calculateGIR({ dextrosePercent: 10, rateMlHr: 5, weightKg: 3, ageYears: 0 });
assert.ok(girBaby);
assert.strictEqual(girBaby.hypoglycemiaBolus.solution, '%10 Dekstroz', 'Bebek için %10 dekstroz bolusu önerilmelidir');
assert.strictEqual(girBaby.hypoglycemiaBolus.doseMl, 6.0, '3 kg bebekte 2 mL/kg = 6.0 mL olmalıdır');

const girAdult = calculateGIR({ dextrosePercent: 10, rateMlHr: 10, weightKg: 70, ageYears: 45 });
assert.ok(girAdult);
assert.ok(girAdult.hypoglycemiaBolus.solution.includes('Erişkin Protokolü'), 'Erişkin protokolü belirtilmelidir');
assert.ok(girAdult.hypoglycemiaBolus.instructions.includes('%20 Dekstroz') || girAdult.hypoglycemiaBolus.instructions.includes('%50 Dekstroz'), 'Erişkin konsantre bolusu önerilmelidir');

// 47.6 HATA-M13-003: İnotrop / Vazopressör İnfüzyon Toksik Aşırı Doz Tavan Kalkanı
const inotropeHigh = calculateInfusionRate({
  drugAmountMg: 4,
  totalVolumeMl: 50,
  weightKg: 70,
  targetDose: 5.0,
  doseUnit: 'mcg_kg_min'
});
assert.ok(inotropeHigh);
assert.strictEqual(inotropeHigh.isExtremeDoseAlert, true, '>2 mcg/kg/dk için aşırı doz alarmı aktif olmalıdır');
assert.ok(inotropeHigh.extremeDoseWarning?.includes('AŞIRI YÜKSEK İNOTROP DOZU'), 'Toksik aralık uyarısı verilmelidir');

console.log('✓ Motor 12 & 13 Steroid Eşdeğerliği, HOMA-IR & GIR/İnfüzyon verified (100% healthy)');

console.log('\n🎉 ALL 47 TYPESCRIPT CLINICAL ENGINES & WORKSTATION MODULES FULLY VERIFIED (100% PARITY)! 🎉\n');










