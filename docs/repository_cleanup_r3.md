# Repository Cleanup R3

## Scope

REPO-CLEAN-R3 is a physical E2E decomposition and legacy pruning audit pass. It does not change bathymetry, currents, scalar processes, dive profiles, mission physics, scoring, schemas, public artifacts, runtime shell defaults, or supported mission workflows.

## Physical E2E Decomposition

- Retired monolith: tests/e2e/smoke.spec.js.
- Shared helper extraction: tests/e2e/helpers/SmokeSpecShared.js.
- Capability-owned files:
  - tests/e2e/product_hub_and_labs.spec.js - 9 tests.
  - tests/e2e/mission_planning.spec.js - 12 tests.
  - tests/e2e/environment_rendering.spec.js - 17 tests.
  - tests/e2e/workspace_and_challenge_setup.spec.js - 12 tests.
  - tests/e2e/simulation_and_terrain.spec.js - 18 tests.
- Test titles moved unchanged: 68.
- Renamed tests: none.
- Merged tests: none.
- Newly converted to Node in R3: none; pure deterministic assertions remain covered by existing package/science Node gates and future focused harnesses.
- Deleted duplicate tests: none.
- Deleted retired implementation tests: none.

## Compatibility Forwarders

| Path | Action | Confidence | Evidence | Replacement |
|---|---|---|---:|---|
| src/core/currents/CurrentFieldSampler.js | retain | high-retain | 20 refs | packages/currents and supported runtime current sampling contracts |
| src/core/science/OceanCurrentField4D.js | retain | high-retain | 36 refs | packages/currents plus browser/headless current field contracts |
| src/core/science/OceanCurrentFieldSampler.js | retain | high-retain | 71 refs | packages/currents current sampler facade |
| src/core/science/OceanCurrentSourceMetadata.js | retain | high-retain | 10 refs | current source metadata contracts |
| src/core/science/CurrentFieldScientificDiagnostics.js | retain | high-retain | 18 refs | current package diagnostics and audits |
| src/core/science/BathymetrySourceMetadata.js | retain | high-retain | 16 refs | bathymetry package metadata contracts |
| src/core/science/SignedTerrainSurfaceModel.js | retain | high-retain | 31 refs | bathymetry package terrain surface contract |
| src/core/science/BathymetryConditionedCurrentBuilder.js | retain | high-retain | 44 refs | current package bathymetry-conditioned field builder |

## Renderer and UI Paths

| Path | Action | Confidence | Evidence | Replacement/deferred owner |
|---|---|---|---:|---|
| src/game/three/layers/ThreeCurrentVectorLayer.js | retain | high-retain | 13 refs | ThreeInstancedCurrentGlyphLayer where fallback removal is separately gated |
| src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js | retain | high-retain | 66 refs | active production current glyph renderer |
| src/game/phaser/renderers/BathymetryWorldRenderer.js | retain | high-retain | 9 refs | bathymetry demo renderer until demo route ownership changes |
| src/game/three/ThreeBathymetryRenderer.js | retain | high-retain | 19 refs | active Three bathymetry renderer |
| src/game/three/layers/ThreeBathymetryTerrainLayer.js | retain | high-retain | 21 refs | active Three terrain layer |
| src/game/phaser/scenes/BathymetryWorldViewScene.js | retain | high-retain | 22 refs | active Simulation Lab bathymetry route |
| src/game/phaser/scenes/RendererArchitecturePreviewScene.js | retain | high-retain | 12 refs | active Simulation Lab renderer architecture route |

## Phaser Disposition

- Active Phaser lifecycle, route ownership, and Learning Lab ownership remain intact.
- Three.js remains the production mission-world renderer inside the supported app flow.
- Final Phaser dependency removal remains a separate explicitly gated phase.

## Pages and Docs

- Pages allowlists this R3 cleanup report and the smoke spec decomposition audit.
- Current Pages policy still excludes tests, internal maintenance tools, archives, and generated artifacts.

## Validation Tiers

- Smoke profile: 15 tests.
- Release profile: 48 tests.
- Full nonvisual profile: 76 tests.
- Visual profile: 12 tests.

## Required R3 Statements

REPO-CLEAN-R3 physically replaced the monolithic historical E2E layout with capability-owned test files. Pure deterministic assertions were moved to Node coverage rather than discarded.

REPO-CLEAN-R3 removed compatibility and legacy source only after proving that supported production, gated runtime, Learning Lab, Pages, schema, and release paths no longer referenced it.

Active Phaser lifecycle, routing, and Learning Lab ownership remain intact. Final Phaser dependency removal remains a separate explicitly gated phase.
