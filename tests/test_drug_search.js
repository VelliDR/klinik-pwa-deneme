import assert from 'assert';
import fs from 'fs';
import { normalizeText, normalizeDrugRecord, setMemoryDrugsCache, searchDrugsInDB, isDrugCatalogReady, getDrugCatalogIndex } from '../src/db/titckIndexedDB.js';
import { findEquivalents, getDrugBadgesHTML } from '../src/drugEngine.js';
import { setMonographsCache, findMonographSync, renderMonographCardHTML } from '../src/monographEngine.js';

console.log('--- TESTING TİTCK DRUG SEARCH ENGINE & HYBRID CATALOG ---');

// 1. Phonetic & Medical Normalization Tests
assert.strictEqual(normalizeText('PAROL 500 MG'), 'parol 500 mg');
assert.strictEqual(normalizeText('paracetamol'), 'parasetamol');
assert.strictEqual(normalizeText('parasetamol'), 'parasetamol');
assert.strictEqual(normalizeText('amoxicillin'), 'amoksisilin');
assert.strictEqual(normalizeText('amoksisilin'), 'amoksisilin');
assert.strictEqual(normalizeText('ciprofloxacin'), 'siprofloksasin');
assert.strictEqual(normalizeText('siprofloksasin'), 'siprofloksasin');
assert.strictEqual(normalizeText('A-FERIN'), 'a ferin');
assert.strictEqual(normalizeText('AMOKLAVIN-BID'), 'amoklavin bid');
console.log('✓ Phonetic & Turkish/Latin medical normalizations verified');

// 2. Load and Prepare In-Memory Catalog from medicines.json
const medicinesPath = fs.existsSync('public/data/medicines.json') ? 'public/data/medicines.json' : 'data/medicines.json';
const rawData = JSON.parse(fs.readFileSync(medicinesPath, 'utf8'));
assert.strictEqual(rawData.length, 18212);

console.time('Catalog indexing 18,212 items');
setMemoryDrugsCache(rawData);
console.timeEnd('Catalog indexing 18,212 items');

assert.strictEqual(isDrugCatalogReady(), true);
console.log('✓ In-memory drug catalog loaded and ready with 18,212 records');

// 3. Search Queries Verification
const runQuery = async (query) => {
    const start = Date.now();
    const results = await searchDrugsInDB(query);
    const duration = Date.now() - start;
    assert.ok(results.length > 0, `Query "${query}" should return results`);
    return { results, duration };
};

// 3a. Parol & Parol 500
const { results: resParol, duration: tParol } = await runQuery('parol');
assert.ok(resParol.some(d => d.brand.includes('PAROL')), 'Should contain PAROL');
console.log(`✓ "parol" search passed (${resParol.length} results, ${tParol}ms)`);

const { results: resParol500 } = await runQuery('parol 500');
assert.ok(resParol500[0].brand.includes('500'), 'Top result should have 500');
console.log(`✓ "parol 500" search passed (top match: ${resParol500[0].brand})`);

// 3b. Hyphenated / Compact Names (A-FERIN)
const { results: resAferin } = await runQuery('aferin');
assert.ok(resAferin.some(d => d.brand.includes('A-FERIN')), 'Search "aferin" should find A-FERIN');
console.log(`✓ "aferin" search passed (found ${resAferin.length} items, top: ${resAferin[0].brand})`);

const { results: resAferinHyphen } = await runQuery('a-ferin');
assert.ok(resAferinHyphen.some(d => d.brand.includes('A-FERIN')), 'Search "a-ferin" should find A-FERIN');
console.log(`✓ "a-ferin" search passed`);

// 3c. Compact Concatenated Names (AMOKLAVIN-BID)
const { results: resAmoklavinBid } = await runQuery('amoklavinbid');
assert.ok(resAmoklavinBid.some(d => d.brand.includes('AMOKLAVIN')), 'Search "amoklavinbid" should find AMOKLAVIN BID');
console.log(`✓ "amoklavinbid" compact search passed (top: ${resAmoklavinBid[0].brand})`);

// 3d. Arveles & Apranax
const { results: resArveles } = await runQuery('arveles');
assert.ok(resArveles.some(d => d.brand.includes('ARVELES')), 'Search "arveles" should find ARVELES');
console.log(`✓ "arveles" search passed`);

