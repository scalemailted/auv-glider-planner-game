# Testing

The browser game does not require npm, Playwright, or a build step for normal use. Normal local serving still works with:

```bash
python -m http.server 8000
```

Playwright is optional and intended for development smoke testing.

Greedy Planner is useful for planner smoke checks because it should return promptly, preserve non-selected glider routes, and validate before simulation. See `docs/greedy_planner.md` for the expected selected-glider baseline behavior.

The main menu should expose two top-level accordions: `Challenge Mode` and `Simulation Lab`. Challenge Mode should contain `Play`, `Learn`, and `Compete` visual subsections. Simulation Lab should contain `Experiments`, `Demos`, `Editor & Import Tools`, and `Benchmarks`. Field demos live inside Simulation Lab, not as a separate top-level section. Use `docs/flow_fields_demo.md` when validating `F(x,y,t)` current vectors, static/dynamic fields, additive layers, partition behavior, terrain boundary effects, and topology-aware shoreline risk. Use `docs/sample_fields_demo.md` when validating `L(x,y,t)` event likelihood, `S(x,y,t)` sample value, pure sample-value spatial fields, spatial parameters, temporal patterns, spatial evolution, Time-Indexed/Frequency-Based/State-Evolving/History-Aware state models, sampling effects, and freshness/revisit displays. Use `docs/coupled_fields_demo.md` for `F + S` current-dependent sample behavior. Use `docs/uncertainty_forecast_demo.md` for `U(x,y,t)`, forecast/truth mismatch, uncertainty, information gain, forecast error, and update effects.

## Challenge Mode vs Simulation Lab

ANCHOR has two user-facing experiences built on the same mission engine.

Challenge Mode is the playable planning-puzzle experience. It emphasizes score, stars, medals, route quality, risk warnings, leaderboard comparison, and learning strategy through play.

Simulation Lab is the reproducible experiment sandbox. It emphasizes exact configuration, deterministic/stochastic setup, dynamic current-field metadata, solver packets, replay seeds, external solver workflows, JSON import/export, and auditability.

Both modes use the same terrain, current fields, hazards, glider physics, scoring core, route validation, planner APIs, and replay/export system. Smoke tests should confirm the main menu exposes only the Challenge Mode and Simulation Lab top-level accordions, Tutorials appear under Challenge Mode, field demos and Mission Editor appear under Simulation Lab, Challenge setup presents the left Mission Mode Navigator plus selected center briefing, selecting a mission updates the briefing without duplicating cards in the center, Generate Mission reaches the workspace, Simulation Lab setup keeps the detailed technical controls visible, Simulation Lab exposes Import / Export Tools / External Solver Evaluation / Benchmark Leaderboard, Challenge Mode exposes Play Custom Challenge, and launching either mode reaches the same mission workspace/simulation engine path.

## Segment Contribution Grades

Route-quality testing should include at least three manual plans:

- a low-immediate-value setup segment that improves access to a future Gold Star or high-value ROI region
- a hazardous shortcut that collects value but crosses hazard/shoreline risk
- a terminal carry-through segment that extends command coverage to mission end

The first should receive future setup credit, the second should receive risk penalties, and the third should be graded as carry-through coverage rather than invalid. Debrief should show 3-hour block summaries, and result JSON should include `routeQuality`.

## Waypoint Semantics Checks

Waypoint tests should confirm old plans default to `kind: "navigation"`, normal map clicks show `Navigation`, surface/update waypoints emit `surface_update` events with `gpsFix: true`, Gold Star/planning-marker objectives are labeled as `Sampling Target`, and Greedy Planner over-duration final waypoints are `terminalCarryThrough` with `runtimeBehavior: "truncate_at_mission_end"`.

## Dynamic Sample Field Checklist

Manual sample-field checks should cover:

