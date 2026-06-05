# Temporal Greedy Baseline Planner

## 1. Purpose

Temporal Greedy is ANCHOR's fast internal baseline planner. It is designed to produce a reasonable route for the currently selected glider using local, step-by-step decisions. It is not a global optimizer. Its purpose is to provide a simple baseline for comparison, fast mission testing, and quick route execution checks.

Temporal Greedy exists so players, students, developers, and researchers can quickly ask:

- Is this mission playable?
- Can the selected glider find a plausible route?
- Does route validation catch blocked paths before simulation?
- How does a simple baseline compare with a manual plan or external solver?

Temporal Greedy is a baseline to beat, not the final planning solution.

## 2. Intended Use

Use Temporal Greedy for:

- quick smoke testing during development
- route execution testing before deeper solver work
- checking whether a generated or edited mission is playable
- generating a browser-native baseline route for the selected glider
- comparing against manual player routes
- comparing against external Python, Colab, or Node solver plans
- testing current, risk, ROI, priority-star, depletion, and route-validation behavior

It is intentionally practical and fast. It should return promptly on normal mission sizes and should make the Planning workspace feel responsive.

## 3. Non-Goals

Temporal Greedy is not intended to be globally optimal.

Temporal Greedy is not a deep search planner. It should not build a combinatorial search tree, recursively expand future route sequences, or attempt to solve the entire mission as one global optimization problem.

Temporal Greedy is not a fleet-wide optimizer. It plans only for the selected glider and treats other gliders' existing plans as constraints and depleted value.

Temporal Greedy is not a replacement for external solvers. It is a local baseline that external solvers should be able to outperform.

Temporal Greedy should not use hidden stochastic truth unless an explicit oracle/debug variant is requested and clearly labeled.

## 4. Selected-Glider Scope

Temporal Greedy plans only for the currently selected glider.

When the player runs Temporal Greedy:

- the selected glider's route is replaced or set
- non-selected glider routes are preserved
- other glider plans influence depletion and collision constraints
- other gliders are not replanned

This behavior keeps Temporal Greedy useful inside ordinary multi-agent manual planning. A player can plan Glider 01 manually, select Glider 02, run Temporal Greedy, and expect Glider 01's waypoints to remain unchanged.

## 5. Greedy Planning Loop

Temporal Greedy makes one local decision at a time.

```text
while mission time and fuel remain:
    build reachable local candidate set
    reject blocked or invalid candidates
    score feasible candidates
    choose the best next candidate
    append it as the next waypoint
    update time, fuel, position, and depleted value
```

The important rule is that candidate evaluation does not mutate the accepted route. Time, fuel, position, sampled cells, and priority-target claims are updated only after a candidate is selected and committed.

## 6. Scoring

Temporal Greedy scores the next move by estimated incremental benefit. A candidate is valuable when it can be reached safely and produces useful sampled value for the selected glider.

The score considers:

- sample value collected along the path
- endpoint/sample value
- active Gold Star priority targets
- travel time
- fuel and energy cost
- terrain blocking and reachability
- static hazards, mobile hazards, depth, and shoreline risk
- stochastic uncertainty in forecast mode
- depleted value from prior samples and other gliders' planned paths
- duplicate sampling conflicts
- approximate same-cell/time-window conflicts with other gliders

Gold Stars are high-value temporal priority targets. ROI cells contribute accumulated route value when the glider samples or passes through the route footprint. Temporal Greedy should not choose a waypoint solely because the endpoint is high value if the route to that endpoint is blocked, unsafe, too expensive, or already depleted.

## 7. Horizon-Filling Behavior

Temporal Greedy should try to use the selected glider's available mission time and fuel when feasible.

It should not stop just because nearby high-value targets are gone. If the strongest targets are depleted or unsafe, it can broaden to:

- lower-value reachable cells
- unsampled cells
- safe continuation moves
- repositioning moves
- current-assisted moves

Normal stop reasons are:

```text
mission_time_exhausted
fuel_exhausted
no_reachable_feasible_candidates
no_safe_forecast_feasible_candidates
no_executable_route_after_validation
planner_generated_blocked_segment
max_iterations_guard
cancelled
error
```

`max_iterations_guard` is a diagnostic safeguard, not a desired normal result.

## 8. Multi-Agent Awareness

Temporal Greedy is selected-glider only, but fleet-aware.

Before planning the selected glider, the planner reads non-selected gliders' existing waypoint lists and estimates:

- cells already planned for sampling
- sampled route/path footprints
- priority targets likely to be claimed
- same-cell/same-time-window conflicts

Those existing commitments seed a temporary depletion and conflict state. The selected glider scores candidates against remaining value after those claims.

