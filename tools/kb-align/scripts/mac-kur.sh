#!/usr/bin/env bash
# BE Akademi · KB-Align — Mac'e yerel kurulum (imzasız; yalnız bu Mac'te denemek için).
# Her şeyi kendisi yapar: araç kontrolü → JUCE (sabit sürüm) → derleme (AU + VST3) →
# ~/Library/Audio/Plug-Ins'e kurulum → yerel imza → auval kontrolü. Hiçbir şey yayımlamaz, sudo istemez.
#
# Terminal'e yapıştır (repo yoksa indirir, varsa günceller):
#   [ -d ~/be-akademi ] || git clone -b claude/nice-goodall-ygxn6x https://github.com/erberkay/berkayeracademy.git ~/be-akademi; cd ~/be-akademi && git pull && bash tools/kb-align/scripts/mac-kur.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEPS=${KB_DEPS_DIR:-$HOME/kbdeps}
LOG=/tmp/kbalign-kurulum.log
say() { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }
[ "$(uname)" = Darwin ] || fail "Bu betik Mac içindir."

say "1/5 Araçlar"
if ! xcode-select -p >/dev/null 2>&1; then
    xcode-select --install || true
    fail "Xcode komut satırı araçları kuruluyor (açılan pencerede 'Yükle'). Bitince aynı satırı yeniden yapıştır."
fi
need=""
command -v cmake >/dev/null 2>&1 || need="$need cmake"
command -v ninja >/dev/null 2>&1 || need="$need ninja"
if [ -n "$need" ]; then
    command -v brew >/dev/null 2>&1 || fail "Homebrew yok. https://brew.sh adresindeki tek satırı yapıştır, bitince bu satırı yeniden yapıştır."
    brew install $need
fi
echo "Xcode araçları, cmake $(cmake --version | head -1 | awk '{print $3}'), ninja $(ninja --version) hazır."

say "2/5 JUCE 9.0.6"
mkdir -p "$DEPS"
if [ ! -f "$DEPS/juce/CMakeLists.txt" ]; then
    git clone --depth 1 --branch 9.0.6 https://github.com/juce-framework/JUCE.git "$DEPS/juce"
else
    echo "Var: $DEPS/juce"
fi

say "3/5 Derleme (ilk sefer 3–8 dakika; ayrıntı: $LOG)"
B="$ROOT/plugin/build-mac-kur"
cmake -S "$ROOT/plugin" -B "$B" -G Ninja -DCMAKE_BUILD_TYPE=Release -DKB_DEPS_DIR="$DEPS" -DKB_BUILD_CLAP=OFF \
      -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 > "$LOG" 2>&1 || { tail -30 "$LOG"; fail "cmake hata verdi."; }
ninja -C "$B" KBAlign_AU KBAlign_VST3 >> "$LOG" 2>&1 || { grep -m20 -E "error|Error" "$LOG"; fail "Derleme hata verdi."; }
ART="$B/KBAlign_artefacts/Release"
echo "Derlendi: $ART"

say "4/5 Kurulum"
AU="$HOME/Library/Audio/Plug-Ins/Components"; V3="$HOME/Library/Audio/Plug-Ins/VST3"
mkdir -p "$AU" "$V3"
rm -rf "$AU/KB-Align.component" "$V3/KB-Align.vst3"
cp -R "$ART/AU/KB-Align.component" "$AU/"
cp -R "$ART/VST3/KB-Align.vst3" "$V3/"
for f in "$AU/KB-Align.component" "$V3/KB-Align.vst3"; do
    xattr -dr com.apple.quarantine "$f" 2>/dev/null || true
    codesign --force --deep --sign - "$f" >/dev/null 2>&1   # yerel (ad-hoc) imza: Apple Silicon yüklesin diye
done
killall -9 AudioComponentRegistrar 2>/dev/null || true
echo "Kuruldu: $AU/KB-Align.component"
echo "Kuruldu: $V3/KB-Align.vst3"

say "5/5 Kontrol (auval)"
if auval -v aufx KbAl Bker > /tmp/kbalign-auval.txt 2>&1 && grep -q "AU VALIDATION SUCCEEDED" /tmp/kbalign-auval.txt; then
    echo "auval: GEÇTİ"
else
    tail -15 /tmp/kbalign-auval.txt
    echo "auval geçmedi (ayrıntı: /tmp/kbalign-auval.txt). VST3 yine de kullanılabilir."
fi

cat <<'TXT'

✓ Bitti. Ableton'da:
  1) Ayarlar → Plug-Ins → "Use VST3 Plug-in Custom/System Folders" açık (ve istersen "Use Audio Units v2") → "Rescan".
  2) Tarayıcı → Plug-Ins → BE Akademi → KB-Align. VST3 sürümünü kullan (sidechain için en sağlamı).
  3) Bas kanalına koy; cihaz başlığındaki sidechain'den kaynak olarak kick kanalını seç.
  Ableton açıksa kapatıp aç. Kontrol listesi: tools/kb-align/docs/dogrulama/ableton-kontrol-listesi.md
TXT
