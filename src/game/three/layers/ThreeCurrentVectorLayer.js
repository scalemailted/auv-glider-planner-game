import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { clearGroup, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeCurrentVectorLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const vector of viewModel.vectorFieldLayer?.vectors ?? []) {
    const start = positionForRecord(transform, vector, 0.3);
    const scale = transform.cellSize * 0.52;
    const end = new THREE.Vector3(start.x + Number(vector.u ?? 0) * scale, start.y, start.z + Number(vector.v ?? 0) * scale);
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const color = Number(vector.magnitude ?? 0) >= 1.1 ? 0xfff0a3 : 0xbef6ff;
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.82 }));
    line.name = vector.id;
    line.userData = { id: vector.id, magnitude: vector.magnitude, timeSeconds: vector.timeSeconds };
    group.add(line);
    const head = new THREE.Mesh(new THREE.ConeGeometry(transform.cellSize * 0.055, transform.cellSize * 0.16, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 }));
    head.position.copy(end);
    head.rotation.x = Math.PI / 2;
    head.rotation.z = -Math.atan2(Number(vector.v ?? 0), Number(vector.u ?? 0)) - Math.PI / 2;
    head.name = `${vector.id}-head`;
    head.userData = { id: head.name, parentVectorId: vector.id };
    group.add(head);
  }
  return group;
}
