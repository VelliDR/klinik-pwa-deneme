// ============================================================================
// STRESS & CROSS-ENGINE INTERACTION VERIFICATION TEST
// Boşluk, Uç Değerler, Çapraz Motor İletişimi ve Sonsuz Döngü Kalkanı Doğrulaması
// ============================================================================
import assert from 'assert';

const elements = new Map<string, any>();
function createElement(tag: string, id: string = '') {
    const classes = new Set<string>();
    return {
        id,
        tagName: tag.toUpperCase(),
        value: '',
        innerHTML: '',
        innerText: '',
        textContent: '',
        checked: false,
        style: {} as Record<string, string>,
        classList: {
            add: (...cls: string[]) => cls.forEach(c => classes.add(c)),
            remove: (...cls: string[]) => cls.forEach(c => classes.delete(c)),
            toggle: (c: string) => classes.has(c) ? classes.delete(c) : classes.add(c),
            contains: (c: string) => classes.has(c)
        },
        dataset: {} as Record<string, string>,
        getAttribute: function(name: string) {
            if (name.startsWith('data-')) {
                const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                return this.dataset[key] || null;
            }
            return null;
        },
        setAttribute: function(name: string, val: string) {
            if (name.startsWith('data-')) {
                const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                this.dataset[key] = val;
            }
        },
        children: [] as any[],
        appendChild: (c: any) => c,
        _handlers: {} as Record<string, Function[]>,
        addEventListener: function(event: string, handler: Function) {
            this._handlers[event] = this._handlers[event] || [];
            this._handlers[event].push(handler);
        },
        dispatchEvent: function(event: any) {
            const handlers = this._handlers[event.type] || [];
            for (const h of handlers) h.call(this, event);
        },
        click: function() {
            if (this._handlers && this._handlers['click']) {
                for (const h of this._handlers['click']) {
                    h.call(this, { preventDefault: () => {} });
                }
            }
        }
    };
}

(globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    navigator: { onLine: true, serviceWorker: { register: () => Promise.resolve() } },
    document: null,
    location: { reload: () => {} }
};
(globalThis as any).indexedDB = { open: () => ({ onupgradeneeded: null, onsuccess: null, onerror: null }) };

(globalThis as any).document = {
    readyState: 'complete',
    addEventListener: () => {},
    createElement: (tag: string) => createElement(tag),
    getElementById: (id: string) => {
        if (!elements.has(id)) {
            elements.set(id, createElement('div', id));
        }
        return elements.get(id);
    },
    querySelector: () => createElement('div'),
    querySelectorAll: () => []
};
(globalThis as any).window.document = (globalThis as any).document;

console.log('--- 1. IMPORTING APP & CONTROLLERS ---');
const appModule = await import('../src/app.js');
const { appState } = await import('../src/state.js');
const { resolveMotorDependencies, CLINICAL_MOTORS } = await import('../src/workstationPackages.js');
const { generateSOAP } = await import('../src/utils/soapGenerator.js');

console.log('✓ Modules imported cleanly.');

// ----------------------------------------------------------------------------
// TEST 1: BOŞ KALAN DEĞERLER VE SIFIR DURUMU (ZERO/EMPTY STATE STRESS TEST)
// ----------------------------------------------------------------------------
console.log('--- 2. TESTING COMPLETELY EMPTY INPUTS (NO CRASH, NO HANG) ---');
for (const [id, el] of elements.entries()) {
    el.value = '';
    el.checked = false;
    el.textContent = '';
    el.innerHTML = '';
}

assert.doesNotThrow(() => {
    appModule.updateAllTabs();
}, 'updateAllTabs() must never throw on completely empty DOM values');

