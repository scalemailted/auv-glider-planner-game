import assert from 'node:assert/strict';
import { canonicalJsonDigest, decodeArtifact, packageBoundarySummary } from '../../packages/codecs/src/index.js';

const before = {
  document: globalThis.document,
  window: globalThis.window,
  Phaser: globalThis.Phaser,
  THREE: globalThis.THREE
};
const digest = canonicalJsonDigest({ b: 2, a: 1 });
const decoded = decodeArtifact({ schemaVersion: '2.0', type: 'anchor.plan', agentPlans: [] }, { kind: 'plan' });
assert.equal(decoded.status, 'ACCEPTED');
assert.equal(packageBoundarySummary().package, '@anchor/codecs');
assert.equal(globalThis.document, before.document);
assert.equal(globalThis.window, before.window);
assert.equal(globalThis.Phaser, before.Phaser);
assert.equal(globalThis.THREE, before.THREE);
console.log(JSON.stringify({ ok: true, digest, packageUsesDom: false, packageUsesPhaser: false, packageUsesThree: false }, null, 2));