import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { headlessBundleFiles, writeHeadlessBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({ seed: 'h1-bundle-writer-smoke', width: 12, height: 9 }));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-h1-bundle-'));
const summary = writeHeadlessBundle(episode, dir);
for (const fileName of ['manifest.json', 'mission_config.json', 'visible_fields.json', 'hidden_fields.json', 'observations.json', 'observations.csv', 'glider_tracks.json', 'glider_tracks.csv', 'score_report.json', 'replay.json', 'episode.json']) {
  assert.equal(fs.existsSync(path.join(dir, fileName)), true, `${fileName} exists`);
}
assert.equal(summary.hiddenTruthExported, true, 'hidden truth exported by default');
const visibleText = fs.readFileSync(path.join(dir, 'visible_fields.json'), 'utf8');
assert.equal(visibleText.includes('T_hiddenTruth'), false, 'visible fields exclude hidden truth');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.ok(manifest.files.some((entry) => entry.path === 'hidden_fields.json' && ['hiddenTruth', 'oracle', 'debugAll'].includes(entry.visibilityTier)), 'manifest marks hidden truth file');

const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-h1-public-bundle-'));
writeHeadlessBundle(episode, publicDir, { includeHiddenTruth: false });
assert.equal(fs.existsSync(path.join(publicDir, 'hidden_fields.json')), false, 'hidden fields omitted when disabled');
const publicFiles = headlessBundleFiles(episode, { includeHiddenTruth: false });
assert.equal(Object.hasOwn(publicFiles, 'hidden_fields.json'), false, 'hidden file omitted from file map');

console.log('Headless bundle writer smoke passed');
