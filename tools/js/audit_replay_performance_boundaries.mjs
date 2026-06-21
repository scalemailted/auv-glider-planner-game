#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const controller = fs.readFileSync('src/game/three/ThreeReplayReviewController.js', 'utf8');
const scene = fs.readFileSync('src/game/phaser/scenes/MissionReplayReviewScene.js', 'utf8');
assert.ok(controller.includes('presentationDirtyCategories'), 'controller sends replay dirty categories to renderer');
assert.equal(/SimulationEngine|MissionSimulation|calculateScore|scoreMission/.test(controller), false, 'controller does not import or call simulation/scoring authority');
assert.equal(/buildBathymetryMeshGeometry|extractCoastlineSegments/.test(controller), false, 'controller does not rebuild terrain geometry directly');
assert.ok(scene.includes('setInterval'), 'scene drives playback from replay timer, not browser animation time authority');
assert.ok(scene.includes('clearInterval'), 'scene clears replay timer on shutdown');
console.log('audit_replay_performance_boundaries: PASS', JSON.stringify({ controllerOwnsGeometry: false, controllerOwnsScoring: false }));
