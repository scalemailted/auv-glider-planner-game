# ENV-PKG-R1 Environment Package

ENV-PKG-R1 turns `packages/environment` into the canonical composition layer for bathymetry, current, and scalar artifacts.

The environment package composes canonical bathymetry, current, and scalar artifacts. It does not generate those scientific fields in ENV-PKG-R1. Component grids may use different resolutions and axes. Unified sampling occurs in physical coordinates.

Truth, forecast, belief, uncertainty, and priority are distinct roles. The package records role metadata but does not decide user visibility. The package does not own Simulation, observation noise, or scoring. Three.js presents environment data but does not own environment truth. Synthetic environments are benchmark-oriented and are not operational ocean forecasts or certified navigation products.

## Responsibility Table

| Responsibility | Current owner | Pure | Runtime coupled | ENV-PKG-R1 action |
| --- | --- | --- | --- | --- |
| Operational-domain authority | `@anchor/environment` composes; existing domain helpers still define mission domains | Yes | No | Records physical extent, depth, time, units, and coordinate frame in environment artifacts. |
| Coordinate-frame authority | Component packages plus environment validation | Yes | No | Validates frame compatibility and accepts known local-meter aliases with warnings. |
| Environment identity | `@anchor/environment` | Yes | No | Adds environment manifest/artifact digests and component digest aggregation. |
| Bathymetry generation | `@anchor/bathymetry` and app adapters | Yes in package, app-coupled in adapters | Some adapters | Composes existing bathymetry artifacts only. |
| Current generation | `@anchor/currents` and app adapters | Yes in package, app-coupled in adapters | Some adapters | Composes existing 4D current fields only. |
| Scalar process generation | `@anchor/scalar-processes` and app/lab modules | Yes in package, app-coupled in labs | Some adapters | Composes existing scalar artifacts only. |
| Digest ownership | Component packages plus `@anchor/environment` | Yes | No | Keeps component digests separate from composed environment digest. |
| Source/provenance | Component packages plus `@anchor/environment` | Yes | No | Aggregates source IDs, generator metadata, and component package versions. |
| Truth/forecast/belief/uncertainty/priority roles | `@anchor/environment` registry | Yes | No | Records epistemic role, variable ID, source tier, and public visibility label. |
| Visibility policy | Browser/headless adapters and product modes | Mixed | Yes | Records metadata only; does not decide user or solver access. |
| Planning path | Browser app | No | Yes | Reads compact environment identity/debug fields; package does not own player route editing. |
| Simulation path | Browser/Node simulation runtime | No | Yes | Consumes environment identity and current/scalar/bathy samples; package does not own physics. |
| Render path | Three.js/browser renderers | No | Yes | Visualizes environment data; does not create truth or change outcomes. |
| Headless path | Node/OceanBox-JS runtime and package consumers | Mixed | Yes | Can import pure package modules and compare deterministic artifact samples. |
| Editor path | Browser editor modules | No | Yes | May preserve environment metadata but package does not own editing UI. |
| Export/replay path | Export/replay codecs and app adapters | Mixed | Yes | Uses compact identity, role, and digest metadata. |
| Duplicate assembly checks | `@anchor/environment` validation | Yes | No | Rejects duplicate field IDs and hidden-truth fields marked public. |

## Validation Gates

Run:

```bash
npm.cmd run audit:packages
npm.cmd run test:packages
node tools/js/smoke_environment_package_contracts.mjs
node tools/js/smoke_environment_package_forwarders.mjs
node tools/js/smoke_environment_package_adapter.mjs
node tools/js/audit_environment_package_parity.mjs
node ./node_modules/@playwright/test/cli.js test tests/e2e/env_pkg_r1_environment_package.spec.js --reporter=line --workers=1
```

`tests/fixtures/environment_package_r1_parity.json` stores compact deterministic package parity records. It does not store full field arrays.