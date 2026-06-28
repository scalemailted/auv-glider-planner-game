import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ALPHA_NOTEBOOK_LAUNCH_CONFIG,
  alphaNotebookLaunchSummary
} from '../../src/core/alpha/AlphaRelease.js';

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function assertExists(relativePath) {
  assert.ok(existsSync(path.join(root, relativePath)), `${relativePath} must exist`);
}

const ledger = readJson('alpha/feedback-ledger.json');
assert.equal(ledger.artifactType, 'anchor.alpha-feedback-ledger');
assert.equal(ledger.phase, 'FEEDBACK-OPS-R1');
assert.ok(Array.isArray(ledger.items), 'feedback ledger items must be an array');

const requiredFeedbackIds = ['ALPHA-FB-001', 'ALPHA-FB-002', 'ALPHA-FB-003', 'ALPHA-FB-004', 'ALPHA-FB-017', 'ALPHA-FB-018', 'ALPHA-FB-019', 'ALPHA-FB-020'];
const validStatuses = new Set(ledger.taxonomy?.validStatuses ?? []);
const validCategories = new Set(Object.keys(ledger.taxonomy?.categories ?? {}));
const validSeverities = new Set(Object.keys(ledger.taxonomy?.severities ?? {}));
const itemById = new Map(ledger.items.map((item) => [item.feedbackId, item]));

for (const id of requiredFeedbackIds) assert.ok(itemById.has(id), `${id} must exist in feedback ledger`);
for (const item of ledger.items) {
  assert.match(item.feedbackId, /^ALPHA-FB-\d{3}$/);
  assert.ok(validStatuses.has(item.status), `${item.feedbackId} has invalid status ${item.status}`);
  assert.ok(validSeverities.has(item.severity), `${item.feedbackId} has invalid severity ${item.severity}`);
  assert.ok(Array.isArray(item.category) && item.category.length > 0, `${item.feedbackId} must include categories`);
  for (const category of item.category) assert.ok(validCategories.has(category), `${item.feedbackId} has invalid category ${category}`);
  assert.notEqual(item.status, 'ignored', `${item.feedbackId} must not be ignored during Alpha feedback intake`);
  if (item.severity === 'P0' || item.severity === 'P1') assert.notEqual(item.status, 'ignored', `${item.feedbackId} P0/P1 item cannot be ignored`);
}

const notebookConfig = ALPHA_NOTEBOOK_LAUNCH_CONFIG;
for (const relativePath of [
  notebookConfig.fullNotebookPath,
  notebookConfig.starterNotebookPath,
  notebookConfig.benchmarkBundlePath,
  notebookConfig.checkedInPlanPath
]) assertExists(relativePath);

const notebookSummary = alphaNotebookLaunchSummary();
assert.equal(notebookSummary.localPythonExecutionStatus, 'VERIFIED');
assert.equal(notebookSummary.authoritativeFinalizationStatus, 'VERIFIED');
assert.equal(notebookSummary.googleColabHostingSmokeStatus, 'PENDING');
assert.equal(notebookSummary.fairnessDefault, 'FORECAST_ONLY');
assert.equal(notebookSummary.oneClickColabEnabled, false);
assert.equal(notebookSummary.fallbackRequired, true);
assert.equal(notebookSummary.publicBundle.containsHiddenTruth, false);
assert.match(notebookSummary.publicBundle.visibility, /PUBLIC/);
assert.match(notebookSummary.publicBundle.visibility, /FORECAST_ONLY/);

if (notebookConfig.googleColabHostingSmokeStatus === 'VERIFIED') {
  assertExists('tests/fixtures/colab_benchmark/hosted_colab_smoke.json');
}
assert.equal(notebookConfig.githubColabUrl, null, 'Hosted one-click Colab URL is intentionally not configured yet');

const publicBundleText = readText(notebookConfig.benchmarkBundlePath);
const publicBundle = JSON.parse(publicBundleText);
assert.equal(publicBundle.artifactType, notebookSummary.publicBundle.artifactType);
assert.equal(publicBundle.artifactVersion, notebookSummary.publicBundle.artifactVersion);
assert.equal(publicBundle.containsHiddenTruth, false);
assert.equal(publicBundle.visibilityClass, 'PUBLIC');
assert.equal(publicBundle.fairnessClass ?? publicBundle.fairness?.mode ?? publicBundle.fairnessDefault, 'FORECAST_ONLY');
assert.equal(publicBundle.scoreProfileId, notebookSummary.publicBundle.scoreProfileId);
assert.equal(publicBundle.scoreProfileDigest, notebookSummary.publicBundle.scoreProfileDigest);
assert.equal(publicBundle.validationBaselineDigest, notebookSummary.publicBundle.validationBaselineDigest);
assert.ok(!publicBundleText.includes('T_hiddenTruth'), 'public benchmark bundle must not include T_hiddenTruth');
assert.ok(!publicBundleText.includes('"hiddenTruth"'), 'public benchmark bundle must not include hiddenTruth payloads');

const pagesBuild = readText('tools/js/build_github_pages.mjs');
for (const requiredPath of [
  'alpha/feedback-ledger.json',
  'alpha/release-manifest.json',
  'alpha/scenario-catalog.json',
  'validation/manifest.json',
  'docs/alpha_release.md',
  'docs/classical_planner_benchmark_notebook.md',
  notebookConfig.fullNotebookPath,
  notebookConfig.starterNotebookPath,
  notebookConfig.benchmarkBundlePath
]) {
  assert.ok(pagesBuild.includes(requiredPath), `Pages copy policy must include ${requiredPath}`);
}

const mainMenu = readText('src/game/phaser/scenes/MainMenuScene.js');
for (const requiredCopy of [
  'External Solver Notebook',
  'The notebook proposes plans. ANCHOR validates, simulates, and scores them.',
  'Users do not need to download the full ANCHOR source repository for normal Alpha use.',
  'A public GitHub notebook URL is required for one-click Colab launch.',
  'Download Full Benchmark Notebook',
  'Download Starter Notebook',
  'Download Public Benchmark Bundle',
  'Copy Notebook Data URL',
  'Copy Local Finalizer Command',
  'FORECAST_ONLY',
  'containsHiddenTruth'
]) {
  assert.ok(mainMenu.includes(requiredCopy), `Researcher Notebook Launchpad must include copy: ${requiredCopy}`);
}
assert.ok(!mainMenu.includes('<iframe'), 'Researcher Notebook Launchpad must not iframe Colab');

console.log(JSON.stringify({
  ok: true,
  audit: 'alpha-feedback-ops',
  feedbackItems: requiredFeedbackIds,
  oneClickColabEnabled: notebookSummary.oneClickColabEnabled,
  fallbackRequired: notebookSummary.fallbackRequired,
  publicBundle: notebookSummary.publicBundle
}, null, 2));
