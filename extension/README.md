# 百一電子 表單流程 UX 增強 — Browser Extension

A cross-browser (Chrome + Firefox) Manifest V3 extension that layers a modern,
mobile-friendly UI over the legacy PESI HR 考勤表單流程 system at
`https://hr.pesi.com.tw`. It changes nothing on the server — it only enhances the
pages in your own browser, and every form reverts untouched if you disable it.

## What it does

| Form | ID | Enhancement |
|------|----|-------------|
| 請假申請 (leave) | SW0009 | Clean overlay: reordered leave-type dropdown, native date/time pickers, half-day presets, **live remaining-leave balance** |
| 公出／出差申請 (business trip) | SW0212 | Clean overlay (公出/出差 dropdown + native pickers + presets) |
| 補卡申請／忘打卡 (card correction) | SW0013 | Clean overlay (punch type + native date/time + reason) |
| 不加班說明申請 (no-OT explanation) | SW0405 | Sensible default date range + native pickers + auto-loads the days needing an explanation |
| 加班申請 (overtime) | SW0005 | Native date/time pickers on the overtime-hours fields (type/date logic left native on purpose) |
| 請假申請單查詢 (leave query) | SW0037 | Default range widened to the last 6 months + auto-search |

## Toolbar button

Clicking the extension's toolbar icon opens the **出缺勤系統首頁**
(`Index.html`) in one click — focusing an existing `hr.pesi.com.tw` tab if one is
already open, otherwise opening a new tab. This adds a `host_permissions` entry
for `https://hr.pesi.com.tw/*`, so on install the browser will show a one-time
"access your data for hr.pesi.com.tw" prompt (the same host the content scripts
already run on).

## Files

```
extension/
  manifest.json    Manifest V3 (works in Chrome and Firefox)
  content.js       the whole enhancement (runs inside the form iframes)
  icons/           48px + 128px icons
  build.sh         packages dist/ zips for Chrome and Firefox
  README.md
```

## Install for development (no build needed)

**Chrome / Edge**
1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top-right)
3. Click **Load unpacked** and select this `extension/` folder
4. Open a PESI form — the enhanced UI appears

**Firefox**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `extension/manifest.json`
4. Open a PESI form (temporary add-ons are removed when Firefox restarts)

## Build distributable packages

```bash
cd extension
./build.sh
```

Produces:
- `dist/pesi-hr-chrome-<version>.zip` — upload to the Chrome Web Store, or share for “Load unpacked”.
- `dist/pesi-hr-firefox-<version>.zip` — sign/list on [addons.mozilla.org](https://addons.mozilla.org) (the Firefox manifest gets a `browser_specific_settings.gecko.id` injected, which AMO requires for a permanent install).

## How it works (for maintainers)

Each PESI form is a separate HTML page loaded in an `<iframe>`
(`/htmlworkflow/webflow_forms/<FORM>/<FORM>.html`). The content script is declared
with `"all_frames": true`, so it runs **inside** the form iframe and can read/write
the real legacy fields directly. It builds a clean UI and mirrors values back into
the original inputs, converting the browser date picker’s value into the system’s
Minguo (民國) `eee/mm/dd` format. Submitting hands off to the form’s own
`apply_button`, so the server-side workflow is unchanged.

The live leave balance is scraped from the parent dashboard’s rotating banner
(same-origin `window.top.document`).

## Notes / limitations

- **No real submission has been tested end-to-end.** Do one genuine submit per form
  to confirm the server accepts the values; if a date is rejected, adjust
  `gregToMinguo()` in `content.js`.
- The overlay type dropdowns show blank until first clicked (the underlying value is
  correct) — cosmetic.
- If the vendor (日城資訊) changes a form’s field IDs, that form’s enhancement may
  need updating; the others keep working independently.
- Adjust the `matches` list + `content.js` dispatch to cover more forms
  (e.g. the 簽核 approval screens or other 查詢 forms).
