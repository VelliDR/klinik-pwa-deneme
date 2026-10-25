// Comprehensive Verification Script for All Clinical Engines & DOM ID integrity
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('--- 0. CHECKING SYNTAX OF ES MODULES & TYPE DEFINITIONS ---');
execSync('npm run typecheck');
console.log('✓ TypeScript project typecheck validated cleanly with zero errors\n');

import { calculateWellsDVT, calculateWellsPTE, evaluatePERC, calculateCHA2DS2VASc, calculateHASBLED, calculateHEART } from '../src/engines/thrombosisEngine.js';
import { calculateFENa, calculateFEUrea, evaluateOliguriaDifferential, calculateCorrectedSodium, calculateOsmolalGap, evaluateRumackMatthew, calculateCURB65 } from '../src/engines/nephroToxEngine.js';
import { calculateBhutaniJaundice, calculateAPGAR, calculateWestleyCroup, calculateCDSDehydration, calculateNeonatalWeightLoss } from '../src/engines/neonatologyEngine.js';
import { checkRenalDoseAdjustments, detectTripleWhammy, checkPregnancySafety, checkNeonatalDrugSafety, checkSerotoninSyndrome, checkHyperkalemiaRisk, checkCypStatinInteraction } from '../src/engines/safetyPrescriptionEngine.js';
import { determineAgeGroup, calculateEGFR, calculateDetailedEGFR, calculateBSA } from '../src/engines/biometricsEngine.js';
import { calculatePercentiles, calculateTargetHeight, calculateCorrectedAge } from '../src/engines/percentileEngine.js';
import { calculateNeonatalFluid, calculateMaintenanceFluid, calculateSodiumCorrection } from '../src/engines/fluidEngine.js';
import { calculateQTc, calculateAxis } from '../src/engines/cardiacEngine.js';
import { analyzeBloodGas } from '../src/engines/bloodGasEngine.js';
import { calculateCorrectedCalcium } from '../src/engines/calciumEngine.js';
import { convertSteroids, calculateHOMAIR } from '../src/engines/endocrineEngine.js';
import { calculateInfusionRate, calculateGIR } from '../src/engines/infusionEngine.js';
import { calculatePediatricIron } from '../src/engines/ironEngine.js';
import { calculateObstetrics, calculateBishop, calculatePreeclampsia } from '../src/engines/obgynEngine.js';
import { calculateAlvarado, calculateParkland, calculateRanson, getSutureGuidance } from '../src/engines/surgeryEngine.js';
import { calculatePediatricDose, getVaccineSchedule, classifyPediatricBP, calculateCentorMcIsaac } from '../src/engines/pediatricEngine.js';
import { calculateNEWS2, calculatePEWS, calculateGCS } from '../src/engines/triageEngine.js';
import { parseDrugStrength } from '../src/drugEngine.js';
import { generateSOAP } from '../src/utils/soapGenerator.js';
import { appState } from '../src/state.js';

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


console.log('\n--- 2. TESTING NEPHROTOX ENGINE (AŞAMA 2) ---');
// 1. FENa
const fenaPrerenal = calculateFENa({ serumSodium: 140, urineSodium: 10, serumCreatinine: 2.0, urineCreatinine: 100 });
assert.strictEqual(fenaPrerenal.fenaPercent, 0.14);
assert.strictEqual(fenaPrerenal.etiology, 'Prerenal Azotemi');

const fenaATN = calculateFENa({ serumSodium: 140, urineSodium: 60, serumCreatinine: 2.0, urineCreatinine: 40 });
assert.strictEqual(fenaATN.fenaPercent, 2.14);
assert.strictEqual(fenaATN.etiology, 'İntrensek Renal / ATN');
console.log('✓ FENa passed');

// 2. FEUrea & Diuretic-Masked Prerenal Discordance
const feureaPrerenal = calculateFEUrea({ serumBUN: 50, urineUrea: 400, serumCreatinine: 2.0, urineCreatinine: 100 });
assert.strictEqual(feureaPrerenal.feUreaPercent, 16);
assert.strictEqual(feureaPrerenal.etiology, 'Prerenal Azotemi (Diüretik Kullanımında Güvenilir)');

// BUN to Urea Harmonization check
const feureaBunHarmonized = calculateFEUrea({ serumBUN: 45, isBun: true, urineUrea: 500, serumCreatinine: 1.8, urineCreatinine: 80 });
assert.ok(feureaBunHarmonized.feUreaPercent > 0);

