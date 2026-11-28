import assert from 'assert';
import fs from 'fs';
import zlib from 'zlib';
import {
  ensureSupplementCatalogReady,
  searchSupplementCatalog,
  evaluateSupplementInteractions,
  renderSupplementAlertsHTML,
  getSupplementByIdSync
} from '../src/engines/supplementInteractionEngine';
import {
  evaluateUnifiedPrescriptionSafety,
  renderQuickSafetySummaryHTML,
  renderUnifiedModalSafetyBannerHTML
} from '../src/engines/unifiedSafetyOrchestrator';
import {
  validateLoincMonitoringItem,
  validateEvidenceUrl,
  normalizeTrForQuoteMatch,
  EBYS_ARTIFACT_REGEX,
  UNRESOLVED_PLACEHOLDER_REGEX
} from '../src/schemas/pddiMonographSchema';

console.log('--- TESTING SUPPLEMENT, VITAMIN & HERBAL TEA INTERACTION MODULE (HDI/SDI) ---');

// 1. Catalog Loading, Size Budget & Schema Integrity (Anti-Hallucination Gate)
const rawBuf = fs.readFileSync('public/data/supplement_interactions_tr.json');
const gzBuf = zlib.gzipSync(rawBuf);
assert.ok(rawBuf.length < 300 * 1024, `Raw supplement catalog should be <300KB (Found: ${(rawBuf.length / 1024).toFixed(1)}KB)`);
assert.ok(gzBuf.length < 70 * 1024, `GZIP supplement catalog should be <70KB (Found: ${(gzBuf.length / 1024).toFixed(1)}KB)`);

const catalog = await ensureSupplementCatalogReady();
assert.ok(catalog, 'Supplement catalog must load cleanly in Node/offline mode');
assert.ok(catalog.supplements.length >= 40, `Expected >=40 Turkish-focused supplements (Found: ${catalog.supplements.length})`);
assert.ok(catalog.rules.length >= 60, `Expected >=60 verified interaction rules (Found: ${catalog.rules.length})`);
assert.strictEqual(catalog.review_status, 'author_draft_unreviewed', 'Catalog must transparently mark author_draft_unreviewed');

const suppIds = new Set(catalog.supplements.map(s => s.id));
assert.strictEqual(suppIds.size, catalog.supplements.length, 'All supplement IDs must be unique');

const BANNED_BOILERPLATE = /dikkatli\s*kullan[ıi]n[ıi]z|dikkatli\s*olunmal[ıi]d[ıi]r|yak[ıi]n\s*izlem\s*yap[ıi]lmal[ıi]d[ıi]r\./i;

// Yerel TİTCK KÜB indeksi ([CHK-SUP-A2] birebir alıntı çapraz doğrulaması)
const localKubIndex = new Map<string, string>();
for (const f of fs.readdirSync('public/data/kub').filter(x => x.endsWith('.json'))) {
  const shard = JSON.parse(fs.readFileSync(`public/data/kub/${f}`, 'utf8')) as Record<string, Record<string, unknown>>;
  for (const [atc, rec] of Object.entries(shard)) {
    const joined = Object.values(rec || {}).filter(v => typeof v === 'string').join(' ');
    localKubIndex.set(atc.toUpperCase(), normalizeTrForQuoteMatch(joined));
  }
}

let titckKubQuotesVerified = 0;
let totalVerbatimAssertions = 0;

for (const s of catalog.supplements) {
  const txt = JSON.stringify(s);
  assert.ok(!EBYS_ARTIFACT_REGEX.test(txt), `EBYS artifact in ${s.id}`);
  assert.ok(!UNRESOLVED_PLACEHOLDER_REGEX.test(txt), `Placeholder in ${s.id}`);
}
const allRulesForGate = [
  ...catalog.rules.map(r => ({ ...r, _isStacking: false as const })),
  ...(catalog.stacking_rules || []).map(sr => ({ ...sr, supplement_ids: [...(sr.group_a_ids || []), ...(sr.group_b_ids || []), ...(sr.pool_ids || []), ...(sr.trigger_ids || [])], _isStacking: true as const }))
];
assert.ok((catalog.stacking_rules || []).length >= 18, `Expected >=18 stacking/SSI rules (Found: ${(catalog.stacking_rules || []).length})`);

