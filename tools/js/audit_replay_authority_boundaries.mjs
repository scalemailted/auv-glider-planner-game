#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const files = [
  'src/core/replay/ReplayIntegrityVerifier.js',
  'src/core/replay/ReplayPlayback.js',
  'src/ui/headless/HeadlessBundleViewerPanel.js',
  'docs/examples/headless_replay_public.example.json',
  'docs/examples/headless_replay_multi_agent.example.json'
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  assert.equal(/usesHiddenTruthResimulation:\s*true/.test(text), false, file);
  assert.equal(/changesOfficialBrowserScoring:\s*true/.test(text), false, file);
  assert.equal(/usesNewPlanner:\s*true/.test(text), false, file);
  assert.equal(/usesRouteOptimizer:\s*true/.test(text), false, file);
  assert.equal(/usesMARL:\s*true/.test(text), false, file);
  assert.equal(/usesPythonSimulator:\s*true/.test(text), false, file);
}
const multi = JSON.parse(fs.readFileSync('docs/examples/headless_replay_multi_agent.example.json', 'utf8'));
assert.equal(multi.fixtureMetadata.multiAgentReplayContractOnly, true);
assert.equal(multi.replayManifest.featureFlags.multiAgentReplayContractOnly, true);
console.log(JSON.stringify({ ok: true, checked: files.length }, null, 2));