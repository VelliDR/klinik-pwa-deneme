/**
 * VERİ ANLIK GÖRÜNTÜSÜ (SNAPSHOT) & GÜNCELİYET DENETİM MOTORU
 *
 * Zamanla bozulmayan klinik hesaplama mantığı ile Türkiye'de hızla değişen
 * piyasa/mevzuat verilerini (TL fiyat, GKF €, 4 kademeli KKİ, SGK EK-4/A,
 * TİTCK ruhsat ve GBP aşı takvimi) şeffaf biçimde ayrıştırır.
 */

export type DataSourceKey = 'prices' | 'gkf' | 'sgk' | 'titck' | 'ddi' | 'vaccines';

export type FreshnessLevel = 'fresh' | 'aging' | 'stale';

export interface DataSourceManifestEntry {
  label: string;
  snapshotDate: string;
  latestItemDate?: string;
  bulkTariffDate?: string;
  versionLabel?: string;
  recordCount?: number;
  equivalentGroupCount?: number;
  extraMonitoringCount?: number;
  pdfCount?: number;
  staleAfterDays: number;
  criticalAfterDays: number;
  sourceName: string;
}

export interface DataSnapshotManifest {
  schemaVersion: number;
  generatedAt: string;
  masterBuildDate: string;
  sources: Record<DataSourceKey, DataSourceManifestEntry>;
}

export interface SnapshotFreshnessResult {
  snapshotDate: string;
  formattedDate: string;
  daysOld: number;
  level: FreshnessLevel;
  statusLabel: string;
  shortNote: string;
  warningText: string | null;
}

export interface DrugPriceBubbleFocus {
  context?: DataSourceKey | 'drug';
  brand?: string;
  priceLabel?: string;
  priceDate?: string;
}

export interface OfflineDeepPackSummary {
  cachedCount: number;
  totalCount: number;
  isComplete: boolean;
  isDownloading?: boolean;
}

const TR_MONTHS_SHORT = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
] as const;

/**
 * İlk açılışta (fetch tamamlanmadan veya çevrimdışı/test ortamında) anlık erişim için
 * en son derleme manifesti ile senkron varsayılan anlık görüntü sabitleri.
 */
