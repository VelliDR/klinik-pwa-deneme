/**
 * KEYSTONE KARŞI-OLGUSAL KLİNİK TEST MATRİSİ (COUNTERFACTUAL CLINICAL INVARIANTS)
 *
 * Her klinik kararın dayandığı tek kritik gerçeği (keystone fact) çekme, değiştirme
 * veya çeliştirme yoluyla tüm çekirdek ve yeni motorların karar yönünün kanıtla birlikte
 * deterministik hareket ettiğini doğrular. Üretim paketine 0 bayt ekler.
 */

import assert from 'assert';
import fs from 'fs';

import { calculatePediatricDose } from '../src/engines/pediatricEngine';
import { evaluateAap2022Jaundice } from '../src/engines/jaundiceEngine';
import { analyzeBloodGas } from '../src/engines/bloodGasEngine';
import {
  detectTripleWhammy,
  checkRenalDoseAdjustments,
  checkHepaticDoseSafety
} from '../src/engines/safetyPrescriptionEngine';
import {
  CHILD_PUGH_SCHEMA,
  NIHSS_SCHEMA,
  ABCD2_SCHEMA,
  SOFA_SCHEMA,
  QSOFA_SCHEMA,
  GLASGOW_BLATCHFORD_SCHEMA,
  evaluateChildPugh,
  calculateMeld3,
  evaluateNIHSS,
  evaluateABCD2,
  evaluateSOFA,
  evaluateQSOFA,
  evaluateGlasgowBlatchford
} from '../src/engines/extendedClinicalScores';
import { parseItsBarcode } from '../src/engines/itsBarcodeParser';
import { SYNTHETIC_CLINICAL_CASES } from '../src/engines/syntheticCases';

console.log('--- KEYSTONE COUNTERFACTUAL CLINICAL TEST MATRIX ---');
let pairsVerified = 0;

// ============================================================================
// 1. PEDİATRİK ŞURUP: YAŞ BİLGİSİ ÇEKİLDİĞİNDE MUTLAK GÜVENLİK KALKANI
// ============================================================================
{
  const blockedNoAge = calculatePediatricDose({ drugKey: 'codeine', weightKg: 18, ageMonths: null });
  const blockedUnder12 = calculatePediatricDose({ drugKey: 'codeine', weightKg: 18, ageMonths: 60 });
  assert.strictEqual(blockedNoAge?.isBlocked, true, 'Keystone[1a]: Age omitted on codeine must hard-block');
  assert.ok(blockedNoAge?.blockReason?.includes('YAŞ BİLGİSİ'), 'Keystone[1a]: Missing age must explicitly ask for age');
  assert.strictEqual(blockedUnder12?.isBlocked, true, 'Keystone[1b]: Codeine <12y must stay strictly blocked');
  pairsVerified++;

  const tmpNoAge = calculatePediatricDose({ drugKey: 'tmp_smx_200_40', weightKg: 12, ageMonths: null });
  const tmpSafe12m = calculatePediatricDose({ drugKey: 'tmp_smx_200_40', weightKg: 12, ageMonths: 12 });
  assert.strictEqual(tmpNoAge?.isBlocked, true, 'Keystone[2a]: TMP-SMX without age must hard-block (kernicterus guard)');
  assert.strictEqual(tmpSafe12m?.isBlocked, false, 'Keystone[2b]: Supplying age=12m must unblock TMP-SMX');
  pairsVerified++;

  const ibuNoAgeInfantWt = calculatePediatricDose({ drugKey: 'ibuprofen_100', weightKg: 8.5, ageMonths: null });
  const ibuKnown10m = calculatePediatricDose({ drugKey: 'ibuprofen_100', weightKg: 8.5, ageMonths: 10 });
  assert.strictEqual(ibuNoAgeInfantWt?.isBlocked, true, 'Keystone[2c]: Ibuprofen <10kg with unknown age must trigger TİTCK lock');
  assert.strictEqual(ibuKnown10m?.isBlocked, false, 'Keystone[2d]: Confirming age=10m at 8.5kg must unblock Ibuprofen');
  pairsVerified++;
}

