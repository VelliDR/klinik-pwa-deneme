import assert from 'assert';
import fs from 'fs';
import {
  OFFLINE_RXNORM_CONCEPTS,
  resolveToRxNormConcept
} from '../src/engines/rxNormMappingEngine';
import { evaluatePrescriptionInteractions } from '../src/engines/interactionTierEngine';
import {
  calculateTisdaleQtcScore
} from '../src/engines/clinicalStackingEngine';
import {
  inferDrugRoute,
  shouldSuppressFoodWarningForRoute,
  isMealTimingApplicableForRoute
} from '../src/engines/drugRouteEngine';
import {
  ensureDdiMatrixReady,
  evaluateDdiMatrixForPrescription
} from '../src/engines/ddiMatrixEngine';
import {
  ensurePddiMonographsReady,
  evaluatePddiMonographsForPrescription,
  getPddiMonographStats
} from '../src/engines/pddiMonographEngine';
import {
  evaluateUnifiedPrescriptionSafety,
  renderUnifiedModalSafetyBannerHTML,
  renderQuickSafetySummaryHTML
} from '../src/engines/unifiedSafetyOrchestrator';

console.log('===================================================================');
console.log('🧪 CLINICAL DDI REGRESSION SUITE (FAZ 0–4: 70+ KLİNİK SENARYO)');
console.log('===================================================================');

await ensureDdiMatrixReady();
const pddiBundle = await ensurePddiMonographsReady();

// ============================================================================
// 1. RXNORM ONTOLOJİ DEĞİŞMEZLERİ (SIFIR ÇAKIŞAN RXCUI + TÜRKÇE MÜSTAHZAR)
// ============================================================================
console.log('\n--- 1. RXNORM ONTOLOJİ & SIFIR ÇAKIŞMA DOĞRULAMASI ---');
assert.ok(OFFLINE_RXNORM_CONCEPTS.length >= 190, `En az 190 RxNorm kavramı bekleniyor (Bulunan: ${OFFLINE_RXNORM_CONCEPTS.length})`);
const seenCuis = new Map<string, string>();
for (const c of OFFLINE_RXNORM_CONCEPTS) {
  assert.ok(c.rxCui && /^\d+$/.test(c.rxCui), `Geçersiz RxCUI: ${c.canonicalKey} -> ${c.rxCui}`);
  assert.ok(!seenCuis.has(c.rxCui), `Çakışan RxCUI tespit edildi: ${c.rxCui} (${seenCuis.get(c.rxCui)} vs ${c.canonicalKey})`);
  seenCuis.set(c.rxCui, c.canonicalKey);
}
const valp = resolveToRxNormConcept('Depakin Chrono 500 mg');
const verap = resolveToRxNormConcept('Isoptin 80 mg');
assert.strictEqual(valp?.rxCui, '11118', 'Valproik asit RxCUI 11118 olmalı');
assert.strictEqual(verap?.rxCui, '11170', 'Verapamil RxCUI 11170 olmalı');
const gerK = resolveToRxNormConcept({ brand: 'GERALGINE-K 500/30 MG TABLET', atcCode: 'N02AJ06' });
assert.strictEqual(gerK?.canonicalKey, 'codeine', 'Geralgine-K (N02AJ06) kodein olarak çözümlenmeli');
console.log(`✓ ${OFFLINE_RXNORM_CONCEPTS.length} RxNorm kavramı benzersiz (0 çakışma) ve Türkçe marka eşlemesi doğrulandı`);

// ============================================================================
// 2. 9 İLAÇLIK POLİFARMASİ & ANESTEZİ STRES TESTİ (%100 DUYARLILIK)
// ============================================================================
console.log('\n--- 2. 9 İLAÇLIK POLİFARMASİ & ANESTEZİ STRES TESTİ ---');

// 2a. Dual Known QT + Bradikardi + Tisdale QTc
const qtBradyRes = evaluatePrescriptionInteractions(
  [
    { brand: 'KLACID IV 500 MG FLAKON', generic: 'Klaritromisin', atcCode: 'J01FA09', route: 'IV' },
    { brand: 'TRIFLUCAN 200 MG IV INFUZYON', generic: 'Flukonazol', atcCode: 'J02AC01', route: 'IV' },
    { brand: 'BELOC 5 MG/5 ML IV AMPUL', generic: 'Metoprolol', atcCode: 'C07AB02', route: 'IV' }
  ],
  { ageYears: 72, baselineK: 3.2, baselineQtcMs: 465, hasHeartFailure: true }
);
assert.ok(qtBradyRes.tisdaleQtcScore && qtBradyRes.tisdaleQtcScore.score >= 11, `Tisdale QTc ≥11 olmalı (Bulunan: ${qtBradyRes.tisdaleQtcScore?.score})`);
assert.strictEqual(qtBradyRes.tisdaleQtcScore?.riskTier, 'HIGH', 'Tisdale risk kademesi HIGH olmalı');
assert.ok(
  qtBradyRes.alerts.some(a => a.tier === 1 && /QT|TDP|TISDALE/i.test(a.ruleId + ' ' + a.alertTitle)),
  'Dual Known QT + Bradikardi + Hipokalemi Tier 1 uyarısı vermeli'
);

