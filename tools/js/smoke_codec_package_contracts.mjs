import assert from 'node:assert/strict';
import {
  ARTIFACT_ENVELOPE_VERSION,
  BUNDLE_MANIFEST_VERSION,
  CODEC_PACKAGE_VERSION,
  FailureCodes,
  artifactKindById,
  artifactKindRegistry,
  artifactEnvelopeDigest,
  bundleManifestDigest,
  canonicalJsonDigest,
  canonicalJsonParse,
  canonicalJsonStringify,
  createArtifactEnvelope,
  createBundleManifest,
  decodeArtifact,
  encodeArtifact,
  inspectArtifact,
  migrationRegistry,
  migrateArtifact,
  packageBoundarySummary,
  validateArtifact,
  validateArtifactEnvelope,
  validateBundleManifest,
  encodeJsonLines,
  decodeJsonLines,
  validateJsonLines
} from '../../packages/codecs/src/index.js';

const registry = artifactKindRegistry();
assert.equal(packageBoundarySummary().package, '@anchor/codecs');
assert.ok(registry.length >= 20, 'registry covers Alpha artifact families');
for (const kind of ['challenge', 'level', 'mission', 'plan', 'planSegment', 'solverPacket', 'externalSolverPlan', 'result', 'scoreResult', 'replayBundle', 'headlessBundle', 'benchmarkRecord', 'benchmarkComparison', 'surfaceObservation', 'datasetManifest', 'mlJsonlRecord']) {
  assert.ok(artifactKindById(kind), `registry contains ${kind}`);
}

const unordered = { b: 2, a: { d: 4, c: 3 }, z: -0 };
assert.equal(canonicalJsonStringify(unordered), '{"a":{"c":3,"d":4},"b":2,"z":0}');
assert.equal(canonicalJsonDigest(unordered), canonicalJsonDigest({ z: 0, a: { c: 3, d: 4 }, b: 2 }));
assert.equal(canonicalJsonDigest(JSON.parse(canonicalJsonStringify(unordered, { pretty: true }))), canonicalJsonDigest(unordered));
assert.throws(() => canonicalJsonStringify({ bad: NaN }), /Non-finite/);
assert.throws(() => canonicalJsonStringify({ bad: Infinity }), /Non-finite/);
assert.throws(() => canonicalJsonParse('{bad'), /Invalid JSON/);
assert.throws(() => canonicalJsonParse('{"__proto__":{"polluted":true}}'), /Unsafe object key/);

const plan = {
  schemaVersion: '2.0',
  type: 'anchor.plan',
  meta: { planner: { solverId: 'manual', plannerClass: 'human' } },
  agentPlans: [{ agentId: 'glider_01', selectedStart: { x: 0, y: 0 }, waypoints: [{ id: 'w1', x: 1, y: 2, t: 3, action: 'sample' }] }],
  planningMarkers: [],
  assumptions: { coordinateFrame: 'local-meters', timeUnits: 'seconds', depthConvention: 'positive-down meters' }
};
const encodedPlan = encodeArtifact('plan', plan, { createdAt: '2026-06-25T00:00:00.000Z' });
assert.equal(encodedPlan.artifactType, 'anchor.plan');
assert.equal(encodedPlan.artifactVersion, '2.0');
assert.equal(validateArtifactEnvelope(encodedPlan.envelope).status, 'PASS');
assert.equal(artifactEnvelopeDigest(encodedPlan.envelope), encodedPlan.envelopeDigest);
const decodedPlan = decodeArtifact(encodedPlan.text, { kind: 'plan' });
assert.equal(decodedPlan.status, 'ACCEPTED');
assert.equal(decodedPlan.payloadDigest, encodedPlan.payloadDigest);

