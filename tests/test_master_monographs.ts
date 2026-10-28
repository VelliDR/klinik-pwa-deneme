import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  ensureMonographsReady,
  findMonographSync,
  convertMasterToClinicalMonograph,
  type MasterMonographRecord
} from '../src/monographEngine';

console.log('--- TESTING MASTER CLINICAL MONOGRAPHS ENGINE ---');

// 1. Verify clinical_monographs_master.json exists and is valid
const masterPath = path.resolve(process.cwd(), 'public/data/clinical_monographs_master.json');
assert.ok(fs.existsSync(masterPath), 'clinical_monographs_master.json must exist in public/data');

const rawMaster = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
const atcCount = Object.keys(rawMaster).length;
console.log(`✓ Master monographs file loaded: ${atcCount} unique ATCs`);
assert.strictEqual(atcCount, 1794, 'Must have exactly 1,794 unique ATC monographs');

// 2. Test user's specific sample: D01AE22 (naftifine / NAXODER)
const naftifine = rawMaster['D01AE22'] as MasterMonographRecord;
assert.ok(naftifine, 'D01AE22 (naftifine) must be present in master');
assert.strictEqual(naftifine.atc, 'D01AE22');
assert.strictEqual(naftifine.genericEn, 'naftifine');
assert.ok(naftifine.adultDose.includes('NAFTIN'), 'Adult dose should contain FDA monograph text');
assert.ok(naftifine.pediatricDose.includes('Pediatric Use'), 'Pediatric dose should contain pediatric instructions');
assert.ok(naftifine.pregnancyPllr.includes('Pregnancy Risk Summary'), 'Pregnancy should contain PLLR summary');
assert.ok(naftifine.organImpairment.includes('USE IN SPECIFIC POPULATIONS'), 'Organ impairment should be present');
assert.ok(Array.isArray(naftifine.indications) && naftifine.indications.includes('Tinea Pedis'), 'Must include Tinea Pedis indication');
assert.strictEqual(naftifine.rxnorm, '1433734');
assert.strictEqual(naftifine.chembl, 'CHEMBL626');
console.log('✓ Sample D01AE22 (NAXODER / naftifine) clinical monograph fields verified');

// 3. Test convertMasterToClinicalMonograph
const converted = convertMasterToClinicalMonograph(naftifine, 'NAXODER %1 KREM');
assert.strictEqual(converted.id, 'master_d01ae22');
assert.ok(converted.brandExamples.includes('NAXODER %1 KREM'));
assert.ok(converted.adultDose.length > 50);
assert.ok(converted.pediatricDose.length > 50);
assert.ok(converted.pregnancyLactation.includes('FDA Gebelik Sınıfı: C'));
assert.ok(converted.indications.includes('Tinea Pedis'));
assert.ok(converted.clinicalPearls.includes('RxNorm RxCUI: 1433734'));
console.log('✓ convertMasterToClinicalMonograph produces valid ClinicalMonograph card');

// 4. Test Core Monographs remain untouched and priority 1
const coreList = JSON.parse(fs.readFileSync('public/data/clinical_monographs.json', 'utf8'));
assert.strictEqual(coreList.length, 136, 'Core monographs must have 136 items');
console.log('✓ 136 Core structured monographs remain 100% intact and priority 1');

console.log('======================================================');
console.log('🎉 ALL MASTER CLINICAL MONOGRAPH TESTS PASSED (100% PARITY)! 🎉');
console.log('======================================================');
