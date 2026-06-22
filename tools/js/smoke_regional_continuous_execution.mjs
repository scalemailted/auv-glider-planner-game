import assert from 'node:assert/strict';

import { generateScenarioFromConfig } from '../../src/core/generation/ScenarioConfig.js';
import { normalizePlan } from '../../src/core/planning/WaypointPlan.js';
import { SimulationEngine } from '../../src/core/sim/SimulationEngine.js';
import { sampleSignedTerrainSurfaceAtUv } from '../../src/core/science/SignedTerrainSurfaceModel.js';

const { level, mission } = generateScenarioFromConfig({
  mode: 'perfectKnowledge',
  operationalDomainProfileId: 'regionalFleetArea',
  seed: 'world-r1-1-continuous-smoke',
  challengeId: 'CHALLENGE-world-r1-1-continuous'
});
const agent = mission.agents[0];
const selectedStart = { x: agent.start.x + 0.25, y: agent.start.y + 0.25, coordinateFrame: 'continuousGridV1' };
const target = firstNavigableTarget(level, selectedStart);
const plan = normalizePlan({
  schemaVersion: '2.0',
  type: 'anchor.plan',
  coordinateProfileId: 'continuousGridV1',
  fieldSamplingProfileId: 'continuousTrilinearV1',
  levelId: level.levelId,
  missionId: mission.missionId,
  agentPlans: [{
    agentId: agent.id,
    selectedStart,
    waypoints: [{
      id: 'fractional_waypoint_001',
      x: target.x,
      y: target.y,
      t: 8,
      window: 1,
      action: 'sample',
      coordinateProfileId: 'continuousGridV1',
      diveProfileId: 'thermoclineDive',
      targetDepthLayerId: 'thermocline',
      validationRadius: 0.45
    }]
  }]
}, level, mission);

assert.equal(plan.agentPlans[0].selectedStart.x, selectedStart.x, 'fractional selected start survives plan normalization');
assert.equal(plan.agentPlans[0].waypoints[0].x, target.x, 'fractional waypoint survives plan normalization');
assert.notEqual(plan.agentPlans[0].waypoints[0].x, Math.round(plan.agentPlans[0].waypoints[0].x), 'waypoint remains non-integer');

const engine = new SimulationEngine({ level, mission, plan });
assert.equal(engine.agents[0].history[0].x, selectedStart.x, 'simulation launch preserves fractional selected start');
assert.equal(engine.agents[0].history[0].y, selectedStart.y, 'simulation launch preserves fractional selected start');
engine.runUntilComplete(160);
const result = engine.getResult();
assert.ok(result.frames.length > 0, 'simulation emits frames');
assert.equal(result.continuousMission.coordinateFrame, 'continuousGridV1');
assert.ok(result.continuousMission.continuousWaypointCount >= 1, 'continuous summary counts fractional waypoints');
assert.equal(result.continuousMission.usesArbitraryXYZPlanning, false);
assert.equal(result.continuousMission.calibratedOceanForecast, false);
const firstHistory = result.trajectories[0].history[0];
assert.equal(firstHistory.x, selectedStart.x, 'result trajectory preserves exact continuous launch x');
assert.equal(firstHistory.y, selectedStart.y, 'result trajectory preserves exact continuous launch y');
assert.ok(result.trajectories[0].history.some((point) => Math.abs(Number(point.x) - Math.round(Number(point.x))) > 0.001 || Math.abs(Number(point.y) - Math.round(Number(point.y))) > 0.001), 'realized trajectory contains continuous positions');

console.log('smoke_regional_continuous_execution: ok');

function firstNavigableTarget(level, start) {
  const width = level.world.grid.width;
  const height = level.world.grid.height;
  for (let dx = 5; dx < Math.min(width - 2, 22); dx += 1) {
    for (let dy = -6; dy <= 6; dy += 1) {
      const x = Math.min(width - 2, Math.max(1, Math.floor(start.x + dx)));
      const y = Math.min(height - 2, Math.max(1, Math.floor(start.y + dy)));
      const u = width <= 1 ? 0 : x / (width - 1);
      const v = height <= 1 ? 0 : y / (height - 1);
      const sample = sampleSignedTerrainSurfaceAtUv(level.signedTerrainSurface, u, v);
      if (sample.navigable && !level.layers.terrain[y]?.[x]) return { x: x + 0.37, y: y + 0.42 };
    }
  }
  throw new Error('No navigable fractional target found for regional continuous smoke.');
}