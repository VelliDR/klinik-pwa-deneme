import json

# Load base 125 monographs or current 135
with open('public/data/clinical_monographs.json', 'r', encoding='utf-8') as f:
    monographs = json.load(f)

mono_by_id = {m['id']: m for m in monographs}

# Helper to ensure all required classic monograph fields exist
def ensure_classic_fields(m, id_str, gen_tr, gen_en, atc, drug_class, ind, adult, ped, max_d, renal, hep, preg, contra, pearls):
    m['id'] = id_str
    m['genericTr'] = gen_tr
    m['genericEn'] = gen_en
    m['atcCodes'] = atc if isinstance(atc, list) else [atc]
    if 'genericKeywords' not in m or not m['genericKeywords']:
        m['genericKeywords'] = [gen_en, gen_tr.lower(), gen_tr.split()[0].lower()]
    if 'brandExamples' not in m:
        m['brandExamples'] = []
    m['drugClass'] = drug_class
    m['indications'] = ind
    m['adultDose'] = adult
    m['pediatricDose'] = ped
    m['maxDailyDose'] = max_d
    m['renalAdjustment'] = renal
    m['hepaticAdjustment'] = hep
    m['pregnancyLactation'] = preg
    m['contraindications'] = contra
    m['clinicalPearls'] = pearls

