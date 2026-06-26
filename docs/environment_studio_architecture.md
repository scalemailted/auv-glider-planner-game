# Environment Studio Architecture

Environment Studio is the planned unified authoring surface for deterministic synthetic ANCHOR environments. It should help instructors and researchers define a reproducible domain, choose or edit synthetic bathymetry, inspect generated field dependencies, validate artifacts, and export public-safe JSON.

R0 implements contracts only. It does not ship a browser editor.

## Product Placement

Environment Studio belongs under:

```text
Product Hub -> Simulation Lab -> Environment Studio
```

It should not be a fifth Product Hub card and should not split into separate bathymetry, current, scalar, or mission editors. Those concepts are panels within one workflow.

## Architecture Layers

The intended stack is:

1. **Environment Studio UI**: browser panels, file import/export, preview, and validation display.
2. **Editor contracts**: pure normalization, validation, dependency, and digest helpers in `src/core/editor/EnvironmentStudioContracts.js`.
3. **Scientific packages**: existing bathymetry, current, scalar, environment, codec, validation, simulator, and scoring packages.
4. **Runtime consumers**: mission workspace, headless runtime, benchmark export, and browser viewers.

Environment Studio UI owns interaction. Scientific packages own scientific artifacts and samplers. Simulation and scoring remain authoritative elsewhere.

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

Examples of future archetype families:

- coastal shelf;
- shelf canyon;
- island arc;
- basin with seamount;
- teaching basin.

R0 stores the archetype contract and digest. It does not retune bathymetry equations.

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

Future R1/R2 UI can use this to warn when adjacent authored tiles create unrealistic jumps. R0 does not yet solve or smooth seams; it only defines the reportable contract.

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

R0 records provenance shape. R1 should expose it read-only in the validation/export panel before adding richer editing history.

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

The R0 validation report aggregates:

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

Environment Studio public artifacts must not include hidden truth arrays or oracle-only fields. R0 rejects obvious hidden-truth keys and hidden visibility tiers.

All R0 artifacts carry the same boundary:

- synthetic;
- not a calibrated ocean product;
- not an operational forecast;
- not certified for navigation;
- renderer/preview does not create scientific truth.

## Import And Export Plan

R1 import/export should use the R0 JSON contracts directly:

- import domain, tile, mosaic, dependency, and validation artifacts;
- normalize before rendering;
- validate before allowing export as a generated environment;
- include canonical digests in downloads;
- keep hidden truth out of public exports;
- remain static-host compatible.

Later phases may add an adapter from a validated Environment Studio mosaic to the existing generated environment artifact pipeline. That adapter must be explicit and tested, not inferred from UI state.

## Performance Budget

Environment Studio defaults should remain browser-friendly:

- domain cell count is capped by contract;
- tile count is capped by contract;
- tile cell count is capped by contract;
- validation is pure JavaScript and synchronous for R0-sized artifacts;
- no WebGPU, backend service, or worker is required in R0.

If future R1/R2 authoring needs larger domains, it should add progressive validation and explicit import limits before raising the caps.

## R1 Thin Slice

Recommended R1 implementation:

1. Add a Simulation Lab entry for Environment Studio.
2. Render the domain form and derived grid counts.
3. Render an archetype selector with deterministic seed.
4. Render a compact tile/mosaic preview.
5. Show dependency graph state.
6. Show validation report status and digest.
7. Export/import R0 JSON artifacts.
8. Do not connect edited artifacts to mission simulation until validation and adapter tests pass.

R1 should add at most two browser workflows: open the Studio and round-trip a small Studio JSON artifact.
