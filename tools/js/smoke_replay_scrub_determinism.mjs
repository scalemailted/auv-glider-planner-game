#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildReplayReviewSourceFromBundle } from '../../src/core/replay/ReplayReviewLoader.js';
import { createReplayReviewSession, reduceReplayReviewSession, replayReviewSessionSummary } from '../../src/core/replay/ReplayReviewSession.js';

const payload = JSON.parse(fs.readFileSync('docs/examples/headless_replay_r2a_acceptance.example.json', 'utf8'));
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload }]);
const source = buildReplayReviewSourceFromBundle(bundle, { sourceKind: 'scrub-determinism-smoke' });
assert.equal(source.replayArtifacts.present, true);
assert.equal(source.integrityReport.status, 'PASS');

const middleIndex = Math.floor(source.replayArtifacts.events.events.length / 2);
let session = createReplayReviewSession(source);
session = reduceReplayReviewSession(session, { type: 'scrub', eventIndex: middleIndex });
const middle = replayReviewSessionSummary(session);
session = reduceReplayReviewSession(session, { type: 'jumpCheckpoint', selector: 'terminal' });
session = reduceReplayReviewSession(session, { type: 'scrub', eventIndex: middleIndex });
const repeated = replayReviewSessionSummary(session);
assert.equal(repeated.publicStateDigest, middle.publicStateDigest, 'same cursor must produce same public digest after terminal scrub');

let reloaded = createReplayReviewSession(source);
reloaded = reduceReplayReviewSession(reloaded, { type: 'scrub', eventIndex: middleIndex });
const reloadedSummary = replayReviewSessionSummary(reloaded);
assert.equal(reloadedSummary.publicStateDigest, middle.publicStateDigest, 'same cursor must produce same digest after reload');

const beforeBack = replayReviewSessionSummary(reloaded);
reloaded = reduceReplayReviewSession(reloaded, { type: 'stepBack' });
const afterBack = replayReviewSessionSummary(reloaded);
assert.ok(afterBack.checkpointRestoreCount > beforeBack.checkpointRestoreCount, 'reverse navigation records checkpoint restore');
assert.equal(reloaded.playbackState.replayDiagnostics.inversePhysicsUsed, false, 'reverse navigation must not use inverse physics');
assert.equal(reloaded.playbackState.replayDiagnostics.cameraDisplayStateExcluded, true);
console.log('smoke_replay_scrub_determinism: PASS', JSON.stringify({ middleIndex, digest: middle.publicStateDigest, checkpointRestoreCount: afterBack.checkpointRestoreCount }));
