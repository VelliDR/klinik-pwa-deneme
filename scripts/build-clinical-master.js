/**
 * TÜRKİYE İLAÇ KLİNİK MASTER MONOGRAF & TÜRKÇE KÜB PARÇALAYICI (v2)
 *
 * Girdi : busy-shannon/output/turkiye_ilac_klinik_master.json (~310 MB, 18.212 kayıt, 127 alan)
 * Çıktı :
 *   1. public/data/clinical_monographs_master.json (~1.794 tekil ATC yapılandırılmış profil:
 *      DDInter Besin/Hastalık/Major/Duplikasyon, LiverTox DILI, CYP, PK, PubChem, PLLR/LactMed, FDA Doz)
 *   2. public/data/kub/kub_{A..V}.json (14 ATC-1 parçası, 1.188 ATC resmi Türkçe KÜB bölümleri,
 *      2.722 EBYS e-imza artefaktı ve tekrar eden TÜFAM şablonu temizlenmiş)
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ROOT_DIR = process.cwd();
const CANDIDATE_INPUTS = [
  process.env.DRUG_MASTER_JSON,
  path.resolve(ROOT_DIR, '..', 'antigravity', 'busy-shannon', 'output', 'turkiye_ilac_klinik_master.json'),
  '/home/vellli/antigravity/busy-shannon/output/turkiye_ilac_klinik_master.json',
  path.join(ROOT_DIR, 'turkiye_ilac_klinik_master.json')
].filter(Boolean);

const INPUT_FILE = CANDIDATE_INPUTS.find(p => fs.existsSync(p));
const OUTPUT_FILE = path.join(ROOT_DIR, 'public', 'data', 'clinical_monographs_master.json');
const DIST_FILE = path.join(ROOT_DIR, 'dist', 'data', 'clinical_monographs_master.json');
const KUB_DIR = path.join(ROOT_DIR, 'public', 'data', 'kub');
const DIST_KUB_DIR = path.join(ROOT_DIR, 'dist', 'data', 'kub');

// TİTCK PDF e-imza artefaktı (4 resmi EBYS varyantı) ve standart TÜFAM bildirim son ekini temizleyen düzenli ifadeler
const EBYS_PATTERNS = [
  /(?:Bu\s+)?belge,?\s*güvenli\s+elektronik\s+imza\s+ile\s+imzalanmıştır\.?/gi,
  /Bu\s+belge\s+5070\s+sayılı\s+Elektronik\s+İmza\s+Kanunu[\s\S]{0,160}?kontrol\s+edilebilir\.?/gi,
  /Güvenli\s+elektronik\s+imza\s+aslı\s+ile\s+aynıdır\.?/gi,
  /güvenli\s+elektronik\s+imza\s*(?:ile\s+imzalanmıştır\.?)?/gi,
  /Dokümanın\s+doğrulama\s+kodu\s*:?\s*[A-Za-z0-9+/=_-]+/gi,
  /Belge\s+Doğrulama\s+Kodu\s*:?\s*[A-Za-z0-9+/=_-]+/gi,
  /Belge\s+Takip\s+Adresi\s*:?\s*https?:\/\/\S+/gi,
  /Takip\s+Adresi\s*:?\s*https?:\/\/\S+/gi,
  /Doküman\s+https?:\/\/\S+\s+adresinden\s+kontrol\s+edilebilir\.?/gi,
  /TırnakKodu:\s*/gi
];
const TUFAM_TAIL_RE = /Şüpheli advers reaksiyonların raporlanması[\s\S]*$/i;

