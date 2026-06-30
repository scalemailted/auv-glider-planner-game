# ENV-STUDIO-R1 Feedback Response

REF-TILE-LIB-R1A responds to `ALPHA-FB-027` by adding a scripted static ETOPO tile pipeline. ANCHOR hosts curated app-ready reference bathymetry tiles as static assets. The browser does not download NOAA/GEBCO data at runtime. External public bathymetry data is downloaded and preprocessed offline, then registered as staged ANCHOR tile artifacts. The raster/grid artifact remains authoritative for bathymetry sampling and environment generation. Derived low-poly meshes are visualization/inspection artifacts only. The phase registers staged Monterey tile sets and keeps Gulf-scale coverage as request-only until offline data download/preprocessing is run. REF-TILE-LIB-R1A.1 responds to `ALPHA-FB-028` by packaging the static tile-library workflow for human alpha retest: Pages delivery is checked, the browser owner-review audit verifies hosted Monterey loading without NOAA/GEBCO runtime fetches, and Gulf remains honestly represented as requestOnly / multi-tile request behavior. REF-ATLAS-BOX-EDIT-R1 responds to `ALPHA-FB-029` by making the atlas operational window movable and resizable directly: drag inside the rectangle to move it, drag edges to resize one side, and drag corners to resize both connected sides. ENV-STAGING-SCENE-R1 responds to `ALPHA-FB-030` by splitting Environment Studio into a Global Atlas Setup Scene and Regional 3D Bathymetry Workspace. ENV-STAGING-SCENE-R1.1 responds to `ALPHA-FB-031` by fixing atlas CTA gating: Continue to Mission-Ready Bathymetry is enabled only when the selected operational window matches an app-hosted mission-ready tile set, while request-only and Gulf-scale regions route to patch request or multi-tile request export instead. MULTITILE-OPAREA-R1 responds to `ALPHA-FB-032` by making large valid regions inspectable through coarse preview while keeping Generate Fields, Compose Environment, Launch Planning, and official benchmark export disabled until staged tile assets exist. ENV-BATHY-PREVIEW-R1 closes the broader preview-action regression. ENV-STUDIO-ALPHA-UX-R2 makes the product workflow alpha-usable: Environment Studio has two stages, the Global Atlas Setup Scene is for selecting and inspecting an operational boundary, every valid boundary can open an interactive 3D bathymetry preview, and if high-resolution staged tiles are not available the preview uses app-hosted overview/LOD data and is not mission-ready. Field generation, Planning launch, and benchmark export require staged mission-ready bathymetry tiles. The regional 3D mesh is a decimated visualization artifact; the reference raster/grid remains authoritative for bathymetry sampling, masks, environment generation, simulation, and benchmark export. Large operational windows remain valid selections, while live Alpha generation stays budget-gated and oversized regions export patch or multi-tile requests.

ENV-STUDIO-R0 converted Alpha tester feedback about environment creation into a staged, reproducible Environment Studio plan. ENV-STUDIO-R1 added the visible browser thin slice for that plan. ENV-STUDIO-R1.1 responded to `ALPHA-FB-006` with regional 3D bathymetry authoring. ENV-ATLAS-R1/R1.1 responded to `ALPHA-FB-008` and `ALPHA-FB-009` with a structured atlas field engine and window-conditioned bathymetry builder. FIELD-REGEN-R1 responded to `ALPHA-FB-010` by adding explicit package-backed synthetic current, scalar, and hotspot regeneration from atlas-conditioned regional context. ENV-STUDIO-R2 responded to `ALPHA-FB-011` by making the browser workflow start from a deterministic synthetic world-map artifact and a user-selected operational boundary. ENV-WORLD-R1 responds to `ALPHA-FB-012` by hardening that front door into a pan/zoomable tiled procedural world map with drag-based boundary selection. ENV-WORLD-R1A responds to `ALPHA-FB-013` by adding hard browser visual acceptance evidence for that world-map-first workflow. ENV-GLOBE-R1 responded to `ALPHA-FB-014` with a high-resolution synthetic globe selector. REAL-BATHY-R1 responds to `ALPHA-FB-015` by making the active front door a Reference Bathymetry Atlas with lon/lat bounding-box selection and reference patch bathymetry generation. BATHY-DATA-R1 adds the data bootstrap: ETOPO/GEBCO staging scripts, compact runtime manifest/artifacts, and blocked-state handling when no fixture exists. BATHY-DATA-R1.1 closes provenance by labeling the original Monterey Canyon fixture as a 60 arc-second `lowResolutionReferencePatch`; BATHY-DATA-R1.2 adds a true 15 arc-second `missionReadyPatch` from the NOAA ETOPO 2022 surface-elevation non-ice fallback tile. `ALPHA-FB-017` extends FIELD-REGEN-R1 to the reference-bathymetry-conditioned environment path, `ALPHA-FB-018` adds composition, launch validation, Planning launch, and public benchmark export for that path, `ALPHA-FB-019` closes launch-warning taxonomy and owner acceptance evidence, `ALPHA-FB-024` separates operational-window selection from live browser generation so large Gulf-scale windows export multi-tile patch requests, `ALPHA-FB-025` adds deep zoom plus a typed operational-window editor, `ALPHA-FB-029` adds direct move/edge/corner rectangle editing for the atlas operational window, and `ALPHA-FB-033` tracks the R2.1 regional viewport cleanup, dynamic panels, camera controls, and atlas-return state pass. It does not change simulation, scoring, generated mission semantics, benchmark fairness, planner behavior, or existing Alpha workflows.

