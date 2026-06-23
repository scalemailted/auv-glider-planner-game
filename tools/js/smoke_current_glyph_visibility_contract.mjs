import assert from 'node:assert/strict';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';
import { makeCurrentExplorerFixture } from './current_cube_test_helpers.mjs';

const explorer = makeCurrentExplorerFixture({ activeLayerId: 'thermocline', activeTimeSeconds: 600 });
const layer = createThreeInstancedCurrentGlyphLayer();
const viewModel = {
  grid: { width: 6, height: 5 },
  coordinateSystem: createMissionWorldCoordinateTransform({ grid: { width: 6, height: 5 } }),
  waterColumnExplorer: explorer,
  waterColumn: { currentDisplayMode: 'activeSlice', currentVectorDensity: 'balanced', currentMagnitudeScale: 1.8, currentColorMode: 'speed' }
};
updateThreeInstancedCurrentGlyphLayer(layer, viewModel);
const summary = threeInstancedCurrentGlyphLayerSummary(layer, viewModel);

assert.equal(summary.glyphMeshVisible, true, 'glyph mesh is visible');
assert.equal(summary.glyphParentVisible, true, 'glyph parent group is visible');
assert.equal(summary.noPerVectorThreeObjects, true, 'glyphs remain instanced');
assert.equal(summary.glyphInstanceCount > 0, true, 'instance count is nonzero');
assert.equal(summary.finiteVectorSampleCount, summary.sourceVectorSampleCount, 'finite transforms for all source samples');
assert.equal(summary.glyphMinimumScale > 0, true, 'minimum scale is nonzero');
assert.equal(summary.glyphMaximumScale >= summary.glyphMinimumScale, true, 'scale range is valid');
assert.equal(summary.glyphOpacity > 0.75, true, 'active glyph opacity is visible');
assert.equal(summary.glyphDepthWrite, false, 'glyphs do not write translucent depth');
assert.equal(summary.glyphRenderOrder >= 90, true, 'glyph render order is above slabs/scalar textures');
assert.equal(summary.glyphLayerOffsetWorld > 0, true, 'glyphs use a display-only slab offset');

console.log('smoke_current_glyph_visibility_contract: ok', summary);