// Diuretic concordance check
const fenaWithDiuretic = calculateFENa({ serumSodium: 140, urineSodium: 35, serumCreatinine: 2.0, urineCreatinine: 40, isOnDiuretics: true });
const concordance = evaluateOliguriaDifferential(fenaWithDiuretic, feureaPrerenal);
assert.strictEqual(concordance.concordance, 'DİÜRETİK_MASKELİ_PRERENAL');
assert.ok(concordance.summary.includes('Diüretik'));
console.log('✓ FEUrea & Oliguria Concordance passed');

// 3. Katz & Hillier Corrected Sodium
const katz = calculateCorrectedSodium({ measuredSodium: 125, glucoseMgDl: 600 });
assert.strictEqual(katz.correctedSodium, 133); // Katz
assert.strictEqual(katz.correctedSodiumHillier, 137); // Hillier
assert.ok(katz.interpretation.includes('Gerçek Hiponatremi'));

const katzPseudo = calculateCorrectedSodium({ measuredSodium: 130, glucoseMgDl: 600 });
assert.strictEqual(katzPseudo.correctedSodium, 138);
assert.ok(katzPseudo.interpretation.includes('Yalancı Hiponatremi'));
console.log(`✓ Katz (${katz.correctedSodium}) & Hillier (${katz.correctedSodiumHillier}) Corrected Sodium passed`);

// 4. Osmolal Gap & Antidote Protocol
const osmTest = calculateOsmolalGap({ measuredOsmolality: 320, sodium: 140, glucoseMgDl: 100, bunMgDl: 15 });
assert.strictEqual(osmTest.isElevated, true); // gap ~29 > 20 => critical
assert.strictEqual(osmTest.isCriticalGap, true);
assert.ok(osmTest.antidoteAdvice.fomepizol.includes('Fomepizol'));
assert.ok(osmTest.antidoteAdvice.etanolAlternative.includes('Etanol'));
console.log(`✓ Critical Osmolal Gap (${osmTest.gap} mOsm/kg) & Toxic Alcohol Antidote passed`);

// 5. Rumack-Matthew & Pediatric Safe NAC Protocol
const apapEarly = evaluateRumackMatthew({ hoursPostIngestion: 2, paracetamolLevelMcgMl: 200 });
assert.strictEqual(apapEarly.status, 'TOO_EARLY');

// Standard Adult Toxic Dose (70 kg)
const apapToxicAdult = evaluateRumackMatthew({ hoursPostIngestion: 8, paracetamolLevelMcgMl: 100, weightKg: 70 });
assert.strictEqual(apapToxicAdult.isToxic, true);
assert.strictEqual(apapToxicAdult.nacProtocol.isPediatricAdjusted, false);
assert.strictEqual(apapToxicAdult.nacProtocol.phase1.totalMg, 10500); // 70 * 150

// Pediatric Weight Toxic Dose (10 kg infant) -> Fluid Overload Prevention
const apapToxicChild = evaluateRumackMatthew({ hoursPostIngestion: 6, paracetamolLevelMcgMl: 120, weightKg: 10 });
assert.strictEqual(apapToxicChild.isToxic, true);
assert.strictEqual(apapToxicChild.nacProtocol.isPediatricAdjusted, true);
assert.strictEqual(apapToxicChild.nacProtocol.phase1.totalMg, 1500); // 10 * 150
assert.ok(apapToxicChild.nacProtocol.phase1.fluidD5W.includes('30 mL')); // 10 * 3 mL/kg

// High-risk line evaluation (100 at 4h)
const apapHighRisk = evaluateRumackMatthew({ hoursPostIngestion: 4, paracetamolLevelMcgMl: 110, isHighRisk: true });
assert.strictEqual(apapHighRisk.isToxic, true); // > 100
assert.strictEqual(apapHighRisk.threshold, 100);
console.log('✓ Rumack-Matthew, High-Risk Nomogram & Pediatric Fluid-Safe NAC passed');

// 6. CURB-65 & CRB-65
const curbTest = calculateCURB65({ confusion: true, bunOver19: true, ageGte65: true });
assert.strictEqual(curbTest.score, 3);
assert.strictEqual(curbTest.crbScore, 2);
assert.strictEqual(curbTest.mortalityGroup, 'Şiddetli Pnömoni (Yüksek Risk)');
assert.ok(curbTest.empiricAntibiotic.includes('Seftriakson'));
console.log(`✓ CURB-65 (${curbTest.score}/5) & CRB-65 (${curbTest.crbScore}/4) with Empiric Antibiotic passed`);

