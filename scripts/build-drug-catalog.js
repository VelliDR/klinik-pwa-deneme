/**
 * TİTCK & SGK MASTER İLAÇ VERİTABANI DÖNÜŞTÜRÜCÜ & OPTİMİZATÖRÜ (v2 — HİBRİT ETL)
 *
 * Girdi : busy-shannon/output/turkiye_ilac_klinik_master.json (~310 MB, 18.212 kayıt, 127 alan)
 *         (veya kök dizindeki turkiye_ilac_klinik_master.json / turkiye_ilac_master_veritabani.json)
 * Çıktı : public/data/medicines.json (< 5 MB raw, < 900 KB GZIP, 18.212 kayıt)
 *         + public/data/atc_icd10_sozluk.json senkronizasyonu
 *
 * Kodlama Sözlüğü:
 *   i   : Kayıt ID
 *   b   : İlaç Adı (Ticari / Müstahzar)
 *   g   : ATC Adı (INN / Etken Madde - geriye dönük uyumlu)
 *   a   : ATC Kodu (7 haneli DSÖ kodu)
 *   c   : Barkod (13 haneli GTIN)
 *   m   : Firma Adı
 *   r   : Reçete Türü ('N', 'K', 'Y', 'M', 'T')
 *   s   : Aktiflik (1=Aktif, 0=Pasif)
 *   sg  : SGK Geri Ödeme (1=Ödeniyor, 0=Kapsam Dışı)
 *   eg  : SGK Eşdeğer Grubu Kodu (örn. "E712B")
 *   em  : Temel İlaç Bitmask (1=Genel, 2=Çocuk, 4=Yenidoğan)
 *   pr  : Gebelik Kategorisi ('A','B','C','D','X')
 *   cz  : Soğuk Zincir (1=2-8°C, yoksa 0)
 *   kn  : SGK Kamu No
 *   di  : SGK Kamu İskonto Oranı
 *   ki  : SGK Kademeli İskontolar (kompakt, örn. "28/10/0/0")
 *   fk  : SGK Fiyat Koruma (1=Fiyat Korumalı)
 *   psf : Perakende Satış Fiyatı (TL)
 *   pdt : Fiyat Güncelleme / Tarife Tarihi (YYYY-MM-DD)
 *   gkf : Referans Fiyat (GKF Euro)
 *   ekz : Ek İzlemeye Tabi (▼) (1=Evet)
 *   alg : 12-bit Alerjen / Eksipiyan Uyarı Bitmask'i (0-4095)
 *   act : KÜB Aç/Tok Kullanım Enum (1=Aç, 2=Tok, 3=Aç veya Tok)
 *   arc : KÜB Araç Kullanım Riski Enum (1=Yok/İhmal, 2=Prospektüs, 3=Dikkat, 4=Yüksek Risk)
 *   ask : Ruhsat Askı Durumu (yalnızca askıda olan ~341 ürün için)
 *   kub : Önek kodlu tam TİTCK KÜB PDF yolu ("0/...", "24/..." veya tam URL)
 *   kt  : Önek kodlu tam TİTCK KT PDF yolu
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ROOT_DIR = process.cwd();
const CANDIDATE_INPUTS = [
  process.env.DRUG_MASTER_JSON,
  path.resolve(ROOT_DIR, '..', 'antigravity', 'busy-shannon', 'output', 'turkiye_ilac_klinik_master.json'),
  '/home/vellli/antigravity/busy-shannon/output/turkiye_ilac_klinik_master.json',
  path.join(ROOT_DIR, 'turkiye_ilac_klinik_master.json'),
  path.join(ROOT_DIR, 'turkiye_ilac_master_veritabani.json')
].filter(Boolean);

const INPUT_FILE = CANDIDATE_INPUTS.find(p => fs.existsSync(p));
const OUTPUT_FILE = path.join(ROOT_DIR, 'public', 'data', 'medicines.json');
const DIST_FILE = path.join(ROOT_DIR, 'dist', 'data', 'medicines.json');

// 12 kanonik KÜB Alerjen / Eksipiyan bitmask tablosu (titckIndexedDB.ts ile birebir senkron)
const ALLERGEN_BITS = [
  { bit: 1 << 0, match: 'Sodyum' },
  { bit: 1 << 1, match: 'Laktoz' },
  { bit: 1 << 2, match: 'Sükroz / Fruktoz / Sorbitol' },
  { bit: 1 << 3, match: 'Propilen Glikol' },
  { bit: 1 << 4, match: 'Etanol / Alkol' },
  { bit: 1 << 5, match: 'Tartrazin / Azo Boyar' },
  { bit: 1 << 6, match: 'Soya / Yer Fıstığı' },
  { bit: 1 << 7, match: 'Paraben' },
  { bit: 1 << 8, match: 'Benzil Alkol' },
  { bit: 1 << 9, match: 'Aspartam / Fenilalanin' },
  { bit: 1 << 10, match: 'Sülfit / Metabisülfit' },
  { bit: 1 << 11, match: 'Gluten / Buğday Nişastası' }
];

// TİTCK PDF URL önek kodlama (10 önek, %100 kayıpsız tam URL rekonstrüksiyonu)
const TITCK_DIRECT_PREFIX = 'https://titck.gov.tr/storage/kubKtAttachments/';
const TITCK_ARCHIVE_RE = /^https:\/\/titck\.gov\.tr\/storage\/Archive\/20(\d{2})\/kubKtAttachments\/(.+)$/;

function encodeTitckPdfUrl(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  if (url.startsWith(TITCK_DIRECT_PREFIX)) {
    return `0/${url.slice(TITCK_DIRECT_PREFIX.length)}`;
  }
  const archiveMatch = url.match(TITCK_ARCHIVE_RE);
  if (archiveMatch) {
    return `${archiveMatch[1]}/${archiveMatch[2]}`;
  }
  return url;
}

function encodeAllergens(list) {
  if (!Array.isArray(list) || list.length === 0) return 0;
  let mask = 0;
  for (const raw of list) {
    const label = String(raw || '').trim();
    const hit = ALLERGEN_BITS.find(a => a.match === label);
    if (hit) mask |= hit.bit;
  }
  return mask;
}

function encodeMealTiming(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 0;
  if (s.includes('aç veya tok') || s.includes('ac veya tok')) return 3;
  if (s.includes('tok') || s.includes('yemekle')) return 2;
  if (s.includes('aç') || s.includes('ac')) return 1;
  return 0;
}

function encodeDrivingRisk(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 0;
  if (s.includes('kullanılmamalı') || s.includes('yüksek risk')) return 4;
  if (s.includes('dikkat')) return 3;
  if (s.includes('prospektüs')) return 2;
  if (s.includes('etkisi yok') || s.includes('ihmal')) return 1;
  return 0;
}

function encodeTieredDiscounts(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  // "%28 / %10 / %0 / %0" -> "28/10/0/0"
  const compact = s.replace(/%/g, '').replace(/\s*\/\s*/g, '/').trim();
  return compact === '0/0/0/0' ? '' : compact;
}

