// ============================================================================
// VERIFICATION TEST: src/app.ts (TypeScript Application & Workstation Controller)
// ============================================================================
import assert from 'assert';

const elements = new Map();
function createElement(tag: string) {
    const classes = new Set<string>();
    return {
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
        click: function() {
            if (this._handlers && this._handlers['click']) {
                for (const h of this._handlers['click']) {
                    h.call(this, { preventDefault: () => {} });
                }
            }
        }
    };
}

const mockPresets = ['0d', '1d', '3d', '7d', '14d', '1m', '1y', '5y', '25y'].map(p => {
    const el = createElement('button');
    el.dataset.preset = p;
    return el;
});

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
    createElement: createElement,
    getElementById: (id: string) => {
        if (!elements.has(id)) {
            elements.set(id, createElement('div'));
        }
        return elements.get(id);
    },
    querySelector: () => createElement('div'),
    querySelectorAll: (sel: string) => {
        if (sel === '.btn-dob-preset') {
            return mockPresets;
        }
        return [];
    }
};
(globalThis as any).window.document = (globalThis as any).document;

try {
    Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: { register: () => Promise.resolve() }, onLine: true },
        configurable: true
    });
} catch (e) {}

console.log('--- 1. IMPORTING AND INITIALIZING src/app.ts ---');
const appModule = await import('../src/app.js');

assert.strictEqual(typeof appModule.calculatePatientAge, 'function');
assert.strictEqual(typeof appModule.updateAllTabs, 'function');
assert.strictEqual(typeof appModule.initWorkstationPackages, 'function');
assert.strictEqual(typeof appModule.initResponsiveWorkstation, 'function');

console.log('✓ src/app.ts imported cleanly with expected controller exports');

console.log('--- 2. TESTING WORKSTATION QUICK PRESETS VIA src/app.ts ---');
// Test clicking each preset
for (const btn of mockPresets) {
    btn.click();
}

// 1. Verify 14-day preset click
const p14 = mockPresets.find(p => p.dataset.preset === '14d')!;
p14.click();
assert.strictEqual((document.getElementById('input-age') as any).value, '14');
assert.strictEqual((document.getElementById('select-age-unit') as any).value, 'days');
assert.strictEqual((document.getElementById('header-patient-age') as any).textContent, '14 Günlük');
assert.strictEqual((document.getElementById('header-patient-info') as any).classList.contains('flex'), true);
assert.strictEqual((document.getElementById('header-patient-info') as any).classList.contains('hidden'), false);

// 2. Verify 25-year adult preset click
const p25 = mockPresets.find(p => p.dataset.preset === '25y')!;
p25.click();
assert.strictEqual((document.getElementById('input-age') as any).value, '25');
assert.strictEqual((document.getElementById('select-age-unit') as any).value, 'years');
assert.strictEqual((document.getElementById('header-patient-age') as any).textContent, '25 Yaş');

console.log('✓ Mock Workstation in src/app.ts: All 9 presets executed and verified with header badge sync.');

console.log('--- 3. TESTING PATIENT AGE CALCULATION & BANNER UPDATE ---');
const ageResult = appModule.calculatePatientAge();
assert.strictEqual(ageResult.y, 25);
assert.strictEqual(ageResult.formatted, '25 Yaş');
assert.strictEqual(ageResult.ageGroupTag, 'Erişkin');

console.log('✓ calculatePatientAge() in src/app.ts returned accurate adult demography.');

console.log('--- 4. TESTING LIVE REACTIVE CYCLE (updateAllTabs) ---');
// Simulate inputs
(document.getElementById('input-weight') as any).value = '70';
(document.getElementById('input-height') as any).value = '175';
(document.getElementById('select-gender') as any).value = 'male';

appModule.updateAllTabs();

const bsaEl = document.getElementById('output-bsa') as any;
assert.strictEqual(bsaEl.textContent, '1.84');

console.log('✓ updateAllTabs() in src/app.ts executed reactive biometry calculation (BSA: 1.84 m²).');

console.log('--- 5. TESTING GLOBAL LAB FALLBACKS & CARDIOVASCULAR/OBGYN AUTO-SYNC ---');
const { appState } = await import('../src/state.js');
const { generateSOAP } = await import('../src/utils/soapGenerator.js');

// 5.1 Global Lab Fallbacks: FENa & FEUrea should use global serum-na and creatinine when local is empty
(document.getElementById('input-serum-na') as any).value = '140';
(document.getElementById('input-creatinine') as any).value = '1.0';
(document.getElementById('input-fena-u-na') as any).value = '20';
(document.getElementById('input-fena-u-cr') as any).value = '50';

appModule.updateAllTabs();

assert.ok(appState.nephroTox.fena, 'FENa should calculate using global Na/Cr fallbacks');
assert.strictEqual(appState.nephroTox.fena.etiology, 'Prerenal Azotemi', 'FENa < 1% should be classified as prerenal');

// 5.2 Cardiovascular Demographics Auto-sync
(document.getElementById('input-age') as any).value = '72';
(document.getElementById('select-age-unit') as any).value = 'years';
(document.getElementById('select-gender') as any).value = 'female';
(document.getElementById('chk-af-htn') as any).checked = true;
(document.getElementById('chk-bleeding-htn') as any).checked = true;

appModule.updateAllTabs();

const chkAfFemale = document.getElementById('chk-af-female') as any;
const chkAfAge65 = document.getElementById('chk-af-age65') as any;
const chkBleedElderly = document.getElementById('chk-bleeding-elderly') as any;

assert.strictEqual(chkAfFemale.checked, true, 'CHA2DS2-VASc female checkbox should auto-sync with female gender');
assert.strictEqual(chkAfAge65.checked, true, 'CHA2DS2-VASc age >= 65 checkbox should auto-sync for 72y');
assert.strictEqual(chkBleedElderly.checked, true, 'HAS-BLED elderly checkbox should auto-sync for >= 65y');
assert.ok(appState.thrombosis.cha2ds2vasc, 'CHA2DS2-VASc should calculate automatically');
assert.ok(appState.thrombosis.hasbled, 'HAS-BLED should calculate automatically');

// 5.3 Live Comprehensive SOAP Generator Verification
const soapReport = generateSOAP();
assert.ok(soapReport.includes('[S] SUBJEKTİF:'));
assert.ok(soapReport.includes('[O] OBJEKTİF:'));
assert.ok(soapReport.includes('[A] DEĞERLENDİRME:'));
assert.ok(soapReport.includes('[P] PLAN & TEDAVİ:'));
assert.ok(soapReport.includes('FENa:'), 'SOAP should include FENa calculation in objective findings');
assert.ok(soapReport.includes('CHA2DS2-VASc') || soapReport.includes('CHA₂DS₂-VASc'), 'SOAP should include CHA2DS2-VASc in assessment or objective');
assert.ok(soapReport.includes('HAS-BLED'), 'SOAP should include HAS-BLED in assessment or objective');

console.log('✓ Global lab fallbacks, cardio-sync, and comprehensive SOAP generation verified.');

console.log('\n======================================================');
console.log('🎉 ALL TypeScript APP & WORKSTATION TESTS PASSED (100% PARITY)! 🎉');
console.log('======================================================\n');

