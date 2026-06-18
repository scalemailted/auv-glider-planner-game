import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  THREE_MISSION_CLICK_THRESHOLD_CSS_PX,
  cancelThreeMissionInteraction,
  createThreeMissionInteractionController,
  disposeThreeMissionInteractionController,
  setThreeMissionInteractionEnabled,
  setThreeMissionInteractionMode,
  threeMissionInteractionControllerSummary
} from '../../src/game/three/ThreeMissionInteractionController.js';

const listeners = [];
const fakeDom = {
  ownerDocument: { addEventListener(type, listener, options) { listeners.push(['doc', type, listener, options]); }, removeEventListener() {} },
  addEventListener(type, listener, options) { listeners.push(['dom', type, listener, options]); },
  removeEventListener() {},
  setPointerCapture() {},
  releasePointerCapture() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 200 })
};
const emitted = [];
const controller = createThreeMissionInteractionController({ domElement: fakeDom, emitIntent: (intent) => { emitted.push(intent); }, getViewModel: () => ({ missionId: 'm', activeTimeSeconds: 0 }) });
assert.equal(THREE_MISSION_CLICK_THRESHOLD_CSS_PX, 5);
assert.ok(listeners.length >= 6, 'pointer, wheel, context, and keyboard listeners are registered');
setThreeMissionInteractionMode(controller, 'placeWaypoint');
assert.equal(controller.interactionMode, 'placeWaypoint');
setThreeMissionInteractionEnabled(controller, false);
assert.equal(controller.enabled, false);
setThreeMissionInteractionEnabled(controller, true);
cancelThreeMissionInteraction(controller);
const summary = threeMissionInteractionControllerSummary(controller);
assert.equal(summary.clickThresholdCssPx, 5);
assert.equal(summary.hoverThrottledByAnimationFrame, true);
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.usesRouteOptimizer, false);
disposeThreeMissionInteractionController(controller);
assert.equal(controller.disposed, true);
assert.equal(controller.listeners.length, 0, 'dispose removes listeners');

const source = fs.readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
assert.match(source, /setPointerCapture/);
assert.match(source, /releasePointerCapture/);
assert.match(source, /requestAnimationFrame/);
assert.match(source, /Escape/);
for (const forbidden of ['addWaypoint(', 'removeWaypoint(', 'updateWaypoint(', 'addMarker(', 'removeMarker(', 'SimulationEngine', 'core/scoring', 'core\\\\scoring']) {
  assert.equal(source.includes(forbidden), false, `controller must not mutate canonical ${forbidden}`);
}

console.log('Three mission interaction controller smoke passed');