console.log('=================================================================');
console.log('🚀 [TİTCK BUILD v2] Hibrit Master İlaç Kataloğu Optimizasyonu');
console.log('=================================================================');

if (!INPUT_FILE) {
  console.error('❌ Hata: Kaynak master JSON dosyası bulunamadı!');
  process.exit(1);
}

const inputStats = fs.statSync(INPUT_FILE);
console.log(`📁 Kaynak Dosya: ${INPUT_FILE}`);
console.log(`📦 Ham Boyut   : ${(inputStats.size / (1024 * 1024)).toFixed(2)} MB`);

const rawRecords = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
  console.error('❌ Hata: JSON dizisi geçersiz veya boş!');
  process.exit(1);
}

console.log(`📊 Toplam Kayıt: ${rawRecords.length.toLocaleString('tr-TR')} adet ilaç`);

let activeCount = 0;
let passiveCount = 0;
let sgkReimbursedCount = 0;
let esdegerGroupCount = 0;
let coldChainCount = 0;
let directPdfCount = 0;
let priceCount = 0;
let gkfCount = 0;
let ekIzlemCount = 0;
let allergenCount = 0;
let mealCount = 0;
let drivingCount = 0;
let generalEssentialCount = 0;
let childEssentialCount = 0;
let neonateEssentialCount = 0;
const priceDateCounts = new Map();
let maxPriceDate = '';
let minPriceDate = '';
const pregDist = { A: 0, B: 0, C: 0, D: 0, X: 0 };
const rxDist = { N: 0, K: 0, Y: 0, M: 0, T: 0 };

