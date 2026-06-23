import assert from 'node:assert/strict';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';

const grid = { width: 8, height: 6 };
const waterColumnConfig = { enabled: true, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' };
const field = createBathymetryConditionedCurrentField({ grid, depthAxisMeters: [0, 10, 35, 75, 150], timeAxisSeconds: [0, 600, 1200, 1800], landMask: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)) });
const level = { world: { grid, time: { duration: 1800, dt: 60 }, waterColumnConfig }, layers: { terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)), truth: { frames: [] } }, bathymetry: { depthMeters: field.bottomDepthMeters } };
const coordinateSystem = createMissionWorldCoordinateTransform({ grid });
const explorer = buildWaterColumnLayerExplorerViewModel({ level, waterColumnConfig, grid, currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 600 });
const layer = createThreeInstancedCurrentGlyphLayer();
updateThreeInstancedCurrentGlyphLayer(layer, { grid, coordinateSystem, waterColumnExplorer: explorer, waterColumn: { currentDisplayMode: 'stackedDepthField', currentVectorDensity: 'sparse' } });
const summary = threeInstancedCurrentGlyphLayerSummary(layer, { waterColumnExplorer: explorer, waterColumn: { currentDisplayMode: 'stackedDepthField' } });
assert.ok(summary.visibleDepthCount >= 4, `visible depth count ${summary.visibleDepthCount}`);
assert.equal(summary.noPerVectorThreeObjects, true);
console.log('[audit_volumetric_current_rendering] PASS', { depths: summary.visibleDepthIds, glyphs: summary.glyphInstanceCount });
