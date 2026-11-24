import assert from 'assert';
import fs from 'fs';
import {
  ensureDataManifestReady,
  evaluateSnapshotFreshness,
  formatTurkishDate,
  renderDataSnapshotPopoverHTML,
  renderPriceDateBubbleTriggerHTML
} from '../src/engines/dataManifestEngine';
import {
  getAllGuidelineMetas,
  getGuidelineMetaForCard
} from '../src/engines/guidelineRegistry';
import {
  CENTOR_MCISAAC_DECLARATIVE_SCHEMA,
  CURB65_DECLARATIVE_SCHEMA,
  evaluateDeclarativeScore,
  renderDeclarativeScoreSummaryHTML
} from '../src/engines/declarativeScoreEngine';
import { getDrugBadgesHTML } from '../src/drugEngine';

console.log('--- TESTING GOVERNANCE, DATA SNAPSHOT BUBBLE, GUIDELINE REGISTRY & DECLARATIVE SCORES ---');

// 1. Licensing & Title Transparency Verification
const licenseText = fs.readFileSync('LICENSE', 'utf8');
const contentLicenseText = fs.readFileSync('LICENSE-CONTENT.md', 'utf8');
const dataNoticeText = fs.readFileSync('DATA_NOTICE.md', 'utf8');
const readmeText = fs.readFileSync('README.md', 'utf8');
const packageJsonText = fs.readFileSync('package.json', 'utf8');
const indexHtmlText = fs.readFileSync('index.html', 'utf8');

assert.ok(licenseText.includes('PolyForm Noncommercial License 1.0.0'), 'LICENSE must be verbatim PolyForm Noncommercial License 1.0.0');
assert.ok(licenseText.includes('https://polyformproject.org/licenses/noncommercial/1.0.0'), 'LICENSE must include canonical PolyForm URL');
assert.ok(licenseText.includes('Required Notice: Copyright (c) 2026 Veli Özkul'), 'LICENSE must declare Required Notice');
assert.ok(!licenseText.includes('GNU AFFERO GENERAL PUBLIC LICENSE'), 'LICENSE must not contain legacy AGPLv3 text');
assert.ok(contentLicenseText.includes('Attribution-NonCommercial-ShareAlike 4.0 International'), 'LICENSE-CONTENT.md must include CC BY-NC-SA 4.0');
assert.ok(!contentLicenseText.includes('Prominent Display in User Interface'), 'LICENSE-CONTENT.md must not alter CC legal code');
assert.ok(dataNoticeText.includes('PolyForm Noncommercial 1.0.0'), 'DATA_NOTICE.md must specify PolyForm Noncommercial 1.0.0 governance');
assert.ok(dataNoticeText.includes('TİTCK') && dataNoticeText.includes('OpenFDA') && dataNoticeText.includes('ANSM'), 'DATA_NOTICE.md must document clean-room regulatory data sources');

const pkg = JSON.parse(packageJsonText);
assert.strictEqual(pkg.license, 'PolyForm-Noncommercial-1.0.0', 'package.json license must be PolyForm-Noncommercial-1.0.0');

for (const [name, text] of [
  ['LICENSE', licenseText],
  ['LICENSE-CONTENT.md', contentLicenseText],
  ['DATA_NOTICE.md', dataNoticeText],
  ['README.md', readmeText],
  ['package.json', packageJsonText],
  ['index.html', indexHtmlText]
] as const) {
  assert.ok(!text.includes('Dr. Veli Özkul'), `${name} must not assert Dr. title before graduation`);
}
assert.ok(!readmeText.includes('cubic-bezier(0.34, 1.56, 0.64, 1)'), 'README.md must not retain stale spring curve claim');
assert.ok(!readmeText.includes('neon ışıklar'), 'README.md must not retain ornamental neon phrasing');
console.log('✓ Three-tier licensing (PolyForm Noncommercial 1.0.0 + CC BY-NC-SA 4.0 + Clean-Room DATA_NOTICE) and title transparency verified');

// 2. Data Snapshot Manifest & Freshness Thresholds
const manifest = await ensureDataManifestReady();
assert.strictEqual(manifest.schemaVersion, 1);
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(manifest.sources.prices.snapshotDate), 'prices.snapshotDate must be ISO YYYY-MM-DD');
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(manifest.sources.sgk.snapshotDate), 'sgk.snapshotDate must be ISO YYYY-MM-DD');
assert.strictEqual(formatTurkishDate('2026-11-19'), '19 Kas 2026');
assert.strictEqual(formatTurkishDate('2026-04-01'), '1 Nis 2026');

const freshCheck = evaluateSnapshotFreshness('2026-11-19', 90, 180, new Date('2026-12-10T12:00:00Z'));
assert.strictEqual(freshCheck.level, 'fresh');
assert.strictEqual(freshCheck.warningText, null);

const agingCheck = evaluateSnapshotFreshness('2026-11-19', 90, 180, new Date('2027-03-15T12:00:00Z'));
assert.strictEqual(agingCheck.level, 'aging');
assert.ok(agingCheck.warningText && agingCheck.warningText.includes('3 ayı geçmiştir'));

const staleCheck = evaluateSnapshotFreshness('2026-11-19', 90, 180, new Date('2027-07-01T12:00:00Z'));
assert.strictEqual(staleCheck.level, 'stale');
assert.ok(staleCheck.warningText && staleCheck.warningText.includes('Klinik hesaplama motorları geçerliliğini korur'));

