import * as THREE from 'three';
import { clearGroup, disposeObject, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeSurfacingEventLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  const events = [...(viewModel.surfacingEvents ?? []), ...(viewModel.communicationEvents ?? [])];
  const existing = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const counters = group.userData.counters ?? { surfacingObjectCreateCount: 0, surfacingObjectReuseCount: 0, duplicateSurfacingObjectCount: 0 };
  const seen = new Set();
  for (const [index, event] of events.entries()) {
    const id = event.id ?? `surfacing-${index}`;
    if (seen.has(id)) counters.duplicateSurfacingObjectCount += 1;
    seen.add(id);
    let marker = existing.get(id);
    if (!marker) {
      marker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.035, 24),
        new THREE.MeshBasicMaterial({ color: /comm|upload|transmit/i.test(event.type ?? '') ? 0x63e6be : 0x9ee7ff, transparent: true, opacity: 0.72 })
      );
      marker.name = id;
      group.add(marker);
      existing.set(id, marker);
      counters.surfacingObjectCreateCount += 1;
    } else {
      counters.surfacingObjectReuseCount += 1;
    }
    marker.position.copy(positionForRecord(transform, event, 0.5));
    marker.userData = { id, event, missionObjectType: 'surfacingEvent', missionObjectId: id, surfacingEventId: id, agentId: event.agentId ?? null, gridCell: { x: event.x, y: event.y }, sourceVisibility: event.sourceVisibility ?? 'publicResult' };
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
  group.userData.surfacingObjectCreateCount = counters.surfacingObjectCreateCount;
  group.userData.surfacingObjectReuseCount = counters.surfacingObjectReuseCount;
  group.userData.duplicateSurfacingObjectCount = counters.duplicateSurfacingObjectCount;
  return group;
}

export function clearThreeSurfacingEventLayer(group) {
  clearGroup(group);
  if (group?.userData) {
    group.userData.objects = new Map();
    group.userData.counters = { surfacingObjectCreateCount: 0, surfacingObjectReuseCount: 0, duplicateSurfacingObjectCount: 0 };
    group.userData.surfacingObjectCreateCount = 0;
    group.userData.surfacingObjectReuseCount = 0;
    group.userData.duplicateSurfacingObjectCount = 0;
  }
}
