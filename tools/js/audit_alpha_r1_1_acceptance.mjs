import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { canonicalJsonDigest } from '../../packages/codecs/src/index.js';
import {
  ALPHA_POSITIONING,
  ALPHA_TAGLINE,
  buildAlphaDiagnosticBundle
} from '../../src/core/alpha/AlphaRelease.js';

const REQUIRED_SCREENSHOTS = Object.freeze([
  '01-product-hub-alpha.png',
  '02-first-run-onboarding.png',
  '03-guided-mission-deployment.png',
  '04-waypoint-segment-profile.png',
  '05-depth-and-current-inspection.png',
  '06-predicted-dive-trajectory.png',
  '07-simulation-realized-dive.png',
  '08-surfacing-decision.png',
  '09-replan-workflow.png',
  '10-debrief-score-explanation.png',
  '11-replay-review.png',
  '12-methods-validation-overview.png',
  '13-methods-validation-technical-detail.png',
  '14-researcher-quick-start.png',
  '15-notebook-and-bundle-access.png',
  '16-external-plan-result.png',
  '17-feedback-diagnostics.png',
  '18-compact-desktop.png',
  '19-final-product-hub-cleanup.png'
]);

const REQUIRED_SUMMARIES = Object.freeze([
  'qa-summary.json',
  'release-manifest-snapshot.json',
  'accessibility-summary.json',
  'browser-support-summary.json',
  'performance-summary.json',
  'resource-cleanup-summary.json',
  'known-limitations-snapshot.json'
]);

const manifest = readJson('alpha/release-manifest.json');
const catalog = readJson('alpha/scenario-catalog.json');
const validationManifest = readJson('validation/manifest.json');
const localAcceptance = readJson('tests/fixtures/colab_benchmark/colab_bench_r1_1_local_acceptance.json');
const docs = readText('docs/alpha_release.md');

assert.equal(manifest.artifactType, 'anchor.alpha-release-manifest');
assert.equal(manifest.releaseId, 'alpha-r1-external-research-education-preview');
assert.equal(manifest.releaseVersion, '0.1.0-alpha.1');
assert.equal(manifest.claimBoundary, ALPHA_POSITIONING, 'canonical Alpha positioning');
assert.equal(manifest.tagline, ALPHA_TAGLINE, 'canonical Alpha tagline');
assert.equal(manifest.validationBaseline?.digest, 'fnv1a32:dd016175', 'validation baseline digest stays frozen');
assert.equal(manifest.scoring?.profileDigest, 'fnv1a32:1e7b3fe0', 'ScoreProfile digest stays frozen');
assert.equal(manifest.classicalPlannerNotebook?.checkedInAstarOfficialScore, 23.593559, 'official A* score stays frozen');
assert.equal(manifest.classicalPlannerNotebook?.localAcceptanceDigest, 'fnv1a32:9a73d341', 'local notebook acceptance digest');
assert.equal(manifest.classicalPlannerNotebook?.googleColabHostingSmoke, 'PENDING', 'hosted Colab remains pending until a real hosted run');
assert.equal(manifest.acceptance?.phase, 'ALPHA-R1.1', 'acceptance phase');
assert.equal(manifest.acceptance?.ownerReviewStatus, 'PENDING', 'owner review must remain pending');
assert.equal(manifest.acceptance?.releaseRecommendation, 'ALPHA_R1_ACCEPTANCE_PACKAGE_READY', 'engineering recommendation before owner approval');
assert.deepEqual(manifest.acceptance?.knownP0P1Issues, [], 'no known P0/P1 issues recorded');
assert.equal(manifest.acceptance?.notebookVerification?.localPythonExecution, 'VERIFIED');
assert.equal(manifest.acceptance?.notebookVerification?.authoritativeAnchorFinalization, 'VERIFIED');
assert.equal(manifest.acceptance?.notebookVerification?.pagesNotebookDelivery, 'VERIFIED');
assert.equal(manifest.acceptance?.notebookVerification?.googleColabHostingSmoke, 'PENDING');

assert.equal(canonicalJsonDigest(withoutKey(manifest, 'releaseDigest')), manifest.releaseDigest, 'release digest matches manifest body');
assert.equal(canonicalJsonDigest(catalog), 'fnv1a32:be894960', 'scenario catalog digest stays frozen');
assert.equal(manifest.acceptance?.scenarioCatalog?.digest, 'fnv1a32:be894960', 'manifest references frozen scenario catalog digest');
assert.equal(manifest.acceptance?.scenarioCatalog?.entryCount, 6, 'manifest scenario count');
assert.equal(
  manifest.acceptance?.criticalPathAcceptance?.digest,
  canonicalJsonDigest(withoutKey(manifest.acceptance.criticalPathAcceptance, 'digest')),
  'critical-path acceptance digest matches its canonical body'
);

