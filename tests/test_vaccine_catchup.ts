/**
 * AŞI YAKALAMA MOTORU (VACCINE CATCH-UP ENGINE) TEST SUITE
 * 
 * Doğrulanacak Temel Prensipler:
 * 1. Dozlar Asla Baştan Başlamaz İlkesi
 * 2. 4 Gün Kuralı (Grace Period) & Minimum Doz Aralıkları
 * 3. Yaşa Göre Elenen Aşılar (BCG >=72m, Hib >=60m, KPA >=60m, DaBT vs Td >=72m, Rotavirüs >14w6d)
 * 4. 12-71 Ay Şeması (Vizit 1, 1b, 2, 3) ve TDT-BCG Canlı Aşı Çakışma Yönetimi
 * 5. >=72 Ay Şeması (Td, OPA, HepB, KKK, Suçiçeği, HepA)
 * 6. <12 Ay Süt Çocuğu Hızlandırılmış Şeması
 * 7. Emojisiz Saf SVG Çizim Uyumluluğu
 */

import { 
    calculateVaccineCatchUp, 
    checkDoseValidity, 
    evaluateEliminatedVaccines, 
    getMinimumIntervalRules,
    getClinicalTraps 
} from '../src/engines/vaccineCatchUpEngine';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        throw new Error(message);
    } else {
        console.log(`✓ PASS: ${message}`);
    }
}

console.log('--- 1. TESTING VACCINE ELIMINATION & AGE CUTOFFS ---');

// Test 1: 7 Yaşında (84 Ay) çocuk: BCG, Hib, KPA elenmeli, DaBT yerine Td gelmeli
const el84 = evaluateEliminatedVaccines(84);
const bcg84 = el84.find(x => x.code === 'BCG');
assert(bcg84?.isEliminated === true, '84 months: BCG must be eliminated (>=72 months rule)');
assert(bcg84?.badgeText.includes('YAPILMAZ') === true, '84 months: BCG badge shows YAPILMAZ');

const hib84 = el84.find(x => x.code === 'HIB');
assert(hib84?.isEliminated === true, '84 months: Hib must be eliminated (>=60 months rule)');

const kpa84 = el84.find(x => x.code === 'KPA');
assert(kpa84?.isEliminated === true, '84 months: KPA must be eliminated (>=60 months rule)');

const pert84 = el84.find(x => x.code === 'PERTUSSIS_TD');
assert(pert84?.isEliminated === true, '84 months: Pertussis DaBT replaced by Td');

// Test 2: 3 Yaşında (36 Ay) çocuk: KPA tek doz yeterli, Hib tek doz yeterli, BCG TDT ile yapılır
const el36 = evaluateEliminatedVaccines(36);
const bcg36 = el36.find(x => x.code === 'BCG');
assert(bcg36?.isEliminated === false && bcg36?.status === 'MODIFIED_PROTOCOL', '36 months: BCG requires TDT');

const kpa36 = el36.find(x => x.code === 'KPA');
assert(kpa36?.isEliminated === false && kpa36?.status === 'MODIFIED_PROTOCOL', '36 months: KPA single dose sufficient (24-59 months rule)');

const hib36 = el36.find(x => x.code === 'HIB');
assert(hib36?.isEliminated === false && hib36?.status === 'MODIFIED_PROTOCOL', '36 months: Hib single dose sufficient (15-59 months rule)');

const rota36 = el36.find(x => x.code === 'ROTAVIRUS');
assert(rota36?.isEliminated === true && rota36?.status === 'CONTRAINDICATED', '36 months: Rotavirus contraindicated (window expired)');

// Test 3: 2 Aylık bebek: BCG doğrudan yapılır, Rotavirüs 1. doz penceresinde
const el2 = evaluateEliminatedVaccines(2);
const bcg2 = el2.find(x => x.code === 'BCG');
assert(bcg2?.status === 'ACTIVE_APPLIED', '2 months: BCG applied directly without PPD');

