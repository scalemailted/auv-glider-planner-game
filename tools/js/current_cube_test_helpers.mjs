import assert from 'node:assert/strict';
import { createSyntheticCurrentCubeFixture } from '../../src/core/science/SyntheticCurrentCubeAdapter.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';
import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { makeBaseViewModel, makeGrid, makeLevel, makeMission, makePlan, TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';

export { assert };

export function makeCurrentCubeFixture() {
  return createSyntheticCurrentCubeFixture({
    seed: 73,
    grid: { width: 6, height: 5 },
    depthAxisMeters: [0, 15, 35, 75, 150],
    timeAxisSeconds: [0, 600, 1800],
    waterColumnConfig: { ...TEST_WATER_COLUMN_CONFIG, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'] }
  });
}

export function makeCurrentExplorerFixture(options = {}) {
  const grid = makeGrid(6, 5);
  const level = makeLevel({ grid, waterColumnConfig: { ...TEST_WATER_COLUMN_CONFIG, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'] } });
  const baseViewModel = makeBaseViewModel({ grid, level, selectedCell: { x: 2, y: 2 } });
  const currentField4D = makeCurrentCubeFixture();
  return buildWaterColumnLayerExplorerViewModel({
    level,
    mission: makeMission(),
    plan: makePlan(),
    grid,
    baseViewModel,
    waterColumnConfig: level.world.waterColumnConfig,
    currentField4D,
    activeLayerId: options.activeLayerId ?? 'thermocline',
    activeTimeSeconds: options.activeTimeSeconds ?? 600,
    displayMode: options.displayMode ?? 'activeCurrentSlice',
    selectedLocation: options.selectedLocation ?? { x: 2, y: 2 }
  });
}

export function sampleFixture(depthMeters, timeSeconds = 600, x = 2, y = 2) {
  return sampleOceanCurrent({ field: makeCurrentCubeFixture(), eastMeters: x, northMeters: y, depthMeters, timeSeconds, interpolation: 'linear4d' });
}

export function materiallyDifferent(a, b, epsilon = 0.01) {
  return Math.hypot(Number(a.uEastMetersPerSecond) - Number(b.uEastMetersPerSecond), Number(a.vNorthMetersPerSecond) - Number(b.vNorthMetersPerSecond)) > epsilon;
}

export function assertFiniteCurrent(sample) {
  assert.equal(Number.isFinite(Number(sample.uEastMetersPerSecond)), true, 'u component must be finite');
  assert.equal(Number.isFinite(Number(sample.vNorthMetersPerSecond)), true, 'v component must be finite');
  assert.equal(Number.isFinite(Number(sample.magnitudeMetersPerSecond)), true, 'magnitude must be finite');
}
