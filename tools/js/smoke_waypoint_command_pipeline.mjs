import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { addWaypoint, getAgentPlan, isValidWaypointCell } from '../../src/core/planning/WaypointPlan.js';
import { createMissionWorldFixture, deepClone } from './mission_world_fixture.mjs';

const fixture = createMissionWorldFixture();
const plan = deepClone(fixture.plan);
const before = getAgentPlan(plan, 'glider-alpha').waypoints.length;
const waypoint = addWaypoint(plan, 'glider-alpha', { x: 5, y: 2, action: 'sample', t: 180, kind: 'navigation' });
assert.equal(getAgentPlan(plan, 'glider-alpha').waypoints.length, before + 1, 'canonical addWaypoint command should add one waypoint');
assert.equal(getAgentPlan(plan, 'glider-alpha').waypoints.at(-1).id, waypoint.id, 'canonical waypoint id should be preserved');
assert.equal(getAgentPlan(plan, 'glider-alpha').waypoints.at(-1).action, 'sample', 'waypoint action should be preserved');
assert.equal(getAgentPlan(plan, 'glider-alpha').waypoints.at(-1).t, 180, 'waypoint time should be preserved');
assert.deepEqual(getAgentPlan(plan, 'glider-alpha').waypoints.map((record) => record.id).slice(-1), [waypoint.id], 'route order should append to the selected agent route');

const rejected = isValidWaypointCell(fixture.level, 0, 0);
assert.equal(rejected.valid, false, 'land/blocked cell should reject');
assert.ok(rejected.message, 'rejected placement should preserve a visible validation reason');
assert.equal(getAgentPlan(plan, 'glider-alpha').waypoints.length, before + 1, 'validation-only rejected cell should not mutate plan');

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const placeWaypointBody = scene.match(/placeWaypointFromThree\(intent\) \{[\s\S]*?previewWaypointMoveFromThree\(intent\)/)?.[0] ?? '';
assert.ok(placeWaypointBody.includes('this.addWaypointForSelected'), 'Three waypoint placement should call the canonical scene command path');
assert.ok(placeWaypointBody.includes('recordWaypointPipeline'), 'command path should record pipeline diagnostics');
assert.ok(placeWaypointBody.includes("stage: 'canonicalCommand'"), 'command result stage should be explicit');
assert.ok(placeWaypointBody.includes("status: 'accepted'"), 'accepted command should be visible in diagnostics');
assert.ok(placeWaypointBody.includes("status: 'rejected'"), 'rejected command should be visible in diagnostics');

const root = process.cwd();
const threeFiles = walk(path.join(root, 'src/game/three')).filter((file) => file.endsWith('.js'));
for (const file of threeFiles) {
  const source = readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /\.waypoints\.push\(|waypoints\.push\(|addWaypoint\(|setSelectedStart\(/, `${path.relative(root, file)} must not mutate canonical plans directly`);
}

console.log('THREE-R1.1C waypoint command pipeline smoke passed.');

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