const rota2 = el2.find(x => x.code === 'ROTAVIRUS');
assert(rota2?.status === 'ACTIVE_APPLIED', '2 months: Rotavirus within 1st dose window');

console.log('\n--- 2. TESTING 4-DAY GRACE PERIOD & MINIMUM INTERVAL CHECKER ---');

// Test 4: 28 Günlük aralık:
// a) 28 gün: Tam geçerli
const check28_exact = checkDoseValidity('karma', 28);
assert(check28_exact.isValid === true && check28_exact.severity === 'success', '28 days on 28-day min: Exactly valid');

// b) 24 gün: 4 gün erken -> 4 Gün Kuralı ile GEÇERLİ
const check28_grace = checkDoseValidity('karma', 24);
assert(check28_grace.isValid === true && check28_grace.isGracePeriodValid === true && check28_grace.severity === 'warning', '24 days on 28-day min: Valid by 4-day grace rule');

// c) 23 gün: 5 gün erken -> GEÇERSİZ!
const check28_invalid = checkDoseValidity('karma', 23);
assert(check28_invalid.isValid === false && check28_invalid.severity === 'danger', '23 days on 28-day min: Invalid (exceeds 4-day grace period)');
assert(check28_invalid.recommendation.includes('tekrarlanmalıdır'), 'Invalid dose recommendation specifies repeat waiting minimum interval');

// Test 5: Canlı-Canlı aşı aralığı (min 28 gün):
const liveLiveGrace = checkDoseValidity('live_live', 25);
assert(liveLiveGrace.isValid === true && liveLiveGrace.isGracePeriodValid === true, '25 days for live-live: Valid under 4-day rule');

const liveLiveInvalid = checkDoseValidity('live_live', 20);
assert(liveLiveInvalid.isValid === false, '20 days for live-live: Invalid (<24 days)');

// Test 6: Hepatit B 2. ve 3. doz arası (min 56 gün):
const hepbExact = checkDoseValidity('hepb_2_3', 56);
assert(hepbExact.isValid === true, 'HepB 2-3: 56 days exact valid');

const hepbGrace = checkDoseValidity('hepb_2_3', 52);
assert(hepbGrace.isValid === true && hepbGrace.isGracePeriodValid === true, 'HepB 2-3: 52 days valid by 4-day grace rule');

const hepbInvalid = checkDoseValidity('hepb_2_3', 51);
assert(hepbInvalid.isValid === false, 'HepB 2-3: 51 days (5 days early) invalid');

console.log('\n--- 3. TESTING 12–71 MONTHS UNVACCINATED CATCH-UP SCHEDULE ---');

// Test 7: 18 aylık çocuk (familyCanReturnIn3Days = true, İdeal Şema)
const catchup18 = calculateVaccineCatchUp({
    ageInMonths: 18,
    familyCanReturnIn3Days: true
});

assert(catchup18.scenarioKey === 'unvaccinated_12_71', '18 months classified as unvaccinated_12_71');
assert(catchup18.visits.length === 4, '18 months produces 4 visits (Visit 1, Visit 1b, Visit 2, Visit 3)');

// Visit 1: 6'lı karma, KPA 1, TDT
const v1 = catchup18.visits[0];
assert(v1.doses.some(d => d.vaccine.includes('6\'lı Karma')), 'Visit 1 includes 6\'lı Karma');
assert(v1.doses.some(d => d.vaccine.includes('KPA')), 'Visit 1 includes KPA 1');
assert(v1.doses.some(d => d.vaccine.includes('TDT')), 'Visit 1 includes TDT (PPD)');
assert(!v1.doses.some(d => d.vaccine.includes('BCG')), 'Visit 1 does not include BCG (requires TDT first)');

// In ideal scheme, KKK and Varicella held for Visit 1b (to avoid live clash with BCG on day 3)
assert(!v1.doses.some(d => d.vaccine.includes('KKK')), 'Visit 1 ideal scheme holds KKK for day 3 with BCG');

