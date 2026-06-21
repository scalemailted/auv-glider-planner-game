# THREE-R2A Replay and Debrief Architecture Audit

THREE-R2A makes Three.js the canonical browser replay review surface for public replay playback and debrief route review. It does not add new physics, scoring, planning, terrain, or hidden-truth authority.

| Concern | Current canonical owner | Current browser consumer | Legacy rendering | Required R2A result |
| --- | --- | --- | --- | --- |
| Replay event/checkpoint contract | `src/core/replay/ReplaySchema.js`, `ReplayContractBuilder.js`, `ReplayIntegrityVerifier.js` | Headless Bundle Viewer, Node headless exports | DOM/Phaser text playback only | Three review consumes the same public REPLAY-R1 artifacts |
| Replay playback cursor | `src/core/replay/ReplayPlayback.js` and `ReplayPlaybackReducer.js` | Headless Bundle Viewer, Three Replay Review | Step/jump controls in bundle viewer | Reducer supports play, pause, step, checkpoint jump, event-index scrub |
| Public replay source loading | `src/core/replay/ReplayReviewLoader.js` | Debrief and Headless Bundle Viewer | Result export and bundle import were separate paths | Bundle and browser-result inputs normalize to one replay review source |
| Review session state | `src/core/replay/ReplayReviewSession.js` | Three Replay Review scene/controller | Scene-local state | Session carries integrity, warnings, controls, and timeline state |
| Three replay view model | `src/core/rendering/ReplayWorldRenderViewModel.js` | `ThreeMissionWorldRenderer` | Live planning/simulation view models only | Public replay state becomes renderer-neutral gliders, trajectories, observations, surfacing, and route-status events |
| Three renderer | `src/game/three/ThreeMissionWorldRenderer.js` | Mission planning, simulation, replay review | Phaser canvas/DOM overlays | Renderer remains rendering-only and accepts replay-world snapshots |
| Debrief replay action | `src/game/phaser/scenes/DebriefScene.js`, `src/ui/MissionConsole.js` | Player debrief | Export-only review path | Debrief can open Three Replay Review from current public result |
| Headless bundle replay action | `src/game/phaser/scenes/HeadlessBundleViewerScene.js`, `src/ui/headless/HeadlessBundleViewerPanel.js` | Bundle viewer | Replay controls without world view | Loaded replay bundle can open Three Replay Review |
| Tamper handling | `ReplayIntegrityVerifier.js` | Replay Review controls and warnings | Text warning in bundle viewer | Integrity failures disable trusted Play and remain inspectable without crashing |
| Owner/debug visibility | `ANCHOR_THREE_REPLAY_DEBUG` | E2E, manual review, owner acceptance | `ANCHOR_HEADLESS_BUNDLE_DEBUG` only | Debug exposes mounted state, replay mode, integrity, timeline, renderer, lifecycle, and boundary flags |

## Findings

1. The existing H4/H4.1 replay contract is the correct source of truth for replay artifacts. THREE-R2A should not create another replay schema.
2. Debrief previously had no world-review path. It exported result artifacts but did not offer a replayable Three scene.
3. The Headless Bundle Viewer already had public replay controls and integrity reporting, but review was DOM/Phaser text only.
4. Route/ghost/path visualization should stay in shared render view models and `ThreeMissionWorldRenderer` layers, not in Debrief-specific drawing code.
5. Scores remain loaded/shadowed values. The replay review scene does not recompute or alter official browser scoring.
6. Public versus authoritative labels are preserved. Public replay review uses `publicObservationPlayback`; hidden-truth resimulation remains disabled.
7. Multi-agent replay remains supported through public `agentStates`/`vehicles` in the REPLAY-R1 state contract.
8. Terrain events remain public route-status/review diagnostics. The renderer does not create terrain validation authority.
9. Browser-result review is explicitly marked as reconstructed public playback. It is useful for debrief inspection, not a headless digest-authoritative replay.
10. No hidden truth should appear in public replay source, session, or view model artifacts.
11. Renderer resources are owned by `MissionReplayReviewScene` and released through the existing Three lifecycle/dispose path.

## Boundary Summary

THREE-R2A is a browser replay review layer. It consumes public replay/result data, maps it into renderer-neutral view models, and renders it through the existing Three mission renderer. It does not rerun simulation, compute vehicle motion, generate observations, mutate plans, optimize routes, use hidden truth, change scoring, or introduce a planner.
