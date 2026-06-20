import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry } from '../../src/core/science/BathymetryFieldModel.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import { createThreeBathymetryTerrainLayer, updateThreeBathymetryTerrainLayer, disposeThreeBathymetryTerrainLayer, threeBathymetryTerrainLayerSummary } from '../../src/game/three/layers/ThreeBathymetryTerrainLayer.js';
import { createThreeLandmassLayer, updateThreeLandmassLayer, disposeThreeLandmassLayer, threeLandmassLayerSummary } from '../../src/game/three/layers/ThreeLandmassLayer.js';
import { extractCoastlineSegments } from '../../src/core/rendering/CoastlineGeometry.js';
import { createThreeCoastlineLayer, updateThreeCoastlineLayer, disposeThreeCoastlineLayer, threeCoastlineLayerSummary } from '../../src/game/three/layers/ThreeCoastlineLayer.js';
import { buildBathymetryContourGeometry } from '../../src/core/rendering/BathymetryContourGeometry.js';
import { createThreeBathymetryContourLayer, updateThreeBathymetryContourLayer, disposeThreeBathymetryContourLayer, threeBathymetryContourLayerSummary } from '../../src/game/three/layers/ThreeBathymetryContourLayer.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'terrain-resource-lifecycle', width: 32, height: 22 });
const surface = buildBathymetrySurfaceViewModel({ bathymetry, grid: { width: bathymetry.width, height: bathymetry.height } });
const mesh = buildBathymetryMeshGeometry({ surfaceModel: surface });
const coastline = extractCoastlineSegments({ surfaceModel: surface });
const contours = buildBathymetryContourGeometry({ surfaceModel: surface });
const terrain = createThreeBathymetryTerrainLayer();
const land = createThreeLandmassLayer();
const coast = createThreeCoastlineLayer();
const contour = createThreeBathymetryContourLayer();

updateThreeBathymetryTerrainLayer(terrain, mesh, { qualityProfile: 'balanced' });
updateThreeLandmassLayer(land, mesh);
updateThreeCoastlineLayer(coast, coastline, { width: mesh.width, height: mesh.height });
updateThreeBathymetryContourLayer(contour, contours, { width: mesh.width, height: mesh.height });
const first = summary();
updateThreeBathymetryTerrainLayer(terrain, mesh, { qualityProfile: 'balanced' });
updateThreeLandmassLayer(land, mesh);
updateThreeCoastlineLayer(coast, coastline, { width: mesh.width, height: mesh.height });
updateThreeBathymetryContourLayer(contour, contours, { width: mesh.width, height: mesh.height });
const second = summary();
assert.equal(second.terrainBuildCount, first.terrainBuildCount, 'same geometry update should reuse terrain layer objects');
assert.equal(second.landBuildCount, first.landBuildCount, 'same geometry update should reuse land layer objects');
assert.equal(second.coastlineBuildCount, first.coastlineBuildCount, 'same geometry update should reuse coastline layer objects');
assert.equal(second.contourBuildCount, first.contourBuildCount, 'same geometry update should reuse contour layer objects');

disposeThreeBathymetryTerrainLayer(terrain);
disposeThreeLandmassLayer(land);
disposeThreeCoastlineLayer(coast);
disposeThreeBathymetryContourLayer(contour);
const disposed = summary();
assert.equal(disposed.terrainObjectCount, 0, 'terrain objects disposed');
assert.equal(disposed.landObjectCount, 0, 'land object disposed');
assert.equal(disposed.coastlineObjectCount, 0, 'coastline object disposed');
assert.equal(disposed.contourObjectCount, 0, 'contour object disposed');

console.log(JSON.stringify({ ok: true, first, second, disposed, terrainResourceGrowthWarningCount: 0 }));

function summary() {
  return {
    terrainObjectCount: threeBathymetryTerrainLayerSummary(terrain, mesh).terrainObjectCount,
    terrainBuildCount: threeBathymetryTerrainLayerSummary(terrain, mesh).terrainBuildCount,
    landObjectCount: land.mesh ? 1 : 0,
    landBuildCount: threeLandmassLayerSummary(land, mesh).landBuildCount,
    coastlineObjectCount: coast.line ? 1 : 0,
    coastlineBuildCount: threeCoastlineLayerSummary(coast, coastline).coastlineBuildCount,
    contourObjectCount: contour.line ? 1 : 0,
    contourBuildCount: threeBathymetryContourLayerSummary(contour, contours).contourBuildCount
  };
}
