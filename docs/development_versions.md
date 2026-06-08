# Development Versions and Project State

## Purpose

This document records major development milestones, architectural decisions, experimental features, and known limitations for contributors. It is not an end-user release changelog.

Update it after substantial refactors so future work starts from the current project state instead of old scaffolding.

## Current Development State

ANCHOR is a static browser-first Phaser 3 game and simulator. The active shell is the Mission Console + Phaser Simulator Viewport + Waypoint Timeline. The browser game is the authoritative validator, simulator, and scorer. External solvers propose JSON plans; ANCHOR validates, simulates, scores, and exports results.

The current app supports tutorials, deterministic and stochastic generated challenges, Mission Briefing, waypoint planning, continuous route validation, simulation playback, Debrief comparison, local leaderboard/best-path records, dataset export, JSON solver contracts, optional Python/Colab templates, and optional Node.js headless solver tools.

## Challenge Mode vs Simulation Lab

ANCHOR has two user-facing experiences built on the same mission engine.

Challenge Mode is the playable planning-puzzle experience. It emphasizes score, stars, medals, route quality, risk warnings, leaderboard comparison, and learning strategy through play.

Simulation Lab is the reproducible experiment sandbox. It emphasizes exact configuration, deterministic/stochastic setup, dynamic current-field metadata, solver packets, replay seeds, external solver workflows, JSON import/export, and auditability.

Both modes use the same terrain, current fields, hazards, glider physics, scoring core, route validation, planner APIs, and replay/export system. `experienceMode` is persisted as metadata in scenario state and exports; it must not fork simulation mechanics.

Challenge Mode also persists `missionMode`. Mission modes are player-facing objective presets such as Survey Sweep, Signal Hunt, Plume Intercept, Danger Run, and Long Glide. They map to shared technical defaults for sample-field behavior, current-field behavior, sampling rules, scoring weights, route-grade weights, and replay/export metadata. Simulation Lab remains the detailed configuration path.

## Version / Milestone Log

### v0.1 - Static Browser Shell And Phaser Map

- Established vanilla JavaScript static hosting with no backend requirement.
- Adopted Phaser 3 for scene lifecycle, map rendering, pointer input, overlays, animation, and simulator viewport polish.
- Kept simulation, planning, generation, schemas, IO, and evaluation in framework-independent `src/core` modules.

### v0.2 - Mission Planning Workspace

- Added Mission Console, center Phaser map, right Waypoint Timeline, compact selected-glider HUD, and bottom time controls.
- Added Mission Briefing before tactical map reveal.
- Added selected-glider waypoint placement, deletion, reordering, same-cell waypoint stacking, and planning markers.
- Added generated challenge setup for map size, agents, duration, surfacing, fuel, currents, hazards, terrain, ROI, forecast controls, and priority targets.

### v0.3 - JSON Import / Export Contracts

- Standardized `anchor.challenge`, `anchor.solverPacket`, `anchor.plan`, `anchor.plan-segment`, `anchor.surfaceObservation`, `anchor.result`, `anchor.leaderboard`, and `anchor.oracleDataset` products.
- Kept solver exchange file-based and static-host compatible.
- Restored Mission Editor as a first-class Simulation Lab tool and added custom `anchor.challenge` export/import paths with optional attached best-path history.
- Added explicit fairness metadata for forecast, truth, and oracle-assisted plans.
- Preserved `surfaceUpdateBundle` as metadata while using explicit plan/segment imports for live recovery.

### v0.4 - Replay Seed Contract And Best Path Records

- Added UUID/instance identity as replay seed anchor metadata for generated challenges and saved attempts.
- Added `anchor-generator-v1` as the current generator version contract.
- Added derived seed metadata for namespaces such as terrain, currents, ROI, hazards, depth, targets, forecast, truth, and mission.
- Added local leaderboard and best-path records with saved plan/result blobs when available.
- Hardened leaderboard metadata so Challenge Mode and Simulation Lab can share storage while separating high-score and benchmark scopes by `experienceMode` / `leaderboardScope`.
- Added explicit import behavior for custom challenge packages: play in Challenge Mode, open in Simulation Lab, edit in Mission Editor, and merge attached history only on user action.
- Added replay diagnostics that distinguish exact replay via snapshot, exact replay via UUID contract, approximate replay, and unavailable replay.

### v0.5 - External Solver Templates

- Added dependency-light Python example solver and Colab notebook template.
- Added Node.js headless solver and headless validation tools that import portable core modules without Phaser or DOM dependencies.
- Documented the contract: Colab/Node/Python propose, ANCHOR validates, ANCHOR simulates, ANCHOR scores.
- Kept hidden truth out of fair solver packets unless oracle mode is explicit.

### v0.6 - Greedy Planner Refactor

- Reframed Greedy Planner as a browser-native selected-glider baseline, not a fleet-wide optimizer.
- Preserved non-selected glider routes while treating their planned coverage as depleted value/constraints.
- Added worker-compatible async execution and planner busy-state handling.
- Added validation-before-append and final route validation before accepting generated routes.
- Added route diagnostics and stop reasons for blocked or unexecutable planner output.

### v0.7 - Continuous Route Semantics And Diagnostics

- Clarified that the grid is an environmental sampling layer, not a Manhattan movement graph.
- Route preview, planned route rendering, Greedy Planner, Travel Cost, validation, and simulation diagnostics use continuous waypoint-to-waypoint segment checks against grid-derived terrain/risk fields.
- Added shared `route_validation_diagnostic` output for Planning, Simulation, plan import, headless validation, and external solver feedback.
- Separated visible route geometry from diagnostic traversal cells so route overlays remain waypoint-to-waypoint while scoring and diagnostics still inspect sampled cells.

