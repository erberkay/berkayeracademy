# Mac'te derleme ve AU doğrulaması (kullanıcının Mac'inde)

Bu ortam Linux; AU derlemesi, `auval`, imzalama ve notarization yalnız Mac'te yapılır. **İmzalama ve notarization için Apple Developer hesabı gerekir (ücretli) — talimat gereği önce bana onay ver, ben komutları hazırlarım; burada yalnız imzasız yerel test var.**

## 1. Araçlar
```bash
xcode-select --install                 # Xcode komut satırı araçları
brew install cmake ninja               # Homebrew yoksa: https://brew.sh
```

## 2. Bağımlılıklar (repo kökünden)
```bash
mkdir -p ~/kbdeps && cd ~/kbdeps
git clone --depth 1 --branch 9.0.6 https://github.com/juce-framework/JUCE.git juce
git clone --depth 1 --recurse-submodules --shallow-submodules https://github.com/free-audio/clap-juce-extensions.git
```

## 3. Derleme
```bash
cd <repo>/tools/kb-align/plugin
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DKB_DEPS_DIR=$HOME/kbdeps \
      -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"
ninja -C build KBAlign_AU KBAlign_VST3 KBAlign_CLAP KBAlign_Standalone kb_tests
./build/kb_tests tests/parity         # önce: cd ../prototype && python3 -I export_parity.py
```
Beklenen: `kb_tests` → "0 hata".

## 4. Kurulum (yerel test, imzasız)
```bash
cp -R build/KBAlign_artefacts/Release/AU/KB-Align.component ~/Library/Audio/Plug-Ins/Components/
cp -R build/KBAlign_artefacts/Release/VST3/KB-Align.vst3    ~/Library/Audio/Plug-Ins/VST3/
cp -R build/KBAlign_artefacts/Release/CLAP/KB-Align.clap    ~/Library/Audio/Plug-Ins/CLAP/
killall -9 AudioComponentRegistrar 2>/dev/null   # AU önbelleğini yenile
```
İmzasız eklentiyi Gatekeeper engellerse (yalnız kendi Mac'inde test için):
```bash
xattr -dr com.apple.quarantine ~/Library/Audio/Plug-Ins/Components/KB-Align.component
```

## 5. auval
```bash
auval -v aufx KbAl Bker
```
Beklenen son satır: `AU VALIDATION SUCCEEDED.` — çıktıyı `docs/dogrulama/auval.txt` olarak kaydet.

## 6. pluginval (Mac)
pluginval v1.0.4 Mac sürümü: https://github.com/Tracktion/pluginval/releases
```bash
./pluginval.app/Contents/MacOS/pluginval --strictness-level 10 --validate-in-process ~/Library/Audio/Plug-Ins/Components/KB-Align.component
./pluginval.app/Contents/MacOS/pluginval --strictness-level 10 --validate-in-process ~/Library/Audio/Plug-Ins/VST3/KB-Align.vst3
```
Beklenen: `SUCCESS` (Linux VST3'te strictness 10 geçti: `pluginval-vst3-strictness10.txt`).

## 7. Sonuçlar
(Buraya yaz: macOS sürümü, işlemci, her adımın sonucu.)