// Visit 1b: BCG + KKK + Suçiçeği + HepA
const v1b = catchup18.visits[1];
assert(v1b.doses.some(d => d.vaccine.includes('BCG')), 'Visit 1b includes BCG (if TDT negative)');
assert(v1b.doses.some(d => d.vaccine.includes('KKK')), 'Visit 1b includes KKK (given with BCG on day 3)');
assert(v1b.doses.some(d => d.vaccine.includes('Suçiçeği')), 'Visit 1b includes Suçiçeği (given with BCG on day 3)');
assert(v1b.doses.some(d => d.vaccine.includes('Hepatit A')), 'Visit 1b includes HepA 1');

// Test 8: 18 aylık çocuk (familyCanReturnIn3Days = false, Alternatif Şema)
const catchup18_no_return = calculateVaccineCatchUp({
    ageInMonths: 18,
    familyCanReturnIn3Days: false
});

const v1_alt = catchup18_no_return.visits[0];
assert(v1_alt.doses.some(d => d.vaccine.includes('KKK')), 'Alternative scheme gives KKK on Day 0');
assert(v1_alt.doses.some(d => d.vaccine.includes('Suçiçeği')), 'Alternative scheme gives Suçiçeği on Day 0');
assert(v1_alt.warningNote?.includes('BCG BUGÜN YAPILAMAZ'), 'Alternative scheme displays warning that BCG must be deferred 28 days');

// Visit 2 in alternative scheme receives BCG after 28 days
const v2_alt = catchup18_no_return.visits[2];
assert(v2_alt.doses.some(d => d.vaccine.includes('BCG')), 'Alternative scheme schedules BCG for Visit 2 (Month 1)');

// Test 9: 30 aylık çocuk (>=24 ay): KPA 2 yapılmamalı!
const catchup30 = calculateVaccineCatchUp({ ageInMonths: 30 });
const v2_30 = catchup30.visits[2];
assert(!v2_30.doses.some(d => d.vaccine.includes('KPA')), 'Child aged 30m (>=24m) does not receive KPA 2 (single dose rule)');

// Test 9b: 65 aylık çocuk (60-71 ay / 5 yaş): KPA ve Hib (6'lı Karma) yapılmamalı, BCG+TDT yapılmalı!
const catchup65 = calculateVaccineCatchUp({ ageInMonths: 65 });
const v1_65 = catchup65.visits[0];
assert(!v1_65.doses.some(d => d.vaccine.includes('KPA')), 'Child aged 65m (>=60m / 5+ years) does not receive KPA in Visit 1');
assert(!v1_65.doses.some(d => d.vaccine.includes('Hib')), 'Child aged 65m (>=60m / 5+ years) does not receive Hib in Visit 1');
assert(v1_65.doses.some(d => d.vaccine.includes('DaBT-İPA + HepB')), 'Child aged 65m receives DaBT-İPA + HepB without Hib in Visit 1');
assert(v1_65.doses.some(d => d.vaccine.includes('TDT')), 'Child aged 65m (<72m) still receives TDT for BCG');

console.log('\n--- 4. TESTING ≥72 MONTHS (≥6 YEARS) UNVACCINATED CATCH-UP SCHEDULE ---');

const catchup84 = calculateVaccineCatchUp({ ageInMonths: 84 });
assert(catchup84.scenarioKey === 'unvaccinated_ge_72', '84 months classified as unvaccinated_ge_72');
assert(catchup84.visits.length === 3, '84 months produces 3 visits (Visit 1, Visit 2, Visit 3)');

