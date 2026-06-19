import assert from 'node:assert/strict';
import { continuousPointToContainingCell, localMetersToContinuousPoint } from '../../src/core/geometry/ContinuousMissionCoordinates.js';
import { normalizeContinuousMissionWaypoint, validateContinuousMissionWaypoint } from '../../src/core/planning/ContinuousMissionWaypoint.js';
import { sampleContinuousRouteSegment, validateContinuousRouteSegment } from '../../src/core/planning/ContinuousRouteGeometry.js';
import { sampleScalarFieldContinuous, sampleVectorFieldContinuous, validateVolumetricFieldSample } from '../../src/core/science/VolumetricFieldSampler.js';
import { advanceGliderDiveStateMachine, GLIDER_DIVE_KINEMATICS_MODEL } from '../../src/core/sim/GliderDiveStateMachine.js';
import { SimulationEngine } from '../../src/core/sim/SimulationEngine.js';
import { createEmptyPlan, normalizePlan } from '../../src/core/planning/WaypointPlan.js';

const grid = { width: 6, height: 6 };
const point = { x: 4.32, y: 7.81, coordinateFrame: 'continuousGridV1' };
const containing = continuousPointToContainingCell(point, { grid: { width: 10, height: 10 } });
assert.equal(containing.col, 4, 'continuous containing-cell col is center-aware');
assert.equal(containing.row, 8, 'continuous containing-cell row is center-aware');
assert.equal(containing.convention, 'center-aware-containing-cell', 'continuous containing-cell documents no half-cell migration');

const roundtrip = localMetersToContinuousPoint({ east: -0.5, north: 1.25 }, { width: 6, height: 6, cellSize: 1 });
assert.equal(roundtrip.coordinateFrame, 'continuousGridV1');
assert.ok(Number.isFinite(roundtrip.x));

const waypoint = normalizeContinuousMissionWaypoint({ x: 2.35, y: 3.65, targetDepthLayerId: 'thermocline', diveProfileId: 'thermoclineDive', validationRadius: 0.35, coordinateProfileId: 'continuousGridV1' }, { grid, coordinateProfileId: 'continuousGridV1' });
assert.equal(waypoint.x, 2.35);
assert.equal(waypoint.y, 3.65);
assert.equal(waypoint.legacyCell.col, 2);
assert.equal(waypoint.legacyCell.row, 4);
assert.equal(waypoint.metadata.arbitraryMidwaterXyzWaypoint, false);
assert.equal(validateContinuousMissionWaypoint(waypoint, { grid }).valid, true);

const sampledRoute = sampleContinuousRouteSegment({ from: { x: 0.1, y: 0.1 }, to: { x: 3.1, y: 2.1 } }, { grid, maxSpacingCells: 0.25 });
assert.ok(sampledRoute.sampleCount > 2, 'continuous route validation samples interior points, not endpoints only');
const routeValidation = validateContinuousRouteSegment({ from: { x: 0.1, y: 0.1 }, to: { x: 3.1, y: 2.1 }, maximumDepthMeters: 15 }, { grid, terrain: Array.from({ length: 6 }, () => Array(6).fill(0)), bathymetry: { depthMeters: Array.from({ length: 6 }, () => Array(6).fill(50)) } }, { grid });
assert.equal(routeValidation.valid, true);
assert.equal(routeValidation.endpointOnlyValidation, false);

const scalar = sampleScalarFieldContinuous({
  field: [
    [[0, 1], [1, 2]],
    [[10, 11], [11, 12]]
  ],
  x: 0.5,
  y: 0.5,
  depthMeters: 5,
  depthCoordinates: [0, 10],
  interpolationProfileId: 'trilinearVolumeV1'
});
assert.equal(validateVolumetricFieldSample(scalar).valid, true);
assert.equal(scalar.value, 6);

const vector = sampleVectorFieldContinuous({
  field: {
    u: [[[0, 2], [2, 4]], [[10, 12], [12, 14]]],
    v: [[[1, 1], [1, 1]], [[3, 3], [3, 3]]]
  },
  x: 0.5,
  y: 0.5,
  depthMeters: 5,
  depthCoordinates: [0, 10],
  interpolationProfileId: 'trilinearVolumeV1'
});
assert.equal(validateVolumetricFieldSample(vector).valid, true);
assert.equal(vector.u, 7);
assert.equal(vector.v, 2);

