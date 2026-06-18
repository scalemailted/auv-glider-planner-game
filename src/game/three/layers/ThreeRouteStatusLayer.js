import * as THREE from 'three';
import { clearGroup, disposeObject, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeRouteStatusLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  const events = [...(viewModel.routeFailures ?? []), ...(viewModel.missedWaypoints ?? [])];
  const existing = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const seen = new Set();
  for (const [index, event] of events.entries()) {
    const id = event.id ?? `route-status-${index}`;
    seen.add(id);
    let marker = existing.get(id);
    if (!marker) {
      marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.07, 0.34),
        new THREE.MeshBasicMaterial({ color: colorForEvent(event), transparent: true, opacity: 0.76 })
      );
      marker.name = id;
      group.add(marker);
      existing.set(id, marker);
    }
    marker.position.copy(positionForRecord(transform, event, 0.46));
    marker.material.color.setHex(colorForEvent(event));
    marker.userData = { id, event, missionObjectType: 'routeStatus', sourceVisibility: 'publicResult' };
  }
  for (const [id, object] of existing.entries()) {
    if (!seen.has(id)) {
      group.remove(object);
      disposeObject(object);
      existing.delete(id);
    }
  }
  group.userData.objects = existing;
  return group;
}

export function clearThreeRouteStatusLayer(group) {
  clearGroup(group);
  if (group?.userData) group.userData.objects = new Map();
}

function colorForEvent(event = {}) {
  if (/hazard/i.test(event.type ?? '')) return 0xff8fab;
  if (/missed|blocked|failure/i.test(event.type ?? '')) return 0xff6b6b;
  return 0xffd166;
}