const v1_84 = catchup84.visits[0];
assert(v1_84.doses.some(d => d.vaccine.includes('Td')), 'Visit 1 uses Td instead of DaBT');
assert(v1_84.doses.some(d => d.vaccine.includes('OPA')), 'Visit 1 includes OPA');
assert(v1_84.doses.some(d => d.vaccine.includes('Hepatit B')), 'Visit 1 includes HepB');
assert(v1_84.doses.some(d => d.vaccine.includes('KKK')), 'Visit 1 includes KKK');
assert(v1_84.doses.some(d => d.vaccine.includes('Suçiçeği')), 'Visit 1 includes Suçiçeği');
assert(v1_84.doses.some(d => d.vaccine.includes('Hepatit A')), 'Visit 1 includes HepA');
assert(!v1_84.doses.some(d => d.vaccine.includes('BCG')), 'Visit 1 has NO BCG');
assert(!v1_84.doses.some(d => d.vaccine.includes('Hib')), 'Visit 1 has NO Hib');
assert(!v1_84.doses.some(d => d.vaccine.includes('KPA')), 'Visit 1 has NO KPA');

console.log('\n--- 5. TESTING <12 MONTHS INFANT CATCH-UP SCHEDULE ---');

const catchup5 = calculateVaccineCatchUp({ ageInMonths: 5 });
assert(catchup5.scenarioKey === 'unvaccinated_infant', '5 months classified as infant catchup');
assert(catchup5.visits[0].doses.some(d => d.vaccine.includes('6\'lı Karma')), 'Infant Visit 1 includes 6\'lı Karma');
assert(catchup5.visits[0].doses.some(d => d.vaccine.includes('TDT')), '5 months infant receives TDT before BCG');

console.log('\n--- 6. VERIFYING IMMUNOLOGICAL GOLD RULES & TRAPS ---');

const traps = getClinicalTraps();
assert(traps.length >= 2, 'Clinical traps contain TDT clash and never restart rule');
assert(traps.some(t => t.id === 'tdt_live_clash'), 'TDT live vaccine clash trap present');
assert(traps.some(t => t.id === 'never_restart_rule'), 'Never restart rule present');

const minRules = getMinimumIntervalRules();
assert(minRules.length >= 6, 'Minimum interval rules matrix populated');

console.log('\n--- 7. TESTING CUSTOM_PARTIAL CATCH-UP ACROSS ALL AGE BANDS ---');

// 7.1 Infant (<12m): 5-month-old with 1 Karma, 1 HepB, 1 KPA, BCG done
const partialInfant = calculateVaccineCatchUp({
    ageInMonths: 5,
    scenario: 'custom_partial',
    dosesReceived: { dabt_hepb_hib: 1, hepb: 1, kpa: 1, bcg: true }
});
assert(partialInfant.scenarioKey === 'custom_partial', 'Infant partial catchup has scenarioKey custom_partial');
assert(partialInfant.partialSummary !== undefined && !partialInfant.partialSummary.isFullyVaccinated, 'Infant partial summary present and incomplete');
assert(partialInfant.partialSummary!.remainingCounts.dabt_or_td === 2, 'Infant with 1 karma needs 2 remaining primary doses');
assert(partialInfant.partialSummary!.remainingCounts.kpa === 1, 'Infant with 1 KPA needs 1 remaining primary dose');
assert(partialInfant.partialSummary!.remainingCounts.bcg === 0, 'Infant with BCG=true needs 0 BCG');
const infAllDoses = partialInfant.visits.flatMap(v => v.doses);
assert(!infAllDoses.some(d => d.vaccine.includes('BCG') || d.vaccine.includes('TDT')), 'Infant with BCG done skips BCG and TDT');
assert(!infAllDoses.some(d => d.vaccine.includes('KKK') || d.vaccine.includes('Suçiçeği') || d.vaccine.includes('Hepatit A')), 'Infant <12m does not schedule KKK/Varicella/HepA');
assert(partialInfant.visits[0].doses.some(d => d.vaccine.includes('6\'lı Karma') && d.doseNumber === 2), 'Infant Visit 1 continues from 2. Doz 6\'lı Karma');
assert(partialInfant.visits[0].doses.some(d => d.vaccine.includes('KPA') && d.doseNumber === 2), 'Infant Visit 1 completes 2. Doz KPA');
assert(partialInfant.visits[1].doses.some(d => d.vaccine.includes('6\'lı Karma') && d.doseNumber === 3), 'Infant Visit 2 completes 3. Doz 6\'lı Karma');

