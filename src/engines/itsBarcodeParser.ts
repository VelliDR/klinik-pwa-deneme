/**
 * TÜRKİYE İTS KAREKOD (GS1 DATAMATRIX) & EAN-13 BARKOD AYRIŞTIRICI
 *
 * Saf TypeScript, sıfır DOM bağımlılığı.
 * - GS1 Application Identifiers:
 *   (01) 14 haneli GTIN  -> baştaki 0 atılarak 13 haneli TİTCK EAN-13 barkodu üretilir
 *   (21) Seri Numarası   (değişken uzunluk, FNC1 / \x1d ile sonlanır)
 *   (17) Son Kullanma Tarihi (YYMMDD; DD=00 ise ayın son günü kabul edilir)
 *   (10) Parti / Lot Numarası
 * - Düz 13 haneli EAN-13 ("869...") ve 14 haneli GTIN ("0869...") barkodları da doğrudan destekler.
 */

export type ItsBarcodeFormat = 'ITS_GS1_DATAMATRIX' | 'EAN_13' | 'GTIN_14' | 'UNKNOWN';

export interface ParsedItsBarcode {
  raw: string;
  format: ItsBarcodeFormat;
  ean13: string | null;
  gtin14: string | null;
  serialNumber: string | null;
  lotNumber: string | null;
  expiryDateIso: string | null;
  expiryDisplayTr: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

const FNC1_CHAR = '\x1d';

function parseGs1Expiry(yymmdd: string, now: Date = new Date()): {
  iso: string | null;
  displayTr: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
} {
  if (!/^\d{6}$/.test(yymmdd)) {
    return { iso: null, displayTr: null, isExpired: false, isExpiringSoon: false };
  }
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  const ddRaw = parseInt(yymmdd.slice(4, 6), 10);
  if (mm < 1 || mm > 12 || ddRaw > 31) {
    return { iso: null, displayTr: null, isExpired: false, isExpiringSoon: false };
  }
  const fullYear = 2000 + yy;
  // GS1 standardı: gün 00 ise ayın son günü geçerlidir
  const lastDayOfMonth = new Date(Date.UTC(fullYear, mm, 0)).getUTCDate();
  const dd = ddRaw === 0 ? lastDayOfMonth : Math.min(ddRaw, lastDayOfMonth);

  const iso = `${fullYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const displayTr = `${String(dd).padStart(2, '0')}.${String(mm).padStart(2, '0')}.${fullYear}`;

  const expiryEndUtc = Date.UTC(fullYear, mm - 1, dd, 23, 59, 59, 999);
  const nowUtc = now.getTime();
  const diffDays = (expiryEndUtc - nowUtc) / (1000 * 60 * 60 * 24);
  return {
    iso,
    displayTr,
    isExpired: diffDays < 0,
    isExpiringSoon: diffDays >= 0 && diffDays <= 30
  };
}

/**
 * Ham kamera / USB barkod / yapıştırma metninden İTS karekod veya EAN-13 barkodunu çözer.
 */
export function parseItsBarcode(rawInput: string, referenceDate: Date = new Date()): ParsedItsBarcode {
  const original = String(rawInput || '');
  // Symbology öneklerini (]d2, ]C1, ]e0, ]E0) ve baş/son boşlukları temizle (FNC1 \x1d korunur)
  let cleaned = original.replace(/^[\r\n\t ]+|[\r\n\t ]+$/g, '');
  cleaned = cleaned.replace(/^\x1d*\](?:d2|C1|e0|E0|Q3)/i, '');

  const empty: ParsedItsBarcode = {
    raw: original,
    format: 'UNKNOWN',
    ean13: null,
    gtin14: null,
    serialNumber: null,
    lotNumber: null,
    expiryDateIso: null,
    expiryDisplayTr: null,
    isExpired: false,
    isExpiringSoon: false
  };

  if (!cleaned) return empty;

  // 1. Düz 13 haneli EAN-13 barkod (Örn: 8699525090146)
  if (/^\d{13}$/.test(cleaned)) {
    return {
      ...empty,
      format: 'EAN_13',
      ean13: cleaned,
      gtin14: `0${cleaned}`
    };
  }

  // 2. Düz 14 haneli GTIN (Örn: 08699525090146)
  if (/^\d{14}$/.test(cleaned)) {
    return {
      ...empty,
      format: 'GTIN_14',
      gtin14: cleaned,
      ean13: cleaned.startsWith('0') ? cleaned.slice(1) : cleaned.slice(-13)
    };
  }

  // 3. Parantezli insan-okunur GS1 biçimi: (01)08699...(21)...(17)271231(10)LOT
  if (cleaned.includes('(01)')) {
    const gtinMatch = cleaned.match(/\(01\)(\d{14})/);
    const snMatch = cleaned.match(/\(21\)([^(]+)/);
    const expMatch = cleaned.match(/\(17\)(\d{6})/);
    const lotMatch = cleaned.match(/\(10\)([^(]+)/);
    if (gtinMatch) {
      const gtin14 = gtinMatch[1];
      const ean13 = gtin14.startsWith('0') ? gtin14.slice(1) : gtin14.slice(-13);
      const exp = expMatch ? parseGs1Expiry(expMatch[1], referenceDate) : null;
      return {
        raw: original,
        format: 'ITS_GS1_DATAMATRIX',
        ean13,
        gtin14,
        serialNumber: snMatch ? snMatch[1].replace(/\x1d/g, '').trim() : null,
        lotNumber: lotMatch ? lotMatch[1].replace(/\x1d/g, '').trim() : null,
        expiryDateIso: exp?.iso ?? null,
        expiryDisplayTr: exp?.displayTr ?? null,
        isExpired: exp?.isExpired ?? false,
        isExpiringSoon: exp?.isExpiringSoon ?? false
      };
    }
  }

  // 4. Standart ham GS1 DataMatrix (başta FNC1 olabilir): 01 + 14 hane GTIN + geri kalan AI'lar
  const normalizedGs = cleaned.replace(/^\x1d+/, '');
  if (/^01\d{14}/.test(normalizedGs)) {
    const gtin14 = normalizedGs.slice(2, 16);
    const ean13 = gtin14.startsWith('0') ? gtin14.slice(1) : gtin14.slice(-13);
    let rest = normalizedGs.slice(16);

    let serialNumber: string | null = null;
    let lotNumber: string | null = null;
    let expRaw: string | null = null;

    if (rest.includes(FNC1_CHAR)) {
      // FNC1 (\x1d) ile ayrılmış segmentleri sırayla çöz
      const parts = rest.split(FNC1_CHAR).filter(Boolean);
      for (const part of parts) {
        let cursor = part;
        while (cursor.length >= 2) {
          if (cursor.startsWith('17') && /^\d{6}/.test(cursor.slice(2, 8))) {
            expRaw = cursor.slice(2, 8);
            cursor = cursor.slice(8);
          } else if (/^(?:11|12|13|15|16)/.test(cursor) && /^\d{6}/.test(cursor.slice(2, 8))) {
            // Sabit uzunluklu diğer GS1 tarih AI'larını (örn. 11: Üretim Tarihi) atla
            cursor = cursor.slice(8);
          } else if (cursor.startsWith('21')) {
            serialNumber = cursor.slice(2);
            break;
          } else if (cursor.startsWith('10')) {
            lotNumber = cursor.slice(2);
            break;
          } else {
            break;
          }
        }
      }
    } else {
      // FNC1 soyulmuş USB/klavye okuyucu çıktısı: tipik İTS sırası 01<14>21<sn>17<6>10<lot> veya 01<14>17<6>10<lot>
      // GS1 CSET-82 karakterleri (._/+- dahil) desteklenir ve 17 tarih alanında geçerli ay/gün doğrulanır
      const tailMatch = rest.match(/^(?:21([A-Za-z0-9._/+-]+?))?17(\d{2}(?:0[1-9]|1[0-2])(?:0[0-9]|[12][0-9]|3[01]))(?:10([A-Za-z0-9._/+-]+))?$/);
      if (tailMatch) {
        serialNumber = tailMatch[1] || null;
        expRaw = tailMatch[2] || null;
        lotNumber = tailMatch[3] || null;
      } else if (rest.startsWith('17') && /^\d{6}/.test(rest.slice(2, 8))) {
        expRaw = rest.slice(2, 8);
        const afterExp = rest.slice(8);
        if (afterExp.startsWith('10')) lotNumber = afterExp.slice(2) || null;
        else if (afterExp.startsWith('21')) serialNumber = afterExp.slice(2) || null;
      } else if (rest.startsWith('21')) {
        serialNumber = rest.slice(2) || null;
      } else if (rest.startsWith('10')) {
        lotNumber = rest.slice(2) || null;
      }
    }

    const exp = expRaw ? parseGs1Expiry(expRaw, referenceDate) : null;
    return {
      raw: original,
      format: 'ITS_GS1_DATAMATRIX',
      ean13,
      gtin14,
      serialNumber,
      lotNumber,
      expiryDateIso: exp?.iso ?? null,
      expiryDisplayTr: exp?.displayTr ?? null,
      isExpired: exp?.isExpired ?? false,
      isExpiringSoon: exp?.isExpiringSoon ?? false
    };
  }

  return empty;
}