const legacyPlan = { schemaVersion: '1.0', type: 'anchor.plan', waypoints: [], agentPlans: [] };
const migrated = migrateArtifact('plan', legacyPlan);
assert.equal(migrated.report.status, 'PASS');
assert.equal(migrated.payload.schemaVersion, '2.0');
assert.equal(migrated.report.lossless, true);
assert.notEqual(migrated.report.originalPayloadDigest, migrated.report.migratedPayloadDigest);
assert.equal(decodeArtifact(legacyPlan, { kind: 'plan' }).status, 'ACCEPTED');
assert.equal(migrateArtifact('plan', migrated.payload).report.idempotent, true);
assert.ok(migrationRegistry().migrations.some((entry) => entry.id === 'anchor.plan:1.0->2.0'));

const unsupportedLegacy = decodeArtifact({ schemaVersion: '0.5', type: 'anchor.plan', agentPlans: [] }, { kind: 'plan' });
assert.equal(unsupportedLegacy.status, 'REJECTED');
assert.ok(unsupportedLegacy.failures.some((entry) => entry.code === FailureCodes.UNSUPPORTED_LEGACY_VERSION));
const futurePlan = decodeArtifact({ schemaVersion: '9.0', type: 'anchor.plan', agentPlans: [] }, { kind: 'plan' });
assert.equal(futurePlan.status, 'REJECTED');
assert.ok(futurePlan.failures.some((entry) => entry.code === FailureCodes.UNSUPPORTED_FUTURE_VERSION));
const missingVersion = decodeArtifact({ type: 'anchor.plan', agentPlans: [] }, { kind: 'plan' });
assert.equal(missingVersion.status, 'REJECTED');
assert.ok(missingVersion.failures.some((entry) => entry.code === FailureCodes.MISSING_VERSION));
const unknown = decodeArtifact({ schemaVersion: '1.0', type: 'anchor.future' });
assert.equal(unknown.status, 'REJECTED');
assert.ok(unknown.failures.some((entry) => entry.code === FailureCodes.UNSUPPORTED_ARTIFACT_TYPE));

const huge = decodeArtifact({ schemaVersion: '2.0', type: 'anchor.plan', agentPlans: [{ agentId: 'g1', waypoints: Array.from({ length: 6 }, (_, index) => ({ id: `w${index}` })) }] }, { kind: 'plan', limits: { maxWaypointCount: 5 } });
assert.equal(huge.status, 'REJECTED');
assert.ok(huge.failures.some((entry) => entry.code === FailureCodes.DIMENSION_LIMIT_EXCEEDED));
const unsafe = decodeArtifact('{"schemaVersion":"2.0","type":"anchor.plan","__proto__":{}}', { kind: 'plan' });
assert.equal(unsafe.status, 'REJECTED');
assert.ok(unsafe.failures.some((entry) => entry.code === FailureCodes.UNSAFE_OBJECT_KEY));
const publicLeak = decodeArtifact({ schemaVersion: '2.0', type: 'anchor.plan', T_hiddenTruth: { cells: [] }, agentPlans: [] }, { kind: 'plan' });
assert.equal(publicLeak.status, 'REJECTED');
assert.ok(publicLeak.failures.some((entry) => entry.code === FailureCodes.VISIBILITY_POLICY_CONFLICT));

const manifest = createBundleManifest({
  bundleType: 'anchor.headless.bundle',
  bundleVersion: '1.0',
  entries: [{ role: 'plan', artifactType: 'anchor.plan', artifactVersion: '2.0', filename: 'anchor.plan.json', payloadDigest: encodedPlan.payloadDigest, required: true }]
});
assert.equal(manifest.manifestVersion, BUNDLE_MANIFEST_VERSION);
assert.equal(validateBundleManifest(manifest).status, 'PASS');
assert.equal(bundleManifestDigest(manifest), manifest.bundleDigest);
assert.equal(createArtifactEnvelope({ payload: plan }).envelopeVersion, ARTIFACT_ENVELOPE_VERSION);

