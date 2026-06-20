# Bathymetry Active and Legacy Path Audit

Phase: THREE-R1.2B.1
Date: 2026-06-20

## Required Production Rule

```text
Scenario Start
Planning
Simulation
Bathymetric World View
        ->
shared BathymetrySurfaceViewModel / BathymetryMeshGeometry
        ->
shared ThreeBathymetryTerrainLayer family
```

One shared terrain contract serves all active Three mission views. The terrain mesh is a display projection of canonical bathymetry. Production no longer uses boxed/per-cell terrain. Retained legacy terrain helpers are compatibility-only and not production. Terrain quality affects presentation only. Headed performance is the authoritative render-cost gate. Human manual QA remains separate from headed automated QA.

## Active / Legacy Path Table

| Module/helper | Imported by production | Imported by tests | Compatibility purpose | Action |
| ------------- | ---------------------: | ----------------: | --------------------- | ------ |
| `BathymetrySurfaceViewModel` | yes | yes | canonical surface view over bottom-depth and land masks | canonical core contract |
| `BathymetryMeshGeometry` | yes | yes | indexed display mesh derived from canonical surface | canonical core contract |
| `BathymetryMeshSampler` | no | yes | audit visual mesh against canonical sampler | test-only helper |
| `CoastlineGeometry` | yes | yes | deterministic land/water boundary segments | canonical core contract |
| `BathymetryContourGeometry` | yes | yes | deterministic display contours | canonical core contract |
| `ThreeBathymetryTerrainLayer` | yes | yes | shared indexed terrain mesh rendering | shared production Three layer |
| `ThreeLandmassLayer` | yes | yes | display-only land cap/elevation | shared production Three layer |
| `ThreeCoastlineLayer` | yes | yes | display-only coastline segments | shared production Three layer |
| `ThreeBathymetryContourLayer` | yes | yes | display-only contour lines | shared production Three layer |
| `ThreeBathymetryRenderer` standalone old `addTerrain`/`addCoastline` helpers | no | no | none after R1.2B | removed as stale/dead implementation |
| `bathymetryToTerrainMeshData` | no | yes | older visual-quality smoke and docs compatibility | retained compatibility-only; production import audit fails if active |
| `ThreeMissionLayerUtils.makeBoxCell` | yes | yes | box glyphs for non-terrain markers/observations | retained; not terrain construction |
| `ThreeRouteStatusLayer` `BoxGeometry` glyphs | yes | no | small route status marker glyphs | retained; not terrain construction |
| Phaser 2D terrain mask drawing | query-gated/diagnostic only | yes | legacy fallback and editor/lab surfaces | compatibility adapter, not production Three terrain |

## Findings

- No production scene imports `bathymetryToTerrainMeshData`.
- No production terrain renderer uses old per-cell boxed terrain construction.
- No active UI route reaches a pseudo-3D terrain module as mission terrain authority.
- `ThreeMissionWorldRenderer` and `ThreeBathymetryRenderer` both import the shared terrain, land, coastline, and contour layers.
- `BathymetryWorldRenderViewModel` now consumes `BathymetryMeshGeometry` directly and no longer imports the compatibility mesh helper.
- Box geometries that remain in production are marker/glyph utilities, not terrain implementations.
- Three.js never owns bathymetry truth, collision, route validity, target validity, dive feasibility, simulation, scoring, replay, hidden truth, calibrated forecast data, or operational claims.

## Production Import Graph

```text
MissionWorkspaceScene / SimulationScene
  -> MissionWorldStateAdapter / MissionWorldRenderViewModel
  -> BottomBoundaryViewModel
  -> BathymetrySurfaceViewModel
  -> BathymetryMeshGeometry / CoastlineGeometry / BathymetryContourGeometry
  -> ThreeMissionWorldRenderer
  -> ThreeBathymetryTerrainLayer + ThreeLandmassLayer + ThreeCoastlineLayer + ThreeBathymetryContourLayer

BathymetryWorldViewScene
  -> BathymetryWorldRenderViewModel
  -> BathymetrySurfaceViewModel
  -> BathymetryMeshGeometry / CoastlineGeometry / BathymetryContourGeometry
  -> ThreeBathymetryRenderer
  -> same shared layer family
```

## Closure Audits

- `tools/js/audit_no_legacy_terrain_production_imports.mjs` fails on production imports of compatibility terrain mesh data, stale standalone terrain helpers, reverted DOM runtime references, and boxed terrain construction in terrain renderer files.
- `tools/js/audit_bathymetry_scene_coordinate_alignment.mjs` verifies corners, terrain features, coastline bounds, contour bounds, and mesh vertex coordinates.
- `tools/js/audit_bathymetry_mesh_alignment_extended.mjs` verifies mesh/canonical sampler agreement across vertices, centers, random fractional samples, domain edges, canyon, shelf break, and seamount.
- `tools/js/smoke_coastline_topology_integrity.mjs` reports open chains, closed loops, duplicate segments, and gap warnings.
- `tools/js/audit_terrain_water_column_mask_integrity.mjs` verifies land, shelf, basin, deep masks, and integrated summary semantics.
- `tools/js/audit_terrain_trajectory_clearance_alignment.mjs` compares canonical and visual clearance with millimeter-level display tolerance.
- `tools/js/smoke_terrain_resource_lifecycle.mjs` verifies shared terrain layer reuse and disposal.
- `tools/js/smoke_terrain_quality_canonical_invariance.mjs` verifies Performance/Balanced/High quality profiles do not change canonical terrain samples or digests.
