# Three.js Mission Renderer Migration

GFX-R3A connects a Three.js mission-world renderer to the live Mission Planning workspace. Phaser remains the app shell, input owner, fallback tactical renderer, simulator scene owner, and official browser scoring path. The Three renderer consumes a public-safe `MissionWorldRenderViewModel` built from the same mission state used by the legacy tactical map.

Renderer switching must not mutate plans, simulation state, scoring, replay semantics, hidden truth visibility, or solver data. The legacy Phaser 2D tactical renderer remains the fallback until interaction, simulation, and replay parity are complete.

## Parity Inventory

| Artifact | Canonical source of truth | Legacy Phaser owner | Three.js target layer | Planning required | Simulation required | Replay required | Interaction required | GFX-R3A status | Later phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Terrain / land mask | `level.layers.terrain` | `drawMissionMap` terrain cells | `constraintGroup` / terrain cells | Yes | Yes | Yes | Hit-test fallback remains Phaser | Connected as read-only cells | GFX-R3B for direct Three hit testing |
| Bathymetry | `level.layers.depth` / generated depth summary | Bathymetry sandbox only | `bathymetryGroup` | Yes | Yes | Yes | No direct input | Connected when depth exists, fallback flat seabed | Later real-data ingestion |
| Water surface | Renderer display setting | Bathymetry sandbox only | `waterSurfaceGroup` | Yes | Yes | Yes | Layer toggle | Connected | Visual polish later |
| Depth layers | 2.5D layer vocabulary | Bathymetry sandbox only | `depthLayerGroup` | Yes | Yes | Yes | Layer toggle | Connected as visual planes | P11/P12 depth-specific planning polish |
| Blocked / constraint cells | `level.layers.terrain`, route validators | `drawMissionMap` terrain and route warning overlays | `constraintGroup` | Yes | Yes | Yes | Input still Phaser | Connected as read-only cells | GFX-R3B/R3C input parity |
| Static hazards | `level.layers.hazards` | `drawMissionMap` hazard cells | `hazardGroup` | Yes | Yes | Yes | Input still Phaser | Connected | GFX-R3C simulation/replay parity |
| Mobile hazards | `getMobileHazardsAtTime` | Phaser temporal overlay | `hazardGroup` | Yes | Yes | Yes | Input still Phaser | Adapter-ready when present | GFX-R3C |
| Current vectors `F(x,y,t)` | shared current sampler / active frame | Phaser arrow overlay | `currentVectorGroup` | Yes | Yes | Yes | Layer toggle | Connected | More glyph scaling polish later |
| Current magnitude display | vector magnitude metadata | Phaser arrow length/color | `currentVectorGroup` | Yes | Yes | Yes | Layer toggle | Connected as display scaling only | GFX-R3D visual QA |
| ROI / sample-value heatmap | visible sample field frame | Phaser ROI cell fills | `scalarFieldGroup` | Yes | Yes | Yes | Layer toggle | Connected | Color legend polish later |
| Forecast heatmap | visible forecast field | Phaser forecast display mode | `scalarFieldGroup` | Yes | Yes | Yes | Console selector later | Adapter-ready, not fully surfaced | GFX-R3B |
| Belief heatmap | visible belief state | Phaser uncertainty/forecast demos | `scalarFieldGroup` | Yes | Later | Later | Console selector later | Adapter-ready | Blind/belief phases |
| Uncertainty heatmap | visible uncertainty state | Phaser uncertainty/forecast demos | `scalarFieldGroup` | Yes | Later | Later | Console selector later | Adapter-ready | Blind/belief phases |
| Drop zones | deployment zone helpers | Phaser zone outlines/labels | `dropZoneGroup` | Yes | No | Replay context only | Deployment clicks remain Phaser | Connected | GFX-R3B input parity |
| Selected start | mission agent deployment state | Phaser deploy marker | `markerGroup` / selection marker | Yes | Yes | Yes | Selection remains Phaser | Connected | GFX-R3B direct selection |
| Gliders | `mission.agents`, simulation state when available | Phaser glider sprites | `gliderGroup` | Yes | Yes | Yes | Selection remains Phaser | Connected for planning agents | GFX-R3C for simulation pose parity |
| Planned waypoints | `plan.agentPlans[].waypoints` | Phaser waypoint markers | `waypointGroup` | Yes | Yes | Yes | Placement/editing remains Phaser | Connected | GFX-R3B interaction parity |
| Sampling waypoints | waypoint `action` / `kind` metadata | Phaser marker style/labels | `waypointGroup` | Yes | Yes | Yes | Editing remains Phaser | Connected as waypoint action metadata | GFX-R3D glyph polish |
| Planning markers | `plan.planningMarkers` | Phaser marker glyphs/timeline ticks | `markerGroup` | Yes | No | Replay context only | Placement remains Phaser | Connected | GFX-R3B interaction parity |
| Temporal Gold Stars / priority targets | `level.layers.priorityTargets`, active-time helper | Phaser star overlay and timeline | `priorityTargetGroup` | Yes | Yes | Yes | Selection later | Connected for active public targets | GFX-R3C/R3D expiry visualization polish |
| Planned route | `plan.agentPlans[].waypoints` route geometry | Phaser route lines | `routeGroup` | Yes | Yes | Yes | Editing remains Phaser | Connected | GFX-R3B interaction parity |
| Waypoint-to-waypoint segments | route segment builder / waypoint order | Phaser route overlay and diagnostics | `routeGroup` | Yes | Yes | Yes | Segment hover later | Connected as route polylines | GFX-R3B/R3D segment details |
| Selected glider highlight | `state.selectedAgentId` | Phaser selected styling/HUD | `selectionGroup`, glider material | Yes | Yes | Yes | Selection remains Phaser | Connected | GFX-R3B direct selection |
| Selected waypoint highlight | `state.ui.selectedWaypoint` / selected waypoint id | Phaser selected styling | `selectionGroup`, waypoint material | Yes | Yes | Yes | Selection remains Phaser | Connected when id is present | GFX-R3B direct selection |
| Planning scrubber time | `state.planningTime` | bottom DOM timeline + Phaser refresh | view-model `activeTimeSeconds` | Yes | No | Replay uses playhead | DOM slider remains authority | Connected | GFX-R3B direct playhead affordance only if needed |
| Active planning window | timeline/window helpers | Phaser/HUD labels | view-model `planningWindow` | Yes | No | Replay context only | DOM controls remain authority | Connected in metadata | GFX-R3D display polish |
| Dynamic heatmap/current frame | active time + field samplers | Phaser map refresh | scalar/vector layers | Yes | Yes | Yes | DOM slider remains authority | Connected | GFX-R3C simulation parity |
| Gold Star active/expiry status | priority target frames | Phaser star/timeline state | `priorityTargetGroup` metadata | Yes | Yes | Yes | Selection later | Active status connected; expiry metadata carried | GFX-R3D visual countdown polish |
| Observations | simulation/headless observations | Phaser simulation/debrief panels | `observationGroup` | Later | Yes | Yes | Hover/select later | Adapter-ready | GFX-R3C/H4 replay parity |
| Surfacing events | simulation surface/update records | Phaser dialogs/timeline | `observationGroup` / `markerGroup` | Later | Yes | Yes | Dialogs remain Phaser/HTML | Adapter-ready | GFX-R3C/H4 replay parity |
| Guidance cone | planning guidance model | Phaser guidance overlay | `guidanceGroup` | Yes | No | No | Hover/click remains Phaser | Metadata-ready, not rendered as cone | GFX-R3B |
| Reachable region | planning guidance model | Phaser reachable overlay | `guidanceGroup` | Yes | No | No | Hover/click remains Phaser | Metadata-ready, not rendered as region | GFX-R3B |
| ETA/energy warnings | route/segment diagnostics | HUD and route labels | `guidanceGroup` metadata | Yes | Yes | Replay summary only | HTML remains authority | Metadata-ready | GFX-R3B/R3D |
| Realized trajectory | simulation engine / headless replay | SimulationScene / Debrief overlays | `routeGroup` future realized layer | No | Yes | Yes | Scrub/select later | Adapter-ready only | GFX-R3C/H4 |
| Sampled cells/points | simulation result events | Simulation/Debrief panels | `observationGroup` | No | Yes | Yes | Hover/select later | Adapter-ready only | GFX-R3C/H4 |
| Ghost / best prior path | leaderboard best attempt | Phaser best-path overlay | future ghost route layer | Yes | No | Replay context only | Toggle remains HTML/Phaser | Not connected | GFX-R3B/R3D |
| Failed route overlays | route validator and sim abort diagnostics | Phaser warning overlays/dialogs | future diagnostic layer | Yes | Yes | Yes | Recovery remains Phaser/HTML | Not connected | GFX-R3C |
| Replay route | replay bundle / route record | Headless Bundle Viewer panels | future replay route layer | No | No | Yes | Replay controls remain HTML | Not connected | H4/GFX-R3C |
| Replay observations | replay events/checkpoints | Headless Bundle Viewer panels | future replay observation layer | No | No | Yes | Replay controls remain HTML | Not connected | H4/GFX-R3C |
| Hover cell | Phaser pointer/layout adapter | MissionWorkspaceScene pointer handlers | future Three raycast input | Yes | No | Optional | Required for direct Three planning | Not connected | GFX-R3B |
| Click placement | MissionWorkspaceScene plan mutation APIs | Phaser map hit targets | future Three raycast input | Yes | No | No | Required for direct Three planning | Not connected | GFX-R3B |
| Drag waypoint | MissionWorkspaceScene drag handlers | Phaser map hit targets | future Three drag handles | Yes | No | No | Required for direct Three planning | Not connected | GFX-R3B |
| Select glider / waypoint | app selected ids | Phaser map/list handlers | future Three object picking | Yes | Yes | Yes | Required for direct Three planning | Not connected | GFX-R3B |
| Time slider | DOM bottom timeline | HTML overlay | renderer consumes time only | Yes | Yes | Yes | DOM remains authority | Connected as consumer | Later only if a 3D-local scrubber is needed |

