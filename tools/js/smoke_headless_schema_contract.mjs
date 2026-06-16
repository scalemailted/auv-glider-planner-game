import assert from 'node:assert/strict';

import {
  HEADLESS_ARTIFACT_TYPES,
  HEADLESS_DATA_VISIBILITY_TIERS,
  HEADLESS_RUNTIME_TARGETS,
  createHeadlessSchemaDescriptor,
  headlessSchemaSummary,
  validateHeadlessSchemaDescriptor
} from '../../src/core/headless/HeadlessSchemaContract.js';
import { HEADLESS_CANONICAL_FIELDS, createHeadlessFieldDescriptor, validateHeadlessFieldDescriptor } from '../../src/core/headless/HeadlessFieldSchema.js';
import { createHeadlessMissionConfig, validateHeadlessMissionConfig } from '../../src/core/headless/HeadlessMissionSchema.js';
import { createHeadlessEpisode, validateHeadlessEpisode } from '../../src/core/headless/HeadlessEpisodeSchema.js';
import { createHeadlessBundleManifest, validateHeadlessBundleManifest } from '../../src/core/headless/HeadlessBundleManifest.js';

const descriptor = createHeadlessSchemaDescriptor();
assert.equal(validateHeadlessSchemaDescriptor(descriptor).valid, true, 'schema descriptor validates');
assert.ok(HEADLESS_ARTIFACT_TYPES.includes('anchor.headless.bundle'), 'bundle artifact type exists');
assert.ok(HEADLESS_ARTIFACT_TYPES.includes('anchor.headless.colab-notebook-config'), 'Colab notebook artifact type exists');
assert.ok(HEADLESS_ARTIFACT_TYPES.includes('anchor.headless.solver-roundtrip-report'), 'solver roundtrip report artifact type exists');
assert.ok(HEADLESS_ARTIFACT_TYPES.includes('anchor.headless.roundtrip-report'), 'legacy roundtrip report artifact type exists');
assert.ok(HEADLESS_ARTIFACT_TYPES.includes('anchor.headless.solver-roundtrip-bundle'), 'solver roundtrip bundle artifact type exists');
assert.ok(HEADLESS_DATA_VISIBILITY_TIERS.includes('hiddenTruth'), 'hiddenTruth tier exists');
assert.ok(HEADLESS_DATA_VISIBILITY_TIERS.includes('oracle'), 'oracle tier exists');
assert.ok(HEADLESS_RUNTIME_TARGETS.includes('pythonOceanBox'), 'pythonOceanBox runtime target exists');
assert.ok(HEADLESS_RUNTIME_TARGETS.includes('colabNotebook'), 'colabNotebook runtime target exists');
for (const fieldId of ['T_hiddenTruth', 'E_forecast', 'mu_belief', 'U_uncertainty', 'P_unknown', 'A_global', 'Q_glider', 'F_u', 'F_v', 'hiddenEventProbability']) {
  assert.ok(HEADLESS_CANONICAL_FIELDS.some((field) => field.id === fieldId), `${fieldId} canonical field exists`);
}
const hiddenField = createHeadlessFieldDescriptor({ id: 'T_hiddenTruth' });
assert.equal(hiddenField.visibilityTier, 'hiddenTruth', 'hidden truth field uses hidden visibility');
assert.equal(validateHeadlessFieldDescriptor(hiddenField).valid, true, 'hidden field descriptor validates');
const mission = createHeadlessMissionConfig({ missionId: 'm1', world: { width: 4, height: 3 }, gliders: [{ id: 'g1', start: { x: 0, y: 0 } }], objectives: [{ id: 'reconnaissanceSurvey' }] });
assert.equal(validateHeadlessMissionConfig(mission).valid, true, 'mission config validates');
const episode = createHeadlessEpisode({ episodeId: 'e1', observations: [{ x: 1, y: 1, value: 2 }], actions: [{ x: 2, y: 2 }], rewards: [{ value: 1 }] });
assert.equal(validateHeadlessEpisode(episode).valid, true, 'episode validates');
const manifest = createHeadlessBundleManifest({ files: [{ path: 'manifest.json', role: 'manifest' }] });
assert.equal(validateHeadlessBundleManifest(manifest).valid, true, 'manifest validates');
const summary = headlessSchemaSummary(descriptor);
assert.equal(summary.implementsPythonPackage, false, 'H0 does not claim Python package');
assert.equal(summary.implementsNewSimulator, false, 'H0 does not claim new simulator');
assert.equal(summary.implementsNewPlanner, false, 'H0 does not claim new planner');
assert.equal(summary.implementsMARL, false, 'H0 does not claim MARL');
console.log('smoke_headless_schema_contract: ok');