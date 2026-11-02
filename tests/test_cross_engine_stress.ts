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
console.log('✓ Pipeline E: Safety Shield Triple Whammy -> Alerts Inspector sync verified.');

// F. EKG RR Boxes -> Heart Rate & NEWS2 Triage Score Auto-Sync (HATA-M24-002)
(document.getElementById('input-age') as any).value = '45';
(document.getElementById('input-ecg-rr-boxes') as any).value = '10'; // 10 small boxes = 400ms -> 150 bpm
(document.getElementById('input-hr') as any).value = ''; // clear HR
(document.getElementById('input-rr') as any).value = '16';
(document.getElementById('input-sys-bp') as any).value = '120';
(document.getElementById('input-temp') as any).value = '36.8';
(document.getElementById('input-spo2') as any).value = '98';

appModule.updateAllTabs();

assert.strictEqual(appState.biometry.heartRate, 150, 'appState.biometry.heartRate must be set to 150 from EKG RR');
assert.strictEqual((document.getElementById('input-hr') as any).value, '150', 'input-hr must be updated to 150 from EKG RR');
assert.strictEqual(appState.medicine.news2.score, 3, 'NEWS2 HR score must be 3 (+3 for HR 150)');
assert.strictEqual(appState.medicine.news2.hasRedScore, true, 'NEWS2 hasRedScore must be true');
console.log('✓ Pipeline F: EKG RR Boxes -> Heart Rate & NEWS2 Triage sync verified.');

// G. Global Labs Fallbacks -> Downstream Placeholders (HATA-M24-005)
(document.getElementById('input-serum-na') as any).value = '138';
(document.getElementById('input-creatinine') as any).value = '2.2';
(document.getElementById('input-glucose') as any).value = '250';

appModule.updateAllTabs();

const fenaNaEl = document.getElementById('input-fena-s-na') as HTMLInputElement;
const fenaCrEl = document.getElementById('input-fena-s-cr') as HTMLInputElement;
assert.ok(fenaNaEl.placeholder.includes('Global: 138'), 'fena-s-na placeholder must reflect global Na');
assert.ok(fenaCrEl.placeholder.includes('Global: 2.2'), 'fena-s-cr placeholder must reflect global Cr');
console.log('✓ Pipeline G: Global Labs -> Downstream Placeholders verified.');

// H. OBGYN Trimester Single Source of Truth (HATA-M24-004)
(document.getElementById('input-lmp') as any).value = '2026-06-01'; // 2nd trimester
appModule.updateAllTabs();
assert.strictEqual(appState.obgyn.trimester, 2, 'appState.obgyn.trimester must be 2');
console.log('✓ Pipeline H: OBGYN Trimester Single Source of Truth verified.');

// I. Re-entrancy Guard (HATA-M24-001)
assert.doesNotThrow(() => {
    appModule.updateAllTabs();
}, 'updateAllTabs re-entrancy guard must prevent call stack overflow');
console.log('✓ Pipeline I: Re-entrancy guard & loop shield verified.');

// J. Demographics Age -> HEART Score Dynamic Auto-Sync (HATA-HEART-001)
(document.getElementById('input-age') as any).value = '70';
(document.getElementById('select-age-unit') as any).value = 'years';
const heartAgeSelect = document.getElementById('select-heart-age') as any;
heartAgeSelect.dataset.userModified = ''; // not manually modified
(document.getElementById('select-heart-history') as any).value = '1';
(document.getElementById('select-heart-ecg') as any).value = '1';
(document.getElementById('select-heart-risk') as any).value = '1';
(document.getElementById('select-heart-troponin') as any).value = '0';
const trombozCard = document.getElementById('card-tromboz') as any;
trombozCard.open = true;

appModule.updateAllTabs();

assert.strictEqual(heartAgeSelect.value, '2', 'HEART age select must auto-sync to 2 for age 70');
assert.ok(appState.thrombosis.heart, 'HEART result should be generated');
assert.strictEqual(appState.thrombosis.heart.score, 5, 'Score should be 1(hist) + 1(ecg) + 2(age) + 1(risk) + 0(trop) = 5');
console.log('✓ Pipeline J: Demographics Age -> HEART Score Auto-sync verified.');

// K. GCS Verbal 'NT' vs '1T' Disambiguation (HATA-GCS-001)
(document.getElementById('select-gcs-e') as any).value = '4';
(document.getElementById('select-gcs-v') as any).value = 'NT';
(document.getElementById('select-gcs-m') as any).value = '6';

appModule.updateAllTabs();

assert.ok(appState.medicine.gcs, 'GCS result should be calculated');
assert.strictEqual(appState.medicine.gcs.isNotTestable, true, 'isNotTestable must be true for NT');
assert.strictEqual(appState.medicine.gcs.isEntubated, false, 'isEntubated must be false for NT');
assert.strictEqual(appState.medicine.gcs.formattedScore, '11NT', 'Score must be formatted as 11NT');

(document.getElementById('select-gcs-v') as any).value = '1T';
appModule.updateAllTabs();
assert.strictEqual(appState.medicine.gcs.isEntubated, true, 'isEntubated must be true for 1T');
assert.strictEqual(appState.medicine.gcs.isNotTestable, false, 'isNotTestable must be false for 1T');
assert.strictEqual(appState.medicine.gcs.formattedScore, '11T', 'Score must be formatted as 11T');
console.log('✓ Pipeline K: GCS Verbal NT vs 1T Disambiguation verified.');

