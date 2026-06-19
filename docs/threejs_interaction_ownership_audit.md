# Three.js Interaction Ownership Audit

THREE-R1 audits the reverted baseline where Phaser owns lifecycle and Three.js owns the normal mission-world surface. The renderer emits interaction intents only; canonical scene/core modules validate and mutate state.

## Pointer ownership findings

- Current event owner for the mission world is the Three.js canvas when `activeBackend` is `threeMission3d`.
- `.three-mission-world-host` sits above the Phaser canvas and has `pointer-events: auto`.
- `.three-mission-world-canvas` has `touch-action: none` and explicit `pointer-events: auto`.
- `#ui-root` is passive with `pointer-events: none`; actual panels and modals opt back in with `pointer-events: auto`.
- `MissionWorkspaceScene.onPointerDown`, `onPointerMove`, and `onPointerUp` return immediately when the Three backend is active.
- Runtime debug reports `pointerOwner`, `lastPointerConsumer`, `threeCanvasPointerEvents`, `phaserWorldInputEnabled`, `duplicatePointerDispatchCount`, renderer lifecycle/error state, canvas CSS/backing sizes, and pointer calibration diagnostics.

## Interaction inventory

| Interaction | Current event owner | Canonical command | Current result | Required fix |
|---|---|---|---|---|
| Hover mission cell | Three canvas | `handleThreeHoverIntent` / planning interaction view model | Connected to public hover state | Richer public hover copy can be polished later |
| Select glider | Three canvas | `selectGliderFromThree` | Connected; updates selected agent and panels | None in THREE-R1 |
| Select deployment/drop-zone cell | Three canvas | `selectDeploymentCellFromThree` via `selectDeploymentCell` intent and canonical selected-start helpers | Connected; deployment start does not become waypoint | More generated-shape visual QA remains useful |
| Place waypoint | Three canvas | `placeWaypointFromThree` | Connected; canonical validation decides accepted/rejected | None in THREE-R1 |
| Select waypoint | Three canvas | `selectWaypointById` | Connected; no duplicate waypoint | None in THREE-R1 |
| Drag waypoint | Three canvas | `previewWaypointMoveFromThree` then `commitWaypointMoveFromThree` | Connected; canonical waypoint ID preserved | More visible ghost styling later |
| Delete waypoint | Three canvas keyboard intent | `deleteWaypointById` | Connected when selected and focus is not in an input | Optional context-menu polish later |
| Place/select planning marker | Three canvas | `placePlanningMarkerFromThree` / `deletePlanningMarkerFromThree` selection path | Connected; marker remains `executable:false` | None in THREE-R1 |
| Inspect Gold Star | Three canvas | `selectPriorityTargetFromThree` | Connected; no automatic waypoint | Optional explicit plan-here affordance later |
| Camera orbit/pan/zoom | Three canvas | `cameraChanged` renderer-only intent | Connected; camera gestures do not edit plan | Advanced touch gestures later |
| Select live glider in Simulation | Three canvas | `selectSimulationAgentFromThree` | Connected; updates selected agent/panels | Follow-camera polish later |
| Inspect observation/sample | Three canvas | `selectSimulationObservationFromThree` | Connected to public event summary | Richer inspector panel later |
| Inspect surfacing event | Three canvas | `selectSimulationSurfacingEventFromThree` | Connected to public event summary | Richer transmission summary later |
| Inspect realized/planned segment | Three canvas | `selectSimulationRouteSegmentFromThree` | Connected to public route/trajectory summary | Segment metric expansion later |
| Inspect route failure | Three canvas | `selectSimulationRouteFailureFromThree` | Connected to canonical failure event summary | Additional failure detail layout later |

## Root cause addressed

The restored baseline already had most GFX-R3B planning wiring, but simulation selection was still renderer-only display. THREE-R1 adds simulation hit priorities, stable simulation object IDs, non-editable simulation interaction routing, and shared debug/test API projection so browser tests can click rendered Three objects directly. THREE-R1.1 fixes a Planning startup crash from an out-of-scope renderer reference, moves pointer conversion onto the actual Three canvas rect, and separates deployment selection from waypoint placement through a dedicated intent.

## Boundary assessment

- Three.js does not own mission state.
- Three.js does not own plan arrays.
- Three.js does not advance simulation time.
- Three.js does not compute vehicle motion, observations, scoring, replay semantics, route optimization, or hidden truth.
- Three.js uses one invisible horizontal interaction plane for logical grid selection; bathymetry remains visual geometry.
## THREE-R1.1C Note

The interaction owner remains ThreeMissionInteractionController for pointer classification and MissionWorkspaceScene for planning-tool state. R1.1C maps left click to the active planning action, left drag to pan, right drag to orbit, and wheel to zoom while preserving canonical command ownership for deployment and waypoints.
