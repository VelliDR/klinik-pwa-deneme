/**
 * LAZY-LOADED İTS KAREKOD & BARKOD KAMERA TARAYICI
 *
 * Bu modül ana uygulama paketine dahil edilmez; yalnızca kullanıcı
 * "Barkod / İTS Karekod Tara" düğmesine bastığında dinamik import() ile yüklenir.
 *
 * Tarama Katmanları:
 * 1. Yerleşik `window.BarcodeDetector` (Chrome / Android / Edge — sıfır ek kütüphane)
 * 2. `@zxing/browser` (iOS Safari / Firefox için çevrimdışı lazy chunk fallback)
 * 3. Manuel / USB barkod okuyucu metin girişi (kamerasız masaüstü cihazlar için)
 */

import { parseItsBarcode, type ParsedItsBarcode } from '../engines/itsBarcodeParser';
import { escapeHtml } from './domUtils';

export interface BarcodeScanOutcome {
  matched: boolean;
  label: string;
  detail?: string;
  alreadyInList?: boolean;
}

export interface BarcodeScannerOptions {
  onDecoded: (parsed: ParsedItsBarcode) => Promise<BarcodeScanOutcome> | BarcodeScanOutcome;
  onClose?: () => void;
}

interface NativeBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => NativeBarcodeDetector;
  }
}

let activeCleanup: (() => void) | null = null;

export function closeBarcodeScannerModal(): void {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
}

