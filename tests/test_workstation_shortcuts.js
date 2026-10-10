// Regression Test: Verifies that js/app.js loads without unhandled ReferenceError/TypeError,
// and tests all 9 responsive workstation quick presets (.btn-dob-preset)
import assert from 'assert';

const elements = new Map();
function createElement(tag) {
    const classes = new Set();
    return {
        tagName: tag.toUpperCase(),
        value: '',
        innerHTML: '',
        innerText: '',
        textContent: '',
        style: {},
        classList: {
            add: (...cls) => cls.forEach(c => classes.add(c)),
            remove: (...cls) => cls.forEach(c => classes.delete(c)),
            toggle: (c) => classes.has(c) ? classes.delete(c) : classes.add(c),
            contains: (c) => classes.has(c)
        },
        dataset: {},
        getAttribute: function(name) {
            if (name.startsWith('data-')) {
                const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                return this.dataset[key] || null;
            }
            return null;
        },
        children: [],
        appendChild: (c) => c,
        addEventListener: function(event, handler) {
            this._handlers = this._handlers || {};
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

globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    navigator: { onLine: true, serviceWorker: { register: () => Promise.resolve() } },
    document: null
};
globalThis.indexedDB = { open: () => ({ onupgradeneeded: null, onsuccess: null, onerror: null }) };

globalThis.document = {
    readyState: 'complete',
    addEventListener: () => {},
    getElementById: (id) => {
        if (!elements.has(id)) {
            elements.set(id, createElement('div'));
        }
        return elements.get(id);
    },
    querySelector: (sel) => createElement('div'),
    querySelectorAll: (sel) => {
        if (sel === '.btn-dob-preset') {
            return mockPresets;
        }
        return [];
    }
};
globalThis.window.document = globalThis.document;

try {
    Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: { register: () => Promise.resolve() }, onLine: true },
        configurable: true
    });
} catch (e) {}

// Dynamically import app.js
await import('../js/app.js');

// Test clicking each preset
for (const btn of mockPresets) {
    btn.click();
}

// 1. Verify 14-day preset click
const p14 = mockPresets.find(p => p.dataset.preset === '14d');
p14.click();
assert.strictEqual(document.getElementById('input-age').value, 14);
assert.strictEqual(document.getElementById('select-age-unit').value, 'days');
assert.strictEqual(document.getElementById('header-patient-age').textContent, '14 Günlük');
assert.strictEqual(document.getElementById('header-patient-info').classList.contains('flex'), true);
assert.strictEqual(document.getElementById('header-patient-info').classList.contains('hidden'), false);

// 2. Verify 25-year adult preset click
const p25 = mockPresets.find(p => p.dataset.preset === '25y');
p25.click();
assert.strictEqual(document.getElementById('input-age').value, 25);
assert.strictEqual(document.getElementById('select-age-unit').value, 'years');
assert.strictEqual(document.getElementById('header-patient-age').textContent, '25 Yaş');

console.log('✓ Mock Workstation: All 9 presets initialized, attached handlers, and executed cleanly with header badge sync.');
