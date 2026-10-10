import assert from 'assert';
import fs from 'fs';
import { normalizeText, normalizeDrugRecord, setMemoryDrugsCache, searchDrugsInDB, isDrugCatalogReady } from '../js/db/titckIndexedDB.js';
import { findEquivalents, getDrugBadgesHTML } from '../js/drugEngine.js';

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
const rawData = JSON.parse(fs.readFileSync('data/medicines.json', 'utf8'));
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

// 4. Equivalents / Muadil Engine Test
const sampleParol = resParol.find(d => d.brand.includes('PAROL 500 MG 20 TABLET'));
assert.ok(sampleParol, 'Sample Parol must exist');
const equivalents = await findEquivalents(sampleParol);
assert.ok(equivalents.length > 0, 'Should find equivalents for Parol 500');
assert.ok(!equivalents.some(e => String(e.id) === String(sampleParol.id)), 'Should not include self');
console.log(`✓ Equivalents (Muadil) search passed: Found ${equivalents.length} equivalents for "${sampleParol.brand}"`);

// 5. Badges Test
const badgesHtml = getDrugBadgesHTML(sampleParol);
assert.ok(typeof badgesHtml === 'string');
console.log(`✓ getDrugBadgesHTML passed: "${badgesHtml}"`);

console.log('\n🎉 ALL DRUG SEARCH & EQUIVALENTS TESTS PASSED CLEANLY (100% HEALTHY)!');
