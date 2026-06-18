#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { validateHeadlessBundle } from '../../src/core/headless/HeadlessBundleValidation.js';

const clean = JSON.parse(fs.readFileSync('docs/examples/headless_replay_public.example.json', 'utf8'));
let bundle = buildHeadlessBundleFromFiles([
  { fileName: 'bundle.json', payload: clean },
  { fileName: 'replay_events.json', payload: clean.replayEvents }
]);
assert.equal(bundle.failures.some((entry) => /REPLAY_COMBINED_SEPARATE_MISMATCH/.test(entry)), false);
assert.equal(validateHeadlessBundle(bundle).summary.hasReplayEvents, true);

const changedEvents = structuredClone(clean.replayEvents);
changedEvents.schemaVersion = 'replay-r9.0';
bundle = buildHeadlessBundleFromFiles([
  { fileName: 'bundle.json', payload: clean },
  { fileName: 'replay_events.json', payload: changedEvents }
]);
assert.ok(bundle.failures.some((entry) => /REPLAY_COMBINED_SEPARATE_MISMATCH/.test(entry)));

const onlyCombined = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: clean }]);
assert.equal(Boolean(onlyCombined.replayManifest && onlyCombined.replayEvents), true);
const onlySeparate = buildHeadlessBundleFromFiles([
  { fileName: 'replay_manifest.json', payload: clean.replayManifest },
  { fileName: 'replay_events.json', payload: clean.replayEvents },
  { fileName: 'replay_checkpoints.json', payload: clean.replayCheckpoints },
  { fileName: 'replay_alignment_report.json', payload: clean.replayAlignmentReport }
]);
assert.equal(Boolean(onlySeparate.replayManifest && onlySeparate.replayEvents && onlySeparate.replayCheckpoints), true);
console.log(JSON.stringify({ ok: true, mismatchFailure: bundle.failures.find((entry) => /REPLAY_COMBINED_SEPARATE_MISMATCH/.test(entry)) }, null, 2));