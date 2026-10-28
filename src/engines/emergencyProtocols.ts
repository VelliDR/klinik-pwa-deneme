/**
 * ACİL DURUM AKIŞ PROTOKOLLERİ (EMERGENCY CLINICAL PROTOCOLS)
 * 
 * 1. Anafilaksi Yönetimi & Tekrarlayan Adrenalin Sayacı (EAACI / Resuscitation Council Kılavuzları)
 * 2. Status Epilepticus Kademeli Yönetimi (AES - American Epilepsy Society Kılavuzu)
 */

export interface AnaphylaxisDoses {
  weightKg: number;
  isAdult: boolean;
  isWeightMissing?: boolean;
  isLocked?: boolean;
  lockReason?: string;
  isEstimated?: boolean;
  estimationWarning?: string;
  adrenaline: {
    doseMg: number;
    volumeMl: number;
    concentration: string;
    route: string;
    repeatIntervalMinutes: number;
    maxSingleDoseMg: number;
    instruction: string;
    warning: string;
  };
  fluidBolus: {
    fluidType: string;
    volumeMl: number;
    rate: string;
  };
  bronchospasm: {
    drug: string;
    dose: string;
  };
  antihistaminic: {
    drug: string;
    doseMg: number;
    maxDoseMg: number;
    route: string;
  };
  corticosteroid: {
    drug: string;
    doseMg: number;
    maxDoseMg: number;
    route: string;
  };
}

export interface StatusEpilepticusDoses {
  weightKg: number;
  isAdult: boolean;
  isWeightMissing?: boolean;
  isLocked?: boolean;
  lockReason?: string;
  isEstimated?: boolean;
  estimationWarning?: string;
  phase1Stabilization: {
    timeRange: string;
    title: string;
    actions: string[];
    glucoseDextrose: {
      indication: string;
      doseText: string;
    };
  };
  phase2EarlyStatus: {
    timeRange: string;
    title: string;
    midazolam: {
      doseMg: number;
      route: string;
      instruction: string;
    };
    diazepam: {
      doseMg: number;
      route: string;
      instruction: string;
    };
  };
  phase3EstablishedStatus: {
    timeRange: string;
    title: string;
    levetiracetam: {
      doseMg: number;
      infusionTime: string;
      instruction: string;
    };
    phenytoin: {
      doseMg: number;
      rateWarning: string;
      instruction: string;
    };
    valproate: {
      doseMg: number;
      infusionTime: string;
      instruction: string;
    };
  };
  phase4Refractory: {
    timeRange: string;
    title: string;
    actions: string[];
  };
}

/**
 * Anafilaksi Protokolü Doz Hesaplayıcı
 * Kılavuz: EAACI / Resuscitation Council UK / World Allergy Organization (WAO)
 * 
 * Adrenalin İM (1:1000 = 1 mg/mL):
 * - Doz: 0.01 mg/kg (0.01 mL/kg)
 * - Çocuk tek doz maks: 0.30 mg (0.30 mL)
 * - Erişkin tek doz maks: 0.50 mg (0.50 mL)
 * - Uygulama Yeri: Uyluk anterolateral orta 1/3 (Vastus lateralis) İM.
 * - ASLA periferik damardan hızlı IV bolus uygulanmaz!
 */