The Regional Bathymetry Workspace uses the center panel as an interactive 3D bathymetry viewport. Detailed provenance, bounds, LOD, and launch status are shown in the right inspector. The left panel is dynamic and only shows actions available for the current scene mode. Returning to the atlas preserves the selected operational boundary and map viewport. High-zoom atlas detail uses app-hosted overview/LOD assets only; the browser does not download NOAA/GEBCO data at runtime.

## Feedback Classification

The original R0-R1 environment-authoring feedback was not a P0/P1 release blocker because the Guided Mission, benchmark, solver-packet, Colab, Methods & Validation, and diagnostic workflows still operated on curated deterministic environments. `ALPHA-FB-014` and `ALPHA-FB-015` are tracked as P1 because the active Environment Studio front door risked a major scientific/product misrepresentation when synthetic world selectors were presented as the primary path instead of a reference bathymetry patch workflow.

BATHY-DATA-R1 preserves the product decision that ANCHOR uses preprocessed public bathymetry/topography references as the default Environment Studio source. The browser app does not download NOAA/GEBCO data at runtime. Raw data lives under gitignored `external_data/reference_bathymetry/`; compact runtime fixtures live under `assets/reference_bathymetry/`. Procedural synthetic worlds remain experimental, and synthetic benchmark variety should come later from provenance-preserving variants of real reference patches.

It is classified as:

| Tag | Classification | Reason |
| --- | --- | --- |
| `P2` | Significant workflow gap | Testers need a clearer way to create and reproduce custom synthetic environments without editing code or JSON by hand. |
| `BENCH` | Benchmark artifact concern | External planners and classroom studies need stable environment identities, digests, and validation reports. |
| `EDU` | Teaching concern | Learners need to see how domain size, bathymetry, currents, scalar layers, and validation fit together. |
| `SCI` | Scientific assumption concern | Authored environments need explicit synthetic/not-calibrated boundaries and reproducible component provenance. |

## Product Decision

The product should have one unified **Environment Studio**, not separate editors for bathymetry, currents, scalar fields, and mission scenarios.

Placement:

```text
Product Hub -> Simulation Lab -> Environment Studio
```

Environment Studio should not become a fifth Product Hub pillar. The four Alpha pillars remain stable.

## What R0 Implements

R0 adds a pure contract layer and a focused Node smoke:

- normalized domain specs with rows/columns derived from physical size and resolution;
- browser-friendly cell-count limits;
- bathymetry archetype specs;
- bathymetry tile manifests;
- edge profile validation;
- mosaic manifests;
- seam validation helpers;
- edit provenance;
- dependency graph states;
- validation report digests;
- hidden-truth rejection;
- codec-friendly canonical JSON checks.

Implementation entry points:

- `src/core/editor/EnvironmentStudioContracts.js`
- `tools/js/smoke_environment_studio_contracts.mjs`

## What R0 Does Not Implement

R0 intentionally does not:

- add freeform terrain sculpting;
- launch regenerated Environment Studio projects into production missions;
- modify generated environment equations;
- change official scoring;
- change mission generation semantics;
- expose hidden truth;
- add WebGPU, NetCDF, backend services, or ML workflows;
- create multiple editor apps.

## What R1 Implements

Implemented browser thin slice:

```text
ENV-STUDIO-R1 - Unified Environment Studio Browser Thin Slice
```

Scope:

