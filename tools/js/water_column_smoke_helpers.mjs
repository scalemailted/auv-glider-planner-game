import assert from 'node:assert/strict';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { buildVolumetricMissionWorldViewModel } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';

export const TEST_WATER_COLUMN_CONFIG = Object.freeze({
  enabled: true,
  depthLayerIds: ['surface', 'shallow', 'thermocline', 'deep'],
  defaultLayerIds: ['surface', 'thermocline', 'deep'],
  diveProfileId: 'sawtoothProfile'
});

export function makeGrid(width = 6, height = 5) {
  return { width, height };
}

export function makeBottomDepthField(grid = makeGrid()) {
  return Array.from({ length: grid.height }, (_row, y) => Array.from({ length: grid.width }, (_cell, x) => {
    if (x === 0 && y === 0) return 0;
    if (x === 1 && y === 1) return 24;
    if (x === 2 && y === 1) return 55;
    return 180;
  }));
}

export function makeScalarValues(grid = makeGrid()) {
  return Array.from({ length: grid.height }, (_row, y) => Array.from({ length: grid.width }, (_cell, x) => Number(((x + 1) / grid.width + (y + 1) / grid.height).toFixed(4))));
}

export function makeVectors(grid = makeGrid()) {
  const vectors = [];
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) vectors.push({ id: `v-${x}-${y}`, x, y, u: 0.1 + x * 0.01, v: -0.05 + y * 0.01 });
  }
  return vectors;
}

export function makeLevel(options = {}) {
  const grid = options.grid ?? makeGrid();
  const depthMeters = options.depthMeters ?? makeBottomDepthField(grid);
  const terrain = depthMeters.map((row) => row.map((value) => Number(value) <= 0));
  return {
    levelId: 'water-column-smoke-level',
    world: {
      grid,
      time: { duration: 3600, dt: 60 },
      ...(options.explicitWaterColumnConfig === false ? {} : { waterColumnConfig: options.waterColumnConfig ?? TEST_WATER_COLUMN_CONFIG })
    },
    layers: { terrain, hazards: [] },
    bathymetry: { depthMeters, landMask: terrain }
  };
}

export function makeMission() {
  return {
    missionId: 'water-column-smoke-mission',
    agents: [{ id: 'glider-1', label: 'Smoke Glider', start: { x: 0, y: 1 }, diveProfileId: 'sawtoothProfile' }]
  };
}

export function makePlan() {
  return {
    type: 'anchor.plan',
    agentPlans: [{
      agentId: 'glider-1',
      selectedStart: { x: 0, y: 1 },
      diveProfileId: 'sawtoothProfile',
      targetDepthLayerId: 'thermocline',
      waypoints: [
        { id: 'wp-1', x: 1, y: 2, action: 'sample', diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline' },
        { id: 'wp-2', x: 4, y: 3, action: 'sample', diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' }
      ]
    }]
  };
}

export function makeBaseViewModel(options = {}) {
  const grid = options.grid ?? makeGrid();
  const coordinateSystem = createMissionWorldCoordinateTransform({ grid, depthScale: 0.045, verticalExaggeration: 1.35 });
  return {
    type: 'anchor.rendering.mission-world-view-model',
    version: 'water-column-smoke-base',
    phase: options.phase ?? 'planning',
    grid,
    coordinateSystem,
    visibility: { depthLayers: true, scalarField: true, currentVectors: true },
    scalarFieldLayer: { id: 'sampleValue', values: makeScalarValues(grid), width: grid.width, height: grid.height, min: 0, max: 2, opacity: 0.65 },
    vectorFieldLayer: { id: 'currents', vectors: makeVectors(grid) },
    terrain: { values: (options.level?.layers?.terrain ?? Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false))) },
    routes: [{ id: 'route-1', agentId: 'glider-1', points: [{ x: 0, y: 1 }, { x: 2, y: 2 }, { x: 4, y: 3 }] }],
    gliders: [{ agentId: 'glider-1', x: 0, y: 1, selected: true }],
    observations: [{ id: 'obs-1', x: 2, y: 2, value: 0.8, depthLayerId: 'thermocline' }],
    selectedCell: options.selectedCell ?? { x: 2, y: 2 }
  };
}

export function makeVolumetricViewModel(options = {}) {
  const level = options.level ?? makeLevel(options);
  const mission = options.mission ?? makeMission();
  const plan = options.plan ?? makePlan();
  return buildVolumetricMissionWorldViewModel({
    baseViewModel: options.baseViewModel ?? makeBaseViewModel({ ...options, level }),
    level,
    mission,
    plan,
    displaySettings: {
      waterColumnConfig: options.waterColumnConfig,
      waterColumn: {
        verticalDisplayMode: options.verticalDisplayMode ?? 'physicalDepth',
        activeDepthLayerId: options.activeDepthLayerId ?? 'thermocline',
        selectedScalarFieldId: 'sampleValue',
        currentDisplayMode: 'activeSlice',
        currentLayerMode: 'followSelectedGlider',
        currentVectorDensity: 'balanced',
        currentMagnitudeScale: 1.8,
        currentColorMode: 'speed',
        showContextCurrents: false,
        ...(options.waterColumnUi ?? {})
      }
    }
  });
}

export function assertFiniteNumber(value, message) {
  assert.equal(Number.isFinite(Number(value)), true, message);
}
