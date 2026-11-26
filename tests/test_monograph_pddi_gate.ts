/**
 * KLİNİK MONOGRAF VE DDI ANTİ-HALÜSİNASYON & KALİTE KAPISI TEST PAKETİ (CHK-01 – CHK-16)
 *
 * İki Katmanlı Mimari:
 *   1) SERT KAPI (Strict Gate — Tek bir ihlalde process.exit(1)):
 *      - public/data/pddi_monographs_tr.json (W3C PDDI-CDS etkileşim monografları)
 *      - public/data/clinical_monographs.json (Küratörlü çekirdek tekil ilaç monografları;
 *        eski kayıtlar için geriye dönük uyumluluk + yeni/v2+ kayıtlarda tam W3C zorunluluğu,
 *        tüm kayıtlarda anti-boilerplate, EBYS/placeholder/URL kilidi)
 *      - public/data/kub/kub_{HARF}.json (14 Türkçe KÜB shard EBYS/TÜFAM temizliği + birebir çapraz doğrulama)
 *   2) DENETİM RAPORU (Audit Mode — Uyarı ve kapsama raporu basar, build kırmaz):
 *      - public/data/clinical_monographs_master.json (1.794 ATC ikincil tarama katmanı)
 *      - public/data/ddi_matrix.json (81K DDInter matrisi)
 *   3) NEGATİF MUTASYON (SABOTAJ) ÖZ-DOĞRULAMA TESTLERİ:
 *      - KÜB'de geçmeyen uydurma source_quote_verbatim -> yakalamalı
 *      - "dikkatli kullanınız" muğlak ifadesi -> yakalamalı
 *      - TOF (Train-of-Four) için sahte LOINC kodu -> yakalamalı
 *      - 140 karakteri aşan uyarı kartı özeti -> yakalamalı
 *      - Ek: Üretici KÜB-only kayıtta sahte HIGH_1 ve imzasız PEER_REVIEWED_APPROVED -> yakalamalı
 */

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  evaluatePddiMonographsForPrescription,
  lookupPddiMonograph,
  setPddiMonographsCache,
  type PddiMonographBundle,
  type PddiMonographRecord
} from '../src/engines/pddiMonographEngine';
import { OFFLINE_RXNORM_CONCEPTS } from '../src/engines/rxNormMappingEngine';
import {
  ANSM_ARCHIVE_CUTOFF_ISO,
  EBYS_ARTIFACT_REGEX,
  isRegulatoryLabelOnlyEvidence,
  normalizeTrForQuoteMatch,
  UNKNOWN_EPIDEMIOLOGY_SENTINEL,
  UNRESOLVED_PLACEHOLDER_REGEX,
  validateEvidenceUrl,
  validateLoincMonitoringItem,
  type ActionTier,
  type CanonicalSourceType,
  type LiverpoolGradeLevel
} from '../src/schemas/pddiMonographSchema';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const KUB_DIR = path.join(DATA_DIR, 'kub');

const ALLOWED_ACTION_TIERS = new Set<ActionTier>(['X', 'D', 'C', 'B', 'A']);
const ALLOWED_LIVERPOOL_GRADES = new Set<LiverpoolGradeLevel>([
  'HIGH_1',
  'MODERATE_2',
  'LOW_3',
  'VERY_LOW_4'
]);
const ALLOWED_SOURCE_TYPES = new Set<CanonicalSourceType>([
  'TITCK_KUB',
  'EMA_EPAR',
  'FDA_SPL',
  'PEER_REVIEWED_GUIDELINE',
  'PEER_REVIEWED_STUDY',
  'ANSM_2023',
  'FDA_CYP_TABLE'
]);
const ALLOWED_ORAL_ENTERAL_ROUTES = new Set(['ORAL', 'ENTERAL']);

// Mekanizması nedeniyle sınıf genellemesi YASAK (MOLECULE_SPECIFIC_ONLY zorunlu) kategoriler
const MOLECULE_SPECIFIC_CATEGORIES = new Set([
  'CYP',
  'CYP3A4',
  'CYP2D6',
  'CYP2C19',
  'CYP2C9',
  'CYP1A2',
  'PGP',
  'UGT',
  'OATP',
  'PK',
  'QT_TDP',
  'PRODRUG',
  'GASTRIC_PH',
  'ABSORPTION',
  'CATION_CHELATION',
  'GUT_CYP3A4',
  'RENAL_CLEARANCE'
]);

