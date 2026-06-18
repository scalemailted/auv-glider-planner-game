import * as THREE from '../../../../node_modules/three/build/three.module.js';
import { gridCellToWorld, missionPositionToWorld } from '../../../core/rendering/MissionWorldCoordinates.js';

export function clearGroup(group) {
  if (!group) return;
  while (group.children.length) {
    const child = group.children.pop();
    disposeObject(child);
  }
}

export function disposeObject(object) {
  if (!object) return;
  object.traverse?.((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((material) => material?.dispose?.());
    else child.material?.dispose?.();
  });
  object.geometry?.dispose?.();
  if (Array.isArray(object.material)) object.material.forEach((material) => material?.dispose?.());
  else object.material?.dispose?.();
}

export function positionForCell(transform, x, y, depthMeters = 0, yOffset = 0.03) {
  const p = gridCellToWorld(transform, x, y, depthMeters);
  return new THREE.Vector3(p.x, p.y + yOffset, p.z);
}

export function positionForRecord(transform, record = {}, yOffset = 0.04) {
  const p = missionPositionToWorld(transform, record);
  return new THREE.Vector3(p.x, p.y + yOffset, p.z);
}

export function agentColor(agentId, index = 0) {
  const palette = [0x63e6be, 0x54c7ec, 0xffd166, 0xff8fab, 0xb197fc, 0x91d85a];
  if (!agentId) return palette[index % palette.length];
  let hash = 0;
  for (const char of String(agentId)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function makeDisc(radius, color, opacity = 0.7) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: false })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function makeBoxCell(transform, record, { color = 0xffffff, opacity = 0.55, height = 0.035, yOffset = 0.035 } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(transform.cellSize * 0.86, Math.max(0.01, height), transform.cellSize * 0.86),
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false })
  );
  mesh.position.copy(positionForCell(transform, record.x, record.y, record.depthMeters ?? 0, yOffset));
  mesh.name = record.id ?? `${record.x}-${record.y}`;
  mesh.userData = { id: mesh.name, record };
  return mesh;
}

export function makeLine(points = [], { color = 0xffffff, opacity = 0.95 } = {}) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  return line;
}

export function setGroupVisible(group, visible) {
  if (group) group.visible = visible !== false;
}
