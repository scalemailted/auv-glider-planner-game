# Architecture

## Runtime

- Browser entry: `index.html` -> `src/game/main.js`.
- Phaser: active lifecycle shell, route/scene transition owner, Learning Lab host, and transitional UI orchestration.
- Three.js: production mission-world renderer for planning, simulation, replay, bathymetry/current layers, and editor world presentation.
- Portable core/packages: deterministic bathymetry, current, scalar, environment composition, simulation, replay, export, and validation contracts.

## Validation Ownership

- Production capability coverage and physical split ownership are declared in `tests/e2e/capability_manifest.mjs`.
- `npm.cmd run test:fast` owns deterministic contracts, package boundaries, and repository verification.
- `npm.cmd run test:e2e:smoke` is a compact browser smoke set.
- `npm.cmd run test:e2e` is the release browser regression set.
- `npm.cmd run test:e2e:full` is bounded nonvisual compatibility coverage, not a historical archive.
- `npm.cmd run test:e2e:visual` is headed visual/owner acceptance coverage.

## Static Hosting

Pages copies runtime assets and allowlisted current documentation only. Internal phase notes, test artifacts, owner-review packages, maintenance tools, and archive content are not public deployment inputs.

## Environment Composition

`packages/environment` is the pure composition layer for canonical bathymetry, current, and scalar artifacts. It owns environment identity, role metadata, cross-artifact validation, provenance aggregation, and physical-coordinate sampling. It does not own field generation equations, visibility policy, observation noise, Simulation, scoring, or rendering. See `docs/environment_package.md`.