PESI HR UI/UX Improver — Release v0.3.32

Date: 21 November 2025

Changes in this release:

- Fix: Prevent hiding datepicker/calendar UI — avoid masking calendar grid cells that caused empty calendar display (hotfix applied to `content.js`).
- Chore: Bumped extension version to `0.3.32`.
- Updated: Repacked extension ZIP for release.

Notes:
- The bug was caused by a heuristic that hid small decorative elements; we now skip elements inside known widget containers (classes/IDs containing "date", "picker", "calendar", "sact", or "ui-datepicker").
- Please test the calendar UI on the leave and business-trip forms after installing this release.

Assets:
- `pesi-hr-improver-v0.3.32.zip` — packaged extension for upload.

Contact: privacy@example.com (replace with real contact before publishing)
