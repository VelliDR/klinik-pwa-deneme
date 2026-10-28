import assert from 'assert';
import {
  ensureAtcKnowledgeBaseReady,
  isAtcKnowledgeReady,
  getAtcSystem,
  getAllAtcSystems,
  getAtcGroup,
  getAtcProfile,
  checkAtcInteractions
} from '../src/engines/atcKnowledgeEngine';

console.log('--- TESTING ATC KNOWLEDGE BASE & PHARMACOLOGICAL TAXONOMY ---');

async function runTests() {
  // 1. Initial State & Loading
  assert.strictEqual(isAtcKnowledgeReady(), false, 'Should be uninitialized initially');
  const kb = await ensureAtcKnowledgeBaseReady();
  assert.ok(kb, 'Knowledge base must load successfully');
  assert.strictEqual(isAtcKnowledgeReady(), true, 'Should be ready after ensureAtcKnowledgeBaseReady');

  // 2. Systems (ATC L1)
  const systems = getAllAtcSystems();
  assert.strictEqual(systems.length, 14, 'Must have exactly 14 anatomical systems (A through V)');
  const cardioSys = getAtcSystem('C10AA07');
  assert.ok(cardioSys, 'C10AA07 must resolve to cardio system');
  assert.strictEqual(cardioSys.code, 'C');
  assert.strictEqual(cardioSys.shortName, 'Kardiyovasküler');
  assert.ok(cardioSys.name.includes('Kardiyovasküler Sistem'));

  const neuroSys = getAtcSystem('N06AB10');
  assert.ok(neuroSys);
  assert.strictEqual(neuroSys.code, 'N');
  assert.strictEqual(neuroSys.shortName, 'Sinir & Psikiyatri');

  // 3. Groups (ATC L2)
  const statinGroup = getAtcGroup('C10AA07');
  assert.ok(statinGroup, 'C10AA07 must resolve to group C10');
  assert.strictEqual(statinGroup.code, 'C10');
  assert.strictEqual(statinGroup.system, 'C');
  assert.ok(statinGroup.name.includes('Lipit Modifiye'));

  const antiInfectiveGroup = getAtcGroup('J01CA04');
  assert.ok(antiInfectiveGroup);
  assert.strictEqual(antiInfectiveGroup.code, 'J01');
  assert.strictEqual(antiInfectiveGroup.system, 'J');

  // 4. Detailed Pharmacology Profiles
  // Case A: Rosuvastatin (C10AA07) - Statin
  const rosuProfile = getAtcProfile('C10AA07');
  assert.ok(rosuProfile, 'Rosuvastatin must have a profile');
  assert.strictEqual(rosuProfile.systemCode, 'C');
  assert.strictEqual(rosuProfile.groupCode, 'C10');
  assert.ok(rosuProfile.pharmClass?.includes('Statin'), 'Must be statin class');
  assert.ok(rosuProfile.mechanismOfAction?.includes('HMG-CoA'), 'Mechanism must mention HMG-CoA');
  assert.ok(rosuProfile.blackBoxWarning?.includes('kas ağrısı') || rosuProfile.blackBoxWarning?.includes('Rabdomiyoliz'), 'Must have statin myopathy/rhabdo warning');
  assert.ok(Array.isArray(rosuProfile.interactingAtcCodes) && rosuProfile.interactingAtcCodes.length > 0, 'Must have interacting ATC codes');
  assert.ok(rosuProfile.interactingAtcCodes.includes('J01FA'), 'Must interact with macrolides J01FA');

  // Case B: Metformin (A10BA02) - Biguanid
  const metProfile = getAtcProfile('A10BA02');
  assert.ok(metProfile);
  assert.strictEqual(metProfile.systemCode, 'A');
  assert.strictEqual(metProfile.groupCode, 'A10');
  assert.ok(metProfile.pharmClass?.includes('Biguanid'), 'Must be Biguanid class');
  assert.ok(metProfile.blackBoxWarning?.includes('LAKTİK ASİDOZ'), 'Must have lactic acidosis warning');

  // Case C: Escitalopram (N06AB10) - SSRI
  const esciProfile = getAtcProfile('N06AB10');
  assert.ok(esciProfile);
  assert.strictEqual(esciProfile.systemCode, 'N');
  assert.strictEqual(esciProfile.groupCode, 'N06');
  assert.ok(esciProfile.pharmClass?.includes('SSRI') || esciProfile.pharmClass?.includes('Serotonin'), 'Must be SSRI');
  assert.ok(esciProfile.blackBoxWarning?.includes('İNTİHAR'), 'Must have suicide warning for adolescents');

  // Case D: Hierarchical Prefix Fallback
  // If a 7-character code is not in the exact map, it falls back to 5-char or 3-char group
  const fallbackProfile = getAtcProfile('C09AA99');
  assert.ok(fallbackProfile, 'Fallback profile must resolve');
  assert.strictEqual(fallbackProfile.systemCode, 'C');
  assert.strictEqual(fallbackProfile.groupCode, 'C09');

  // 5. Cross-Interaction Checker
  // Prescription: Rosuvastatin (C10AA07) + Clarithromycin (J01FA09)
  const crossAlerts = checkAtcInteractions([
    { brand: 'CRESTOR 20 MG', atcCode: 'C10AA07' },
    { brand: 'KLACID 500 MG', atcCode: 'J01FA09' }
  ]);
  assert.ok(crossAlerts.length > 0, 'Must trigger interaction between Statin and Macrolide');
  assert.ok(crossAlerts.some(a => a.sourceDrugBrand?.includes('CRESTOR') || a.targetDrugBrand?.includes('CRESTOR')), 'Must identify involved drug brand');

  console.log('✓ ATC Knowledge Base and Taxonomy Engine fully verified (100% healthy)');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
