/**
 * ACİL PROTOKOL YÖNETİCİSİ (EMERGENCY PROTOCOLS MANAGER)
 * 
 * Anafilaksi ve Status Epilepticus canlı sayaçları, dozaj güncellemeleri
 * ve SOAP senkronizasyonu.
 */

import { appState } from '../state';
import {
  calculateAnaphylaxisDoses,
  calculateStatusEpilepticusDoses,
  formatAnaphylaxisSoapNote,
  formatStatusEpilepticusSoapNote,
  AnaphylaxisDoses,
  StatusEpilepticusDoses
} from '../engines/emergencyProtocols';

export interface AnaphylaxisTimerState {
  remainingSeconds: number;
  totalSeconds: number;
  timerInterval: number | null;
  dosesGiven: number;
  isRunning: boolean;
  isExpired: boolean;
  lastDoseTimestampMs: number | null;
  targetEndTimestampMs: number | null;
}

export interface StatusTimerState {
  elapsedSeconds: number;
  timerInterval: number | null;
  isRunning: boolean;
  accumulatedSeconds: number;
  runStartTimestampMs: number | null;
}

interface PersistedEmergencySession {
  anaphylaxis: {
    dosesGiven: number;
    isRunning: boolean;
    isExpired: boolean;
    lastDoseTimestampMs: number | null;
    targetEndTimestampMs: number | null;
    remainingSeconds: number;
  } | null;
  statusEpilepticus: {
    isRunning: boolean;
    accumulatedSeconds: number;
    runStartTimestampMs: number | null;
    elapsedSeconds: number;
  } | null;
}

const EMERGENCY_SESSION_KEY = 'klinik_pwa_emergency_timers_v2';

const anaphylaxisTimer: AnaphylaxisTimerState = {
  remainingSeconds: 300, // 5 dakika
  totalSeconds: 300,
  timerInterval: null,
  dosesGiven: 0,
  isRunning: false,
  isExpired: false,
  lastDoseTimestampMs: null,
  targetEndTimestampMs: null
};

const statusTimer: StatusTimerState = {
  elapsedSeconds: 0,
  timerInterval: null,
  isRunning: false,
  accumulatedSeconds: 0,
  runStartTimestampMs: null
};

let activeAnaphylaxisCallbacks: {
  onTick?: (remainingSec: number) => void;
  onComplete?: () => void;
} = {};

let activeStatusCallback: ((elapsedSec: number, phase: number) => void) | undefined;
let visibilityListenerAttached = false;

function getSafeSessionStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Kum havuzu veya gizli mod erişim kısıtı
  }
  return null;
}

function persistEmergencySession(): void {
  const storage = getSafeSessionStorage();
  if (!storage) return;
  try {
    const hasAnaphylaxis = anaphylaxisTimer.dosesGiven > 0 || anaphylaxisTimer.isRunning || anaphylaxisTimer.isExpired;
    const hasStatus = statusTimer.isRunning || statusTimer.elapsedSeconds > 0 || statusTimer.accumulatedSeconds > 0;
    if (!hasAnaphylaxis && !hasStatus) {
      storage.removeItem(EMERGENCY_SESSION_KEY);
      return;
    }
    const payload: PersistedEmergencySession = {
      anaphylaxis: hasAnaphylaxis
        ? {
            dosesGiven: anaphylaxisTimer.dosesGiven,
            isRunning: anaphylaxisTimer.isRunning,
            isExpired: anaphylaxisTimer.isExpired,
            lastDoseTimestampMs: anaphylaxisTimer.lastDoseTimestampMs,
            targetEndTimestampMs: anaphylaxisTimer.targetEndTimestampMs,
            remainingSeconds: anaphylaxisTimer.remainingSeconds
          }
        : null,
      statusEpilepticus: hasStatus
        ? {
            isRunning: statusTimer.isRunning,
            accumulatedSeconds: statusTimer.accumulatedSeconds,
            runStartTimestampMs: statusTimer.runStartTimestampMs,
            elapsedSeconds: statusTimer.elapsedSeconds
          }
        : null
    };
    storage.setItem(EMERGENCY_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Depolama kotası aşımı vb. sessiz geçilir
  }
}

export function computeStatusPhase(elapsedSeconds: number): number {
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes >= 40) return 4; // Refrakter
  if (elapsedMinutes >= 20) return 3; // 2. Basamak
  if (elapsedMinutes >= 5) return 2;  // 1. Basamak
  return 1;                           // 0-5 dk Stabilizasyon
}

