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