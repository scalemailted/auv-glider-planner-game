import * as THREE from 'three';
import { clearGroup, makeLine, positionForCell, positionForRecord } from './ThreeMissionLayerUtils.js';
import { planningGuidePreviewSummary } from '../../../core/rendering/PlanningGuidePreviewViewModel.js';

export const THREE_PLANNING_INTERACTION_LAYER_VERSION = 'three-planning-interaction-layer-world-r1-1';

export function createThreePlanningInteractionLayer(options = {}) {
  const group = new THREE.Group();
  group.name = options.name ?? 'mission-planning-interaction-layer';
  group.userData = { missionObjectType: 'interactionOverlay', ownsPlanning: false };
  const overlayGroup = new THREE.Group();
  overlayGroup.name = 'mission-planning-transient-overlay-group';
  const previewGroup = new THREE.Group();
  previewGroup.name = 'mission-planning-route-preview-group';
  group.add(overlayGroup, previewGroup);
  const layer = {
    group,
    overlayGroup,
    previewGroup,
    previewLine: null,
    visible: true,
    objectCreateCount: 0,
    objectReuseCount: 0,
    objectDisposeCount: 0,
    previewSegmentCount: 0,
    stalePreviewCount: 0,
    maximumSimultaneousPreviewSegments: 0,
    lastPreviewDigest: null,
    disposed: false
  };
  publishPlanningGuideDebug(layer, null);
  return layer;
}

export function updateThreePlanningInteractionLayer(layerOrGroup, interactionViewModel = {}, options = {}) {
  const layer = normalizeLayer(layerOrGroup);
  const group = layer.group;
  if (!group) return layerOrGroup;
  const transform = options.transform ?? options.viewModel?.coordinateSystem;
  if (!transform) return layerOrGroup;
  clearGroup(layer.overlayGroup);
  const cell = interactionViewModel.hoveredCell;
  if (cell) layer.overlayGroup.add(cellRing(transform, cell, colorForPlacement(interactionViewModel), 0.84, 'hovered-grid-cell', interactionViewModel.placementValid === false ? 'blocked placement' : 'hovered cell'));
  updatePreviewSegment(layer, interactionViewModel.routePreview, transform);
  const drag = interactionViewModel.dragPreview;
  if (drag?.active && drag.gridCell) {
    const ghost = cellRing(transform, drag.gridCell, drag.valid === false ? 0xff4e5a : 0xffffff, 0.62, 'waypoint-drag-ghost', 'drag ghost');
    ghost.scale.setScalar(1.18);
    layer.overlayGroup.add(ghost);
  }
  const selected = interactionViewModel.selectedEntity;
  if (selected?.gridCell && selected.objectType === 'waypoint') {
    layer.overlayGroup.add(cellRing(transform, selected.gridCell, 0xffffff, 0.92, 'selected-waypoint-outline', 'selected waypoint'));
  }
  if (interactionViewModel.guidanceCone?.polygon?.length) {
    const points = [...interactionViewModel.guidanceCone.polygon, interactionViewModel.guidanceCone.polygon[0]].map((point) => positionForRecord(transform, point, 0.33));
    const line = makeLine(points, { color: 0x54c7ec, opacity: 0.5 });
    line.name = 'canonical-guidance-cone-outline';
    line.userData = { missionObjectType: 'guidanceCone', ownsPlanning: false };
    layer.overlayGroup.add(line);
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
    layer.overlayGroup.add(ring);
  }
  publishPlanningGuideDebug(layer, interactionViewModel.routePreview ?? null);
  return layerOrGroup;
}

export function setThreePlanningInteractionLayerVisibility(layerOrGroup, visible) {
  const group = layerOrGroup?.group ?? layerOrGroup;
  if (group) group.visible = visible !== false;
  if (layerOrGroup?.group) layerOrGroup.visible = visible !== false;
  return layerOrGroup;
}

export function disposeThreePlanningInteractionLayer(layerOrGroup) {
  const layer = normalizeLayer(layerOrGroup);
  if (layer.previewLine) {
    layer.objectDisposeCount = Number(layer.objectDisposeCount ?? 0) + 1;
    layer.previewLine = null;
  }
  clearGroup(layer.previewGroup);
  clearGroup(layer.overlayGroup);
  layer.previewSegmentCount = 0;
  layer.disposed = true;
  publishPlanningGuideDebug(layer, null);
}

