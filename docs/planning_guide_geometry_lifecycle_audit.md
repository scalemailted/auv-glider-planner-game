# Planning Guide Geometry Lifecycle Audit

Phase: WORLD-R1.1

## Line And Layer Classification

| Visible line type | Owning layer/source | Canonical state? | R1.1 action |
|---|---|---:|---|
| Canonical committed route | `src/game/three/layers/ThreeRouteLayer.js` | Yes | Leave stable; route lines are derived from committed plan waypoints. |
| Predicted dive / planned depth path | `src/game/three/layers/ThreePlannedDiveTrajectoryLayer.js` and dive view models | No canonical route mutation | Keep distinct from surface-route preview. |
| Current-affected prediction | Simulation/prediction overlays, not waypoint commit state | No | Keep diagnostic only; not exported as plan. |
| Guidance cone | `src/game/three/layers/ThreeGuidanceConeLayer.js` or interaction view model guidance polygon | No | Keep as transient guidance. |
| Candidate waypoint preview | `src/game/three/layers/ThreePlanningInteractionLayer.js` from `routePreview` | No | Replaced with one stable reusable preview segment. |
| Sampling-target attachment | Sampling target layers and target selection view models | Target metadata only | Not part of waypoint preview lifecycle. |
| Selection highlight | `ThreePlanningInteractionLayer` cell rings and entity layers | No | Rebuilt per view update; not route preview. |
| Stale/unknown guide fan | Old preview objects in the planning interaction layer plus stale scene `routePreview` state | No | Fixed by clearing/reanchoring preview state and reusing one preview object. |

## Root Cause

The stale guide fan came from candidate waypoint preview geometry being treated like ordinary transient overlay geometry while scene state could keep an old `routePreview` after waypoint commit, glider change, tool change, or cancellation. Repeated hover/commit cycles could leave visual guide lines that no longer represented the newest executable route endpoint.

## R1.1 Contract

`src/core/rendering/PlanningGuidePreviewViewModel.js` is renderer-neutral. It resolves the preview origin from the selected glider's latest executable route endpoint, or from the deployment start when the route is empty. It marks preview state as noncanonical with `previewOwnsPlan: false` and `previewIsExported: false`.

`src/game/three/layers/ThreePlanningInteractionLayer.js` now owns one stable preview group and one reusable preview line. Pointer movement updates geometry. Waypoint commit invalidates the old digest by rebuilding the model from the latest committed route endpoint. Tool cancellation, glider switches, scene clear, and disposal clear preview state.

Debug surface: `globalThis.ANCHOR_PLANNING_GUIDE_DEBUG` reports preview segment count, object create/reuse/dispose counts, stale segment count, and boundary flags.