# Repository Cleanup

## Before/After Metrics

| Metric | Before | After | Change |
|---|---:|---:|---:|
| tracked files | 1765 | 1765 | 0 |
| source files | 569 | 569 | 0 |
| Phaser files | 43 | 43 | 0 |
| Three files | 42 | 42 | 0 |
| docs files | 255 | 258 | 3 |
| Node smoke/audit scripts | 818 | 818 | 0 |
| Playwright tests | 76 | 48 | -28 |
| browser smoke duration | 0 | 0 | 0 |
| Pages file count | 684 | 684 | 0 |

## Deleted Source

R1 deletion candidates are limited to high-confidence generated or historical-only files in `tools/maintenance/repo_declutter_manifest.json`.

## Phaser Disposition

- Active shell retained: `vendor/phaser.min.js`, npm `phaser`, `PhaserProductionBootstrap`, `PhaserGame`, and active scene routing.
- Three.js mission/world rendering retained inside the default Phaser lifecycle shell.
- Final Phaser dependency removal is deferred.

## Test Portfolio

- Fast gate: `npm run test:fast`.
- Browser smoke gate: `npm run test:e2e:smoke` (15 selected tests).
- Release browser gate: `npm run test:e2e` (48 selected tests).
- Visual acceptance: `npm run test:e2e:visual` (12 selected tests).
- Full bounded nonvisual browser profile: `npm run test:e2e:full` (76 selected tests).

## Deferred Review

- Medium/low-confidence source, compatibility forwarders, and phase-specific docs are retained until a follow-up can merge their lasting decisions into canonical docs.