export const DEFAULT_DATA_MANIFEST: DataSnapshotManifest = {
  schemaVersion: 1,
  generatedAt: '2026-11-20',
  masterBuildDate: '2026-11-19',
  sources: {
    prices: {
      label: 'İlaç Perakende Satış Fiyatları (TL)',
      snapshotDate: '2026-11-19',
      latestItemDate: '2026-11-10',
      bulkTariffDate: '2026-04-01',
      recordCount: 5919,
      staleAfterDays: 90,
      criticalAfterDays: 180,
      sourceName: 'Ecza Deposu Açık Web Fiyat Listesi (PSF/DSF)'
    },
    gkf: {
      label: 'Referans İlaç Fiyatı (GKF Euro)',
      snapshotDate: '2026-11-19',
      recordCount: 2399,
      staleAfterDays: 90,
      criticalAfterDays: 180,
      sourceName: 'TİTCK Referans Fiyat Listesi'
    },
    sgk: {
      label: 'SGK EK-4/A Geri Ödeme & 4 Kademeli KKİ',
      snapshotDate: '2026-10-25',
      recordCount: 7280,
      equivalentGroupCount: 6317,
      staleAfterDays: 90,
      criticalAfterDays: 180,
      sourceName: 'SGK Bedeli Ödenecek İlaçlar Listesi (EK-4/A)'
    },
    titck: {
      label: 'TİTCK SKRS, Ruhsat, ▼ Ek İzlem & KÜB/KT',
      snapshotDate: '2026-11-19',
      recordCount: 18212,
      extraMonitoringCount: 1217,
      pdfCount: 6664,
      staleAfterDays: 180,
      criticalAfterDays: 365,
      sourceName: 'T.C. Sağlık Bakanlığı TİTCK'
    },
    ddi: {
      label: 'İlaç & Besin Etkileşim Matrisi',
      snapshotDate: '2026-11-19',
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

let cachedManifest: DataSnapshotManifest = DEFAULT_DATA_MANIFEST;
let manifestLoadPromise: Promise<DataSnapshotManifest> | null = null;

function escapeHtmlAttr(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * ISO tarihini (YYYY-MM-DD) kısa Türkçe klinik biçime çevirir (örn. "19 Kas 2026").
 */
export function formatTurkishDate(isoDate?: string | null): string {
  const s = String(isoDate || '').trim().slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s || 'Bilinmiyor';
  const year = m[1];
  const monthIdx = Number(m[2]) - 1;
  const day = Number(m[3]);
  const monthLabel = TR_MONTHS_SHORT[monthIdx] || m[2];
  return `${day} ${monthLabel} ${year}`;
}

/**
 * Verilen anlık görüntü tarihinin gün cinsinden yaşını ve eskime durumunu hesaplar.
 */
export function evaluateSnapshotFreshness(
  isoDate: string,
  staleAfterDays: number = 90,
  criticalAfterDays: number = 180,
  nowDate: Date = new Date()
): SnapshotFreshnessResult {
  const cleanIso = String(isoDate || '').trim().slice(0, 10);
  const formattedDate = formatTurkishDate(cleanIso);
  const parsed = Date.parse(`${cleanIso}T00:00:00Z`);

  if (isNaN(parsed)) {
    return {
      snapshotDate: cleanIso,
      formattedDate,
      daysOld: 0,
      level: 'aging',
      statusLabel: 'Tarih Doğrulanamadı',
      shortNote: 'Güncel resmi kaynaktan teyit ediniz',
      warningText: 'Veri anlık görüntü tarihi doğrulanamadı; fiyat ve geri ödeme bilgisini güncel kaynaktan kontrol ediniz.'
    };
  }

  const nowUtc = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());
  const rawDays = Math.floor((nowUtc - parsed) / (1000 * 60 * 60 * 24));
  const daysOld = Math.max(0, rawDays);

  if (daysOld > criticalAfterDays) {
    const months = Math.floor(daysOld / 30);
    return {
      snapshotDate: cleanIso,
      formattedDate,
      daysOld,
      level: 'stale',
      statusLabel: `Eskime Riski (${months} ay)`,
      shortNote: `${months} ay önceki anlık görüntü`,
      warningText: `Bu piyasa/mevzuat verisi ${formattedDate} tarihli anlık görüntüdür (${daysOld} gün önce). Klinik hesaplama motorları geçerliliğini korur; ancak güncel TL fiyat ve SGK kapsamı değişmiş olabilir.`
    };
  }

  if (daysOld > staleAfterDays) {
    const months = Math.floor(daysOld / 30);
    return {
      snapshotDate: cleanIso,
      formattedDate,
      daysOld,
      level: 'aging',
      statusLabel: `Güncelleme Önerilir (${months} ay)`,
      shortNote: `${months} ay önceki anlık görüntü`,
      warningText: `Fiyat/SGK anlık görüntüsü ${formattedDate} tarihli olup 3 ayı geçmiştir (${daysOld} gün). Reçete öncesi güncel eczane/SGK bilgisini teyit ediniz.`
    };
  }

  return {
    snapshotDate: cleanIso,
    formattedDate,
    daysOld,
    level: 'fresh',
    statusLabel: 'Güncel Anlık Görüntü',
    shortNote: daysOld === 0 ? 'Bugün güncellendi' : `${daysOld} gün önce`,
    warningText: null
  };
}

export function getDataManifestSync(): DataSnapshotManifest {
  return cachedManifest;
}

export function setDataManifestForTesting(manifest: DataSnapshotManifest): void {
  cachedManifest = manifest;
}

export async function ensureDataManifestReady(): Promise<DataSnapshotManifest> {
  if (manifestLoadPromise) return manifestLoadPromise;

  manifestLoadPromise = (async () => {
    if (typeof fetch !== 'undefined') {
      const candidates = ['./data/data_manifest.json', '/data/data_manifest.json', 'data/data_manifest.json'];
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res && res.ok) {
            const parsed = (await res.json()) as DataSnapshotManifest;
            if (parsed && parsed.sources && parsed.sources.prices) {
              cachedManifest = parsed;
              return parsed;
            }
          }
        } catch {
          // sonraki yolu dene
        }
      }
    }

    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fsMod = 'fs';
        const pathMod = 'path';
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);
        const fileCandidates = [
          path.join(process.cwd(), 'public', 'data', 'data_manifest.json'),
          path.join(process.cwd(), 'dist', 'data', 'data_manifest.json')
        ];
        for (const fp of fileCandidates) {
          if (fs.existsSync(fp)) {
            const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as DataSnapshotManifest;
            if (parsed && parsed.sources && parsed.sources.prices) {
              cachedManifest = parsed;
              return parsed;
            }
          }
        }
      } catch {
        // varsayılan manifest ile devam et
      }
    }

    return cachedManifest;
  })();

  return manifestLoadPromise;
}

