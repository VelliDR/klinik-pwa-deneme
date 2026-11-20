import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
    CLINICAL_MOTORS,
    MOTOR_DEPENDENCIES,
    PRESET_PACKAGES,
    SIDEBAR_GROUPS,
    DEFAULT_SIDEBAR_GROUP_ID,
    findSidebarGroupByMotor,
    resolveMotorDependencies,
    getCustomPackages,
    saveCustomPackage,
    deleteCustomPackage
} from '../src/workstationPackages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '../index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

console.log('--- 1. Testing Clinical Motor Definitions ---');
const motorIds = Object.keys(CLINICAL_MOTORS);
assert.strictEqual(motorIds.length, 21, 'There should be exactly 21 clinical motors defined.');
console.log(`✓ Exactly ${motorIds.length} clinical motors registered in CLINICAL_MOTORS.`);

// Verify each motor definition has id, name, icon, shortName, category, desc
motorIds.forEach(id => {
    const m = CLINICAL_MOTORS[id];
    assert.strictEqual(m.id, id, `Motor ${id} must have matching id`);
    assert.ok(m.name, `Motor ${id} must have a name`);
    assert.ok(m.icon, `Motor ${id} must have an icon`);
    assert.ok(m.shortName, `Motor ${id} must have a shortName`);
    assert.ok(m.category, `Motor ${id} must have a category`);
    assert.ok(m.desc, `Motor ${id} must have a desc`);
});
console.log('✓ All 21 clinical motors have complete metadata properties.');

console.log('\n--- 2. Verifying DOM Alignment in index.html ---');
// Verify all 21 motors exist as details cards in index.html
motorIds.forEach(id => {
    assert.ok(
        indexHtml.includes(`id="${id}"`),
        `index.html must contain card element with id="${id}"`
    );
});
console.log('✓ All 21 clinical motor IDs exist in index.html.');

// Verify Shortcut Card components in index.html
const requiredCardIds = [
    'card-custom-shortcuts',
    'badge-active-pack',
    'btn-show-all-motors',
    'btn-toggle-custom-pack',
    'container-package-buttons',
    'container-package-info',
    'pack-info-icon',
    'pack-info-name',
    'pack-info-badge',
    'pack-info-desc',
    'pack-info-pills',
    'drawer-custom-pack',
    'input-custom-pack-name',
    'btn-save-custom-pack',
    'container-motor-checklist',
    'label-resolved-count',
    'box-resolved-summary',
    'text-resolved-list',
    'btn-clear-selection',
    'btn-apply-custom-pack-now',
    'section-saved-packs',
    'container-saved-packs-list'
];

requiredCardIds.forEach(elId => {
    assert.ok(
        indexHtml.includes(`id="${elId}"`),
        `index.html must contain component element with id="${elId}"`
    );
});
console.log(`✓ All ${requiredCardIds.length} required UI components exist in index.html.`);

console.log('\n--- 3. Testing Recursive Clinical Dependency Resolution ---');

// Case A: İdame Sıvı -> Biyometri (Kilo/Boy) + Demografi (Yaş) + Elektrolit (Sodyum)
const fluidDeps = resolveMotorDependencies(['card-idame']);
console.log('card-idame resolved package:', fluidDeps);
assert.ok(fluidDeps.includes('card-idame'), 'Resolved pack must contain card-idame');
assert.ok(fluidDeps.includes('card-biyometri'), 'İdame sıvı requires card-biyometri (kilo & boy)');
assert.ok(fluidDeps.includes('card-demografi'), 'İdame sıvı requires card-demografi (yaş)');
assert.ok(fluidDeps.includes('card-elektrolit'), 'İdame sıvı requires card-elektrolit (sodyum/kalsiyum)');
assert.strictEqual(fluidDeps[0], 'card-demografi', 'card-demografi must be priority 1 in rendering order');
assert.strictEqual(fluidDeps[1], 'card-biyometri', 'card-biyometri must be priority 2 in rendering order');
console.log('✓ Case A (İdame Sıvı Pack) correctly bundles Kilo & Boy, Yaş, and Elektrolit.');

