import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { clearGroup, agentColor, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeGliderLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const [index, glider] of (viewModel.gliders ?? []).entries()) {
    if (glider.visible === false) continue;
    const color = glider.selected ? 0xfff0a3 : agentColor(glider.agentId, index);
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(transform.cellSize * 0.24, transform.cellSize * 0.72, 24),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08 })
    );
    mesh.name = glider.agentId;
    mesh.position.copy(positionForRecord(transform, glider, 0.32));
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.z = -Number(glider.headingRadians ?? 0);
    mesh.userData = { id: glider.agentId, agentId: glider.agentId, selected: glider.selected === true, status: glider.status };
    group.add(mesh);
  }
  return group;
}