// ============================================================================
// 2. AAP 2022 SARILIK: TEK RİSK FAKTÖRÜ (DAT+) & NON-SUBTRACTION KURALI
// ============================================================================
{
  const lowRisk = evaluateAap2022Jaundice({
    gestationalWeeks: 38,
    ageHours: 48,
    totalBilirubin: 14.5,
    riskFactors: {}
  });
  const withDat = evaluateAap2022Jaundice({
    gestationalWeeks: 38,
    ageHours: 48,
    totalBilirubin: 14.5,
    riskFactors: { isoimmuneHemolysis: true }
  });
  assert.ok(withDat.thresholds && lowRisk.thresholds);
  assert.ok(
    withDat.thresholds.phototherapy < lowRisk.thresholds.phototherapy,
    'Keystone[3a]: Flipping ONLY DAT(+) must lower AAP 2022 phototherapy threshold'
  );
  assert.notStrictEqual(lowRisk.status, 'PHOTOTHERAPY_REQUIRED', 'Keystone[3b]: At TSB 14.5 without risk factor, 38w 48h must be below phototherapy');
  assert.strictEqual(withDat.status, 'PHOTOTHERAPY_REQUIRED', 'Keystone[3c]: Flipping ONLY DAT(+) at TSB 14.5 must flip decision to PHOTOTHERAPY_REQUIRED');
  pairsVerified++;

  // Non-subtraction: Direkt bilirubin 2.0 mg/dL TSB'den düşülmemelidir
  const withDirect = evaluateAap2022Jaundice({
    gestationalWeeks: 38,
    ageHours: 48,
    totalBilirubin: 14.5,
    directBilirubinMgDl: 2.0,
    riskFactors: { isoimmuneHemolysis: true }
  });
  assert.strictEqual(withDirect.status, 'PHOTOTHERAPY_REQUIRED', 'Keystone[4]: Adding direct bilirubin must NOT subtract from TSB and hide phototherapy');
  pairsVerified++;
}

// ============================================================================
// 3. KAN GAZI: FİGGE ALBÜMİN MASKESİ & KASSİRER-BLEİCH TUTARLILIK ÇELİŞKİSİ
// ============================================================================
{
  const normalAlb = analyzeBloodGas({ pH: 7.36, pCO2: 38, HCO3: 21, Na: 136, Cl: 104, Albumin: 4.0 });
  const lowAlb = analyzeBloodGas({ pH: 7.36, pCO2: 38, HCO3: 21, Na: 136, Cl: 104, Albumin: 2.0 });
  assert.ok(normalAlb && lowAlb && normalAlb.corrected_AG !== null && lowAlb.corrected_AG !== null);
  assert.ok(
    lowAlb.corrected_AG - normalAlb.corrected_AG >= 4.5,
    'Keystone[5]: Dropping ONLY albumin 4.0 -> 2.0 must increase Figge corrected AG by ~5 mEq/L'
  );
  pairsVerified++;

  const consistentBg = analyzeBloodGas({ pH: 7.40, pCO2: 40, HCO3: 24 });
  const contradictedBg = analyzeBloodGas({ pH: 7.10, pCO2: 40, HCO3: 24 });
  assert.strictEqual(consistentBg?.isInternallyConsistent, true, 'Keystone[6a]: Consistent ABG must pass Kassirer-Bleich');
  assert.strictEqual(contradictedBg?.isInternallyConsistent, false, 'Keystone[6b]: Contradicting ONLY pH (7.40 -> 7.10) must fail Kassirer-Bleich');
  pairsVerified++;
}