for (const r of allRulesForGate) {
  assert.ok(r.summary_tr.length > 10 && r.summary_tr.length <= 140, `${r.rule_id} summary_tr must be <=140 chars (found ${r.summary_tr.length})`);
  assert.ok(!BANNED_BOILERPLATE.test(r.primary_directive_tr), `${r.rule_id} must not use vague boilerplate`);
  assert.ok(!BANNED_BOILERPLATE.test(r.summary_tr), `${r.rule_id} summary must not use vague boilerplate`);
  for (const sid of r.supplement_ids) {
    assert.ok(suppIds.has(sid), `${r.rule_id} references unknown supplement_id "${sid}"`);
  }
  for (const m of r.monitoring || []) {
    const loincErr = validateLoincMonitoringItem(m);
    assert.strictEqual(loincErr, null, `${r.rule_id} invalid LOINC: ${loincErr}`);
  }
  assert.ok(Array.isArray(r.source_assertions) && r.source_assertions.length > 0, `${r.rule_id} must include >=1 verified source`);
  for (const sa of r.source_assertions) {
    const urlErr = validateEvidenceUrl(sa.url);
    assert.strictEqual(urlErr, null, `${r.rule_id} invalid source URL: ${urlErr}`);
    // [CHK-SUP-A4] Birebir kaynak alıntısı, tarih damgası ve spesifik URL zorunluluğu
    assert.ok(
      typeof sa.source_quote_verbatim === 'string' && sa.source_quote_verbatim.trim().length >= 20,
      `[CHK-SUP-A4] ${r.rule_id} (${sa.identifier}) must carry verified source_quote_verbatim (>=20 chars)`
    );
    assert.ok(
      typeof sa.effective_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sa.effective_date),
      `[CHK-SUP-A4] ${r.rule_id} (${sa.identifier}) must carry ISO effective_date`
    );
    if (sa.source_type === 'FDA_SPL') {
      assert.ok(sa.url.includes('setid='), `[CHK-SUP-A4] ${r.rule_id} FDA_SPL URL must link to exact DailyMed setid=`);
    }
    if (sa.source_type === 'TITCK_KUB') {
      const atc = sa.identifier.replace(/^TITCK_KUB:/i, '').trim().toUpperCase();
      const kubNorm = localKubIndex.get(atc);
      assert.ok(kubNorm, `[CHK-SUP-A2] ${r.rule_id} references missing local KÜB ATC: ${atc}`);
      assert.ok(
        kubNorm.includes(normalizeTrForQuoteMatch(sa.source_quote_verbatim)),
        `[CHK-SUP-A2] ${r.rule_id} TITCK_KUB quote not found verbatim in local KÜB (${atc}): "${sa.source_quote_verbatim}"`
      );
      titckKubQuotesVerified++;
    }
    totalVerbatimAssertions++;
  }
}
assert.ok(titckKubQuotesVerified >= 6, `Expected >=6 locally cross-verified TITCK KÜB quotes (Found: ${titckKubQuotesVerified})`);
console.log(`✓ Clean-room schema & verbatim gate passed (${catalog.supplements.length} items, ${catalog.rules.length} HDI/SDI + ${(catalog.stacking_rules || []).length} stacking rules, ${totalVerbatimAssertions} verified quotes, ${titckKubQuotesVerified} local KÜB exact matches, ${(gzBuf.length / 1024).toFixed(1)}KB GZIP, 0 violations)`);