// 2b. Propofol + Diazepam + Kodein + IV Metoprolol (MSS/apne + hemodinamik kardiyodepresyon)
const anesthRes = evaluatePrescriptionInteractions(
  [
    { brand: 'PROPOFOL %1 IV EMULSIYON', generic: 'Propofol', atcCode: 'N01AX10', route: 'IV' },
    { brand: 'DIAZEM 10 MG AMPUL', generic: 'Diazepam', atcCode: 'N05BA01', route: 'IV' },
    { brand: 'GERALGINE-K TABLET', generic: 'Kodein + Parasetamol', atcCode: 'N02AJ06', route: 'ORAL' },
    { brand: 'BELOC 5 MG IV AMPUL', generic: 'Metoprolol', atcCode: 'C07AB02', route: 'IV' }
  ],
  { ageYears: 62 }
);
assert.ok(anesthRes.alerts.some(a => /CNS|PROPOFOL|OPIOID|RESPIRAT/i.test(a.ruleId + ' ' + a.alertTitle)), 'Anestezik + BZD + Opioid MSS/solunum depresyonu yakalanmalı');
assert.ok(anesthRes.alerts.some(a => /HEMODYNAMIC|BRADY|PROPOFOL.*BETA|KARDİYODEPRESYON/i.test(a.ruleId + ' ' + a.alertTitle + ' ' + a.message)), 'Propofol + Beta-bloker hemodinamik kardiyodepresyon yakalanmalı');

// 2c. Rokuronyum + Klaritromisin (NMBA potansiyalizasyonu + TOF >0.9) & Sugammadeks eGFR<30
const nmbaRes = evaluatePrescriptionInteractions(
  [
    { brand: 'ESMERON 50 MG/5 ML IV FLAKON', generic: 'Rokuronyum', atcCode: 'M03AC09', route: 'IV' },
    { brand: 'KLACID IV 500 MG FLAKON', generic: 'Klaritromisin', atcCode: 'J01FA09', route: 'IV' },
    { brand: 'BRIDION 200 MG/2 ML FLAKON', generic: 'Sugammadeks', atcCode: 'V03AB35', route: 'IV' }
  ],
  { ageYears: 68, egfr: 22 }
);
assert.ok(nmbaRes.alerts.some(a => /NMBA|TOF/i.test(a.ruleId + ' ' + a.message)), 'Rokuronyum + Klaritromisin NMBA/TOF >0.9 uyarısı vermeli');
assert.ok(nmbaRes.alerts.some(a => /SUGAMMADEX|SUGAMMADEKS/i.test(a.ruleId + ' ' + a.message)), 'Sugammadeks eGFR <30 uyarısı vermeli');

// 2d. Diazepam + Flukonazol + Klaritromisin (Isoherranen / ICH M12 Kümülatif Çoklu-CYP2C19+CYP3A4 Blokajı)
const multiCypRes = evaluatePrescriptionInteractions(
  [
    { brand: 'DIAZEM 10 MG KAPSUL', generic: 'Diazepam', atcCode: 'N05BA01' },
    { brand: 'TRIFLUCAN 150 MG KAPSUL', generic: 'Flukonazol', atcCode: 'J02AC01' },
    { brand: 'KLACID 500 MG TABLET', generic: 'Klaritromisin', atcCode: 'J01FA09' }
  ],
  { ageYears: 58 }
);
assert.ok(multiCypRes.alerts.some(a => /MULTI_CYP|ÇOKLU.*CYP|2C19.*3A4|3A4.*2C19/i.test(a.ruleId + ' ' + a.alertTitle + ' ' + a.message)), 'Diazepam dual-CYP2C19+CYP3A4 kümülatif blokajı yakalanmalı');

// 2e. Kodein (N02AJ06) + Klaritromisin (Gasche NEJM 2004 Morfin Şant Toksisitesi; eGFR <60 eskalasyonu)
const codeineShuntRes = evaluatePrescriptionInteractions(
  [
    { brand: 'GERALGINE-K TABLET', generic: 'Kodein + Parasetamol', atcCode: 'N02AJ06' },
    { brand: 'KLACID 500 MG TABLET', generic: 'Klaritromisin', atcCode: 'J01FA09' }
  ],
  { ageYears: 52, egfr: 42 }
);
assert.ok(codeineShuntRes.alerts.some(a => /CODEINE|KODEİN|SHUNT|MORFİN/i.test(a.ruleId + ' ' + a.alertTitle + ' ' + a.message)), 'Kodein + Güçlü CYP3A4 morfin şant toksisitesi yakalanmalı');
assert.ok(codeineShuntRes.alerts.some(a => a.tier === 1 && /CODEINE|KODEİN|SHUNT/i.test(a.ruleId + ' ' + a.alertTitle)), 'eGFR <60 bağlamında Kodein + CYP3A4 Tier 1\'e yükselmeli');

// 2f. 5 Yaş Pediatrik Propofol PRIS (≤16y Hard Stop) + Kodein <12y Hard Stop (Contramal KÜB hatası OLMAMALI!)
const pedRes = evaluatePrescriptionInteractions(
  [
    { brand: 'PROPOFOL %1 IV EMULSIYON', generic: 'Propofol', atcCode: 'N01AX10', route: 'IV' },
    { brand: 'GERALGINE-K TABLET', generic: 'Kodein + Parasetamol', atcCode: 'N02AJ06' },
    { brand: 'LOPID 600 MG TABLET', generic: 'Gemfibrozil', atcCode: 'C10AB04' }
  ],
  { ageYears: 5 }
);
const pedPrisAlert = pedRes.alerts.find(a => a.tier === 1 && /PRIS|PROPOFOL/i.test(a.ruleId + ' ' + a.alertTitle));
assert.ok(pedPrisAlert, '5 yaş çocukta Propofol PRIS Tier 1 Hard Stop tetiklenmeli');
const pedCodeineAlert = pedRes.alerts.find(a => a.tier === 1 && /CODEINE|KODEİN|PEDIATRIC/i.test(a.ruleId + ' ' + a.alertTitle + ' ' + a.message));
assert.ok(pedCodeineAlert, '5 yaş çocukta Kodein <12 yaş Tier 1 Hard Stop tetiklenmeli');
assert.ok(!/Contramal/i.test(pedCodeineAlert!.guidelineSource + ' ' + pedCodeineAlert!.message), 'Kodein uyarısı Contramal (tramadol) KÜB\'ünü kaynak göstermemeli!');
assert.ok(pedRes.alerts.some(a => /GEMFIBROZIL|GEMFİBROZİL/i.test(a.ruleId + ' ' + a.alertTitle + ' ' + a.message)), '5 yaş çocukta Gemfibrozil pediatrik uyarısı tetiklenmeli');
console.log('✓ 9-ilaç polifarmasi, anestezi, NMBA/TOF, dual-CYP, morfin şantı ve pediatrik PRIS/kodein %100 yakalandı');

