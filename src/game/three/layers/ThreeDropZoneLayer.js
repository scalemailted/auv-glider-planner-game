import * as THREE from 'three';
import { clearGroup, makeBoxCell, makeLine, positionForCell } from './ThreeMissionLayerUtils.js';

export function updateThreeDropZoneLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  if (!group || !transform) return group;
  for (const zone of viewModel.dropZones ?? []) {
    if (zone.visible === false) continue;
    const baseColor = colorForZone(zone);
    for (const cell of zone.cells ?? []) {
      const selected = zone.selectedCell && zone.selectedCell.x === cell.x && zone.selectedCell.y === cell.y;
      const mesh = makeBoxCell(transform, { ...cell, id: zone.id + '-' + cell.x + '-' + cell.y }, {
        color: selected ? 0x63e6be : baseColor,
        opacity: selected ? 0.78 : zone.status === 'unavailable' ? 0.12 : 0.24,
        height: selected ? 0.07 : 0.025,
        yOffset: selected ? 0.18 : 0.11
      });
      mesh.renderOrder = selected ? 660 : 640;
      mesh.material.polygonOffset = true;
      mesh.material.polygonOffsetFactor = -3;
      mesh.material.polygonOffsetUnits = -3;
      mesh.userData = {
        missionObjectType: selected ? 'selectedStart' : 'dropZone',
        missionObjectId: selected ? zone.id + '-selected-start-' + (zone.selectedAgentId ?? 'agent') : zone.id,
        id: selected ? zone.id + '-selected-start-' + (zone.selectedAgentId ?? 'agent') : zone.id,
        zoneId: zone.id,
        status: selected ? 'selected' : zone.status,
        cell,
        gridCell: { x: cell.x, y: cell.y },
        agentIds: zone.agentIds ?? [],
        allowedAgentIds: zone.allowedAgentIds ?? [],
        selectedAgentId: zone.selectedAgentId ?? null
      };
      group.add(mesh);
    }
    const outline = boundaryLine(transform, zone, baseColor);
    if (outline) group.add(outline);
    if (zone.selectedCell) group.add(selectedStartMarker(transform, zone));
  }
  return group;
}

function colorForZone(zone = {}) {
  if (zone.status === 'invalid' || zone.valid === false) return 0xff4e5a;
  if (zone.status === 'selected') return 0x63e6be;
  if (zone.status === 'occupied') return 0xffd166;
  if (zone.status === 'unavailable') return 0x8aa0b8;
  return 0x54c7ec;
}

function boundaryLine(transform, zone, color) {
  const boundary = zone.boundary ?? [];
  if (boundary.length < 2) return null;
  const points = [...boundary, boundary[0]].map((point) => positionForCell(transform, point.x - 0.5, point.y - 0.5, 0, 0.24));
  const line = makeLine(points, { color, opacity: 0.84 });
  line.name = zone.id + '-drop-zone-boundary';
  line.renderOrder = 680;
  line.userData = { missionObjectType: 'dropZoneBoundary', missionObjectId: zone.id + '-boundary', zoneId: zone.id, semantic: 'drop-zone boundary' };
  return line;
}

function selectedStartMarker(transform, zone) {
  const cell = zone.selectedCell;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(transform.cellSize * 0.32, transform.cellSize * 0.028, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(positionForCell(transform, cell.x, cell.y, 0, 0.31));
  ring.name = zone.id + '-selected-start-ring';
  ring.renderOrder = 700;
  ring.userData = { missionObjectType: 'selectedStart', missionObjectId: zone.id + '-selected-start-ring', zoneId: zone.id, selectedAgentId: zone.selectedAgentId ?? null, gridCell: { x: cell.x, y: cell.y } };
  return ring;
}
