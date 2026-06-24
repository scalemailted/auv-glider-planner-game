# Right Panel Segment Profile UX Audit

Phase: DIVE-UX-R1 - Contextual Right-Panel Incoming-Segment Flight Profile Editor

## Summary

The right Mission Waypoints panel is the contextual editor for selected route instructions. A waypoint remains a horizontal destination. The selected destination card edits the flight profile for the incoming route segment that ends at that waypoint:

- W1 edits Selected Start -> W1
- W2 edits W1 -> W2
- W3 edits W2 -> W3

Canonical profile ownership remains in core planning. The right panel renders a draft editor and dispatches canonical commands; it does not own planning arrays, simulation, scoring, or export state.

## Responsibility Table

| Responsibility | Current owner | Target owner |
| --- | --- | --- |
| segment identity | `src/core/planning/MissionRouteSegment.js` | unchanged: core planning derives agent/source/target segment IDs |
| profile metadata | target waypoint compact metadata plus agent/mission defaults resolved by `SegmentFlightPlan.js` | unchanged: core segment flight plan contract; destination waypoint carries incoming-segment metadata for stable import/export |
| selected waypoint | `MissionWorkspaceScene` UI state | unchanged: scene state coordinates right panel, timeline, and Three selection |
| selected segment | derived from selected waypoint through `buildMissionRouteSegments()` | unchanged: selected waypoint implies its incoming segment |
| draft editor state | `state.ui.selectedSegmentFlightPlanDraft` | scene-owned UI draft, derived from canonical plan and discarded on cancel/selection/route changes |
| canonical mutation | `WaypointPlan.js` update helpers plus scene command handlers | `SegmentFlightPlanCommands.js` commands wrapping canonical waypoint-plan updates |
| feasibility calculation | `SegmentFlightPlan.js`, `DiveProfileFeasibility.js`, terrain-aware validation | unchanged; right panel consumes canonical feasibility/warnings |
| predicted trajectory | `PlannedDiveSegmentViewModel.js` and volumetric world view models | unchanged; right-panel summary uses planned-dive prediction data |
| HTML rendering | `RightWaypointPanel.js` | right panel renders compact cards and selected-card editor only |
| command binding | `MissionWorkspaceScene` handlers | handlers dispatch canonical segment-flight-plan commands; DOM handlers do not mutate plan objects |

## Existing Ownership Findings

Incoming segments are derived from the selected start and adjacent waypoint order by `buildMissionRouteSegments()`. Segment IDs include the agent, source anchor, and target waypoint ID. The first segment uses the selected start as the source; later segments use the previous waypoint as the source.

Segment flight-plan metadata is stored compactly on the destination waypoint and inherits from the selected glider plan, mission rules, and water-column defaults. This preserves existing plan import/export shape while the UI labels the metadata as the destination waypoint card's incoming-segment instruction.

Reorder policy is stable-target metadata: when a waypoint is reordered, its profile metadata travels with the destination waypoint. The incoming segment label and segment ID are recomputed from the new topology. Deleting a waypoint removes its incoming-segment metadata and does not migrate it to another leg.

The legacy left-panel water-column controls still exist for compatibility with broad E2E coverage and older workflows. DIVE-UX-R1 routes their committed edits through the canonical command layer where applicable, but the right panel is the transactional selected-segment editor. Future cleanup should retire or further demote the legacy left selected-segment controls after the browser suite is migrated to the right-panel workflow.

## Boundary

The right panel does not add new dive physics, constant-depth hovering, route optimization, terrain rules, current generation, scoring, export schemas, or simulation semantics. Three.js remains presentation and selection. Planning validation, prediction, simulation, observations, scoring, and export remain core-owned.