console.log('\n--- 3. TESTING NEONATOLOGY ENGINE (DUAL AAP 2022 & TND 2014) ---');
// Bhutani Dual Guideline (Default: AAP 2022 + Classic: TND 2014)
const bEarly = calculateBhutaniJaundice({ ageHours: 12, totalBilirubin: 8 });
assert.strictEqual(bEarly.status, 'FIRST_24_HOURS_CRITICAL');

const bNormal = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 8, gestationalWeeks: 39 });
assert.strictEqual(bNormal.status, 'LOW_RISK');

// At 48h, 39w no risk: AAP 2022 phototherapy threshold is 16.6 mg/dL, TND 2014 is 15.0 mg/dL
const bAapClose = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 16, gestationalWeeks: 39 });
assert.strictEqual(bAapClose.status, 'CLOSE_MONITORING');

const bTndPhoto = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 16, gestationalWeeks: 39, guideline: 'TND_2014' });
assert.strictEqual(bTndPhoto.status, 'PHOTOTHERAPY_REQUIRED');

const bAapPhoto = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 17.0, gestationalWeeks: 39 });
assert.strictEqual(bAapPhoto.status, 'PHOTOTHERAPY_REQUIRED');

// Escalation of Care (Exchange - 2.0 mg/dL in AAP 2022: 24.0 - 2.0 = 22.0)
const bAapEscalation = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 22.5, gestationalWeeks: 39 });
assert.strictEqual(bAapEscalation.status, 'ESCALATION_OF_CARE');

const bTndExchange = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 23, gestationalWeeks: 39, guideline: 'TND_2014' });
assert.strictEqual(bTndExchange.status, 'EXCHANGE_TRANSFUSION_REQUIRED');

const bAapExchange = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 24.5, gestationalWeeks: 39 });
assert.strictEqual(bAapExchange.status, 'EXCHANGE_TRANSFUSION_REQUIRED');
console.log('✓ Dual AAP 2022 & TND 2014 Hyperbilirubinemia passed');

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

// Serotonin Syndrome Shield
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
console.log('✓ Serotonin Syndrome Shield passed');

// Fatal Hyperkalemia Shield
const hkFatal = checkHyperkalemiaRisk([
    { brand: 'Delix 5mg', generic: 'ramipril' },
    { brand: 'Aldactone 25mg', generic: 'spironolactone' }
]);
assert.strictEqual(hkFatal.isAtRisk, true);
assert.strictEqual(hkFatal.severity, 'CRITICAL');

const hkBactrim = checkHyperkalemiaRisk([
    { brand: 'Co-Diovan 160/12.5', generic: 'valsartan' },
    { brand: 'Bactrim Forte', generic: 'trimethoprim' }
]);
assert.strictEqual(hkBactrim.isAtRisk, true);
assert.strictEqual(hkBactrim.severity, 'CRITICAL');
console.log('✓ Fatal Hyperkalemia Shield passed');

// CYP3A4 Statin Shield
const cypSimva = checkCypStatinInteraction([
    { brand: 'Zocor 20mg', generic: 'simvastatin' },
    { brand: 'Klacid 500mg', generic: 'clarithromycin' }
]);
assert.strictEqual(cypSimva.hasInteraction, true);
assert.strictEqual(cypSimva.severity, 'CRITICAL');

