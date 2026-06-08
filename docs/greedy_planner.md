# Greedy Planner

Greedy Planner is ANCHOR's browser-native selected-glider baseline planner. It is a fast local planner for comparison, teaching, and smoke testing. It is not a fleet-wide optimizer and it is not expected to beat external search, optimization, or learning solvers.

The legacy implementation filename and a few internal result slots still use `temporalGreedy` for compatibility, but user-facing documentation and UI should call the feature **Greedy Planner**.

## What It Uses

Greedy Planner plans one waypoint at a time for the currently selected glider. It preserves other gliders' existing routes and treats their planned coverage as depleted value and soft conflict context.

Candidate scoring uses the same route and current systems as Planning and Simulation:

- continuous waypoint-to-waypoint segment checks against terrain, depth, hazards, and route-block diagnostics
- current-aware ETA, speed over ground, and energy from `CurrentAwareRouteCost`
- shoreline risk and topology metadata from `CurrentFieldSampler`
- forecast-visible ROI/current data in stochastic mode unless an explicit oracle/debug mode is used
- severe hazard rejection and near-hazard penalties
- Gold Star priority targets as major temporal objectives
- route-footprint ROI/sample value as incremental reward

Current-aware scoring treats current aligned with the heading as assistance, opposing current as extra cost, cross-current as drift/risk, and current toward nearby land as shoreline risk.

## Terminal Carry-Through

Greedy Planner is horizon-filling. When safe feasible movement remains, it should keep the selected glider commanded through the mission window.

A final waypoint beyond the mission duration is not an error. It is a **terminal carry-through waypoint**:

```json
{
  "terminalCarryThrough": true,
  "terminalCarryThroughReason": "mission_horizon_coverage",
  "runtimeBehavior": "truncate_at_mission_end"
}
```

Simulation travels toward that waypoint until mission time expires, then stops at the reached position and debriefs normally. Route validation classifies this as `waypoint_exceeds_mission_duration` with warning severity, not as a blocking route failure.

Hard failures still block: land crossings, invalid starts, non-navigable endpoints, severe hazard crossings where configured, fuel failure, and stale/disconnected route state.

## Diagnostics

Planner metadata records stop reasons, accepted waypoint counts, rejected candidate counts, hazard rejection counts, route-audit output, and terminal carry-through metadata. Useful stop reasons include:

- `mission_horizon_covered`
- `no_reachable_feasible_candidates`
- `no_safe_carry_through_candidate`
- `no_executable_route_after_validation`
- `planner_generated_blocked_segment`
- `max_iterations_guard`

For the detailed implementation contract, see the compatibility document [temporal_greedy.md](temporal_greedy.md).
