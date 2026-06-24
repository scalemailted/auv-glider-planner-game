# Production App Readiness Contract

FLOW-PKG-R1.1 adds one production-owned boot readiness contract:

```js
globalThis.ANCHOR_APP_BOOT_DEBUG
```

The contract is emitted by the real browser bootstrap path, not by Playwright. It records runtime shell selection, base path, package import milestones, Phaser availability, Main Menu route readiness, duplicate boot counts, failure stage, warnings, and compact duration data.

## Ready Means

`ready=true` means:

- bootstrap completed;
- required package entry modules imported;
- the selected runtime shell was constructed;
- the current route committed;
- route controls were bound;
- no startup failure is pending.

The route is also exposed through DOM markers:

```html
data-anchor-app-ready="true"
data-anchor-route="main-menu"
```

The contract dispatches one `anchor:app-ready` event per boot.

## Test Policy

Static-server process spawn is not equivalent to server readiness. Browser tests must use the static-server readiness probe before navigation and then use `waitForAnchorAppReady` / `waitForAnchorRoute` before route selectors.

Route selectors are checked after application readiness. A selector such as `#main-menu-hub` can verify visible content, but it is not the startup contract.

## Science Lazy Boundary

Scientific packages may load at startup so import paths are verified, but mission artifacts remain lazy. Main Menu boot must not generate bathymetry, currents, current samplers, Three renderers, SimulationEngine state, or scoring state.

Increasing a timeout is not a substitute for locating a failed boot stage. FLOW-PKG-R1.1 uses stage-based ceilings: server ready 15 seconds, application ready 20 seconds, route transition after app ready 10 seconds.