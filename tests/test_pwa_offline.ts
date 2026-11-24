import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- TESTING PWA ASSETS, WORKBOX & OFFLINE ARCHITECTURE ---');

// 1. Verify Public Assets Directory & Deduplication
assert.ok(fs.existsSync('public/icons/icon-192.png'), 'public/icons/icon-192.png must exist');
assert.ok(fs.existsSync('public/icons/icon-512.png'), 'public/icons/icon-512.png must exist');
assert.ok(fs.existsSync('public/data/medicines.json'), 'public/data/medicines.json must exist');
assert.ok(fs.existsSync('public/data/clinical_monographs.json'), 'public/data/clinical_monographs.json must exist');
assert.ok(fs.existsSync('public/data/clinical_monographs_master.json'), 'public/data/clinical_monographs_master.json must exist');
assert.ok(fs.existsSync('public/data/atc_knowledge_base.json'), 'public/data/atc_knowledge_base.json must exist');
assert.ok(fs.existsSync('public/data/atc_icd10_sozluk.json'), 'public/data/atc_icd10_sozluk.json must exist');
assert.ok(fs.existsSync('public/data/ddi_matrix.json'), 'public/data/ddi_matrix.json must exist');
assert.ok(fs.existsSync('public/data/pddi_monographs_tr.json'), 'public/data/pddi_monographs_tr.json must exist');
assert.ok(fs.existsSync('public/schema/PddiMonograph.schema.json'), 'public/schema/PddiMonograph.schema.json must exist');
assert.ok(fs.existsSync('public/data/data_manifest.json'), 'public/data/data_manifest.json must exist');
assert.ok(fs.existsSync('public/manifest.json'), 'public/manifest.json must exist');

const KUB_SHARD_LETTERS = ['A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'V'];
for (const letter of KUB_SHARD_LETTERS) {
    assert.ok(fs.existsSync(`public/data/kub/kub_${letter}.json`), `public/data/kub/kub_${letter}.json must exist`);
}

const icon192Stat = fs.statSync('public/icons/icon-192.png');
assert.ok(icon192Stat.size > 10000, 'icon-192.png should be valid image > 10KB');

const manifestRaw = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
assert.strictEqual(manifestRaw.short_name, 'KlinikPWA');
assert.ok(manifestRaw.icons.length >= 2, 'manifest must have at least 2 icons');
console.log('✓ Public icons, manifests, and deduplicated data assets verified');

import zlib from 'zlib';

// 2. Verify Medicines & 125 Clinical Monographs Data Integrity in public/data
const medicinesRawBuffer = fs.readFileSync('public/data/medicines.json');
const medicinesGzip = zlib.gzipSync(medicinesRawBuffer);
const rawMb = (medicinesRawBuffer.length / (1024 * 1024)).toFixed(2);
const gzipKb = (medicinesGzip.length / 1024).toFixed(1);

assert.ok(medicinesRawBuffer.length < 5 * 1024 * 1024, `Raw medicines.json should be < 5MB (Found: ${rawMb}MB)`);
assert.ok(medicinesGzip.length < 1024 * 1024, `Gzip medicines.json should be < 1MB (Found: ${gzipKb}KB)`);
console.log(`✓ Medicines size budget passed: ${rawMb}MB raw -> ${gzipKb}KB GZIP (%${((1 - medicinesGzip.length / medicinesRawBuffer.length) * 100).toFixed(1)} net savings)`);

const medicines = JSON.parse(medicinesRawBuffer.toString('utf8'));
assert.ok(medicines.length >= 15000, `Medicines dataset must have >= 15,000 items (Found: ${medicines.length})`);

// Master field statistics check (v2.1 Hibrit ETL — esnek veri güncellemelerine dayanıklı eşikler)
const sgkCount = medicines.filter((d: any) => d.sg === 1).length;
const egCount = medicines.filter((d: any) => Boolean(d.eg)).length;
const coldCount = medicines.filter((d: any) => d.cz === 1).length;
const pdfCount = medicines.filter((d: any) => Boolean(d.kt || d.kub || d.kb)).length;
const pregCount = medicines.filter((d: any) => Boolean(d.pr)).length;
const priceCount = medicines.filter((d: any) => typeof d.psf === 'number' && d.psf > 0).length;
const priceDateCount = medicines.filter((d: any) => typeof d.pdt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.pdt)).length;
const ekzCount = medicines.filter((d: any) => d.ekz === 1).length;

