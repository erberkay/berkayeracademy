# Yayın: öğrencilere ücretsiz dağıtım (Ders Paneli)

Karar (2026-11-27): satış yok · AGPLv3 (kaynak açık) · Mac'te senin Developer ID'nle imza + notarization · dağıtım Ders Paneli'nden.

## Akış
1. **Mac paketi** (senin Mac'inde): `./scripts/mac-paketle.sh` → `dist/KB-Align-<sürüm>-mac.pkg` (imzalı, notarize edilmiş, staple'lı).
   Bir kerelik hazırlık betiğin başında: sertifika adları (`security find-identity -v -p basic`) ve `xcrun notarytool store-credentials kbalign …`.
2. **Windows paketi** (bir Windows bilgisayarda, isteğe bağlı): `.\scripts\windows-derle.ps1` → `dist/KB-Align-<sürüm>-windows.zip`.
   Yoksa Ders Paneli kartında Windows düğmesi "Yakında" görünür.
3. **Kaynak kodu** (AGPL şartı): `./scripts/kaynak-zip.sh` → `dist/KB-Align-<sürüm>-kaynak.zip` (commit'lenmiş hâlden).
4. **Siteye koy:** `./scripts/yayina-hazirla.sh` → dosyaları `indir/kb-align/` altına kopyalar, `surum.json` yazar (boyut + SHA-256).
5. **Yayınla** (repo kökünden): `firebase deploy --only hosting`.

`indir/kb-align/` içindeki paketler ve `surum.json` depoya girmez (`.gitignore`); deploy eden makinede üretilir.

## Kart
`booking.html` → yan sütun, "Plugin Listesi"nin altında, yalnız ders paneli görünümünde (`.bk-dash-only`, aktif plan).
Düğmeler `surum.json`'dan çizilir; dosya yoksa "Yakında". Ziyaretçinin işletim sistemine göre ilgili düğme öne çıkar. Metinler `i18n.js` `bk_kba_*` (TR/EN).
Görüntüler: `docs/ekran/ders-paneli-karti-hazir.png`, `ders-paneli-karti-yalniz-kaynak.png` (önizleme sayfasında sitenin CSS'iyle).

**Not:** Hosting dosyaları adresi bilen herkese açıktır; kart yalnız öğrencilere görünür. Ücretsiz ve AGPL bir eklenti için bu yeterli.
Yalnız girişli öğrencinin indirebilmesi istenirse Firebase Storage + kural (öğrencinin `reservations` belgesi) gerekir — ayrı iş.

## Doğrulanmamış (bu ortamda Mac/Windows yok)
- `mac-paketle.sh` ve `windows-derle.ps1` burada çalıştırılamadı; ilk çalıştırmada çıkan hatayı bana ilet.
- Windows'ta MSVC derlemesi denenmedi (kod GCC'de uyarısız; MSVC'ye özgü küçük düzeltmeler gerekebilir).
