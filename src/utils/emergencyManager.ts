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
}

export interface StatusTimerState {
  elapsedSeconds: number;
  timerInterval: number | null;
  isRunning: boolean;
}

const anaphylaxisTimer: AnaphylaxisTimerState = {
  remainingSeconds: 300, // 5 dakika
  totalSeconds: 300,
  timerInterval: null,
  dosesGiven: 0,
  isRunning: false,
  isExpired: false
};

const statusTimer: StatusTimerState = {
  elapsedSeconds: 0,
  timerInterval: null,
  isRunning: false
};

function getWeightAndIsAdult(): { weightKg: number; isAdult: boolean } {
  const weight = appState.biometry.weightKg || 70;
  const hasExplicitAge = appState.biometry.ageYears !== null && appState.biometry.ageYears !== undefined;
  const hasPediatricMonthsOrDays = (appState.biometry.ageMonths !== null && appState.biometry.ageMonths < 216) ||
    (appState.biometry.ageDays !== null && appState.biometry.ageDays < 6570);
  const isAdult = !appState.biometry.isNeonate && !hasPediatricMonthsOrDays && (
    hasExplicitAge
      ? (appState.biometry.ageYears as number) >= 18
      : weight >= 40
  );
  return { weightKg: weight, isAdult };
}

export function getCurrentAnaphylaxisDoses(): AnaphylaxisDoses {
  const { weightKg, isAdult } = getWeightAndIsAdult();
  return calculateAnaphylaxisDoses(weightKg, isAdult);
}

export function getCurrentStatusDoses(): StatusEpilepticusDoses {
  const { weightKg, isAdult } = getWeightAndIsAdult();
  return calculateStatusEpilepticusDoses(weightKg, isAdult);
}

// ----------------------------------------------------------------------------
// ANAFİ Swanson / Anafilaksi Sayacı
// ----------------------------------------------------------------------------

export function startAnaphylaxisCountdown(onTick?: (remainingSec: number) => void, onComplete?: () => void): void {
  if (anaphylaxisTimer.timerInterval !== null) {
    clearInterval(anaphylaxisTimer.timerInterval);
  }

  anaphylaxisTimer.dosesGiven += 1;
  anaphylaxisTimer.remainingSeconds = 300; // 5 dk sıfırla
  anaphylaxisTimer.isRunning = true;
  anaphylaxisTimer.isExpired = false;

  // appState güncelle
  if (appState.emergency) {
    appState.emergency.active = true;
    appState.emergency.anaphylaxis = {
      administeredDoses: anaphylaxisTimer.dosesGiven,
      lastDoseTimestamp: Date.now(),
      doses: getCurrentAnaphylaxisDoses()
    };
  }

  anaphylaxisTimer.timerInterval = (typeof window !== 'undefined' ? window.setInterval(() => {
    anaphylaxisTimer.remainingSeconds -= 1;
    if (onTick) onTick(anaphylaxisTimer.remainingSeconds);

    if (anaphylaxisTimer.remainingSeconds <= 0) {
      if (anaphylaxisTimer.timerInterval !== null) {
        clearInterval(anaphylaxisTimer.timerInterval);
        anaphylaxisTimer.timerInterval = null;
      }
      anaphylaxisTimer.isRunning = false;
      anaphylaxisTimer.isExpired = true;
      if (onComplete) onComplete();
    }
  }, 1000) : null) as unknown as number;
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
  if (appState.emergency) {
    appState.emergency.anaphylaxis = null;
    if (!appState.emergency.statusEpilepticus) {
      appState.emergency.active = false;
    }
  }
}

export function getAnaphylaxisTimerState(): Readonly<AnaphylaxisTimerState> {
  return anaphylaxisTimer;
}

// ----------------------------------------------------------------------------
// Status Epilepticus Geçen Süre Kronometresi
// ----------------------------------------------------------------------------

export function startStatusStopwatch(onTick?: (elapsedSec: number, phase: number) => void): void {
  if (statusTimer.timerInterval !== null) {
    clearInterval(statusTimer.timerInterval);
  }

  statusTimer.isRunning = true;

  if (appState.emergency) {
    appState.emergency.active = true;
    appState.emergency.statusEpilepticus = {
      elapsedMinutes: Math.floor(statusTimer.elapsedSeconds / 60),
      isRunning: true,
      doses: getCurrentStatusDoses()
    };
  }

  statusTimer.timerInterval = (typeof window !== 'undefined' ? window.setInterval(() => {
    statusTimer.elapsedSeconds += 1;
    const elapsedMinutes = Math.floor(statusTimer.elapsedSeconds / 60);

    let phase = 1; // 0-5 dk: Stabilizasyon
    if (elapsedMinutes >= 40) phase = 4; // Refrakter
    else if (elapsedMinutes >= 20) phase = 3; // 2. Basamak
    else if (elapsedMinutes >= 5) phase = 2; // 1. Basamak

    if (appState.emergency && appState.emergency.statusEpilepticus) {
      appState.emergency.statusEpilepticus.elapsedMinutes = elapsedMinutes;
      appState.emergency.statusEpilepticus.isRunning = true;
    }

    if (onTick) onTick(statusTimer.elapsedSeconds, phase);
  }, 1000) : null) as unknown as number;
}

export function pauseStatusStopwatch(): void {
  if (statusTimer.timerInterval !== null) {
    clearInterval(statusTimer.timerInterval);
    statusTimer.timerInterval = null;
  }
  statusTimer.isRunning = false;
  if (appState.emergency && appState.emergency.statusEpilepticus) {
    appState.emergency.statusEpilepticus.isRunning = false;
  }
}

export function resetStatusStopwatch(): void {
  pauseStatusStopwatch();
  statusTimer.elapsedSeconds = 0;
  if (appState.emergency) {
    appState.emergency.statusEpilepticus = null;
    if (!appState.emergency.anaphylaxis) {
      appState.emergency.active = false;
    }
  }
}

export function getStatusTimerState(): Readonly<StatusTimerState> {
  return statusTimer;
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