function syncAnaphylaxisClock(): void {
  if (!anaphylaxisTimer.isRunning || anaphylaxisTimer.targetEndTimestampMs === null) return;

  const remainingMs = anaphylaxisTimer.targetEndTimestampMs - Date.now();
  const nextRemaining = Math.max(0, Math.ceil(remainingMs / 1000));
  anaphylaxisTimer.remainingSeconds = nextRemaining;

  if (activeAnaphylaxisCallbacks.onTick) {
    activeAnaphylaxisCallbacks.onTick(anaphylaxisTimer.remainingSeconds);
  }

  if (nextRemaining <= 0) {
    if (anaphylaxisTimer.timerInterval !== null) {
      clearInterval(anaphylaxisTimer.timerInterval);
      anaphylaxisTimer.timerInterval = null;
    }
    anaphylaxisTimer.isRunning = false;
    anaphylaxisTimer.isExpired = true;
    anaphylaxisTimer.targetEndTimestampMs = null;
    persistEmergencySession();
    if (activeAnaphylaxisCallbacks.onComplete) {
      activeAnaphylaxisCallbacks.onComplete();
    }
  } else {
    persistEmergencySession();
  }
}

function syncStatusClock(): void {
  if (!statusTimer.isRunning || statusTimer.runStartTimestampMs === null) return;

  const deltaSec = Math.max(0, Math.floor((Date.now() - statusTimer.runStartTimestampMs) / 1000));
  statusTimer.elapsedSeconds = statusTimer.accumulatedSeconds + deltaSec;
  const elapsedMinutes = Math.floor(statusTimer.elapsedSeconds / 60);
  const phase = computeStatusPhase(statusTimer.elapsedSeconds);

  if (appState.emergency && appState.emergency.statusEpilepticus) {
    appState.emergency.statusEpilepticus.elapsedMinutes = elapsedMinutes;
    appState.emergency.statusEpilepticus.isRunning = true;
  }

  persistEmergencySession();
  if (activeStatusCallback) {
    activeStatusCallback(statusTimer.elapsedSeconds, phase);
  }
}

function ensureVisibilityResyncListener(): void {
  if (visibilityListenerAttached || typeof document === 'undefined' || typeof window === 'undefined') return;
  visibilityListenerAttached = true;

  const resyncAll = () => {
    syncAnaphylaxisClock();
    syncStatusClock();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      resyncAll();
    }
  });
  window.addEventListener('focus', resyncAll);
}

export interface EmergencyWeightContext {
  weightKg: number;
  isAdult: boolean;
  isWeightMissing: boolean;
  isEstimated: boolean;
  isPediatricShieldActive: boolean;
  mode: 'entered' | 'estimated-adult' | 'estimated-pediatric' | 'missing';
}

let emergencyWeightMode: 'auto' | 'estimated-adult' | 'estimated-pediatric' = 'auto';

export function setEmergencyWeightMode(mode: 'auto' | 'estimated-adult' | 'estimated-pediatric'): void {
  emergencyWeightMode = mode;
}

export function getEmergencyWeightMode(): 'auto' | 'estimated-adult' | 'estimated-pediatric' {
  return emergencyWeightMode;
}

export function resetEmergencyWeightMode(): void {
  emergencyWeightMode = 'auto';
}

