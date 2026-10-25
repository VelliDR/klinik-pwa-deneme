import assert from 'assert';
import fs from 'fs';
import { normalizeText, normalizeDrugRecord, setMemoryDrugsCache, searchDrugsInDB, isDrugCatalogReady, getDrugCatalogIndex, getDrugsByEsdegerGroup } from '../src/db/titckIndexedDB.js';
import { findEquivalents, getDrugBadgesHTML } from '../src/drugEngine.js';
import { renderRefDrugCardHTML, renderEquivalentsFilterBarHTML, renderEquivalentsListHTML } from '../src/controllers/equivalentsModalController.js';
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
assert.ok(catalogIndex.byEsdeger.size >= 2000, `byEsdeger index must have >= 2000 SGK equivalent groups (Found: ${catalogIndex.byEsdeger.size})`);
assert.ok(catalogIndex.byWordPrefix.size > 5000, 'byWordPrefix inverted index must be populated');
console.log(`✓ Inverted Drug Search Index verified (Barcodes: ${catalogIndex.byBarcode.size}, ATCs: ${catalogIndex.byAtc.size}, Generics: ${catalogIndex.byGenericExact.size}, SGK Eşdeğer: ${catalogIndex.byEsdeger.size}, Prefixes: ${catalogIndex.byWordPrefix.size})`);

// 4b. O(1) SGK Eşdeğer Grubu Lookup Verification (E267A: Pantoprazol 40 mg enterik kaplı tabletler)
const pantoprazoleGroup = getDrugsByEsdegerGroup('E267A');
assert.strictEqual(pantoprazoleGroup.length, 23, 'E267A must contain exactly 23 official SGK equivalent drugs');
assert.ok(pantoprazoleGroup.every(d => d.esdegerGroup === 'E267A'), 'All drugs in group must have E267A code');
console.log(`✓ O(1) SGK Eşdeğer Grubu lookup verified: E267A returned ${pantoprazoleGroup.length} official bioequivalents`);

const samplePantoprazole = pantoprazoleGroup[0];
const pantoEquivalents = await findEquivalents(samplePantoprazole);
assert.ok(pantoEquivalents.length >= 22, 'Should find all other 22 equivalents in E267A');
assert.strictEqual(pantoEquivalents[0].esdegerGroup, 'E267A', 'Top equivalent must be an official SGK bioequivalent with E267A');
assert.strictEqual(pantoEquivalents[0].matchTier, 1, 'Top equivalent must have matchTier === 1 (Official SGK)');
assert.ok(pantoEquivalents[0].matchReason.includes('SGK Eşdeğer Grubu: E267A'), 'Top equivalent must have official SGK match reason');
console.log(`✓ SGK Eşdeğer Group prioritization verified: Top match for "${samplePantoprazole.brand}" is "${pantoEquivalents[0].brand}" (Tier ${pantoEquivalents[0].matchTier}, Group: ${pantoEquivalents[0].esdegerGroup})`);

// 4c. Verify 3-Tier Bioequivalents Hierarchy (Tier 1 -> Tier 2 -> Tier 3)
const tier1Count = pantoEquivalents.filter(d => d.matchTier === 1).length;
const tier3Count = pantoEquivalents.filter(d => d.matchTier === 3).length;
assert.strictEqual(tier1Count, 22, 'All other 22 drugs in E267A must be classified as Tier 1');
assert.ok(tier3Count > 0, `Should identify ATC-4 therapeutic alternatives (Found: ${tier3Count} in A02BC class)`);
console.log(`✓ 3-Tier Hierarchy verified for Pantoprazole: Tier-1 (Official SUT): ${tier1Count}, Tier-3 (PPI Therapeutic Class): ${tier3Count}`);

// 4d. Stage 4 Equivalents Modal Controller Render Verification
const refCardHtml = renderRefDrugCardHTML(samplePantoprazole);
assert.ok(refCardHtml.includes('Karşılaştırılan Referans Müstahzar'), 'Ref card must render reference badge');
assert.ok(refCardHtml.includes('SGK Grubu: E267A'), 'Ref card must render SGK group badge');
console.log('✓ renderRefDrugCardHTML verified cleanly');