function cleanKubText(raw, stripTufam = false) {
  if (!raw) return '';
  let text = String(raw);
  for (const re of EBYS_PATTERNS) {
    text = text.replace(re, '');
  }
  if (stripTufam) {
    text = text.replace(TUFAM_TAIL_RE, '');
  }
  // Kırık tek kelimelik satır sonlarını aşırı boşlukları sadeleştirerek temizle
  text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

function capText(raw, maxLen) {
  const s = String(raw || '').trim();
  if (!s || s.length <= maxLen) return s;
  return s.slice(0, maxLen).trimEnd() + '…';
}

function stripHtmlTags(raw) {
  return String(raw || '').replace(/<\/?(?:sub|sup|b|i|br|p)[^>]*>/gi, '').trim();
}

console.log('=================================================================');
console.log('🚀 [KLİNİK MASTER v2] Monograf + 14 Türkçe KÜB Shard Üretici');
console.log('=================================================================');

if (!INPUT_FILE) {
  console.error('❌ Hata: Kaynak master JSON bulunamadı!');
  process.exit(1);
}

const inputStats = fs.statSync(INPUT_FILE);
console.log(`📁 Kaynak Dosya : ${INPUT_FILE}`);
console.log(`📦 Ham Boyut    : ${(inputStats.size / (1024 * 1024)).toFixed(2)} MB`);

const rawRecords = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
  console.error('❌ Hata: JSON dizisi geçersiz veya boş!');
  process.exit(1);
}

// 1. ATC bazında örnek markaları ve EN ZENGİN temsilci kaydı (Türkçe KÜB + CYP birleşimi) seç
const brandsByAtc = {};
const bestRecordByAtc = {};
const kubScoreByAtc = {};
const cypUnionByAtc = {};

function scoreKubRichness(d) {
  let score = 0;
  if (d['KÜB Endikasyonlar (Türkçe)']) score += 3;
  if (d['KÜB Pozoloji (Türkçe)']) score += 4;
  if (d['KÜB Kontrendikasyonlar (Türkçe)']) score += 2;
  if (d['KÜB Etkileşimler (Türkçe)']) score += 2;
  if (d['KÜB Yan Etkiler (Türkçe)']) score += 2;
  if (d['KÜB Doz Aşımı / Antidot (Türkçe)']) score += 1;
  if (d['KÜB Farmakokinetik (Türkçe)']) score += 1;
  if (d['KÜB IV Geçimsizlikler']) score += 1;
  if (d['Durumu'] === 'Aktif') score += 0.5;
  return score;
}

for (const d of rawRecords) {
  const atc = (d['ATC Kodu'] || '').trim().toUpperCase();
  if (!atc) continue;

  const brand = (d['İlaç Adı'] || '').trim();
  if (brand) {
    if (!brandsByAtc[atc]) brandsByAtc[atc] = [];
    if (brandsByAtc[atc].length < 8 && !brandsByAtc[atc].includes(brand)) {
      brandsByAtc[atc].push(brand);
    }
  }

  // Tüm müstahzarlardan CYP enzimlerini birleştir
  const cyps = [
    ...(Array.isArray(d['Metabolizma Enzimleri (CYP)']) ? d['Metabolizma Enzimleri (CYP)'] : []),
    ...(Array.isArray(d['KÜB CYP Enzimleri']) ? d['KÜB CYP Enzimleri'] : [])
  ].filter(Boolean);
  if (cyps.length > 0) {
    if (!cypUnionByAtc[atc]) cypUnionByAtc[atc] = new Set();
    for (const c of cyps) cypUnionByAtc[atc].add(String(c).trim());
  }

  const sc = scoreKubRichness(d);
  if (!bestRecordByAtc[atc] || sc > (kubScoreByAtc[atc] ?? -1)) {
    bestRecordByAtc[atc] = d;
    kubScoreByAtc[atc] = sc;
  }
}

// 2. Master Monografları + 14 ATC-1 Türkçe KÜB Shard'larını inşa et
const monographsByAtc = {};
const kubShards = {};

let kubAtcCount = 0;
let foodAtcCount = 0;
let diseaseAtcCount = 0;
let diliAtcCount = 0;
let cypAtcCount = 0;
let dupAtcCount = 0;
let blackBoxCount = 0;

