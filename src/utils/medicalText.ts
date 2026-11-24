/**
 * Tıbbi Fonetik Normalizasyon Yardımcısı
 * Türkçe karakterler, Latince/İngilizce etken madde varyasyonları ve dozaj birimlerini eşitler.
 */
export function normalizeText(text: unknown): string {
  if (!text) return '';
  return String(text)
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    // Tıbbi Fonetik Dönüşüm (İngilizce / Latince / Türkçe tıbbi eşdeğerlik)
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/y/g, 'i')
    .replace(/x/g, 'ks')
    .replace(/ce/g, 'se')
    .replace(/ci/g, 'si')
    // Çift harfleri sadeleştir (paracetamol vs parasetamol, amoxicillin vs amoksisilin)
    .replace(/([a-z])\1+/g, '$1')
    // Bitişik yazılan sayı ve birimleri ayırır (18mg -> 18 mg, 5ml -> 5 ml)
    .replace(/(\d+)(mg|ml|mcg|g|l|iu|ui|amp|tb|kapsul)/gi, '$1 $2')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
