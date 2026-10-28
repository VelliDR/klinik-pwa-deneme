#!/usr/bin/env python3
"""
TİTCK Master Veritabanı ve ATC Bilgi Tabanı Senkronizasyon Scripti
Excel (.xlsx) dosyasındaki 47 sütunluk veriyi master JSON'a ve
PWA için optimize edilmiş ATC sınıflandırma/farmakoloji sözlüğüne dönüştürür.
"""

import os
import sys
import json
import zlib
import openpyxl

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX_FILE = os.path.join(ROOT_DIR, 'turkiye_ilac_master_veritabani.xlsx')
MASTER_JSON_FILE = os.path.join(ROOT_DIR, 'turkiye_ilac_master_veritabani.json')
PUBLIC_ATC_FILE = os.path.join(ROOT_DIR, 'public', 'data', 'atc_knowledge_base.json')
DIST_ATC_FILE = os.path.join(ROOT_DIR, 'dist', 'data', 'atc_knowledge_base.json')

SYSTEM_SHORT_NAMES = {
    'A': 'Sindirim & Metabolizma',
    'B': 'Kan & Hematoloji',
    'C': 'Kardiyovasküler',
    'D': 'Dermatoloji',
    'G': 'Ürogenital & Hormon',
    'H': 'Sistemik Hormonlar',
    'J': 'Antiinfektif & Antibiyotik',
    'L': 'Onkoloji & İmmünoloji',
    'M': 'Kas & İskelet',
    'N': 'Sinir & Psikiyatri',
    'P': 'Antiparaziter',
    'R': 'Solunum & KBB',
    'S': 'Göz & Kulak',
    'V': 'Çeşitli & Antidot'
}

def clean_val(v):
    if v is None:
        return ''
    return str(v).strip()

def is_meaningful(val, placeholder_phrases):
    if not val or val.lower() == 'none':
        return False
    for ph in placeholder_phrases:
        if ph.lower() in val.lower():
            return False
    return True

