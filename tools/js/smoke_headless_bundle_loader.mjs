import assert from 'node:assert/strict';

import { buildHeadlessBundleFromFiles, headlessBundleLoadSummary, validateHeadlessBundleFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({ seed: 'h2-loader-smoke', width: 10, height: 8 }));
const publicFiles = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
assert.ok(publicFiles['bundle.json'], 'combined bundle exists');
const combinedBundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: publicFiles['bundle.json'] }]);
assert.equal(combinedBundle.failures.length, 0, 'combined bundle has no loader failures');
assert.equal(combinedBundle.hiddenFields, null, 'public combined bundle has hiddenFields null');
assert.equal(Object.hasOwn(combinedBundle.visibleFields.fields, 'T_hiddenTruth'), false, 'visible fields exclude hidden truth');
const combinedSummary = headlessBundleLoadSummary(combinedBundle);
assert.equal(combinedSummary.observationCount > 0, true, 'combined bundle exposes observations');
assert.equal(combinedSummary.trackPointCount > 0, true, 'combined bundle exposes tracks');

const csvOnlyEntries = ['manifest.json', 'mission_config.json', 'visible_fields.json', 'observations.csv', 'glider_tracks.csv', 'score_report.json'].map((fileName) => ({ fileName, text: publicFiles[fileName] }));
const csvOnlyValidation = validateHeadlessBundleFiles(csvOnlyEntries);
assert.equal(csvOnlyValidation.failures.length, 0, 'CSV-only observations/tracks pass file validation');
const csvOnlyBundle = buildHeadlessBundleFromFiles(csvOnlyEntries);
assert.equal(csvOnlyBundle.observations.length > 0, true, 'CSV observations normalize');
assert.equal(csvOnlyBundle.gliderTracks.length > 0, true, 'CSV tracks normalize');

console.log('Headless bundle loader smoke passed');
