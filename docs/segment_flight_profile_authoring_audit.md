# Segment Flight Profile Authoring Audit

Phase: DIVE-R1.1 — Segment Flight-Profile Authoring and Water-Column Layer Explorer

## Finding

Flight-profile controls are assigned to route segments, not to waypoints as direct vertical-position commands.

A route segment is the horizontal leg from the previous navigation anchor to the target waypoint: selected deployment/start to waypoint 1, waypoint 1 to waypoint 2, and so on. The target waypoint carries compact incoming-segment profile metadata for import/export stability, but the waypoint remains a horizontal navigation target.


## Required Audit Table

| Concern | Current owner | Current behavior | DIVE-R1.1 result |
| ------- | ------------- | ---------------- | ---------------- |
| Segment identity | Waypoint plan plus derived route-segment model | Routes were primarily represented as selected start plus waypoint arrays; predicted dive segments had renderer-view IDs. | MissionRouteSegment derives stable logical IDs from agent, source anchor, and target waypoint. |
| Profile metadata location | Waypoint/agent/mission metadata | Segment intent could look like waypoint depth metadata. | Target waypoint may store compact incoming-segment metadata, but UI and summaries label it as the segment flight profile. |
| Start to W1 | Selected deployment/start plus first waypoint | Existing plans store selectedStart and waypoint 1 separately. | buildMissionRouteSegments emits selectedStart -> W1 as sequence 0. |
| W1 to W2 | Adjacent waypoint order | Existing route order defines horizontal leg sequence. | buildMissionRouteSegments emits W1 -> W2 using previous target as source. |
| Profile inheritance | EffectiveDiveProfileResolver | Agent, mission, modern defaults, and legacy fallback already resolve profiles. | SegmentFlightPlan keeps explicit segment/target metadata ahead of inherited defaults and records profileSource. |
| Right-panel controls | MissionWorkspaceScene and HtmlMissionWorkspaceOverlay | Controls existed but could read as waypoint-level dive metadata. | Panel copy says incoming segment and provides Apply to This Segment / Remaining / Glider Default / resets. |
| Reorder | WaypointPlan reorder | Waypoint metadata travels with the waypoint. | Documented policy: target metadata travels with target; segment ID changes with topology. |
| Delete | WaypointPlan delete | Deleting a waypoint removes its metadata. | Deleted segment profile is not migrated to unrelated legs. |
| Import/export | anchor.plan normalization | Dive-profile keys are preserved on agent plans and waypoints. | WaypointPlan preserves segment profile fields needed for roundtrip. |
| Surfacing replan | SurfacingReplanHandoff | Source plan is cloned into the handoff. | Future waypoint profile metadata remains in the cloned source plan; completed history remains immutable by policy. |
| Simulation | Existing SimulationEngine and dive state | Canonical execution resolves actual depth and observations. | DIVE-R1.1 does not change simulation ownership or scoring. |
| Replay/debrief/headless | Existing result/replay/headless exports | Compact profile metadata is not expanded per event by this pass. | Remaining parity hardening is a follow-up; plan-level metadata and result observations remain canonical. |

## Authority Boundary

| Area | Owner | DIVE-R1.1 behavior |
| --- | --- | --- |
| Route geometry | Waypoint plan | Unchanged; waypoints define horizontal route anchors. |
| Segment flight profile | Segment flight plan | Derived from target waypoint metadata, glider default, or mission default. |
| Canonical dive execution | Simulation engine | Unchanged; actual depth history and observations remain execution output. |
| Science values | Water-column field model | Unchanged; sampling uses canonical x/y/z/t fields. |
| Layer display | Water-column explorer view model | Display-only; does not create science/current/sampling semantics. |
| Scoring | Existing scoring modules | Unchanged; no new scoring formula. |
| Rendering | Three.js view models/layers | Visualization only; no simulation/planning authority. |

## Segment Controls

Normal segment controls may include profile, target layer, minimum/maximum immersion, vertical/profile speed class where modeled, pitch class where modeled, yo-cycle count, sample interval, sample phase, surface-at-end, and communication wait.

These controls must not be exposed or interpreted as:

- Descend now
- Ascend now
- Stay at exact depth
- Free XYZ waypoint routing
- Renderer-owned simulation

## Inheritance and Editing

Profile resolution order is:

1. selected segment override on the target waypoint
2. target waypoint flight-profile metadata
3. glider/agent default
4. mission or water-column default
5. surface-only compatibility fallback

The UI labels this as a flight profile for the incoming segment. Applying to the current segment updates only the selected target waypoint metadata. Applying to remaining segments updates future target waypoints for the selected glider. Setting as glider default updates the agent plan default.

## Reorder and Delete Behavior

Profile metadata travels with the target waypoint. If waypoints are reordered, segment IDs are recomputed from the new source-target topology and the target's incoming-segment profile still applies to that target. If a waypoint is deleted, its incoming segment and profile are removed and must not migrate silently to another leg.

## Water-Column Layer Explorer

The layer explorer can show active slices, stacked/exploded slabs, integrated water-column summaries, vertical profiles, layer differences, and vertical gradients. Integrated water-column output is derived and is not a physical depth plane. The explorer exposes source digests and ownership flags so tests can confirm display does not own science, current, sampling, planning, simulation, or scoring.

## Debug Objects

DIVE-R1.1 publishes:

- globalThis.ANCHOR_SEGMENT_FLIGHT_PLAN_DEBUG
- globalThis.ANCHOR_WATER_COLUMN_EXPLORER_DEBUG

Existing DIVE-R1 objects remain:

- globalThis.ANCHOR_WATER_COLUMN_RENDER_DEBUG
- globalThis.ANCHOR_DIVE_PLAN_DEBUG

## Validation

Focused validation scripts:

- node tools/js/smoke_mission_route_segments.mjs
- node tools/js/smoke_segment_flight_plan.mjs
- node tools/js/smoke_segment_profile_reorder_delete.mjs
- node tools/js/smoke_water_column_layer_explorer.mjs
- node tools/js/smoke_water_column_layer_interpolation.mjs
- node tools/js/smoke_same_xy_layer_value_display.mjs
- node tools/js/smoke_segment_profile_execution_parity.mjs
- node tools/js/smoke_segment_profile_replan_preservation.mjs
- node tools/js/audit_segment_flight_profile_authority.mjs
- node tools/js/audit_water_column_explorer_authority.mjs
- node tools/js/audit_water_column_layer_performance.mjs

Focused browser tests live in tests/e2e/dive_r1_1_segment_profiles.spec.js.

## Remaining Manual QA

The full headed owner walkthrough remains manual. Verify that the waypoint panel copy says segment profile, idle gliders remain idle, water-column layer displays change without changing canonical results, and the selected routed glider's actual observations record actual depth, resolved layer, and sampled scalar value.
