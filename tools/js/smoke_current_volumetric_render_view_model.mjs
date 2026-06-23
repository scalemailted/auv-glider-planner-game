import { assert } from './current_r2a3_test_helpers.mjs';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';

const grid = { width: 8, height: 6 };
const waterColumnConfig = { enabled: true, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' };
const field = createBathymetryConditionedCurrentField({ grid, depthAxisMeters: [0, 10, 35, 75, 150], timeAxisSeconds: [0, 600, 1200, 1800], landMask: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)) });
const level = { world: { grid, time: { duration: 1800, dt: 60 }, waterColumnConfig }, layers: { terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)), truth: { frames: [] } }, bathymetry: { depthMeters: field.bottomDepthMeters } };
const baseViewModel = { grid, coordinateSystem: createMissionWorldCoordinateTransform({ grid }), scalarFieldLayer: { values: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 1)) } };
const explorer = buildWaterColumnLayerExplorerViewModel({ level, waterColumnConfig, grid, baseViewModel, currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 600 });
const layer = createThreeInstancedCurrentGlyphLayer();
updateThreeInstancedCurrentGlyphLayer(layer, { grid, coordinateSystem: baseViewModel.coordinateSystem, waterColumnExplorer: explorer, waterColumn: { currentDisplayMode: 'sparseVolumetricField', currentVectorDensity: 'sparse' } });
const summary = threeInstancedCurrentGlyphLayerSummary(layer, { waterColumnExplorer: explorer, waterColumn: { currentDisplayMode: 'sparseVolumetricField' } });
assert.equal(summary.glyphDrawCallCount, 1);
assert.ok(summary.visibleDepthCount > 1, `visibleDepthCount ${summary.visibleDepthCount}`);
assert.ok(summary.volumetricGlyphCount > 0, 'volumetric glyphs counted');
console.log('[smoke_current_volumetric_render_view_model] PASS', { glyphs: summary.glyphInstanceCount, depths: summary.visibleDepthIds });
