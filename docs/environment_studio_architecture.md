# Environment Studio Architecture

Environment Studio is the planned unified authoring surface for ANCHOR environment projects. It should help instructors and researchers select or import bathymetry context, generate reproducible regional bathymetry, inspect generated field dependencies, validate artifacts, and export public-safe JSON.

R0 implemented contracts only. ENV-STUDIO-R1 added a visible browser thin slice that made those contracts round-trippable from Simulation Lab without changing simulation, scoring, or scientific generation equations. ENV-STUDIO-R1.1 upgraded that thin slice into a regional bathymetry authoring workflow. ENV-ATLAS-R1/R1.1 added a structured atlas field engine and window-conditioned bathymetry builder. ENV-STUDIO-R2, ENV-WORLD-R1/R1A, and ENV-GLOBE-R1 explored procedural synthetic world/globe selectors. REAL-BATHY-R1 made the active browser front door a **Reference Bathymetry Atlas** workflow. BATHY-DATA-R1 adds the reference-data bootstrap: offline downloader/preprocessor scripts, a compact runtime manifest, blocked browser handling when fixtures are absent, and Monterey Canyon reference fixtures. BATHY-DATA-R1.2 adds a true 15 arc-second mission-ready patch while preserving the original 60 arc-second low-resolution fallback. REF-ATLAS-UX-R1 makes the browser workflow explicit: Stage 1 is the Global Atlas Selector, Stage 2 is the Regional Patch Workspace, and Stage 3 is the Generated Reference Environment. FIELD-REGEN-R1 and ENV-COMPOSE-LAUNCH-R1 implement the public reference bathymetry patch -> bathymetry artifact -> deterministic synthetic bathymetry-conditioned fields -> package-backed environment artifact -> validated Planning launch -> public benchmark bundle path. The procedural world/globe workflow remains available only as an experimental sandbox / compatibility path.

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

## REAL-BATHY-R1 Reference Bathymetry Front Door

The primary workflow is now:

```text
Reference Bathymetry Atlas
-> Global Atlas Selector with patch coverage overlay
-> Regional Patch Workspace after a staged fixture is loaded
-> Generated Reference Environment after bathymetry and fields are generated
```

The active source mode is `referenceBathymetryAtlas`, and the default stage is `globalAtlasSelector`. The manifest distinguishes a global overview artifact (`role=globalOverview`, 60 arc-second, world bounds) from regional fixtures (`role=missionReadyPatch` or `lowResolutionReferencePatch`). The `anchor.reference-bathymetry-atlas` artifact records source dataset identity, provider/version/resolution/unit metadata, overview bounds/digest, patch coverage overlays, layer summaries, provenance, claim boundaries, and `atlasDigest`. The selected `anchor.reference-bathymetry-window` records lon/lat bounds, fixture availability, local projection metadata, output/preview resolution, sampled depth/wet-land/slope statistics, detected tags, validation, provenance, claim boundaries, and `patchDigest`.

Two preprocessed public ETOPO fixtures are currently checked in. The bundled manifest is labeled `AVAILABLE` and contains a Monterey Canyon `missionReadyPatch` at 15 arc-second source resolution, 360 columns x 288 rows, plus a preserved `lowResolutionReferencePatch` at 60 arc-second source resolution, 90 columns x 72 rows. Environment Studio must prefer the mission-ready fixture when present, keep the low-resolution fallback selectable, and show source variant and actual resolution. It must not present either fixture as calibrated survey bathymetry, certified navigation data, HYCOM, Copernicus, an operational ocean forecast, or a validated real-world ocean product.

Raw source files belong under gitignored `external_data/reference_bathymetry/`. Compact ANCHOR runtime artifacts and `manifest.json` live under `assets/reference_bathymetry/`. The browser app reads only the compact global overview metadata and staged regional patch artifacts; it does not download NOAA/GEBCO data or run Python at runtime. If a selected region is not staged, the browser exports a patch request instead of pretending to generate reference data. See [Reference Bathymetry Data Pipeline](reference_bathymetry_data_pipeline.md).

