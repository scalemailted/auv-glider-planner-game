import assert from 'node:assert/strict';

import { updateHeadlessBeliefFromObservations } from '../../src/core/headless/runtime/HeadlessBeliefUpdate.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { field3dStats, sampleNearest3d } from '../../src/core/headless/runtime/HeadlessGrid.js';
import { computeHeadlessPriorityComponents, computeHeadlessSamplingPriority, headlessPrioritySummary } from '../../src/core/headless/runtime/HeadlessPriority.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';

const config = createDefaultHeadlessRuntimeConfig({ seed: 'h1-belief-priority-smoke', width: 14, height: 10 });
const fieldPack = createHeadlessFieldPack(config);
const x = 6;
const y = 5;
const zIndex = 1;
const beforeBelief = sampleNearest3d(fieldPack.fields.mu_belief, x, y, zIndex);
const beforeUncertainty = sampleNearest3d(fieldPack.fields.U_uncertainty, x, y, zIndex);
const after = updateHeadlessBeliefFromObservations({
  fieldPack,
  observations: [{ x, y, zIndex, observedValue: 0.95, rawObservedValue: 0.95, surprise: 2.8 }],
  radius: 2,
  confidence: 0.7,
  stalenessRate: 0
});
assert.notEqual(sampleNearest3d(after.fields.mu_belief, x, y, zIndex), beforeBelief, 'belief changes near observation');
assert.ok(sampleNearest3d(after.fields.U_uncertainty, x, y, zIndex) < beforeUncertainty, 'uncertainty decreases near observation');

const priority = computeHeadlessSamplingPriority(after, config);
const stats = field3dStats(priority);
assert.equal(stats.invalidCount, 0, 'priority finite');
assert.ok(Number(stats.min) >= 0 && Number(stats.max) <= 1, 'priority normalized');
assert.notDeepEqual(priority, after.fields.T_hiddenTruth, 'priority not identical to hidden truth');
const components = computeHeadlessPriorityComponents(after, config);
const summary = headlessPrioritySummary(priority, components);
assert.equal(summary.excludesRouteTravelCost, true, 'priority excludes route cost');

console.log('Headless belief/priority smoke passed');
