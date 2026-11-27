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
- [x] Lisans: AGPLv3, kaynak açık (2026-11-27) → `LICENSE`, `KAYNAK.md`, eklentide Hakkında
- [x] Apple Developer hesabı var → `scripts/mac-paketle.sh` (senin Mac'inde çalıştırılacak)
- [x] Dağıtım: Ders Paneli kartı (`booking.html`, deploy edilmedi) → `docs/yayin.md`
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

## Gerçek çıktı ölçümü ve arayüz v2 (2026-11-27)
- Ölçümler artık eklentinin gerçek çıktısında. Bulgu: crossover 120 Hz'te açıkken kazancın çoğu kayboluyordu → varsayılan kapalı, analiz bandı ayrıldı (`spec.md` §5b).
- Nota modu: nota bilinmezse genel değere düşer (asla Learn'den kötü değil).
- `prototype/gercek_olcum.py`: kendi kick/bas loop'larınla ölçüm + hizalanmış bas WAV'ları (dinleme için).
- Arayüz v2 + ilk açılış turu, polarite, çıkış kazancı, seviye ölçerleri. Görüntüler `docs/ekran/v2-*.png`.
- pluginval strictness 10 SUCCESS · clap-validator 0 hata · kb_tests 59/59 · kb_plugin_test 0 hata.

## Öneriler paneli (Danışman) + alt bant ducking (2026-11-27)
- Kick akordu (ölçülmüş "ne olurdu", ±2 yarım ses), synth retrigger tespiti, ducking önerisi; ducking ve mod tek tıkla uygulanır. Kick'e dokunulmaz. Ayrıntı: `spec.md` §5c.
- Crossover kapalıyken ducking artık yalnız 120 Hz altını kısar (doğrusal fazlı, ek gecikme yok).
- `gercek_olcum.py` raporu önerileri de yazar.
- Düzeltilen eski hata: parametre değişiminde ertelenen yeniden kurulum, eklenti silindikten sonra çalışabiliyordu (pluginval parametre fuzz'ında çöktü) → `AsyncUpdater`.
- pluginval strictness 10 SUCCESS · clap-validator 0 hata · kb_tests 90/90 · kb_plugin_test 0 hata · pytest 25/25. Görüntüler `docs/ekran/v3-*.png`.

## Arayüz v4 — endüstri standardı, İngilizce + Türkçe (2026-11-27)
- Referans: FUSER (Mastering The Mix) — otomatik faz döndürme (tek sefer), elle ±180°, frekans ekranında çakışma bölgeleri, dinamik EQ ile "Resolve". KB-Align'da karşılıkları: zaman + faz birlikte, nota/vuruş başına, kick'e kilitli osiloskop, Öneriler ve yeni **Spectrum** görünümü (kick ve bas spektrumu, örtüşen bölge kırmızı). Bağımsız bir tasarım eleştirisi (alt ajan) alındı; bulguların çoğu uygulandı.
- Dil: arayüz varsayılan İngilizce, üst çubukta EN | TR (seçim makineye kaydedilir, içerik yeniden kurulur). DAW'a giden parametre adları, seçenekleri ve fabrika presetleri İngilizce (otomasyon şeritleri). Kayıtlı durumlar normalize değer tuttuğu için eski setler etkilenmez.
- Gömülü yazı tipi Inter (SIL OFL 1.1, `plugin/resources/fonts/OFL.txt`): her işletim sisteminde aynı görünüm.
- Düzen: üst çubuk (BE Akademi işareti, presetler, A|B, Simple|Advanced, EN|TR, ölçek), sidechain ışığı (her kick'te yanar), birincil Learn düğmesi (ilerleme çubuğu), ÖNCE | SONRA anahtarı, büyük "alt bant kazancı" sonuç kartı, Elle ince ayar kartı (döner düğmeler, Ters çevir, seviye ölçerleri), iki yönlü korelasyon ölçerleri, görünüm sekmeleri (Waveform · Phase · Spectrum · XY), basit görünümde kendini işaretleyen 3 adım; bağımlı kontroller kapalıyken soluk; tur 10 adım, hedefe bağlı, altın "İleri".
- Düzeltilen yarış durumu: host'un `prepareToPlay`'i ile ertelenen yeniden kurulum aynı anda çalışabiliyordu → kilit.

## Aşama 6 — Yayın hazırlığı 🔧 (satış yok, AGPLv3, Ders Paneli) — betikler ve kart hazır; Mac paketi + deploy bekliyor → `docs/yayin.md`

## Açık VARSAYIM'lar
Bkz. `docs/spec.md` §8.