const optimizedRecords = rawRecords.map((r, index) => {
  // 1. Reçete Türü
  const rxRaw = String(r['Reçete Türü'] || r['Reçete \nTürü'] || 'Normal').trim();
  let rxCode = 'N';
  if (/kırmızı|kirmizi/i.test(rxRaw)) rxCode = 'K';
  else if (/yeşil|yesil/i.test(rxRaw)) rxCode = 'Y';
  else if (/mor/i.test(rxRaw)) rxCode = 'M';
  else if (/turuncu/i.test(rxRaw)) rxCode = 'T';
  rxDist[rxCode] = (rxDist[rxCode] || 0) + 1;

  // 2. Aktiflik Durumu
  const sheet = String(r['_sheet'] || '');
  const durum = String(r['Durumu'] || '');
  const isActive = (/pasif/i.test(sheet) && !/alınacak/i.test(sheet)) || /^pasif$/i.test(durum.trim()) ? 0 : 1;
  if (isActive === 1) activeCount++;
  else passiveCount++;

  // 3. SGK Geri Ödeme
  const sgkRaw = String(r['SGK Geri Ödeme'] || '');
  const isSgk = (sgkRaw.includes('Kapsamda') || /ödeniyor|odeniyor/i.test(sgkRaw)) ? 1 : 0;
  if (isSgk === 1) sgkReimbursedCount++;

  // 4. Temel İlaç Bitmask
  let essentialMask = 0;
  if (r['Temel İlaç Listesi Durumu'] === 1 || r['Temel İlaç Listesi Durumu'] === '1') {
    essentialMask |= 1;
    generalEssentialCount++;
  }
  if (r['Çocuk Temel İlaç\nListesi Durumu'] === 1 || r['Çocuk Temel İlaç\nListesi Durumu'] === '1') {
    essentialMask |= 2;
    childEssentialCount++;
  }
  if (r['Yenidoğan\nTemel İlaç\nListesi Durumu'] === 1 || r['Yenidoğan\nTemel İlaç\nListesi Durumu'] === '1') {
    essentialMask |= 4;
    neonateEssentialCount++;
  }

  // 5. Gebelik Kategorisi (FDA yeni alan + eski alan fallback)
  const pregRaw = String(r['Gebelik Kategorisi (FDA)'] || r['Gebelik Kategorisi'] || '').trim().toUpperCase();
  let pregCode = 'C';
  if (pregRaw.startsWith('A')) pregCode = 'A';
  else if (pregRaw.startsWith('B')) pregCode = 'B';
  else if (pregRaw.startsWith('C')) pregCode = 'C';
  else if (pregRaw.startsWith('D')) pregCode = 'D';
  else if (pregRaw.startsWith('X')) pregCode = 'X';
  pregDist[pregCode] = (pregDist[pregCode] || 0) + 1;

  // 6. Soğuk Zincir
  const isCold = r['Soğuk Zincir Mi'] === true ? 1 : 0;
  if (isCold === 1) coldChainCount++;

  // 7. Eşdeğer Grubu
  const esdeger = String(r['Eşdeğer İlaç Grubu (SGK)'] || '').trim();
  if (esdeger) esdegerGroupCount++;

  // 8. PDF Linkleri (10 önekli kayıpsız kısa kod)
  const kubEncoded = encodeTitckPdfUrl(r['KÜB PDF Linki']);
  const ktEncoded = encodeTitckPdfUrl(r['Prospektüs (KT) PDF Linki']);
  if (kubEncoded || ktEncoded) directPdfCount++;

  // 9. Yeni Hibrit Alanlar: Fiyat, Tarife Tarihi, Ek İzlem, Alerjen Bitmask, Aç/Tok, Araç Riski, Askı Durumu
  const psfNum = typeof r['Perakende Satış Fiyatı (TL)'] === 'number' && !isNaN(r['Perakende Satış Fiyatı (TL)'])
    ? Number(r['Perakende Satış Fiyatı (TL)'].toFixed(2))
    : null;
  if (psfNum !== null) priceCount++;

  const rawPriceDate = String(r['Fiyat Güncelleme Tarihi'] || '').trim().slice(0, 10);
  const priceDateIso = /^\d{4}-\d{2}-\d{2}$/.test(rawPriceDate) ? rawPriceDate : '';
  if (psfNum !== null && priceDateIso) {
    priceDateCounts.set(priceDateIso, (priceDateCounts.get(priceDateIso) || 0) + 1);
    if (!maxPriceDate || priceDateIso > maxPriceDate) maxPriceDate = priceDateIso;
    if (!minPriceDate || priceDateIso < minPriceDate) minPriceDate = priceDateIso;
  }

  const gkfNum = typeof r['Referans Fiyat (GKF Euro)'] === 'number' && !isNaN(r['Referans Fiyat (GKF Euro)'])
    ? Number(r['Referans Fiyat (GKF Euro)'].toFixed(2))
    : null;
  if (gkfNum !== null) gkfCount++;

  const ekz = r['Ek İzlemeye Tabi Mi (▼)'] === true ? 1 : 0;
  if (ekz === 1) ekIzlemCount++;

  const algMask = encodeAllergens(r['KÜB Alerjen / Eksipiyan Uyarıları']);
  if (algMask > 0) allergenCount++;

  const actCode = encodeMealTiming(r['KÜB Aç/Tok Kullanım']);
  if (actCode > 0) mealCount++;

  const arcCode = encodeDrivingRisk(r['KÜB Araç Kullanım Riski']);
  if (arcCode > 0) drivingCount++;

  const tieredDisc = encodeTieredDiscounts(r['SGK Kademeli İskontolar']);
  const priceProtected = String(r['SGK Fiyat Koruma Durumu'] || '').toUpperCase().includes('KORUMALI') ? 1 : 0;

  const rawAski = String(r['Ruhsat Askı Durumu'] || '').trim();
  const askiFlag = (rawAski && !/askıda değil|askida degil/i.test(rawAski)) ? rawAski : '';

  const record = {
    i: Number(r.id) || (index + 1),
    b: String(r['İlaç Adı'] || '').trim(),
    g: String(r['ATC Adı'] || r['Uluslararası INN Adı'] || r['Etkin Madde (TİTCK)'] || '').trim(),
    a: String(r['ATC Kodu'] || '').trim(),
    c: String(r['Barkod'] || '').trim(),
    m: String(r['Firma Adı'] || '').trim(),
    r: rxCode,
    s: isActive,
    sg: isSgk,
    eg: esdeger,
    em: essentialMask,
    pr: pregCode,
    cz: isCold,
    kn: String(r['SGK Kamu No'] || '').trim(),
    di: String(r['SGK Kamu İskonto Oranı'] || '').trim(),
    ki: tieredDisc,
    fk: priceProtected,
    psf: psfNum,
    pdt: psfNum !== null ? priceDateIso : '',
    gkf: gkfNum,
    ekz: ekz,
    alg: algMask,
    act: actCode,
    arc: arcCode,
    ask: askiFlag,
    kub: kubEncoded,
    kt: ktEncoded
  };

  // Boş veya varsayılan alanları atarak JSON boyutunu sıkıştır (normalizeDrugRecord r='N' için 'Normal' varsayar)
  const keepZeroKeys = new Set(['s', 'sg']);
  const compact = {};
  for (const [key, val] of Object.entries(record)) {
    if (val === '' || val === null || val === undefined) continue;
    if (val === 0 && !keepZeroKeys.has(key)) continue;
    if (key === 'r' && val === 'N') continue;
    compact[key] = val;
  }

  return compact;
});