export function getWeightAndIsAdult(): EmergencyWeightContext {
  const enteredWeight = appState.biometry.weightKg;
  const hasEnteredWeight = typeof enteredWeight === 'number' && !isNaN(enteredWeight) && enteredWeight > 0;
  
  const hasExplicitAge = appState.biometry.ageYears !== null && appState.biometry.ageYears !== undefined;
  const hasPediatricMonthsOrDays = (appState.biometry.ageMonths !== null && appState.biometry.ageMonths < 216) ||
    (appState.biometry.ageDays !== null && appState.biometry.ageDays < 6570);
  const isNeonate = !!appState.biometry.isNeonate;
  
  const isExplicitPediatric = isNeonate || hasPediatricMonthsOrDays || (hasExplicitAge && (appState.biometry.ageYears as number) < 18);
  const isExplicitAdult = hasExplicitAge && (appState.biometry.ageYears as number) >= 18;

  if (hasEnteredWeight) {
    const isAdult = isExplicitPediatric ? false : isExplicitAdult ? true : (enteredWeight as number) >= 40;
    return {
      weightKg: enteredWeight as number,
      isAdult,
      isWeightMissing: false,
      isEstimated: false,
      isPediatricShieldActive: false,
      mode: 'entered'
    };
  }

  // Kilo girilmemişse:
  // Pediatrik Güvenlik Kalkanı: Hasta pediatrik (<18 yaş) ise, asla 70 kg erişkin varsayılanına izin verilmez!
  if (emergencyWeightMode === 'estimated-adult') {
    if (isExplicitPediatric) {
      // Pediatrik Güvenlik Kalkanı devrede: Erişkin seçilse bile pediatrik tahmini kiloya yönlendir
      const pediaEst = (hasExplicitAge && appState.biometry.ageYears && appState.biometry.ageYears < 18)
        ? Math.max(3, Math.min(60, Math.round(((appState.biometry.ageYears as number) + 4) * 2)))
        : 15;
      return {
        weightKg: pediaEst,
        isAdult: false,
        isWeightMissing: false,
        isEstimated: true,
        isPediatricShieldActive: true,
        mode: 'estimated-pediatric'
      };
    }
    return {
      weightKg: 70,
      isAdult: true,
      isWeightMissing: false,
      isEstimated: true,
      isPediatricShieldActive: false,
      mode: 'estimated-adult'
    };
  }

  if (emergencyWeightMode === 'estimated-pediatric') {
    const pediaEst = (hasExplicitAge && appState.biometry.ageYears && appState.biometry.ageYears < 18)
      ? Math.max(3, Math.min(60, Math.round(((appState.biometry.ageYears as number) + 4) * 2)))
      : 15;
    return {
      weightKg: pediaEst,
      isAdult: false,
      isWeightMissing: false,
      isEstimated: true,
      isPediatricShieldActive: false,
      mode: 'estimated-pediatric'
    };
  }

  // emergencyWeightMode === 'auto' (Kilo girilmedi, mutlak dozlar kilitli)
  return {
    weightKg: 0,
    isAdult: isExplicitPediatric ? false : isExplicitAdult ? true : false,
    isWeightMissing: true,
    isEstimated: false,
    isPediatricShieldActive: isExplicitPediatric,
    mode: 'missing'
  };
}

export function getCurrentAnaphylaxisDoses(): AnaphylaxisDoses {
  const ctx = getWeightAndIsAdult();
  return calculateAnaphylaxisDoses(ctx.weightKg, ctx.isAdult, ctx.isEstimated);
}

export function getCurrentStatusDoses(): StatusEpilepticusDoses {
  const ctx = getWeightAndIsAdult();
  return calculateStatusEpilepticusDoses(ctx.weightKg, ctx.isAdult, ctx.isEstimated);
}

// ----------------------------------------------------------------------------
// Anafilaksi 5 Dakikalık Adrenalin Sayacı (Wall-Clock + sessionStorage)
// ----------------------------------------------------------------------------

function startAnaphylaxisInterval(): void {
  if (anaphylaxisTimer.timerInterval !== null) {
    clearInterval(anaphylaxisTimer.timerInterval);
  }
  ensureVisibilityResyncListener();
  anaphylaxisTimer.timerInterval = (typeof window !== 'undefined' ? window.setInterval(() => {
    syncAnaphylaxisClock();
  }, 1000) : null) as unknown as number;
}

export function startAnaphylaxisCountdown(onTick?: (remainingSec: number) => void, onComplete?: () => void): void {
  activeAnaphylaxisCallbacks = { onTick, onComplete };

  const now = Date.now();
  anaphylaxisTimer.dosesGiven += 1;
  anaphylaxisTimer.remainingSeconds = 300; // 5 dk sıfırla
  anaphylaxisTimer.isRunning = true;
  anaphylaxisTimer.isExpired = false;
  anaphylaxisTimer.lastDoseTimestampMs = now;
  anaphylaxisTimer.targetEndTimestampMs = now + 300 * 1000;

  if (appState.emergency) {
    appState.emergency.active = true;
    appState.emergency.anaphylaxis = {
      administeredDoses: anaphylaxisTimer.dosesGiven,
      lastDoseTimestamp: now,
      doses: getCurrentAnaphylaxisDoses()
    };
  }

  persistEmergencySession();
  startAnaphylaxisInterval();
}

