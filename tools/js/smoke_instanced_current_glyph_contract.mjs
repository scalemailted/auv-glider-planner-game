import { assert, makeCurrentExplorerFixture } from './current_cube_test_helpers.mjs';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';

const explorer = makeCurrentExplorerFixture({ displayMode: 'activeCurrentSlice' });
const layer = createThreeInstancedCurrentGlyphLayer();
const viewModel = {
  grid: { width: 6, height: 5 },
  coordinateSystem: createMissionWorldCoordinateTransform({ grid: { width: 6, height: 5 } }),
  waterColumnExplorer: explorer,
  waterColumn: { currentVectorDensity: 1, currentColorMode: 'speed' }
};
updateThreeInstancedCurrentGlyphLayer(layer, viewModel);
const summary = threeInstancedCurrentGlyphLayerSummary(layer, viewModel);
assert.equal(summary.noPerVectorThreeObjects, true);
assert.equal(summary.glyphInstanceCount > 0, true);
assert.equal(summary.glyphDrawCallCount, 1);
assert.equal(layer.group.children.length, 1);
console.log('[smoke_instanced_current_glyph_contract] PASS', summary);