assert.strictEqual(appState.biometry.ageYears, null);
assert.strictEqual(appState.biometry.weightKg, null);
assert.strictEqual(appState.biometry.heightCm, null);
assert.strictEqual(appState.biometry.bsa, null);
assert.strictEqual(appState.biometry.egfr, null);
assert.strictEqual(appState.safetyPrescription.selectedSafetyDrugs.length, 0);
assert.strictEqual(appState.thrombosis.cha2ds2vasc, null);
assert.strictEqual(appState.thrombosis.hasbled, null);
assert.strictEqual(appState.thrombosis.wellsDVT, null);
assert.strictEqual(appState.thrombosis.wellsPTE, null);
assert.strictEqual(appState.pediatrics.syrupDose, null);
assert.strictEqual(appState.neonatology.bhutani, null);

const emptySoap = generateSOAP();
assert.ok(emptySoap.includes('[S] SUBJEKTİF:'), 'Empty SOAP should render structure without crash');
console.log('✓ Case 1 Passed: Completely empty inputs execute without crash or hanging.');

// ----------------------------------------------------------------------------
// TEST 2: UÇ / GEÇERSİZ / NEGATİF / SIFIR DEĞERLER (EXTREME / INVALID INPUTS)
// ----------------------------------------------------------------------------
console.log('--- 3. TESTING EXTREME & INVALID VALUES (ZERO, NEGATIVE, OVERFLOW) ---');
(document.getElementById('input-age') as any).value = '-5';
(document.getElementById('input-weight') as any).value = '0';
(document.getElementById('input-height') as any).value = '-120';
(document.getElementById('input-creatinine') as any).value = '0';
(document.getElementById('input-serum-na') as any).value = '0';
(document.getElementById('input-glucose') as any).value = '-100';

assert.doesNotThrow(() => {
    appModule.updateAllTabs();
}, 'updateAllTabs() must safely clamp zero or negative biometrics without division-by-zero');

console.log('✓ Case 2 Passed: Extreme and zero/negative inputs handled safely.');

// ----------------------------------------------------------------------------
// TEST 3: ÇAPRAZ MOTOR ETKİLEŞİMİ (CROSS-ENGINE COMMUNICATION)
// ----------------------------------------------------------------------------
console.log('--- 4. TESTING CROSS-MOTOR COMMUNICATION PIPELINES ---');

// A. Biometry -> Pediatrics Syrup & BSA
(document.getElementById('input-age') as any).value = '4';
(document.getElementById('select-age-unit') as any).value = 'years';
(document.getElementById('input-weight') as any).value = '16';
(document.getElementById('input-height') as any).value = '102';
(document.getElementById('select-gender') as any).value = 'male';
(document.getElementById('select-ped-syrup') as any).value = 'paracetamol_120';

appModule.updateAllTabs();

assert.ok(appState.biometry.bsa, 'BSA should be calculated');
assert.strictEqual(appState.biometry.ageYears, 4);
assert.ok(appState.pediatrics.syrupDose, 'Pediatric syrup dose should be calculated using biometry weight');
assert.ok(appState.pediatrics.syrupDose.name.includes('Parasetamol'));
console.log('✓ Pipeline A: Biometry -> Pediatric Syrup communication verified.');

// B. Demographics -> CHA2DS2-VASc & HAS-BLED Auto-sync
(document.getElementById('input-age') as any).value = '76';
(document.getElementById('select-gender') as any).value = 'female';
(document.getElementById('chk-af-htn') as any).checked = true;
(document.getElementById('chk-bleeding-htn') as any).checked = true;

appModule.updateAllTabs();

assert.strictEqual((document.getElementById('chk-af-female') as any).checked, true, 'CHA2DS2 female should auto-check');
assert.strictEqual((document.getElementById('chk-af-age75') as any).checked, true, 'CHA2DS2 >=75 should auto-check');
assert.strictEqual((document.getElementById('chk-bleeding-elderly') as any).checked, true, 'HAS-BLED elderly should auto-check');
assert.ok(appState.thrombosis.cha2ds2vasc, 'CHA2DS2-VASc should calculate');
assert.ok(appState.thrombosis.cha2ds2vasc.score >= 4, 'Score should reflect female(1) + age75(2) + htn(1) = 4');
assert.ok(appState.thrombosis.hasbled, 'HAS-BLED should calculate');
console.log('✓ Pipeline B: Demographics -> Thrombosis auto-sync verified.');

