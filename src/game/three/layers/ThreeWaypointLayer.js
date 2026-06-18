import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { clearGroup, agentColor, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeWaypointLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const waypoint of viewModel.waypoints ?? []) {
    if (waypoint.visible === false) continue;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(transform.cellSize * (waypoint.selected ? 0.22 : 0.16), 20, 12),
      new THREE.MeshStandardMaterial({ color: waypoint.selected ? 0xffffff : agentColor(waypoint.agentId, waypoint.index), roughness: 0.42, metalness: 0.04 })
    );
    mesh.name = waypoint.waypointId;
    mesh.position.copy(positionForRecord(transform, waypoint, 0.22));
    mesh.userData = { missionObjectType: 'waypoint', missionObjectId: waypoint.waypointId, id: waypoint.waypointId, waypointId: waypoint.waypointId, agentId: waypoint.agentId, index: waypoint.index, action: waypoint.action, selected: waypoint.selected === true, gridCell: { x: waypoint.x, y: waypoint.y } };
    group.add(mesh);
  }
  return group;
}