for (const [atc, d] of Object.entries(bestRecordByAtc)) {
  // Türkçe KÜB shard içeriği
  const kubEntry = {
    ind: cleanKubText(d['KÜB Endikasyonlar (Türkçe)']),
    poz: cleanKubText(d['KÜB Pozoloji (Türkçe)']),
    kon: cleanKubText(d['KÜB Kontrendikasyonlar (Türkçe)']),
    etk: cleanKubText(d['KÜB Etkileşimler (Türkçe)']),
    yan: cleanKubText(d['KÜB Yan Etkiler (Türkçe)'], true),
    ovr: cleanKubText(d['KÜB Doz Aşımı / Antidot (Türkçe)']),
    pk: cleanKubText(d['KÜB Farmakokinetik (Türkçe)']),
    iv: cleanKubText(d['KÜB IV Geçimsizlikler']),
    arc: cleanKubText(d['KÜB Araç/Makine Kullanım Etkisi']),
    raf: cleanKubText(d['KÜB Raf Ömrü ve Saklama']),
    exc: cleanKubText(d['KÜB Yardımcı Maddeler'])
  };

  const cleanKubEntry = {};
  for (const [k, v] of Object.entries(kubEntry)) {
    if (v) cleanKubEntry[k] = v;
  }
  const hasKub = Object.keys(cleanKubEntry).length > 0;
  if (hasKub) {
    cleanKubEntry.src = String(d['İlaç Adı'] || '').trim();
    const letter = atc.charAt(0);
    if (!kubShards[letter]) kubShards[letter] = {};
    kubShards[letter][atc] = cleanKubEntry;
    kubAtcCount++;
  }

  // Yapılandırılmış Master Klinik Monograf
  const contraDiseases = Array.isArray(d['Kontrendike Hastalıklar (MED-RT)'])
    ? d['Kontrendike Hastalıklar (MED-RT)'].filter(Boolean)
    : [];
  const indications = Array.isArray(d['Onaylı Klinik Endikasyonlar (MED-RT)'])
    ? d['Onaylı Klinik Endikasyonlar (MED-RT)'].filter(Boolean)
    : [];

  const adultDose = capText(d['Yetişkin Dozajı ve Pozoloji'], 900);
  const pedDose = capText(d['Pediatrik Kullanım ve Doz'], 750);
  const pregPllr = capText(d['Gebelik Risk Özeti (PLLR)'], 750);
  const organImpairment = capText(d['Böbrek ve Karaciğer Yetmezliği Doz Ayarı'], 750);
  const rawBlackBox = String(d['Kara Kutu ve Kritik Uyarılar'] || '').trim();
  const blackBox = (rawBlackBox && !rawBlackBox.includes('Standart kullanım önlemleri geçerlidir'))
    ? capText(rawBlackBox, 800)
    : '';
  const rawMutlak = String(d['Mutlak Kontrendikasyonlar'] || '').trim();
  const contraindications = (rawMutlak && !rawMutlak.includes('None. None.'))
    ? capText(rawMutlak, 650)
    : '';

  if (blackBox) blackBoxCount++;

  // DDInter Besin Etkileşimleri (kompakt)
  const rawFoods = Array.isArray(d['Besin Etkileşimleri (DDInter)']) ? d['Besin Etkileşimleri (DDInter)'] : [];
  const foodList = rawFoods
    .filter(item => item && item.food)
    .map(item => ({
      f: String(item.food).trim(),
      l: String(item.level || 'Moderate').trim(),
      m: String(item.mechanism || '').trim(),
      i: capText(item.interaction, 420),
      g: capText(item.management, 420)
    }));
  if (foodList.length > 0) foodAtcCount++;

  // DDInter Hastalık Etkileşimleri (kompakt)
  const rawDiseases = Array.isArray(d['Hastalık Etkileşimleri (DDInter)']) ? d['Hastalık Etkileşimleri (DDInter)'] : [];
  const diseaseList = rawDiseases
    .filter(item => item && item.disease)
    .map(item => ({
      d: String(item.disease).trim(),
      l: String(item.level || 'Moderate').trim()
    }));
  if (diseaseList.length > 0) diseaseAtcCount++;

  // DDInter Major Etkileşim Özeti
  const ddiM = Number(d['DDInter Major Etkileşim Sayısı']) || 0;
  const ddiO = Number(d['DDInter Moderate Etkileşim Sayısı']) || 0;
  const ddiMin = Number(d['DDInter Minor Etkileşim Sayısı']) || 0;
  const ddiMajorList = Array.isArray(d['DDInter Major Etkileşen Maddeler'])
    ? d['DDInter Major Etkileşen Maddeler'].filter(Boolean).slice(0, 60)
    : [];

  // Terapötik Duplikasyon Grubu
  const dupGroup = Array.isArray(d['Terapötik Duplikasyon Grubu'])
    ? d['Terapötik Duplikasyon Grubu'].filter(Boolean)
    : [];
  if (dupGroup.length > 0) dupAtcCount++;

  // LiverTox DILI
  const dili = String(d['LiverTox DILI Skoru'] || '').trim();
  const diliSum = capText(d['LiverTox DILI Özeti'], 520);
  const diliUrl = String(d['LiverTox Monograf Bağlantısı'] || '').trim();
  if (dili) diliAtcCount++;

  // CYP Enzimleri
  const cypList = cypUnionByAtc[atc] ? Array.from(cypUnionByAtc[atc]).sort() : [];
  if (cypList.length > 0) cypAtcCount++;

  // PK, MoA, PubChem
  const kubHalfLife = cleanKubText(d['KÜB Yarı Ömür (Türkçe)']);
  const halfLife = kubHalfLife || capText(stripHtmlTags(d['Farmakokinetik Yarı Ömür']), 260);
  const moa = capText(d['Etki Mekanizması'], 520);
  const metabolism = capText(d['Metabolizma ve Atılım'], 450);
  const proteinBinding = capText(d['Protein Bağlanma'], 200);
  const ddd = String(d['WHO Tanımlı Günlük Doz (DDD)'] || '').trim();
  const route = String(d['WHO Uygulama Yolu'] || '').trim();
  const formula = String(d['Kimyasal Formül'] || '').trim();
  const mw = String(d['Molekül Ağırlığı'] || '').trim();
  const pubchem = d['PubChem CID'] ? String(d['PubChem CID']) : '';

  const rec = {
    atc,
    genericTr: String(d['Etkin Madde (Türkçe)'] || d['ATC Adı'] || d['Uluslararası INN Adı'] || '').trim(),
    genericEn: String(d['Uluslararası INN Adı'] || d['ATC Adı'] || '').trim(),
    drugClass: String(d['ATC Seviye 2 (Terapötik Grup)'] || '').trim(),
    l1: String(d['ATC Seviye 1 (Anatomik Sistem)'] || '').trim(),
    l3: String(d['ATC Seviye 3 (Farmakolojik Grup)'] || '').trim(),
    l4: String(d['ATC Seviye 4 (Kimyasal Grup)'] || '').trim(),
    adultDose,
    pediatricDose: pedDose,
    pregnancyFda: String(d['Gebelik Kategorisi (FDA)'] || '').trim(),
    pregnancyPllr: pregPllr,
    lactation: capText(d['Laktasyon ve Anne Sütü Özeti'], 700),
    lactmed: String(d['LactMed Monograf Bağlantısı'] || '').trim(),
    organImpairment,
    blackBox,
    contraindications,
    contraDiseases,
    indications,
    rxnorm: String(d['RxNorm RxCUI'] || '').trim(),
    chembl: String(d['ChEMBL Kimliği'] || '').trim(),
    phase: String(d['Klinik Geliştirme Fazı'] || '').trim(),
    storage: String(d['Saklama Koşulu'] || '').trim(),
    dailyMedSpl: String(d['DailyMed SPL XML'] || '').trim(),
    brands: brandsByAtc[atc] || [],
    hasKub,
    // Yeni v2 klinik zenginleştirmeler
    ...(foodList.length > 0 ? { food: foodList } : {}),
    ...(diseaseList.length > 0 ? { disease: diseaseList } : {}),
    ...((ddiM + ddiO + ddiMin) > 0 ? { ddiCnt: [ddiM, ddiO, ddiMin] } : {}),
    ...(ddiMajorList.length > 0 ? { ddiMajor: ddiMajorList } : {}),
    ...(dupGroup.length > 0 ? { dupGroup } : {}),
    ...(dili ? { dili } : {}),
    ...(diliSum ? { diliSum } : {}),
    ...(diliUrl ? { diliUrl } : {}),
    ...(cypList.length > 0 ? { cyp: cypList } : {}),
    ...(moa ? { moa } : {}),
    ...(halfLife ? { halfLife } : {}),
    ...(metabolism ? { metabolism } : {}),
    ...(proteinBinding ? { proteinBinding } : {}),
    ...(ddd ? { ddd } : {}),
    ...(route ? { route } : {}),
    ...(formula ? { formula } : {}),
    ...(mw ? { mw } : {}),
    ...(pubchem ? { pubchem } : {})
  };

  monographsByAtc[atc] = rec;
}

