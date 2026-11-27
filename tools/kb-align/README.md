# KB-Align (geçici ad)

Kick–bas faz ve zaman hizalama eklentisi (VST3 / AU / CLAP / Standalone), kick'e kilitli osiloskop ile.
Bas kanalına takılır, kick sidechain girişinden ölçülür; yalnız bası işler.

Şimdilik berkayeracademy reposunda `tools/kb-align/` altında (`tools/**` siteye yüklenmez).

| Yer | İçerik |
|---|---|
| `docs/talimat.md` | Geliştirme talimatı |
| `docs/spec.md` | Spesifikasyon (ölçümle kesinleşmiş kararlar, sapmalar, VARSAYIM'lar) |
| `docs/ilerleme.md` | Aşama aşama durum, bekleyenler |
| `docs/arastirma/` | Rakipler, DSP yöntemleri, kaynak notları |
| `docs/dogrulama/` | pluginval, clap-validator, testler; Mac ve Ableton kontrol listeleri |
| `docs/ekran/` | Arayüz görüntüleri (gerçek sinyalle) |
| `prototype/` | Python algoritma kanıtı, testler, rapor (`rapor/ozet.md`) |
| `plugin/` | C++/JUCE eklentisi |
| `test-dosyalari/` | Ableton testleri için bilinen ofsetli WAV'lar |

## Derleme (Linux; Mac için `docs/dogrulama/mac-kontrol-listesi.md`)

```bash
# bağımlılıklar (repo dışına)
git clone --depth 1 --branch 9.0.6 https://github.com/juce-framework/JUCE.git ~/kbdeps/juce
git clone --depth 1 --recurse-submodules --shallow-submodules https://github.com/free-audio/clap-juce-extensions.git ~/kbdeps/clap-juce-extensions
# Linux paketleri: libasound2-dev libfreetype-dev libfontconfig1-dev libx11-dev libxcomposite-dev libxcursor-dev
#                  libxext-dev libxinerama-dev libxrandr-dev libxrender-dev libxi-dev libgl1-mesa-dev ninja-build

cd prototype && pip install -r requirements.txt && python3 -I -m pytest -q tests && python3 -I export_parity.py && cd ..
cd plugin
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DKB_DEPS_DIR=$HOME/kbdeps
ninja -C build
./build/kb_tests tests/parity
xvfb-run -a ./build/kb_plugin_test_artefacts/Release/kb_plugin_test tests/parity
```
Çıktılar: `plugin/build/KBAlign_artefacts/Release/{VST3,CLAP,Standalone}`.