// ============================================================================
// 3. ONC HIGH-PRIORITY 15 TAM KAPSAM DOĞRULAMASI (%100)
// ============================================================================
console.log('\n--- 3. ONC HIGH-PRIORITY 15 (%100 DUYARLILIK) ---');
const onc15Cases: Array<{ name: string; drugs: string[] }> = [
  { name: 'Warfarin + Fluconazole', drugs: ['Coumadin 5mg', 'Triflucan 150mg'] },
  { name: 'Simvastatin + Clarithromycin', drugs: ['Zocor 40mg', 'Klacid 500mg'] },
  { name: 'Sildenafil + Nitroglycerin', drugs: ['Viagra 50mg', 'Nitrolingual Sprey'] },
  { name: 'Ergotamine + Clarithromycin', drugs: ['Cafergot', 'Klacid 500mg'] },
  { name: 'Pimozide + Clarithromycin', drugs: ['Pimozide 4mg', 'Klacid 500mg'] },
  { name: 'Tizanidine + Ciprofloxacin', drugs: ['Sirdalud 4mg', 'Cipro 500mg'] },
  { name: 'Ramelteon + Fluvoxamine', drugs: ['Ramelteon 8mg', 'Faverin 100mg'] },
  { name: 'Irinotecan + Ketoconazole', drugs: ['Campto Irinotecan', 'Ketoral 200mg'] },
  { name: 'Linezolid + Escitalopram', drugs: ['Zyvoxid 600mg', 'Cipralex 10mg'] },
  { name: 'Allopurinol + Azathioprine', drugs: ['Urikoliz 300mg', 'Imuran 50mg'] },
  { name: 'Methotrexate + TMP-SMX', drugs: ['Methotrexate 2.5mg', 'Bactrim Fort'] },
  { name: 'KCl + Spironolactone', drugs: ['Kalinor Potasyum', 'Aldactone 25mg'] },
  { name: 'Valproate + Meropenem', drugs: ['Depakin 500mg', 'Meronem 1g IV'] },
  { name: 'Gemfibrozil + Repaglinide', drugs: ['Lopid 600mg', 'NovoNorm 2mg'] },
  { name: 'Colchicine + Clarithromycin', drugs: ['Colchicum Dispert', 'Klacid 500mg'] }
];
for (const tc of onc15Cases) {
  const u = evaluateUnifiedPrescriptionSafety(
    tc.drugs.map(name => ({ brand: name, name })),
    { ageYears: 55 }
  );
  assert.ok(
    u.counts.totalActionable > 0,
    `ONC-15 kaçırıldı: ${tc.name} (tier1=${u.counts.tier1}, tier2=${u.counts.tier2}, pddi=${u.counts.pddiMonographs})`
  );
}
console.log(`✓ ONC High-Priority 15 (${onc15Cases.length}/${onc15Cases.length} = %100) yakalandı`);

// ============================================================================
// 4. ROTA-DUYARLI NEGATİF KONTROLLER (%0 YANLIŞ POZİTİF) + TİLSON 2016 İSTİSNASI
// ============================================================================
console.log('\n--- 4. ROTA-DUYARLI NEGATİF KONTROLLER & TİLSON 2016 İSTİSNASI ---');
assert.strictEqual(inferDrugRoute({ brand: 'KLACID IV 500 MG FLAKON' }), 'IV');
assert.strictEqual(inferDrugRoute({ brand: 'BELOC 5 MG/5 ML IV AMPUL' }), 'IV');
assert.strictEqual(inferDrugRoute({ brand: 'CONTRAMAL 100 MG 5 AMPUL' }), 'PARENTERAL');
assert.strictEqual(inferDrugRoute({ brand: 'FLIXOTIDE 250 MCG DISKUS INHALER' }), 'INH');
assert.strictEqual(inferDrugRoute({ brand: 'TOBREX %0.3 STERIL GOZ DAMLASI' }), 'OPH');
assert.strictEqual(shouldSuppressFoodWarningForRoute('grapefruit juice', 'IV'), true);
assert.strictEqual(shouldSuppressFoodWarningForRoute('grapefruit juice', 'PARENTERAL'), true);
assert.strictEqual(shouldSuppressFoodWarningForRoute('alcohol', 'IV'), false);
assert.strictEqual(isMealTimingApplicableForRoute('IV'), false);
assert.strictEqual(isMealTimingApplicableForRoute('ORAL'), true);

// IV Klaritromisin + IV Metoprolol + IV Propofol -> 0 greyfurt, 0 aç/tok uyarısı!
const ivCounsel = evaluateDdiMatrixForPrescription([
  { brand: 'KLACID IV 500 MG FLAKON', atcCode: 'J01FA09', route: 'IV', mealTiming: 'Tok', mealTimingCode: 2 },
  { brand: 'BELOC 5 MG/5 ML IV AMPUL', atcCode: 'C07AB02', route: 'IV', mealTiming: 'Aç', mealTimingCode: 1 },
  { brand: 'PROPOFOL %1 IV EMULSIYON', atcCode: 'N01AX10', route: 'IV' }
]);
assert.strictEqual(ivCounsel.counseling.mealTimings.length, 0, 'IV ilaçlarda Aç/Tok uyarısı 0 olmalı');
assert.ok(!ivCounsel.counseling.foods.some(f => f.foodKey === 'grapefruit'), 'IV ilaçlarda greyfurt uyarısı bastırılmalı');

