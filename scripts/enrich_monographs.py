import json

# Load current monographs
with open('public/data/clinical_monographs.json', 'r', encoding='utf-8') as f:
    monographs = json.load(f)

mono_by_id = {m['id']: m for m in monographs}

# 1. Enrich existing monographs among the 25 critical drugs
# Epinephrine
if 'epinephrine' in mono_by_id:
    mono_by_id['epinephrine'].update({
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
        'reproductive_safety': {
            'titck_legacy_category': 'C',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Gerekli acil durumlarda (anafilaksi) yaşam kurtarıcıdır, tereddütsüz uygulanır.',
                'second_trimester': 'Anafilaksi ve kardiyak resüsitasyonda mutlak endikedir.',
                'third_trimester': 'Uterin perfüzyonu geçici azaltabilir; ancak maternal resüsitasyon fetal yaşamın ön koşuludur.'
            },
            'lactation': {
                'lactmed_record_summary': 'Oral biyoyararlanımı son derece düşüktür; anne sütüne geçse dahi infant gastrointestinal kanalında hızla parçalanır.',
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
    })

# Ceftriaxone
if 'ceftriaxone' in mono_by_id:
    mono_by_id['ceftriaxone'].update({
        'drug_id': 'ceftriaxone',
        'generic_name': 'Seftriakson',
        'atc_code': 'J01DD04',
        'formulations': [
            {
                'form_name': 'Seftriakson 500 mg / 1000 mg IV/IM Flakon',
                'concentration_mg_per_ml': 100.0,
                'measuring_device': 'none',
                'storage_condition': '25C altında oda sıcaklığında saklayınız'
            }
        ],
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Gebelikte güvenle kullanılabilir (Kategori B).',
                'second_trimester': 'Gebelikte güvenlidir.',
                'third_trimester': 'Gebelikte güvenlidir; doğum öncesi kalsiyumlu IV solüsyonlarla temas ettirilmemelidir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Süte çok düşük oranda geçer; infantta diyare ve kandidiyazis izlenmelidir.',
                'relative_infant_dose_percent': 1.2,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': [
                '<=28 günlük yenidoğanlarda kalsiyum içeren IV solüsyonlarla (Ringer Laktat, TPN) eşzamanlı veya ardışık kullanım (aynı veya farklı damar yolu fark etmeksizin fatal pulmoner ve renal presipitasyon riski!)',
                'Hiperbilirubinemik, sarılıklı veya hipoalbüminemik yenidoğanlar (kernikterus riski)'
            ],
            'neonatal_specific_notes': '<=28 günlük yenidoğanlarda mutlak kontrendikedir. >28 günlük çocuklarda damar yolu SF ile yıkanmak koşuluyla kalsiyumlu sıvılar ardışık verilebilir.',
            'critical_drug_interactions': [
                {
                    'interacting_drug': 'Kalsiyum Glukonat / Kalsiyum Klorür / Ringer Laktat',
                    'severity': 'MAJOR',
                    'clinical_management': '<=28 günlük yenidoğanda birlikte kullanımı KESİN KONTRENDİKEDİR.'
                }
            ]
        }
    })

# Vancomycin
if 'vancomycin' in mono_by_id:
    mono_by_id['vancomycin'].update({
        'drug_id': 'vancomycin',
        'generic_name': 'Vankomisin',
        'atc_code': 'J01XA01',
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
            'neonatal_specific_notes': 'Prematüre ve term yenidoğanlarda postmenstrüel yaşa göre doz aralığı 8-12-24 saat olarak titre edilir.',
            'critical_drug_interactions': [
                {
                    'interacting_drug': 'Piperasilin-Tazobaktam',
                    'severity': 'MODERATE',
                    'clinical_management': 'Nefrotoksisite sinerjisi riski; ACORN çalışması ışığında böbrek fonksiyonları ve kreatinin günlük izlenmelidir.'
                }
            ]
        }
    })

# Midazolam
if 'midazolam' in mono_by_id:
    mono_by_id['midazolam'].update({
        'drug_id': 'midazolam',
        'generic_name': 'Midazolam',
        'atc_code': 'N05CD08',
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
                'safety_verdict': 'COMPATIBLE',
                'infant_monitoring': 'Bebekte sedasyon, zayıf emme ve hipotoni izlenmelidir.'
            }
        },
        'safety_warnings': {
            'black_box_warnings': ['Hızlı bolus IV enjeksiyonda solunum arresti ve apne riski; resüsitasyon ekipmanı ve Flumazenil hazır bulundurulmalıdır.'],
            'absolute_contraindications': ['Ağır solunum yetmezliği, miyasteniya gravis, dar açılı glokom.'],
            'neonatal_specific_notes': 'Yenidoğanda eliminasyon yarı ömrü uzundur; hipotansiyon riski nedeniyle yavaş infüzyonla verilmelidir.'
        }
    })

# Diazepam
if 'diazepam' in mono_by_id:
    mono_by_id['diazepam'].update({
        'drug_id': 'diazepam',
        'generic_name': 'Diazepam',
        'atc_code': 'N05BA01',
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
                'safety_verdict': 'USE_WITH_CAUTION',
                'infant_monitoring': 'Sedasyon ve yetersiz kilo alımı izlenmelidir.'
            }
        },
        'safety_warnings': {
            'black_box_warnings': ['Opioidlerle birlikte kullanımda fatal solunum depresyonu ve koma riski.'],
            'absolute_contraindications': ['Ağır solunum yetmezliği, koma, miyasteniya gravis.'],
            'neonatal_specific_notes': 'Sodyum benzoat içeren formülasyonlar yenidoğanda kernikterusu tetikleyebilir.'
        }
    })

# Levetiracetam
if 'levetiracetam' in mono_by_id:
    mono_by_id['levetiracetam'].update({
        'drug_id': 'levetiracetam',
        'generic_name': 'Levetirasetam',
        'atc_code': 'N03AX14',
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
                'safety_verdict': 'COMPATIBLE',
                'infant_monitoring': 'Bebekte sedasyon ve uyuşukluk izlenmelidir.'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Levetirasetama veya pirolidon türevlerine aşırı duyarlılık.'],
            'neonatal_specific_notes': 'Sedasyon ve solunum depresyonu yapmaz; neonatal nöbetlerde güvenli ikinci basamak ajandır.'
        }
    })

