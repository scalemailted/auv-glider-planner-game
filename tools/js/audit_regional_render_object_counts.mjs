import assert from 'node:assert/strict';

import { createRegionalMissionBundle } from '../../src/core/generation/RegionalMissionDefaults.js';
import { buildBathymetrySurfaceViewModel } from '../../src/core/rendering/BathymetrySurfaceViewModel.js';
import { buildBathymetryMeshGeometry } from '../../src/core/rendering/BathymetryMeshGeometry.js';
import {
  createThreeLandmassLayer,
  updateThreeLandmassLayer,
  threeLandmassLayerSummary,
  disposeThreeLandmassLayer
} from '../../src/game/three/layers/ThreeLandmassLayer.js';

const { level } = createRegionalMissionBundle({ seed: 'world-r1-1-render-count-audit', profile: 'regionalFleet', agentCount: 3 });
const profile = level.resolutionProfile;
const terrainSamples = profile.terrainGrid.columns * profile.terrainGrid.rows;
const scalarSamples = profile.scienceGrid.columns * profile.scienceGrid.rows;
const currentSamples = profile.currentGrid.columns * profile.currentGrid.rows;
assert.ok(terrainSamples > scalarSamples, 'terrain source resolution should exceed scalar source resolution for regional missions');
assert.ok(scalarSamples > currentSamples, 'scalar source resolution should exceed current source resolution for regional missions');
assert.equal(profile.renderLod.usesSourceGridAsObjectGrid, false);
assert.ok(profile.renderLod.currentVectorMaxGlyphs < currentSamples, 'current glyph display must be LOD bounded below source samples');

const surface = buildBathymetrySurfaceViewModel({ bathymetry: level.bathymetry, grid: level.world.grid });
const mesh = buildBathymetryMeshGeometry({ surfaceModel: surface });
assert.ok(mesh.vertexCount <= profile.renderLod.terrainMaxVertices * 1.5, 'regional terrain mesh should stay within declared browser-friendly bound');
assert.ok(mesh.triangleCount > 0, 'terrain mesh should contain indexed triangles');
assert.ok(Array.isArray(mesh.indices) && mesh.indices.length > 0, 'terrain mesh should expose an index buffer');

const land = createThreeLandmassLayer();
updateThreeLandmassLayer(land, mesh);
const summary = threeLandmassLayerSummary(land, mesh);
assert.equal(summary.landTileMeshCount, 0);
assert.equal(summary.usesPerCellLandMeshes, false);
assert.ok(summary.landVertexCount > 0, 'regional terrain should expose land vertices through the shared mesh');
assert.equal(land.group.children.length <= 1, true, 'landmass layer should create at most one display mesh');
disposeThreeLandmassLayer(land);

console.log('audit_regional_render_object_counts: ok');