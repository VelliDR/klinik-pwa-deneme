import { appState } from '../state';
import { expandDotPhrases } from './soapTemplates';

/**
 * HBYS / AHBS (Hastane & Aile Hekimliği Bilgi Yönetim Sistemleri) uyumluluğu için
 * metindeki tüm Unicode emojileri temizleyerek standart metin etiketlerine ([KRİTİK UYARI], [DİKKAT], [KİLİTLİ] vb.)
 * dönüştürür.
 */
export function sanitizeForHbys(text: string): string {
  if (!text) return '';
  return text
    .replace(/🛑/g, '[KRİTİK UYARI]')
    .replace(/🚨/g, '[KRİTİK UYARI]')
    .replace(/⚠️|⚠/g, '[DİKKAT]')
    .replace(/🔒/g, '[KİLİTLİ]')
    .replace(/⚡/g, '[ACİL]')
    .replace(/✓|✔/g, '[UYGUN]')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '');
}

export function generateSOAP(): string {
  const s: string[] = []; // Subjektif
  const o: string[] = []; // Objektif
  const a: string[] = []; // Değerlendirme
  const p: string[] = []; // Plan

  // --- SUBJEKTİF ---
  const ptParts: string[] = [];
  if (appState.biometry.ageFormatted && appState.biometry.ageFormatted !== '--') {
    ptParts.push(`Yaş: ${appState.biometry.ageFormatted}`);
  } else if (appState.biometry.ageYears !== null && appState.biometry.ageYears !== undefined) {
    ptParts.push(`Yaş: ${appState.biometry.ageYears} Yıl (${appState.biometry.ageMonths || 0} Ay)`);
  } else if (appState.biometry.ageMonths !== null && appState.biometry.ageMonths !== undefined) {
    ptParts.push(`Yaş: ${appState.biometry.ageMonths} Ay`);
  }
  if (appState.pediatrics && appState.pediatrics.correctedAge && appState.pediatrics.correctedAge.isPreterm) {
    ptParts.push(`Düzeltilmiş Yaş: ${appState.pediatrics.correctedAge.correctedMonths} Ay (${appState.pediatrics.correctedAge.gestationalWeeks} GH preterm)`);
  }
  if (appState.biometry.gender) {
    ptParts.push(`Cinsiyet: ${appState.biometry.gender === 'female' || appState.biometry.gender === 'F' ? 'Kadın' : 'Erkek'}`);
  }
  if (appState.biometry.weightKg) {
    ptParts.push(`Kilo: ${appState.biometry.weightKg} kg`);
  }
  if (appState.biometry.heightCm) {
    ptParts.push(`Boy: ${appState.biometry.heightCm} cm`);
  }

  if (ptParts.length > 0) {
    s.push(`Hasta Bilgileri: ${ptParts.join(', ')}.`);
  }

  const anamnez = (typeof document !== 'undefined') ? (document.getElementById('input-custom-notes') as HTMLInputElement | HTMLTextAreaElement | null)?.value : null;
  if (anamnez && anamnez.trim()) {
    const { expandedText } = expandDotPhrases(anamnez.trim());
    s.push(`Ana Şikayet / Öykü: ${expandedText}`);
  }

  // --- OBJEKTİF ---
  const bioParts: string[] = [];
  if (appState.biometry.bsa) bioParts.push(`BSA: ${appState.biometry.bsa} m²`);
  if (appState.biometry.egfr !== null && appState.biometry.egfr !== undefined) {
    const formulaTag = appState.biometry.egfrFormula ? ` [${appState.biometry.egfrFormula}]` : '';
    const absTag = appState.biometry.egfrAbsolute ? `, Mutlak GFR: ${appState.biometry.egfrAbsolute} mL/dk` : '';
    bioParts.push(`eGFR: ${appState.biometry.egfr} mL/dk/1.73m²${formulaTag}${absTag}`);
  }
  
  if (appState.pediatrics && appState.pediatrics.percentiles) {
    const perc = appState.pediatrics.percentiles;
    if (perc.weightPercentile !== null && perc.weightPercentile !== undefined) {
      bioParts.push(`Kilo/Yaş: %${perc.weightPercentile}${perc.weightZ !== null ? ' (Z: ' + perc.weightZ + ')' : ''}`);
    }
    if (perc.heightPercentile !== null && perc.heightPercentile !== undefined) {
      bioParts.push(`Boy/Yaş: %${perc.heightPercentile}${perc.heightZ !== null ? ' (Z: ' + perc.heightZ + ')' : ''}`);
    }
    if (perc.headCircumferencePercentile !== null && perc.headCircumferencePercentile !== undefined) {
      bioParts.push(`Baş Çevresi: %${perc.headCircumferencePercentile}${perc.headCircZ !== null ? ' (Z: ' + perc.headCircZ + ')' : ''}`);
    }
    if (perc.bmiPercentile !== null && perc.bmiPercentile !== undefined) {
      bioParts.push(`BKİ: ${perc.bmiValue || ''} kg/m² (%${perc.bmiPercentile}, ${perc.category || 'Normal'})`);
    }
  }
  if (appState.pediatrics && appState.pediatrics.targetHeight) {
    const th = appState.pediatrics.targetHeight;
    bioParts.push(`Hedef Boy (Tanner): ${th.targetHeightCm} cm (${th.targetRangeCm}, %${th.targetPercentile})`);
  }
  if (bioParts.length > 0) {
    o.push(`- Büyüme & Biyometri: ${bioParts.join(', ')}.`);
  }

  // Pediatrik Büyüme Hızı & Akut Malnütrisyon (WHO 2022/2023)
  if (appState.pediatrics?.growthVelocity?.isValid) {
    const gv = appState.pediatrics.growthVelocity;
    const falteringStr = gv.centileDropAnalysis?.isPathologicalFaltering ? ' [KRİTİK UYARI: Patolojik Büyüme Duraklaması]' : '';
    const malStr = gv.malnutritionAssessment ? ` (${gv.malnutritionAssessment.categoryText})` : '';
    o.push(`- Büyüme Hızı & Malnütrisyon: ${gv.gramsPerDay} g/gün (Beklenen: ${gv.expectedRange.minGramsPerDay}-${gv.expectedRange.maxGramsPerDay} g/gün, ${gv.velocityStatusText})${falteringStr}${malStr}.`);
  }

  // Kraniyal İzlem & Hidrosefali / Mikrosefali Tarama Kalkanı
  if (appState.pediatrics?.cranialScreening?.isValid) {
    const cs = appState.pediatrics.cranialScreening;
    const kibasStr = cs.kibasSignsDetected.length > 0 ? ` [KİBAS Bulguları: ${cs.kibasSignsDetected.join(', ')}]` : '';
    o.push(`- Kraniyal Baş Çevresi İzlemi: ${cs.headCircCm} cm (%${cs.percentile}, Z: ${cs.zScore}) -> ${cs.riskTitle}${kibasStr}.`);
  }

  // Pediatrik Demir / Anemi (TPHD & T.C. Sağlık Bakanlığı + Mentzer Kalkanı)
  if (appState.pediatrics && appState.pediatrics.iron && appState.pediatrics.iron.status === 'SUCCESS') {
    const ir = appState.pediatrics.iron;
    const anemiaDesc = ir.hbEvaluation?.text || ir.hbCategory || 'Normal';
    const mentzerDesc = ir.differential?.mentzerIndex !== null && ir.differential?.mentzerIndex !== undefined
      ? ` | Mentzer İndeksi: ${ir.differential.mentzerIndex}`
      : '';
    const treatDesc = ir.treatment?.text ? ` | Tedavi: ${ir.treatment.text}` : '';
    const prophDesc = ir.prophylaxis?.text ? ` | Profilaksi: ${ir.prophylaxis.text}` : '';
    o.push(`- Demir & Anemi Durumu: ${anemiaDesc}${mentzerDesc}${treatDesc}${prophDesc}.`);
  }

  // Triage / Vitals / Tansiyon
  if (appState.pediatrics && appState.pediatrics.bp) {
    const bp = appState.pediatrics.bp;
    o.push(`- Pediatrik Tansiyon (AAP 2017): ${bp.stage}${bp.thresholds ? ' [' + bp.thresholds + ']' : ''}`);
  }
  if (appState.medicine && appState.medicine.news2) {
    const news2 = appState.medicine.news2;
    o.push(`- Vital / Triyaj (NEWS2): Skor ${news2.score || 0} (${news2.risk || 'Düşük Risk'})`);
  }
  if (appState.pediatrics && appState.pediatrics.pews) {
    const pews = appState.pediatrics.pews;
    o.push(`- Vital / Triyaj (PEWS): Skor ${pews.score || 0} (${pews.risk || 'Düşük Risk'})`);
  }
  if (appState.pediatrics && appState.pediatrics.pgcs) {
    const pgcs = appState.pediatrics.pgcs;
    const vStr = pgcs.isEntubated ? '1T' : (pgcs.v ?? 5);
    o.push(`- pGCS (Pediatrik Glasgow Koma Skalası): Toplam ${pgcs.formattedScore || pgcs.total || 15} (E${pgcs.e || 4}V${vStr}M${pgcs.m || 6})${pgcs.interpretation ? ` — ${pgcs.interpretation}` : ''}`);
  } else if (appState.medicine && appState.medicine.gcs) {
    const gcs = appState.medicine.gcs;
    const vStr = gcs.isEntubated ? '1T' : (gcs.v ?? 5);
    o.push(`- GCS (Glasgow Koma Skalası): Toplam ${gcs.formattedScore || gcs.total || 15} (E${gcs.e || 4}V${vStr}M${gcs.m || 6})${gcs.interpretation ? ` — ${gcs.interpretation}` : ''}`);
  }

  // Kardiyoloji & EKG
  if (appState.other && appState.other.cardiac && appState.other.cardiac.status === 'OK') {
    const c = appState.other.cardiac;
    let cardStr = `- EKG & Kardiyak: Nabız: ${c.hr || '--'} bpm`;
    if (c.rrMs) cardStr += ` (RR: ${c.rrMs} ms)`;
    if (c.qt) cardStr += `, QT: ${c.qt} ms`;
    if (c.qrs) cardStr += `, QRS: ${c.qrs} ms`;
    
    cardStr += `, QTcB (Bazett): ${c.qtcBazett || '--'} ms, QTcF (Fridericia): ${c.qtcFridericia || '--'} ms`;
    if (c.qtcBogossian) cardStr += `, QTcBog (Bogossian): ${c.qtcBogossian} ms`;
    cardStr += ` [Yorum: ${c.interpretation || 'Normal'}]`;
    
    if (c.tisdaleScore > 0) cardStr += ` [Tisdale Skoru: ${c.tisdaleScore} - ${c.tisdaleRisk}]`;
    o.push(cardStr + '.');

    if (c.drugFlags && c.drugFlags.length > 0) {
      c.drugFlags.forEach((flag: string) => o.push(`  -> İlaç/EKG Uyarısı: ${flag}`));
    }
  }
  if (appState.other && appState.other.axis) {
    const ax = appState.other.axis;
    o.push(`- EKG Aksı: ${ax.degrees}° (${ax.axisCategory}).`);
  }

  // Kan Gazı
  if (appState.medicine && appState.medicine.bloodGas) {
    const bg = appState.medicine.bloodGas;
    let bgStr = `- Kan Gazı (ABG/VBG): pH: ${bg.pH || '--'}, pCO2: ${bg.pCO2 || '--'}, HCO3: ${bg.HCO3 || '--'}`;
    if (bg.primaryDisorder) {
      bgStr += ` -> Tanı: ${bg.primaryDisorder} ${bg.compensationText ? '(' + bg.compensationText + ')' : ''}`;
    }
    o.push(bgStr + '.');
  }

  // Elektrolitler & İyonlar (Sodyum & Kalsiyum)
  if (appState.medicine && appState.medicine.sodium) {
    const na = appState.medicine.sodium;
    o.push(`- Sodyum Düzeltme & Açık: Açık: ${na.deficit} mEq (3% NaCl: +${na.deltaNa3Percent} mEq/L, 0.9% NaCl: +${na.deltaNa09Percent} mEq/L)${na.warning ? ' [' + na.warning + ']' : ''}.`);
  }
  if (appState.medicine && appState.medicine.calcium) {
    const ca = appState.medicine.calcium;
    o.push(`- Düzeltilmiş Kalsiyum: ${ca.correctedCa} mg/dL (Ölçülen: ${ca.measuredCa} mg/dL)${ca.alertMsg ? ' [' + ca.alertMsg + ']' : ''}.`);
  }

  // İnfüzyon & GIR
  if (appState.medicine && appState.medicine.infusion) {
    const inf = appState.medicine.infusion;
    o.push(`- IV İnfüzyon Hızı: ${inf.rateMlHr} mL/saat (Konsantrasyon: ${inf.concentrationMgMl} mg/mL, ${inf.concentrationMcgMl} mcg/mL).`);
  }
  if (appState.medicine && appState.medicine.gir) {
    const g = appState.medicine.gir;
    o.push(`- Glukoz İnfüzyon Hızı (GIR): ${g.gir} mg/kg/dk (${g.interpretation}).`);
  }

  // Endokrin & Metabolizma
  if (appState.medicine && appState.medicine.homaIR) {
    const hm = appState.medicine.homaIR;
    o.push(`- HOMA-IR İnsülin Direnci: ${hm.homaIR} [${hm.tannerStage}, Eşik: ${hm.cutoff}] -> ${hm.isResistant ? 'İnsülin Direnci Pozitif' : 'Normal'}.`);
  }
  if (appState.medicine && appState.medicine.steroid) {
    const st = appState.medicine.steroid;
    o.push(`- Glukokortikoid Eşdeğerlik: ${st.sourceDrug} ${st.inputDoseMg} mg bazında hesaplandı.`);
  }

  // Akılcı Antibiyotik & Centor-McIsaac
  if (appState.pediatrics && appState.pediatrics.centor) {
    const ct = appState.pediatrics.centor;
    o.push(`- Centor / McIsaac Faranjit Skoru: ${ct.score} (GAS Riski: ${ct.riskPercent}). ${ct.recommendation}`);
  }

  // Cerrahi Skorlar
  if (appState.surgery && appState.surgery.alvarado && appState.surgery.alvarado.score > 0) {
    const alv = appState.surgery.alvarado;
    o.push(`- Cerrahi (Alvarado Apendisit Skoru): ${alv.score}/10 (${alv.risk || ''}).`);
  }
  if (appState.surgery && appState.surgery.ranson && appState.surgery.ranson.score > 0) {
    const rn = appState.surgery.ranson;
    o.push(`- Cerrahi (Ranson Akut Pankreatit Skoru): ${rn.score}/11 (0.s: ${rn.admissionScore}, 48.s: ${rn.hour48Score}) -> ${rn.severity} (~%${rn.mortalityPercent} Mortalite).`);
  }

  // Obstetrik & Jinekoloji
  if (appState.obgyn && appState.obgyn.eddData && appState.obgyn.eddData.edd) {
    const edd = appState.obgyn.eddData;
    o.push(`- Obstetrik: SAT'a göre Gebelik Haftası: ${edd.gestationalAge || '--'}, Tahmini Doğum Tarihi (TDT): ${edd.edd || '--'}.`);
  }
  if (appState.obgyn?.bishop?.score !== undefined) {
    const b = appState.obgyn.bishop;
    o.push(`- Bishop Doğum İndüksiyon Skoru: ${b.score}/13 (${b.interpretation}).`);
  }
  if (appState.obgyn?.preeclampsia && appState.obgyn.preeclampsia.diagnosis !== 'Normal') {
    const pe = appState.obgyn.preeclampsia;
    o.push(`- Preeklampsi Değerlendirmesi: ${pe.diagnosis}${pe.alert ? ' (' + pe.alert + ')' : ''}.`);
  }

  // Tromboemboli & Kardiyak Acil
  if (appState.thrombosis) {
    const th = appState.thrombosis;
    if (th.wellsDVT && th.wellsDVT.isValid) {
      o.push(`- Wells DVT Skoru: ${th.wellsDVT.score} Puan (${th.wellsDVT.riskCategory} - DVT İhtimali: ${th.wellsDVT.probability}).`);
    }
    if (th.wellsPTE && th.wellsPTE.isValid) {
      o.push(`- Wells PTE Skoru: ${th.wellsPTE.score} Puan (2-Seviyeli: ${th.wellsPTE.twoTierRisk.risk}, 3-Seviyeli: ${th.wellsPTE.threeTierRisk.risk}).`);
    }
    if (th.perc && th.perc.isValid) {
      o.push(`- PERC Dışlama Kuralı: Pozitif Kriter Sayısı: ${th.perc.positiveCount} (${th.perc.isPERCNegative ? 'PERC Negatif - PE Güvenle Dışlandı' : 'PERC Pozitif - İleri İnceleme Gerekli'}).`);
    }
    if (th.heart && th.heart.isValid) {
      o.push(`- HEART Skoru (Göğüs Ağrısı): ${th.heart.score}/10 (${th.heart.riskCategory} - 6-Haftalık MACE: %${th.heart.maceRatePercent}).`);
    }
    if (th.cha2ds2vasc && th.cha2ds2vasc.isValid) {
      o.push(`- CHA₂DS₂-VASc AF İnme Skoru: ${th.cha2ds2vasc.score} Puan (Yıllık İnme Riski: %${th.cha2ds2vasc.annualStrokeRiskPercent}).`);
    }
    if (th.hasbled && th.hasbled.isValid) {
      o.push(`- HAS-BLED Kanama Skoru: ${th.hasbled.score} Puan (${th.hasbled.bleedingRiskCategory}).`);
    }
  }

  // Nefroloji, Toksikoloji & Solunum
  if (appState.nephroTox) {
    const nt = appState.nephroTox;
    if (nt.fena && nt.fena.isValid) {
      o.push(`- FENa: %${nt.fena.fenaPercent} (${nt.fena.category})${nt.fena.isOnDiuretics ? ' [Hasta Diüretik Alıyor - FENa Yalancı Yüksek Olabilir]' : ''}.`);
    }
    if (nt.feurea && nt.feurea.isValid) {
      o.push(`- FEUrea (Diüretik Güvenli): %${nt.feurea.feUreaPercent} (${nt.feurea.category}).`);
    }
    if (nt.correctedSodium && nt.correctedSodium.isValid) {
      o.push(`- Düzeltilmiş Sodyum: Katz: ${nt.correctedSodium.correctedSodiumKatz} mEq/L, Hillier: ${nt.correctedSodium.correctedSodiumHillier} mEq/L (Ölçülen: ${nt.correctedSodium.measuredSodium}, Glukoz: ${nt.correctedSodium.glucose} mg/dL). ${nt.correctedSodium.interpretation}`);
    }
    if (nt.osmolalGap && nt.osmolalGap.isValid) {
      o.push(`- Osmolal Açık: ${nt.osmolalGap.osmolalGap} mOsm/kg (Ölçülen: ${nt.osmolalGap.measuredOsm}, Hesaplanan: ${nt.osmolalGap.calculatedOsm}) -> ${nt.osmolalGap.isCriticalGap ? '[KRİTİK UYARI] YÜKSEK (Toksik Alkol Zehirlenmesi)' : (nt.osmolalGap.isHighGap ? '[DİKKAT] YÜKSEK' : '[UYGUN] Normal')}.`);
    }
    if (nt.paracetamol && nt.paracetamol.isValid) {
      o.push(`- Parasetamol Düzeyi (Rumack-Matthew): ${nt.paracetamol.levelMcgMl} µg/mL (${nt.paracetamol.hoursPostIngestion}. saat, Eşik: ${nt.paracetamol.threshold} µg/mL${nt.paracetamol.isHighRisk ? ' - Yüksek Risk Nomogramı' : ''}) -> ${nt.paracetamol.isToxic ? '[KRİTİK UYARI] TOKSİK DÜZEY' : '[UYGUN] Tedavi Çizgisi Altında'}.`);
    }
    if (nt.curb65 && nt.curb65.isValid) {
      o.push(`- CURB-65 / CRB-65 Pnömoni Skoru: CURB-65: ${nt.curb65.score}/5, CRB-65: ${nt.curb65.crbScore}/4 (${nt.curb65.mortalityGroup} - 30-Günlük Mortalite: %${nt.curb65.mortalityPercent}).`);
    }
  }

  // Neonatoloji & Pediatrik Acil
  if (appState.neonatology) {
    const neo = appState.neonatology;
    if (neo.bhutani && neo.bhutani.isValid) {
      const gTag = neo.bhutani.guidelineLabel || (neo.bhutani.guidelineUsed === 'TND_2014' ? 'TND 2014' : 'AAP 2022');
      const mTag = neo.bhutani.measurementType || 'TSB';
      const escPart = neo.bhutani.escalationThreshold ? `, Bakım Eskalasyonu: ${neo.bhutani.escalationThreshold}` : '';
      let jStr = `- Hiperbilirubinemi (${gTag}): Yaş: ${neo.bhutani.ageHours}s, ${mTag}: ${neo.bhutani.totalBilirubin} mg/dL (Fototerapi Eşiği: ${neo.bhutani.phototherapyThreshold || '--'}${escPart}, Kan Değişimi: ${neo.bhutani.exchangeThreshold || '--'}) -> ${neo.bhutani.interpretation}`;
      if (neo.bhutani.requiresTsbConfirmation && neo.bhutani.tsbConfirmationReason) {
        jStr += ` [DİKKAT: TcB Doğrulama: ${neo.bhutani.tsbConfirmationReason}]`;
      }
      o.push(jStr);
    }
    if (neo.apgar) {
      o.push(`- APGAR Skoru (${neo.apgar.minute}. dk): ${neo.apgar.score}/10 (${neo.apgar.status}).`);
    }
    if (neo.westleyCroup) {
      o.push(`- Westley Krup Skoru: ${neo.westleyCroup.score}/17 (${neo.westleyCroup.severity} - ${neo.westleyCroup.interpretation}).`);
    }
    if (neo.cdsDehydration) {
      o.push(`- Klinik Dehidratasyon Skalası (CDS): ${neo.cdsDehydration.score}/8 (${neo.cdsDehydration.interpretation}).`);
    }
    if (neo.weightLoss && neo.weightLoss.isValid) {
      o.push(`- Yenidoğan Tartı Takibi: Doğum: ${neo.weightLoss.birthWeightG} g, Mevcut: ${neo.weightLoss.currentWeightG} g -> Tartı Değişimi: %${neo.weightLoss.percentLoss} (${neo.weightLoss.interpretation})`);
    }
  }

  // İlaç Güvenliği & DDI
  if (appState.safetyPrescription) {
    const sp = appState.safetyPrescription;
    if (sp.tripleWhammy && sp.tripleWhammy.isTripleWhammy) {
      o.push(`- [KRİTİK UYARI] İlaç Güvenliği: Triple Whammy AKI Riski Tespit Edildi (RAS Blokörü + Diüretik + NSAİİ).`);
    }
    if (sp.renalAdjustments && (sp.renalAdjustments.alertsCount ?? 0) > 0) {
      o.push(`- Renal Dozaj Uyarısı (${sp.renalAdjustments.egfr} mL/dk): ${sp.renalAdjustments.alertsCount} ilaçta doz kısıtlaması/kontrendikasyon mevcut.`);
    }
    if (sp.pregnancySafety && sp.pregnancySafety.alertsCount > 0) {
      o.push(`- Gebelik Güvenlik Uyarısı: ${sp.pregnancySafety.alertsCount} ilaçta fetal risk saptandı.`);
    }
    if (sp.neonatalDrugSafety && sp.neonatalDrugSafety.alertsCount > 0) {
      o.push(`- [KRİTİK UYARI] Yenidoğan İlaç Güvenliği: ${sp.neonatalDrugSafety.alertsCount} ilaçta kontrendikasyon/toksisite uyarısı mevcut (${sp.neonatalDrugSafety.alerts.map((a) => a.drugName).join(', ')}).`);
    }
    if (sp.serotoninSyndrome && sp.serotoninSyndrome.isHighRisk) {
      o.push(`- [KRİTİK UYARI] İlaç Güvenliği (Serotonin Toksisitesi): ${sp.serotoninSyndrome.title}. Tespit edilen: ${Object.values(sp.serotoninSyndrome.detectedDrugs).flat().join(', ')}.`);
    }
    if (sp.hyperkalemiaRisk && sp.hyperkalemiaRisk.isAtRisk) {
      o.push(`- [KRİTİK UYARI] İlaç Güvenliği (Hiperkalemi Kalkanı): ${sp.hyperkalemiaRisk.title}. Risk faktörleri: ${sp.hyperkalemiaRisk.riskFactorsIdentified.join(', ')}.`);
    }
    if (sp.cypStatinInteraction && sp.cypStatinInteraction.hasInteraction) {
      o.push(`- [KRİTİK UYARI] İlaç Güvenliği (CYP3A4 / Statin): ${sp.cypStatinInteraction.title}.`);
    }
  }

  // --- DEĞERLENDİRME ---
  if (appState.pediatrics?.growthVelocity?.malnutritionAssessment && appState.pediatrics.growthVelocity.malnutritionAssessment.category !== 'WELL_NOURISHED') {
    const ma = appState.pediatrics.growthVelocity.malnutritionAssessment;
    a.push(`- ${ma.categoryText.toUpperCase()}: ${ma.criteriaMet.join('; ')}.`);
  } else if (appState.pediatrics?.growthVelocity?.centileDropAnalysis?.isPathologicalFaltering) {
    a.push(`- Büyüme Duraklaması (Faltering Growth): ${appState.pediatrics.growthVelocity.centileDropAnalysis.falteringReason || 'Belirgin persentil kanal düşüşü saptandı'}.`);
  }
  if (appState.pediatrics?.cranialScreening && appState.pediatrics.cranialScreening.hydrocephalusRisk !== 'SAFE' && appState.pediatrics.cranialScreening.hydrocephalusRisk !== 'BENIGN_FAMILIAL') {
    const cs = appState.pediatrics.cranialScreening;
    a.push(`- KRANİYAL RİSK: ${cs.riskTitle}. ${cs.clinicalRecommendations[0] || ''}`);
  }
  if (appState.obgyn?.bishop && appState.obgyn.bishop.score >= 8) {
    a.push(`- Servikal Olgunlaşma: Yüksek Bishop Skoru (${appState.obgyn.bishop.score}/13) - Doğum indüksiyonu başarı şansı yüksek.`);
  } else if (appState.obgyn?.bishop && appState.obgyn.bishop.score <= 5) {
    a.push(`- Olgunlaşmamış Serviks (Bishop Skoru: ${appState.obgyn.bishop.score}/13): İndüksiyon öncesi servikal olgunlaştırma (prostaglandin/balon) gereklidir.`);
  }
  if (appState.obgyn?.preeclampsia && appState.obgyn.preeclampsia.diagnosis !== 'Normal') {
    a.push(`- Obstetrik Risk: ${appState.obgyn.preeclampsia.diagnosis}.`);
  }
  if (appState.pediatrics && appState.pediatrics.targetHeight && appState.pediatrics.targetHeight.deviationAlert) {
    a.push(`- ${appState.pediatrics.targetHeight.deviationAlert}`);
  }
  if (appState.pediatrics?.iron?.differential?.warningTitle) {
    const diff = appState.pediatrics.iron.differential;
    a.push(`- ${diff.warningTitle}: ${diff.warningText || ''}`);
  }
  if (appState.pediatrics && appState.pediatrics.bp && appState.pediatrics.bp.stage.includes('Hipertansiyon')) {
    a.push(`- Pediatrik Kan Basıncı Uyarısı: ${appState.pediatrics.bp.stage}. Doğrulayıcı ölçümler ve etiyolojik tarama önerilir.`);
  }
  if (appState.medicine && appState.medicine.gir && (appState.medicine.gir.status === 'LOW' || appState.medicine.gir.gir < 4)) {
    a.push(`- Neonatal Hipoglisemi Riski: Glukoz infüzyon hızı kritik düşük (${appState.medicine.gir.gir} mg/kg/dk).`);
  }
  if (appState.medicine && appState.medicine.homaIR && appState.medicine.homaIR.isResistant) {
    a.push(`- ${appState.medicine.homaIR.interpretation}`);
  }
  if (appState.pediatrics && appState.pediatrics.centor && appState.pediatrics.centor.score >= 4) {
    a.push(`- Akut Tonsillofaranjit: Yüksek Streptokok olasılığı (Centor Skoru: ${appState.pediatrics.centor.score}).`);
  }
  if (appState.surgery && appState.surgery.alvarado && appState.surgery.alvarado.score >= 7) {
    a.push(`- Yüksek Apendisit Olasılığı (Alvarado Skoru: ${appState.surgery.alvarado.score}/10). Cerrahi konsültasyonu önerilir.`);
  }
  if (appState.surgery && appState.surgery.ranson && appState.surgery.ranson.score >= 3) {
    const rn = appState.surgery.ranson;
    a.push(`- Akut Pankreatit Ciddiyet Uyarısı (Ranson Skoru: ${rn.score}/11 - ${rn.severity}, ~%${rn.mortalityPercent} Mortalite): ${rn.interpretation}`);
  }
  if (appState.other && appState.other.cardiac && appState.other.cardiac.colorCode === 'danger') {
    a.push(`- Kardiyak Uyarı: ${appState.other.cardiac.interpretation}`);
  }
  if (appState.medicine && appState.medicine.bloodGas && appState.medicine.bloodGas.primaryDisorder) {
    a.push(`- Asit-Baz Bozukluğu: ${appState.medicine.bloodGas.primaryDisorder}.`);
  }

  // Yeni Klinik Modül Değerlendirmeleri
  if (appState.thrombosis) {
    const th = appState.thrombosis;
    if (th.wellsDVT && th.wellsDVT.score >= 2) {
      a.push(`- Yüksek DVT Şüphesi: Wells Skoru ${th.wellsDVT.score} (Acil Kompresyon Doppler USG önerilir).`);
    }
    if (th.wellsPTE && th.wellsPTE.score > 4) {
      a.push(`- Yüksek Pulmoner Emboli Olasılığı: Wells PE Skoru ${th.wellsPTE.score} (Acil BT Pulmoner Anjiyografi endikedir).`);
    }
    if (th.heart && th.heart.score >= 7) {
      a.push(`- Yüksek Kardiyovasküler Olay Riski: HEART Skoru ${th.heart.score} (Erken invaziv koroner anjiyografi/yatış).`);
    }
    if (th.cha2ds2vasc && th.cha2ds2vasc.score >= 2) {
      a.push(`- Yüksek AF Tromboemboli Riski: CHA₂DS₂-VASc Skoru ${th.cha2ds2vasc.score} (Oral Antikoagülan - OAK Class I endikasyon).`);
    }
  }
  if (appState.nephroTox) {
    const nt = appState.nephroTox;
    if (nt.fena && nt.feurea) {
      if (nt.fena.isOnDiuretics && nt.fena.fenaPercent >= 1.0 && nt.feurea.feUreaPercent < 35.0) {
        a.push(`- Oligüri / Azotemi Değerlendirmesi: Diüretik etkisiyle FENa yalancı yüksek çıkmıştır; FEUrea <%35 Prerenal Hipoperfüzyonu doğrulamaktadır.`);
      } else if (nt.fena.fenaPercent < 1.0 && nt.feurea.feUreaPercent < 35.0) {
        a.push(`- Akut Böbrek Hasarı: Güçlü Prerenal Azotemi (Tübüler fonksiyonlar korunmuş, sıvı açığı/hipovolemi).`);
      } else if (nt.fena.fenaPercent > 2.0 && nt.feurea.feUreaPercent >= 35.0) {
        a.push(`- Akut Böbrek Hasarı: Güçlü İntrensek Renal Hasar / Akut Tübüler Nekroz (ATN).`);
      }
    } else if (nt.fena && nt.fena.fenaPercent < 1.0) {
      a.push(`- Prerenal Azotemi (FENa <%1): Böbrek hipoperfüzyonu/dehidratasyon.`);
    } else if (nt.fena && nt.fena.fenaPercent > 2.0) {
      a.push(`- İntrensek Renal Hasar (FENa >%2): Tübüler hasar / ATN.`);
    }

    if (nt.paracetamol && nt.paracetamol.isToxic) {
      a.push(`- Akut Parasetamol Hepatotoksisitesi: Serum düzeyi Rumack-Matthew tedavi çizgisinin üzerindedir (Karaciğer yetmezliği riski!).`);
    }
    if (nt.osmolalGap && nt.osmolalGap.isCriticalGap) {
      a.push(`- [KRİTİK UYARI] KRİTİK OSMOLAL AÇIK (${nt.osmolalGap.osmolalGap} mOsm/kg > 20): Toksik Alkol Zehirlenmesi (Metanol / Etilen Glikol / Propilen Glikol) kuşkusu!`);
    } else if (nt.osmolalGap && nt.osmolalGap.isHighGap) {
      a.push(`- Yüksek Osmolal Açık (${nt.osmolalGap.osmolalGap} mOsm/kg): Toksik alkol veya anyon açığı asidozu dışlanmalıdır.`);
    }
    if (nt.curb65 && nt.curb65.score >= 3) {
      a.push(`- Şiddetli Toplum Kökenli Pnömoni (CURB-65 Skoru: ${nt.curb65.score}/5): Yüksek mortalite riski (%${nt.curb65.mortalityPercent}), acil hastane/YBÜ yatışı.`);
    } else if (nt.curb65 && nt.curb65.score === 2) {
      a.push(`- Orta Risk Pnömoni (CURB-65 Skoru: 2/5): Kısa süreli hastane yatışı / gözlem endikedir.`);
    }
  }
  if (appState.neonatology) {
    const neo = appState.neonatology;
    if (neo.bhutani && neo.bhutani.status === 'EXCHANGE_TRANSFUSION_REQUIRED') {
      a.push(`- KRİTİK HİPERBİLİRUBİNEMİ: Acil Kan Değişimi (Exchange Transfusion) ve yoğun fototerapi endikasyonu!`);
    } else if (neo.bhutani && neo.bhutani.status === 'ESCALATION_OF_CARE') {
      a.push(`- [KRİTİK UYARI] BAKIM ESKALASYONU (AAP 2022): Kan değişimi eşiğine ≤2.0 mg/dL! Acil yoğun fototerapi, IV hidrasyon, IVIG değerlendirmesi ve YDYBÜ nakil hazırlığı gereklidir.`);
    } else if (neo.bhutani && neo.bhutani.status === 'PHOTOTHERAPY_REQUIRED') {
      const gTag = neo.bhutani.guidelineUsed === 'TND_2014' ? 'TND 2014' : 'AAP 2022';
      a.push(`- Yenidoğan Patolojik Sarılığı: ${gTag} fototerapi eşiği aşıldı, fototerapi başlanması gereklidir.`);
    }
    if (neo.westleyCroup && neo.westleyCroup.score >= 6) {
      a.push(`- Ciddi Krup / Yaklaşan Solunum Yetmezliği: Westley Skoru ${neo.westleyCroup.score} (Nebülize Epinefrin ve YBÜ gözlemi).`);
    }
    if (neo.weightLoss && (neo.weightLoss.status === 'EXCESSIVE_LOSS_CRITICAL' || (neo.weightLoss.percentLoss ?? 0) > 10)) {
      a.push(`- YENİDOĞAN AŞIRI TARTI KAYBI: Doğum tartısının %${neo.weightLoss.percentLoss}'i kaybedildi. Hipernatremik dehidratasyon riski!`);
    }
  }
  if (appState.safetyPrescription && appState.safetyPrescription.tripleWhammy && appState.safetyPrescription.tripleWhammy.isTripleWhammy) {
    a.push(`- İlaç Etkileşim Uyarısı: Triple Whammy kombinasyonu nedeniyle Akut Böbrek Hasarı riski çok yüksektir.`);
  }
  if (appState.safetyPrescription && appState.safetyPrescription.neonatalDrugSafety && appState.safetyPrescription.neonatalDrugSafety.hasContraindication) {
    a.push(`- YENİDOĞAN İLAÇ KONTRENDİKASYONU: Reçetelenen ilaçlarda fatal toksisite riski (Kernikterus/Gri Bebek Sendromu vb.) tespit edildi.`);
  }
  if (appState.safetyPrescription?.serotoninSyndrome?.isHighRisk) {
    const ss = appState.safetyPrescription.serotoninSyndrome;
    a.push(`- SEROTONİN SENDROMU TEHLİKESİ: ${ss.title} Hunter Kriterleri ile hasta (klonus, hiperrefleksi, terleme) acilen değerlendirilmelidir.`);
  }
  if (appState.safetyPrescription?.hyperkalemiaRisk?.isAtRisk) {
    const hk = appState.safetyPrescription.hyperkalemiaRisk;
    a.push(`- ÖLÜMCÜL HİPERKALEMİ RİSKİ: ${hk.title} Serum K+ düzeyi ve EKG acilen kontrol edilmelidir.`);
  }
  if (appState.safetyPrescription?.cypStatinInteraction?.hasInteraction) {
    const cs = appState.safetyPrescription.cypStatinInteraction;
    a.push(`- STATİN RABDOMİYOLİZ UYARISI: ${cs.title} Statin plazma konsantrasyonu toksik seviyelere çıkabilir.`);
  }
  if (appState.emergency?.anaphylaxis) {
    const an = appState.emergency.anaphylaxis;
    a.push(`- ACİL MÜDAHALE (ANAFİLAKSİ): Akut anafilaksi tablosu; ${an.administeredDoses}. doz Adrenalin İM ve acil resüsitasyon uygulandı.`);
  }
  if (appState.emergency?.statusEpilepticus) {
    const se = appState.emergency.statusEpilepticus;
    a.push(`- ACİL MÜDAHALE (STATUS EPİLEPTİCUS): ${se.elapsedMinutes} dakikadır süren epileptik nöbet; AES protokolü kademeleri uygulandı.`);
  }

  // --- PLAN & TEDAVİ ---
  let pCount = 1;
  if (appState.medicine && appState.medicine.gir && (appState.medicine.gir.status === 'LOW' || appState.medicine.gir.gir < 4)) {
    p.push(`${pCount}. Hipoglisemi Acil Protokolü: ${appState.medicine.gir.hypoglycemiaBolus.instructions}`);
    pCount++;
  }
  if (appState.surgery && appState.surgery.parkland && appState.surgery.parkland.totalVolume) {
    const pk = appState.surgery.parkland;
    const label = pk.formulaLabel || 'ATLS-10 / Parkland Yanık Sıvı Resüsitasyonu';
    const mult = pk.multiplierUsed ?? 2;
    const uo = pk.urineOutputTarget || '0.5 mL/kg/saat';
    const maintStr = pk.requiresDextroseMaintenance && pk.maintenanceHourlyMl
      ? ` + <30 kg Pediatrik Ek %5 Dekstrozlu İdame: ${pk.maintenanceDailyMl} mL/gün (${pk.maintenanceHourlyMl} mL/s)`
      : '';
    p.push(`${pCount}. ${label} (${mult} mL/kg/%TBSA RL): Toplam 24s RL: ${pk.totalVolume} mL (İlk 8s: ${pk.first8HrsRate} mL/s, Sonraki 16s: ${pk.next16HrsRate} mL/s; Hedef İdrar: ${uo})${maintStr}.`);
    pCount++;
  }
  if (appState.medicine && appState.medicine.fluid && appState.medicine.fluid.dailyVolume) {
    const fl = appState.medicine.fluid;
    if (fl.isNeonate) {
      p.push(`${pCount}. Yenidoğan İdame Sıvısı (TND Sıvı Kademesi - ${fl.dayTitle}): ${fl.dailyVolume} mL/gün (${fl.hourlyRate} mL/saat). ${fl.fluidTypeRecommendation}`);
    } else {
      p.push(`${pCount}. İdame Sıvısı (Holliday-Segar): ${fl.dailyVolume} mL/gün (${fl.hourlyRate} mL/saat).`);
    }
    pCount++;
  }
  if (appState.neonatology && appState.neonatology.weightLoss && appState.neonatology.weightLoss.isValid) {
    const wl = appState.neonatology.weightLoss;
    if (wl.recommendations && wl.recommendations.length > 0) {
      p.push(`${pCount}. Yenidoğan Tartı & Beslenme İzlemi: ${wl.recommendations[0]}`);
      pCount++;
    }
  }
  if (appState.pediatrics && appState.pediatrics.syrupDose) {
    const sy = appState.pediatrics.syrupDose;
    p.push(`${pCount}. Pediatrik Dozaj: ${sy.name || 'Şurup'}: ${sy.targetDoseMg || ''} mg tek doz (${sy.olcekText || ''}, ${sy.freq || ''}).`);
    pCount++;
  }
  if (appState.pediatrics && appState.pediatrics.iron && appState.pediatrics.iron.prophylaxis?.eligible) {
    const ir = appState.pediatrics.iron;
    const doseStr = ir.prophylaxis.text ? `${ir.prophylaxis.mgDay} mg/gün (${ir.prophylaxis.text})` : `${ir.prophylaxis.mgDay} mg/gün`;
    p.push(`${pCount}. Demir Takviyesi / Profilaksi: ${doseStr}`);
    pCount++;
  }
  if (appState.pediatrics && appState.pediatrics.centor && appState.pediatrics.centor.score >= 4) {
    p.push(`${pCount}. Akılcı Antibiyotik Protokolü: AGBHS şüphesi nedeniyle Amoksisilin 50 mg/kg/gün (2 dozda, 10 gün) veya Penisilin V değerlendiriniz.`);
    pCount++;
  }

  // Yeni Plan & Tedavi Adımları (Aşama 2)
  if (appState.nephroTox && appState.nephroTox.paracetamol && appState.nephroTox.paracetamol.isToxic && appState.nephroTox.paracetamol.nacProtocol) {
    const nac = appState.nephroTox.paracetamol.nacProtocol;
    p.push(`${pCount}. IV N-Asetilsistein (NAC) 21 Saatlik Protokolü${nac.isPediatricAdjusted ? ' (Pediatrik Sıvı Korumalı)' : ''}:`);
    p.push(`   - Faz 1 (Yükleme, 1. saat): ${nac.phase1.totalMg} mg (${nac.phase1.fluidD5W})`);
    p.push(`   - Faz 2 (4 saatlik infüzyon): ${nac.phase2.totalMg} mg (${nac.phase2.fluidD5W})`);
    p.push(`   - Faz 3 (16 saatlik infüzyon): ${nac.phase3.totalMg} mg (${nac.phase3.fluidD5W})`);
    p.push(`   - ${nac.oralAlternative}`);
    pCount++;
  }
  if (appState.nephroTox && appState.nephroTox.osmolalGap && appState.nephroTox.osmolalGap.isCriticalGap && appState.nephroTox.osmolalGap.antidoteAdvice) {
    const anti = appState.nephroTox.osmolalGap.antidoteAdvice;
    p.push(`${pCount}. Toksik Alkol Zehirlenmesi Acil Protokolü:`);
    p.push(`   - ${anti.fomepizol}`);
    p.push(`   - ${anti.etanolAlternative}`);
    p.push(`   - ${anti.dialysisCriteria}`);
    pCount++;
  }
  if (appState.nephroTox && appState.nephroTox.curb65 && appState.nephroTox.curb65.isValid) {
    p.push(`${pCount}. Pnömoni Tedavi Planı (CURB-65: ${appState.nephroTox.curb65.score}/5): ${appState.nephroTox.curb65.treatmentSetting}`);
    p.push(`   - ${appState.nephroTox.curb65.empiricAntibiotic}`);
    pCount++;
  }
  if (appState.neonatology && appState.neonatology.westleyCroup && appState.neonatology.westleyCroup.score >= 3) {
    p.push(`${pCount}. Krup Tedavisi: Tek doz Deksametazon 0.60 mg/kg oral/IM${appState.neonatology.westleyCroup.score >= 6 ? ' + Nebülize L-Epinefrin 0.5 mL/kg (1:1000, maks 5 mL)' : ''}.`);
    pCount++;
  }
  if (appState.neonatology && appState.neonatology.cdsDehydration && appState.neonatology.cdsDehydration.orsRecommendedMl) {
    p.push(`${pCount}. Dehidratasyon Sıvı Protokolü: ${appState.neonatology.cdsDehydration.orsRecommendedMl}`);
    pCount++;
  }
  if (appState.safetyPrescription && appState.safetyPrescription.tripleWhammy && appState.safetyPrescription.tripleWhammy.isTripleWhammy) {
    p.push(`${pCount}. İlaç Güvenliği Eylemi: NSAİİ kesilmeli, analjezi için Parasetamol tercih edilmeli ve böbrek fonksiyonları (kreatinin, K+) kontrol edilmelidir.`);
    pCount++;
  }
  if (appState.safetyPrescription?.serotoninSyndrome?.isHighRisk) {
    p.push(`${pCount}. Serotonin Sendromu Güvenlik Eylemi: MAOI/Linezolid veya serotonerjik opioid kombinasyonları derhal sonlandırılmalı; hastaya klonus, tremor ve hipertermi semptomları anlatılmalıdır.`);
    pCount++;
  }
  if (appState.safetyPrescription?.hyperkalemiaRisk?.isAtRisk) {
    p.push(`${pCount}. Hiperkalemi Güvenlik Eylemi: Serum potasyum ve böbrek fonksiyonları (kreatinin, eGFR) acil tetkik edilmeli; potasyum tutucu diüretik / Bactrim / NSAİİ kombinasyonu revize edilmelidir.`);
    pCount++;
  }
  if (appState.safetyPrescription?.cypStatinInteraction?.hasInteraction) {
    const cs = appState.safetyPrescription.cypStatinInteraction;
    p.push(`${pCount}. CYP3A4 / Statin Eylemi: ${cs.safeAlternatives.antibiotics[0]} veya ${cs.safeAlternatives.statins[0]} tercih edilmeli; tedavi boyunca statine geçici ara verilmelidir.`);
    pCount++;
  }
  if (appState.pediatrics?.growthVelocity?.malnutritionAssessment?.treatmentProtocol) {
    const tp = appState.pediatrics.growthVelocity.malnutritionAssessment.treatmentProtocol;
    p.push(`${pCount}. Beslenme & Malnütrisyon Protokolü (${tp.setting === 'INPATIENT' ? 'Yatarak Tedavi' : 'Ayaktan Tedavi'}):`);
    p.push(`   - Kalori Hedefi: ${tp.caloricTargetKcalKgDay}`);
    p.push(`   - Diyet: ${tp.dietRecommendation}`);
    if (tp.contraindications.length > 0) p.push(`   - [DİKKAT] Kontrendikasyon: ${tp.contraindications.join(' ')}`);
    p.push(`   - İzlem: ${tp.monitoringAdvice}`);
    pCount++;
  }
  if (appState.pediatrics?.cranialScreening?.isValid && appState.pediatrics.cranialScreening.urgencyLevel !== 'ROUTINE_FOLLOWUP') {
    const cs = appState.pediatrics.cranialScreening;
    p.push(`${pCount}. Kraniyal İleri İnceleme Planı (${cs.urgencyLevel === 'EMERGENCY_IMAGING' ? 'ACİL GÖRÜNTÜLEME' : 'PLANLI USG'}): ${cs.clinicalRecommendations.slice(0, 2).join(' ')}`);
    pCount++;
  }
  if (appState.pediatrics?.vaccines && appState.pediatrics.vaccines.length > 0) {
    p.push(`${pCount}. Planlı Aşı Takvimi: ${appState.pediatrics.vaccines.join(', ')}.`);
    pCount++;
  }
  if (appState.neonatology?.bhutani && appState.neonatology.bhutani.isValid) {
    const b = appState.neonatology.bhutani;
    if (b.status === 'EXCHANGE_TRANSFUSION_REQUIRED') {
      p.push(`${pCount}. Hiperbilirubinemi Acil Eylemi: Acil Kan Değişimi (Exchange Transfusion) hazırlığı yapınız, yoğun fototerapiye başlayınız ve YDYBÜ naklini sağlayınız.`);
      pCount++;
    } else if (b.status === 'ESCALATION_OF_CARE') {
      p.push(`${pCount}. Hiperbilirubinemi Bakım Eskalasyonu: Yoğun fototerapi, IV hidrasyon, TSB 2 saatte bir izlem, IVIG endikasyonunu değerlendiriniz.`);
      pCount++;
    } else if (b.status === 'PHOTOTHERAPY_REQUIRED') {
      p.push(`${pCount}. Hiperbilirubinemi Tedavi Planı: Yoğun fototerapi başlanması (4-6 saat sonra TSB kontrolü) ve hidrasyon/beslenme takibi.`);
      pCount++;
    } else if (b.followUpRecommendation) {
      p.push(`${pCount}. Hiperbilirubinemi İzlem Planı: ${b.followUpRecommendation}`);
      pCount++;
    }
  }
  if (appState.surgery?.suture) {
    const su = appState.surgery.suture;
    p.push(`${pCount}. Sütür Materyali & Alınma Planı: İplik: ${su.material} (${su.size}), Alınma: ${su.removalDays}.`);
    pCount++;
  }
  if (appState.obgyn?.preeclampsia && appState.obgyn.preeclampsia.diagnosis !== 'Normal') {
    p.push(`${pCount}. Preeklampsi Yönetim Planı: Yakın tansiyon takibi, idrar protein/kreatinin oranı, Magnezyum Sülfat ve acil doğum endikasyonu değerlendiriniz.`);
    pCount++;
  }
  if (appState.medicine?.infusion) {
    const inf = appState.medicine.infusion;
    p.push(`${pCount}. IV İnfüzyon Tedavisi: ${inf.rateMlHr} mL/saat infüzyon pompası ile (Konsantrasyon: ${inf.concentrationMgMl} mg/mL).`);
    pCount++;
  }
  if (appState.treatment && appState.treatment.selectedDrugs && appState.treatment.selectedDrugs.length > 0) {
    const drugsStr = appState.treatment.selectedDrugs.map((d) => d.brand || d.generic).join(', ');
    p.push(`${pCount}. Reçete / Tedavi Protokolü: ${drugsStr}.`);
    pCount++;
  }
  if (appState.emergency?.anaphylaxis?.doses) {
    const ad = appState.emergency.anaphylaxis.doses;
    p.push(`${pCount}. Anafilaksi Acil Planı: ${ad.adrenaline.instruction} | Sıvı Bolusu: ${ad.fluidBolus.volumeMl} mL ${ad.fluidBolus.fluidType} (${ad.fluidBolus.rate}) | Adjuvan: ${ad.antihistaminic.drug} (${ad.antihistaminic.doseMg} mg) + ${ad.corticosteroid.drug} (${ad.corticosteroid.doseMg} mg). En az 6-8 saat gözlem.`);
    pCount++;
  }
  if (appState.emergency?.statusEpilepticus?.doses) {
    const sd = appState.emergency.statusEpilepticus.doses;
    p.push(`${pCount}. Status Epilepticus Planı: 1. Basamak: ${sd.phase2EarlyStatus.midazolam.instruction} | 2. Basamak: ${sd.phase3EstablishedStatus.levetiracetam.instruction}`);
    pCount++;
  }

  let soapText = `[S] SUBJEKTİF:\n${s.length > 0 ? s.join('\n') : 'Girilen veri yok.'}\n\n`;
  soapText += `[O] OBJEKTİF:\n${o.length > 0 ? o.join('\n') : 'Girilen veri yok.'}\n\n`;
  soapText += `[A] DEĞERLENDİRME:\n${a.length > 0 ? a.join('\n') : 'Özel değerlendirme yok.'}\n\n`;
  soapText += `[P] PLAN & TEDAVİ:\n${p.length > 0 ? p.join('\n') : 'Özel plan girilmemiş.'}`;

  return sanitizeForHbys(soapText);
}
