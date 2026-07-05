#!/usr/bin/env bash
# Build distributable zips for Chrome and Firefox from the shared source.
#
# Chrome:  uses manifest.json as-is.
# Firefox: injects browser_specific_settings.gecko.id (required to sign/list a
#          *permanent* Firefox add-on on addons.mozilla.org). Not needed for a
#          temporary load via about:debugging.
set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
OUT="dist"
rm -rf "$OUT"; mkdir -p "$OUT/chrome/icons" "$OUT/firefox/icons"

# ---- Chrome package ----
cp manifest.json content.js background.js "$OUT/chrome/"
cp icons/icon48.png icons/icon128.png "$OUT/chrome/icons/"
( cd "$OUT/chrome" && zip -qr "../pesi-hr-chrome-$VERSION.zip" . )

# ---- Firefox package (gecko id + event-page background) ----
python3 - <<'PY'
import json
m = json.load(open("manifest.json"))
m["browser_specific_settings"] = {
    "gecko": {"id": "pesi-hr-enhancer@pesi.local", "strict_min_version": "115.0"}
}
# Firefox MV3 uses an event-page background (scripts), not a service worker.
if "background" in m and "service_worker" in m["background"]:
    m["background"] = {"scripts": [m["background"]["service_worker"]]}
json.dump(m, open("dist/firefox/manifest.json", "w"), ensure_ascii=False, indent=2)
PY
cp content.js background.js "$OUT/firefox/"
cp icons/icon48.png icons/icon128.png "$OUT/firefox/icons/"
( cd "$OUT/firefox" && zip -qr "../pesi-hr-firefox-$VERSION.zip" . )

echo "Built:"
echo "  $OUT/pesi-hr-chrome-$VERSION.zip   (+ unpacked $OUT/chrome/)"
echo "  $OUT/pesi-hr-firefox-$VERSION.zip  (+ unpacked $OUT/firefox/)"
