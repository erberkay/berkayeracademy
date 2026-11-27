#!/usr/bin/env bash
# AGPL kaynak kodu paketi: tools/kb-align'ın commit'lenmiş hâli (derleme klasörleri hariç) → dist/KB-Align-<sürüm>-kaynak.zip
# Kullanım: tools/kb-align içinden  ./scripts/kaynak-zip.sh
set -euo pipefail
cd "$(dirname "$0")/.."
VER=$(grep -m1 -oE 'project\(KBAlign VERSION [0-9.]+' plugin/CMakeLists.txt | awk '{print $3}')
mkdir -p dist
ROOT=$(git rev-parse --show-toplevel)
PREFIX=$(git rev-parse --show-prefix)
( cd "$ROOT" && git archive --format=zip --prefix="KB-Align-$VER-kaynak/" -o "$OLDPWD/dist/KB-Align-$VER-kaynak.zip" HEAD:"$PREFIX" )
echo "dist/KB-Align-$VER-kaynak.zip"
