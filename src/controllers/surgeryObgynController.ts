/**
 * GENEL CERRAHİ, SINIFLANDIRMA, YANIK VE KADIN DOĞUM KART DENETLEYİCİSİ
 * (SURGERY, CLASSIFICATION, BURN & OBGYN CONTROLLER)
 *
 * 10 Klinik Başlık ve 30 Kanıta Dayalı Cerrahi Sınıflandırma / Skorlama Sistemi:
 * 1. Akut Apandisit: Alvarado (1986 & McKay 2007 BT), AIR (2008 / 2012 Erratum / 2021 STRAPPSCORE), AAS (2014) & 3'lü Karşılaştırma
 * 2. Akut Kolesistit & Safra Yolu: Tokyo Kılavuzu (TG18 vs TG13), Parkland Kolesistit Ölçeği (PGS), Strasberg-Bismuth BDI (1995/2021)
 * 3. Akut Pankreatit: Revize Atlanta (2012) & Modifiye Marshall, BISAP (2008), mCTSI (2004 vs Balthazar 1990), Ranson (0 & 48.s)
 * 4. Akut Kolonik Divertikülit: Kaiser Modifiye Hinchey (2005) vs WSES (2020) vs Ambrosetti (2002) 3'lü BT Matrisi
 * 5. Karın Duvarı & Kasık Fıtıkları: EHS Kasık (2007) vs Nyhus (1991), EHS Primer & İnsizyonel Ventral (2009) & Loss of Domain
 * 6. Hemoroidal Hastalık: Goligher (1980/2024) vs BPRST (2020) vs PNR-Bleed & HSS (2020) 3'lü Karşılaştırma
 * 7. Perianal Fistül ve Apse: Parks (1976) vs St. James's MRG (2000) vs Garg (2017/2020) Fistülotomi Uygunluk Motoru
 * 8. Kolorektal Kanser & Malign Polipler: AJCC/UICC 8. Baskı TNM (Sağkalım Paradoksu), Haggitt (1985), Kikuchi (1995) & <1000 µm
 * 9. Solid Organ Travmaları: AAST (2018 vs 1994) Dalak/Karaciğer OIS & WSES (2017/2020) Entegre Travma Sınıfı
 * 10. Cerrahi Komplikasyon & Perioperatif Risk: Clavien-Dindo (2004), Kümülatif CCI® (2013), ASA-PS (13 Aralık 2020)
 * 11. Yanık Sıvı Resüsitasyonu (ATLS-10 / Elektrik / Klasik Parkland), Sütür Rehberi ve Obstetrik/Jinekoloji (OB/GYN)
 */

import { appState } from '../state';
import type { PatientAgeResult } from './biometryController';
import { renderClinicalCardResult } from './biometryController';
import {
    calculateAlvarado,
    calculateAIRScore,
    calculateAAS,
    compareAppendicitisSystems,
    calculateTokyoCholecystitis,
    calculateParklandCholecystitis,
    classifyStrasbergBismuth,
    calculateRanson,
    calculateAtlantaMarshall,
    calculateBISAP,
    calculateModifiedCTSI,
    evaluateDiverticulitisTriad,
    classifyGroinHernia,
    classifyVentralHernia,
    evaluateHemorrhoidTriad,
    evaluatePerianalFistulaTriad,
    calculateColorectalTNM,
    evaluateMalignantPolyp,
    evaluateSolidOrganTrauma,
    calculateClavienDindoCCI,
    evaluateASAPhysicalStatus,
    SURGERY_DISCREPANCY_NOTES,
    calculateParkland,
    getSutureGuidance,
    type AlvaradoCutoffMode,
    type AIRCutoffMode,
    type AIRReboundGrade,
    type AASGuardingGrade,
    type AASSymptomDuration,
    type TokyoGuidelineVersion,
    type ParklandCholecystitisGrade,
    type StrasbergType,
    type BDIDetectionTiming,
    type StrasbergConfluenceCutoffMode,
    type RansonEtiology,
    type MarshallCreatinineBoundaryMode,
    type OrganFailureDuration,
    type MctsiInflammationPoints,
    type MctsiNecrosisPoints,
    type MctsiExtrapancreaticPoints,
    type MctsiNecrosisCutoffMode,
    type EHSDefectSize,
    type EHSW3CutoffMode,
    type IncisionalMedialZone,
    type IncisionalLateralZone,
    type PrimaryVentralLocation,
    type PNRGrade,
    type SphincterInvolvementLevel,
    type TNMStagingPrefix,
    type ColorectalTCategory,
    type ColorectalNCategory,
    type ColorectalMCategory,
    type ColorectalTumorSite,
    type KikuchiSm2ApproachMode,
    type HaggittLevel,
    type KikuchiLevel,
    type SolidOrganType,
    type AASTGrade,
    type AASTVersionMode,
    type ASAPhysicalStatusClass,
    type BurnProtocolType
} from '../engines/surgeryEngine';
import {
    calculateObstetrics,
    calculateBishop,
    calculatePreeclampsia
} from '../engines/obgynEngine';
import { getEl, getVal, getNum, getChk, escapeHtml } from '../utils/domUtils';
import { getSvgIcon, replaceEmojisWithSvg } from '../utils/icons';

export type SurgeryTabId =
    | 'appendicitis'
    | 'biliary'
    | 'pancreatitis'
    | 'diverticulitis'
    | 'hernia'
    | 'hemorrhoid'
    | 'fistula'
    | 'oncology'
    | 'trauma'
    | 'periop'
    | 'burn';

const SURGERY_TAB_PANEL_MAP: Record<SurgeryTabId, string> = {
    appendicitis: 'surg-panel-appendicitis',
    biliary: 'surg-panel-biliary',
    pancreatitis: 'surg-panel-pancreatitis',
    diverticulitis: 'surg-panel-diverticulitis',
    hernia: 'surg-panel-hernia',
    hemorrhoid: 'surg-panel-hemorrhoid',
    fistula: 'surg-panel-fistula',
    oncology: 'surg-panel-oncology',
    trauma: 'surg-panel-trauma',
    periop: 'surg-panel-periop',
    burn: 'surg-panel-burn'
};

/**
 * Genel Cerrahi iş istasyonu içindeki 11 klinik sekmeden birini etkinleştirir.
 */
export function activateSurgeryTab(tabId: SurgeryTabId | string): void {
    if (typeof document === 'undefined') return;
    const validTab: SurgeryTabId = (tabId in SURGERY_TAB_PANEL_MAP)
        ? (tabId as SurgeryTabId)
        : 'appendicitis';

    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn-surg');
    tabButtons.forEach(btn => {
        const isTarget = btn.getAttribute('data-surg-tab') === validTab;
        if (isTarget) {
            btn.classList.add('active', 'bg-sky-950/60', 'text-sky-200', 'border-sky-500/60', 'font-semibold');
            btn.classList.remove('bg-slate-800/80', 'text-slate-300', 'border-slate-700/70', 'font-medium');
        } else {
            btn.classList.remove('active', 'bg-sky-950/60', 'text-sky-200', 'border-sky-500/60', 'font-semibold');
            btn.classList.add('bg-slate-800/80', 'text-slate-300', 'border-slate-700/70', 'font-medium');
        }
    });

    (Object.keys(SURGERY_TAB_PANEL_MAP) as SurgeryTabId[]).forEach(key => {
        const panelEl = document.getElementById(SURGERY_TAB_PANEL_MAP[key]);
        if (panelEl) {
            if (key === validTab) {
                panelEl.classList.remove('hidden');
            } else {
                panelEl.classList.add('hidden');
            }
        }
    });
}

function bindCheckboxUserModified(id: string): HTMLInputElement | null {
    const el = getEl<HTMLInputElement>(id);
    if (el && !el.dataset.listenerBound) {
        el.dataset.listenerBound = 'true';
        el.addEventListener('change', () => {
            el.dataset.userModified = 'true';
        });
    }
    return el;
}

