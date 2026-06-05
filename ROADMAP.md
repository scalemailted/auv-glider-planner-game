# Roadmap

This roadmap tracks likely next development directions for **ANCHOR: Glider Command**. It is not a claim that future items are implemented.

For the current development-state log, see [docs/development_versions.md](docs/development_versions.md).

## Implemented Foundation

- Static browser-first Phaser 3 shell with Mission Console, Phaser Simulator Viewport, and Waypoint Timeline.
- Mission briefing, planning, simulation, debrief, tutorial, generated challenge, level editor, leaderboard, and dataset export flows.
- JSON import/export contracts for challenges, solver packets, plans, plan segments, surface observations, results, leaderboards, and oracle datasets.
- Continuous waypoint-to-waypoint route semantics with grid-based environmental sampling and route-block diagnostics.
- Selected-glider Temporal Greedy baseline with worker-compatible execution and pre-simulation validation.
- Browser-local best-path records with replay metadata, ghost-path overlay, rerun, load-as-plan, and export controls.
- UUID replay seed contract metadata for generated challenges and saved attempts.
- Optional Python/Colab and Node.js external solver paths.

## Near-Term Priorities

- Continue hardening Temporal Greedy against edge cases in generated stochastic missions.
- Expand deterministic stress tests for route validation, Temporal Greedy, and imported plan rejection.
- Improve replay diagnostics where older records lack snapshots, generation config, or generator version metadata.
- Keep docs and schemas synchronized as solver packet and result metadata evolve.
- Improve manual QA coverage for large maps, multi-drop-zone deployment, and route-failure recovery.

## Experimental / Future Work

- Shared-folder or local watcher workflow for solver exchange.
- Optional local HTTP bridge for external solvers.
- Stronger external solver examples such as A*, time-expanded graph search, beam search, or receding-horizon planning.
- More robust stochastic surface-update automation.
- Imported external current-field providers, if clearly labeled and validated.
- Broader replay regeneration from UUID + config when no snapshot is available.
- Classroom analytics or optional backend leaderboard.

## Non-Goals For The Current Static App

- No React, TypeScript, frontend framework migration, backend requirement, or build step for normal play.
- No claim that synthetic currents are validated CFD, HYCOM, or operational ocean forecasts.
- No in-browser arbitrary solver-code execution.
- No multiplayer/account system in the current app.