export function resetAnaphylaxisTimer(): void {
  if (anaphylaxisTimer.timerInterval !== null) {
    clearInterval(anaphylaxisTimer.timerInterval);
    anaphylaxisTimer.timerInterval = null;
  }
  anaphylaxisTimer.remainingSeconds = 300;
  anaphylaxisTimer.dosesGiven = 0;
  anaphylaxisTimer.isRunning = false;
  anaphylaxisTimer.isExpired = false;
  anaphylaxisTimer.lastDoseTimestampMs = null;
  anaphylaxisTimer.targetEndTimestampMs = null;
  if (appState.emergency) {
    appState.emergency.anaphylaxis = null;
    if (!appState.emergency.statusEpilepticus) {
      appState.emergency.active = false;
    }
  }
  persistEmergencySession();
}

export function getAnaphylaxisTimerState(): Readonly<AnaphylaxisTimerState> {
  syncAnaphylaxisClock();
  return anaphylaxisTimer;
}

// ----------------------------------------------------------------------------
// Status Epilepticus Geçen Süre Kronometresi (Wall-Clock + sessionStorage)
// ----------------------------------------------------------------------------

function startStatusInterval(): void {
  if (statusTimer.timerInterval !== null) {
    clearInterval(statusTimer.timerInterval);
  }
  ensureVisibilityResyncListener();
  statusTimer.timerInterval = (typeof window !== 'undefined' ? window.setInterval(() => {
    syncStatusClock();
  }, 1000) : null) as unknown as number;
}

export function startStatusStopwatch(onTick?: (elapsedSec: number, phase: number) => void): void {
  activeStatusCallback = onTick;

  if (!statusTimer.isRunning || statusTimer.runStartTimestampMs === null) {
    statusTimer.runStartTimestampMs = Date.now();
    statusTimer.isRunning = true;
  }

  if (appState.emergency) {
    appState.emergency.active = true;
    appState.emergency.statusEpilepticus = {
      elapsedMinutes: Math.floor(statusTimer.elapsedSeconds / 60),
      isRunning: true,
      doses: getCurrentStatusDoses()
    };
  }

  persistEmergencySession();
  startStatusInterval();
}

export function pauseStatusStopwatch(): void {
  syncStatusClock();
  if (statusTimer.timerInterval !== null) {
    clearInterval(statusTimer.timerInterval);
    statusTimer.timerInterval = null;
  }
  statusTimer.accumulatedSeconds = statusTimer.elapsedSeconds;
  statusTimer.runStartTimestampMs = null;
  statusTimer.isRunning = false;
  if (appState.emergency && appState.emergency.statusEpilepticus) {
    appState.emergency.statusEpilepticus.isRunning = false;
  }
  persistEmergencySession();
}

export function resetStatusStopwatch(): void {
  if (statusTimer.timerInterval !== null) {
    clearInterval(statusTimer.timerInterval);
    statusTimer.timerInterval = null;
  }
  statusTimer.isRunning = false;
  statusTimer.elapsedSeconds = 0;
  statusTimer.accumulatedSeconds = 0;
  statusTimer.runStartTimestampMs = null;
  if (appState.emergency) {
    appState.emergency.statusEpilepticus = null;
    if (!appState.emergency.anaphylaxis) {
      appState.emergency.active = false;
    }
  }
  persistEmergencySession();
}

export function getStatusTimerState(): Readonly<StatusTimerState> {
  syncStatusClock();
  return statusTimer;
}

// ----------------------------------------------------------------------------
// Sayfa Yenilenmesi (Refresh) Sonrası Otomatik Kurtarma (Recovery)
// ----------------------------------------------------------------------------

export interface EmergencyRecoveryCallbacks {
  onAnaphylaxisTick?: (remainingSec: number) => void;
  onAnaphylaxisComplete?: () => void;
  onStatusTick?: (elapsedSec: number, phase: number) => void;
}