export function calculateAnaphylaxisDoses(weightKg: number, isAdult: boolean = false, isEstimated: boolean = false): AnaphylaxisDoses {
  const isMissing = isNaN(weightKg) || weightKg <= 0;
  
  // Kilo girilmemiş ve tahmini kilo uygulanmamışsa -> KİLİTLE (Sessiz 70 kg varsayılanı kaldırıldı)
  if (isMissing && !isEstimated) {
    return {
      weightKg: 0,
      isAdult,
      isWeightMissing: true,
      isLocked: true,
      lockReason: '⚠️ HASTA KİLOSU GİRİLMEDİ: Doz hesabı için kilo girilmeli veya tahmini kilo uygulanmalıdır.',
      adrenaline: {
        doseMg: 0,
        volumeMl: 0,
        concentration: '1:1000 (1 mg/mL) Ampul',
        route: 'İM (İntramüsküler) - Anterolateral Uyluk Orta 1/3',
        repeatIntervalMinutes: 5,
        maxSingleDoseMg: isAdult ? 0.50 : 0.30,
        instruction: `KİLO GİRİNİZ: 0.01 mg/kg (0.01 mL/kg) İM (Maks tek doz: ${isAdult ? '0.50' : '0.30'} mg).`,
        warning: '⚠️ DİKKAT: Kilo girilmediğinden mutlak doz hesaplanmamıştır. Adrenalin 1:1000 formu doğrudan IV puşe YAPILMAZ.'
      },
      fluidBolus: {
        fluidType: '%0.9 NaCl (İzotonik SF)',
        volumeMl: 0,
        rate: isAdult ? 'KİLO GİRİNİZ: 20 mL/kg SF (Erişkin maks 1000 mL)' : 'KİLO GİRİNİZ: 20 mL/kg SF (Çocuk maks 500 mL)'
      },
      bronchospasm: {
        drug: 'Salbutamol Nebül',
        dose: isAdult ? '5.0 mg (2 ampul nebül) oksijen ile' : 'KİLO GİRİNİZ: <20 kg 2.5 mg, ≥20 kg 5.0 mg nebül'
      },
      antihistaminic: {
        drug: 'Feniramin Maleat (Avil)',
        doseMg: 0,
        maxDoseMg: 50,
        route: 'KİLO GİRİNİZ: 1 mg/kg (maks 50 mg) Yavaş IV veya İM'
      },
      corticosteroid: {
        drug: 'Metilprednizolon (Prednol)',
        doseMg: 0,
        maxDoseMg: 80,
        route: 'KİLO GİRİNİZ: 1-2 mg/kg (maks 80 mg) Yavaş IV puşe'
      }
    };
  }

  // Kilo var veya hekim tarafından tahmini kilo onaylandı:
  const safeWeight = isMissing ? (isAdult ? 70 : 15) : weightKg;
  const maxAdrenaline = isAdult ? 0.50 : 0.30;
  
  // 0.01 mg/kg (min 0.05 mg/mL, max 0.3/0.5 mg/mL)
  let calculatedAdrenaline = safeWeight * 0.01;
  if (calculatedAdrenaline < 0.05) calculatedAdrenaline = 0.05;
  if (calculatedAdrenaline > maxAdrenaline) calculatedAdrenaline = maxAdrenaline;
  const adrMg = Math.round(calculatedAdrenaline * 100) / 100;

  // Sıvı Bolusu: 20 mL/kg SF (Erişkin maks 1000-2000 mL)
  const fluidVol = Math.min(Math.round(safeWeight * 20), isAdult ? 1000 : 500);

  // Feniramin: 1 mg/kg (maks 50 mg)
  const feniraminMg = Math.min(Math.round(safeWeight * 1.0), 50);

  // Metilprednizolon: 1 - 2 mg/kg (maks 80 mg)
  const prednolMg = Math.min(Math.round(safeWeight * 1.5), 80);

  return {
    weightKg: safeWeight,
    isAdult,
    isWeightMissing: false,
    isLocked: false,
    isEstimated,
    estimationWarning: isEstimated ? '⚠️ KİLO GİRİLMEDİ — DOZLAR VARSAYILAN KİLOYA GÖRE TAHMİNİDİR' : undefined,
    adrenaline: {
      doseMg: adrMg,
      volumeMl: adrMg, // 1:1000 ampulde 1 mg = 1 mL olduğu için mg = mL'dir
      concentration: '1:1000 (1 mg/mL) Ampul',
      route: 'İM (İntramüsküler) - Anterolateral Uyluk Orta 1/3',
      repeatIntervalMinutes: 5,
      maxSingleDoseMg: maxAdrenaline,
      instruction: `${adrMg} mL (${adrMg} mg) sulandırmadan direkt İM uygulayınız.${isEstimated ? ' (Tahmini Kilo)' : ''}`,
      warning: '⚠️ DİKKAT: Adrenalin 1:1000 formu doğrudan IV puşe YAPILMAZ (Ölümcül ventriküler aritmi ve hipertansif kriz riski). Yanıt yoksa 5 dakika sonra İM tekrar ediniz.'
    },
    fluidBolus: {
      fluidType: '%0.9 NaCl (İzotonik SF)',
      volumeMl: fluidVol,
      rate: isAdult ? 'İlk 10-15 dakikada hızlı serbest infüzyon' : 'İlk 10-20 dakikada puşe / basınçlı torba ile'
    },
    bronchospasm: {
      drug: 'Salbutamol Nebül',
      dose: isAdult ? '5.0 mg (2 ampul nebül) oksijen ile' : (safeWeight < 20 ? '2.5 mg (1 ampul nebül)' : '5.0 mg nebül')
    },
    antihistaminic: {
      drug: 'Feniramin Maleat (Avil)',
      doseMg: feniraminMg,
      maxDoseMg: 50,
      route: 'Yavaş IV (3-5 dakikada) veya İM'
    },
    corticosteroid: {
      drug: 'Metilprednizolon (Prednol)',
      doseMg: prednolMg,
      maxDoseMg: 80,
      route: 'Yavaş IV puşe'
    }
  };
}