const cypSafe = checkCypStatinInteraction([
    { brand: 'Crestor 10mg', generic: 'rosuvastatin' },
    { brand: 'Klacid 500mg', generic: 'clarithromycin' }
]);
assert.strictEqual(cypSafe.hasInteraction, false);
assert.strictEqual(cypSafe.severity, 'SAFE');
console.log('✓ CYP3A4 Statin Shield passed');

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
    'input-fena-s-na', 'input-fena-u-na', 'input-fena-s-cr', 'input-fena-u-cr', 'select-feurea-unit', 'input-feurea-s-bun', 'input-feurea-u-urea', 'chk-fena-diuretic', 'output-fena-feurea',
    'input-corr-na-meas', 'input-corr-glucose', 'input-osm-measured', 'output-corr-na-osm',
    'input-apap-hours', 'input-apap-level', 'chk-apap-high-risk', 'output-apap-rumack',
    'chk-curb-c', 'chk-curb-u', 'chk-curb-r', 'chk-curb-b', 'chk-curb-65', 'output-curb65',
    'input-bhutani-age-hours', 'input-bhutani-tsb', 'input-bhutani-gw', 'chk-bhutani-risk-factors', 'output-bhutani-result',
    'select-apgar-minute', 'select-apgar-hr', 'select-apgar-resp', 'select-apgar-tone', 'select-apgar-reflex', 'select-apgar-color', 'output-apgar-result',
    'select-croup-stridor', 'select-croup-retractions', 'select-croup-air', 'select-croup-cyanosis', 'select-croup-consciousness', 'output-croup-result',
    'select-cds-appearance', 'select-cds-eyes', 'select-cds-mucosa', 'select-cds-tears', 'output-cds-result',
    'input-safety-egfr', 'select-safety-trimester', 'badge-safety-status',
    'output-safety-triple-whammy', 'output-safety-serotonin', 'output-safety-hyperkalemia', 'output-safety-cyp-statin',
    'output-safety-renal', 'output-safety-pregnancy', 'output-safety-neonatal',
    'input-dob', 'input-birth-time', 'input-birth-weight', 'output-dob-breakdown',
    'output-neonatal-weight-loss', 'container-neonatal-fluid-banner',
    'text-neonatal-fluid-day', 'text-neonatal-fluid-target', 'text-neonatal-fluid-desc',
    'alert-item-neonatal-drug', 'alert-text-neonatal-drug',
    'alert-item-serotonin', 'alert-text-serotonin',
    'alert-item-hyperkalemia', 'alert-text-hyperkalemia',
    'alert-item-cyp-statin', 'alert-text-cyp-statin',
    'alert-item-neonatal-weight', 'alert-text-neonatal-weight',
    'alert-item-nephrotox', 'alert-text-nephrotox',
    'header-patient-info', 'header-patient-age', 'header-patient-gender',
    'input-age', 'select-age-unit', 'label-age-numeric',
    'btn-quick-switch', 'modal-quick-switcher', 'input-quick-switcher', 'list-quick-switcher',
    'btn-theme-toggle', 'theme-toggle-icon', 'theme-toggle-text',
    'btn-print-rx', 'modal-prescription-print', 'btn-trigger-print', 'btn-close-print-modal',
    'btn-tab-rx-editor', 'btn-tab-rx-preview', 'select-rx-preset', 'btn-add-rx-drug',
    'input-print-patient-name', 'input-print-doctor-name', 'input-print-date',
    'input-print-diagnosis', 'input-print-rx-number', 'input-print-allergy',
    'panel-rx-editor', 'panel-rx-preview', 'container-rx-editor-list', 'rx-drugs-count-badge',
    'container-prescription-preview', 'printable-prescription-container',
    'btn-emergency-protocols', 'modal-emergency-protocols', 'btn-close-emergency-modal',
    'emergency-weight-badge', 'tab-btn-anaphylaxis', 'tab-btn-status',
    'panel-emergency-anaphylaxis', 'panel-emergency-status',
    'text-emergency-adr-dose', 'timer-anaphylaxis-display', 'timer-anaphylaxis-bar',
    'badge-anaphylaxis-timer-status', 'btn-anaphylaxis-start-timer', 'btn-anaphylaxis-repeat-dose',
    'btn-anaphylaxis-reset-timer', 'alert-anaphylaxis-timer-expired',
    'text-emergency-fluid-dose', 'text-emergency-salbutamol-dose', 'text-emergency-pheniramine-dose',
    'text-emergency-prednol-dose', 'btn-anaphylaxis-to-soap',
    'timer-status-display', 'badge-status-active-phase', 'btn-status-start-timer',
    'btn-status-pause-timer', 'btn-status-reset-timer',
    'card-status-phase-1', 'card-status-phase-2', 'card-status-phase-3', 'card-status-phase-4',
    'text-status-glucose-dose', 'text-status-midazolam-dose', 'text-status-diazepam-dose',
    'text-status-keppra-dose', 'text-status-phenytoin-dose', 'text-status-valproate-dose',
    'btn-status-to-soap', 'container-dot-phrase-pills', 'select-soap-template', 'btn-insert-soap-template',
    'btn-toggle-ecg-guide', 'btn-ecg-mode-ms', 'btn-ecg-mode-boxes', 'select-ecg-paper-speed',
    'panel-ecg-ms', 'panel-ecg-boxes', 'input-ecg-qt-boxes', 'input-ecg-rr-boxes', 'input-ecg-qrs-boxes',
    'details-ecg-guide', 'btn-ecg-rr-preset-3', 'btn-ecg-rr-preset-4', 'btn-ecg-rr-preset-5',
    'input-ecg-avg-v1', 'input-ecg-avg-v2', 'input-ecg-avg-v3', 'btn-apply-ecg-avg-qt',
    'hint-ecg-qt-boxes', 'hint-ecg-rr-boxes', 'hint-ecg-qrs-boxes',
    'calc-ecg-qt-ms', 'calc-ecg-rr-ms', 'calc-ecg-qrs-ms',
    'input-cystatin-c', 'select-creatinine-assay', 'output-egfr-meta',
    'select-burn-type', 'chk-ranson-age55', 'chk-ranson-wbc16', 'chk-ranson-glu200',
    'chk-ranson-ldh350', 'chk-ranson-ast250', 'chk-ranson-hct10', 'chk-ranson-bun5',
    'chk-ranson-ca8', 'chk-ranson-po260', 'chk-ranson-bd4', 'chk-ranson-fluid6', 'output-ranson',
    'input-iron-mcv', 'input-iron-rbc', 'input-iron-rdw', 'input-iron-ferritin',
    'select-bhutani-guideline', 'select-bhutani-method',
    'modal-drug-monograph', 'title-monograph-modal', 'btn-close-monograph-modal',
    'banner-monograph-offline-notice', 'container-monograph-body', 'container-monograph-external-links'
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
const adultGroup = determineAgeGroup(45, 'years');
assert.strictEqual(adultGroup.id, 'ADULT');
console.log('✓ determineAgeGroup for days, weeks and years passed');

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

