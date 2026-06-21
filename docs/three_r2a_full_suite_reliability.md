# THREE-R2A.1 Full Suite Reliability

Grouped E2E uses `tools/js/run_playwright_groups.mjs` and `tools/js/playwright_groups.mjs`.

## Policy

- Group coverage must have zero unassigned tests and zero duplicate assignments.
- Groups run sequentially.
- Each group invokes Playwright with `--workers=1` so WebGL-heavy replay, terrain, and owner-acceptance flows do not overlap in one browser process.
- Each group prints selected test count, duration, result, and port-free status.
- Failure returns nonzero.
- Port `9321` is checked before and after each group; unrelated processes are not killed.

## Timeout Root Cause

The previous grouped timeout occurred in the visual-acceptance group, where long owner-facing headed workflows were grouped with ordinary E2E authority. A timeout is not treated as a pass.

THREE-R2A.1 keeps behavioral replay assertions in the normal `threeReplayReview` group and adds `tests/e2e/three_r2a_headed_acceptance.spec.js` for the screenshot-producing owner-review package. The headed workflow can run headless inside grouped coverage, but its authoritative owner artifact run remains the dedicated headed command.

## Replay Boundaries

Replay consumes canonical public events and checkpoints. It does not rerun mission physics, recompute official scoring, include hidden truth, or make Three.js authoritative for replay semantics. Reverse navigation restores a checkpoint and reduces forward; camera and display state do not affect replay digests.
