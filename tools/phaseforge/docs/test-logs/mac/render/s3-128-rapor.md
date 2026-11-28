# s3-128

Girdi: bas `s3-128-bas.wav`, kick `s3-128-kick.wav` (15.20 sn, 44100 Hz, kick 7.50 sn'lik loop tekrarlandı).
Orijinal kick + bas: 20–200 Hz enerji -8.31 dB, tepe 2.99 dBFS, -8.02 LUFS.

## Linear Phase (FIR)
- RESOLVE: Ok, 4 düğüm (uygulandı)
  - düğüm 1: 170 Hz, aralık 3.3 dB, eşik -26.4 dB, Q 5.78, atak 6 ms, bırakma 111 ms, kanal Mid
  - düğüm 2: 234 Hz, aralık 4.0 dB, eşik -33.2 dB, Q 8.00, atak 5 ms, bırakma 102 ms, kanal Mid
  - düğüm 3: 1021 Hz, aralık 3.2 dB, eşik -42.0 dB, Q 3.23, atak 3 ms, bırakma 71 ms, kanal Mid
  - düğüm 4: 1317 Hz, aralık 2.5 dB, eşik -43.6 dB, Q 8.00, atak 2 ms, bırakma 67 ms, kanal Mid
- ANALYZE PHASE: Unrelated (ilişkisiz: reddetti), açı +0.0°, güven 0.00, tahmini 20–200 Hz toplam değişimi +0.00 dB, 3.0 sn analiz → uygulanmadı
- Örtüşme: 33 kick vuruşu; vuruşlar zamanın %34'ini kaplıyor, orijinal bas enerjisinin %35'i bu anlara düşüyor.
- Gecikme 5583 örnek (126.6 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -8.31 → -8.37 dB (**-0.06 dB**). Bas tek başına 20–200 Hz: -0.23 dB.
- Tepe: 2.99 → 2.56 dBFS (-0.43 dB). Loudness: -8.02 → -8.18 LUFS (-0.16).
- Bas, vuruşlar dışında: seviye -0.09 dB, dalga farkı -32.9 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye -0.52 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark -48.2 dB, sonraki 20 ms'de -20.9 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: -0.49 dB.

## Zero Latency (IIR)
- RESOLVE: Ok, 4 düğüm (uygulandı)
  - düğüm 1: 170 Hz, aralık 3.3 dB, eşik -26.4 dB, Q 5.78, atak 6 ms, bırakma 111 ms, kanal Mid
  - düğüm 2: 234 Hz, aralık 4.0 dB, eşik -33.2 dB, Q 8.00, atak 5 ms, bırakma 102 ms, kanal Mid
  - düğüm 3: 1021 Hz, aralık 3.2 dB, eşik -42.0 dB, Q 3.23, atak 3 ms, bırakma 71 ms, kanal Mid
  - düğüm 4: 1317 Hz, aralık 2.5 dB, eşik -43.6 dB, Q 8.00, atak 2 ms, bırakma 67 ms, kanal Mid
- ANALYZE PHASE: Unrelated (ilişkisiz: reddetti), açı +0.0°, güven 0.00, tahmini 20–200 Hz toplam değişimi +0.00 dB, 3.0 sn analiz → uygulanmadı
- Örtüşme: 33 kick vuruşu; vuruşlar zamanın %34'ini kaplıyor, orijinal bas enerjisinin %35'i bu anlara düşüyor.
- Gecikme 0 örnek (0.0 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -8.31 → -8.37 dB (**-0.05 dB**). Bas tek başına 20–200 Hz: -0.23 dB.
- Tepe: 2.99 → 2.63 dBFS (-0.36 dB). Loudness: -8.02 → -8.17 LUFS (-0.15).
- Bas, vuruşlar dışında: seviye -0.09 dB, dalga farkı -31.1 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye -0.53 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark -49.6 dB, sonraki 20 ms'de -20.2 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: -0.36 dB.

