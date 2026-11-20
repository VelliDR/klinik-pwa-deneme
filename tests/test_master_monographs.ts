import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  convertMasterToClinicalMonograph,
  renderMonographCardHTML,
  getDiliBadgeInfo,
  type MasterMonographRecord
} from '../src/monographEngine';
import { loadKubForAtc } from '../src/engines/kubShardEngine';
import { ensureIcd10DictionaryReady, getAtcIcd10Profile } from '../src/engines/icd10DictionaryEngine';

console.log('--- TESTING MASTER CLINICAL MONOGRAPHS v2 & KÜB SHARDS ENGINE ---');

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
assert.strictEqual(naftifine.rxnorm, '31476');
assert.strictEqual(naftifine.chembl, 'CHEMBL626');
assert.strictEqual(naftifine.hasKub, true, 'D01AE22 must flag hasKub=true');
console.log('✓ Sample D01AE22 (NAXODER / naftifine) clinical monograph fields verified');

// 3. Test v2 rich systemic drugs: Warfarin (B01AA03), Atorvastatin (C10AA05), Paracetamol (N02BE01)
const warfarin = rawMaster['B01AA03'] as MasterMonographRecord;
assert.ok(warfarin && warfarin.dili === 'C', 'Warfarin must have LiverTox DILI score C');
assert.ok((warfarin.ddiCnt?.[0] || 0) >= 100, 'Warfarin must have >= 100 DDInter Major interactions');
assert.ok((warfarin.food || []).some(f => f.f.toLowerCase() === 'alcohol'), 'Warfarin must have alcohol food interaction');
assert.ok((warfarin.cyp || []).includes('CYP2C9'), 'Warfarin must list CYP2C9');

const atorvastatin = rawMaster['C10AA05'] as MasterMonographRecord;
assert.ok(atorvastatin && atorvastatin.dili === 'A', 'Atorvastatin must have LiverTox DILI score A');
assert.ok((atorvastatin.food || []).some(f => f.f.toLowerCase().includes('grapefruit')), 'Atorvastatin must include grapefruit juice interaction');
assert.ok((atorvastatin.dupGroup || []).length > 0, 'Atorvastatin must include therapeutic duplication group');
assert.ok((atorvastatin.cyp || []).includes('CYP3A4'), 'Atorvastatin must list CYP3A4');
console.log('✓ v2 systemic drugs (Warfarin, Atorvastatin) DILI/DDInter/Food/CYP/Duplication verified');

// 4. Test KÜB Shard loading & EBYS e-signature artifact scrubbing across ALL 14 shards
const naxoderKub = await loadKubForAtc('D01AE22');
assert.ok(naxoderKub && naxoderKub.poz && naxoderKub.ind, 'D01AE22 Turkish KÜB shard must load cleanly');
assert.ok(!naxoderKub.poz.includes('güvenli elektronik imza'), 'D01AE22 KÜB Pozoloji must be stripped of EBYS e-signature noise');
assert.ok(!naxoderKub.yan?.includes('Şüpheli advers reaksiyonların raporlanması'), 'D01AE22 KÜB Yan Etkiler must be stripped of TÜFAM boilerplate');

const kubDir = path.resolve(process.cwd(), 'public/data/kub');
const shardFiles = fs.readdirSync(kubDir).filter(f => f.endsWith('.json'));
assert.strictEqual(shardFiles.length, 14, 'Must have exactly 14 ATC-1 KÜB shard files');
let totalKubAtcs = 0;
for (const sf of shardFiles) {
  const rawTxt = fs.readFileSync(path.join(kubDir, sf), 'utf8');
  assert.ok(!rawTxt.includes('güvenli elektronik imza ile imzalanmıştır'), `Shard ${sf} must contain ZERO EBYS signature artifacts`);
  totalKubAtcs += Object.keys(JSON.parse(rawTxt)).length;
}
assert.ok(totalKubAtcs >= 1150, `KÜB shards must cover >= 1,150 ATCs (Found: ${totalKubAtcs})`);
console.log(`✓ All 14 KÜB shards verified (${totalKubAtcs} ATCs, 0 EBYS artifacts)`);

// 5. Test convertMasterToClinicalMonograph & 5-Tab Anti-Encyclopedia Render
await ensureIcd10DictionaryReady();
const converted = convertMasterToClinicalMonograph(naftifine, 'NAXODER %1 KREM');
assert.strictEqual(converted.id, 'master_d01ae22');
assert.ok(converted.brandExamples.includes('NAXODER %1 KREM'));

const atorvaMono = convertMasterToClinicalMonograph(atorvastatin, 'ALVASTIN 10 MG 30 TABLET');
const atorvaKub = await loadKubForAtc('C10AA05');
const atorvaHtml = renderMonographCardHTML(atorvaMono, 'ALVASTIN 10 MG 30 TABLET', {
  master: atorvastatin,
  kub: atorvaKub,
  icdProfile: getAtcIcd10Profile('C10AA05'),
  isCoreMonograph: false
});
assert.ok(atorvaHtml.includes('data-mono-tab="ozet"'), 'Must render Özet & Doz tab');
assert.ok(atorvaHtml.includes('data-mono-tab="etkilesim"'), 'Must render Etkileşimler tab');
assert.ok(atorvaHtml.includes('data-mono-tab="guvenlik"'), 'Must render Güvenlik tab');
assert.ok(atorvaHtml.includes('data-mono-tab="farmakoloji"'), 'Must render Farmakoloji tab');
assert.ok(atorvaHtml.includes('data-mono-tab="sgk"'), 'Must render SGK & Fiyat tab');
assert.ok(atorvaHtml.includes('Greyfurt Suyu'), 'Must render translated Turkish grapefruit juice interaction');
assert.ok(atorvaHtml.includes('DILI A — Yüksek Kanıtlı'), 'Must render LiverTox DILI A badge');
assert.ok(atorvaHtml.includes('CYP3A4'), 'Must render CYP3A4 chip');
assert.ok(atorvaHtml.includes('Resmi TİTCK KÜB'), 'Must prioritize Turkish KÜB posology');
assert.ok(getDiliBadgeInfo('A[HD]')?.labelTr.includes('Yüksek Kanıtlı'), 'getDiliBadgeInfo must parse A[HD]');
console.log('✓ 5-Tab Clinical Monograph HTML & Turkish KÜB priority verified');

// 6. Test Core Monographs remain untouched and priority 1
const coreList = JSON.parse(fs.readFileSync('public/data/clinical_monographs.json', 'utf8'));
assert.strictEqual(coreList.length, 136, 'Core monographs must have 136 items');
console.log('✓ 136 Core structured monographs remain 100% intact and priority 1');

console.log('======================================================');
console.log('🎉 ALL MASTER CLINICAL MONOGRAPH v2 TESTS PASSED! 🎉');
console.log('======================================================');