export function threePlanningInteractionLayerSummary(layerOrGroup = {}, preview = null) {
  const layer = normalizeLayer(layerOrGroup);
  const visiblePreviewSegments = countVisiblePreviewSegments(layer.previewGroup);
  return {
    type: 'anchor.renderer.three-planning-interaction-layer-summary',
    version: THREE_PLANNING_INTERACTION_LAYER_VERSION,
    active: visiblePreviewSegments > 0,
    previewDigest: layer.lastPreviewDigest ?? preview?.digest ?? null,
    previewSegmentCount: visiblePreviewSegments,
    objectCreateCount: Number(layer.objectCreateCount ?? 0),
    objectReuseCount: Number(layer.objectReuseCount ?? 0),
    objectDisposeCount: Number(layer.objectDisposeCount ?? 0),
    stalePreviewCount: Number(layer.stalePreviewCount ?? 0),
    maximumSimultaneousPreviewSegments: Number(layer.maximumSimultaneousPreviewSegments ?? 0),
    previewOwnsPlan: false,
    previewIsExported: false,
    disposed: layer.disposed === true,
    preview: planningGuidePreviewSummary(preview)
  };
}

function normalizeLayer(layerOrGroup = {}) {
  if (layerOrGroup?.group) return layerOrGroup;
  layerOrGroup.overlayGroup ??= layerOrGroup;
  layerOrGroup.previewGroup ??= layerOrGroup;
  return layerOrGroup;
}

function updatePreviewSegment(layer, preview, transform) {
  const active = preview?.active === true && preview?.originPoint && preview?.candidatePoint;
  if (!active) {
    if (layer.previewLine) layer.previewLine.visible = false;
    layer.previewSegmentCount = 0;
    layer.lastPreviewDigest = null;
    return;
  }
  const start = positionForRecord(transform, preview.originPoint, 0.42);
  const end = positionForRecord(transform, preview.candidatePoint, 0.42);
  const color = preview.valid === false || preview.validationStatus === 'INVALID' ? 0xff4e5a : 0x63e6be;
  if (!layer.previewLine) {
    layer.previewLine = makeLine([start, end], { color, opacity: 0.78 });
    layer.previewLine.name = 'three-route-preview-segment';
    layer.previewLine.userData = { missionObjectType: 'routePreview', semantic: 'candidate waypoint preview', ownsPlanning: false, previewOwnsPlan: false, previewIsExported: false };
    layer.previewGroup.add(layer.previewLine);
    layer.objectCreateCount = Number(layer.objectCreateCount ?? 0) + 1;
  } else {
    replaceLineGeometry(layer.previewLine, [start, end], color, 0.78);
    layer.previewLine.visible = true;
    layer.objectReuseCount = Number(layer.objectReuseCount ?? 0) + 1;
  }
  layer.previewLine.userData.previewDigest = preview.digest ?? null;
  layer.previewLine.userData.selectedAgentId = preview.selectedAgentId ?? null;
  layer.previewLine.userData.originType = preview.originType ?? null;
  layer.previewLine.userData.originId = preview.originId ?? null;
  layer.previewLine.userData.validationStatus = preview.validationStatus ?? null;
  layer.lastPreviewDigest = preview.digest ?? null;
  layer.previewSegmentCount = 1;
  const visibleCount = countVisiblePreviewSegments(layer.previewGroup);
  layer.stalePreviewCount = Math.max(0, visibleCount - 1);
  layer.maximumSimultaneousPreviewSegments = Math.max(Number(layer.maximumSimultaneousPreviewSegments ?? 0), visibleCount);
}

function replaceLineGeometry(line, points, color, opacity) {
  line.geometry?.dispose?.();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  line.material.color.setHex(color);
  line.material.transparent = opacity < 1;
  line.material.opacity = opacity;
  line.material.needsUpdate = true;
}

function countVisiblePreviewSegments(group) {
  return (group?.children ?? []).filter((child) => child.visible !== false && child.userData?.missionObjectType === 'routePreview').length;
}

function publishPlanningGuideDebug(layer, preview) {
  const summary = threePlanningInteractionLayerSummary(layer, preview);
  globalThis.ANCHOR_PLANNING_GUIDE_DEBUG = {
    version: THREE_PLANNING_INTERACTION_LAYER_VERSION,
    active: summary.active,
    selectedAgentId: preview?.selectedAgentId ?? null,
    originType: preview?.originType ?? null,
    originId: preview?.originId ?? null,
    previewDigest: summary.previewDigest,
    previewSegmentCount: summary.previewSegmentCount,
    objectCreateCount: summary.objectCreateCount,
    objectReuseCount: summary.objectReuseCount,
    objectDisposeCount: summary.objectDisposeCount,
    stalePreviewCount: summary.stalePreviewCount,
    maximumSimultaneousPreviewSegments: summary.maximumSimultaneousPreviewSegments,
    previewOwnsPlan: false,
    previewIsExported: false,
    failures: summary.stalePreviewCount > 0 ? ['stalePreviewSegmentsPresent'] : []
  };
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