The focused Playwright workflows write the REF-ATLAS-UX-R1 owner package under `artifacts/owner-review/ref-atlas-ux-r1/` by default, or an `ANCHOR_E2E_OWNER_REVIEW_DIR` override. The first ten screenshots cover global atlas default, patch coverage, Monterey selection, regional patch workspace, generated bathymetry, generated fields, composed environment, launch validation, warning review, and Planning launch readiness. `qa-summary.json` records default stage, global overview bounds, patch coverage counts, selected/matched/loaded fixture IDs, overview digest, bathymetry/field/environment digests, hidden-truth status, raw-path exclusion, and unchanged simulation/scoring flags.

Glider count, deployment, route planning, dive profiles, execution, replanning, and scoring remain Mission Workspace responsibilities. Environment Studio may show source or patch context, but those are not mission settings.

Reference patch generation produces a bathymetry artifact and compact FIELD-REGEN inputs. It does not claim that currents, scalar fields, hotspots, starts, or benchmark bundles have been regenerated by selection alone. Those downstream artifacts remain `REQUIRES_REGENERATION`, `NOT_GENERATED`, or `NEEDS_VALIDATION` until an explicit regeneration action updates them.

## ENV-GLOBE-R1 Synthetic Globe Compatibility Path

The earlier synthetic globe front door remains a compatibility and experimental sandbox path. It can still create deterministic `anchor.synthetic-globe-world` artifacts, sample `anchor.operational-globe-window` regions, and generate regional bathymetry for synthetic benchmark experiments. It is not the default browser source mode after REAL-BATHY-R1.

## ENV-ATLAS-R1/R1.1 Compatibility Substrate

The earlier Synthetic Ocean Atlas, Synthetic World Map, and Synthetic Globe modules remain pure compatibility substrates and algorithm sources for structured fields. They should not be treated as the primary browser UX. The current browser first screen is the Reference Bathymetry Atlas and user-selected lon/lat reference patch.

## ENV-ATLAS-R1.1 Field Engine And Builder

ENV-ATLAS-R1.1 uses structured procedural atlas generation, not raw noise terrain. Noise is limited to controlled coastline roughness, shelf-width variation, seabed texture, seeded feature placement variability, and low-amplitude roughness. Land/ocean topology, shelves, basins, canyons, gulfs, straits, river mouths, and regime hints come from deterministic field composition, distance fields, feature primitives, seeded splines, and seeded feature points.

The generated regional bathymetry is still a 2.5D bottom surface:

```text
bottomDepthMeters = h(x,y)
```

`src/core/generation/WindowConditionedBathymetryBuilder.js` consumes the Regional Mission Recipe and optional atlas fields. It produces BathymetryArtifact-compatible positive-down depth, wet/land mask, coastline summary, feature records, validation metrics, generation attempts, provenance, and digests. Its composition uses shelf-to-basin profile, basin depressions, canyon incisions, ridge/sill shoaling, island/seamount shoaling, river/delta shallow lobes, controlled roughness, smoothing, and slope limiting.

Project export preserves compact atlas and builder metadata: atlas version/digest/summaries, selected-window stats, recipe digest, builder version/digest, generation attempts, bathymetry artifact digest, feature records, validation report, dependency graph, current/scalar hints, and dataset tags. It does not claim real-region accuracy, calibrated survey bathymetry, operational forecast status, or hidden-truth access.

ENV-ATLAS-R1.1 also preserves a compact `flowGenerationInputs` block for FIELD-REGEN-R1. This block records wet/land mask identity, bathymetry and bottom-depth digests when available, coastline and signed-distance summaries, open boundaries, gulf/bay, strait/sill, island/seamount, shelf-break, deep-basin, river-mouth/delta, and canyon-potential zones, current/scalar regime hints, depth and time axes, intended glider count, mission duration, source/preview grid shapes, validation status, and deferred dependency states. It is a handoff contract until the user runs **Generate Currents & Science Fields**.

## FIELD-REGEN-R1 Field Regeneration

FIELD-REGEN-R1 adds an explicit browser action that consumes the reference fixture identity, selected patch bathymetry artifact, wet/land mask, coastline/open-boundary metadata, feature records, current-regime hints, scalar-regime hints, depth axis, and mission time axis. Synthetic atlas/window metadata remains supported as a compatibility input, but the production path is reference-bathymetry-conditioned.

It delegates scientific artifacts to packages:

- `packages/currents/src/generation/AtlasConditionedCurrentBuilder.js` generates a package-backed synthetic `CurrentField4D` through the existing bathymetry-conditioned current backend and records streamfunction-style reduced-order components, depth shear, time evolution, masks, and diagnostics.
- `packages/scalar-processes/src/generation/AtlasConditionedScalarBuilder.js` generates a package-backed synthetic `ScalarField4D` plus hotspot candidates from scalar-regime hints, feature zones, bathymetry, masks, and generated synthetic currents.

Project export records compact regeneration metadata: field-regeneration digest, current/scalar/hotspot/hazard digests, environment-artifact status/digest, summaries, component plans, diagnostics, hotspot candidates, start/drop-zone candidates, hazard candidates, validation summaries, and claim boundaries. It does not store full 4D current or scalar arrays in the Environment Studio project.

After FIELD-REGEN-R1:

- `currentArtifact`, `scalarArtifact`, and `hotspots` become `CURRENT`;
- `hazards` becomes `CURRENT` when hazard candidates are generated;
- `startsDropZones` remains `NEEDS_VALIDATION`;
- `environmentArtifact` becomes `CURRENT` only when package composition validates, otherwise it is honestly marked `REQUIRES_COMPOSITION`;
- `benchmarkBundle` remains `REQUIRES_REGENERATION`;
- launch-to-planning, simulation, official scoring, planner behavior, and benchmark fairness are unchanged.

Generated fields are deterministic synthetic benchmark fixtures. They are not HYCOM, Marine Copernicus, calibrated ocean products, operational forecasts, ecological forecasts, real bathymetry, or navigation data.

## ENV-COMPOSE-LAUNCH-R1 Composition And Launch

ENV-COMPOSE-LAUNCH-R1 turns regenerated reference-derived projects into explicit public artifacts and launch shells without moving mission ownership out of Mission Workspace.

The implemented path is:

```text
public reference bathymetry patch
-> bathymetry artifact
-> deterministic synthetic bathymetry-conditioned fields
-> package-backed environment artifact
-> validated Planning launch
-> public benchmark bundle
```

Composition creates a package-backed `EnvironmentArtifact`, field registry, component digests, provenance, and environment digest from the selected reference fixture, bathymetry artifact, wet/land mask, coastline metadata, generated current/scalar artifacts, hotspots, hazards, and start/drop-zone candidates. Launch validation checks artifact status, current/scalar digest presence, public hazard safety, wet start/drop candidates, zero current vectors on land and below bottom, finite scalar diagnostics, and hidden-truth claim boundaries. ENV-COMPOSE-LAUNCH-R1.1 classifies launch messages as `INFO`, `ADVISORY`, `NON_BLOCKING_WARN`, `BLOCKING_WARN`, or `FAIL`; Planning launch is allowed only when no blocking warnings or failures are present.

The Planning launch adapter produces a default generated `anchor.level` and `anchor.mission` shell for Mission Workspace. The shell preserves full source field timing metadata while using a browser-friendly launch window for interactive Planning. Environment Studio does not create routes, execute missions, choose dive profiles, score plans, or change planner behavior. Mission Workspace still owns glider count, waypoint editing, route ordering, dive profiles, execution, replanning, and scoring.

Benchmark export writes a public `anchor.classical-planner-benchmark-bundle` with `visibilityClass=PUBLIC`, `fairnessClass=FORECAST_ONLY`, `containsHiddenTruth=false`, package-backed bathymetry/current/scalar identities, candidate nodes, parity probes, and validation results. Public bundles contain deterministic synthetic benchmark fields conditioned by reference bathymetry; they are not operational forecast products or calibrated real-ocean validation artifacts.

ALPHA-ENV-RETEST-R1 does not add environment features. It packages the R1.1 evidence, tester protocol, and feedback template so humans can retest the reference-derived Monterey Canyon workflow before additional environment-authoring work starts.

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
- `wetLandMask`
- `coastline`
- `currentArtifact`
- `scalarArtifact`
- `hotspots`
- `startsDropZones`
- `benchmarkBundle`
- `environmentArtifact`
- `validationReport`
- `preview`

Supported states:

- `CURRENT`
- `STALE`
- `INVALID`
- `NOT_GENERATED`
- `NEEDS_VALIDATION`
- `REQUIRES_REGENERATION`
- `REQUIRES_COMPOSITION`

For example, a bathymetry tile edit makes the tile current, the mosaic stale, and downstream bathymetry/current/scalar/environment artifacts require regeneration. After bathymetry generation but before FIELD-REGEN-R1, `currentArtifact`, `scalarArtifact`, `hotspots`, `hazards`, and `benchmarkBundle` remain `REQUIRES_REGENERATION`; `startsDropZones` remains `NEEDS_VALIDATION`. After the explicit field-regeneration action, `currentArtifact`, `scalarArtifact`, `hotspots`, and generated hazard candidates become `CURRENT`, `startsDropZones` still need validation, and `environmentArtifact` is `CURRENT` or `REQUIRES_COMPOSITION`. After ENV-COMPOSE-LAUNCH-R1 validation and export, `startsDropZones` may become `CURRENT` or `NEEDS_REVIEW`, `benchmarkBundle` becomes `CURRENT` when public export validates, and Planning launch is enabled only from the validated shell. This keeps UI honest about what is previewed versus what is validated.

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

ENV-COMPOSE-LAUNCH-R1 connects a validated Environment Studio environment artifact to Mission Workspace launch and public benchmark-bundle export. That connection is explicit: compose, validate, launch, and export are separate controls with preserved digests and debug summaries. It is not inferred from preview state.

## Regional Preview Metadata

R1.1 separates:

- `sourceGridShape`: the canonical bathymetry grid exported in Studio projects and bathymetry artifacts;
- `previewGridShape`: the decimated display mesh used by the browser preview;
- `previewDecimation`: the deterministic LOD factor and budget rationale.

Large domains use preview decimation for interactivity. Exported source grids remain deterministic and reproducible.

The 3D browser preview is a visual inspection surface over public bathymetry artifacts. It does not create scientific truth, regenerate currents or scalar fields, alter hotspots, or change mission scoring. FIELD-REGEN-R1 generation is a separate package-backed action, not a renderer side effect.

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

Sculpting remains a staged follow-up. FIELD-REGEN-R1 regenerates compact current/scalar/hotspot/hazard metadata through package-backed synthetic builders from the reference bathymetry path, and ENV-COMPOSE-LAUNCH-R1 composes the package-backed environment artifact, validates starts/drop zones for launch readiness, launches a generated shell into Planning, and exports a public benchmark bundle. Reference bathymetry plus regenerated fields are benchmark-oriented and validation-aware, but the generated currents/scalars/hotspots are deterministic synthetic benchmark fields, not calibrated real-ocean products.

## ENV-ATLAS-R1/R1.1 Atlas Workflow

Implemented atlas pivot and field-engine upgrade:

1. Default Environment Studio stage is **Atlas Window**.
2. The left panel exposes Mission Region controls: region source, atlas preset, window example, mission scale, intended gliders, mission duration, atlas seed, atlas/window digests, and Generate 3D Region.
3. The center panel renders a deterministic SVG Synthetic Ocean Atlas sampled from generated atlas fields, with a selected operational window rectangle.
4. The right panel shows the Selected Operational Window, detected context, recommended domain/gliders/duration, bathymetry regime, current/scalar regime hints, boundary sides, recipe digest, atlas digest, window digest, and expected artifact states.
5. Generate 3D Region creates a Regional Mission Recipe and runs the window-conditioned bathymetry builder. Regional Detail shows builder digest, bathymetry artifact digest, validation, feature summary, dependency graph, and source/preview grid metadata.
6. Feature-mix controls, source-tile provenance, validation, and dependency diagnostics remain available as secondary regional-detail mechanisms rather than the first visible model.

ENV-ATLAS-R1.1 does not change mission simulation, official scoring, glider dynamics, planner behavior, benchmark fairness, or existing Alpha workflows. FIELD-REGEN-R1 adds explicit package-backed synthetic current/scalar/hotspot/hazard generation for Environment Studio projects. ENV-COMPOSE-LAUNCH-R1 connects only validated reference-derived project shells to Mission Workspace and public benchmark export; it still does not change mission simulation, scoring, glider dynamics, planner behavior, or benchmark fairness.
