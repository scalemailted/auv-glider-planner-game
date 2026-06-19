import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { updateThreeGliderLayer } from '../../src/game/three/layers/ThreeGliderLayer.js';

const group = new THREE.Group();
const coordinateSystem = createMissionWorldCoordinateTransform({ grid: { width: 6, height: 6 }, cellSize: 1 });
updateThreeGliderLayer(group, { coordinateSystem, gliders: [{ agentId: 'g1', x: 1, y: 1, headingRadians: 0, pitchRadians: 0 }] });
const mesh = group.children[0];
const q0 = mesh.quaternion.clone();
updateThreeGliderLayer(group, { coordinateSystem, gliders: [{ agentId: 'g1', x: 2, y: 1, headingRadians: Math.PI / 2, pitchRadians: 0.2 }] });
assert.equal(group.children[0], mesh, 'glider mesh identity should be reused');
assert.equal(q0.equals(mesh.quaternion), false, 'heading/pitch change should update quaternion');
updateThreeGliderLayer(group, { coordinateSystem, gliders: [{ agentId: 'g1', x: 2, y: 1, headingRadians: Math.PI / 2 }, { agentId: 'g2', x: 3, y: 2, headingRadians: Math.PI }] });
assert.equal(group.children.length, 2);
console.log('smoke_three_glider_orientation passed');
