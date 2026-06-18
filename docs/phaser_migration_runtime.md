# Phaser Migration Runtime

MIG-R2 separates the normal mission runtime from Phaser.

The active browser entry point is `src/app/main.js`. It creates:

- `AnchorRouter` for hash routes
- `MissionSessionStore` for clone-safe mission state
- `MissionLifecycleController` for setup, briefing, planning, simulation, and debrief transitions
- `AnchorAppShell` for DOM mounting into the existing left/center/right page shell
- DOM views for main menu, mission setup, briefing, planning, simulation, and debrief
- `BrowserMissionSimulationController`, which wraps the shared `SimulationEngine`

The normal route does not instantiate Phaser, call Phaser scene APIs, or use a Phaser update loop. Planning and simulation views build public render view models and pass them to the existing Three.js mission renderer.

Phaser remains available through `LegacyPhaserIslandHost` for older labs, editor screens, and migration reference scenes. The host lazy-loads `vendor/phaser.min.js`, imports the existing Phaser app wrapper, and publishes `ANCHOR_LEGACY_PHASER_DEBUG`. New production mission features should target `src/app/`, `src/core/`, and the Three.js renderer path first.

Debug globals:

- `ANCHOR_APP_RUNTIME_DEBUG`
- `ANCHOR_MISSION_LIFECYCLE_DEBUG`
- `ANCHOR_LEGACY_PHASER_DEBUG`

Focused validation:

```bash
node tools/js/audit_no_phaser_production_runtime.mjs
node tools/js/audit_phaser_deprecation.mjs
node tools/js/smoke_anchor_browser_runtime.mjs
node tools/js/smoke_browser_mission_simulation_controller.mjs
```
