#!/usr/bin/env bash
# BE Akademi · PHASEFORGE — Mac'e yerel kurulum (imzasız; yalnız bu Mac'te denemek için).
# Araç kontrolü → JUCE 9.0.6 → derleme (AU + VST3, Apple Silicon/Intel: bu Mac'in mimarisi) →
# ~/Library/Audio/Plug-Ins'e kurulum → yerel (ad-hoc) imza → auval kontrolü. Hiçbir şey yayımlamaz, sudo istemez.
#
# Terminal'e yapıştır (repo yoksa indirir, varsa günceller):
#   [ -d ~/be-akademi ] || git clone -b claude/nice-goodall-ygxn6x https://github.com/erberkay/berkayeracademy.git ~/be-akademi; cd ~/be-akademi && git pull && bash tools/phaseforge/scripts/mac-kur.sh
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DEPS=${PF_DEPS_DIR:-$HOME/kbdeps}
LOG=/tmp/phaseforge-kurulum.log
say() { printf '\n\033[1;35m▶ %s\033[0m\n' "$*"; }
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
B="$ROOT/build-mac-kur"
cmake -S "$ROOT" -B "$B" -G Ninja -DCMAKE_BUILD_TYPE=Release -DPF_DEPS_DIR="$DEPS" \
      -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 > "$LOG" 2>&1 || { tail -30 "$LOG"; fail "cmake hata verdi."; }
ninja -C "$B" PHASEFORGE_AU PHASEFORGE_VST3 pf_plugin_tests >> "$LOG" 2>&1 || { grep -m20 -E "error|Error" "$LOG"; fail "Derleme hata verdi."; }
ART="$B/PHASEFORGE_artefacts/Release"
echo "Derlendi: $ART"
echo "Testler çalışıyor (yaklaşık 1–3 dk)…"
if "$B/pf_plugin_tests_artefacts/Release/pf_plugin_tests" > /tmp/phaseforge-testler.txt 2>&1; then
    echo "Eklenti testleri: $(tail -1 /tmp/phaseforge-testler.txt)"
else
    grep "FAIL\]" /tmp/phaseforge-testler.txt | head; echo "Bazı testler geçmedi (ayrıntı: /tmp/phaseforge-testler.txt) — kurulum yine de sürüyor."
fi

say "4/5 Kurulum"
AU="$HOME/Library/Audio/Plug-Ins/Components"; V3="$HOME/Library/Audio/Plug-Ins/VST3"
mkdir -p "$AU" "$V3"
rm -rf "$AU/PHASEFORGE.component" "$V3/PHASEFORGE.vst3"
cp -R "$ART/AU/PHASEFORGE.component" "$AU/"
cp -R "$ART/VST3/PHASEFORGE.vst3" "$V3/"
for f in "$AU/PHASEFORGE.component" "$V3/PHASEFORGE.vst3"; do
    xattr -dr com.apple.quarantine "$f" 2>/dev/null || true
    codesign --force --deep --sign - "$f" >/dev/null 2>&1   # yerel (ad-hoc) imza: Apple Silicon yüklesin diye
done
killall -9 AudioComponentRegistrar 2>/dev/null || true
echo "Kuruldu: $AU/PHASEFORGE.component"
echo "Kuruldu: $V3/PHASEFORGE.vst3"

say "5/5 Kontrol (auval)"
if auval -v aufx PhFg Bker > /tmp/phaseforge-auval.txt 2>&1 && grep -q "AU VALIDATION SUCCEEDED" /tmp/phaseforge-auval.txt; then
    echo "auval: GEÇTİ"
else
    tail -15 /tmp/phaseforge-auval.txt
    echo "auval geçmedi (ayrıntı: /tmp/phaseforge-auval.txt). VST3 yine de kullanılabilir."
fi

cat <<'TXT'

✓ Bitti. Ableton'da:
  1) Ayarlar → Plug-Ins → "Use VST3 Plug-in System Folders" açık → "Rescan". (Ableton açıksa kapatıp aç.)
  2) Tarayıcı → Plug-Ins → BE Akademi → PHASEFORGE (VST3 önerilir; sidechain için en sağlamı).
  3) Bas kanalına koy; cihaz başlığındaki sidechain bölümünden kaynak olarak kick kanalını seç.
  4) İkisini birlikte çal → RESOLVE CONFLICTS ve/veya ANALYZE PHASE → APPLY. Bypass ile kulakla karşılaştır.
  Not: varsayılan "Linear Phase" ~118 ms gecikme ekler (Ableton bunu denkleştirir). Canlı çalarken "Zero Latency" seç.
TXT
