/**
 * TÜRKİYE İLAÇ KLİNİK MASTER MONOGRAF DÖNÜŞTÜRÜCÜSÜ & OPTİMİZATÖRÜ
 *
 * Girdi : turkiye_ilac_klinik_master.json (~103 MB, 18.212 kayıt, 55 alan)
 * Çıktı : public/data/clinical_monographs_master.json (~6.3 MB raw, ~1.4 MB GZIP, 1.794 tekil ATC monografı)
 *
 * 18.212 ilacın 103 MB'lık dev klinik verisini ATC kodu bazında akıllı şekilde tekilleştirir,
 * boş alanları temizler ve PWA için yüksek hızlı, %100 çevrimdışı klinik monograf kütüphanesine dönüştürür.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ROOT_DIR = process.cwd();
const INPUT_FILE = path.join(ROOT_DIR, 'turkiye_ilac_klinik_master.json');
const OUTPUT_FILE = path.join(ROOT_DIR, 'public', 'data', 'clinical_monographs_master.json');
const DIST_FILE = path.join(ROOT_DIR, 'dist', 'data', 'clinical_monographs_master.json');

console.log('=================================================================');
console.log('🚀 [KLİNİK MASTER] Türkiye İlaç Klinik Monograf Optimizasyonu');
console.log('=================================================================');

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ Hata: Kaynak dosya bulunamadı: ${INPUT_FILE}`);
  process.exit(1);
}

const inputStats = fs.statSync(INPUT_FILE);
console.log(`📁 Kaynak Dosya : ${INPUT_FILE}`);
console.log(`📦 Ham Boyut    : ${(inputStats.size / (1024 * 1024)).toFixed(2)} MB (${inputStats.size.toLocaleString('tr-TR')} bayt)`);

const rawContent = fs.readFileSync(INPUT_FILE, 'utf8');
const rawRecords = JSON.parse(rawContent);

if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
  console.error('❌ Hata: JSON dizisi geçersiz veya boş!');
  process.exit(1);
}

console.log(`📊 Toplam Müstahzar : ${rawRecords.length.toLocaleString('tr-TR')} adet ilaç`);

// ATC kodu bazında örnek marka isimlerini topla
const brandsByAtc = {};
for (const d of rawRecords) {
  const atc = (d['ATC Kodu'] || '').trim().toUpperCase();
  const brand = (d['İlaç Adı'] || '').trim();
  if (atc && brand) {
    if (!brandsByAtc[atc]) brandsByAtc[atc] = [];
    if (brandsByAtc[atc].length < 8 && !brandsByAtc[atc].includes(brand)) {
      brandsByAtc[atc].push(brand);
    }
  }
}

// 1.794 tekil ATC bazında klinik monografları oluştur
const monographsByAtc = {};
let adultDoseCount = 0;
let pedDoseCount = 0;
let pregPllrCount = 0;
let organCount = 0;
let blackBoxCount = 0;
let indCount = 0;

for (const d of rawRecords) {
  const atc = (d['ATC Kodu'] || '').trim().toUpperCase();
  if (!atc || monographsByAtc[atc]) continue;

  const contraDiseases = Array.isArray(d['Kontrendike Hastalıklar (MED-RT)'])
    ? d['Kontrendike Hastalıklar (MED-RT)'].filter(Boolean)
    : [];
  const indications = Array.isArray(d['Onaylı Klinik Endikasyonlar (MED-RT)'])
    ? d['Onaylı Klinik Endikasyonlar (MED-RT)'].filter(Boolean)
    : [];

  const adultDose = String(d['Yetişkin Dozajı ve Pozoloji'] || '').trim();
  const pedDose = String(d['Pediatrik Kullanım ve Doz'] || '').trim();
  const pregPllr = String(d['Gebelik Risk Özeti (PLLR)'] || '').trim();
  const organImpairment = String(d['Böbrek ve Karaciğer Yetmezliği Doz Ayarı'] || '').trim();
  const rawBlackBox = String(d['Kara Kutu ve Kritik Uyarılar'] || '').trim();
  const blackBox = (rawBlackBox && !rawBlackBox.includes('Standart kullanım önlemleri geçerlidir')) ? rawBlackBox : '';
  const rawMutlak = String(d['Mutlak Kontrendikasyonlar'] || '').trim();
  const contraindications = (rawMutlak && !rawMutlak.includes('None. None.')) ? rawMutlak : '';

  if (adultDose) adultDoseCount++;
  if (pedDose) pedDoseCount++;
  if (pregPllr) pregPllrCount++;
  if (organImpairment) organCount++;
  if (blackBox) blackBoxCount++;
  if (indications.length > 0) indCount++;

  monographsByAtc[atc] = {
    atc: atc,
    genericTr: String(d['ATC Adı'] || d['Uluslararası INN Adı'] || '').trim(),
    genericEn: String(d['Uluslararası INN Adı'] || d['ATC Adı'] || '').trim(),
    drugClass: String(d['ATC Seviye 2 (Terapötik Grup)'] || d['Farmakolojik Sınıf'] || '').trim(),
    adultDose: adultDose,
    pediatricDose: pedDose,
    pregnancyFda: String(d['Gebelik Kategorisi (FDA)'] || '').trim(),
    pregnancyPllr: pregPllr,
    lactation: String(d['Laktasyon ve Anne Sütü Özeti'] || '').trim(),
    lactmed: String(d['LactMed Monograf Bağlantısı'] || '').trim(),
    organImpairment: organImpairment,
    blackBox: blackBox,
    contraindications: contraindications,
    contraDiseases: contraDiseases,
    indications: indications,
    rxnorm: String(d['RxNorm RxCUI'] || '').trim(),
    chembl: String(d['ChEMBL Kimliği'] || '').trim(),
    phase: String(d['Klinik Geliştirme Fazı'] || '').trim(),
    storage: String(d['Saklama Koşulu'] || '').trim(),
    dailyMedSpl: String(d['DailyMed SPL XML'] || '').trim(),
    brands: brandsByAtc[atc] || []
  };
}

const outDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outputJson = JSON.stringify(monographsByAtc);
const outputBuffer = Buffer.from(outputJson, 'utf8');
const gzippedBuffer = zlib.gzipSync(outputBuffer, { level: 9 });

fs.writeFileSync(OUTPUT_FILE, outputJson, 'utf8');

if (fs.existsSync(path.dirname(DIST_FILE))) {
  fs.writeFileSync(DIST_FILE, outputJson, 'utf8');
}

const outputSizeMB = outputBuffer.length / (1024 * 1024);
const gzipSizeKB = gzippedBuffer.length / 1024;
const reductionPercent = ((1 - (outputBuffer.length / inputStats.size)) * 100).toFixed(1);
const gzipReductionPercent = ((1 - (gzippedBuffer.length / inputStats.size)) * 100).toFixed(1);

console.log('-----------------------------------------------------------------');
console.log('✅ MASTER KLİNİK MONOGRAF VERİTABANI ÜRETİLDİ:');
console.log(`📄 Hedef Dosya   : ${OUTPUT_FILE}`);
console.log(`🔢 Tekil ATC     : ${Object.keys(monographsByAtc).length.toLocaleString('tr-TR')} monograf`);
console.log(`📦 Kompakt Boyut : ${outputSizeMB.toFixed(2)} MB [-%${reductionPercent}]`);
console.log(`⚡ GZIP Transfer : ${(gzipSizeKB / 1024).toFixed(2)} MB (${gzipSizeKB.toFixed(1)} KB) [-%${gzipReductionPercent}]`);
console.log('-----------------------------------------------------------------');
console.log('📈 KLİNİK ALAN DOLULUKLARI:');
console.log(`  • Yetişkin Dozajı & Pozoloji : ${adultDoseCount} ATC`);
console.log(`  • Pediatrik Kullanım & Doz   : ${pedDoseCount} ATC`);
console.log(`  • Gebelik PLLR Risk Özeti    : ${pregPllrCount} ATC`);
console.log(`  • Böbrek / Karaciğer Yetm.   : ${organCount} ATC`);
console.log(`  • Kara Kutu (Black Box)      : ${blackBoxCount} ATC`);
console.log(`  • Onaylı Endikasyon (MED-RT) : ${indCount} ATC`);
console.log('=================================================================');