// Master Monograf yaz
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
const outputJson = JSON.stringify(monographsByAtc);
const outputBuffer = Buffer.from(outputJson, 'utf8');
const gzippedBuffer = zlib.gzipSync(outputBuffer, { level: 9 });
fs.writeFileSync(OUTPUT_FILE, outputJson, 'utf8');
if (fs.existsSync(path.dirname(DIST_FILE))) {
  fs.writeFileSync(DIST_FILE, outputJson, 'utf8');
}

// 14 ATC-1 Türkçe KÜB Shard'larını yaz
fs.mkdirSync(KUB_DIR, { recursive: true });
const syncDistKub = fs.existsSync(path.dirname(DIST_FILE));
if (syncDistKub) fs.mkdirSync(DIST_KUB_DIR, { recursive: true });

let totalKubRaw = 0;
let totalKubGzip = 0;
const shardLetters = Object.keys(kubShards).sort();

for (const letter of shardLetters) {
  const shardStr = JSON.stringify(kubShards[letter]);
  const shardBuf = Buffer.from(shardStr, 'utf8');
  const shardGz = zlib.gzipSync(shardBuf, { level: 9 });
  totalKubRaw += shardBuf.length;
  totalKubGzip += shardGz.length;
  const filename = `kub_${letter}.json`;
  fs.writeFileSync(path.join(KUB_DIR, filename), shardStr, 'utf8');
  if (syncDistKub) {
    fs.writeFileSync(path.join(DIST_KUB_DIR, filename), shardStr, 'utf8');
  }
}

