# İlerleme

## Plan (talimatın 10 maddelik özeti)

1. **Araştırma** — 12 hizalayıcı, 4 osiloskop, 22 kaynak; özellik tablosu ve rakip boşlukları; DSP yöntemleri. → kullanıcı onayı.
2. **Spesifikasyon** — sinyal akışı, osiloskop, 4 mod, gecikme bütçesi (`L`), ek özellikler, arayüz. → `docs/spec.md`.
3. **Ölçüt kodu önce** — "%100"ün 4 ölçütü (`metrics.py`) ve kaba kuvvet "teorik sınır" referansı, hiçbir algoritmadan önce yazılır.
4. **Sentetik test seti** — 5 kick karakteri × bas tipleri × E0–C3 × bilinen kesirli kayma/döndürme × gürültü × 4 örnekleme hızı, sabit seed.
5. **Python DSP** — kesirli gecikme (Farrow-Lagrange vs sinc), Hilbert döndürme (FIR vs IIR), LR4/lineer faz crossover, Bass Mono, ducking; seçimler ölçümle.
6. **Python hizalama** — onset, karmaşık korelasyonla (d, θ), 4 mod blok blok; nota başına tablo. Rapor + kullanıcı onayı.
7. **JUCE iskeleti** — CMake, VST3 + CLAP (+ AU yalnız Mac), sidechain bus, sabit gecikme bildirimi, parametreler.
8. **C++ DSP/analiz** — Python ile sayısal eşleşme testleri (≤ −90 dB), lock-free osiloskop verisi, arka plan analiz thread'i.
9. **Arayüz + doğrulama** — osiloskop, ölçerler, imleçler, sürükle-kaydır; pluginval (strictness 10), clap-validator; Mac/Ableton kontrol listeleri kullanıcıya.
10. **Yayın hazırlığı** — ad, lisans, imzalama, kurulum, kılavuz; her adım kullanıcı onayıyla.

## Kullanıcıdan beklenenler

- [ ] (a) Çizdiği sidechain eğrisi (noktalar ya da görsel) — şimdilik yer tutucu eğri (VARSAYIM)
- [ ] (b) Gerçek kick ve bas stem'leri — şimdilik yalnız sentetik setler
- [ ] (c) İşletim sistemi ve Ableton sürümü → `docs/dogrulama/ableton-kontrol-listesi.md`, `mac-kontrol-listesi.md`
- [ ] (d) Ürün adı
- [x] Satış yok, öğrencilere ücretsiz (2026-11-27) → kopya koruma/lisans anahtarı/mağaza gereksiz
- [ ] JUCE lisans kararı: AGPLv3 (öneri) ya da Starter → `docs/lisanslar.md`
- [ ] macOS imzalama/notarization için Apple Developer hesabı (ücretli) — öğrenciler Gatekeeper uyarısı görmesin diye
- [ ] Ayrı GitHub reposu açılsın mı?

## Aşama 1 — Araştırma ✅ (onaylandı 2026-11-27, 6 öneri dahil)
- `docs/arastirma/rakipler.md`, `dsp-yontemleri.md`, `notlar/` (~240 kaynak).

## Aşama 2 — Spesifikasyon ✅
- `docs/spec.md` — Aşama 3 ölçümleriyle kesinleşti; talimattan 6 sapma gerekçesiyle işaretli.

## Aşama 3 — Python algoritma kanıtı ✅
- `prototype/` — 21 pytest testi geçiyor; rapor `prototype/rapor/ozet.md` (`python3 -I report.py`, ~2,5 dk).
- Ölçüt 3 (gecikme ≤ 0,1 ms): %100 (en kötü 0,042 ms) · Ölçüt 1 (enerji): %100 · Ölçüt 2: göreli %93,8 / tabanlı %99,8 · Ölçüt 4: bit düzeyinde.
- Bulunan ve düzeltilen hatalar: ham enerji hedefi bası pencereye kaydırıyordu → normalize korelasyon; −5 ms pencere başı korelasyonu bozuyordu → 0 ms; "Her vuruşta" simülasyonu gerçek zamanda olmayan veriyi kullanıyordu → veri sınırı + 20 ms gerçek zaman payı; onset çift tetikleme ve üst üste binen kuyruklar → hızlı/yavaş zarf + yeniden kurulma.

## Aşama 4 — JUCE eklentisi ✅ (Linux'ta derlendi: VST3, CLAP, Standalone; AU Mac'te)
- `plugin/` — çekirdek JUCE'den bağımsız (`src/dsp`, `src/analysis`, `src/engine`), Python ile sayısal eşleşme: LR4 −235 dB, Lagrange −146 dB, evrişim −298 dB, ses yolu −139 dB, analiz/onset/nota/Learn/Her vuruşta birebir.
- Gerçek zaman ↔ çevrimdışı render: üç modda bit düzeyinde aynı.
- CPU: %1,30 (48 kHz, 64 örnek, stereo, tüm özellikler).

## Aşama 5 — Doğrulama (kısmen ✅)
- pluginval strictness 10 (VST3, Linux): SUCCESS · clap-validator: 32 geçti, 0 hata, 1 uyarı (rastgele baytlı durum yüklemesi çökmeden yok sayılıyor).
- `kb_tests` 59/59 · `kb_plugin_test` 0 hata. Raporlar: `docs/dogrulama/`.
- Bekleyen (senin bilgisayarında): `auval`, Mac pluginval, Ableton kontrol listesi (14 madde).

## Aşama 6 — Yayın hazırlığı ⏸ (satış yok, öğrencilere ücretsiz; onay bekliyor: ad, lisans, imzalama, kurulum paketi, dağıtım yeri)

## Açık VARSAYIM'lar
Bkz. `docs/spec.md` §8.