// 2. Isolated Category Search & Turkish Synonym Normalization (Does NOT pollute medicines.json)
const hederaHits = searchSupplementCatalog('sarmasik', 'herbal_tea');
assert.ok(hederaHits.some(x => x.id === 'hedera_helix'), 'Searching "sarmasik" in herbal_tea must find Duvar Sarmaşığı (Hedera helix)');
assert.ok(searchSupplementCatalog('prospan', 'all').some(x => x.id === 'hedera_helix'), 'Synonym "prospan" must match Hedera helix');
assert.ok(searchSupplementCatalog('umca', 'herbal_tea').some(x => x.id === 'pelargonium'), 'Synonym "umca" must match Pelargonium sidoides');
assert.ok(searchSupplementCatalog('d3 k2', 'vitamin_mineral').some(x => x.id === 'vit_d3_k2'), 'Searching "d3 k2" in vitamin_mineral must find D3+K2');
assert.ok(searchSupplementCatalog('zayiflama cayi', 'herbal_tea').some(x => x.id === 'senna'), 'Synonym "zayiflama cayi" must find Sinameki');
assert.ok(searchSupplementCatalog('sac vitamini', 'vitamin_mineral').some(x => x.id === 'biotin'), 'Synonym "sac vitamini" must find Biyotin');
assert.strictEqual(searchSupplementCatalog('sarmasik', 'vitamin_mineral').length, 0, 'Category filter must isolate herbal_tea from vitamin_mineral');
console.log('✓ Isolated 3-category Turkish supplement search & synonym resolution verified');

// 3. STRICT ZERO-NOISE INVARIANT (No alerts unless explicitly selected!)
const warfarinOnly = evaluateUnifiedPrescriptionSafety(
  [{ brand: 'COUMADIN 5 MG TABLET', generic: 'Varfarin sodyum', atcCode: 'B01AA03', route: 'ORAL' }],
  { ageYears: 62, egfr: 75 }
);
assert.strictEqual(warfarinOnly.supplementSafety.selectedCount, 0);
assert.strictEqual(warfarinOnly.supplementSafety.alerts.length, 0);
assert.strictEqual(warfarinOnly.supplementSafety.actionableCount, 0);
assert.strictEqual(warfarinOnly.counts.supplementAlerts, 0);
assert.strictEqual(renderSupplementAlertsHTML(warfarinOnly.supplementSafety), '');
assert.ok(!renderQuickSafetySummaryHTML(warfarinOnly).includes('Takviye/Bitki'), 'Quick summary must not show Takviye/Bitki pill when none selected');

const indexHtml = fs.readFileSync('index.html', 'utf8');
assert.ok(indexHtml.includes('id="btn-toggle-supplement-picker"'), 'index.html must include compact supplement trigger button');
assert.ok(indexHtml.includes('id="panel-supplement-picker" class="hidden'), 'Supplement picker panel must start hidden by default');
assert.ok(indexHtml.includes('id="output-safety-supplements" class="hidden'), 'Supplement alert container must start hidden by default');
console.log('✓ Zero-Noise Invariant verified: 0 unsolicited supplement warnings when none selected');

// 4. High-Risk Clinical Scenarios (When Explicitly Selected)
// 4a. Warfarin + Sarı Kantaron (Active) -> Tier X Hard Stop
const sjwWarfarin = evaluateUnifiedPrescriptionSafety(
  [{ brand: 'COUMADIN 5 MG TABLET', generic: 'Varfarin', atcCode: 'B01AA03', route: 'ORAL' }],
  {
    selectedSupplements: [{ id: 'st_johns_wort', nameTr: 'Sarı Kantaron', category: 'herbal_tea', formulation: 'active_extract_or_tea' }]
  }
);
assert.strictEqual(sjwWarfarin.supplementSafety.hasCritical, true);
assert.ok(sjwWarfarin.supplementSafety.alerts.some(a => a.ruleId === 'SUP_HDI_001' && a.actionTier === 'X'));
assert.strictEqual(sjwWarfarin.counts.hasCritical, true);
assert.ok(renderUnifiedModalSafetyBannerHTML(sjwWarfarin).includes('Sarı Kantaron'), 'Modal safety banner must stay synchronized with selected supplements');