const dive = advanceGliderDiveStateMachine({ agentId: 'g1', position: { x: 0, y: 0, depthMeters: 0 }, divePhase: 'surfaced' }, {
  dt: 10,
  waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'thermoclineDive' },
  diveProfileId: 'thermoclineDive',
  targetDepthLayerId: 'thermocline',
  localBathymetryMeters: 80,
  segmentLength: 4,
  segmentProgress: 0.25,
  verticalSpeedMetersPerSecond: 2
});
assert.equal(GLIDER_DIVE_KINEMATICS_MODEL.seaExplorerValidated, false);
assert.equal(GLIDER_DIVE_KINEMATICS_MODEL.operationallyCalibrated, false);
assert.ok(dive.state.position.depthMeters > 0, 'dive state machine advances actual depth');
assert.equal(dive.model.operationallyCalibrated, false);

const level = {
  levelId: 'continuous-smoke-level',
  instanceId: 'continuous-smoke-instance',
  meta: { coordinateProfileId: 'continuousGridV1', fieldSamplingProfileId: 'continuousTrilinearV1', seed: 'continuous-smoke' },
  world: {
    grid,
    time: { dt: 0.25, duration: 12, planningWindow: 4 },
    waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'], defaultLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'thermoclineDive', source: 'generatedModernMission' }
  },
  layers: {
    terrain: Array.from({ length: 6 }, () => Array(6).fill(0)),
    hazards: Array.from({ length: 6 }, () => Array(6).fill(0)),
    truth: {
      frames: Array.from({ length: 4 }, (_value, index) => ({
        t: index,
        roi: Array.from({ length: 6 }, (_row, y) => Array.from({ length: 6 }, (_cell, x) => (x === 4 && y === 4 ? 1 : 0.05))),
        current: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => [0.01, 0]))
      }))
    }
  },
  bathymetry: { depthMeters: Array.from({ length: 6 }, () => Array(6).fill(90)) }
};
const mission = {
  missionId: 'continuous-smoke-mission',
  meta: { coordinateProfileId: 'continuousGridV1', fieldSamplingProfileId: 'continuousTrilinearV1', waterColumnConfigSource: 'generatedModernMission' },
  agents: [{ id: 'g1', label: 'Glider 1', start: { x: 0, y: 0 }, battery: 200, maxSpeed: 1.2, samplingRadius: 0.9, waypointTolerance: 0.45 }],
  rules: { roiThreshold: 0.05, samplingRadius: 0.9, waterColumn: { defaultDiveProfileId: 'thermoclineDive', defaultTargetDepthLayerId: 'thermocline' } },
  physics: { driftGain: 0.1, energyPerCell: 1, verticalSpeedMetersPerSecond: 2, minimumBottomClearanceMeters: 5 },
  scoring: { sampleWeight: 1, energyPenalty: 0 },
  waterColumnConfig: level.world.waterColumnConfig
};
const plan = normalizePlan({
  ...createEmptyPlan(level, mission),
  coordinateProfileId: 'continuousGridV1',
  fieldSamplingProfileId: 'continuousTrilinearV1',
  agentPlans: [{
    agentId: 'g1',
    selectedStart: { x: 0, y: 0 },
    waypoints: [{ x: 4.32, y: 4.18, t: 4, window: 1, action: 'sample', coordinateProfileId: 'continuousGridV1', diveProfileId: 'thermoclineDive', targetDepthLayerId: 'thermocline', validationRadius: 0.45 }]
  }]
}, level, mission);
assert.equal(plan.agentPlans[0].waypoints[0].x, 4.32);
assert.equal(plan.agentPlans[0].waypoints[0].derivedCell.col, 4);
assert.equal(plan.agentPlans[0].waypoints[0].derivedCell.row, 4);

const engine = new SimulationEngine({ level, mission, plan });
engine.runUntilComplete(200);
const result = engine.getResult();
assert.equal(globalThis.ANCHOR_CONTINUOUS_MISSION_DEBUG?.usesArbitraryXYZPlanning, false);
assert.equal(globalThis.ANCHOR_CONTINUOUS_MISSION_DEBUG?.operationallyCalibrated, false);
assert.equal(result.continuousMission.usesArbitraryXYZPlanning, false);
assert.equal(result.continuousMission.calibratedOceanForecast, false);
assert.ok(result.frames.length > 0, 'simulation emits frames');
if (!result.trajectories[0].history.some((point) => Number(point.depthMeters) > 0)) {
  console.log('continuous smoke depth diagnostic', { aborted: result.aborted, abortReason: result.abortReason, stopReason: result.stopReason, events: result.events.slice(0, 6), lastHistory: result.trajectories[0].history.slice(-5), validation: engine.initialValidation });
}
assert.ok(result.trajectories[0].history.some((point) => Number(point.depthMeters) > 0), 'realized trajectory carries actual dive depth');

console.log('smoke_continuous_mission_geometry: ok', {
  waypoint: plan.agentPlans[0].waypoints[0].position,
  frameCount: result.frames.length,
  maxDepth: result.continuousMission.maximumActualDepthMeters,
  debugType: globalThis.ANCHOR_CONTINUOUS_MISSION_DEBUG?.type
});