# Scientific Package Architecture

ARCH-R1 defines the package architecture target for the scientific core while keeping one web application as the product shell.

The active browser game, mission workspace, replay UI, labs, and viewer remain in the current app tree. Scientific packages are intended to become renderer-free, DOM-free, deterministic modules that can be used by the browser app, Node/OceanBox-JS, solver workflows, and artifact-analysis notebooks.

## Target Graph

```text
@anchor/contracts
  -> @anchor/bathymetry
  -> @anchor/currents
  -> @anchor/scalar-processes
  -> @anchor/environment
  -> @anchor/mission-simulator

@anchor/codecs -> @anchor/contracts
@anchor/validation -> all scientific packages as test subjects
apps/anchor-web -> packages plus current src/ compatibility modules
```

Dependency direction is one-way toward higher-level composition. Rendering code is not part of this graph.

## Package Responsibilities

| Package | Owns | Does not own |
| --- | --- | --- |
| `@anchor/contracts` | Units, coordinate frames, typed-array layouts, provenance, validation reports, deterministic artifact digests, shared manifest/artifact contracts | Generation algorithms, scoring, renderer state |
| `@anchor/bathymetry` | Bathymetry, terrain, slope, wet masks, accessibility field contracts and later algorithms | Current-field physics, mission execution, rendering |
| `@anchor/currents` | Current-field models, 4D vector fields, interpolation contracts, diagnostics | Glyph density, camera state, UI controls |
| `@anchor/scalar-processes` | Science scalar fields, ROI/priority fields, forecast/belief/uncertainty field contracts | Mission scoring formulas, color maps, route editing |
| `@anchor/environment` | Composed synthetic environment manifests and artifacts | Vehicle execution, UI, solver behavior |
| `@anchor/mission-simulator` | Portable mission execution, observations, episode state, result contracts | Browser input, scene rendering, camera controls |
| `@anchor/validation` | Scientific fixture checks, package-contract checks, claim-boundary tests | Product UI assertions as primary owner |
| `@anchor/codecs` | JSON/CSV/bundle codecs and visibility-safe serialization contracts | Scientific generation or scoring |

## Compatibility Strategy

The current `src/` tree remains the production implementation during migration. Later extraction phases should use forwarding modules from old `src/core/...` paths to package exports so browser imports and existing tests keep working.

ARCH-R1 deliberately moves no production algorithms. It extracts only contract helpers and creates one small bathymetry contract proof. This keeps artifact values and gameplay behavior unchanged.

## Runtime Boundary

Scientific packages must not import or use:

- `src/game/`
- `src/ui/`
- Phaser
- Three.js
- DOM/browser globals such as `document`, `window`, or `requestAnimationFrame`

Renderer code may consume package outputs through explicit view models and adapters. Renderer code must not create canonical science values.

## Claim Boundary

Synthetic fields remain synthetic unless a manifest explicitly declares a calibrated source and the relevant validation accepts that claim. Package contracts include provenance fields so future artifacts can distinguish synthetic fixtures, manufactured solutions, classroom demos, and calibrated data sources.

## BATHY-PKG-R1 Update

BATHY-PKG-R1 makes `@anchor/bathymetry` a real production package boundary. It now owns canonical bathymetry contracts, source metadata, signed terrain helpers, artifact normalization, validation, and canonical sampling. The application owns UI, scene lifecycle, and visualization. Three.js does not own bathymetry truth. The existing synthetic generator remains behavior-compatible during R1. Manifest and artifact are distinct.

## FLOW-PKG-R1 Current Package Note

packages/currents now owns pure 4D current contracts, artifacts, source metadata, sampler behavior, temporal boundaries, and scientific diagnostics. The package remains browser-safe, Node-safe, Worker-safe, and independent of src/, Three.js, Phaser, DOM, and UI lifecycle. Synthetic current claims remain bounded to deterministic benchmark fixtures, not calibrated ocean forecasts.

## ENV-PKG-R1 Environment Package Note

`packages/environment` now composes canonical bathymetry, current, and scalar artifacts without changing their scientific generation equations. It records operational-domain metadata, component digests, field roles for truth/forecast/belief/uncertainty/priority, validation summaries, and provenance. It accepts different component resolutions and axes and samples in physical coordinates. It does not own visibility policy, observation noise, mission execution, scoring, rendering, or calibrated ocean forecast claims. See `docs/environment_package.md` and `packages/environment/MODEL_CARD.md`.
## SIM-PKG-R1 Mission Simulator Package Note

`packages/mission-simulator` now owns mission-simulation manifests, inputs, normalized state, command-result contracts, events, observations, raw metrics, snapshots, result digests, and selected pure helpers such as dive-state and mission-rule utilities. It consumes canonical `EnvironmentArtifact` identity from `packages/environment`. It does not own environment generation, route planning, route editing, official score aggregation, Play/Pause scheduling, Three.js rendering, Phaser lifecycle, or replay playback. Browser and headless adapters use the same package contract while preserving existing production outcomes for R1. See `docs/mission_simulator_package.md` and `packages/mission-simulator/MODEL_CARD.md`.