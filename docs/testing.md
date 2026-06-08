# Testing

The browser game does not require npm, Playwright, or a build step for normal use. Normal local serving still works with:

```bash
python -m http.server 8000
```

Playwright is optional and intended for development smoke testing.

Greedy Planner is useful for planner smoke checks because it should return promptly, preserve non-selected glider routes, and validate before simulation. See `docs/greedy_planner.md` for the expected selected-glider baseline behavior.

The `Demos` menu section contains isolated concept scenes for validating field behavior before debugging full missions. Use `docs/flow_fields_demo.md` when validating static/dynamic fields, additive layers, partition behavior, terrain boundary effects, and topology-aware shoreline risk. Use `docs/roi_generator_demo.md` when validating seeded ROI/value distributions, hotspot clustering, noise, and dynamic value-field behavior.

## Challenge Mode vs Simulation Lab

ANCHOR has two user-facing experiences built on the same mission engine.

Challenge Mode is the playable planning-puzzle experience. It emphasizes score, stars, medals, route quality, risk warnings, leaderboard comparison, and learning strategy through play.

Simulation Lab is the reproducible experiment sandbox. It emphasizes exact configuration, deterministic/stochastic setup, dynamic current-field metadata, solver packets, replay seeds, external solver workflows, JSON import/export, and auditability.

Both modes use the same terrain, current fields, hazards, glider physics, scoring core, route validation, planner APIs, and replay/export system. Smoke tests should confirm the main menu exposes both modes, Challenge setup presents a Mission Mode Gallery first, clicking a card opens the selected-mission briefing/detail screen, Back returns to the Gallery, Generate Mission reaches the workspace, Simulation Lab setup keeps the detailed technical controls visible, and launching either mode reaches the same mission workspace/simulation engine path.

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
- Challenge Mode opens with the Mission Mode Gallery, not the technical setup grid;
- selecting a mission card opens only that mission's briefing/detail screen;
- Back to Mission Modes returns to the gallery without losing the selected preset;
- Challenge Mode presets choose sample-field/current/scoring defaults without forking the mission engine;
- Simulation Lab exposes the detailed sample-field controls directly;
- ROI Generator Demo can regenerate seeded hotspot-style fields and dynamic value fields;
- generated missions preserve `sampleFieldConfig` when configured;
- scrubbing mission time changes temporal sample fields such as periodic, burst, moving, current-advected, plume, channel, or texture-like patterns where selected;
- Gold Star / priority targets remain separate from ROI cells and are labeled as sampling targets or objectives rather than GPS waypoint truth;
- solver packets and result exports preserve visible sample-field metadata while fair stochastic packets omit hidden truth.

## Core Development Checks

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