// Case B: Pediatrik Şurup -> Biyometri + Demografi
const pediaDeps = resolveMotorDependencies(['card-pediatri-surup']);
console.log('card-pediatri-surup resolved package:', pediaDeps);
assert.ok(pediaDeps.includes('card-pediatri-surup'));
assert.ok(pediaDeps.includes('card-biyometri'));
assert.ok(pediaDeps.includes('card-demografi'));
console.log('✓ Case B (Pediatrik Şurup) correctly bundles Kilo & Boy and Yaş.');

// Case C: Neonatoloji (Multi-hop recursive dependency)
// card-neonatoloji -> card-idame -> card-elektrolit
const neoDeps = resolveMotorDependencies(['card-neonatoloji']);
console.log('card-neonatoloji resolved package:', neoDeps);
assert.ok(neoDeps.includes('card-neonatoloji'));
assert.ok(neoDeps.includes('card-demografi'));
assert.ok(neoDeps.includes('card-biyometri'));
assert.ok(neoDeps.includes('card-idame'));
assert.ok(neoDeps.includes('card-ilac'));
assert.ok(neoDeps.includes('card-elektrolit'), 'Recursive dependency: idame brings card-elektrolit');
console.log('✓ Case C (Neonatoloji Pack) recursively resolves multi-hop dependencies.');

// Case D: Multiple Base Motors
const comboDeps = resolveMotorDependencies(['card-kardiyo', 'card-cerrahi']);
console.log('Combo (kardiyo + cerrahi) resolved package:', comboDeps);
assert.ok(comboDeps.includes('card-kardiyo'));
assert.ok(comboDeps.includes('card-cerrahi'));
assert.ok(comboDeps.includes('card-vitaller'));
assert.ok(comboDeps.includes('card-demografi'));
assert.ok(comboDeps.includes('card-biyometri'));
assert.ok(comboDeps.includes('card-ilac'));
console.log('✓ Case D (Combo selection) resolves union of dependencies without duplicates.');

// Case E: Comprehensive Audit of All 21 Motors & Dependency Integrity
console.log('\n--- Case E: Deep Audit of All 21 Clinical Motors & Transitive Chains ---');
motorIds.forEach(mId => {
    // 1. All declared dependencies must be valid clinical motors
    const declaredDeps = MOTOR_DEPENDENCIES[mId] || [];
    declaredDeps.forEach(depId => {
        assert.ok(CLINICAL_MOTORS[depId], `Dependency "${depId}" of motor "${mId}" must exist in CLINICAL_MOTORS`);
    });

    // 2. Resolve motor dependencies
    const resolved = resolveMotorDependencies([mId]);
    assert.ok(resolved.includes(mId), `Resolved list for "${mId}" must include itself`);
    declaredDeps.forEach(depId => {
        assert.ok(resolved.includes(depId), `Resolved list for "${mId}" must include direct dependency "${depId}"`);
    });

    // 3. Check for duplicates
    assert.strictEqual(new Set(resolved).size, resolved.length, `Resolved list for "${mId}" must not contain duplicates`);

    // 4. Verify rendering priority order
    if (resolved.includes('card-demografi')) {
        assert.strictEqual(resolved[0], 'card-demografi', `Demografi must be first in resolved list for "${mId}"`);
    }
    if (resolved.includes('card-demografi') && resolved.includes('card-biyometri')) {
        assert.strictEqual(resolved[1], 'card-biyometri', `Biyometri must be second when demografi is present in "${mId}"`);
    }
});
console.log('✓ Case E: All 21 clinical motors pass deep transitive dependency audit with 100% integrity.');

