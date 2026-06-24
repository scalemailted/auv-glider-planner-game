# FLOW-PKG-R1.1 Boot Readiness Audit

Phase: FLOW-PKG-R1.1 Production Boot Readiness, Grouped E2E Closure, and Current-Package Regression Hardening

## Scope

This audit covers application boot readiness, static-server readiness, and browser-test synchronization only. It does not change current generation, current artifacts, bathymetry, scalar processes, glider physics, scoring, visible current evolution, or mission semantics.

## Pipeline Audit

| Stage | Expected | Actual | Duration | Status | Evidence |
| ----- | -------- | ------ | -------: | ------ | -------- |
| static server bound | Test server binds before browser navigation | `startStaticServer` resolves after HTTP probes pass | 35-59 ms in focused runs | PASS | `tests/e2e/static-server.mjs` readiness probes |
| index served | `/` and `/auv-glider-planner-game/` return HTML | Both paths return `text/html` | included in server probe | PASS | `DEFAULT_READY_PROBES` |
| import map available | Browser receives `index.html` before ESM import | `index.html` imports `src/game/main.js` | browser navigation | PASS | `index.html` and boot E2E |
| `src/game/main.js` imported | Main module sets boot debug and marks `main-module-ready` | `ANCHOR_APP_BOOT_DEBUG.mainModuleReady=true` | 0.0-0.2 ms after index-ready | PASS | focused boot E2E |
| package modules imported | contracts, bathymetry, currents package entries import | all package ready flags true | about 31-37 ms package span | PASS | `packageModuleRequests` |
| Phaser vendor available | `vendor/phaser.min.js` loads before Phaser app creation | `phaserAvailable=true` | about 54-64 ms from bootstrap | PASS | boot milestones |
| application shell constructed | DOM roots and app shell are created | `appConstructed=true` | about 908-1078 ms from main-module | PASS | boot milestones |
| Phaser game instantiated | one Phaser game and one canvas are created | `phaserGameCreated=true`, one `#game-root canvas` | about 41-237 ms after app shell | PASS | focused boot E2E |
| MainMenuScene started | Main Menu scene starts on production path | `mainMenuSceneStarted=true` | about 21-27 ms after postBoot | PASS | boot milestones |
| Main Menu DOM committed | `#main-menu-hub` exists | `mainMenuDomCommitted=true` | about 1 ms after scene-ready | PASS | focused boot E2E |
| input handlers bound | hub click handler is attached before readiness | `inputHandlersBound=true` | same route-ready step | PASS | `MainMenuScene.mountProductHub` |
| application declared ready | route-ready marker is set and event dispatched | `data-anchor-app-ready=true`, `data-anchor-route=main-menu`, `anchor:app-ready` | total p95 <= 1365.2 ms | PASS | focused boot E2E and smokes |

## Failure Classification

The reported grouped failure was not reproduced as a production boot failure in the pre-edit focused coreMission run. The exact grouped command timed out and left test-owned Node/static-server processes on port 9321. The direct coreMission group then passed 9/9 tests before this phase's edits.

Classified cause for the demonstrated blocker: test harness lifecycle and startup authority gap. The old selector/scene wait was insufficient as a diagnostic boundary and could mask server readiness, module import, or route readiness failures. No current-package runtime regression was demonstrated.

## Selector Authority

`#main-menu-hub` remains a compatibility selector for visible Main Menu content. It is no longer the boot authority. Tests now wait for the production readiness contract and `data-anchor-route="main-menu"` before checking `#main-menu-hub` or Phaser scene state.