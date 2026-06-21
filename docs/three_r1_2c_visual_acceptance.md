# THREE-R1.2C Visual Acceptance

Phase: THREE-R1.2C.3 Full Headed Production Walkthrough

This document records the headed Chromium owner-review package for the completed THREE-R1.2C terrain/bathymetry production stack. The automated walkthrough uses the production `index.html` entry path, visible UI controls, pointer placement, camera gestures, lifecycle transitions, and the current Three.js mission renderer.

Human manual QA has not been performed by Codex. Owner review boxes are intentionally unchecked.

## Artifact Package

- QA summary: `test-results/three-r1-2c-owner-review/qa-summary.json`
- Screenshot directory: `test-results/three-r1-2c-owner-review/`
- Primary viewport: 1920 x 1080
- Compact viewport: 1366 x 768
- Browser: Chromium 148.0.7778.96
- Device pixel ratio: 1
- Effective pixel ratio: 1

## Automated Run Result

| Gate | Result | Evidence |
| --- | --- | --- |
| Product Hub | PASS | `01-product-hub.png` |
| Scenario Start / generated challenge state | PASS | `02-scenario-start-terrain.png` |
| Two-glider deployment | PASS | visible deployment controls |
| Invalid placement preview | PASS | `03-invalid-land-placement-preview.png` |
| Valid continuous route | PASS | `04-valid-continuous-route.png` |
| Land-crossing hard error | PASS | `05-land-crossing-hard-error.png` |
| Near-shore warning preview | PASS | `06-near-shore-warning.png` |
| Sampling target over basin | PASS | `07-deep-target-over-basin.png` |
| Mission readiness | PASS | `08-mission-readiness.png` |
| Focused terrain issue | PASS | `09-focused-terrain-issue.png` |
| Side-profile predicted dive | PASS | `10-side-profile-predicted-dive.png` |
| Live multi-yo descent | PASS | `11-live-multi-yo-descent.png` |
| Live simulation progress / observation view | PASS | `12-actual-observation-at-depth.png` |
| Live terrain clearance | PASS | `13-live-terrain-clearance.png` |
| Terrain-aware debrief | PASS | `14-terrain-aware-debrief.png` |
| Main Menu cleanup | PASS | `15-main-menu-cleanup.png` |
| Bathymetric World View | PASS | `16-bathymetric-world-view.png` |
| Compact desktop layout | PASS | `17-compact-desktop-layout.png` |

## QA Summary Metrics

| Metric | Value |
| --- | ---: |
| Average frame time | 31.059 ms |
| p95 frame time | 66.7 ms |
| p99 frame time | 67 ms |
| Rendered FPS | 32.197 |
| Presentation CPU average | 3.87 ms |
| Renderer submission average | 8.142 ms |
| GPU timing supported | true |
| GPU average | 3.298 ms |
| Active renderers during mission | 1 |
| Active RAF loops during mission | 1 |
| Render calls per presentation frame | 1 |
| Final terrain objects | 0 |
| Final issue objects | 0 |
| Final renderers | 0 |
| Final RAF loops | 0 |
| Page errors | 0 |
| Console errors | 0 |
| Failed requests | 0 |

## Scenario And Mission Evidence

- Mission: `deterministic_challenge_mission`
- Terrain source digest: `fnv1a32:6b9b4b63`
- Terrain mesh digest: `fnv1a32:3cd16973`
- Plan digest: `fnv1a32:53578890`
- Launch validation digest: `fnv1a32:8841a403`
- Result digest: `fnv1a32:74cd07d7`
- Replay digest: `fnv1a32:5465b825`
- Launch status: `VALID_WITH_WARNINGS`
- Terrain event count: 6
- Terrain events supported: true

## Owner Review Checklist

- [ ] Product Hub layout is acceptable.
- [ ] Scenario/generation state communicates the active mission clearly.
- [ ] Planning view makes terrain, water column, vehicles, routes, hazards, and targets visually understandable.
- [ ] Invalid placement and land-crossing errors are clear enough for users.
- [ ] Near-shore warning state is clear enough for users.
- [ ] Dive planning view communicates predicted multi-yo behavior.
- [ ] Live simulation view communicates realized motion and terrain clearance.
- [ ] Debrief presents enough terrain-aware and mission-result information.
- [ ] Main Menu cleanup shows no stale Three.js scene artifacts.
- [ ] Bathymetric World View is acceptable as an adjacent product view.
- [ ] Compact desktop layout is acceptable at 1366 x 768.

## Notes

The current generated challenge flow enters Planning Console directly after Generate, so the `02-scenario-start-terrain.png` screenshot records the post-generation scenario state in the active planning workspace rather than a separate intermediate Scenario Start page.

The automated walkthrough validates production readiness for THREE-R2 entry from the browser/runtime side. It does not replace human visual acceptance of the screenshots above.