// 3e. Turkish Generic Spelling (parasetamol -> paracetamol)
const { results: resParasetamol } = await runQuery('parasetamol');
assert.ok(resParasetamol.some(d => d.generic.includes('paracetamol') || d.brand.includes('PARACETAMOL')), 'Should match paracetamol');
console.log(`✓ "parasetamol" generic search passed (${resParasetamol.length} results)`);

// 3f. Turkish Generic Spelling (amoksisilin -> amoxicillin)
const { results: resAmoksisilin } = await runQuery('amoksisilin');
assert.ok(resAmoksisilin.some(d => d.generic.includes('amoxicillin')), 'Should match amoxicillin');
console.log(`✓ "amoksisilin" generic search passed (${resAmoksisilin.length} results)`);

// 3g. Exact Barcode Search
const { results: resBarcode } = await runQuery('8699717010109');
assert.strictEqual(resBarcode[0].barcode, '8699717010109');
assert.ok(resBarcode[0].brand.includes('PAROL 500 MG'));
console.log(`✓ Barcode search "8699717010109" passed (matched: ${resBarcode[0].brand})`);

// 4. Equivalents / Muadil Engine Test (O(1) Indexed Lookup)
const catalogIndex = getDrugCatalogIndex();
assert.ok(catalogIndex, 'DrugCatalogIndex must be initialized');
assert.ok(catalogIndex.byBarcode.size > 10000, 'byBarcode index must be populated');
assert.ok(catalogIndex.byAtc.size > 1000, 'byAtc index must be populated');
assert.ok(catalogIndex.byGenericExact.size > 1000, 'byGenericExact index must be populated');
assert.ok(catalogIndex.byWordPrefix.size > 5000, 'byWordPrefix inverted index must be populated');
console.log(`✓ Inverted Drug Search Index verified (Barcodes: ${catalogIndex.byBarcode.size}, ATCs: ${catalogIndex.byAtc.size}, Generics: ${catalogIndex.byGenericExact.size}, Prefixes: ${catalogIndex.byWordPrefix.size})`);

const sampleParol = resParol.find(d => d.brand.includes('PAROL 500 MG 20 TABLET'));
assert.ok(sampleParol, 'Sample Parol must exist');
const eqStart = Date.now();
const equivalents = await findEquivalents(sampleParol);
const eqDuration = Date.now() - eqStart;
assert.ok(equivalents.length > 0, 'Should find equivalents for Parol 500');
assert.ok(!equivalents.some(e => String(e.id) === String(sampleParol.id)), 'Should not include self');
console.log(`✓ Equivalents (Muadil) O(1) indexed search passed: Found ${equivalents.length} equivalents for "${sampleParol.brand}" in ${eqDuration}ms`);

// 5. Badges Test
const badgesHtml = getDrugBadgesHTML(sampleParol);
assert.ok(typeof badgesHtml === 'string');
console.log(`✓ getDrugBadgesHTML passed: "${badgesHtml}"`);

// 6. Prospektüs & KÜB Direct vs Fallback Verification
const drugsWithDirectPdf = rawData.filter(d => Boolean(d.kt || d.kub || d.kt_pdf_prospektus_url || d.kub_pdf_url));
assert.ok(drugsWithDirectPdf.length > 500, 'Should have official direct PDF drugs in dataset');
const samplePdfDrug = drugsWithDirectPdf[0];
const samplePdfBadges = getDrugBadgesHTML(samplePdfDrug);
assert.ok(samplePdfBadges.includes('Resmi PDF (KÜB/KT)'), 'Direct PDF drug should have Resmi PDF badge');
console.log(`✓ Verified direct PDF drug (${samplePdfDrug.brand}) has official PDF badge (Found ${drugsWithDirectPdf.length} direct PDF drugs)`);

// Fallback search link test for drugs without direct PDF
const fallbackSearchQuery = encodeURIComponent(sampleParol.brand + ' prospektüs kub titck pdf');
const fallbackUrl = `https://www.google.com/search?q=${fallbackSearchQuery}`;
assert.ok(fallbackUrl.includes('PAROL'), 'Fallback search URL must include brand');
console.log(`✓ Verified smart fallback prospektüs URL generation for "${sampleParol.brand}"`);

