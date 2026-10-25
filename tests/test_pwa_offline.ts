import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- TESTING PWA ASSETS, WORKBOX & OFFLINE ARCHITECTURE ---');

// 1. Verify Public Assets Directory & Deduplication
assert.ok(fs.existsSync('public/icons/icon-192.png'), 'public/icons/icon-192.png must exist');
assert.ok(fs.existsSync('public/icons/icon-512.png'), 'public/icons/icon-512.png must exist');
assert.ok(fs.existsSync('public/data/medicines.json'), 'public/data/medicines.json must exist');
assert.ok(!fs.existsSync('public/data/titck_skrs_prospektuslu.json'), 'Duplicate 4.6MB public/data/titck_skrs_prospektuslu.json must be removed');
assert.ok(fs.existsSync('public/data/clinical_monographs.json'), 'public/data/clinical_monographs.json must exist');
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
assert.strictEqual(monographs.length, 125, 'Offline clinical monographs dataset must have exactly 125 items');
const uniqueMonographIds = new Set(monographs.map((m: any) => m.id));
assert.strictEqual(uniqueMonographIds.size, 125, 'All 125 monograph IDs must be unique');
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
console.log('✓ Offline clinical_monographs.json verified with 125 complete clinical drug cards');

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
