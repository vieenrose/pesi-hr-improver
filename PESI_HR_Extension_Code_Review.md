# PESI HR Extension — Code Review

## What the extension does
- Manifest v3 extension targeting `https://hr.pesi.com.tw/*`; injects content script (`content.js` + `styles.css`) across frames and a popup (`popup.html`/`popup.js`) for credential storage and quick login.
- Content script detects leave (SW0029) and trip (SW0210/0212) forms, injects quick date/time controls, smart chips backed by local history, duration calculator, history table coloring, basic template saver, and auto-login using locally stored username/password. Attendance scan searches table rows for abnormal keywords and saves highlights to `chrome.storage.local`.
- Popup shows stored creds, one-click login launcher, and a notification card that now requests scans from the content script.

## Key findings (ordered by risk)
- **Monolithic content script (~1200 LoC) with duplicated helpers**: Hard to reason about, duplicate analyzer logic, no single registry; risk of regressions when adding features.
- **Initialization fragility**: Previously relied on timeouts/click listeners only; now has a MutationObserver, but listeners can still accumulate across long sessions; features lack per-feature idempotent guards.
- **Auto-login guardrails are minimal**: Only checks for password field; newly added URL hint helps but still no explicit login-page assertion. Could autofill on unexpected pages with password inputs.
- **Attendance scanning breadth**: Runs across all frames, iterates all `tr` elements; without throttling this can be heavy on large pages. Cooldown added but parsing still DOM-wide.
- **Popup error/edge handling light**: Limited feedback when messaging or storage fails; no validation of empty creds; no user-facing toggle for features/keywords.
- **Testing/tooling absence**: No lint/format; no automated tests except new parser harness; difficult to add features safely.

## Remediations already applied
- Added domain guard, debounced MutationObserver to re-run enhancements after partial postbacks, and a cooldown for attendance scans.
- Added shared `attendanceParser.js` (UMD) reused by content script and popup; popup now requests scans via messaging instead of ad-hoc injected scraper.
- Added URL hint to skip auto-login on non-login pages and a small Node test (`tests/attendanceParser.test.js`) for the parser.

## Recommended next steps
1) **Modularize content logic**: Split into modules (`init/registry`, `autoLogin`, `attendanceScan`, `leaveEnhancer`, `tripEnhancer`, `templates`, `domHelpers`). Each feature exposes `setup()` and internal guards; registry re-applies via observer without duplicating listeners. (Registry + core feature modules added; legacy in `content.js` to be trimmed next.)
2) **Strengthen auto-login safety**: Restrict to explicit login URLs/selectors, require user opt-in toggle in popup, and surface clear status/errors in the popup. (User toggle added; stricter URL guard added; popup validation now blocks empty creds; richer status still pending.)
3) **Attendance scan efficiency**: Scope to main/visible frames, debounce on mutations, and consider limiting to specific pages; keep parser unit tests and expand cases (ROC years, malformed rows).
4) **Popup UX/settings**: Add small settings block (feature toggles, keyword list), validation for empty creds, and clearer error states when messaging fails. (Extra-UI toggle added; validation/error hints added.)
5) **Tooling**: Add ESLint + Prettier, simple npm scripts, and a minimal CI check; consider a local manual test checklist for HR flows (leave/trip/attendance/login).

## Suggested implementation slices
- Slice 1: Introduce feature registry and move attendance + login into modules using the registry; keep APIs unchanged for now.
- Slice 2: Add popup settings/validation and opt-in toggles for auto-login + attendance scan; wire storage flags to features.
- Slice 3: Expand parser tests and add lint/prettier config; document manual test checklist in `README.md`.
