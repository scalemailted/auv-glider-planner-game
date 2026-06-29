import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF_ATLAS_OWNER_PACKAGE = 'artifacts/owner-review/ref-atlas-interact-r1-1/qa-summary.json';

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function assertExists(relativePath) {
  assert.ok(existsSync(path.join(root, relativePath)), `${relativePath} must exist`);
}

const manifest = readJson('assets/reference_bathymetry/manifest.json');
const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
const missionReady = fixtures.find((fixture) => fixture.fixtureId === 'monterey_canyon_15s');
const lowResolution = fixtures.find((fixture) => fixture.fixtureId === 'monterey_canyon');
assert.equal(manifest.fixtureStatus, 'AVAILABLE');
assert.equal(manifest.overview?.role, 'globalOverview');
assert.equal(manifest.overview?.bounds?.westLon, -180);
assert.equal(manifest.overview?.bounds?.eastLon, 180);
assert.equal(manifest.overview?.bounds?.southLat, -90);
assert.equal(manifest.overview?.bounds?.northLat, 90);
assert.equal(manifest.overview?.previewKind, 'compactRasterJson');
assert.equal(missionReady?.role, 'missionReadyPatch');
assert.equal(Number(missionReady?.actualRasterResolutionArcSeconds), 15);
assert.equal(lowResolution?.role, 'lowResolutionReferencePatch');

for (const relativePath of [
  'tools/js/smoke_reference_bathymetry_environment_builder.mjs',
  'tools/js/smoke_reference_bathymetry_current_generation.mjs',
  'tools/js/smoke_reference_bathymetry_scalar_hotspot_generation.mjs',
  'tools/js/audit_reference_environment_launch_warning_taxonomy.mjs',
  'tools/js/audit_reference_environment_benchmark_bundle_acceptance.mjs',
  'tools/js/audit_reference_environment_public_safety.mjs',
  'docs/alpha_reference_environment_retest_protocol.md',
  'alpha/reference-environment-retest-feedback-template.json',
  REF_ATLAS_OWNER_PACKAGE
]) {
  assertExists(relativePath);
}

const feedbackTemplate = readJson('alpha/reference-environment-retest-feedback-template.json');
assert.equal(feedbackTemplate.workflowCompleted, false);
assert.ok(feedbackTemplate.clarity && feedbackTemplate.usability, 'feedback template must include clarity and usability sections');
assert.ok(Object.hasOwn(feedbackTemplate.clarity, 'globalAtlasSelectorUnderstandable'), 'feedback template must ask about the global atlas selector');
assert.ok(Object.hasOwn(feedbackTemplate.clarity, 'montereyPatchOverlayDiscoverable'), 'feedback template must ask about Monterey patch overlay discoverability');
assert.ok(Object.hasOwn(feedbackTemplate.clarity, 'globalOverviewVsMissionPatchClear'), 'feedback template must ask about global overview versus mission-ready patch');
assert.ok(Object.hasOwn(feedbackTemplate.clarity, 'offlinePreprocessingClear'), 'feedback template must ask about non-staged regions needing preprocessing');
assert.ok(Object.hasOwn(feedbackTemplate.usability, 'patchRequestExportClear'), 'feedback template must ask about patch request export');

const ownerSummary = readJson(REF_ATLAS_OWNER_PACKAGE);
assert.match(ownerSummary.status, /^PASS/);
assert.equal(ownerSummary.phase, 'REF-ATLAS-INTERACT-R1.1');
assert.equal(ownerSummary.atlasLoaded, true);
assert.equal(ownerSummary.defaultStage, 'globalAtlasSelector');
assert.equal(ownerSummary.overviewIsGlobal, true);
assert.equal(ownerSummary.defaultViewIsRegionalPatch, false);
assert.equal(ownerSummary.fixtureStatus, 'AVAILABLE');
assert.ok(Number(ownerSummary.missionReadyPatchCount) >= 1);
assert.ok(Number(ownerSummary.lowResolutionPatchCount) >= 1);
assert.equal(ownerSummary.panResponsive, true);
assert.equal(ownerSummary.wheelZoomResponsive, true);
assert.equal(ownerSummary.boundaryDrawResponsive, true);
assert.equal(ownerSummary.patchRequestVisible, true);
assert.equal(ownerSummary.resetResponsive, true);
assert.equal(ownerSummary.montereyFocusResponsive, true);
assert.equal(ownerSummary.selectedPatchLoaded, true);
assert.equal(Number(ownerSummary.sceneRestartCountDuringInteraction), 0);
assert.ok(Number(ownerSummary.maxLongTaskMs) < 500);
assert.equal(Number(ownerSummary.activeReferenceAtlasListenersAfterCleanup), 0);
assert.equal(ownerSummary.loadedFixtureId, 'monterey_canyon_15s');
assert.equal(ownerSummary.loadedFixtureRole, 'missionReadyPatch');
assert.equal(ownerSummary.referenceFixtureId, 'monterey_canyon_15s');
assert.equal(ownerSummary.hiddenTruthExposed, false);
assert.equal(ownerSummary.rawExternalDataPathExposed, false);
assert.equal(ownerSummary.simulationChanged, false);
assert.equal(ownerSummary.scoringChanged, false);
assert.equal(ownerSummary.planningLaunchReady, true);
assert.equal(ownerSummary.planningWorkspaceReached, true);
assert.ok(Array.isArray(ownerSummary.screenshots) && ownerSummary.screenshots.length >= 10, 'ref atlas owner package must include at least 10 screenshots');

const artifactText = [
  readText(REF_ATLAS_OWNER_PACKAGE)
].join('\n');
assert.ok(!/external_data[\\/]/i.test(artifactText), 'owner artifacts must not expose raw external_data paths');
assert.ok(!/T_hiddenTruth|rawOracleTensor|oracleState/.test(artifactText), 'owner artifacts must not expose hidden truth markers');
assert.ok(!/"hiddenTruth"\s*:\s*(?!false|null)/.test(artifactText), 'owner artifacts must not include hiddenTruth payloads');

const protocol = readText('docs/alpha_reference_environment_retest_protocol.md');
for (const requiredCopy of [
  'Product Hub',
  'Simulation Lab',
  'Environment Studio',
  'Global Reference Bathymetry Atlas',
  'select Monterey Canyon mission-ready overlay',
  'Load Mission Patch',
  'not an operational ocean forecast',
  'not certified navigation',
  'Reference bathymetry + deterministic synthetic bathymetry-conditioned fields',
  'Generate 3D Bathymetry',
  'Launch to Planning',
  'Export Public Benchmark Bundle'
]) {
  assert.ok(protocol.includes(requiredCopy), `retest protocol must include: ${requiredCopy}`);
}

const ledger = readJson('alpha/feedback-ledger.json');
const item = ledger.items?.find((entry) => entry.feedbackId === 'ALPHA-FB-020');
assert.equal(item?.status, 'READY_FOR_ALPHA_RETEST');
assert.equal(item?.proposedPhase, 'ALPHA-ENV-RETEST-R1');

console.log('audit_alpha_reference_environment_retest_readiness: ok', {
  fixtureId: missionReady.fixtureId,
  fixtureDigest: missionReady.digest,
  ownerPackageStatus: ownerSummary.status,
  defaultStage: ownerSummary.defaultStage,
  launchValidationStatus: ownerSummary.launchValidationStatus,
  maxLongTaskMs: ownerSummary.maxLongTaskMs,
  screenshotCount: ownerSummary.screenshots.length
});
