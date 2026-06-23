# ARCH-R1 Scientific Package Architecture Audit

Phase: ARCH-R1 - Scientific Generator Package Architecture, Contracts, and Dependency Boundaries.

ARCH-R1 is an architecture and compatibility pass. It does not change scientific behavior, rendered appearance, scoring, mission semantics, artifact values, or active app imports. The existing `src/` tree remains the production app and portable-core implementation. The new `packages/` tree defines ownership boundaries and contract proofs for later targeted extraction.

## Current Ownership Map

| Scientific capability | Current owner | Observed coupling | Proposed package owner |
| --- | --- | --- | --- |
| Bathymetry, terrain, slope, wet mask, depth accessibility | `src/core/science/BathymetryFieldModel.js`, `src/core/science/BathymetrySchema.js`, `src/core/science/SignedTerrainSurfaceModel.js`, terrain/depth generators under `src/core/generation/` | Mostly portable core. Render view models and Three.js layers consume outputs but should not own field semantics. | `@anchor/bathymetry` |
| Current field generation and diagnostics | `src/core/science/BathymetryConditionedCurrentBuilder.js`, `src/core/science/SyntheticCurrentCubeAdapter.js`, `src/core/science/ManufacturedCurrentFieldCatalog.js`, `src/core/generation/CurrentFieldGenerator.js` | Some debug globals in current generator/adapter code. Renderer presentation state is separate but currently adjacent in `src/core/rendering/`. | `@anchor/currents` |
| Current interpolation and sampling | `src/core/science/OceanCurrentField4D.js`, `src/core/science/OceanCurrentFieldSampler.js`, `src/core/currents/CurrentFieldSampler.js` | `src/core/currents/CurrentFieldSampler.js` has debug global hooks. The 4D science sampler is closer to package-ready. | `@anchor/currents` |
| Scalar fields, water-column science value, ROI, forecasts, belief fields | `src/core/science/WaterColumnFieldModel.js`, `src/core/science/VolumetricFieldSampler.js`, `src/core/demo/`, `src/core/forecast/`, ROI and forecast generators under `src/core/generation/` | Mixed educational demo code and production science field code. Needs staged extraction to avoid behavior drift. | `@anchor/scalar-processes` |
| Synthetic environment manifests and generated environment artifacts | `src/core/environment/SyntheticEnvironmentManifest.js`, `src/core/environment/GeneratedEnvironmentArtifact.js`, `src/core/environment/EnvironmentGeneratorBackendContract.js` | Already close to a contract boundary. Should become the composition package after field packages are stable. | `@anchor/environment` |
| Mission execution, glider state, observations, scoring-adjacent episode state | `src/core/sim/SimulationEngine.js`, `src/core/sim/TruthWorld.js`, `src/core/sim/GliderDiveStateMachine.js`, `src/core/sim/Physics.js`, `src/core/sim/Sampling.js`, `src/core/sim/Scoring.js` | `SimulationEngine.js` and watchdogs expose debug globals. `SurfaceDecisionVisibility.js` currently reads browser style state and is not package-ready. | `@anchor/mission-simulator` |
| Artifact schemas, headless bundle contracts, solver-packet compatibility | `src/core/headless/`, `src/core/io/`, `src/core/replay/`, result/export adapters | Strong contract ownership already exists, but code remains in app tree. Needs forwarding modules when extracted. | `@anchor/contracts` and `@anchor/codecs` |
| Scientific validation and audits | `tools/js/smoke_*.mjs`, `tools/js/audit_*.mjs`, `src/core/validation/` | Tool scripts are repository-level today. Package-level validation should consume contracts without renderer dependencies. | `@anchor/validation` |
| Rendering and presentation | `src/core/rendering/`, `src/game/three/`, transitional Phaser host | This remains app/runtime code. It must consume scientific artifacts and view models, not define science semantics. | App surface, not a scientific package |

## Coupling Findings

Known coupling that remains after ARCH-R1:

- `src/core/sim/SimulationEngine.js` writes debug objects and console diagnostics through `globalThis`.
- `src/core/sim/SurfaceDecisionVisibility.js` reads `globalThis.document` and computed styles; this is browser/UI coupling and should not move into `@anchor/mission-simulator` without a split.
- `src/core/sim/SimulationWatchdog.js` uses `globalThis.performance` and debug flags.
- `src/core/currents/CurrentFieldSampler.js` and `src/core/generation/CurrentFieldGenerator.js` expose debug hooks through `globalThis`.
- `src/core/science/SyntheticCurrentCubeAdapter.js` writes `globalThis.ANCHOR_ENVIRONMENT_GENERATOR_DEBUG`.
- `src/core/rendering/CurrentPresentationState.js` reads query state from `globalThis.location`; it belongs to rendering/app runtime, not scientific packages.
- `src/core/rendering/RendererCapabilityModel.js` probes canvas support through document creation; it remains outside scientific package scope.

These findings are acceptable for ARCH-R1 because no algorithm extraction is performed. They are blockers for direct package movement and should be addressed by adapter seams in later extraction phases.

## Extraction Risk Assessment

Low-risk now:

- Shared units, coordinate-frame labels, provenance records, validation reports, and deterministic artifact digests.
- Bathymetry manifest/artifact contract proof that wraps shared contracts.
- Dependency audit scripts that keep packages free of app/runtime imports.

Not low-risk now:

- Moving `SimulationEngine.js`, current generators, or water-column field generation into packages.
- Moving renderer-neutral view models before their app/runtime inputs are separated.
- Changing existing artifact digest implementations or export values.

## ARCH-R1 Result

ARCH-R1 adds package skeletons and contract helpers only. Existing production code continues to import from `src/`. No forwarding module was needed because no production module was moved.