Important distinction:

```text
Other glider paths deplete value. They are not terrain.
```

The selected glider may travel through depleted cells if needed, but it should not receive full duplicate sampling value for those cells. Same-cell/same-time-window conflicts are rejected or penalized by a practical approximation.

## 9. Route Validation

Temporal Greedy must not rely on simulation as the first invalid-route detector.

ANCHOR uses a cellular map for environmental sampling, but glider route commands are continuous waypoint-to-waypoint movements. Terrain, depth, current, ROI, and risk are sampled from grid cells along a continuous segment; the glider is not required to follow Manhattan-style cell hops or a 4-neighbor grid path.

Current-aware candidate scoring goes through the same current sampling path used by mission simulation, map hover diagnostics, Travel Cost, Risk/Safety, and the Flow Field demos: `src/core/currents/CurrentFieldSampler.js`. The sampler reports topology-aware shoreline risk, so current pushing into nearby land raises candidate cost/risk before simulation. Temporal Greedy still plans commanded waypoint movement; it does not treat mission gliders as passive current particles.

Before committing a candidate, it should reject:

- endpoints on land or outside the map
- unreachable cells
- dead-zone cells
- continuous segments that intersect terrain or blocked shallow/depth cells
- moves that exceed remaining mission time
- moves that exceed available fuel
- forecast-risk candidates that are unsafe near shoreline or low-confidence currents
- obvious selected-glider conflicts with other planned glider occupancy

After generating the selected-glider route, ANCHOR runs route validation before accepting the route into the active plan. The Play button also runs pre-simulation validation. The current worker-compatible path returns validation diagnostics with the planner result; if validation fails, the generated route is not installed as a valid plan.

```text
Simulation should not be the first system to discover a Temporal Greedy route is invalid.
```

If validation fails, the route is rejected, truncated to a valid prefix only when that path is explicitly handled, or reported with a clear stop reason such as `no_executable_route_after_validation` or `planner_generated_blocked_segment`.

## 10. Stochastic Mode

Temporal Greedy must not cheat in stochastic missions.

It may use:

- forecast-visible currents
- forecast confidence
- visible ROI probability and expected value
- known terrain, hazards, and depth
- revealed surface observations

It should not use:

- hidden truth
- unrevealed future current realization
- oracle datasets
- hidden stochastic target outcomes

When current is unknown near land or other risky shoreline conditions, Temporal Greedy should act conservatively. In practice this means rejecting the candidate or applying a strong risk penalty.

## 11. Worker / Responsiveness

Temporal Greedy can run through a Web Worker or worker-compatible async path so the UI remains responsive.

The Planning Console should:

- disable the Temporal Greedy button while planning is running
- show a planning or running label
- ignore duplicate clicks
- track the active planner request id
- apply the result only once, and only if it matches the current request
- clear the busy state after success, failure, or cancellation

The planner request and response should remain serializable. DOM nodes, Phaser scene instances, functions, and UI objects should not be passed into the worker.

## 12. Comparison Role

Temporal Greedy is part of ANCHOR's research and teaching workflow as a browser-native baseline.

Compare it against:

- manual planning
- random walk or naive baselines
- cost-aware greedy planners
- external Python and Colab solvers
- Node headless solvers
- future beam search planners
- future receding-horizon planners
- future RL/ML planners
- future optimization methods such as MILP or ILP

Debrief can compare manual, Temporal Greedy, and imported-solver results when those runs are available. Temporal Greedy should be treated as a quick reference route, not as the expected best route.

## 13. Limitations

Temporal Greedy has known limitations:

- local greedy decisions can miss better long-term routes
- it is not globally optimal
- it can be sensitive to scoring weights
- it may be conservative in stochastic risky areas
- it depends on strong validation to avoid blocked paths
- it does not solve coordinated fleet optimization globally
- collision avoidance is currently an approximate cell/time-window check, not continuous multi-vehicle separation
- time-aware depletion is conservative when full per-window value accounting is not available

These limitations are acceptable for a baseline planner. They are also useful teaching points: simple local planning is fast and understandable, but deeper methods can do better.

## 14. Future Planner Directions

Future planner work can build beyond Temporal Greedy with:

- receding-horizon planners
- beam search
- Monte Carlo Tree Search
- MILP/ILP optimization
- risk-aware graph search
- RL policies
- supervised/imitation planners
- external solver notebooks
- Node.js headless solver automation
- shared-folder or local-bridge solver workflows
- oracle benchmarking for research only

Those methods should be compared against Temporal Greedy to show what additional complexity buys in route quality, robustness, and mission score.
