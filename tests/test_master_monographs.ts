import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  convertMasterToClinicalMonograph,
  renderMonographCardHTML,
  getDiliBadgeInfo,
  evaluateTrimesterRiskLevel,
  type MasterMonographRecord
} from '../src/monographEngine';
import { loadKubForAtc } from '../src/engines/kubShardEngine';
import { ensureIcd10DictionaryReady, getAtcIcd10Profile } from '../src/engines/icd10DictionaryEngine';
import { ensureAtcKnowledgeBaseReady, getAtcProfile } from '../src/engines/atcKnowledgeEngine';

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
assert.strictEqual(
  evaluateTrimesterRiskLevel('Gebelikte güvenlidir; doğumda seftriakson gibi kalsiyum presipitasyonu riski taşımaz.').level,
  'SAFE',
  'Negated risk phrase ("riski taşımaz") must evaluate to SAFE'
);
const vancomycinCore = coreList.find((m: any) => m.id === 'vancomycin');
if (vancomycinCore) {
  const vancHtml = renderMonographCardHTML(vancomycinCore, 'VANCOCIN 500 MG');
  assert.ok(vancHtml.includes('Obezite: AdjBW'), 'AdjBW pediatric dosing metric must render Obezite: AdjBW badge');
}
console.log('✓ 136 Core structured monographs remain 100% intact and priority 1');

// 7. Test Structured organ_impairment HTML Tables (Renal eGFR + Hepatic Child-Pugh)
const ibuprofenCore = coreList.find((m: any) => m.id === 'ibuprofen');
assert.ok(ibuprofenCore && ibuprofenCore.organ_impairment, 'Ibuprofen core monograph must include organ_impairment');
const ibuHtml = renderMonographCardHTML(ibuprofenCore, 'DOLVEN 100 MG/5 ML SURUP');
assert.ok(ibuHtml.includes('data-organ-table="renal"'), 'Structured renal_adjustments must render renal HTML table');
assert.ok(ibuHtml.includes('data-organ-table="hepatic"'), 'Structured hepatic_adjustments must render hepatic HTML table');
assert.ok(ibuHtml.includes('≥ 30 mL/dk') && ibuHtml.includes('&lt; 30 mL/dk'), 'Renal table must format eGFR/CrCl threshold ranges cleanly');
assert.ok(ibuHtml.includes('Kontrendike') && ibuHtml.includes('Doz Azaltımı'), 'Renal table must render action_type badges');
assert.ok(ibuHtml.includes('Child-Pugh C'), 'Hepatic table must render Child-Pugh class badge');
assert.ok(ibuHtml.includes('nefrotoksisite riski nedeniyle KONTRENDİKEDİR'), 'Renal table must display clinical adjustment instruction');

assert.ok(vancomycinCore && vancomycinCore.organ_impairment, 'Vancomycin core monograph must include organ_impairment');
const vancOrganHtml = renderMonographCardHTML(vancomycinCore, 'VANCOCIN 500 MG');
assert.ok(vancOrganHtml.includes('Aralık Uzatımı') && vancOrganHtml.includes('20–49.9 mL/dk'), 'Vancomycin renal table must render INTERVAL_EXTENSION badge and mid eGFR range');

// Monographs without structured organ_impairment must fall back cleanly to free text without tables
assert.ok(!atorvaHtml.includes('data-organ-table="renal"'), 'Master monograph without structured organ_impairment must fall back to text card');
console.log('✓ Structured organ_impairment HTML tables (renal eGFR + hepatic Child-Pugh) verified');

// 8. Test atcKnowledgeEngine fallback enrichment in monographEngine (moa, halfLife, metabolism, ddd, blackBox)
await ensureAtcKnowledgeBaseReady();
const rosuProfile = getAtcProfile('C10AA07');
assert.ok(rosuProfile && rosuProfile.mechanismOfAction && rosuProfile.blackBoxWarning, 'C10AA07 must resolve in ATC KB');

const sparseRosuvastatin: MasterMonographRecord = {
  atc: 'C10AA07',
  genericTr: 'Rosuvastatin',
  genericEn: 'rosuvastatin',
  drugClass: 'Lipid Düzenleyici Ajanlar',
  adultDose: 'Günde 1 kez 5-40 mg oral.',
  pediatricDose: '8 yaş üzeri ailesel hiperkolesterolemide 5-20 mg.',
  pregnancyFda: 'X',
  pregnancyPllr: '',
  lactation: '',
  lactmed: '',
  organImpairment: 'Ağır böbrek yetmezliğinde (eGFR <30) 10 mg/gün aşılmamalıdır.',
  blackBox: '',
  contraindications: 'Aktif karaciğer hastalığı ve gebelik.',
  contraDiseases: [],
  indications: ['Hiperkolesterolemi'],
  rxnorm: '301542',
  chembl: 'CHEMBL1496'
};
const enrichedRosuMono = convertMasterToClinicalMonograph(sparseRosuvastatin, 'CRESTOR 10 MG');
assert.ok(
  enrichedRosuMono.safety_warnings?.black_box_warnings?.some(w => w.includes('Rabdomiyoliz')),
  'convertMasterToClinicalMonograph must fall back to ATC KB blackBox warning when master blackBox is empty'
);
const enrichedRosuHtml = renderMonographCardHTML(enrichedRosuMono, 'CRESTOR 10 MG', {
  master: sparseRosuvastatin,
  isCoreMonograph: false
});
assert.ok(enrichedRosuHtml.includes('HMG-CoA redüktaz'), 'renderMonographCardHTML must fall back to ATC KB moa');
assert.ok(enrichedRosuHtml.includes('Rosuvastatin: ~19 saat'), 'renderMonographCardHTML must fall back to ATC KB halfLife');
assert.ok(enrichedRosuHtml.includes('CYP3A4 ve CYP2C9'), 'renderMonographCardHTML must fall back to ATC KB metabolism');
assert.ok(enrichedRosuHtml.includes('Rosuvastatin: 10 mg'), 'renderMonographCardHTML must fall back to ATC KB WHO DDD');
assert.ok(enrichedRosuHtml.includes('Rabdomiyoliz'), 'renderMonographCardHTML must render ATC KB fallback Black Box warning');

// Safety guard: Fluoroquinolone class Black Box must NOT leak onto non-fluoroquinolone antibiotics (J01CR02)
const sparseAmoxClav: MasterMonographRecord = {
  ...sparseRosuvastatin,
  atc: 'J01CR02',
  genericTr: 'Amoksisilin + Klavulanik Asit',
  genericEn: 'amoxicillin and beta-lactamase inhibitor',
  pregnancyFda: 'B'
};
const amoxConverted = convertMasterToClinicalMonograph(sparseAmoxClav, 'AUGMENTIN 1000 MG');
assert.strictEqual(
  amoxConverted.safety_warnings?.black_box_warnings?.length || 0,
  0,
  'Fluoroquinolone Black Box must not leak onto J01CR02 beta-lactam'
);
console.log('✓ atcKnowledgeEngine fallback enrichment (moa/halfLife/metabolism/ddd/blackBox + fluoroquinolone guard) verified');

console.log('======================================================');
console.log('🎉 ALL MASTER CLINICAL MONOGRAPH v2 TESTS PASSED! 🎉');
console.log('======================================================');
