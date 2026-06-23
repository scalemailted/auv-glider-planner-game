import assert from 'node:assert/strict';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';
import { makeCurrentExplorerFixture } from './current_cube_test_helpers.mjs';

const layer = createThreeInstancedCurrentGlyphLayer();
const viewModel = {
  coordinateSystem: createMissionWorldCoordinateTransform({ grid: { width: 6, height: 5 } }),
  waterColumnExplorer: makeCurrentExplorerFixture({ activeLayerId: 'thermocline' }),
  waterColumn: { currentColorMode: 'speed', currentMagnitudeScale: 1.8, currentVectorDensity: 'balanced' }
};
updateThreeInstancedCurrentGlyphLayer(layer, viewModel);
const summary = threeInstancedCurrentGlyphLayerSummary(layer, viewModel);
const material = layer.mesh?.material;
assert.equal(material?.transparent, true, 'current glyph material is transparent');
assert.equal(material?.depthWrite, false, 'current glyph material does not write depth');
assert.equal(material?.depthTest, true, 'current glyph material depth tests against terrain');
assert.equal(material?.toneMapped, false, 'glyph colors are not tone-mapped into low contrast');
assert.equal(summary.glyphOpacity >= 0.9, true, 'current glyph opacity is readable');
assert.equal(summary.glyphMinimumScale > 0, true, 'minimum scale is readable');
assert.equal(summary.glyphPrimitive, 'instanced-horizontal-arrow-kite', 'primitive has a directional head/tail');

console.log('audit_current_material_visibility: ok', { opacity: summary.glyphOpacity, primitive: summary.glyphPrimitive });
