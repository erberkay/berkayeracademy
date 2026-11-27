#!/usr/bin/env bash
# dist/ altındaki paketleri sitenin indirme klasörüne (indir/kb-align/) kopyalar ve surum.json'u yazar.
# Ders Paneli'ndeki KB-Align kartı bu dosyayı okur. Sonra: firebase deploy --only hosting (repo kökünden).
# Kullanım (tools/kb-align içinden): ./scripts/yayina-hazirla.sh
set -euo pipefail
cd "$(dirname "$0")/.."
VER=$(grep -m1 -oE 'project\(KBAlign VERSION [0-9.]+' plugin/CMakeLists.txt | awk '{print $3}')
DEST=../../indir/kb-align
mkdir -p "$DEST"
python3 - "$VER" "$DEST" <<'PY'
import hashlib, json, os, shutil, sys, datetime
ver, dest = sys.argv[1], sys.argv[2]
names = {"mac": f"KB-Align-{ver}-mac.pkg", "windows": f"KB-Align-{ver}-windows.zip", "source": f"KB-Align-{ver}-kaynak.zip"}
files = {}
for key, name in names.items():
    src = os.path.join("dist", name)
    if not os.path.exists(src):
        print(f"yok (kartta 'Yakında'): {src}")
        continue
    shutil.copy2(src, os.path.join(dest, name))
    h = hashlib.sha256(open(src, "rb").read()).hexdigest()
    files[key] = {"file": name, "size": os.path.getsize(src), "sha256": h}
    print(f"kopyalandı: {name}  {h[:16]}…")
man = {"version": ver, "date": datetime.date.today().isoformat(), "files": files}
json.dump(man, open(os.path.join(dest, "surum.json"), "w"), indent=1)
print("yazıldı:", os.path.join(dest, "surum.json"))
PY