// ============================================================================
// 4. TRİPLE WHAMMY & RENAL KALKAN: TEK İLAÇ ÇEKME / TEK eGFR DEĞİŞİMİ
// ============================================================================
{
  const twFull = detectTripleWhammy([
    { brand: 'DELIX 5 MG', generic: 'ramipril', atcCode: 'C09AA05' },
    { brand: 'LASIX 40 MG', generic: 'furosemide', atcCode: 'C03CA01' },
    { brand: 'BRUFEN 400 MG', generic: 'ibuprofen', atcCode: 'M01AE01' }
  ]);
  const twWithoutNsaid = detectTripleWhammy([
    { brand: 'DELIX 5 MG', generic: 'ramipril', atcCode: 'C09AA05' },
    { brand: 'LASIX 40 MG', generic: 'furosemide', atcCode: 'C03CA01' }
  ]);
  assert.strictEqual(twFull.isTripleWhammy, true, 'Keystone[7a]: ACEi + Diuretic + NSAID must trigger Triple Whammy');
  assert.strictEqual(twWithoutNsaid.isTripleWhammy, false, 'Keystone[7b]: Pulling ONLY NSAID must extinguish Triple Whammy');
  pairsVerified++;

  const renalOk = checkRenalDoseAdjustments({ egfr: 75, drugs: [{ brand: 'GLIFOR', generic: 'metformin', atcCode: 'A10BA02' }] });
  const renalReduced = checkRenalDoseAdjustments({ egfr: 38, drugs: [{ brand: 'GLIFOR', generic: 'metformin', atcCode: 'A10BA02' }] });
  const renalContra = checkRenalDoseAdjustments({ egfr: 22, drugs: [{ brand: 'GLIFOR', generic: 'metformin', atcCode: 'A10BA02' }] });
  assert.strictEqual(renalOk.alertsCount, 0, 'Keystone[8a]: Metformin at eGFR 75 must have 0 renal alerts');
  assert.ok(renalReduced.alertsCount > 0 && !renalReduced.hasContraindication, 'Keystone[8b]: Flipping ONLY eGFR 75 -> 38 must trigger dose reduction');
  assert.strictEqual(renalContra.hasContraindication, true, 'Keystone[8c]: Flipping ONLY eGFR 38 -> 22 must trigger contraindication');
  pairsVerified++;
}

// ============================================================================
// 5. HEPATİK İLAÇ GÜVENLİK KALKANI: CHILD-PUGH A -> B -> C & LIVERTOX DILI
// ============================================================================
{
  const rx = [
    { brand: 'BRUFEN 400 MG', generic: 'ibuprofen', atcCode: 'M01AE01' },
    { brand: 'PAROL 500 MG', generic: 'paracetamol', atcCode: 'N02BE01' },
    { brand: 'LIPITOR 20 MG', generic: 'atorvastatin', atcCode: 'C10AA05' }
  ];
  const noCirrhosis = checkHepaticDoseSafety(rx, { childPughClass: null });
  const cpA = checkHepaticDoseSafety(rx, { childPughClass: 'A', childPughScore: 5 });
  const cpC = checkHepaticDoseSafety(rx, { childPughClass: 'C', childPughScore: 12, meldScore: 26 });

  assert.strictEqual(noCirrhosis.alertsCount, 0, 'Keystone[9a]: Without Child-Pugh cirrhosis, hepatic shield must emit 0 alerts');
  assert.strictEqual(cpA.hasContraindication, false, 'Keystone[9b]: Child-Pugh A must emit caution only, not hard contraindication for this rx');
  assert.strictEqual(cpC.hasContraindication, true, 'Keystone[9c]: Flipping ONLY Child-Pugh A -> C must trigger NSAID & Statin contraindications');
  assert.ok(cpC.alerts.some(a => a.ruleCode === 'HEP_NSAID' && a.severity === 'CONTRAINDICATED'), 'Keystone[9d]: NSAID contraindicated in Child-Pugh C');
  assert.ok(cpC.alerts.some(a => a.ruleCode === 'HEP_PARACETAMOL' && a.recommendation.includes('2 g/gün')), 'Keystone[9e]: Paracetamol capped at <=2 g/day in Child-Pugh B/C');
  assert.ok(cpC.alerts.some(a => a.ruleCode === 'HEP_STATIN' && a.severity === 'CONTRAINDICATED'), 'Keystone[9f]: Statin flagged in Child-Pugh C');
  pairsVerified++;

  // LiverTox DILI A fallback (küratörlü kural dışı bir ilaçta)
  const diliOnlyA = checkHepaticDoseSafety(
    [{ brand: 'TEST_DILI_DRUG', generic: 'minocycline', atcCode: 'J01AA08' }],
    { childPughClass: 'A', diliLookup: () => 'A' }
  );
  const diliOnlyC = checkHepaticDoseSafety(
    [{ brand: 'TEST_DILI_DRUG', generic: 'minocycline', atcCode: 'J01AA08' }],
    { childPughClass: 'C', diliLookup: () => 'A' }
  );
  assert.strictEqual(diliOnlyA.alertsCount, 0, 'Keystone[10a]: LiverTox generic fallback should not over-alert in Child-Pugh A');
  assert.strictEqual(diliOnlyC.hasContraindication, true, 'Keystone[10b]: Flipping ONLY Child-Pugh A -> C with LiverTox DILI A must trigger contraindication');
  pairsVerified++;
}

