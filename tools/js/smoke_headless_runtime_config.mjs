import assert from 'node:assert/strict';

import {
  HEADLESS_RUNTIME_FIELD_IDS,
  createDefaultHeadlessGliderPlan,
  createDefaultHeadlessMissionConfig,
  createDefaultHeadlessRuntimeConfig,
  headlessRuntimeConfigSummary,
  validateHeadlessRuntimeConfig
} from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';

const config = createDefaultHeadlessRuntimeConfig({ seed: 'h1-config-smoke' });
const validation = validateHeadlessRuntimeConfig(config);
assert.equal(validation.status, 'PASS', validation.errors.join('; '));
assert.equal(config.grid.width, 32, 'default width');
assert.equal(config.grid.height, 24, 'default height');
assert.deepEqual(config.grid.depthLayers, ['surface', 'thermocline', 'deep'], 'default depth layers');
for (const fieldId of HEADLESS_RUNTIME_FIELD_IDS) assert.ok(config.fields.includes(fieldId), `missing ${fieldId}`);
assert.ok(config.plan.waypoints.length >= 4, 'default plan exists');
assert.equal(config.plan.generatesRoute, false, 'default plan does not generate route');
assert.equal(config.boundary.implementsPythonSimulator, false, 'no Python simulator claim');
assert.equal(config.boundary.implementsNewPlanner, false, 'no new planner claim');
assert.equal(config.boundary.implementsMARL, false, 'no MARL claim');

const mission = createDefaultHeadlessMissionConfig({ width: 12, height: 10, seed: 'h1-config-smoke' });
assert.equal(mission.type, 'anchor.headless.mission-config', 'mission config type');
assert.ok(mission.visibleFields.includes('A_global'), 'mission exposes priority field');
assert.ok(mission.hiddenFields.includes('T_hiddenTruth'), 'mission names hidden truth');

const plan = createDefaultHeadlessGliderPlan({ width: 12, height: 10, depthLayers: ['surface', 'deep'] });
assert.equal(plan.generatesRoute, false, 'plan is fixed waypoints');
assert.ok(plan.waypoints.every((waypoint) => Number.isFinite(waypoint.x) && Number.isFinite(waypoint.y)), 'waypoints finite');

const summary = headlessRuntimeConfigSummary(config);
assert.equal(summary.valid, true, 'summary validates');
assert.ok(summary.boundary.includes('Browser ANCHOR remains'), 'required boundary language present');

console.log('Headless runtime config smoke passed');
