import json

with open('public/data/clinical_monographs.json', 'r', encoding='utf-8') as f:
    monographs = json.load(f)

mono_by_id = {m['id']: m for m in monographs}

def set_full_monograph(m, data):
    # Ensure classic fields exist
    for k in ['id', 'genericTr', 'genericEn', 'atcCodes', 'genericKeywords', 'brandExamples',
              'drugClass', 'indications', 'adultDose', 'pediatricDose', 'maxDailyDose',
              'renalAdjustment', 'hepaticAdjustment', 'pregnancyLactation', 'contraindications', 'clinicalPearls']:
        if k in data:
            m[k] = data[k]
        elif k not in m:
            m[k] = ''
    # Ensure structured schema fields exist
    for k in ['drug_id', 'generic_name', 'atc_code', 'formulations', 'dosing',
              'organ_impairment', 'reproductive_safety', 'safety_warnings', 'metadata']:
        if k in data:
            m[k] = data[k]

# ==============================================================================
# ENRICHMENT DEFINITIONS FOR 25 CRITICAL PEDIATRIC DRUGS + KEY OUTPATIENT DRUGS
# ==============================================================================

# 1. Epinephrine (Adrenalin)
epinephrine_data = {
    'drug_id': 'epinephrine',
    'generic_name': 'Adrenalin (Epinefrin)',
    'atc_code': 'C01CA24',
    'formulations': [
        {
            'form_name': 'Adrenalin 1 mg / 1 mL Ampul (1:1000)',
            'concentration_mg_per_ml': 1.0,
            'concentration_display': '1 mg/mL (1:1000)',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak 15-25C oda sıcaklığında saklayınız'
        },
        {
            'form_name': 'Adrenalin 0.5 mg / 1 mL Ampul (1:2000)',
            'concentration_mg_per_ml': 0.5,
            'concentration_display': '0.5 mg/mL (1:2000)',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 0.5,
            'standard_interval_hours': [1],
            'max_daily_dose_mg': 2.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Anafilaksi (İlk Basamak Altın Standart)',
                'min_age_months': 0.0,
                'min_weight_kg': 2.0,
                'dose_per_kg_single': 0.01,
                'interval_hours': 1,
                'max_daily_dose_mg_per_kg': 0.04,
                'absolute_max_single_dose_mg': 0.5,
                'absolute_max_daily_dose_mg': 2.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Akut Krup Acili (L-Adrenalin Nebül)',
                'min_age_months': 3.0,
                'min_weight_kg': 4.0,
                'dose_per_kg_single': 0.5,
                'interval_hours': 2,
                'max_daily_dose_mg_per_kg': 2.0,
                'absolute_max_single_dose_mg': 5.0,
                'absolute_max_daily_dose_mg': 10.0,
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
                'adjustment_instruction': 'Acil resüsitasyonda böbrek yetmezliğinde doz ayarlaması gerekmez.'
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
        'titck_legacy_category': 'C',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Gerekli acil durumlarda (anafilaksi) yaşam kurtarıcıdır, tereddütsüz uygulanır.',
            'second_trimester': 'Anafilaksi ve kardiyak resüsitasyonda mutlak endikedir.',
            'third_trimester': 'Uterin perfüzyonu geçici azaltabilir; ancak maternal resüsitasyon fetal yaşamın ön koşuludur.'
        },
        'lactation': {
            'lactmed_record_summary': 'Oral biyoyararlanımı son derece düşüktür; infant gastrointestinal kanalında hızla parçalanır.',
            'relative_infant_dose_percent': 0.1,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': [
            'Anafilaksi ve kardiyak arrest durumunda HİÇBİR MUTLAK KONTRENDİKASYONU YOKTUR.',
            'Lokal anestezik kombinasyonunda parmak, burun, kulak memesi ve penis ucu gibi son-organlarda nekroz riski'
        ],
        'neonatal_specific_notes': 'Neonatal resüsitasyonda IV/IO doz 0.01-0.03 mg/kg (0.1-0.3 mL/kg 1:10.000 formdan) uygulanır.',
        'critical_drug_interactions': [
            {
                'interacting_drug': 'Beta-Blokerler (Non-selektif: Propranolol)',
                'severity': 'MAJOR',
                'clinical_management': 'Alfa-adrenerjik baskın vazokonstriksiyon ve şiddetli hipertansiyon ile refleks bradikardi gelişebilir; anafilakside alternatif olarak glukagon değerlendiriniz.'
            }
        ]
    },
    'metadata': {
        'source_documents': ['TİTCK Adrenalin KÜB', 'ERC / AHA PALS 2020-2025 Guidelines', 'EAACI Anaphylaxis Guidelines'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'epinephrine' in mono_by_id:
    set_full_monograph(mono_by_id['epinephrine'], epinephrine_data)

# 2. Ceftriaxone
ceftriaxone_data = {
    'drug_id': 'ceftriaxone',
    'generic_name': 'Seftriakson',
    'atc_code': 'J01DD04',
    'formulations': [
        {
            'form_name': 'Seftriakson 500 mg IM/IV Flakon',
            'concentration_mg_per_ml': 100.0,
            'concentration_display': '500 mg / 5 mL (100 mg/mL)',
            'measuring_device': 'none',
            'storage_condition': '25C altında oda sıcaklığında saklayınız'
        },
        {
            'form_name': 'Seftriakson 1000 mg IM/IV Flakon',
            'concentration_mg_per_ml': 100.0,
            'concentration_display': '1000 mg / 10 mL (100 mg/mL)',
            'measuring_device': 'none',
            'storage_condition': '25C altında oda sıcaklığında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 1000.0,
            'standard_interval_hours': [24],
            'max_daily_dose_mg': 4000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Ağır Sepsis / Pnömoni (>28 Gün)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 50.0,
                'interval_hours': 24,
                'max_daily_dose_mg_per_kg': 75.0,
                'absolute_max_single_dose_mg': 2000.0,
                'absolute_max_daily_dose_mg': 2000.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Bakteriyel Menenjit (>28 Gün)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 50.0,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 100.0,
                'absolute_max_single_dose_mg': 2000.0,
                'absolute_max_daily_dose_mg': 4000.0,
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
                'adjustment_instruction': 'Standart doz; karaciğer yetmezliği eşlik etmiyorsa ayarlama gerekmez.'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 9.9,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Günlük maksimum doz 2000 mg ile sınırlandırılmalıdır.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Ağır karaciğer yetmezliği renal yetmezlikle kombine ise günlük doz 2 g ile sınırlandırılmalıdır.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'B',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Gebelikte güvenle kullanılabilir (Kategori B).',
            'second_trimester': 'Gebelikte güvenlidir.',
            'third_trimester': 'Gebelikte güvenlidir; doğum öncesi kalsiyumlu IV solüsyonlarla temas ettirilmemelidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Süte çok düşük oranda geçer; emzirmede güvenlidir.',
            'relative_infant_dose_percent': 1.2,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [
            '<=28 günlük yenidoğanlarda kalsiyum içeren IV solüsyonlarla (Ringer Laktat, TPN) birlikte verilmesi akciğer ve böbreklerde ölümcül kalsiyum-seftriakson kristal presipitasyonuna yol açar! KESİN KONTRENDİKE!'
        ],
        'absolute_contraindications': [
            '<=28 günlük yenidoğanlar',
            'Kalsiyum içeren IV solüsyonlarla eşzamanlı infüzyon',
            'Hiperbilirubinemik sarılıklı yenidoğanlar (kernikterus riski)'
        ],
        'neonatal_specific_notes': 'Bilirubini albüminden ayırarak kernikterus riskini artırır; yenidoğanda sefotaksim tercih edilmelidir.',
        'critical_drug_interactions': [
            {
                'interacting_drug': 'Kalsiyum Glukonat / Kalsiyum Klorür / Ringer Laktat',
                'severity': 'MAJOR',
                'clinical_management': '<=28 günlük yenidoğanda birlikte kullanımı KESİN KONTRENDİKEDİR.'
            }
        ]
    },
    'metadata': {
        'source_documents': ['FDA Ceftriaxone Safety Warning', 'TİTCK Seftriakson KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'ceftriaxone' in mono_by_id:
    set_full_monograph(mono_by_id['ceftriaxone'], ceftriaxone_data)

# 3. Vancomycin
vancomycin_data = {
    'drug_id': 'vancomycin',
    'generic_name': 'Vankomisin',
    'atc_code': 'J01XA01',
    'formulations': [
        {
            'form_name': 'Vankomisin 500 mg IV Flakon',
            'concentration_mg_per_ml': 50.0,
            'concentration_display': '500 mg / 10 mL (50 mg/mL seyreltme)',
            'measuring_device': 'none',
            'storage_condition': '25C altında oda sıcaklığında saklayınız'
        },
        {
            'form_name': 'Vankomisin 1000 mg IV Flakon',
            'concentration_mg_per_ml': 50.0,
            'concentration_display': '1000 mg / 20 mL (50 mg/mL)',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 1000.0,
            'standard_interval_hours': [12],
            'max_daily_dose_mg': 4000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Ağır MRSA Sepsisi / Bakteriyemi',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 15.0,
                'interval_hours': 6,
                'max_daily_dose_mg_per_kg': 60.0,
                'absolute_max_single_dose_mg': 1000.0,
                'absolute_max_daily_dose_mg': 2000.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Pediatrik MRSA Menenjit (Yüksek Doz)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 15.0,
                'interval_hours': 6,
                'max_daily_dose_mg_per_kg': 60.0,
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
                'adjustment_instruction': 'Standart doz; AUC/MIC takibi yapılır.'
            },
            {
                'egfr_min': 20.0,
                'egfr_max': 49.9,
                'action_type': 'INTERVAL_EXTENSION',
                'adjustment_instruction': 'Doz aralığı 24-48 saate açılır; serum çukur konsantrasyonu takip edilir.'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 19.9,
                'action_type': 'INTERVAL_EXTENSION',
                'adjustment_instruction': 'Tek doz verilir; serum düzeyi <15-20 mcg/mL olmadan yeni doz uygulanmaz.'
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
        'titck_legacy_category': 'C',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Maternal ciddi enfeksiyonda AUC/MIC izlemiyle kullanılır.',
            'second_trimester': 'Terapötik ilaç düzeyi izlemi (TDM) şartıyla kullanılabilir.',
            'third_trimester': 'Fetal nefrotoksisite ve ototoksisite riski nedeniyle çukur düzeyi izlenmelidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Oral biyoyararlanımı düşüktür; infant emilimi ihmal edilebilir düzeydedir.',
            'relative_infant_dose_percent': 2.5,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Vankomisine bilinen anafilaktik aşırı duyarlılık'],
        'neonatal_specific_notes': 'Hızlı infüzyon Kırmızı Adam Sendromu (Red Man Syndrome) ve hipotansiyona yol açar; infüzyon süresi en az 60 dakika olmalıdır.',
        'critical_drug_interactions': [
            {
                'interacting_drug': 'Piperasilin-Tazobaktam',
                'severity': 'MODERATE',
                'clinical_management': 'Nefrotoksisite sinerjisi riski; ACORN çalışması ışığında böbrek fonksiyonları ve kreatinin günlük izlenmelidir.'
            }
        ]
    },
    'metadata': {
        'source_documents': ['IDSA Vancomycin TDM Guidelines', 'TİTCK Vankomisin KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'vancomycin' in mono_by_id:
    set_full_monograph(mono_by_id['vancomycin'], vancomycin_data)

# 4. Midazolam
midazolam_data = {
    'drug_id': 'midazolam',
    'generic_name': 'Midazolam',
    'atc_code': 'N05CD08',
    'formulations': [
        {
            'form_name': 'Midazolam 5 mg / 5 mL (1 mg/mL) Ampul',
            'concentration_mg_per_ml': 1.0,
            'concentration_display': '1 mg/mL',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız (Yeşil Reçete)'
        },
        {
            'form_name': 'Midazolam 15 mg / 3 mL (5 mg/mL) Ampul',
            'concentration_mg_per_ml': 5.0,
            'concentration_display': '5 mg/mL',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Midazolam 5 mg / 1 mL Bukkal Solüsyon (Epistatus / Buccolam)',
            'concentration_mg_per_ml': 5.0,
            'concentration_display': '5 mg/mL Bukkal',
            'measuring_device': 'oral_syringe',
            'storage_condition': 'Oda sıcaklığında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 5.0,
            'standard_interval_hours': [1],
            'max_daily_dose_mg': 20.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Status Epileptikus (Bukkal / İntranazal)',
                'min_age_months': 3.0,
                'min_weight_kg': 4.0,
                'dose_per_kg_single': 0.2,
                'interval_hours': 1,
                'max_daily_dose_mg_per_kg': 0.6,
                'absolute_max_single_dose_mg': 10.0,
                'absolute_max_daily_dose_mg': 20.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Status Epileptikus (Yavaş IV / IO)',
                'min_age_months': 0.5,
                'min_weight_kg': 2.0,
                'dose_per_kg_single': 0.1,
                'interval_hours': 1,
                'max_daily_dose_mg_per_kg': 0.4,
                'absolute_max_single_dose_mg': 5.0,
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
                'adjustment_instruction': 'Böbrek yetmezliğinde aktif metabolit glukuronid birikebilir; sedasyon izlenmelidir.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Karaciğer yetmezliğinde klerens düşer; doz %50 azaltılmalıdır.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'D',
        'pregnancy_trimester_risk': {
            'first_trimester': 'İlk trimesterde konjenital anomali riski nedeniyle zorunlu olmadıkça kaçınılmalıdır.',
            'second_trimester': 'Kısa süreli sedasyonda dikkatle kullanılabilir.',
            'third_trimester': 'Doğuma yakın kullanımda yenidoğanda hipotoni, hipotermi ve solunum depresyonu (Floppy infant) yapabilir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Süte çok az geçer; kısa etkilidir. Tek doz sedasyondan 4 saat sonra emzirmeye devam edilebilir.',
            'relative_infant_dose_percent': 1.5,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [
            'Hızlı bolus IV enjeksiyonda solunum arresti ve apne riski; resüsitasyon ekipmanı ve Flumazenil hazır bulundurulmalıdır.'
        ],
        'absolute_contraindications': ['Ağır solunum yetmezliği, miyasteniya gravis, dar açılı glokom.'],
        'neonatal_specific_notes': 'Yenidoğanda eliminasyon yarı ömrü uzundur; hipotansiyon riski nedeniyle yavaş infüzyonla verilmelidir.'
    },
    'metadata': {
        'source_documents': ['ILAE Status Epilepticus Guidelines', 'TİTCK Midazolam KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'midazolam' in mono_by_id:
    set_full_monograph(mono_by_id['midazolam'], midazolam_data)

# 5. Diazepam
diazepam_data = {
    'drug_id': 'diazepam',
    'generic_name': 'Diazepam',
    'atc_code': 'N05BA01',
    'formulations': [
        {
            'form_name': 'Diazepam 10 mg / 2 mL (5 mg/mL) Ampul (Diazem)',
            'concentration_mg_per_ml': 5.0,
            'concentration_display': '5 mg/mL',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız (Yeşil Reçete)'
        },
        {
            'form_name': 'Desitin 5 mg Rektal Tüp',
            'concentration_mg_per_ml': 2.0,
            'concentration_display': '5 mg / 2.5 mL',
            'measuring_device': 'none',
            'storage_condition': 'Oda sıcaklığında saklayınız'
        },
        {
            'form_name': 'Desitin 10 mg Rektal Tüp',
            'concentration_mg_per_ml': 4.0,
            'concentration_display': '10 mg / 2.5 mL',
            'measuring_device': 'none',
            'storage_condition': 'Oda sıcaklığında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 10.0,
            'standard_interval_hours': [4],
            'max_daily_dose_mg': 40.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Febril Konvülsiyon / Akut Nöbet (Rektal Tüp)',
                'min_age_months': 3.0,
                'min_weight_kg': 5.0,
                'dose_per_kg_single': 0.3,
                'interval_hours': 4,
                'max_daily_dose_mg_per_kg': 0.6,
                'absolute_max_single_dose_mg': 10.0,
                'absolute_max_daily_dose_mg': 20.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Status Epileptikus (Yavaş IV)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 0.2,
                'interval_hours': 1,
                'max_daily_dose_mg_per_kg': 0.4,
                'absolute_max_single_dose_mg': 10.0,
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
                'adjustment_instruction': 'Böbrek yetmezliğinde doz ayarlaması gerekmez; sedasyon izlenir.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Karaciğerde metabolize olur; ağır yetmezlikte kontrendikedir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'D',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Yarık damak/dudak riski; zorunlu nöbet kontrolü hariç kaçınılmalıdır.',
            'second_trimester': 'Status epileptikus kontrolünde titre edilerek kullanılır.',
            'third_trimester': 'Floppy infant sendromu ve neonatal yoksunluk riski.'
        },
        'lactation': {
            'lactmed_record_summary': 'Metaboliti nordiazepam birikebilir; tekrarlayan dozlarda emzirme önerilmez.',
            'relative_infant_dose_percent': 7.5,
            'safety_verdict': 'USE_WITH_CAUTION'
        }
    },
    'safety_warnings': {
        'black_box_warnings': ['Opioidlerle birlikte kullanımda fatal solunum depresyonu ve koma riski.'],
        'absolute_contraindications': ['Ağır solunum yetmezliği, koma, miyasteniya gravis.'],
        'neonatal_specific_notes': 'Sodyum benzoat içeren formülasyonlar yenidoğanda kernikterusu tetikleyebilir.'
    },
    'metadata': {
        'source_documents': ['AAP Status Epilepticus Guidelines', 'TİTCK Diazem KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'diazepam' in mono_by_id:
    set_full_monograph(mono_by_id['diazepam'], diazepam_data)

# 6. Levetiracetam
levetiracetam_data = {
    'drug_id': 'levetiracetam',
    'generic_name': 'Levetirasetam',
    'atc_code': 'N03AX14',
    'formulations': [
        {
            'form_name': 'Keppra 100 mg / 1 mL Oral Çözelti',
            'concentration_mg_per_ml': 100.0,
            'concentration_display': '100 mg/mL',
            'measuring_device': 'oral_syringe',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Keppra 500 mg / 5 mL IV Konsantre İnfüzyonluk Çözelti',
            'concentration_mg_per_ml': 100.0,
            'concentration_display': '100 mg/mL (500 mg/5 mL)',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 1000.0,
            'standard_interval_hours': [12],
            'max_daily_dose_mg': 3000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Akut Nöbet / Status 2. Basamak (IV Yükleme)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 40.0,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 60.0,
                'absolute_max_single_dose_mg': 3000.0,
                'absolute_max_daily_dose_mg': 3000.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'İdame Antiepileptik Tedavi',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 15.0,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 60.0,
                'absolute_max_single_dose_mg': 1500.0,
                'absolute_max_daily_dose_mg': 3000.0,
                'weight_metric_in_obesity': 'TBW'
            }
        ]
    },
    'organ_impairment': {
        'renal_adjustments': [
            {
                'egfr_min': 50.0,
                'egfr_max': 79.9,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Doz %25-30 azaltılır.'
            },
            {
                'egfr_min': 30.0,
                'egfr_max': 49.9,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Doz %50 azaltılır (q12h).'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 29.9,
                'action_type': 'INTERVAL_EXTENSION',
                'adjustment_instruction': 'Doz %50 azaltılarak 24 saatte bir verilir (q24h).'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Ağır karaciğer yetmezliğinde kreatinin klerensi böbrek yetmezliğini gizleyebilir; doz dikkatle azaltılmalıdır.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'C',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Antiepileptikler arasında en düşük majör malformasyon oranına (%2.5) sahiptir; gebelikte ilk tercih antiepileptiktir.',
            'second_trimester': 'Gebelik klerensi 2 katına çıkar; serum düzeyi izlenerek doz artırılmalıdır.',
            'third_trimester': 'Serum düzeyi takibiyle dozu titre ediniz.'
        },
        'lactation': {
            'lactmed_record_summary': 'Süte geçer; ancak infant yan etkisi düşüktür.',
            'relative_infant_dose_percent': 3.5,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Levetirasetama veya pirolidon türevlerine aşırı duyarlılık.'],
        'neonatal_specific_notes': 'Sedasyon ve solunum depresyonu yapmaz; neonatal nöbetlerde güvenli ikinci basamak ajandır.'
    },
    'metadata': {
        'source_documents': ['ILAE Guidelines: Levetiracetam in Status', 'TİTCK Keppra KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'levetiracetam' in mono_by_id:
    set_full_monograph(mono_by_id['levetiracetam'], levetiracetam_data)

# 7. Phenytoin
phenytoin_data = {
    'drug_id': 'phenytoin',
    'generic_name': 'Fenitoin Sodyum',
    'atc_code': 'N03AB02',
    'formulations': [
        {
            'form_name': 'Fenitoin Sodyum 250 mg / 5 mL (50 mg/mL) Ampul (Epanutin)',
            'concentration_mg_per_ml': 50.0,
            'concentration_display': '50 mg/mL',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 1000.0,
            'standard_interval_hours': [24],
            'max_daily_dose_mg': 1500.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Status Epileptikus (IV Yükleme)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 20.0,
                'interval_hours': 24,
                'max_daily_dose_mg_per_kg': 20.0,
                'absolute_max_single_dose_mg': 1000.0,
                'absolute_max_daily_dose_mg': 1500.0,
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
                'adjustment_instruction': 'Üremide protein bağlama azalır; serbest fenitoin düzeyi takip edilmelidir.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Karaciğerde doygunluk (Michaelis-Menten) kinetiği gösterir; doz titrasyonunda küçük artışlar dahi toksisite yapabilir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'D',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Fetal hidantoin sendromu (mikrosefali, kraniyofasiyal anomali, mental retardasyon) riski yüksektir.',
            'second_trimester': 'Zorunlu olmadıkça kaçınılmalıdır.',
            'third_trimester': 'Doğumda neonatal kanama riski; K vitamini profilaksisi gerekir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne geçer; emzirmede dikkatli izlem gerekir.',
            'relative_infant_dose_percent': 2.0,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [
            'İnfüzyon hızı yetişkinde 50 mg/dk, çocukta 1 mg/kg/dk üzerine çıktığında şiddetli hipotansiyon ve ölümcül kardiyak aritmi riski!'
        ],
        'absolute_contraindications': ['Sinüs bradikardisi, SA/AV blok, Stokes-Adams sendromu.'],
        'neonatal_specific_notes': 'Damar dışına kaçışta Mor Eldiven Sendromu (Purple Glove Syndrome) ve doku nekrozu riski; geniş damardan SF ile infüze edilmeli, asla dekstrozla karıştırılmamalıdır!'
    },
    'metadata': {
        'source_documents': ['AHA PALS Phenytoin Infusion Protocol', 'TİTCK Epanutin KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'phenytoin' in mono_by_id:
    set_full_monograph(mono_by_id['phenytoin'], phenytoin_data)

# 8. Budesonide
budesonide_data = {
    'drug_id': 'budesonide',
    'generic_name': 'Budesonid (Nebül / İnhaler)',
    'atc_code': 'R03BA02',
    'formulations': [
        {
            'form_name': 'Pulmicort 0.25 mg / 2 mL Nebül Süspansiyon',
            'concentration_mg_per_ml': 0.125,
            'concentration_display': '0.25 mg / 2 mL',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak 25C altında saklayınız'
        },
        {
            'form_name': 'Pulmicort 0.5 mg / 2 mL Nebül Süspansiyon',
            'concentration_mg_per_ml': 0.25,
            'concentration_display': '0.5 mg / 2 mL',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak 25C altında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 1.0,
            'standard_interval_hours': [12],
            'max_daily_dose_mg': 4.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Akut Krup (Laringotrakeit Acili)',
                'min_age_months': 3.0,
                'min_weight_kg': 4.0,
                'dose_per_kg_single': 0.2,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 0.4,
                'absolute_max_single_dose_mg': 2.0,
                'absolute_max_daily_dose_mg': 4.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Akut Astım / Bronkospazm Atağı',
                'min_age_months': 6.0,
                'min_weight_kg': 5.0,
                'dose_per_kg_single': 0.1,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 0.2,
                'absolute_max_single_dose_mg': 1.0,
                'absolute_max_daily_dose_mg': 2.0,
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
                'adjustment_instruction': 'İnhaler formda renal doz ayarlaması gerekmez.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Karaciğer ilk geçiş metabolizması yüksektir (%90); ağır karaciğer yetmezliğinde sistemik maruziyet artabilir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'B',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Gebelikte en geniş insan güvenlik verisine sahip inhaler steroiddir; güvenlidir.',
            'second_trimester': 'Astım kontrolünde güvenle sürdürülür.',
            'third_trimester': 'Güvenle kullanılır.'
        },
        'lactation': {
            'lactmed_record_summary': 'Süte ihmal edilebilir oranda geçer; emzirmede güvenlidir.',
            'relative_infant_dose_percent': 0.3,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Budesonide aşırı duyarlılık'],
        'neonatal_specific_notes': 'Uygulama sonrası yüzde ve ağızda lokal kandidiyazisi ve perioral döküntüyü önlemek için yüz maskesi çıkarılmalı ve ağız suyla silinmelidir.'
    },
    'metadata': {
        'source_documents': ['GINA Asthma Guidelines', 'AAP Croup Guidelines', 'TİTCK Pulmicort KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'budesonide' in mono_by_id:
    set_full_monograph(mono_by_id['budesonide'], budesonide_data)

# 9. Ipratropium
ipratropium_data = {
    'drug_id': 'ipratropium',
    'generic_name': 'İpratropium Bromür',
    'atc_code': 'R03BB01',
    'formulations': [
        {
            'form_name': 'Atrovent 250 mcg / 1 mL Nebül Solüsyon',
            'concentration_mg_per_ml': 0.25,
            'concentration_display': '250 mcg / 1 mL',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Atrovent 500 mcg / 2 mL Nebül Solüsyon',
            'concentration_mg_per_ml': 0.25,
            'concentration_display': '500 mcg / 2 mL',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 0.5,
            'standard_interval_hours': [6],
            'max_daily_dose_mg': 2.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Orta-Ağır Astım Krizinin İlk 1 Saati (Salbutamole Ek)',
                'min_age_months': 3.0,
                'min_weight_kg': 4.0,
                'dose_per_kg_single': 0.025,
                'interval_hours': 1,
                'max_daily_dose_mg_per_kg': 0.1,
                'absolute_max_single_dose_mg': 0.5,
                'absolute_max_daily_dose_mg': 2.0,
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
                'adjustment_instruction': 'Doz ayarlaması gerekmez.'
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
            'third_trimester': 'Güvenlidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Süte ihmal edilebilir düzeyde geçer; emzirme ile uyumludur.',
            'relative_infant_dose_percent': 0.2,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Atropin türevlerine aşırı duyarlılık', 'Dar açılı glokom'],
        'neonatal_specific_notes': 'Nebülün göze kaçması midriyazise yol açabilir; maske yüze tam oturtulmalıdır.'
    },
    'metadata': {
        'source_documents': ['GINA Acute Asthma Management', 'TİTCK Atrovent KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'ipratropium' in mono_by_id:
    set_full_monograph(mono_by_id['ipratropium'], ipratropium_data)

# 10. Fentanyl
fentanyl_data = {
    'drug_id': 'fentanyl',
    'generic_name': 'Fentanil',
    'atc_code': 'N01AH01',
    'formulations': [
        {
            'form_name': 'Fentanil 100 mcg / 2 mL Ampul',
            'concentration_mg_per_ml': 0.05,
            'concentration_display': '50 mcg/mL (100 mcg/2 mL)',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak saklayınız (Kırmızı Reçete)'
        },
        {
            'form_name': 'Fentanil 500 mcg / 10 mL Flakon',
            'concentration_mg_per_ml': 0.05,
            'concentration_display': '50 mcg/mL (500 mcg/10 mL)',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 0.1,
            'standard_interval_hours': [1],
            'max_daily_dose_mg': 0.5
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Ağrılı Girişim / Prosedürel Sedasyon (IV)',
                'min_age_months': 0.0,
                'min_weight_kg': 1.0,
                'dose_per_kg_single': 0.0015,
                'interval_hours': 1,
                'max_daily_dose_mg_per_kg': 0.005,
                'absolute_max_single_dose_mg': 0.05,
                'absolute_max_daily_dose_mg': 0.2,
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
                'adjustment_instruction': 'Karaciğerde metabolize olur; böbrek yetmezliğinde morfine göre daha güvenlidir.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Karaciğer yetmezliğinde klerens azalır; titrasyonla verilmelidir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'C',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Acil anestezi ve cerrahide kullanılabilir.',
            'second_trimester': 'Güvenle titre edilir.',
            'third_trimester': 'Doğuma yakın kullanımda yenidoğan solunum depresyonuna dikkat edilmelidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne çok az miktarda geçer; emzirmeden önce birkaç saat beklenmesi önerilir.',
            'relative_infant_dose_percent': 2.5,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [
            'Hızlı IV puşede ölümcül göğüs duvarı rijititesi (wooden chest syndrome) ve solunum durması riski; yavaş titre edilmeli ve kas gevşetici/Nalokson hazır tutulmalıdır.'
        ],
        'absolute_contraindications': ['Akut ağır bronşiyal astım', 'Solunum depresyonu'],
        'neonatal_specific_notes': 'Yenidoğan entübasyonunda mikrogram (1-2 mcg/kg) hassasiyeti şarttır; 10 kat doz aşımını önlemek için SF ile 10 mcg/mL konsantrasyona seyreltilerek çekilmelidir.'
    },
    'metadata': {
        'source_documents': ['AAP Pediatric Sedation Guidelines', 'TİTCK Fentanil KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'fentanyl' in mono_by_id:
    set_full_monograph(mono_by_id['fentanyl'], fentanyl_data)

# 11. Paracetamol
paracetamol_data = {
    'drug_id': 'paracetamol',
    'generic_name': 'Parasetamol (Asetaminofen)',
    'atc_code': 'N02BE01',
    'formulations': [
        {
            'form_name': 'Parasetamol 120 mg / 5 mL Süspansiyon (Parol / Calpol)',
            'concentration_mg_per_ml': 24.0,
            'concentration_display': '120 mg / 5 mL (24 mg/mL)',
            'measuring_device': 'oral_syringe',
            'storage_condition': '25C altında oda sıcaklığında saklayınız'
        },
        {
            'form_name': 'Parasetamol 250 mg / 5 mL Süspansiyon (Parol Plus / Calpol 6 Plus)',
            'concentration_mg_per_ml': 50.0,
            'concentration_display': '250 mg / 5 mL (50 mg/mL)',
            'measuring_device': 'oral_syringe',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Parasetamol 10 mg / 1 mL IV İnfüzyonluk Çözelti (100 mL)',
            'concentration_mg_per_ml': 10.0,
            'concentration_display': '10 mg/mL (1000 mg/100 mL)',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 1000.0,
            'standard_interval_hours': [4, 6],
            'max_daily_dose_mg': 4000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Ateş ve Akut Hafif-Orta Ağrı (Oral)',
                'min_age_months': 0.0,
                'min_weight_kg': 2.0,
                'dose_per_kg_single': 15.0,
                'interval_hours': 6,
                'max_daily_dose_mg_per_kg': 60.0,
                'absolute_max_single_dose_mg': 1000.0,
                'absolute_max_daily_dose_mg': 4000.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Post-operatif ve Akut Ağrı (IV İnfüzyon ≤10 kg)',
                'min_age_months': 0.0,
                'min_weight_kg': 2.0,
                'dose_per_kg_single': 7.5,
                'interval_hours': 6,
                'max_daily_dose_mg_per_kg': 30.0,
                'absolute_max_single_dose_mg': 75.0,
                'absolute_max_daily_dose_mg': 300.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Post-operatif ve Akut Ağrı (IV İnfüzyon >10 kg)',
                'min_age_months': 12.0,
                'min_weight_kg': 10.0,
                'dose_per_kg_single': 15.0,
                'interval_hours': 6,
                'max_daily_dose_mg_per_kg': 60.0,
                'absolute_max_single_dose_mg': 1000.0,
                'absolute_max_daily_dose_mg': 2000.0,
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
                'adjustment_instruction': 'Standart doz.'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 9.9,
                'action_type': 'INTERVAL_EXTENSION',
                'adjustment_instruction': 'Doz aralığı en az 8 saate açılmalıdır (q8h).'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Ağır karaciğer yetmezliğinde kesinlikle KONTRENDİKEDİR.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'B',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Gebelikte en güvenli analjezik ve antipiretiktir.',
            'second_trimester': 'Kısa süreli en düşük etkili dozda güvenle kullanılır.',
            'third_trimester': 'NSAİİ aksine duktus arteriozusu kapatmaz; 3. trimesterde ilk tercihtir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Süte çok az geçer; emzirmede ilk basamak altın standart analjeziktir.',
            'relative_infant_dose_percent': 1.8,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [
            'Hepatotoksisite: Tek dozda 1000 mg ve günlük 4000 mg tavanının aşılması akut karaciğer nekrozuna yol açar.'
        ],
        'absolute_contraindications': ['Ağır karaciğer yetmezliği veya akut aktif hepatit.'],
        'neonatal_specific_notes': 'Prematüre ve term yenidoğanlarda IV formda 10 kat dozaj hesaplama hatalarına karşı mg ve mL doğrulaması zorunludur. ≤10 kg için tek doz 7.5 mg/kg tavanına uyulmalıdır.'
    },
    'metadata': {
        'source_documents': ['FDA Acetaminophen Overdose & Labeling Rules', 'TİTCK Parasetamol KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'paracetamol' in mono_by_id:
    set_full_monograph(mono_by_id['paracetamol'], paracetamol_data)

# 12. Metronidazole
metronidazole_data = {
    'drug_id': 'metronidazole',
    'generic_name': 'Metronidazol',
    'atc_code': 'J01XD01',
    'formulations': [
        {
            'form_name': 'Flagyl 200 mg / 5 mL Oral Süspansiyon',
            'concentration_mg_per_ml': 40.0,
            'concentration_display': '200 mg / 5 mL (40 mg/mL)',
            'measuring_device': 'oral_syringe',
            'storage_condition': '25C altında oda sıcaklığında saklayınız'
        },
        {
            'form_name': 'Metronidazol 500 mg / 100 mL IV İnfüzyon Şişesi',
            'concentration_mg_per_ml': 5.0,
            'concentration_display': '5 mg/mL (500 mg/100 mL)',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 500.0,
            'standard_interval_hours': [8],
            'max_daily_dose_mg': 2000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Giardiyazis (Oral)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 5.0,
                'interval_hours': 8,
                'max_daily_dose_mg_per_kg': 15.0,
                'absolute_max_single_dose_mg': 500.0,
                'absolute_max_daily_dose_mg': 750.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Pediatrik Anaerop Sepsis / İntraabdominal Enfeksiyon (IV)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 10.0,
                'interval_hours': 8,
                'max_daily_dose_mg_per_kg': 30.0,
                'absolute_max_single_dose_mg': 500.0,
                'absolute_max_daily_dose_mg': 1500.0,
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
                'adjustment_instruction': 'Standart doz.'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 9.9,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Doz %50 azaltılır veya aralık 12 saate açılır.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Ağır karaciğer yetmezliğinde doz %50 azaltılmalı ve nörotoksisite izlenmelidir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'B',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Gerekli durumlarda kullanılabilir; trikomoniyaziste 1. trimesterde kaçınılabilir.',
            'second_trimester': 'Güvenlidir.',
            'third_trimester': 'Güvenlidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Süte geçer; yüksek doz veya tek doz rejimlerde 12-24 saat emzirmeye ara verilebilir.',
            'relative_infant_dose_percent': 9.0,
            'safety_verdict': 'USE_WITH_CAUTION'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Metronidazole veya nitroimidazol türevlerine aşırı duyarlılık.'],
        'neonatal_specific_notes': 'Yenidoğan ve prematürelerde eliminasyon yarı ömrü 3 kat uzar (q12-24h aralık uygulanmalıdır).'
    },
    'metadata': {
        'source_documents': ['CDC Parasitic Disease Guidelines', 'TİTCK Flagyl KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'metronidazole' in mono_by_id:
    set_full_monograph(mono_by_id['metronidazole'], metronidazole_data)

# 13. Fluconazole
fluconazole_data = {
    'drug_id': 'fluconazole',
    'generic_name': 'Flukonazol',
    'atc_code': 'J02AC01',
    'formulations': [
        {
            'form_name': 'Flukonazol 50 mg / 5 mL Oral Süspansiyon (Triflucan)',
            'concentration_mg_per_ml': 10.0,
            'concentration_display': '50 mg / 5 mL (10 mg/mL)',
            'measuring_device': 'oral_syringe',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Flukonazol 2 mg / 1 mL (100 mg / 50 mL) IV Flakon',
            'concentration_mg_per_ml': 2.0,
            'concentration_display': '2 mg/mL (100 mg/50 mL)',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 200.0,
            'standard_interval_hours': [24],
            'max_daily_dose_mg': 800.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Orofaringeal Kandidiyazis (Pamukçuk)',
                'min_age_months': 0.5,
                'min_weight_kg': 2.0,
                'dose_per_kg_single': 3.0,
                'interval_hours': 24,
                'max_daily_dose_mg_per_kg': 6.0,
                'absolute_max_single_dose_mg': 200.0,
                'absolute_max_daily_dose_mg': 200.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'İnvaziv Kandidiyazis / Sistemik Mantar',
                'min_age_months': 0.5,
                'min_weight_kg': 2.0,
                'dose_per_kg_single': 12.0,
                'interval_hours': 24,
                'max_daily_dose_mg_per_kg': 12.0,
                'absolute_max_single_dose_mg': 400.0,
                'absolute_max_daily_dose_mg': 800.0,
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
                'adjustment_instruction': 'Standart doz.'
            },
            {
                'egfr_min': 11.0,
                'egfr_max': 49.9,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'İlk gün standart yükleme; ardından günlük idame dozu %50 azaltılır.'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 10.9,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Diyaliz hastalarında her seans sonrası tam tek doz verilir.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Karaciğer fonksiyon testleri izlenmelidir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'D',
        'pregnancy_trimester_risk': {
            'first_trimester': 'KONTRENDİKE: Yüksek doz veya uzun süreli kullanımda kraniyofasiyal ve kardiyak malformasyon riski.',
            'second_trimester': 'Zorunlu sistemik enfeksiyon hariç kaçınılmalıdır.',
            'third_trimester': 'Yalnızca yaşamı tehdit eden invaziv kandidiyaziste kullanılır.'
        },
        'lactation': {
            'lactmed_record_summary': 'Süte geçer; düşük dozlarda emzirme ile uyumludur.',
            'relative_infant_dose_percent': 8.5,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Azol antifungallere aşırı duyarlılık', 'QTc uzatan ilaçlarla (terfenadin, sisaprid) birlikte kullanım.'],
        'neonatal_specific_notes': 'Yenidoğanlarda GFR düşüklüğü nedeniyle ilk 2 haftada doz aralığı 72 saat, 2-4 haftalık bebeklerde 48 saat olmalıdır.'
    },
    'metadata': {
        'source_documents': ['IDSA Candidiasis Guidelines', 'TİTCK Triflucan KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'fluconazole' in mono_by_id:
    set_full_monograph(mono_by_id['fluconazole'], fluconazole_data)

# 14. Lorazepam
lorazepam_data = {
    'drug_id': 'lorazepam',
    'generic_name': 'Lorazepam',
    'atc_code': 'N05BA06',
    'formulations': [
        {
            'form_name': 'Lorazepam 2 mg / 1 mL Ampul (Ativan)',
            'concentration_mg_per_ml': 2.0,
            'concentration_display': '2 mg/mL',
            'measuring_device': 'none',
            'storage_condition': '2-8C buzdolabında saklayınız (Yeşil Reçete)'
        },
        {
            'form_name': 'Lorazepam 4 mg / 1 mL Ampul',
            'concentration_mg_per_ml': 4.0,
            'concentration_display': '4 mg/mL',
            'measuring_device': 'none',
            'storage_condition': '2-8C buzdolabında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 4.0,
            'standard_interval_hours': [1],
            'max_daily_dose_mg': 8.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Status Epileptikus İlk Basamak IV',
                'min_age_months': 0.5,
                'min_weight_kg': 2.0,
                'dose_per_kg_single': 0.1,
                'interval_hours': 1,
                'max_daily_dose_mg_per_kg': 0.2,
                'absolute_max_single_dose_mg': 4.0,
                'absolute_max_daily_dose_mg': 8.0,
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
                'adjustment_instruction': 'Doğrudan glukuronidasyona uğrar; böbrek yetmezliğinde aktif metabolit oluşturmaz.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Karaciğer yetmezliğinde diazepama göre daha güvenlidir ancak sedasyon izlenmelidir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'D',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Konjenital malformasyon riski; acil nöbet hariç kaçınılmalıdır.',
            'second_trimester': 'Acil durumlarda dikkatle titre edilir.',
            'third_trimester': 'Floppy infant sendromu ve neonatal yoksunluk riski.'
        },
        'lactation': {
            'lactmed_record_summary': 'Süte çok az geçer; kısa süreli kullanımda emzirme ile uyumludur.',
            'relative_infant_dose_percent': 3.0,
            'safety_verdict': 'USE_WITH_CAUTION'
        }
    },
    'safety_warnings': {
        'black_box_warnings': ['Opioidlerle birlikte kullanımda fatal solunum depresyonu ve koma riski.'],
        'absolute_contraindications': ['Ağır solunum yetmezliği', 'Miyasteniya gravis'],
        'neonatal_specific_notes': 'Etki süresi 12-24 saattir; status epileptikusta midazolama göre daha uzun nöbet koruması sağlar ancak solunum monitörizasyonu zorunludur.'
    },
    'metadata': {
        'source_documents': ['ILAE Guidelines: Lorazepam in Pediatric Status', 'TİTCK Ativan KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'lorazepam' in mono_by_id:
    set_full_monograph(mono_by_id['lorazepam'], lorazepam_data)

# 15. Methylprednisolone
methylprednisolone_data = {
    'drug_id': 'methylprednisolone',
    'generic_name': 'Metilprednizolon',
    'atc_code': 'H02AB04',
    'formulations': [
        {
            'form_name': 'Prednol-L 20 mg IM/IV Flakon',
            'concentration_mg_per_ml': 20.0,
            'concentration_display': '20 mg / 1 mL',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Prednol-L 40 mg IM/IV Flakon',
            'concentration_mg_per_ml': 20.0,
            'concentration_display': '40 mg / 2 mL',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Prednol-L 250 mg IM/IV Flakon',
            'concentration_mg_per_ml': 62.5,
            'concentration_display': '250 mg / 4 mL',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 40.0,
            'standard_interval_hours': [8],
            'max_daily_dose_mg': 1000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Akut Ağır Astım Atağı / Status Astmatikus',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 1.0,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 2.0,
                'absolute_max_single_dose_mg': 60.0,
                'absolute_max_daily_dose_mg': 125.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Pediatrik Anafilaksi (İkinci Basamak Refrakterlik)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 1.5,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 2.0,
                'absolute_max_single_dose_mg': 60.0,
                'absolute_max_daily_dose_mg': 125.0,
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
                'adjustment_instruction': 'Doz ayarlaması gerekmez.'
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
        'titck_legacy_category': 'C',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Plasentadan %90 oranında inaktif metabolit olarak geçer; gebelikte en güvenli sistemik glukokortikoiddir.',
            'second_trimester': 'Güvenlidir.',
            'third_trimester': 'Güvenlidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne çok az miktarda geçer; yüksek doz sonrası 2-4 saat emzirmeye ara verilebilir.',
            'relative_infant_dose_percent': 1.5,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Sistemik fungal enfeksiyonlar', 'Canlı aşı uygulamaları.'],
        'neonatal_specific_notes': 'Yüksek doz parenteral steroidlerde hipertansiyon ve hiperglisemi izlenmelidir.'
    },
    'metadata': {
        'source_documents': ['GINA Severe Asthma Management', 'TİTCK Prednol-L KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'methylprednisolone' in mono_by_id:
    set_full_monograph(mono_by_id['methylprednisolone'], methylprednisolone_data)

# 16. Ibuprofen
ibuprofen_data = {
    'drug_id': 'ibuprofen',
    'generic_name': 'İbuprofen',
    'atc_code': 'M01AE01',
    'formulations': [
        {
            'form_name': 'İbuprofen 100 mg / 5 mL Süspansiyon (İbufen / Dolven / Pedifen)',
            'concentration_mg_per_ml': 20.0,
            'concentration_display': '100 mg / 5 mL (20 mg/mL)',
            'measuring_device': 'oral_syringe',
            'storage_condition': '25C altında oda sıcaklığında saklayınız'
        },
        {
            'form_name': 'İbuprofen 400 mg Film Tablet',
            'concentration_mg_per_ml': 400.0,
            'concentration_display': '400 mg tablet',
            'measuring_device': 'none',
            'storage_condition': 'Oda sıcaklığında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 400.0,
            'standard_interval_hours': [8],
            'max_daily_dose_mg': 1200.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Ateş ve Enflamasyon (≥3 Ay ve ≥5 kg)',
                'min_age_months': 3.0,
                'min_weight_kg': 5.0,
                'dose_per_kg_single': 10.0,
                'interval_hours': 8,
                'max_daily_dose_mg_per_kg': 30.0,
                'absolute_max_single_dose_mg': 400.0,
                'absolute_max_daily_dose_mg': 1200.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Juvenil İdiyopatik Artrit (JIA)',
                'min_age_months': 6.0,
                'min_weight_kg': 7.0,
                'dose_per_kg_single': 10.0,
                'interval_hours': 6,
                'max_daily_dose_mg_per_kg': 40.0,
                'absolute_max_single_dose_mg': 400.0,
                'absolute_max_daily_dose_mg': 1200.0,
                'weight_metric_in_obesity': 'TBW'
            }
        ]
    },
    'organ_impairment': {
        'renal_adjustments': [
            {
                'egfr_min': 30.0,
                'egfr_max': 999.0,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Standart doz; dehidrate çocukta kullanılmamalıdır.'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 29.9,
                'action_type': 'CONTRAINDICATED',
                'adjustment_instruction': 'eGFR <30 mL/dk olan olgularda nefrotoksisite riski nedeniyle KONTRENDİKEDİR.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Ağır karaciğer yetmezliğinde kontrendikedir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'C',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Düşük ve kardiyak defekt riski bildirilmiştir; zorunlu değilse kaçınılmalıdır.',
            'second_trimester': 'Kısa süreli kullanılabilir. 20. haftadan sonra fetal böbrek disfonksiyonu ve oligohidramniyos yapabilir.',
            'third_trimester': 'KESİN KONTRENDİKE: Ductus arteriosus vaktinden önce kapanması, persistan pulmoner hipertansiyon ve doğumun gecikmesi riski!'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne ihmal edilebilir oranda geçer; emzirme ile uyumludur.',
            'relative_infant_dose_percent': 0.6,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [
            'Kardiyovasküler trombotik olaylar ve gastrointestinal kanama, ülserasyon veya perforasyon riski.'
        ],
        'absolute_contraindications': [
            '<3 ay veya <5 kg infantlar',
            'Aktif gastrointestinal kanama veya peptik ülser',
            'Ağır böbrek veya kalp yetmezliği',
            'Gebeliğin 3. trimesteri (20. haftadan itibaren)'
        ],
        'neonatal_specific_notes': 'Oral ibuprofen süspansiyon <3 ay veya <5 kg bebeklerde KESİN KONTRENDİKEDİR (3-6 ay veya 5-7 kg arası TİTCK ruhsat kısıtı taşır).',
        'critical_drug_interactions': [
            {
                'interacting_drug': 'ACE İnhibitörleri / ARB + Diüretikler (Triple Whammy)',
                'severity': 'MAJOR',
                'clinical_management': 'Akut böbrek yetmezliği riski nedeniyle birlikte kullanılmamalı veya sıkı hidrasyon ve eGFR takibi yapılmalıdır.'
            }
        ]
    },
    'metadata': {
        'source_documents': ['FDA NSAID Warning: Fetal Renal Dysfunction', 'TİTCK İbuprofen KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'ibuprofen' in mono_by_id:
    set_full_monograph(mono_by_id['ibuprofen'], ibuprofen_data)

# 17. Amoxicillin
amoxicillin_data = {
    'drug_id': 'amoxicillin',
    'generic_name': 'Amoksisilin',
    'atc_code': 'J01CA04',
    'formulations': [
        {
            'form_name': 'Amoksisilin 250 mg / 5 mL Süspansiyon (Largopen / Alfoxil)',
            'concentration_mg_per_ml': 50.0,
            'concentration_display': '250 mg / 5 mL (50 mg/mL)',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 14,
            'storage_condition': 'Sulandırıldıktan sonra 2-8C buzdolabında 14 gün saklayınız'
        },
        {
            'form_name': 'Amoksisilin 500 mg / 5 mL Süspansiyon (Largopen Forte)',
            'concentration_mg_per_ml': 100.0,
            'concentration_display': '500 mg / 5 mL (100 mg/mL)',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 14,
            'storage_condition': 'Sulandırıldıktan sonra 2-8C buzdolabında 14 gün saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 500.0,
            'standard_interval_hours': [8],
            'max_daily_dose_mg': 3000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Hafif-Orta Solunum Yolu Enfeksiyonu',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 20.0,
                'interval_hours': 8,
                'max_daily_dose_mg_per_kg': 50.0,
                'absolute_max_single_dose_mg': 1000.0,
                'absolute_max_daily_dose_mg': 2000.0,
                'weight_metric_in_obesity': 'IBW'
            },
            {
                'indication': 'Akut Otitis Media / Yüksek Doz Pnömokok',
                'min_age_months': 2.0,
                'min_weight_kg': 4.0,
                'dose_per_kg_single': 45.0,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 90.0,
                'absolute_max_single_dose_mg': 1500.0,
                'absolute_max_daily_dose_mg': 3000.0,
                'weight_metric_in_obesity': 'IBW'
            }
        ]
    },
    'organ_impairment': {
        'renal_adjustments': [
            {
                'egfr_min': 30.0,
                'egfr_max': 999.0,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Standart doz.'
            },
            {
                'egfr_min': 10.0,
                'egfr_max': 29.9,
                'action_type': 'INTERVAL_EXTENSION',
                'adjustment_instruction': 'Doz aralığı 12 saate açılır (q12h).'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 9.9,
                'action_type': 'INTERVAL_EXTENSION',
                'adjustment_instruction': 'Doz aralığı 24 saate açılır (q24h).'
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
            'first_trimester': 'Gebelikte güvenle kullanılır; ilk basamak antibiyotiktir.',
            'second_trimester': 'Güvenlidir.',
            'third_trimester': 'Güvenlidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne çok az miktarda geçer; emzirmede güvenlidir.',
            'relative_infant_dose_percent': 0.5,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Penisilin grubu antibiyotiklere anafilaksi öyküsü'],
        'neonatal_specific_notes': 'AOM protokolünde yüksek doz (80-90 mg/kg) dirençli pnömokok suşlarını eradike etmek için önerilir.'
    },
    'metadata': {
        'source_documents': ['AAP AOM Guidelines', 'TİTCK Largopen KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'amoxicillin' in mono_by_id:
    set_full_monograph(mono_by_id['amoxicillin'], amoxicillin_data)

# 18. Amoxicillin-Clavulanate
amoxicillin_clav_data = {
    'drug_id': 'amoxicillin-clavulanate',
    'generic_name': 'Amoksisilin + Klavulanik Asit',
    'atc_code': 'J01CR02',
    'formulations': [
        {
            'form_name': 'Augmentin BID 200/28 mg Oral Süspansiyon (7:1)',
            'concentration_mg_per_ml': 45.6,
            'concentration_display': '200 mg Amoksisilin + 28.5 mg Klavulanat / 5 mL',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 7,
            'storage_condition': 'Sulandırıldıktan sonra 2-8C buzdolabında 7 gün saklayınız'
        },
        {
            'form_name': 'Augmentin BID 400/57 mg Oral Süspansiyon (7:1 - Forte)',
            'concentration_mg_per_ml': 91.4,
            'concentration_display': '400 mg Amoksisilin + 57 mg Klavulanat / 5 mL',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 7,
            'storage_condition': 'Sulandırıldıktan sonra 2-8C buzdolabında 7 gün saklayınız'
        },
        {
            'form_name': 'Augmentin ES 600/42.9 mg Oral Süspansiyon (14:1)',
            'concentration_mg_per_ml': 128.5,
            'concentration_display': '600 mg Amoksisilin + 42.9 mg Klavulanat / 5 mL',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 10,
            'storage_condition': 'Sulandırıldıktan sonra 2-8C buzdolabında 10 gün saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 1000.0,
            'standard_interval_hours': [12],
            'max_daily_dose_mg': 2000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Hafif-Orta Enfeksiyonlar (7:1 BID Formu)',
                'min_age_months': 2.0,
                'min_weight_kg': 4.0,
                'dose_per_kg_single': 20.0,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 45.0,
                'absolute_max_single_dose_mg': 875.0,
                'absolute_max_daily_dose_mg': 1750.0,
                'weight_metric_in_obesity': 'IBW'
            },
            {
                'indication': 'Dirençli Akut Otitis Media / Sinüzit (14:1 ES Formu)',
                'min_age_months': 3.0,
                'min_weight_kg': 5.0,
                'dose_per_kg_single': 45.0,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 90.0,
                'absolute_max_single_dose_mg': 2000.0,
                'absolute_max_daily_dose_mg': 4000.0,
                'weight_metric_in_obesity': 'IBW'
            }
        ]
    },
    'organ_impairment': {
        'renal_adjustments': [
            {
                'egfr_min': 30.0,
                'egfr_max': 999.0,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Doz ayarlaması gerekmez.'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 29.9,
                'action_type': 'CONTRAINDICATED',
                'adjustment_instruction': 'eGFR <30 olan çocuklarda 14:1 ES veya BID 875/125 formları önerilmez; standart formülasyona geçilmelidir.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Klavulanat kolestaz yapabilir; karaciğer fonksiyonları izlenmelidir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'B',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Gerekli olmadıkça kaçınılmalıdır.',
            'second_trimester': 'Kullanılabilir.',
            'third_trimester': 'Kullanılabilir; preterm erken membran rüptüründe profilaktik kullanım nekrotizan enterokolit riskini artırabilir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne çok az miktarda geçer; infantta diyare ve kandidiyazis izlenmelidir.',
            'relative_infant_dose_percent': 0.5,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': [
            'Penisilin ve beta-laktamlara anafilaksi',
            'Amoksisilin-klavulanat ilişkili kolestatik sarılık veya hepatik disfonksiyon öyküsü',
            '<3 ay bebekler (14:1 ES için)'
        ],
        'neonatal_specific_notes': '7:1 formülasyonu ile 90 mg/kg yüksek doz verilmesi klavulanat toksisitesine ve şiddetli ozmotik diyareye yol açar! Yüksek doz (80-90 mg/kg) için 14:1 (ES) şarttır.',
        'critical_drug_interactions': [
            {
                'interacting_drug': 'Metotreksat',
                'severity': 'MAJOR',
                'clinical_management': 'Böbrek tübüler sekresyonunu bloke ederek metotreksat klerensini azaltır; toksisiteyi önlemek için birlikte verilmemelidir.'
            }
        ]
    },
    'metadata': {
        'source_documents': ['AAP Acute Otitis Media Guidelines', 'TİTCK Augmentin KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'amoxicillin-clavulanate' in mono_by_id:
    set_full_monograph(mono_by_id['amoxicillin-clavulanate'], amoxicillin_clav_data)

# 19. Ondansetron
ondansetron_data = {
    'drug_id': 'ondansetron',
    'generic_name': 'Ondansetron',
    'atc_code': 'A04AA01',
    'formulations': [
        {
            'form_name': 'Zofran 4 mg / 5 mL Oral Çözelti',
            'concentration_mg_per_ml': 0.8,
            'concentration_display': '4 mg / 5 mL (0.8 mg/mL)',
            'measuring_device': 'oral_syringe',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Zofran 4 mg / 2 mL IV Ampul',
            'concentration_mg_per_ml': 2.0,
            'concentration_display': '4 mg / 2 mL (2 mg/mL)',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak saklayınız'
        },
        {
            'form_name': 'Zofran 8 mg / 4 mL IV Ampul',
            'concentration_mg_per_ml': 2.0,
            'concentration_display': '8 mg / 4 mL (2 mg/mL)',
            'measuring_device': 'none',
            'storage_condition': 'Işıktan koruyarak saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 8.0,
            'standard_interval_hours': [8],
            'max_daily_dose_mg': 24.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Akut Gastroenterit İnatçı Kusma (Oral Protokol)',
                'min_age_months': 6.0,
                'min_weight_kg': 8.0,
                'dose_per_kg_single': 0.15,
                'interval_hours': 8,
                'max_daily_dose_mg_per_kg': 0.45,
                'absolute_max_single_dose_mg': 8.0,
                'absolute_max_daily_dose_mg': 24.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Postoperatif Bulantı ve Kusma (PONV / IV)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 0.1,
                'interval_hours': 8,
                'max_daily_dose_mg_per_kg': 0.3,
                'absolute_max_single_dose_mg': 4.0,
                'absolute_max_daily_dose_mg': 12.0,
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
                'action_instruction': 'Ağır karaciğer yetmezliğinde günlük toplam doz 8 mg ı geçmemelidir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'B',
        'pregnancy_trimester_risk': {
            'first_trimester': 'İlk trimesterde yarık damak riski tartışmalıdır; hiperemezis gravidarumda 2. basamak seçenektir.',
            'second_trimester': 'Güvenle kullanılır.',
            'third_trimester': 'Güvenle kullanılır.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne çok az miktarda geçer; emzirmede güvenlidir.',
            'relative_infant_dose_percent': 1.2,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [
            'Doz bağımlı QTc aralığı uzaması ve Torsades de Pointes riski; konjenital uzun QT veya hipokalemi durumunda dikkat edilmelidir.'
        ],
        'absolute_contraindications': ['Apomorfin ile eşzamanlı kullanım (şiddetli hipotansiyon ve bilinç kaybı)', 'Konjenital uzun QT sendromu'],
        'neonatal_specific_notes': 'Akut gastroenteritte oral tek doz kilo bantları: 8-15 kg -> 2 mg; 15.1-30 kg -> 4 mg; >30 kg -> 8 mg. <6 ay veya <8 kg bebeklerde AGE için önerilmez.'
    },
    'metadata': {
        'source_documents': ['AAP Pediatric Gastroenteritis Ondansetron Protocol', 'TİTCK Zofran KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'ondansetron' in mono_by_id:
    set_full_monograph(mono_by_id['ondansetron'], ondansetron_data)

# 20. Salbutamol
salbutamol_data = {
    'drug_id': 'salbutamol',
    'generic_name': 'Salbutamol (Albuterol)',
    'atc_code': 'R03AC02',
    'formulations': [
        {
            'form_name': 'Ventolin 2.5 mg / 2.5 mL Nebül Çözeltisi',
            'concentration_mg_per_ml': 1.0,
            'concentration_display': '2.5 mg / 2.5 mL (1 mg/mL)',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Ventolin 5 mg / 2.5 mL Nebül Çözeltisi',
            'concentration_mg_per_ml': 2.0,
            'concentration_display': '5 mg / 2.5 mL (2 mg/mL)',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Ventolin 100 mcg / Doz İnhaler (Ölçülü Doz İnhaleri)',
            'concentration_mg_per_ml': 0.1,
            'concentration_display': '100 mcg / puf',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 2.5,
            'standard_interval_hours': [4],
            'max_daily_dose_mg': 20.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Akut Astım / Bronkospazm Atağı (Nebül)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 0.15,
                'interval_hours': 4,
                'max_daily_dose_mg_per_kg': 0.6,
                'absolute_max_single_dose_mg': 5.0,
                'absolute_max_daily_dose_mg': 20.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Akut Astım Atağı (MDI + Spacer / Hazne)',
                'min_age_months': 1.0,
                'min_weight_kg': 3.0,
                'dose_per_kg_single': 0.05,
                'interval_hours': 4,
                'max_daily_dose_mg_per_kg': 0.4,
                'absolute_max_single_dose_mg': 1.0,
                'absolute_max_daily_dose_mg': 4.0,
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
                'adjustment_instruction': 'İnhaler / nebül formda doz ayarlaması gerekmez.'
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
        'titck_legacy_category': 'C',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Akut astım krizinde maternal hipoksinin fetusa zararı ilacın riskinden kat be kat fazladır; güvenle kullanılır.',
            'second_trimester': 'Güvenlidir.',
            'third_trimester': 'Yüksek doz parenteral formu tokolitik etki yapabilir; inhaler form güvenlidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne çok az miktarda geçer; emzirme ile uyumludur.',
            'relative_infant_dose_percent': 0.5,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Salbutamole aşırı duyarlılık'],
        'neonatal_specific_notes': 'GINA ve AAP kılavuzları pediatrik oral şurup formunu (tremor, taşikardi, hipokalemi) kesinlikle önermemektedir; aerochamber/hazne ile inhaler veya nebül form altın standarttır.'
    },
    'metadata': {
        'source_documents': ['GINA Global Strategy for Asthma Management', 'TİTCK Ventolin KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'salbutamol' in mono_by_id:
    set_full_monograph(mono_by_id['salbutamol'], salbutamol_data)

# 21. Cefuroxime
cefuroxime_data = {
    'drug_id': 'cefuroxime',
    'generic_name': 'Sefuroksim Aksetil',
    'atc_code': 'J01DC02',
    'formulations': [
        {
            'form_name': 'Zinnat 125 mg / 5 mL Pediatrik Süspansiyon',
            'concentration_mg_per_ml': 25.0,
            'concentration_display': '125 mg / 5 mL (25 mg/mL)',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 10,
            'storage_condition': 'Sulandırıldıktan sonra 2-8C buzdolabında 10 gün saklayınız'
        },
        {
            'form_name': 'Zinnat 250 mg / 5 mL Pediatrik Forte Süspansiyon',
            'concentration_mg_per_ml': 50.0,
            'concentration_display': '250 mg / 5 mL (50 mg/mL)',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 10,
            'storage_condition': 'Sulandırıldıktan sonra 2-8C buzdolabında 10 gün saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 500.0,
            'standard_interval_hours': [12],
            'max_daily_dose_mg': 1000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Üst ve Alt Solunum Yolu Enfeksiyonları',
                'min_age_months': 3.0,
                'min_weight_kg': 5.0,
                'dose_per_kg_single': 10.0,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 30.0,
                'absolute_max_single_dose_mg': 500.0,
                'absolute_max_daily_dose_mg': 1000.0,
                'weight_metric_in_obesity': 'IBW'
            },
            {
                'indication': 'Akut Otitis Media (AOM)',
                'min_age_months': 3.0,
                'min_weight_kg': 5.0,
                'dose_per_kg_single': 15.0,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 30.0,
                'absolute_max_single_dose_mg': 500.0,
                'absolute_max_daily_dose_mg': 1000.0,
                'weight_metric_in_obesity': 'IBW'
            }
        ]
    },
    'organ_impairment': {
        'renal_adjustments': [
            {
                'egfr_min': 20.0,
                'egfr_max': 999.0,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Standart doz (q12h).'
            },
            {
                'egfr_min': 10.0,
                'egfr_max': 19.9,
                'action_type': 'INTERVAL_EXTENSION',
                'adjustment_instruction': 'Doz aralığı 24 saate uzatılır (q24h).'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 9.9,
                'action_type': 'INTERVAL_EXTENSION',
                'adjustment_instruction': '48 saatte bir tek doz uygulanır (q48h).'
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
            'third_trimester': 'Güvenlidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne çok az miktarda geçer; emzirme ile uyumludur.',
            'relative_infant_dose_percent': 1.0,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Sefalosporin antibiyotiklere anafilaksi'],
        'neonatal_specific_notes': '<3 ay bebeklerde güvenlilik ve etkinlik verisi sınırlıdır; emilimini artırmak için yemeklerle birlikte verilmelidir.'
    },
    'metadata': {
        'source_documents': ['AAP Red Book Cefuroxime', 'TİTCK Zinnat KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'cefuroxime' in mono_by_id:
    set_full_monograph(mono_by_id['cefuroxime'], cefuroxime_data)

# 22. Azithromycin
azithromycin_data = {
    'drug_id': 'azithromycin',
    'generic_name': 'Azitromisin',
    'atc_code': 'J01FA10',
    'formulations': [
        {
            'form_name': 'Azitro 200 mg / 5 mL Oral Süspansiyon (Zithromax)',
            'concentration_mg_per_ml': 40.0,
            'concentration_display': '200 mg / 5 mL (40 mg/mL)',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 10,
            'storage_condition': 'Sulandırıldıktan sonra oda sıcaklığında (25C altında) 10 gün saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 500.0,
            'standard_interval_hours': [24],
            'max_daily_dose_mg': 500.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Toplum Kökenli Atipik Pnömoni / Farenjit (3 Günlük Kür)',
                'min_age_months': 6.0,
                'min_weight_kg': 6.0,
                'dose_per_kg_single': 10.0,
                'interval_hours': 24,
                'max_daily_dose_mg_per_kg': 10.0,
                'absolute_max_single_dose_mg': 500.0,
                'absolute_max_daily_dose_mg': 500.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Atipik Solunum Enfeksiyonu (5 Günlük Kür)',
                'min_age_months': 6.0,
                'min_weight_kg': 6.0,
                'dose_per_kg_single': 10.0,
                'interval_hours': 24,
                'max_daily_dose_mg_per_kg': 10.0,
                'absolute_max_single_dose_mg': 500.0,
                'absolute_max_daily_dose_mg': 500.0,
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
                'adjustment_instruction': 'Standart doz.'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 9.9,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'eGFR <10 mL/dk ise dikkatle izlenmelidir; doz ayarlaması resmi KÜB de tanımlanmamıştır.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Ağır karaciğer yetmezliğinde safra klerensi azalır; dikkatle kullanılmalıdır.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'B',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Gebelikte güvenle kullanılabilir (Kategori B).',
            'second_trimester': 'Güvenlidir.',
            'third_trimester': 'Güvenlidir.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne geçer; emzirmede güvenli kabul edilir.',
            'relative_infant_dose_percent': 6.0,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [
            'Kardiyak risk: QTc uzaması ve fatal kardiyak aritmi riski (özellikle hipokalemi veya uzun QT öyküsü olanlarda).'
        ],
        'absolute_contraindications': ['Makrolid veya ketolid antibiyotiklere aşırı duyarlılık', 'Kolestatik sarılık/hepatik yetmezlik öyküsü'],
        'neonatal_specific_notes': '<6 haftalık bebeklerde pertussis profilaksisinde infant hipertrofik pilor stenozu (İHPS) riski aileye anlatılmalı ve beslenme sonrası fışkırır tarzda kusma izlenmelidir.'
    },
    'metadata': {
        'source_documents': ['CDC Pertussis Post-exposure Prophylaxis', 'TİTCK Azitro KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'azithromycin' in mono_by_id:
    set_full_monograph(mono_by_id['azithromycin'], azithromycin_data)

# 23. Clarithromycin
clarithromycin_data = {
    'drug_id': 'clarithromycin',
    'generic_name': 'Klaritromisin',
    'atc_code': 'J01FA09',
    'formulations': [
        {
            'form_name': 'Klacid 125 mg / 5 mL Pediatrik Süspansiyon',
            'concentration_mg_per_ml': 25.0,
            'concentration_display': '125 mg / 5 mL (25 mg/mL)',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 14,
            'storage_condition': 'Sulandırıldıktan sonra 25C altında oda sıcaklığında 14 gün saklayınız (Buzdolabına KOYMAYINIZ)'
        },
        {
            'form_name': 'Klacid 250 mg / 5 mL Pediatrik Forte Süspansiyon',
            'concentration_mg_per_ml': 50.0,
            'concentration_display': '250 mg / 5 mL (50 mg/mL)',
            'measuring_device': 'oral_syringe',
            'reconstitution_stability_days': 14,
            'storage_condition': 'Sulandırıldıktan sonra oda sıcaklığında 14 gün saklayınız (Buzdolabına KOYMAYINIZ)'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 500.0,
            'standard_interval_hours': [12],
            'max_daily_dose_mg': 1000.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Pediatrik Solunum Yolu ve Cilt Enfeksiyonları (≥6 Ay)',
                'min_age_months': 6.0,
                'min_weight_kg': 6.0,
                'dose_per_kg_single': 7.5,
                'interval_hours': 12,
                'max_daily_dose_mg_per_kg': 15.0,
                'absolute_max_single_dose_mg': 500.0,
                'absolute_max_daily_dose_mg': 1000.0,
                'weight_metric_in_obesity': 'IBW'
            }
        ]
    },
    'organ_impairment': {
        'renal_adjustments': [
            {
                'egfr_min': 30.0,
                'egfr_max': 999.0,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Standart doz.'
            },
            {
                'egfr_min': 0.0,
                'egfr_max': 29.9,
                'action_type': 'DOSE_REDUCTION',
                'adjustment_instruction': 'Doz %50 azaltılır (günde 1 kez veya yarı doz BID).'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Böbrek fonksiyonu normalse hafif-orta karaciğer yetmezliğinde ayarlama gerekmez; ağır yetmezlikte dikkat edilmelidir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'C',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Hayvan çalışmalarında teratojenik risk; gebelikte azitromisin tercih edilmelidir.',
            'second_trimester': 'Alternatif yoksa dikkatle kullanılır.',
            'third_trimester': 'Alternatif yoksa kullanılır.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne geçer; emzirmede azitromisin tercih edilir.',
            'relative_infant_dose_percent': 2.0,
            'safety_verdict': 'USE_WITH_CAUTION'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [
            'Güçlü CYP3A4 inhibitörüdür; kolşisin, statinler ve ergotamin ile birlikte kullanımda fatal etkileşim riski.'
        ],
        'absolute_contraindications': ['Kolşisin ile birlikte böbrek/karaciğer yetmezliğinde kullanım', 'QTc uzatan ilaçlarla birlikte kullanım'],
        'neonatal_specific_notes': '<6 ay bebeklerde güvenliliği kanıtlanmamıştır (TİTCK ruhsat sınırı ≥6 aydır).'
    },
    'metadata': {
        'source_documents': ['FDA Drug Safety: Clarithromycin CYP3A4 Interactions', 'TİTCK Klacid KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'clarithromycin' in mono_by_id:
    set_full_monograph(mono_by_id['clarithromycin'], clarithromycin_data)

# 24. Dexamethasone
dexamethasone_data = {
    'drug_id': 'dexamethasone',
    'generic_name': 'Deksametazon',
    'atc_code': 'H02AB02',
    'formulations': [
        {
            'form_name': 'Dekort 8 mg / 2 mL Ampul',
            'concentration_mg_per_ml': 4.0,
            'concentration_display': '8 mg / 2 mL (4 mg/mL)',
            'measuring_device': 'none',
            'storage_condition': '25C altında saklayınız'
        },
        {
            'form_name': 'Dekort 0.5 mg / 0.75 mg Tablet',
            'concentration_mg_per_ml': 0.5,
            'concentration_display': '0.5 mg tablet',
            'measuring_device': 'none',
            'storage_condition': 'Oda sıcaklığında saklayınız'
        }
    ],
    'dosing': {
        'adult_dosing': {
            'standard_single_dose_mg': 8.0,
            'standard_interval_hours': [12],
            'max_daily_dose_mg': 24.0
        },
        'pediatric_dosing': [
            {
                'indication': 'Akut Krup (Laringotrakeit - Tek Doz Altın Standart)',
                'min_age_months': 3.0,
                'min_weight_kg': 4.0,
                'dose_per_kg_single': 0.15,
                'interval_hours': 24,
                'max_daily_dose_mg_per_kg': 0.6,
                'absolute_max_single_dose_mg': 16.0,
                'absolute_max_daily_dose_mg': 16.0,
                'weight_metric_in_obesity': 'TBW'
            },
            {
                'indication': 'Pediatrik Bakteriyel Menenjit (İlk Doz Antibiyotikten Önce)',
                'min_age_months': 2.0,
                'min_weight_kg': 4.0,
                'dose_per_kg_single': 0.15,
                'interval_hours': 6,
                'max_daily_dose_mg_per_kg': 0.6,
                'absolute_max_single_dose_mg': 10.0,
                'absolute_max_daily_dose_mg': 40.0,
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
                'adjustment_instruction': 'Doz ayarlaması gerekmez.'
            }
        ],
        'hepatic_adjustments': [
            {
                'child_pugh_class': 'Class_C',
                'action_instruction': 'Karaciğerde metabolize olur; uzamış yarılanma ömrü görülebilir.'
            }
        ]
    },
    'reproductive_safety': {
        'titck_legacy_category': 'C',
        'pregnancy_trimester_risk': {
            'first_trimester': 'Yüksek dozlarda yarık damak riski bildirilmiştir; fetal akciğer matürasyonu hariç dikkatle kullanılır.',
            'second_trimester': 'Fetal akciğer matürasyonu için endikedir (24-34. haftalar arası).',
            'third_trimester': 'Erken doğum riski olan gebelerde preterm fetal akciğer matürasyonu için hayat kurtarıcıdır.'
        },
        'lactation': {
            'lactmed_record_summary': 'Anne sütüne geçer; tek doz uygulamalarda emzirmeye engel teşkil etmez.',
            'relative_infant_dose_percent': 4.0,
            'safety_verdict': 'COMPATIBLE'
        }
    },
    'safety_warnings': {
        'black_box_warnings': [],
        'absolute_contraindications': ['Sistemik fungal enfeksiyon', 'Canlı virüs aşıları'],
        'neonatal_specific_notes': 'Akut krup tedavisinde oral veya IM 0.15 mg/kg tek doz, 0.6 mg/kg kadar etkilidir ve hastane yatışını dramatik azaltır.'
    },
    'metadata': {
        'source_documents': ['AAP Croup Clinical Guidelines', 'TİTCK Dekort KÜB'],
        'version_date': '2026-REV01',
        'last_reviewed_iso': '2026-10-26'
    }
}
if 'dexamethasone' in mono_by_id:
    set_full_monograph(mono_by_id['dexamethasone'], dexamethasone_data)

# Save back to clinical_monographs.json
with open('public/data/clinical_monographs.json', 'w', encoding='utf-8') as f:
    json.dump(monographs, f, ensure_ascii=False, indent=2)

print(f'Enrichment complete! Total monographs: {len(monographs)}')