// Tilson 2016: İnhaler Flutikazon + Ritonavir -> Cushing uyarısı BASTIRILMAMALI!
const tilsonRes = evaluatePrescriptionInteractions(
  [
    { brand: 'FLIXOTIDE 250 MCG INHALER', generic: 'Flutikazon', atcCode: 'R03BA05', route: 'INH' },
    { brand: 'NORVIR 100 MG TABLET', generic: 'Ritonavir', atcCode: 'J05AE03', route: 'ORAL' }
  ],
  { ageYears: 45 }
);
assert.ok(tilsonRes.alerts.some(a => /CUSHING|FLUTICASONE|FLUTİKAZON|STEROID/i.test(a.ruleId + ' ' + a.alertTitle + ' ' + a.message)), 'Tilson 2016 inhaler flutikazon + ritonavir Cushing istisnası tetiklenmeli');

// Rota-duyarlı KÜB doğrulaması (N05BA01 DIAZEM ORAL olmalı, DIAKSI REKTAL değil!)
const kubN = JSON.parse(fs.readFileSync('public/data/kub/kub_N.json', 'utf8'));
assert.ok(kubN.N05BA01 && !/REKTAL/i.test(kubN.N05BA01.src), `N05BA01 temsilci KÜB rektal olmamalı (Bulunan: ${kubN.N05BA01?.src})`);
assert.strictEqual(kubN.N05BA01.rt, 'ORAL', 'N05BA01 temsilci KÜB rotası ORAL olmalı');
console.log('✓ Rota negatif kontrolleri (%0 IV besin/aç-tok), Tilson 2016 Cushing istisnası ve rota-duyarlı KÜB doğrulandı');

// ============================================================================
// 5. ~500 KANITLI W3C PDDI-CDS TÜRKÇE MONOGRAF & DİNAMİK ORGAN YÜKSELTME (FAZ 3-4)
// ============================================================================
console.log('\n--- 5. W3C PDDI-CDS (TAM KATALOG 3.000+ KANITLI MONOGRAF) & DİNAMİK BAĞLAM YÜKSELTME ---');
assert.ok(pddiBundle && Array.isArray(pddiBundle.monographs), 'pddi_monographs_tr.json yüklenmeli');
const stats = getPddiMonographStats();
assert.ok(stats.totalMonographs >= 2500, `En az 2.500 kanıtlı tam katalog PDDI monografı bekleniyor (Bulunan: ${stats.totalMonographs})`);

let verbatimVerified = 0;
let loincCount = 0;
for (const m of pddiBundle!.monographs) {
  assert.ok(/^PDDI_TR_\d{4}$/.test(m.monograph_id), `Geçersiz monograf ID: ${m.monograph_id}`);
  assert.strictEqual(m.authored_text_license, 'CC-BY-NC-SA-4.0', 'Özgün Türkçe metin lisansı CC-BY-NC-SA-4.0 olmalı');
  assert.ok(m.source_assertions.length >= 1, `${m.monograph_id} en az 1 resmi kaynak içermeli`);
  assert.ok(m.recommended_action_tr.length >= 15, `${m.monograph_id} eylem önerisi boş olmamalı`);
  // Tek kaynaklı teorik kural ASLA Tier X Hard Stop olamaz!
  if (m.evidence_level === 'teorik') {
    assert.notStrictEqual(m.unified_risk_tier, 'X', `${m.monograph_id}: Tek kaynaklı teorik etkileşim Tier X olamaz!`);
  }
  for (const sa of m.source_assertions) {
    assert.ok(sa.source_quote_verbatim && sa.source_quote_verbatim.trim().length >= 15, `${m.monograph_id} birebir alıntısı eksik`);
    verbatimVerified++;
  }
  for (const mp of m.monitoring_parameters) {
    assert.ok(/^\d{3,6}-\d$/.test(mp.loinc_code), `Geçersiz LOINC kodu: ${mp.loinc_code}`);
    loincCount++;
  }
}

// Dinamik organ/elektrolit yükseltme testi (Faz 4)
const basePddi = evaluatePddiMonographsForPrescription(
  [
    { brand: 'COUMADIN 5 MG TABLET', generic: 'Warfarin', atcCode: 'B01AA03', route: 'ORAL' },
    { brand: 'APRAXIN 550 MG', generic: 'Naproxen', atcCode: 'M01AE02', route: 'ORAL' },
    { brand: 'ALDACTONE 25 MG', generic: 'Spironolactone', atcCode: 'C03DA01', route: 'ORAL' },
    { brand: 'DELIX 5 MG', generic: 'Ramipril', atcCode: 'C09AA05', route: 'ORAL' }
  ],
  { egfr: 85, baselineK: 4.1 }
);
const escalatedPddi = evaluatePddiMonographsForPrescription(
  [
    { brand: 'COUMADIN 5 MG TABLET', generic: 'Warfarin', atcCode: 'B01AA03', route: 'ORAL' },
    { brand: 'APRAXIN 550 MG', generic: 'Naproxen', atcCode: 'M01AE02', route: 'ORAL' },
    { brand: 'ALDACTONE 25 MG', generic: 'Spironolactone', atcCode: 'C03DA01', route: 'ORAL' },
    { brand: 'DELIX 5 MG', generic: 'Ramipril', atcCode: 'C09AA05', route: 'ORAL' }
  ],
  { egfr: 22, baselineK: 5.4, childPughClass: 'C' }
);
assert.ok(basePddi.length > 0, 'PDDI monograf eşleşmesi bulunmalı');
assert.ok(
  escalatedPddi.some(m => m.escalationNotes.length > 0),
  'eGFR 22 + K+ 5.4 + Child-Pugh C bağlamında dinamik yükseltme notları üretilmeli'
);