assert.ok(sgkCount >= 6000, `Must have >= 6,000 SGK reimbursed drugs (Found: ${sgkCount})`);
assert.ok(egCount >= 5000, `Must have >= 5,000 SGK equivalent group drugs (Found: ${egCount})`);
assert.ok(coldCount >= 900, `Must have >= 900 cold chain drugs (Found: ${coldCount})`);
assert.ok(pdfCount >= 5000, `Must have >= 5,000 official direct PDF drugs (Found: ${pdfCount})`);
assert.ok(pregCount >= 1000, `Must have >= 1,000 pregnancy category drugs (Found: ${pregCount})`);
assert.ok(priceCount >= 5000, `Must have >= 5,000 priced drugs (Found: ${priceCount})`);
assert.ok(priceDateCount >= 5000, `Must have >= 5,000 drugs with price tariff dates (Found: ${priceDateCount})`);
assert.ok(ekzCount >= 1000, `Must have >= 1,000 extra monitoring drugs (Found: ${ekzCount})`);
console.log(`✓ Public TİTCK medicines.json v2.1 verified (${medicines.length} records, SGK: ${sgkCount}, E-Kod: ${egCount}, Soğuk Zincir: ${coldCount}, PDF: ${pdfCount}, Fiyat: ${priceCount}, Fiyat Tarihi: ${priceDateCount}, ▼: ${ekzCount})`);

const monographs = JSON.parse(fs.readFileSync('public/data/clinical_monographs.json', 'utf8'));
assert.strictEqual(monographs.length, 136, 'Offline clinical monographs dataset must have exactly 136 items');
const uniqueMonographIds = new Set(monographs.map((m: any) => m.id));
assert.strictEqual(uniqueMonographIds.size, 136, 'All 136 monograph IDs must be unique');
const requiredMonoFields = [
    'id', 'genericTr', 'genericEn', 'atcCodes', 'genericKeywords', 'brandExamples',
    'drugClass', 'indications', 'adultDose', 'pediatricDose', 'maxDailyDose',
    'renalAdjustment', 'hepaticAdjustment', 'pregnancyLactation', 'contraindications', 'clinicalPearls'
];
for (const m of monographs) {
    for (const f of requiredMonoFields) {
        assert.ok(m[f] !== undefined && m[f] !== null && String(m[f]).trim().length > 0, `Monograph ${m.id} missing required field ${f}`);
    }
}

// Verify that all 25 critical pediatric drugs have structured profiles (schema compliance)
const criticalPediatricDrugs = [
    'epinephrine', 'ceftriaxone', 'cefotaxime', 'ampicillin', 'gentamicin',
    'vancomycin', 'midazolam', 'diazepam', 'levetiracetam', 'phenobarbital',
    'phenytoin', 'acyclovir', 'oseltamivir', 'budesonide', 'ipratropium',
    'morphine', 'fentanyl', 'ketamine', 'ors', 'paracetamol',
    'metronidazole', 'fluconazole', 'lorazepam', 'methylprednisolone',
    'zinc_sulfate'
];
const monoMap = new Map<string, any>(monographs.map((m: any) => [m.id, m]));
for (const drugId of criticalPediatricDrugs) {
    const m = monoMap.get(drugId);
    assert.ok(m, `Critical pediatric drug ${drugId} must be present in monographs`);
    assert.ok(Array.isArray(m.formulations) && m.formulations.length > 0, `${drugId} must have formulations`);
    assert.ok(m.dosing && Array.isArray(m.dosing.pediatric_dosing) && m.dosing.pediatric_dosing.length > 0, `${drugId} must have pediatric_dosing`);
    assert.ok(m.reproductive_safety && m.reproductive_safety.pregnancy_trimester_risk && m.reproductive_safety.lactation, `${drugId} must have reproductive_safety`);
    assert.ok(m.safety_warnings && m.safety_warnings.neonatal_specific_notes, `${drugId} must have neonatal safety notes`);
    assert.ok(m.metadata && Array.isArray(m.metadata.source_documents), `${drugId} must have metadata`);
}
console.log('✓ Offline clinical_monographs.json verified with 136 complete clinical drug cards (All 25 critical pediatric drugs 100% structured)');