# Phenytoin
if 'phenytoin' in mono_by_id:
    mono_by_id['phenytoin'].update({
        'drug_id': 'phenytoin',
        'generic_name': 'Fenitoin Sodyum',
        'atc_code': 'N03AB02',
        'safety_warnings': {
            'black_box_warnings': ['İnfüzyon hızı yetişkinde 50 mg/dk, çocukta 1 mg/kg/dk üzerine çıktığında şiddetli hipotansiyon ve ölümcül kardiyak aritmi riski!'],
            'absolute_contraindications': ['Sinüs bradikardisi, SA/AV blok, Stokes-Adams sendromu.'],
            'neonatal_specific_notes': 'Damar dışına kaçışta Mor Eldiven Sendromu (Purple Glove Syndrome) ve doku nekrozu riski; geniş damardan SF ile infüze edilmeli, asla dekstrozla karıştırılmamalıdır!'
        }
    })

# Paracetamol
if 'paracetamol' in mono_by_id:
    mono_by_id['paracetamol'].update({
        'drug_id': 'paracetamol',
        'generic_name': 'Parasetamol (Asetaminofen)',
        'atc_code': 'N02BE01',
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
            'black_box_warnings': ['Hepatotoksisite: Tek dozda 1000 mg ve günlük 4000 mg tavanının aşılması akut karaciğer nekrozuna yol açar.'],
            'absolute_contraindications': ['Ağır karaciğer yetmezliği veya akut aktif hepatit.'],
            'neonatal_specific_notes': 'Prematüre ve term yenidoğanlarda IV formda 10 kat dozaj hesaplama hatalarına karşı mg ve mL doğrulaması zorunludur.'
        }
    })

# Budesonide
if 'budesonide' in mono_by_id:
    mono_by_id['budesonide'].update({
        'drug_id': 'budesonide',
        'generic_name': 'Budesonid (Nebül / İnhaler)',
        'atc_code': 'R03BA02',
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
        }
    })

# Fentanyl
if 'fentanyl' in mono_by_id:
    mono_by_id['fentanyl'].update({
        'drug_id': 'fentanyl',
        'generic_name': 'Fentanil',
        'atc_code': 'N01AH01',
        'safety_warnings': {
            'black_box_warnings': ['Hızlı IV puşede ölümcül göğüs duvarı rijititesi (wooden chest syndrome) ve solunum durması riski; yavaş titre edilmeli ve kas gevşetici/Nalokson hazır tutulmalıdır.'],
            'absolute_contraindications': ['Akut ağır bronşiyal astım, solunum depresyonu.'],
            'neonatal_specific_notes': 'Yenidoğan entübasyonunda mikrogram (1-2 mcg/kg) hassasiyeti şarttır.'
        }
    })


