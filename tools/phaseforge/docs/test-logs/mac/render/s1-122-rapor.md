# s1-122

Girdi: bas `s1-122-bas.wav`, kick `s1-122-kick.wav` (7.87 sn, 44100 Hz).
Orijinal kick + bas: 20–200 Hz enerji -7.28 dB, tepe 2.70 dBFS, -8.10 LUFS.

## Linear Phase (FIR)
- RESOLVE: NoConflict (çakışma yok), 0 düğüm (uygulandı)
- ANALYZE PHASE: Unrelated (ilişkisiz: reddetti), açı +0.0°, güven 0.00, tahmini 20–200 Hz toplam değişimi +0.00 dB, 3.0 sn analiz → uygulanmadı
- Örtüşme: 16 kick vuruşu; vuruşlar zamanın %31'ini kaplıyor, orijinal bas enerjisinin %10'i bu anlara düşüyor.
- Gecikme 5583 örnek (126.6 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -7.28 → -7.28 dB (**+0.00 dB**). Bas tek başına 20–200 Hz: +0.00 dB.
- Tepe: 2.70 → 2.70 dBFS (+0.00 dB). Loudness: -8.10 → -8.10 LUFS (+0.00).
- Bas, vuruşlar dışında: seviye +0.00 dB, dalga farkı -290.1 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye +0.00 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark -333.3 dB, sonraki 20 ms'de -331.4 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: +0.00 dB.

## Zero Latency (IIR)
- RESOLVE: NoConflict (çakışma yok), 0 düğüm (uygulandı)
- ANALYZE PHASE: Unrelated (ilişkisiz: reddetti), açı +0.0°, güven 0.00, tahmini 20–200 Hz toplam değişimi +0.00 dB, 3.0 sn analiz → uygulanmadı
- Örtüşme: 16 kick vuruşu; vuruşlar zamanın %31'ini kaplıyor, orijinal bas enerjisinin %10'i bu anlara düşüyor.
- Gecikme 0 örnek (0.0 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -7.28 → -7.28 dB (**+0.00 dB**). Bas tek başına 20–200 Hz: +0.00 dB.
- Tepe: 2.70 → 2.70 dBFS (+0.00 dB). Loudness: -8.10 → -8.10 LUFS (+0.00).
- Bas, vuruşlar dışında: seviye +0.00 dB, dalga farkı -290.1 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye +0.00 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark -333.3 dB, sonraki 20 ms'de -331.4 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: +0.00 dB.

