import assert from 'node:assert/strict';
import fs from 'node:fs';
import { disposeThreeMissionEditorController, threeMissionEditorControllerSummary } from '../../src/game/three/ThreeMissionEditorController.js';

const removed = [];
const fakeTarget = { removeEventListener: (type) => removed.push(type) };
const controller = { enabled: true, disposed: false, listeners: [{ target: fakeTarget, type: 'pointerup', listener: () => {} }], renderer: null, session: null };
disposeThreeMissionEditorController(controller);
assert.equal(controller.disposed, true);
assert.equal(controller.listeners.length, 0);
assert.deepEqual(removed, ['pointerup']);
const summary = threeMissionEditorControllerSummary(controller);
assert.equal(summary.disposed, true);
assert.equal(summary.resourceLifecycle.activeControllerCount, 0);
const scene = fs.readFileSync('src/game/phaser/scenes/EnvironmentEditorScene.js', 'utf8');
for (const required of ['disposeThreeMissionEditorController(this.threeEditorController)', 'disposeThreeMissionWorldRenderer(this.threeEditorRenderer)', 'this.threeEditorContainer?.remove', 'activeRendererCount: 0', 'activeDomListenerCount: 0']) assert.ok(scene.includes(required), `scene cleanup should include ${required}`);
console.log('smoke_mission_editor_resource_lifecycle: PASS');
