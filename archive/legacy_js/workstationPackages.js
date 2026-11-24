/**
 * WORKSTATION PACKAGES & CLINICAL MOTOR DEPENDENCY RESOLVER
 * 
 * Bu modül, kullanıcının ana ekrana tek tıkla istediği klinik motoru ve
 * onun matematiksel/klinik olarak bağımlı olduğu tüm kardeş motorları
 * bir paket halinde getirmesini, özelleştirmesini ve filtrelemesini sağlar.
 * 
 * Örnek: "İdame Sıvı" seçildiğinde -> Kilo & Boy (Biyometri), Yaş (Demografi)
 * ve Elektrolit motorları otomatik olarak pakete dahil edilir ve ekrana getirilir.
 */

// 1. TÜM KLİNİK MOTORLAR LİSTESİ VE TANIMLARI
export const CLINICAL_MOTORS = {
    'card-demografi': {
        id: 'card-demografi',
        name: 'Hasta Yaş & Demografi',
        icon: '👤',
        shortName: 'Yaş & Demografi',
        category: 'demografi',
        desc: 'Doğum tarihi, kronolojik yaş, ay/gün hesabı ve cinsiyet'
    },
    'card-biyometri': {
        id: 'card-biyometri',
        name: 'Biyometri, eGFR & Persentil',
        icon: '📐',
        shortName: 'Kilo, Boy & eGFR',
        category: 'demografi',
        desc: 'Boy, kilo, BSA (Mosteller), serum kreatinin ve eGFR (Schwartz / CKD-EPI)'
    },
    'card-vitaller': {
        id: 'card-vitaller',
        name: 'Vital Bulgular & Triyaj',
        icon: '🩺',
        shortName: 'Vitaller & Triyaj',
        category: 'demografi',
        desc: 'Nabız, tansiyon, solunum sayısı, SpO2, ateş, NEWS2, PEWS ve AAP tansiyon'
    },
    'card-gcs': {
        id: 'card-gcs',
        name: 'Glasgow Koma Skalası (GCS)',
        icon: '🧠',
        shortName: 'GCS',
        category: 'acil',
        desc: 'Göz, sözel ve motor yanıt ile kafa travması/koma skorlaması'
    },
    'card-kardiyo': {
        id: 'card-kardiyo',
        name: 'Kardiyak & EKG Analizi',
        icon: '❤️',
        shortName: 'EKG & QTc',
        category: 'acil',
        desc: 'QTc (Bazett, Fridericia, Bogossian), Tisdale skoru ve EKG aks sapması'
    },
    'card-tromboz': {
        id: 'card-tromboz',
        name: 'Tromboemboli & Kardiyak Acil',
        icon: '🚨',
        shortName: 'Tromboz & Acil',
        category: 'acil',
        desc: 'Wells DVT/PTE, PERC, HEART skoru, CHA₂DS₂-VASc ve HAS-BLED'
    },
    'card-cerrahi': {
        id: 'card-cerrahi',
        name: 'Cerrahi, Yanık & Sütür',
        icon: '🔪',
        shortName: 'Cerrahi & Parkland',
        category: 'cerrahi',
        desc: 'ATLS 10 Parkland yanık resüsitasyonu, Alvarado apendisit ve sütür rehberi'
    },
    'card-obgyn': {
        id: 'card-obgyn',
        name: 'Obstetrik & Jinekoloji (OB/GYN)',
        icon: '🤰',
        shortName: 'Kadın Doğum & TDT',
        category: 'cerrahi',
        desc: 'Naegele SAT ile TDT, gestasyonel hafta/trimester, Bishop ve preeklampsi'
    },
    'card-endokrin': {
        id: 'card-endokrin',
        name: 'Endokrin & Metabolizma',
        icon: '🩸',
        shortName: 'Steroid & HOMA-IR',
        category: 'dahiliye',
        desc: 'Glukokortikoid eşdeğerlik tablosu ve HOMA-IR insülin direnci'
    },
    'card-notlar': {
        id: 'card-notlar',
        name: 'Klinik Notlar & Anamnez',
        icon: '📝',
        shortName: 'Anamnez Notu',
        category: 'all',
        desc: 'Serbest klinik öykü, anamnez ve şikayet notu'
    },
    'card-elektrolit': {
        id: 'card-elektrolit',
        name: 'Majör İyonlar & Elektrolit Düzeltme',
        icon: '🧪',
        shortName: 'Sodyum & Kalsiyum',
        category: 'lab',
        desc: 'Sodyum açığı (Adrogué-Madias) ve albümine göre düzeltilmiş kalsiyum'
    },
    'card-kangazi': {
        id: 'card-kangazi',
        name: 'Kan Gazı Analizi (ABG/VBG)',
        icon: '🫁',
        shortName: 'Kan Gazı',
        category: 'lab',
        desc: 'pH, pCO2, HCO3, anyon açığı, Winter kompanzasyonu ve HAGMA/NAGMA delta oranı'
    },
    'card-nefro': {
        id: 'card-nefro',
        name: 'Nefroloji, Toksikoloji & Solunum',
        icon: '🔬',
        shortName: 'Nefroloji & Toksik',
        category: 'dahiliye',
        desc: 'FENa, FEUrea, osmolal açık & antidot, Parasetamol NAC ve CURB-65'
    },
    'card-pediatri-surup': {
        id: 'card-pediatri-surup',
        name: 'Pediatrik İlaç Dozajı & Şurubu',
        icon: '👶',
        shortName: 'Pediatrik Dozaj',
        category: 'pediatri',
        desc: 'Kilo bazlı Parasetamol, İbuprofen ve antibiyotik şurup ölçek hesabı'
    },
    'card-antibiyotik': {
        id: 'card-antibiyotik',
        name: 'Pediatrik Aşı & Akılcı Antibiyotik',
        icon: '💉',
        shortName: 'Aşı & Centor',
        category: 'pediatri',
        desc: 'Sağlık Bakanlığı 2025 aşı takvimi ve Centor/McIsaac tonsillit skoru'
    },
    'card-demir': {
        id: 'card-demir',
        name: 'Pediatrik Demir & Anemi Kartı',
        icon: '🩸',
        shortName: 'Demir & Anemi',
        category: 'pediatri',
        desc: 'DSÖ anemi eşikleri, fizyolojik anemi nadiri, profilaksi ve aktif tedavi'
    },
    'card-neonatoloji': {
        id: 'card-neonatoloji',
        name: 'Neonatoloji & Pediatrik Acil Modülü',
        icon: '🍼',
        shortName: 'Neonatoloji',
        category: 'pediatri',
        desc: 'Bhutani sarılık fototerapi/kan değişimi, APGAR, Westley krup ve CDS dehidratasyon'
    },
    'card-ilac': {
        id: 'card-ilac',
        name: 'Akılcı Reçete & İlaç Güvenlik Kalkanı',
        icon: '💊',
        shortName: 'TİTCK & İlaç Güvenliği',
        category: 'ilac',
        desc: 'TİTCK ilaç arama, muadil bulucu, Triple Whammy, renal doz ve gebelik kalkanı'
    },
    'card-infuzyon': {
        id: 'card-infuzyon',
        name: 'İnfüzyon & Glukoz Hızı (GIR)',
        icon: '💧',
        shortName: 'İnfüzyon & GIR',
        category: 'ilac',
        desc: 'mcg/kg/dk infüzyon hızı, GIR ve hipoglisemi acil dekstroz puşe'
    },
    'card-idame': {
        id: 'card-idame',
        name: 'İdame Sıvı ve Elektrolit Hesaplayıcı',
        icon: '💧',
        shortName: 'İdame Sıvı',
        category: 'lab',
        desc: 'Holliday-Segar, ateşe bağlı sıvı artışı ve TND yenidoğan kademeli günlük sıvı'
    },
    'card-soap': {
        id: 'card-soap',
        name: 'Klinik SOAP Raporu',
        icon: '📋',
        shortName: 'SOAP Raporu',
        category: 'all',
        desc: 'Tüm motor hesaplamalarının otomatik derlendiği canlı klinik hasta notu'
    }
};

