import { near } from './current_r2a3_test_helpers.mjs';
import { createManufacturedCurrentField } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';
import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';

const grid = { width: 5, height: 5 };
const waterColumnConfig = { enabled: true, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' };
const field = createManufacturedCurrentField('linearShearWithDepth');
const level = { world: { grid, time: { duration: 1800, dt: 60 }, waterColumnConfig }, layers: { terrain: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => false)), truth: { frames: [] } }, bathymetry: { depthMeters: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 200)) } };
const explorer = buildWaterColumnLayerExplorerViewModel({ level, waterColumnConfig, grid, currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 600, selectedLocation: { x: 2, y: 2 } });
const gliderSample = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 35, timeSeconds: 600 });
const rendered = explorer.layers.find((layer) => layer.id === 'thermocline').currentField.vectors.find((vector) => vector.x === 2 && vector.y === 2);
near(rendered.uEastMetersPerSecond, gliderSample.uEastMetersPerSecond, 1e-6, 'render/glider u');
near(rendered.vNorthMetersPerSecond, gliderSample.vNorthMetersPerSecond, 1e-6, 'render/glider v');
console.log('[smoke_current_glider_depth_time_parity] PASS', { gliderSample, rendered });
