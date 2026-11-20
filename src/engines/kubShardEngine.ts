/**
 * TÜRKÇE KÜB PARÇALI ÖNBELLEK MOTORU (KÜB SHARD ENGINE)
 *
 * 1.198 ATC kodunun EBYS/TÜFAM temizlenmiş resmi Türkçe TİTCK KÜB metinlerini
 * ATC 1. seviye harfine göre (A, B, C, D, G, H, J, L, M, N, P, R, S, V)
 * 14 küçük parça halinde istek anında yükler ve bellekte + Service Worker'da saklar.
 */

export interface KubShardRecord {
  ind?: string; // 4.1 Endikasyonlar (Türkçe)
  poz?: string; // 4.2 Pozoloji (Türkçe)
  kon?: string; // 4.3 Kontrendikasyonlar (Türkçe)
  etk?: string; // 4.5 Etkileşimler (Türkçe)
  yan?: string; // 4.8 Yan Etkiler (Türkçe)
  ovr?: string; // 4.9 Doz Aşımı / Antidot (Türkçe)
  pk?: string;  // 5.2 Farmakokinetik (Türkçe)
  iv?: string;  // 6.2 IV Geçimsizlikler
  arc?: string; // 4.7 Araç/Makine Kullanım Etkisi
  raf?: string; // 6.3-6.4 Raf Ömrü ve Saklama
  exc?: string; // 6.1 Yardımcı Maddeler
  src?: string; // KÜB metninin alındığı referans müstahzar adı
}

const VALID_KUB_SHARDS = new Set(['A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'V']);

const shardCache = new Map<string, Record<string, KubShardRecord>>();
const pendingLoads = new Map<string, Promise<Record<string, KubShardRecord>>>();

export function getKubShardLetter(atcCode?: string): string | null {
  const clean = String(atcCode || '').trim().toUpperCase();
  if (!clean) return null;
  const letter = clean.charAt(0);
  return VALID_KUB_SHARDS.has(letter) ? letter : null;
}

export function setKubShardCache(letter: string, data: Record<string, KubShardRecord>): void {
  const clean = String(letter || '').trim().toUpperCase();
  if (clean && data && typeof data === 'object') {
    shardCache.set(clean, data);
  }
}

export function getKubForAtcSync(atcCode?: string): KubShardRecord | null {
  const cleanAtc = String(atcCode || '').trim().toUpperCase();
  const letter = getKubShardLetter(cleanAtc);
  if (!letter) return null;
  const shard = shardCache.get(letter);
  return shard ? (shard[cleanAtc] || null) : null;
}

export async function ensureKubShardReady(atcCode?: string): Promise<Record<string, KubShardRecord>> {
  const letter = getKubShardLetter(atcCode);
  if (!letter) return {};

  const cached = shardCache.get(letter);
  if (cached) return cached;

  const existingPromise = pendingLoads.get(letter);
  if (existingPromise) return existingPromise;

  const loadPromise = (async () => {
    const filename = `kub_${letter}.json`;

    // 1. Tarayıcı / Service Worker Precache
    if (typeof fetch !== 'undefined') {
      const candidatePaths = [
        `./data/kub/${filename}`,
        `/data/kub/${filename}`,
        `data/kub/${filename}`
      ];
      for (const p of candidatePaths) {
        try {
          const res = await fetch(p);
          if (res && res.ok) {
            const parsed = (await res.json()) as Record<string, KubShardRecord>;
            if (parsed && typeof parsed === 'object') {
              shardCache.set(letter, parsed);
              return parsed;
            }
          }
        } catch {
          // sonraki aday yolu dene
        }
      }
    }

    // 2. Node.js / Test ortamı
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fsMod = 'fs';
        const pathMod = 'path';
        const fs = await import(/* @vite-ignore */ fsMod);
        const path = await import(/* @vite-ignore */ pathMod);
        const fsCandidates = [
          path.join(process.cwd(), 'public', 'data', 'kub', filename),
          path.join(process.cwd(), 'dist', 'data', 'kub', filename)
        ];
        for (const fp of fsCandidates) {
          if (fs.existsSync(fp)) {
            const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as Record<string, KubShardRecord>;
            shardCache.set(letter, parsed);
            return parsed;
          }
        }
      } catch {
        // yoksay
      }
    }

    return {};
  })();

  pendingLoads.set(letter, loadPromise);
  try {
    return await loadPromise;
  } finally {
    pendingLoads.delete(letter);
  }
}

export async function loadKubForAtc(atcCode?: string): Promise<KubShardRecord | null> {
  const cleanAtc = String(atcCode || '').trim().toUpperCase();
  if (!cleanAtc) return null;
  const sync = getKubForAtcSync(cleanAtc);
  if (sync) return sync;
  const shard = await ensureKubShardReady(cleanAtc);
  return shard[cleanAtc] || null;
}