// 2. KLİNİK MOTOR BAĞIMLILIK HARİTASI (DEPENDENCY GRAPH)
// Bir motor çağrıldığında çalışması için zorunlu olan kardeş motorlar
export const MOTOR_DEPENDENCIES = {
    // İdame sıvı doğrudan Kilo, Boy (biyometri), Yaş (demografi) ve Sodyum (elektrolit) gerektirir
    'card-idame': ['card-biyometri', 'card-demografi', 'card-elektrolit'],
    
    // Pediatrik şurup dozajı kilo ve yaşa dayanır
    'card-pediatri-surup': ['card-biyometri', 'card-demografi'],
    
    // Neonatoloji doğum saati (demografi), mevcut kilo (biyometri), TND sıvı (idame) ve yenidoğan ilaç kalkanı (ilaç) gerektirir
    'card-neonatoloji': ['card-demografi', 'card-biyometri', 'card-idame', 'card-ilac'],
    
    // Nefroloji kreatinin/eGFR (biyometri), CURB-65 yaşı (demografi) ve sodyum (elektrolit) gerektirir
    'card-nefro': ['card-biyometri', 'card-demografi', 'card-elektrolit', 'card-ilac'],
    
    // Kardiyak EKG nabız (vitaller), yaş/cinsiyet (demografi) ve QT/QRS uzatan ilaçlar (ilaç) gerektirir
    'card-kardiyo': ['card-vitaller', 'card-demografi', 'card-ilac'],
    
    // Tromboz yaş/cinsiyet (demografi) ve nabız vitalleri gerektirir
    'card-tromboz': ['card-demografi', 'card-vitaller'],
    
    // Parkland yanık doğrudan kilo ve yaşa (çocukta 3mL, erişkinde 2mL) dayanır
    'card-cerrahi': ['card-biyometri', 'card-demografi'],
    
    // OB/GYN preeklampsi için tansiyon vitallerini ve gebelik ilaç kalkanını gerektirir
    'card-obgyn': ['card-vitaller', 'card-ilac'],
    
    // Kan gazı anyon açığı için elektrolitleri (Na, Cl, Albümin) ve vitalleri gerektirir
    'card-kangazi': ['card-elektrolit', 'card-vitaller'],
    
    // Demir/anemi kilo ve ay bazlı fizyolojik nadir (demografi) gerektirir
    'card-demir': ['card-biyometri', 'card-demografi'],
    
    // İnfüzyon kilo (biyometri) ve idame sıvıyı gerektirir
    'card-infuzyon': ['card-biyometri', 'card-idame'],
    
    // İlaç güvenliği eGFR (biyometri) ve yaş grubunu (demografi) gerektirir
    'card-ilac': ['card-biyometri', 'card-demografi'],
    
    // GCS vitallerle birlikte değerlendirilir
    'card-gcs': ['card-vitaller'],
    
    // Biyometri persentil için yaş ve cinsiyeti (demografi) gerektirir
    'card-biyometri': ['card-demografi'],
    
    // Aşı takvimi yaşa (demografi) bağlıdır
    'card-antibiyotik': ['card-demografi'],
    
    // Endokrin (HOMA-IR) glukoz ve biyometriye bağlıdır
    'card-endokrin': ['card-biyometri', 'card-demografi']
};

