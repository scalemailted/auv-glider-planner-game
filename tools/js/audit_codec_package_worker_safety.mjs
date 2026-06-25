import assert from 'node:assert/strict';
import { decodeArtifact, inspectArtifact } from '../../packages/codecs/src/index.js';

const plan = { schemaVersion: '2.0', type: 'anchor.plan', agentPlans: [] };
const decoded = decodeArtifact(plan, { kind: 'plan' });
const inspection = inspectArtifact(plan, { kind: 'plan' });
assert.equal(decoded.status, 'ACCEPTED');
if (typeof structuredClone === 'function') {
  assert.deepEqual(structuredClone(decoded).status, decoded.status);
  assert.deepEqual(structuredClone(inspection).status, inspection.status);
}
console.log(JSON.stringify({ ok: true, structuredCloneSafe: typeof structuredClone === 'function' }, null, 2));