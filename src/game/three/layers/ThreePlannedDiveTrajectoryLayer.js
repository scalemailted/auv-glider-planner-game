import * as THREE from 'three';
import { gridCellDepthToWorld } from '../../../core/rendering/VolumetricMissionCoordinates.js';
import { disposeObject, agentColor } from './ThreeMissionLayerUtils.js';

export const THREE_PLANNED_DIVE_TRAJECTORY_LAYER_VERSION = 'three-planned-dive-trajectory-layer-r1-2a-4';

export function updateThreePlannedDiveTrajectoryLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  const coordinateModel = viewModel.coordinateModel;
  if (!transform) return group;
  const objects = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const seen = new Set();
  for (const [segmentIndex, segment] of (viewModel.plannedDiveSegments ?? []).entries()) {
    const color = agentColor(segment.agentId, segmentIndex);
    upsertLine(group, objects, seen, `${segment.segmentId}:surface-intent`, segment.surfaceIntentPath, viewModel, {
      color,
      opacity: 0.48,
      dashed: true,
      yOffset: 0.34,
      objectType: 'surfaceIntentRoute',
      segment,
      renderRole: 'surfaceIntent'
    });
    upsertLine(group, objects, seen, `${segment.segmentId}:predicted-dive`, segment.predictedDivePath, viewModel, {
      color: 0xfff0a3,
      opacity: 0.96,
      yOffset: 0.04,
      objectType: 'predictedDiveTrajectory',
      segment,
      renderRole: 'predictedDive'
    });
    if ((segment.predictedCurrentCorrectedPath ?? []).length >= 2) {
      upsertLine(group, objects, seen, `${segment.segmentId}:current-corrected`, segment.predictedCurrentCorrectedPath, viewModel, {
        color: 0x63e6be,
        opacity: 0.98,
        yOffset: 0.08,
        objectType: 'expectedCurrentDiveTrajectory',
        segment,
        renderRole: 'currentCorrectedPrediction'
      });
      upsertLine(group, objects, seen, `${segment.segmentId}:surfacing-offset`, [segment.targetSurfacePosition, segment.predictedSurfacingPosition], viewModel, {
        color: 0x63e6be,
        opacity: 0.58,
        dashed: true,
        yOffset: 0.18,
        objectType: 'predictedSurfacingOffset',
        segment,
        renderRole: 'surfacingOffset'
      });
    }
    for (const [index, point] of (segment.bottomTurns ?? []).entries()) {
      upsertMarker(group, objects, seen, `${segment.segmentId}:bottom-turn:${index}`, point, viewModel, {
        color: 0xffd166,
        shape: 'diamond',
        scale: 0.16,
        objectType: 'predictedBottomTurn',
        segment,
        renderRole: 'bottomTurn'
      });
    }
    for (const [index, point] of (segment.layerCrossings ?? []).entries()) {
      upsertMarker(group, objects, seen, `${segment.segmentId}:layer-crossing:${index}`, point, viewModel, {
        color: 0xb197fc,
        shape: 'sphere',
        scale: 0.09,
        objectType: 'predictedLayerCrossing',
        segment,
        renderRole: 'layerCrossing'
      });
    }
    for (const [index, point] of (segment.predictedSamples ?? []).entries()) {
      upsertMarker(group, objects, seen, `${segment.segmentId}:expected-sample:${index}`, point, viewModel, {
        color: 0xffffff,
        shape: 'ring',
        scale: 0.11,
        objectType: 'predictedSample',
        segment,
        renderRole: 'predictedSample'
      });
    }
    if (segment.predictedSurfacingPosition) {
      upsertMarker(group, objects, seen, `${segment.segmentId}:predicted-surfacing`, segment.predictedSurfacingPosition, viewModel, {
        color: 0x63e6be,
        shape: 'ring',
        scale: 0.18,
        objectType: 'predictedSurfacingPoint',
        segment,
        renderRole: 'predictedSurfacing'
      });
    }
  }
  for (const [id, object] of objects.entries()) {
    if (!seen.has(id)) {
      group.remove(object);
      disposeObject(object);
      objects.delete(id);
    }
  }
  group.userData.objects = objects;
  group.userData.summary = threePlannedDiveTrajectoryLayerSummary(group);
  return group;
}

export function clearThreePlannedDiveTrajectoryLayer(group) {
  if (!group) return;
  for (const object of group.children ?? []) disposeObject(object);
  group.clear?.();
  group.userData.objects = new Map();
}

