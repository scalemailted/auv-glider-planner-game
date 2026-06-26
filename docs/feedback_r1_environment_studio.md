# ENV-STUDIO-R1 Feedback Response

ENV-STUDIO-R0 converted Alpha tester feedback about environment creation into a staged, reproducible Environment Studio plan. ENV-STUDIO-R1 added the visible browser thin slice for that plan. ENV-STUDIO-R1.1 responded to `ALPHA-FB-006` with regional 3D bathymetry authoring. ENV-ATLAS-R1 responds to `ALPHA-FB-008` by changing the first interaction model: mission authors start from a Synthetic Ocean Atlas and selected operational window, not low-level terrain-feature controls. ENV-ATLAS-R1.1 responds to `ALPHA-FB-009` by making the atlas field-based and adding a window-conditioned bathymetry builder. It does not change simulation, scoring, current generation, scalar generation, generated mission semantics, benchmark fairness, or existing Alpha workflows.

## Feedback Classification

The feedback is not a P0/P1 release blocker for the current Alpha because the Guided Mission, benchmark, solver-packet, Colab, Methods & Validation, and diagnostic workflows still operate on the curated deterministic environments.

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
- regenerate currents or scalar fields from edited bathymetry;
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

Noise is used for variation and texture, not as the sole terrain model. Currents, scalars, hotspots, starts/drop zones, and benchmark bundles remain staged follow-ups unless a future adapter explicitly generates them.

## Staged Follow-Ups

Current/scalar/hotspot regeneration, launch-to-planning, provenance-preserving sculpting, real patch import, and reference comparison remain staged follow-ups. The R1.1 UI marks those controls as planned or deferred rather than silently claiming they exist.
