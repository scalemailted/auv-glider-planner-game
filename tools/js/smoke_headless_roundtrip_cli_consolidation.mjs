#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const packetPath = 'docs/examples/headless_solver_packet.example.json';
const planPath = 'docs/examples/headless_solver_plan.example.json';

const packetValidation = runJson(['tools/js/headless_oceanbox.mjs', 'validate-solver-packet', '--solver-packet', packetPath]);
assert.equal(packetValidation.ok, true, 'consolidated CLI validates solver packet');
assert.equal(packetValidation.status, 'PASS', 'solver packet CLI validation status');

const planValidation = runJson(['tools/js/headless_oceanbox.mjs', 'validate-plan', '--solver-packet', packetPath, '--plan', planPath]);
assert.equal(planValidation.ok, true, 'consolidated CLI validates plan');
assert.equal(planValidation.status, 'PASS', 'plan CLI validation status');

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-h3-1-cli-'));
const roundtrip = runJson(['tools/js/headless_oceanbox.mjs', 'roundtrip', '--solver-packet', packetPath, '--plan', planPath, '--out', outputDir, '--combined-json', '--no-hidden-export', '--seed', 'h3.1-cli-smoke']);
assert.equal(roundtrip.ok, true, 'consolidated CLI roundtrip succeeds');
assert.equal(roundtrip.hiddenTruthExported, false, 'consolidated CLI public roundtrip omits hidden truth');
assert.equal(fs.existsSync(path.join(outputDir, 'bundle.json')), true, 'consolidated CLI writes bundle.json');
assert.equal(fs.existsSync(path.join(outputDir, 'roundtrip_report.json')), true, 'consolidated CLI writes roundtrip report');
assert.equal(fs.existsSync(path.join(outputDir, 'hidden_fields.json')), false, 'consolidated CLI public output omits hidden_fields.json');
const report = JSON.parse(fs.readFileSync(path.join(outputDir, 'roundtrip_report.json'), 'utf8'));
const bundle = JSON.parse(fs.readFileSync(path.join(outputDir, 'bundle.json'), 'utf8'));
assert.equal(report.type, 'anchor.headless.solver-roundtrip-report', 'consolidated CLI report is canonical');
assert.equal(bundle.type, 'anchor.headless.solver-roundtrip-bundle', 'consolidated CLI bundle is roundtrip bundle');
assert.equal(bundle.roundtripReport?.type, 'anchor.headless.solver-roundtrip-report', 'bundle embeds canonical report');

const wrapperDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-h3-wrapper-'));
const wrapper = runJson(['tools/js/headless_roundtrip.mjs', packetPath, planPath, '--out', wrapperDir, '--seed', 'h3.1-wrapper-smoke']);
assert.equal(wrapper.ok, true, 'legacy wrapper CLI still succeeds');
const wrapperReport = JSON.parse(fs.readFileSync(path.join(wrapperDir, 'roundtrip_report.json'), 'utf8'));
assert.equal(wrapperReport.type, 'anchor.headless.solver-roundtrip-report', 'legacy wrapper writes canonical report after H3.1');

console.log('Headless roundtrip CLI consolidation smoke passed', {
  outputDir,
  wrapperDir,
  finalScore: report.summary.finalScore
});

function runJson(args) {
  const stdout = execFileSync(process.execPath, args, { encoding: 'utf8' });
  return JSON.parse(stdout);
}