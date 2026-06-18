import assert from 'node:assert/strict';
import * as THREE from 'three';

import { createMissionWorldFixture } from './mission_world_fixture.mjs';
import { missionWorldRenderInputFromWorkspace } from '../../src/core/rendering/MissionWorldStateAdapter.js';
import { buildMissionWorldRenderViewModel } from '../../src/core/rendering/MissionWorldRenderViewModel.js';
import { gridCellToWorld } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { updateThreeWaypointLayer } from '../../src/game/three/layers/ThreeWaypointLayer.js';
import { updateThreePlanningMarkerLayer } from '../../src/game/three/layers/ThreePlanningMarkerLayer.js';
import { updateThreeGliderLayer } from '../../src/game/three/layers/ThreeGliderLayer.js';
import { updateThreePriorityTargetLayer } from '../../src/game/three/layers/ThreePriorityTargetLayer.js';
import { updateThreeDropZoneLayer } from '../../src/game/three/layers/ThreeDropZoneLayer.js';
import { hitTestThreeMissionWorld } from '../../src/game/three/ThreeMissionHitTest.js';

const fixture = createMissionWorldFixture();
const viewModel = buildMissionWorldRenderViewModel(missionWorldRenderInputFromWorkspace({ app: { state: fixture.state } }));
const groups = {
  waypointGroup: new THREE.Group(),
  markerGroup: new THREE.Group(),
  gliderGroup: new THREE.Group(),
  priorityTargetGroup: new THREE.Group(),
  dropZoneGroup: new THREE.Group()
};
updateThreeWaypointLayer(groups.waypointGroup, viewModel);
updateThreePlanningMarkerLayer(groups.markerGroup, viewModel);
updateThreeGliderLayer(groups.gliderGroup, viewModel);
updateThreePriorityTargetLayer(groups.priorityTargetGroup, viewModel);
updateThreeDropZoneLayer(groups.dropZoneGroup, viewModel);

const surface = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1, 1, 1),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })
);
surface.rotation.x = -Math.PI / 2;
surface.position.y = 0.5;
surface.scale.set(viewModel.grid.width * viewModel.coordinateSystem.cellSize, viewModel.grid.height * viewModel.coordinateSystem.cellSize, 1);
surface.updateMatrixWorld(true);
for (const group of Object.values(groups)) group.updateMatrixWorld(true);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 1000);
camera.position.set(0, 10, 0.001);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();
camera.updateMatrixWorld(true);
const domElement = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) };
const renderer = { groups, interactionSurface: surface, viewModel };

function pointerForCell(x, y) {
  const world = gridCellToWorld(viewModel.coordinateSystem, x, y, 0);
  const vector = new THREE.Vector3(world.x, 0.6, world.z).project(camera);
  return { clientX: ((vector.x + 1) / 2) * 400, clientY: ((1 - vector.y) / 2) * 400 };
}

const waypointHit = hitTestThreeMissionWorld({ renderer, camera, domElement, viewModel, interactionSurface: surface }, pointerForCell(4, 3));
assert.equal(waypointHit.category, 'waypoint');
assert.equal(waypointHit.waypointId, 'alpha-wp-2');
assert.deepEqual({ x: waypointHit.gridCell.x, y: waypointHit.gridCell.y }, { x: 4, y: 3 });

const markerHit = hitTestThreeMissionWorld({ renderer, camera, domElement, viewModel, interactionSurface: surface }, pointerForCell(4, 2));
assert.equal(markerHit.category, 'planningMarker');
assert.equal(markerHit.markerId, 'marker-1');
assert.equal(markerHit.objectType, 'planningMarker');

const gridHit = hitTestThreeMissionWorld({ renderer, camera, domElement, viewModel, interactionSurface: surface }, pointerForCell(2, 4), { preferGrid: true });
assert.ok(['gridCell', 'glider', 'dropZone'].includes(gridHit.category), `expected public grid/entity hit, got ${gridHit.category}`);
assert.equal(gridHit.summary.usesSharedMissionCoordinates, true);

console.log('Three mission hit testing smoke passed');

