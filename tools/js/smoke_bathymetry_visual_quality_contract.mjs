import assert from 'node:assert/strict';

import {
  bathymetryToTerrainMeshData,
  createCoastalOperationalBathymetry,
  createIslandArcBathymetry,
  createShelfCanyonBathymetry,
  createBasinSeamountBathymetry,
  extractCoastlineEdges
} from '../../src/core/science/BathymetryFieldModel.js';

const scenarios = [
  createCoastalOperationalBathymetry({ seed: 'gfx-r2-coast', width: 36, height: 24 }),
  createShelfCanyonBathymetry({ seed: 'gfx-r2-canyon', width: 36, height: 24 }),
  createIslandArcBathymetry({ seed: 'gfx-r2-island', width: 36, height: 24 }),
  createBasinSeamountBathymetry({ seed: 'gfx-r2-basin', width: 36, height: 24 })
];
const allFeatures = new Set(scenarios.flatMap((entry) => entry.featureIds ?? []));
for (const required of ['landCoast', 'continentalShelf', 'deepBasin']) assert.ok(allFeatures.has(required), `feature ${required} present`);
assert.ok(allFeatures.has('submarineCanyon') || allFeatures.has('submarineRidge'), 'canyon or ridge feature present');
assert.ok(allFeatures.has('seamount') || allFeatures.has('islandArc'), 'seamount or island feature present');
for (const bathymetry of scenarios) {
  const mesh = bathymetryToTerrainMeshData(bathymetry);
  const coast = extractCoastlineEdges(bathymetry.landMask ?? bathymetry.landSeaMask);
  assert.ok(bathymetry.stats.maxDepthMeters > bathymetry.stats.minDepthMeters, `${bathymetry.scenarioId} finite depth range`);
  assert.ok(bathymetry.stats.landCellCount > 0, `${bathymetry.scenarioId} has land/coast`);
  assert.ok(bathymetry.stats.waterCellCount > 0, `${bathymetry.scenarioId} has water`);
  assert.ok(coast.length > 0, `${bathymetry.scenarioId} coastline edges non-empty`);
  assert.ok(mesh.vertexCount > 0 && mesh.triangleCount > 0, `${bathymetry.scenarioId} terrain mesh non-empty`);
  assert.equal(JSON.stringify(bathymetry).includes('T_hiddenTruth'), false, `${bathymetry.scenarioId} has no hidden truth payload`);
}
console.log('smoke_bathymetry_visual_quality_contract: ok');