// 3. Neonate eGFR with Term (k=0.45) & Preterm (k=0.33) Schwartz
const neonateEgfrTerm = calculateEGFR(0.4, 14 / 365.25, 'F', 51);
assert.strictEqual(neonateEgfrTerm, 57); // (0.45 * 51) / 0.4 = 57.375 => 57
const neonateEgfrPreterm = calculateEGFR(0.4, 14 / 365.25, 'F', 51, { isPreterm: true });
assert.strictEqual(neonateEgfrPreterm, 42); // (0.33 * 51) / 0.4 = 42.075 => 42
console.log('✓ Neonate Schwartz eGFR passed (Term k=0.45 -> 57 mL/dk, Preterm k=0.33 -> 42 mL/dk)');

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

console.log('\n--- 10. TESTING CARDIAC & ECG ENGINE ---');
// QTc normal & formula difference
const qtcNormal = calculateQTc({ hr: 80, qt: 400, gender: 'male' });
assert.strictEqual(qtcNormal.status, 'OK');
assert.strictEqual(qtcNormal.qtcBazett, 462);
assert.strictEqual(qtcNormal.qtcFridericia, 440);
assert.strictEqual(qtcNormal.colorCode, 'success');

// Bogossian wide QRS
const qtcWide = calculateQTc({ hr: 75, qt: 460, qrs: 140, qrsPattern: 'lbbb', gender: 'male' });
assert.strictEqual(qtcWide.activeFormula, 'Bogossian');
assert.strictEqual(qtcWide.qtcBogossian, 420);
assert.ok(qtcWide.warnings.some(w => w.includes('Sol Dal Bloğu')));

// Tisdale Score & Drug Warnings (IKr Blocker + Na+ Channel Blocker)
const qtcToxic = calculateQTc({
    hr: 110, qt: 520, gender: 'female', age: 72, k_level: 3.2, is_ami: true,
    drugs: [
        { brand: 'Cipro 500mg', atc: 'J01MA02' },
        { brand: 'Rytmonorm 150mg', generic: 'propafenone', atc: 'C01BC03' }
    ]
});
assert.strictEqual(qtcToxic.colorCode, 'danger');
assert.ok(qtcToxic.tisdaleScore >= 11);
assert.ok(qtcToxic.drugFlags.some(f => f.includes('TdP Riski')));
assert.ok(qtcToxic.drugFlags.some(f => f.includes('Sodyum')));

// Cardiac Axis
const axisNormal = calculateAxis(10, 10);
assert.strictEqual(axisNormal.degrees, 45);
assert.ok(axisNormal.axisCategory.includes('Normal Aks'));

const axisLAD = calculateAxis(10, -10);
assert.strictEqual(axisLAD.degrees, -45);
assert.ok(axisLAD.axisCategory.includes('Sol Aks Sapması'));
console.log('✓ Cardiac QTc (Bazett, Fridericia, Bogossian), Tisdale, Drug Warnings & ECG Axis passed');

console.log('\n--- 11. TESTING FLUID, SODIUM & CALCIUM ENGINES ---');
// Maintenance Fluid & Fever Adjustment
const fluidBaseline = calculateMaintenanceFluid(70);
assert.strictEqual(fluidBaseline.dailyVolume, 2500); // capped at 2500 for adult
assert.strictEqual(fluidBaseline.hourlyRate, 104);

