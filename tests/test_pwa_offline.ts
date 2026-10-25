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

// 2. Verify Medicines & 125 Clinical Monographs Data Integrity in public/data
const medicines = JSON.parse(fs.readFileSync('public/data/medicines.json', 'utf8'));
assert.strictEqual(medicines.length, 18212, 'Medicines dataset must have exactly 18,212 items');
console.log('✓ Public TİTCK medicines.json dataset verified with 18,212 records');

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

console.log('\n🎉 ALL PWA & OFFLINE ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉\n');
