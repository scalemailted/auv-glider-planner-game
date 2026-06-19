import assert from 'node:assert/strict';
import {
  createThreeMissionSceneLifecycle,
  disposeThreeMissionSceneLifecycle,
  registerThreeMissionSceneResource,
  threeMissionSceneLifecycleSummary
} from '../../src/game/three/ThreeMissionSceneLifecycle.js';

assert.equal(threeMissionSceneLifecycleSummary(null).status, 'inactive');
assert.equal(threeMissionSceneLifecycleSummary(undefined).status, 'inactive');
assert.equal(disposeThreeMissionSceneLifecycle(null), null);
const partial = { sceneKey: 'partial' };
disposeThreeMissionSceneLifecycle(partial, 'partial-test');
assert.equal(threeMissionSceneLifecycleSummary(partial).activeResourceCount, 0);
const lifecycle = createThreeMissionSceneLifecycle({ sceneKey: 'smoke' });
let disposed = 0;
registerThreeMissionSceneResource(lifecycle, 'subscription', { dispose: () => { disposed += 1; } });
disposeThreeMissionSceneLifecycle(lifecycle, 'first');
disposeThreeMissionSceneLifecycle(lifecycle, 'second');
const summary = threeMissionSceneLifecycleSummary(lifecycle);
assert.equal(disposed, 1);
assert.equal(summary.disposed, true);
assert.equal(summary.activeResourceCount, 0);
assert.equal(summary.disposeErrorCount, 0);
console.log('smoke_three_lifecycle_null_safety passed');