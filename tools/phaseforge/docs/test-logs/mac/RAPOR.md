# PHASEFORGE — Mac raporu

Makine: MacBook Pro, Apple Silicon (arm64), macOS 27.0.1. Araçlar: Xcode CLT, cmake 4.2.3, ninja 1.13.2, JUCE 9.0.6.

## Adım 1 — Derleme, kurulum, kontrol (2026-11-28)

**Sonuç: geçti (bir hata bulunup düzeltildikten sonra).**

| Kontrol | Sonuç | Kayıt |
|---|---|---|
| Derleme (AU + VST3, arm64, Release) | geçti | — |
| DSP testleri | 536 / 536 (92 + 121 + 149 + 174) | `phase_tests.txt`, `phasematch_tests.txt`, `dyneq_tests.txt`, `analysis_tests.txt` |
| Eklenti testleri (`pf_plugin_tests`) | 82 / 82 | `plugin_tests.txt` |
| Arayüz testleri (`pf_ui_tests`) | 28 / 28 | `ui_tests.txt` |
| auval (`aufx PhFg Bker`) | AU VALIDATION SUCCEEDED | `auval.txt` |
| pluginval 1.0.4, strictness 10, VST3 | SUCCESS (editör dahil) | `pluginval_vst3.txt` |
| pluginval 1.0.4, strictness 10, AU | SUCCESS (editör dahil) | `pluginval_au.txt` |

### Bulunan hata: Apple Silicon'da "0°" sıfır değildi

İlk derlemede eklenti testlerinin 12'si geçmedi (70/82):

