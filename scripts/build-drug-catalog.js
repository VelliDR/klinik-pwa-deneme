/**
 * TİTCK & SGK MASTER İLAÇ VERİTABANI DÖNÜŞTÜRÜCÜ & OPTİMİZATÖRÜ (AŞAMA 1)
 *
 * Girdi : turkiye_ilac_master_veritabani.json (21.45 MB, 18.212 kayıt)
 * Çıktı : public/data/medicines.json (~4.0 MB raw, ~720 KB GZIP, 18.212 kayıt)
 *
 * Bu script ham JSON dosyasını okur, alanları temizler, enum/bitmask kodlaması uygular,
 * boş alanları ayıklar ve PWA için yüksek performanslı kompakt şemaya dönüştürür.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ROOT_DIR = process.cwd();
const INPUT_FILE = path.join(ROOT_DIR, 'turkiye_ilac_master_veritabani.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'public', 'data', 'medicines.json');

console.log('=================================================================');
console.log('🚀 [TİTCK BUILD] Türkiye İlaç Master Veritabanı Optimizasyonu');
console.log('=================================================================');

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ Hata: Kaynak dosya bulunamadı: ${INPUT_FILE}`);
  process.exit(1);
}

const inputStats = fs.statSync(INPUT_FILE);
console.log(`📁 Kaynak Dosya: ${INPUT_FILE}`);
console.log(`📦 Ham Boyut   : ${(inputStats.size / (1024 * 1024)).toFixed(2)} MB (${inputStats.size.toLocaleString('tr-TR')} bayt)`);

const rawContent = fs.readFileSync(INPUT_FILE, 'utf8');
const rawRecords = JSON.parse(rawContent);

if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
  console.error('❌ Hata: JSON dizisi geçersiz veya boş!');
  process.exit(1);
}

console.log(`📊 Toplam Kayıt: ${rawRecords.length.toLocaleString('tr-TR')} adet ilaç`);

// İstatistik sayaçları
let activeCount = 0;
let passiveCount = 0;
let sgkReimbursedCount = 0;
let esdegerGroupCount = 0;
let coldChainCount = 0;
let directPdfCount = 0;
let generalEssentialCount = 0;
let childEssentialCount = 0;
let neonateEssentialCount = 0;
const pregDist = { A: 0, B: 0, C: 0, D: 0, X: 0 };
const rxDist = { N: 0, K: 0, Y: 0, M: 0, T: 0 };

const optimizedRecords = rawRecords.map((r, index) => {
  // 1. Reçete Türü Kodlama ('N'=Normal, 'K'=Kırmızı, 'Y'=Yeşil, 'M'=Mor, 'T'=Turuncu)
  const rxRaw = String(r['Reçete Türü'] || r['Reçete \nTürü'] || 'Normal').trim();
  let rxCode = 'N';
  if (/kırmızı|kirmizi/i.test(rxRaw)) rxCode = 'K';
  else if (/yeşil|yesil/i.test(rxRaw)) rxCode = 'Y';
  else if (/mor/i.test(rxRaw)) rxCode = 'M';
  else if (/turuncu/i.test(rxRaw)) rxCode = 'T';
  rxDist[rxCode] = (rxDist[rxCode] || 0) + 1;

  // 2. Aktiflik Durumu (1=Aktif, 0=Pasif)
  const sheet = String(r['_sheet'] || '');
  const durum = String(r['Durumu'] || '');
  const isActive = (/pasif/i.test(sheet) || /pasif/i.test(durum)) ? 0 : 1;
  if (isActive === 1) activeCount++;
  else passiveCount++;

  // 3. SGK Geri Ödeme (1=Ödeniyor, 0=Ödenmiyor)
  const sgkRaw = String(r['SGK Geri Ödeme'] || '');
  const isSgk = (sgkRaw.includes('Kapsamda') || /ödeniyor|odeniyor/i.test(sgkRaw)) ? 1 : 0;
  if (isSgk === 1) sgkReimbursedCount++;

  // 4. Temel İlaç Bitmask (bit 0: genel temel, bit 1: çocuk, bit 2: yenidoğan)
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

  // 5. Gebelik Kategorisi (A, B, C, D, X)
  const pregRaw = String(r['Gebelik Kategorisi'] || '').trim().toUpperCase();
  let pregCode = 'C'; // Varsayılan tıbbi güvenlik sınıfı
  if (pregRaw.startsWith('A')) pregCode = 'A';
  else if (pregRaw.startsWith('B')) pregCode = 'B';
  else if (pregRaw.startsWith('C')) pregCode = 'C';
  else if (pregRaw.startsWith('D')) pregCode = 'D';
  else if (pregRaw.startsWith('X')) pregCode = 'X';
  pregDist[pregCode] = (pregDist[pregCode] || 0) + 1;

  // 6. Soğuk Zincir (1=Soğuk Zincir, 0=Normal Saklama)
  const isCold = r['Soğuk Zincir Mi'] === true ? 1 : 0;
  if (isCold === 1) coldChainCount++;

  // 7. SGK Eşdeğer Grubu Kodu (Örn: "E712B")
  const esdeger = String(r['Eşdeğer İlaç Grubu (SGK)'] || '').trim();
  if (esdeger) esdegerGroupCount++;

  // 8. PDF Linkleri
  const kubUrl = String(r['KÜB PDF Linki'] || '').trim();
  const ktUrl = String(r['Prospektüs (KT) PDF Linki'] || '').trim();
  if (kubUrl || ktUrl) directPdfCount++;

  // 9. Kompakt Kayıt İnşası
  const record = {
    i: Number(r.id) || (index + 1),
    b: String(r['İlaç Adı'] || '').trim(),
    g: String(r['ATC Adı'] || r['Etkin Madde'] || '').trim(),
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
    kub: kubUrl,
    kt: ktUrl
  };

  // Boş string veya 0 varsayılan değerleri çıkararak JSON boyutunu küçült
  const compact = {};
  for (const [key, val] of Object.entries(record)) {
    if (val !== '' && val !== null && val !== undefined) {
      compact[key] = val;
    }
  }

  return compact;
});

// JSON Serialization
const outputJson = JSON.stringify(optimizedRecords);
const outputBuffer = Buffer.from(outputJson, 'utf8');
const gzippedBuffer = zlib.gzipSync(outputBuffer, { level: 9 });

// public/data dizinini garanti et
const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, outputJson, 'utf8');

// dist/data varsa orayı da senkronize et
const distFile = path.join(ROOT_DIR, 'dist', 'data', 'medicines.json');
if (fs.existsSync(path.dirname(distFile))) {
  fs.writeFileSync(distFile, outputJson, 'utf8');
}

// atc_knowledge_base.json kontrolü
const atcFile = path.join(ROOT_DIR, 'public', 'data', 'atc_knowledge_base.json');
const atcStatus = fs.existsSync(atcFile) ? `Mevcut (${(fs.statSync(atcFile).size / 1024).toFixed(1)} KB)` : 'Eksik!';

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
console.log('📈 KLİNİK VERİ DAĞILIMI:');
console.log(`  • Aktif İlaçlar          : ${activeCount.toLocaleString('tr-TR')} (${((activeCount / rawRecords.length) * 100).toFixed(1)}%)`);
console.log(`  • Pasif İlaçlar          : ${passiveCount.toLocaleString('tr-TR')} (${((passiveCount / rawRecords.length) * 100).toFixed(1)}%)`);
console.log(`  • SGK Geri Ödemede       : ${sgkReimbursedCount.toLocaleString('tr-TR')} (${((sgkReimbursedCount / rawRecords.length) * 100).toFixed(1)}%)`);
console.log(`  • SGK Eşdeğer Grubu Olan : ${esdegerGroupCount.toLocaleString('tr-TR')} ilaç`);
console.log(`  • Soğuk Zincir (2-8°C)   : ${coldChainCount.toLocaleString('tr-TR')} ilaç`);
console.log(`  • Doğrudan Resmi PDF     : ${directPdfCount.toLocaleString('tr-TR')} ilaç (KÜB/KT)`);
console.log(`  • Temel İlaç Kapsamı     : Genel: ${generalEssentialCount}, Çocuk: ${childEssentialCount}, Yenidoğan: ${neonateEssentialCount}`);
console.log(`  • Reçete Türleri Dağılımı: Normal: ${rxDist.N}, Kırmızı: ${rxDist.K}, Yeşil: ${rxDist.Y}, Mor: ${rxDist.M}, Turuncu: ${rxDist.T}`);
console.log(`  • Gebelik Güvenlik Dağılımı: A: ${pregDist.A}, B: ${pregDist.B}, C: ${pregDist.C}, D: ${pregDist.D}, X (Teratojen): ${pregDist.X}`);
console.log('=================================================================');