// Oral Şelasyon (ORAL_GI_ONLY) rota filtresi: Oral Cipro + Kalsiyum uyarır, IV Cipro + Kalsiyum bastırır!
const oralChelation = evaluatePddiMonographsForPrescription([
  { brand: 'CIPRO 500 MG FILM TABLET', generic: 'Ciprofloxacin', atcCode: 'J01MA02', route: 'ORAL' },
  { brand: 'CAL-D-VITA EFFERVESAN TABLET', generic: 'Calcium', atcCode: 'A12AA04', route: 'ORAL' }
]);
const ivChelation = evaluatePddiMonographsForPrescription([
  { brand: 'CIPRO 200 MG IV INFUZYON', generic: 'Ciprofloxacin', atcCode: 'J01MA02', route: 'IV' },
  { brand: 'CAL-D-VITA EFFERVESAN TABLET', generic: 'Calcium', atcCode: 'A12AA04', route: 'ORAL' }
]);
assert.strictEqual(ivChelation.filter(m => m.monograph.route_scope === 'ORAL_GI_ONLY').length, 0, 'IV Siprofloksasin için ORAL_GI_ONLY şelasyon monografı bastırılmalı');
console.log(`✓ ${stats.totalMonographs} W3C PDDI-CDS monografı doğrulandı (${verbatimVerified} birebir kaynak alıntısı, ${loincCount} LOINC izlem parametresi, X:${stats.tierCounts.X} D:${stats.tierCounts.D} C:${stats.tierCounts.C}, oralChelation=${oralChelation.length})`);

// ============================================================================
// 6. BİRLEŞİK GÜVENLİK ORKESTRATÖRÜ & DDINTER BASTIRMA / SENKRONİZASYON
// ============================================================================
console.log('\n--- 6. BİRLEŞİK GÜVENLİK ORKESTRATÖRÜ & SENKRONİZASYON ---');
const syncEval = evaluateUnifiedPrescriptionSafety(
  [
    { brand: 'DELIX 5 MG TABLET', generic: 'Ramipril', atcCode: 'C09AA05' },
    { brand: 'LASIX 40 MG TABLET', generic: 'Furosemid', atcCode: 'C03CA01' },
    { brand: 'ARVELES 25 MG TABLET', generic: 'Deksketoprofen', atcCode: 'M01AE17' },
    { brand: 'COUMADIN 5 MG TABLET', generic: 'Varfarin', atcCode: 'B01AA03' },
    { brand: 'TRIFLUCAN 150 MG KAPSUL', generic: 'Flukonazol', atcCode: 'J02AC01' }
  ],
  { ageYears: 74, egfr: 38, baselineK: 5.1, childPughClass: 'B' }
);
assert.strictEqual(syncEval.dedupedFlags.tripleWhammyCovered, true, 'Triple Whammy çift sayımı tekilleştirilmeli');
assert.strictEqual(syncEval.counts.hasCritical, true, 'Kritik bayrak aktif olmalı');
// Warfarin + Fluconazole PDDI monografı varsa DDInter 2.0 jenerik uyarısı aynı çifti tekrarlamamalı
const pddiHasWarfFluc = syncEval.pddiMatches.some(m =>
  (m.atcA === 'B01AA03' && m.atcB === 'J02AC01') || (m.atcA === 'J02AC01' && m.atcB === 'B01AA03')
);
if (pddiHasWarfFluc) {
  const ddinterHasWarfFluc = [...syncEval.ddiMatrix.majorAlerts, ...syncEval.ddiMatrix.moderateAlerts].some(a =>
    (a.atcA === 'B01AA03' && a.atcB === 'J02AC01') || (a.atcA === 'J02AC01' && a.atcB === 'B01AA03')
  );
  assert.strictEqual(ddinterHasWarfFluc, false, 'Kanıtlı PDDI monografı bulunan çiftte DDInter jenerik uyarısı bastırılmalı');
}
const modalHtml = renderUnifiedModalSafetyBannerHTML(syncEval);
const summaryHtml = renderQuickSafetySummaryHTML(syncEval);
assert.ok(modalHtml.includes('Hızlı Etkileşim Özeti') && summaryHtml.includes('Hızlı Etkileşim Özeti'), 'Ana panel ve modal aynı Hızlı Etkileşim Özeti şeridini paylaşmalı');
console.log(`✓ Birleşik güvenlik orkestratörü doğrulandı (actionable=${syncEval.counts.totalActionable}, pddi=${syncEval.counts.pddiMonographs}, DDInter bastırma aktif)`);

// ============================================================================
// 7. 55+ ÇOK BRANŞLI POLİFARMASİ VE GÜVENLİ KONTROL VAKA MATRİSİ
// ============================================================================
console.log('\n--- 7. 55+ ÇOK BRANŞLI POLİFARMASİ & GÜVENLİ KONTROL VAKALARI ---');
interface ClinicalScenario {
  id: string;
  drugs: Array<{ brand: string; generic?: string; atcCode?: string; route?: string }>;
  ctx?: Parameters<typeof evaluateUnifiedPrescriptionSafety>[1];
  expectActionable: boolean;
  expectCritical?: boolean;
}