function renderSurgeryReferenceModalContent(): void {
    const bodyEl = getEl('container-surgery-reference-body');
    if (!bodyEl || bodyEl.dataset.rendered === 'true') return;
    bodyEl.dataset.rendered = 'true';

    const domainSummaryRows = [
        ['1. Akut Apandisit', 'Alvarado (1986), AIR (2008/2021), AAS (2014)', 'WSES 2020 Kudüs Kılavuzu', 'AIR CRP birimi mg/L (2012 Erratum); AIR 2021 STRAPPSCORE alt eşiği 0–3p; AAS 16–49y kadında RLQ +1p ve <24s/>24s CRP ağırlığı.'],
        ['2. Akut Kolesistit & BDI', 'Tokyo TG18/TG13, Parkland PGS (2018), Strasberg-Bismuth (1995)', 'TG18 & WSES BDI 2021', 'TG18 Derece III seçilmiş olguda erken LC; PGS ≥4 CVS başarısızlık ve bail-out (subtotal LC) alarmı; E1/E2 2 cm sınırı.'],
        ['3. Akut Pankreatit', 'Revize Atlanta (2012), Mod. Marshall, BISAP, mCTSI, Ranson', 'Revize Atlanta 2012 & ACG/IAP', 'Marshall kreatinin 134 µmol/L ve 3.6 mg/dL sınır çakışması; mCTSI ≤%30 vs <%30 nekroz ve çift sayı (0–10) kuralı; BISAP ≥3 yüksek risk.'],
        ['4. Akut Divertikülit', 'Kaiser Mod. Hinchey (2005), WSES (2020), Ambrosetti (2002)', 'WSES 2020 & ASCRS', 'WSES 1b/2a 4 cm apse drenaj sınırı; WSES 2b (>5 cm uzak hava) konservatif vs cerrahi; Hinchey III/IV Hartmann vs anastomoz.'],
        ['5. Karın Duvarı & Kasık Fıtığı', 'EHS Kasık (2007), Nyhus (1991), EHS Ventral (2009)', 'HerniaSurge 2023 & EHS', 'EHS L/M/F matrisinden Nyhus I–IVD türetimi; femoral fıtıkta TEP/TAPP zorunluluğu; W3 ≥10 cm vs >10 cm ve IHV/PV >%20 Loss of Domain.'],
        ['6. Hemoroidal Hastalık', 'Goligher (1980), BPRST (2020), PNR-Bleed & HSS (2020)', 'ESCP 2020 & ASCRS 2024', 'Goligher yalnız internal prolapsusu ölçer; BPRST S1/T1 ve PNR-Bleed B4/B5 (Hb <10/<7 g/dL) cerrahi/transfüzyon uyumsuzluğunu yakalar.'],
        ['7. Perianal Fistül ve Apse', 'Parks (1976), St. James\'s MRG (2000), Garg (2017/2020)', 'ASCRS 2022 & Garg 2020 (n=848)', 'Parks II ve SJUH 3–4 olguların %29–46\'sı ≤1/3 EAS tutulumlu olup Garg I–II (Basit) sınıftadır ve güvenle fistülotomi yapılabilir.'],
        ['8. Kolorektal Kanser & Polip', 'AJCC 8. Baskı TNM, Haggitt (1985), Kikuchi (1995)', 'AJCC 8th Ed., ESMO, ESGE', 'Evre IIC (T4bN0) sağkalımı Evre IIIA\'dan (T1–2N1) daha kötüdür; EMR\'lerin %88.1\'inde MP olmadığından <1000 µm mikrometrik eşik kullanılır.'],
        ['9. Solid Organ Travmaları', 'AAST Dalak & Karaciğer (2018 vs 1994), WSES (2017/2020)', 'AAST OIS 2018 & WSES', 'Dalakta kapsül içi aktif kanama IV / peritona V (hematom 5 cm); Karaciğerde parankim içi III / peritona IV (hematom 10 cm).'],
        ['10. Komplikasyon & ASA-PS', 'Clavien-Dindo (2004), CCI® (2013), ASA-PS (Aralık 2020)', 'Clavien/Slankamenac & ASA 2020', 'CCI® = √(ΣwC)/2 tüm komplikasyon yükünü (0–100) toplar; ASA 2020 erişkin/pediatrik/obstetrik örnekleri TG18 akış şemasına bağlanır.']
    ];

    const discrepancyCardsHtml = SURGERY_DISCREPANCY_NOTES.map(d => `
        <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div class="flex flex-wrap items-center justify-between gap-1.5">
                <span class="text-[0.75rem] font-bold text-amber-300">${escapeHtml(String(d.id))}. ${escapeHtml(d.title)}</span>
                <span class="text-[0.6875rem] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">${escapeHtml(d.domain)} • ${escapeHtml(d.systemName)}</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[0.75rem] pt-1">
                <div class="p-2 rounded bg-emerald-950/30 border border-emerald-800/50 text-emerald-200">
                    <strong class="text-emerald-300 block mb-0.5">Mod A (Varsayılan / Güncel Konsensüs):</strong>
                    ${escapeHtml(d.optionA)}
                </div>
                <div class="p-2 rounded bg-sky-950/30 border border-sky-800/50 text-sky-200">
                    <strong class="text-sky-300 block mb-0.5">Mod B (Klasik Yayın / Varyant Karşılaştırma):</strong>
                    ${escapeHtml(d.optionB)}
                </div>
            </div>
            <div class="text-[0.75rem] text-slate-300 leading-relaxed pt-0.5">
                <strong class="text-slate-100">Klinik Çözüm &amp; Motor Davranışı:</strong> ${escapeHtml(d.clinicalResolution)}
            </div>
            <div class="text-[0.6875rem] text-slate-400 font-mono">
                Kaynaklar: ${escapeHtml(d.primaryCitations)}
            </div>
        </div>
    `).join('');

    const tableRowsHtml = domainSummaryRows.map(r => `
        <tr class="hover:bg-slate-800/30">
            <td class="py-1.5 px-2 font-semibold text-sky-300 whitespace-nowrap">${escapeHtml(r[0])}</td>
            <td class="py-1.5 px-2 text-slate-200">${escapeHtml(r[1])}</td>
            <td class="py-1.5 px-2 text-emerald-300 whitespace-nowrap">${escapeHtml(r[2])}</td>
            <td class="py-1.5 px-2 text-slate-300">${escapeHtml(r[3])}</td>
        </tr>
    `).join('');

    bodyEl.innerHTML = `
        <div class="space-y-2">
            <h4 class="text-xs sm:text-sm font-bold text-sky-300 uppercase tracking-wide">Bölüm 1: 10 Klinik Başlık ve 30 Sınıflandırma / Skorlama Sistemi Özet Matrisi</h4>
            <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
                <table class="w-full text-[0.75rem] text-left border-collapse">
                    <thead>
                        <tr class="border-b border-slate-800 bg-slate-900/80 text-slate-300 font-semibold">
                            <th class="py-2 px-2">Klinik Alan</th>
                            <th class="py-2 px-2">Entegre Sistemler (30 Motor)</th>
                            <th class="py-2 px-2">Temel Kılavuz</th>
                            <th class="py-2 px-2">Kritik Klinik Karar &amp; Doğrulama Noktaları</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/70">
                        ${tableRowsHtml}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <h4 class="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wide">Bölüm 2: 8 Metodolojik Çelişki, Baskı Hatası (Erratum) ve Sınır Değeri Karşılaştırması</h4>
                <span class="text-[0.6875rem] text-slate-400">Her sistem kendi sekmesinde interaktif sürüm/eşik değiştiriciye sahiptir</span>
            </div>
            <div class="space-y-2.5">
                ${discrepancyCardsHtml}
            </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-[0.75rem] text-slate-300">
            <div class="font-bold text-slate-100">Bölüm 3: Birincil Akademik Kaynakça Özeti (45 Temel Referans)</div>
            <p class="leading-relaxed text-slate-400">
                <strong>Apandisit [1–7]:</strong> Alvarado A (Ann Emerg Med 1986), Ohle R (BMC Med 2011), Andersson M &amp; Andersson RE (World J Surg 2008; Erratum 2012), Andersson RE STRAPPSCORE (World J Surg 2021), Sammalkorpi HE (BMC Gastroenterol 2014), Di Saverio S WSES Jerusalem (World J Emerg Surg 2020). •
                <strong>Kolesistit &amp; Safra Yolu [8–12]:</strong> Yokoe M &amp; Okamoto K TG18 (J Hepatobiliary Pancreat Sci 2018), Madni TD Parkland PGS (JAMA Surg 2018; Surg Endosc 2019), Strasberg SM (J Am Coll Surg 1995), de'Angelis N WSES BDI (World J Emerg Surg 2021). •
                <strong>Pankreatit [13–17]:</strong> Banks PA Revised Atlanta &amp; Mod. Marshall (Gut 2013), Wu BU BISAP (Gut 2008), Gao W (PLoS One 2015), Mortele KJ mCTSI (AJR 2004), Ranson JH (Surg Gynecol Obstet 1974). •
                <strong>Divertikülit [18–20]:</strong> Kaiser AM (Am J Gastroenterol 2005), Sartelli M WSES (World J Emerg Surg 2020), Ambrosetti P (Dis Colon Rectum 2002). •
                <strong>Fıtık [21–24]:</strong> Miserez M EHS Groin (Hernia 2007), Muysoms FE EHS Ventral (Hernia 2009), Nyhus LM (Curr Probl Surg 1991), Stabilini C HerniaSurge (BJS Open 2023). •
                <strong>Proktoloji [25–33]:</strong> Goligher JC (1980), Sobrado CW BPRST (Ann Coloproctol 2020), Khan MA PNR-Bleed (Dis Colon Rectum 2020), Hawkins AT ASCRS (2024), van Tol RR ESCP (2020), Parks AG (Br J Surg 1976), Morris J SJUH MRG (Radiographics 2000), Garg P (Dis Colon Rectum 2017; World J Gastrointest Surg 2020). •
                <strong>Onkoloji [34–40]:</strong> Amin MB AJCC 8th Ed. (2017), Kim MJ Evre IIC Paradoksu (Medicine 2018), Haggitt RC (Gastroenterology 1985), Kikuchi R (Dis Colon Rectum 1995), Nascimbeni R (Dis Colon Rectum 2002), Pimentel-Nunes P ESGE (Endoscopy 2015/2017). •
                <strong>Travma &amp; Perioperatif [41–45]:</strong> Kozar RA AAST OIS (J Trauma Acute Care Surg 2018), Coccolini F WSES Spleen (2017) &amp; Liver (2020), Dindo D &amp; Clavien PA (Ann Surg 2004/2009), Slankamenac K CCI® (Ann Surg 2013), ASA House of Delegates ASA-PS (Dec 13, 2020).
            </p>
        </div>
    `;
}

function initSurgeryUiBindings(): void {
    if (typeof document === 'undefined') return;
    const tabsContainer = getEl('surgery-domain-tabs');
    if (tabsContainer && !tabsContainer.dataset.listenerBound) {
        tabsContainer.dataset.listenerBound = 'true';
        tabsContainer.addEventListener('click', (e) => {
            const target = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('.tab-btn-surg');
            if (!target) return;
            const tabId = target.getAttribute('data-surg-tab');
            if (tabId) {
                activateSurgeryTab(tabId);
            }
        });
    }

    const activePillsContainer = getEl('list-surgery-active-pills');
    if (activePillsContainer && !activePillsContainer.dataset.listenerBound) {
        activePillsContainer.dataset.listenerBound = 'true';
        activePillsContainer.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-jump-surg-tab]');
            if (!btn) return;
            const tabId = btn.getAttribute('data-jump-surg-tab');
            if (tabId) {
                activateSurgeryTab(tabId);
            }
        });
    }

    const btnToggleAcademic = getEl('btn-toggle-surgery-academic-mode');
    if (btnToggleAcademic && !btnToggleAcademic.dataset.listenerBound) {
        btnToggleAcademic.dataset.listenerBound = 'true';
        btnToggleAcademic.addEventListener('click', () => {
            const isActive = btnToggleAcademic.getAttribute('aria-pressed') === 'true';
            const nextState = !isActive;
            btnToggleAcademic.setAttribute('aria-pressed', nextState ? 'true' : 'false');
            const controls = document.querySelectorAll<HTMLElement>('#card-cerrahi .surg-academic-control');
            controls.forEach(el => el.classList.toggle('hidden', !nextState));
            if (nextState) {
                btnToggleAcademic.classList.add('bg-sky-950/75', 'border-sky-500/70', 'text-sky-200');
                btnToggleAcademic.classList.remove('bg-slate-800/90', 'border-slate-700', 'text-slate-300');
            } else {
                btnToggleAcademic.classList.remove('bg-sky-950/75', 'border-sky-500/70', 'text-sky-200');
                btnToggleAcademic.classList.add('bg-slate-800/90', 'border-slate-700', 'text-slate-300');
            }
        });
    }

    const btnOpenRef = getEl('btn-open-surgery-reference');
    const modalRef = getEl('modal-surgery-reference');
    const btnCloseRef = getEl('btn-close-surgery-reference');
    const btnCloseRefFooter = getEl('btn-close-surgery-reference-footer');

    if (btnOpenRef && modalRef && !btnOpenRef.dataset.listenerBound) {
        btnOpenRef.dataset.listenerBound = 'true';
        btnOpenRef.addEventListener('click', () => {
            renderSurgeryReferenceModalContent();
            modalRef.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        });
    }

    const closeModal = () => {
        if (modalRef) {
            modalRef.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    };

    if (btnCloseRef && !btnCloseRef.dataset.listenerBound) {
        btnCloseRef.dataset.listenerBound = 'true';
        btnCloseRef.addEventListener('click', closeModal);
    }
    if (btnCloseRefFooter && !btnCloseRefFooter.dataset.listenerBound) {
        btnCloseRefFooter.dataset.listenerBound = 'true';
        btnCloseRefFooter.addEventListener('click', closeModal);
    }
}