const fluidFever = calculateMaintenanceFluid(70, 39.5); // 2°C over 37.5 => +24%
assert.strictEqual(fluidFever.feverExtraVolume, 600);
assert.strictEqual(fluidFever.dailyVolume, 3100);

// Sodium Correction & Adrogue-Madias
const naCorrection = calculateSodiumCorrection(120, 128, 70, 0.6);
assert.strictEqual(naCorrection.deficit, 336);
assert.ok(naCorrection.deltaNa3Percent > 0);
assert.ok(naCorrection.required3PercentMl > 0);

// Corrected Calcium
const caHypo = calculateCorrectedCalcium({ totalCalcium: 7.0, albumin: 2.0 });
assert.strictEqual(caHypo.correctedCa, 8.6); // 7.0 + 0.8 * (4 - 2) = 8.6 (Normal range)
const caTrueHypo = calculateCorrectedCalcium({ totalCalcium: 6.5, albumin: 4.0 });
assert.strictEqual(caTrueHypo.correctedCa, 6.5);
assert.ok(caTrueHypo.flags.includes('ALERT_HYPOCALCEMIA'));
console.log('✓ Maintenance Fluid (Holliday-Segar + Fever), Sodium Deficit (Adrogué-Madias) & Corrected Calcium passed');

console.log('\n--- 12. TESTING BLOOD GAS & ENDOCRINE ENGINES ---');
// Blood gas: Pure HAGMA with Winter formula
const bgHagma = analyzeBloodGas({ pH: 7.20, pCO2: 24, HCO3: 10, Na: 140, Cl: 100, Albumin: 4.0, sampleType: 'ABG' });
assert.strictEqual(bgHagma.primaryDisorder, 'Metabolik Asidoz');
assert.strictEqual(bgHagma.AG, 30);
assert.ok(bgHagma.hagmaStatus.includes('Saf HAGMA'));

// VBG to ABG harmonization
const bgVbg = analyzeBloodGas({ pH: 7.30, pCO2: 45, HCO3: 24, sampleType: 'VBG' });
assert.strictEqual(bgVbg.pH, 7.335); // 7.30 + 0.035
assert.strictEqual(bgVbg.pCO2, 40);   // 45 - 5

// Steroid conversion
const predConv = convertSteroids({ sourceDrug: 'prednisolone', doseMg: 20 });
const dexMatch = predConv.conversions.find(c => c.id === 'dexamethasone');
assert.strictEqual(dexMatch.equivalentDoseMg, 3); // 20mg prednisolone = 3mg dexamethasone

// HOMA-IR
const homaNormal = calculateHOMAIR({ fastingGlucoseMgDl: 90, fastingInsulinUuMl: 8 });
assert.strictEqual(homaNormal.isResistant, false);

const homaPubertal = calculateHOMAIR({ fastingGlucoseMgDl: 110, fastingInsulinUuMl: 25, tannerStage: 'pubertal' });
assert.strictEqual(homaPubertal.cutoff, 3.16);
assert.strictEqual(homaPubertal.isResistant, true);
console.log('✓ Blood Gas (ABG/VBG, Winter, HAGMA/NAGMA), Steroid Equivalence & HOMA-IR passed');

console.log('\n--- 13. TESTING INFUSION, GIR & PEDIATRIC ENGINES ---');
// Infusion rate
const infRate = calculateInfusionRate({ drugAmountMg: 200, totalVolumeMl: 50, weightKg: 70, targetDose: 5, doseUnit: 'mcg_kg_min' });
assert.strictEqual(infRate.rateMlHr, 5.3);

// GIR & Hypoglycemia bolus
const girTest = calculateGIR({ dextrosePercent: 10, rateMlHr: 15, weightKg: 3.0 });
assert.strictEqual(girTest.gir, 8.3);
assert.strictEqual(girTest.hypoglycemiaBolus.doseMl, 6.0); // 2 mL/kg

// Pediatric Syrup Doses
const syrupParol = calculatePediatricDose(15, 'paracetamol');
assert.strictEqual(syrupParol.targetDoseMg, 225); // 15 * 15
assert.strictEqual(syrupParol.volumeMl, 9.4);

// Pediatric BP
const bpCheck = classifyPediatricBP({ ageYears: 6, gender: 'male', sbp: 115, dbp: 75 });
assert.ok(bpCheck.stage.includes('Hipertansiyon'));