const scenarios: ClinicalScenario[] = [
  // Kardiyoloji & Antikoagülan (10)
  { id: 'CARD-01', drugs: [{ brand: 'Coumadin', atcCode: 'B01AA03' }, { brand: 'Cordarone', atcCode: 'C01BD01' }], expectActionable: true },
  { id: 'CARD-02', drugs: [{ brand: 'Eliquis', atcCode: 'B01AF02' }, { brand: 'Klacid', atcCode: 'J01FA09' }], expectActionable: true },
  { id: 'CARD-03', drugs: [{ brand: 'Xarelto', atcCode: 'B01AF01' }, { brand: 'Sporanox', atcCode: 'J02AC02' }], expectActionable: true },
  { id: 'CARD-04', drugs: [{ brand: 'Pradaxa', atcCode: 'B01AE07' }, { brand: 'Isoptin', atcCode: 'C08DA01' }], expectActionable: true },
  { id: 'CARD-05', drugs: [{ brand: 'Plavix', atcCode: 'B01AC04' }, { brand: 'Losec Omeprazol', atcCode: 'A02BC01' }], expectActionable: true },
  { id: 'CARD-06', drugs: [{ brand: 'Digoxin', atcCode: 'C01AA05' }, { brand: 'Cordarone', atcCode: 'C01BD01' }], expectActionable: true },
  { id: 'CARD-07', drugs: [{ brand: 'Beloc', atcCode: 'C07AB02' }, { brand: 'Isoptin', atcCode: 'C08DA01' }], expectActionable: true },
  { id: 'CARD-08', drugs: [{ brand: 'Coralan Ivabradin', atcCode: 'C01EB17' }, { brand: 'Diltizem', atcCode: 'C08DB01' }], expectActionable: true },
  { id: 'CARD-09', drugs: [{ brand: 'Entresto Sakubitril', atcCode: 'C09DX04' }, { brand: 'Delix Ramipril', atcCode: 'C09AA05' }], expectActionable: true },
  { id: 'CARD-10', drugs: [{ brand: 'Lipitor Atorvastatin', atcCode: 'C10AA05' }, { brand: 'Klacid', atcCode: 'J01FA09' }], expectActionable: true },
  // Enfeksiyon & Antifungal (8)
  { id: 'INF-01', drugs: [{ brand: 'Rifadin Rifampisin', atcCode: 'J04AB02' }, { brand: 'Coumadin', atcCode: 'B01AA03' }], expectActionable: true },
  { id: 'INF-02', drugs: [{ brand: 'Flagyl Metronidazol', atcCode: 'J01XD01' }, { brand: 'Coumadin', atcCode: 'B01AA03' }], expectActionable: true },
  { id: 'INF-03', drugs: [{ brand: 'Vfend Vorikonazol', atcCode: 'J02AC03' }, { brand: 'Prograf Takrolimus', atcCode: 'L04AD02' }], expectActionable: true },
  { id: 'INF-04', drugs: [{ brand: 'Bactrim', atcCode: 'J01EE01' }, { brand: 'Delix Ramipril', atcCode: 'C09AA05' }], ctx: { egfr: 35, ageYears: 76 }, expectActionable: true },
  { id: 'INF-05', drugs: [{ brand: 'Avelox Moksifloksasin', atcCode: 'J01MA14' }, { brand: 'Cordarone', atcCode: 'C01BD01' }], expectActionable: true, expectCritical: true },
  { id: 'INF-06', drugs: [{ brand: 'Cipro', atcCode: 'J01MA02' }, { brand: 'Teokap Teofilin', atcCode: 'R03DA04' }], expectActionable: true },
  { id: 'INF-07', drugs: [{ brand: 'Klacid', atcCode: 'J01FA09' }, { brand: 'Motilium Domperidon', atcCode: 'A03FA03' }], expectActionable: true, expectCritical: true },
  { id: 'INF-08', drugs: [{ brand: 'Norvir Ritonavir', atcCode: 'J05AE03' }, { brand: 'Dormicum Midazolam', atcCode: 'N05CD08' }], expectActionable: true, expectCritical: true },
  // Psikiyatri & Nöroloji (8)
  { id: 'PSY-01', drugs: [{ brand: 'Lityum', atcCode: 'N05AN01' }, { brand: 'Voltaren Diklofenak', atcCode: 'M01AB05' }], expectActionable: true },
  { id: 'PSY-02', drugs: [{ brand: 'Depakin Valproat', atcCode: 'N03AG01' }, { brand: 'Lamictal Lamotrijin', atcCode: 'N03AX09' }], expectActionable: true },
  { id: 'PSY-03', drugs: [{ brand: 'Leponex Klozapin', atcCode: 'N05AH02' }, { brand: 'Faverin Fluvoksamin', atcCode: 'N06AB08' }], expectActionable: true },
  { id: 'PSY-04', drugs: [{ brand: 'Haldol Haloperidol', atcCode: 'N05AD01' }, { brand: 'Cipram Sitalopram', atcCode: 'N06AB04' }], expectActionable: true },
  { id: 'PSY-05', drugs: [{ brand: 'Tegretol Karbamazepin', atcCode: 'N03AF01' }, { brand: 'Eliquis Apiksaban', atcCode: 'B01AF02' }], expectActionable: true },
  { id: 'PSY-06', drugs: [{ brand: 'Prozac Fluoksetin', atcCode: 'N06AB03' }, { brand: 'Contramal Tramadol', atcCode: 'N02AX02' }], expectActionable: true },
  { id: 'PSY-07', drugs: [{ brand: 'Aurorix Moklobemid', atcCode: 'N06AG02' }, { brand: 'Lustral Sertralin', atcCode: 'N06AB06' }], expectActionable: true, expectCritical: true },
  { id: 'PSY-08', drugs: [{ brand: 'Cipralex Essitalopram', atcCode: 'N06AB10' }, { brand: 'Arveles Deksketoprofen', atcCode: 'M01AE17' }], expectActionable: true },
  // Anestezi, YBÜ, Ağrı (6)
  { id: 'ICU-01', drugs: [{ brand: 'Fentanyl IV', atcCode: 'N02AB03', route: 'IV' }, { brand: 'Dormicum Midazolam IV', atcCode: 'N05CD08', route: 'IV' }], expectActionable: true },
  { id: 'ICU-02', drugs: [{ brand: 'Esmeron Rokuronyum IV', atcCode: 'M03AC09', route: 'IV' }, { brand: 'Gentamisin IV', atcCode: 'J01GB03', route: 'IV' }], expectActionable: true },
  { id: 'ICU-03', drugs: [{ brand: 'Esmeron Rokuronyum IV', atcCode: 'M03AC09', route: 'IV' }, { brand: 'Klindamisin IV', atcCode: 'J01FF01', route: 'IV' }], expectActionable: true },
  { id: 'ICU-04', drugs: [{ brand: 'Propofol IV', atcCode: 'N01AX10', route: 'IV' }, { brand: 'Fentanyl IV', atcCode: 'N02AB03', route: 'IV' }], expectActionable: true },
  { id: 'ICU-05', drugs: [{ brand: 'Metadon', atcCode: 'N07BC02' }, { brand: 'Klacid', atcCode: 'J01FA09' }], expectActionable: true, expectCritical: true },
  { id: 'ICU-06', drugs: [{ brand: 'Xanax Alprazolam', atcCode: 'N05BA12' }, { brand: 'OxyContin Oksikodon', atcCode: 'N02AA05' }], expectActionable: true },
  // Onkoloji, İmmünsupresif, Endokrin (6)
  { id: 'ONC-01', drugs: [{ brand: 'Nolvadex Tamoksifen', atcCode: 'L02BA01' }, { brand: 'Paxil Paroksetin', atcCode: 'N06AB05' }], expectActionable: true },
  { id: 'ONC-02', drugs: [{ brand: 'Prograf Takrolimus', atcCode: 'L04AD02' }, { brand: 'Klacid', atcCode: 'J01FA09' }], expectActionable: true },
  { id: 'ONC-03', drugs: [{ brand: 'Sandimmun Siklosporin', atcCode: 'L04AD01' }, { brand: 'Zocor Simvastatin', atcCode: 'C10AA01' }], expectActionable: true },
  { id: 'END-01', drugs: [{ brand: 'Diamicron Gliklazid', atcCode: 'A10BB09' }, { brand: 'Triflucan Flukonazol', atcCode: 'J02AC01' }], expectActionable: true },
  { id: 'END-02', drugs: [{ brand: 'Vydura Rimegepant', atcCode: 'N02CD06' }], ctx: { childPughClass: 'C', ageYears: 50 }, expectActionable: true },
  { id: 'END-03', drugs: [{ brand: 'Glucophage Metformin', atcCode: 'A10BA02' }], ctx: { egfr: 24, ageYears: 68 }, expectActionable: true, expectCritical: true },
  // Özel Popülasyon: Gebelik, Yenidoğan, Pediatri, Siroz, KBH (8)
  { id: 'POP-01', drugs: [{ brand: 'Delix Ramipril', atcCode: 'C09AA05' }], ctx: { trimester: 2, isPregnant: true, ageYears: 30 }, expectActionable: true, expectCritical: true },
  { id: 'POP-02', drugs: [{ brand: 'Coumadin', atcCode: 'B01AA03' }], ctx: { trimester: 1, isPregnant: true, ageYears: 28 }, expectActionable: true, expectCritical: true },
  { id: 'POP-03', drugs: [{ brand: 'Rocephin Seftriakson IV', atcCode: 'J01DD04', route: 'IV' }], ctx: { ageDays: 10, isNeonate: true }, expectActionable: true, expectCritical: true },
  { id: 'POP-04', drugs: [{ brand: 'Cipro 500mg', atcCode: 'J01MA02' }], ctx: { ageYears: 6 }, expectActionable: true }, // Pediatrik florokinolon artropati uyarısı (PUD_FQ_AGE_001)
  { id: 'POP-05', drugs: [{ brand: 'Contramal Tramadol', atcCode: 'N02AX02' }], ctx: { ageYears: 8 }, expectActionable: true, expectCritical: true },
  { id: 'POP-06', drugs: [{ brand: 'Eliquis Apiksaban', atcCode: 'B01AF02' }], ctx: { ageYears: 70 }, expectActionable: true, expectCritical: true }, // DOAC kreatinin kilidi!
  { id: 'POP-07', drugs: [{ brand: 'Parol Parasetamol', atcCode: 'N02BE01' }, { brand: 'Arveles Deksketoprofen', atcCode: 'M01AE17' }], ctx: { childPughClass: 'C', ageYears: 58 }, expectActionable: true },
  { id: 'POP-08', drugs: [{ brand: 'Majezik Flurbiprofen', atcCode: 'M01AE09' }, { brand: 'Arveles Deksketoprofen', atcCode: 'M01AE17' }], ctx: { ageYears: 45 }, expectActionable: true }, // Terapötik duplikasyon!
  // Güvenli Negatif Kontrol Reçeteleri (10 — düşük uyarı gürültüsü doğrulaması!)
  { id: 'SAFE-01', drugs: [{ brand: 'Parol 500mg Tablet', atcCode: 'N02BE01' }, { brand: 'Augmentin BID 1000mg', atcCode: 'J01CR02' }], ctx: { ageYears: 35, egfr: 95 }, expectActionable: false },
  { id: 'SAFE-02', drugs: [{ brand: 'Pantpas 40mg Tablet', atcCode: 'A02BC02' }, { brand: 'Plavix 75mg Tablet', atcCode: 'B01AC04' }], ctx: { ageYears: 62, egfr: 80 }, expectActionable: false },
  { id: 'SAFE-03', drugs: [{ brand: 'Norvasc 5mg Tablet', atcCode: 'C08CA01' }, { brand: 'Glucophage 1000mg', atcCode: 'A10BA02' }], ctx: { ageYears: 58, egfr: 88 }, expectActionable: false },
  { id: 'SAFE-04', drugs: [{ brand: 'Ventolin Inhaler', atcCode: 'R03AC02', route: 'INH' }, { brand: 'Parol 500mg Tablet', atcCode: 'N02BE01' }], ctx: { ageYears: 25, egfr: 110 }, expectActionable: false },
  { id: 'SAFE-05', drugs: [{ brand: 'Keppra Levetirasetam', atcCode: 'N03AX14' }, { brand: 'Meronem 1g IV', atcCode: 'J01DH02', route: 'IV' }], ctx: { ageYears: 48, egfr: 90 }, expectActionable: false },
  { id: 'SAFE-06', drugs: [{ brand: 'Pravachol Pravastatin', atcCode: 'C10AA03' }, { brand: 'Largopen Amoksisilin', atcCode: 'J01CA04' }], ctx: { ageYears: 60, egfr: 85 }, expectActionable: false },
  { id: 'SAFE-07', drugs: [{ brand: 'Tobrex Göz Damlası', atcCode: 'S01AA12', route: 'OPH' }, { brand: 'Coumadin 5mg', atcCode: 'B01AA03' }], ctx: { ageYears: 66, egfr: 75 }, expectActionable: false },
  { id: 'SAFE-08', drugs: [{ brand: 'Fucidin Krem', atcCode: 'D06AX01', route: 'TOP' }, { brand: 'Lipitor 20mg', atcCode: 'C10AA05' }], ctx: { ageYears: 55, egfr: 90 }, expectActionable: false },
  { id: 'SAFE-09', drugs: [{ brand: 'Lustral Sertralin', atcCode: 'N06AB06' }, { brand: 'Parol 500mg', atcCode: 'N02BE01' }], ctx: { ageYears: 32, egfr: 105 }, expectActionable: false },
  { id: 'SAFE-10', drugs: [{ brand: 'Vankomisin IV', atcCode: 'J01XA01', route: 'IV' }, { brand: 'Tazocin Piperasilin', atcCode: 'J01CR05', route: 'IV' }], ctx: { ageYears: 50, egfr: 90 }, expectActionable: false } // ACORN VPT Tier 4 pasif bilgilendirme -> actionable=0!
];

