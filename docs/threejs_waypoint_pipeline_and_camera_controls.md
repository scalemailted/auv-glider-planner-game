# Three.js Waypoint Pipeline and Camera Controls

THREE-R1.1C repairs the visible waypoint command pipeline and adopts standard desktop 3D camera gestures. It keeps the active architecture unchanged: `index.html` loads `src/game/main.js`, Phaser owns scene lifecycle, Three.js owns the mission-world renderer/input surface, and the portable mission core plus `MissionWorkspaceScene` own planning, validation, simulation, and scoring.

## Manual Defects Found

Headed-browser reproduction after THREE-R1.1B confirmed deployment worked but the first route click after deployment did not create a waypoint. The first broken stage was the deployment-to-tool transition: accepted deployment called the one-shot completion path and reset the active tool to `selectInspect`. The next canvas click emitted a select/hover-style intent instead of `placeWaypoint`, so no canonical waypoint, route segment, right-panel row, or timeline tick appeared.

After repair, the manual workflow succeeded in a headed browser: select glider, click `Deploy / Change Start`, click a valid drop-zone cell, confirm Add Waypoint auto-arms, click successive valid mission cells, see canonical waypoints and Three route objects update, use pan/orbit/zoom, then place another waypoint with calibrated hit testing.

## Waypoint Command Pipeline

The intended command chain is:

```text
Visible Add Waypoint button
-> MissionWorkspaceScene.setPlanningTool('placeWaypoint')
-> MissionPlanningToolState activeToolId
-> ThreeMissionInteractionController interactionMode
-> left-click classification below threshold
-> ThreeMissionHitTest grid hit
-> placeWaypoint intent
-> MissionWorkspaceThreeInteractionBridge
-> MissionWorkspaceScene.placeWaypointFromThree
-> addWaypointForSelected
-> WaypointPlan.addWaypoint
-> afterPlanChanged / refreshPanels / refreshMap
-> Three waypoint and route layers
-> right waypoint panel and timeline
```

The bridge and Three modules do not push into `plan.agentPlans[].waypoints` directly.

## Single Tool-State Ownership

`MissionWorkspaceScene` is the active owner for planning tool state. The overlay, interaction controller, viewport badge, debug object, and Mission Console derive from scene-owned state. The invariant is:

```text
activePlanningToolId == scenePlanningToolId == visibleToolButtonId
interactionModeForTool(activePlanningToolId) == controllerInteractionMode
planningToolStateMismatches == []
```

Normal refresh operations must not reset `placeWaypoint`: renderer refresh, console render, right-panel render, timeline updates, resize, selected-agent refresh, accepted waypoint refresh, and camera changes all preserve the active tool.

## Deployment-To-Waypoint Transition

Accepted deployment now uses a documented workflow transition:

- Empty selected route: auto-arm `Add Waypoint` and show `Glider 01 deployed. Click the mission plane to add its first waypoint.`
- Existing selected route: return to `Select / Edit` and show `Start changed. Existing route has been revalidated.`

The selected agent and selected start remain canonical state, not a renderer clone.

## Canonical Command Ownership

Waypoint placement still goes through `addWaypointForSelected`, which applies deployment requirements, placement guards, waypoint-cell validity, timing estimates, route preview/anchor updates, marker absorption, selection state, and panel refresh. Three.js only emits a renderer-neutral intent.

## Visible Rejection Handling

Failed placement records a visible pipeline reason and leaves the plan unchanged. Required debug fields include:

- `lastWaypointPipelineStage`
- `lastWaypointPipelineStatus`
- `lastWaypointPipelineReason`
- `lastWaypointCandidateCell`
- `lastWaypointHitWorldPoint`
- `lastWaypointIntent`
- `lastWaypointBridgeResult`
- `lastWaypointValidation`
- `lastWaypointCommandResult`

Common rejected states are no grid hit, no selected glider, undeployed glider, terrain/blocked cell, route constraint failure, invalid temporal ordering, unreachable segment, camera gesture suppression, and canonical command failure.

## Mouse Gesture Convention

R1.1C standard mapping:

```text
Left click below 5 px movement: active planning/select action
Left drag above 5 px movement: pan camera
Right drag: orbit camera yaw and pitch
Wheel: zoom/dolly
Middle drag: dolly, without mission-state mutation
```

The canvas context menu is prevented only on the Three mission canvas.

## Left Click Versus Left Drag

The interaction controller stores pointer-down/up client coordinates, total movement in CSS pixels, camera movement state, pointer capture state, and a gesture classification. A mission click fires only when movement stays within the threshold and no camera gesture or waypoint drag is active. Left drag records `pointerGestureClassification: 'pan'` and `missionClickSuppressedReason: 'panGesture'`.

## Right-Drag Multi-Axis Orbit

Right drag changes camera azimuth from horizontal motion and polar angle from vertical motion. Diagonal right drag must produce nonzero `cameraAzimuthDelta` and `cameraPolarDelta`. Orbit changes the camera around its target; it does not rotate the world group as a substitute.

## Pan Behavior

Left drag moves the camera position and controller target together, clamps the target to padded mission-world bounds, and works in Add Waypoint and deployment modes. Debug fields include `cameraTargetBeforeGesture`, `cameraTargetAfterGesture`, `cameraPanDelta`, and `cameraPanChangeCount`.

## Zoom Behavior

Wheel zoom is preserved. It changes camera distance, does not mutate mission state, and remains calibrated after pan/orbit. Min/max distance derive from mission bounds.

## Pointer Calibration After Camera Movement

Waypoint placement after pan, orbit, diagonal orbit, zoom, and reset uses the current camera matrices plus the shared mission coordinate transform. The invariant is expected projected cell -> browser click -> raycast hit -> canonical grid cell.

## Debug Transaction Fields

`ANCHOR_MISSION_RENDER_DEBUG` exposes tool state, deployment-to-route state, pointer gesture state, waypoint pipeline transaction details, canonical/Three/right-panel/timeline waypoint counts, camera mapping/deltas, and renderer boundary flags. Three reports `ownsPlanning: false`, `ownsSimulationState: false`, `ownsScoring: false`, `changesOfficialBrowserScoring: false`, `usesNewPlanner: false`, `usesRouteOptimizer: false`, and `exposesHiddenTruth: false`.

## Deferred Terrain/Depth-Slab Work

This phase does not start bathymetric terrain-surface planning, operational depth/control slabs, replay/debrief route review, editor parity, new planners, scoring changes, stochastic uncertainty, or route optimization. Those remain later phases after manual deployment and multi-waypoint placement are stable.
