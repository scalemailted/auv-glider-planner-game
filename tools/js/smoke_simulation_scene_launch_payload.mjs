import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

import { createMissionExecutionSnapshot, createMissionLaunchPayload, normalizeMissionLaunchPayload } from '../../src/core/simulation/MissionExecutionSnapshot.js';

const level = { levelId: 'payload-level', world: { grid: { width: 4, height: 4 }, time: { dt: 1, duration: 5 } }, layers: { terrain: Array.from({ length: 4 }, () => Array(4).fill(0)), truth: { frames: [] } }, meta: { seed: 'payload' } };
const mission = { missionId: 'payload-mission', agents: [{ id: 'g1', start: { x: 0, y: 0 }, maxSpeed: 1, battery: 50 }], rules: {}, scoring: {} };
const plan = { schemaVersion: '2.0', type: 'anchor.plan', agentPlans: [{ agentId: 'g1', selectedStart: { x: 0, y: 0 }, waypoints: [{ id: 'w1', x: 2, y: 1, action: 'sample', t: 2 }] }] };
const snapshot = createMissionExecutionSnapshot({ level, mission, plan, selectedAgentId: 'g1' });
const payload = createMissionLaunchPayload({ snapshot });
const normalized = normalizeMissionLaunchPayload(payload, {});
assert(normalized.planDigest === payload.planDigest, 'received payload digest must match launch digest');
assert(normalized.plan.agentPlans[0].waypoints[0].id === 'w1', 'received payload must preserve waypoint ID');
const source = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
assert(source.includes('normalizeMissionLaunchPayload'), 'SimulationScene must normalize launch payload');
assert(source.includes('level: this.launchPayload?.level'), 'SimulationScene engine must use launch payload level');
assert(source.includes('plan: this.launchPayload?.plan'), 'SimulationScene engine must use launch payload plan');
assert(source.indexOf('new SimulationEngine') < source.indexOf('refreshThreeSimulationRenderer'), 'engine should initialize before renderer refresh path');

console.log('smoke_simulation_scene_launch_payload passed');