// 4b. Warfarin + Sarı Kantaron (Son 14 Günde Kesildi) -> De-induction Tier D (NOT active X)
const sjwStopped = evaluateSupplementInteractions(
  [{ brand: 'COUMADIN 5 MG', generic: 'Varfarin', atcCode: 'B01AA03', route: 'ORAL' }],
  [{ id: 'st_johns_wort', nameTr: 'Sarı Kantaron', category: 'herbal_tea', formulation: 'stopped_14d' }]
);
assert.ok(sjwStopped.alerts.some(a => a.ruleId === 'SUP_HDI_005' && a.actionTier === 'D'));
assert.ok(!sjwStopped.alerts.some(a => a.ruleId === 'SUP_HDI_001'));

// 4c. Warfarin + D3+K2 -> Tier D INR drop
const d3k2Warfarin = evaluateSupplementInteractions(
  [{ brand: 'COUMADIN 5 MG', generic: 'Varfarin', atcCode: 'B01AA03', route: 'ORAL' }],
  [{ id: 'vit_d3_k2', nameTr: 'D3 + K2 Vitamini', category: 'vitamin_mineral', formulation: 'standard' }]
);
assert.ok(d3k2Warfarin.alerts.some(a => a.ruleId === 'SUP_HDI_006' && a.actionTier === 'D'));

// 4d. Route Sensitivity: Oral Ciprofloxacin + Calcium -> Chelation D; IV Ciprofloxacin + Calcium -> 0 FP!
const ciproOralCa = evaluateSupplementInteractions(
  [{ brand: 'CIPRO 500 MG FILM TABLET', generic: 'Siprofloksasin', atcCode: 'J01MA02', route: 'ORAL' }],
  [{ id: 'calcium', nameTr: 'Kalsiyum', category: 'vitamin_mineral' }]
);
assert.ok(ciproOralCa.alerts.some(a => a.ruleId === 'SUP_HDI_009' && a.actionTier === 'D'));

const ciproIvCa = evaluateSupplementInteractions(
  [{ brand: 'CIPRO 200 MG IV INFUZYON', generic: 'Siprofloksasin', atcCode: 'J01MA02', route: 'IV' }],
  [{ id: 'calcium', nameTr: 'Kalsiyum', category: 'vitamin_mineral' }]
);
assert.strictEqual(ciproIvCa.alerts.length, 0, 'IV ciprofloxacin must NOT trigger oral GI chelation with Calcium');

// 4e. Formulation Sensitivity: Green Tea EGCG Extract vs Tea Infusion in Cirrhosis
const egcgCirrhosis = evaluateSupplementInteractions(
  [],
  [{ id: 'green_tea', nameTr: 'Yeşil Çay', category: 'herbal_tea', formulation: 'egcg_extract' }],
  { childPughClass: 'B' }
);
assert.ok(egcgCirrhosis.alerts.some(a => a.ruleId === 'SUP_HDI_044' && a.actionTier === 'X'));

const greenTeaInfusionCirrhosis = evaluateSupplementInteractions(
  [],
  [{ id: 'green_tea', nameTr: 'Yeşil Çay', category: 'herbal_tea', formulation: 'tea_infusion' }],
  { childPughClass: 'B' }
);
assert.strictEqual(greenTeaInfusionCirrhosis.alerts.length, 0, 'Normal green tea infusion must NOT fire EGCG capsule DILI Hard Stop');

// 4f. Standalone Special Contexts (0 drugs, explicitly selected supplement)
const biotinLab = evaluateSupplementInteractions(
  [],
  [{ id: 'biotin', nameTr: 'Biyotin', category: 'vitamin_mineral', formulation: 'high_dose' }]
);
assert.ok(biotinLab.alerts.some(a => a.ruleId === 'SUP_HDI_017' && a.actionTier === 'D' && a.isStandaloneContext));

