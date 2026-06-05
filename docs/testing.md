# Testing

The browser game does not require npm, Playwright, or a build step for normal use. Normal local serving still works with:

```bash
python -m http.server 8000
```

Playwright is optional and intended for development smoke testing.

Temporal Greedy is useful for planner smoke checks because it should return promptly, preserve non-selected glider routes, and validate before simulation. See `docs/temporal_greedy.md` for the expected selected-glider baseline behavior.

The `Demos` menu section contains isolated concept scenes for validating field behavior before debugging full missions. Use `docs/flow_fields_demo.md` when validating static/dynamic fields, blend or partition behavior, terrain boundary effects, and topology-aware shoreline risk. Use `docs/roi_generator_demo.md` when validating seeded ROI/value distributions, hotspot clustering, noise, and dynamic value-field behavior.

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
- Flow Fields Demo opens and switches demo modes
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

## Temporal Greedy Robustness Checklist

Manual planner checks should cover:

- selected-glider-only planning; non-selected glider routes remain unchanged;
- other glider routes reduce remaining/depleted value but are not treated as terrain;
- planner busy state prevents duplicate runs;
- worker fallback does not change the accepted plan shape;
- every generated segment is checked before append;
- final route audit runs before accepting the generated plan;
- blocked output reports a stop reason such as `no_reachable_feasible_candidates`, `no_executable_route_after_validation`, or `planner_generated_blocked_segment`;
- the right Waypoint Timeline and Mission Console do not show a generated blocked route as valid.

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