// 7.2 Toddler (12-59m): 24-month-old with 2 Karma, 2 HepB, 1 KPA (sufficient >=24m), 1 KKK, 1 Varicella, BCG done, 1 HepA, 1 OPA
const partial24m = calculateVaccineCatchUp({
    ageInMonths: 24,
    scenario: 'custom_partial',
    dosesReceived: { dabt_hepb_hib: 2, hepb: 2, kpa: 1, kkk: 1, varicella: 1, bcg: 1, hepa: 1, opa: 1 }
});
assert(partial24m.partialSummary!.remainingCounts.kpa === 0, '24m child with 1 KPA needs 0 more KPA');
assert(partial24m.partialSummary!.remainingCounts.bcg === 0, '24m child with bcg=1 needs 0 BCG');
assert(partial24m.partialSummary!.remainingCounts.kkk === 1, '24m child with 1 KKK needs 1 remaining KKK (2. Doz)');
assert(partial24m.partialSummary!.remainingCounts.varicella === 1, '24m child with 1 Varicella needs 1 remaining Varicella (1 Eylül 2026 2-dose GBP)');
assert(partial24m.partialSummary!.remainingCounts.hepb === 1, '24m child with 2 HepB needs 1 remaining HepB (3. Doz)');
assert(partial24m.partialSummary!.remainingCounts.hepa === 1, '24m child with 1 HepA needs 1 remaining HepA (2. Doz)');
assert(partial24m.partialSummary!.remainingCounts.opa === 1, '24m child with 1 OPA needs 1 remaining OPA (2. Doz)');
const p24AllDoses = partial24m.visits.flatMap(v => v.doses);
assert(!p24AllDoses.some(d => d.vaccine.includes('KPA') || d.vaccine.includes('BCG') || d.vaccine.includes('TDT')), '24m child skips completed KPA/BCG/TDT');
assert(partial24m.visits[0].doses.some(d => d.vaccine.includes('DaBT-İPA') && d.doseNumber === 3), '24m Visit 1 gives DaBT-İPA 3. Doz');
assert(partial24m.visits[0].doses.some(d => d.vaccine.includes('KKK') && d.doseNumber === 2), '24m Visit 1 immediately gives KKK 2. Doz without Visit 1b delay');
assert(partial24m.visits[0].doses.some(d => d.vaccine.includes('Suçiçeği') && d.doseNumber === 2), '24m Visit 1 gives Varicella 2. Doz');
assert(partial24m.visits.some(v => v.doses.some(d => d.vaccine.includes('DaBT-İPA') && d.doseLabel.includes('Rapel'))), '24m child with 2 prior DaBT gets 4. Doz Rapel on follow-up visit');
assert(partial24m.visits[0].clinicalNotes.some(n => n.includes('Kısmi Aşılı Değerlendirme Özeti')), 'Visit 1 includes received vs remaining clinical summary note');

// 7.3 5-Year-Old (60-71m): 65-month-old with 1 DaBT, 1 HepB, 1 KKK, BCG=false -> Hib & KPA eliminated, BCG+TDT kept
const partial65m = calculateVaccineCatchUp({
    ageInMonths: 65,
    scenario: 'custom_partial',
    familyCanReturnIn3Days: true,
    dosesReceived: { dabt_hepb_hib: 1, hepb: 1, kpa: 0, kkk: 1, varicella: 0, bcg: false, hepa: 0, opa: 0 }
});
assert(partial65m.partialSummary!.remainingCounts.kpa === 0, '65m child (>=60m) has 0 KPA remaining (eliminated)');
assert(partial65m.partialSummary!.remainingCounts.bcg === 1, '65m child (<72m) without BCG still needs BCG');
const p65AllDoses = partial65m.visits.flatMap(v => v.doses);
assert(!p65AllDoses.some(d => d.vaccine.includes('KPA') || d.vaccine.includes('Hib') || d.vaccine.includes('6\'lı')), '65m partial catchup never prescribes KPA or Hib');
assert(p65AllDoses.some(d => d.vaccine.includes('DaBT-İPA') && d.doseNumber === 2), '65m partial catchup uses DaBT-İPA 2. Doz');
assert(p65AllDoses.some(d => d.vaccine.includes('TDT')), '65m child without BCG receives TDT');
assert(p65AllDoses.some(d => d.vaccine.includes('BCG')), '65m child without BCG receives BCG');
assert(p65AllDoses.filter(d => d.vaccine.includes('Suçiçeği')).length === 2, '65m unvaccinated for Varicella receives 2 Varicella doses');

