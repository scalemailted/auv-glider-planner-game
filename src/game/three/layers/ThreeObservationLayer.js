import * as THREE from 'three';
import { clearGroup, disposeObject, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeObservationLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  const existing = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const counters = group.userData.counters ?? { observationObjectCreateCount: 0, observationObjectReuseCount: 0, duplicateObservationObjectCount: 0 };
  const seen = new Set();
  for (const [index, observation] of (viewModel.observations ?? []).entries()) {
    const id = observation.id ?? `observation-${index}`;
    if (seen.has(id)) counters.duplicateObservationObjectCount += 1;
    seen.add(id);
    let marker = existing.get(id);
    if (!marker) {
      marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 14, 10),
        new THREE.MeshBasicMaterial({ color: colorForStatus(observation.status), transparent: true, opacity: 0.88 })
      );
      marker.name = id;
      group.add(marker);
      existing.set(id, marker);
      counters.observationObjectCreateCount += 1;
    } else {
      counters.observationObjectReuseCount += 1;
    }
    marker.position.copy(positionForRecord(transform, observation, 0.38));
    marker.material.color.setHex(colorForStatus(observation.status));
    marker.userData = { id, observation, missionObjectType: 'observation', missionObjectId: id, observationId: id, agentId: observation.agentId ?? null, gridCell: { x: observation.x, y: observation.y }, sourceVisibility: observation.sourceVisibility ?? 'publicResult' };
  }
  for (const [id, object] of existing.entries()) {
    if (!seen.has(id)) {
      group.remove(object);
      disposeObject(object);
      existing.delete(id);
    }
  }
  group.userData.objects = existing;
  group.userData.counters = counters;
  group.userData.observationObjectCreateCount = counters.observationObjectCreateCount;
  group.userData.observationObjectReuseCount = counters.observationObjectReuseCount;
  group.userData.duplicateObservationObjectCount = counters.duplicateObservationObjectCount;
  return group;
}

export function clearThreeObservationLayer(group) {
  clearGroup(group);
  if (group?.userData) {
    group.userData.objects = new Map();
    group.userData.counters = { observationObjectCreateCount: 0, observationObjectReuseCount: 0, duplicateObservationObjectCount: 0 };
    group.userData.observationObjectCreateCount = 0;
    group.userData.observationObjectReuseCount = 0;
    group.userData.duplicateObservationObjectCount = 0;
  }
}

function colorForStatus(status) {
  if (/pending/i.test(status ?? '')) return 0xffd166;
  if (/invalid|reject/i.test(status ?? '')) return 0xff6b6b;
  if (/transmit|upload/i.test(status ?? '')) return 0x63e6be;
  return 0xffffff;
}