// ============================================================================
// 6. CHILD-PUGH & MELD 3.0 SINIR VE KARŞI-OLGUSAL TESTLERİ
// ============================================================================
{
  const cpBase = evaluateChildPugh({ bilirubin: 'lt2', albumin: 'gt3_5', inr: 'lt1_7', ascites: 'none', encephalopathy: 'none' });
  const cpFlipped = evaluateChildPugh({ bilirubin: 'lt2', albumin: 'gt3_5', inr: 'lt1_7', ascites: 'severe', encephalopathy: 'none' });
  assert.strictEqual(cpBase.score, 5);
  assert.strictEqual(cpBase.childClass, 'A');
  assert.strictEqual(cpFlipped.score, 7);
  assert.strictEqual(cpFlipped.childClass, 'B', 'Keystone[11]: Flipping ONLY ascites none -> severe must shift Child-Pugh 5(A) -> 7(B)');
  pairsVerified++;

  const meldMale = calculateMeld3({ isFemale: false, bilirubinMgDl: 3.0, inr: 1.8, creatinineMgDl: 1.5, sodiumMeqL: 132, albuminGDl: 3.0 });
  const meldFemale = calculateMeld3({ isFemale: true, bilirubinMgDl: 3.0, inr: 1.8, creatinineMgDl: 1.5, sodiumMeqL: 132, albuminGDl: 3.0 });
  assert.ok(meldMale && meldFemale);
  assert.ok(
    Math.abs((meldFemale.rawScore - meldMale.rawScore) - 1.33) < 0.02,
    `Keystone[12]: Flipping ONLY sex male -> female in MELD 3.0 must add exact +1.33 (got ${meldFemale.rawScore - meldMale.rawScore})`
  );
  pairsVerified++;

  const meldNoDial = calculateMeld3({ isFemale: false, bilirubinMgDl: 2.0, inr: 1.4, creatinineMgDl: 1.1, sodiumMeqL: 136, albuminGDl: 3.4, dialysisTwicePastWeek: false });
  const meldDial = calculateMeld3({ isFemale: false, bilirubinMgDl: 2.0, inr: 1.4, creatinineMgDl: 1.1, sodiumMeqL: 136, albuminGDl: 3.4, dialysisTwicePastWeek: true });
  assert.ok(meldNoDial && meldDial && meldDial.score > meldNoDial.score + 5, 'Keystone[13]: Flipping ONLY dialysis flag must clamp Cr to 3.0 and sharply raise MELD 3.0');
  pairsVerified++;
}