- Mission Mode selection persists into generated level/mission metadata;
- Challenge Mode opens with the left mission-mode navigator and a selected mission briefing in the center, not the technical setup grid;
- selecting a mission in the left navigator updates only the selected briefing/detail screen;
- the center briefing does not duplicate the full mission list;
- the right setup panel shows Mission Snapshot or is hidden, never Mission Waypoints;
- Challenge Mode presets choose sample-field/current/scoring defaults without forking the mission engine;
- Simulation Lab exposes the detailed sample-field controls directly;
- Sample / ROI Field Demo can regenerate seeded sample-value fields and dynamic value fields, and its controls separate Behavior Preset, Event Likelihood Field, Spatial Pattern, Value Distribution, Spatial Parameters, Temporal Pattern, Spatial Evolution, State Model, Sampling Effects, and Display;
- Sample / ROI Field Demo Behavior Preset includes Custom plus Recurring Hotspots, Migrating Patch, Expanding Front, Patchy Rainfall, Drifting Storm Cells, Freshness / Revisit Value, Neighbor Spread, Oscillating Ecological Field, Forest Fire Front (inspired), and Life-Like Cellular Emergence (inspired);
- selecting a Sample / ROI behavior preset updates the primitive controls, choosing Custom preserves editable primitive controls, modifying a primitive after selecting a preset marks it as modified, and Export Demo JSON includes `behaviorPreset` metadata;
- Sample / ROI Field Demo event likelihood fields include Uniform Likelihood, Gaussian Likelihood, Multi-Modal Likelihood, Gradient Likelihood, Patchy Likelihood, Seeded Texture Likelihood, and Sparse Candidate Sites, and can be static or dynamic as `L(x,y,t)`;
- Sample / ROI Field Demo spatial patterns are the final pure sample-value geometry set: Constant Field, Gradient / Trend, Clustered Field, Patchy / Correlated Field, Sparse Targets, Linear Band, Front / Boundary, Boundary Band, Monitoring Stations, and Seeded Texture;
- Sample / ROI Field Demo value distributions include Constant Value, Uniform Random, and Gaussian / Normal; Constant Field plus Uniform Random is not the same as Constant Field plus Constant Value;
- Sample / ROI Field Demo exposes Stationary, Continuous Drift, Discrete Jump, Random Walk, and Neighbor Propagation as spatial evolution options;
- Sample / ROI Field Demo exposes Motion Scope as Per Feature, Local / Neighborhood, and Global, with Per Feature as the default for old continuous-drift/random-walk configs;
- Sample / ROI Field Demo Continuous Drift and Random Walk do not shift the whole field globally unless Motion Scope is explicitly Global;
- Sample / ROI Field Demo exposes `Clustered Field` plus Cluster Count and Cluster Size rather than separate Single Cluster, Bimodal, and Multiple Clusters options;
- Sample / ROI Field Demo left panel shows compact controls and Explain buttons, not expanded behavior explainer bodies;
- Sample / ROI Field Demo right panel switches between Cell Inspector and Behavior Help;
- Sample / ROI Field Demo Behavior Help supports Behavior Preset, Event Likelihood Field, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, State Model, Sampling Effect, and Display Layer, and includes a Current Composition summary that routes current-coupled/uncertainty concepts to the Coupled Fields and Uncertainty / Forecast demos;
- Sample / ROI Field Demo inspector reports Event Likelihood `L(x,y,t)` separately from Observed Sample Value `S(x,y,t)`, plus Pattern Composition, value distribution, seeded-value status, value band, and pattern-relevant parameters;
- Sample / ROI Field Demo Display Layer includes Event Likelihood and Sample Value + Likelihood Overlay, and switching to Event Likelihood renders the same `eventLikelihoodField` that drives event origins, jumps, walks, and propagation;
- Sample / ROI Field Demo labels selected behavior as Time-Indexed, State-Evolving, or History-Aware in the inspector;
- Sample / ROI Field Demo does not expose Forecast, Truth, Uncertainty, or current-coupled controls;
- generated missions preserve `sampleFieldConfig` when configured;
- scrubbing mission time changes temporal sample fields such as periodic, burst, moving, propagating, or seeded texture-like patterns where selected;
- Coupled Fields Demo, not the sample-only demo, covers current-advected sample behavior;
- Uncertainty / Forecast Demo exposes Forecast, Truth, Uncertainty, Information Gain, Forecast Error, and Delta After Update views;
- Uncertainty / Forecast Demo click/update actions reduce uncertainty and report observation state in the Cell Inspector;
- Gold Star / priority targets remain separate from ROI cells and are labeled as sampling targets or objectives rather than GPS waypoint truth;
- solver packets and result exports preserve visible sample-field metadata while fair stochastic packets omit hidden truth.

## Core Development Checks

Leaderboard checks should cover:

- Challenge Mode attempts save with `experienceMode: "challenge"` and `leaderboardScope: "challenge"`;
- Simulation Lab attempts save with `experienceMode: "simulationLab"` and `leaderboardScope: "simulationLab"`;
- manual, Greedy Planner, external solver, imported plan, and saved replay attempts display route-source labels;
- truth/oracle-assisted imported plans display fairness labels and do not look like unlabeled fair manual runs;
- old leaderboard records without scope/source metadata still load and default to Challenge scope;
- scenario fingerprints remain stable for the same UUID/config/generator-version benchmark.

Custom challenge import/export checks should cover:

- Mission Editor exports raw `anchor.level`, `anchor.challenge`, and optional challenge-plus-history packages;
- custom challenge packages preserve `customScenario`, `sourceMetadata`, `leaderboardScope`, and replay seed metadata;
- Import Challenge JSON summarizes attached best-path history without merging it automatically;
- Play in Challenge Mode sets `experienceMode: "challenge"`;
- Open in Simulation Lab sets `experienceMode: "simulationLab"`;
- Import Attached History merges only the attached leaderboard snapshot for packages that include one.

After JavaScript changes, run:

```bash
npm.cmd run check
```

On non-Windows shells, the equivalent is:

```bash
npm run check
```

This runs `node tools/check-js.mjs`, which checks JavaScript syntax/import health and validates sample JSON parsing.

## Optional E2E Setup

Install development dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install
```

Run smoke tests:

```bash
npm.cmd run test:e2e
```

Run headed:

```bash
npm.cmd run test:e2e:headed
```

The smoke spec starts a small Node static server on `127.0.0.1:9321` for tests only. This server is not part of normal gameplay and does not change the static-hosting model.

## Current Smoke Coverage

The e2e smoke tests verify:

- app loads
- main menu appears
- Flow Fields Demo opens, switches demo modes, and enables an additive layer
- ROI Generator Demo opens, switches distributions, regenerates, and returns to main menu
- level select opens
- Tutorial 01 starts
- mission briefing appears
- planning scene appears
- plan export button exists
- a waypoint can be added
- simulation can finish
- debrief appears
- level generator opens

These tests avoid pixel-perfect assertions and focus on high-level UI flow.

## Headless Solver Checks

The optional Node.js solver path should remain Phaser/DOM-free. A local sample loop is:

```bash
node tools/js/headless_solver.mjs tools/js/examples/sample_solver_packet.json %TEMP%/anchor.headless.plan.json --debug
node tools/js/headless_validate_plan.mjs tools/js/examples/sample_solver_packet.json %TEMP%/anchor.headless.plan.json
```

On Unix-like shells, use a temporary path such as `/tmp/anchor.headless.plan.json`.

Expected behavior:

- the solver writes an importable `anchor.plan`;
- default metadata is forecast-only and non-oracle;
- validation reports shared route diagnostics when the plan is invalid;
- the browser remains the authoritative simulator and scorer.

## Greedy Planner Robustness Checklist

Manual planner checks should cover:

- selected-glider-only planning; non-selected glider routes remain unchanged;
- other glider routes reduce remaining/depleted value but are not treated as terrain;
- planner busy state prevents duplicate runs;
- worker fallback does not change the accepted plan shape;
- every generated segment is checked before append;
- final route audit runs before accepting the generated plan;
- terminal carry-through waypoint exceeds mission duration when safe feasible movement remains;
- over-duration terminal waypoint is a warning, not an Execute blocker;
- blocked output reports a stop reason such as `no_reachable_feasible_candidates`, `no_executable_route_after_validation`, or `planner_generated_blocked_segment`;
- the right Waypoint Timeline and Mission Console do not show a generated blocked route as valid.

## Dynamic Current / Topology Checklist

Manual current checks should cover:

- static fields stay fixed while particles move through them;
- dynamic fields continue changing direction and magnitude over mission time;
- High dynamic complexity has visibly stronger direction/magnitude variation than Low;
- same challenge UUID/config/generation version reproduces the same current field;
- a different challenge UUID produces different seeded variation;
- `Topology-Aware Composite` reports open water, shoreline, island-adjacent, channel, and bay/pocket behavior where the terrain supports them;
- shoreline current into land raises shoreline risk and is damped/deflected when boundary mode requires it;
- channel flow aligns with the estimated channel axis instead of rotating randomly through land;
- bay/pocket flow is more contained than open water unless intentionally configured;
- `globalThis.ANCHOR_DEBUG_TOPOLOGY_CURRENT_AUDIT = true` logs `[CurrentAudit][RegionStats]` and suspicious-sample warnings;
- hover tooltip, Travel Cost, Risk/Safety, Greedy Planner, and simulation use the same current sampler metadata.

## Manual Smoke Checklist

When time allows, run a browser smoke pass:

- tutorial campaign start, planning, simulation, and debrief;
- Flow Fields Demo and ROI Generator Demo open from the `Demos` section and return to Main Menu;
- deterministic generated challenge;
- stochastic generated challenge with forecast controls;
- level generator and Environment Editor import/export;
- plan import/export and invalid-plan rejection;
- solver packet export and external plan import;
- surface observation export and plan-segment import;
- best-path overlay, rerun, load-as-plan, and export;
- leaderboard import/export;
- dataset export.
