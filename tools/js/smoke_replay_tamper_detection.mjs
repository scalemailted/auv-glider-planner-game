#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { verifyReplayIntegrity } from '../../src/core/replay/ReplayIntegrityVerifier.js';

const cases = [
  ['docs/examples/headless_replay_tampered_digest.example.json', 'REPLAY_CHECKPOINT_DIGEST_MISMATCH'],
  ['docs/examples/headless_replay_tampered_order.example.json', 'REPLAY_EVENT_ORDER_INVALID'],
  ['docs/examples/headless_replay_tampered_checkpoint.example.json', 'REPLAY_CHECKPOINT_CURSOR_INVALID'],
  ['docs/examples/headless_replay_tampered_missing_terminal.example.json', 'REPLAY_TERMINAL_MISSING'],
  ['docs/examples/headless_replay_tampered_hidden_truth.example.json', 'REPLAY_PUBLIC_HIDDEN_TRUTH_LEAK'],
  ['docs/examples/headless_replay_tampered_payload.example.json', 'REPLAY_CHECKPOINT_DIGEST_MISMATCH']
];
const results = [];
for (const [file, code] of cases) {
  const report = verifyReplayIntegrity(JSON.parse(fs.readFileSync(file, 'utf8')));
  assert.equal(report.status, 'FAIL', file);
  assert.ok(report.failureCodes.includes(code), `${file} should fail with ${code}: ${report.failureCodes.join(', ')}`);
  results.push({ file, codes: report.failureCodes });
}
console.log(JSON.stringify({ ok: true, cases: results }, null, 2));