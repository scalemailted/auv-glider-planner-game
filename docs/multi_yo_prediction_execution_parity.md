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