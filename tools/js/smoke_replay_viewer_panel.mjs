#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';

function htmlFor(file) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
  return headlessBundleViewerPanelHtml(buildHeadlessBundleViewModel(bundle));
}
const cleanHtml = htmlFor('docs/examples/headless_replay_public.example.json');
assert.match(cleanHtml, /Replay Integrity/);
assert.match(cleanHtml, /publicObservationPlayback/);
assert.match(cleanHtml, /Agent Count/);
const tamperedHtml = htmlFor('docs/examples/headless_replay_tampered_digest.example.json');
assert.match(tamperedHtml, /This replay failed integrity verification/);
assert.match(tamperedHtml, /REPLAY_CHECKPOINT_DIGEST_MISMATCH/);
const multiHtml = htmlFor('docs/examples/headless_replay_multi_agent.example.json');
assert.match(multiHtml, /glider-alpha/);
assert.match(multiHtml, /glider-bravo/);
const unsafe = JSON.parse(fs.readFileSync('docs/examples/headless_replay_public.example.json', 'utf8'));
unsafe.replayEvents.events.find((event) => event.phase === 'objective').payload.label = '<script>alert(1)</script>';
const unsafeHtml = headlessBundleViewerPanelHtml(buildHeadlessBundleViewModel(buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: unsafe }])));
assert.equal(unsafeHtml.includes('<script>alert(1)</script>'), false);
assert.equal(unsafeHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true);
console.log(JSON.stringify({ ok: true }, null, 2));