// Centor-McIsaac
const centorTest = calculateCentorMcIsaac({ feverOver38: true, tenderCervicalNodes: true, tonsillarExudate: true, ageYears: 8 });
assert.strictEqual(centorTest.score, 4); // 3 criteria + 1 for age 3-14
assert.ok(centorTest.recommendation.includes('Amoksisilin') || centorTest.recommendation.includes('antibiyotik'));
console.log('✓ Infusion Rate, GIR, Pediatric Syrup, AAP 2017 BP & Centor-McIsaac passed');

console.log('\n--- 14. TESTING OB/GYN, SURGERY & TRIAGE ENGINES ---');
// Naegele OB/GYN
const obTest = calculateObstetrics('2026-05-01');
assert.ok(obTest.edd.length === 10);
assert.ok(obTest.trimester >= 1 && obTest.trimester <= 3);

// Bishop Score
const bishopTest = calculateBishop(2, 2, 2, 2, 1);
assert.strictEqual(bishopTest.score, 9);
assert.ok(bishopTest.interpretation.includes('Elverişli'));

// Preeclampsia
const preeclampsiaTest = calculatePreeclampsia(165, 100, true, ['severe']);
assert.strictEqual(preeclampsiaTest.diagnosis, 'Preeklampsi (Ağır Özellikli)');

// Alvarado
const alvTest = calculateAlvarado({ rlqPain: true, rebound: true, leukocytosis: true });
assert.strictEqual(alvTest.score, 5);
assert.strictEqual(alvTest.risk, 'Orta');

// ATLS 10 Parkland
const parklandAdult = calculateParkland(70, 20, 30);
assert.strictEqual(parklandAdult.multiplierUsed, 2);
assert.strictEqual(parklandAdult.totalVolume, 2800);

const parklandChild = calculateParkland(20, 20, 8);
assert.strictEqual(parklandChild.multiplierUsed, 3);
assert.strictEqual(parklandChild.totalVolume, 1200);

// Suture guidance
const sutureTest = getSutureGuidance('yuz');
assert.strictEqual(sutureTest.removalDays, '3-5 gün');

// NEWS2 & PEWS & GCS
const newsTest = calculateNEWS2(135, 88, 26, 39.2, 90, true, 'V');
assert.ok(newsTest.score >= 10);
assert.strictEqual(newsTest.risk, 'Yüksek Klinik Risk');

const pewsTest = calculatePEWS(2, 2, 2);
assert.strictEqual(pewsTest.score, 6);

const gcsComa = calculateGCS(1, 1, 1);
assert.strictEqual(gcsComa.total, 3);
assert.ok(gcsComa.airwayRisk.includes('Entübasyon'));
console.log('✓ Obstetrics (Naegele, Bishop, Preeclampsia), Surgery (Alvarado, Parkland ATLS 10, Suture) & Triage (NEWS2, PEWS, GCS) passed');

console.log('\n--- 15. TESTING CROSS-ENGINE COMMUNICATION & SOAP INTEGRATION ---');
// Test 1: Bhutani -> Neonatal Fluid Step-up Communication
const bhutaniCritical = calculateBhutaniJaundice({ ageHours: 48, totalBilirubin: 18, gestationalWeeks: 38 });
assert.strictEqual(bhutaniCritical.status, 'PHOTOTHERAPY_REQUIRED');
const neoFluidWithPhoto = calculateNeonatalFluid({
    ageDays: 2, weightKg: 3.0, isPreterm: false,
    isPhototherapy: bhutaniCritical.status === 'PHOTOTHERAPY_REQUIRED'
});
const neoFluidWithoutPhoto = calculateNeonatalFluid({
    ageDays: 2, weightKg: 3.0, isPreterm: false,
    isPhototherapy: false
});
// Phototherapy adds +15 mL/kg/day to neonatal fluid requirement
assert.strictEqual(neoFluidWithPhoto.mlPerKgAvg - neoFluidWithoutPhoto.mlPerKgAvg, 15);
assert.ok(neoFluidWithPhoto.soluteAdvice.includes('Fototerapiye bağlı artmış'));
console.log('✓ Bhutani -> Neonatal Fluid Phototherapy Step-up communication verified');

// Test 2: eGFR -> Smart Renal Prescription Shield Communication
const pedEgfr = calculateEGFR(2.0, 6, 'M', 110); // Low eGFR in child: (0.413 * 110)/2.0 = 23 mL/dk
const renalShield = checkRenalDoseAdjustments({
    egfr: pedEgfr,
    drugs: [{ brand: 'Cipro 500mg', generic: 'ciprofloxacin' }]
});
assert.strictEqual(renalShield.alertsCount, 1);
console.log('✓ eGFR -> Smart Renal Dose Adjustment communication verified');

