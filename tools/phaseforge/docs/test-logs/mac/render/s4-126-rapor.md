# s4-126

Girdi: bas `s4-126-bas.wav`, kick `s4-126-kick.wav` (15.50 sn, 44100 Hz, kick 7.62 sn'lik loop tekrarlandı).
Orijinal kick + bas: 20–200 Hz enerji -6.04 dB, tepe 4.96 dBFS, -7.24 LUFS.

## Linear Phase (FIR)
- RESOLVE: Ok, 1 düğüm (uygulandı)
  - düğüm 1: 31 Hz, aralık 2.5 dB, eşik -18.9 dB, Q 2.38, atak 10 ms, bırakma 150 ms, kanal Mid
- ANALYZE PHASE: Unrelated (ilişkisiz: reddetti), açı +0.0°, güven 0.00, tahmini 20–200 Hz toplam değişimi +0.00 dB, 3.0 sn analiz → uygulanmadı
- Örtüşme: 33 kick vuruşu; vuruşlar zamanın %33'ini kaplıyor, orijinal bas enerjisinin %30'i bu anlara düşüyor.
- Gecikme 5583 örnek (126.6 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -6.04 → -6.07 dB (**-0.03 dB**). Bas tek başına 20–200 Hz: -0.04 dB.
- Tepe: 4.96 → 4.96 dBFS (-0.00 dB). Loudness: -7.24 → -7.26 LUFS (-0.02).
- Bas, vuruşlar dışında: seviye -0.04 dB, dalga farkı -43.3 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye -0.04 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark -54.9 dB, sonraki 20 ms'de -57.4 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: -0.01 dB.

## Zero Latency (IIR)
- RESOLVE: Ok, 1 düğüm (uygulandı)
  - düğüm 1: 31 Hz, aralık 2.5 dB, eşik -18.9 dB, Q 2.38, atak 10 ms, bırakma 150 ms, kanal Mid
- ANALYZE PHASE: Unrelated (ilişkisiz: reddetti), açı +0.0°, güven 0.00, tahmini 20–200 Hz toplam değişimi +0.00 dB, 3.0 sn analiz → uygulanmadı
- Örtüşme: 33 kick vuruşu; vuruşlar zamanın %33'ini kaplıyor, orijinal bas enerjisinin %30'i bu anlara düşüyor.
- Gecikme 0 örnek (0.0 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -6.04 → -6.07 dB (**-0.03 dB**). Bas tek başına 20–200 Hz: -0.04 dB.
- Tepe: 4.96 → 4.96 dBFS (-0.00 dB). Loudness: -7.24 → -7.26 LUFS (-0.02).
- Bas, vuruşlar dışında: seviye -0.04 dB, dalga farkı -41.9 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye -0.04 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark -52.0 dB, sonraki 20 ms'de -53.2 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: -0.01 dB.

