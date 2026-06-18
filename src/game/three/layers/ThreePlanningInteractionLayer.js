import * as THREE from 'three';
import { clearGroup, makeLine, positionForCell, positionForRecord } from './ThreeMissionLayerUtils.js';

export function createThreePlanningInteractionLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'mission-planning-interaction-layer';
  group.userData = { missionObjectType: 'interactionOverlay', ownsPlanning: false };
  return { group, visible: true };
}

export function updateThreePlanningInteractionLayer(layerOrGroup, interactionViewModel = {}, options = {}) {
  const group = layerOrGroup?.group ?? layerOrGroup;
  if (!group) return layerOrGroup;
  clearGroup(group);
  const transform = options.transform ?? options.viewModel?.coordinateSystem;
  if (!transform) return layerOrGroup;
  const cell = interactionViewModel.hoveredCell;
  if (cell) group.add(cellRing(transform, cell, colorForPlacement(interactionViewModel), 0.84, 'hovered-grid-cell', interactionViewModel.placementValid === false ? 'blocked placement' : 'hovered cell'));
  const preview = interactionViewModel.routePreview;
  if (preview?.from && preview?.to) {
    const line = makeLine([positionForCell(transform, preview.from.x, preview.from.y, 0, 0.42), positionForCell(transform, preview.to.x, preview.to.y, 0, 0.42)], {
      color: preview.valid === false ? 0xff4e5a : 0x63e6be,
      opacity: 0.78
    });
    line.name = 'three-route-preview-segment';
    line.userData = { missionObjectType: 'routePreview', semantic: preview.valid === false ? 'blocked preview' : 'valid preview', ownsPlanning: false };
    group.add(line);
  }
  const drag = interactionViewModel.dragPreview;
  if (drag?.active && drag.gridCell) {
    const ghost = cellRing(transform, drag.gridCell, drag.valid === false ? 0xff4e5a : 0xffffff, 0.62, 'waypoint-drag-ghost', 'drag ghost');
    ghost.scale.setScalar(1.18);
    group.add(ghost);
  }
  const selected = interactionViewModel.selectedEntity;
  if (selected?.gridCell && selected.objectType === 'waypoint') {
    group.add(cellRing(transform, selected.gridCell, 0xffffff, 0.92, 'selected-waypoint-outline', 'selected waypoint'));
  }
  if (interactionViewModel.guidanceCone?.polygon?.length) {
    const points = [...interactionViewModel.guidanceCone.polygon, interactionViewModel.guidanceCone.polygon[0]].map((point) => positionForRecord(transform, point, 0.33));
    const line = makeLine(points, { color: 0x54c7ec, opacity: 0.5 });
    line.name = 'canonical-guidance-cone-outline';
    line.userData = { missionObjectType: 'guidanceCone', ownsPlanning: false };
    group.add(line);
  }
  if (interactionViewModel.reachableRegion?.center) {
    const region = interactionViewModel.reachableRegion;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.1, Number(region.radiusX ?? 1)) * transform.cellSize, transform.cellSize * 0.018, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x9ee7ff, transparent: true, opacity: 0.36 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.scale.z = Math.max(0.1, Number(region.radiusY ?? region.radiusX ?? 1) / Math.max(0.1, Number(region.radiusX ?? 1)));
    ring.position.copy(positionForRecord(transform, region.center, 0.27));
    ring.name = 'canonical-reachable-region-outline';
    ring.userData = { missionObjectType: 'reachableRegion', ownsPlanning: false };
    group.add(ring);
  }
  return layerOrGroup;
}

export function setThreePlanningInteractionLayerVisibility(layerOrGroup, visible) {
  const group = layerOrGroup?.group ?? layerOrGroup;
  if (group) group.visible = visible !== false;
  if (layerOrGroup?.group) layerOrGroup.visible = visible !== false;
  return layerOrGroup;
}

export function disposeThreePlanningInteractionLayer(layerOrGroup) {
  const group = layerOrGroup?.group ?? layerOrGroup;
  clearGroup(group);
}

function cellRing(transform, cell, color, opacity, name, semantic) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(transform.cellSize * 0.42, transform.cellSize * 0.018, 8, 32),
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(positionForCell(transform, cell.x, cell.y, 0, 0.46));
  ring.name = name;
  ring.userData = { missionObjectType: 'interactionOverlay', gridCell: { x: cell.x, y: cell.y }, semantic, ownsPlanning: false };
  return ring;
}

function colorForPlacement(viewModel = {}) {
  if (viewModel.placementValid === false) return 0xff4e5a;
  if (viewModel.placementReason) return 0xffd166;
  return 0x63e6be;
}
