## Değişiklik Özeti

<!-- Bu Pull Request'in amacını, çözdüğü sorunu veya eklediği özelliği kısaca açıklayınız. -->

**İlgili Issue:** <!-- Varsa: Closes #123 -->

## Değişiklik Türü

- [ ] Klinik hesaplama motoru / kılavuz güncellemesi
- [ ] İlaç verisi / KÜB / DDI / ICD-10 güncellemesi
- [ ] Teknik hata düzeltmesi (Bug fix)
- [ ] Arayüz / UX / Erişilebilirlik iyileştirmesi
- [ ] PWA / Performans / Çevrimdışı önbellek iyileştirmesi
- [ ] Test veya dokümantasyon güncellemesi

## Klinik Kaynak ve Temiz-Oda (Clean-Room) Doğrulaması

<!-- Klinik veya ilaç verisi değişikliği içeriyorsa birincil kılavuzu, DOI veya resmi TİTCK/OpenFDA/ANSM kaynağını belirtiniz. -->

- [ ] Yalnızca resmi düzenleyici veriler veya hakemli açık klinik kılavuzlar kullanıldı; kapalı/ticari veri tabanı (UpToDate, BNF, Micromedex, DrugBank vb.) içermiyor (`DATA_NOTICE.md` uyumlu).
- [ ] Yeni/güncellenen klinik kart varsa `src/engines/guidelineRegistry.ts` referansı doğrulandı.
- [ ] Yapılan değişiklikler mevcut üç katmanlı lisans yapısıyla (`LICENSE`, `LICENSE-CONTENT.md`, `DATA_NOTICE.md`) uyumludur.

## Gizlilik, Güvenlik ve Erişilebilirlik Kontrolü

- [ ] Kod, test, ekran görüntüsü veya örnek vakalarda **hiçbir gerçek hasta verisi (KVKK/GDPR/PHI)** bulunmuyor.
- [ ] Kullanıcı girdisi veya harici katalog verisi HTML çıktısına aktarılırken `escapeHtml` uygulandı.
- [ ] Arayüz değişikliği varsa Aydınlık/Karanlık tema, mobil görünüm, yazı ölçekleme (`%85`–`%125`) ve klavye/etiket erişilebilirliği (`ACCESSIBILITY.md`) kontrol edildi.

## Test ve Derleme Doğrulaması

Lütfen aşağıdaki komutların yerel ortamınızda geçtiğini onaylayınız (`.github/workflows/deploy.yml` ile uyumlu):

- [ ] `npm run typecheck` hatasız geçti
- [ ] `npm test` (15/15 test paketi) hatasız geçti
- [ ] `npm run build` hatasız geçti
- [ ] Gerekiyorsa yeni birim / regresyon / karşı-olgusal testler (`tests/`) eklendi
