# Klinik Asistan V1.0 🩺

Modern web teknolojileri kullanılarak geliştirilmiş, tamamen istemci taraflı (client-side), çevrimdışı çalışabilen (PWA) ve hekimler ile sağlık çalışanları için pratik klinik hesaplamalar sunan açık kaynaklı bir karar destek asistanıdır.

## 🚀 Özellikler

* **Biyometrik & Yaş Grubu Analizi:** Hastanın yaşına (gün, ay, yıl) ve cinsiyetine göre otomatik yaş grubu tespiti (Yenidoğan, Süt Çocuğu, Oyun Çocuğu vb.) ve Vücut Yüzey Alanı (BSA) hesabı.
* **Pediatrik Persentil & Z-Skor Motoru:** WHO/CDC verilerine dayalı esnek interpolasyon algoritması ile boy, kilo ve BKİ persentil hesaplaması, zayıflık/obezite sınıflandırması.
* **Dinamik Triyaj & Erken Uyarı Skoru:** Yaş grubuna göre otomatik **NEWS2** (Erişkin) veya **PEWS** (Pediatrik) skoru hesaplama ve kritik vitaller için anlık uyarı bayrakları.
* **İdame Sıvı Hesabı:** Holliday-Segar formülü bazlı günlük/saatlik sıvı ihtiyacı hesaplama ve ateş varlığında otomatik düzeltme katsayısı.
* **TİTCK İlaç & Doz Asistanı:** 
  * 18000+ TİTCK resmi ilaç veritabanı (IndexedDB ile cihazda yerel saklama).
  * Akıllı Türkçe karakter toleranslı arama ve marka/jenerik eşleştirme.
  * Kırmızı, Yeşil ve Normal reçete renk kodlu rozet sistemi.
  * Aktif/Pasif ürün listesi filtrelemesi ve aynı etken maddeli aktif muadil ilaç bulucu.
  * Sıvı formlar için mililitre ($\text{ml}$) bazlı pratik doz konsantrasyon analizi.
* **SOAP Klinik Notu Oluşturucu:** Tüm verileri tek tıkla profesyonel SOAP formatına dönüştürüp panoya kopyalama imkânı.
* **Çevrimdışı Çalışma (PWA):** Service Worker desteği sayesinde internet bağlantısı olmasa bile tam performans çalışabilme.

⚠️
Yasal Uyarı & Sorumluluk Reddi
Bu uygulama yalnızca klinik decision support (karar destek) ve eğitim amacıyla geliştirilmiştir. Uygulamada yer alan biyometri, persentil, idame sıvı, insülin ve ilaç doz hesaplamaları hiçbir koşulda hekimin veya sağlık profesyonelinin tıbbi kanaatinin, teşhisinin ve reçeteleme sorumluluğunun yerini alamaz.

İlaç verileri TİTCK resmi listelerinden derlenmiştir. İlaç dozajı ve uygulaması öncesinde resmi prospektüs, SUT ve güncel klinik kılavuzlardan çapraz doğrulama yapılması doğrudan uygulayıcı hekimin sorumluluğundadır. Hesaplama veya veri uyuşmazlıklarından doğabilecek klinik sonuçlardan uygulama geliştiricisi sorumlu tutulamaz.

🔒 KVKK Uyumlu: Hasta verileri hiçbir sunucuya aktarılmaz, tamamen cihazınızda yerel işlenir.
