import assert from 'node:assert/strict';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, disposeThreeInstancedCurrentGlyphLayer } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';
import { makeCurrentExplorerFixture } from './current_cube_test_helpers.mjs';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';

const layer = createThreeInstancedCurrentGlyphLayer();
const viewModel = { grid: { width: 6, height: 5 }, coordinateSystem: createMissionWorldCoordinateTransform({ grid: { width: 6, height: 5 } }), waterColumnExplorer: makeCurrentExplorerFixture() };
updateThreeInstancedCurrentGlyphLayer(layer, viewModel);
assert.equal(layer.group.children.length, 1);
assert.equal(layer.objectCreateCount, 1, 'one shared instanced mesh is created');
disposeThreeInstancedCurrentGlyphLayer(layer);
assert.equal(layer.group.children.length, 0);
assert.equal(layer.mesh, null);
assert.equal(layer.capacity, 0, 'dispose resets glyph capacity');
const timelineProbe = buildTimelineProbe({ seed: 'flow-runtime-r1-1-resource-lifecycle' });
assert.equal(timelineProbe.later.glyphObjectCreateCount, timelineProbe.first.glyphObjectCreateCount, 'timeline updates reuse the current glyph mesh');
assert.equal(timelineProbe.later.currentLayerUpdateCount > timelineProbe.first.currentLayerUpdateCount, true, 'timeline updates refresh current glyph data without recreating resources');
console.log('[audit_current_resource_lifecycle] PASS');