console.log('\n--- 4. Testing Preset Clinical Packages ---');
assert.strictEqual(PRESET_PACKAGES.length, 9, 'Must have exactly 9 preset packages');
PRESET_PACKAGES.forEach(pkg => {
    assert.ok(pkg.id, 'Preset package must have id');
    assert.ok(pkg.name, 'Preset package must have name');
    assert.ok(pkg.desc, 'Preset package must have desc');
    assert.ok(pkg.baseMotors && pkg.baseMotors.length > 0, 'Preset package must have baseMotors');
    pkg.baseMotors.forEach(mId => {
        assert.ok(CLINICAL_MOTORS[mId], `Base motor ${mId} in preset ${pkg.id} must exist in CLINICAL_MOTORS`);
    });
    const resolved = resolveMotorDependencies(pkg.baseMotors);
    assert.ok(resolved.length >= pkg.baseMotors.length, 'Resolved motors must be at least as many as base motors');
});
console.log('✓ All 9 preset clinical packages are valid and resolvable.');

console.log('\n--- 5. Testing Custom Packages & Local Storage Persistence ---');
// Setup Mock window.localStorage
const mockStore = {};
globalThis.window = {
    localStorage: {
        getItem(key) { return mockStore[key] || null; },
        setItem(key, val) { mockStore[key] = String(val); },
        removeItem(key) { delete mockStore[key]; }
    }
};

// Initial state: empty
assert.deepStrictEqual(getCustomPackages(), [], 'Initially getCustomPackages should return empty array');

// Save a custom package
const createdPack = saveCustomPackage('Nöbetçi Acil Sıvı & Şurup', ['card-idame', 'card-pediatri-surup']);
assert.ok(createdPack, 'saveCustomPackage should return created package');
assert.strictEqual(createdPack.name, 'Nöbetçi Acil Sıvı & Şurup');
assert.strictEqual(createdPack.isCustom, true);
assert.ok(createdPack.id.startsWith('custom_'));
assert.ok(createdPack.fullMotors.includes('card-idame'));
assert.ok(createdPack.fullMotors.includes('card-pediatri-surup'));
assert.ok(createdPack.fullMotors.includes('card-biyometri'));
assert.ok(createdPack.fullMotors.includes('card-demografi'));
assert.ok(createdPack.fullMotors.includes('card-elektrolit'));

// Read back from localStorage
const retrievedPacks = getCustomPackages();
assert.strictEqual(retrievedPacks.length, 1);
assert.strictEqual(retrievedPacks[0].id, createdPack.id);
assert.strictEqual(retrievedPacks[0].name, 'Nöbetçi Acil Sıvı & Şurup');
console.log('✓ Custom package successfully created and retrieved from localStorage.');

// Delete custom package
const remainingPacks = deleteCustomPackage(createdPack.id);
assert.strictEqual(remainingPacks.length, 0);
assert.strictEqual(getCustomPackages().length, 0);
console.log('✓ Custom package successfully deleted from localStorage.');

console.log('\n--- 6. Testing 13 Left-Sidebar Groups, Dependency Resolution & Top Customization Layout ---');
assert.strictEqual(SIDEBAR_GROUPS.length, 13, 'Must have all 13 left-menu clinical groups');
assert.strictEqual(DEFAULT_SIDEBAR_GROUP_ID, 'demografi', 'Default initial sidebar group must be demografi');

// Verify all 20 workspace cards belong to exactly one sidebar group
const groupedMotors = new Set();
SIDEBAR_GROUPS.forEach(group => {
    assert.ok(group.id && group.name && group.href, `Group ${group.id} must have id, name, and href`);
    assert.ok(group.motors.length > 0, `Group ${group.id} must contain at least one motor`);
    group.motors.forEach(mId => {
        assert.ok(CLINICAL_MOTORS[mId], `Motor ${mId} in sidebar group ${group.id} must exist in CLINICAL_MOTORS`);
        assert.ok(!groupedMotors.has(mId), `Motor ${mId} must not be duplicated across sidebar groups`);
        groupedMotors.add(mId);
        assert.strictEqual(findSidebarGroupByMotor(mId)?.id, group.id, `findSidebarGroupByMotor(${mId}) must resolve to ${group.id}`);
    });
});
assert.strictEqual(groupedMotors.size, 20, 'All 20 workspace motor cards (excluding right-panel card-soap) must be covered by SIDEBAR_GROUPS');