const supportedMobile = browserEntry(manifest.supportedBrowsers, /Mobile|tablet/i);
assert.equal(supportedMobile?.status, 'NOT_TESTED', 'mobile/tablet support is not inferred from compact desktop');
assert.equal(browserEntry(manifest.acceptance.browserSupportMatrix, /^Safari/i)?.status, 'NOT_TESTED', 'Safari is not inferred from WebKit');
assert.ok(manifest.acceptance.browserSupportMatrix.every((entry) => entry.status !== 'SUPPORTED' || /Playwright|owner-review|smoke|release|Pages/i.test(entry.evidence ?? '')), 'supported browser statuses carry evidence text');

assert.equal(validationManifest.validationBaselineId, 'sci-valid-r2a-pre-alpha-baseline', 'validation manifest baseline id');
assert.equal(localAcceptance.status, 'LOCAL_PYTHON_EXECUTION_VERIFIED', 'local notebook fixture status');
assert.equal(localAcceptance.googleColabHostingSmoke, 'PENDING', 'local notebook fixture keeps hosted Colab pending');
assert.equal(localAcceptance.authoritativeEvaluation?.officialScore, 23.593559, 'local fixture official score');
assert.equal(localAcceptance.authoritativeEvaluation?.scoreResultDigest, 'fnv1a32:cbaf21a1', 'local fixture ScoreResult digest');

for (const file of [
  'tests/e2e/alpha_r1_1_acceptance.spec.js',
  'tests/e2e/alpha_r1_external_preview.spec.js',
  'tools/python/notebooks/anchor_external_solver_template.ipynb',
  'tools/python/notebooks/anchor_classical_planner_benchmark.ipynb',
  'tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json',
  'tests/fixtures/colab_benchmark/plans/static_additive_astar.anchor.plan.json',
  'tests/fixtures/colab_benchmark/colab_bench_r1_1_local_acceptance.json'
]) assert.ok(existsSync(file), `${file} exists`);

assert.equal(catalog.entries.length, 6, 'scenario catalog entry count');
for (const entry of catalog.entries) {
  assert.ok(entry.scenarioId && entry.label, `scenario ${entry.scenarioId} has identity`);
  assert.ok(Array.isArray(entry.audience) && entry.audience.length > 0, `${entry.scenarioId} audience`);
  assert.ok(Number(entry.estimatedDurationMinutes) >= 10 && Number(entry.estimatedDurationMinutes) <= 30, `${entry.scenarioId} credible duration`);
  assert.equal(entry.deterministic, true, `${entry.scenarioId} is deterministic`);
  assert.ok(entry.validationStatus, `${entry.scenarioId} validation status`);
  assert.ok(entry.levelOrMissionId, `${entry.scenarioId} level/mission identity`);
  if (entry.scenarioId.includes('dynamic-current') || entry.scenarioId.includes('forecast')) assert.equal(entry.requiresDynamicCurrents, true, `${entry.scenarioId} declares dynamic currents`);
  if (entry.scenarioId !== 'alpha-research-benchmark') assert.equal(typeof entry.requiresDiveProfiles, 'boolean', `${entry.scenarioId} declares depth behavior flag`);
}
const researchEntry = catalog.entries.find((entry) => entry.scenarioId === 'alpha-research-benchmark');
assert.equal(researchEntry?.supportsNotebookRoundTrip, true, 'research benchmark supports notebook round trip');
assert.equal(researchEntry?.environmentDigest, 'fnv1a32:220ad0dc', 'research benchmark public projection digest');
assertNoLeakText(readText('tests/fixtures/colab_benchmark/bundles/static_additive_routing.classical-planner-benchmark-bundle.json'), 'public benchmark bundle');

const diagnostic = buildAlphaDiagnosticBundle({
  releaseManifest: manifest,
  feedback: {
    category: 'Benchmark/Reproducibility Concern',
    severity: 'Moderate',
    title: 'Alpha diagnostic security audit',
    observedBehavior: 'C:\\Users\\Ted\\secret\\field.json token=abc123 person@example.com',
    expectedBehavior: 'No local path, credential, or email should remain.',
    reproductionSteps: 'Open Product Hub, export diagnostics.',
    optionalNotes: 'password: hunter2'
  },
  error: new Error('Failed at C:\\Users\\Ted\\private\\source.json'),
  appState: {
    level: {
      environmentDigest: 'fnv1a32:test',
      T_hiddenTruth: [[1]],
      oraclePayload: { value: 1 }
    },
    result: {
      resultDigest: 'fnv1a32:result',
      scoreResult: { resultDigest: 'fnv1a32:score' }
    }
  },
  debug: {
    token: 'abc123',
    hiddenTruth: [1, 2, 3],
    planDigest: 'fnv1a32:plan',
    warning: 'Synthetic benchmark only.'
  },
  browser: {
    userAgent: 'AuditBrowser/1.0',
    platform: 'test',
    viewport: { width: 1920, height: 1080 },
    devicePixelRatio: 1
  }
});