# 10 new drugs if not present
new_drugs_data = [
    {
        'id': 'cefotaxime',
        'genericTr': 'Sefotaksim',
        'genericEn': 'cefotaxime',
        'atcCodes': ['J01DD01'],
        'genericKeywords': ['cefotaxime', 'sefotaksim', 'claforan', 'taxim'],
        'brandExamples': ['Claforan', 'Taxim', 'Sefotaksim'],
        'drugClass': '3. Kuşak Sefalosporin Antibakteriyel',
        'indications': 'Yenidoğan ve infant sepsisi, bakteriyel menenjit, hastane kökenli pnömoni ve intraabdominal enfeksiyonlar.',
        'adultDose': 'Günde 2-3 kez 1-2 g IV/IM (Ağır enfeksiyon ve menenjitte 6-8 saatte bir 2 g).',
        'pediatricDose': 'Yenidoğan (<28 gün): 100-150 mg/kg/gün IV 2-3 doza bölünmüş (Menenjitte 200 mg/kg/gün); Çocuk (>1 ay): 100-200 mg/kg/gün IV 3-4 doza bölünmüş.',
        'maxDailyDose': 'Erişkinde 12 g/gün; Pediatride 200 mg/kg/gün (menenjitte maks 300 mg/kg/gün veya 12 g/gün).',
        'renalAdjustment': 'eGFR 30-50 mL/dk: Doz aralığı q12h; eGFR 10-29 mL/dk: Doz aralığı q12-24h; eGFR <10: Standart tek dozun %50 si q24h.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez; karaciğer yetmezliğinde güvenle kullanılır.',
        'pregnancyLactation': 'PLLR Gebelik: Trimester 1, 2 ve 3 te güvenlidir. Laktasyon: COMPATIBLE (RID: %1.5).',
        'contraindications': 'Sefalosporin grubu antibiyotiklere veya beta-laktamlara karşı anafilaktik aşırı duyarlılık.',
        'clinicalPearls': 'Yenidoğanlarda ve ≤28 günlük infantlarda seftriakson kalsiyum presipitasyonu ve kernikterus riski nedeniyle kontrendikedir; sefotaksim yenidoğan sepsisi ve menenjitinde mutlak ilk tercih güvenli sefalosporindir.',
        'drug_id': 'cefotaxime',
        'generic_name': 'Sefotaksim Sodyum',
        'atc_code': 'J01DD01',
        'formulations': [
            {
                'form_name': 'Sefotaksim 500 mg IM/IV Enjeksiyonluk Toz Flakon',
                'concentration_mg_per_ml': 100.0,
                'concentration_display': '500 mg / 5 mL (100 mg/mL seyreltme)',
                'measuring_device': 'none',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            },
            {
                'form_name': 'Sefotaksim 1000 mg IM/IV Enjeksiyonluk Toz Flakon',
                'concentration_mg_per_ml': 100.0,
                'concentration_display': '1000 mg / 10 mL (100 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 1000.0,
                'standard_interval_hours': [8, 12],
                'max_daily_dose_mg': 12000.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Yenidoğan ve İnfant Sepsisi (≤28 Gün Güvenli İlk Tercih)',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 50.0,
                    'interval_hours': 8,
                    'max_daily_dose_mg_per_kg': 150.0,
                    'absolute_max_single_dose_mg': 2000.0,
                    'absolute_max_daily_dose_mg': 8000.0,
                    'weight_metric_in_obesity': 'TBW'
                },
                {
                    'indication': 'Pediatrik Bakteriyel Menenjit',
                    'min_age_months': 0.5,
                    'min_weight_kg': 2.5,
                    'dose_per_kg_single': 75.0,
                    'interval_hours': 6,
                    'max_daily_dose_mg_per_kg': 300.0,
                    'absolute_max_single_dose_mg': 2000.0,
                    'absolute_max_daily_dose_mg': 12000.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 50.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Doz ayarlaması gerekmez.'
                },
                {
                    'egfr_min': 20.0,
                    'egfr_max': 49.9,
                    'action_type': 'INTERVAL_EXTENSION',
                    'adjustment_instruction': 'Doz aralığı 12 saate çıkarılır (q12h).'
                },
                {
                    'egfr_min': 0.0,
                    'egfr_max': 19.9,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Doz %50 azaltılır veya aralık 24 saate uzatılır (q24h).'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Karaciğer yetmezliğinde doz ayarlaması gerekmez.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Gebelikte güvenle kullanılır; fetal toksisite riski yoktur.',
                'second_trimester': 'Güvenlidir.',
                'third_trimester': 'Güvenlidir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Anne sütüne düşük konsantrasyonda geçer; emzirme ile uyumludur.',
                'relative_infant_dose_percent': 1.5,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Sefalosporin ve beta-laktam anafilaksisi'],
            'neonatal_specific_notes': 'Yenidoğanda seftriakson yerine tercih edilen altın standart 3. kuşak sefalosporindir; safra çamuru ve kalsiyum presipitasyonu yapmaz.'
        },
        'metadata': {
            'source_documents': ['AAP Red Book: Cefotaxime', 'TİTCK Sefotaksim KÜB', 'Harriet Lane Handbook 23rd Ed'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'ampicillin',
        'genericTr': 'Ampisilin',
        'genericEn': 'ampicillin',
        'atcCodes': ['J01CA01'],
        'genericKeywords': ['ampicillin', 'ampisilin', 'alfasilin', 'makposilin', 'ampisina'],
        'brandExamples': ['Alfasilin', 'Makposilin', 'Ampisina'],
        'drugClass': 'Geniş Spektrumlu Aminopenisilin Antibakteriyel',
        'indications': 'Yenidoğan sepsisi (Listeria monocytogenes ve Grup B Streptokok), konjenital menenjit, enterokok bakteriyemisi ve solunum yolu enfeksiyonları.',
        'adultDose': '6 saatte bir 500 mg - 2 g IV/IM.',
        'pediatricDose': 'Yenidoğan: 100-150 mg/kg/gün IV 2-3 doza bölünmüş (Listeria menenjitinde 200-300 mg/kg/gün); Çocuk: 100-200 mg/kg/gün IV 4 doza bölünmüş (q6h).',
        'maxDailyDose': 'Erişkinde 12 g/gün; Pediatride menenjitte maks 300-400 mg/kg/gün (maks 12 g/gün).',
        'renalAdjustment': 'eGFR 30-50: Doz aralığı q6-8h; eGFR 10-29: q8-12h; eGFR <10: q12-16h.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Trimester 1, 2 ve 3 te güvenlidir. Laktasyon: COMPATIBLE (RID: %0.8).',
        'contraindications': 'Penisilin ve beta-laktam grubu antibiyotiklere anafilaksi öyküsü.',
        'clinicalPearls': 'Yenidoğan erken sepsis protokolünde gentamisin ile kombine edilerek Listeria ve GBS suşlarına karşı sinerjistik bakterisidal koruma sağlar.',
        'drug_id': 'ampicillin',
        'generic_name': 'Ampisilin Sodyum',
        'atc_code': 'J01CA01',
        'formulations': [
            {
                'form_name': 'Ampisilin 250 mg Flakon',
                'concentration_mg_per_ml': 50.0,
                'concentration_display': '250 mg / 5 mL (50 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            },
            {
                'form_name': 'Ampisilin 500 mg Flakon',
                'concentration_mg_per_ml': 100.0,
                'concentration_display': '500 mg / 5 mL (100 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            },
            {
                'form_name': 'Ampisilin 1000 mg Flakon',
                'concentration_mg_per_ml': 100.0,
                'concentration_display': '1000 mg / 10 mL (100 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': '25C altında saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 1000.0,
                'standard_interval_hours': [6],
                'max_daily_dose_mg': 12000.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Yenidoğan Erken Sepsisi (GBS ve Listeria Monocytogenes)',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 50.0,
                    'interval_hours': 8,
                    'max_daily_dose_mg_per_kg': 150.0,
                    'absolute_max_single_dose_mg': 2000.0,
                    'absolute_max_daily_dose_mg': 6000.0,
                    'weight_metric_in_obesity': 'TBW'
                },
                {
                    'indication': 'Neonatal ve Pediatrik Listeria Menenjiti',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.5,
                    'dose_per_kg_single': 75.0,
                    'interval_hours': 6,
                    'max_daily_dose_mg_per_kg': 300.0,
                    'absolute_max_single_dose_mg': 2000.0,
                    'absolute_max_daily_dose_mg': 12000.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 50.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Doz ayarlaması gerekmez.'
                },
                {
                    'egfr_min': 10.0,
                    'egfr_max': 49.9,
                    'action_type': 'INTERVAL_EXTENSION',
                    'adjustment_instruction': 'Doz aralığı 8-12 saate açılır (q8-12h).'
                },
                {
                    'egfr_min': 0.0,
                    'egfr_max': 9.9,
                    'action_type': 'INTERVAL_EXTENSION',
                    'adjustment_instruction': 'Doz aralığı 12-16 saate açılır (q12-16h).'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Doz ayarlaması gerekmez.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Gebelikte güvenle kullanılır.',
                'second_trimester': 'Güvenlidir.',
                'third_trimester': 'Güvenlidir; intrapartum GBS profilaksisinde ilk tercihtir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Anne sütüne düşük oranda geçer; emzirme ile uyumludur.',
                'relative_infant_dose_percent': 0.8,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Penisilin anafilaksisi'],
            'neonatal_specific_notes': 'Yenidoğan sepsisinde gentamisin ile kombine edilerek sinerjistik bakterisidal etkinlik ve Listeria kapsama sağlanır.'
        },
        'metadata': {
            'source_documents': ['AAP Neonatal Sepsis Clinical Report', 'TİTCK Ampisilin KÜB'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'gentamicin',
        'genericTr': 'Gentamisin',
        'genericEn': 'gentamicin',
        'atcCodes': ['J01GB03'],
        'genericKeywords': ['gentamicin', 'gentamisin', 'getamisin', 'gensina'],
        'brandExamples': ['Genta', 'Gensina', 'Getamisin'],
        'drugClass': 'Aminoglikozit Antibakteriyel',
        'indications': 'Yenidoğan sepsisi, Gram-negatif bakteriyemi, komplike idrar yolu enfeksiyonları ve intraabdominal enfeksiyonlar.',
        'adultDose': 'Günde tek doz 5-7 mg/kg IV veya 8 saatte bir 1.5-2 mg/kg IV/IM.',
        'pediatricDose': 'Yenidoğan: Gestasyonel yaşa göre 4-5 mg/kg IV 24-36 saatte bir; Çocuk (>1 ay): 5-7.5 mg/kg/gün IV tek doz veya 8 saatte bir 2-2.5 mg/kg.',
        'maxDailyDose': 'Erişkinde 7 mg/kg/gün; Pediatride 7.5 mg/kg/gün.',
        'renalAdjustment': 'Böbrek yetmezliğinde doz aralığı uzatılır (q24-48h); serum çukur düzeyi (<1 mcg/mL) kontrol edilmeden sonraki doz verilmemelidir.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Trimester 1, 2, 3 te fetal sekizinci kranial sinir hasarı ve nefrotoksisite riski; alternatif yoksa yakın izlem. Laktasyon: COMPATIBLE (RID: %2.0).',
        'contraindications': 'Aminoglikozit aşırı duyarlılığı, miyastenia gravis.',
        'clinicalPearls': 'Nefrotoksisite ve irreversibl koklear/vestibüler ototoksisite riski taşır; 48 saati aşan tedavilerde serum çukur (<1 mcg/mL) ve tepe (5-10 mcg/mL) konsantrasyonları mutlaka takip edilmelidir.',
        'drug_id': 'gentamicin',
        'generic_name': 'Gentamisin Sülfat',
        'atc_code': 'J01GB03',
        'formulations': [
            {
                'form_name': 'Gentamisin 40 mg / 1 mL Ampul',
                'concentration_mg_per_ml': 40.0,
                'concentration_display': '40 mg / 1 mL (40 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            },
            {
                'form_name': 'Gentamisin 80 mg / 2 mL Ampul',
                'concentration_mg_per_ml': 40.0,
                'concentration_display': '80 mg / 2 mL (40 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': '25C altında saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 350.0,
                'standard_interval_hours': [24],
                'max_daily_dose_mg': 500.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Yenidoğan Gram-Negatif Sepsisi (Genişletilmiş Aralık Protokolü)',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 4.5,
                    'interval_hours': 24,
                    'max_daily_dose_mg_per_kg': 5.0,
                    'absolute_max_single_dose_mg': 120.0,
                    'absolute_max_daily_dose_mg': 120.0,
                    'weight_metric_in_obesity': 'TBW'
                },
                {
                    'indication': 'Pediatrik Ağır Gram-Negatif Enfeksiyon (>1 Ay)',
                    'min_age_months': 1.0,
                    'min_weight_kg': 3.0,
                    'dose_per_kg_single': 7.5,
                    'interval_hours': 24,
                    'max_daily_dose_mg_per_kg': 7.5,
                    'absolute_max_single_dose_mg': 300.0,
                    'absolute_max_daily_dose_mg': 300.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 50.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Standart doz; serum çukur düzeyi izlenir.'
                },
                {
                    'egfr_min': 30.0,
                    'egfr_max': 49.9,
                    'action_type': 'INTERVAL_EXTENSION',
                    'adjustment_instruction': 'Doz aralığı 36-48 saate uzatılır; çukur düzeyi <1 mcg/mL olmalıdır.'
                },
                {
                    'egfr_min': 0.0,
                    'egfr_max': 29.9,
                    'action_type': 'CONTRAINDICATED',
                    'adjustment_instruction': 'Ağır böbrek yetmezliğinde aminoglikozitlerden kaçınılmalı, terapötik ilaç izlemi yapılmalıdır.'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Doz ayarlaması gerekmez.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'D',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Fetal sekizinci sinir hasarı ve nefrotoksisite riski; zorunlu olmadıkça kullanılmamalıdır.',
                'second_trimester': 'Yalnızca yaşamı tehdit eden ağır sepsiste alternatif yoksa izlemle verilir.',
                'third_trimester': 'Maternal sepsis durumunda yakın monitörizasyonla kullanılabilir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Oral biyoyararlanımı son derece düşüktür; anne sütünden bebekte sistemik emilimi ihmal edilebilir düzeydedir.',
                'relative_infant_dose_percent': 2.0,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [
                'Nefrotoksisite ve irreversibl ototoksisite (vestibüler ve koklear hasar) riski; serum çukur ve tepe düzeyleri izlenmelidir.'
            ],
            'absolute_contraindications': ['Aminoglikozit aşırı duyarlılığı', 'Miyastenia gravis'],
            'neonatal_specific_notes': 'Neonatal dönemde uzamış yarılanma ömrü nedeniyle doz aralığı 24-36 saat olarak planlanmalıdır.'
        },
        'metadata': {
            'source_documents': ['AAP Red Book Gentamicin Dosing', 'TİTCK Gentamisin KÜB', 'Harriet Lane Handbook'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'phenobarbital',
        'genericTr': 'Fenobarbital',
        'genericEn': 'phenobarbital',
        'atcCodes': ['N03AA02'],
        'genericKeywords': ['phenobarbital', 'fenobarbital', 'luminal', 'phenemal'],
        'brandExamples': ['Luminal', 'Luminaletten', 'Fenobarbital'],
        'drugClass': 'Barbitürat Antikonvülzan / Sedatif',
        'indications': 'Neonatal nöbetler (ilk basamak altın standart), status epileptikus ikinci basamak tedavisi ve febril konvülsiyon profilaksisi.',
        'adultDose': 'Status için 15-20 mg/kg IV yükleme (maks 100 mg/dk); idame 1-3 mg/kg/gün oral/IV.',
        'pediatricDose': 'Yenidoğan nöbeti: 20 mg/kg IV yükleme (maks 1 mg/kg/dk hızda yavaş IV); yanıtsızsa 5-10 mg/kg ek doz (maks 40 mg/kg). İdame: 3-5 mg/kg/gün 1-2 doza bölünmüş.',
        'maxDailyDose': 'Erişkinde 1000 mg yükleme; Yenidoğanda toplam 40 mg/kg/gün kümülatif yükleme.',
        'renalAdjustment': 'eGFR <10: Doz aralığı q12-16h açılır; hemodiyaliz sonrası ek doz gerekir.',
        'hepaticAdjustment': 'Ağır karaciğer yetmezliğinde eliminasyonu belirgin yavaşlar; doz %50 azaltılmalı ve sedasyon izlenmelidir.',
        'pregnancyLactation': 'PLLR: Trimester 1 de majör teratojenik risk (konjenital kalp defektleri, yarık damak/dudak); Trimester 3 te neonatal kanama ve yoksunluk. Laktasyon: USE_WITH_CAUTION (RID: %8.0; bebekte sedasyon ve kilo alımı izlenmelidir).',
        'contraindications': 'Akut intermittan porfiri, ağır solunum depresyonu, barbitürat aşırı duyarlılığı.',
        'clinicalPearls': 'Yenidoğan nöbetlerinde dünyada ve Türkiye de halen ilk tercih altın standart ilaçtır. Yükleme dozu mutlaka 20 mg/kg olmalıdır; düşük yükleme (<15 mg/kg) nöbet kontrol başarısızlığına neden olur.',
        'drug_id': 'phenobarbital',
        'generic_name': 'Fenobarbital Sodyum',
        'atc_code': 'N03AA02',
        'formulations': [
            {
                'form_name': 'Luminal 100 mg / 1 mL Ampul',
                'concentration_mg_per_ml': 100.0,
                'concentration_display': '100 mg / 1 mL (100 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            },
            {
                'form_name': 'Luminal 200 mg / 2 mL Ampul',
                'concentration_mg_per_ml': 100.0,
                'concentration_display': '200 mg / 2 mL (100 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': '25C altında saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 100.0,
                'standard_interval_hours': [12, 24],
                'max_daily_dose_mg': 400.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Neonatal Nöbet İlk Basamak Altın Standart (IV Yükleme)',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 20.0,
                    'interval_hours': 24,
                    'max_daily_dose_mg_per_kg': 40.0,
                    'absolute_max_single_dose_mg': 1000.0,
                    'absolute_max_daily_dose_mg': 1000.0,
                    'weight_metric_in_obesity': 'TBW'
                },
                {
                    'indication': 'Neonatal Nöbet İdame Tedavisi',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 2.0,
                    'interval_hours': 12,
                    'max_daily_dose_mg_per_kg': 5.0,
                    'absolute_max_single_dose_mg': 50.0,
                    'absolute_max_daily_dose_mg': 100.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 10.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Standart doz; sedasyon izlenir.'
                },
                {
                    'egfr_min': 0.0,
                    'egfr_max': 9.9,
                    'action_type': 'INTERVAL_EXTENSION',
                    'adjustment_instruction': 'Doz aralığı 12-16 saate açılır (q12-16h).'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Ağır karaciğer yetmezliğinde doz %50 azaltılmalı; sedasyon ve solunum izlenmelidir.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'D',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Majör teratojenik risk (kardiyovasküler anomali, yarık damak/dudak); zorunlu olmadıkça başlanmamalıdır.',
                'second_trimester': 'Fetal büyüme geriliği ve mikrosefali riski; en düşük etkili doz uygulanır.',
                'third_trimester': 'Doğumda neonatal solunum depresyonu ve K vitamini eksikliğine bağlı kanama riski.'
            },
            'lactation': {
                'lactmed_record_summary': 'Anne sütüne geçer; infantta belirgin sedasyon, emme zayıflığı ve kilo alamama riski izlenmelidir.',
                'relative_infant_dose_percent': 8.0,
                'safety_verdict': 'USE_WITH_CAUTION'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [
                'Hızlı IV enjeksiyonda solunum arresti, hipotansiyon ve laringospazm riski; infüzyon hızı 1 mg/kg/dk üzerine çıkmamalıdır.'
            ],
            'absolute_contraindications': ['Akut intermittan porfiri', 'Ağır solunum depresyonu'],
            'neonatal_specific_notes': 'Yenidoğan nöbetlerinde dünyada ve Türkiye de 1. tercih altın standarttır; yükleme dozu mutlaka 20 mg/kg olmalıdır (düşük doz yanıtsızlığa yol açar).'
        },
        'metadata': {
            'source_documents': ['WHO Guidelines on Neonatal Seizures', 'ILAE Seizure Classification & Protocols', 'TİTCK Luminal KÜB'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'acyclovir',
        'genericTr': 'Asiklovir',
        'genericEn': 'acyclovir',
        'atcCodes': ['J05AB01'],
        'genericKeywords': ['acyclovir', 'asiklovir', 'zovirax', 'aklovir'],
        'brandExamples': ['Zovirax', 'Aklovir', 'Asiviral'],
        'drugClass': 'Nükleozit Analoğu Antiviral Ajan',
        'indications': 'Neonatal HSV sepsisi/ensefaliti, pediatrik herpes simpleks ensefaliti, varisella zoster (suçiçeği) ve mukokutanöz HSV.',
        'adultDose': 'Oral: Günde 5 kez 200-800 mg; IV: 8 saatte bir 5-10 mg/kg (ensefalitte 10 mg/kg q8h).',
        'pediatricDose': 'Yenidoğan HSV ensefaliti: 20 mg/kg IV 8 saatte bir (en az 21 gün); Çocuk (>3 ay): 10-20 mg/kg (veya 500 mg/m2) IV 8 saatte bir.',
        'maxDailyDose': 'Erişkinde 30 mg/kg/gün IV; Pediatride 60 mg/kg/gün IV.',
        'renalAdjustment': 'eGFR 25-50: q12h; eGFR 10-25: q24h; eGFR <10: Standart tek dozun %50 si q24h.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Trimester 1, 2 ve 3 te güvenlidir. Laktasyon: COMPATIBLE (RID: %1.0).',
        'contraindications': 'Asiklovir veya valasiklovire aşırı duyarlılık.',
        'clinicalPearls': 'IV infüzyon en az 1 saatte uygulanmalı ve böbrek tübüllerinde kristal presipitasyonu ile akut böbrek hasarını önlemek için hastaya bol hidrasyon sağlanmalıdır.',
        'drug_id': 'acyclovir',
        'generic_name': 'Asiklovir Sodyum',
        'atc_code': 'J05AB01',
        'formulations': [
            {
                'form_name': 'Asiklovir 250 mg IV İnfüzyonluk Kuru Toz Flakon',
                'concentration_mg_per_ml': 25.0,
                'concentration_display': '250 mg / 10 mL (25 mg/mL seyreltme)',
                'measuring_device': 'none',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            },
            {
                'form_name': 'Asiklovir 200 mg / 5 mL Oral Süspansiyon (Zovirax)',
                'concentration_mg_per_ml': 40.0,
                'concentration_display': '200 mg / 5 mL (40 mg/mL)',
                'measuring_device': 'oral_syringe',
                'storage_condition': 'Oda sıcaklığında saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 500.0,
                'standard_interval_hours': [8],
                'max_daily_dose_mg': 2400.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Neonatal HSV Sepsis ve Ensefaliti (Mortalite Azaltıcı Altın Standart)',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 20.0,
                    'interval_hours': 8,
                    'max_daily_dose_mg_per_kg': 60.0,
                    'absolute_max_single_dose_mg': 1000.0,
                    'absolute_max_daily_dose_mg': 3000.0,
                    'weight_metric_in_obesity': 'TBW'
                },
                {
                    'indication': 'Pediatrik Viral Ensefalit (>3 Ay)',
                    'min_age_months': 3.0,
                    'min_weight_kg': 5.0,
                    'dose_per_kg_single': 15.0,
                    'interval_hours': 8,
                    'max_daily_dose_mg_per_kg': 45.0,
                    'absolute_max_single_dose_mg': 1000.0,
                    'absolute_max_daily_dose_mg': 3000.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 50.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Standart doz; hidrasyon sağlanır.'
                },
                {
                    'egfr_min': 25.0,
                    'egfr_max': 49.9,
                    'action_type': 'INTERVAL_EXTENSION',
                    'adjustment_instruction': 'Doz aralığı 12 saate uzatılır (q12h).'
                },
                {
                    'egfr_min': 10.0,
                    'egfr_max': 24.9,
                    'action_type': 'INTERVAL_EXTENSION',
                    'adjustment_instruction': 'Doz aralığı 24 saate uzatılır (q24h).'
                },
                {
                    'egfr_min': 0.0,
                    'egfr_max': 9.9,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Doz %50 azaltılarak 24 saatte bir uygulanır (q24h).'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Doz ayarlaması gerekmez.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Gebelikte güvenle kullanılır; konjenital malformasyon riskinde artış gösterilmemiştir.',
                'second_trimester': 'Güvenlidir.',
                'third_trimester': 'Güvenlidir; genital HSV reaktivasyonunda ve neonatal geçiş profilaksisinde önerilir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Anne sütüne düşük konsantrasyonda geçer; bebekte toksisite bildirilmemiştir.',
                'relative_infant_dose_percent': 1.0,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Asiklovir veya valasiklovire aşırı duyarlılık'],
            'neonatal_specific_notes': 'Böbrek tübüllerinde kristal presipitasyonu ve akut tübüler nekroz riskini önlemek için bol hidrasyon sağlanmalı ve infüzyon süresi en az 1 saat tutulmalıdır.'
        },
        'metadata': {
            'source_documents': ['AAP Red Book: Neonatal HSV Guidelines', 'TİTCK Asiklovir KÜB'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'oseltamivir',
        'genericTr': 'Oseltamivir',
        'genericEn': 'oseltamivir',
        'atcCodes': ['J05AH02'],
        'genericKeywords': ['oseltamivir', 'tamiflu', 'enfluvir', 'oseflu'],
        'brandExamples': ['Tamiflu', 'Enfluvir', 'Oseflu'],
        'drugClass': 'Nöraminidaz İnhibitörü Antiviral',
        'indications': 'İnfluenza A ve B virüsü enfeksiyonlarının tedavisi ve temas sonrası profilaksisi.',
        'adultDose': 'Tedavi: Günde 2 kez 75 mg oral 5 gün; Profilaksi: Günde 1 kez 75 mg oral 10 gün.',
        'pediatricDose': '<1 yaş infant: 3 mg/kg/doz günde 2 kez (BID) 5 gün; ≥1 yaş: ≤15 kg: 30 mg BID; 15.1-23 kg: 45 mg BID; 23.1-40 kg: 60 mg BID; >40 kg: 75 mg BID.',
        'maxDailyDose': 'Erişkinde 150 mg/gün; Pediatride 150 mg/gün.',
        'renalAdjustment': 'eGFR 30-60: Günde 1 kez 30 mg (veya 30 mg BID yerine QD); eGFR 10-29: Günde 1 kez 30 mg; eGFR <10: Önerilmez.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Trimester 1, 2 ve 3 te influenza mortalitesini önlemede güvenli ve endikedir. Laktasyon: COMPATIBLE (RID: %0.5).',
        'contraindications': 'Oseltamivire veya formülasyon bileşenlerine aşırı duyarlılık.',
        'clinicalPearls': 'Semptomların ilk 48 saatinde başlandığında maksimum klinik fayda sağlar; komplikasyon riski yüksek çocuklarda (astım, immünsüpresyon) 48 saatten sonra da başlanmalıdır.',
        'drug_id': 'oseltamivir',
        'generic_name': 'Oseltamivir Fosfat',
        'atc_code': 'J05AH02',
        'formulations': [
            {
                'form_name': 'Tamiflu 30 mg / 5 mL Oral Süspansiyon Hazırlamak İçin Toz',
                'concentration_mg_per_ml': 6.0,
                'concentration_display': '30 mg / 5 mL (6 mg/mL)',
                'measuring_device': 'oral_syringe',
                'reconstitution_stability_days': 10,
                'storage_condition': 'Sulandırıldıktan sonra 2-8C buzdolabında 10 gün veya 25C altında 10 gün saklanabilir'
            },
            {
                'form_name': 'Tamiflu 75 mg Kapsül',
                'concentration_mg_per_ml': 75.0,
                'concentration_display': '75 mg kapsül',
                'measuring_device': 'none',
                'storage_condition': 'Oda sıcaklığında saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 75.0,
                'standard_interval_hours': [12],
                'max_daily_dose_mg': 150.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'İnfluenza Tedavisi (<1 Yaş Bebekler)',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.5,
                    'dose_per_kg_single': 3.0,
                    'interval_hours': 12,
                    'max_daily_dose_mg_per_kg': 6.0,
                    'absolute_max_single_dose_mg': 30.0,
                    'absolute_max_daily_dose_mg': 60.0,
                    'weight_metric_in_obesity': 'TBW'
                },
                {
                    'indication': 'İnfluenza Tedavisi (≥1 Yaş ve Kilo Bantları)',
                    'min_age_months': 12.0,
                    'min_weight_kg': 10.0,
                    'dose_per_kg_single': 2.0,
                    'interval_hours': 12,
                    'max_daily_dose_mg_per_kg': 4.0,
                    'absolute_max_single_dose_mg': 75.0,
                    'absolute_max_daily_dose_mg': 150.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 60.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Standart doz (q12h).'
                },
                {
                    'egfr_min': 30.0,
                    'egfr_max': 59.9,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Tedavi dozu 30 mg BID veya günde bir kez 75 mg verilir.'
                },
                {
                    'egfr_min': 10.0,
                    'egfr_max': 29.9,
                    'action_type': 'INTERVAL_EXTENSION',
                    'adjustment_instruction': 'Günde tek doza düşürülür (30 mg q24h).'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Hafif-orta karaciğer yetmezliğinde doz ayarlaması gerekmez.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Maternal influenza mortalitesini belirgin azaltır; gebeliğin her döneminde güvenle kullanılır.',
                'second_trimester': 'Güvenlidir.',
                'third_trimester': 'Güvenlidir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Anne sütüne son derece düşük konsantrasyonda geçer; emzirme ile uyumludur.',
                'relative_infant_dose_percent': 0.5,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Oseltamivire aşırı duyarlılık'],
            'neonatal_specific_notes': 'Prematüre bebeklerde klerens düşüktür; AAP gebelik haftasına göre uyarlanmış doz önerir (0-8 ay: 3 mg/kg BID).'
        },
        'metadata': {
            'source_documents': ['CDC Influenza Antiviral Guidelines', 'AAP Influenza Guidance', 'TİTCK Tamiflu KÜB'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'morphine',
        'genericTr': 'Morfin',
        'genericEn': 'morphine',
        'atcCodes': ['N02AA01'],
        'genericKeywords': ['morphine', 'morfin', 'morphine sulfate', 'mst'],
        'brandExamples': ['Morfin HCl', 'Morphine Sulfate', 'MST Continus'],
        'drugClass': 'Opioid Analjezik (Saf Mu Agonisti)',
        'indications': 'Pediatrik ciddi akut ağrı (travma, yanık, cerrahi), orak hücre krizleri, tetraloji büyümelerinde hipoksik spell sedasyonu ve palyatif bakım.',
        'adultDose': 'IV/SC: 2.5-5 mg 3-4 saatte bir; Oral: 10-20 mg 4 saatte bir.',
        'pediatricDose': 'Yenidoğan: 0.025-0.05 mg/kg yavaş IV; Çocuk: 0.05-0.1 mg/kg yavaş IV/SC 2-4 saatte bir (maks tek doz 5 mg).',
        'maxDailyDose': 'Erişkinde titre edilir; Pediatride akut ağrıda tek doz maks 5 mg (günlük maks 0.4 mg/kg veya 20 mg).',
        'renalAdjustment': 'Aktif metabolit (morfin-6-glukuronid) birikebilir; eGFR 30-50: Doz %25 azaltılır; eGFR <30: Doz %50 azaltılır veya fentanil tercih edilir.',
        'hepaticAdjustment': 'Ağır karaciğer yetmezliğinde eliminasyonu uzar; başlangıç dozu %50 azaltılır.',
        'pregnancyLactation': 'PLLR: Trimester 1, 2 de dikkat; Trimester 3 ve doğum öncesi kullanım yenidoğanda solunum depresyonu yapabilir. Laktasyon: USE_WITH_CAUTION (RID: %6.0; bebekte sedasyon ve apne takibi).',
        'contraindications': 'Akut solunum depresyonu, obstrüktif havayolu hastalığı, paralitik ileus, kafa içi basınç artışı (KİBAS).',
        'clinicalPearls': 'Kodein ve tramadolün aksine CYP2D6 metabolizmasından bağımsız glukuronidasyonla atılır; bu nedenle çocuklarda ve yenidoğanda en güvenli opioid seçeneğidir. Solunum depresyonuna karşı yatağında nalokson hazır bulundurulmalıdır.',
        'drug_id': 'morphine',
        'generic_name': 'Morfin Hidroklorür',
        'atc_code': 'N02AA01',
        'formulations': [
            {
                'form_name': 'Morfin Hidroklorür 10 mg / 1 mL Ampul',
                'concentration_mg_per_ml': 10.0,
                'concentration_display': '10 mg / 1 mL (10 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': 'Işıktan koruyarak 25C altında saklayınız (Kırmızı Reçeteye Tabidir)'
            },
            {
                'form_name': 'Morfin Hidroklorür 20 mg / 1 mL Ampul',
                'concentration_mg_per_ml': 20.0,
                'concentration_display': '20 mg / 1 mL (20 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': 'Işıktan koruyarak saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 5.0,
                'standard_interval_hours': [3, 4],
                'max_daily_dose_mg': 40.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Pediatrik Akut Şiddetli Ağrı / Travma (IV Titrasyon)',
                    'min_age_months': 1.0,
                    'min_weight_kg': 3.0,
                    'dose_per_kg_single': 0.08,
                    'interval_hours': 3,
                    'max_daily_dose_mg_per_kg': 0.4,
                    'absolute_max_single_dose_mg': 5.0,
                    'absolute_max_daily_dose_mg': 20.0,
                    'weight_metric_in_obesity': 'TBW'
                },
                {
                    'indication': 'Neonatal Post-operatif Analjezi',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 0.04,
                    'interval_hours': 4,
                    'max_daily_dose_mg_per_kg': 0.2,
                    'absolute_max_single_dose_mg': 0.5,
                    'absolute_max_daily_dose_mg': 2.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 50.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Standart doz; solunum izlenir.'
                },
                {
                    'egfr_min': 30.0,
                    'egfr_max': 49.9,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Doz %25 azaltılır; aralık açılır.'
                },
                {
                    'egfr_min': 0.0,
                    'egfr_max': 29.9,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Doz %50 azaltılır veya morfin-6-glukuronid birikimi nedeniyle fentanil tercih edilir.'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Başlangıç dozu %50 azaltılmalı; sedasyon ve solunum dürtüsü izlenmelidir.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'C',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Zorunlu ciddi ağrılarda kısa süreli kullanılabilir.',
                'second_trimester': 'Güvenle titre edilebilir.',
                'third_trimester': 'Doğuma yakın kullanım yenidoğanda solunum depresyonuna yol açabilir; nalokson hazır olmalıdır.'
            },
            'lactation': {
                'lactmed_record_summary': 'Anne sütüne geçer; infantta sedasyon, apne ve emme zayıflığı yönünden yakın izlem şarttır.',
                'relative_infant_dose_percent': 6.0,
                'safety_verdict': 'USE_WITH_CAUTION'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [
                'Solunum depresyonu ve bağımlılık riski; yatağında nalokson (antidot) ve solunum desteği hazır bulundurulmalıdır.'
            ],
            'absolute_contraindications': ['Akut solunum depresyonu', 'Paralitik ileus', 'Kafa içi basınç artışı (KİBAS)'],
            'neonatal_specific_notes': 'Kodein ve tramadolün aksine CYP2D6 metabolizmasından bağımsız glukuronidasyonla atılır; bu nedenle çocuklarda ve yenidoğanda en güvenli opioid seçeneğidir.'
        },
        'metadata': {
            'source_documents': ['WHO Guidelines on the Pharmacological Treatment of Persisting Pain in Children', 'TİTCK Morfin KÜB'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'ketamine',
        'genericTr': 'Ketamin',
        'genericEn': 'ketamine',
        'atcCodes': ['N01AX03'],
        'genericKeywords': ['ketamine', 'ketamin', 'ketalar', 'keta'],
        'brandExamples': ['Ketalar', 'Ketamin'],
        'drugClass': 'Disosiyatif Genel Anestezik / Analjezik',
        'indications': 'Pediatrik acil prosedürel sedasyon ve analjezi (kırık redüksiyonu, dikiş), bronkospazmı olan çocukların acil hızlı seri entübasyonu ve refrakter status astmatikus.',
        'adultDose': 'Sedasyon: 1-2 mg/kg IV veya 4-5 mg/kg IM; İdame: 0.5 mg/kg IV.',
        'pediatricDose': 'Acil Prosedürel Sedasyon: 1-1.5 mg/kg yavaş IV (en az 60 saniyede) veya 3-4 mg/kg IM; Entübasyon indüksiyonu: 1-2 mg/kg IV.',
        'maxDailyDose': 'Erişkinde tek doz maks 200 mg IV; Pediatride tek doz maks 50 mg IV (IM de maks 100 mg).',
        'renalAdjustment': 'Doz ayarlaması gerekmez.',
        'hepaticAdjustment': 'Ağır karaciğer sirozunda metabolizması uzar; idame dozları dikkatle titre edilmelidir.',
        'pregnancyLactation': 'PLLR: Trimester 1, 2 de dikkat; Trimester 3 te fetal taşikardi ve hipertonisite. Laktasyon: USE_WITH_CAUTION (RID: %3.0).',
        'contraindications': 'Şiddetli kontrolsüz hipertansiyon, preeklampsi, kafa içi kitle veya ağır KİBAS.',
        'clinicalPearls': 'Havayolu koruyucu reflekslerini ve spontan solunum dürtüsünü baskılamayan ve bronkodilatasyon yapan eşsiz bir disosiyatif ajandır; sekresyon artışına karşı aspiratör hazır bulundurulmalıdır.',
        'drug_id': 'ketamine',
        'generic_name': 'Ketamin Hidroklorür',
        'atc_code': 'N01AX03',
        'formulations': [
            {
                'form_name': 'Ketalar 500 mg / 10 mL Enjeksiyonluk Çözelti',
                'concentration_mg_per_ml': 50.0,
                'concentration_display': '500 mg / 10 mL (50 mg/mL)',
                'measuring_device': 'none',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 100.0,
                'standard_interval_hours': [1],
                'max_daily_dose_mg': 500.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Pediatrik Acil Prosedürel Sedasyon (Yavaş IV)',
                    'min_age_months': 3.0,
                    'min_weight_kg': 4.0,
                    'dose_per_kg_single': 1.0,
                    'interval_hours': 1,
                    'max_daily_dose_mg_per_kg': 5.0,
                    'absolute_max_single_dose_mg': 50.0,
                    'absolute_max_daily_dose_mg': 200.0,
                    'weight_metric_in_obesity': 'TBW'
                },
                {
                    'indication': 'Astımlı Çocukta Acil RSI İndüksiyonu',
                    'min_age_months': 1.0,
                    'min_weight_kg': 3.0,
                    'dose_per_kg_single': 1.5,
                    'interval_hours': 1,
                    'max_daily_dose_mg_per_kg': 4.0,
                    'absolute_max_single_dose_mg': 100.0,
                    'absolute_max_daily_dose_mg': 200.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 0.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Böbrek yetmezliğinde doz ayarlaması gerekmez.'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Karaciğerde metabolize olur; uzamış etki görülebilir, titrasyonla verilmelidir.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Acil anestezi ve resüsitasyonda güvenle kullanılır.',
                'second_trimester': 'Güvenlidir.',
                'third_trimester': 'Acil sezaryen veya travmada kullanılabilir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Anne sütüne geçer; emzirmeden önce birkaç saat beklenmesi önerilir.',
                'relative_infant_dose_percent': 3.0,
                'safety_verdict': 'USE_WITH_CAUTION'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Şiddetli kontrolsüz hipertansiyon', 'Ağır KİBAS'],
            'neonatal_specific_notes': 'Havayolu koruyucu reflekslerini ve spontan solunum dürtüsünü baskılamayan ve bronkodilatasyon yapan eşsiz bir disosiyatif ajandır; sekresyon artışına karşı aspiratör hazır bulundurulmalıdır.'
        },
        'metadata': {
            'source_documents': ['ACEP Pediatric Sedation Guidelines', 'PALS Ketamine in Resuscitation', 'TİTCK Ketalar KÜB'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'ors',
        'genericTr': 'Oral Rehidratasyon Tuzu (ORS)',
        'genericEn': 'oral rehydration salts',
        'atcCodes': ['A07CA'],
        'genericKeywords': ['ors', 'oral rehydration salts', 'ge-oral', 'rehidrasyon tuzu'],
        'brandExamples': ['Ge-Oral', 'ORS Saşe', 'Dioralyte'],
        'drugClass': 'Oral Elektrolit ve Glukoz Rehidratasyon Solüsyonu',
        'indications': 'Akut gastroenterit ve ishal olgularında hafif ve orta dereceli dehidratasyonun tedavisi ile elektrolit kayıplarının önlenmesi.',
        'adultDose': 'İlk 4 saatte 2000-4000 mL serbestçe; devam eden her sulu dışkı sonrası 200-400 mL.',
        'pediatricDose': 'Hafif-orta dehidratasyon: İlk 4 saatte 50-100 mL/kg sık ve küçük yudumlarla; ardından her sulu dışkı sonrası <2 yaş: 50-100 mL, ≥2 yaş: 100-200 mL.',
        'maxDailyDose': 'Sıvı ihtiyacı ve dışkı hacmine göre titre edilir; katı üst sınır yoktur.',
        'renalAdjustment': 'Anürik böbrek yetmezliğinde hiperkalemi riski; dikkatle izlenmelidir.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Trimester 1, 2 ve 3 te tamamen güvenlidir. Laktasyon: COMPATIBLE (RID: %0.0).',
        'contraindications': 'Ağır şok veya bilinç kapalılığı (acil IV sıvı gerekir), paralitik ileus, persistan inatçı kusma.',
        'clinicalPearls': 'Saşe mutlaka tam 1 litre (1000 mL) kaynatılıp soğutulmuş temiz suda çözülmelidir; eksik suyla hazırlanması hiperosmolariteye ve tehlikeli hipernatremiye yol açar.',
        'drug_id': 'ors',
        'generic_name': 'Oral Rehidratasyon Tuzu (WHO Düşük Osmolariteli)',
        'atc_code': 'A07CA',
        'formulations': [
            {
                'form_name': 'Oral Rehidratasyon Tuzu Saşe (1 Litre İçin)',
                'concentration_mg_per_ml': 20.5,
                'concentration_display': '20.5 g toz / 1 L su (Na 75 mmol/L, Glukoz 75 mmol/L, 245 mOsm/L)',
                'measuring_device': 'none',
                'storage_condition': 'Hazırlandıktan sonra 24 saat içinde tüketilmelidir; buzdolabında saklanabilir'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 500.0,
                'standard_interval_hours': [1],
                'max_daily_dose_mg': 4000.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Hafif-Orta Dehidratasyon Açığı Kapatma (İlk 4 Saat)',
                    'min_age_months': 0.5,
                    'min_weight_kg': 2.0,
                    'dose_per_kg_single': 75.0,
                    'interval_hours': 4,
                    'max_daily_dose_mg_per_kg': 150.0,
                    'absolute_max_single_dose_mg': 2000.0,
                    'absolute_max_daily_dose_mg': 4000.0,
                    'weight_metric_in_obesity': 'TBW'
                },
                {
                    'indication': 'Devam Eden Sulu Dışkı Kaybı İdamesi (<2 Yaş)',
                    'min_age_months': 0.5,
                    'min_weight_kg': 2.0,
                    'dose_per_kg_single': 10.0,
                    'interval_hours': 2,
                    'max_daily_dose_mg_per_kg': 100.0,
                    'absolute_max_single_dose_mg': 100.0,
                    'absolute_max_daily_dose_mg': 1000.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 0.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Ağır böbrek yetmezliğinde potasyum içeriği nedeniyle serum elektrolitleri izlenmelidir.'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Doz ayarlaması gerekmez.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'A',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Tamamen güvenlidir.',
                'second_trimester': 'Tamamen güvenlidir.',
                'third_trimester': 'Tamamen güvenlidir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Doğal fizyolojik elektrolit ve glukoz çözeltisidir; emzirme ile %100 uyumludur.',
                'relative_infant_dose_percent': 0.0,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Ağır şok veya bilinç kapalılığı (acil IV sıvı gerekir)', 'Paralitik ileus'],
            'neonatal_specific_notes': 'Saşe mutlaka tam 1 litre (1000 mL) suda çözülmelidir; daha az suyla konsantre hazırlanması hipernatremiye ve konvülsiyona yol açar!'
        },
        'metadata': {
            'source_documents': ['WHO / UNICEF Clinical Management of Acute Diarrhoea', 'ESPGHAN Water and Electrolyte Guidelines'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'zinc_sulfate',
        'genericTr': 'Çinko Sülfat',
        'genericEn': 'zinc sulfate',
        'atcCodes': ['A12CB01'],
        'genericKeywords': ['zinc', 'zinc sulfate', 'çinko', 'zinco', 'çinko sülfat'],
        'brandExamples': ['Zinco', 'Zinco Damla', 'Çinkomed'],
        'drugClass': 'Mineral / Eser Element Takviyesi',
        'indications': 'Akut gastroenterit ve ishal tedavisi (WHO protokolü), çinko eksikliği profilaksi ve tedavisi, Wilson hastalığı idamesi.',
        'adultDose': 'Günde 1 kez 30-50 mg elementer çinko.',
        'pediatricDose': 'Akut İshal (WHO Protokolü): <6 ay: Günlük 10 mg elementer çinko; ≥6 ay: Günlük 20 mg elementer çinko 10-14 gün süreyle tek doz.',
        'maxDailyDose': 'Pediatrik AGE protokolünde günlük 20 mg elementer çinko.',
        'renalAdjustment': 'Ağır böbrek yetmezliğinde birikebilir; uzun süreli kullanımda dikkat edilmelidir.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Günlük gereksinim dozlarında güvenlidir. Laktasyon: COMPATIBLE.',
        'contraindications': 'Çinkoya bilinen aşırı duyarlılık.',
        'clinicalPearls': 'Akut ishalli çocuklarda 10-14 günlük çinko takviyesi bağırsak enterositlerinin epitelizasyonunu hızlandırır, dışkı sıklığını azaltır ve sonraki 2-3 ay içindeki yeni ishal ataklarını %30 oranında önler (WHO Düzey 1 kanıt). Aç karnına bulantı yaparsa yemekle verilebilir.',
        'drug_id': 'zinc_sulfate',
        'generic_name': 'Çinko Sülfat Heptahidrat',
        'atc_code': 'A12CB01',
        'formulations': [
            {
                'form_name': 'Çinko Sülfat 15 mg / 5 mL Şurup (Zinco)',
                'concentration_mg_per_ml': 3.0,
                'concentration_display': '15 mg elementer çinko / 5 mL (3 mg/mL)',
                'measuring_device': 'oral_syringe',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            },
            {
                'form_name': 'Çinko Sülfat 15 mg / 1 mL Damla (Zinco Damla)',
                'concentration_mg_per_ml': 15.0,
                'concentration_display': '15 mg / mL (1 damla = 0.75 mg Zn)',
                'measuring_device': 'dropper',
                'storage_condition': 'Oda sıcaklığında saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 30.0,
                'standard_interval_hours': [24],
                'max_daily_dose_mg': 50.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Akut İshal Mukozal İyileşme (WHO 14 Günlük Kür)',
                    'min_age_months': 1.0,
                    'min_weight_kg': 3.0,
                    'dose_per_kg_single': 20.0,
                    'interval_hours': 24,
                    'max_daily_dose_mg_per_kg': 20.0,
                    'absolute_max_single_dose_mg': 20.0,
                    'absolute_max_daily_dose_mg': 20.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'organ_impairment': {
            'renal_adjustments': [
                {
                    'egfr_min': 0.0,
                    'egfr_max': 999.0,
                    'action_type': 'DOSE_REDUCTION',
                    'adjustment_instruction': 'Doz ayarlaması gerekmez; uzun süreli kullanımda bakır eksikliği izlenir.'
                }
            ],
            'hepatic_adjustments': [
                {
                    'child_pugh_class': 'Class_C',
                    'action_instruction': 'Doz ayarlaması gerekmez.'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'A',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Günlük RDA gereksiniminde güvenlidir.',
                'second_trimester': 'Güvenlidir.',
                'third_trimester': 'Güvenlidir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Anne sütü doğal çinko içerir; takviye dozlarında güvenlidir.',
                'relative_infant_dose_percent': 1.0,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Çinko tuzlarına karşı aşırı duyarlılık'],
            'neonatal_specific_notes': '<6 ay bebeklerde günlük doz 10 mg ile sınırlandırılmalıdır.'
        },
        'metadata': {
            'source_documents': ['WHO Guidelines: Clinical Management of Acute Diarrhoea', 'UNICEF Zinc Supplementation'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    }
]

for nd in new_drugs_data:
    if nd['id'] not in mono_by_id:
        monographs.append(nd)
        mono_by_id[nd['id']] = nd
    else:
        mono_by_id[nd['id']].update(nd)

print(f'Total monographs after base additions: {len(monographs)}')
