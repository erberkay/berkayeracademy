#!/usr/bin/env bash
# Mac: universal derleme → imzalama (Developer ID, hardened runtime) → .pkg → notarization → staple.
# Senin Apple Developer hesabınla, senin Mac'inde çalışır. Hiçbir şeyi yüklemez/yayınlamaz; çıktı dist/ altında.
#
# Bir kerelik hazırlık:
#   1) Keychain'de iki sertifika: "Developer ID Application: …" ve "Developer ID Installer: …"
#        security find-identity -v -p basic   (adlarını buradan kopyala)
#   2) Notarization profili (uygulamaya özel şifre appleid.apple.com'dan):
#        xcrun notarytool store-credentials kbalign --apple-id <apple-id> --team-id <TEAMID>
#   3) Bağımlılıklar: docs/dogrulama/mac-kontrol-listesi.md §2
#
# Kullanım (tools/kb-align içinden):
#   APP_ID="Developer ID Application: Ad Soyad (TEAMID)" \
#   INST_ID="Developer ID Installer: Ad Soyad (TEAMID)" \
#   NOTARY_PROFILE=kbalign  KB_DEPS_DIR=$HOME/kbdeps  ./scripts/mac-paketle.sh
set -euo pipefail
cd "$(dirname "$0")/.."
: "${APP_ID:?APP_ID gerekli}" "${INST_ID:?INST_ID gerekli}" "${NOTARY_PROFILE:?NOTARY_PROFILE gerekli}"
KB_DEPS_DIR=${KB_DEPS_DIR:-$HOME/kbdeps}
VER=$(grep -m1 -oE 'project\(KBAlign VERSION [0-9.]+' plugin/CMakeLists.txt | awk '{print $3}')
OUT=dist/mac; STAGE=$OUT/stage; mkdir -p "$STAGE"

cmake -S plugin -B plugin/build-mac -G Ninja -DCMAKE_BUILD_TYPE=Release -DKB_DEPS_DIR="$KB_DEPS_DIR" \
      -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0
ninja -C plugin/build-mac KBAlign_AU KBAlign_VST3 KBAlign_CLAP kb_tests
( cd prototype && python3 -I export_parity.py >/dev/null ) && plugin/build-mac/kb_tests plugin/tests/parity | tail -1
ART=plugin/build-mac/KBAlign_artefacts/Release

sign() { codesign --force --deep --options runtime --timestamp --sign "$APP_ID" "$1"; codesign --verify --strict --verbose=2 "$1"; }
for f in "$ART/AU/KB-Align.component" "$ART/VST3/KB-Align.vst3" "$ART/CLAP/KB-Align.clap"; do sign "$f"; done

rm -rf "$STAGE"; mkdir -p "$STAGE"/{au,vst3,clap}
cp -R "$ART/AU/KB-Align.component" "$STAGE/au/"; cp -R "$ART/VST3/KB-Align.vst3" "$STAGE/vst3/"; cp -R "$ART/CLAP/KB-Align.clap" "$STAGE/clap/"
pkgbuild --root "$STAGE/au"   --install-location "/Library/Audio/Plug-Ins/Components" --identifier com.berkayer.kbalign.au   --version "$VER" "$OUT/au.pkg"
pkgbuild --root "$STAGE/vst3" --install-location "/Library/Audio/Plug-Ins/VST3"       --identifier com.berkayer.kbalign.vst3 --version "$VER" "$OUT/vst3.pkg"
pkgbuild --root "$STAGE/clap" --install-location "/Library/Audio/Plug-Ins/CLAP"       --identifier com.berkayer.kbalign.clap --version "$VER" "$OUT/clap.pkg"
cat > "$OUT/distribution.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
  <title>KB-Align $VER</title>
  <license file="LICENSE"/>
  <options customize="allow" require-scripts="false" hostArchitectures="arm64,x86_64"/>
  <choices-outline><line choice="au"/><line choice="vst3"/><line choice="clap"/></choices-outline>
  <choice id="au" title="Audio Unit (Logic, Ableton)"><pkg-ref id="com.berkayer.kbalign.au"/></choice>
  <choice id="vst3" title="VST3 (Ableton, Bitwig, Reaper…)"><pkg-ref id="com.berkayer.kbalign.vst3"/></choice>
  <choice id="clap" title="CLAP (Bitwig, Reaper)"><pkg-ref id="com.berkayer.kbalign.clap"/></choice>
  <pkg-ref id="com.berkayer.kbalign.au">au.pkg</pkg-ref>
  <pkg-ref id="com.berkayer.kbalign.vst3">vst3.pkg</pkg-ref>
  <pkg-ref id="com.berkayer.kbalign.clap">clap.pkg</pkg-ref>
</installer-gui-script>
XML
mkdir -p "$OUT/res" && cp LICENSE "$OUT/res/LICENSE"
PKG="dist/KB-Align-$VER-mac.pkg"
productbuild --distribution "$OUT/distribution.xml" --package-path "$OUT" --resources "$OUT/res" --sign "$INST_ID" "$PKG"
xcrun notarytool submit "$PKG" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$PKG"
spctl --assess --type install --verbose "$PKG"
shasum -a 256 "$PKG"
echo "Hazır: $PKG"