def sync():
    print('-----------------------------------------------------------------')
    print('TİTCK MASTER VERİTABANI & ATC FARMAKOLOJİ SENKRONİZASYONU')
    print('-----------------------------------------------------------------')
    
    if not os.path.exists(XLSX_FILE):
        print(f'Hata: XLSX kaynak dosyası bulunamadı: {XLSX_FILE}')
        sys.exit(1)

    print(f'Kaynak Excel: {XLSX_FILE}')
    wb = openpyxl.load_workbook(XLSX_FILE, read_only=True)
    sheet = wb.active
    
    headers = [clean_val(h) for h in next(sheet.iter_rows(max_row=1, values_only=True))]
    h_idx = {h: i for i, h in enumerate(headers)}
    
    print(f'Okunan Sütun Sayısı: {len(headers)}')
    
    master_records = []
    systems = {}
    groups = {}
    
    # Sözlük kodlama tabloları
    strings = []
    string_to_idx = {}
    
    def get_str_idx(s):
        if not s or s.lower() == 'none':
            return None
        s = s.strip()
        if not s:
            return None
        if s not in string_to_idx:
            string_to_idx[s] = len(strings)
            strings.append(s)
        return string_to_idx[s]

    atc_map = {}
    interaction_rules = []
    seen_interaction_pairs = set()

    row_count = 0
    for row in sheet.iter_rows(min_row=2, values_only=True):
        row_count += 1
        
        # 1. Master JSON kaydı oluştur
        record = {}
        for h, idx in h_idx.items():
            val = row[idx]
            # Boolean ve integer değerleri koru
            if isinstance(val, (int, bool)):
                record[h] = val
            elif val is None:
                record[h] = None
            else:
                record[h] = clean_val(val)
        master_records.append(record)

        # 2. ATC Bilgi Tabanı için alanları ayıkla
        atc = clean_val(row[h_idx.get('ATC Kodu', 3)]).upper()
        if not atc or atc == 'NONE':
            continue

        l1 = clean_val(row[h_idx.get('ATC Seviye 1 (Anatomik Sistem)', 30)])
        l2 = clean_val(row[h_idx.get('ATC Seviye 2 (Terapötik Grup)', 31)])
        farm = clean_val(row[h_idx.get('Farmakolojik Sınıf', 32)])
        mek = clean_val(row[h_idx.get('Etki Mekanizması', 33)])
        besin = clean_val(row[h_idx.get('Besin ve Alkol Etkileşimi', 34)])
        kara_kutu = clean_val(row[h_idx.get('Kara Kutu ve Kritik Uyarılar', 36)])
        pk_half = clean_val(row[h_idx.get('Farmakokinetik Yarı Ömür', 37)])
        pk_met = clean_val(row[h_idx.get('Metabolizma ve Atılım', 38)])
        ddd = clean_val(row[h_idx.get('WHO Tanımlı Günlük Doz (DDD)', 39)])
        etk_aciklama = clean_val(row[h_idx.get('Kritik İlaç Etkileşimleri (ATC)', 42)])
        etk_siniflar_raw = clean_val(row[h_idx.get('Etkileşen ATC Sınıfları', 43)])
        etk_risk = clean_val(row[h_idx.get('Etkileşim Risk Seviyesi', 44)])

        c1 = atc[0]
        c3 = atc[:3] if len(atc) >= 3 else atc

        # Sistemler tablosu
        if c1 not in systems and l1:
            systems[c1] = {
                'code': c1,
                'name': l1,
                'shortName': SYSTEM_SHORT_NAMES.get(c1, l1)
            }

        # Gruplar tablosu
        if c3 not in groups and l2:
            groups[c3] = {
                'code': c3,
                'system': c1,
                'name': l2
            }

        # Filtrelenmiş anlamlı değerler
        has_bb = is_meaningful(kara_kutu, ['Yok / Standart', 'Yok'])
        has_fa = is_meaningful(besin, ['Genel olarak bir bardak su', 'Belirtilmemiş'])
        has_t12 = is_meaningful(pk_half, ['Belirtilmemiş'])
        has_met = is_meaningful(pk_met, ['Karaciğerde hepatik metabolizma ve renal', 'Belirtilmemiş'])
        has_ddd = is_meaningful(ddd, ['Belirtilmemiş'])
        has_ir = is_meaningful(etk_risk, ['Düşük / Bilinen Major', 'Yok'])
        has_it = is_meaningful(etk_aciklama, ['Standart kullanım', 'Yok'])

        targets = [x.strip() for x in etk_siniflar_raw.split(',') if x.strip() and x.strip().lower() != 'none']

        if atc not in atc_map:
            entry = {
                'c1': c1,
                'c3': c3,
                'cls': get_str_idx(farm),
                'moa': get_str_idx(mek) if is_meaningful(mek, ['Hücresel düzeyde hedeflenen biyolojik yolak']) else None,
                'bb': get_str_idx(kara_kutu) if has_bb else None,
                'fa': get_str_idx(besin) if has_fa else None,
                't12': get_str_idx(pk_half) if has_t12 else None,
                'met': get_str_idx(pk_met) if has_met else None,
                'ddd': get_str_idx(ddd) if has_ddd else None,
                'ir': get_str_idx(etk_risk) if has_ir else None,
                'it': get_str_idx(etk_aciklama) if has_it else None,
                'itg': targets if targets else None
            }
            # Boş anahtarları temizle
            atc_map[atc] = {k: v for k, v in entry.items() if v is not None}

        # Çapraz etkileşim matrisi kuralları
        if targets and has_it:
            for tgt in targets:
                pair_key = (atc[:4], tgt)
                if pair_key not in seen_interaction_pairs:
                    seen_interaction_pairs.add(pair_key)
                    interaction_rules.append({
                        'src': atc[:4],
                        'tgt': tgt,
                        'risk': etk_risk,
                        'desc': etk_aciklama
                    })

    print(f'Toplam Satır: {row_count}')
    print(f'Tekil ATC Kodları: {len(atc_map)}')
    print(f'Sözlükteki Tekil Metin Sayısı: {len(strings)}')
    print(f'Çapraz ATC Etkileşim Kural Çiftleri: {len(interaction_rules)}')

    # 1. Master JSON Dosyasını Yaz
    print(f'Master JSON yazılıyor: {MASTER_JSON_FILE}')
    with open(MASTER_JSON_FILE, 'w', encoding='utf-8') as f:
        json.dump(master_records, f, ensure_ascii=False, indent=2)
    master_size_mb = os.path.getsize(MASTER_JSON_FILE) / (1024 * 1024)
    print(f'Master JSON Boyutu: {master_size_mb:.2f} MB')

    # 2. ATC Knowledge Base Dosyasını Yaz
    atc_payload = {
        'version': '1.0.0',
        'generatedAt': '2026-10-28',
        'totalAtcCount': len(atc_map),
        'systems': systems,
        'groups': groups,
        'strings': strings,
        'atcMap': atc_map,
        'interactions': interaction_rules
    }
    
    atc_json = json.dumps(atc_payload, ensure_ascii=False)
    atc_bytes = atc_json.encode('utf-8')
    atc_gzip = zlib.compress(atc_bytes, level=9)
    
    os.makedirs(os.path.dirname(PUBLIC_ATC_FILE), exist_ok=True)
    with open(PUBLIC_ATC_FILE, 'w', encoding='utf-8') as f:
        f.write(atc_json)
    print(f'Halka Açık ATC Dosyası: {PUBLIC_ATC_FILE}')
    print(f'  Ham Boyut: {len(atc_bytes)/1024:.1f} KB')
    print(f'  GZIP Boyut: {len(atc_gzip)/1024:.1f} KB')

    if os.path.exists(os.path.dirname(DIST_ATC_FILE)):
        with open(DIST_ATC_FILE, 'w', encoding='utf-8') as f:
            f.write(atc_json)
        print(f'Dist dizinine de kopyalandı: {DIST_ATC_FILE}')

    print('-----------------------------------------------------------------')
    print('SENKRONİZASYON TAMAMLANDI')
    print('-----------------------------------------------------------------')

if __name__ == '__main__':
    sync()
