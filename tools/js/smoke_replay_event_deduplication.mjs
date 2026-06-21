#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildReplayReviewSourceFromBundle } from '../../src/core/replay/ReplayReviewLoader.js';
import { createReplayReviewSession, reduceReplayReviewSession } from '../../src/core/replay/ReplayReviewSession.js';
import { buildReplayWorldRenderViewModel } from '../../src/core/rendering/ReplayWorldRenderViewModel.js';

const payload = JSON.parse(fs.readFileSync('docs/examples/headless_replay_r2a_acceptance.example.json', 'utf8'));
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
const source = buildReplayReviewSourceFromBundle(bundle, { sourceKind: 'event-dedup-smoke' });
let session = createReplayReviewSession(source);
session = reduceReplayReviewSession(session, { type: 'jumpCheckpoint', selector: 'terminal' });
const terminal = ids(buildReplayWorldRenderViewModel(session));
assert.equal(new Set(terminal.observationIds).size, terminal.observationIds.length, 'observation IDs are unique at terminal');
assert.equal(new Set(terminal.terrainEventIds).size, terminal.terrainEventIds.length, 'terrain event IDs are unique at terminal');

session = reduceReplayReviewSession(session, { type: 'stepBack' });
session = reduceReplayReviewSession(session, { type: 'stepForward' });
const repeated = ids(buildReplayWorldRenderViewModel(session));
assert.deepEqual(repeated.terrainEventIds, terminal.terrainEventIds, 'back/forward navigation preserves terrain event IDs');
assert.deepEqual(repeated.observationIds, terminal.observationIds, 'back/forward navigation preserves observation IDs');
console.log('smoke_replay_event_deduplication: PASS', JSON.stringify({ observations: terminal.observationIds.length, terrainEvents: terminal.terrainEventIds.length }));

function ids(viewModel) {
  return {
    observationIds: (viewModel.observations ?? []).map((entry) => entry.id).filter(Boolean),
    terrainEventIds: (viewModel.routeFailures ?? []).map((entry) => entry.id).filter(Boolean)
  };
}
