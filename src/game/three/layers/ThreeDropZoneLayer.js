import { clearGroup, agentColor, makeBoxCell } from './ThreeMissionLayerUtils.js';

export function updateThreeDropZoneLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const zone of viewModel.dropZones ?? []) {
    const color = zone.valid === false ? 0xff4e5a : 0x54c7ec;
    for (const cell of zone.cells ?? []) {
      const mesh = makeBoxCell(transform, { ...cell, id: `${zone.id}-${cell.x}-${cell.y}` }, { color, opacity: zone.selected ? 0.38 : 0.22, height: 0.025, yOffset: 0.075 });
      mesh.userData = { missionObjectType: 'dropZone', missionObjectId: zone.id, id: zone.id, zoneId: zone.id, cell, gridCell: { x: cell.x, y: cell.y }, allowedAgentIds: zone.allowedAgentIds ?? [] };
      group.add(mesh);
    }
    if (zone.selectedStart) {
      const mesh = makeBoxCell(transform, { ...zone.selectedStart, id: `${zone.id}-selected-start` }, { color: 0x63e6be, opacity: 0.92, height: 0.08, yOffset: 0.13 });
      mesh.userData = { missionObjectType: 'selectedStart', missionObjectId: mesh.name, id: mesh.name, selectedStart: zone.selectedStart, gridCell: { x: zone.selectedStart.x, y: zone.selectedStart.y } };
      group.add(mesh);
    }
  }
  return group;
}


