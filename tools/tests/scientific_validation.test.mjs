import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  VALIDATION_EVIDENCE_LEVELS,
  VALIDATION_STATUSES,
  createValidationClaimDefinition,
  createValidationEvidenceRecord,
  createScientificValidationReport,
  createScientificValidationManifest,
  createValidationReference,
  validationClaimDefinitionDigest,
  validationEvidenceRecordDigest,
  scientificValidationReportDigest,
  scientificValidationManifestDigest,
  validateValidationClaimDefinition,
  validateValidationEvidenceRecord,
  validateScientificValidationReport,
  validateScientificValidationManifest,
  publicValidationSummary
} from '../../packages/validation/src/index.js';
import { encodeArtifact, decodeArtifact, inspectArtifact } from '../../packages/codecs/src/index.js';
import { buildOfficialValidationBaseline, writeValidationBaseline } from '../science/build_validation_baseline.mjs';

const root = process.cwd();
const baseline = buildOfficialValidationBaseline();

assert.equal(VALIDATION_EVIDENCE_LEVELS.SOFTWARE_VERIFIED, 'SOFTWARE_VERIFIED');
assert.equal(VALIDATION_EVIDENCE_LEVELS.EXTERNALLY_COMPARED, 'EXTERNALLY_COMPARED');
assert.equal(VALIDATION_STATUSES.NOT_EVALUATED, 'NOT_EVALUATED');

const claim = createValidationClaimDefinition({
  claimId: 'test.claim',
  componentId: 'test',
  title: 'Claim creation',
  plainLanguageClaim: 'A test claim is normalized.',
  technicalClaim: 'The validation package normalizes a claim definition.',
  evidenceLevel: 'software-verified',
  methodId: 'unit-test',
  metricId: 'validity',
  units: 'unitless',
  threshold: 0,
  tolerance: 0,
  thresholdRationale: 'A structural unit test should have zero failures.',
  fixtureIds: ['tests/fixtures/codec_r1_interop_fixture.json'],
  referenceIds: ['reference'],
  applicability: 'unit test'
});
assert.equal(claim.evidenceLevel, 'SOFTWARE_VERIFIED');
assert.equal(validateValidationClaimDefinition(claim).status, 'PASS');
assert.equal(validationClaimDefinitionDigest(claim), claim.claimDigest);
assert.equal(validateValidationClaimDefinition({ ...claim, thresholdRationale: '' }).status, 'FAIL');
assert.equal(validateValidationClaimDefinition({ ...claim, status: 'PASS' }).status, 'FAIL');

const methodReference = createValidationReference({ referenceId: 'method-ref', title: 'Method reference', role: 'methodReference' });
const externalReference = createValidationReference({ referenceId: 'external-ref', title: 'External reference', role: 'externalComparison' });
assert.equal(methodReference.role, 'methodReference');
assert.equal(externalReference.role, 'externalComparison');

const evidence = createValidationEvidenceRecord({
  claimId: claim.claimId,
  componentId: claim.componentId,
  modelId: 'test-model',
  modelVersion: '1.0',
  evidenceLevel: claim.evidenceLevel,
  status: 'pass',
  methodId: claim.methodId,
  metricId: claim.metricId,
  measuredValue: 0,
  units: claim.units,
  threshold: claim.threshold,
  tolerance: claim.tolerance,
  errorValue: 0,
  relativeError: 0,
  fixtureIds: claim.fixtureIds,
  sourceArtifactDigests: { fixture: 'fnv1a32:test' },
  packageVersions: { validation: 'test' },
  runtimeMetadata: { deterministic: true },
  interpretation: 'The normalized evidence record is structurally valid.',
  limitations: ['Fixture scoped.'],
  references: [methodReference],
  reproductionCommand: 'node tools/tests/scientific_validation.test.mjs'
});
assert.equal(evidence.status, 'PASS');
assert.equal(validateValidationEvidenceRecord(evidence).status, 'PASS');
assert.equal(validationEvidenceRecordDigest(evidence), evidence.evidenceDigest);
assert.equal(validateValidationEvidenceRecord({ ...evidence, reproductionCommand: 'C:\\tmp\\bad.js' }).status, 'FAIL');

const report = createScientificValidationReport({
  reportId: 'test-report',
  componentId: 'test',
  componentLabel: 'Test',
  modelId: 'test-model',
  modelVersion: '1.0',
  summary: 'Test report.',
  claims: [claim],
  evidence: [evidence],
  assumptions: ['Test only.'],
  limitations: ['Test only.'],
  references: [methodReference],
  packageVersions: { validation: 'test' },
  sourceArtifactDigests: { fixture: 'fnv1a32:test' },
  suitabilityDecision: {
    deterministicRegression: 'GO',
    educationalUse: 'GO',
    classicalPlannerBenchmark: 'CONDITIONAL',
    mlDatasetGeneration: 'CONDITIONAL',
    operationalForecastUse: 'NO_GO',
    certifiedNavigationUse: 'NO_GO',
    rationale: 'Test rationale.',
    conditions: ['Test only.']
  },
  claimBoundary: { benchmarkOrEducationUse: true, operationalForecast: false, certifiedNavigation: false, calibratedDigitalTwin: false }
});
assert.equal(validateScientificValidationReport(report).status, 'PASS');
assert.equal(scientificValidationReportDigest(report), report.reportDigest);
assert.equal(validateScientificValidationReport({ ...report, scientificValidityScore: 0.92 }).status, 'FAIL');

