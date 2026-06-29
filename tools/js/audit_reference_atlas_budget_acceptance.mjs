import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ownerReviewDir = path.resolve(root, process.env.ANCHOR_REF_ATLAS_BUDGET_OWNER_REVIEW_DIR ?? process.env.ANCHOR_E2E_OWNER_REVIEW_DIR ?? 'artifacts/owner-review/ref-atlas-budget-r1');
const summaryPath = path.join(ownerReviewDir, 'qa-summary.json');

const requiredScreenshots = [
  '01-small-region-ok.png',
  '02-medium-region-warn.png',
  '03-large-region-blocked.png',
  '04-blocked-region-patch-request.png',
  '05-monterey-region-budget.png',
  '06-monterey-load-enabled.png',
  '07-regional-patch-loaded.png',
  '08-generation-pipeline-still-works.png',
  '09-launch-ready.png'
];

const requiredFields = [
  'status',
  'phase',
  'branch',
  'head',
  'smallBudgetStatus',
  'mediumBudgetStatus',
  'largeBudgetStatus',
  'blockedGenerationPrevented',
  'blockedPatchRequestExported',
  'blockedPatchRequestHasBudget',
  'montereyBudgetStatus',
  'montereyLoadEnabled',
  'montereyLoadedFixtureId',
  'bathymetryGenerated',
  'fieldsGenerated',
  'environmentComposed',
  'planningLaunchReady',
  'hiddenTruthExposed',
  'rawExternalDataPathExposed',
  'simulationChanged',
  'scoringChanged'
];

assert.ok(existsSync(summaryPath), `budget owner-review qa-summary missing: ${summaryPath}`);
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

for (const field of requiredFields) assert.ok(Object.hasOwn(summary, field), `qa-summary missing ${field}`);
for (const screenshot of requiredScreenshots) {
  assert.ok(existsSync(path.join(ownerReviewDir, screenshot)), `budget owner-review screenshot missing: ${screenshot}`);
}

assert.equal(summary.phase, 'REF-ATLAS-INTERACT-R1.2');
assert.ok(['PASS', 'PASS_WITH_NON_BLOCKING_WARNINGS'].includes(summary.status), `invalid budget owner-review status ${summary.status}`);
assert.equal(summary.smallBudgetStatus, 'OK', 'small budget OK');
assert.equal(summary.mediumBudgetStatus, 'WARN', 'medium budget WARN');
assert.equal(summary.largeBudgetStatus, 'BLOCKED', 'large budget BLOCKED');
assert.equal(summary.blockedGenerationPrevented, true, 'blocked generation prevented');
assert.equal(summary.blockedPatchRequestExported, true, 'blocked patch request exported');
assert.equal(summary.blockedPatchRequestHasBudget, true, 'blocked patch request includes budget');
assert.ok(['OK', 'WARN'].includes(summary.montereyBudgetStatus), `Monterey budget status ${summary.montereyBudgetStatus}`);
assert.equal(summary.montereyLoadEnabled, true, 'Monterey load enabled');
assert.equal(summary.montereyLoadedFixtureId, 'monterey_canyon_15s', 'Monterey loaded');
assert.equal(summary.bathymetryGenerated, true, 'bathymetry generated');
assert.equal(summary.fieldsGenerated, true, 'fields generated');
assert.equal(summary.environmentComposed, true, 'environment composed');
assert.equal(summary.planningLaunchReady, true, 'planning launch ready');
assert.equal(summary.hiddenTruthExposed, false);
assert.equal(summary.rawExternalDataPathExposed, false);
assert.equal(summary.simulationChanged, false);
assert.equal(summary.scoringChanged, false);

console.log('audit_reference_atlas_budget_acceptance: ok', {
  path: path.relative(root, summaryPath),
  screenshotCount: requiredScreenshots.length,
  montereyBudgetStatus: summary.montereyBudgetStatus
});
