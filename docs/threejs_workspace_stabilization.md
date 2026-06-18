# Three.js Workspace Stabilization

THREE-R1.1 stabilizes the existing Three.js Mission Workspace after the restored Phaser-shell baseline. It does not start THREE-R2, does not add terrain-surface planning, and does not change scoring, simulation, replay, or planner behavior.

## Manual failures found after THREE-R1

Focused browser reproduction found the Planning workspace could fail before the Three mission renderer finished its first refresh. The failure prevented Planning from becoming active and left `ANCHOR_MISSION_RENDER_DEBUG` unavailable.

The reproduced runtime error was:

```text
ReferenceError: renderer is not defined
MissionWorkspaceScene.buildMissionWorldViewModelForScene
```

## Undefined renderer root cause

`buildMissionWorldViewModelForScene` referenced a local `renderer` binding that was not in scope. THREE-R1.1 removes that implicit dependency and keeps renderer/canvas facts in the renderer lifecycle/debug path instead of the pure view-model builder.

## Renderer initialization order

`MissionWorkspaceScene` now records a small Three renderer lifecycle: idle, mounting, ready, deferred, and error metadata. Renderer creation, resize, camera sync, view-model build, interaction-context update, render update, and validation are guarded so startup failures become debug-visible errors instead of uncaught browser crashes.

## Pointer-coordinate contract

`src/core/rendering/MissionWorldPointerCoordinates.js` is the shared contract for converting browser pointer coordinates into Three mission-world selections. Pointer conversion starts from the actual Three canvas `getBoundingClientRect()`, converts client coordinates to local canvas CSS pixels, converts local CSS pixels to NDC, raycasts the single mission interaction plane, and maps the hit point back to a grid cell.

## CSS pixels versus DPR

Pointer hit testing uses CSS pixel geometry from the canvas rect. Device pixel ratio affects renderer backing size only. It is not applied a second time during pointer conversion. This keeps pointer calibration stable after resize, high-DPR backing-size changes, and camera changes.

## Canvas/host/camera sync

The Three renderer now records host size, canvas CSS rect, backing width/height, renderer pixel ratio, camera aspect, and resize sequence. `resizeThreeMissionWorldRenderer` synchronizes renderer size and camera projection from the actual host/container dimensions.

## Operational interaction plane

Mission editing still uses one logical horizontal interaction plane. The plane carries metadata for `planeId`, `depthLayerId`, `depthMeters`, and interaction/visual-grid flags. Bathymetry and future slabs may change visuals, but the operational selection contract remains an explicit grid-plane hit until a later depth-aware planning phase changes that contract deliberately.

## Drop-zone source of truth

Drop zones come from canonical deployment helpers and the mission/level state, then flow through `MissionWorldStateAdapter` and `MissionWorldRenderViewModel`. The Three drop-zone layer renders those cells, selected starts, status, allowed agents, and zone boundaries without inventing separate deployment state.

## Deployment-selection flow

Deployment selection is now a distinct Three intent: `selectDeploymentCell`. The workspace enters `selectDeployment` mode from the existing Change Start control, validates the clicked cell through canonical deployment helpers, calls the canonical selected-start path, and does not add a waypoint. On success, ordinary planning mode resumes from the selected start.

## Layer coordinate alignment

Terrain, scalar fields, hazards, drop zones, gliders, waypoints, routes, planning markers, priority targets, and hit-test cells share the same mission-world coordinate transform. R1.1 adds smoke/audit coverage for pointer roundtrips, layer alignment, drop-zone object metadata, and deployment selection mutation boundaries.

## Runtime error handling

Browser smoke coverage now captures page errors, console errors, and failed module requests so runtime crashes fail E2E instead of passing silently. `ANCHOR_MISSION_RENDER_DEBUG` reports renderer lifecycle state, runtime error count, last error, pointer diagnostics, expected versus actual grid cell, and deployment-selection state.

## Deferred terrain/slab work

THREE-R1.1 intentionally leaves bathymetric terrain surfaces, depth/control slabs, richer water-column picking, replay/debrief parity, and editor interaction parity for later phases. The recommended next phase is `THREE-R1.2 - Bathymetric Terrain Surface + Operational Depth/Control Slabs`.