export function restoreEmergencyTimersFromSession(callbacks: EmergencyRecoveryCallbacks = {}): {
  restoredAnaphylaxis: boolean;
  restoredStatus: boolean;
} {
  const storage = getSafeSessionStorage();
  if (!storage) return { restoredAnaphylaxis: false, restoredStatus: false };

  let restoredAnaphylaxis = false;
  let restoredStatus = false;

  try {
    const raw = storage.getItem(EMERGENCY_SESSION_KEY);
    if (!raw) return { restoredAnaphylaxis: false, restoredStatus: false };
    const parsed = JSON.parse(raw) as PersistedEmergencySession;

    if (parsed.anaphylaxis && parsed.anaphylaxis.dosesGiven > 0) {
      activeAnaphylaxisCallbacks = {
        onTick: callbacks.onAnaphylaxisTick,
        onComplete: callbacks.onAnaphylaxisComplete
      };
      anaphylaxisTimer.dosesGiven = parsed.anaphylaxis.dosesGiven;
      anaphylaxisTimer.lastDoseTimestampMs = parsed.anaphylaxis.lastDoseTimestampMs;
      anaphylaxisTimer.targetEndTimestampMs = parsed.anaphylaxis.targetEndTimestampMs;

      if (parsed.anaphylaxis.isRunning && parsed.anaphylaxis.targetEndTimestampMs !== null) {
        const rem = Math.max(0, Math.ceil((parsed.anaphylaxis.targetEndTimestampMs - Date.now()) / 1000));
        anaphylaxisTimer.remainingSeconds = rem;
        if (rem > 0) {
          anaphylaxisTimer.isRunning = true;
          anaphylaxisTimer.isExpired = false;
          startAnaphylaxisInterval();
        } else {
          anaphylaxisTimer.isRunning = false;
          anaphylaxisTimer.isExpired = true;
          anaphylaxisTimer.targetEndTimestampMs = null;
        }
      } else {
        anaphylaxisTimer.remainingSeconds = parsed.anaphylaxis.remainingSeconds;
        anaphylaxisTimer.isRunning = false;
        anaphylaxisTimer.isExpired = parsed.anaphylaxis.isExpired;
      }

      if (appState.emergency) {
        appState.emergency.active = true;
        appState.emergency.anaphylaxis = {
          administeredDoses: anaphylaxisTimer.dosesGiven,
          lastDoseTimestamp: anaphylaxisTimer.lastDoseTimestampMs || Date.now(),
          doses: getCurrentAnaphylaxisDoses()
        };
      }
      restoredAnaphylaxis = true;
    }

    if (parsed.statusEpilepticus && (parsed.statusEpilepticus.isRunning || parsed.statusEpilepticus.elapsedSeconds > 0)) {
      activeStatusCallback = callbacks.onStatusTick;
      statusTimer.accumulatedSeconds = parsed.statusEpilepticus.accumulatedSeconds || 0;
      statusTimer.runStartTimestampMs = parsed.statusEpilepticus.runStartTimestampMs;
      statusTimer.isRunning = Boolean(parsed.statusEpilepticus.isRunning && parsed.statusEpilepticus.runStartTimestampMs !== null);

      if (statusTimer.isRunning && statusTimer.runStartTimestampMs !== null) {
        const delta = Math.max(0, Math.floor((Date.now() - statusTimer.runStartTimestampMs) / 1000));
        statusTimer.elapsedSeconds = statusTimer.accumulatedSeconds + delta;
        startStatusInterval();
      } else {
        statusTimer.elapsedSeconds = parsed.statusEpilepticus.elapsedSeconds || statusTimer.accumulatedSeconds;
      }

      if (appState.emergency) {
        appState.emergency.active = true;
        appState.emergency.statusEpilepticus = {
          elapsedMinutes: Math.floor(statusTimer.elapsedSeconds / 60),
          isRunning: statusTimer.isRunning,
          doses: getCurrentStatusDoses()
        };
      }
      restoredStatus = true;
    }

    persistEmergencySession();
  } catch {
    // Bozuk oturum kaydı varsa temizle
    storage.removeItem(EMERGENCY_SESSION_KEY);
  }

  return { restoredAnaphylaxis, restoredStatus };
}

// ----------------------------------------------------------------------------
// Format Yardımları
// ----------------------------------------------------------------------------

export function formatTimeMMSS(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safeSec / 60);
  const s = safeSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export {
  formatAnaphylaxisSoapNote,
  formatStatusEpilepticusSoapNote
};
