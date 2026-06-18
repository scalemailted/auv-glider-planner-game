# Three.js Mission Renderer Migration

GFX-R3A connected a Three.js mission-world renderer to the live Mission Planning workspace. GFX-R3B adds planning interaction parity by treating Three.js as an interaction surface over canonical Mission Workspace commands. Phaser remains the app shell, default/fallback tactical renderer, simulator scene owner, replay/debrief owner, and official browser scoring path. The Three renderer consumes a public-safe `MissionWorldRenderViewModel` built from the same mission state used by the legacy tactical map.

Renderer switching and Three.js interactions must not mutate plans except through canonical workspace commands, change simulation state, change scoring, change replay semantics, expose hidden truth, or create solver data. Waypoint placement remains 2.5D: the pointer selects a horizontal grid cell, while depth, action, and dive-profile semantics come from existing planning controls.

## Parity Inventory

| Artifact | Canonical source of truth | Legacy Phaser owner | Three.js target layer | Planning status | Simulation status | Replay status | Interaction status | Deferred behavior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Terrain / land mask | `level.layers.terrain` | tactical map terrain cells | `constraintGroup` and interaction surface | Connected | Connected as display | Context only | Direct hit testing rejects blocked cells | Visual QA polish |
| Bathymetry / depth layers | `level.layers.depth`, water-column metadata | bathymetry views and planning metadata | `bathymetryGroup`, `depthLayerGroup` | Connected as context | Display only | Context only | 2.5D horizontal selection only | Full 3D planning is out of scope |
| Current vectors `F(x,y,t)` | shared current sampler / active frame | current arrow overlay | `currentVectorGroup` | Connected | Display only in planning | Context only | Hover shows public current context when available | Simulation-time parity in GFX-R3C |
| ROI / scalar heatmap | visible sample/forecast/belief frame | ROI/scalar cell fills | `scalarFieldGroup` | Connected | Display only in planning | Context only | Hover shows public scalar context when available | Legend polish |
| Hazards / constraints | level hazards and route validators | hazard cells and route warnings | `hazardGroup`, `constraintGroup` | Connected | Display only in planning | Context only | Hit testing reports hazards and rejects blocked terrain | Runtime hazard playback in GFX-R3C |
| Drop zones / selected starts | deployment helpers | deployment zone interaction | `dropZoneGroup` | Connected | Context only | Context only | Inspection and deployment-start selection only where legacy rules allow | No post-launch redeploy |
| Gliders | mission agents and selected-agent state | glider sprites and HUD | `gliderGroup` | Connected | Planning pose only | Context only | Direct select through canonical selected-agent path | Simulation pose parity in GFX-R3C |
| Waypoints | `plan.agentPlans[].waypoints` | waypoint markers, route line, timeline | `waypointGroup`, `routeGroup` | Connected | Planned route only | Context only | Direct select/place/move/delete through canonical commands | Segment details polish |
| Planning markers | `plan.planningMarkers` | marker glyphs and timeline hints | `markerGroup` | Connected | No execution role | Context only | Direct place/select/delete; markers stay non-executable | Marker conversion remains existing UI behavior only |
| Temporal Gold Stars | `level.layers.priorityTargets` | star overlay and timeline | `priorityTargetGroup` | Connected | Display only in planning | Context only | Direct inspect/select without adding waypoints | Expiry countdown polish |
| Guidance / reachability | existing guidance state and UI flags | guidance cone/reachable overlays | `guidanceGroup`, interaction overlay | Reused where canonical data exists | No | No | Overlay renders canonical data when present and warns when absent | No Three-only approximation |
| ETA / energy preview | existing route/cost estimates | HUD and route labels | interaction view-model metadata | Reused where available | Summary only | Summary only | Displayed only from canonical preview data | More detailed 3D labels later |
| Realized trajectory / observations | simulation engine and replay artifacts | Simulation/Debrief scenes | future realized/observation layers | No | Deferred | Deferred | No direct interaction | GFX-R3C / GFX-R3D |
| Replay route / replay observations | headless/browser replay artifacts | Headless Bundle Viewer and debrief panels | future replay layers | No | No | Deferred | No direct interaction | GFX-R3D / H4 alignment |
## Interaction-Parity Inventory