const jsonl = encodeJsonLines([{ type: 'anchor.ml-jsonl-record', schemaVersion: '0.1-codec-r1-placeholder', value: 1 }, { value: 2 }]);
const jsonlDecoded = decodeJsonLines(jsonl);
assert.equal(jsonlDecoded.status, 'ACCEPTED');
assert.equal(jsonlDecoded.recordCount, 2);
const brokenJsonl = decodeJsonLines('{"ok":true}\n\n{"ok":false}');
assert.equal(brokenJsonl.status, 'REJECTED');
assert.ok(brokenJsonl.failures.some((entry) => entry.lineNumber === 2));
assert.equal(validateJsonLines(jsonlDecoded.records, () => ({ status: 'PASS', warnings: [], failures: [] })).status, 'PASS');

const solverPacket = {
  schemaVersion: '2.0',
  type: 'anchor.solverPacket',
  mission: { schemaVersion: '2.0', type: 'anchor.mission' },
  environmentDigest: 'fnv1a32:00000001',
  units: { time: 'seconds', depth: 'positive-down meters', coordinates: 'local-meters' },
  fairnessClass: 'FORECAST_ONLY'
};
assert.equal(decodeArtifact(solverPacket, { kind: 'solverPacket' }).status, 'ACCEPTED');
const result = {
  schemaVersion: '3.0',
  type: 'anchor.result',
  scoreResult: { version: 'score-result-score-pkg-r1', profileId: 'balancedMission', profileVersion: 'score-profile-score-pkg-r1', officialScore: 42, resultDigest: 'fnv1a32:11111111', scoreDigest: 'fnv1a32:22222222' },
  scoreArtifactIdentities: { artifactType: 'anchor.result', artifactVersion: '3.0', scoreResultDigest: 'fnv1a32:11111111', scoreDigest: 'fnv1a32:22222222', fairnessClass: 'PUBLIC_FAIR', visibilityClass: 'PUBLIC_OBSERVATION_ONLY' },
  codecMetadata: { packageVersion: CODEC_PACKAGE_VERSION, artifactType: 'anchor.result', artifactVersion: '3.0' }
};
assert.equal(decodeArtifact(result, { kind: 'result' }).status, 'ACCEPTED');
assert.equal(inspectArtifact(result, { kind: 'result' }).scoreMetadata.officialScore, 42);
const scoreResult = { version: 'score-result-score-pkg-r1', profileId: 'balancedMission', profileVersion: 'score-profile-score-pkg-r1', officialScore: 42, resultDigest: 'fnv1a32:a', scoreDigest: 'fnv1a32:b' };
assert.equal(decodeArtifact(scoreResult, { kind: 'scoreResult' }).status, 'ACCEPTED');

for (const [kind, artifact] of [
  ['challenge', { schemaVersion: '3.0', type: 'anchor.challenge' }],
  ['level', { schemaVersion: '2.0', type: 'anchor.level' }],
  ['mission', { schemaVersion: '2.0', type: 'anchor.mission', agents: [] }],
  ['planSegment', { schemaVersion: '1.0', type: 'anchor.plan-segment', segment: {} }],
  ['surfaceObservation', { schemaVersion: '3.0', type: 'anchor.surfaceObservation', observations: [] }],
  ['benchmarkRecord', { schemaVersion: 'benchmark-run-record-p2', type: 'anchor.benchmark.run-record' }],
  ['benchmarkComparison', { schemaVersion: 'benchmark-comparison-export-p3', type: 'anchor.benchmark.comparison' }]
]) {
  assert.equal(decodeArtifact(artifact, { kind }).status, 'ACCEPTED', `${kind} decodes`);
}

const report = inspectArtifact(encodedPlan.envelope);
assert.equal(report.status, 'ACCEPTED');
if (typeof structuredClone === 'function') structuredClone(report);
assert.equal(validateArtifact('plan', plan).status, 'PASS');
assert.equal(canonicalJsonDigest(result), canonicalJsonDigest(JSON.parse(canonicalJsonStringify(result, { pretty: true }))));

console.log(JSON.stringify({ ok: true, packageVersion: CODEC_PACKAGE_VERSION, registryCount: registry.length, planDigest: encodedPlan.payloadDigest }, null, 2));