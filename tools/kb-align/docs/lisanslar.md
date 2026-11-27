# Lisanslar (2026-11-27 itibarıyla; kaynak: `docs/arastirma/notlar/C-osiloskop-host.md`)

| Bileşen | Sürüm | Lisans | Doğrulama | Not |
|---|---|---|---|---|
| JUCE | 9.0.6 | AGPLv3 **ya da** ticari JUCE lisansı | GitHub README/LICENSE (doğrudan) | Kademeler (forumdan, resmi sayfa açılamadı): Starter ücretsiz (gelir ≤ ~20 bin $), Indie ~40 $/ay, Pro ~175 $/ay. **Karar senin** — satış düşünülüyorsa ticari kademe ya da kodu AGPL ile açmak gerekir. |
| VST3 SDK | 3.8+ (JUCE içinde) | MIT | `vst3sdk/LICENSE.txt` (doğrudan) | Logo kullanılırsa Steinberg marka kuralları geçerli. |
| CLAP | JUCE uzantısının getirdiği sürüm | MIT | GitHub (doğrudan) | |
| clap-juce-extensions | main (2026-11) | MIT | GitHub | Resmî değil; JUCE 9.0.6 ile derlendi ve clap-validator'dan geçti. |
| pluginval | 1.0.4 | GPLv3 | GitHub | Yalnız test aracı, ürüne girmez. |
| clap-validator | main (2026-11) | MIT | GitHub | Yalnız test aracı. |
| Python prototipi | numpy 2.5.3, scipy 1.18.1, soundfile 0.14.0, matplotlib 3.11.2, pytest 9.1.1 | BSD/MIT benzeri | pip | Yalnız geliştirme; ürüne girmez. |

- Rakip kod kullanılmadı. PhasePaw AGPL-3.0 — koduna bakılmadı.
- Ürünün kendi lisansı ve JUCE lisansı seçilmeden **dağıtım yapılmayacak** (talimat §1).

## Karar girdisi (kullanıcı, 2026-11-27): satış yok, öğrencilere ücretsiz

JUCE'yi kullanmanın iki yolu var (JUCE 9.0.6 `LICENSE.md`, doğrudan okundu):

| | AGPLv3 | JUCE ticari lisansı — Starter kademesi |
|---|---|---|
| Ücret | yok | yok (ücretsiz kademe) |
| Şart | Eklentiyi alan herkese **kaynak kodunu da** vermek (aynı lisansla); değiştirilmiş sürümler de AGPL kalır | JUCE 9 EULA'yı kabul etmek; kaynak kapalı kalabilir |
| Gelir sınırı | yok | var (forum bilgisi: yıllık ~20 bin $; **doğrulanamadı** — juce.com bu oturumdan açılamadı). Sınırın yalnız eklentinin gelirine mi, şirketin/akademinin toplam gelirine mi baktığı EULA'da okunmalı |
| Risk | yok denecek kadar az; açık kaynak olur | ücretli derslerin geliri sınırı aşarsa ücretli kademeye geçmek gerekebilir |

**Öneri: AGPLv3.** Ücretsiz dağıtımla tam uyumlu, gelir sorusu doğurmuyor. Kod zaten MIT lisanslı parçalarla (VST3, CLAP, clap-juce-extensions) uyumlu. Kaynak, indirme bağlantısının yanında zip olarak ya da açık bir GitHub reposunda verilebilir.
Kapalı kaynak isteniyorsa Starter da olur, ama EULA'nın gelir tanımını önce senin okuman (ya da bir hukukçuya sorman) gerekir — JUCE ekibi uyum onayı vermiyor (LICENSE.md).

Satış olmadığı için gereksiz olanlar: kopya koruma, lisans anahtarı, ödeme altyapısı, mağaza (KVR / Plugin Boutique / Gumroad).
Hâlâ gerekli olanlar: macOS imzalama + notarization (öğrenciler Gatekeeper uyarısı görmesin; Apple Developer hesabı, yıllık ücretli), isteğe bağlı Windows imzası (SmartScreen uyarısı), kurulum paketi, kısa kılavuz.
