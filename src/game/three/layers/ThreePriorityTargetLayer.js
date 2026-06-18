import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { clearGroup, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreePriorityTargetLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const target of viewModel.priorityTargets ?? []) {
    if (target.visible === false) continue;
    const star = new THREE.Group();
    star.name = target.targetId;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(transform.cellSize * 0.22, transform.cellSize * 0.035, 8, 24),
      new THREE.MeshBasicMaterial({ color: target.claimed ? 0x9aa6b8 : 0xffd166, transparent: true, opacity: target.active ? 0.96 : 0.32 })
    );
    ring.rotation.x = -Math.PI / 2;
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(transform.cellSize * 0.13, 0),
      new THREE.MeshBasicMaterial({ color: target.claimed ? 0x9aa6b8 : 0xfff0a3, transparent: true, opacity: target.active ? 0.94 : 0.32 })
    );
    star.add(ring, core);
    star.position.copy(positionForRecord(transform, target, 0.34));
    star.userData = { id: target.targetId, targetId: target.targetId, active: target.active, claimed: target.claimed, value: target.value };
    group.add(star);
  }
  return group;
}