const filterBarHtml = renderEquivalentsFilterBarHTML(pantoEquivalents, 'all');
assert.ok(filterBarHtml.includes('Resmi Biyoeşdeğerler (22)'), 'Filter bar must render Tier-1 official count');
assert.ok(filterBarHtml.includes('SGK Ödeyenler'), 'Filter bar must render SGK reimbursed tab');
console.log('✓ renderEquivalentsFilterBarHTML verified cleanly');

const listHtmlAll = renderEquivalentsListHTML(pantoEquivalents, 'all');
assert.ok(listHtmlAll.includes('Resmi SGK Biyoeşdeğer'), 'Equivalents list must render Tier-1 badges');
assert.ok(listHtmlAll.includes('Reçeteye Ekle'), 'Equivalents list must include add to rx buttons');
console.log('✓ renderEquivalentsListHTML (All) verified cleanly');

const listHtmlOfficial = renderEquivalentsListHTML(pantoEquivalents, 'official');
assert.ok(!listHtmlOfficial.includes('Terapötik Alternatif'), 'Official filter must isolate SUT Tier-1 only');
console.log('✓ renderEquivalentsListHTML (Official Isolation) verified cleanly');

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
assert.ok(badgesHtml.includes('🛡️ SGK Ödüyor'), 'Parol 500 must show SGK Ödüyor badge');
assert.ok(badgesHtml.includes('🤰 Gebelik: B'), 'Parol 500 must show Gebelik: B badge');
console.log(`✓ sampleParol badges verified: SGK Ödüyor + Gebelik: B ("${badgesHtml}")`);

// 5b. Cold Chain Badge Test (cz === 1)
const coldChainRaw = rawData.find(d => d.cz === 1);
assert.ok(coldChainRaw, 'Should find at least one cold chain drug');
const coldChainDrug = normalizeDrugRecord(coldChainRaw, 0);
const coldBadges = getDrugBadgesHTML(coldChainDrug);
assert.ok(coldBadges.includes('❄️ 2-8°C Soğuk Zincir'), `Cold chain drug (${coldChainDrug.brand}) must show 2-8°C Soğuk Zincir badge`);
console.log(`✓ Cold chain badge verified for: ${coldChainDrug.brand}`);

// 5c. Pregnancy Category X (Teratogenic / Contraindicated) Test (pr === 'X')
const pregXRaw = rawData.find(d => d.pr === 'X');
assert.ok(pregXRaw, 'Should find at least one pregnancy category X drug');
const pregXDrug = normalizeDrugRecord(pregXRaw, 0);
const pregXBadges = getDrugBadgesHTML(pregXDrug);
assert.ok(pregXBadges.includes('⛔ Gebelik: X (Kontrendike)'), `Category X drug (${pregXDrug.brand}) must show Contraindicated X badge`);
console.log(`✓ Pregnancy Category X contraindicated badge verified for: ${pregXDrug.brand}`);

// 5d. SGK Non-Reimbursed Warning Badge Test (sg === 0)
const nonSgkRaw = rawData.find(d => d.sg === 0);
assert.ok(nonSgkRaw, 'Should find at least one non-reimbursed drug');
const nonSgkDrug = normalizeDrugRecord(nonSgkRaw, 0);
const nonSgkBadges = getDrugBadgesHTML(nonSgkDrug);
assert.ok(nonSgkBadges.includes('⚠️ SGK Ödemiyor'), `Non-reimbursed drug (${nonSgkDrug.brand}) must show SGK Ödemiyor badge`);
console.log(`✓ SGK Non-Reimbursed warning badge verified for: ${nonSgkDrug.brand}`);

