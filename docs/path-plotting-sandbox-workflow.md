# Path Plotting Sandbox Workflow

This workflow is for experimenting with route planners while keeping ANCHOR static-host compatible. There is no backend control loop: external tools exchange JSON files with the browser game.

## Challenge Mode vs Simulation Lab

ANCHOR has two user-facing experiences built on the same mission engine.

Challenge Mode is the playable planning-puzzle experience. It emphasizes score, stars, medals, route quality, risk warnings, leaderboard comparison, and learning strategy through play.

Simulation Lab is the reproducible experiment sandbox. It emphasizes exact configuration, deterministic/stochastic setup, dynamic current-field metadata, solver packets, replay seeds, external solver workflows, JSON import/export, and auditability.

Both modes use the same terrain, current fields, hazards, glider physics, scoring core, route validation, planner APIs, and replay/export system.

Use Simulation Lab for path-plotting experiments that need deterministic seeds, solver packets, replay contracts, imported flow fields, or audit-heavy route diagnostics. Use Challenge Mode when the same map and engine should be presented as a playable planning puzzle.

Mission Modes are Challenge Mode objective presets. They choose player-facing goals and default technical settings for sample fields, currents, scoring, route grades, and mission rules. They do not fork the terrain, current, scoring, validation, or simulation engine.

## Browser-Only Solver Loop

1. Launch ANCHOR from a static server or GitHub Pages-compatible host.
2. Use Simulation Lab for detailed reproducible setup, or Challenge Mode when testing a playable objective preset.
3. Generate or load a mission.
4. Export `anchor.solverPacket`.
5. Run an external A*, Dijkstra, optimization, ML, RL, Node, Python, or Colab planner against that JSON.
6. Import the planner's `anchor.plan`.
7. Let ANCHOR validate, simulate, score, and export `anchor.result`.

The browser game remains authoritative for validation and scoring. External tools propose plans; they do not bypass route validation, fuel/time checks, current-aware movement, terrain checks, or debrief scoring.

## Fields and Mission Data

Solver packets may include mission-mode metadata, replay seed metadata, mission rules, visible current-field config, visible sample-field config, priority targets, deployment zones, agent specs, terrain, hazards, depth, and forecast-visible ROI/current frames.

Current fields describe movement difficulty: current-aware ETA, speed over ground, energy cost, cross-current risk, and shoreline/topology risk. Sample fields describe where and when science value exists: ROI grids, hotspots, burst windows, temporal behavior, moving/current-advected value, and Gold Star targets.

Fair stochastic packets expose visible forecast/belief data. Hidden truth should only appear in explicit oracle or dataset exports.

## Waypoint Semantics

Path plotting should preserve waypoint semantics. Ordinary route points are `navigation` commands, surface/update points are GPS correction and communication/replan events, Gold Star or ROI notes are `samplingTarget` objectives until converted, and final horizon-filling commands are `terminalCarryThrough` waypoints that truncate at mission end.

Missing waypoint kind defaults to `navigation` for backward compatibility. Imported solvers should include `kind` when intent matters, especially for `surface` and `terminalCarryThrough` waypoints.

## Replay and Reproducibility

Generated challenges preserve a UUID/replay seed contract plus `generationVersion` metadata. The preferred replay hierarchy is:

1. Restore a saved challenge snapshot when available.
2. Regenerate from challenge UUID/replay seed anchor, generation config, and compatible generator version.
3. Mark exact replay unavailable when required replay metadata is missing or incompatible.

Do not use fresh random fields when comparing solver outputs. Solver comparisons are meaningful only when the same challenge UUID, preset/config, and generator version reproduce the same terrain, current field, sample field, hazards, targets, and timing.

## Practical Checks

- Exported plans should echo the active `levelId`, `instanceId`, and `missionId`.
- Imported plans should be treated as invalid until ANCHOR validates them.
- A terminal carry-through waypoint beyond mission duration is valid only when the segment is otherwise legal.
- Result exports may include route quality, segment contribution grades, planned/actual paths, replay diagnostics, and solver comparison metadata.
- `surfaceUpdateBundle` remains metadata scaffolding; live recovery currently uses explicit surface-observation export and plan/segment import.