/**
 * Status Epilepticus Protokolü Doz Hesaplayıcı
 * Kılavuz: American Epilepsy Society (AES) Guidelines & Türk Nöroloji Derneği
 * 
 * Zaman Kademeleri:
 * - 0–5 dk: Stabilizasyon, Havayolu/O2, Kan Şekeri
 * - 5–20 dk: 1. Basamak Benzodiazepin (Midazolam İM / Diazepam IV)
 * - 20–40 dk: 2. Basamak Antiepileptik (Levetirasetam / Fenitoin / Valproat)
 * - 40+ dk: Refrakter Status (YBÜ, Entübasyon, İnfüzyon)
 */
export function calculateStatusEpilepticusDoses(weightKg: number, isAdult: boolean = false, isEstimated: boolean = false): StatusEpilepticusDoses {
  const isMissing = isNaN(weightKg) || weightKg <= 0;

  // Kilo girilmemiş ve tahmini kilo onaylanmamışsa -> KİLİTLE (Sessiz 70 kg varsayılanı kaldırıldı)
  if (isMissing && !isEstimated) {
    return {
      weightKg: 0,
      isAdult,
      isWeightMissing: true,
      isLocked: true,
      lockReason: '⚠️ HASTA KİLOSU GİRİLMEDİ: Doz hesabı için kilo girilmeli veya tahmini kilo uygulanmalıdır.',
      phase1Stabilization: {
        timeRange: '0–5. Dakika',
        title: 'Stabilizasyon & Acil Tanı (ABC)',
        actions: [
          'Havayolunu koruyunuz, başı yana çeviriniz (aspirasyon profilaksisi).',
          'Yüksek akımlı %100 O2 başlayınız (geri solumasız rezervuarlı maske).',
          'Kapiller kan şekerini (KŞ) derhal ölçünüz.',
          'Damaryolu açınız (açılamıyorsa 5. dakikada İM Midazolam hazırlayınız).'
        ],
        glucoseDextrose: {
          indication: 'Hipoglisemi saptanırsa (KŞ < 60 mg/dL)',
          doseText: isAdult
            ? 'KİLO GİRİNİZ: Kan Şekeri < 60 mg/dL ise: %20 Dekstroz 100 mL veya %50 Dekstroz 50 mL IV puşe'
            : 'KİLO GİRİNİZ: Kan Şekeri < 60 mg/dL ise: %10 Dekstroz 2-5 mL/kg IV yavaş puşe'
        }
      },
      phase2EarlyStatus: {
        timeRange: '5–20. Dakika',
        title: '1. Basamak: Erken Status (Benzodiazepinler)',
        midazolam: {
          doseMg: 0,
          route: 'İM (İntramüsküler) veya Bukkal',
          instruction: 'KİLO GİRİNİZ: 0.2 mg/kg İM (Damaryolu yoksa birinci tercihtir; tek doz maks 10 mg; 5 mg/mL flakondan hesaplanır).'
        },
        diazepam: {
          doseMg: 0,
          route: 'Yavaş IV veya Rektal',
          instruction: 'KİLO GİRİNİZ: 0.2–0.3 mg/kg IV (2-5 mg/dk hızında; tek doz maks 10 mg; 10 mg/2 mL ampul).'
        }
      },
      phase3EstablishedStatus: {
        timeRange: '20–40. Dakika',
        title: '2. Basamak: Yerleşik Status (İkinci Sıra Antiepileptikler)',
        levetiracetam: {
          doseMg: 0,
          infusionTime: '10–15 dakika IV infüzyon',
          instruction: 'KİLO GİRİNİZ: Levetirasetam (Keppra): 60 mg/kg IV (maks 4500 mg; 100 mL SF içinde 10-15 dakikada).'
        },
        phenytoin: {
          doseMg: 0,
          rateWarning: isAdult
            ? 'Hız ≤ 50 mg/dk (Kardiyak monitörizasyon ve EKG takibi şarttır; hipotansiyon/asistoli riski)'
            : 'Hız: 1–3 mg/kg/dk (maks 50 mg/dk) — Kardiyak monitörizasyon ve EKG takibi şarttır',
          instruction: 'KİLO GİRİNİZ: Fenitoin (Epanutin): 20 mg/kg IV (maks 1500 mg; YALNIZCA %0.9 SF içinde sulandırılır; dekstrozda çöker!).'
        },
        valproate: {
          doseMg: 0,
          infusionTime: '10 dakika IV infüzyon',
          instruction: 'KİLO GİRİNİZ: Sodyum Valproat (Depakin): 40 mg/kg IV (maks 3000 mg; 100 mL SF içinde 10 dakikada infüzyon).'
        }
      },
      phase4Refractory: {
        timeRange: '40+ Dakika',
        title: '3. Basamak: Refrakter Status (Yoğun Bakım & Anestezi)',
        actions: [
          'Hasta YBÜ (Yoğun Bakım Ünitesi) devri ve acil entübasyon için hazırlanmalıdır.',
          'Sürekli infüzyon ajanları (Midazolam infüzyonu veya Propofol infüzyonu) başlanmalıdır.',
          'Sürekli EEG monitörizasyonu ile burst-supresyon takibi planlanmalıdır.'
        ]
      }
    };
  }

  const safeWeight = isMissing ? (isAdult ? 70 : 15) : weightKg;

  // 1. Basamak:
  // Midazolam İM/bukkal: 0.2 mg/kg, tek doz maks 10 mg
  const midazolamDose = Math.min(Math.round(safeWeight * 0.2 * 10) / 10, 10);
  // Diazepam IV/rektal: 0.2 - 0.3 mg/kg, tek doz maks 10 mg
  const diazepamDose = Math.min(Math.round(safeWeight * 0.25 * 10) / 10, 10);

  // 2. Basamak:
  // Levetirasetam (Keppra): 60 mg/kg, maks 4500 mg
  const keppraDose = Math.min(Math.round(safeWeight * 60), 4500);
  // Fenitoin (Epanutin): 20 mg/kg, maks 1500 mg
  const phenytoinDose = Math.min(Math.round(safeWeight * 20), 1500);
  // Valproat (Depakin): 40 mg/kg, maks 3000 mg
  const valproateDose = Math.min(Math.round(safeWeight * 40), 3000);

  // Glukoz:
  const glucoseText = isAdult
    ? 'Kan Şekeri < 60 mg/dL ise: %20 Dekstroz 100 mL veya %50 Dekstroz 50 mL IV puşe'
    : `Kan Şekeri < 60 mg/dL ise: %10 Dekstroz ${Math.round(safeWeight * 2.5)} mL (2-5 mL/kg) IV yavaş puşe`;

  return {
    weightKg: safeWeight,
    isAdult,
    isWeightMissing: false,
    isLocked: false,
    isEstimated,
    estimationWarning: isEstimated ? '⚠️ KİLO GİRİLMEDİ — DOZLAR VARSAYILAN KİLOYA GÖRE TAHMİNİDİR' : undefined,
    phase1Stabilization: {
      timeRange: '0–5. Dakika',
      title: 'Stabilizasyon & Acil Tanı (ABC)',
      actions: [
        'Havayolunu koruyunuz, başı yana çeviriniz (aspirasyon profilaksisi).',
        'Yüksek akımlı %100 O2 başlayınız (geri solumasız rezervuarlı maske).',
        'Kapiller kan şekerini (KŞ) derhal ölçünüz.',
        'Damaryolu açınız (açılamıyorsa 5. dakikada İM Midazolam hazırlayınız).'
      ],
      glucoseDextrose: {
        indication: 'Hipoglisemi saptanırsa (KŞ < 60 mg/dL)',
        doseText: glucoseText
      }
    },
    phase2EarlyStatus: {
      timeRange: '5–20. Dakika',
      title: '1. Basamak: Erken Status (Benzodiazepinler)',
      midazolam: {
        doseMg: midazolamDose,
        route: 'İM (İntramüsküler) veya Bukkal',
        instruction: `Midazolam: ${midazolamDose} mg İM (Damaryolu yoksa birinci tercihtir; 5 mg/mL flakondan ${(midazolamDose / 5).toFixed(2)} mL).${isEstimated ? ' (Tahmini Kilo)' : ''}`
      },
      diazepam: {
        doseMg: diazepamDose,
        route: 'Yavaş IV veya Rektal',
        instruction: `Diazepam: ${diazepamDose} mg IV (2-5 mg/dk hızında yavaşça) veya Rektal tüp (10 mg/2 mL ampulden ${(diazepamDose / 5).toFixed(2)} mL).${isEstimated ? ' (Tahmini Kilo)' : ''}`
      }
    },
    phase3EstablishedStatus: {
      timeRange: '20–40. Dakika',
      title: '2. Basamak: Yerleşik Status (İkinci Sıra Antiepileptikler)',
      levetiracetam: {
        doseMg: keppraDose,
        infusionTime: '10–15 dakika IV infüzyon',
        instruction: `Levetirasetam (Keppra): ${keppraDose} mg IV (100 mL SF içinde 10-15 dakikada; hemodinamik açıdan en güvenli seçenektir).${isEstimated ? ' (Tahmini Kilo)' : ''}`
      },
      phenytoin: {
        doseMg: phenytoinDose,
        rateWarning: isAdult
          ? 'Hız ≤ 50 mg/dk (Kardiyak monitörizasyon ve EKG takibi şarttır; hipotansiyon/asistoli riski)'
          : `Hız: 1–3 mg/kg/dk (maks ${Math.min(Math.round(safeWeight * 3), 50)} mg/dk; üst sınır 50 mg/dk) — Kardiyak monitörizasyon ve EKG takibi şarttır`,
        instruction: `Fenitoin (Epanutin): ${phenytoinDose} mg IV (YALNIZCA %0.9 SF içinde sulandırılır; dekstrozda çöker!).${isEstimated ? ' (Tahmini Kilo)' : ''}`
      },
      valproate: {
        doseMg: valproateDose,
        infusionTime: '10 dakika IV infüzyon',
        instruction: `Sodyum Valproat (Depakin): ${valproateDose} mg IV (100 mL SF içinde 10 dakikada infüzyon).${isEstimated ? ' (Tahmini Kilo)' : ''}`
      }
    },
    phase4Refractory: {
      timeRange: '40+ Dakika',
      title: '3. Basamak: Refrakter Status (Yoğun Bakım & Anestezi)',
      actions: [
        'Hasta YBÜ (Yoğun Bakım Ünitesi) devri ve acil entübasyon için hazırlanmalıdır.',
        'Sürekli infüzyon ajanları (Midazolam infüzyonu veya Propofol infüzyonu) başlanmalıdır.',
        'Sürekli EEG monitörizasyonu ile burst-supresyon takibi planlanmalıdır.'
      ]
    }
  };
}