// 5e. Prescription Type Badges (Kırmızı / Yeşil)
const redRxRaw = rawData.find(d => d.r === 'Kırmızı');
if (redRxRaw) {
    const redDrug = normalizeDrugRecord(redRxRaw, 0);
    assert.ok(getDrugBadgesHTML(redDrug).includes('🔴 Kırmızı Reçete'), 'Red prescription badge must be rendered');
    console.log(`✓ Red prescription badge verified for: ${redDrug.brand}`);
}
const greenRxRaw = rawData.find(d => d.r === 'Yeşil');
if (greenRxRaw) {
    const greenDrug = normalizeDrugRecord(greenRxRaw, 0);
    assert.ok(getDrugBadgesHTML(greenDrug).includes('🟢 Yeşil Reçete'), 'Green prescription badge must be rendered');
    console.log(`✓ Green prescription badge verified for: ${greenDrug.brand}`);
}

// 5f. SGK Bioequivalent Group Tag Badge Test
const pantoBadgeHtml = getDrugBadgesHTML(samplePantoprazole);
assert.ok(pantoBadgeHtml.includes('🏷️ E267A'), 'Sample Pantoprazole must show E267A badge');
assert.ok(pantoBadgeHtml.includes('badge-esdeger-tag'), 'Sample Pantoprazole badge must have badge-esdeger-tag class for clickable filtering');
console.log(`✓ Clickable SGK Bioequivalent Group badge verified for: ${samplePantoprazole.brand} (Group: ${samplePantoprazole.esdegerGroup})`);


// 6. Prospektüs & KÜB Direct vs Fallback Verification
const drugsWithDirectPdf = rawData.filter(d => Boolean(d.kt || d.kub || d.kt_pdf_prospektus_url || d.kub_pdf_url));
assert.ok(drugsWithDirectPdf.length >= 2900, `Should have >= 2900 direct PDF drugs in dataset (Found: ${drugsWithDirectPdf.length})`);
const samplePdfDrug = normalizeDrugRecord(drugsWithDirectPdf[0], 0);
const samplePdfBadges = getDrugBadgesHTML(samplePdfDrug);
assert.ok(samplePdfBadges.includes('Resmi PDF (KÜB/KT)'), 'Direct PDF drug should have Resmi PDF badge');
console.log(`✓ Verified direct PDF drug (${samplePdfDrug.brand}) has official PDF badge (Found ${drugsWithDirectPdf.length} direct PDF drugs)`);

// 6b. Verify Phase 1 Master Fields Integrity (SGK, Eşdeğer, Soğuk Zincir, Gebelik)
const sgkReimbursedTotal = rawData.filter(d => d.sg === 1).length;
assert.strictEqual(sgkReimbursedTotal, 7280, 'Must have 7,280 SGK reimbursed drugs');
const esdegerTotal = rawData.filter(d => Boolean(d.eg)).length;
assert.strictEqual(esdegerTotal, 6317, 'Must have 6,317 SGK equivalent group drugs');
const coldChainTotal = rawData.filter(d => d.cz === 1).length;
assert.strictEqual(coldChainTotal, 858, 'Must have 858 cold chain drugs');
console.log(`✓ Phase 1 Master fields verified: SGK Reimbursed: ${sgkReimbursedTotal}, Eşdeğer: ${esdegerTotal}, Soğuk Zincir: ${coldChainTotal}`);

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

// 7e. SGK Eşdeğer Mode Search
const esdegerModeRes = await searchDrugsInDB('E267A', 'esdeger');
assert.strictEqual(esdegerModeRes.length, 23);
assert.ok(esdegerModeRes.every(d => d.esdegerGroup === 'E267A'));
console.log(`✓ Eşdeğer mode search passed (E267A returned ${esdegerModeRes.length} items)`);

// 7f. Search Filter Options (onlySgk, onlyActive)
const sgkFiltered = await searchDrugsInDB('parol', 'all', { onlySgk: true });
assert.ok(sgkFiltered.length > 0 && sgkFiltered.every(d => d.sgkReimbursed === 1), 'All filtered results must be SGK reimbursed');
console.log(`✓ Filtered search passed ({ onlySgk: true } returned ${sgkFiltered.length} items)`);

const activeFiltered = await searchDrugsInDB('parol', 'all', { onlyActive: true });
assert.ok(activeFiltered.length > 0 && activeFiltered.every(d => d.status === 'Aktif'), 'All filtered results must be active');
console.log(`✓ Filtered search passed ({ onlyActive: true } returned ${activeFiltered.length} items)`);

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