const outputJson = JSON.stringify(optimizedRecords);
const outputBuffer = Buffer.from(outputJson, 'utf8');
const gzippedBuffer = zlib.gzipSync(outputBuffer, { level: 9 });

const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, outputJson, 'utf8');

if (fs.existsSync(path.dirname(DIST_FILE))) {
  fs.writeFileSync(DIST_FILE, outputJson, 'utf8');
}

// ATC <-> ICD-10 sözlüğünü de aynı kaynaktan senkronize et
const CANDIDATE_ICD = [
  path.join(path.dirname(INPUT_FILE), 'atc_icd10_sozluk.json'),
  '/home/vellli/antigravity/busy-shannon/output/atc_icd10_sozluk.json'
];
const icdSrc = CANDIDATE_ICD.find(p => fs.existsSync(p));
if (icdSrc) {
  const icdDest = path.join(ROOT_DIR, 'public', 'data', 'atc_icd10_sozluk.json');
  fs.copyFileSync(icdSrc, icdDest);
  const distIcd = path.join(ROOT_DIR, 'dist', 'data', 'atc_icd10_sozluk.json');
  if (fs.existsSync(path.dirname(distIcd))) fs.copyFileSync(icdSrc, distIcd);
  const icdBuf = fs.readFileSync(icdDest);
  const icdGz = zlib.gzipSync(icdBuf, { level: 9 });
  console.log(`📖 ICD-10 Sözlük Senkronize Edildi: ${(icdBuf.length / 1024).toFixed(1)} KB ham / ${(icdGz.length / 1024).toFixed(1)} KB GZIP`);
}

