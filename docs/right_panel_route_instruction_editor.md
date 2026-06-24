# Right Panel Route Instruction Editor

DIVE-UX-R1 moves contextual incoming-segment flight-profile authoring into the selected destination waypoint card in the right Mission Waypoints panel.

## Operator Model

A waypoint is still the horizontal destination. The behavior used to reach that destination belongs to the incoming route segment:

- selecting W1 edits Selected Start -> W1
- selecting W2 edits W1 -> W2
- selecting W3 edits W2 -> W3

Only the selected card expands by default. Other cards remain compact so long waypoint lists stay readable.

## Expanded Card

The selected card shows:

- Destination: x/y, cell, waypoint action, and status
- Incoming Segment Flight Profile: supported profile preset, target layer, maximum depth, yo cycles, sampling phase, sample interval, and arrival behavior
- Advanced Flight Parameters: supported minimum/maximum immersion and surface wait metadata
- Predicted Outcome: planning estimates from the canonical planned-dive model
- Warnings: canonical feasibility, terrain, and route warnings
- Route Actions: Apply Changes, Cancel, Reset to Glider Default, Apply to Remaining Segments, Set as Glider Default

Draft changes update only the selected route-instruction draft and prediction. Apply commits through canonical planning commands. Cancel restores canonical values. Draft state is excluded from export, Execute, scoring, replay, and headless artifacts.

## Ownership

The right panel owns rendering and input collection only. `SegmentFlightPlanCommands.js` owns commit/reset/apply/default command results. `MissionRouteSegment.js`, `SegmentFlightPlan.js`, and `WaypointPlan.js` own canonical route identity and metadata. `PlannedDiveSegmentViewModel.js` owns prediction summaries. The simulator owns realized x/y/z/t, observations, and score.
