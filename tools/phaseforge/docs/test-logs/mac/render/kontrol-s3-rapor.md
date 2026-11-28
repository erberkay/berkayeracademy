# kontrol-s3 (KONTROL: bas yerine ters çevrilmiş kick)

Girdi: bas `s3-128-bas.wav`, kick `s3-128-kick.wav` (15.20 sn, 44100 Hz, kick 7.50 sn'lik loop tekrarlandı).
Orijinal kick + bas: 20–200 Hz enerji -300.00 dB, tepe -600.00 dBFS, -inf LUFS.

## Linear Phase (FIR)
- RESOLVE: Ok, 4 düğüm (uygulandı)
  - düğüm 1: 90 Hz, aralık 4.5 dB, eşik -18.2 dB, Q 1.00, atak 8 ms, bırakma 130 ms, kanal Mid
  - düğüm 2: 44 Hz, aralık 4.5 dB, eşik -16.0 dB, Q 0.96, atak 10 ms, bırakma 150 ms, kanal Mid
  - düğüm 3: 11088 Hz, aralık 4.5 dB, eşik -50.9 dB, Q 3.44, atak 2 ms, bırakma 60 ms, kanal Mid
  - düğüm 4: 1638 Hz, aralık 4.5 dB, eşik -43.6 dB, Q 2.61, atak 2 ms, bırakma 63 ms, kanal Mid
- ANALYZE PHASE: Ok, açı +180.0°, güven 1.00, tahmini 20–200 Hz toplam değişimi +60.00 dB, 3.0 sn analiz → uygulandı (phaseAngle = +180.0)
- Örtüşme: 33 kick vuruşu; vuruşlar zamanın %34'ini kaplıyor, orijinal bas enerjisinin %84'i bu anlara düşüyor.
- Gecikme 5583 örnek (126.6 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -300.00 → -6.13 dB (**+293.87 dB**). Bas tek başına 20–200 Hz: -4.44 dB.
- Tepe: -600.00 → 2.46 dBFS (+602.46 dB). Loudness: -inf → -7.28 LUFS (+inf).
- Bas, vuruşlar dışında: seviye -5.19 dB, dalga farkı 3.8 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye -4.24 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark 8.0 dB, sonraki 20 ms'de 5.1 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: +602.46 dB.

## Zero Latency (IIR)
- RESOLVE: Ok, 4 düğüm (uygulandı)
  - düğüm 1: 90 Hz, aralık 4.5 dB, eşik -18.3 dB, Q 1.00, atak 8 ms, bırakma 130 ms, kanal Mid
  - düğüm 2: 44 Hz, aralık 4.5 dB, eşik -16.1 dB, Q 0.98, atak 10 ms, bırakma 150 ms, kanal Mid
  - düğüm 3: 11088 Hz, aralık 4.5 dB, eşik -50.9 dB, Q 3.44, atak 2 ms, bırakma 60 ms, kanal Mid
  - düğüm 4: 1638 Hz, aralık 4.5 dB, eşik -43.6 dB, Q 2.61, atak 2 ms, bırakma 63 ms, kanal Mid
- ANALYZE PHASE: Ok, açı +180.0°, güven 1.00, tahmini 20–200 Hz toplam değişimi +60.00 dB, 3.0 sn analiz → uygulandı (phaseAngle = +180.0)
- Örtüşme: 33 kick vuruşu; vuruşlar zamanın %34'ini kaplıyor, orijinal bas enerjisinin %84'i bu anlara düşüyor.
- Gecikme 0 örnek (0.0 ms), sonuç buna göre hizalandı.
- Kick + bas 20–200 Hz enerji: -300.00 → -9.31 dB (**+290.69 dB**). Bas tek başına 20–200 Hz: -4.85 dB.
- Tepe: -600.00 → 1.85 dBFS (+601.85 dB). Loudness: -inf → -10.44 LUFS (+inf).
- Bas, vuruşlar dışında: seviye -3.00 dB, dalga farkı 1.8 dB (bas seviyesine göre; faz döndürme bunu kendisi büyütür).
- Bas, vuruşlarda (kick başı −5…+150 ms): seviye -5.24 dB (istenen kısma).
- Vuruş öncesine sızma (ön çınlama / transient bulaşması): vuruştan önceki 20 ms'de fark -2.3 dB, sonraki 20 ms'de 0.2 dB (ikisi de o andaki bas seviyesine göre; önceki, sonrakinden çok daha düşük olmalı).
- Toplamın vuruştaki tepe değişimi: +600.82 dB.

