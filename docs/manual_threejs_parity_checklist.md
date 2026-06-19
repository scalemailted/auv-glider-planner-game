# Manual Three.js Parity Checklist

Human manual QA by the project owner remains pending.

## Scene Transitions

- Planning -> Main Menu: no prior scene remains visible.
- Simulation -> Main Menu: no Three canvas, timeline, transport, Mission Performance strip, or glider cards remain.
- Simulation -> Debrief: simulation canvas and controls are disposed.
- Debrief -> Main Menu: Product Hub is the only active production surface.
- Debrief -> Planning: exactly one mission renderer is created.
- Rerun mission: resource counts do not grow.

## Vehicle Pose

- Straight segment: nose points along canonical heading/course.
- 90-degree turn: body rotates smoothly through the turn.
- Current-induced drift: heading and actual course remain distinguishable.
- Dive/ascent: pitch changes when canonical pitch/dive state exists.
- Pause: orientation remains stable and does not jitter.

## Guidance

- Selected glider shows guidance when canonical guidance exists.
- Cone updates when the hover/target waypoint changes.
- Cone origin aligns with selected glider or planning anchor.
- Current/risk changes alter canonical guidance state and rendered styling.

## Cell Alignment

- Drop zone cells align with pointer hits.
- Four corners and center cell align with visible grid.
- Gold Star, hazard, waypoint, and route endpoint centers match the selected cell.
- No consistent half-cell offset is visible.

## Waypoint Semantics

- Land/blocked cell: red invalid preview, exact reason, click does not mutate route/timeline/panel.
- Valid water cell: waypoint is added normally.
- Beyond-time waypoint: accepted with mission-window warning, right panel and timeline warn.
- Simulation expiration: mission duration is not extended and waypoint remains unreached/missed.
- Debrief result: missed waypoint reason includes mission-time expiration.