// 3. Clickable Price Date Bubble HTML Verification
const triggerHtml = renderPriceDateBubbleTriggerHTML({ context: 'prices', labelPrefix: 'Fiyat & SGK' });
assert.ok(triggerHtml.includes('btn-price-date-bubble'), 'Trigger must carry .btn-price-date-bubble class');
assert.ok(triggerHtml.includes('aria-haspopup="dialog"'), 'Trigger must be accessible dialog trigger');

const drugBadgeHtml = getDrugBadgesHTML(
  { brand: 'PAROL 500 MG TABLET', retailPriceTl: 112.45, priceDate: '2026-04-01', sgkReimbursed: 1 },
  { compact: true }
);
assert.ok(drugBadgeHtml.includes('btn-price-date-bubble'), 'TL price badge in drug cards must be clickable date bubble trigger');
assert.ok(drugBadgeHtml.includes('data-drug-price-date="2026-04-01"'), 'Drug price badge must preserve individual tariff date');
assert.ok(drugBadgeHtml.includes('112,45 ₺'), 'Drug price badge must show formatted TL price');

const popoverHtml = renderDataSnapshotPopoverHTML(
  manifest,
  { context: 'drug', brand: 'PAROL 500 MG TABLET', priceLabel: '112,45 ₺', priceDate: '2026-04-01' },
  { cachedCount: 4, totalCount: 15, isComplete: false },
  new Date('2027-07-01T12:00:00Z')
);
assert.ok(popoverHtml.includes('PAROL 500 MG TABLET'), 'Popover must render focused drug brand');
assert.ok(popoverHtml.includes('1 Nis 2026'), 'Popover must render drug individual tariff date');
assert.ok(popoverHtml.includes('Klinik Mantık / Piyasa Verisi Ayrımı'), 'Popover must separate clinical logic from market data');
assert.ok(popoverHtml.includes('Eskime Hatırlatması'), 'Popover must render staleness notice when >3-6 months old');
assert.ok(popoverHtml.includes('btn-download-offline-deep-pack'), 'Popover must offer optional offline deep KÜB pack download');
console.log('✓ Clickable price date bubble, freshness thresholds (fresh/aging/stale), and popover verified');

// 4. Guideline Registry Integrity Against index.html
const allMetas = getAllGuidelineMetas();
assert.ok(allMetas.length >= 18, `Expected >= 18 clinical modules in guideline registry (Found: ${allMetas.length})`);
for (const meta of allMetas) {
  assert.ok(
    indexHtmlText.includes(`id="${meta.cardId}"`),
    `Guideline registry cardId "${meta.cardId}" must exist in index.html`
  );
  assert.ok(meta.guidelineYear.length >= 4 && meta.primaryCitation.length >= 10);
}
assert.ok(getGuidelineMetaForCard('card-cerrahi')?.primaryGuideline.includes('WSES 2020'));
console.log(`✓ Guideline Registry verified across all ${allMetas.length} clinical module cards in index.html`);

// 5. Declarative Score Engine Verification (CURB-65 & Centor/McIsaac)
const curbHigh = evaluateDeclarativeScore(
  CURB65_DECLARATIVE_SCHEMA,
  { confusion: true, urea: true, respiratoryRate: true, bloodPressure: false, age65: true },
  { ageYears: 72 }
);
assert.strictEqual(curbHigh.score, 4);
assert.strictEqual(curbHigh.tier.severity, 'critical');
assert.ok(curbHigh.soapLine.includes('CURB-65: 4/5'));

const curbPed = evaluateDeclarativeScore(CURB65_DECLARATIVE_SCHEMA, { confusion: true }, { ageYears: 8 });
assert.strictEqual(curbPed.warnings.length, 1, 'CURB-65 declarative schema must emit pediatric warning for <18y');

const mcIsaacChild = evaluateDeclarativeScore(CENTOR_MCISAAC_DECLARATIVE_SCHEMA, {
  fever: true,
  noCough: true,
  adenopathy: true,
  exudate: false,
  ageBand: '3_14'
});
assert.strictEqual(mcIsaacChild.score, 4);
assert.strictEqual(mcIsaacChild.tier.severity, 'high');

const summaryHtml = renderDeclarativeScoreSummaryHTML(mcIsaacChild);
assert.ok(summaryHtml.includes('McIsaac') && summaryHtml.includes('Kaynak:'));
console.log('✓ Declarative score engine (CURB-65 & Centor/McIsaac) verified');

// 6. Bedside 15-Second Simplicity Guard in General Surgery & Drug Snapshot Slots
assert.ok(indexHtmlText.includes('id="btn-toggle-surgery-academic-mode"'), 'General Surgery must have optional academic comparison toggle');
const hiddenAcademicControls = indexHtmlText.match(/class="surg-academic-control hidden /g) || [];
assert.strictEqual(hiddenAcademicControls.length, 9, 'All 9 surgery version/erratum selectors must start hidden for bedside simplicity');
assert.ok(indexHtmlText.includes('id="container-drug-snapshot-pill"'), 'Drug card must have snapshot date pill container');
assert.ok(indexHtmlText.includes('id="container-vaccine-snapshot-pill"'), 'Vaccine section must have snapshot date pill container');
console.log('✓ 15-second bedside surgery toggle (9 hidden academic controls) and UI snapshot slots verified');

console.log('\n🎉 ALL GOVERNANCE, DATA SNAPSHOT BUBBLE & ARCHITECTURAL TESTS PASSED! 🎉\n');
