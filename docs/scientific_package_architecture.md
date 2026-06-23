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