// 7.4 School-Age (>=72m): 84-month-old with 2 Td/DaBT, 3 HepB, 2 KKK, 1 Varicella, 1 HepA, 2 OPA -> single visit completes Td 3 + Varicella 2 + HepA 2
const partial84m = calculateVaccineCatchUp({
    ageInMonths: 84,
    scenario: 'custom_partial',
    dosesReceived: { dabt_hepb_hib: 2, hepb: 3, kpa: 0, kkk: 2, varicella: 1, bcg: false, hepa: 1, opa: 2 }
});
assert(partial84m.visits.length === 1, '84m child missing only final Td, Varicella 2, HepA 2 finishes in 1 visit');
const v1_84p = partial84m.visits[0].doses;
assert(v1_84p.some(d => d.vaccine.includes('Td') && d.doseNumber === 3), '84m partial gives Td 3. Doz');
assert(v1_84p.some(d => d.vaccine.includes('Suçiçeği') && d.doseNumber === 2), '84m partial gives Varicella 2. Doz');
assert(v1_84p.some(d => d.vaccine.includes('Hepatit A') && d.doseNumber === 2), '84m partial gives HepA 2. Doz');
assert(!v1_84p.some(d => d.vaccine.includes('Hepatit B') || d.vaccine.includes('KKK') || d.vaccine.includes('OPA') || d.vaccine.includes('BCG') || d.vaccine.includes('KPA')), '84m partial skips completed HepB/KKK/OPA and eliminated BCG/KPA');

// 7.5 Fully vaccinated child & malformed negative/NaN dose sanitization
const fullyVax = calculateVaccineCatchUp({
    ageInMonths: 36,
    scenario: 'custom_partial',
    dosesReceived: { dabt_hepb_hib: 4, hepb: 3, kpa: 2, kkk: 2, varicella: 2, bcg: true, hepa: 2, opa: 2 }
});
assert(fullyVax.partialSummary!.isFullyVaccinated === true, 'Fully vaccinated 36m child flagged as isFullyVaccinated');
assert(fullyVax.visits.length === 0, 'Fully vaccinated child requires 0 catch-up visits');

const sanitizedPartial = calculateVaccineCatchUp({
    ageInMonths: 18,
    scenario: 'custom_partial',
    dosesReceived: { dabt_hepb_hib: -3, hepb: NaN, kpa: 1.9, kkk: -1, varicella: Infinity, bcg: 0, hepa: 0, opa: 0 }
});
assert(sanitizedPartial.partialSummary!.receivedDoses.dabt_hepb_hib === 0, 'Negative dose count sanitized to 0');
assert(sanitizedPartial.partialSummary!.receivedDoses.hepb === 0, 'NaN dose count sanitized to 0');
assert(sanitizedPartial.partialSummary!.receivedDoses.kpa === 1, 'Float dose count floored safely to 1');
assert(sanitizedPartial.partialSummary!.receivedDoses.varicella === 0, 'Infinity dose count sanitized to 0');

console.log('\n🎉 ALL VACCINE CATCH-UP TESTS PASSED SUCCESSFULLY! 🎉\n');
