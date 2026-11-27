# KB-Align — kaynak kodu ve derleme bilgisi (GNU AGPL v3, §6)

Bu eklenti ücretsizdir ve GNU Affero Genel Kamu Lisansı v3 (ya da sonrası) ile dağıtılır (`LICENSE`).
İkili dosyayı (AU / VST3 / CLAP) alan herkes bu klasörün tamamını aynı lisansla alma, değiştirme ve paylaşma hakkına sahiptir.

## Bu sürümün derlendiği bağımlılıklar (birebir)
| Bileşen | Sürüm / commit | Kaynak | Lisans |
|---|---|---|---|
| JUCE | 9.0.6 — `654bdbc7a9db0dae90849b44abe91f339e9f0768` | https://github.com/juce-framework/JUCE/tree/9.0.6 | AGPLv3 |
| clap-juce-extensions | `3837f4a6ed2ab0ba46aba69ae5b7041c7c64ce74` | https://github.com/free-audio/clap-juce-extensions | MIT |
| ├ clap | `195b42a004144fab0b3cf95e9c067187d15365b7` | https://github.com/free-audio/clap | MIT |
| └ clap-helpers | `a380c978f429103e08afc1d17e9efbf3e3c96ee2` | https://github.com/free-audio/clap-helpers | MIT |
| VST3 SDK | JUCE 9.0.6 içinde | https://github.com/steinbergmedia/vst3sdk | MIT |
| Inter yazı tipi (Regular, SemiBold, Display Bold) | 4.0 (Debian fonts-inter) — `plugin/resources/fonts/` | https://github.com/rsms/inter | SIL OFL 1.1 (`plugin/resources/fonts/OFL.txt`) |

## Derleme
`README.md` → "Derleme" (Linux) · `docs/dogrulama/mac-kontrol-listesi.md` (Mac) · `scripts/windows-derle.ps1` (Windows).
