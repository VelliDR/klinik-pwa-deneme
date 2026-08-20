// Lab Guide Engine: Flebotomi Tüp Rehberi

const TUBE_DB = [
    { tests: ['Hemogram', 'CBC', 'HbA1c', 'Kan Grubu', 'Retikülosit', 'Sedimantasyon (Mor tüple)', 'Periferik Yayma'], color: 'Mor (EDTA)', order: 4, notes: 'Pıhtılaşmayı önler (Kalsiyumu bağlar). İyice alt üst edilmeli.' },
    { tests: ['PT', 'aPTT', 'INR', 'Fibrinojen', 'D-Dimer', 'Faktör Düzeyleri'], color: 'Mavi (Sodyum Sitrat)', order: 2, notes: 'Çizgiye kadar tam doldurulmalıdır! (Kan:Sitrat oranı tam olmalı)' },
    { tests: ['Biyokimya (Na, K, BUN, Kre, AST, ALT vb.)', 'Hormon (TSH, T4, hCG)', 'Kardiyak (Troponin, CK-MB)', 'Vitamin (B12, D Vit)', 'CRP', 'Ferritin'], color: 'Sarı/Kırmızı (Jelli Serum Tüpü)', order: 3, notes: 'Kanın pıhtılaşmasını hızlandıran aktivatör içerir. 30 dk dikey bekletilip santrifüj edilmeli.' },
    { tests: ['Kan Kültürü (Aerob/Anaerob)'], color: 'Kan Kültürü Şişesi', order: 1, notes: 'İlk alınması gereken tüptür (Kontaminasyonu önlemek için). İyot/Alkol ile cilt temizliği şarttır.' },
    { tests: ['Kan Gazı', 'Amonyak', 'Laktat'], color: 'Yeşil (Heparin) / Özel Şırınga', order: 5, notes: 'Amonyak ve Laktat buz üzerinde ve ivedilikle (beklemeden) laboratuvara gönderilmelidir.' }
];

export function getLabTubeGuide(query) {
    if (!query) return null;
    
    query = query.toLowerCase();
    
    const results = TUBE_DB.filter(tube => 
        tube.tests.some(test => test.toLowerCase().includes(query))
    );
    
    if (results.length === 0) return null;
    
    return results;
}

export function getOrderOfDraw() {
    return [
        { num: 1, type: 'Kan Kültürü', color: 'bg-red-200' },
        { num: 2, type: 'Sitratlı Tüp (PT/aPTT)', color: 'bg-blue-200' },
        { num: 3, type: 'Serum Tüpü (Biyokimya/Hormon)', color: 'bg-yellow-200' },
        { num: 4, type: 'Heparinli Tüp', color: 'bg-green-200' },
        { num: 5, type: 'EDTA\'lı Tüp (Hemogram)', color: 'bg-purple-200' }
    ];
}
