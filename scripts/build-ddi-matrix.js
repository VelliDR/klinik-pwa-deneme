/**
 * DDINTER 2.0 + KÜRATÖRLÜ TÜRKÇE DDI ETKİLEŞİM MATRİSİ OPTİMİZATÖRÜ
 *
 * Girdi : busy-shannon/output/atc_etkilesim_matrisi.json (19.34 MB, 81.355 kural)
 *         + busy-shannon/output/turkiye_ilac_klinik_master.json (Duplikasyon + Hızlı Besin Haritası)
 * Çıktı : public/data/ddi_matrix.json (~410 KB ham, ~58 KB GZIP -> %98+ küçülme!)
 *
 * Tek dosyada 4 O(1) canlı reçete güvenlik katmanı sunar:
 *   1. rules     : 28 küratörlü Türkçe klinik ATC önek kuralı (zengin açıklamalı)
 *   2. K & O     : 81.327 DDInter 2.0 Major (K) & Moderate (O) çifti (indeksli komşuluk haritası)
 *   3. dup       : 502 ATC için Terapötik Duplikasyon Grupları
 *   4. foodQuick : 545 ATC için [besinAdı, seviyeKodu] hızlı besin-ilaç etkileşim indeksi
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ROOT_DIR = process.cwd();
const CANDIDATE_MATRIX = [
  process.env.DDI_MATRIX_JSON,
  path.resolve(ROOT_DIR, '..', 'antigravity', 'busy-shannon', 'output', 'atc_etkilesim_matrisi.json'),
  '/home/vellli/antigravity/busy-shannon/output/atc_etkilesim_matrisi.json'
].filter(Boolean);

const CANDIDATE_MASTER = [
  process.env.DRUG_MASTER_JSON,
  path.resolve(ROOT_DIR, '..', 'antigravity', 'busy-shannon', 'output', 'turkiye_ilac_klinik_master.json'),
  '/home/vellli/antigravity/busy-shannon/output/turkiye_ilac_klinik_master.json',
  path.join(ROOT_DIR, 'turkiye_ilac_klinik_master.json')
].filter(Boolean);

const MATRIX_FILE = CANDIDATE_MATRIX.find(p => fs.existsSync(p));
const MASTER_FILE = CANDIDATE_MASTER.find(p => fs.existsSync(p));
const OUTPUT_FILE = path.join(ROOT_DIR, 'public', 'data', 'ddi_matrix.json');
const DIST_FILE = path.join(ROOT_DIR, 'dist', 'data', 'ddi_matrix.json');

console.log('=================================================================');
console.log('⚡ [DDI MATRIX BUILD] DDInter 2.0 + Besin + Duplikasyon Sıkıştırıcı');
console.log('=================================================================');

if (!MATRIX_FILE) {
  console.error('❌ Hata: atc_etkilesim_matrisi.json bulunamadı!');
  process.exit(1);
}

const rawMatStat = fs.statSync(MATRIX_FILE);
const rawMatrix = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf8'));

// Türkçe etken madde adları + Duplikasyon + Hızlı Besin Haritası (master'dan)
const atcTrNameMap = new Map();
const dupMap = {};
const foodQuickMap = {};

if (MASTER_FILE) {
  const master = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8'));
  for (const r of master) {
    const atc = String(r['ATC Kodu'] || '').trim().toUpperCase();
    if (!atc) continue;

    if (!atcTrNameMap.has(atc)) {
      const trName = String(r['Etkin Madde (Türkçe)'] || r['ATC Adı'] || r['Uluslararası INN Adı'] || '').trim();
      if (trName) atcTrNameMap.set(atc, trName);
    }

    if (!dupMap[atc]) {
      const dup = Array.isArray(r['Terapötik Duplikasyon Grubu'])
        ? r['Terapötik Duplikasyon Grubu'].filter(Boolean)
        : [];
      if (dup.length > 0) dupMap[atc] = dup;
    }

    if (!foodQuickMap[atc]) {
      const foods = Array.isArray(r['Besin Etkileşimleri (DDInter)'])
        ? r['Besin Etkileşimleri (DDInter)']
        : [];
      if (foods.length > 0) {
        const seenFood = new Set();
        const compactFoods = [];
        for (const f of foods) {
          if (!f || !f.food) continue;
          const fname = String(f.food).trim();
          const key = fname.toLowerCase();
          if (seenFood.has(key)) continue;
          seenFood.add(key);
          const lv = String(f.level || 'Moderate').toLowerCase();
          const sc = lv === 'major' ? 'K' : (lv === 'minor' ? 'H' : 'O');
          compactFoods.push([fname, sc]);
        }
        if (compactFoods.length > 0) foodQuickMap[atc] = compactFoods;
      }
    }
  }
}

const curatedRules = [];
const ddiAtcSet = new Set();
const ddiPairs = [];
const fallbackInnByAtc = new Map();

for (const [pairKey, rule] of Object.entries(rawMatrix)) {
  const parts = pairKey.split(':');
  if (parts.length !== 2 || !rule) continue;
  const a1 = parts[0].trim().toUpperCase();
  const a2 = parts[1].trim().toUpperCase();
  if (!a1 || !a2) continue;

  if (rule.src !== 'DDInter 2.0') {
    curatedRules.push({
      a: a1,
      b: a2,
      s: rule.sev || 'O',
      t: rule.t || '',
      u: rule.u || '',
      g1: rule.g1 || a1,
      g2: rule.g2 || a2
    });
  } else {
    ddiAtcSet.add(a1);
    ddiAtcSet.add(a2);
    if (rule.g1 && !fallbackInnByAtc.has(a1)) fallbackInnByAtc.set(a1, rule.g1);
    if (rule.g2 && !fallbackInnByAtc.has(a2)) fallbackInnByAtc.set(a2, rule.g2);
    ddiPairs.push([a1, a2, rule.sev || 'O']);
  }
}

const atcs = Array.from(ddiAtcSet).sort();
const atcIndex = new Map(atcs.map((code, idx) => [code, idx]));
const names = atcs.map(code => atcTrNameMap.get(code) || fallbackInnByAtc.get(code) || code);

const adjK = {};
const adjO = {};
let majorCount = 0;
let modCount = 0;

for (const [a1, a2, sev] of ddiPairs) {
  let i = atcIndex.get(a1);
  let j = atcIndex.get(a2);
  if (i === undefined || j === undefined || i === j) continue;
  if (i > j) {
    const tmp = i;
    i = j;
    j = tmp;
  }
  const target = sev === 'K' ? adjK : adjO;
  if (!target[i]) target[i] = [];
  target[i].push(j);
}

for (const key of Object.keys(adjK)) {
  adjK[key] = Array.from(new Set(adjK[key])).sort((x, y) => x - y);
  majorCount += adjK[key].length;
}
for (const key of Object.keys(adjO)) {
  adjO[key] = Array.from(new Set(adjO[key])).sort((x, y) => x - y);
  modCount += adjO[key].length;
}

const payload = {
  v: 2,
  atcs,
  names,
  rules: curatedRules,
  K: adjK,
  O: adjO,
  dup: dupMap,
  foodQuick: foodQuickMap
};

const outStr = JSON.stringify(payload);
const outBuf = Buffer.from(outStr, 'utf8');
const gzBuf = zlib.gzipSync(outBuf, { level: 9 });

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, outStr, 'utf8');
if (fs.existsSync(path.dirname(DIST_FILE))) {
  fs.writeFileSync(DIST_FILE, outStr, 'utf8');
}

const reduction = ((1 - outBuf.length / rawMatStat.size) * 100).toFixed(1);
console.log(`📁 Kaynak Matris   : ${(rawMatStat.size / (1024 * 1024)).toFixed(2)} MB (${Object.keys(rawMatrix).length.toLocaleString('tr-TR')} kural)`);
console.log(`📄 Hedef Dosya     : ${OUTPUT_FILE}`);
console.log(`📦 Kompakt Boyut   : ${(outBuf.length / 1024).toFixed(1)} KB ham / ${(gzBuf.length / 1024).toFixed(1)} KB GZIP [-%${reduction}]`);
console.log(`🔬 Kapsam          : ${curatedRules.length} küratörlü Türkçe kural | ${majorCount.toLocaleString('tr-TR')} Major (K) | ${modCount.toLocaleString('tr-TR')} Moderate (O)`);
console.log(`🍽️  Hızlı Besin/Dup : ${Object.keys(foodQuickMap).length} besin-etkileşimli ATC | ${Object.keys(dupMap).length} terapötik duplikasyonlu ATC`);
console.log('=================================================================');