export interface PriceDateBubbleTriggerOptions {
  context?: DataSourceKey | 'drug';
  labelPrefix?: string;
  brand?: string;
  priceLabel?: string;
  priceDate?: string;
  compact?: boolean;
  nowDate?: Date;
}

/**
 * İlaç arama, monograf, muadil ve aşı bölümlerinde kullanılan tıklanabilir tarih baloncuğu tetikleyicisi.
 */
export function renderPriceDateBubbleTriggerHTML(options: PriceDateBubbleTriggerOptions = {}): string {
  const manifest = getDataManifestSync();
  const context = options.context || 'prices';
  const sourceKey: DataSourceKey = context === 'drug' ? 'prices' : context;
  const entry = manifest.sources[sourceKey] || manifest.sources.prices;
  const freshness = evaluateSnapshotFreshness(
    entry.snapshotDate,
    entry.staleAfterDays,
    entry.criticalAfterDays,
    options.nowDate
  );

  const dotCls =
    freshness.level === 'fresh'
      ? 'bg-emerald-400'
      : freshness.level === 'aging'
      ? 'bg-amber-400'
      : 'bg-rose-400';

  const pillCls =
    freshness.level === 'fresh'
      ? 'bg-slate-800/85 hover:bg-slate-700/85 text-slate-200 border-slate-700/90 hover:border-sky-500/60'
      : freshness.level === 'aging'
      ? 'bg-amber-950/60 hover:bg-amber-900/70 text-amber-200 border-amber-700/70'
      : 'bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border-rose-700/70';

  const prefix = options.labelPrefix !== undefined ? options.labelPrefix : 'Veri Tarihi';
  const displayDate = sourceKey === 'vaccines' && entry.versionLabel
    ? `${entry.versionLabel} (${freshness.formattedDate})`
    : freshness.formattedDate;

  const textStr = prefix ? `${prefix}: ${displayDate}` : displayDate;
  const padCls = options.compact ? 'px-1.5 py-0.5 text-[0.6875rem]' : 'px-2 py-1 text-[0.75rem]';

  const dataAttrs = [
    `data-date-context="${escapeHtmlAttr(context)}"`,
    options.brand ? `data-drug-brand="${escapeHtmlAttr(options.brand)}"` : '',
    options.priceLabel ? `data-drug-price="${escapeHtmlAttr(options.priceLabel)}"` : '',
    options.priceDate ? `data-drug-price-date="${escapeHtmlAttr(options.priceDate)}"` : ''
  ].filter(Boolean).join(' ');

  return `<button type="button" class="btn-price-date-bubble btn-compact inline-flex items-center gap-1.5 rounded-md border font-medium tabular-nums transition-colors cursor-pointer ${padCls} ${pillCls}" ${dataAttrs} aria-haspopup="dialog" title="Veri anlık görüntüsü tarihi ve güncellik ayrıntısı için tıklayın (${escapeHtmlAttr(freshness.statusLabel)})">
    <span class="w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}" aria-hidden="true"></span>
    <svg class="w-3 h-3 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    <span>${escapeHtmlAttr(textStr)}</span>
  </button>`;
}

/**
 * Tıklanabilir tarih baloncuğu açıldığında gösterilen zenginleştirilmiş veri anlık görüntüsü içeriğini üretir.
 */
