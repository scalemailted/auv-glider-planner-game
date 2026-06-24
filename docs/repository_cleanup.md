# Repository Cleanup

## Before/After Metrics

| Metric | Before | After | Change |
|---|---:|---:|---:|
| tracked files | 1782 | 1765 | -17 |
| source files | 569 | 551 | -18 |
| Phaser files | 43 | 43 | 0 |
| Three files | 42 | 42 | 0 |
| docs files | 253 | 256 | 3 |
| Node smoke/audit scripts | 818 | 818 | 0 |
| Playwright tests | 229 | 58 | -171 |
| browser smoke duration | n/a | 2.7m | new tier |
| default E2E duration | 47m | 16.4m | -30.6m |
| Pages file count | 878 | 881 | +3 |
| Pages size | 28,043,619 bytes | 28,225,773 bytes | +182,154 bytes |


## Validation Measurements

- `npm run test:fast`: passed in about 73 seconds.
- `npm run test:e2e:smoke`: passed 15 selected browser tests in about 2.7 minutes.
- `npm run test:e2e`: passed 58 selected browser tests in about 16.4 minutes.
- `npm run build:pages`: passed; `_site` contains 881 files and 28,225,773 bytes.
- `npm run smoke:pages`: passed against the Pages subpath and confirmed the next runtime loads without Phaser.

The release E2E profile is materially shorter than the previous full 229-test grouped run, but it remains slightly above the 15-minute target. The remaining cost is concentrated in monolithic `tests/e2e/smoke.spec.js` workflows and should be addressed in REPO-CLEAN-R2 by converting pure assertions to Node tests and splitting reusable browser setup.

## Deleted Source

R1 deletion candidates are limited to high-confidence generated or historical-only files in `tools/maintenance/repo_declutter_manifest.json`.

## Phaser Disposition

- Active shell retained: `vendor/phaser.min.js`, npm `phaser`, `PhaserProductionBootstrap`, `PhaserGame`, and active scene routing.
- Three.js mission/world rendering retained inside the default Phaser lifecycle shell.
- Final Phaser dependency removal is deferred.

## Test Portfolio

- Fast gate: `npm run test:fast`.
- Browser smoke gate: `npm run test:e2e:smoke` (15 selected tests).
- Release browser gate: `npm run test:e2e` (58 selected tests).
- Visual acceptance: `npm run test:e2e:visual` (12 selected tests).
- Full historical browser matrix: `npm run test:e2e:full` (229 selected tests).

## Deferred Review

- Medium/low-confidence source, compatibility forwarders, and phase-specific docs are retained until a follow-up can merge their lasting decisions into canonical docs.
