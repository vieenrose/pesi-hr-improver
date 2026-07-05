#!/usr/bin/env bash
# Single source of truth = src/enhancer.js (+ the two header templates).
# Regenerates the Tampermonkey userscript and the extension content script so the
# two can never drift. Version comes from extension/manifest.json (the one place
# it lives). Run this after editing src/enhancer.js.
set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(python3 -c "import json;print(json.load(open('extension/manifest.json'))['version'])")

# 1) Tampermonkey userscript  = userscript header (version stamped) + enhancer
sed "s/__VERSION__/$VERSION/" src/header.userscript.txt > pesi-leave-enhancer.user.js
cat src/enhancer.js >> pesi-leave-enhancer.user.js

# 2) Extension content script  = content header + enhancer
cat src/header.content.txt src/enhancer.js > extension/content.js

# 3) Sanity checks
if command -v node >/dev/null 2>&1; then
  node --check pesi-leave-enhancer.user.js
  node --check extension/content.js
fi
# The shared body must be byte-identical in both outputs.
if ! diff <(awk 'f||/^\(function \(\) \{/{f=1;print}' pesi-leave-enhancer.user.js) \
          <(awk 'f||/^\(function \(\) \{/{f=1;print}' extension/content.js) >/dev/null; then
  echo "ERROR: shared body differs between the two outputs" >&2; exit 1
fi

echo "Synced v$VERSION:"
echo "  pesi-leave-enhancer.user.js"
echo "  extension/content.js"
echo "Next: cd extension && ./build.sh   (to repackage the zips)"
