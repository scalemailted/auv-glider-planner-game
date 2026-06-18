#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildBrowserHeadlessReplaySummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const payload = JSON.parse(fs.readFileSync('docs/examples/headless_replay_public.example.json', 'utf8'));
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
const summary = buildBrowserHeadlessReplaySummaryArtifact(bundle, { currentEventIndex: 1, currentCheckpointIndex: 0, selectedAgentId: 'glider-alpha' });
assert.equal(summary.type, 'anchor.browser.headless-replay-summary');
assert.equal(summary.integrityStatus, 'PASS');
assert.equal(summary.selectedAgentId, 'glider-alpha');
assert.equal(summary.usesHiddenTruthResimulation, false);
assert.equal(summary.usesMARL, false);
assert.equal(JSON.stringify(summary).includes('"events"'), false);
assert.equal(JSON.stringify(summary).includes('T_hiddenTruth'), false);
console.log(JSON.stringify({ ok: true, type: summary.type, status: summary.integrityStatus }, null, 2));