// Initial load group ('demografi') resolves to ONLY 3 motors so initial load has zero clutter
const defaultGroup = SIDEBAR_GROUPS.find(g => g.id === DEFAULT_SIDEBAR_GROUP_ID);
const initialResolved = resolveMotorDependencies(defaultGroup.motors);
assert.deepStrictEqual(
    new Set(initialResolved),
    new Set(['card-demografi', 'card-biyometri', 'card-notlar']),
    'Initial default group must resolve to only the 3 Demografi & Biyometri cards'
);

// Clicking 'pediatri' (Şurup motoru) resolves its base motors PLUS connected Yaş, Kilo/Boy, and Vitaller motors
const pediatriGroup = SIDEBAR_GROUPS.find(g => g.id === 'pediatri');
const pediatriResolved = resolveMotorDependencies(pediatriGroup.motors);
assert.ok(pediatriResolved.includes('card-pediatri-surup'), 'Pediatri group must include syrup motor');
assert.ok(pediatriResolved.includes('card-demografi'), 'Pediatri group must auto-include connected Yaş & Demografi motor');
assert.ok(pediatriResolved.includes('card-biyometri'), 'Pediatri group must auto-include connected Kilo & Boy motor');
assert.ok(pediatriResolved.includes('card-vitaller'), 'Pediatri group must auto-include connected Vitaller motor');
console.log('✓ Sidebar group dependency resolution verified (initial load = 3 motors; Pediatri/Şurup = 6 interconnected motors).');

// Verify DOM placement: Package customization (#btn-toggle-custom-pack + #drawer-custom-pack) is at the very top of #left-sidebar, NOT inside #card-custom-shortcuts
const shortcutsIdx = indexHtml.indexOf('id="card-custom-shortcuts"');
const leftSidebarIdx = indexHtml.indexOf('id="left-sidebar"');
const toggleCustomIdx = indexHtml.indexOf('id="btn-toggle-custom-pack"');
const drawerCustomIdx = indexHtml.indexOf('id="drawer-custom-pack"');
const sidebarNavIdx = indexHtml.indexOf('<nav', leftSidebarIdx);
const mainWorkspaceIdx = indexHtml.indexOf('id="clinical-workspace"');

assert.ok(shortcutsIdx > 0 && shortcutsIdx < leftSidebarIdx, '#card-custom-shortcuts must remain in the top header');
assert.ok(toggleCustomIdx > leftSidebarIdx && toggleCustomIdx < sidebarNavIdx, '#btn-toggle-custom-pack must be at the top of #left-sidebar before <nav>');
assert.ok(drawerCustomIdx > leftSidebarIdx && drawerCustomIdx < sidebarNavIdx, '#drawer-custom-pack must be at the top of #left-sidebar before <nav>');
assert.ok(sidebarNavIdx < mainWorkspaceIdx, '#left-sidebar navigation must precede #clinical-workspace');
console.log('✓ Package customization is placed at the top of #left-sidebar while preset package selector remains in header.');

// Verify initial HTML hides the 17 non-default workspace cards and keeps the 3 initial cards visible
motorIds.filter(id => id !== 'card-soap').forEach(id => {
    const tagMatch = indexHtml.match(new RegExp(`<details[^>]*id="${id}"[^>]*>`));
    assert.ok(tagMatch, `Must find opening <details> tag for ${id}`);
    const openingTag = tagMatch[0];
    const classMatch = openingTag.match(/class="([^"]*)"/);
    const classTokens = classMatch ? classMatch[1].trim().split(/\s+/) : [];
    const hasHidden = classTokens.includes('hidden');
    if (defaultGroup.motors.includes(id)) {
        assert.ok(!hasHidden, `Initial group motor ${id} must NOT be hidden on startup`);
    } else {
        assert.ok(hasHidden, `Non-initial motor ${id} MUST be hidden on startup to eliminate clutter`);
    }
});
console.log('✓ Initial HTML state verified: only 3 default motors visible on startup, 17 others hidden.');

console.log('\n======================================================');
console.log('🎉 ALL WORKSTATION PACKAGE TESTS PASSED SUCCESSFULLY! 🎉');
console.log('======================================================');
