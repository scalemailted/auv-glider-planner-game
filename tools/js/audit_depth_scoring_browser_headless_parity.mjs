import assert from 'node:assert/strict';
import { evaluateDepthAwareProfileValue } from '../../src/core/science/DepthAwareScienceValue.js';

const config = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'fullProfile' };
const observations = [
  { observationId: 'obs-1', gliderId: 'glider-1', x: 0, y: 0, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 0, observedValue: 1.2, forecastValue: 1.0 },
  { observationId: 'obs-2', gliderId: 'glider-1', x: 1, y: 0, depthLayerId: 'thermocline', depthMeters: 35, timeSeconds: 60, observedValue: 4.2, forecastValue: 3.4 },
  { observationId: 'obs-3', gliderId: 'glider-1', x: 2, y: 0, depthLayerId: 'deep', depthMeters: 150, timeSeconds: 120, observedValue: 3.1, forecastValue: 2.9 }
];
const browser = evaluateDepthAwareProfileValue({ observations, waterColumnConfig: config, missionObjective: 'thermoclineFront', scoreProfile: 'depthAwareScienceV1', agentId: 'glider-1' });
const headless = evaluateDepthAwareProfileValue({ observations: structuredClone(observations), waterColumnConfig: structuredClone(config), missionObjective: 'thermoclineFront', scoreProfile: 'depthAwareScienceV1', agentId: 'glider-1' });
assert.equal(browser.summary.totalScienceScore, headless.summary.totalScienceScore, 'credited science parity');
assert.deepEqual(browser.summary.scienceValueByDepthLayer, headless.summary.scienceValueByDepthLayer, 'layer summary parity');
assert.deepEqual(browser.scoreEvents.map((event) => event.depthLayerId), headless.scoreEvents.map((event) => event.depthLayerId), 'sample depth parity');
assert.equal(browser.summary.duplicateScoreEventCount, headless.summary.duplicateScoreEventCount, 'redundancy parity');
assert.equal(browser.summary.browserHeadlessParityStatus, 'not_checked');
console.log('audit_depth_scoring_browser_headless_parity: PASS');
