#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { verifyReplayIntegrity, REPLAY_ISSUE_CODES } from '../../src/core/replay/ReplayIntegrityVerifier.js';

const clean = JSON.parse(fs.readFileSync('docs/examples/headless_replay_public.example.json', 'utf8'));
const report = verifyReplayIntegrity(clean);
assert.equal(report.status, 'PASS');
assert.equal(report.summary.digestChecksPassed, true);
assert.equal(report.summary.orderingChecksPassed, true);
assert.equal(report.summary.publicSafetyPassed, true);
assert.equal(report.eventCount > 0, true);
assert.equal(report.checkpointCount > 0, true);
assert.deepEqual(Object.values(REPLAY_ISSUE_CODES).filter((code) => code === 'REPLAY_CHECKPOINT_DIGEST_MISMATCH'), ['REPLAY_CHECKPOINT_DIGEST_MISMATCH']);
console.log(JSON.stringify({ ok: true, status: report.status, eventCount: report.eventCount, checkpointCount: report.checkpointCount }, null, 2));