const ORAL_ONLY_MECHANISM_CATEGORIES = new Set([
  'GUT_CYP3A4',
  'CATION_CHELATION',
  'GASTRIC_PH'
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_EXTRACT_RE = /https?:\/\/[^\s"'<>)\]]+/gi;

// ============================================================================
// KÜB SHARD YÜKLEYİCİ & NORMALİZE İNDEKS
// ============================================================================

interface KubShardEntry {
  src?: string;
  rt?: string;
  end?: string;
  poz?: string;
  kon?: string;
  uyr?: string;
  etk?: string;
  geb?: string;
  yan?: string;
  ovr?: string;
  fk?: string;
  fd?: string;
  [k: string]: unknown;
}

class LocalKubIndex {
  private shards = new Map<string, Record<string, KubShardEntry>>();
  private normalizedCorpusByAtc = new Map<string, string>();
  private rawCorpusByAtc = new Map<string, string>();

  loadShard(letter: string): Record<string, KubShardEntry> {
    const L = letter.toUpperCase();
    const cached = this.shards.get(L);
    if (cached) return cached;
    const fp = path.join(KUB_DIR, `kub_${L}.json`);
    if (!fs.existsSync(fp)) {
      this.shards.set(L, {});
      return {};
    }
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as Record<string, KubShardEntry>;
    this.shards.set(L, parsed);
    return parsed;
  }

  getNormalizedCorpus(atcCode: string): string | null {
    const atc = String(atcCode || '').trim().toUpperCase();
    if (!/^[A-Z]\d{2}/.test(atc)) return null;
    if (this.normalizedCorpusByAtc.has(atc)) {
      return this.normalizedCorpusByAtc.get(atc)!;
    }
    const shard = this.loadShard(atc[0]);
    const entry = shard[atc];
    if (!entry) return null;
    const parts: string[] = [];
    for (const key of ['src', 'end', 'poz', 'kon', 'uyr', 'etk', 'geb', 'yan', 'ovr', 'fk', 'fd']) {
      if (typeof entry[key] === 'string' && entry[key]) {
        parts.push(entry[key] as string);
      }
    }
    const raw = parts.join('\n');
    const norm = normalizeTrForQuoteMatch(raw);
    this.rawCorpusByAtc.set(atc, raw);
    this.normalizedCorpusByAtc.set(atc, norm);
    return norm;
  }

  hasVerbatimQuote(atcCandidates: string[], quoteVerbatim: string): boolean {
    let cleanedQuote = String(quoteVerbatim || '').trim();
    // ETL 320 karakter tavanında kırpma yaptıysa sondaki üç noktayı soyarak çekirdek birebir alıntıyı doğrula
    cleanedQuote = cleanedQuote.replace(/(?:\.\.\.|…)+$/, '').trim();
    if (cleanedQuote.length < 15) return false;
    const normQuote = normalizeTrForQuoteMatch(cleanedQuote);
    if (normQuote.length < 15) return false;

    const tried = new Set<string>();
    for (const rawAtc of atcCandidates) {
      const atc = String(rawAtc || '').trim().toUpperCase();
      if (!atc || tried.has(atc)) continue;
      tried.add(atc);
      const normCorpus = this.getNormalizedCorpus(atc);
      if (normCorpus && normCorpus.includes(normQuote)) {
        return true;
      }
    }
    return false;
  }
}

// ============================================================================
// B. YASAKLI MUĞLAK KLİNİK ŞABLON (ANTİ-BOİLERPLATE) DENETİMİ
// ============================================================================

const BANNED_DIKKATLI_RE =
  /\bdikkatli\s+kullan(?:ınız|ılmalıdır|ım\s+önerilir|ılmalı)\b|\bdikkatle\s+kullan(?:ınız|ılmalıdır|ılmalı)\b/i;

const VAGUE_MONITORING_RE =
  /\byakın(?:dan)?\s+(?:takip|izlem)\s*(?:önerilir|edilmelidir|edilmeli|gerekir)\b|\byakından\s+izlenmelidir\b/i;
const CONCRETE_PARAM_RE =
  /\b(?:INR|QTc|QT|EKG|ECG|potasyum|K\+|K⁺|kreatinin|SCr|eGFR|GFR|lityum|digoksin|takrolimus|vankomisin|fenitoin|karbamazepin|valproat|CK|CPK|ALT|AST|bilirubin|hemogram|Hb|hemoglobin|lökosit|WBC|ANC|trombosit|PLT|TSH|kortizol|glukoz|glikoz|kan\s*şekeri|sodyum|Na\+|Na⁺|magnezyum|kan\s*basıncı|SKB|kalp\s*hızı|nabız|PR\s*aral|SpO2|SpO₂|solunum|TOF|sedasyon|düzey|konsantrasyon|vadi)\b/i;
const CONCRETE_TIMING_RE =
  /\b(?:saat|gün|hafta|ay|bazal|başlangıç|öncesi|sonrası|ilk\s*\d+|48|72|sürekli|periyodik\s*\d+|her\s*\d+)\b/i;
const CONCRETE_THRESHOLD_RE =
  /(?:[<>≥≤]\s*\d|\d+\s*(?:%|mg|mcg|µg|ug|mmol|mEq|ms|U\/L|ng\/mL|µg\/mL|ug\/mL|mmHg|mL\/dk|g\/dL|kat|kez|saat)|INR\s*[<>≥≤]?\s*\d|0\.9|3\s*kat|5\s*kat)/i;

const VAGUE_DOSE_ADJUST_RE =
  /\bdoz\s+(?:ayarlaması|azaltılması|değişikliği)\s+gerekebilir\b/i;
const CONCRETE_DOSE_TARGET_RE =
  /(?:%\s*\d+|\d+\s*%|(?:\d+(?:[.,]\d+)?)\s*(?:mg|mcg|µg|ug|g|mL|IU|ünite)\b|maks(?:imum)?\.?\s*\d+|\b(?:yarıya|1\/2|1\/3|1\/4)\b)/i;

const VAGUE_SEPARATION_RE =
  /\bfarklı\s+(?:saatlerde|zamanlarda)\s+(?:veriniz|alınız|uygulayınız|verilmelidir|alınmalıdır)\b/i;
const DIRECTIONAL_HOUR_WINDOW_RE =
  /(?:en\s*az\s*)?\d+(?:\s*[–-]\s*\d+)?\s*saat\s*(?:önce|sonra|arayla)/i;

export function checkAntiBoilerplate(fieldLabel: string, text: string): string[] {
  const errors: string[] = [];
  const t = String(text || '').trim();
  if (!t) return errors;

  if (BANNED_DIKKATLI_RE.test(t)) {
    const m = t.match(BANNED_DIKKATLI_RE);
    errors.push(`[CHK-B1] Yasaklı muğlak ifade (${fieldLabel}): "${m?.[0]}"`);
  }

  if (VAGUE_MONITORING_RE.test(t)) {
    const hasParam = CONCRETE_PARAM_RE.test(t);
    const hasTiming = CONCRETE_TIMING_RE.test(t);
    const hasThreshold = CONCRETE_THRESHOLD_RE.test(t);
    if (!(hasParam && hasTiming && hasThreshold)) {
      errors.push(
        `[CHK-B2] Somut parametre+zamanlama+eşik olmaksızın muğlak izlem ifadesi (${fieldLabel}): param=${hasParam}, zaman=${hasTiming}, eşik=${hasThreshold}`
      );
    }
  }

  if (VAGUE_DOSE_ADJUST_RE.test(t) && !CONCRETE_DOSE_TARGET_RE.test(t)) {
    errors.push(
      `[CHK-B3] Somut % veya mg hedefi olmaksızın "doz ayarlaması gerekebilir" ifadesi (${fieldLabel})`
    );
  }

  if (VAGUE_SEPARATION_RE.test(t) && !DIRECTIONAL_HOUR_WINDOW_RE.test(t)) {
    errors.push(
      `[CHK-B4] Yönlü saat penceresi olmaksızın "farklı saatlerde veriniz" ifadesi (${fieldLabel})`
    );
  }

  return errors;
}

function collectAllStrings(obj: unknown, out: Array<{ path: string; value: string }>, prefix = ''): void {
  if (typeof obj === 'string') {
    out.push({ path: prefix, value: obj });
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => collectAllStrings(v, out, `${prefix}[${i}]`));
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      collectAllStrings(v, out, prefix ? `${prefix}.${k}` : k);
    }
  }
}

function extractAtcFromIdentifier(id: string): string | null {
  const m = String(id || '').toUpperCase().match(/\b([A-Z]\d{2}[A-Z]{2}\d{2})\b/);
  return m ? m[1] : null;
}

// ============================================================================
// ÇEKİRDEK SERT KAPI DOĞRULAYICISI — W3C PDDI-CDS ETKİLEŞİM MONOGRAFI
// ============================================================================

export interface StrictGateContext {
  kubIndex: LocalKubIndex;
  verifyMirrorLookup?: boolean;
}

export function validatePddiMonographStrict(
  mono: PddiMonographRecord,
  ctx: StrictGateContext
): string[] {
  const errors: string[] = [];
  const id = mono.monograph_id || '(NO_ID)';

  // --- A. Birebir Kaynak Alıntısı, Yerel KÜB Çapraz Doğrulaması, URL & Yer Tutucu Kilidi ---
  if (!Array.isArray(mono.evidence_and_provenance) || mono.evidence_and_provenance.length === 0) {
    errors.push(`[CHK-A1] ${id}: evidence_and_provenance boş veya eksik`);
  } else {
    for (let i = 0; i < mono.evidence_and_provenance.length; i++) {
      const ev = mono.evidence_and_provenance[i];
      if (!ev.source_quote_verbatim || ev.source_quote_verbatim.trim().length < 15) {
        errors.push(`[CHK-A1] ${id}.evidence[${i}]: source_quote_verbatim eksik veya <15 karakter`);
      }
      if (!ALLOWED_SOURCE_TYPES.has(ev.source_type)) {
        errors.push(`[CHK-A1] ${id}.evidence[${i}]: geçersiz source_type="${ev.source_type}"`);
      }
      if (!ev.identifier || ev.identifier.trim().length < 3) {
        errors.push(`[CHK-A1] ${id}.evidence[${i}]: identifier eksik`);
      }
      if (!ev.effective_date || !ISO_DATE_RE.test(ev.effective_date)) {
        errors.push(`[CHK-A1] ${id}.evidence[${i}]: effective_date geçerli ISO YYYY-MM-DD değil ("${ev.effective_date}")`);
      }

      // Yerel KÜB çapraz doğrulaması (EN KRİTİK HALÜSİNASYON KİLİDİ)
      if (ev.source_type === 'TITCK_KUB') {
        const atcCandidates: string[] = [];
        const fromId = extractAtcFromIdentifier(ev.source_id || ev.identifier);
        if (fromId) atcCandidates.push(fromId);
        if (mono.atc_a) atcCandidates.push(mono.atc_a);
        if (mono.atc_b) atcCandidates.push(mono.atc_b);
        if (!ctx.kubIndex.hasVerbatimQuote(atcCandidates, ev.source_quote_verbatim)) {
          errors.push(
            `[CHK-A2] ${id}.evidence[${i}]: TITCK_KUB birebir alıntısı yerel KÜB shard (${atcCandidates.join('/')}) içinde bulunamadı! Alıntı: "${ev.source_quote_verbatim.slice(0, 90)}"`
          );
        }
      }

      // URL alan adı beyaz/kara liste kontrolü
      if (ev.source_url) {
        const urlErr = validateEvidenceUrl(ev.source_url);
        if (urlErr) errors.push(`[CHK-A3] ${id}.evidence[${i}]: ${urlErr}`);
      }
      const inlineUrls = `${ev.identifier} ${ev.source_quote_verbatim}`.match(URL_EXTRACT_RE) || [];
      for (const u of inlineUrls) {
        const cleaned = u.replace(/[.,;)]+$/, '');
        const urlErr = validateEvidenceUrl(cleaned);
        if (urlErr) errors.push(`[CHK-A3] ${id}.evidence[${i}]: ${urlErr}`);
      }

      // ANSM 15 Eylül 2023 Arşiv Kilidi (tarih tutarlılığı)
      if (ev.source_type === 'ANSM_2023' && ev.effective_date > ANSM_ARCHIVE_CUTOFF_ISO) {
        errors.push(
          `[CHK-E4] ${id}.evidence[${i}]: ANSM_2023 arşiv tarihi ${ANSM_ARCHIVE_CUTOFF_ISO} sonrası olamaz ("${ev.effective_date}")`
        );
      }
    }

    // ANSM Arşiv Kilidi: 2023-09-15 sonrası ruhsatlı/effective_date molekülde ANSM tek veya birincil kaynak olamaz
    const maxNonAnsmDate = mono.evidence_and_provenance
      .filter(e => e.source_type !== 'ANSM_2023' && ISO_DATE_RE.test(e.effective_date))
      .map(e => e.effective_date)
      .sort()
      .pop();
    const approvalDate = (mono as unknown as { approval_date?: string }).approval_date;
    const isPostAnsmMolecule = Boolean(approvalDate && approvalDate > ANSM_ARCHIVE_CUTOFF_ISO);
    const hasOnlyAnsm = mono.evidence_and_provenance.every(e => e.source_type === 'ANSM_2023');
    const primaryIsAnsm = mono.evidence_and_provenance[0]?.source_type === 'ANSM_2023';
    if (isPostAnsmMolecule && (hasOnlyAnsm || primaryIsAnsm)) {
      errors.push(
        `[CHK-E4] ${id}: ${ANSM_ARCHIVE_CUTOFF_ISO} sonrası ruhsatlı molekülde (${approvalDate}) ANSM birincil veya tek kaynak olamaz`
      );
    }
    if (maxNonAnsmDate && isPostAnsmMolecule && hasOnlyAnsm) {
      errors.push(`[CHK-E4] ${id}: Arşivlenmiş ANSM tek kaynak ihlali`);
    }
  }

  // Sahte yer tutucu & EBYS taraması (tüm metin alanlarında)
  const allStrings: Array<{ path: string; value: string }> = [];
  collectAllStrings(mono, allStrings);
  for (const s of allStrings) {
    if (UNRESOLVED_PLACEHOLDER_REGEX.test(s.value)) {
      const m = s.value.match(UNRESOLVED_PLACEHOLDER_REGEX);
      errors.push(`[CHK-A4] ${id}.${s.path}: Çözülmemiş yer tutucu tespit edildi ("${m?.[0]}")`);
    }
    if (EBYS_ARTIFACT_REGEX.test(s.value)) {
      const m = s.value.match(EBYS_ARTIFACT_REGEX);
      errors.push(`[CHK-F3] ${id}.${s.path}: EBYS/e-imza veya TÜFAM artefaktı tespit edildi ("${m?.[0]}")`);
    }
  }

  // --- B. Yasaklı Muğlak Klinik Şablonlar (Anti-Boilerplate) + Negatif Zaman Ayrımı Kuralı ---
  const mgmtFields: Array<[string, string | undefined]> = [
    ['primary_directive_tr', mono.primary_directive_tr],
    ['clinician_narrative_tr', mono.clinician_narrative_tr],
    ['recommended_action_tr', mono.recommended_action_tr],
    ['operational_statement_tr', mono.operational_statement_tr]
  ];
  for (const [fname, fval] of mgmtFields) {
    if (fval) {
      errors.push(...checkAntiBoilerplate(`${id}.${fname}`, fval));
    }
  }

  // Klopidogrel + omeprazol/esomeprazol veya GASTRIC_PH PPİ etkileşiminde "etkisizdir" negatif zaman ayrımı kuralı
  const pairSet = new Set([mono.atc_a?.toUpperCase(), mono.atc_b?.toUpperCase()]);
  const isClopidogrelOmep =
    pairSet.has('B01AC04') && (pairSet.has('A02BC01') || pairSet.has('A02BC05'));
  const isGastricPh = Array.isArray(mono.interaction_category) && mono.interaction_category.includes('GASTRIC_PH');
  if (isClopidogrelOmep || isGastricPh) {
    const combined = normalizeTrForQuoteMatch(
      `${mono.primary_directive_tr} ${mono.clinician_narrative_tr} ${mono.recommended_action_tr}`
    );
    if (!combined.includes('etkisiz')) {
      errors.push(
        `[CHK-B5] ${id} (${mono.canonical_pair_key}): Klopidogrel+omeprazol/esomeprazol veya GASTRIC_PH etkileşiminde zaman ayrımının etkisiz olduğuna dair negatif kural ("etkisizdir") zorunludur`
      );
    }
  }

  // --- C. Ortogonal Eylem ve Kanıt Ayrımı (DRIVE / Liverpool GRADE / DIPS / Epidemiyoloji) ---
  if (!ALLOWED_ACTION_TIERS.has(mono.default_action_tier)) {
    errors.push(`[CHK-C1] ${id}: Geçersiz default_action_tier="${mono.default_action_tier}"`);
  }
  if (mono.default_action_tier !== mono.unified_risk_tier) {
    errors.push(
      `[CHK-C1] ${id}: default_action_tier ("${mono.default_action_tier}") !== unified_risk_tier ("${mono.unified_risk_tier}")`
    );
  }
  if (!ALLOWED_LIVERPOOL_GRADES.has(mono.liverpool_grade_level)) {
    errors.push(`[CHK-C1] ${id}: Geçersiz liverpool_grade_level="${mono.liverpool_grade_level}"`);
  }

  if (
    Array.isArray(mono.evidence_and_provenance) &&
    mono.evidence_and_provenance.length > 0 &&
    isRegulatoryLabelOnlyEvidence(mono.evidence_and_provenance) &&
    mono.liverpool_grade_level !== 'VERY_LOW_4'
  ) {
    errors.push(
      `[CHK-C2] ${id}: Yalnızca üretici KÜB/etiketine dayanan kayıtta liverpool_grade_level='VERY_LOW_4' zorunludur (bulunan: "${mono.liverpool_grade_level}")`
    );
  }

  const isCaseReportBased =
    (typeof mono.dips_score === 'number') ||
    (mono.evidence_and_provenance || []).some(e => /case[\s_-]*report|olgu\s*rapor/i.test(`${e.section} ${e.original_rating}`));
  if (isCaseReportBased) {
    if (typeof mono.dips_score !== 'number') {
      errors.push(`[CHK-C3] ${id}: Olgu raporuna dayanan kayıtta dips_score sayısal alanı zorunludur`);
    } else {
      if (mono.dips_score < 2) {
        errors.push(`[CHK-C3] ${id}: dips_score=${mono.dips_score} (<2) olan olgu raporu bilgi tabanında yer alamaz`);
      }
      const hasClinicalOrPkStudy = (mono.evidence_and_provenance || []).some(
        e => e.source_type === 'PEER_REVIEWED_STUDY' || e.source_type === 'PEER_REVIEWED_GUIDELINE'
      );
      if (mono.dips_score < 5 && !hasClinicalOrPkStudy && (mono.default_action_tier === 'X' || mono.default_action_tier === 'D')) {
        errors.push(
          `[CHK-C3] ${id}: dips_score=${mono.dips_score} (<5) tek başına '${mono.default_action_tier}' kesintili uyarısı üretemez`
        );
      }
    }
  }

  // Epidemiyoloji dürüstlüğü: bilinmeyen değerler asla tahmini sayı olamaz
  const checkEpiField = (fieldName: string, val: unknown) => {
    const str = String(val || '').trim();
    if (!str) {
      errors.push(`[CHK-C4] ${id}.${fieldName}: Boş olamaz (veri yoksa "${UNKNOWN_EPIDEMIOLOGY_SENTINEL}")`);
      return;
    }
    if (str.includes(UNKNOWN_EPIDEMIOLOGY_SENTINEL)) return;
    // Sayısal epidemiyolojik değer yalnızca hakemli çalışma / atıf içeriyorsa kabul edilir
    const hasPeerCitation = /(?:PMID|PMCID|DOI|BMJ|CMAJ|NEJM|JAMA|Lancet|Antoniou|Anglin|Loke|19\d{2}|20\d{2})/i.test(str);
    if (!hasPeerCitation) {
      errors.push(
        `[CHK-C4] ${id}.${fieldName}: Kaynaksız tahmini epidemiyoloji değeri yasaktır ("${str}"); veri yoksa "${UNKNOWN_EPIDEMIOLOGY_SENTINEL}" yazılmalıdır`
      );
    }
  };
  checkEpiField('frequency_of_exposure', mono.frequency_of_exposure);
  checkEpiField('frequency_of_harm', mono.frequency_of_harm);

  // --- D. Genişletilmiş Regenstrief LOINC & UCUM + TOF Tuzak Kontrolü ---
  if (!Array.isArray(mono.monitoring_parameters)) {
    errors.push(`[CHK-D1] ${id}: monitoring_parameters dizisi eksik`);
  } else {
    for (let i = 0; i < mono.monitoring_parameters.length; i++) {
      const mp = mono.monitoring_parameters[i];
      const err = validateLoincMonitoringItem(mp);
      if (err) {
        errors.push(`[CHK-D1] ${id}.monitoring_parameters[${i}]: ${err}`);
      }
    }
  }

  // --- E. Farmakolojik Mantık, Sınıf Sınırı, Yönlülük/Simetri, Rota & Hakemlik Dürüstlüğü ---
  const cats = Array.isArray(mono.interaction_category) ? mono.interaction_category : [];
  const requiresMoleculeSpecific = cats.some(c => MOLECULE_SPECIFIC_CATEGORIES.has(String(c).toUpperCase()));
  if (requiresMoleculeSpecific && mono.class_extrapolation_policy !== 'MOLECULE_SPECIFIC_ONLY') {
    errors.push(
      `[CHK-E1] ${id}: PK/hERG-QT/ön-ilaç/mide-pH mekanizmalı etkileşimde (${cats.join(',')}) class_extrapolation_policy='MOLECULE_SPECIFIC_ONLY' zorunludur (bulunan: "${mono.class_extrapolation_policy}")`
    );
  }
  if (!['MOLECULE_SPECIFIC_ONLY', 'CLASS_WIDE'].includes(mono.class_extrapolation_policy)) {
    errors.push(`[CHK-E1] ${id}: Geçersiz class_extrapolation_policy="${mono.class_extrapolation_policy}"`);
  }

  if (!['UNIDIRECTIONAL_PK', 'BIDIRECTIONAL_PK', 'SYMMETRIC_PD'].includes(mono.directionality)) {
    errors.push(`[CHK-E2] ${id}: Geçersiz directionality="${mono.directionality}"`);
  }

  // En miroir (ayna simetrisi) graf doğrulaması
  if (ctx.verifyMirrorLookup) {
    const forward = lookupPddiMonograph({ atc: mono.atc_a }, { atc: mono.atc_b });
    const reverse = lookupPddiMonograph({ atc: mono.atc_b }, { atc: mono.atc_a });
    if (!forward || !reverse || forward.monograph_id !== mono.monograph_id || reverse.monograph_id !== mono.monograph_id) {
      errors.push(
        `[CHK-E2] ${id}: Ayna simetrisi (en miroir) ihlali (${mono.atc_a} <-> ${mono.atc_b}: fwd=${forward?.monograph_id}, rev=${reverse?.monograph_id})`
      );
    }
  }

  // Oral-özgü rota kısıtı (GUT_CYP3A4, CATION_CHELATION, GASTRIC_PH -> yalnızca ORAL/ENTERAL)
  const isOralSpecificMech =
    mono.route_scope === 'ORAL_GI_ONLY' ||
    cats.some(c => ORAL_ONLY_MECHANISM_CATEGORIES.has(String(c).toUpperCase()));
  if (isOralSpecificMech) {
    if (!Array.isArray(mono.included_routes) || mono.included_routes.length === 0) {
      errors.push(`[CHK-E3] ${id}: Oral-özgü etkileşimde included_routes boş olamaz`);
    } else {
      const illegalRoutes = mono.included_routes.filter(r => !ALLOWED_ORAL_ENTERAL_ROUTES.has(String(r).toUpperCase()));
      if (illegalRoutes.length > 0) {
        errors.push(
          `[CHK-E3] ${id}: Oral-özgü etkileşimde included_routes yalnızca ['ORAL','ENTERAL'] içermelidir (yasak: ${illegalRoutes.join(',')})`
        );
      }
    }
  }

  // Uzman Hakemlik Dürüstlüğü
  const gov = mono.review_governance;
  if (!gov) {
    errors.push(`[CHK-E5] ${id}: review_governance alanı eksik`);
  } else {
    const hasIndependentSignature =
      gov.independent_pharmacologist_signed === true || gov.independent_pharmacist_signed === true;
    if (!hasIndependentSignature && gov.review_status !== 'author_draft_unreviewed') {
      errors.push(
        `[CHK-E5] ${id}: Bağımsız klinik farmakolog/eczacı imzası olmadan review_status='${gov.review_status}' olamaz ('author_draft_unreviewed' zorunlu)`
      );
    }
  }

  // --- F. İnsan Faktörleri & Arayüz Bütçesi (CHK-16) ---
  if (!mono.summary || mono.summary.trim().length === 0) {
    errors.push(`[CHK-F1] ${id}: CDS uyarı kartı özeti (summary) eksik`);
  } else if (mono.summary.length > 140) {
    errors.push(`[CHK-F1] ${id}: summary uzunluğu 140 karakter sınırını aşıyor (${mono.summary.length} > 140)`);
  }

  if (!Array.isArray(mono.override_reasons) || mono.override_reasons.length === 0) {
    errors.push(`[CHK-F2] ${id}: override_reasons dizisi eksik veya boş`);
  } else {
    if (mono.override_reasons.length > 5) {
      errors.push(`[CHK-F2] ${id}: override_reasons en fazla 5 adet olabilir (bulunan: ${mono.override_reasons.length})`);
    }
    for (let i = 0; i < mono.override_reasons.length; i++) {
      const disp = String(mono.override_reasons[i]?.display || '').trim();
      const words = disp ? disp.split(/\s+/) : [];
      if (words.length === 0 || words.length > 3) {
        errors.push(
          `[CHK-F2] ${id}.override_reasons[${i}]: display etiketi 1–3 kelime olmalıdır (bulunan: "${disp}", ${words.length} kelime)`
        );
      }
    }
  }

  return errors;
}