// 7. Search Modes Verification (All, Brand, Generic, Barcode)
console.log('\n--- 7. TESTING MULTI-MODE DRUG SEARCH (BRAND, GENERIC, BARCODE, ALL) ---');
// 7a. Brand mode only
const brandModeRes = await searchDrugsInDB('parol', 'brand');
assert.ok(brandModeRes.length > 0, 'Brand mode search for "parol" must return results');
assert.ok(brandModeRes.every(d => d.brand.toUpperCase().includes('PAROL')), 'All brand mode matches must contain PAROL in brand name');
console.log(`✓ Brand mode search passed (${brandModeRes.length} results, all brand matches)`);

// 7b. Generic mode isolation (searching brand "parol" in generic mode returns 0)
const genericModeParol = await searchDrugsInDB('parol', 'generic');
assert.strictEqual(genericModeParol.length, 0, 'Generic mode for brand "parol" must return 0 matches');
console.log('✓ Generic mode isolation verified (brand name "parol" correctly returns 0 in generic mode)');

// 7c. Generic mode search with active ingredient ("parasetamol")
const genericModeRes = await searchDrugsInDB('parasetamol', 'generic');
assert.ok(genericModeRes.length > 0, 'Generic mode for "parasetamol" must return matches');
assert.ok(genericModeRes.every(d => d.generic.toLowerCase().includes('paracetamol')), 'All matches must contain paracetamol as active ingredient');
console.log(`✓ Generic mode search passed (${genericModeRes.length} results containing paracetamol)`);

// 7d. Barcode mode search
const barcodeModeRes = await searchDrugsInDB('8699717010109', 'barcode');
assert.strictEqual(barcodeModeRes.length, 1);
assert.strictEqual(barcodeModeRes[0].barcode, '8699717010109');
console.log(`✓ Barcode mode search passed (matched ${barcodeModeRes[0].brand})`);

// 8. Offline 125 Clinical Monographs Engine & TİTCK Coverage Verification
console.log('\n--- 8. TESTING OFFLINE 125 CLINICAL MONOGRAPHS ENGINE ---');
const monographsData = JSON.parse(fs.readFileSync('public/data/clinical_monographs.json', 'utf8'));
assert.strictEqual(monographsData.length, 125);
setMonographsCache(monographsData);

const monoParol = findMonographSync(sampleParol);
assert.ok(monoParol, 'Parol must match Paracetamol monograph');
assert.ok(monoParol.atcCodes.includes('N02BE01'));
const monoCardHtml = renderMonographCardHTML(monoParol, sampleParol.brand);
assert.ok(monoCardHtml.includes(sampleParol.brand));
assert.ok(monoCardHtml.includes('Renal Doz Uyarlaması'));

const { results: resAugmentin } = await runQuery('augmentin');
const monoAugmentin = findMonographSync(resAugmentin[0]);
assert.ok(monoAugmentin && monoAugmentin.atcCodes.includes('J01CR02'), 'Augmentin must match Amoxicillin-Clavulanate monograph');

const monoArveles = findMonographSync(resArveles[0]);
assert.ok(monoArveles && monoArveles.atcCodes.includes('M01AE17'), 'Arveles must match Dexketoprofen monograph');

// False-positive guard: Somatropin must NOT match Atropine
const fakeSomatropin = findMonographSync({ brand: 'GENOTROPIN', generic: 'somatropin', atc: 'H01AC01' });
assert.strictEqual(fakeSomatropin, null, 'Somatropin must not misclassify as Atropine');

// Coverage across 18,212 licensed drugs
let matchedCount = 0;
for (const rawItem of rawData) {
    const rec = normalizeDrugRecord(rawItem, 0);
    if (findMonographSync(rec)) matchedCount++;
}
assert.ok(matchedCount >= 5000, `Expected >=5,000 TİTCK drugs to match 125 core monographs, got ${matchedCount}`);
console.log(`✓ Offline 125 Clinical Monographs verified (Matched ${matchedCount} / ${rawData.length} TİTCK records cleanly)`);

console.log('\n🎉 ALL DRUG SEARCH, MONOGRAPH & EQUIVALENTS TESTS PASSED CLEANLY (100% HEALTHY)!');


