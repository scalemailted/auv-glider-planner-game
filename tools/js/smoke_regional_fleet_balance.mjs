import assert from 'node:assert/strict';

import { createRegionalMissionBundle } from '../../src/core/generation/RegionalMissionDefaults.js';
import { createMissionScaleModel, estimateRouteScale } from '../../src/core/domain/MissionScaleModel.js';

const { level, mission } = createRegionalMissionBundle({ seed: 'world-r1-fleet-balance' });
const scale = createMissionScaleModel({
  domain: level.operationalDomain,
  profile: level.resolutionProfile,
  glider: { nominalSpeedMetersPerSecond: mission.agents[0].nominalSpeedMetersPerSecond }
});

const routeEstimates = mission.agents.map((agent, index) => {
  const start = agent.start;
  const finish = { x: level.world.grid.width - 6 - index * 3, y: Math.round(level.world.grid.height * (0.32 + index * 0.14)) };
  return estimateRouteScale([start, finish], scale);
});

assert.equal(routeEstimates.length, 3);
for (const estimate of routeEstimates) {
  assert.ok(estimate.distanceKm >= 40, 'regional fleet route should represent regional travel distance');
  assert.ok(estimate.estimatedDurationHours > 24, 'regional route should expose long-duration planning pressure');
  assert.equal(estimate.ownsSimulation, false);
}
const spread = Math.max(...routeEstimates.map((entry) => entry.distanceKm)) - Math.min(...routeEstimates.map((entry) => entry.distanceKm));
assert.ok(spread < 25, 'default fleet routes should be roughly balanced for classroom comparison');

console.log('smoke_regional_fleet_balance: ok');
