# Current Runtime Baseline

## Current production runtime

- `src/game/main.js` starts the browser app from `index.html`.
- Phaser owns scene routing and lifecycle while the migration remains incremental.
- `MainMenuScene` is the product hub.
- `MissionBriefingScene` owns briefing.
- `MissionWorkspaceScene` owns Planning lifecycle.
- `SimulationScene` owns Simulation lifecycle.
- `DebriefScene` owns Debrief lifecycle.
- Three.js is the normal mission-world renderer and interaction surface for Planning and live Simulation.
- THREE-R1.2A adds operational 2.5D water-column slabs, depth-aware currents/observations/dive trajectories, water-column camera presets, and `ANCHOR_WATER_COLUMN_RENDER_DEBUG`. THREE-R1.2A.1 makes generated missions default to canonical synthetic multi-layer water-column config, keeps imported legacy JSON in explicit surface-only fallback, and hardens Three scene cleanup. Three.js still renders public-safe view models only; simulation, scoring, route validation, observation generation, and canonical planning remain outside the renderer.
- THREE-R1.1 stabilizes the Three Mission Workspace runtime: renderer startup errors are captured in `ANCHOR_MISSION_RENDER_DEBUG`, pointer conversion uses the actual canvas rect in CSS pixels, and drop-zone deployment selection goes through the canonical selected-start path. THREE-R1.1C repairs end-to-end waypoint placement after deployment and standardizes mouse gestures: left click for the active planning action, left drag pan, right drag orbit, and wheel zoom. THREE-R1.1D adds a transaction-backed Execute -> Simulation launch payload and digest chain while keeping Three.js out of simulation authority. THREE-R1.1E adds scene isolation cleanup, pose/guidance parity helpers, shared coordinate helpers, and mission-window waypoint warnings.
- The legacy Phaser tactical map is a diagnostic/fallback renderer only, enabled by `?legacyPhaser=1`.
- GitHub Pages uses the checked-in vendor runtime under `vendor/three/` through the `index.html` import map.

## Reverted experiment

- MIG-R2 and MIG-R2.2 DOM routing were reverted from the production path.
- `src/app/main.js` is not the production entry point.
- `AnchorBrowserRuntime` is not the active architecture.
- Hash routing and DOM route views are not the current product shell.
- New work should not build on the reverted DOM routing implementation.

## Migration direction

- Preserve the existing visible product flow: Main Menu, Mission Setup, Mission Briefing, Planning, Simulation, Debrief, Mission Console, right waypoint panel, timeline, status strip, and performance strip.
- Make Three.js own mission-world rendering and mission-world pointer interaction.
- Keep simulation, science, planning, scoring, and replay logic renderer-independent.
- Remove Phaser only incrementally after exact visual, interaction, and validation parity is proven.
- No all-at-once router replacement is planned for the current architecture.

## Depth-Aware Scoring Baseline

The active runtime keeps simulation and scoring authority in the portable core. `src/core/science/DepthAwareScienceValue.js` and `src/core/science/DiveProfileFeasibility.js` are renderer-neutral. Three.js consumes public state and debug summaries but does not own field generation, feasibility, simulation, or scoring.