export async function openBarcodeScannerModal(options: BarcodeScannerOptions): Promise<void> {
  if (typeof document === 'undefined') return;
  closeBarcodeScannerModal();

  const overlay = document.createElement('div');
  overlay.id = 'modal-barcode-scanner';
  overlay.className = 'fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'İTS Karekod ve Barkod Tarayıcı');

  overlay.innerHTML = `
    <div class="w-full max-w-md rounded-xl border border-slate-700/80 bg-[#111927] text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div class="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
        <div>
          <h3 class="text-sm font-bold text-slate-100">İTS Karekod &amp; Barkod Tarayıcı</h3>
          <p id="barcode-scanner-engine-label" class="text-[0.75rem] text-slate-400">Kamera hazırlanıyor...</p>
        </div>
        <button type="button" id="btn-close-barcode-scanner" class="h-8 w-8 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors" title="Kapat (Esc)">✕</button>
      </div>

      <div class="p-3 space-y-3 overflow-y-auto">
        <div id="barcode-video-wrapper" class="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
          <video id="barcode-scanner-video" class="w-full h-full object-cover" autoplay muted playsinline></video>
          <div class="pointer-events-none absolute inset-6 border-2 border-sky-400/75 rounded-lg shadow-[0_0_0_9999px_rgba(2,6,23,0.35)]"></div>
          <div id="barcode-camera-fallback-msg" class="hidden absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center text-xs text-slate-300 gap-1.5"></div>
        </div>

        <div class="space-y-1.5">
          <label for="input-barcode-manual" class="block text-[0.75rem] text-slate-400">USB Okuyucu veya Manuel Barkod / İTS Karekod Yapıştır</label>
          <div class="flex gap-1.5">
            <input type="text" id="input-barcode-manual" placeholder="8699... veya 0108699...17..." class="flex-1 h-9 bg-[#0c1322] border border-slate-700 rounded-md px-2.5 text-xs font-mono text-slate-100 focus:border-sky-400 focus:outline-none">
            <button type="button" id="btn-barcode-manual-add" class="h-9 px-3 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors">Ekle</button>
          </div>
        </div>

        <div id="barcode-scan-status" class="hidden text-xs p-2 rounded-md border"></div>

        <div class="space-y-1">
          <div class="flex items-center justify-between text-[0.75rem] text-slate-400">
            <span>Taranan İlaçlar (Seri Tarama Modu)</span>
            <span id="barcode-scan-count" class="font-mono">0 kutu</span>
          </div>
          <div id="barcode-scan-log" class="space-y-1 max-h-36 overflow-y-auto text-xs">
            <div class="text-slate-500 text-[0.75rem]">İlaç kutusundaki EAN-13 barkodu veya 2D İTS karekodu çerçeveye tutunuz.</div>
          </div>
        </div>
      </div>

      <div class="px-4 py-2.5 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950/50">
        <span class="text-[0.6875rem] text-slate-400">Veriler cihaz içinde işlenir; görüntü kaydedilmez.</span>
        <button type="button" id="btn-finish-barcode-scanner" class="h-8 px-3 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors">Bitir</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const videoEl = overlay.querySelector<HTMLVideoElement>('#barcode-scanner-video');
  const engineLabel = overlay.querySelector<HTMLElement>('#barcode-scanner-engine-label');
  const fallbackBox = overlay.querySelector<HTMLElement>('#barcode-camera-fallback-msg');
  const statusEl = overlay.querySelector<HTMLElement>('#barcode-scan-status');
  const logEl = overlay.querySelector<HTMLElement>('#barcode-scan-log');
  const countEl = overlay.querySelector<HTMLElement>('#barcode-scan-count');
  const manualInput = overlay.querySelector<HTMLInputElement>('#input-barcode-manual');
  const manualBtn = overlay.querySelector<HTMLButtonElement>('#btn-barcode-manual-add');
  const closeBtn = overlay.querySelector<HTMLButtonElement>('#btn-close-barcode-scanner');
  const finishBtn = overlay.querySelector<HTMLButtonElement>('#btn-finish-barcode-scanner');

  let disposed = false;
  let rafId: number | null = null;
  let mediaStream: MediaStream | null = null;
  let zxingControls: { stop: () => void } | null = null;
  let scannedCount = 0;
  let hasClearedPlaceholder = false;
  const recentCodes = new Map<string, number>();

  const showStatus = (tone: 'ok' | 'warn' | 'err', text: string) => {
    if (!statusEl) return;
    statusEl.classList.remove('hidden');
    const clsMap = {
      ok: 'bg-emerald-950/60 border-emerald-700/70 text-emerald-200',
      warn: 'bg-amber-950/60 border-amber-700/70 text-amber-200',
      err: 'bg-rose-950/60 border-rose-700/70 text-rose-200'
    };
    statusEl.className = `text-xs p-2 rounded-md border ${clsMap[tone]}`;
    statusEl.textContent = text;
  };

  const handleRawScan = async (rawValue: string, bypassCooldown = false) => {
    if (disposed || !rawValue.trim()) return;
    const parsed = parseItsBarcode(rawValue);
    const dedupeKey = parsed.ean13 || rawValue.trim();
    const now = Date.now();
    const prev = recentCodes.get(dedupeKey) || 0;
    if (!bypassCooldown && now - prev < 2200) return;
    recentCodes.set(dedupeKey, now);

    if (!parsed.ean13) {
      showStatus('warn', `Geçerli EAN-13 veya İTS karekod ayrıştırılamadı: "${rawValue.slice(0, 32)}"`);
      return;
    }

    let outcome: BarcodeScanOutcome;
    try {
      outcome = await options.onDecoded(parsed);
    } catch (err: any) {
      if (!disposed) {
        showStatus('err', `Barkod işlenirken hata oluştu: ${err?.message || 'Bilinmeyen hata'}`);
      }
      return;
    }
    if (disposed) return;

    if (outcome.matched) {
      if (!outcome.alreadyInList) scannedCount++;
      if (countEl) countEl.textContent = `${scannedCount} kutu`;

      const expBadge = parsed.expiryDisplayTr
        ? parsed.isExpired
          ? `<span class="px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-200 border border-rose-600/70 font-semibold">SKT GEÇMİŞ: ${escapeHtml(parsed.expiryDisplayTr)}</span>`
          : parsed.isExpiringSoon
            ? `<span class="px-1.5 py-0.2 rounded bg-amber-900/70 text-amber-200 border border-amber-600/70">SKT Yakın: ${escapeHtml(parsed.expiryDisplayTr)}</span>`
            : `<span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">SKT: ${escapeHtml(parsed.expiryDisplayTr)}</span>`
        : '';

      if (logEl) {
        if (!hasClearedPlaceholder) {
          logEl.innerHTML = '';
          hasClearedPlaceholder = true;
        }
        const item = document.createElement('div');
        item.className = 'p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-1';
        item.innerHTML = `
          <span class="font-semibold text-emerald-300">${escapeHtml(outcome.label)}</span>
          <span class="flex items-center gap-1 text-[0.6875rem] font-mono text-slate-400">
            <span>${escapeHtml(parsed.ean13)}</span>
            ${expBadge}
          </span>
        `;
        logEl.prepend(item);
      }

      if (parsed.isExpired) {
        showStatus('warn', `${outcome.label} eklendi — DİKKAT: Kutu SKT geçmiş (${parsed.expiryDisplayTr})!`);
      } else if (outcome.alreadyInList) {
        showStatus('warn', `${outcome.label} zaten aktif reçetede mevcut.`);
      } else {
        showStatus('ok', `Reçeteye eklendi: ${outcome.label}`);
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(60); } catch { /* ignore */ }
      }
    } else {
      showStatus('err', `Barkod (${parsed.ean13}) yerel TİTCK kataloğunda bulunamadı.`);
    }
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (zxingControls) {
      try { zxingControls.stop(); } catch { /* ignore */ }
      zxingControls = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => {
        try { t.stop(); } catch { /* ignore */ }
      });
      mediaStream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
    }
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    options.onClose?.();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeBarcodeScannerModal();
  };

  activeCleanup = cleanup;
  document.addEventListener('keydown', onKeyDown);
  closeBtn?.addEventListener('click', () => closeBarcodeScannerModal());
  finishBtn?.addEventListener('click', () => closeBarcodeScannerModal());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBarcodeScannerModal();
  });

  const submitManual = () => {
    const val = manualInput?.value.trim() || '';
    if (!val) return;
    void handleRawScan(val, true);
    if (manualInput) {
      manualInput.value = '';
      manualInput.focus();
    }
  };
  manualBtn?.addEventListener('click', submitManual);
  manualInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitManual();
    }
  });

  const showCameraError = (msg: string) => {
    if (engineLabel) engineLabel.textContent = 'Kamera kullanılamıyor — manuel / USB giriş aktif';
    if (fallbackBox) {
      fallbackBox.classList.remove('hidden');
      fallbackBox.innerHTML = `<div class="font-semibold text-amber-300">Kamera Başlatılamadı</div><div>${escapeHtml(msg)}</div><div class="text-slate-400">Aşağıdaki alana barkod veya İTS karekod metnini yapıştırabilir ya da USB barkod okuyucu kullanabilirsiniz.</div>`;
    }
  };

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || !videoEl) {
    showCameraError('Bu tarayıcıda kamera erişimi desteklenmiyor veya güvenli bağlam (HTTPS) gerekli.');
    manualInput?.focus();
    return;
  }

  // 1. Öncelik: Yerleşik BarcodeDetector (Chrome / Android / Edge — sıfır ek kütüphane)
  if (typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function') {
    try {
      const detector = new window.BarcodeDetector({
        formats: ['data_matrix', 'ean_13', 'ean_8', 'code_128', 'qr_code']
      });
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      if (disposed) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }
      videoEl.srcObject = mediaStream;
      await videoEl.play();
      if (disposed) {
        mediaStream.getTracks().forEach(t => { try { t.stop(); } catch { /* ignore */ } });
        mediaStream = null;
        videoEl.srcObject = null;
        return;
      }
      if (engineLabel) engineLabel.textContent = 'Yerel BarcodeDetector (EAN-13 & İTS DataMatrix)';

      const scanLoop = async () => {
        if (disposed) return;
        try {
          if (videoEl.readyState >= 2) {
            const barcodes = await detector.detect(videoEl);
            for (const b of barcodes) {
              if (b.rawValue) await handleRawScan(b.rawValue);
            }
          }
        } catch {
          // Tek kare hata verirse döngü devam eder
        }
        if (!disposed) {
          rafId = requestAnimationFrame(() => { void scanLoop(); });
        }
      };
      rafId = requestAnimationFrame(() => { void scanLoop(); });
      return;
    } catch (err: any) {
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => { try { t.stop(); } catch { /* ignore */ } });
        mediaStream = null;
      }
      if (disposed) return;
      if (err?.name === 'NotAllowedError' || err?.name === 'NotFoundError' || err?.name === 'NotReadableError') {
        showCameraError(err?.message || 'Kamera izni reddedildi veya cihazda kullanılabilir kamera bulunamadı.');
        manualInput?.focus();
        return;
      }
      // Yerleşik BarcodeDetector desteklemezse veya başlatılamazsa ZXing fallback'e geç
    }
  }

  // 2. Öncelik: iOS Safari / Firefox için lazy-loaded @zxing/browser çözücü
  try {
    if (engineLabel) engineLabel.textContent = 'ZXing çevrimdışı çözücü yükleniyor...';
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    if (disposed) return;

    const reader = new BrowserMultiFormatReader();
    if (engineLabel) engineLabel.textContent = 'ZXing Çevrimdışı Çözücü (EAN-13 & İTS DataMatrix)';

    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      videoEl,
      (result) => {
        if (result && !disposed) {
          void handleRawScan(result.getText());
        }
      }
    );
    if (disposed) {
      try { controls.stop(); } catch { /* ignore */ }
      if (videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        stream.getTracks?.().forEach(t => { try { t.stop(); } catch { /* ignore */ } });
        videoEl.srcObject = null;
      }
      return;
    }
    zxingControls = controls;
  } catch (err: any) {
    if (disposed) return;
    showCameraError(err?.message || 'Kamera izni reddedildi veya cihazda kamera bulunamadı.');
    manualInput?.focus();
  }
}