1. Add one Simulation Lab entry: `Environment Studio`.
2. Show a domain setup panel with width, height, resolution, depth layers, and time span.
3. Show deterministic bathymetry archetype and seed controls using the R0 contract.
4. Show a compact tile preview and a simple 2x2 mosaic preview as a low-risk read-only surface.
5. Export and import Environment Studio JSON artifacts with canonical digests.
6. Show the validation report and dependency graph state.
7. Publish `globalThis.ANCHOR_ENVIRONMENT_STUDIO_DEBUG` for route, digest, validation, dependency, and cleanup checks.
8. Do not run missions from edited environments until a later adapter explicitly maps the Studio artifact into existing environment loaders.

R1 still avoids changing simulation, scoring, and scientific equations. It focuses on making the contract visible and round-trippable in the browser.

## What R1.1 Implements

Implemented regional authoring upgrade:

```text
ENV-STUDIO-R1.1 - Regional Bathymetry Authoring Inputs and 3D Preview
```

Scope:

1. Left panel controls for Environment Scale, Domain & Resolution, Regional Layout Template, Regional Feature Mix, Randomization, Validation & Mission Suitability, Generated Field Status, and Import / Export / Launch.
2. Default 3D Bathymetry center preview over the canonical 2.5D bottom surface `bottomDepthMeters = h(x,y)`.
3. Top-down depth, seam, slope, wet/land, cross-section, and multi-glider suitability diagnostic modes.
4. Contextual right-panel inspector for selected region, tile, seam, validation issue, dependency, and feature summary.
5. Multi-archetype regional generation with per-tile role, archetype, seed, seam-blend provenance, feature summary, and multi-glider suitability checks.
6. Project export/import fields for environment type, mission scale, intended gliders, regional template, coastline orientation, open-ocean boundaries, feature mix, randomization locks, preview mode, source grid, preview mesh, decimation, feature summary, suitability, validation, and dependency state.

R1.1 still uses deterministic synthetic bathymetry. It is scientifically constrained and validation-aware, but it is not a calibrated regional forecast, operational bathymetry, named-region survey product, or certified navigation product.

## What ENV-ATLAS-R1 Implements

Implemented atlas-front-door pivot:

```text
ENV-ATLAS-R1 - Synthetic Ocean Atlas and Operational Window Selection
```

Scope:

1. Environment Studio opens to a Synthetic Ocean Atlas stage by default.
2. Users choose an atlas preset and operational window example such as Coastal Shelf Survey, Semi-Enclosed Gulf Survey, Island Chain Survey, Shelf Break + Canyon Survey, River Mouth Plume Survey, Strait / Sill Survey, or Open Ocean Eddy Survey.
3. The selected window infers context, domain size, source/preview resolution, glider count, mission duration, bathymetry regime, current/scalar regime hints, boundary sides, feature mix, and validation profile.
4. Generate 3D Region creates an `anchor.regional-mission-recipe` and then uses the existing R1.1 regional bathymetry generator path.
5. Advanced feature/tile controls remain available as provenance and tuning mechanisms after region generation, not as the default first screen.

The atlas is synthetic, reference-informed, and benchmark-oriented. It is not a real Earth map, calibrated real-ocean data, operational forecast, or navigation product.

## What ENV-ATLAS-R1.1 Implements

Implemented procedural atlas field engine and window-conditioned bathymetry:

```text
ENV-ATLAS-R1.1 - Procedural Synthetic Ocean Atlas Field Engine and Window-Conditioned Bathymetry Generator
```

Scope:

1. Atlas presets now generate deterministic fields for land/ocean, distance to coast, shelf, shelf break, basin, island/seamount, canyon potential, river mouth, strait/sill, gulf/bay, open-ocean corridor, current-regime hints, scalar-regime hints, and mission suitability.
2. Operational windows sample those fields to infer context and produce a Regional Mission Recipe with atlas stats, dataset tags, current/scalar hints, open-boundary metadata, validation profile, and digests.
3. Generate 3D Region now uses `WindowConditionedBathymetryBuilder` to build positive-down 2.5D bathymetry from shelf-to-basin profile, basin/canyon/ridge/island/delta features, controlled roughness, smoothing, validation, and deterministic retry attempts.
4. Project export/import preserves atlas/window/recipe/builder metadata, bathymetry artifact digest, generation attempts, feature records, validation, dependency graph, and dataset tags.
5. The UI shows atlas/window digests, builder digest, bathymetry artifact digest, feature summary, validation, and honest dependency states.