/**
 * Anafilaksi Protokolü Özeti (SOAP notuna eklenmek üzere metin formatı)
 */
export function formatAnaphylaxisSoapNote(doses: AnaphylaxisDoses, repeatsCount: number = 1): string {
  if (doses.isLocked) {
    return [
      `[ACİL ANAFİLAKSİ PROTOKOLÜ - UYARI: KİLO GİRİLMEDİ (DOZ FORMÜLÜ)]`,
      `- Adrenalin: 0.01 mg/kg İM (Uyluk orta 1/3) [${repeatsCount}. Doz] (Hasta kilosu girilmediğinden mutlak doz hesaplanmadı)`,
      `- Sıvı: 20 mL/kg SF`,
      `- İnhale Salbutamol: ${doses.bronchospasm.dose}`,
      `- Adjuvan İlaçlar: Feniramin (1 mg/kg, maks 50 mg) + Metilprednizolon (1-2 mg/kg, maks 80 mg) IV`,
      `- İzlem: Vital bulgular monitörize edildi; bifazik reaksiyon takibi planlandı.`
    ].join('\n');
  }

  const weightPrefix = doses.isEstimated
    ? `[ACİL ANAFİLAKSİ PROTOKOLÜ - Tahmini Ağırlık: ${doses.weightKg} kg (⚠️ TAHMİNİ DOZ)]`
    : `[ACİL ANAFİLAKSİ PROTOKOLÜ - Ağırlık: ${doses.weightKg} kg]`;

  return [
    weightPrefix,
    `- Uygulanan Adrenalin: ${doses.adrenaline.doseMg} mg (${doses.adrenaline.volumeMl} mL) 1:1000 İM (Uyluk orta 1/3) [${repeatsCount}. Doz]`,
    `- Sıvı Resüsitasyonu: ${doses.fluidBolus.volumeMl} mL ${doses.fluidBolus.fluidType} (${doses.fluidBolus.rate})`,
    `- İnhale Salbutamol: ${doses.bronchospasm.dose}`,
    `- Adjuvan İlaçlar: ${doses.antihistaminic.drug} ${doses.antihistaminic.doseMg} mg IV + ${doses.corticosteroid.drug} ${doses.corticosteroid.doseMg} mg IV`,
    `- İzlem: Vital bulgular (SpO2, TA, KAH) monitörize edildi; en az 6-8 saat bifazik reaksiyon takibi planlandı.`
  ].join('\n');
}

