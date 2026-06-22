import assert from 'node:assert/strict';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, disposeThreeInstancedCurrentGlyphLayer } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';
import { makeCurrentExplorerFixture } from './current_cube_test_helpers.mjs';

const layer = createThreeInstancedCurrentGlyphLayer();
const viewModel = { grid: { width: 6, height: 5 }, coordinateSystem: createMissionWorldCoordinateTransform({ grid: { width: 6, height: 5 } }), waterColumnExplorer: makeCurrentExplorerFixture() };
updateThreeInstancedCurrentGlyphLayer(layer, viewModel);
assert.equal(layer.group.children.length, 1);
disposeThreeInstancedCurrentGlyphLayer(layer);
assert.equal(layer.group.children.length, 0);
assert.equal(layer.mesh, null);
console.log('[audit_current_resource_lifecycle] PASS');
