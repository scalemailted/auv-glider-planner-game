# THREE-R2A Replay Review Visual Acceptance

Human manual QA by the project owner remains pending until the replay screenshot package and owner checklist are reviewed.

## Owner Checklist

- Load `docs/examples/headless_replay_public.example.json` through the Headless Bundle Viewer.
- Open Three Replay Review.
- Confirm the Three canvas mounts and shows the mission world, route, replay glider pose, realized trajectory, observations, and surfacing/terrain markers when available.
- Step forward, step back, scrub the timeline, and jump to terminal checkpoint.
- Confirm the left panel reports replay mode `publicObservationPlayback` and integrity status.
- Confirm Play is enabled for the public fixture.
- Load `docs/examples/headless_replay_tampered_digest.example.json`.
- Open Three Replay Review and confirm integrity failure is visible, Play is disabled, and Step/Scrub do not crash.
- Confirm debug object `globalThis.ANCHOR_THREE_REPLAY_DEBUG` reports `usesHiddenTruthResimulation=false` and `changesOfficialBrowserScoring=false`.
- Confirm returning to the source scene disposes the Three canvas and does not leave duplicate `.three-mission-world-host` elements.

## Screenshot Package Target

Use `test-results/three-r2a-owner-review/` for manual screenshots and owner notes. Preserve `test-results/three-r1-2c-owner-review/` as the previous visual acceptance reference.

## Non-Goals

THREE-R2A is not a new planner, not replay physics, not official scoring, not hidden-truth resimulation, not terrain overhaul, and not editor parity.
