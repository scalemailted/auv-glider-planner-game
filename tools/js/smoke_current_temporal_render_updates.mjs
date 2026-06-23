import { assert, vectorDistance } from './current_r2a3_test_helpers.mjs';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';

const grid = { width: 8, height: 6 };
const waterColumnConfig = { enabled: true, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' };
const field = createBathymetryConditionedCurrentField({ grid, depthAxisMeters: [0, 10, 35, 75, 150], timeAxisSeconds: [0, 600, 1200, 1800], landMask: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)) });
const level = { world: { grid, time: { duration: 1800, dt: 60 }, waterColumnConfig }, layers: { terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)), truth: { frames: [] } }, bathymetry: { depthMeters: field.bottomDepthMeters } };
const first = buildWaterColumnLayerExplorerViewModel({ level, waterColumnConfig, grid, currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 0, selectedLocation: { x: 4, y: 3 } });
const second = buildWaterColumnLayerExplorerViewModel({ level, waterColumnConfig, grid, currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 1200, selectedLocation: { x: 4, y: 3 } });
const a = first.selectedCurrentProfile.samplesByDepth.find((sample) => sample.layerId === 'thermocline');
const b = second.selectedCurrentProfile.samplesByDepth.find((sample) => sample.layerId === 'thermocline');
assert.ok(vectorDistance(a, b) > 1e-4, 'current changes with canonical time');
console.log('[smoke_current_temporal_render_updates] PASS', { t0: a, t1: b });