// Dinamik piyasa ve mevzuat verileri için Veri Anlık Görüntüsü Manifesti (data_manifest.json)
function getFileDateIso(filePath, fallbackIso) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
    }
  } catch {
    // fallback kullan
  }
  return fallbackIso;
}

const etlRootDir = path.resolve(path.dirname(INPUT_FILE), '..');
const masterMtimeIso = inputStats.mtime.toISOString().slice(0, 10);
const todayIso = new Date().toISOString().slice(0, 10);

let bulkTariffDate = maxPriceDate || masterMtimeIso;
let bulkTariffCount = 0;
for (const [dt, cnt] of priceDateCounts.entries()) {
  if (cnt > bulkTariffCount) {
    bulkTariffCount = cnt;
    bulkTariffDate = dt;
  }
}

const priceFetchedIso = getFileDateIso(path.join(etlRootDir, 'depo_fiyat_listesi.xlsx'), masterMtimeIso);
const sgkFetchedIso = getFileDateIso(path.join(etlRootDir, 'sgk_ek4a_master.xlsx'), masterMtimeIso);
const ekIzlemFetchedIso = getFileDateIso(path.join(etlRootDir, 'titck_ek_izlem.xlsx'), masterMtimeIso);
const titckRuhsatFetchedIso = getFileDateIso(path.join(etlRootDir, 'titck_ruhsatli_ilaclar.xlsx'), masterMtimeIso);
const titckLatestIso = [ekIzlemFetchedIso, titckRuhsatFetchedIso, masterMtimeIso].sort().pop() || masterMtimeIso;

const dataManifest = {
  schemaVersion: 1,
  generatedAt: todayIso,
  masterBuildDate: masterMtimeIso,
  sources: {
    prices: {
      label: 'İlaç Perakende Satış Fiyatları (TL)',
      snapshotDate: priceFetchedIso,
      latestItemDate: maxPriceDate || priceFetchedIso,
      bulkTariffDate,
      recordCount: priceCount,
      staleAfterDays: 90,
      criticalAfterDays: 180,
      sourceName: 'Ecza Deposu Açık Web Fiyat Listesi (PSF/DSF)'
    },
    gkf: {
      label: 'Referans İlaç Fiyatı (GKF Euro)',
      snapshotDate: masterMtimeIso,
      recordCount: gkfCount,
      staleAfterDays: 90,
      criticalAfterDays: 180,
      sourceName: 'TİTCK Referans Fiyat Listesi'
    },
    sgk: {
      label: 'SGK EK-4/A Geri Ödeme & 4 Kademeli KKİ',
      snapshotDate: sgkFetchedIso,
      recordCount: sgkReimbursedCount,
      equivalentGroupCount: esdegerGroupCount,
      staleAfterDays: 90,
      criticalAfterDays: 180,
      sourceName: 'SGK Bedeli Ödenecek İlaçlar Listesi (EK-4/A)'
    },
    titck: {
      label: 'TİTCK SKRS, Ruhsat, ▼ Ek İzlem & KÜB/KT',
      snapshotDate: titckLatestIso,
      recordCount: rawRecords.length,
      extraMonitoringCount: ekIzlemCount,
      pdfCount: directPdfCount,
      staleAfterDays: 180,
      criticalAfterDays: 365,
      sourceName: 'T.C. Sağlık Bakanlığı TİTCK'
    },
    ddi: {
      label: 'İlaç & Besin Etkileşim Matrisi',
      snapshotDate: masterMtimeIso,
      recordCount: 81355,
      staleAfterDays: 365,
      criticalAfterDays: 730,
      sourceName: 'DDInter 2.0 + 28 Küratörlü Türkçe ATC Kuralı'
    },
    vaccines: {
      label: 'Ulusal & Özel Bağışıklama Takvimi',
      snapshotDate: '2026-09-01',
      versionLabel: 'GBP 2025/2026',
      staleAfterDays: 365,
      criticalAfterDays: 730,
      sourceName: 'T.C. Sağlık Bakanlığı Genişletilmiş Bağışıklama Programı'
    }
  }
};