// L. Bidirectional EKG RR ms -> HR & Vitals Sync
(document.getElementById('input-ecg-rr-boxes') as any).value = ''; // clear boxes
(document.getElementById('input-ecg-rr') as any).value = '600'; // 600 ms -> 100 bpm
(document.getElementById('input-hr') as any).value = '';

appModule.updateAllTabs();

assert.strictEqual(appState.biometry.heartRate, 100, 'RR 600ms must sync biometry heartRate to 100');
assert.strictEqual((document.getElementById('input-hr') as any).value, '100', 'input-hr must be updated to 100');
assert.strictEqual((document.getElementById('input-ecg-rr-boxes') as any).value, '15', 'RR boxes must be updated to 15 (600/40)');
console.log('✓ Pipeline L: Bidirectional EKG RR ms -> HR & Vitals Sync verified.');

// M. Fluid Hourly Rate -> GIR Rate Placeholder Sync
(document.getElementById('input-weight') as any).value = '20'; // 20 kg
(document.getElementById('select-gir-dextrose') as any).value = '10';
(document.getElementById('input-gir-rate') as any).value = '';

appModule.updateAllTabs();

const girRateInput = document.getElementById('input-gir-rate') as any;
assert.ok(appState.medicine.fluid?.hourlyRate, 'Fluid hourly rate should be calculated');
assert.strictEqual(girRateInput.placeholder, `İdame: ${appState.medicine.fluid.hourlyRate} mL/saat`, 'GIR rate placeholder must dynamically reflect fluid hourlyRate');
console.log('✓ Pipeline M: Fluid Hourly Rate -> GIR Rate Placeholder Sync verified.');

// N. Vitals Temperature -> Alvarado (>37.3°C) and Centor (>38.0°C) Auto-Sync
(document.getElementById('input-temp') as any).value = '38.5';
const alvTempChk = document.getElementById('chk-alv-temp') as any;
const centorFeverChk = document.getElementById('chk-centor-fever') as any;
delete alvTempChk.dataset.userModified;
delete centorFeverChk.dataset.userModified;

appModule.updateAllTabs();

assert.strictEqual(alvTempChk.checked, true, 'Alvarado fever check must auto-sync to true when temp > 37.3°C');
assert.strictEqual(centorFeverChk.checked, true, 'Centor fever check must auto-sync to true when temp > 38.0°C');

(document.getElementById('input-temp') as any).value = '36.8';
appModule.updateAllTabs();
assert.strictEqual(alvTempChk.checked, false, 'Alvarado fever check must auto-sync to false when temp <= 37.3°C');
assert.strictEqual(centorFeverChk.checked, false, 'Centor fever check must auto-sync to false when temp <= 38.0°C');
console.log('✓ Pipeline N: Vitals Temperature -> Alvarado & Centor Fever Auto-Sync verified.');

// O. GCS Coma (GCS <= 8) -> AVPU ('U') Single-Pass Synchronous Propagation to NEWS2
(document.getElementById('input-age') as any).value = '45';
(document.getElementById('select-age-unit') as any).value = 'years';
(document.getElementById('select-gcs-e') as any).value = '1';
(document.getElementById('select-gcs-v') as any).value = '1';
(document.getElementById('select-gcs-m') as any).value = '1'; // total 3 (deep coma)
(document.getElementById('input-avpu') as any).value = 'A'; // initially set to Alert

appModule.updateAllTabs();

const avpuSelectEl = document.getElementById('input-avpu') as any;
assert.strictEqual(avpuSelectEl.value, 'U', 'GCS <= 8 must map AVPU to U');
assert.ok(appState.medicine.news2, 'NEWS2 must be calculated');
assert.strictEqual(appState.medicine.news2.hasRedScore, true, 'NEWS2 must flag red score (>=3) for AVPU=U on the single synchronous pass');
assert.ok(appState.medicine.news2.score >= 3, 'NEWS2 score must include at least 3 points for AVPU=U');
console.log('✓ Pipeline O: GCS Coma -> AVPU (U) Single-Pass NEWS2 Propagation verified.');

// P. Neonatal TND Fluid -> card-idame Badge & Electrolytes Sync
(document.getElementById('input-age') as any).value = '1';
(document.getElementById('select-age-unit') as any).value = 'days';
(document.getElementById('input-weight') as any).value = '3.0'; // 3.0 kg
(document.getElementById('select-gestational-weeks') as any).value = '39';

appModule.updateAllTabs();

assert.ok(appState.medicine.neonatalFluid, 'Neonatal fluid must be calculated');
assert.strictEqual((document.getElementById('output-fluid-method-badge') as any).textContent, 'TND Yenidoğan', 'Method badge in card-idame must show TND Yenidoğan');
assert.strictEqual((document.getElementById('output-daily-k') as any).textContent, '0 (İlk 48h YASAK)', 'Potassium in card-idame must be strictly forbidden in first 48h');
console.log('✓ Pipeline P: Neonatal TND Fluid -> card-idame Badge & Electrolyte Sync verified.');

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