Noise is used for variation and texture, not as the sole terrain model. FIELD-REGEN-R1 now explicitly generates compact current, scalar, hotspot, and hazard metadata through package-backed synthetic builders. The current production path is public reference bathymetry patch -> bathymetry artifact -> deterministic synthetic bathymetry-conditioned fields -> package-backed environment artifact -> validated Planning launch -> public benchmark bundle. Starts/drop zones are validated by the explicit launch-readiness step before launch; public benchmark bundles are exported only after public-safety checks pass.

## What ENV-STUDIO-R2 Implements

Implemented world-map-first authoring:

```text
ENV-STUDIO-R2 - Procedural Synthetic World Map and Boundary Selection
```

Scope:

1. Environment Studio opens to a deterministic `anchor.synthetic-world-map`, not a mission-planning form.
2. The left panel is environment-focused: world style, world seed, map layers, boundary selection, source/preview resolution, bathymetry generation, and export/import.
3. The center view renders a synthetic semantic world map with pan/zoom controls and a selected boundary overlay.
4. The right panel shows world summary before selection and sampled selected-window context after selection.
5. `anchor.operational-window` records normalized bounds, sampled field stats, detected context, recommended domain, bathymetry/flow/scalar regimes, suitability, dataset tags, and digest.
6. Generate 3D Bathymetry creates regional bathymetry from the selected window through the existing window-conditioned builder.

R2 removes glider count, mission duration, mission scale, route execution, and scoring concerns from the primary Environment Studio flow. Currents, scalars, hotspots, starts/drop zones, benchmark bundles, and launch-to-planning remain unavailable until explicit generation, composition, validation, and export actions create them.

## What ENV-WORLD-R1 Implements

Implemented hard reauthor of the world-map front door:

```text
ENV-WORLD-R1 - Pan/Zoom Procedural Synthetic World Map
```

Scope:

1. Environment Studio centers the workflow on a large deterministic synthetic world map, not a pixel-grid atlas diagram or mission-control form.
2. The world artifact records virtual size, source resolution, tile size, LOD levels, broad generator parameters, semantic layer summaries, features, validation, provenance, and digest.
3. The browser viewport renders deterministic map tiles/chunks, pans with pointer drag, zooms with controls or wheel, overlays coarse flow hints, and hides diagnostic grids by default.
4. The primary left panel exposes only synthetic-world controls, layer toggles, boundary selection, bathymetry generation, and import/export.
5. Boundary selection is user-authored by drag/click over the map; sampled field stats and detected context come from generated world fields.
6. Generate 3D Bathymetry still creates regional bathymetry from the selected window through the existing window-conditioned builder.

ENV-WORLD-R1 keeps FIELD-REGEN-R1 separate. It does not claim new current, scalar, hotspot, benchmark bundle, start/drop-zone, planner, scoring, or simulation behavior unless a downstream explicit generation action validates those artifacts.

## What ENV-WORLD-R1A Implements

Implemented visual acceptance hardening:

```text
ENV-WORLD-R1A - Synthetic World-Map Visual Acceptance
```

Scope:

1. Stage 1 remains **Synthetic World Map** by default.
2. Stage 1 primary controls stay focused on world style/seed, map layers, boundary selection, bathymetry generation, and import/export; generator tuning and boundary sizing are advanced disclosure controls.
3. The browser workflows generate `test-results/env-world-r1a-owner-review/` screenshots for default, pan, zoom-out, bathymetry layer, flow layer, selected boundary, and generated regional bathymetry states.
4. `qa-summary.json` records world/window digests, pan/zoom evidence, visible land/island/open-ocean/coastline metrics, selected-window area, source grid shape, bathymetry digest, forbidden Stage 1 control count, symbolic-atlas shape count, visible cell-grid status, hidden-truth status, and unchanged simulation/scoring flags.
5. `tools/js/audit_env_world_r1a_visual_acceptance.mjs` enforces those thresholds and reports `ENV_WORLD_R1A_VISUAL_ACCEPTANCE_FAIL` on regression.

R1A is a visual/product workflow gate. It does not add new fields, change field equations, launch missions from Studio projects, alter scoring, or change planner behavior.

## What ENV-GLOBE-R1 Implements

Implemented globe-first front-door reauthoring:

```text
ENV-GLOBE-R1 - High-Resolution Synthetic Globe Selector
```

Scope:

