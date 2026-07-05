# PESI HR UX Enhancer

Client-side UX improvements for the legacy 日城資訊 HR 考勤表單流程 system at
`https://hr.pesi.com.tw` — shipped as **both** a Tampermonkey userscript and a
Chrome/Firefox browser extension. No server access required; it enhances the pages
in the browser and reverts cleanly when disabled.

## Single source of truth — edit here

```
src/enhancer.js            ← THE code. Edit this.
src/header.userscript.txt  ← Tampermonkey banner (@version is templated)
src/header.content.txt     ← extension content-script header
sync.sh                    ← regenerates BOTH artifacts from src/ (run after editing)

pesi-leave-enhancer.user.js   ← GENERATED userscript  (do not edit)
extension/content.js          ← GENERATED content script (do not edit)
extension/manifest.json       ← MV3 manifest + the single version number
extension/build.sh            ← packages dist/ zips for Chrome + Firefox
extension/README.md           ← install instructions
```

## Workflow

1. Edit `src/enhancer.js` (and headers/manifest if needed).
2. Bump the version in `extension/manifest.json` (the one place it lives).
3. Run **`./sync.sh`** — regenerates `pesi-leave-enhancer.user.js` and
   `extension/content.js`, stamps the version, runs `node --check` on both, and
   asserts their shared body is byte-identical (fails loudly if it ever drifts).
4. Run **`cd extension && ./build.sh`** — repackages `dist/` zips for both browsers.

Never edit the two generated files directly — `sync.sh` will overwrite them. The
byte-identical guard in `sync.sh` guarantees the userscript and the extension can't
silently diverge.

## What it enhances

All five 考勤表單流程 application forms plus the leave-query screen:
請假 (SW0009, overlay + live balance), 加班 (SW0005, native pickers on the hours
fields), 公出/出差 (SW0212, overlay), 補卡/忘打卡 (SW0013, overlay),
不加班說明 (SW0405, default range + auto-load), 請假查詢 (SW0037, auto-widened range).

See `extension/README.md` for install/build details and known limitations.
