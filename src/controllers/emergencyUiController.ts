import {
  getCurrentAnaphylaxisDoses,
  getCurrentStatusDoses,
  getWeightAndIsAdult,
  setEmergencyWeightMode,
  resetEmergencyWeightMode,
  startAnaphylaxisCountdown,
  resetAnaphylaxisTimer,
  getAnaphylaxisTimerState,
  startStatusStopwatch,
  pauseStatusStopwatch,
  resetStatusStopwatch,
  getStatusTimerState,
  restoreEmergencyTimersFromSession,
  formatTimeMMSS,
  formatAnaphylaxisSoapNote,
  formatStatusEpilepticusSoapNote
} from '../utils/emergencyManager';

const getEl = <T extends HTMLElement = HTMLElement>(id: string): T | null => {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id) as T | null;
};

export interface EmergencyControllerHooks {
  onUpdateAllTabs: () => void;
  onUpdateLiveSOAP: () => void;
}

export function initEmergencyUiController(hooks: EmergencyControllerHooks): void {
  if (typeof document === 'undefined') return;

  const btnEmergency = getEl('btn-emergency-protocols');
  const modalEmergency = getEl('modal-emergency-protocols');
  const btnCloseEmergency = getEl('btn-close-emergency-modal');
  const badgeEmergencyWeight = getEl('emergency-weight-badge');
  const bannerEmergencyWarning = getEl('emergency-weight-warning-banner');
  const textEmergencyWarning = getEl('emergency-weight-warning-text');
  const btnEmergencyApplyAdult = getEl('btn-emergency-apply-adult-weight');
  const btnEmergencyApplyPediatric = getEl('btn-emergency-apply-pediatric-weight');
  const btnEmergencyResetWeight = getEl('btn-emergency-reset-weight-mode');
  const tabBtnAnaphylaxis = getEl('tab-btn-anaphylaxis');
  const tabBtnStatus = getEl('tab-btn-status');
  const panelAnaphylaxis = getEl('panel-emergency-anaphylaxis');
  const panelStatus = getEl('panel-emergency-status');

  // Anaphylaxis Elements
  const textAdrDose = getEl('text-emergency-adr-dose');
  const timerAdrDisplay = getEl('timer-anaphylaxis-display');
  const timerAdrBar = getEl('timer-anaphylaxis-bar');
  const badgeAdrTimerStatus = getEl('badge-anaphylaxis-timer-status');
  const btnAdrStart = getEl('btn-anaphylaxis-start-timer');
  const btnAdrRepeat = getEl('btn-anaphylaxis-repeat-dose');
  const btnAdrReset = getEl('btn-anaphylaxis-reset-timer');
  const alertAdrExpired = getEl('alert-anaphylaxis-timer-expired');
  const textFluidDose = getEl('text-emergency-fluid-dose');
  const textSalbutamolDose = getEl('text-emergency-salbutamol-dose');
  const textPheniramineDose = getEl('text-emergency-pheniramine-dose');
  const textPrednolDose = getEl('text-emergency-prednol-dose');
  const btnAnaphylaxisToSoap = getEl('btn-anaphylaxis-to-soap');

  // Status Epilepticus Elements
  const timerStatusDisplay = getEl('timer-status-display');
  const badgeStatusPhase = getEl('badge-status-active-phase');
  const btnStatusStart = getEl('btn-status-start-timer');
  const btnStatusPause = getEl('btn-status-pause-timer');
  const btnStatusReset = getEl('btn-status-reset-timer');
  const cardPhase1 = getEl('card-status-phase-1');
  const cardPhase2 = getEl('card-status-phase-2');
  const cardPhase3 = getEl('card-status-phase-3');
  const cardPhase4 = getEl('card-status-phase-4');
  const textGlucoseDose = getEl('text-status-glucose-dose');
  const textMidazolamDose = getEl('text-status-midazolam-dose');
  const textDiazepamDose = getEl('text-status-diazepam-dose');
  const textKeppraDose = getEl('text-status-keppra-dose');
  const textPhenytoinDose = getEl('text-status-phenytoin-dose');
  const textValproateDose = getEl('text-status-valproate-dose');
  const btnStatusToSoap = getEl('btn-status-to-soap');

  function refreshEmergencyDosesDisplay(): void {
    const weightCtx = getWeightAndIsAdult();
    const adrDoses = getCurrentAnaphylaxisDoses();
    const statDoses = getCurrentStatusDoses();

    // 1. Ağırlık Rozeti ve Kilo Uyarı Şeridi Yönetimi
    if (weightCtx.isWeightMissing) {
      if (badgeEmergencyWeight) {
        badgeEmergencyWeight.textContent = 'Kilo: GİRİLMEDİ [KİLİTLİ]';
        badgeEmergencyWeight.className = 'text-xs bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full tabular-nums font-bold';
      }
      if (bannerEmergencyWarning) bannerEmergencyWarning.classList.remove('hidden');
      if (btnEmergencyResetWeight) btnEmergencyResetWeight.classList.add('hidden');
      if (textEmergencyWarning) {
        textEmergencyWarning.textContent = weightCtx.isPediatricShieldActive
          ? '[KRİTİK UYARI] PEDİATRİK GÜVENLİK KALKANI: Yaş pediatrik (<18) — 70 kg erişkin varsayılanı engellendi! Kilo girilmeli veya Pediatrik Tahmini Kilo uygulanmalıdır.'
          : '[DİKKAT] KİLO GİRİLMEDİ — Mutlak dozlar kilitlendi. Yalnızca mg/kg doz formülleri gösterilmektedir.';
      }
    } else if (weightCtx.isEstimated) {
      if (badgeEmergencyWeight) {
        badgeEmergencyWeight.textContent = `Kilo: ${adrDoses.weightKg} kg (Tahmini ${adrDoses.isAdult ? 'Erişkin' : 'Pediatrik'})`;
        badgeEmergencyWeight.className = 'text-xs bg-amber-950 text-amber-300 border border-amber-600 px-2 py-0.5 rounded-full tabular-nums font-bold animate-pulse';
      }
      if (bannerEmergencyWarning) bannerEmergencyWarning.classList.remove('hidden');
      if (btnEmergencyResetWeight) btnEmergencyResetWeight.classList.remove('hidden');
      if (textEmergencyWarning) {
        textEmergencyWarning.textContent = weightCtx.isPediatricShieldActive
          ? `[DİKKAT] KİLO GİRİLMEDİ — PEDİATRİK GÜVENLİK KALKANI: <18 Yaş hastada 70 kg erişkin varsayılanı engellendi, tahmini pediatrik kilo (${adrDoses.weightKg} kg) uygulandı.`
          : `[DİKKAT] KİLO GİRİLMEDİ — DOZLAR VARSAYILAN KİLOYA GÖRE TAHMİNİDİR (${adrDoses.weightKg} kg ${adrDoses.isAdult ? 'Erişkin' : 'Pediatrik'})`;
      }
    } else {
      if (badgeEmergencyWeight) {
        badgeEmergencyWeight.textContent = `Kilo: ${adrDoses.weightKg} kg (${adrDoses.isAdult ? 'Erişkin' : 'Pediatrik'})`;
        badgeEmergencyWeight.className = 'text-xs bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full tabular-nums font-normal';
      }
      if (bannerEmergencyWarning) bannerEmergencyWarning.classList.add('hidden');
    }

    // 2. Anafilaksi Dozları
    if (textAdrDose) {
      textAdrDose.textContent = adrDoses.isLocked
        ? '0.01 mg/kg İM [Kilitli]'
        : `${adrDoses.adrenaline.volumeMl.toFixed(2)} mL (${adrDoses.adrenaline.doseMg.toFixed(2)} mg)${adrDoses.isEstimated ? ' [Tahmini]' : ''}`;
    }
    if (textFluidDose) {
      textFluidDose.textContent = adrDoses.isLocked
        ? '20 mL/kg SF [Kilitli]'
        : `${adrDoses.fluidBolus.volumeMl} mL SF${adrDoses.isEstimated ? ' [Tahmini]' : ''}`;
    }
    if (textSalbutamolDose) textSalbutamolDose.textContent = adrDoses.bronchospasm.dose;
    if (textPheniramineDose) {
      textPheniramineDose.textContent = adrDoses.isLocked
        ? '1 mg/kg (Maks 50 mg)'
        : `${adrDoses.antihistaminic.doseMg} mg${adrDoses.isEstimated ? ' [Tahmini]' : ''}`;
    }
    if (textPrednolDose) {
      textPrednolDose.textContent = adrDoses.isLocked
        ? '1-2 mg/kg (Maks 80 mg)'
        : `${adrDoses.corticosteroid.doseMg} mg${adrDoses.isEstimated ? ' [Tahmini]' : ''}`;
    }

    // 3. Status Epilepticus Dozları
    if (textGlucoseDose) textGlucoseDose.textContent = statDoses.phase1Stabilization.glucoseDextrose.doseText;
    if (textMidazolamDose) {
      textMidazolamDose.textContent = statDoses.isLocked
        ? '0.2 mg/kg İM [Kilitli]'
        : `${statDoses.phase2EarlyStatus.midazolam.doseMg} mg İM (${(statDoses.phase2EarlyStatus.midazolam.doseMg / 5).toFixed(2)} mL)${statDoses.isEstimated ? ' [Tahmini]' : ''}`;
    }
    if (textDiazepamDose) {
      textDiazepamDose.textContent = statDoses.isLocked
        ? '0.2–0.3 mg/kg IV [Kilitli]'
        : `${statDoses.phase2EarlyStatus.diazepam.doseMg} mg IV (${(statDoses.phase2EarlyStatus.diazepam.doseMg / 5).toFixed(2)} mL)${statDoses.isEstimated ? ' [Tahmini]' : ''}`;
    }
    if (textKeppraDose) {
      textKeppraDose.textContent = statDoses.isLocked
        ? '60 mg/kg IV [Kilitli]'
        : `${statDoses.phase3EstablishedStatus.levetiracetam.doseMg} mg IV (10-15 dk)${statDoses.isEstimated ? ' [Tahmini]' : ''}`;
    }
    if (textPhenytoinDose) {
      textPhenytoinDose.textContent = statDoses.isLocked
        ? '20 mg/kg IV [Kilitli]'
        : `${statDoses.phase3EstablishedStatus.phenytoin.doseMg} mg IV (Hız ≤50 mg/dk)${statDoses.isEstimated ? ' [Tahmini]' : ''}`;
    }
    if (textValproateDose) {
      textValproateDose.textContent = statDoses.isLocked
        ? '40 mg/kg IV [Kilitli]'
        : `${statDoses.phase3EstablishedStatus.valproate.doseMg} mg IV (10 dk)${statDoses.isEstimated ? ' [Tahmini]' : ''}`;
    }
  }

  function switchEmergencyTab(targetTab: 'anaphylaxis' | 'status'): void {
    if (!tabBtnAnaphylaxis || !tabBtnStatus || !panelAnaphylaxis || !panelStatus) return;
    if (targetTab === 'anaphylaxis') {
      tabBtnAnaphylaxis.className = 'px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 border-rose-500 text-rose-400 bg-slate-900';
      tabBtnStatus.className = 'px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 border-transparent text-slate-400 hover:text-slate-200';
      panelAnaphylaxis.classList.remove('hidden');
      panelStatus.classList.add('hidden');
    } else {
      tabBtnStatus.className = 'px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 border-cyan-500 text-cyan-400 bg-slate-900';
      tabBtnAnaphylaxis.className = 'px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 border-transparent text-slate-400 hover:text-slate-200';
      panelStatus.classList.remove('hidden');
      panelAnaphylaxis.classList.add('hidden');
    }
  }

  function highlightStatusPhaseCard(phase: number): void {
    const cards = [cardPhase1, cardPhase2, cardPhase3, cardPhase4];
    cards.forEach((c, idx) => {
      if (!c) return;
      const currentPhaseNum = idx + 1;
      if (currentPhaseNum === phase) {
        c.classList.add('border-cyan-500', 'bg-cyan-950/40', 'ring-1', 'ring-cyan-500/50');
        c.classList.remove('border-slate-800', 'bg-slate-950/60');
      } else {
        c.classList.remove('border-cyan-500', 'bg-cyan-950/40', 'ring-1', 'ring-cyan-500/50');
        c.classList.add('border-slate-800', 'bg-slate-950/60');
      }
    });
  }

  const handleAnaphylaxisTick = (remSec: number): void => {
    if (timerAdrDisplay) timerAdrDisplay.textContent = formatTimeMMSS(remSec);
    if (timerAdrBar) timerAdrBar.style.width = `${(remSec / 300) * 100}%`;
  };

  const handleAnaphylaxisExpire = (): void => {
    if (alertAdrExpired) alertAdrExpired.classList.remove('hidden');
    if (badgeAdrTimerStatus) {
      badgeAdrTimerStatus.textContent = '5 dk Doldu - 2. Doz!';
      badgeAdrTimerStatus.className = 'text-xs tabular-nums text-red-300 bg-red-950 px-2 py-0.5 rounded border border-red-800 animate-pulse';
    }
  };

  const handleStatusTick = (elapsedSec: number, phase: number): void => {
    if (timerStatusDisplay) timerStatusDisplay.textContent = formatTimeMMSS(elapsedSec);
    if (badgeStatusPhase) {
      const phaseTitles = [
        'Faz 1: 0–5 dk (Stabilizasyon & ABC)',
        'Faz 2: 5–20 dk (1. Basamak Benzodiazepin)',
        'Faz 3: 20–40 dk (2. Basamak Antiepileptik)',
        'Faz 4: 40+ dk (Refrakter Status & YBÜ)'
      ];
      badgeStatusPhase.textContent = phaseTitles[phase - 1] || 'Süre Takibi';
    }
    highlightStatusPhaseCard(phase);
  };

  // Sayfa yenilenmesi / uyku modundan çıkışta aktif sayaçları sessionStorage'dan sıfır kaymayla geri yükle
  const restored = restoreEmergencyTimersFromSession({
    onAnaphylaxisTick: handleAnaphylaxisTick,
    onAnaphylaxisComplete: handleAnaphylaxisExpire,
    onStatusTick: handleStatusTick
  });

  if (restored.restoredAnaphylaxis) {
    const adrState = getAnaphylaxisTimerState();
    handleAnaphylaxisTick(adrState.remainingSeconds);
    if (btnAdrStart) btnAdrStart.classList.add('hidden');
    if (btnAdrRepeat) btnAdrRepeat.classList.remove('hidden');
    if (adrState.isExpired) {
      handleAnaphylaxisExpire();
    } else if (adrState.isRunning && badgeAdrTimerStatus) {
      badgeAdrTimerStatus.textContent = `Sayım Sürüyor (${adrState.dosesGiven}. Doz)`;
      badgeAdrTimerStatus.className = 'text-xs tabular-nums text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800';
    }
  }

  if (restored.restoredStatus) {
    const stState = getStatusTimerState();
    const phase = stState.elapsedSeconds < 300 ? 1 : stState.elapsedSeconds < 1200 ? 2 : stState.elapsedSeconds < 2400 ? 3 : 4;
    handleStatusTick(stState.elapsedSeconds, phase);
    if (stState.isRunning) {
      if (btnStatusStart) btnStatusStart.classList.add('hidden');
      if (btnStatusPause) btnStatusPause.classList.remove('hidden');
    } else if (stState.elapsedSeconds > 0 && btnStatusStart) {
      btnStatusStart.textContent = 'Devam Et';
    }
  }

  function openEmergencyModal(tab: 'anaphylaxis' | 'status' = 'anaphylaxis'): void {
    if (!modalEmergency) return;
    modalEmergency.classList.remove('hidden');
    refreshEmergencyDosesDisplay();
    switchEmergencyTab(tab);
  }

  function closeEmergencyModal(): void {
    if (!modalEmergency) return;
    modalEmergency.classList.add('hidden');
  }

  if (btnEmergency) btnEmergency.addEventListener('click', () => openEmergencyModal('anaphylaxis'));
  if (btnCloseEmergency) btnCloseEmergency.addEventListener('click', closeEmergencyModal);
  if (modalEmergency) {
    modalEmergency.addEventListener('click', (e) => {
      if (e.target === modalEmergency) closeEmergencyModal();
    });
  }

  if (tabBtnAnaphylaxis) tabBtnAnaphylaxis.addEventListener('click', () => switchEmergencyTab('anaphylaxis'));
  if (tabBtnStatus) tabBtnStatus.addEventListener('click', () => switchEmergencyTab('status'));

  if (btnEmergencyApplyAdult) {
    btnEmergencyApplyAdult.addEventListener('click', () => {
      setEmergencyWeightMode('estimated-adult');
      refreshEmergencyDosesDisplay();
      hooks.onUpdateLiveSOAP();
    });
  }

  if (btnEmergencyApplyPediatric) {
    btnEmergencyApplyPediatric.addEventListener('click', () => {
      setEmergencyWeightMode('estimated-pediatric');
      refreshEmergencyDosesDisplay();
      hooks.onUpdateLiveSOAP();
    });
  }

  if (btnEmergencyResetWeight) {
    btnEmergencyResetWeight.addEventListener('click', () => {
      setEmergencyWeightMode('auto');
      refreshEmergencyDosesDisplay();
      hooks.onUpdateLiveSOAP();
    });
  }

  if (btnAdrStart) {
    btnAdrStart.addEventListener('click', () => {
      startAnaphylaxisCountdown(handleAnaphylaxisTick, handleAnaphylaxisExpire);
      btnAdrStart.classList.add('hidden');
      if (btnAdrRepeat) btnAdrRepeat.classList.remove('hidden');
      if (alertAdrExpired) alertAdrExpired.classList.add('hidden');
      if (badgeAdrTimerStatus) {
        badgeAdrTimerStatus.textContent = 'Sayım Sürüyor (1. Doz)';
        badgeAdrTimerStatus.className = 'text-xs tabular-nums text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800';
      }
      hooks.onUpdateLiveSOAP();
    });
  }

  if (btnAdrRepeat) {
    btnAdrRepeat.addEventListener('click', () => {
      startAnaphylaxisCountdown(handleAnaphylaxisTick, handleAnaphylaxisExpire);
      if (alertAdrExpired) alertAdrExpired.classList.add('hidden');
      if (badgeAdrTimerStatus) {
        const state = getAnaphylaxisTimerState();
        badgeAdrTimerStatus.textContent = `Sayım Sürüyor (${state.dosesGiven}. Doz)`;
        badgeAdrTimerStatus.className = 'text-xs tabular-nums text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800';
      }
      hooks.onUpdateLiveSOAP();
    });
  }

  if (btnAdrReset) {
    btnAdrReset.addEventListener('click', () => {
      resetAnaphylaxisTimer();
      if (timerAdrDisplay) timerAdrDisplay.textContent = '05:00';
      if (timerAdrBar) timerAdrBar.style.width = '100%';
      if (btnAdrStart) btnAdrStart.classList.remove('hidden');
      if (btnAdrRepeat) btnAdrRepeat.classList.add('hidden');
      if (alertAdrExpired) alertAdrExpired.classList.add('hidden');
      if (badgeAdrTimerStatus) {
        badgeAdrTimerStatus.textContent = 'Beklemede';
        badgeAdrTimerStatus.className = 'text-xs tabular-nums text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800';
      }
      hooks.onUpdateLiveSOAP();
    });
  }

  if (btnStatusStart) {
    btnStatusStart.addEventListener('click', () => {
      startStatusStopwatch(handleStatusTick);
      btnStatusStart.classList.add('hidden');
      if (btnStatusPause) btnStatusPause.classList.remove('hidden');
      hooks.onUpdateLiveSOAP();
    });
  }

  if (btnStatusPause) {
    btnStatusPause.addEventListener('click', () => {
      pauseStatusStopwatch();
      if (btnStatusStart) {
        btnStatusStart.textContent = 'Devam Et';
        btnStatusStart.classList.remove('hidden');
      }
      btnStatusPause.classList.add('hidden');
    });
  }

  if (btnStatusReset) {
    btnStatusReset.addEventListener('click', () => {
      resetStatusStopwatch();
      if (timerStatusDisplay) timerStatusDisplay.textContent = '00:00';
      if (badgeStatusPhase) badgeStatusPhase.textContent = 'Faz 1: 0–5 dk (Stabilizasyon)';
      if (btnStatusStart) {
        btnStatusStart.textContent = 'Başlat';
        btnStatusStart.classList.remove('hidden');
      }
      if (btnStatusPause) btnStatusPause.classList.add('hidden');
      highlightStatusPhaseCard(1);
      hooks.onUpdateLiveSOAP();
    });
  }

  const inputCustomNotes = getEl<HTMLTextAreaElement>('input-custom-notes');

  if (btnAnaphylaxisToSoap) {
    btnAnaphylaxisToSoap.addEventListener('click', () => {
      const doses = getCurrentAnaphylaxisDoses();
      const timerState = getAnaphylaxisTimerState();
      const formatted = formatAnaphylaxisSoapNote(doses, Math.max(1, timerState.dosesGiven));
      if (inputCustomNotes) {
        const current = inputCustomNotes.value.trim();
        inputCustomNotes.value = current ? `${current}\n\n${formatted}` : formatted;
      }
      hooks.onUpdateAllTabs();
      btnAnaphylaxisToSoap.textContent = 'SOAP Notuna Eklendi';
      setTimeout(() => {
        btnAnaphylaxisToSoap.innerHTML = 'Anafilaksi Protokolünü SOAP\'a Ekle';
      }, 2000);
    });
  }

  if (btnStatusToSoap) {
    btnStatusToSoap.addEventListener('click', () => {
      const doses = getCurrentStatusDoses();
      const timerState = getStatusTimerState();
      const minutes = Math.floor(timerState.elapsedSeconds / 60);
      const formatted = formatStatusEpilepticusSoapNote(doses, minutes);
      if (inputCustomNotes) {
        const current = inputCustomNotes.value.trim();
        inputCustomNotes.value = current ? `${current}\n\n${formatted}` : formatted;
      }
      hooks.onUpdateAllTabs();
      btnStatusToSoap.textContent = 'SOAP Notuna Eklendi';
      setTimeout(() => {
        btnStatusToSoap.innerHTML = 'Status Protokolünü SOAP\'a Ekle';
      }, 2000);
    });
  }
}

