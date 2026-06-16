import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessCombinedBundle, headlessBundleFiles, writeHeadlessBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({ seed: 'h2-combined-export-smoke', width: 10, height: 8 }));
const combined = createHeadlessCombinedBundle(episode, { includeHiddenTruth: false });
assert.equal(combined.type, 'anchor.headless.bundle', 'combined bundle type');
assert.equal(combined.hiddenFields, null, 'public combined bundle has hiddenFields null');
assert.equal(Object.hasOwn(combined.visibleFields.fields, 'T_hiddenTruth'), false, 'public visible fields exclude T_hiddenTruth');
const files = headlessBundleFiles(episode, { includeHiddenTruth: false, combinedJson: true });
assert.ok(files['bundle.json'], 'bundle.json included in file map');
assert.equal(Object.hasOwn(files, 'hidden_fields.json'), false, 'public file map omits hidden_fields.json');
const parsed = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: files['bundle.json'] }]);
assert.equal(parsed.failures.length, 0, 'combined bundle parses without loader failures');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-h2-combined-bundle-'));
const summary = writeHeadlessBundle(episode, dir, { includeHiddenTruth: false, combinedJson: true });
assert.equal(summary.combinedBundle, true, 'write summary marks combined bundle');
assert.equal(fs.existsSync(path.join(dir, 'bundle.json')), true, 'bundle.json written');
assert.equal(fs.existsSync(path.join(dir, 'hidden_fields.json')), false, 'hidden fields omitted from public write');

console.log('Headless bundle combined export smoke passed');
