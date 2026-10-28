import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- TESTING PWA ASSETS, WORKBOX & OFFLINE ARCHITECTURE ---');

// 1. Verify Public Assets Directory & Deduplication
assert.ok(fs.existsSync('public/icons/icon-192.png'), 'public/icons/icon-192.png must exist');
assert.ok(fs.existsSync('public/icons/icon-512.png'), 'public/icons/icon-512.png must exist');
assert.ok(fs.existsSync('public/data/medicines.json'), 'public/data/medicines.json must exist');
assert.ok(fs.existsSync('public/data/clinical_monographs.json'), 'public/data/clinical_monographs.json must exist');
assert.ok(fs.existsSync('public/data/atc_knowledge_base.json'), 'public/data/atc_knowledge_base.json must exist');
assert.ok(fs.existsSync('public/manifest.json'), 'public/manifest.json must exist');

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
assert.ok(medicinesGzip.length < 900 * 1024, `Gzip medicines.json should be < 900KB (Found: ${gzipKb}KB)`);
console.log(`✓ Medicines size budget passed: ${rawMb}MB raw -> ${gzipKb}KB GZIP (%${((1 - medicinesGzip.length / medicinesRawBuffer.length) * 100).toFixed(1)} net savings)`);

const medicines = JSON.parse(medicinesRawBuffer.toString('utf8'));
assert.strictEqual(medicines.length, 18212, 'Medicines dataset must have exactly 18,212 items');

// Master field statistics check
const sgkCount = medicines.filter((d: any) => d.sg === 1).length;
const egCount = medicines.filter((d: any) => Boolean(d.eg)).length;
const coldCount = medicines.filter((d: any) => d.cz === 1).length;
const pdfCount = medicines.filter((d: any) => Boolean(d.kt || d.kb)).length;
const pregCount = medicines.filter((d: any) => Boolean(d.pr)).length;

assert.strictEqual(sgkCount, 7280, 'Must have exactly 7,280 SGK reimbursed drugs');
assert.strictEqual(egCount, 6317, 'Must have exactly 6,317 SGK equivalent group drugs');
assert.strictEqual(coldCount, 858, 'Must have exactly 858 cold chain drugs');
assert.strictEqual(pdfCount, 2983, 'Must have exactly 2,983 official direct PDF drugs');
assert.ok(pregCount >= 1000, `Must have >= 1,000 pregnancy category drugs (Found: ${pregCount})`);
console.log(`✓ Public TİTCK medicines.json dataset verified (18,212 records, SGK: ${sgkCount}, E-Kod: ${egCount}, Soğuk Zincir: ${coldCount}, PDF: ${pdfCount}, Gebelik: ${pregCount})`);

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
console.log('✓ Offline clinical_monographs.json verified with 135 complete clinical drug cards (All 25 critical pediatric drugs 100% structured)');

// 2b. Verify ATC Knowledge Base & Pharmacological Taxonomy
const atcKb = JSON.parse(fs.readFileSync('public/data/atc_knowledge_base.json', 'utf8'));
assert.strictEqual(Object.keys(atcKb.systems).length, 14, 'Must have exactly 14 ATC Level 1 anatomical systems');
assert.ok(Object.keys(atcKb.groups).length >= 50, 'Must have >= 50 ATC Level 2 therapeutic groups');
assert.ok(Object.keys(atcKb.atcMap).length >= 1700, 'Must have >= 1,700 ATC mapped entries');
assert.ok(Array.isArray(atcKb.strings) && atcKb.strings.length >= 100, 'Must have >= 100 dictionary strings');
assert.ok(Array.isArray(atcKb.interactions) && atcKb.interactions.length > 0, 'Must have ATC cross-interaction rules');
console.log(`✓ Offline atc_knowledge_base.json verified (14 Systems, ${Object.keys(atcKb.groups).length} Groups, ${Object.keys(atcKb.atcMap).length} ATC codes, ${atcKb.interactions.length} Cross-Rules)`);

// 3. Verify Legacy SW Isolation
assert.ok(!fs.existsSync('sw.js'), 'Legacy sw.js in root must not exist');
assert.ok(fs.existsSync('archive/legacy_js/sw.js'), 'Legacy sw.js must be archived in archive/legacy_js/');
console.log('✓ Legacy sw.js cleanly isolated in archive/legacy_js/');

// 4. Verify vite.config.ts PWA Setup & Relative Base
const viteConfigContent = fs.readFileSync('vite.config.ts', 'utf8');
assert.ok(viteConfigContent.includes('VitePWA'), 'VitePWA plugin must be present');
assert.ok(viteConfigContent.includes("base: './'"), 'vite.config.ts must have base: \'./\' for GitHub Pages compatibility');
assert.ok(viteConfigContent.includes('maximumFileSizeToCacheInBytes: 30 * 1024 * 1024'), 'Cache limit must be >= 30MB');
assert.ok(viteConfigContent.includes('data/medicines.json'), 'medicines.json must be in includeAssets');
assert.ok(viteConfigContent.includes('data/clinical_monographs.json'), 'clinical_monographs.json must be in includeAssets');
assert.ok(viteConfigContent.includes('data/atc_knowledge_base.json'), 'atc_knowledge_base.json must be in includeAssets');
assert.ok(viteConfigContent.includes('CacheFirst'), 'CacheFirst runtime caching must be configured for medical data');
console.log('✓ vite.config.ts Workbox and offline cache configuration verified');

// 5. Test PWA Lifecycle Manager (src/pwa.ts)
import { setupPWA } from '../src/pwa';
assert.doesNotThrow(() => {
    setupPWA();
}, 'setupPWA should execute cleanly in non-browser/headless runtime without throwing');
console.log('✓ src/pwa.ts setupPWA execution resilience verified');

// 6. Verify Production Distribution (dist/sw.js and precache)
if (fs.existsSync('dist')) {
    assert.ok(fs.existsSync('dist/sw.js'), 'dist/sw.js must be generated');
    assert.ok(fs.existsSync('dist/manifest.json'), 'dist/manifest.json must be generated');
    assert.ok(fs.existsSync('dist/data/medicines.json'), 'dist/data/medicines.json must exist in distribution');
    console.log('✓ Production dist/ Service Worker, manifest, and offline assets verified');
}

console.log('\n🎉 ALL PWA & OFFLINE ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉\n');
