# Three.js Planning Tools and Camera Controls

THREE-R1.1B makes the Mission Workspace planning tools visible and player-facing while preserving the current architecture:

- `index.html` still enters through `src/game/main.js`.
- Phaser remains the scene lifecycle shell.
- Three.js owns the production mission-world renderer and pointer surface.
- The portable JavaScript core remains the authority for planning validity, simulation, scoring, route timing, and state mutation.
- The legacy Phaser tactical renderer remains a query-gated diagnostic fallback only.

## Player Flow

The intended planning flow is:

1. Select a glider in the Mission World or Waypoint Timeline.
2. Click `Deploy / Change Start` in the Mission Console, or `Deploy Glider` / `Change Start` in the right Waypoint Timeline.
3. Click a highlighted valid drop-zone cell.
4. Click `Add Waypoint`.
5. Click successive valid mission cells to append route waypoints.
6. Switch to `Select / Edit` to inspect objects or drag an existing waypoint.
7. Click `Execute Mission` to launch simulation.

Deployment is a one-shot tool: after a valid start is chosen, the active tool returns to `Select / Edit`. Waypoint and marker tools are persistent so repeated clicks can append route waypoints or non-executable planning markers.

## Visible Tools

The Mission Console exposes:

- `Navigate`: left drag orbits the camera; right/middle/Shift-drag pans; wheel zooms.
- `Select / Edit`: select gliders, waypoints, markers, Gold Stars, and drag selected waypoints.
- `Deploy / Change Start`: choose a valid drop-zone cell for the selected glider.
- `Add Waypoint`: append executable route waypoints for the selected glider.
- `Add Marker`: place non-executable planning markers.
- `Cancel`: clears active transient interaction state and returns to a safe select/edit tool.

The small overlay in the Three viewport mirrors the active tool and instruction. `globalThis.ANCHOR_MISSION_RENDER_DEBUG` also exposes the active tool, candidate cells, validation messages, waypoint counts, and camera controller stats.

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

- `Navigate` + left drag: orbit yaw/pitch.
- right, middle, or Shift-drag: pan across the mission plane.
- mouse wheel: zoom.

Manual camera movement is preserved across normal renderer refreshes. Preset and reset buttons intentionally replace the manual camera pose.

## Debug Contract

`ANCHOR_MISSION_RENDER_DEBUG` includes:

- `activePlanningToolId`, `activePlanningToolLabel`, `planningToolInstruction`, `planningToolCursor`
- deployment candidate and validation fields
- waypoint placement candidate and validation fields
- canonical, Three, right-panel, and timeline waypoint counts
- `cameraPresetId`, `cameraMode`, azimuth, polar, distance, target
- camera orbit/pan/zoom enabled flags and change counters
- pointer owner and pointer calibration fields

These fields are for QA and smoke tests. They do not make Three.js authoritative over planning, simulation, or scoring.

## Boundary

Three.js modules must not directly mutate route arrays, score missions, run simulations, expose hidden truth, or introduce route optimization. Pointer events become canonical workspace intents; the Mission Workspace scene and portable core decide whether a change is valid.