1. Stage 1 now opens to a visible interactive **Synthetic Globe**, not a flat rectangle, local schematic, or pixel-grid world map.
2. The first generated artifact is `anchor.synthetic-globe-world`: deterministic high-resolution equirectangular synthetic world fields with default canonical resolution 4096 x 2048 and accepted minimum 2048 x 1024.
3. The globe supports rotate, tilt, zoom, reset, layer controls, and a selected operational-region overlay.
4. Region selection creates `anchor.operational-globe-window` with normalized bounds, sampled field stats, detected context, recommended source/preview domain, regime hints, suitability, and digest.
5. Generate 3D Bathymetry creates regional bathymetry from the selected globe window through the existing window-conditioned builder path.
6. The browser workflows generate `test-results/env-globe-r1-owner-review/` screenshots for default globe, rotated globe, zoomed globe, bathymetry layer, flow layer, selected region, and generated regional bathymetry states.
7. `qa-summary.json` records globe rendering, sphere visibility, canonical/display resolutions, world/window digests, rotation/zoom evidence, selected-window area below 5 percent of the globe, visible land/ocean/island metrics, forbidden primary-control count, pixel-grid/flat-map flags, bathymetry digest, renderer cleanup, hidden-truth status, and unchanged simulation/scoring flags.
8. `tools/js/audit_env_globe_r1_visual_acceptance.mjs` enforces those thresholds and reports `ENV_GLOBE_R1_VISUAL_ACCEPTANCE_FAIL` on regression.

ENV-GLOBE-R1 keeps current/scalar/hotspot regeneration separate. It does not add final CurrentField4D or ScalarField4D generation, change glider dynamics, launch missions from Studio projects, alter scoring, or change planner behavior.

## Staged Follow-Ups

Provenance-preserving sculpting and richer reference comparison remain staged follow-ups. Current/scalar/hotspot/hazard regeneration is available only through the explicit FIELD-REGEN-R1 action and remains deterministic synthetic benchmark generation, not calibrated or operational. ENV-COMPOSE-LAUNCH-R1 adds separate controls for package-backed environment composition, launch validation, Planning launch, and public benchmark-bundle export.

## What ENV-COMPOSE-LAUNCH-R1 Implements

Implemented reference-derived environment composition and launch:

```text
ENV-COMPOSE-LAUNCH-R1 - Environment Artifact Composition, Mission-Launch Adapter, and Benchmark Bundle Export
```

Scope:

1. Compose a package-backed `EnvironmentArtifact` from the selected public reference bathymetry patch, generated bathymetry artifact, deterministic synthetic current/scalar artifacts, hotspots, hazards, starts/drop-zone candidates, provenance, and digests.
2. Validate launch readiness, including start/drop-zone candidates, public hazard safety, field diagnostics, land/below-bottom current masking, component digests, and hidden-truth exclusion.
3. Launch a generated environment shell into Mission Workspace Planning without assigning routes, dive profiles, execution state, or scores inside Environment Studio.
4. Export a public `anchor.classical-planner-benchmark-bundle` with `PUBLIC / FORECAST_ONLY` visibility and parity probes.
5. Preserve composition, launch-validation, Planning launch, benchmark-export, and public-safety summaries in project export/import and `ANCHOR_ENVIRONMENT_STUDIO_DEBUG`.

This phase keeps the scientific claim boundary explicit: reference bathymetry plus deterministic synthetic bathymetry-conditioned fields, not operational forecasts, not calibrated ocean products, and not navigation data. It does not change simulation, official scoring, glider dynamics, planners, benchmark fairness, or Product Hub placement.

## What ENV-COMPOSE-LAUNCH-R1.1 Closes

REF-ATLAS-UX-R1.2 keeps the science and launch path unchanged but clarifies the browser workflow before alpha retest. Stage 1 is the Global Atlas Selector with a compact ETOPO 2022 60 arc-second world overview selection layer and patch coverage overlays. Stage 2 is the Regional Patch Workspace after loading a staged fixture such as `monterey_canyon_15s`. Stage 3 is the Generated Reference Environment after bathymetry, deterministic synthetic fields, environment composition, and launch validation. The owner package at `artifacts/owner-review/ref-atlas-ux-r1-2/` records full-world default/reset evidence, land/ocean visibility, Monterey overlay coordinates, focused overlay view, loaded fixture identity, non-staged bbox patch-request export, generated bathymetry, generated fields, launch-validation readiness, Planning launch, mission execution, Debrief, public benchmark export, export/import round trip, cleanup state, and `qa-summary.json` fields for hidden-truth and raw-path exclusion.