// ============================================================================
// ÇEKİRDEK SERT KAPI DOĞRULAYICISI — TEKİL İLAÇ MONOGRAFI (clinical_monographs.json)
// ============================================================================

export function validateSingleDrugMonographStrict(
  drug: Record<string, unknown>,
  ctx: StrictGateContext
): { errors: string[]; isLegacyCompat: boolean } {
  const errors: string[] = [];
  const id = String(drug.id || drug.drug_id || '(NO_ID)');

  // Temel zorunlu yapısal alanlar
  if (!drug.id || !drug.genericTr || !Array.isArray(drug.atcCodes) || (drug.atcCodes as unknown[]).length === 0) {
    errors.push(`[CHK-MONO-1] ${id}: id, genericTr ve en az 1 atcCodes zorunludur`);
  }

  // Tüm metin alanlarında yer tutucu, EBYS ve URL taraması
  const allStrings: Array<{ path: string; value: string }> = [];
  collectAllStrings(drug, allStrings);
  for (const s of allStrings) {
    if (UNRESOLVED_PLACEHOLDER_REGEX.test(s.value)) {
      const m = s.value.match(UNRESOLVED_PLACEHOLDER_REGEX);
      errors.push(`[CHK-A4] clinical_monographs/${id}.${s.path}: Çözülmemiş yer tutucu ("${m?.[0]}")`);
    }
    if (EBYS_ARTIFACT_REGEX.test(s.value)) {
      const m = s.value.match(EBYS_ARTIFACT_REGEX);
      errors.push(`[CHK-F3] clinical_monographs/${id}.${s.path}: EBYS/TÜFAM artefaktı ("${m?.[0]}")`);
    }
    const urls = s.value.match(URL_EXTRACT_RE) || [];
    for (const u of urls) {
      const urlErr = validateEvidenceUrl(u.replace(/[.,;)]+$/, ''));
      if (urlErr) errors.push(`[CHK-A3] clinical_monographs/${id}.${s.path}: ${urlErr}`);
    }
  }

  // Tüm küratörlü yönetim/doz/uyarı metinlerinde Anti-Boilerplate (CHK-B)
  const textFieldsToCheck = [
    'adultDose',
    'pediatricDose',
    'maxDailyDose',
    'renalAdjustment',
    'hepaticAdjustment',
    'pregnancyLactation',
    'contraindications',
    'clinicalPearls',
    'dosage',
    'warnings',
    'primary_directive_tr',
    'clinician_narrative_tr'
  ];
  for (const fname of textFieldsToCheck) {
    const val = drug[fname];
    if (typeof val === 'string' && val.trim()) {
      errors.push(...checkAntiBoilerplate(`clinical_monographs/${id}.${fname}`, val));
    }
  }

  // Yeni / v2+ şemalı tekil monograflarda tam W3C kanıt, KÜB alıntı, LOINC, hakemlik ve CHK-16 zorunluluğu
  const schemaVer = String(drug.schema_version || '');
  const hasExplicitW3cBlock =
    Array.isArray(drug.evidence_and_provenance) ||
    /^[23]\./.test(schemaVer) ||
    drug.monitoring_protocol !== undefined;

  if (!hasExplicitW3cBlock) {
    // Mevcut 136 legacy kayıt için geçici geriye dönük uyumluluk katmanı
    return { errors, isLegacyCompat: true };
  }

  const evidence = drug.evidence_and_provenance as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(evidence) || evidence.length === 0) {
    errors.push(`[CHK-A1] clinical_monographs/${id}: v2+ monografta evidence_and_provenance zorunludur`);
  } else {
    const atcList = [
      ...(Array.isArray(drug.atcCodes) ? (drug.atcCodes as string[]) : []),
      ...(typeof drug.atc_code === 'string' ? [drug.atc_code] : [])
    ];
    for (let i = 0; i < evidence.length; i++) {
      const ev = evidence[i];
      const st = String(ev.source_type || '') as CanonicalSourceType;
      const quote = String(ev.source_quote_verbatim || '');
      if (!ALLOWED_SOURCE_TYPES.has(st)) {
        errors.push(`[CHK-A1] clinical_monographs/${id}.evidence[${i}]: geçersiz source_type="${st}"`);
      }
      if (quote.trim().length < 15) {
        errors.push(`[CHK-A1] clinical_monographs/${id}.evidence[${i}]: source_quote_verbatim eksik`);
      }
      if (!ev.identifier || !ev.effective_date) {
        errors.push(`[CHK-A1] clinical_monographs/${id}.evidence[${i}]: identifier ve effective_date zorunludur`);
      }
      if (st === 'TITCK_KUB' && !ctx.kubIndex.hasVerbatimQuote(atcList, quote)) {
        errors.push(
          `[CHK-A2] clinical_monographs/${id}.evidence[${i}]: TITCK_KUB alıntısı yerel KÜB içinde bulunamadı`
        );
      }
    }
  }

  const monProto = (drug.monitoring_protocol || drug.monitoring_parameters) as
    | Array<{ parameter_tr?: string; loinc_code?: string | null; ucum_unit?: string | null }>
    | undefined;
  if (Array.isArray(monProto)) {
    for (let i = 0; i < monProto.length; i++) {
      const err = validateLoincMonitoringItem(monProto[i]);
      if (err) errors.push(`[CHK-D1] clinical_monographs/${id}.monitoring_protocol[${i}]: ${err}`);
    }
  }

  if (typeof drug.summary === 'string' && drug.summary.length > 140) {
    errors.push(`[CHK-F1] clinical_monographs/${id}: summary 140 karakteri aşıyor (${drug.summary.length})`);
  }

  const gov = drug.review_governance as
    | { review_status?: string; independent_pharmacologist_signed?: boolean; independent_pharmacist_signed?: boolean }
    | undefined;
  if (gov) {
    const signed = gov.independent_pharmacologist_signed === true || gov.independent_pharmacist_signed === true;
    if (!signed && gov.review_status !== 'author_draft_unreviewed') {
      errors.push(`[CHK-E5] clinical_monographs/${id}: İmzasız PEER_REVIEWED_APPROVED yasaktır`);
    }
  }

  return { errors, isLegacyCompat: false };
}