console.log('-----------------------------------------------------------------');
console.log('✅ MASTER KLİNİK MONOGRAF + 14 KÜB SHARD ÜRETİLDİ:');
console.log(`📄 Master Monograf : ${OUTPUT_FILE}`);
console.log(`🔢 Tekil ATC       : ${Object.keys(monographsByAtc).length.toLocaleString('tr-TR')} monograf`);
console.log(`📦 Master Boyut    : ${(outputBuffer.length / (1024 * 1024)).toFixed(2)} MB ham / ${(gzippedBuffer.length / 1024).toFixed(1)} KB GZIP`);
console.log(`📚 KÜB Shard (${shardLetters.length})  : ${kubAtcCount} ATC | ${(totalKubRaw / (1024 * 1024)).toFixed(2)} MB ham / ${(totalKubGzip / 1024).toFixed(1)} KB GZIP (${shardLetters.join(', ')})`);
console.log('-----------------------------------------------------------------');
console.log('📈 YENİ v2 KLİNİK ALAN KAPSAMI:');
console.log(`  • Resmi Türkçe KÜB (EBYS temiz): ${kubAtcCount} ATC`);
console.log(`  • Besin Etkileşimleri (DDInter): ${foodAtcCount} ATC`);
console.log(`  • Hastalık Etkileşimi (DDInter): ${diseaseAtcCount} ATC`);
console.log(`  • LiverTox DILI Skoru          : ${diliAtcCount} ATC`);
console.log(`  • CYP Enzim Profili            : ${cypAtcCount} ATC`);
console.log(`  • Terapötik Duplikasyon Grubu  : ${dupAtcCount} ATC`);
console.log(`  • Kara Kutu (Black Box)        : ${blackBoxCount} ATC`);
console.log('=================================================================');
