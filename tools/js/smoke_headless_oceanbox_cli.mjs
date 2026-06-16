import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-h1-cli-'));
const stdout = execFileSync(process.execPath, ['tools/js/headless_oceanbox.mjs', 'simulate', '--seed', 'h1-cli-smoke', '--out', outputDir], { encoding: 'utf8' });
const summary = JSON.parse(stdout);
assert.equal(summary.ok, true, 'CLI success');
assert.equal(Number.isFinite(summary.finalScore), true, 'summary includes final score');
assert.ok(summary.observationCount > 0, 'summary includes observation count');
assert.equal(fs.existsSync(path.join(outputDir, 'manifest.json')), true, 'manifest written');
assert.equal(fs.existsSync(path.join(outputDir, 'hidden_fields.json')), true, 'hidden fields written by default');

const publicOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-h1-cli-public-'));
const publicStdout = execFileSync(process.execPath, ['tools/js/headless_oceanbox.mjs', 'simulate', '--seed', 'h1-cli-smoke', '--out', publicOutputDir, '--no-hidden-export'], { encoding: 'utf8' });
const publicSummary = JSON.parse(publicStdout);
assert.equal(publicSummary.ok, true, 'public CLI success');
assert.equal(fs.existsSync(path.join(publicOutputDir, 'hidden_fields.json')), false, 'hidden fields omitted with flag');

const summaryOnlyStdout = execFileSync(process.execPath, ['tools/js/headless_oceanbox.mjs', 'simulate', '--seed', 'h1-cli-smoke', '--summary-only'], { encoding: 'utf8' });
const summaryOnly = JSON.parse(summaryOnlyStdout);
assert.equal(summaryOnly.bundle, null, 'summary-only skips bundle write');

console.log('Headless OceanBox CLI smoke passed');