// C. Global Labs Fallbacks -> NephroTox
(document.getElementById('input-serum-na') as any).value = '132';
(document.getElementById('input-creatinine') as any).value = '1.8';
(document.getElementById('input-fena-u-na') as any).value = '15';
(document.getElementById('input-fena-u-cr') as any).value = '45';

appModule.updateAllTabs();

assert.ok(appState.nephroTox.fena, 'FENa should calculate using global Na & Creatinine fallbacks');
console.log('✓ Pipeline C: Global Labs Fallbacks -> NephroTox FENa verified.');

// D. OBGYN -> Safety Alerts Trimester Auto-sync
(document.getElementById('input-age') as any).value = '28';
(document.getElementById('select-gender') as any).value = 'female';
(document.getElementById('input-lmp') as any).value = '2026-06-01'; // ~21 weeks pregnant -> 2nd trimester
(document.getElementById('select-safety-trimester') as any).value = '0'; // default unselected

appModule.updateAllTabs();

assert.ok(appState.obgyn.eddData, 'OBGYN EDD should calculate from LMP');
assert.strictEqual(appState.obgyn.eddData.trimester, 2, 'Should be 2nd trimester');
assert.strictEqual((document.getElementById('select-safety-trimester') as any).value, '2', 'Safety trimester select must auto-sync with OBGYN trimester');
console.log('✓ Pipeline D: OBGYN Trimester -> Safety Alerts auto-sync verified.');

// E. Safety Shield -> Alerts Inspector & Status Badge
appState.treatment = {
    selectedDrugs: [
        { brand: 'Ramipril 5mg', generic: 'Ramipril' },
        { brand: 'Lasix 40mg', generic: 'Furosemid' },
        { brand: 'Apranax 550mg', generic: 'Naproksen' }
    ]
};

appModule.updateAllTabs();

assert.ok(appState.safetyPrescription.tripleWhammy?.isTripleWhammy, 'Triple Whammy AKI should be detected');
const twAlertEl = document.getElementById('alert-item-tw') as any;
assert.strictEqual(twAlertEl.classList.contains('hidden'), false, 'Triple Whammy alert item in Inspector must be visible');
const totalAlertsBadge = document.getElementById('badge-total-alerts') as any;
assert.ok(totalAlertsBadge.textContent.includes('Uyarı'), 'Total alerts badge must count the warning');
console.log('✓ Pipeline E: Safety Shield Triple Whammy -> Alerts Inspector sync verified.');

// ----------------------------------------------------------------------------
// TEST 4: MOTOR BAĞIMLILIK ÇÖZÜCÜ SONSUZ DÖNGÜ VE PERFORMANS TESTİ
// ----------------------------------------------------------------------------
console.log('--- 5. TESTING MOTOR DEPENDENCY RESOLVER TERMINATION & CYCLES ---');

// Circular/Recursive resolution stress test
const testCases = [
    [],
    ['card-demografi'],
    ['card-demografi', 'card-demografi', 'card-demografi'],
    ['card-pediatri-surup', 'card-neonatoloji', 'card-kardiyo', 'card-cerrahi'],
    Object.keys(CLINICAL_MOTORS),
    ['non-existent-motor-1', 'non-existent-motor-2']
];

for (const tc of testCases) {
    const t0 = performance.now();
    const res = resolveMotorDependencies(tc);
    const duration = performance.now() - t0;
    assert.ok(duration < 15, `Dependency resolution took too long: ${duration}ms`);
    assert.ok(Array.isArray(res));
    // Verify uniqueness
    const set = new Set(res);
    assert.strictEqual(set.size, res.length, 'Resolved motors must never contain duplicates');
}
console.log('✓ Case 4 Passed: resolveMotorDependencies() terminates instantaneously (<15ms) with 0 cycles.');

console.log('\n======================================================');
console.log('🎉 ALL CROSS-ENGINE & STRESS VERIFICATION TESTS PASSED! 🎉');
console.log('======================================================\n');
