# THREE-R2A.1 E2E Coverage Audit

THREE-R2A.1 closes replay review coverage with browser E2E tests in `tests/e2e/three_r2a_replay_review.spec.js`. Node smoke tests remain supporting coverage only; they are not counted as browser E2E coverage.

| Requested workflow | Existing test | Fully covered | Missing assertions |
| ------------------ | ------------- | ------------: | ------------------ |
| Debrief opens canonical replay review | `Three Debrief Opens Canonical Replay Review` | Yes | None known after fixture-backed debrief seeding. |
| Play, pause, step, event, checkpoint, start/end, rate controls | `Three Replay Play Pause Step and Checkpoint Navigation` | Yes | None known. |
| Scrub reconstructs public state deterministically | `Three Replay Scrub Reconstructs Public State Deterministically` | Yes | Visual-quality changes are represented by replay display/camera controls; no replay quality selector exists. |
| Planned, predicted, expected, and realized paths are distinct | `Three Replay Distinguishes Planned Predicted and Realized Paths` | Yes | Expected current-affected path is asserted when available. |
| Terrain events and depth observations replay correctly | `Three Replay Shows Terrain Events and Depth Observations` | Yes | None known for the R2A acceptance fixture. |
| Multi-agent selection preserves cursor and digest | `Three Replay Supports Multi-Agent Selection` | Yes | None known. |
| Tampered checkpoint digest is safely rejected | `Three Replay Rejects Tampered Checkpoint Digest` | Yes | None known. |
| Replay resources dispose across transitions | `Three Replay Resources Dispose Across Scene Transitions` | Yes | None known. |
| Browser and headless replay share reducer semantics | `Browser and Headless Replay Share Reducer Semantics` | Yes | None known; reducer comparison imports core replay/rendering modules only. |

The exact titles are assigned to the `threeReplayReview` Playwright group in `tools/js/playwright_groups.mjs`.
