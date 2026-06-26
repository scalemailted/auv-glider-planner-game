# Environment Studio Architecture

Environment Studio is the planned unified authoring surface for deterministic synthetic ANCHOR environments. It should help instructors and researchers define a reproducible domain, choose or edit synthetic bathymetry, inspect generated field dependencies, validate artifacts, and export public-safe JSON.

R0 implemented contracts only. ENV-STUDIO-R1 added a visible browser thin slice that made those contracts round-trippable from Simulation Lab without changing simulation, scoring, or scientific generation equations. ENV-STUDIO-R1.1 upgrades that thin slice into a regional bathymetry authoring workflow with a global region recipe, 3D bathymetry preview, contextual inspector, multi-archetype regional generation, source-grid versus preview-mesh metadata, feature summaries, and multi-glider suitability heuristics.

## Product Placement

Environment Studio belongs under:

```text
Product Hub -> Simulation Lab -> Environment Studio
```

It should not be a fifth Product Hub card and should not split into separate bathymetry, current, scalar, or mission editors. Those concepts are panels within one workflow.

## Architecture Layers

The current stack is:

1. **Environment Studio UI**: browser panels, file import/export, preview, and validation display.
2. **Editor contracts**: pure normalization, validation, dependency, and digest helpers in `src/core/editor/EnvironmentStudioContracts.js`.
3. **Scientific packages**: existing bathymetry, current, scalar, environment, codec, validation, simulator, and scoring packages.
4. **Runtime consumers**: mission workspace, headless runtime, benchmark export, and browser viewers.

Environment Studio UI owns interaction. Scientific packages own scientific artifacts and samplers. Simulation and scoring remain authoritative elsewhere.

Environment Studio authors bathymetry as a 2.5D bottom surface rendered as 3D terrain:

```text
bottomDepthMeters = h(x,y)
```

It is not a volumetric geology editor. It does not create caves, tunnels, overhangs, arbitrary freeform solid geology, or calibrated regional survey products.

## Domain Spec

The domain spec defines physical extent and resolution before any fields are generated:

- coordinate frame: local east/north/down meters;
- projection label: local tangent plane by default;
- horizontal size in meters;
- cell size in meters;
- derived `columns`, `rows`, and `cellCount`;
- depth layers in positive-down meters;
- mission time span and time step;
- browser-friendly cell-count limit;
- synthetic/not-calibrated claim boundary.

Rows and columns are derived as:

```text
floor(widthMeters / cellSizeMeters) + 1
floor(heightMeters / cellSizeMeters) + 1
```

Explicit rows/columns may be supplied by importers, but validation still enforces the cell-count limit.

## Bathymetry Archetype Spec

The archetype spec records the synthetic bathymetry family and deterministic parameters used before tile editing. It is not a nautical chart and must not claim calibrated survey or navigation status.

R1 exposes these deterministic archetype families:

- coastal shelf;
- shelf canyon;
- island arc;
- basin with seamount;
- teaching basin.

R1 stores the archetype contract and digest, lets the browser select the family/seed, and generates compact deterministic bathymetry tiles through existing bathymetry package APIs. It does not retune bathymetry equations.

## Tile Manifest

Each bathymetry tile manifest records:

- tile id and row/column position;
- domain and archetype digests;
- tile cell size;
- physical tile extent;
- depth convention;
- source mode;
- public visibility;
- edge profiles;
- edit provenance;
- tile digest.

The tile contract is designed so future UI edits can remain reproducible without storing hidden truth or browser-only state.

## Edge Profiles And Seams

R0 validates edge profile lengths and finite values. Mosaic seam validation compares adjacent tile edge profiles and enforces a maximum depth discontinuity.

The R1 UI used this to report simple 2x2 mosaic seam status. R1.1 generates a deterministic multi-archetype regional 2x2 mosaic and blends shared edge profiles so regional seams remain inspectable and reproducible. It does not implement sculpting brushes or freeform terrain editing.

## Mosaic Manifest

The mosaic manifest combines tiles into a domain-scale bathymetry plan:

- domain digest;
- tile grid dimensions;
- tile identities and positions;
- edge profile digests;
- seam policy;
- edit provenance;
- mosaic digest.

Mosaic validation checks duplicate positions, tile-grid bounds, tile-count limits, and hidden-truth policy.

## Edit Provenance

Every authored artifact should preserve deterministic edit provenance:

- source;
- deterministic seed when applicable;
- operation id;
- operation type;
- target;
- deterministic timestamp policy.

R1 exposes generated project provenance through the export contract and debug surface before adding richer editing history.