export function resetEmergencyUi(): void {
  resetAnaphylaxisTimer();
  resetStatusStopwatch();
  resetEmergencyWeightMode();

  const timerAdrDisplay = getEl('timer-adr-display');
  const timerAdrBar = getEl('timer-adr-bar');
  const btnAdrStart = getEl('btn-adr-start');
  const btnAdrRepeat = getEl('btn-adr-repeat');
  const alertAdrExpired = getEl('alert-adr-expired');
  const badgeAdrTimerStatus = getEl('badge-adr-timer-status');

  if (timerAdrDisplay) timerAdrDisplay.textContent = '05:00';
  if (timerAdrBar) timerAdrBar.style.width = '100%';
  if (btnAdrStart) btnAdrStart.classList.remove('hidden');
  if (btnAdrRepeat) btnAdrRepeat.classList.add('hidden');
  if (alertAdrExpired) alertAdrExpired.classList.add('hidden');
  if (badgeAdrTimerStatus) {
    badgeAdrTimerStatus.textContent = 'Beklemede';
    badgeAdrTimerStatus.className = 'text-xs tabular-nums text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800';
  }

  const timerStatusDisplay = getEl('timer-status-display');
  const badgeStatusPhase = getEl('badge-status-phase');
  const btnStatusStart = getEl('btn-status-start');
  const btnStatusPause = getEl('btn-status-pause');

  if (timerStatusDisplay) timerStatusDisplay.textContent = '00:00';
  if (badgeStatusPhase) badgeStatusPhase.textContent = 'Faz 1: 0–5 dk (Stabilizasyon)';
  if (btnStatusStart) {
    btnStatusStart.textContent = 'Başlat';
    btnStatusStart.classList.remove('hidden');
  }
  if (btnStatusPause) btnStatusPause.classList.add('hidden');

  const cardPhase1 = getEl('card-status-phase-1');
  const cardPhase2 = getEl('card-status-phase-2');
  const cardPhase3 = getEl('card-status-phase-3');
  const cardPhase4 = getEl('card-status-phase-4');
  [cardPhase1, cardPhase2, cardPhase3, cardPhase4].forEach((c, idx) => {
    if (!c) return;
    if (idx === 0) {
      c.classList.add('border-cyan-500', 'bg-cyan-950/40', 'ring-1', 'ring-cyan-500/50');
      c.classList.remove('border-slate-800', 'bg-slate-950/60');
    } else {
      c.classList.remove('border-cyan-500', 'bg-cyan-950/40', 'ring-1', 'ring-cyan-500/50');
      c.classList.add('border-slate-800', 'bg-slate-950/60');
    }
  });
}