// Test 3: Gestational Age -> Preterm Percentiles Communication
const pretermAge = calculateCorrectedAge({ chronologicalMonths: 8, gestationalWeeks: 30 });
assert.strictEqual(pretermAge.isPreterm, true);
assert.strictEqual(pretermAge.weeksMissing, 10);
const pretermPerc = calculatePercentiles({
    totalMonths: pretermAge.correctedMonths, // 8 - 10/4.348 ~ 5.7 months
    gender: 'male',
    weightKg: 7.2,
    heightCm: 65,
    isPediatric: true
});
assert.ok(pretermPerc.weightPercentile > 0);
console.log('✓ Gestational Age -> Preterm Corrected Growth communication verified');

// Test 4: End-to-end SOAP Generation covering all engines
appState.biometry.ageYears = 58;
appState.biometry.gender = 'male';
appState.biometry.weightKg = 75;
appState.biometry.heightCm = 175;
appState.biometry.egfr = 45;
appState.medicine.sodium = { deficit: 280, deltaNa3Percent: 8.5, deltaNa09Percent: 0.8, warning: '' };
appState.medicine.calcium = { correctedCa: 9.2, measuredCa: 8.4, alertMsg: '' };
appState.surgery.parkland = { totalVolume: 3000, first8HrsRate: 188, next16HrsRate: 94 };
appState.pediatrics.iron = {
    status: 'SUCCESS',
    hbEvaluation: { isAnemic: false, text: 'Normal Hb düzeyi (12.5 g/dL)' },
    treatment: { text: '' },
    prophylaxis: { eligible: true, mgDay: 15, text: 'Profilaktik destek' }
};
appState.obgyn.eddData = { gestationalAge: '28 Hafta + 2 Gün', edd: '15.01.2027' };

const soapOutput = generateSOAP();
assert.ok(soapOutput.includes('75 kg'));
assert.ok(soapOutput.includes('eGFR: 45'));
assert.ok(soapOutput.includes('Sodyum Düzeltme & Açık'));
assert.ok(soapOutput.includes('Düzeltilmiş Kalsiyum: 9.2'));
assert.ok(soapOutput.includes('Parkland Yanık Sıvı Resüsitasyonu'));
assert.ok(soapOutput.includes('Demir Takviyesi / Profilaksi'));
assert.ok(soapOutput.includes('Obstetrik: SAT\'a göre Gebelik Haftası'));
console.log('✓ End-to-end SOAP Generation with complete multi-engine data verified');

// Test 5: Stage 1 Clinical & Safety Regression Tests
const largopenRenal = checkRenalDoseAdjustments({
    egfr: 20,
    drugs: [{ brand: 'LARGOPEN 1 G TABLET', generic: '' }]
});
assert.strictEqual(largopenRenal.alertsCount, 1);
assert.ok(largopenRenal.warnings[0].drug.includes('Amoksisilin'), 'Largopen must map to Amoksisilin, not Klaritromisin');

const turkishUpperPreg = checkPregnancySafety([
    { brand: 'ZORETANİN 20 MG', generic: 'İZOTRETİNOİN' }
], { trimester: 1 });
assert.strictEqual(turkishUpperPreg.hasSevereFetalRisk, true, 'Turkish uppercase İZOTRETİNOİN must be caught');

const warfarinOnlyPreg = checkPregnancySafety([
    { brand: 'COUMADIN 5 MG', generic: 'WARFARIN' }
], { trimester: 2 });
assert.strictEqual(warfarinOnlyPreg.hasSevereFetalRisk, true, 'Warfarin D/X must set hasSevereFetalRisk');

const bgHagmaAlk = analyzeBloodGas({ pH: 7.42, pCO2: 40, HCO3: 26, Na: 145, Cl: 99 });
assert.strictEqual(bgHagmaAlk.deltaRatio, null);
assert.ok(bgHagmaAlk.hagmaStatus.includes('Met. Alkaloz'), 'HCO3 >= 24 with HAGMA must not misclassify as NAGMA');

assert.strictEqual(determineAgeGroup(0, 'days')?.id, 'NEONATE', '0-day neonate must return NEONATE');
assert.strictEqual(calculateEGFR(1.0, 50, 'F', 165), calculateEGFR(1.0, 50, 'female', 165), 'Gender F and female must yield identical eGFR');
assert.strictEqual(calculateNEWS2(75, 120, 16, 38.05, 98, false, 'A')?.score, 1, 'Decimal temperature 38.05 must score 1 point in NEWS2');
console.log('✓ Stage 1 clinical & safety regression tests verified');

console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 100% HEALTHY.');
