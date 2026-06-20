# Three.js Dive Planning UX and Performance Audit

Phase: THREE-R1.2A.4.1.

## Findings

The planning model needed clearer surface-waypoint versus sampling-target semantics, wider camera pitch freedom, stronger selected-dive visibility, and runtime checks that camera movement does not mutate canonical mission state.

Observed/targeted issues:

- Camera polar range had to support near top-down, oblique, and near-side profile views without flipping below the seabed.
- Predicted dive paths were hard to see against slabs because translucent layer depth testing and render order could visually occlude selected paths.
- Sampling targets were not available as first-class non-executable science objectives in the planning UI.
- Vertical exaggeration needed to be presentation-only and persistent through the water-column UI normalizer.
- Hover/camera movement needed to avoid unnecessary canonical route, panel, texture, and prediction mutation.

## Changes Verified

- Camera debug exposes min/max/current polar angle and clamp reason.
- `Dive Planning View`, `Oblique Dive`, and `Side Profile` controls are visible.
- Selected planned dive paths use stronger opacity, disabled depth test/write where needed, and higher render order.
- Sampling targets render through `ThreeSamplingTargetLayer` with stable object IDs and no scoring authority.
- Vertical exaggeration is stored in UI state, changes display Y only, and leaves plan/result canonical digests unchanged.
- Focused E2E verifies camera pitch movement, route/target semantic separation, and resource stability.

## Performance Boundary

Performance acceptance is invariant-based, not one machine-specific FPS claim. The renderer should keep one Three renderer, one RAF, stable resource counts under repeated controls, no canonical plan changes during camera movement, and no score or simulation authority in Three.js.

No before/after FPS improvement is claimed from this audit-only pass.