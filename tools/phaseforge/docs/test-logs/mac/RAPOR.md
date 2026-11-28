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
