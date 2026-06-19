# Manual Three.js Water Column Checklist

Human manual QA by the project owner remains pending.

Use this checklist after running automated checks.

## Planning Workspace

- Open a mission with declared water-column config.
- Confirm water surface, operational slabs, scalar texture, current vectors, gliders, waypoints, and route lines render together without blank canvas or overlap.
- Toggle Physical Depth and Exploded Layers. The route and waypoint list should not mutate.
- Select Surface, Shallow, Thermocline, and Deep when available. Active-layer emphasis and current-vector visibility should update.
- Click depth slabs in Select / Edit mode. Inspection/debug metadata should include layer id, depth meters, bottom clearance, and blocked/below-seabed reason when applicable.
- Change selected dive profile and target layer. A selected waypoint should preserve the metadata in plan export; with no selected waypoint, the selected agent plan should preserve it.

## Simulation

- Execute the same plan.
- Confirm planned dive path, realized path, observations, surfacing events, hazards, and glider playback remain visible.
- Confirm Simulation controls still advance the portable engine and Three.js only renders state.
- Confirm `ANCHOR_WATER_COLUMN_RENDER_DEBUG.ownsSimulation`, `.ownsPlanning`, and `.ownsScoring` are false.

## Legacy Surface-Only Missions

- Open an older mission without `waterColumnConfig`.
- Confirm the Water Column panel states surface-only fallback.
- Confirm no deeper layers are implied unless the mission declares them.

## Not Accepted Until

- No visual overlap makes controls unreadable.
- Depth slabs do not hide route/observation/glider affordances at normal camera presets.
- Browser console has no runtime errors while toggling layer modes.
- Human manual QA by the project owner is complete.