/**
 * Status Epilepticus Protokolü Özeti (SOAP notuna eklenmek üzere metin formatı)
 */
export function formatStatusEpilepticusSoapNote(doses: StatusEpilepticusDoses, elapsedMinutes: number): string {
  if (doses.isLocked) {
    return [
      `[STATUS EPİLEPTİCUS ACİL PROTOKOLÜ (AES) - UYARI: KİLO GİRİLMEDİ | Süre: ${elapsedMinutes} dk]`,
      `- Faz 1 (0-5 dk): Havayolu güvenliği sağlandı, %100 O2 başlandı, KŞ kontrol edildi.`,
      `- Faz 2 (1. Basamak Benzodiazepin): 0.2 mg/kg İM Midazolam veya 0.2-0.3 mg/kg IV Diazepam (Kilo girilmedi)`,
      `- Faz 3 (2. Basamak Antiepileptik): 60 mg/kg Levetirasetam / 20 mg/kg Fenitoin / 40 mg/kg Valproat (Kilo girilmedi)`,
      `- İzlem & Plan: Nöbet kontrolü, nörolojik değerlendirme ve gerekirse YBÜ / refrakter status hazırlığı.`
    ].join('\n');
  }

  const weightPrefix = doses.isEstimated
    ? `[STATUS EPİLEPTİCUS ACİL PROTOKOLÜ (AES) - Tahmini Ağırlık: ${doses.weightKg} kg (⚠️ TAHMİNİ DOZ) | Süre: ${elapsedMinutes} dk]`
    : `[STATUS EPİLEPTİCUS ACİL PROTOKOLÜ (AES) - Ağırlık: ${doses.weightKg} kg | Süre: ${elapsedMinutes} dk]`;

  return [
    weightPrefix,
    `- Faz 1 (0-5 dk): Havayolu güvenliği sağlandı, %100 O2 başlandı, KŞ kontrol edildi.`,
    `- Faz 2 (1. Basamak Benzodiazepin): ${doses.phase2EarlyStatus.midazolam.instruction}`,
    `- Faz 3 (2. Basamak Antiepileptik): ${doses.phase3EstablishedStatus.levetiracetam.instruction}`,
    `- İzlem & Plan: Nöbet kontrolü, nörolojik değerlendirme ve gerekirse YBÜ / refrakter status hazırlığı.`
  ].join('\n');
}