// 3. REKÜRSİF / DERİN BAĞIMLILIK ÇÖZÜCÜ (DEPENDENCY RESOLVER)
export function resolveMotorDependencies(targetMotorIds) {
    if (!targetMotorIds || targetMotorIds.length === 0) return [];
    
    const resolved = new Set();
    const queue = [...targetMotorIds];

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (!resolved.has(currentId)) {
            resolved.add(currentId);
            const deps = MOTOR_DEPENDENCIES[currentId] || [];
            deps.forEach(d => {
                if (!resolved.has(d)) {
                    queue.push(d);
                }
            });
        }
    }

    // Sıralama: Demografi ve Biyometri girdi motorları her zaman başta gelsin
    const orderPriority = {
        'card-demografi': 1,
        'card-biyometri': 2,
        'card-vitaller': 3
    };

    return Array.from(resolved).sort((a, b) => {
        const pA = orderPriority[a] || 50;
        const pB = orderPriority[b] || 50;
        return pA - pB;
    });
}

// 4. HAZIR AKILLI MOTOR PAKETLERİ (PRESET CLINICAL PACKS)
export const PRESET_PACKAGES = [
    {
        id: 'fluid_pack',
        name: '💧 İdame Sıvı Paketi',
        badge: 'Sıvı + Kilo/Boy + Yaş + Elektrolit',
        desc: 'Holliday-Segar idame sıvısı için gerekli kilo, yaş, ateş ve elektrolit düzeltme motorları',
        baseMotors: ['card-idame'],
        icon: '💧',
        accentColor: 'cyan'
    },
    {
        id: 'pediatric_pack',
        name: '👶 Pediatri & Dozaj Paketi',
        badge: 'Şurup + Biyometri + Aşı + Demir',
        desc: 'Pediatrik şurup dozajı, kilo/boy persentil, aşı takvimi ve demir eksikliği motorları',
        baseMotors: ['card-pediatri-surup', 'card-demir', 'card-antibiyotik'],
        icon: '👶',
        accentColor: 'indigo'
    },
    {
        id: 'neonatal_pack',
        name: '🍼 Yenidoğan & Sarılık Paketi',
        badge: 'Bhutani + TND Sıvı & GIR + İlaç Kalkanı',
        desc: 'TND Bhutani sarılık, fototerapiye bağlı kademeli sıvı, APGAR, dehidratasyon ve ilaç kalkanı',
        baseMotors: ['card-neonatoloji', 'card-idame'],
        icon: '🍼',
        accentColor: 'amber'
    },
    {
        id: 'cardiac_pack',
        name: '🚨 Kardiyak & EKG Acil',
        badge: 'QTc / Tisdale + Wells PTE + HEART + Nabız',
        desc: 'EKG QTc analizi, aks sapması, Wells DVT/PTE, PERC, HEART ve kardiyak ilaç uyarıları',
        baseMotors: ['card-kardiyo', 'card-tromboz'],
        icon: '🚨',
        accentColor: 'rose'
    },
    {
        id: 'nephro_pack',
        name: '🔬 Nefroloji & AKI Paketi',
        badge: 'FENa/FEUrea + Osmolal + eGFR + Rumack NAC',
        desc: 'FENa ve FEUrea oligüri ayrımı, eGFR, osmolal açık, toksik alkol ve parasetamol NAC protokolü',
        baseMotors: ['card-nefro'],
        icon: '🔬',
        accentColor: 'emerald'
    },
    {
        id: 'bloodgas_pack',
        name: '🫁 Kan Gazı & Asit-Baz',
        badge: 'ABG/VBG + Anyon Açığı + Sodyum/Klor + SpO2',
        desc: 'Kan gazı primer tanı, Winter kompanzasyonu, anyon açığı ve eşlik eden majör elektrolitler',
        baseMotors: ['card-kangazi'],
        icon: '🫁',
        accentColor: 'sky'
    },
    {
        id: 'surgery_pack',
        name: '🔪 Cerrahi & Yanık Paketi',
        badge: 'Parkland Yanık + Alvarado + Sütür + GCS',
        desc: 'ATLS 10 Parkland yanık resüsitasyonu için kilo/yaş, Alvarado apendisit ve sütür alma zamanı',
        baseMotors: ['card-cerrahi', 'card-gcs'],
        icon: '🔪',
        accentColor: 'amber'
    },
    {
        id: 'obgyn_pack',
        name: '🤰 Kadın Doğum & Preeklampsi',
        badge: 'SAT TDT + Tansiyon + Fetal İlaç Kalkanı',
        desc: 'Naegele SAT gebelik haftası, tansiyon preeklampsi takibi ve trimester ilaç güvenliği',
        baseMotors: ['card-obgyn'],
        icon: '🤰',
        accentColor: 'fuchsia'
    },
    {
        id: 'rx_pack',
        name: '💊 Akılcı Reçete & İlaç',
        badge: 'TİTCK Arama + Muadil + Triple Whammy + SOAP',
        desc: 'TİTCK ilaç arama, akıllı muadil bulucu, eGFR renal doz kesintileri ve SOAP entegrasyonu',
        baseMotors: ['card-ilac', 'card-infuzyon', 'card-soap'],
        icon: '💊',
        accentColor: 'purple'
    }
];