# 2. Add the 10 completely missing critical pediatric drugs
new_drugs = [
    {
        'id': 'cefotaxime',
        'drug_id': 'cefotaxime',
        'genericTr': 'Sefotaksim',
        'genericEn': 'Cefotaxime',
        'generic_name': 'Sefotaksim',
        'atcCodes': ['J01DD01'],
        'atc_code': 'J01DD01',
        'genericKeywords': ['sefotaksim', 'cefotaxime', 'claforan', 'sefotak'],
        'brandExamples': ['Claforan 0.5 g / 1 g Flakon', 'Sefotak 1 g Flakon'],
        'drugClass': '3. Kuşak Sefalosporin Antibakteriyel',
        'indications': 'Yenidoğan sepsisi, neonatal menenjit, pediatrik pnömoni ve bakteremi (Seftriaksonun kontrendike olduğu yenidoğan ve hiperbilirubinemik infantlarda altın standart güvenli sefalosporindir).',
        'adultDose': '1-2 g IV/IM 8-12 saatte bir (ağır enfeksiyonlarda 2 g q6-8h, maks 12 g/gün).',
        'pediatricDose': 'Yenidoğan 0-7 gün: 50 mg/kg/doz IV 12 saatte bir; >7 gün: 50 mg/kg/doz IV 6-8 saatte bir (menenjitte 200-300 mg/kg/gün 4 doza bölünmüş). Süt çocuğu ve çocuk: 100-200 mg/kg/gün 3-4 doza bölünmüş.',
        'maxDailyDose': 'Pediatrik tavan: 12 g/gün (veya 300 mg/kg/gün).',
        'renalAdjustment': 'eGFR 30-50 mL/dk: Doz aralığını 12 saate açınız. eGFR <10 mL/dk: Standart dozun %50\'si 12-24 saatte bir uygulanır.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez; safrada çökme ve pseudolitiazis yapmaz.',
        'pregnancyLactation': 'PLLR: Kategori B / Uyumlu. T1/T2/T3 gebelikte güvenlidir. LactMed: COMPATIBLE, RID < %1.5.',
        'contraindications': 'Sefalosporin veya penisilin anafilaksi öyküsü.',
        'clinicalPearls': 'Yenidoğanda seftriaksonun aksine kalsiyumla letal presipitasyon oluşturmaz ve serbest bilirubini albüminden koparmaz; yaşamın ilk 28 gününde sefalosporin tercihi mutlaka sefotaksim olmalıdır.',
        'formulations': [
            {
                'form_name': 'Sefotaksim 500 mg / 1000 mg IV/IM Enjeksiyonluk Toz',
                'concentration_mg_per_ml': 100.0,
                'measuring_device': 'none',
                'reconstitution_stability_days': 1,
                'storage_condition': 'Sulandırıldıktan sonra 24 saat buzdolabında stabildir'
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
                    'indication': 'Neonatal Sepsis ve Menenjit',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 50.0,
                    'interval_hours': 8,
                    'max_daily_dose_mg_per_kg': 200.0,
                    'absolute_max_single_dose_mg': 2000.0,
                    'absolute_max_daily_dose_mg': 12000.0,
                    'weight_metric_in_obesity': 'IBW'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Gebelikte güvenle kullanılabilir.',
                'second_trimester': 'Gebelikte güvenlidir.',
                'third_trimester': 'Gebelikte güvenlidir; doğumda seftriakson gibi kalsiyum presipitasyonu riski taşımaz.'
            },
            'lactation': {
                'lactmed_record_summary': 'Süte çok düşük oranda geçer; emzirmede güvenlidir.',
                'relative_infant_dose_percent': 1.2,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Sefalosporin grubu antibiyotiklere anafilaksi öyküsü'],
            'neonatal_specific_notes': 'Seftriaksonun kontrendike olduğu <=28 günlük yenidoğanlarda güvenli alternatiftir.'
        },
        'metadata': {
            'source_documents': ['TİTCK Claforan KÜB', 'AAP Red Book 2024-2027', 'BNFc Cefotaxime Monograph'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'ampicillin',
        'drug_id': 'ampicillin',
        'genericTr': 'Ampisilin',
        'genericEn': 'Ampicillin',
        'generic_name': 'Ampisilin',
        'atcCodes': ['J01CA01'],
        'atc_code': 'J01CA01',
        'genericKeywords': ['ampisilin', 'ampicillin', 'alfasilin', 'makposilin'],
        'brandExamples': ['Alfasilin 250/500/1000 mg Flakon', 'Makposilin 1 g Flakon'],
        'drugClass': 'Aminopenisilin Antibakteriyel',
        'indications': 'Yenidoğan sepsisi ve neonatal menenjiti (Listeria monocytogenes ve Streptococcus agalactiae / GBS ampirik tedavisi), enterokok bakteremisi.',
        'adultDose': '1-2 g IV/IM 4-6 saatte bir (maks 12 g/gün).',
        'pediatricDose': 'Yenidoğan <=7 gün: 50-100 mg/kg/doz IV 12 saatte bir; >7 gün: 50-100 mg/kg/doz IV 6-8 saatte bir (menenjit: 200-300 mg/kg/gün 3-4 doza bölünmüş). Süt çocuğu ve çocuk: 100-200 mg/kg/gün 4 doza bölünmüş (menenjitte 300-400 mg/kg/gün).',
        'maxDailyDose': 'Pediatrik menenjit tavanı: 12 g/gün (veya 400 mg/kg/gün).',
        'renalAdjustment': 'eGFR 10-50 mL/dk: Doz aralığını 6-12 saate açınız. eGFR <10 mL/dk: 12-24 saatte bir uygulayınız.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Güvenli / Uyumlu. T1/T2/T3 güvenle kullanılabilir. LactMed: COMPATIBLE, RID < %1.',
        'contraindications': 'Penisilin ve beta-laktam anafilaksi öyküsü; enfeksiyöz mononükleozda makülopapüler döküntü riski.',
        'clinicalPearls': 'Yenidoğan sepsisi ve menenjitinde sefotaksim veya gentamisin ile kombine edilerek Listeria monocytogenes açığını kapatan hayati bileşendir.',
        'formulations': [
            {
                'form_name': 'Ampisilin Sodyum 500 mg / 1000 mg Flakon',
                'concentration_mg_per_ml': 100.0,
                'measuring_device': 'none',
                'storage_condition': 'Sulandırıldıktan sonra 1 saat içinde tüketilmelidir'
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
                    'indication': 'Neonatal Sepsis ve Menenjit (Listeria / GBS)',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 75.0,
                    'interval_hours': 8,
                    'max_daily_dose_mg_per_kg': 300.0,
                    'absolute_max_single_dose_mg': 2000.0,
                    'absolute_max_daily_dose_mg': 12000.0,
                    'weight_metric_in_obesity': 'IBW'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Gebelikte güvenlidir.',
                'second_trimester': 'Gebelikte güvenlidir.',
                'third_trimester': 'GBS taşıyıcısı gebelerde intrapartum antibiyotik profilaksisinde ilk tercihtir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Süte çok az geçer; emzirmede güvenlidir.',
                'relative_infant_dose_percent': 0.8,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Penisilin grubu antibiyotiklere anafilaksi öyküsü'],
            'neonatal_specific_notes': 'Neonatal Listeria ve GBS sepsisinde altın standart ampirik rejim ortağıdır.'
        },
        'metadata': {
            'source_documents': ['TİTCK Alfasilin KÜB', 'CDC GBS Prophylaxis Guidelines', 'AAP Neonatal Sepsis'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'gentamicin',
        'drug_id': 'gentamicin',
        'genericTr': 'Gentamisin',
        'genericEn': 'Gentamicin',
        'generic_name': 'Gentamisin',
        'atcCodes': ['J01GB03'],
        'atc_code': 'J01GB03',
        'genericKeywords': ['gentamisin', 'gentamicin', 'getamisin', 'gensu'],
        'brandExamples': ['Gentasol 40/80/120 mg Ampul', 'Gensu 80 mg Ampul'],
        'drugClass': 'Aminoglikozit Antibakteriyel',
        'indications': 'Neonatal Gram-negatif sepsis, neonatal pyelonefrit, bakteriyemi ve enterokok sinerjisi.',
        'adultDose': '5-7 mg/kg IV günde tek doz (veya 1.5-2 mg/kg q8h).',
        'pediatricDose': 'Yenidoğan <30 hafta: 5 mg/kg IV 48 saatte bir; 30-34 hafta: 4.5 mg/kg IV 36 saatte bir; >=35 hafta term: 4 mg/kg IV 24 saatte bir. Çocuklar: 6-7.5 mg/kg/gün IV tek doz (veya 2-2.5 mg/kg q8h).',
        'maxDailyDose': 'Pediatrik azami: 7.5 mg/kg/gün (TDM tepe/çukur izlemi şarttır).',
        'renalAdjustment': 'eGFR 30-50 mL/dk: Doz aralığını 24-36 saate uzatınız. eGFR <30 mL/dk: Çukur düzeyi (<1 mcg/mL) kontrol edilerek dozlanmalıdır. Nefrotoksik ajanlarla (Vankomisin) kombinasyondan kaçınınız.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Kategori D (konjenital 8. kraniyal sinir toksisitesi ve sağırlık riski). Laktasyon: COMPATIBLE (oral emilimi ihmal edilebilir), RID < %2.',
        'contraindications': 'Aminoglikozit aşırı duyarlılığı, miyasteniya gravis (nöromüsküler blokaj riski).',
        'clinicalPearls': 'Dar terapötik indekslidir; çukur düzeyi >2 mcg/mL ise nefrotoksisite ve kalıcı ototoksisite riski katlanır. Uzatılmış aralıklı (extended-interval) tek doz rejim toksisiteyi belirgin azaltır.',
        'formulations': [
            {
                'form_name': 'Gentamisin Sülfat 40 mg / 80 mg / 2 mL Ampul',
                'concentration_mg_per_ml': 40.0,
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
                    'indication': 'Neonatal Gram-Negatif Sepsis',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 4.0,
                    'interval_hours': 24,
                    'max_daily_dose_mg_per_kg': 5.0,
                    'absolute_max_single_dose_mg': 300.0,
                    'absolute_max_daily_dose_mg': 500.0,
                    'weight_metric_in_obesity': 'AdjBW'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'D',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Konjenital ototoksisite riski; maternal hayati endikasyon hariç kaçınılmalıdır.',
                'second_trimester': 'TDM izlemiyle dar endikasyonda kullanılır.',
                'third_trimester': 'Fetal sağırlık riski; kanda çukur düzeyi izlenmelidir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Süte çok az geçer ve gastrointestinal emilimi yoktur; emzirmede güvenlidir.',
                'relative_infant_dose_percent': 1.5,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': ['Nefrotoksisite ve irreversibl bilateral konjenital ototoksisite riski; serum çukur seviyesi izlenmelidir.'],
            'absolute_contraindications': ['Aminoglikozit aşırı duyarlılığı, miyasteniya gravis.'],
            'neonatal_specific_notes': 'Gestasyonel haftaya göre doz aralığı 24-36-48 saat olarak açılmalıdır.'
        },
        'metadata': {
            'source_documents': ['TİTCK Gentasol KÜB', 'Neofax Gentamicin Monograph', 'AAP Neonatal Gram-Negative Sepsis'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'phenobarbital',
        'drug_id': 'phenobarbital',
        'genericTr': 'Fenobarbital',
        'genericEn': 'Phenobarbital',
        'generic_name': 'Fenobarbital',
        'atcCodes': ['N03AA02'],
        'atc_code': 'N03AA02',
        'genericKeywords': ['fenobarbital', 'phenobarbital', 'luminal'],
        'brandExamples': ['Luminal 100 mg Ampul', 'Phenobarbital 100/200 mg Flakon'],
        'drugClass': 'Barbitürat Antikonvülzan / Sedatif',
        'indications': 'Neonatal nöbetlerin birinci basamak altın standart tedavisi, pediatrik status epileptikus, fokal ve jeneralize konvülsiyonlar.',
        'adultDose': 'Status epileptikus: 15-20 mg/kg IV yavaş infüzyon (maks 1000 mg, hız <= 50-100 mg/dk).',
        'pediatricDose': 'Yenidoğan nöbeti yükleme: 20 mg/kg IV tek doz (gerekirse 5-10 mg/kg ek dozla maks 40 mg/kg\'a kadar çıkılabilir, infüzyon hızı <= 1 mg/kg/dk). İdame: 3-5 mg/kg/gün IV/oral 12-24 saatte bir bölünmüş. Çocuk status: 15-20 mg/kg IV yükleme.',
        'maxDailyDose': 'Yükleme azami tek doz: 1000 mg. Günlük idame: 5 mg/kg/gün.',
        'renalAdjustment': 'eGFR <10 mL/dk: Doz aralığını 12-16 saate açınız; sedasyon takibi yapınız.',
        'hepaticAdjustment': 'Ağır karaciğer yetmezliğinde eliminasyonu belirgin uzar; hepatik ensefalopati riski nedeniyle kontrendikedir.',
        'pregnancyLactation': 'PLLR: Kategori D (kardiyovasküler malformasyon ve fetal hidantoin-benzeri sendrom). Laktasyon: USE_WITH_CAUTION (RID %10-15; bebekte sedasyon ve emme güçlüğü izlenmelidir).',
        'contraindications': 'Akut intermitan porfiri, ağır solunum yetmezliği, karaciğer yetmezliği.',
        'clinicalPearls': 'Neonatal nöbetlerde 20 mg/kg IV yükleme ilk tercihtir; solunum depresyonu riski nedeniyle balon-valf-maske ve entübasyon seti hazır bulundurulmalı ve hız 1 mg/kg/dk üzerine çıkmamalıdır.',
        'formulations': [
            {
                'form_name': 'Fenobarbital Sodyum 100 mg / 2 mL Ampul',
                'concentration_mg_per_ml': 50.0,
                'measuring_device': 'none',
                'storage_condition': '25C altında saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 1000.0,
                'standard_interval_hours': [24],
                'max_daily_dose_mg': 1000.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Neonatal Nöbet İlk Basamak Yükleme',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 20.0,
                    'interval_hours': 24,
                    'max_daily_dose_mg_per_kg': 40.0,
                    'absolute_max_single_dose_mg': 1000.0,
                    'absolute_max_daily_dose_mg': 1000.0,
                    'weight_metric_in_obesity': 'IBW'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'D',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Majör konjenital kalp defekti riski; nöbet kontrolü için en düşük dozda sürdürülmeli ve yüksek doz folik asit (5 mg) verilmelidir.',
                'second_trimester': 'Terapötik ilaç düzeyi takibi gerekir.',
                'third_trimester': 'Neonatal kanama riski nedeniyle doğuma yakın K vitamini desteği önerilir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Süte geçer; bebekte sedasyon ve zayıf emme yapabilir.',
                'relative_infant_dose_percent': 12.0,
                'safety_verdict': 'USE_WITH_CAUTION',
                'infant_monitoring': 'Emzirilen bebekte uyuşukluk, apne ve kilo alımı izlenmelidir.'
            }
        },
        'safety_warnings': {
            'black_box_warnings': ['Hızlı IV enjeksiyonda solunum arresti, hipotansiyon ve laringospazm riski; hız maks 1 mg/kg/dk olmalıdır.'],
            'absolute_contraindications': ['Porfiri, ağır dispne veya solunum obstrüksiyonu.'],
            'neonatal_specific_notes': 'Yenidoğan nöbetlerinde dünyada ve Türkiye\'de 1. tercih ilaçtır.'
        },
        'metadata': {
            'source_documents': ['TİTCK Luminal KÜB', 'WHO Guidelines for Neonatal Seizures', 'ILAE Pediatric Status Epilepticus'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'acyclovir',
        'drug_id': 'acyclovir',
        'genericTr': 'Asiklovir',
        'genericEn': 'Acyclovir',
        'generic_name': 'Asiklovir',
        'atcCodes': ['J05AB01'],
        'atc_code': 'J05AB01',
        'genericKeywords': ['asiklovir', 'acyclovir', 'aklovir', 'zovirax'],
        'brandExamples': ['Aklovir 250 mg Flakon', 'Zovirax 250 mg Flakon', 'Asiviral 200/400 mg'],
        'drugClass': 'Guanosin Analog Antiviral',
        'indications': 'Neonatal Herpes Simpleks Virüs (HSV) enfeksiyonu, Herpes ensefaliti, immün yetmezlikte VZV ve şiddetli suçiçeği.',
        'adultDose': 'Herpes ensefaliti: 10 mg/kg IV 8 saatte bir (14-21 gün). Mukokutanöz HSV: 5 mg/kg IV q8h.',
        'pediatricDose': 'Neonatal HSV (0-28 gün): 20 mg/kg IV 8 saatte bir (21 gün boyunca, en az 1 saatlik infüzyonla). Pediatrik ensefalit (3 ay - 12 yaş): 20 mg/kg IV 8 saatte bir (veya 500 mg/m² q8h). Suçiçeği (immün yetmezlik): 10-20 mg/kg IV q8h.',
        'maxDailyDose': 'Tek doz tavanı: 1000 mg IV (günlük maks 3000 mg/gün veya 60 mg/kg/gün).',
        'renalAdjustment': 'eGFR 25-50 mL/dk: Doz aralığını 12 saate açınız. eGFR 10-25 mL/dk: Doz aralığını 24 saate açınız. eGFR <10 mL/dk: Standart dozun %50\'si 24 saatte bir.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Kategori B / Uyumlu. T1/T2/T3 güvenle kullanılabilir. LactMed: COMPATIBLE, RID < %2.',
        'contraindications': 'Asiklovir veya valasiklovire aşırı duyarlılık.',
        'clinicalPearls': 'Renal tübüllerde kristalize olarak akut tübüler nekroza yol açabilir. Asla hızlı bolus IV verilmemelidir; infüzyon en az 1 saatte tamamlanmalı ve hastanın hidrasyonu idrar çıkışı >1 mL/kg/saat olacak şekilde güvenceye alınmalıdır.',
        'formulations': [
            {
                'form_name': 'Asiklovir Sodyum 250 mg IV Liyofilize Toz Flakon',
                'concentration_mg_per_ml': 25.0,
                'measuring_device': 'none',
                'storage_condition': 'Sulandırıldıktan sonra 12 saat oda sıcaklığında stabildir'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 700.0,
                'standard_interval_hours': [8],
                'max_daily_dose_mg': 3000.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Neonatal HSV ve Ensefalit Protokolü',
                    'min_age_months': 0.0,
                    'min_weight_kg': 1.0,
                    'dose_per_kg_single': 20.0,
                    'interval_hours': 8,
                    'max_daily_dose_mg_per_kg': 60.0,
                    'absolute_max_single_dose_mg': 1000.0,
                    'absolute_max_daily_dose_mg': 3000.0,
                    'weight_metric_in_obesity': 'IBW'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Gebelikte güvenlidir; HSV enfeksiyonunda tereddütsüz kullanılır.',
                'second_trimester': 'Güvenlidir.',
                'third_trimester': 'Genital herpes rekürensinde neonatal bulaşı önlemek için 36. haftadan itibaren profilaksi önerilir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Süte geçer ancak güvenlidir.',
                'relative_infant_dose_percent': 1.8,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Asiklovire karşı anafilaktik aşırı duyarlılık'],
            'neonatal_specific_notes': 'Neonatal HSV şüphesinde BOS PCR sonucu beklenmeden derhal 20 mg/kg IV q8h başlanmalıdır; mortaliteyi belirleyen en kritik faktör erken tedavidir.'
        },
        'metadata': {
            'source_documents': ['TİTCK Aklovir KÜB', 'AAP Red Book: Neonatal HSV', 'Infectious Diseases Society of America (IDSA)'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'oseltamivir',
        'drug_id': 'oseltamivir',
        'genericTr': 'Oseltamivir',
        'genericEn': 'Oseltamivir',
        'generic_name': 'Oseltamivir',
        'atcCodes': ['J05AH02'],
        'atc_code': 'J05AH02',
        'genericKeywords': ['oseltamivir', 'tamiflu', 'enfluvir'],
        'brandExamples': ['Tamiflu 75 mg Kapsül / 12 mg/mL Oral Süspansiyon', 'Enfluvir 75 mg Kapsül / 12 mg/mL Süspansiyon'],
        'drugClass': 'Nöraminidaz İnhibitörü Antiviral',
        'indications': 'İnfluenza A ve B tedavisi (ilk 48 saatte başlandığında en etkilidir) ve temas sonrası profilaksi.',
        'adultDose': 'Tedavi: 75 mg oral günde 2 kez (5 gün). Profilaksi: 75 mg oral günde 1 kez (10 gün).',
        'pediatricDose': 'Term Yenidoğan 0-8 ay: 3 mg/kg/doz oral 12 saatte bir; 9-11 ay: 3.5 mg/kg/doz oral 12 saatte bir. >=1 yaş kilo bantları: <=15 kg: 30 mg (2.5 mL) BID; 15.1-23 kg: 45 mg (3.75 mL) BID; 23.1-40 kg: 60 mg (5.0 mL) BID; >40 kg: 75 mg (6.25 mL) BID (5 gün).',
        'maxDailyDose': 'Tek doz tavanı: 75 mg (günlük maks 150 mg).',
        'renalAdjustment': 'eGFR 30-60 mL/dk: 30 mg oral günde 2 kez. eGFR 10-30 mL/dk: 30 mg oral günde tek doz. eGFR <10 mL/dk: Önerilmez.',
        'hepaticAdjustment': 'Hafif-orta karaciğer yetmezliğinde doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Gebelikte güvenli kabul edilir; CDC ve TİTCK influenzada tereddütsüz kullanımını önerir. LactMed: COMPATIBLE, RID < %0.5.',
        'contraindications': 'Oseltamivire bilinen anafilaktik aşırı duyarlılık.',
        'clinicalPearls': 'Semptomların ilk 48 saatinde başlanması mortalite ve hastane yatışını belirgin azaltır; ancak ağır/hastaneye yatan pediatrik vakalarda 48 saat sonrasında dahi başlanmalıdır. 12 mg/mL oral süspansiyon için dereceli enjektör şarttır.',
        'formulations': [
            {
                'form_name': 'Oseltamivir Fosfat 12 mg / 1 mL Toz Süspansiyon',
                'concentration_mg_per_ml': 12.0,
                'concentration_display': '60 mg / 5 mL (12 mg/mL)',
                'measuring_device': 'oral_syringe',
                'reconstitution_stability_days': 10,
                'storage_condition': 'Sulandırıldıktan sonra buzdolabında (2-8C) 10 gün saklanabilir'
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
                    'indication': 'İnfluenza Tedavisi (Kilo Bandı Dozlama)',
                    'min_age_months': 0.0,
                    'min_weight_kg': 2.5,
                    'dose_per_kg_single': 3.0,
                    'interval_hours': 12,
                    'max_daily_dose_mg_per_kg': 6.0,
                    'absolute_max_single_dose_mg': 75.0,
                    'absolute_max_daily_dose_mg': 150.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'C',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Gebelikte influenza komplikasyonları (ARDS) yüksektir; CDC ilk trimester dahil tereddütsüz kullanımını önerir.',
                'second_trimester': 'Güvenle kullanılır.',
                'third_trimester': 'Güvenle kullanılır.'
            },
            'lactation': {
                'lactmed_record_summary': 'Süte çok az geçer; emzirmede güvenlidir.',
                'relative_infant_dose_percent': 0.5,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Oseltamivire aşırı duyarlılık'],
            'neonatal_specific_notes': 'Prematüre bebeklerde klerens düşüktür; 1-2 mg/kg/doz BID şeklinde titre edilmelidir.'
        },
        'metadata': {
            'source_documents': ['TİTCK Tamiflu KÜB', 'CDC Influenza Antiviral Guidelines', 'AAP Pediatric Influenza'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'morphine',
        'drug_id': 'morphine',
        'genericTr': 'Morfin (Sülfat / HCl)',
        'genericEn': 'Morphine',
        'generic_name': 'Morfin',
        'atcCodes': ['N02AA01'],
        'atc_code': 'N02AA01',
        'genericKeywords': ['morfin', 'morphine', 'morphine sulfate'],
        'brandExamples': ['Morphine HCl 10 mg Ampul', 'Morfin 0.01 g/mL Ampul'],
        'drugClass': 'Opioid Analjezik (Saf Mu-Agonist)',
        'indications': 'Ciddi pediatrik travma, yanık, post-operatif şiddetli ağrı, vazooklüzif orak hücre krizi ve dispne palyasyonu.',
        'adultDose': '2.5-5 mg IV yavaş (gerekirse 3-4 saatte bir titre edilir) veya 5-10 mg SC/IM.',
        'pediatricDose': 'Akut ağrı yükleme: 0.05-0.1 mg/kg IV yavaş (en az 5 dakikada, tek doz maks 2-4 mg). İdame/PCA: 10-20 mcg/kg/saat IV sürekli infüzyon.',
        'maxDailyDose': 'Tek doz tavanı: 10 mg (hekim kontrolünde titre edilir). Solunum depresyonuna karşı Nalokson (0.01-0.1 mg/kg) daima hazır tutulmalıdır.',
        'renalAdjustment': 'eGFR 30-50 mL/dk: Dozun %75\'i; eGFR <30 mL/dk: Dozun %50\'si verilir veya aralık açılır (M6G ve M3G metabolitleri birikerek toksisite yapar).',
        'hepaticAdjustment': 'Ağır karaciğer yetmezliğinde biyoyararlanımı artar ve klerensi düşer; doz azaltılmalıdır.',
        'pregnancyLactation': 'PLLR: Doğumda yenidoğan solunum depresyonu yapabilir. Laktasyon: USE_WITH_CAUTION (kısa süreli düşük dozda RID < %6; bebekte sedasyon ve apne izlenmelidir).',
        'contraindications': 'Akut solunum depresyonu, kafa travmasında artmış KİBAS (solunum baskılanırsa pCO2 artar ve herniasyon tetiklenir), paralitik ileus.',
        'clinicalPearls': 'Kodein ve tramadolün aksine CYP2D6 metabolizmasından bağımsız olarak glukuronidasyonla (UGT2B7) elimine edilir; bu nedenle ultra-hızlı metabolizör toksisitesi oluşturmaz ve pediatride güvenilir opioid analjeziktir.',
        'formulations': [
            {
                'form_name': 'Morfin HCl 10 mg / 1 mL Ampul',
                'concentration_mg_per_ml': 10.0,
                'measuring_device': 'none',
                'storage_condition': 'Işıktan koruyarak kilitli dolapta saklayınız'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 5.0,
                'standard_interval_hours': [4],
                'max_daily_dose_mg': 40.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Akut Ciddi Ağrı Titrasyonu',
                    'min_age_months': 1.0,
                    'min_weight_kg': 3.0,
                    'dose_per_kg_single': 0.1,
                    'interval_hours': 4,
                    'max_daily_dose_mg_per_kg': 0.6,
                    'absolute_max_single_dose_mg': 4.0,
                    'absolute_max_daily_dose_mg': 20.0,
                    'weight_metric_in_obesity': 'IBW'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'C',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Kronik kullanımda fetal bağımlılık riski.',
                'second_trimester': 'Akut endikasyonda titre edilerek kullanılabilir.',
                'third_trimester': 'Doğumda yenidoğan solunum depresyonu riski; Nalokson hazır bulundurulmalıdır.'
            },
            'lactation': {
                'lactmed_record_summary': 'Düşük doz kısa süreli kullanımda güvenlidir.',
                'relative_infant_dose_percent': 5.5,
                'safety_verdict': 'USE_WITH_CAUTION',
                'infant_monitoring': 'Bebekte apne, sedasyon ve kabızlık izlenmelidir.'
            }
        },
        'safety_warnings': {
            'black_box_warnings': ['Solunum depresyonu ve bağımlılık riski; Nalokson hazır bulundurulmalıdır.'],
            'absolute_contraindications': ['Akut ağır solunum yetmezliği, kafa travmasında artmış KİBAS.'],
            'neonatal_specific_notes': 'Yenidoğanda kan-beyin bariyeri geçirgenliği yüksektir; doz 0.05 mg/kg seviyesinde tutulmalıdır.'
        },
        'metadata': {
            'source_documents': ['TİTCK Morfin HCl KÜB', 'WHO Guidelines on the Pharmacological Treatment of Persisting Pain in Children'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'ketamine',
        'drug_id': 'ketamine',
        'genericTr': 'Ketamin',
        'genericEn': 'Ketamine',
        'generic_name': 'Ketamin',
        'atcCodes': ['N01AX03'],
        'atc_code': 'N01AX03',
        'genericKeywords': ['ketamin', 'ketamine', 'ketalar'],
        'brandExamples': ['Ketalar 50 mg/mL Flakon (10 mL)', 'Ketamin 500 mg Flakon'],
        'drugClass': 'NMDA Reseptör Antagonisti / Disosiyatif Anestezik',
        'indications': 'Pediatrik prosedürel sedasyon ve analjezi (kırık redüksiyonu, dikiş), şiddetli bronkospazmlı astım krizinde acil entübasyon (RSI), refrakter status epileptikus.',
        'adultDose': 'Sedasyon: 1-2 mg/kg IV (veya 4-5 mg/kg IM). Anestezi indüksiyonu: 1.5-2 mg/kg IV.',
        'pediatricDose': 'Prosedürel Sedasyon: 1-1.5 mg/kg IV yavaş (1-2 dakikada verilir; gerekirse 0.5 mg/kg ek doz) veya 3-4 mg/kg IM. Astım RSI Entübasyon: 1-2 mg/kg IV (bronkodilatör etkisi vardır).',
        'maxDailyDose': 'Tek doz sedasyon tavanı: 100 mg IV.',
        'renalAdjustment': 'Doz ayarlaması gerekmez.',
        'hepaticAdjustment': 'Ağır sirozda metabolizması yavaşlayabilir; uyanma süresi uzar.',
        'pregnancyLactation': 'PLLR: Acil prosedürde güvenlidir. Laktasyon: COMPATIBLE (kısa etkilidir, 4-6 saat süt sağılıp atılabilir).',
        'contraindications': 'Şiddetli hipertansiyon, kontrolsüz tirotoksikoz, açık göz yaralanması (GİB artışı). 3 ay altındaki infantlarda laringospazm riski yüksektir.',
        'clinicalPearls': 'Solunum dürtüsünü (faringeal/laringeal refleksleri) baskılamadan analjezi ve amnezi sağlayan eşsiz ajandır; bronş düz kaslarını gevşettiğinden astım atağındaki entübasyonda ilk tercihtir. Tükürük salgısını artırabilir.',
        'formulations': [
            {
                'form_name': 'Ketamin Hidroklorür 50 mg / 1 mL Flakon (10 mL)',
                'concentration_mg_per_ml': 50.0,
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
                    'indication': 'Prosedürel Sedasyon ve Analjezi',
                    'min_age_months': 3.0,
                    'min_weight_kg': 5.0,
                    'dose_per_kg_single': 1.0,
                    'interval_hours': 1,
                    'max_daily_dose_mg_per_kg': 4.0,
                    'absolute_max_single_dose_mg': 100.0,
                    'absolute_max_daily_dose_mg': 300.0,
                    'weight_metric_in_obesity': 'IBW'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'B',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Acil anestezi indüksiyonunda güvenle kullanılabilir.',
                'second_trimester': 'Güvenlidir.',
                'third_trimester': 'Uterin tonusu artırabilir; acil travma ve astım entübasyonunda güvenle kullanılır.'
            },
            'lactation': {
                'lactmed_record_summary': 'Yarı ömrü 2-3 saattir; sedasyondan 4-6 saat sonra emzirilebilir.',
                'relative_infant_dose_percent': 1.0,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Ciddi hipertansiyon, intrakraniyal kitle, penetran göz yaralanması.'],
            'neonatal_specific_notes': '<3 ay bebeklerde hava yolu refleksleri immatür olduğundan laringospazm riski yüksektir.'
        },
        'metadata': {
            'source_documents': ['TİTCK Ketalar KÜB', 'ACEP Pediatric Procedural Sedation', 'PALS Pediatric RSI'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'ors',
        'drug_id': 'ors',
        'genericTr': 'Oral Rehidratasyon Tuzu (ORS)',
        'genericEn': 'Oral Rehydration Salts (ORS)',
        'generic_name': 'Oral Rehidratasyon Tuzu (ORS)',
        'atcCodes': ['A07CA'],
        'atc_code': 'A07CA',
        'genericKeywords': ['ors', 'oral rehidratasyon', 'rehidrasyon', 'ge-oral'],
        'brandExamples': ['Ge-Oral Toz Poşet', 'WHO Düşük Ozmolariteli ORS'],
        'drugClass': 'Elektrolit / Glukoz Oral Rehidrasyon Formülasyonu',
        'indications': 'Akut gastroenterit ve ishale bağlı hafif-orta dehidratasyonun tedavisi ve idamesi (WHO standart protokolü).',
        'adultDose': 'Her sulu dışkıdan sonra 200-400 mL veya susuzluk hissettikçe serbest içilir.',
        'pediatricDose': 'Hafif-Orta Dehidratasyon Tedavisi: 4 saatte toplam 50-100 mL/kg (sık aralıklarla, kaşık/enjektörle yudum yudum). Kusma varsa 10 dk beklenir, 5-10 dakikada bir 5 mL (1 tatlı kaşığı) ile devam edilir. İdame: Her sulu dışkı sonrası <2 yaş: 50-100 mL; >=2 yaş: 100-200 mL.',
        'maxDailyDose': 'Sıvı açığı tamamlanana kadar klinik takiple titre edilir; maksimum doz kısıtı yoktur.',
        'renalAdjustment': 'Anürik böbrek yetmezliğinde hiperkalemi riski nedeniyle kontrendikedir; oligüride serum potasyumu izlenmelidir.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Tamamen güvenlidir. Laktasyon: COMPATIBLE.',
        'contraindications': 'Ağır hipovolemik şok (acil IV sıvı gerekir), paralitik ileus, bilinç kapalılığı (aspirasyon riski), inatçı kontrolsüz kusma.',
        'clinicalPearls': 'WHO düşük ozmolariteli (245 mOsm/L: Na 75, K 20, Cl 65, Sitrat 10, Glukoz 75 mmol/L) formülü ozmotik ishali ve kusmayı azaltır. 1 poşet mutlaka tam 1 litre kaynatılıp ılıtılmış suya karıştırılmalıdır; az suya karıştırmak hipernatremiye, çok suya karıştırmak hiponatremiye yol açar!',
        'formulations': [
            {
                'form_name': 'Düşük Ozmolariteli ORS Toz Poşet (1 Litrelik)',
                'concentration_mg_per_ml': 20.5,
                'measuring_device': 'calibrated_cup',
                'reconstitution_stability_days': 1,
                'storage_condition': 'Sulandırıldıktan sonra 24 saat içinde tüketilmeli veya buzdolabında saklanmalıdır'
            }
        ],
        'dosing': {
            'adult_dosing': {
                'standard_single_dose_mg': 2000.0,
                'standard_interval_hours': [1],
                'max_daily_dose_mg': 10000.0
            },
            'pediatric_dosing': [
                {
                    'indication': 'Hafif-Orta Dehidratasyon Rehidrasyonu (4 Saatte)',
                    'min_age_months': 0.0,
                    'min_weight_kg': 2.0,
                    'dose_per_kg_single': 75.0,
                    'interval_hours': 4,
                    'max_daily_dose_mg_per_kg': 200.0,
                    'absolute_max_single_dose_mg': 1000.0,
                    'absolute_max_daily_dose_mg': 4000.0,
                    'weight_metric_in_obesity': 'TBW'
                }
            ]
        },
        'reproductive_safety': {
            'titck_legacy_category': 'A',
            'pregnancy_trimester_risk': {
                'first_trimester': 'Hiperemezis gravidarum ve dehidratasyonda tamamen güvenlidir.',
                'second_trimester': 'Tamamen güvenlidir.',
                'third_trimester': 'Tamamen güvenlidir.'
            },
            'lactation': {
                'lactmed_record_summary': 'Fizyolojik elektrolit dengesidir; emzirmede tamamen güvenlidir.',
                'relative_infant_dose_percent': 0.0,
                'safety_verdict': 'COMPATIBLE'
            }
        },
        'safety_warnings': {
            'black_box_warnings': [],
            'absolute_contraindications': ['Şiddetli dehidratasyon şoku (acil IV izotonik sıvı gerekir), paralitik ileus.'],
            'neonatal_specific_notes': 'Yenidoğanlarda hipernatremiyi önlemek için tam 1 litre temiz su ile hazırlanmalıdır.'
        },
        'metadata': {
            'source_documents': ['WHO / UNICEF Clinical Management of Acute Diarrhoea', 'AAP Practice Parameter: Acute Gastroenteritis'],
            'version_date': '2026-REV01',
            'last_reviewed_iso': '2026-10-26'
        }
    },
    {
        'id': 'zinc_sulfate',
        'drug_id': 'zinc_sulfate',
        'genericTr': 'Çinko Sülfat',
        'genericEn': 'Zinc Sulfate',
        'generic_name': 'Çinko Sülfat',
        'atcCodes': ['A12CB01'],
        'atc_code': 'A12CB01',
        'genericKeywords': ['cinko', 'çinko', 'zinc', 'zinco'],
        'brandExamples': ['Zinco 15 mg/5 mL Şurup', 'Zinco Damla 15 mg/mL', 'Zinco 30 mg Kapsül'],
        'drugClass': 'Eser Element / Bağırsak Mukozal Ajanı',
        'indications': 'Akut pediatrik gastroenterit (WHO protokolü), çinko eksikliği tedavisi ve profilaksisi.',
        'adultDose': 'Günde 30-50 mg elementer çinko (yemeklerden 1 saat önce veya 2 saat sonra).',
        'pediatricDose': 'Akut Gastroenterit (WHO / UNICEF Protokolü): <6 ay: Günde 10 mg elementer çinko tek doz; >=6 ay: Günde 20 mg elementer çinko tek doz (ishal kesilse dahi 10-14 gün aralıksız sürdürülmelidir).',
        'maxDailyDose': 'Pediatrik AGE protokolünde günlük 20 mg elementer çinko.',
        'renalAdjustment': 'Ağır böbrek yetmezliğinde birikebilir; uzun süreli kullanımda dikkat edilmelidir.',
        'hepaticAdjustment': 'Doz ayarlaması gerekmez.',
        'pregnancyLactation': 'PLLR: Günlük gereksinim dozlarında güvenlidir. Laktasyon: COMPATIBLE.',
        'contraindications': 'Çinkoya bilinen aşırı duyarlılık.',
        'clinicalPearls': 'Akut ishalli çocuklarda 10-14 günlük çinko takviyesi bağırsak enterositlerinin epitelizasyonunu hızlandırır, dışkı sıklığını azaltır ve sonraki 2-3 ay içindeki yeni ishal ataklarını %30 oranında önler (WHO Düzey 1 kanıt). Aç karnına bulantı yaparsa yemekle verilebilir.',
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

# Append new drugs if not already present
for nd in new_drugs:
    if nd['id'] not in mono_by_id:
        monographs.append(nd)
        mono_by_id[nd['id']] = nd
    else:
        mono_by_id[nd['id']].update(nd)

# Write back
with open('public/data/clinical_monographs.json', 'w', encoding='utf-8') as f:
    json.dump(monographs, f, ensure_ascii=False, indent=2)

print(f'Successfully updated clinical_monographs.json: Total items = {len(monographs)}')
