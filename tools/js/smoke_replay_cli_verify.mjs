#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

fs.mkdirSync('tmp', { recursive: true });
const clean = spawnSync(process.execPath, ['tools/js/headless_oceanbox.mjs', 'verify-replay', '--bundle', 'docs/examples/headless_replay_public.example.json', '--report', 'tmp/h4-1-cli-clean-report.json'], { encoding: 'utf8' });
assert.equal(clean.status, 0, clean.stderr || clean.stdout);
assert.ok(fs.existsSync('tmp/h4-1-cli-clean-report.json'));

const tampered = spawnSync(process.execPath, ['tools/js/headless_oceanbox.mjs', 'verify-replay', '--bundle', 'docs/examples/headless_replay_tampered_digest.example.json', '--report', 'tmp/h4-1-cli-tampered-report.json'], { encoding: 'utf8' });
assert.notEqual(tampered.status, 0, tampered.stdout);
const tamperedReport = JSON.parse(fs.readFileSync('tmp/h4-1-cli-tampered-report.json', 'utf8'));
assert.ok(tamperedReport.failureCodes.includes('REPLAY_CHECKPOINT_DIGEST_MISMATCH'));

const warningFixture = JSON.parse(fs.readFileSync('docs/examples/headless_replay_public.example.json', 'utf8'));
delete warningFixture.replayManifest.schemaVersion;
fs.writeFileSync('tmp/h4-1-warning-fixture.json', `${JSON.stringify(warningFixture, null, 2)}\n`);
const strict = spawnSync(process.execPath, ['tools/js/headless_oceanbox.mjs', 'verify-replay', '--bundle', 'tmp/h4-1-warning-fixture.json', '--report', 'tmp/h4-1-cli-strict-report.json', '--strict'], { encoding: 'utf8' });
assert.notEqual(strict.status, 0, strict.stdout);
fs.rmSync('tmp/h4-1-warning-fixture.json', { force: true });
console.log(JSON.stringify({ ok: true, cleanExit: clean.status, tamperedExit: tampered.status, strictExit: strict.status }, null, 2));