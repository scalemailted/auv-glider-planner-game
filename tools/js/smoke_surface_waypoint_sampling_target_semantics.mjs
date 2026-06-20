import assert from 'node:assert/strict';
import { createEmptyPlan, addWaypoint, addScienceTarget, normalizePlan, validatePlan } from '../../src/core/planning/WaypointPlan.js';

const level = { levelId: 'semantics', world: { grid: { width: 8, height: 8 }, time: { duration: 1000, dt: 60 } }, layers: { terrain: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => false)) } };
const mission = { missionId: 'semantics', agents: [{ id: 'g1', start: { x: 0, y: 0 } }] };
const plan = createEmptyPlan(level, mission);
addWaypoint(plan, 'g1', { x: 2, y: 2, action: 'sample', kind: 'navigation' });
addScienceTarget(plan, { id: 'target-1', geometryType: 'layerPoint', position: { x: 2, y: 2, depthMeters: 35 }, depthLayerId: 'thermocline' });
const normalized = normalizePlan(JSON.parse(JSON.stringify(plan)), level, mission);
const validation = validatePlan(normalized, mission);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(normalized.agentPlans[0].waypoints.length, 1, 'surface waypoint modifies executable route');
assert.equal(normalized.scienceTargets.length, 1, 'sampling target is separate from executable route');
assert.equal(normalized.scienceTargets[0].executable, false, 'sampling target remains non-executable');
assert.equal(normalized.scienceTargets[0].boundaryFlags.canCreateScoreWithoutObservation, false, 'actual observation alone may score');
console.log(JSON.stringify({ ok: true, waypointCount: normalized.agentPlans[0].waypoints.length, scienceTargetCount: normalized.scienceTargets.length }));