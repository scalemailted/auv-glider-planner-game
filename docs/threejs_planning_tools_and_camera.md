# Three.js Planning Tools and Camera Controls

THREE-R1.1C makes the Mission Workspace planning tools and camera gestures player-facing while preserving the current architecture:

- `index.html` still enters through `src/game/main.js`.
- Phaser remains the scene lifecycle shell.
- Three.js owns the production mission-world renderer and pointer surface.
- The portable JavaScript core and Mission Workspace scene remain the authority for deployment, planning validity, simulation, scoring, route timing, and state mutation.
- The legacy Phaser tactical renderer remains a query-gated diagnostic fallback only.

See [Three.js Waypoint Pipeline and Camera Controls](threejs_waypoint_pipeline_and_camera_controls.md) for the R1.1C command-pipeline audit.

## Player Flow

The intended planning flow is:

1. Select a glider in the Mission World or Waypoint Timeline.
2. Click `Deploy / Change Start` in the Mission Console, or `Deploy Glider` / `Change Start` in the right Waypoint Timeline.
3. Click a highlighted valid drop-zone cell.
4. If the selected route is empty, `Add Waypoint` auto-arms. The player may also click `Add Waypoint` explicitly.
5. Click successive valid mission cells to append route waypoints.
6. Switch to `Select / Edit` to inspect objects or drag an existing waypoint.
7. Click `Execute Mission` to launch simulation.

Waypoint and marker tools are persistent so repeated clicks can append route waypoints or non-executable planning markers. Deployment is a one-shot tool, but an accepted deployment with an empty route transitions directly into Add Waypoint.

## Visible Tools

The Mission Console exposes:

- `Navigate`: camera-oriented mode; the standard mouse gestures still work in all planning modes.
- `Select / Edit`: select gliders, waypoints, markers, Gold Stars, and drag selected waypoints.
- `Deploy / Change Start`: choose a valid drop-zone cell for the selected glider.
- `Add Waypoint`: append executable route waypoints for the selected glider.
- `Add Marker`: place non-executable planning markers.
- `Cancel`: clears active transient interaction state and returns to a safe select/edit tool.

The Add Waypoint button is disabled until the selected agent can receive waypoints. Disabled reasons include selecting a glider first, deploying the glider first, unavailable planning phase, locked agent, or missing valid deployment.

## Camera Controls

The Mission Console exposes presets and focus controls:

- `Top Down`
- `Oblique`
- `Profile`
- `Fleet`
- `Focus Glider`
- `Focus Route`
- `Reset Camera`

Pointer controls:

- left click below the movement threshold: execute the active planning/select action.
- left drag above the movement threshold: pan the camera.
- right drag: orbit yaw and pitch around the camera target.
- mouse wheel: zoom/dolly.
- middle drag: dolly without mission-state mutation.

Manual camera movement is preserved across normal renderer refreshes. Preset and reset buttons intentionally replace the manual camera pose.

## Debug Contract

`ANCHOR_MISSION_RENDER_DEBUG` includes:

- `activePlanningToolId`, `activePlanningToolLabel`, `scenePlanningToolId`, `controllerInteractionMode`, `visibleToolButtonId`, `planningToolStateMismatches`
- deployment candidate, selected start, and waypoint tool availability fields
- waypoint placement candidate, validation, bridge, and canonical command result fields
- canonical, Three, right-panel, and timeline waypoint counts
- `cameraMouseMapping`, azimuth, polar, distance, target, target-before/after gesture, pan delta, and change counters
- pointer owner, pointer movement, gesture classification, click suppression reason, and pointer calibration fields

These fields are for QA and smoke tests. They do not make Three.js authoritative over planning, simulation, or scoring.

## Boundary

Three.js modules must not directly mutate route arrays, score missions, run simulations, expose hidden truth, or introduce route optimization. Pointer events become canonical workspace intents; the Mission Workspace scene and portable core decide whether a change is valid.
