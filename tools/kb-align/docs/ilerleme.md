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

- [ ] (a) Çizdiği sidechain eğrisi (noktalar ya da görsel) — gelene kadar yer tutucu eğri (VARSAYIM)
- [ ] (b) Gerçek kick ve bas stem'leri — gelene kadar yalnız sentetik set
- [ ] (c) İşletim sistemi ve Ableton sürümü
- [ ] (d) Ürün adı fikri
- [ ] Uzak depo: ayrı GitHub reposu açılsın mı?

## Aşama 1 — Araştırma (sürüyor)

- `dsp-yontemleri.md` yazıldı. Ölçülen sayılar: FIR Hilbert alt frekans doğruluğu (41 Hz için ~25 ms yarı-boy), Doppler (1 ms/100 ms rampa ≈ 17 cent).
- Önemli bulgu: negatif kayma lookahead'i yer — kullanılabilir lookahead = `L + d`.

## Açık VARSAYIM'lar

Bkz. `docs/arastirma/dsp-yontemleri.md` §11.
