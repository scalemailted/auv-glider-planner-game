import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { clearGroup, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreePlanningMarkerLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const marker of viewModel.planningMarkers ?? []) {
    if (marker.visible === false) continue;
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(transform.cellSize * 0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xb197fc, transparent: true, opacity: 0.88 })
    );
    mesh.name = marker.markerId;
    mesh.position.copy(positionForRecord(transform, marker, 0.28));
    mesh.userData = { missionObjectType: 'planningMarker', missionObjectId: marker.markerId, id: marker.markerId, markerId: marker.markerId, agentId: marker.agentId ?? null, executable: false, plannedTimeSeconds: marker.plannedTimeSeconds, gridCell: { x: marker.x, y: marker.y } };
    group.add(mesh);
  }
  return group;
}