// 2b. Verify ATC Knowledge Base & Pharmacological Taxonomy
const atcKb = JSON.parse(fs.readFileSync('public/data/atc_knowledge_base.json', 'utf8'));
assert.strictEqual(Object.keys(atcKb.systems).length, 14, 'Must have exactly 14 ATC Level 1 anatomical systems');
assert.ok(Object.keys(atcKb.groups).length >= 50, 'Must have >= 50 ATC Level 2 therapeutic groups');
assert.ok(Object.keys(atcKb.atcMap).length >= 1700, 'Must have >= 1,700 ATC mapped entries');
assert.ok(Array.isArray(atcKb.strings) && atcKb.strings.length >= 100, 'Must have >= 100 dictionary strings');
assert.ok(Array.isArray(atcKb.interactions) && atcKb.interactions.length > 0, 'Must have ATC cross-interaction rules');
console.log(`✓ Offline atc_knowledge_base.json verified (14 Systems, ${Object.keys(atcKb.groups).length} Groups, ${Object.keys(atcKb.atcMap).length} ATC codes, ${atcKb.interactions.length} Cross-Rules)`);

// 2c. Verify ATC <-> ICD-10 Dictionary Data & Size Budget
const icdDictBuffer = fs.readFileSync('public/data/atc_icd10_sozluk.json');
const icdDictGzip = zlib.gzipSync(icdDictBuffer);
assert.ok(icdDictBuffer.length < 2 * 1024 * 1024, `Raw atc_icd10_sozluk.json should be < 2MB`);
assert.ok(icdDictGzip.length < 250 * 1024, `Gzip atc_icd10_sozluk.json should be < 250KB (Found: ${(icdDictGzip.length / 1024).toFixed(1)}KB)`);
const icdDict = JSON.parse(icdDictBuffer.toString('utf8'));
assert.strictEqual(Object.keys(icdDict.atc).length, 1794, 'atc_icd10_sozluk.json must have 1,794 ATC entries');
assert.strictEqual(Object.keys(icdDict.icd).length, 1798, 'atc_icd10_sozluk.json must have 1,798 ICD-10 entries');
console.log(`✓ Offline atc_icd10_sozluk.json verified (${Object.keys(icdDict.atc).length} ATC, ${Object.keys(icdDict.icd).length} ICD-10, ${(icdDictGzip.length / 1024).toFixed(1)}KB GZIP)`);

// 2d. Verify Compact DDI Matrix (DDInter 2.0 + Curated + Food + Duplication) & Size Budget
const ddiBuf = fs.readFileSync('public/data/ddi_matrix.json');
const ddiGzip = zlib.gzipSync(ddiBuf);
assert.ok(ddiBuf.length < 600 * 1024, `Raw ddi_matrix.json should be < 600KB (Found: ${(ddiBuf.length / 1024).toFixed(1)}KB)`);
assert.ok(ddiGzip.length < 90 * 1024, `Gzip ddi_matrix.json should be < 90KB (Found: ${(ddiGzip.length / 1024).toFixed(1)}KB)`);
const ddiData = JSON.parse(ddiBuf.toString('utf8'));
assert.ok(ddiData.atcs.length >= 1000, 'ddi_matrix.json must have >= 1,000 ATC codes');
assert.ok(ddiData.rules.length >= 25, 'ddi_matrix.json must include curated Turkish ATC rules');
assert.ok(Object.keys(ddiData.foodQuick || {}).length >= 500, 'ddi_matrix.json must include >= 500 food-interaction ATCs');
assert.ok(Object.keys(ddiData.dup || {}).length >= 450, 'ddi_matrix.json must include >= 450 duplication ATCs');
console.log(`✓ Offline ddi_matrix.json verified (${ddiData.atcs.length} ATCs, ${ddiData.rules.length} curated rules, ${(ddiGzip.length / 1024).toFixed(1)}KB GZIP)`);

// 3. Verify Legacy SW Isolation
assert.ok(!fs.existsSync('sw.js'), 'Legacy sw.js in root must not exist');
assert.ok(fs.existsSync('archive/legacy_js/sw.js'), 'Legacy sw.js must be archived in archive/legacy_js/');
console.log('✓ Legacy sw.js cleanly isolated in archive/legacy_js/');

