import assert from 'node:assert/strict';
import {
  browserFieldsToHeadlessFields,
  browserHeadlessMappingSummary,
  exportTypeHeadlessCompatibility,
  headlessArtifactForBrowserType
} from '../../src/core/headless/BrowserHeadlessSchemaMap.js';

const requiredTypes = [
  'anchor.benchmark.mode-config',
  'anchor.benchmark.episode-config',
  'anchor.benchmark.run-record',
  'anchor.benchmark.route-execution',
  'anchor.benchmark.attempt-set',
  'anchor.benchmark.comparison',
  'anchor.benchmark.route-overlay',
  'anchor.benchmark.attempt-session',
  'anchor.benchmark.adaptive-manager-config',
  'anchor.benchmark.adaptive-manager-state',
  'anchor.benchmark.adaptive-objective-transition',
  'anchor.benchmark.adaptive-surfacing-event',
  'anchor.benchmark.adaptive-manager-preview',
  'anchor.benchmark.adaptive-launch-config',
  'anchor.benchmark.adaptive-surfacing-decision',
  'anchor.benchmark.adaptive-next-leg-config',
  'anchor.benchmark.adaptive-episode-trace',
  'anchor.benchmark.adaptive-episode-session',
  'anchor.benchmark.adaptive-objective-history',
  'anchor.benchmark.adaptive-leg-record',
  'anchor.benchmark.adaptive-session-summary',
  'anchor.demo.sampling-process-field',
  'anchor.demo.flow-field',
  'anchor.demo.coupled-fields',
  'anchor.demo.uncertainty-forecast',
  'anchor.demo.sampling-priority',
  'anchor.demo.flow-coupled-sampling',
  'anchor.plan',
  'anchor.result',
  'anchor.solverPacket'
];
for (const type of requiredTypes) {
  const mapping = headlessArtifactForBrowserType(type);
  assert.notEqual(mapping.compatibility, 'unknown', `${type} maps to a known H0 status`);
  assert.ok(mapping.headlessType.startsWith('anchor.headless.'), `${type} maps to headless type`);
}
assert.equal(exportTypeHeadlessCompatibility('anchor.solverPacket').headlessType, 'anchor.headless.mission-config', 'solver packet maps to mission config');
assert.equal(headlessArtifactForBrowserType('anchor.benchmark.adaptive-episode-session').compatibility, 'ready', 'P8 session maps ready');
assert.ok(['hiddenTruth', 'oracle'].includes(headlessArtifactForBrowserType('anchor.demo.sampling-process-field').visibilityRisk), 'sampling-process truth has hidden/oracle visibility risk');
const fields = browserFieldsToHeadlessFields({ truth: [], current: [], samplingPriority: [], actionValue: [], hiddenEventProbability: [] });
for (const id of ['T_hiddenTruth', 'F_u', 'F_v', 'A_global', 'Q_glider', 'hiddenEventProbability']) {
  assert.ok(fields.includes(id), `${id} maps from browser fields`);
}
const summary = browserHeadlessMappingSummary();
assert.deepEqual(summary.unmappedRequiredP8Types, [], 'no unmapped required P8 adaptive types remain');
assert.deepEqual(summary.unmappedRequiredBenchmarkTypes, [], 'no unmapped required benchmark types remain');
assert.deepEqual(summary.unmappedRequiredDemoTypes, [], 'no unmapped required demo types remain');
console.log('smoke_browser_headless_schema_map: ok');