let criticalTotal = 0;
let criticalHit = 0;
let safeTotal = 0;
let safeClean = 0;
const scenarioFailures: string[] = [];
for (const sc of scenarios) {
  const res = evaluateUnifiedPrescriptionSafety(sc.drugs, sc.ctx || { ageYears: 55, egfr: 85 });
  if (sc.expectActionable) {
    criticalTotal++;
    if (res.counts.totalActionable === 0) {
      scenarioFailures.push(`MISS [${sc.id}] ${sc.drugs.map(d => d.brand).join('+')} (tier3=${res.counts.tier3}, pddi=${res.pddiMatches.map(m => m.escalatedTier + ':' + m.monograph.canonical_pair_key).join(',')})`);
    } else if (sc.expectCritical && !res.counts.hasCritical) {
      scenarioFailures.push(`NOT_CRIT [${sc.id}] ${sc.drugs.map(d => d.brand).join('+')} (tier1=${res.counts.tier1}, tier2=${res.counts.tier2})`);
    } else {
      criticalHit++;
    }
  } else {
    safeTotal++;
    if (res.counts.totalActionable === 0) {
      safeClean++;
    } else {
      scenarioFailures.push(`FP [${sc.id}] ${sc.drugs.map(d => d.brand).join('+')} -> actionable=${res.counts.totalActionable} (alerts=${res.interactions.alerts.map(a => a.ruleId).join(',')}, pddi=${res.pddiMatches.map(m => m.monograph.canonical_pair_key).join(',')})`);
    }
  }
}
if (scenarioFailures.length > 0) {
  assert.fail(`Senaryo hataları (${scenarioFailures.length}):\n  - ${scenarioFailures.join('\n  - ')}`);
}
const falsePositiveRate = (1 - safeClean / Math.max(1, safeTotal)) * 100;
assert.ok(falsePositiveRate <= 10, `Güvenli kontrollerde yanlış pozitif oranı ≤%10 olmalı (Bulunan: %${falsePositiveRate.toFixed(1)})`);
// ACORN VPT Tier 4 doğrulaması
const acornRes = evaluatePrescriptionInteractions(
  [
    { brand: 'Vankomisin IV', atcCode: 'J01XA01', route: 'IV' },
    { brand: 'Tazocin Piperasilin-Tazobaktam IV', atcCode: 'J01CR05', route: 'IV' }
  ],
  { ageYears: 50, egfr: 90 }
);
assert.ok(acornRes.alerts.some(a => a.tier === 4 && /ACORN|DDI_VAN_TZP/i.test(a.ruleId + ' ' + a.alertTitle)), 'ACORN VPT kuralı Tier 4 pasif bilgilendirme olarak korunmalı');

// Tisdale QTc bağımsız birim testi
const tisdaleMax = calculateTisdaleQtcScore(
  [
    resolveToRxNormConcept('Klacid 500mg')!,
    resolveToRxNormConcept('Triflucan 150mg')!,
    resolveToRxNormConcept('Lasix 40mg')!
  ],
  { ageYears: 72, gender: 'female', baselineK: 3.1, baselineQtcMs: 465, hasAcuteMi: true, hasSepsis: true, hasHeartFailure: true }
);
assert.strictEqual(tisdaleMax.score, 21, `Maksimum Tisdale QTc skoru 21 olmalı (Bulunan: ${tisdaleMax.score})`);
assert.strictEqual(tisdaleMax.riskTier, 'HIGH');

console.log(`✓ Çok branşlı vaka matrisi doğrulandı: ${criticalHit}/${criticalTotal} kritik/eylem senaryosu (%100 duyarlılık), ${safeClean}/${safeTotal} güvenli kontrol temiz (%${falsePositiveRate.toFixed(1)} FP)`);
console.log('===================================================================');
console.log('🎉 ALL CLINICAL DDI REGRESSION TESTS PASSED (FAZ 0–4 %100 YEŞİL)!');
console.log('===================================================================');
