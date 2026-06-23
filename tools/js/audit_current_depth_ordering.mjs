import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';
import { makeCurrentExplorerFixture } from './current_cube_test_helpers.mjs';

const slabLayer = fs.readFileSync('src/game/three/layers/ThreeOperationalDepthSlabLayer.js', 'utf8');
const currentLayerSource = fs.readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');
const layer = createThreeInstancedCurrentGlyphLayer();
const viewModel = {
  coordinateSystem: createMissionWorldCoordinateTransform({ grid: { width: 6, height: 5 } }),
  waterColumnExplorer: makeCurrentExplorerFixture({ activeLayerId: 'thermocline' }),
  waterColumn: { currentDisplayMode: 'activeSlice' }
};
updateThreeInstancedCurrentGlyphLayer(layer, viewModel);
const summary = threeInstancedCurrentGlyphLayerSummary(layer, viewModel);

assert.match(currentLayerSource, /DEFAULT_RENDER_ORDER\s*=\s*96/, 'current glyph render order is explicit and above slabs');
assert.equal(summary.glyphRenderOrder >= 90, true, 'current glyph render order is high');
assert.equal(summary.glyphLayerOffsetWorld > 0, true, 'current glyphs are offset above slab plane for display');
assert.equal(summary.glyphDepthWrite, false, 'current glyphs do not write depth over translucent slabs');
assert.match(slabLayer, /renderOrder|depthWrite|transparent/, 'slab layer has explicit transparency/depth policy');
assert.equal(summary.displayLayerChangesCurrent, false, 'display offset does not change canonical current');
assert.equal(summary.changesOfficialScoring, false, 'depth ordering does not change scoring');

console.log('audit_current_depth_ordering: ok', { renderOrder: summary.glyphRenderOrder, offset: summary.glyphLayerOffsetWorld });