export function threePlannedDiveTrajectoryLayerSummary(group = {}) {
  const objects = group.userData?.objects instanceof Map ? [...group.userData.objects.values()] : group.children ?? [];
  return {
    type: 'anchor.three.planned-dive-trajectory-layer-summary',
    version: THREE_PLANNED_DIVE_TRAJECTORY_LAYER_VERSION,
    objectCount: objects.length,
    surfaceIntentObjectCount: objects.filter((object) => object.userData?.renderRole === 'surfaceIntent').length,
    predictedDiveObjectCount: objects.filter((object) => object.userData?.renderRole === 'predictedDive').length,
    currentCorrectedObjectCount: objects.filter((object) => object.userData?.renderRole === 'currentCorrectedPrediction').length,
    bottomTurnObjectCount: objects.filter((object) => object.userData?.renderRole === 'bottomTurn').length,
    layerCrossingObjectCount: objects.filter((object) => object.userData?.renderRole === 'layerCrossing').length,
    predictedSampleObjectCount: objects.filter((object) => object.userData?.renderRole === 'predictedSample').length,
    predictedSurfacingObjectCount: objects.filter((object) => object.userData?.renderRole === 'predictedSurfacing').length,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false
  };
}

function upsertLine(group, objects, seen, id, records = [], viewModel, options = {}) {
  const points = (records ?? []).filter(Boolean).map((record) => worldPoint(record, viewModel, options.yOffset ?? 0.04));
  if (points.length < 2) return;
  seen.add(id);
  let line = objects.get(id);
  const materialKey = `${options.color}:${options.opacity}:${options.dashed === true}`;
  if (!line) {
    line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial(options));
    line.name = id;
    group.add(line);
    objects.set(id, line);
  } else if (line.userData.pointCount !== points.length || line.userData.materialKey !== materialKey) {
    line.geometry?.dispose?.();
    line.material?.dispose?.();
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    line.material = lineMaterial(options);
  } else {
    const position = line.geometry?.attributes?.position;
    if (position && position.count === points.length) {
      points.forEach((point, index) => position.setXYZ(index, point.x, point.y, point.z));
      position.needsUpdate = true;
      line.geometry.computeBoundingSphere?.();
    }
  }
  if (options.dashed && line.computeLineDistances) line.computeLineDistances();
  line.renderOrder = options.renderRole === 'predictedDive' ? 62 : 58;
  line.userData = objectUserData(id, options, { pointCount: points.length, materialKey });
}

function upsertMarker(group, objects, seen, id, record = {}, viewModel, options = {}) {
  seen.add(id);
  let marker = objects.get(id);
  const shape = options.shape ?? 'sphere';
  if (!marker || marker.userData.shape !== shape) {
    if (marker) {
      group.remove(marker);
      disposeObject(marker);
      objects.delete(id);
    }
    marker = markerMesh(shape, options.color ?? 0xffffff, options.scale ?? 0.1);
    marker.name = id;
    group.add(marker);
    objects.set(id, marker);
  }
  marker.position.copy(worldPoint(record, viewModel, 0.1));
  marker.userData = objectUserData(id, options, { pointCount: 1, shape, depthMeters: record.depthMeters ?? null, depthLayerId: record.depthLayerId ?? null, createsScoreEvent: false });
}

function lineMaterial(options = {}) {
  if (options.dashed) {
    return new THREE.LineDashedMaterial({ color: options.color ?? 0xffffff, transparent: true, opacity: options.opacity ?? 0.72, dashSize: 0.42, gapSize: 0.24, depthWrite: false, depthTest: false });
  }
  return new THREE.LineBasicMaterial({ color: options.color ?? 0xffffff, transparent: true, opacity: options.opacity ?? 0.9, depthWrite: false, depthTest: false });
}

function markerMesh(shape, color, scale) {
  if (shape === 'ring') {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(scale, scale * 0.18, 8, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false })
    );
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }
  if (shape === 'diamond') {
    return new THREE.Mesh(
      new THREE.OctahedronGeometry(scale, 0),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false, depthTest: false })
    );
  }
  return new THREE.Mesh(
    new THREE.SphereGeometry(scale, 12, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.86, depthWrite: false, depthTest: false })
  );
}

function worldPoint(record = {}, viewModel = {}, yOffset = 0) {
  const model = viewModel.coordinateModel ?? { base: viewModel.coordinateSystem, verticalDisplayMode: viewModel.verticalDisplayMode };
  const point = gridCellDepthToWorld({
    col: record.x ?? record.col,
    row: record.y ?? record.row,
    depthMeters: record.depthMeters ?? 0,
    coordinateModel: { ...model, layerId: record.depthLayerId ?? record.depthLayer },
    transform: viewModel.coordinateSystem,
    verticalDisplayMode: viewModel.verticalDisplayMode
  });
  return new THREE.Vector3(point.x, point.y + yOffset, point.z);
}

function objectUserData(id, options, patch = {}) {
  const segment = options.segment ?? {};
  return {
    id,
    missionObjectType: options.objectType,
    missionObjectId: id,
    routeSegmentId: segment.segmentId ?? null,
    segmentId: segment.segmentId ?? null,
    agentId: segment.agentId ?? null,
    diveProfileId: segment.diveProfileId ?? null,
    targetDepthLayerId: segment.targetDepthLayerId ?? null,
    renderRole: options.renderRole ?? null,
    selected: segment.selected === true,
    warningCodes: segment.warningCodes ?? [],
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    usesArbitraryXYZWaypoints: false,
    ...patch
  };
}
