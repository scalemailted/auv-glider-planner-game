import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-h4-replay-cli-'));
const runDir = path.join(tempRoot, 'run');
const replayDir = path.join(tempRoot, 'replay');
const verifyReport = path.join(tempRoot, 'verify', 'replay_alignment_report.json');

try {
  const simulate = runJson(['tools/js/headless_oceanbox.mjs', 'simulate', '--seed', 'replay-cli-smoke', '--out', runDir, '--no-hidden-export', '--combined-json', '--motion-aware', '--cost-graph', '--mission-score', '--checkpoint-every', '5', '--demo-objectives']);
  assert.equal(simulate.ok, true, 'simulate ok');
  assert.equal(fs.existsSync(path.join(runDir, 'replay_manifest.json')), true, 'simulate writes replay manifest');
  assert.equal(fs.existsSync(path.join(runDir, 'bundle.json')), true, 'simulate writes combined bundle');

  const replay = runJson(['tools/js/headless_oceanbox.mjs', 'replay', '--bundle', path.join(runDir, 'bundle.json'), '--out', replayDir, '--checkpoint-every', '5', '--demo-objectives']);
  assert.equal(replay.ok, true, 'replay ok');
  assert.equal(replay.replayMode, 'publicObservationPlayback', 'public playback mode');
  assert.equal(fs.existsSync(path.join(replayDir, 'replay_checkpoints.json')), true, 'replay writes checkpoints');

  const verify = runJson(['tools/js/headless_oceanbox.mjs', 'verify-replay', '--bundle', path.join(runDir, 'bundle.json'), '--report', verifyReport]);
  assert.equal(verify.ok, true, 'verify ok');
  assert.equal(verify.status, 'PASS', 'verify pass');
  assert.equal(fs.existsSync(verifyReport), true, 'verify writes report');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log('Headless replay CLI smoke passed');

function runJson(args) {
  const stdout = execFileSync(process.execPath, args, { encoding: 'utf8' });
  return JSON.parse(stdout);
}