export function renderDataSnapshotPopoverHTML(
  manifest: DataSnapshotManifest = getDataManifestSync(),
  focus: DrugPriceBubbleFocus = {},
  offlinePack?: OfflineDeepPackSummary,
  nowDate: Date = new Date()
): string {
  const priceFresh = evaluateSnapshotFreshness(
    manifest.sources.prices.snapshotDate,
    manifest.sources.prices.staleAfterDays,
    manifest.sources.prices.criticalAfterDays,
    nowDate
  );
  const sgkFresh = evaluateSnapshotFreshness(
    manifest.sources.sgk.snapshotDate,
    manifest.sources.sgk.staleAfterDays,
    manifest.sources.sgk.criticalAfterDays,
    nowDate
  );

  const worstMarketWarning =
    priceFresh.level === 'stale' ? priceFresh.warningText :
    sgkFresh.level === 'stale' ? sgkFresh.warningText :
    priceFresh.warningText || sgkFresh.warningText;

  const focusDrugHTML = focus.brand
    ? `
      <div class="p-2.5 rounded-lg bg-emerald-950/35 border border-emerald-700/60 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[0.6875rem] uppercase tracking-wider font-bold text-emerald-300">Seçili Müstahzar Fiyat Künyesi</span>
          ${focus.priceLabel ? `<span class="text-xs font-bold text-white tabular-nums px-1.5 py-0.5 rounded bg-emerald-900/70 border border-emerald-700/60">${escapeHtmlAttr(focus.priceLabel)}</span>` : ''}
        </div>
        <div class="text-xs font-semibold text-slate-100 leading-snug">${escapeHtmlAttr(focus.brand)}</div>
        <div class="grid grid-cols-2 gap-1.5 pt-1 text-[0.6875rem]">
          <div class="bg-slate-900/70 rounded px-2 py-1 border border-slate-800">
            <span class="text-slate-400 block">İlaç Tarife Tarihi</span>
            <strong class="text-slate-100 tabular-nums">${focus.priceDate ? escapeHtmlAttr(formatTurkishDate(focus.priceDate)) : escapeHtmlAttr(formatTurkishDate(manifest.sources.prices.bulkTariffDate || manifest.sources.prices.snapshotDate))}</strong>
          </div>
          <div class="bg-slate-900/70 rounded px-2 py-1 border border-slate-800">
            <span class="text-slate-400 block">Liste Anlık Görüntüsü</span>
            <strong class="text-emerald-300 tabular-nums">${escapeHtmlAttr(priceFresh.formattedDate)}</strong>
          </div>
        </div>
      </div>
    `
    : '';

  const stalenessBannerHTML = worstMarketWarning
    ? `
      <div class="p-2.5 rounded-lg ${priceFresh.level === 'stale' || sgkFresh.level === 'stale' ? 'bg-rose-950/45 border-rose-700/70 text-rose-200' : 'bg-amber-950/45 border-amber-700/70 text-amber-200'} border text-[0.75rem] leading-relaxed">
        <strong class="block mb-0.5">Eskime Hatırlatması (Dinamik Veri)</strong>
        ${escapeHtmlAttr(worstMarketWarning)}
      </div>
    `
    : '';

  const orderedKeys: DataSourceKey[] = ['prices', 'sgk', 'gkf', 'titck', 'ddi', 'vaccines'];
  const rowsHTML = orderedKeys.map(key => {
    const entry = manifest.sources[key];
    if (!entry) return '';
    const f = evaluateSnapshotFreshness(entry.snapshotDate, entry.staleAfterDays, entry.criticalAfterDays, nowDate);
    const badgeCls =
      f.level === 'fresh'
        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
        : f.level === 'aging'
        ? 'bg-amber-950/70 text-amber-300 border-amber-700/60'
        : 'bg-rose-950/70 text-rose-300 border-rose-700/60';
    const isHighlighted = focus.context === key || (focus.context === 'drug' && key === 'prices');
    const countText = entry.recordCount ? `${entry.recordCount.toLocaleString('tr-TR')} kayıt` : (entry.versionLabel || '');

    return `
      <div class="flex items-start justify-between gap-2 p-2 rounded-lg border ${isHighlighted ? 'bg-sky-950/35 border-sky-600/60' : 'bg-slate-900/65 border-slate-800/90'}">
        <div class="min-w-0">
          <div class="text-[0.75rem] font-semibold text-slate-100 leading-snug">${escapeHtmlAttr(entry.label)}</div>
          <div class="text-[0.6875rem] text-slate-400 truncate">${escapeHtmlAttr(entry.sourceName)}${countText ? ` • ${escapeHtmlAttr(countText)}` : ''}</div>
        </div>
        <div class="text-right shrink-0 space-y-0.5">
          <div class="text-[0.75rem] font-bold font-mono tabular-nums text-slate-100">${escapeHtmlAttr(f.formattedDate)}</div>
          <span class="inline-block px-1.5 py-0.2 rounded border text-[0.625rem] font-medium ${badgeCls}">${escapeHtmlAttr(f.shortNote)}</span>
        </div>
      </div>
    `;
  }).join('');

  const packCached = offlinePack?.cachedCount ?? 0;
  const packTotal = offlinePack?.totalCount ?? 15;
  const packDone = Boolean(offlinePack?.isComplete);
  const packDownloading = Boolean(offlinePack?.isDownloading);

  const offlinePackHTML = `
    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="text-[0.75rem] font-semibold text-slate-200">Çevrimdışı Derin KÜB &amp; Monograf Paketi</div>
          <div id="text-offline-deep-pack-status" class="text-[0.6875rem] text-slate-400">
            ${packDone
              ? `Tamamı cihazda önbelleklendi (${packTotal}/${packTotal} dosya • çevrimdışı hazır)`
              : `Temel arama + etkileşim hazır; isteğe bağlı tam KÜB arşivi: ${packCached}/${packTotal} dosya`}
          </div>
        </div>
        <button type="button" id="btn-download-offline-deep-pack" class="btn-compact shrink-0 px-2.5 py-1 rounded-md text-[0.75rem] font-semibold border transition-colors cursor-pointer ${packDone ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/70' : 'bg-sky-950/80 hover:bg-sky-900 text-sky-200 border-sky-600/70'}" ${packDownloading ? 'disabled' : ''}>
          ${packDownloading ? 'İndiriliyor...' : (packDone ? 'Hazır ✓' : 'Paketi İndir')}
        </button>
      </div>
    </div>
  `;

  return `
    <div class="space-y-2.5 text-xs">
      <div class="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <h4 class="text-xs sm:text-sm font-bold text-slate-100">Veri Anlık Görüntüsü &amp; Güncellik</h4>
          <p class="text-[0.6875rem] text-slate-400">Klinik hesaplama motorları vs dinamik yerel piyasa/mevzuat verileri</p>
        </div>
        <button type="button" id="btn-close-date-bubble" class="btn-compact p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer" aria-label="Kapat" title="Kapat">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      ${focusDrugHTML}
      ${stalenessBannerHTML}

      <div class="p-2 rounded-lg bg-sky-950/30 border border-sky-800/50 text-[0.75rem] text-sky-100/90 leading-relaxed">
        <strong class="text-sky-300">Klinik Mantık / Piyasa Verisi Ayrımı:</strong> eGFR, kan gazı, persentil, dozaj ve cerrahi kılavuz denklemleri zamana dirençlidir. Aşağıdaki <strong>TL fiyat, GKF €, KKİ ve SGK</strong> alanları ise belirli tarihteki anlık görüntülerdir; eczane/SGK güncel kaydıyla teyit edilmelidir.
      </div>

      <div class="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
        ${rowsHTML}
      </div>

      ${offlinePackHTML}

      <div class="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 text-[0.6875rem] text-slate-400">
        <span>Katalog derlemesi: <span class="font-mono text-slate-300">${escapeHtmlAttr(formatTurkishDate(manifest.generatedAt))}</span></span>
        <a href="https://github.com/VelliDR/klinik-pwa-deneme/blob/main/DATA_NOTICE.md" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:underline font-medium">Veri Kaynakları &amp; Lisans</a>
      </div>
    </div>
  `;
}
