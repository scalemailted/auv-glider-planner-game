#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildReplayReviewSourceFromBundle } from '../../src/core/replay/ReplayReviewLoader.js';
import { replayPlaybackReducer, replayPlaybackReducerSummary } from '../../src/core/replay/ReplayPlaybackReducer.js';

const payload = JSON.parse(fs.readFileSync('docs/examples/headless_replay_public.example.json', 'utf8'));
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
const source = buildReplayReviewSourceFromBundle(bundle, { sourceKind: 'checkpoint-navigation-smoke' });
let state = replayPlaybackReducer(null, { type: 'init' }, source.replayArtifacts);
state = replayPlaybackReducer(state, { type: 'scrub', eventIndex: 4 }, source.replayArtifacts);
const middle = replayPlaybackReducerSummary(state, source.replayArtifacts);
state = replayPlaybackReducer(state, { type: 'jumpCheckpoint', selector: 'terminal' }, source.replayArtifacts);
const terminal = replayPlaybackReducerSummary(state, source.replayArtifacts);
state = replayPlaybackReducer(state, { type: 'jumpCheckpoint', selector: 'previous' }, source.replayArtifacts);
const previousCheckpoint = replayPlaybackReducerSummary(state, source.replayArtifacts);
state = replayPlaybackReducer(state, { type: 'scrub', eventIndex: 4 }, source.replayArtifacts);
const middleAgain = replayPlaybackReducerSummary(state, source.replayArtifacts);
assert.equal(middle.currentEventIndex, middleAgain.currentEventIndex, 'scrubbing back to the same event is deterministic');
assert.equal(middle.currentEventId, middleAgain.currentEventId, 'same event id after replay navigation');
assert.ok(terminal.currentCheckpointIndex >= previousCheckpoint.currentCheckpointIndex, 'terminal checkpoint is after previous checkpoint');
assert.equal(middleAgain.usesHiddenTruthResimulation, false, 'navigation does not use hidden-truth resimulation');
assert.equal(middleAgain.changesOfficialBrowserScoring, false, 'navigation does not change official scoring');
console.log('smoke_replay_checkpoint_navigation: PASS', JSON.stringify({ eventIndex: middleAgain.currentEventIndex, checkpointIndex: previousCheckpoint.currentCheckpointIndex, terminalCheckpointIndex: terminal.currentCheckpointIndex }));
