import * as THREE from 'three';
import { clearGroup, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeCurrentVectorLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  const vectors = vectorsForViewModel(viewModel);
  for (const vector of vectors) {
    const start = positionForRecord(transform, vector, 0.3);
    const scale = transform.cellSize * 0.52;
    const end = new THREE.Vector3(start.x + Number(vector.u ?? 0) * scale, start.y + Number(vector.w ?? 0) * scale * 0.45, start.z + Number(vector.v ?? 0) * scale);
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const color = Number(vector.magnitude ?? 0) >= 1.1 ? 0xfff0a3 : vector.depthLayerId === 'deep' ? 0xd0bfff : 0xbef6ff;
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.82 }));
    line.name = vector.id;
    line.userData = { id: vector.id, magnitude: vector.magnitude, timeSeconds: vector.timeSeconds, depthLayerId: vector.depthLayerId ?? null, w: vector.w ?? 0 };
    group.add(line);
    const head = new THREE.Mesh(new THREE.ConeGeometry(transform.cellSize * 0.055, transform.cellSize * 0.16, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 }));
    head.position.copy(end);
    head.rotation.x = Math.PI / 2;
    head.rotation.z = -Math.atan2(Number(vector.v ?? 0), Number(vector.u ?? 0)) - Math.PI / 2;
    head.name = `${vector.id}-head`;
    head.userData = { id: head.name, parentVectorId: vector.id, depthLayerId: vector.depthLayerId ?? null };
    group.add(head);
  }
  group.userData = {
    currentVectorObjectCount: group.children.length,
    vectorCount: vectors.length,
    activeDepthLayerId: viewModel.activeDepthLayerId ?? null,
    activeLayerOnly: viewModel.visibility?.activeLayerOnlyCurrents !== false,
    ownsSimulationState: false,
    ownsPlanning: false,
    ownsScoring: false
  };
  return group;
}

function vectorsForViewModel(viewModel = {}) {
  const layerCurrents = viewModel.layerCurrents ?? null;
  if (!layerCurrents) return viewModel.vectorFieldLayer?.vectors ?? [];
  const activeOnly = viewModel.visibility?.activeLayerOnlyCurrents !== false;
  const layers = activeOnly
    ? [viewModel.activeDepthLayerId ?? Object.keys(layerCurrents)[0]]
    : (viewModel.depthLayers ?? []).filter((layer) => layer.visible !== false && layer.interactive !== false).map((layer) => layer.id);
  const depthByLayer = Object.fromEntries((viewModel.depthLayers ?? []).map((layer) => [layer.id, layer.representativeDepthMeters]));
  return layers.flatMap((layerId) => (layerCurrents[layerId]?.vectors ?? []).map((vector) => ({
    ...vector,
    depthLayerId: layerId,
    depthMeters: depthByLayer[layerId] ?? vector.depthMeters ?? 0
  })));
}