// ============================================================================
// 7. NIHSS, ABCD², SOFA, qSOFA & GLASGOW-BLATCHFORD KARŞI-OLGUSAL SINIRLARI
// ============================================================================
{
  const nihss0 = evaluateNIHSS({});
  const nihssMod = evaluateNIHSS({ facial: '2', motor_arm_right: '3', motor_leg_right: '2', language: '2' });
  assert.strictEqual(nihss0.score, 0);
  assert.strictEqual(nihssMod.score, 9);
  assert.strictEqual(nihssMod.tier.severity, 'high', 'Keystone[14]: NIHSS 9 must classify as moderate stroke (high severity)');
  pairsVerified++;

  const abcdLow = evaluateABCD2({ age60: true, bp: true, clinical: 'other', duration: 'lt10', diabetes: false });
  const abcdHigh = evaluateABCD2({ age60: true, bp: true, clinical: 'weakness', duration: 'ge60', diabetes: false });
  assert.strictEqual(abcdLow.score, 2);
  assert.strictEqual(abcdLow.tier.severity, 'low');
  assert.strictEqual(abcdHigh.score, 6);
  assert.strictEqual(abcdHigh.tier.severity, 'critical', 'Keystone[15]: Flipping weakness + >=60m must move ABCD2 from low (2) to critical (6)');
  pairsVerified++;

  const sofa0 = evaluateSOFA({});
  const sofaSepsis = evaluateSOFA({ cns: '2' });
  assert.strictEqual(sofa0.score, 0);
  assert.strictEqual(sofa0.tier.severity, 'low');
  assert.strictEqual(sofaSepsis.score, 2);
  assert.strictEqual(sofaSepsis.tier.severity, 'high', 'Keystone[16]: Flipping ONLY CNS GCS 15 -> 10-12 must cross Sepsis-3 SOFA >= 2');
  pairsVerified++;

  const qsofa1 = evaluateQSOFA({ rr22: true, mental: false, sbp100: false });
  const qsofa2 = evaluateQSOFA({ rr22: true, mental: false, sbp100: true });
  assert.strictEqual(qsofa1.tier.severity, 'low');
  assert.strictEqual(qsofa2.tier.severity, 'critical', 'Keystone[17]: Flipping ONLY SBP <=100 must cross qSOFA >= 2');
  pairsVerified++;

  const gbs0 = evaluateGlasgowBlatchford({});
  const gbsHigh = evaluateGlasgowBlatchford({ hb: 'lt10' });
  assert.strictEqual(gbs0.score, 0);
  assert.strictEqual(gbs0.tier.severity, 'low');
  assert.strictEqual(gbsHigh.score, 6);
  assert.strictEqual(gbsHigh.tier.severity, 'critical', 'Keystone[18]: Flipping ONLY Hb <10 g/dL must jump GBS 0 -> 6 (critical)');
  pairsVerified++;
}

// ============================================================================
// 8. İTS KAREKOD (GS1 DATAMATRIX) & EAN-13 BARKOD AYRIŞTIRICI TESTLERİ
// ============================================================================
{
  const refDate = new Date('2026-11-21T12:00:00Z');

  // FNC1'li standart İTS karekod
  const gs1Valid = parseItsBarcode('\x1d010869980901164921SN123456\x1d1728123110LOT99', refDate);
  assert.strictEqual(gs1Valid.format, 'ITS_GS1_DATAMATRIX');
  assert.strictEqual(gs1Valid.ean13, '8699809011649');
  assert.strictEqual(gs1Valid.expiryDateIso, '2028-12-31');
  assert.strictEqual(gs1Valid.serialNumber, 'SN123456');
  assert.strictEqual(gs1Valid.lotNumber, 'LOT99');
  assert.strictEqual(gs1Valid.isExpired, false);

  // Tarihi geçmiş & DD=00 (ayın son günü) kuralı
  const gs1Expired = parseItsBarcode('010869980901400821SERI01\x1d1724020010BATCH2', refDate);
  assert.strictEqual(gs1Expired.ean13, '8699809014008');
  assert.strictEqual(gs1Expired.expiryDateIso, '2024-02-29', 'Keystone[19]: GS1 DD=00 in leap-year Feb 2024 must resolve to 2024-02-29');
  assert.strictEqual(gs1Expired.isExpired, true, 'Keystone[19b]: Past expiry date must flag isExpired=true');

  // FNC1'siz USB okuyucu (symbology prefix ]d2 dahil)
  const gs1Usb = parseItsBarcode(']d2010869954809440821ABC991727063010LOT7', refDate);
  assert.strictEqual(gs1Usb.ean13, '8699548094408');
  assert.strictEqual(gs1Usb.expiryDateIso, '2027-06-30');
  assert.strictEqual(gs1Usb.lotNumber, 'LOT7');

  // Parantezli insan-okunur GS1 ve yakında bitecek SKT (<=30 gün)
  const gs1Soon = parseItsBarcode('(01)08699717010109(17)261205(10)P1', refDate);
  assert.strictEqual(gs1Soon.ean13, '8699717010109');
  assert.strictEqual(gs1Soon.isExpired, false);
  assert.strictEqual(gs1Soon.isExpiringSoon, true, 'Keystone[20]: Expiry within 30 days must flag isExpiringSoon=true');

  // Düz EAN-13 ve GTIN-14
  assert.strictEqual(parseItsBarcode('8699532095015', refDate).ean13, '8699532095015');
  assert.strictEqual(parseItsBarcode('08699532095015', refDate).ean13, '8699532095015');
  pairsVerified += 2;
}