assert.equal(diagnostic.privacy.hiddenTruthIncluded, false);
assert.equal(diagnostic.privacy.oracleFieldsIncluded, false);
assert.equal(diagnostic.privacy.localAbsolutePathsIncluded, false);
assert.equal(diagnostic.privacy.importedFileContentsIncluded, false);
assert.equal(diagnostic.privacy.personalIdentifiersIncluded, false);
assert.equal(diagnostic.privacy.automaticallyTransmitted, false);
assert.equal(diagnostic.release.ownerReviewStatus, 'PENDING');
assert.equal(diagnostic.release.releaseRecommendation, 'ALPHA_R1_ACCEPTANCE_PACKAGE_READY');
assert.equal(diagnostic.safeContext.build.applicationCommit, manifest.applicationCommit, 'diagnostic includes safe commit identity');
assert.deepEqual(diagnostic.safeContext.build.packageVersions, manifest.packageVersions, 'diagnostic includes package versions');
assert.equal(diagnostic.safeContext.identities.validationBaselineDigest, 'fnv1a32:dd016175');
assert.equal(diagnostic.safeContext.identities.localAcceptanceDigest, 'fnv1a32:9a73d341');
assertNoLeakText(JSON.stringify(diagnostic), 'diagnostic bundle');

for (const needle of [
  'Google Colab Hosted Smoke Owner Checklist',
  'Student / Player Track',
  'Researcher / Instructor Track',
  'P0',
  'P1',
  'P2',
  'P3',
  'SCI',
  'EDU',
  'BENCH',
  'Local Python Execution: `VERIFIED`',
  'Authoritative ANCHOR Finalization: `VERIFIED`',
  'Pages Notebook Delivery: `VERIFIED`',
  'Google Colab Hosting Smoke: `PENDING`'
]) assert.ok(docs.includes(needle), `docs/alpha_release.md contains ${needle}`);

for (const screenshot of REQUIRED_SCREENSHOTS) assert.ok(manifest.acceptance.ownerReviewPackage.screenshots.includes(screenshot), `manifest lists ${screenshot}`);
for (const summary of REQUIRED_SUMMARIES) assert.ok(manifest.acceptance.ownerReviewPackage.summaryFiles.includes(summary), `manifest lists ${summary}`);

console.log(JSON.stringify({
  ok: true,
  releaseId: manifest.releaseId,
  releaseVersion: manifest.releaseVersion,
  releaseDigest: manifest.releaseDigest,
  scenarioCatalogDigest: manifest.acceptance.scenarioCatalog.digest,
  ownerReviewStatus: manifest.acceptance.ownerReviewStatus,
  releaseRecommendation: manifest.acceptance.releaseRecommendation,
  googleColabHostingSmoke: manifest.acceptance.notebookVerification.googleColabHostingSmoke,
  diagnosticDigest: diagnostic.diagnosticDigest
}, null, 2));

function readJson(file) {
  return JSON.parse(readText(file).replace(/^\uFEFF/, ''));
}

function readText(file) {
  return readFileSync(file, 'utf8');
}

function withoutKey(value, key) {
  const clone = { ...value };
  delete clone[key];
  return clone;
}

function browserEntry(entries, pattern) {
  return entries.find((entry) => pattern.test(entry.browser));
}

function assertNoLeakText(text, label) {
  const forbidden = [
    /T_hiddenTruth/i,
    /"hiddenTruth"\s*:/i,
    /oraclePayload/i,
    /"oracleFields"\s*:/i,
    /"localStorage"\s*:/i,
    /"clipboard"\s*:/i,
    /"cookie"\s*:/i,
    /[A-Za-z]:\\Users\\/i,
    /token\s*[:=]/i,
    /password\s*[:=]/i,
    /credential\s*[:=]/i,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  ];
  const matches = forbidden.filter((pattern) => pattern.test(text)).map(String);
  assert.deepEqual(matches, [], `${label} has no forbidden private payloads`);
}
