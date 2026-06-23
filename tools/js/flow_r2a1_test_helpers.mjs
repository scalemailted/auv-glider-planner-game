import { createSyntheticCurrentCubeFixture, getSyntheticCurrentCubeFromMissionWorld } from '../../src/core/science/SyntheticCurrentCubeAdapter.js';
import { buildWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';

export const FLOW_R2A1_WATER_COLUMN_CONFIG = Object.freeze({
  enabled: true,
  depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'],
  defaultLayerIds: ['surface', 'thermocline', 'deep'],
  diveProfileId: 'sawtoothProfile',
  defaultDiveProfileId: 'sawtoothProfile',
  defaultTargetDepthLayerId: 'deep'
});

export function makeFlowR2A1Grid(width = 8, height = 6) {
  return { width, height };
}

export function makeFlowR2A1Level(options = {}) {
  const grid = options.grid ?? makeFlowR2A1Grid();
  const depthMeters = Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => options.bottomDepthMeters ?? 220));
  return {
    levelId: options.levelId ?? 'flow-r2a-1-launch-fixture',
    id: options.levelId ?? 'flow-r2a-1-launch-fixture',
    meta: { seed: options.seed ?? 91 },
    world: { grid, time: { duration: 1800, dt: 1, planningWindow: 600 }, waterColumnConfig: options.waterColumnConfig ?? FLOW_R2A1_WATER_COLUMN_CONFIG },
    layers: {
      terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)),
      hazards: [],
      truth: { frames: [] },
      depthMeters
    },
    bathymetry: { depthMeters }
  };
}

export function makeFlowR2A1Mission(options = {}) {
  const waterColumnConfig = options.waterColumnConfig ?? FLOW_R2A1_WATER_COLUMN_CONFIG;
  return {
    missionId: options.missionId ?? 'flow-r2a-1-launch-mission',
    id: options.missionId ?? 'flow-r2a-1-launch-mission',
    waterColumnConfig,
    agents: [
      { id: 'glider-1', label: 'Glider 1', start: { x: 1, y: 2 }, maxSpeed: 1000, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' },
      { id: 'glider-2', label: 'Glider 2', start: { x: 1, y: 1 }, maxSpeed: 1000, diveProfileId: 'surfaceOnly' },
      { id: 'glider-3', label: 'Glider 3', start: { x: 1, y: 3 }, maxSpeed: 1000, diveProfileId: 'surfaceOnly' }
    ],
    rules: { roiThreshold: 0, samplingRadius: 0.9, waterColumn: { defaultDiveProfileId: 'sawtoothProfile', defaultTargetDepthLayerId: 'deep' } },
    scoring: { depthScience: { scoreProfileId: 'depthAwareScienceV1' } },
    physics: { minimumBottomClearanceMeters: 5, verticalSpeedMetersPerSecond: 0.3, driftGain: 0.08 }
  };
}

export function makeFlowR2A1Plan() {
  return {
    type: 'anchor.plan',
    coordinateProfileId: 'continuousGridV1',
    fieldSamplingProfileId: 'trilinearVolumeV1',
    agentPlans: [
      { agentId: 'glider-1', selectedStart: { x: 1, y: 2 }, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep', waypoints: [{ id: 'wp-1', x: 3, y: 2, action: 'sample', segmentTravelTime: 300, estimatedArrivalTime: 300, t: 300 }, { id: 'wp-2', x: 5, y: 2, action: 'sample', segmentTravelTime: 300, estimatedArrivalTime: 600, t: 600 }] },
      { agentId: 'glider-2', selectedStart: { x: 1, y: 1 }, waypoints: [] },
      { agentId: 'glider-3', selectedStart: { x: 1, y: 3 }, waypoints: [] }
    ]
  };
}

export function makeFlowR2A1BaseViewModel(level = makeFlowR2A1Level()) {
  const grid = level.world.grid;
  return {
    grid,
    level,
    coordinateSystem: createMissionWorldCoordinateTransform({ grid }),
    scalarFieldLayer: { id: 'sampleValue', values: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 1)) },
    vectorFieldLayer: { id: 'legacy', vectors: [] },
    selectedCell: { x: 2, y: 2 }
  };
}

export function makeCachedCurrentField(level = makeFlowR2A1Level()) {
  return getSyntheticCurrentCubeFromMissionWorld({ level, waterColumnConfig: level.world.waterColumnConfig, grid: level.world.grid });
}

export function makeFixtureCurrentField() {
  return createSyntheticCurrentCubeFixture({ grid: { width: 8, height: 6 }, waterColumnConfig: FLOW_R2A1_WATER_COLUMN_CONFIG, seed: 91 });
}

export function makeCurrentExplorer(level = makeFlowR2A1Level(), options = {}) {
  return buildWaterColumnLayerExplorerViewModel({
    level,
    mission: makeFlowR2A1Mission(),
    plan: makeFlowR2A1Plan(),
    grid: level.world.grid,
    baseViewModel: makeFlowR2A1BaseViewModel(level),
    waterColumnConfig: level.world.waterColumnConfig,
    currentField4D: options.currentField4D,
    activeLayerId: options.activeLayerId ?? 'thermocline',
    activeTimeSeconds: options.activeTimeSeconds ?? 600,
    displayMode: options.displayMode ?? 'activeCurrentSlice',
    selectedLocation: options.selectedLocation ?? { x: 2, y: 2 }
  });
}