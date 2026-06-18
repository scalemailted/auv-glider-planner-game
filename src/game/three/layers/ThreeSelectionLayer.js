import * as THREE from 'three';
import { clearGroup, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeSelectionLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  const selectedGlider = (viewModel.gliders ?? []).find((glider) => glider.selected);
  const selectedWaypoint = (viewModel.waypoints ?? []).find((waypoint) => waypoint.selected);
  for (const record of [selectedGlider, selectedWaypoint].filter(Boolean)) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(transform.cellSize * 0.34, transform.cellSize * 0.025, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(positionForRecord(transform, record, 0.36));
    ring.name = `selection-${record.agentId ?? record.waypointId}`;
    ring.userData = { id: ring.name, selectedRecord: record.agentId ?? record.waypointId };
    group.add(ring);
  }
  return group;
}

export function updateThreeGuidanceLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  const path = viewModel.guidance?.previewPath ?? [];
  if (!path.length) return group;
  const points = path.map((point) => positionForRecord(transform, point, 0.2));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42 }));
  line.name = 'guidance-preview-path';
  line.userData = { id: line.name, ownsPlanning: false };
  group.add(line);
  return group;
}