const manifest = createScientificValidationManifest({
  manifestId: 'test-manifest',
  applicationVersion: 'test',
  validationBaselineId: 'test-baseline',
  reports: [{ componentId: report.componentId, reportId: report.reportId, reportVersion: report.schemaVersion, reportDigest: report.reportDigest, path: 'validation/reports/test.json' }],
  evidenceLevelSummary: report.evidenceLevelSummary,
  statusSummary: report.statusSummary,
  packageVersions: { validation: 'test' },
  alphaPositioning: 'ANCHOR Alpha is a deterministic, scientifically constrained research-and-education sandbox for investigating adaptive underwater-glider mission planning. It supports reproducible comparison of human, classical, and learning-based planners. It is not an operational ocean forecast or certified vehicle-navigation system.',
  overallClaimBoundary: { benchmarkOrEducationUse: true, operationalForecast: false, certifiedNavigation: false, calibratedDigitalTwin: false }
});
assert.equal(validateScientificValidationManifest(manifest).status, 'PASS');
assert.equal(scientificValidationManifestDigest(manifest), manifest.manifestDigest);
assert.equal(publicValidationSummary(manifest).componentCount, 1);

const requiredComponents = new Set(['bathymetry', 'currents', 'scalar-processes', 'environment', 'glider-dynamics', 'sampling-observations', 'mission-simulator', 'scoring', 'codecs-reproducibility']);
assert.equal(baseline.reports.length, requiredComponents.size);
for (const componentId of requiredComponents) assert.ok(baseline.reports.some((item) => item.componentId === componentId), `${componentId} report present`);
for (const reportItem of baseline.reports) {
  assert.equal(validateScientificValidationReport(reportItem).status, 'PASS', `${reportItem.componentId} report validates`);
  assert.ok(reportItem.claims.length > 0, `${reportItem.componentId} claims present`);
  assert.ok(reportItem.evidence.length >= reportItem.claims.length, `${reportItem.componentId} evidence present`);
  for (const claimItem of reportItem.claims) {
    assert.ok(claimItem.thresholdRationale, `${claimItem.claimId} threshold rationale present`);
    assert.ok(claimItem.units, `${claimItem.claimId} units present`);
  }
  for (const record of reportItem.evidence.filter((item) => item.status === 'PASS')) {
    assert.ok(reportItem.claims.some((claimItem) => claimItem.claimId === record.claimId), `${record.claimId} PASS evidence maps to claim`);
  }
  for (const reference of reportItem.references) assert.ok(reference.role, `${reportItem.componentId} reference role present`);
  assert.equal(reportItem.claimBoundary.operationalForecast, false);
  assert.equal(reportItem.claimBoundary.certifiedNavigation, false);
  assert.equal(reportItem.suitabilityDecision.operationalForecastUse, 'NO_GO');
  assert.equal(reportItem.suitabilityDecision.certifiedNavigationUse, 'NO_GO');
  assert.ok(!('validityScore' in reportItem), `${reportItem.componentId} has no universal score`);
}
assert.equal(validateScientificValidationManifest(baseline.manifest).status, 'PASS');
assert.equal(baseline.manifest.statusSummary.PASS, 90);
assert.equal(baseline.manifest.statusSummary.NOT_EVALUATED, 5);
assert.equal(baseline.manifest.statusSummary.WARN, 1);
assert.equal(baseline.manifest.evidenceLevelSummary.EXTERNALLY_COMPARED ?? 0, 0, 'method references are not external comparison evidence');
assert.ok((baseline.manifest.evidenceLevelSummary.NOT_YET_EVALUATED ?? 0) >= 5);

const reportEncoded = encodeArtifact('scientificValidationReport', baseline.reports[0], { createdAt: '2026-06-25T00:00:00.000Z' });
const reportDecoded = decodeArtifact(reportEncoded.text, { kind: 'scientificValidationReport' });
assert.equal(reportDecoded.status, 'ACCEPTED');
const manifestEncoded = encodeArtifact('scientificValidationManifest', baseline.manifest, { createdAt: '2026-06-25T00:00:00.000Z' });
const manifestDecoded = decodeArtifact(manifestEncoded.text, { kind: 'scientificValidationManifest' });
assert.equal(manifestDecoded.status, 'ACCEPTED');
assert.equal(inspectArtifact(baseline.manifest, { kind: 'scientificValidationManifest' }).visibilityClass, 'PUBLIC');
assert.ok(!JSON.stringify(baseline).includes('T_hiddenTruth'), 'baseline does not expose hidden truth markers');

const compare = writeValidationBaseline({ update: false });
assert.deepEqual(compare.changed, []);
for (const entry of baseline.manifest.reports) assert.ok(existsSync(path.join(root, entry.path)), `${entry.path} exists`);
JSON.parse(readFileSync(path.join(root, 'schemas/scientific-validation-report.schema.json'), 'utf8'));
JSON.parse(readFileSync(path.join(root, 'schemas/scientific-validation-manifest.schema.json'), 'utf8'));

console.log(JSON.stringify({
  ok: true,
  reportCount: baseline.reports.length,
  manifestDigest: baseline.manifest.manifestDigest,
  statusSummary: baseline.manifest.statusSummary,
  evidenceLevelSummary: baseline.manifest.evidenceLevelSummary
}, null, 2));