// 5. YEREL DEPOLAMA (LOCAL STORAGE) İLE ÖZEL PAKET YÖNETİMİ
const STORAGE_KEY = 'klinik_custom_shortcut_packages';

function getStorage() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
    } catch (e) {}
    return null;
}

export function getCustomPackages() {
    try {
        const storage = getStorage();
        if (!storage) return [];
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('Özel paketler yüklenemedi:', e);
        return [];
    }
}

export function saveCustomPackage(name, baseMotorIds) {
    if (!name || !name.trim() || !baseMotorIds || baseMotorIds.length === 0) return null;
    try {
        const fullMotors = resolveMotorDependencies(baseMotorIds);
        const allPacks = getCustomPackages();
        const id = 'custom_' + Date.now();
        const newPack = {
            id,
            name: name.trim(),
            badge: `${fullMotors.length} Motor Paketi`,
            desc: `Kullanıcı özel paketi (${fullMotors.map(m => CLINICAL_MOTORS[m]?.shortName || m).join(', ')})`,
            baseMotors: baseMotorIds,
            fullMotors,
            isCustom: true,
            icon: '⭐'
        };
        allPacks.push(newPack);
        const storage = getStorage();
        if (storage) {
            storage.setItem(STORAGE_KEY, JSON.stringify(allPacks));
        }
        return newPack;
    } catch (e) {
        console.error('Özel paket kaydedilemedi:', e);
        return null;
    }
}

export function deleteCustomPackage(packId) {
    try {
        const allPacks = getCustomPackages().filter(p => p.id !== packId);
        const storage = getStorage();
        if (storage) {
            storage.setItem(STORAGE_KEY, JSON.stringify(allPacks));
        }
        return allPacks;
    } catch (e) {
        console.error('Özel paket silinemedi:', e);
        return [];
    }
}
