import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTerrainAwareMissionValidationReport } from '../../src/core/planning/TerrainAwareMissionValidation.js';

const sceneSource = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
assert.match(sceneSource, /createTerrainValidationCacheState/);
assert.match(sceneSource, /planningValidationBuildCount/);
assert.match(sceneSource, /planningValidationCacheHitCount/);
assert.match(sceneSource, /lastPlanningValidationInvalidationReason/);
assert.match(sceneSource, /terrainValidationPlanKey/);
assert.doesNotMatch(sceneSource.match(/buildTerrainValidationCacheKey[\s\S]*?terrainValidationInvalidationReason/)?.[0] ?? '', /cameraPreset|verticalExaggeration|labelVisibility|issue selection/i);

const level = {
  levelId: 'cache-smoke-level',
  world: { grid: { width: 4, height: 4 }, time: { dt: 1, duration: 20 } },
  bathymetry: { depthMeters: Array.from({ length: 4 }, () => Array(4).fill(80)), landMask: Array.from({ length: 4 }, () => Array(4).fill(false)) },
  layers: { terrain: Array.from({ length: 4 }, () => Array(4).fill(0)) }
};
const mission = { missionId: 'cache-smoke-mission', agents: [{ id: 'g1', deployment: { selectedStart: { x: 0, y: 0 } } }], physics: { minimumBottomClearanceMeters: 5 }, rules: { requireExecutableRoute: true } };
const plan = { missionId: mission.missionId, agentPlans: [{ agentId: 'g1', selectedStart: { x: 0, y: 0 }, waypoints: [{ id: 'w1', x: 2, y: 2, action: 'sample' }] }] };
const first = buildTerrainAwareMissionValidationReport({ level, mission, plan });
const second = buildTerrainAwareMissionValidationReport({ level, mission, plan });
assert.equal(first.planDigest, second.planDigest);
assert.equal(first.terrainSourceDigest, second.terrainSourceDigest);
assert.equal(first.boundaryFlags.rendererOwnsValidation, false);
plan.agentPlans[0].waypoints[0].x = 3;
const changed = buildTerrainAwareMissionValidationReport({ level, mission, plan });
assert.notEqual(first.planDigest, changed.planDigest);
console.log('terrain validation cache smoke passed');