## Dependency Graph

Environment Studio tracks generated state with explicit dependency nodes:

- `domainSpec`
- `bathymetryArchetypeSpec`
- `bathymetryTiles`
- `tileMosaic`
- `bathymetryArtifact`
- `currentArtifact`
- `scalarArtifact`
- `environmentArtifact`
- `validationReport`
- `preview`

Supported states:

- `CURRENT`
- `STALE`
- `INVALID`
- `NOT_GENERATED`
- `REQUIRES_REGENERATION`

For example, a bathymetry tile edit makes the tile current, the mosaic stale, and downstream bathymetry/current/scalar/environment artifacts require regeneration. This keeps future UI honest about what is previewed versus what is validated.

## Validation Report

The validation report aggregates:

- domain checks;
- tile checks;
- edge profile checks;
- mosaic checks;
- seam checks;
- dependency graph shape;
- hidden-truth scan;
- codec-friendly canonical JSON check.

The report itself has a canonical digest. It is public-safe and records `hiddenTruthIncluded: false`.

## Visibility And Claim Boundary

Environment Studio public artifacts must not include hidden truth arrays or oracle-only fields. The contract rejects obvious hidden-truth keys and hidden visibility tiers.

All public Environment Studio artifacts carry the same boundary:

- synthetic;
- not a calibrated ocean product;
- not an operational forecast;
- not certified for navigation;
- renderer/preview does not create scientific truth.

## Import And Export

R1 import/export uses the contract JSON directly:

- import domain, tile, mosaic, dependency, and validation artifacts;
- normalize before rendering;
- validate before export;
- include canonical digests in downloads;
- keep hidden truth out of public exports;
- remain static-host compatible.

Later phases may add an adapter from a validated Environment Studio mosaic to the existing generated environment artifact pipeline. That adapter must be explicit and tested, not inferred from UI state.

## Regional Preview Metadata

R1.1 separates:

- `sourceGridShape`: the canonical bathymetry grid exported in Studio projects and bathymetry artifacts;
- `previewGridShape`: the decimated display mesh used by the browser preview;
- `previewDecimation`: the deterministic LOD factor and budget rationale.

Large domains use preview decimation for interactivity. Exported source grids remain deterministic and reproducible.

The 3D browser preview is a visual inspection surface over public bathymetry artifacts. It does not create scientific truth, regenerate currents or scalar fields, alter hotspots, or change mission scoring.

## Performance Budget

Environment Studio defaults should remain browser-friendly:

- domain cell count is capped by contract;
- tile count is capped by contract;
- tile cell count is capped by contract;
- validation is pure JavaScript and synchronous for R1-sized artifacts;
- no WebGPU, backend service, or worker is required in R1.

R1.1 regional presets may use larger source grids within the same browser-safe source-cell cap. Preview meshes are decimated to a separate preview-cell budget so large domains do not freeze the browser.

## R1 Thin Slice

Implemented R1 browser thin slice:

1. Add a Simulation Lab entry for Environment Studio.
2. Render the domain form and derived grid counts.
3. Render an archetype selector with deterministic seed.
4. Render a compact tile/mosaic preview.
5. Show dependency graph state.
6. Show validation report status and digest.
7. Export/import Environment Studio project JSON.
8. Publish `globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG` for route, digest, validation, dependency, and cleanup checks.
9. Do not connect edited artifacts to mission simulation until validation and adapter tests pass.

R1 adds two focused browser workflows: open/generate a valid bathymetry tile and round-trip a small mosaic project JSON artifact.

## R1.1 Regional Authoring

Implemented R1.1 browser workflow:

1. Show Environment Scale, Domain & Resolution, Regional Layout Template, Regional Feature Mix, Randomization, Validation & Mission Suitability, Generated Field Status, and Import / Export / Launch sections.
2. Default the center preview to 3D Bathymetry while keeping top-down depth, seam, slope, wet/land, cross-section, and suitability diagnostics available.
3. Use a contextual right-panel inspector for selected region, tile, seam, feature summary, validation issue, and dependency state.
4. Generate mixed regional bathymetry with at least three feature families by default.
5. Preserve regional recipe, feature mix, tile provenance, source-grid shape, preview-grid shape, decimation, feature summary, suitability checks, validation report, and dependency state in project export/import.

Current/scalar/hotspot regeneration, sculpting, real patch import, and launch-to-planning are staged follow-ups. Current synthetic bathymetry is scientifically constrained and validation-aware, but not a calibrated real-ocean bathymetry product.
