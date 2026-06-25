# Architecture

## Runtime

- Browser entry: `index.html` -> `src/game/main.js`.
- Phaser: active lifecycle shell, route/scene transition owner, Learning Lab host, and transitional UI orchestration.
- Three.js: production mission-world renderer for planning, simulation, replay, bathymetry/current layers, and editor world presentation.
- Portable core/packages: deterministic bathymetry, current, scalar, environment composition, simulation, replay, export, and validation contracts.

## Validation Ownership

- Production capability coverage and physical split ownership are declared in `tests/e2e/capability_manifest.mjs`.
- `npm.cmd run test:fast` owns deterministic contracts, package boundaries, and repository verification.
- `npm.cmd run test:e2e:smoke` is a compact browser smoke set.
- `npm.cmd run test:e2e` is the release browser regression set.
- `npm.cmd run test:e2e:full` is bounded nonvisual compatibility coverage, not a historical archive.
- `npm.cmd run test:e2e:visual` is headed visual/owner acceptance coverage.

## Static Hosting

Pages copies runtime assets and allowlisted current documentation only. Internal phase notes, test artifacts, owner-review packages, maintenance tools, and archive content are not public deployment inputs.

## Environment Composition

`packages/environment` is the pure composition layer for canonical bathymetry, current, and scalar artifacts. It owns environment identity, role metadata, cross-artifact validation, provenance aggregation, and physical-coordinate sampling. It does not own field generation equations, visibility policy, observation noise, Simulation, scoring, or rendering. See `docs/environment_package.md`.
## Mission Simulation Package

`packages/mission-simulator` owns deterministic mission-state transitions, mission input identity, canonical state snapshots, physics/route-progress helpers, environment sampling, events, observations, terminal evaluation, and raw metric summaries. It consumes frozen `packages/environment` artifacts and does not generate scientific fields. Browser ANCHOR still owns Play/Pause scheduling, Phaser lifecycle, Three.js presentation, route editing, official score aggregation, and replay playback. See `docs/mission_simulator_package.md`.
## Scoring Package

packages/scoring owns official score calculation, ScoreProfile definitions, ScoreInput/ScoreResult contracts, deterministic score digests, public-safe summaries, and score methodology metadata. packages/mission-simulator owns raw mission outcomes; browser/headless/benchmark/result/Debrief adapters consume package ScoreResult metadata. UI displays score but does not calculate it, leaderboard persistence stores digests but does not score, and planner provenance never changes numerical score. See docs/scoring_and_benchmark_contract.md.