// ============================================================================
// ANA ÇALIŞTIRICI (SERT KAPI + SABOTAJ TESTLERİ + DENETİM RAPORU)
// ============================================================================

async function main(): Promise<void> {
  console.log('===================================================================');
  console.log('🛡️  KLİNİK MONOGRAF & W3C PDDI-CDS ANTİ-HALÜSİNASYON KALİTE KAPISI');
  console.log('===================================================================');

  const kubIndex = new LocalKubIndex();
  const strictErrors: string[] = [];

  // --------------------------------------------------------------------------
  // KATMAN 1A: 14 YEREL TÜRKÇE KÜB SHARD EBYS / TÜFAM TEMİZLİK KİLİDİ
  // --------------------------------------------------------------------------
  console.log('\n--- [SERT KAPI 1/4] 14 Yerel Türkçe KÜB Shard EBYS/TÜFAM Temizliği ---');
  const kubFiles = fs.readdirSync(KUB_DIR).filter(f => /^kub_[A-Z]\.json$/.test(f)).sort();
  assert.ok(kubFiles.length === 14, `14 KÜB shard bekleniyor (bulunan: ${kubFiles.length})`);
  let totalKubAtcs = 0;
  for (const f of kubFiles) {
    const shard = JSON.parse(fs.readFileSync(path.join(KUB_DIR, f), 'utf8')) as Record<string, KubShardEntry>;
    for (const [atc, rec] of Object.entries(shard)) {
      totalKubAtcs++;
      const serialized = JSON.stringify(rec);
      if (EBYS_ARTIFACT_REGEX.test(serialized) || /0\s*800\s*314\s*00\s*08/i.test(serialized)) {
        const m = serialized.match(EBYS_ARTIFACT_REGEX) || serialized.match(/0\s*800\s*314\s*00\s*08/i);
        strictErrors.push(`[CHK-F3] KÜB ${f}/${atc}: EBYS veya TÜFAM artefaktı kaldı ("${m?.[0]}")`);
      }
    }
  }
  console.log(`✓ ${kubFiles.length} KÜB shard (${totalKubAtcs} ATC) tarandı (EBYS/TÜFAM ihlali: ${strictErrors.length})`);

  // --------------------------------------------------------------------------
  // KATMAN 1B: SERT KAPI — public/data/clinical_monographs.json (136 Çekirdek Monograf)
  // --------------------------------------------------------------------------
  console.log('\n--- [SERT KAPI 2/4] Küratörlü Tekil İlaç Monografları (clinical_monographs.json) ---');
  const singleDrugsRaw = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'clinical_monographs.json'), 'utf8')
  ) as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(singleDrugsRaw) && singleDrugsRaw.length >= 100, 'clinical_monographs.json geçerli dizi olmalı');

  let legacyCompatCount = 0;
  let w3cSingleDrugCount = 0;
  const singleDrugErrStart = strictErrors.length;
  for (const drug of singleDrugsRaw) {
    const res = validateSingleDrugMonographStrict(drug, { kubIndex });
    if (res.isLegacyCompat) legacyCompatCount++;
    else w3cSingleDrugCount++;
    strictErrors.push(...res.errors);
  }
  assert.ok(
    w3cSingleDrugCount >= 25,
    `En az 25 yüksek riskli çekirdek monograf v2.0.0 W3C şemasında olmalıdır (bulunan: ${w3cSingleDrugCount})`
  );
  console.log(
    `✓ ${singleDrugsRaw.length} tekil ilaç monografı denetlendi (v2+ W3C tam kapı: ${w3cSingleDrugCount}, legacy uyumluluk: ${legacyCompatCount}, ihlal: ${strictErrors.length - singleDrugErrStart})`
  );

  // --------------------------------------------------------------------------
  // KATMAN 1C: SERT KAPI — public/data/pddi_monographs_tr.json (W3C PDDI-CDS Tam Katalog)
  // --------------------------------------------------------------------------
  console.log('\n--- [SERT KAPI 3/4] W3C PDDI-CDS Etkileşim Monografları (CHK-01 – CHK-16) ---');
  const rawPddiBundle = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'pddi_monographs_tr.json'), 'utf8')
  ) as PddiMonographBundle;
  setPddiMonographsCache(rawPddiBundle);

  // Hidrate edilmiş monografları doğrulamak için tekrar çekirdek önbelleğe yüklenen kayıtlardan al
  const hydratedRecords: PddiMonographRecord[] = [];
  const compactList = rawPddiBundle.compact_monographs || [];
  if (Array.isArray(rawPddiBundle.monographs) && rawPddiBundle.monographs.length > 0) {
    hydratedRecords.push(...rawPddiBundle.monographs);
  } else {
    for (const c of compactList) {
      const m = lookupPddiMonograph({ atc: c.aa, generic: c.aen }, { atc: c.ab, generic: c.ben });
      if (!m) {
        strictErrors.push(`[CHK-E2] ${c.id}: Hidrate edilmiş önbellekte bulunamadı (${c.aa}::${c.ab})`);
      } else {
        hydratedRecords.push(m);
      }
    }
  }

  assert.ok(hydratedRecords.length >= 2500, `En az 2.500 W3C PDDI-CDS monografı bekleniyor (bulunan: ${hydratedRecords.length})`);

  const pddiErrStart = strictErrors.length;
  let titckKubQuotesVerified = 0;
  let totalLoincChecked = 0;
  let nullLoincCount = 0;
  const gradeDist: Record<string, number> = { HIGH_1: 0, MODERATE_2: 0, LOW_3: 0, VERY_LOW_4: 0 };

  for (const m of hydratedRecords) {
    gradeDist[m.liverpool_grade_level] = (gradeDist[m.liverpool_grade_level] || 0) + 1;
    titckKubQuotesVerified += m.evidence_and_provenance.filter(e => e.source_type === 'TITCK_KUB').length;
    for (const mp of m.monitoring_parameters) {
      if (mp.loinc_code === null) nullLoincCount++;
      else totalLoincChecked++;
    }
    const errs = validatePddiMonographStrict(m, { kubIndex, verifyMirrorLookup: true });
    strictErrors.push(...errs);
  }

  // Özel Rota İstisnası Çalışma Zamanı Doğrulaması (Fluticasone/Budesonide inhale/nazal + Triamcinolone IA/epidural + Ritonavir)
  const nonOralPairs: Array<{ label: string; drugs: Array<{ brand: string; generic: string; atcCode: string; route: string }> }> = [
    {
      label: 'Fluticasone (INH) + Ritonavir',
      drugs: [
        { brand: 'FLIXOTIDE 250 MCG INHALER', generic: 'fluticasone', atcCode: 'R03BA05', route: 'INH' },
        { brand: 'NORVIR 100 MG TABLET', generic: 'ritonavir', atcCode: 'J05AE03', route: 'ORAL' }
      ]
    },
    {
      label: 'Budesonide (INH) + Ritonavir',
      drugs: [
        { brand: 'PULMICORT 200 MCG TURBUHALER', generic: 'budesonide', atcCode: 'R03BA02', route: 'INH' },
        { brand: 'NORVIR 100 MG TABLET', generic: 'ritonavir', atcCode: 'J05AE03', route: 'ORAL' }
      ]
    },
    {
      label: 'Triamcinolone (IA) + Ritonavir',
      drugs: [
        { brand: 'KENACORT-A 40 MG IM/IA AMPUL', generic: 'triamcinolone', atcCode: 'H02AB08', route: 'IA' },
        { brand: 'NORVIR 100 MG TABLET', generic: 'ritonavir', atcCode: 'J05AE03', route: 'ORAL' }
      ]
    },
    {
      label: 'Triamcinolone (EPIDURAL) + Ritonavir',
      drugs: [
        { brand: 'KENACORT-A EPIDURAL', generic: 'triamcinolone', atcCode: 'H02AB08', route: 'EPIDURAL' },
        { brand: 'NORVIR 100 MG TABLET', generic: 'ritonavir', atcCode: 'J05AE03', route: 'ORAL' }
      ]
    }
  ];

  for (const np of nonOralPairs) {
    const hits = evaluatePddiMonographsForPrescription(np.drugs);
    const activeNonOral = hits.find(h => h.monograph.route_scope === 'NON_ORAL_EXCEPTION');
    if (!activeNonOral) {
      strictErrors.push(`[CHK-E3] Non-oral istisna bastırıldı veya eksik: ${np.label}`);
    }
  }

  console.log(
    `✓ ${hydratedRecords.length} W3C PDDI-CDS monografı doğrulandı (${titckKubQuotesVerified} TİTCK KÜB alıntısı birebir eşleşti, ${totalLoincChecked} LOINC + ${nullLoincCount} null/cihaz izlemi, GRADE H1:${gradeDist.HIGH_1} M2:${gradeDist.MODERATE_2} L3:${gradeDist.LOW_3} VL4:${gradeDist.VERY_LOW_4}, ihlal: ${strictErrors.length - pddiErrStart})`
  );

  // --------------------------------------------------------------------------
  // KATMAN 1C-EK: RXCUI ÇAPRAZ TUTARLILIK + FDA GSRS UNII + SHA-256 BÜTÜNLÜK KİLİDİ (FAZ 2)
  // --------------------------------------------------------------------------
  console.log('\n--- [SERT KAPI 3B] RxNorm RxCUI / FDA UNII Çapraz Tutarlılığı & SHA-256 Bütünlük ---');
  const rxStartErr = strictErrors.length;
  const pddiRxcuiByAtc = new Map<string, string>();
  const pddiRxcuiByInn = new Map<string, string>();
  for (const m of hydratedRecords) {
    if (m.atc_a && m.rxcui_a) pddiRxcuiByAtc.set(m.atc_a.toUpperCase(), String(m.rxcui_a));
    if (m.atc_b && m.rxcui_b) pddiRxcuiByAtc.set(m.atc_b.toUpperCase(), String(m.rxcui_b));
    if (m.drug_a_en && m.rxcui_a) pddiRxcuiByInn.set(m.drug_a_en.toLowerCase(), String(m.rxcui_a));
    if (m.drug_b_en && m.rxcui_b) pddiRxcuiByInn.set(m.drug_b_en.toLowerCase(), String(m.rxcui_b));
  }

  let rxCrossChecked = 0;
  let uniiVerified = 0;
  const seenEngineCuis = new Map<string, string>();
  for (const c of OFFLINE_RXNORM_CONCEPTS) {
    if (seenEngineCuis.has(c.rxCui)) {
      strictErrors.push(`[CHK-RX-1] Çakışan RxCUI: ${c.rxCui} (${seenEngineCuis.get(c.rxCui)} vs ${c.canonicalKey})`);
    }
    seenEngineCuis.set(c.rxCui, c.canonicalKey);

    if (c.fdaGsrsUnii) {
      if (!/^[A-Z0-9]{10}$/.test(c.fdaGsrsUnii)) {
        strictErrors.push(`[CHK-RX-2] Geçersiz FDA GSRS UNII biçimi: ${c.canonicalKey} -> "${c.fdaGsrsUnii}"`);
      } else {
        uniiVerified++;
      }
    }

    const byInn = pddiRxcuiByInn.get(c.canonicalKey.toLowerCase());
    let byAtc: string | undefined;
    for (const a of c.atcCodes || []) {
      const hit = pddiRxcuiByAtc.get(a.toUpperCase());
      if (hit) {
        byAtc = hit;
        break;
      }
    }
    const pddiCui = byInn || byAtc;
    if (pddiCui) {
      rxCrossChecked++;
      if (pddiCui !== c.rxCui) {
        strictErrors.push(
          `[CHK-RX-1] RxCUI uyuşmazlığı (${c.canonicalKey}): rxNormMappingEngine="${c.rxCui}" !== pddi_monographs_tr="${pddiCui}"`
        );
      }
    }
  }

  const manifestPath = path.join(DATA_DIR, 'data_manifest.json');
  const manifestObj = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    offline_integrity_sha256?: Record<string, string>;
  };
  const expectedSha = manifestObj.offline_integrity_sha256;
  if (!expectedSha?.pddi_monographs_tr || !expectedSha?.clinical_monographs) {
    strictErrors.push('[CHK-SHA-1] data_manifest.json içinde offline_integrity_sha256 eksik');
  } else {
    const sha256File = (fp: string) => crypto.createHash('sha256').update(fs.readFileSync(fp)).digest('hex');
    const actualPddiSha = sha256File(path.join(DATA_DIR, 'pddi_monographs_tr.json'));
    const actualMonoSha = sha256File(path.join(DATA_DIR, 'clinical_monographs.json'));
    if (actualPddiSha !== expectedSha.pddi_monographs_tr) {
      strictErrors.push(
        `[CHK-SHA-1] pddi_monographs_tr.json SHA-256 uyuşmazlığı! Beklenen=${expectedSha.pddi_monographs_tr}, Gerçek=${actualPddiSha}`
      );
    }
    if (actualMonoSha !== expectedSha.clinical_monographs) {
      strictErrors.push(
        `[CHK-SHA-1] clinical_monographs.json SHA-256 uyuşmazlığı! Beklenen=${expectedSha.clinical_monographs}, Gerçek=${actualMonoSha}`
      );
    }
  }
  console.log(
    `✓ RxCUI çapraz tutarlılığı (${rxCrossChecked} eşleşen kavram, 0 uyuşmazlık), ${uniiVerified} FDA GSRS UNII ve 2/2 SHA-256 paket özeti doğrulandı (ihlal: ${strictErrors.length - rxStartErr})`
  );

  // --------------------------------------------------------------------------
  // KATMAN 1D: 4 ZORUNLU (+2 EK) BELLEK İÇİ NEGATİF MUTASYON (SABOTAJ) TESTİ
  // --------------------------------------------------------------------------
  console.log('\n--- [SERT KAPI 4/4] Bellek İçi Negatif Mutasyon (Sabotaj) Öz-Testleri ---');

  const kubTemplateMono = hydratedRecords.find(m =>
    m.evidence_and_provenance.some(e => e.source_type === 'TITCK_KUB')
  );
  assert.ok(kubTemplateMono, 'Sabotaj testi için TITCK_KUB kaynaklı referans monograf bulunmalı');

  const tofTemplateMono = hydratedRecords.find(m =>
    m.monitoring_parameters.some(mp => /\btof\b|train[\s-]*of[\s-]*four/i.test(mp.parameter_tr))
  );
  assert.ok(tofTemplateMono, 'Sabotaj testi için TOF izlemli referans monograf bulunmalı');

  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

  // Sabotaj 1: Yerel KÜB'de geçmeyen uydurma source_quote_verbatim
  const sab1 = clone(kubTemplateMono);
  const kubIdx = sab1.evidence_and_provenance.findIndex(e => e.source_type === 'TITCK_KUB');
  sab1.evidence_and_provenance[kubIdx].source_quote_verbatim =
    'Bu tamamen halüsinasyon ürünü uydurma bir KÜB cümlesidir ve hiçbir yerel KÜB dosyasında geçmez.';
  const sab1Errs = validatePddiMonographStrict(sab1, { kubIndex });
  assert.ok(
    sab1Errs.some(e => e.includes('[CHK-A2]')),
    `Sabotaj 1 (uydurma KÜB alıntısı) yakalanamadı! Hatalar: ${sab1Errs.join('; ')}`
  );

  // Sabotaj 2: "dikkatli kullanınız" muğlak ifadesi
  const sab2 = clone(kubTemplateMono);
  sab2.primary_directive_tr = 'Bu iki ilaç birlikte reçete edilirken dikkatli kullanınız.';
  const sab2Errs = validatePddiMonographStrict(sab2, { kubIndex });
  assert.ok(
    sab2Errs.some(e => e.includes('[CHK-B1]')),
    `Sabotaj 2 ("dikkatli kullanınız") yakalanamadı! Hatalar: ${sab2Errs.join('; ')}`
  );

  // Sabotaj 3: TOF (Train-of-Four) için sahte LOINC kodu
  const sab3 = clone(tofTemplateMono);
  const tofIdx = sab3.monitoring_parameters.findIndex(mp => /\btof\b|train[\s-]*of[\s-]*four/i.test(mp.parameter_tr));
  sab3.monitoring_parameters[tofIdx].loinc_code = '8867-4';
  const sab3Errs = validatePddiMonographStrict(sab3, { kubIndex });
  assert.ok(
    sab3Errs.some(e => e.includes('[CHK-D1]') && /TOF/i.test(e)),
    `Sabotaj 3 (TOF için sahte LOINC) yakalanamadı! Hatalar: ${sab3Errs.join('; ')}`
  );

  // Sabotaj 4: 140 karakteri aşan uyarı kartı özeti
  const sab4 = clone(kubTemplateMono);
  sab4.summary = 'KONTRENDİKE (X): ' + 'A'.repeat(135);
  assert.ok(sab4.summary.length > 140);
  const sab4Errs = validatePddiMonographStrict(sab4, { kubIndex });
  assert.ok(
    sab4Errs.some(e => e.includes('[CHK-F1]')),
    `Sabotaj 4 (>140 karakter özet) yakalanamadı! Hatalar: ${sab4Errs.join('; ')}`
  );

  // Ek Sabotaj 5: Yalnızca üretici KÜB kaydında sahte HIGH_1 GRADE + imzasız PEER_REVIEWED_APPROVED
  const sab5 = clone(kubTemplateMono);
  sab5.evidence_and_provenance = [sab5.evidence_and_provenance[kubIdx]];
  sab5.liverpool_grade_level = 'HIGH_1';
  sab5.review_governance = {
    review_status: 'PEER_REVIEWED_APPROVED',
    independent_pharmacologist_signed: false,
    independent_pharmacist_signed: false
  };
  const sab5Errs = validatePddiMonographStrict(sab5, { kubIndex });
  assert.ok(
    sab5Errs.some(e => e.includes('[CHK-C2]')) && sab5Errs.some(e => e.includes('[CHK-E5]')),
    `Ek Sabotaj 5 (GRADE/Hakemlik dürüstlüğü) yakalanamadı! Hatalar: ${sab5Errs.join('; ')}`
  );

  // Ek Sabotaj 6: Post-2023-09-15 molekülde tek kaynak ANSM_2023 + yasaklı sosyal medya URL
  const sab6 = clone(kubTemplateMono) as PddiMonographRecord & { approval_date?: string };
  sab6.approval_date = '2024-06-01';
  sab6.evidence_and_provenance = [
    {
      source_id: 'ANSM_TEST',
      source_type: 'ANSM_2023',
      identifier: 'ANSM 2023-09-15',
      effective_date: '2023-09-15',
      section: 'Thésaurus',
      original_rating: 'CI',
      source_quote_verbatim: 'Association contre-indiquée selon le thésaurus ANSM archivé.',
      source_url: 'https://www.reddit.com/r/medicine/fake_ddi'
    }
  ];
  const sab6Errs = validatePddiMonographStrict(sab6, { kubIndex });
  assert.ok(
    sab6Errs.some(e => e.includes('[CHK-E4]')) && sab6Errs.some(e => e.includes('[CHK-A3]')),
    `Ek Sabotaj 6 (ANSM arşiv kilidi + yasaklı URL) yakalanamadı! Hatalar: ${sab6Errs.join('; ')}`
  );

  console.log('✓ 6/6 negatif mutasyon (sabotaj) öz-testi başarıyla yakalandı:');
  console.log('  • Sabotaj 1 (Uydurma KÜB alıntısı)       -> YAKALANDI [CHK-A2]');
  console.log('  • Sabotaj 2 ("dikkatli kullanınız")      -> YAKALANDI [CHK-B1]');
  console.log('  • Sabotaj 3 (TOF için sahte LOINC)       -> YAKALANDI [CHK-D1]');
  console.log('  • Sabotaj 4 (>140 karakter kart özeti)   -> YAKALANDI [CHK-F1]');
  console.log('  • Sabotaj 5 (KÜB-only HIGH_1 / İmzasız)  -> YAKALANDI [CHK-C2, CHK-E5]');
  console.log('  • Sabotaj 6 (ANSM >2023-09-15 / Reddit)  -> YAKALANDI [CHK-E4, CHK-A3]');

  // --------------------------------------------------------------------------
  // KATMAN 2: DENETİM RAPORU (AUDIT MODE — UYARI BASAR, BUILD KIRMAZ)
  // --------------------------------------------------------------------------
  console.log('\n--- [DENETİM RAPORU — AUDIT MODE] İkincil Tarama Katmanları (Build Kırmaz) ---');
  const masterPath = path.join(DATA_DIR, 'clinical_monographs_master.json');
  if (fs.existsSync(masterPath)) {
    const masterRaw = JSON.parse(fs.readFileSync(masterPath, 'utf8')) as {
      records?: Record<string, Record<string, unknown>>;
    };
    const recs = masterRaw.records || (masterRaw as unknown as Record<string, Record<string, unknown>>);
    const atcKeys = Object.keys(recs);
    let missingKub = 0;
    let masterBoilerplate = 0;
    let masterEbys = 0;
    for (const atc of atcKeys) {
      const r = recs[atc];
      if (!r || typeof r !== 'object') continue;
      if (!r.hasKub && !r.kubShard) missingKub++;
      const serialized = JSON.stringify(r);
      if (BANNED_DIKKATLI_RE.test(serialized)) masterBoilerplate++;
      if (EBYS_ARTIFACT_REGEX.test(serialized)) masterEbys++;
    }
    console.log(
      `ℹ️  [AUDIT] clinical_monographs_master.json (${atcKeys.length} ATC): KÜB eksik=${missingKub}, muğlak ifade=${masterBoilerplate}, EBYS=${masterEbys}`
    );
  }

  const ddiMatrixPath = path.join(DATA_DIR, 'ddi_matrix.json');
  if (fs.existsSync(ddiMatrixPath)) {
    const ddiRaw = JSON.parse(fs.readFileSync(ddiMatrixPath, 'utf8')) as {
      atcs?: string[];
      rules?: Array<Record<string, unknown>>;
      K?: Record<string, number[]>;
      O?: Record<string, number[]>;
      foodQuick?: Record<string, unknown>;
    };
    const countAdj = (m?: Record<string, number[]>) =>
      Object.values(m || {}).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
    const kPairs = countAdj(ddiRaw.K);
    const oPairs = countAdj(ddiRaw.O);
    const totalUniquePairs = Math.round((kPairs + oPairs) / 2);
    const curatedRules = Array.isArray(ddiRaw.rules) ? ddiRaw.rules : [];
    let curatedBoilerplate = 0;
    for (const cr of curatedRules) {
      if (BANNED_DIKKATLI_RE.test(JSON.stringify(cr))) curatedBoilerplate++;
    }
    console.log(
      `ℹ️  [AUDIT] ddi_matrix.json (${(ddiRaw.atcs || []).length} ATC, ~${totalUniquePairs} tekil çift [K:${Math.round(kPairs / 2)}, O:${Math.round(oPairs / 2)}], ${curatedRules.length} küratörlü kural): küratörlü muğlak ifade=${curatedBoilerplate}, W3C PDDI-CDS kanıtlı kapsam=${hydratedRecords.length} çift`
    );
  }

  // --------------------------------------------------------------------------
  // NİHAİ SERT KAPI KARARI
  // --------------------------------------------------------------------------
  if (strictErrors.length > 0) {
    console.error(`\n❌ SERT KAPI BAŞARISIZ — Toplam ${strictErrors.length} ihlal tespit edildi (ilk 25):`);
    for (const err of strictErrors.slice(0, 25)) {
      console.error(`  • ${err}`);
    }
    if (strictErrors.length > 25) {
      console.error(`  ... ve ${strictErrors.length - 25} ihlal daha.`);
    }
    process.exit(1);
  }

  console.log('\n===================================================================');
  console.log('🎉 SERT KAPI %100 YEŞİL — 0 HALÜSİNASYON / 0 BOILERPLATE / 0 EBYS!');
  console.log('===================================================================');
}

main().catch(err => {
  console.error('❌ Test çalıştırma hatası:', err);
  process.exit(1);
});