### v0.8 - Dynamic Topology-Aware Current System

- Expanded current fields from simple visual flow arrows into a topology-aware dynamic environment model.
- Added synthetic coastal-aware composite currents with seeded regional behavior for open water, shoreline, channels, bays/pockets, and island-adjacent wakes.
- Added continuous dynamic evolution, magnitude pulses, moving structures, Low/Medium/High dynamic complexity, and terrain-aware boundary effects.
- Current samples now carry planning-relevant metadata such as dominant behavior, topology region, shore distance, current toward land, shoreline risk, topology adjustment, hazard exposure, and confidence.
- Travel Cost, Risk/Safety, route diagnostics, simulation drift, hover tooltips, solver exports, and Greedy Planner all use the shared current sampler path.
- Greedy Planner and route validation now treat terminal over-duration waypoints as valid carry-through instructions so missions remain active until the time limit.

### v0.9 - Challenge Mode, Mission Modes, Dynamic Sampling, And Waypoint Semantics

- Expanded ANCHOR into a two-experience system: Challenge Mode for playable planning puzzles and Simulation Lab for reproducible experiments.
- Added Mission Mode presets that map research concepts such as coverage planning, informative path planning, event interception, and energy-aware routing into player-facing objectives.
- Split Challenge Mode setup into a Mission Mode Gallery for browsing objective cards and a selected-mission briefing/detail screen for strategy, setup summary, environment summary, and launch.
- Added `sampleFieldConfig` metadata and generated sample-field behaviors for static, hotspot, burst, moving, current-advected, random, neighbor-coupled, plume, channel, gradient, and texture-like value fields where configured.
- Added segment contribution grades and route-quality summaries so manual, Greedy Planner, and imported-solver routes can be explained with the same vocabulary.
- Added explicit waypoint semantics for `navigation`, `surface`, `samplingTarget`, and `terminalCarryThrough` waypoints, while preserving old plans by defaulting missing kinds to `navigation`.
- Added semantic timeline events for navigation intent, surface/update windows, sampling targets, and terminal carry-through outcomes while preserving existing `waypointReached` and `missedWaypoint` events.
- Added navigation uncertainty config, seeded cone metadata, and cone-aware route grading as a first pass. This is not yet a full true-position-vs-believed-position underwater navigation simulator.

## Current Stable Concepts

- Browser game remains authoritative for validation, simulation, scoring, and player-facing results.
- JSON contracts are the external solver API.
- Solvers propose; ANCHOR validates; ANCHOR simulates; ANCHOR scores.
- Core modules should remain independent from Phaser scenes and DOM UI.
- UUID/instance identity is used as replay seed anchor metadata.
- `generationVersion: "anchor-generator-v1"` is the current deterministic generation version label.
- `experienceMode` frames the UI as Challenge Mode or Simulation Lab while sharing the same mission engine.
- `missionMode` is a Challenge Mode objective preset, not a separate physics/scoring engine.
- `sampleFieldConfig` describes generated sample-value behavior when present.
- Waypoint `kind` values distinguish navigation commands, surface/update points, sampling targets, and terminal carry-through commands.
- Route-quality and segment contribution grades are explanatory diagnostics for player feedback, debrief, result exports, and solver comparison.
- Greedy Planner plans only for the selected glider.
- Route preflight validation is required before Execute and before accepting planner output.
- Forecast/truth/oracle fairness metadata must be preserved in plans, results, and leaderboard records.
- Leaderboard attempts should preserve route source, solver labels, fairness labels, and scenario fingerprints for both Challenge Mode high-score comparison and Simulation Lab benchmark comparison.

## Experimental Concepts

- Greedy Planner robustness in difficult stochastic/generated missions.
- Regeneration-only exact replay when a saved snapshot is missing.
- Shared-folder solver exchange and local bridge automation.
- Advanced stochastic surface-update automation.
- External current-field ingestion.
- Stronger baseline solvers beyond greedy.
- Full true-position-vs-believed-position dead-reckoning simulation beyond current cone-aware grading.

## Known Limitations

- Greedy Planner is a fast baseline, not a global optimizer.
- Current fields are synthetic ocean-inspired gameplay fields, not validated CFD, HYCOM, or operational forecasts.
- Navigation uncertainty is currently configuration, semantic surfacing metadata, seeded cone diagnostics, and route-grade penalty input; it is not a complete underwater navigation state estimator.
- Route-block diagnostics are improving and may still need better explanations for rare edge cases.
- The Colab/Python solver is a template, not a full optimizer or simulator.
- The Node headless solver is a portable baseline/validation path, not the official scorer.
- Shared-folder and local-bridge solver automation are future work.
- Browser-only hidden truth is not cryptographically secure; stochastic secrecy is educational and cheat-resistant only.
- Exact replay prefers saved snapshots. UUID + config regeneration requires compatible generator version and complete replay seed metadata.

## Developer Notes

- Update this document after major refactors.
- Do not claim future features are implemented.
- Keep links aligned with actual files:
  - [game_design.md](game_design.md)
  - [solver_workflow.md](solver_workflow.md)
  - [export_formats.md](export_formats.md)
  - [greedy_planner.md](greedy_planner.md)
  - [temporal_greedy.md](temporal_greedy.md)
  - [testing.md](testing.md)
  - [../tools/js/README.md](../tools/js/README.md)
  - [../tools/python/README.md](../tools/python/README.md)