- "0° / düğümler kapalı" çıktısı girişle bit bit aynı değildi (FIR'de fark 1.19e-07).
- **Zero Latency (IIR) modunda 0°'de çıktı girişten 1.33'e kadar farklıydı**; ölçülen gecikme 0 yerine 4 örnekti.
- Buna bağlı 6 test daha (IIR enerji tahmini, delta toplamı, bozuk preset yükleme vb.).

Neden: ARM işlemcide derleyici `a*b+c` işlemini tek adımda (FMA) yapıyor. JUCE, 0.1 adımlı parametreleri
yuvarlarken bu yüzden 0 yerine 0.0000027 veriyor. Faz döndürücü "açı 0 değil" deyip IIR ağını devreye alıyordu:
**varsayılan ayarda, Zero Latency modunda sesin fazı değişiyordu.** Linux/x86'da bu olmuyor; buluttaki testler
bu yüzden yakalayamadı.

Düzeltme:
1. `CMakeLists.txt`: Microsoft dışı derleyicilerde `-ffp-contract=off` (her platformda test edilen x86 ile aynı aritmetik).
2. `PhaseRotator.cpp`: 0.001°'nin altındaki açılar tam 0 sayılıyor (ek güvence; parametre adımı 0.1°).

Parametre kimlikleri değişmedi. Düzeltmeden sonra yukarıdaki bütün testler yeniden çalıştırıldı ve geçti.

### Not (hata değil, izlenecek)
- pluginval AU uyarıları: "Current program is -1" ve "Disabling non-main buses failed". Test yine de geçti.
  Ableton'da sidechain kapalıyken davranış Adım 4'te kontrol edilecek.
- Kurulum yalnız yerel (ad-hoc) imzalı. Apple imzası / notarization yapılmadı (onay gerekir).

## Adım 2 — Apple Silicon performansı (2026-11-28)

**Sonuç: bütçe aşımı yok.** 48 kHz, stereo ana giriş + stereo sidechain, 4 aktif düğüm (kick ile tetiklenen), 20 sn ses,
her senaryo 3 kez çalıştırıldı. Ayrıntı: `cpu.txt`.

| Mod | Blok | Ortalama çağrı | p99.9 | En yavaş (3 çalıştırma) | Bütçe | Bir çekirdeğin |
|---|---|---|---|---|---|---|
| Linear Phase (FIR) Rotate | 64 | 0.067 ms | 0.19 ms | ≤ 0.45 ms | 1.33 ms | ~%5.0 |
| Zero Latency (IIR) Rotate | 64 | 0.014 ms | 0.05 ms | ≤ 0.10 ms | 1.33 ms | ~%1.1 |
| Linear Phase (FIR) Rotate | 128 | 0.133 ms | 0.25 ms | ≤ 0.30 ms | 2.67 ms | ~%5.0 |
| Zero Latency (IIR) Rotate | 128 | 0.028 ms | 0.08 ms | ≤ 0.13 ms | 2.67 ms | ~%1.1 |

(Match modu FIR'de ~%4.2, IIR'de ~%0.8; tablo `cpu.txt`'de.)

- Testte iki durum ölçüldü: parametreler sabit ve otomasyonlu (düğüm 1 frekansı/eşiği ve faz açısı her blokta
  değişiyor). Otomasyon ortalamayı yalnız %1–5 artırıyor. Ölçülen 120 000'den fazla çağrının hiçbiri bütçeyi aşmadı.
- Buluttaki 3.8 ms'lik sıçramalar Mac'te görülmedi. En yavaş FIR çağrısı 0.45 ms (bütçenin üçte biri). Sıçramaların
  bulutta paylaşılan sanal makineden geldiğini düşünüyorum, ama bunu **kanıtlamadım**. Kod değiştirilmedi.
- **Test edilmedi:** çalma sırasında Phase Match çekirdeğinin değişmesi (ANALYZE → APPLY anı) ve gerçek bir
  sunucudaki gerçek zamanlı ses iş parçacığı. Testler, çevrimdışı bir döngüde yapıldı. Ableton'daki CPU göstergesi Adım 4'te kontrol edilecek.
- Değişen dosya: `Tests/plugin_tests.cpp`. CPU testine 128 örneklik blok, ortalama, bütçe aşımı sayısı ve
  otomasyon senaryosu eklendi. Bu değişiklik yalnızca bilgi veriyor, geçti/kaldı sayısını değiştirmiyor. 82/82 test hâlâ geçiyor.

## Adım 3 — Gerçek sesle ölçüm (2026-11-28)

**Malzeme:** Kullanıcı stem dışa aktarmak yerine SSD'deki malzemeyi kullanmamı istedi. Aynı tempoda kick ve bas
loop'larından 4 çift seçtim: 1'i "Master mix Demo" projesinden (122 BPM), 3'ü PML Melodic Techno paketinin aynı
parçaya ait önizlemelerinden (126 / 128 / 126 BPM). Hepsi 44.1 kHz, 8–15 sn. Kick loop'u kısaysa bas boyunca
tekrarlandı. Bunlar bir şarkının gerçek stem'i değil, satılan loop'lardır. Ses dosyaları commit edilmedi.

**Araç:** `Tests/render_files.cpp` → `pf_render` hedefi. Bas ana girişe, kick sidechain'e gidiyor. Her iki modda
RESOLVE + ANALYZE PHASE çalışıyor ve sonuçlar uygulanıyor (APPLY gibi). Ardından temiz bir render alınıp gecikme
hizalanıyor. Raporlar `render/` klasöründe.

**Kontrol deneyi (araç doğru mu?):** Bas yerine ters çevrilmiş kick verildi (`kontrol-s3-rapor.md`). ANALYZE
PHASE iki modda da +180.0° buldu (güven 1.00) ve uyguladı. Analiz ve uygulama zinciri çalışıyor.

| Çift | RESOLVE | ANALYZE PHASE | Vuruşta bas kısılması | Kick+bas 20–200 Hz | Vuruşlar dışında bas | Vuruş öncesine sızma |
|---|---|---|---|---|---|---|
| s1 122 | çakışma yok, 0 düğüm | ilişkisiz → reddetti | 0 dB | 0 dB | 0 dB | — |
| s2 126 | 1 düğüm (102 Hz, 2.8 dB) | ilişkisiz → reddetti | −0.3 dB | −0.08 dB | −0.13 dB | −46 dB |
| s3 128 | 4 düğüm (170, 234, 1021, 1317 Hz) | ilişkisiz → reddetti | −0.5 dB | −0.06 dB | −0.09 dB | −48…−50 dB |
| s4 126 | 1 düğüm (31 Hz, 2.6 dB) | ilişkisiz → reddetti | −0.04 dB | −0.03 dB | −0.04 dB | −52…−55 dB |

(FIR ve IIR arasındaki fark bu malzemede ≤ 0.07 dB. Ayrıntılar raporlarda.)

**Ne anlama geliyor:**
1. **Sesi bozmuyor.** Vuruşlar dışında bas en fazla 0.13 dB değişiyor. Vuruştan önce sızma (Linear Phase'in ön
   çınlaması) bas seviyesinin 45 dB'den fazla altında. KB-Align'daki "sesi bozuyor" şikâyetinin ölçülebilir bir
   karşılığı bu malzemede yok.
2. **Ama etkisi çok küçük.** RESOLVE vuruş anında basa en fazla 0.5 dB kısma uyguluyor. Bunun kulakla duyulması
   zor. FUSER gibi "çamur açıldı" etkisi beklenirse bu yetersiz kalır. Düğümlerin aralığı (2.5–4 dB) ve eşiği
   bu malzeme için çok temkinli görünüyor. **Kulakla dinlenmedi**; Adım 4'te kullanıcının kulağı belirleyecek.
3. **s1'de "çakışma yok" doğru görünüyor.** Bas enerjisinin yalnız %10'u vuruş anlarına düşüyor; bas, kick'in
   arasında çalıyor.
4. **Faz analizi gerçek malzemede hep reddetti.** Kick ile bas farklı notalarda ve farklı seslerde; aralarında
   tutarlı bir faz ilişkisi yok. Kontrol deneyi aracın doğru çalıştığını gösteriyor, yani bu bilinçli bir ret.
   Ancak kullanıcı açısından ANALYZE PHASE gerçek kick+bas'ta hiçbir şey yapmıyor demek. Bu, Adım 5'te
   konuşulmalı.
5. Toplamın tepesi s3'te 0.4 dB düştü. Loop'lar 0 dBFS'e normalize edildiği için toplam tepe 0 dBFS'in üstünde
   (2.7–5.4 dBFS); bu, kayan noktalı (float) işlemede sorun değil.

**Test edilmedi:** Tam bir şarkının gerçek stem'leri ve dinleme.
