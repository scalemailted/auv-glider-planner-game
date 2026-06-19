import assert from 'node:assert/strict';
import { generateScenarioFromConfig } from '../../src/core/generation/ScenarioConfig.js';
import { createEmptyPlan } from '../../src/core/planning/WaypointPlan.js';
import { SimulationEngine } from '../../src/core/sim/SimulationEngine.js';

const generated = generateScenarioFromConfig({ mode: 'perfectKnowledge', seed: 'surface-parity', width: 10, height: 10, duration: 6, agentCount: 1 });
const modernLevel = clone(generated.level);
const modernMission = clone(generated.mission);
selectFirstDeployment(modernLevel, modernMission);
const legacyLevel = clone(modernLevel);
const legacyMission = clone(modernMission);
delete legacyLevel.world.waterColumnConfig;
delete legacyMission.waterColumnConfig;
delete legacyMission.world.waterColumnConfig;
for (const agent of legacyMission.agents ?? []) {
  delete agent.diveProfileId;
  delete agent.targetDepthLayerId;
}
const modernPlan = createEmptyPlan(modernLevel, modernMission);
const legacyPlan = createEmptyPlan(legacyLevel, legacyMission);
const modernResult = run(modernLevel, modernMission, modernPlan);
const legacyResult = run(legacyLevel, legacyMission, legacyPlan);
assert.deepEqual(resultDigest(modernResult), resultDigest(legacyResult));
console.log('smoke_surface_default_result_parity passed');

function run(level, mission, plan) {
  const engine = new SimulationEngine({ level, mission, plan });
  engine.runUntilComplete(400);
  return engine.getResult();
}

function resultDigest(result) {
  return {
    score: round(result.summary?.score ?? result.summary?.totalScore ?? 0),
    hazardsHit: result.summary?.hazardsHit ?? 0,
    energyUsed: round(result.summary?.energyUsed ?? 0),
    elapsedTime: round(result.summary?.elapsedTime ?? result.summary?.time ?? 0),
    stopReason: result.stopReason?.reason ?? result.summary?.stopReason?.reason ?? null,
    agents: (result.trajectories ?? []).map((trajectory) => {
      const last = trajectory.history?.at(-1) ?? {};
      return { agentId: trajectory.agentId, x: round(last.x ?? 0), y: round(last.y ?? 0) };
    })
  };
}

function selectFirstDeployment(level, mission) {
  const firstZone = (level.zones ?? []).find((zone) => zone.type === 'deployment');
  const firstCell = firstZone?.cells?.[0] ?? { x: 0, y: 0 };
  for (const agent of mission.agents ?? []) {
    agent.deployment ??= {};
    agent.deployment.selectedStart = { x: firstCell.x, y: firstCell.y };
    agent.deployment.selectedZoneId = firstZone?.id ?? null;
    agent.start = { x: firstCell.x, y: firstCell.y };
  }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function round(value) { return Number(Number(value ?? 0).toFixed(6)); }