const manifestJson = JSON.stringify(dataManifest, null, 2);
const MANIFEST_OUTPUT_FILE = path.join(ROOT_DIR, 'public', 'data', 'data_manifest.json');
const MANIFEST_DIST_FILE = path.join(ROOT_DIR, 'dist', 'data', 'data_manifest.json');
fs.writeFileSync(MANIFEST_OUTPUT_FILE, manifestJson, 'utf8');
if (fs.existsSync(path.dirname(MANIFEST_DIST_FILE))) {
  fs.writeFileSync(MANIFEST_DIST_FILE, manifestJson, 'utf8');
}
console.log(`🗓️  Veri Anlık Görüntüsü Manifesti Üretildi: ${MANIFEST_OUTPUT_FILE} (Fiyat: ${priceFetchedIso}, SGK: ${sgkFetchedIso})`);

const outputSizeMB = outputBuffer.length / (1024 * 1024);
const gzipSizeKB = gzippedBuffer.length / 1024;
const reductionPercent = ((1 - (outputBuffer.length / inputStats.size)) * 100).toFixed(1);
const gzipReductionPercent = ((1 - (gzippedBuffer.length / inputStats.size)) * 100).toFixed(1);

console.log('-----------------------------------------------------------------');
console.log('✅ ÇIKTI BAŞARIYLA ÜRETİLDİ:');
console.log(`📄 Hedef Dosya   : ${OUTPUT_FILE}`);
console.log(`📦 Kompakt Boyut : ${outputSizeMB.toFixed(2)} MB (${outputBuffer.length.toLocaleString('tr-TR')} bayt) [-%${reductionPercent}]`);
console.log(`⚡ GZIP Transfer : ${gzipSizeKB.toFixed(1)} KB [-%${gzipReductionPercent}]`);
console.log('-----------------------------------------------------------------');
console.log('📈 KLİNİK VERİ DAĞILIMI (v2):');
console.log(`  • Aktif / Pasif          : ${activeCount.toLocaleString('tr-TR')} / ${passiveCount.toLocaleString('tr-TR')}`);
console.log(`  • SGK Geri Ödemede       : ${sgkReimbursedCount.toLocaleString('tr-TR')} (Eşdeğer: ${esdegerGroupCount.toLocaleString('tr-TR')})`);
console.log(`  • TL Perakende Fiyatlı   : ${priceCount.toLocaleString('tr-TR')} ilaç`);
console.log(`  • Ek İzleme (▼)          : ${ekIzlemCount.toLocaleString('tr-TR')} ilaç`);
console.log(`  • Soğuk Zincir (2-8°C)   : ${coldChainCount.toLocaleString('tr-TR')} ilaç`);
console.log(`  • Doğrudan Resmi PDF     : ${directPdfCount.toLocaleString('tr-TR')} ilaç (10 önek kayıpsız)`);
console.log(`  • Alerjen / Eksipiyan    : ${allergenCount.toLocaleString('tr-TR')} ilaç (12-bit mask)`);
console.log(`  • Aç/Tok & Araç Riski    : ${mealCount.toLocaleString('tr-TR')} Aç/Tok | ${drivingCount.toLocaleString('tr-TR')} Araç`);
console.log(`  • Temel İlaç Kapsamı     : Genel: ${generalEssentialCount}, Çocuk: ${childEssentialCount}, Yenidoğan: ${neonateEssentialCount}`);
console.log(`  • Reçete Türleri         : N: ${rxDist.N}, K: ${rxDist.K}, Y: ${rxDist.Y}, M: ${rxDist.M}, T: ${rxDist.T}`);
console.log(`  • Gebelik Dağılımı       : A: ${pregDist.A}, B: ${pregDist.B}, C: ${pregDist.C}, D: ${pregDist.D}, X: ${pregDist.X}`);
console.log('=================================================================');