| Interaction | Legacy owner | Canonical command | Three input gesture | GFX-R3B status | Validation source | Deferred behavior |
| --- | --- | --- | --- | --- | --- | --- |
| hover playable cell | MissionWorkspaceScene hover state | `handleThreeHoverIntent` | pointer move | Connected | hit-test grid + public view model | Richer tooltip layout |
| hover blocked cell | terrain/waypoint validity helpers | `handleThreeHoverIntent` | pointer move | Connected | `isValidWaypointCell` / terrain metadata | None |
| inspect scalar value | planning hover inspection | hover/interaction view model | pointer move/click | Partial | visible scalar layer only | Expanded hover card |
| inspect current vector | planning hover inspection | hover/interaction view model | pointer move/click | Partial | visible current layer only | Expanded hover card |
| select glider | `selectGlider` | `selectGliderFromThree` | left click glider | Connected | mission agents | Simulation pose parity |
| select waypoint | `selectWaypoint` | `selectWaypointById` | left click waypoint | Connected | plan waypoint id | Segment hover details |
| select Gold Star | priority-target inspector state | `selectPriorityTargetFromThree` | left click star | Connected | active public priority targets | Plan-to-target actions only if existing UI adds them later |
| place waypoint | `addWaypointForSelected` | `placeWaypointFromThree` | Place Waypoint + left click valid cell | Connected | deployment rules, `isValidWaypointCell`, `canPlaceWaypoint` | No auto-route generation |
| move waypoint | `updateWaypoint` via workspace method | `commitWaypointMoveFromThree` | Select/Edit + drag waypoint | Connected | `validateThreeMoveCell` | No optimizer |
| remove waypoint | `removeWaypointFromPanel` | `deleteWaypointById` | Delete/Backspace on selected waypoint | Connected | selected waypoint id | Context-menu polish |
| place planning marker | `addMarkerForSelected` | `placePlanningMarkerFromThree` | Place Marker + left click cell | Connected | waypoint-cell validity; marker executable=false | None |
| remove planning marker | `removeMarker` via workspace method | `deletePlanningMarkerFromThree` | select marker then Delete/Backspace | Connected | marker id/selection | None |
| cancel interaction | workspace cancel state | `cancelThreeInteractionFromIntent` | Escape / backend switch | Connected | controller state | None |
| route preview | existing plan/route preview state | interaction view model | hover/drag preview | Partial | canonical route/preview data only | More ETA/energy labels |
| invalid-placement warning | waypoint validity helpers | interaction result rejection | invalid click/drag | Connected | canonical placement validation | None |
| guidance cone | existing guidance state | interaction view model | layer toggle / selection | Partial | canonical guidance only | Extraction polish where missing |
| reachable region | existing guidance state | interaction view model | layer toggle / selection | Partial | canonical reachability only | Extraction polish where missing |
| ETA preview | existing route estimate | interaction view model | hover/drag preview | Partial | canonical route/cost estimate only | More visible labels |
| energy preview | existing route estimate | interaction view model | hover/drag preview | Partial | canonical route/cost estimate only | More visible labels |
| camera rotate | Three controller/camera state | `cameraChanged` intent | Navigate drag / modifier drag | Connected | renderer camera only | OrbitControls polish |
| camera pan | Three controller/camera state | `cameraChanged` intent | middle/right/modifier drag | Connected | renderer camera only | Touch gesture polish |
| camera zoom | Three controller/camera state | `cameraChanged` intent | wheel | Connected | renderer camera only | None |
| touch tap | Three controller | normal click intent | one-finger tap | Basic | click threshold prevents accidental drag placement | Advanced mobile QA |
| touch navigation | Three controller | `cameraChanged` where supported | movement beyond threshold | Basic | click threshold | Two-finger gesture polish |

## GFX-R3A Contract

Implemented in GFX-R3A:

- `src/core/rendering/MissionWorldCoordinates.js`: shared x/y/depth to Three world coordinate transform.
- `src/core/rendering/MissionWorldRenderViewModel.js`: public-safe mission world view model and validation.
- `src/core/rendering/MissionWorldStateAdapter.js`: adapters from live planning, simulation, and replay-like state into render inputs.
- `src/game/three/ThreeMissionWorldRenderer.js` and `src/game/three/layers/*`: Three.js rendering layers for connected planning artifacts.
- Mission Workspace renderer toggle in the left console.
- `ANCHOR_MISSION_RENDER_DEBUG`: browser debug summary for backend, live counts, Three object counts, boundary flags, time sync, warnings, and mismatches.

## GFX-R3B Contract

Implemented in GFX-R3B:

- `MissionWorldInteractionIntent` and `MissionWorldInteractionResult`: pure JavaScript intent/result contracts with boundary flags proving Three.js does not own planning, simulation, scoring, route optimization, or hidden truth.
- `ThreeMissionHitTest`: shared-coordinate raycast/hit-test model with stable `userData` identifiers and a dedicated invisible horizontal interaction surface.
- `ThreeMissionInteractionController`: pointer, hover, drag, keyboard, wheel, and camera/edit arbitration that emits intents only.
- `MissionWorkspaceThreeInteractionBridge`: routes intents to existing Mission Workspace command methods.
- `MissionPlanningInteractionViewModel` and `ThreePlanningInteractionLayer`: public-safe hover, validation, route-preview, drag-preview, selected-waypoint, guidance, and reachable-region overlay state.
- Mission Console planning controls for Navigate, Select/Edit, Place Waypoint, Place Marker, and Cancel Current Interaction.
- `ANCHOR_MISSION_RENDER_TEST_API`: projection helpers for E2E pointer tests without exposing mutation methods.

Deferred after GFX-R3B:

- Simulation execution parity for realized tracks, observations, failed-route overlays, surfacing events, and simulation-time pose/field updates.
- Replay/debrief parity for route review, replay observations, and headless/browser replay artifacts.
- Full visual polish for ETA/energy labels, ghost paths, advanced touch navigation, and 3D glyph styling.
- Making Three.js the default renderer or retiring the legacy Phaser tactical map.

## Boundary Rules

- Mission state is canonical; renderer state is derived.
- Three.js interactions emit normalized intents and are committed only by canonical workspace commands.
- Renderer switching must preserve the active plan, selected deployment, waypoints, planning markers, planning time, score state, interaction mode where sensible, and visibility tier.
- Public/fair mission render models must not include hidden truth payloads.
- Display scaling can change glyph size and camera position; it must not change physical/model magnitude, route validation, scoring, or simulation.
- Waypoint placement remains 2.5D: select horizontal mission position; depth/action/dive-profile semantics come from existing planning controls.
- Camera navigation is separated from edit gestures and must not accidentally add or move mission artifacts.
- The legacy Phaser tactical map must remain until Three.js simulation, replay/debrief, and visual QA parity are verified.
- Three.js does not add a planner, optimizer, scoring change, Python simulator, WebGPU fluid solver, RL, or MARL.