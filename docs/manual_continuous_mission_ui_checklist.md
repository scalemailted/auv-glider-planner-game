# Manual Continuous Mission UI Checklist

Use this after automated checks pass. This is owner manual QA, not automated QA.

## Startup

- Scenario Start appears from a generated challenge.
- Start Planning enters Mission Planning.
- No console `ReferenceError` appears.
- Planning Console, Waypoint Timeline, and one Three mission canvas appear.

## Placement

- Select a glider.
- Deploy / Change Start works from the Planning Tools section.
- Free Placement creates fractional waypoint coordinates.
- Snap to Cell creates canonical cell coordinates.
- Snap to Feature works when a supported feature is available, or visibly falls back to supported anchors/cell centers.
- Fractional coordinates persist after panel refresh.

## Water Column

- Physical Depth and Exploded Layers both work.
- Show All and Isolate Active update visible layers.
- Active depth layer selection updates inspection/debug state.
- Smoothed Slices changes field rendering mode.
- Volumetric Cloud either renders through the current fallback or clearly reports the fallback.

## Dive Planning

- Dive profile selection updates the selected waypoint or selected glider plan metadata.
- Target layer selection updates target/depth metadata.
- Predicted trajectory updates before simulation.
- Execute starts Simulation.
- The glider descends/ascends under canonical dive execution.

## Cleanup

- Planning -> Main Menu removes mission canvas state.
- Simulation -> Main Menu removes simulation canvas state.
- Returning to Planning does not leave stale canvases or duplicate overlays.
- No console errors appear during the workflow.