export function updateSurgeryObgynCard(ageData: PatientAgeResult): void {
    initSurgeryUiBindings();

    const y = ageData.y;
    const m = ageData.m;
    const totalMonths = (y === null && m === null) ? null : (m !== null ? m : (y !== null ? y * 12 : null));
    const gender = appState.biometry.gender ?? undefined;

    // =========================================================================
    // ORTAK CERRAHİ LABORATUVAR & GLOBAL VİTAL/BİYOMETRİ ÇAPRAZ SENKRONİZASYONU
    // =========================================================================
    const nTemp = getNum('input-temp');
    const nSysBp = getNum('input-sys-bp');
    const nHr = getNum('input-hr');
    const nRr = getNum('input-rr');
    const nCr = getNum('input-creatinine') ?? getNum('input-fena-s-cr');
    const nHb = getNum('input-hb');
    const avpuVal = getVal('input-avpu');
    const gcsTotal = appState.medicine.gcs?.total ?? null;
    const isAlteredMental = (avpuVal !== '' && avpuVal !== 'A') || (gcsTotal !== null && gcsTotal < 15);

    // Kan gazı motorundan PaO2, FiO2, pH, PaCO2
    const bgPo2 = getNum('input-bg-po2');
    const bgFio2 = getNum('input-bg-fio2');
    const bgPh = getNum('input-bg-ph');
    const bgPco2 = getNum('input-bg-pco2');
    const computedBgPfRatio = (bgPo2 !== null && bgPo2 > 0)
        ? Math.round(bgPo2 / ((bgFio2 !== null && bgFio2 > 0 ? bgFio2 : 21) / 100))
        : null;

    // PaO2/FiO2 placeholder senkronizasyonu (Kan Gazı -> Revize Atlanta / Modifiye Marshall)
    const atlantaPfEl = getEl<HTMLInputElement>('input-atlanta-pf');
    if (atlantaPfEl) {
        atlantaPfEl.placeholder = computedBgPfRatio !== null
            ? `Kan Gazı: ${computedBgPfRatio} mmHg`
            : 'Örn: 240 mmHg';
    }

    // İnfüzyon motorundan vazopressör (Norepinefrin / Dopamin >=5) senkronizasyonu
    const infDrug = getVal('select-inf-drug');
    const infDose = getNum('input-inf-dose');
    const isVasopressorActive =
        (infDrug === 'noradrenaline' && (infDose === null || infDose > 0)) ||
        (infDrug === 'dopamine' && infDose !== null && infDose >= 5);

    // Ortak Cerrahi Lab Girdileri
    const surgWbc = getNum('input-surg-wbc');
    const surgNeut = getNum('input-surg-neut');
    const surgCrp = getNum('input-surg-crp');
    const surgSymptomHours = getNum('input-surg-symptom-hours');
    const explicitSurgBun = getNum('input-surg-bun');
    const globalFallbackBun = getNum('input-feurea-s-bun') ?? getNum('input-osm-bun');
    const surgBun = explicitSurgBun ?? globalFallbackBun;
    const surgPlt = getNum('input-surg-plt');
    const surgInr = getNum('input-surg-inr');
    const surgCharlson = getNum('input-surg-charlson');

    // Global BUN placeholder yansıtması
    const surgBunEl = getEl<HTMLInputElement>('input-surg-bun');
    if (surgBunEl) {
        surgBunEl.placeholder = (explicitSurgBun === null && globalFallbackBun !== null)
            ? `Global: ${globalFallbackBun}`
            : 'Örn: 28';
    }

    // Senkronize vitaller/lab özet rozeti
    const syncedBadgeEl = getEl('badge-surgery-synced-vitals');
    if (syncedBadgeEl) {
        const syncedParts: string[] = [];
        if (nTemp !== null) syncedParts.push(`Ateş: ${nTemp}°C`);
        if (nCr !== null) syncedParts.push(`Kr: ${nCr} mg/dL`);
        if (computedBgPfRatio !== null) syncedParts.push(`P/F: ${computedBgPfRatio}`);
        if (nHb !== null) syncedParts.push(`Hb: ${nHb} g/dL`);
        if (gcsTotal !== null && gcsTotal < 15) syncedParts.push(`GKS: ${gcsTotal}`);
        syncedBadgeEl.textContent = syncedParts.length > 0
            ? `Senkronize: ${syncedParts.join(' • ')} ▼`
            : 'Biyometri & Vitallerden Otomatik Senkronize ▼';
    }

    const wbcNormX10E9 = (surgWbc !== null && surgWbc > 0)
        ? (surgWbc > 200 ? surgWbc / 1000 : surgWbc)
        : null;
    const pltNormPerMm3 = (surgPlt !== null && surgPlt > 0)
        ? (surgPlt < 1000 ? surgPlt * 1000 : surgPlt)
        : null;

    // SIRS kriter sayısı (Vitaller + Kan Gazı + Ortak WBC)
    const computedSirsCount =
        (nHr !== null && nHr > 90 ? 1 : 0) +
        (nTemp !== null && (nTemp < 36.0 || nTemp > 38.0) ? 1 : 0) +
        ((nRr !== null && nRr > 20) || (bgPco2 !== null && bgPco2 < 32) ? 1 : 0) +
        (wbcNormX10E9 !== null && (wbcNormX10E9 < 4.0 || wbcNormX10E9 > 12.0) ? 1 : 0);

    // Otomatik onay kutusu bağlamaları (kullanıcı manuel değiştirmediyse)
    const chkAlvTempEl = bindCheckboxUserModified('chk-alv-temp');
    if (chkAlvTempEl && !chkAlvTempEl.dataset.userModified && nTemp !== null) {
        chkAlvTempEl.checked = nTemp > 37.3;
    }

    const chkAlvLeuEl = bindCheckboxUserModified('chk-alv-leu');
    if (chkAlvLeuEl && !chkAlvLeuEl.dataset.userModified && wbcNormX10E9 !== null) {
        chkAlvLeuEl.checked = wbcNormX10E9 > 10.0;
    }

    const chkAlvShiEl = bindCheckboxUserModified('chk-alv-shi');
    if (chkAlvShiEl && !chkAlvShiEl.dataset.userModified && surgNeut !== null) {
        chkAlvShiEl.checked = surgNeut > 75;
    }

    const chkAirFeverEl = bindCheckboxUserModified('chk-air-fever385');
    if (chkAirFeverEl && !chkAirFeverEl.dataset.userModified && nTemp !== null) {
        chkAirFeverEl.checked = nTemp >= 38.5;
    }

    const chkTgFeverEl = bindCheckboxUserModified('chk-tg-fever');
    if (chkTgFeverEl && !chkTgFeverEl.dataset.userModified) {
        if (nTemp !== null || surgCrp !== null || wbcNormX10E9 !== null) {
            chkTgFeverEl.checked = (nTemp !== null && nTemp >= 37.8)
                || (surgCrp !== null && surgCrp >= 10)
                || (wbcNormX10E9 !== null && wbcNormX10E9 > 10.0);
        }
    }

    const chkTgWbc18El = bindCheckboxUserModified('chk-tg-wbc18');
    if (chkTgWbc18El && !chkTgWbc18El.dataset.userModified && wbcNormX10E9 !== null) {
        chkTgWbc18El.checked = wbcNormX10E9 > 18.0;
    }

    const chkTgDur72El = bindCheckboxUserModified('chk-tg-dur72');
    if (chkTgDur72El && !chkTgDur72El.dataset.userModified && surgSymptomHours !== null) {
        chkTgDur72El.checked = surgSymptomHours > 72;
    }

    const chkTgCvEl = bindCheckboxUserModified('chk-tg-cv');
    if (chkTgCvEl && !chkTgCvEl.dataset.userModified && infDrug !== '') {
        chkTgCvEl.checked = isVasopressorActive;
    }

    const chkTgNeuroEl = bindCheckboxUserModified('chk-tg-neuro');
    if (chkTgNeuroEl && !chkTgNeuroEl.dataset.userModified && (avpuVal !== '' || gcsTotal !== null)) {
        chkTgNeuroEl.checked = isAlteredMental;
    }

    const chkTgRespEl = bindCheckboxUserModified('chk-tg-resp');
    if (chkTgRespEl && !chkTgRespEl.dataset.userModified && computedBgPfRatio !== null) {
        chkTgRespEl.checked = computedBgPfRatio < 300;
    }

    const chkTgRenalEl = bindCheckboxUserModified('chk-tg-renal');
    if (chkTgRenalEl && !chkTgRenalEl.dataset.userModified && nCr !== null) {
        chkTgRenalEl.checked = nCr > 2.0;
    }

    const chkTgHepaticEl = bindCheckboxUserModified('chk-tg-hepatic');
    if (chkTgHepaticEl && !chkTgHepaticEl.dataset.userModified && surgInr !== null) {
        chkTgHepaticEl.checked = surgInr > 1.5;
    }

    const chkTgHemeEl = bindCheckboxUserModified('chk-tg-heme');
    if (chkTgHemeEl && !chkTgHemeEl.dataset.userModified && pltNormPerMm3 !== null) {
        chkTgHemeEl.checked = pltNormPerMm3 < 100000;
    }

    const chkBisapBunEl = bindCheckboxUserModified('chk-bisap-bun');
    if (chkBisapBunEl && !chkBisapBunEl.dataset.userModified && surgBun !== null) {
        chkBisapBunEl.checked = surgBun > 25;
    }

    const chkBisapMentalEl = bindCheckboxUserModified('chk-bisap-mental');
    if (chkBisapMentalEl && !chkBisapMentalEl.dataset.userModified && (avpuVal !== '' || gcsTotal !== null)) {
        chkBisapMentalEl.checked = isAlteredMental;
    }

    const chkBisapSirsEl = bindCheckboxUserModified('chk-bisap-sirs');
    if (chkBisapSirsEl && !chkBisapSirsEl.dataset.userModified && (nHr !== null || nTemp !== null || nRr !== null || wbcNormX10E9 !== null)) {
        chkBisapSirsEl.checked = computedSirsCount >= 2;
    }

    const chkTraumaUnstableEl = bindCheckboxUserModified('chk-trauma-unstable');
    if (chkTraumaUnstableEl && !chkTraumaUnstableEl.dataset.userModified && nSysBp !== null && nSysBp > 0) {
        chkTraumaUnstableEl.checked = nSysBp < 90;
    }

    // Aktif skor özeti rozet listesi
    const activeSummaryPills: Array<{ tab: SurgeryTabId; label: string; badgeClass: string }> = [];

    // =========================================================================
    // SEKME 10.3 (ÖNCE HESAPLA): ASA-PS (TG18 Cerrahi Risk Köprüsü İçin)
    // =========================================================================
    const rawAsaClass = getVal('select-asa-class');
    const asaEmergency = getChk('chk-asa-emergency');
    const asaOutEl = getEl('output-asa-ps');
    let activeAsaNumeric: number | null = null;

    if (rawAsaClass) {
        const asaClassNum = Number(rawAsaClass) as ASAPhysicalStatusClass;
        activeAsaNumeric = asaClassNum;
        const isPediatricContext = (y !== null && y < 18) || (totalMonths !== null && totalMonths < 216);
        const isObstetricContext = Boolean(appState.obgyn.eddData);
        const asaVal = evaluateASAPhysicalStatus({
            asaClassDirect: asaClassNum,
            isEmergency: asaEmergency,
            exampleContext: isObstetricContext ? 'obstetric' : isPediatricContext ? 'pediatric' : 'adult',
            ageYears: y,
            bmi: appState.biometry.bmi,
            isPregnant: isObstetricContext
        });
        appState.surgery.asaPs = asaVal;
        if (asaVal && asaOutEl) {
            const recs: string[] = [
                `Resmi Tanım: ${asaVal.officialDefinition}`,
                `2020 Erişkin Örnekleri: ${asaVal.approvedExamplesAdult2020}`,
                `2020 Pediatrik/Obstetrik Örnekleri: Pediatrik: ${asaVal.approvedExamplesPediatric2020} | Obstetrik: ${asaVal.approvedExamplesObstetric2020}`,
                asaVal.clinicalAndTg18Guidance
            ];
            if (asaVal.autoSuggestionTriggers.length > 0) {
                recs.push(`Hasta Profili Notu: ${asaVal.autoSuggestionTriggers.join('; ')}`);
            }
            renderClinicalCardResult(asaOutEl, {
                title: `ASA Fiziksel Durum: ${asaVal.formattedCode}`,
                riskText: asaVal.isLowRiskForTokyoGuidelines ? 'Düşük/Standart Perioperatif Risk (ASA I–II)' : 'Yüksek Perioperatif Risk (ASA ≥III)',
                alertClass: asaVal.alertClass,
                recommendations: recs
            });
            activeSummaryPills.push({
                tab: 'periop',
                label: asaVal.formattedCode,
                badgeClass: asaVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : asaVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.asaPs = null;
        if (asaOutEl) asaOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 1: AKUT APANDİSİT (Alvarado 1986 + AIR 2008/2021 + AAS 2014)
    // =========================================================================
    const alvCutoffMode = (getVal('select-alv-cutoff-mode') === 'emergency_ct' ? 'emergency_ct' : 'wses_original') as AlvaradoCutoffMode;
    const alvParams = {
        migration: getChk('chk-alv-mig'),
        anorexia: getChk('chk-alv-ano'),
        nausea: getChk('chk-alv-nau'),
        rlqPain: getChk('chk-alv-rlq'),
        rebound: getChk('chk-alv-reb'),
        temp: getChk('chk-alv-temp'),
        leukocytosis: getChk('chk-alv-leu'),
        leftShift: getChk('chk-alv-shi'),
        gender,
        ageYears: y ?? undefined,
        wbcCount: surgWbc,
        neutrophilPercent: surgNeut,
        cutoffMode: alvCutoffMode
    };
    const alvVal = calculateAlvarado(alvParams);
    appState.surgery.alvarado = alvVal;
    const alvRes = getEl('output-alvarado');
    if (alvRes) {
        if (alvVal && alvVal.score > 0) {
            alvRes.classList.remove('hidden');
            alvRes.className = 'text-[0.75rem] p-2.5 rounded-lg border border-slate-700/80 bg-slate-900/80 tabular-nums space-y-1 text-slate-200';
            let alvHtml = `<div class="font-bold text-sky-300">Skor: ${alvVal.score}/10 (${alvVal.risk}). ${escapeHtml(alvVal.recommendation)}</div>`;
            alvHtml += `<div class="text-[0.6875rem] text-slate-400">Karşılaştırma: <strong>WSES/Orijinal (&lt;5):</strong> ${escapeHtml(alvVal.modeComparison.wsesOriginalRisk)} | <strong>McKay Acil BT (≤3):</strong> ${escapeHtml(alvVal.modeComparison.emergencyCtRisk)}${alvVal.modeComparison.isDiscordant ? ' <span class="text-amber-300 font-semibold">[Skor 4 Kesim Farkı!]</span>' : ''}</div>`;
            if (alvVal.gynecologicWarning) {
                alvHtml += `<div class="mt-1 text-[0.75rem] text-amber-300 font-sans font-normal leading-tight">${escapeHtml(alvVal.gynecologicWarning)}</div>`;
            }
            alvRes.innerHTML = replaceEmojisWithSvg(alvHtml);
            activeSummaryPills.push({
                tab: 'appendicitis',
                label: `Alvarado: ${alvVal.score}/10 (${alvVal.risk})`,
                badgeClass: alvVal.score >= 7 ? 'bg-rose-950 text-rose-200 border-rose-700' : alvVal.score >= 5 ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        } else {
            alvRes.classList.add('hidden');
        }
    }

    // 1.2. AIR Skoru & 1.3. AAS Skoru
    const rawGuarding = Number(getVal('select-app-guarding') || '0');
    const airGuarding: AIRReboundGrade = (rawGuarding >= 1 && rawGuarding <= 3)
        ? (rawGuarding as AIRReboundGrade)
        : (alvParams.rebound ? 1 : 0);
    const aasGuarding: AASGuardingGrade = airGuarding === 0 ? 0 : airGuarding === 1 ? 2 : 4;
    const airCutoffMode: AIRCutoffMode = getVal('select-air-cutoff-mode') === 'original_2008' ? 'original_2008' : 'strappscore_2021';
    const aasDuration: AASSymptomDuration = (surgSymptomHours !== null && surgSymptomHours > 24)
        ? 'over_24h'
        : (getVal('select-aas-duration') === 'over_24h' ? 'over_24h' : 'under_24h');
    const airVomiting = getChk('chk-air-vomiting');
    const airFever385 = getChk('chk-air-fever385');

    const hasAppendicitisAdvancedInput =
        alvParams.migration ||
        alvParams.anorexia ||
        alvParams.nausea ||
        alvParams.rlqPain ||
        alvParams.rebound ||
        alvParams.leukocytosis ||
        alvParams.leftShift ||
        rawGuarding > 0 ||
        airVomiting ||
        Boolean(chkAirFeverEl?.dataset.userModified && airFever385) ||
        surgWbc !== null ||
        surgNeut !== null ||
        surgCrp !== null;

    const airOutEl = getEl('output-air-score');
    const aasOutEl = getEl('output-aas-score');
    const triadOutEl = getEl('output-appendicitis-triad');

    if (hasAppendicitisAdvancedInput) {
        const airVal = calculateAIRScore({
            vomiting: airVomiting || alvParams.nausea,
            rifPain: alvParams.rlqPain,
            reboundGrade: airGuarding,
            fever385: airFever385,
            tempC: nTemp,
            wbcCount: surgWbc ?? (alvParams.leukocytosis ? 12.0 : null),
            neutrophilPercent: surgNeut ?? (alvParams.leftShift ? 78 : null),
            crpMgL: surgCrp,
            ageYears: y,
            cutoffMode: airCutoffMode
        });
        appState.surgery.air = airVal;

        const aasVal = calculateAAS({
            rlqPain: alvParams.rlqPain,
            painRelocation: alvParams.migration,
            rlqTenderness: alvParams.rlqPain,
            guardingPoints: aasGuarding,
            gender,
            ageYears: y,
            symptomDuration: aasDuration,
            wbcCount: surgWbc ?? (alvParams.leukocytosis ? 12.0 : null),
            neutrophilPercent: surgNeut ?? (alvParams.leftShift ? 78 : null),
            crpMgL: surgCrp
        });
        appState.surgery.aas = aasVal;

        if (airVal && airOutEl && airVal.score > 0) {
            const airRecs = [
                airVal.recommendation,
                `Sürüm Karşılaştırması: [2021 STRAPPSCORE (0–3 Düşük)] -> ${airVal.modeComparison.strappscore2021Risk} | [2008 Orijinal/WSES (0–4 Düşük)] -> ${airVal.modeComparison.original2008Risk}`,
                airVal.erratumNote,
                airVal.ageSpecificNote
            ];
            renderClinicalCardResult(airOutEl, {
                title: `AIR Skoru: ${airVal.score}/12 (Klinik: ${airVal.clinicalPoints}p | Lab: ${airVal.labPoints}p)`,
                riskText: airVal.riskLabel,
                alertClass: airVal.alertClass,
                recommendations: airRecs
            });
            activeSummaryPills.push({
                tab: 'appendicitis',
                label: `AIR: ${airVal.score}/12 (${airVal.risk})`,
                badgeClass: airVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : airVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        } else if (airOutEl) {
            airOutEl.classList.add('hidden');
        }

        if (aasVal && aasOutEl && aasVal.score > 0) {
            const aasRecs = [
                aasVal.recommendation,
                `Demografik Hassasiyet Ağırlığı: RLQ Hassasiyetine +${aasVal.tendernessPointsAwarded}p verildi (${aasVal.isReproductiveAgeFemale ? '16–49 Yaş Kadın: +1p' : 'Erkek veya ≥50 Yaş Kadın: +3p'}).`,
                `CRP Süre Karşılaştırması (<24s vs >24s): <24s CRP Puanı: +${aasVal.crpDurationComparison.under24hCrpPoints}p | >24s CRP Puanı: +${aasVal.crpDurationComparison.over24hCrpPoints}p (Aktif: ${aasVal.symptomDuration === 'under_24h' ? '<24 Saat' : '>24 Saat'}).`
            ];
            if (aasVal.pediatricWarning) {
                aasRecs.push(aasVal.pediatricWarning);
            }
            renderClinicalCardResult(aasOutEl, {
                title: `Adult Appendicitis Score (AAS): ${aasVal.score}/23 (Klinik: ${aasVal.clinicalPoints}p | Lab: ${aasVal.labPoints}p)`,
                riskText: aasVal.riskLabel,
                alertClass: aasVal.alertClass,
                recommendations: aasRecs
            });
            activeSummaryPills.push({
                tab: 'appendicitis',
                label: `AAS: ${aasVal.score}/23 (${aasVal.risk})`,
                badgeClass: aasVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : aasVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        } else if (aasOutEl) {
            aasOutEl.classList.add('hidden');
        }

        if (triadOutEl && ((alvVal && alvVal.score > 0) || (airVal && airVal.score > 0) || (aasVal && aasVal.score > 0))) {
            const comp = compareAppendicitisSystems({
                gender,
                ageYears: y,
                symptomDuration: aasDuration,
                rlqPain: alvParams.rlqPain,
                painRelocationOrMigration: alvParams.migration,
                anorexia: alvParams.anorexia,
                nausea: alvParams.nausea,
                vomiting: airVomiting || alvParams.nausea,
                rlqTenderness: alvParams.rlqPain,
                reboundOrGuardingLevel: airGuarding,
                tempC: nTemp,
                wbcCount: surgWbc ?? (alvParams.leukocytosis ? 12.0 : null),
                neutrophilPercent: surgNeut ?? (alvParams.leftShift ? 78 : null),
                crpMgL: surgCrp,
                alvaradoCutoffMode: alvCutoffMode,
                airCutoffMode
            });
            triadOutEl.classList.remove('hidden');
            triadOutEl.innerHTML = replaceEmojisWithSvg(`
                <div class="flex flex-wrap items-center justify-between gap-1 font-bold text-sky-300">
                    <span>3'lü Apandisit Sistem Karşılaştırması (WSES 2020)</span>
                    <span class="px-2 py-0.5 rounded bg-sky-900/70 text-sky-100 border border-sky-700 text-[0.6875rem]">Önerilen Referans: ${escapeHtml(comp.preferredSystem)}</span>
                </div>
                <div class="text-slate-200 font-semibold">${escapeHtml(comp.consensusSummary)}</div>
                <div class="text-slate-300 leading-snug">${escapeHtml(comp.preferredReason)}</div>
            `);
        } else if (triadOutEl) {
            triadOutEl.classList.add('hidden');
        }
    } else {
        appState.surgery.air = null;
        appState.surgery.aas = null;
        if (airOutEl) airOutEl.classList.add('hidden');
        if (aasOutEl) aasOutEl.classList.add('hidden');
        if (triadOutEl) triadOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 2: AKUT KOLESİSTİT & SAFRA YOLU (TG18/TG13, Parkland PGS, Strasberg)
    // =========================================================================
    const tgVersion: TokyoGuidelineVersion = getVal('select-tokyo-version') === 'TG13' ? 'TG13' : 'TG18';
    const tgMurphy = getChk('chk-tg-murphy');
    const tgRuq = getChk('chk-tg-ruq');
    const tgFever = getChk('chk-tg-fever');
    const tgImaging = getChk('chk-tg-imaging');
    const tgWbc18 = getChk('chk-tg-wbc18');
    const tgMass = getChk('chk-tg-mass');
    const tgDur72 = getChk('chk-tg-dur72');
    const tgLocal = getChk('chk-tg-local');
    const tgCv = getChk('chk-tg-cv');
    const tgNeuro = getChk('chk-tg-neuro');
    const tgResp = getChk('chk-tg-resp');
    const tgRenal = getChk('chk-tg-renal');
    const tgHepatic = getChk('chk-tg-hepatic');
    const tgHeme = getChk('chk-tg-heme');

    const hasCholecystitisCoreSign = tgMurphy || tgRuq || tgImaging || tgMass || tgLocal;
    const hasManualTgOrganOrLabCheck = [
        chkTgFeverEl, chkTgWbc18El, chkTgDur72El,
        chkTgCvEl, chkTgNeuroEl, chkTgRespEl, chkTgRenalEl, chkTgHepaticEl, chkTgHemeEl
    ].some(el => Boolean(el?.checked && el?.dataset.userModified === 'true'));
    const hasAnyTgInput = hasCholecystitisCoreSign || hasManualTgOrganOrLabCheck;
    const tgOutEl = getEl('output-tokyo-cholecystitis');

    if (hasAnyTgInput) {
        const tgVal = calculateTokyoCholecystitis({
            murphySign: tgMurphy,
            ruqMassPainTenderness: tgRuq,
            fever: tgFever,
            tempC: nTemp,
            crpMgL: surgCrp,
            wbcCount: surgWbc,
            imagingCharacteristic: tgImaging,
            wbcOver18000: tgWbc18,
            palpableRuqMass: tgMass,
            durationOver72h: tgDur72,
            symptomHours: surgSymptomHours,
            markedLocalInflammation: tgLocal,
            cvDysfunction: tgCv,
            neuroDysfunction: tgNeuro,
            respDysfunction: tgResp,
            renalDysfunction: tgRenal,
            hepaticDysfunction: tgHepatic,
            hematologicDysfunction: tgHeme,
            asaClass: activeAsaNumeric,
            charlsonCci: surgCharlson,
            guidelineVersion: tgVersion
        });
        appState.surgery.tokyoCholecystitis = tgVal;
        if (tgVal && tgOutEl) {
            const tgRecs: string[] = [
                `Tanı Durumu: ${tgVal.diagnosisStatus} (A: ${tgVal.hasGroupA ? '+' : '-'} | B: ${tgVal.hasGroupB ? '+' : '-'} | C: ${tgVal.hasGroupC ? '+' : '-'})`,
                tgVal.managementRecommendation
            ];
            if (tgVal.grade2Triggers.length > 0) {
                tgRecs.push(`Derece II Kriterleri: ${tgVal.grade2Triggers.join(', ')}`);
            }
            if (tgVal.grade3OrganFailures.length > 0) {
                tgRecs.push(`Derece III Organ Yetmezlikleri: ${tgVal.grade3OrganFailures.join(' | ')}`);
            }
            if (tgVal.tg18VsTg13Comparison.hasVersionDifference) {
                tgRecs.push(`TG18 vs TG13 Karşılaştırması: [TG18]: ${tgVal.tg18VsTg13Comparison.tg18Action} vs [TG13]: ${tgVal.tg18VsTg13Comparison.tg13Action}`);
            }
            tgRecs.push(tgVal.bailOutNote);
            renderClinicalCardResult(tgOutEl, {
                title: `Tokyo Kılavuzu (${tgVal.guidelineVersion}): ${tgVal.severityGrade}`,
                riskText: tgVal.diagnosisStatus,
                alertClass: tgVal.alertClass,
                recommendations: tgRecs
            });
            activeSummaryPills.push({
                tab: 'biliary',
                label: `${tgVal.guidelineVersion}: ${tgVal.severityGrade}`,
                badgeClass: tgVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : tgVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.tokyoCholecystitis = null;
        if (tgOutEl) tgOutEl.classList.add('hidden');
    }

    // 2.2. Parkland Kolesistit Ölçeği (PGS)
    const rawPgs = getVal('select-pgs-grade');
    const pgsOutEl = getEl('output-parkland-pgs');
    if (rawPgs) {
        const pgsVal = calculateParklandCholecystitis({
            directGrade: Number(rawPgs) as ParklandCholecystitisGrade
        });
        appState.surgery.parklandCholecystitis = pgsVal;
        if (pgsVal && pgsOutEl) {
            renderClinicalCardResult(pgsOutEl, {
                title: pgsVal.gradeTitle,
                riskText: `Zorluk: ${pgsVal.operativeDifficulty} | CVS Başarısızlık Riski: ${pgsVal.cvsFailureRisk}`,
                alertClass: pgsVal.alertClass,
                recommendations: [
                    `İntraoperatif Görünüm: ${pgsVal.anatomicalDescription}`,
                    pgsVal.recommendation
                ]
            });
            activeSummaryPills.push({
                tab: 'biliary',
                label: `Parkland Kolesistit: Derece ${pgsVal.grade}`,
                badgeClass: pgsVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : pgsVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.parklandCholecystitis = null;
        if (pgsOutEl) pgsOutEl.classList.add('hidden');
    }

    // 2.3. Strasberg-Bismuth BDI
    const rawStrasbergType = getVal('select-strasberg-type') as StrasbergType | '';
    const strasbergDist = getNum('input-strasberg-dist-cm');
    const strasbergCutoffMode: StrasbergConfluenceCutoffMode = getVal('select-strasberg-cutoff-mode') === 'gte_2cm' ? 'gte_2cm' : 'gt_2cm';
    const strasbergTiming = (getVal('select-strasberg-timing') || 'postop_early') as BDIDetectionTiming;
    const strasbergHpb = getChk('chk-strasberg-hpb');
    const strasbergVasc = getChk('chk-strasberg-vascular');
    const strasbergOutEl = getEl('output-strasberg-bismuth');

    if (rawStrasbergType || strasbergDist !== null) {
        const strasbergVal = classifyStrasbergBismuth({
            type: rawStrasbergType ? rawStrasbergType : null,
            distanceFromConfluenceCm: strasbergDist,
            confluenceCutoffMode: strasbergCutoffMode,
            detectionTiming: strasbergTiming,
            hasHpbExpertiseOnSite: strasbergHpb,
            hasConcomitantVascularInjury: strasbergVasc
        });
        appState.surgery.strasbergBismuth = strasbergVal;
        if (strasbergVal && strasbergOutEl) {
            const recs: string[] = [
                `Anatomik Tanım: ${strasbergVal.anatomicalDefinition}`,
                `Primer Tedavi: ${strasbergVal.primaryManagement}`,
                strasbergVal.timingAndReferralGuidance
            ];
            if (strasbergVal.confluenceCutoffComparison) {
                const c = strasbergVal.confluenceCutoffComparison;
                recs.push(`Konfluens Mesafesi (${c.distanceCm} cm) Sınır Karşılaştırması: [Klasik >2 cm Modu]: ${c.gt2cmClassification} | [Varyant ≥2 cm Modu]: ${c.gte2cmClassification}`);
            }
            if (strasbergVal.vascularInjuryWarning) {
                recs.push(strasbergVal.vascularInjuryWarning);
            }
            renderClinicalCardResult(strasbergOutEl, {
                title: `Strasberg Tip ${strasbergVal.type} (${strasbergVal.bismuthEquivalent})`,
                riskText: strasbergVal.isMajorDuctInjury ? 'Majör Safra Yolu Yaralanması' : 'Minör / Kısmi Safra Yolu Kaçağı',
                alertClass: strasbergVal.alertClass,
                recommendations: recs
            });
            activeSummaryPills.push({
                tab: 'biliary',
                label: `Strasberg Tip ${strasbergVal.type}`,
                badgeClass: strasbergVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : 'bg-amber-950 text-amber-200 border-amber-700'
            });
        }
    } else {
        appState.surgery.strasbergBismuth = null;
        if (strasbergOutEl) strasbergOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 3: AKUT PANKREATİT (Revize Atlanta/Marshall, BISAP, mCTSI, Ranson)
    // =========================================================================
    // 3.1. Revize Atlanta & Modifiye Marshall
    const atlantaPfInput = getNum('input-atlanta-pf');
    const atlantaOfDuration = (getVal('select-atlanta-of-duration') || 'transient_le_48h') as OrganFailureDuration;
    const atlantaCollectionRaw = getVal('select-atlanta-collection');
    const atlantaFluidResp = getChk('chk-atlanta-fluid-resp');
    const atlantaInfected = getChk('chk-atlanta-infected');
    const marshallCrMode: MarshallCreatinineBoundaryMode = getVal('select-marshall-cr-mode') === 'conservative_lower' ? 'conservative_lower' : 'strict_higher';
    const atlantaOutEl = getEl('output-atlanta-marshall');

    const hasExplicitAtlantaInput =
        atlantaPfInput !== null ||
        atlantaCollectionRaw !== 'none' ||
        atlantaFluidResp ||
        atlantaInfected;

    if (hasExplicitAtlantaInput) {
        const effectivePf = atlantaPfInput ?? computedBgPfRatio;
        const morph = (atlantaCollectionRaw === 'anc' || atlantaCollectionRaw === 'won' || atlantaInfected)
            ? 'necrotizing'
            : 'interstitial_edematous';
        const tf = (atlantaCollectionRaw === 'pseudocyst' || atlantaCollectionRaw === 'won')
            ? 'gt_4_weeks'
            : 'le_4_weeks';

        const atlantaVal = calculateAtlantaMarshall({
            typicalAbdominalPain: true,
            amylaseOrLipase3xUln: true,
            pao2Fio2RatioDirect: effectivePf,
            creatinineMgDl: nCr,
            creatinineBoundaryMode: marshallCrMode,
            systolicBpMmHg: nSysBp,
            fluidResponsiveHypotension: atlantaFluidResp,
            arterialPh: bgPh,
            organFailureDuration: atlantaOfDuration,
            hasLocalComplications: atlantaCollectionRaw !== 'none' || atlantaInfected,
            hasFluidOrNecroticCollection: atlantaCollectionRaw !== 'none' || atlantaInfected,
            morphology: morph,
            collectionTimeframe: tf,
            isInfectedNecrosis: atlantaInfected
        });
        appState.surgery.atlantaMarshall = atlantaVal;
        if (atlantaVal && atlantaOutEl) {
            const recs: string[] = [
                `Modifiye Marshall Skorları (≥2 = Organ Yetmezliği): Solunum: ${atlantaVal.respScore}p | Renal: ${atlantaVal.renalScore}p | Kardiyovasküler: ${atlantaVal.cvScore}p`,
                atlantaVal.managementRecommendation
            ];
            if (atlantaVal.collectionType !== 'Koleksiyon Yok') {
                recs.push(`Koleksiyon Sınıflaması: ${atlantaVal.collectionType} — ${atlantaVal.collectionDescription}`);
            }
            if (atlantaVal.creatinineBoundaryComparison && atlantaVal.creatinineBoundaryComparison.hasBoundaryOverlap) {
                const cb = atlantaVal.creatinineBoundaryComparison;
                recs.push(`Kreatinin Sınır Çakışması (Banks 2013 Tablo 3): Üst Skor Modu = ${cb.higherScore}p vs Alt Skor Modu = ${cb.lowerScore}p (${cb.note})`);
            }
            renderClinicalCardResult(atlantaOutEl, {
                title: `Revize Atlanta (2012): ${atlantaVal.atlantaSeverity}`,
                riskText: atlantaVal.hasOrganFailure ? `Organ Yetmezliği (+) [${atlantaVal.failedOrgans.join(', ')}]` : 'Organ Yetmezliği Yok',
                alertClass: atlantaVal.alertClass,
                recommendations: recs
            });
            activeSummaryPills.push({
                tab: 'pancreatitis',
                label: `Atlanta: ${atlantaVal.atlantaSeverity.split(' (')[0]}`,
                badgeClass: atlantaVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : atlantaVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.atlantaMarshall = null;
        if (atlantaOutEl) atlantaOutEl.classList.add('hidden');
    }

    // 3.2. BISAP Skoru
    const rawMctsiInflamCheck = getVal('select-mctsi-inflam');
    const chkBisapPleuralEl = bindCheckboxUserModified('chk-bisap-pleural');
    const chkBisapAgeEl = bindCheckboxUserModified('chk-bisap-age');

    const bBun = getChk('chk-bisap-bun');
    const bMental = getChk('chk-bisap-mental');
    const bSirs = getChk('chk-bisap-sirs');
    const bPleural = getChk('chk-bisap-pleural');

    const hasManualBisapCheck = [
        chkBisapBunEl, chkBisapMentalEl, chkBisapSirsEl, chkBisapAgeEl, chkBisapPleuralEl
    ].some(el => Boolean(el?.checked && el?.dataset.userModified === 'true'));

    const hasPancreatitisOrBisapContext =
        explicitSurgBun !== null ||
        bPleural ||
        hasManualBisapCheck ||
        hasExplicitAtlantaInput ||
        rawMctsiInflamCheck !== '';

    if (chkBisapAgeEl && !chkBisapAgeEl.dataset.userModified && hasPancreatitisOrBisapContext && y !== null) {
        chkBisapAgeEl.checked = y > 60;
    }
    const bAge = getChk('chk-bisap-age');
    const bisapOutEl = getEl('output-bisap');

    if (hasPancreatitisOrBisapContext && (bBun || bMental || bSirs || bAge || bPleural)) {
        const bisapVal = calculateBISAP({
            bunOver25: bBun,
            impairedMentalStatus: bMental || (hasPancreatitisOrBisapContext && isAlteredMental),
            sirsPresent: bSirs,
            sirsHrOver90: nHr !== null && nHr > 90,
            sirsTempAbnormal: nTemp !== null && (nTemp < 36.0 || nTemp > 38.0),
            sirsRrOver20OrPaco2Under32: (nRr !== null && nRr > 20) || (bgPco2 !== null && bgPco2 < 32),
            sirsWbcAbnormal: wbcNormX10E9 !== null && (wbcNormX10E9 < 4.0 || wbcNormX10E9 > 12.0),
            ageOver60: bAge,
            pleuralEffusion: bPleural
        });
        appState.surgery.bisap = bisapVal;
        if (bisapVal && bisapOutEl && bisapVal.score > 0) {
            renderClinicalCardResult(bisapOutEl, {
                title: `BISAP Skoru: ${bisapVal.score}/5 (${bisapVal.riskCategory})`,
                riskText: `Gözlenen Mortalite: ${bisapVal.observedMortalityRange}`,
                alertClass: bisapVal.alertClass,
                recommendations: [
                    `Aktif Kriterler: ${bisapVal.activeComponents.join(', ')}`,
                    bisapVal.recommendation
                ]
            });
            activeSummaryPills.push({
                tab: 'pancreatitis',
                label: `BISAP: ${bisapVal.score}/5`,
                badgeClass: bisapVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : bisapVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        } else if (bisapOutEl) {
            bisapOutEl.classList.add('hidden');
        }
    } else {
        appState.surgery.bisap = null;
        if (bisapOutEl) bisapOutEl.classList.add('hidden');
    }

    // 3.3. Modifiye BT Şiddet İndeksi (mCTSI, 2004 vs Balthazar 1990)
    const rawMctsiInflam = getVal('select-mctsi-inflam');
    const rawMctsiNecrosis = getVal('select-mctsi-necrosis');
    const rawMctsiExtra = getVal('select-mctsi-extra');
    const mctsiCutoffMode: MctsiNecrosisCutoffMode = getVal('select-mctsi-cutoff-mode') === 'lt_30' ? 'lt_30' : 'lte_30';
    const mctsiOutEl = getEl('output-mctsi');

    if (rawMctsiInflam !== '') {
        const inflamPts = Number(rawMctsiInflam) as MctsiInflammationPoints;
        const isExact30 = rawMctsiNecrosis === '30_exact';
        const necrosisPts: MctsiNecrosisPoints = isExact30
            ? (mctsiCutoffMode === 'lte_30' ? 2 : 4)
            : (Number(rawMctsiNecrosis || '0') as MctsiNecrosisPoints);
        const extraPts = Number(rawMctsiExtra || '0') as MctsiExtrapancreaticPoints;

        const mctsiVal = calculateModifiedCTSI({
            inflammationPoints: inflamPts,
            necrosisPoints: necrosisPts,
            necrosisPercentNumeric: isExact30 ? 30 : null,
            necrosisCutoffMode: mctsiCutoffMode,
            extrapancreaticPoints: extraPts,
            hoursSinceSymptomOnset: surgSymptomHours
        });
        appState.surgery.mctsi = mctsiVal;
        if (mctsiVal && mctsiOutEl) {
            const recs: string[] = [
                mctsiVal.recommendation,
                `1990 Balthazar CTSI Karşılaştırması: Orijinal Balthazar Skoru = ${mctsiVal.balthazar1990Comparison.originalCtsiScore}/10 (${mctsiVal.balthazar1990Comparison.originalCtsiSeverity}) vs 2004 Mortele mCTSI = ${mctsiVal.score}/10 (${mctsiVal.severity}).`,
                mctsiVal.expectedLengthOfStayNote
            ];
            if (mctsiVal.balthazar1990Comparison.necrosisBoundary30Note) {
                recs.push(mctsiVal.balthazar1990Comparison.necrosisBoundary30Note);
            }
            if (mctsiVal.earlyCtTimingWarning) {
                recs.push(mctsiVal.earlyCtTimingWarning);
            }
            renderClinicalCardResult(mctsiOutEl, {
                title: `Modifiye CTSI (Mortele 2004): ${mctsiVal.score}/10 (Çift Sayı Skoru)`,
                riskText: mctsiVal.severity,
                alertClass: mctsiVal.alertClass,
                recommendations: recs
            });
            activeSummaryPills.push({
                tab: 'pancreatitis',
                label: `mCTSI: ${mctsiVal.score}/10`,
                badgeClass: mctsiVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : mctsiVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.mctsi = null;
        if (mctsiOutEl) mctsiOutEl.classList.add('hidden');
    }

    // 3.4. RANSON AKUT PANKREATİT KRİTERLERİ (0. ve 48. Saat — %100 Geriye Dönük Uyumlu)
    const rawEtiology = getVal('select-ranson-etiology');
    const ransonEtiology: RansonEtiology = rawEtiology === 'biliary' ? 'biliary' : 'non_biliary';

    const lblRansonAge = getEl('lbl-ranson-age');
    if (lblRansonAge) lblRansonAge.textContent = ransonEtiology === 'biliary' ? 'Yaş > 70 Yıl' : 'Yaş > 55 Yıl';
    const lblRansonWbc = getEl('lbl-ranson-wbc');
    if (lblRansonWbc) lblRansonWbc.textContent = ransonEtiology === 'biliary' ? 'BK (WBC) > 18.000/mm³' : 'BK (WBC) > 16.000/mm³';
    const lblRansonGlu = getEl('lbl-ranson-glu');
    if (lblRansonGlu) lblRansonGlu.textContent = ransonEtiology === 'biliary' ? 'Kan Şekeri > 220 mg/dL' : 'Kan Şekeri > 200 mg/dL';
    const lblRansonLdh = getEl('lbl-ranson-ldh');
    if (lblRansonLdh) lblRansonLdh.textContent = ransonEtiology === 'biliary' ? 'Serum LDH > 400 IU/L' : 'Serum LDH > 350 IU/L';
    const lblRansonBun = getEl('lbl-ranson-bun');
    if (lblRansonBun) lblRansonBun.textContent = ransonEtiology === 'biliary' ? 'BUN Artışı > 2 mg/dL' : 'BUN Artışı > 5 mg/dL';
    const lblRansonBd = getEl('lbl-ranson-bd');
    if (lblRansonBd) lblRansonBd.textContent = ransonEtiology === 'biliary' ? 'Baz Açığı > 5 mEq/L' : 'Baz Açığı > 4 mEq/L';
    const lblRansonFluid = getEl('lbl-ranson-fluid');
    if (lblRansonFluid) lblRansonFluid.textContent = ransonEtiology === 'biliary' ? 'Sıvı Sekestrasyonu > 4 L' : 'Sıvı Sekestrasyonu > 6 L';
    const lblRansonPo2 = getEl('lbl-ranson-po2');
    if (lblRansonPo2) lblRansonPo2.textContent = ransonEtiology === 'biliary' ? 'PaO₂ < 60 mmHg (Biliyerde yok)' : 'PaO₂ < 60 mmHg';

    const rWbc = getChk('chk-ranson-wbc16');
    const rGlu = getChk('chk-ranson-glu200');
    const rLdh = getChk('chk-ranson-ldh350');
    const rAst = getChk('chk-ranson-ast250');
    const rHct = getChk('chk-ranson-hct10');
    const rBun = getChk('chk-ranson-bun5');
    const rCa = getChk('chk-ranson-ca8');
    const rPo2 = getChk('chk-ranson-po260');
    const rBd = getChk('chk-ranson-bd4');
    const rFluid = getChk('chk-ranson-fluid6');
    const hasOtherRanson = rWbc || rGlu || rLdh || rAst || rHct || rBun || rCa || rPo2 || rBd || rFluid;
    const chkRansonAgeEl = bindCheckboxUserModified('chk-ranson-age55');

    if (chkRansonAgeEl && !chkRansonAgeEl.dataset.userModified && hasOtherRanson) {
        const ageThreshold = ransonEtiology === 'biliary' ? 70 : 55;
        if (y !== null && y !== undefined) {
            chkRansonAgeEl.checked = y > ageThreshold;
        }
    }

    const rAge55 = getChk('chk-ranson-age55');
    const ransonOut = getEl('output-ranson');
    const ransonVal = calculateRanson({
        etiology: ransonEtiology,
        ageO55: rAge55,
        wbcO16: rWbc,
        gluO200: rGlu,
        ldhO350: rLdh,
        astO250: rAst,
        hctDrop10: rHct,
        bunRise5: rBun,
        caU8: rCa,
        pO2U60: rPo2,
        baseDefO4: rBd,
        fluidSecO6: rFluid,
        ageYears: y ?? undefined
    });
    if (ransonVal && ransonVal.score > 0) {
        appState.surgery.ranson = ransonVal;
        if (ransonOut) {
            const ransonAlert = ransonVal.score >= 5 ? 'danger' : ransonVal.score >= 3 ? 'warning' : 'success';
            const recommendations: string[] = [ransonVal.interpretation];
            if (ransonVal.earlyWarning) {
                recommendations.push(ransonVal.earlyWarning);
            }
            renderClinicalCardResult(ransonOut, {
                title: `Ranson Skoru: ${ransonVal.score}/${ransonVal.maxScore} (${ransonVal.etiology === 'biliary' ? 'Biliyer' : 'Non-Biliyer'}) (0.s: ${ransonVal.admissionScore} | 48.s: ${ransonVal.hour48Score})`,
                riskText: `${ransonVal.severity} (~%${ransonVal.mortalityPercent} Mortalite)`,
                alertClass: ransonAlert,
                recommendations
            });
            activeSummaryPills.push({
                tab: 'pancreatitis',
                label: `Ranson: ${ransonVal.score}/${ransonVal.maxScore}`,
                badgeClass: ransonAlert === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : ransonAlert === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.ranson = null;
        if (ransonOut) ransonOut.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 4: AKUT KOLONİK DİVERTİKÜLİT (Kaiser Hinchey, WSES 2020, Ambrosetti)
    // =========================================================================
    const rawDivCt = getVal('select-diverticulitis-ct');
    const divImmuno = getChk('chk-div-immuno');
    const divUnstable = getChk('chk-div-unstable');
    const divOutEl = getEl('output-diverticulitis-triad');

    if (rawDivCt) {
        const divParams = {
            wallThickeningAndFatStranding: true,
            pericolicAirBubblesLe5cm: rawDivCt === 'pericolic_air_1a',
            abscessPresent: rawDivCt === 'abscess_le4_pericolic' || rawDivCt === 'abscess_gt4_pelvic',
            abscessSizeCategory: (rawDivCt === 'abscess_le4_pericolic' ? 'le_4cm' : rawDivCt === 'abscess_gt4_pelvic' ? 'gt_4cm' : 'none') as 'none' | 'le_4cm' | 'gt_4cm',
            abscessLocation: (rawDivCt === 'abscess_gt4_pelvic' ? 'pelvic_distant_retroperitoneal' : 'pericolic_mesocolic') as 'pericolic_mesocolic' | 'pelvic_distant_retroperitoneal',
            distantFreeAirGt5cm: rawDivCt === 'distant_air_2b' || rawDivCt === 'diffuse_fluid_with_air_4',
            diffusePeritonealFluid: rawDivCt === 'diffuse_fluid_no_air_3' || rawDivCt === 'diffuse_fluid_with_air_4',
            fecalPeritonitisIntraop: rawDivCt === 'fecal_peritonitis_4',
            isImmunocompromisedOrSeptic: divImmuno,
            isHemodynamicallyUnstable: divUnstable
        };
        const divVal = evaluateDiverticulitisTriad(divParams);
        appState.surgery.diverticulitis = divVal;
        if (divVal && divOutEl) {
            renderClinicalCardResult(divOutEl, {
                title: `WSES Evre ${divVal.wses.stage} | Kaiser Mod. Hinchey Evre ${divVal.kaiserHinchey.stage} | Ambrosetti: ${divVal.ambrosetti.grade === 'severe' ? 'Şiddetli' : 'Orta'}`,
                riskText: divVal.wses.group,
                alertClass: divVal.wses.alertClass,
                recommendations: [
                    `WSES 2020 (${divVal.wses.stageTitle}): ${divVal.wses.managementRecommendation}`,
                    `Kaiser Modifiye Hinchey (${divVal.kaiserHinchey.stageTitle}): ${divVal.kaiserHinchey.managementRecommendation}`,
                    `Ambrosetti BT (${divVal.ambrosetti.gradeTitle}): ${divVal.ambrosetti.prognosticMeaning}`,
                    divVal.systemComparisonNote
                ]
            });
            activeSummaryPills.push({
                tab: 'diverticulitis',
                label: `Divertikülit: WSES ${divVal.wses.stage} / Hinchey ${divVal.kaiserHinchey.stage}`,
                badgeClass: divVal.wses.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : divVal.wses.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.diverticulitis = null;
        if (divOutEl) divOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 5: KARIN DUVARI VE KASIK FITIKLARI (EHS 2007, EHS 2009, Nyhus)
    // =========================================================================
    const groinRec = getVal('select-groin-recurrent') === 'R';
    const groinL = Number(getVal('select-groin-l') || '0') as EHSDefectSize;
    const groinM = Number(getVal('select-groin-m') || '0') as EHSDefectSize;
    const groinF = Number(getVal('select-groin-f') || '0') as EHSDefectSize;
    const groinScrotal = getChk('chk-groin-scrotal');
    const groinBilateral = getChk('chk-groin-bilateral');
    const groinOutEl = getEl('output-groin-hernia');

    if (groinL !== 0 || groinM !== 0 || groinF !== 0) {
        const groinVal = classifyGroinHernia({
            isRecurrent: groinRec,
            lateralSize: groinL,
            medialSize: groinM,
            femoralSize: groinF,
            isPosteriorWallDefectiveOrScrotalOrSliding: groinScrotal,
            isBilateral: groinBilateral,
            isFemale: gender === 'female' || gender === 'F',
            isPediatricOrInfant: y !== null && y < 18
        });
        appState.surgery.groinHernia = groinVal;
        if (groinVal && groinOutEl) {
            renderClinicalCardResult(groinOutEl, {
                title: `EHS Kasık Fıtığı: ${groinVal.ehsCode} ↔ ${groinVal.nyhusTitle}`,
                riskText: groinVal.isCombinedHernia ? 'Kombine Kasık Fıtığı' : 'Tekil Kasık Fıtığı',
                alertClass: groinVal.alertClass === 'info' ? 'success' : groinVal.alertClass,
                recommendations: [
                    `Anatomik Patofizyoloji: ${groinVal.nyhusPathophysiology}`,
                    groinVal.herniaSurge2023Recommendation,
                    groinVal.ehsVsNyhusComparison
                ]
            });
            activeSummaryPills.push({
                tab: 'hernia',
                label: `EHS ${groinVal.ehsCode} (Nyhus ${groinVal.nyhusType})`,
                badgeClass: groinVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : 'bg-sky-950 text-sky-200 border-sky-700'
            });
        }
    } else {
        appState.surgery.groinHernia = null;
        if (groinOutEl) groinOutEl.classList.add('hidden');
    }

    // 5.2. EHS Primer ve İnsizyonel Ventral Fıtık
    const rawVentralZone = getVal('select-ventral-zone');
    const ventralWidthCm = getNum('input-ventral-width-cm');
    const ventralLod = getNum('input-ventral-lod');
    const ventralRec = getChk('chk-ventral-recurrent');
    const ventralW3Mode: EHSW3CutoffMode = getVal('select-ventral-w3-mode') === 'gt_10cm' ? 'gt_10cm' : 'gte_10cm';
    const ventralOutEl = getEl('output-ventral-hernia');

    if (rawVentralZone) {
        const isPrimaryVentral = rawVentralZone.startsWith('prim_');
        const primLoc = rawVentralZone.replace('prim_', '') as PrimaryVentralLocation;
        const incCode = rawVentralZone.replace('inc_', '');
        const medialZones: IncisionalMedialZone[] = incCode.startsWith('M') ? [incCode as IncisionalMedialZone] : [];
        const lateralZones: IncisionalLateralZone[] = incCode.startsWith('L') ? [incCode as IncisionalLateralZone] : [];

        const ventralVal = classifyVentralHernia({
            category: isPrimaryVentral ? 'primary' : 'incisional',
            primaryLocation: isPrimaryVentral ? primLoc : undefined,
            diameterCm: isPrimaryVentral ? ventralWidthCm : undefined,
            medialZones: !isPrimaryVentral ? medialZones : undefined,
            lateralZones: !isPrimaryVentral ? lateralZones : undefined,
            widthCm: !isPrimaryVentral ? ventralWidthCm : undefined,
            w3CutoffMode: ventralW3Mode,
            isRecurrentIncisional: ventralRec,
            ihvPvPercent: ventralLod
        });
        appState.surgery.ventralHernia = ventralVal;
        if (ventralVal && ventralOutEl) {
            const recs: string[] = [
                `Lokalizasyon: ${ventralVal.locationDescription}`,
                ventralVal.surgicalStrategy
            ];
            if (ventralVal.w3BoundaryComparison && ventralVal.w3BoundaryComparison.isBoundary10cm) {
                recs.push(`10 cm Sınır Karşılaştırması: [Muysoms 2009 Orijinal (≥10 cm)]: ${ventralVal.w3BoundaryComparison.muysomsOriginal} vs [Klinik Varyant (>10 cm)]: ${ventralVal.w3BoundaryComparison.clinicalVariant}`);
            }
            if (ventralVal.lossOfDomainWarning) {
                recs.push(ventralVal.lossOfDomainWarning);
            }
            renderClinicalCardResult(ventralOutEl, {
                title: `EHS Karın Duvarı Fıtığı: ${ventralVal.ehsCode}`,
                riskText: ventralVal.sizeOrWidthCategory,
                alertClass: ventralVal.alertClass,
                recommendations: recs
            });
            activeSummaryPills.push({
                tab: 'hernia',
                label: `Ventral: ${ventralVal.ehsCode}`,
                badgeClass: ventralVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : ventralVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.ventralHernia = null;
        if (ventralOutEl) ventralOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 6: HEMOROİDAL HASTALIK (Goligher, BPRST, PNR-Bleed & HSS)
    // =========================================================================
    const rawHemProlapse = getVal('select-hem-prolapse');
    const hemOutEl = getEl('output-hemorrhoid-triad');

    if (rawHemProlapse) {
        const pnrP = Number(rawHemProlapse) as PNRGrade;
        const pnrN = Number(getVal('select-hem-columns') || '1') as PNRGrade;
        const pnrR = Number(getVal('select-hem-relation') || '3') as PNRGrade;
        const pnrB = Number(getVal('select-hem-bleeding') || '2') as PNRGrade;
        const hemSkinTag: 0 | 1 = getChk('chk-hem-skintag') ? 1 : 0;
        const hemThrombosis: 0 | 1 = (getChk('chk-hem-thrombosis') || pnrR === 5) ? 1 : 0;

        const hemVal = evaluateHemorrhoidTriad({
            pnrProlapse: pnrP,
            pnrNumberColumns: pnrN,
            pnrDentateRelation: pnrR,
            pnrBleeding: pnrB,
            sSkinTag: hemSkinTag,
            tThrombosis: hemThrombosis,
            hemoglobinGdl: nHb
        });
        appState.surgery.hemorrhoid = hemVal;
        if (hemVal && hemOutEl) {
            const alertCls = (hemVal.bprst.alertClass === 'danger' || hemVal.pnrBleed.alertClass === 'danger')
                ? 'danger'
                : (hemVal.bprst.alertClass === 'warning' || hemVal.pnrBleed.alertClass === 'warning')
                    ? 'warning'
                    : 'success';
            renderClinicalCardResult(hemOutEl, {
                title: `Goligher Derece ${hemVal.goligher.grade} | BPRST Evre ${hemVal.bprst.stage} (${hemVal.bprst.code}) | PNR-Bleed: ${hemVal.pnrBleed.code} (HSS: ${hemVal.pnrBleed.hssScore}/20)`,
                riskText: hemVal.pnrBleed.severityBand,
                alertClass: alertCls,
                recommendations: [
                    `1. ${hemVal.goligher.gradeTitle}: ${hemVal.goligher.escpAscrsManagement}`,
                    `2. ${hemVal.bprst.stageTitle}: ${hemVal.bprst.therapeuticApproach}`,
                    `3. PNR-Bleed & HSS: ${hemVal.pnrBleed.clinicalSummary}`,
                    hemVal.discordanceAndComparisonNote
                ]
            });
            activeSummaryPills.push({
                tab: 'hemorrhoid',
                label: `Hemoroid: Goligher ${hemVal.goligher.grade} / BPRST ${hemVal.bprst.stage}`,
                badgeClass: alertCls === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : alertCls === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.hemorrhoid = null;
        if (hemOutEl) hemOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 7: PERİANAL FİSTÜL VE APSE (Parks 1976, SJUH MRG 2000, Garg 2017)
    // =========================================================================
    const rawFistulaSphincter = getVal('select-fistula-sphincter') as SphincterInvolvementLevel | '';
    const fistulaOutEl = getEl('output-perianal-fistula');

    if (rawFistulaSphincter) {
        const fistulaVal = evaluatePerianalFistulaTriad({
            sphincterInvolvement: rawFistulaSphincter,
            hasAbscessOrSecondaryTractOrHorseshoe: getChk('chk-fistula-abscess-branch'),
            abscessInIschiorectalFossa: getChk('chk-fistula-ischiorectal'),
            isAnteriorFistulaInFemale: getChk('chk-fistula-anterior-female'),
            hasCrohnsDisease: getChk('chk-fistula-crohn'),
            hasPreExistingSphincterInjuryOrIncontinence: getChk('chk-fistula-sphincter-injury'),
            hasPostRadiationExposure: getChk('chk-fistula-radiation')
        });
        appState.surgery.perianalFistula = fistulaVal;
        if (fistulaVal && fistulaOutEl) {
            renderClinicalCardResult(fistulaOutEl, {
                title: `Parks Tip ${fistulaVal.parks.type} | SJUH MRG Derece ${fistulaVal.sjuhMri.grade} | Garg Derece ${fistulaVal.garg.grade}`,
                riskText: fistulaVal.garg.isFistulotomySafe ? 'Fistülotomi UYGUN (Basit Fistül)' : 'Fistülotomi KONTRENDİKE (Kompleks Fistül)',
                alertClass: fistulaVal.garg.alertClass,
                recommendations: [
                    fistulaVal.garg.surgicalRule,
                    `Parks (${fistulaVal.parks.typeTitle}): ${fistulaVal.parks.fistulotomySuitabilityRateNote}`,
                    `St. James's MRG (${fistulaVal.sjuhMri.gradeTitle}): ${fistulaVal.sjuhMri.prognosticOutcome}`,
                    fistulaVal.discordanceHighlight
                ]
            });
            activeSummaryPills.push({
                tab: 'fistula',
                label: `Fistül: Garg ${fistulaVal.garg.grade} (${fistulaVal.garg.isFistulotomySafe ? 'Basit' : 'Kompleks'})`,
                badgeClass: fistulaVal.garg.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.perianalFistula = null;
        if (fistulaOutEl) fistulaOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 8: KOLOREKTAL KANSER & MALİGN POLİPLER (AJCC 8., Haggitt, Kikuchi)
    // =========================================================================
    const rawCrcT = getVal('select-crc-t') as ColorectalTCategory | '';
    const crcOutEl = getEl('output-crc-tnm');

    if (rawCrcT) {
        const crcPrefix = (getVal('select-crc-prefix') || 'p') as TNMStagingPrefix;
        const crcN = (getVal('select-crc-n') || 'N0') as ColorectalNCategory;
        const crcM = (getVal('select-crc-m') || 'M0') as ColorectalMCategory;
        const crcSite = (getVal('select-crc-site') || 'colon_peritonealized') as ColorectalTumorSite;

        const crcVal = calculateColorectalTNM({
            prefix: crcPrefix,
            tCategory: rawCrcT,
            nCategory: crcN,
            mCategory: crcM,
            tumorSite: crcSite
        });
        appState.surgery.colorectalTnm = crcVal;
        if (crcVal && crcOutEl) {
            const recs: string[] = [
                `${crcVal.tDescription} | ${crcVal.nDescription} | ${crcVal.mDescription}`,
                crcVal.oncologicManagement
            ];
            if (crcVal.survivalParadoxWarning) {
                recs.push(crcVal.survivalParadoxWarning);
            }
            if (crcVal.nonPeritonealizedT4aWarning) {
                recs.push(crcVal.nonPeritonealizedT4aWarning);
            }
            recs.push(crcVal.ajccVersionNote);
            renderClinicalCardResult(crcOutEl, {
                title: `AJCC 8. Baskı Kolorektal TNM: ${crcVal.tnmCode} → ${crcVal.stageGroup}`,
                riskText: crcVal.stageGroup,
                alertClass: crcVal.alertClass === 'info' ? 'success' : crcVal.alertClass,
                recommendations: recs
            });
            activeSummaryPills.push({
                tab: 'oncology',
                label: `TNM: ${crcVal.stageGroup} (${crcVal.tnmCode})`,
                badgeClass: crcVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : crcVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.colorectalTnm = null;
        if (crcOutEl) crcOutEl.classList.add('hidden');
    }

    // 8.2 & 8.3. Haggitt & Kikuchi pT1 Malign Polip
    const rawPolypLevel = getVal('select-polyp-level');
    const polypDepthUm = getNum('input-polyp-depth-um');
    const polypSm2Mode: KikuchiSm2ApproachMode = getVal('select-kikuchi-sm2-mode') === 'individualized_gray_zone'
        ? 'individualized_gray_zone'
        : 'esge_high_risk';
    const polypOutEl = getEl('output-malignant-polyp');

    if (rawPolypLevel) {
        const isSessile = rawPolypLevel.startsWith('kikuchi_');
        const haggittLvl: HaggittLevel = !isSessile
            ? (Number(rawPolypLevel.replace('haggitt_', '')) as HaggittLevel)
            : 4;
        const kikuchiLvl: KikuchiLevel | undefined = isSessile
            ? (rawPolypLevel.replace('kikuchi_', '') as KikuchiLevel)
            : undefined;

        const polypVal = evaluateMalignantPolyp({
            morphology: isSessile ? 'sessile_flat' : 'pedunculated',
            haggittLevel: haggittLvl,
            kikuchiLevel: kikuchiLvl,
            hasMuscularisPropriaInSpecimen: !getChk('chk-polyp-no-mp'),
            invasionDepthMicrometers: polypDepthUm,
            sm2ApproachMode: polypSm2Mode,
            isPiecemealOrPositiveMargin: getChk('chk-polyp-margin'),
            hasLymphovascularInvasion: getChk('chk-polyp-lvi'),
            isPoorlyDifferentiatedG3: getChk('chk-polyp-g3'),
            hasHighTumorBudding: getChk('chk-polyp-budding'),
            isLowerThirdRectum: getChk('chk-polyp-lower-rectum')
        });
        appState.surgery.malignantPolyp = polypVal;
        if (polypVal && polypOutEl) {
            const recs: string[] = [
                polypVal.clinicalRecommendation,
                `Kılavuz Karşılaştırması: [ESGE/ESMO]: ${polypVal.sm2AndMicrometricComparison.esgeGuidelineDecision} | [Nascimbeni 2002]: ${polypVal.sm2AndMicrometricComparison.individualizedNascimbeniDecision}`,
                polypVal.sm2AndMicrometricComparison.muscularisPropriaNote
            ];
            renderClinicalCardResult(polypOutEl, {
                title: `${polypVal.primaryClassificationTitle} (${polypVal.tnmEquivalent})`,
                riskText: `LNM Riski: ${polypVal.estimatedLnmRiskPercent} — ${polypVal.requiresOncologicResection ? 'Onkolojik Rezeksiyon Önerilir' : 'Endoskopik Eksizyon Yeterli'}`,
                alertClass: polypVal.alertClass,
                recommendations: recs
            });
            activeSummaryPills.push({
                tab: 'oncology',
                label: `Polip: ${isSessile ? `Kikuchi ${kikuchiLvl}` : `Haggitt ${haggittLvl}`}`,
                badgeClass: polypVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : polypVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.malignantPolyp = null;
        if (polypOutEl) polypOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 9: SOLİD ORGAN TRAVMALARI (AAST 2018 Dalak/Karaciğer & WSES)
    // =========================================================================
    const rawTraumaParenchymal = getVal('select-trauma-parenchymal');
    const rawTraumaVascular = getVal('select-trauma-vascular');
    const traumaOutEl = getEl('output-solid-organ-trauma');

    if (rawTraumaParenchymal || (rawTraumaVascular && rawTraumaVascular !== 'none')) {
        const traumaOrgan: SolidOrganType = getVal('select-trauma-organ') === 'liver' ? 'liver' : 'spleen';
        const aastVersion: AASTVersionMode = getVal('select-aast-version') === '1994_classic' ? '1994_classic' : '2018_revision';
        const directParenchymal: AASTGrade = rawTraumaParenchymal ? (Number(rawTraumaParenchymal) as AASTGrade) : 1;

        const traumaVal = evaluateSolidOrganTrauma({
            organ: traumaOrgan,
            aastVersion,
            directParenchymalGrade: directParenchymal,
            hasContainedVascularInjuryOrActiveBleeding: rawTraumaVascular === 'contained',
            hasActiveBleedingIntoPeritoneum: rawTraumaVascular === 'peritoneal',
            hasMultipleInjuries: getChk('chk-trauma-multiple'),
            isHemodynamicallyUnstable: getChk('chk-trauma-unstable'),
            systolicBpMmHg: nSysBp,
            heartRateBpm: nHr,
            hasPeritonitisOrOtherLaparotomyIndication: getChk('chk-trauma-peritonitis'),
            ageYears: y
        });
        appState.surgery.solidOrganTrauma = traumaVal;
        if (traumaVal && traumaOutEl) {
            const recs: string[] = [
                traumaVal.anatomicalSummary,
                traumaVal.wsesManagementRecommendation,
                traumaVal.aast2018Vs1994Comparison.explanation,
                traumaVal.spleenVsLiverOrganDifferenceNote
            ];
            if (traumaVal.postEmbolizationFollowUpNote) {
                recs.push(traumaVal.postEmbolizationFollowUpNote);
            }
            renderClinicalCardResult(traumaOutEl, {
                title: `${traumaVal.organLabelTr} Travması: AAST Derece ${traumaVal.activeAastGrade} (2018: ${traumaVal.aastGrade2018} vs 1994: ${traumaVal.aastGrade1994})`,
                riskText: traumaVal.wsesSeverityCategory,
                alertClass: traumaVal.alertClass,
                recommendations: recs
            });
            activeSummaryPills.push({
                tab: 'trauma',
                label: `${traumaVal.organLabelTr}: AAST ${traumaVal.activeAastGrade} / WSES ${traumaVal.wsesClass}`,
                badgeClass: traumaVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : traumaVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.solidOrganTrauma = null;
        if (traumaOutEl) traumaOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 10.1 & 10.2: CLAVIEN-DINDO & KÜMÜLATİF CCI® (2013)
    // =========================================================================
    const c1 = getNum('input-cd-count-1') || 0;
    const c2 = getNum('input-cd-count-2') || 0;
    const c3a = getNum('input-cd-count-3a') || 0;
    const c3b = getNum('input-cd-count-3b') || 0;
    const c4a = getNum('input-cd-count-4a') || 0;
    const c4b = getNum('input-cd-count-4b') || 0;
    const c5 = getNum('input-cd-count-5') || 0;
    const cdDisability = getChk('chk-cd-disability');
    const cdOutEl = getEl('output-clavien-cci');

    if (c1 + c2 + c3a + c3b + c4a + c4b + c5 > 0) {
        const cdVal = calculateClavienDindoCCI({
            counts: { I: c1, II: c2, IIIa: c3a, IIIb: c3b, IVa: c4a, IVb: c4b, V: c5 },
            hasDisabilityAtDischarge: cdDisability
        });
        appState.surgery.clavienDindoCci = cdVal;
        if (cdVal && cdOutEl) {
            renderClinicalCardResult(cdOutEl, {
                title: `Clavien-Dindo: ${cdVal.formattedClavienDindo} | Kümülatif CCI®: ${cdVal.cciScore} / 100`,
                riskText: cdVal.isMajorComplication ? `Majör Komplikasyon (Toplam ${cdVal.totalComplicationCount} olay)` : `Minör Komplikasyon (Toplam ${cdVal.totalComplicationCount} olay)`,
                alertClass: cdVal.alertClass,
                recommendations: [
                    cdVal.clavienVsCciComparison,
                    `En Yüksek Derece Tanımı (${cdVal.highestGrade}): ${cdVal.highestGradeDefinition}`,
                    `Tipik Örnekler: ${cdVal.clinicalExamples}`,
                    cdVal.exclusionReminderNote
                ]
            });
            activeSummaryPills.push({
                tab: 'periop',
                label: `Clavien ${cdVal.formattedClavienDindo} (CCI®: ${cdVal.cciScore})`,
                badgeClass: cdVal.alertClass === 'danger' ? 'bg-rose-950 text-rose-200 border-rose-700' : cdVal.alertClass === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-700' : 'bg-emerald-950 text-emerald-200 border-emerald-700'
            });
        }
    } else {
        appState.surgery.clavienDindoCci = null;
        if (cdOutEl) cdOutEl.classList.add('hidden');
    }

    // =========================================================================
    // SEKME 11: YANIK SIVI RESÜSİTASYONU (ATLS-10 / Parkland) & SÜTÜR REHBERİ
    // =========================================================================
    const tbsa = getNum('input-parkland-tbsa');
    const burnHours = getNum('input-burn-hours');
    const rawBurnType = getVal('select-burn-type');
    const burnType: BurnProtocolType = (rawBurnType === 'electrical' || rawBurnType === 'classic_parkland')
        ? rawBurnType
        : 'atls10_thermal';
    const pkRes = getEl('output-parkland');
    if (tbsa && appState.biometry.weightKg && pkRes) {
        const isPedBurn = (totalMonths !== null && totalMonths < 168) || (y !== null && y < 14);
        const pkVal = calculateParkland(appState.biometry.weightKg, tbsa, y, {
            burnType,
            ageMonths: totalMonths,
            isPediatric: isPedBurn,
            hoursSinceBurn: burnHours
        });
        appState.surgery.parkland = pkVal;
        if (pkVal) {
            pkRes.classList.remove('hidden');
            pkRes.className = 'text-[0.75rem] p-2.5 rounded-lg border border-amber-700/60 bg-slate-900/80 space-y-1 tabular-nums text-slate-200';
            const timeLabel = pkVal.hoursSinceBurn && pkVal.hoursSinceBurn > 0
                ? (pkVal.remainingFirst8Hours && pkVal.remainingFirst8Hours > 0
                    ? `Kalan ${pkVal.remainingFirst8Hours} saat (Yanıktan ${pkVal.hoursSinceBurn}s sonra başvuru)`
                    : `8 saat aşıldı! (${pkVal.hoursSinceBurn}s gecikmiş)`)
                : 'İlk 8 saat';
            let pkHtml = `<div class="text-[0.75rem] font-bold text-amber-300 mb-0.5">${escapeHtml(pkVal.formulaLabel)} (${pkVal.multiplierUsed} mL/kg/%TBSA RL)</div>
                          <strong>Resüsitasyon (24s RL):</strong> ${pkVal.totalVolume} mL<br>
                          <strong>${timeLabel}:</strong> ${pkVal.first8HrsVolume} mL (<strong>${pkVal.first8HrsRate} mL/saat</strong>)<br>
                          <strong>Kalan 16 Saat:</strong> ${pkVal.next16HrsVolume} mL (${pkVal.next16HrsRate} mL/saat)<br>
                          <span class="text-[0.75rem] text-cyan-300">Hedef İdrar Çıkışı: ${escapeHtml(pkVal.urineOutputTarget)}</span>`;
            if (pkVal.requiresDextroseMaintenance && pkVal.maintenanceHourlyMl !== null) {
                pkHtml += `<div class="mt-1 p-1.5 rounded bg-rose-950/60 border border-rose-700/60 text-[0.75rem] text-rose-200 font-semibold space-y-0.5">
                    <div>&lt;30 kg Pediatrik Ek İdame (%5 Dekstrozlu): ${pkVal.maintenanceDailyMl} mL/gün (<strong>${pkVal.maintenanceHourlyMl} mL/saat</strong>)</div>
                    <div class="text-amber-300 font-bold">Toplam İlk 8 Saat İnfüzyon Hızı (Yanık + İdame): ${pkVal.combinedFirst8HoursRate} mL/saat</div>
                </div>`;
            }
            if (pkVal.clinicalNote) {
                pkHtml += `<div class="mt-1 text-[0.75rem] text-slate-300 leading-snug">${escapeHtml(pkVal.clinicalNote)}</div>`;
            }
            pkRes.innerHTML = replaceEmojisWithSvg(pkHtml);
            activeSummaryPills.push({
                tab: 'burn',
                label: `Yanık (%${tbsa}): ${pkVal.first8HrsRate} mL/sa`,
                badgeClass: 'bg-amber-950 text-amber-200 border-amber-700'
            });
        } else {
            pkRes.classList.add('hidden');
        }
    } else if (tbsa && !appState.biometry.weightKg && pkRes) {
        appState.surgery.parkland = null;
        pkRes.classList.remove('hidden');
        pkRes.innerHTML = `<span class="text-amber-400 text-xs">[DİKKAT] Yanık sıvı hesabı için lütfen hasta kilosunu (kg) giriniz.</span>`;
    } else {
        appState.surgery.parkland = null;
        if (pkRes) pkRes.classList.add('hidden');
    }

    // 11.2. SÜTÜR REHBERİ
    const sutureLoc = getVal('select-suture-loc');
    const sutureRes = getEl('output-suture');
    if (sutureLoc && sutureRes) {
        const sutureVal = getSutureGuidance(sutureLoc);
        appState.surgery.suture = sutureVal;
        if (sutureVal) {
            sutureRes.classList.remove('hidden');
            sutureRes.className = 'text-[0.75rem] p-2.5 rounded-lg border border-slate-700/80 bg-slate-900/80 tabular-nums mt-2 text-slate-200';
            sutureRes.innerHTML = `<strong>Materyal:</strong> ${sutureVal.material}<br>
                                   <strong>Boyut:</strong> ${sutureVal.size}<br>
                                   <strong>Alınma:</strong> ${sutureVal.removalDays}`;
            activeSummaryPills.push({
                tab: 'burn',
                label: `Sütür: ${sutureVal.size}`,
                badgeClass: 'bg-sky-950 text-sky-200 border-sky-700'
            });
        } else {
            sutureRes.classList.add('hidden');
        }
    } else {
        appState.surgery.suture = null;
        if (sutureRes) sutureRes.classList.add('hidden');
    }

    // =========================================================================
    // AKTİF CERRAHİ SKOR ÖZET ŞERİDİ GÜNCELLEMESİ
    // =========================================================================
    const summaryContainer = getEl('container-surgery-active-summary');
    const summaryBadge = getEl('badge-surgery-active-count');
    const summaryList = getEl('list-surgery-active-pills');
    if (summaryContainer && summaryBadge && summaryList) {
        if (activeSummaryPills.length > 0) {
            summaryContainer.classList.remove('hidden');
            summaryBadge.textContent = `${activeSummaryPills.length} Aktif`;
            summaryList.innerHTML = activeSummaryPills.map(p => `
                <button type="button" data-jump-surg-tab="${p.tab}" class="px-2 py-0.5 rounded border text-[0.6875rem] font-semibold tabular-nums transition-opacity hover:opacity-90 cursor-pointer ${p.badgeClass}">
                    ${escapeHtml(p.label)}
                </button>
            `).join('');
        } else {
            summaryContainer.classList.add('hidden');
            summaryList.innerHTML = '';
        }
    }

    // =========================================================================
    // KADIN DOĞUM (OBSTETRİK & JİNEKOLOJİ — #card-obgyn)
    // =========================================================================
    const lmp = getVal('input-lmp');
    const eddRes = getEl('output-edd');

    if (lmp && eddRes) {
        const eddVal = calculateObstetrics(lmp);
        if (eddVal && eddVal.isInvalid) {
            appState.obgyn.eddData = null;
            appState.obgyn.trimester = null;
            appState.medicine.pregnancyTrimester = null;
            eddRes.classList.remove('hidden');
            eddRes.innerHTML = replaceEmojisWithSvg(`<span class="text-rose-400 text-xs font-semibold">${escapeHtml(eddVal.error || 'Hatalı SAT: Son adet tarihi gelecekte olamaz (veya >44 hafta olamaz).')}</span>`);
        } else if (eddVal) {
            appState.obgyn.eddData = eddVal;
            appState.obgyn.trimester = eddVal.trimester;
            appState.medicine.pregnancyTrimester = eddVal.trimester;

            const safetyTrimEl = getEl<HTMLSelectElement>('select-safety-trimester');
            if (safetyTrimEl && !safetyTrimEl.dataset.userModified) {
                safetyTrimEl.value = String(eddVal.trimester);
            }

            eddRes.classList.remove('hidden');
            let recHtml = '';
            if (eddVal.recommendations && eddVal.recommendations.length > 0) {
                recHtml = `
                    <div class="mt-1.5 p-2 rounded bg-cyan-950/40 border border-cyan-800/60 text-cyan-200 text-[0.8125rem] space-y-1">
                        <div class="font-bold text-cyan-300 flex items-center gap-1.5">${getSvgIcon('calendar', 'w-3.5 h-3.5 text-cyan-400 shrink-0')}<span>Gestasyonel Hafta Takip Önerileri:</span></div>
                        ${eddVal.recommendations.map(r => `<div>• ${escapeHtml(r)}</div>`).join('')}
                    </div>
                `;
            }
            eddRes.innerHTML = replaceEmojisWithSvg(`
                <div class="text-xs text-slate-200 font-medium">
                    GH: <span class="text-amber-300 font-bold">${escapeHtml(eddVal.gestationalAge)}</span> | TDT: <span class="text-emerald-300 font-bold">${escapeHtml(eddVal.edd)}</span>
                </div>
                ${recHtml}
            `);
        } else {
            appState.obgyn.eddData = null;
            appState.obgyn.trimester = null;
            appState.medicine.pregnancyTrimester = null;
            eddRes.classList.add('hidden');
        }
    } else {
        appState.obgyn.eddData = null;
        appState.obgyn.trimester = null;
        appState.medicine.pregnancyTrimester = null;
        if (eddRes) eddRes.classList.add('hidden');
    }

    const bDil = getNum('input-bishop-dil');
    const bEff = getNum('input-bishop-eff');
    const bSta = getNum('input-bishop-sta');
    const bCon = getNum('input-bishop-con');
    const bPos = getNum('input-bishop-pos');
    const bRes = getEl('output-bishop');
    if (bDil !== null && bEff !== null && bSta !== null && bCon !== null && bPos !== null && bRes) {
        const bishopVal = calculateBishop(bDil, bEff, bSta, bCon, bPos);
        appState.obgyn.bishop = bishopVal;
        if (bishopVal) {
            bRes.classList.remove('hidden');
            bRes.textContent = `Skor: ${bishopVal.score}. ${bishopVal.interpretation}`;
        } else {
            bRes.classList.add('hidden');
        }
    } else {
        appState.obgyn.bishop = null;
        if (bRes) bRes.classList.add('hidden');
    }

    const preSbp = getNum('input-sys-bp');
    const preDbp = getNum('input-dia-bp');
    const prePro = getChk('chk-pre-pro');
    const preSym = getChk('chk-pre-sym');
    const preRes = getEl('output-pre');
    const isExplicitMale = appState.biometry.gender === 'male' || appState.biometry.gender === 'M';
    const isFemaleOrUnspecified = !isExplicitMale;
    const hasObgynContext = Boolean(appState.obgyn.eddData) || prePro || preSym;
    if (preSbp !== null && preDbp !== null && isFemaleOrUnspecified && hasObgynContext && preRes) {
        const symptoms = preSym ? ['symptom'] : [];
        const gestWeeks = appState.obgyn.eddData?.weeks;
        appState.obgyn.preeclampsia = calculatePreeclampsia(preSbp, preDbp, prePro, symptoms, gestWeeks);
        if (appState.obgyn.preeclampsia && appState.obgyn.preeclampsia.diagnosis !== 'Normal') {
            preRes.classList.remove('hidden');
            const alertText = appState.obgyn.preeclampsia.alert ? `<div class="mt-1 text-xs text-rose-200 font-normal leading-relaxed bg-rose-950/40 p-2 rounded border border-rose-800/50">${escapeHtml(appState.obgyn.preeclampsia.alert)}</div>` : '';
            preRes.innerHTML = replaceEmojisWithSvg(`<div class="font-bold text-xs ${appState.obgyn.preeclampsia.isSevere ? 'text-rose-400' : 'text-amber-300'}">${escapeHtml(appState.obgyn.preeclampsia.diagnosis)}</div>${alertText}`);
        } else {
            preRes.classList.add('hidden');
        }
    } else {
        appState.obgyn.preeclampsia = null;
        if (preRes) preRes.classList.add('hidden');
    }
}