const hederaInfant = evaluateSupplementInteractions(
  [],
  [{ id: 'hedera_helix', nameTr: 'Duvar Sarmaşığı', category: 'herbal_tea' }],
  { ageMonths: 14 }
);
assert.ok(hederaInfant.alerts.some(a => a.ruleId === 'SUP_HDI_035' && a.actionTier === 'X'));

const hederaAntitussive = evaluateSupplementInteractions(
  [{ brand: 'SINEKOD SURUP', generic: 'Butamirat', atcCode: 'R05DB13', route: 'ORAL' }],
  [{ id: 'hedera_helix', nameTr: 'Duvar Sarmaşığı', category: 'herbal_tea' }],
  { ageYears: 8 }
);
assert.ok(hederaAntitussive.alerts.some(a => a.ruleId === 'SUP_HDI_036' && a.actionTier === 'D'));

const vitAPreg = evaluateSupplementInteractions(
  [],
  [{ id: 'vit_a', nameTr: 'A Vitamini', category: 'vitamin_mineral', formulation: 'high_dose' }],
  { isPregnant: true, trimester: 1 }
);
assert.ok(vitAPreg.alerts.some(a => a.ruleId === 'SUP_HDI_016' && a.actionTier === 'X'));

const kudretNariPreg = evaluateSupplementInteractions(
  [],
  [{ id: 'bitter_melon', nameTr: 'Kudret Narı', category: 'herbal_tea' }],
  { isPregnant: true, trimester: 1 }
);
assert.ok(kudretNariPreg.alerts.some(a => a.ruleId === 'SUP_HDI_058' && a.actionTier === 'X'));

const fennelToddler = evaluateSupplementInteractions(
  [],
  [{ id: 'fennel', nameTr: 'Rezene Çayı', category: 'herbal_tea' }],
  { ageMonths: 6 }
);
assert.ok(fennelToddler.alerts.some(a => a.ruleId === 'SUP_HDI_055' && a.actionTier === 'D'));

const propolisInfant = evaluateSupplementInteractions(
  [],
  [{ id: 'propolis', nameTr: 'Propolis', category: 'supplement_pill' }],
  { ageMonths: 8 }
);
assert.ok(propolisInfant.alerts.some(a => a.ruleId === 'SUP_HDI_031' && a.actionTier === 'X'));

const pelargoniumCirrhosis = evaluateSupplementInteractions(
  [],
  [{ id: 'pelargonium', nameTr: 'Afrika Sardunyası', category: 'herbal_tea' }],
  { childPughClass: 'A' }
);
assert.ok(pelargoniumCirrhosis.alerts.some(a => a.ruleId === 'SUP_HDI_037' && a.actionTier === 'D'));

// 4g. Red Yeast Rice + Atorvastatin -> Tier X without duplicate double-count
const ryrStatin = evaluateSupplementInteractions(
  [{ brand: 'LIPITOR 20 MG', generic: 'Atorvastatin', atcCode: 'C10AA05', route: 'ORAL' }],
  [{ id: 'red_yeast_rice', nameTr: 'Kırmızı Maya Pirinci', category: 'supplement_pill' }]
);
assert.ok(ryrStatin.alerts.some(a => a.ruleId === 'SUP_HDI_022' && a.actionTier === 'X'));
assert.strictEqual(ryrStatin.duplications.length, 0, 'Red yeast rice + statin X rule must not double-count as separate duplication');

// 4h. B6 Exception: Plain Levodopa (N04BA01) triggers D; Levodopa+Carbidopa (N04BA02) does NOT!
const b6PlainLdopa = evaluateSupplementInteractions(
  [{ brand: 'LEVODOPA 250 MG', generic: 'Levodopa', atcCode: 'N04BA01', route: 'ORAL' }],
  [{ id: 'vit_b6', nameTr: 'B6 Vitamini', category: 'vitamin_mineral', formulation: 'high_dose' }]
);
assert.ok(b6PlainLdopa.alerts.some(a => a.ruleId === 'SUP_HDI_020' && a.actionTier === 'D'));

