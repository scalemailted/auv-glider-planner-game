# Application Boot Performance

Measured for FLOW-PKG-R1.1 on Windows (`win32`), Node v24.9.0, local static server, headless Chromium through Playwright. These numbers are local CI-style evidence, not a claim about general end-user performance.

## Readiness Ceilings

| Stage | Ceiling |
| ----- | ------: |
| Static server ready | 15 s |
| Application ready | 20 s |
| Route transition after app ready | 10 s |

## Cold Boot Evidence

| Path | Runs | Success | Median | P90 | P95 | Max |
| ---- | ---: | ------: | -----: | --: | --: | --: |
| Repo root `/` | 10 | 10 | 1083.1 ms | 1346.0 ms | 1365.2 ms | 1365.2 ms |
| Pages subpath `/auv-glider-planner-game/` | 5 | 5 | 1089.5 ms | 1170.6 ms | 1170.6 ms | 1170.6 ms |
| Warm root sample | 3 | 3 | 1115.2 ms | 1169.9 ms | 1169.9 ms | 1169.9 ms |

## Request and Module Counts

| Metric | Value |
| ------ | ----: |
| JavaScript module request count | 245 |
| Package request count | 18 |
| Duplicate request count max, cold root | 1 |
| Failed request count | 0 |
| Package import duration sample | 31-37 ms |

## Duration Breakdown Example

Typical cold root milestone durations:

| Segment | Duration |
| ------- | -------: |
| index-ready to main-module-ready | 0.0-0.2 ms |
| main-module-ready to app-shell-ready | 908-1078 ms |
| app-shell-ready to phaser-game-ready | 41-237 ms |
| phaser-game-ready to main-menu-dom-ready | 106-141 ms |

The local acceptance target was root cold boot p95 <= 10 seconds and Pages cold boot p95 <= 12 seconds. The measured headless run passed both targets with zero failed boots.