// 4. Verify vite.config.ts Tiered PWA Setup & Relative Base (no duplicate JSON precache)
const viteConfigContent = fs.readFileSync('vite.config.ts', 'utf8');
assert.ok(viteConfigContent.includes('VitePWA'), 'VitePWA plugin must be present');
assert.ok(viteConfigContent.includes("registerType: 'prompt'"), 'VitePWA must use prompt update mode to avoid silent mid-consultation reloads');
assert.ok(viteConfigContent.includes("base: './'"), 'vite.config.ts must have base: \'./\' for GitHub Pages compatibility');
assert.ok(!viteConfigContent.includes("globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']"), 'globPatterns must not duplicate includeAssets json files');
assert.ok(viteConfigContent.includes('data/medicines.json'), 'medicines.json must be in includeAssets');
assert.ok(viteConfigContent.includes('data/clinical_monographs.json'), 'clinical_monographs.json must be in includeAssets');
assert.ok(viteConfigContent.includes('data/atc_knowledge_base.json'), 'atc_knowledge_base.json must be in includeAssets');
assert.ok(viteConfigContent.includes('data/atc_icd10_sozluk.json'), 'atc_icd10_sozluk.json must be in includeAssets');
assert.ok(viteConfigContent.includes('data/ddi_matrix.json'), 'ddi_matrix.json must be in includeAssets');
assert.ok(viteConfigContent.includes('data/pddi_monographs_tr.json'), 'pddi_monographs_tr.json must be in includeAssets');
assert.ok(viteConfigContent.includes('data/data_manifest.json'), 'data_manifest.json must be in includeAssets');
assert.ok(!viteConfigContent.includes('data/kub/kub_A.json'), 'Heavy KÜB shards must use CacheFirst runtime caching instead of bloating initial precache');
assert.ok(!viteConfigContent.includes('data/clinical_monographs_master.json'), 'Heavy 8MB master monographs must use CacheFirst runtime caching instead of bloating initial precache');
assert.ok(viteConfigContent.includes('CacheFirst'), 'CacheFirst runtime caching must be configured for medical data');
console.log('✓ vite.config.ts tiered Workbox and zero-duplicate offline cache configuration verified');

// 5. Test PWA Lifecycle Manager & Deep Offline Pack (src/pwa.ts)
import { setupPWA, OFFLINE_DEEP_PACK_URLS, getOfflineDeepPackStatus } from '../src/pwa';
assert.doesNotThrow(() => {
    setupPWA();
}, 'setupPWA should execute cleanly in non-browser/headless runtime without throwing');
assert.strictEqual(OFFLINE_DEEP_PACK_URLS.length, 15, 'Deep offline pack must include master monographs + 14 KÜB shards');
const deepStatus = await getOfflineDeepPackStatus();
assert.strictEqual(deepStatus.totalCount, 15);
console.log('✓ src/pwa.ts setupPWA and 15-file deep offline pack verified');

// 6. Verify Production Distribution (dist/sw.js zero-duplicate precache & manifest)
if (fs.existsSync('dist')) {
    assert.ok(fs.existsSync('dist/sw.js'), 'dist/sw.js must be generated');
    assert.ok(fs.existsSync('dist/manifest.json'), 'dist/manifest.json must be generated');
    assert.ok(fs.existsSync('dist/data/medicines.json'), 'dist/data/medicines.json must exist in distribution');
    assert.ok(fs.existsSync('dist/data/atc_icd10_sozluk.json'), 'dist/data/atc_icd10_sozluk.json must exist in distribution');
    assert.ok(fs.existsSync('dist/data/data_manifest.json'), 'dist/data/data_manifest.json must exist in distribution');

    const swContent = fs.readFileSync('dist/sw.js', 'utf8');
    const precacheUrls = Array.from(swContent.matchAll(/url:"([^"]+)"/g)).map(m => m[1]);
    const uniquePrecacheUrls = new Set(precacheUrls);
    assert.strictEqual(
        precacheUrls.length,
        uniquePrecacheUrls.size,
        `dist/sw.js must have ZERO duplicate precache URLs (Total: ${precacheUrls.length}, Unique: ${uniquePrecacheUrls.size})`
    );
    assert.ok(!uniquePrecacheUrls.has('data/kub/kub_A.json'), 'Heavy KÜB shard must not bloat dist/sw.js initial precache');
    assert.ok(uniquePrecacheUrls.has('data/medicines.json'), 'Core medicines.json must be precached in dist/sw.js');
    assert.ok(uniquePrecacheUrls.has('data/data_manifest.json'), 'data_manifest.json must be precached in dist/sw.js');
    console.log(`✓ Production dist/ Service Worker verified (${uniquePrecacheUrls.size} unique precache entries, 0 duplicates)`);
}

console.log('\n🎉 ALL PWA & OFFLINE ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉\n');