const b6Madopar = evaluateSupplementInteractions(
  [{ brand: 'MADOPAR 125 MG', generic: 'Levodopa + Benserazid', atcCode: 'N04BA02', route: 'ORAL' }],
  [{ id: 'vit_b6', nameTr: 'B6 Vitamini', category: 'vitamin_mineral', formulation: 'high_dose' }]
);
assert.strictEqual(b6Madopar.alerts.length, 0, 'Levodopa+decarboxylase inhibitor (N04BA02) must NOT trigger plain levodopa B6 antagonism');

// 4i. TİTCK Prescription + OTC Duplication Detection (Ferrosanol + Iron)
const ironDup = evaluateSupplementInteractions(
  [{ brand: 'FERRO SANOL DUODENAL', generic: 'Demir II glisin sülfat', atcCode: 'B03AA01', route: 'ORAL' }],
  [{ id: 'iron', nameTr: 'Demir Takviyesi', category: 'vitamin_mineral' }]
);
assert.strictEqual(ironDup.duplications.length, 1);

// 4j. Digoxin + Senna & Licorice -> Tier D Hypokalemia / Digoxin Toxicity
const digSenna = evaluateSupplementInteractions(
  [{ brand: 'DIGOXIN 0.25 MG', generic: 'Digoksin', atcCode: 'C01AA05', route: 'ORAL' }],
  [{ id: 'senna', nameTr: 'Sinameki / Zayıflama Çayı', category: 'herbal_tea' }]
);
assert.ok(digSenna.alerts.some(a => a.ruleId === 'SUP_HDI_040' && a.actionTier === 'D'));

// 4k. Fluvoxamine + Melatonin -> Tier D CYP1A2 >10x exposure
const fluvoxMel = evaluateSupplementInteractions(
  [{ brand: 'FAVERIN 100 MG', generic: 'Fluvoksamin', atcCode: 'N06AB08', route: 'ORAL' }],
  [{ id: 'melatonin', nameTr: 'Melatonin', category: 'supplement_pill' }]
);
assert.ok(fluvoxMel.alerts.some(a => a.ruleId === 'SUP_HDI_024' && a.actionTier === 'D'));

// 4l. HTML Output Discipline (Russ 2014 + Tilson 2016 collapsed C/B + 1-click REMOVE_SUPPLEMENT)
const htmlOut = renderSupplementAlertsHTML(sjwWarfarin.supplementSafety);
assert.ok(htmlOut.includes('TAKVİYE/BİTKİ') && htmlOut.includes('REMOVE_SUPPLEMENT') && htmlOut.includes('ADD_LAB_ORDER'));
assert.ok(getSupplementByIdSync('hedera_helix')?.name_tr.includes('Duvar Sarmaşığı'));

