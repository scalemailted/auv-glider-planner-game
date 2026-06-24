# FLOW-PKG-R1.1 Boot Readiness Closure

FLOW-PKG-R1.1 closes the production boot and grouped E2E synchronization gap before FLOW-PKG-R2.

## What Changed

- Added `src/app/production/AnchorAppBootReadiness.js`.
- Instrumented production boot milestones in `src/game/main.js`, Phaser bootstrap, Phaser game postBoot, MainMenuScene, and the next-shell bootstrap.
- Hardened `tests/e2e/static-server.mjs` with explicit probes for root, Pages subpath, package entries, and vendored Phaser/Three assets.
- Added `tests/e2e/helpers/AnchorRuntimeReadyHarness.js` so browser tests wait for production readiness before route selectors.
- Added focused FLOW-PKG-R1.1 E2E coverage for cold root boot, cold Pages boot, coreMission readiness usage, lazy Main Menu science, repeated boot cleanup, and package-backed current planning.
- Added boot smokes and audits under `tools/js/`.
- Improved grouped Playwright runner diagnostics without changing test selection semantics.

## Findings

The old five-second selector wait was insufficient as the startup authority. It was not a proven production boot failure after the FLOW-PKG-R1 baseline; direct coreMission passed before this phase's edits. The demonstrated blocker was grouped-runner timeout/cleanup diagnostics and fragile selector-first startup waits.

Main Menu still exposes `#main-menu-hub`, but the stable route contract is `data-anchor-route="main-menu"` after `ANCHOR_APP_BOOT_DEBUG.ready=true`.

Package modules load during startup, but Main Menu does not generate bathymetry, current cubes, current samplers, Three renderers, SimulationEngine state, or mission science artifacts.

## Timeout Policy

- Static server ready: 15 seconds.
- Application ready: 20 seconds.
- Route transition after app ready: 10 seconds.

These are failure ceilings, not expected local performance. Local headless measurements are documented in `docs/application_boot_performance.md`.

## Current-Package Boundary

FLOW-PKG-R1.1 changes boot/readiness and test reliability only. Current equations and package artifacts remain unchanged.