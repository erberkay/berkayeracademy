# s2-126

Girdi: bas `s2-126-bas.wav`, kick `s2-126-kick.wav` (15.24 sn, 44100 Hz, kick 7.62 sn'lik loop tekrarlandı).
Orijinal kick + bas: 20–200 Hz enerji -8.59 dB, tepe 5.35 dBFS, -8.17 LUFS.

## Linear Phase (FIR)
- RESOLVE: Ok, 1 düğüm (uygulandı)
  - düğüm 1: 102 Hz, aralık 2.8 dB, eşik -18.0 dB, Q 5.78, atak 7 ms, bırakma 126 ms, kanal Mid
- ANALYZE PHASE: Unrelated (ilişkisiz: reddetti), açı +0.0°, güven 0.00, tahmini 20–200 Hz toplam değişimi +0.00 dB, 3.0 sn analiz → uygulanmadı
- Örtüşme: 32 kick vuruşu; vuruşlar zamanın %33'ini kaplıyor, orijinal bas enerjisinin %41'i bu anlara düşüyor.
- Gecikme 5583 örnek (126.6 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -8.59 → -8.67 dB (**-0.08 dB**). Bas tek başına 20–200 Hz: -0.25 dB.
- Tepe: 5.35 → 5.35 dBFS (+0.00 dB). Loudness: -8.17 → -8.26 LUFS (-0.09).
- Bas, vuruşlar dışında: seviye -0.13 dB, dalga farkı -31.3 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye -0.32 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark -45.6 dB, sonraki 20 ms'de -48.6 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: -0.01 dB.

## Zero Latency (IIR)
- RESOLVE: Ok, 1 düğüm (uygulandı)
  - düğüm 1: 102 Hz, aralık 2.8 dB, eşik -18.0 dB, Q 5.78, atak 7 ms, bırakma 126 ms, kanal Mid
- ANALYZE PHASE: Unrelated (ilişkisiz: reddetti), açı +0.0°, güven 0.00, tahmini 20–200 Hz toplam değişimi +0.00 dB, 3.0 sn analiz → uygulanmadı
- Örtüşme: 32 kick vuruşu; vuruşlar zamanın %33'ini kaplıyor, orijinal bas enerjisinin %41'i bu anlara düşüyor.
- Gecikme 0 örnek (0.0 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -8.59 → -8.67 dB (**-0.08 dB**). Bas tek başına 20–200 Hz: -0.25 dB.
- Tepe: 5.35 → 5.35 dBFS (+0.00 dB). Loudness: -8.17 → -8.26 LUFS (-0.09).
- Bas, vuruşlar dışında: seviye -0.13 dB, dalga farkı -29.8 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye -0.33 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark -45.5 dB, sonraki 20 ms'de -47.7 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: -0.00 dB.