// 5. CUMULATIVE STACKING & SUPPLEMENT-SUPPLEMENT INTERACTIONS (0 Prescription Drugs!)
// 5a. Adding ALL 44 supplements with 0 drugs MUST fire rich cumulative stacking & SSI alerts (not just Biotin!)
const all44Selected = catalog.supplements.map(s => ({
  id: s.id,
  nameTr: s.name_tr,
  category: s.category
}));
const all44Eval = evaluateSupplementInteractions([], all44Selected);
assert.strictEqual(all44Eval.hasCritical, true, 'All 44 supplements must trigger critical (X) stacking alerts');
assert.ok(all44Eval.alerts.length >= 16, `All 44 supplements must produce >=16 cumulative/SSI alerts (Found: ${all44Eval.alerts.length})`);
assert.ok(all44Eval.alerts.some(a => a.ruleId === 'SUP_STACK_001' && a.actionTier === 'X'), 'Must catch multi-HDS DILI stacking (X)');
assert.ok(all44Eval.alerts.some(a => a.ruleId === 'SUP_STACK_002' && a.actionTier === 'X'), 'Must catch Senna + Licorice severe hypokalemia (X)');
assert.ok(all44Eval.alerts.some(a => a.ruleId === 'SUP_STACK_003' && a.actionTier === 'D'), 'Must catch Red Yeast Rice + Piperine/Berberine CYP3A4 myopathy (D)');
assert.ok(all44Eval.alerts.some(a => a.ruleId === 'SUP_STACK_004' && a.actionTier === 'D'), 'Must catch Double Vitamin D UL exceedance (D)');
assert.ok(all44Eval.alerts.some(a => a.ruleId === 'SUP_STACK_006' && a.actionTier === 'D'), 'Must catch >=3 bleeding agents cumulative stack (D)');
assert.ok(!all44Eval.alerts.some(a => a.ruleId === 'SUP_STACK_007'), '2-agent bleeding C rule must be superseded when >=3 bleeding D rule fires');
assert.ok(all44Eval.alerts.some(a => a.ruleId === 'SUP_STACK_008' && a.actionTier === 'D'), 'Must catch cumulative hypoglycemia stack (D)');
assert.ok(all44Eval.alerts.some(a => a.ruleId === 'SUP_STACK_011' && a.actionTier === 'D'), 'Must catch >=5 poly-supplementation alert (D)');
assert.ok(all44Eval.alerts.some(a => a.ruleId === 'SUP_HDI_017' && a.actionTier === 'D'), 'Must still catch Biotin lab interference (D)');
assert.ok(renderSupplementAlertsHTML(all44Eval).includes('KÜMÜLATİF YIĞILMA'), 'HTML output must render KÜMÜLATİF YIĞILMA badge');

// 5b. Targeted clinical pairs (0 drugs)
const sennaLic = evaluateSupplementInteractions([], [
  { id: 'senna', nameTr: 'Sinameki', category: 'herbal_tea' },
  { id: 'licorice', nameTr: 'Meyan Kökü', category: 'herbal_tea' }
]);
assert.ok(sennaLic.alerts.some(a => a.ruleId === 'SUP_STACK_002' && a.actionTier === 'X'));

const caIron = evaluateSupplementInteractions([], [
  { id: 'calcium', nameTr: 'Kalsiyum', category: 'vitamin_mineral' },
  { id: 'iron', nameTr: 'Demir', category: 'vitamin_mineral' }
]);
assert.ok(caIron.alerts.some(a => a.ruleId === 'SUP_STACK_012' && a.actionTier === 'C'));

// 5c. Formulation-aware negative control: Normal green tea infusion + culinary turmeric tea must NOT fire HDS-DILI X!
const mildTeas = evaluateSupplementInteractions([], [
  { id: 'green_tea', nameTr: 'Yeşil Çay', category: 'herbal_tea', formulation: 'tea_infusion' },
  { id: 'turmeric', nameTr: 'Zerdeçal', category: 'herbal_tea', formulation: 'tea_spice' }
]);
assert.strictEqual(mildTeas.alerts.length, 0, 'Normal green tea infusion + culinary turmeric tea must NOT fire concentrated-extract HDS-DILI X');

console.log(`✓ Cumulative stacking & SSI suite passed (All 44 -> ${all44Eval.alerts.length} alerts [X:${all44Eval.alerts.filter(a=>a.actionTier==='X').length}, D:${all44Eval.alerts.filter(a=>a.actionTier==='D').length}, C:${all44Eval.alerts.filter(a=>a.actionTier==='C').length}], 0 false alarms on mild teas)!`);
console.log('\n🎉 ALL SUPPLEMENT / VITAMIN / HERBAL TEA INTERACTION TESTS PASSED! 🎉\n');
