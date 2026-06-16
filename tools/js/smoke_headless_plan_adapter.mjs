#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { classifyPlanArtifact, extractHeadlessWaypointsFromPlan, normalizeAnchorPlanForHeadless, planHeadlessCompatibilitySummary, validateHeadlessPlanAgainstMission } from '../../src/core/headless/HeadlessPlanAdapter.js';

const packet = readJson('docs/examples/headless_solver_packet.example.json');
const plan = readJson('docs/examples/headless_solver_plan.example.json');
const before = JSON.stringify(plan);
const classification = classifyPlanArtifact(plan);
assert.equal(classification.recognized, true, 'anchor.plan is recognized');
assert.equal(classification.agentPlanCount, 1, 'example contains one agent plan');

const validation = validateHeadlessPlanAgainstMission(plan, packet);
assert.equal(validation.ok, true, 'example plan validates against packet mission');
assert.equal(validation.status, 'PASS', 'example plan validation status');
assert.equal(validation.selectedAgentId, 'glider_01', 'selected glider id');

const runtimePlan = normalizeAnchorPlanForHeadless(plan, packet);
assert.equal(runtimePlan.type, 'anchor.headless.waypoint-plan', 'plan adapts to H1 runtime waypoint plan');
assert.equal(runtimePlan.generatesRoute, false, 'adapter does not generate a route');
assert.equal(runtimePlan.gliderId, 'glider_01', 'runtime glider id');
assert.ok(extractHeadlessWaypointsFromPlan(plan, packet).length > 0, 'runtime waypoints are extracted');

const summary = planHeadlessCompatibilitySummary(plan, packet);
assert.equal(summary.validationStatus, 'PASS', 'compatibility summary carries validation status');
assert.equal(summary.usesGeneratedPlan, false, 'summary marks submitted plan, not generated plan');
assert.equal(summary.usesNewPlanner, false, 'summary marks no new planner');
assert.equal(JSON.stringify(plan), before, 'adapter does not mutate plan input');

const badPlan = structuredClone(plan);
badPlan.agentPlans[0].waypoints[0].x = 999;
const badValidation = validateHeadlessPlanAgainstMission(badPlan, packet);
assert.equal(badValidation.ok, false, 'out-of-grid waypoint fails validation');
assert.match(badValidation.errors.join(' '), /outside/i, 'out-of-grid failure is explicit');

console.log('Headless plan adapter smoke passed', {
  planId: classification.planId,
  selectedAgentId: validation.selectedAgentId,
  waypointCount: runtimePlan.waypoints.length
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}