// ============================================================================
// 9. SENTETİK ÖRNEK VAKALAR & TİTCK BARKOD TUTARLILIĞI
// ============================================================================
{
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const medicines = JSON.parse(fs.readFileSync('public/data/medicines.json', 'utf8'));
  const medByBarcode = new Map<string, any>(medicines.map((m: any) => [String(m.c || ''), m]));

  const dynamicValidIds = new Set<string>([
    'chk-child-pugh-active',
    'input-meld-bili', 'input-meld-inr', 'input-meld-cr', 'input-meld-na', 'input-meld-alb', 'chk-meld-dialysis',
    ...CHILD_PUGH_SCHEMA.criteria.map(c => `decl-child_pugh-${c.id}`),
    ...NIHSS_SCHEMA.criteria.map(c => `decl-nihss-${c.id}`),
    ...ABCD2_SCHEMA.criteria.map(c => `decl-abcd2-${c.id}`),
    ...SOFA_SCHEMA.criteria.map(c => `decl-sofa-${c.id}`),
    ...QSOFA_SCHEMA.criteria.map(c => `decl-qsofa-${c.id}`),
    ...GLASGOW_BLATCHFORD_SCHEMA.criteria.map(c => `decl-glasgow_blatchford-${c.id}`)
  ]);

  assert.strictEqual(SYNTHETIC_CLINICAL_CASES.length, 5, 'Must provide 5 synthetic clinical cases');
  for (const sc of SYNTHETIC_CLINICAL_CASES) {
    for (const fieldId of [...Object.keys(sc.fieldValues), ...Object.keys(sc.checkboxValues || {})]) {
      assert.ok(
        indexHtml.includes(`id="${fieldId}"`) || dynamicValidIds.has(fieldId),
        `Synthetic case "${sc.id}" references missing DOM ID "${fieldId}"`
      );
    }
    for (const dRef of sc.drugs || []) {
      const realMed = medByBarcode.get(dRef.barcode);
      assert.ok(realMed, `Synthetic case "${sc.id}" drug barcode "${dRef.barcode}" (${dRef.brand}) must exist in public/data/medicines.json`);
      assert.strictEqual(String(realMed.a || '').toUpperCase(), dRef.atcCode.toUpperCase(), `ATC mismatch for synthetic drug ${dRef.brand}`);
    }
  }
  pairsVerified++;
}

console.log(`✓ ${pairsVerified} keystone counterfactual clinical invariant groups passed (100% deterministic)!`);
console.log('🎉 ALL KEYSTONE COUNTERFACTUAL, EXTENDED SCORES & İTS BARCODE TESTS PASSED! 🎉');