## GFX-R3A Contract

Implemented in this pass:

- `src/core/rendering/MissionWorldCoordinates.js`: shared x/y/depth to Three world coordinate transform.
- `src/core/rendering/MissionWorldRenderViewModel.js`: public-safe mission world view model and validation.
- `src/core/rendering/MissionWorldStateAdapter.js`: adapters from live planning, simulation, and replay-like state into render inputs.
- `src/game/three/ThreeMissionWorldRenderer.js` and `src/game/three/layers/*`: Three.js rendering layers for the connected planning artifacts.
- Mission Workspace renderer toggle in the left console.
- `ANCHOR_MISSION_RENDER_DEBUG`: browser debug summary for backend, live counts, Three object counts, boundary flags, time sync, warnings, and mismatches.

Not implemented in this pass:

- Direct Three.js map input for waypoint placement, dragging, hover tooltips, glider selection, or marker placement.
- Simulation/replay playback parity for realized tracks, observations, failed-route overlays, and surfacing events.
- Full visual parity for planning guidance cones, reachable regions, ETA labels, energy warnings, and best-prior ghost paths.
- Full 3D route planning, WebGPU fluid simulation, new planners, route optimization, scoring changes, Python simulation, or MARL/RL.

## Boundary Rules

- Mission state is canonical; renderer state is derived.
- Renderer switching must preserve the active plan, selected deployment, waypoints, planning markers, planning time, score state, and visibility tier.
- Public/fair mission render models must not include hidden truth payloads.
- Display scaling can change glyph size and camera position; it must not change physical/model magnitude, route validation, scoring, or simulation.
- The legacy Phaser tactical map must remain until Three.js interaction, simulation, replay, and visual QA parity are verified.