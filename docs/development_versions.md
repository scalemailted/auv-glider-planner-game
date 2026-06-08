# Development Versions and Project State

## Purpose

This document records major development milestones, architectural decisions, experimental features, and known limitations for contributors. It is not an end-user release changelog.

Update it after substantial refactors so future work starts from the current project state instead of old scaffolding.

## Current Development State

ANCHOR is a static browser-first Phaser 3 game and simulator. The active shell is the Mission Console + Phaser Simulator Viewport + Waypoint Timeline. The browser game is the authoritative validator, simulator, and scorer. External solvers propose JSON plans; ANCHOR validates, simulates, scores, and exports results.

The current app supports tutorials, deterministic and stochastic generated challenges, Mission Briefing, waypoint planning, continuous route validation, simulation playback, Debrief comparison, local leaderboard/best-path records, dataset export, JSON solver contracts, optional Python/Colab templates, and optional Node.js headless solver tools.

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
- Added explicit fairness metadata for forecast, truth, and oracle-assisted plans.
- Preserved `surfaceUpdateBundle` as metadata while using explicit plan/segment imports for live recovery.

### v0.4 - Replay Seed Contract And Best Path Records

- Added UUID/instance identity as replay seed anchor metadata for generated challenges and saved attempts.
- Added `anchor-generator-v1` as the current generator version contract.
- Added derived seed metadata for namespaces such as terrain, currents, ROI, hazards, depth, targets, forecast, truth, and mission.
- Added local leaderboard and best-path records with saved plan/result blobs when available.
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

## Current Stable Concepts

- Browser game remains authoritative for validation, simulation, scoring, and player-facing results.
- JSON contracts are the external solver API.
- Solvers propose; ANCHOR validates; ANCHOR simulates; ANCHOR scores.
- Core modules should remain independent from Phaser scenes and DOM UI.
- UUID/instance identity is used as replay seed anchor metadata.
- `generationVersion: "anchor-generator-v1"` is the current deterministic generation version label.
- Greedy Planner plans only for the selected glider.
- Route preflight validation is required before Execute and before accepting planner output.
- Forecast/truth/oracle fairness metadata must be preserved in plans, results, and leaderboard records.

## Experimental Concepts

- Greedy Planner robustness in difficult stochastic/generated missions.
- Regeneration-only exact replay when a saved snapshot is missing.
- Shared-folder solver exchange and local bridge automation.
- Advanced stochastic surface-update automation.
- External current-field ingestion.
- Stronger baseline solvers beyond greedy.

## Known Limitations

- Greedy Planner is a fast baseline, not a global optimizer.
- Current fields are synthetic ocean-inspired gameplay fields, not validated CFD, HYCOM, or operational forecasts.
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
