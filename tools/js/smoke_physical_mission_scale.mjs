import assert from 'node:assert/strict';

import { createOperationalDomainSpec } from '../../src/core/domain/OperationalDomainSpec.js';
import { normalizeMissionResolutionProfile } from '../../src/core/domain/MissionResolutionProfile.js';
import {
  createMissionScaleModel,
  distanceMetersBetweenMissionPoints,
  estimateRouteScale,
  missionScaleModelSummary,
  validateMissionScaleModel
} from '../../src/core/domain/MissionScaleModel.js';

const scale = createMissionScaleModel({
  domain: createOperationalDomainSpec(),
  profile: normalizeMissionResolutionProfile('regionalShelfFleet'),
  glider: { nominalSpeedMetersPerSecond: 0.35, energyPerMeter: 0.001 }
});
assert.equal(validateMissionScaleModel(scale).valid, true);
const summary = missionScaleModelSummary(scale);
assert.ok(summary.planningCellWidthMeters > 1000, 'regional planning cells should represent kilometer-scale areas');
assert.equal(summary.estimatesOnly, true);
assert.equal(summary.calibratedVehicleController, false);

const distance = distanceMetersBetweenMissionPoints({ x: 0, y: 0 }, { x: 47, y: 29 }, scale);
assert.ok(distance > 50000, 'cross-domain distance should reflect physical meters, not cell count');
const route = estimateRouteScale([{ x: 2, y: 10 }, { x: 20, y: 12 }, { x: 42, y: 16 }], scale);
assert.ok(route.distanceKm > 40);
assert.equal(route.ownsSimulation, false);
assert.equal(route.ownsScoring, false);

console.log('smoke_physical_mission_scale: ok');
