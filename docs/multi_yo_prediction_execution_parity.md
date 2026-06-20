# Multi-Yo Prediction and Execution Parity

Multi-yo dive behavior is canonical mission-core behavior. Three.js may render planned and realized paths, but it does not own prediction or execution.

## Contract

- The planned dive segment view model predicts feasible cycle count, bottom turns, layer crossings, and expected samples.
- The glider dive state machine executes the same canonical cycle sequence during Simulation.
- Feasible cycles execute; truncated cycles report the limiting reason.
- Predicted samples never earn score.
- Actual observations are authoritative and occur at actual x/y/depth/time.
- Current drift may make realized path diverge from prediction; that is valid and visible.

## Validation

- `tools/js/smoke_multi_yo_execution_parity.mjs`
- `tools/js/audit_multi_yo_prediction_execution_boundaries.mjs`
- `tools/js/smoke_multi_yo_predicted_trajectory.mjs`
- `tools/js/smoke_planning_simulation_dive_model_parity.mjs`
- focused E2E: `Predicted Multi-Yo Profile Executes Through Canonical Simulation`

This is an educational kinematics model, not an operationally calibrated glider model.

## THREE-R1.2A.4.2 Performance Closure

Three.js mission runtime performance is now measured through globalThis.ANCHOR_THREE_PERFORMANCE_DEBUG, focused smoke scripts, and focused Playwright performance/usability tests. Performance quality profiles are presentation-only. Surface waypoints remain executable navigation/surfacing anchors; sampling targets remain non-executable science objectives; multi-yo execution remains canonical core behavior. Human manual QA by the project owner remains pending.

## THREE-R1.2A.4.3

Simulation presentation now uses a scheduler/dirty-category pipeline. Canonical simulation stepping is independent of browser rendering cadence; presentation requests may be coalesced, but canonical events may not be dropped. Grouped Playwright execution is formalized through `tools/js/run_playwright_groups.mjs` plus exact coverage audit.
