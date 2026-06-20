import * as THREE from 'three';
import { gridCellDepthToWorld } from '../../../core/rendering/VolumetricMissionCoordinates.js';
import { disposeObject } from './ThreeMissionLayerUtils.js';

export const THREE_SAMPLING_TARGET_LAYER_VERSION = 'three-sampling-target-layer-r1-2a-4-1';

export function updateThreeSamplingTargetLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  if (!transform) return group;
  const objects = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const seen = new Set();
  for (const target of viewModel.scienceTargets ?? []) {
    if (target.visible === false) continue;
    const id = target.targetId ?? target.id;
    if (!id) continue;
    seen.add(id);
    const selected = target.selected === true || viewModel.selection?.selectedScienceTargetId === id;
    const attached = (target.attachedSegmentIds ?? []).length > 0;
    const status = target.coverageStatus ?? target.targetCoverageStatus ?? null;
    let container = objects.get(id);
    const styleKey = styleForTarget(target, { selected, attached, status }).key;
    if (!container || container.userData.styleKey !== styleKey) {
      if (container) {
        group.remove(container);
        disposeObject(container);
      }
      container = buildTargetObject(target, viewModel, { selected, attached, status, styleKey });
      objects.set(id, container);
      group.add(container);
    }
    updateTargetObject(container, target, viewModel, { selected, attached, status, styleKey });
  }
  for (const [id, object] of objects.entries()) {
    if (!seen.has(id)) {
      group.remove(object);
      disposeObject(object);
      objects.delete(id);
    }
  }
  group.userData.objects = objects;
  group.userData.summary = threeSamplingTargetLayerSummary(group);
  return group;
}

export function clearThreeSamplingTargetLayer(group) {
  if (!group) return;
  for (const object of group.children ?? []) disposeObject(object);
  group.clear?.();
  group.userData.objects = new Map();
  group.userData.summary = threeSamplingTargetLayerSummary(group);
}

export function threeSamplingTargetLayerSummary(group = {}) {
  const objects = group.userData?.objects instanceof Map ? [...group.userData.objects.values()] : group.children ?? [];
  return {
    type: 'anchor.three.sampling-target-layer-summary',
    version: THREE_SAMPLING_TARGET_LAYER_VERSION,
    targetObjectCount: objects.length,
    attachedTargetObjectCount: objects.filter((object) => object.userData?.attached === true).length,
    selectedTargetObjectCount: objects.filter((object) => object.userData?.selected === true).length,
    ownsPlanning: false,
    ownsPrediction: false,
    ownsSimulationState: false,
    ownsScoring: false
  };
}

function buildTargetObject(target, viewModel, options) {
  const root = new THREE.Group();
  const style = styleForTarget(target, options);
  const radius = Math.max(0.12, Number(viewModel.coordinateSystem?.cellSize ?? 1) * (options.selected ? 0.34 : 0.26));
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * 0.08, 8, 36),
    new THREE.MeshBasicMaterial({ color: style.color, transparent: true, opacity: style.opacity, depthWrite: false, depthTest: false })
  );
  ring.name = `${target.id}:ring`;
  ring.rotation.x = Math.PI / 2;
  root.add(ring);

  const depthLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0.01, 0)]),
    new THREE.LineBasicMaterial({ color: style.color, transparent: true, opacity: 0.72, depthWrite: false, depthTest: false })
  );
  depthLine.name = `${target.id}:stem`;
  root.add(depthLine);

  if (['sphere', 'ellipsoid', 'volumeRegion'].includes(target.geometryType)) {
    const volume = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.25, 16, 8),
      new THREE.MeshBasicMaterial({ color: style.color, transparent: true, opacity: 0.16, wireframe: true, depthWrite: false, depthTest: false })
    );
    volume.name = `${target.id}:volume`;
    const vertical = Math.max(0.35, Number(target.verticalRadius ?? 8) / 35);
    volume.scale.set(Math.max(1, Number(target.horizontalRadius ?? 1)), vertical, Math.max(1, Number(target.horizontalRadius ?? 1)));
    root.add(volume);
  }

  root.renderOrder = 70;
  root.userData.styleKey = options.styleKey ?? style.key;
  return root;
}

function updateTargetObject(root, target, viewModel, options) {
  const id = target.targetId ?? target.id;
  const world = worldPointForTarget(target, viewModel);
  root.position.set(world.x, world.y + 0.1, world.z);
  const surface = gridCellDepthToWorld({
    col: target.x ?? target.position?.x,
    row: target.y ?? target.position?.y,
    depthMeters: 0,
    coordinateModel: viewModel.coordinateModel,
    transform: viewModel.coordinateSystem,
    verticalDisplayMode: viewModel.verticalDisplayMode
  });
  const stem = root.children.find((child) => child.name.endsWith(':stem'));
  if (stem?.geometry?.attributes?.position) {
    const p = stem.geometry.attributes.position;
    p.setXYZ(0, 0, 0, 0);
    p.setXYZ(1, 0, surface.y - world.y, 0);
    p.needsUpdate = true;
    stem.geometry.computeBoundingSphere?.();
  }
  root.userData = {
    id,
    targetId: id,
    missionObjectType: 'samplingTarget',
    missionObjectId: id,
    geometryType: target.geometryType,
    depthLayerId: target.depthLayerId ?? null,
    depthMeters: Number(target.depthMeters ?? target.position?.depthMeters ?? 0),
    attachedSegmentIds: [...(target.attachedSegmentIds ?? [])],
    attached: options.attached === true,
    selected: options.selected === true,
    gridCell: { x: Math.round(Number(target.x ?? target.position?.x ?? 0)), y: Math.round(Number(target.y ?? target.position?.y ?? 0)) },
    executable: false,
    navigationAuthority: false,
    scoreAuthority: false,
    ownsPlanning: false,
    ownsPrediction: false,
    ownsSimulationState: false,
    ownsScoring: false,
    rendererOwnsState: false,
    styleKey: options.styleKey
  };
}

function worldPointForTarget(target, viewModel) {
  return gridCellDepthToWorld({
    col: target.x ?? target.position?.x,
    row: target.y ?? target.position?.y,
    depthMeters: target.depthMeters ?? target.position?.depthMeters ?? 0,
    coordinateModel: { ...(viewModel.coordinateModel ?? {}), layerId: target.depthLayerId ?? null },
    transform: viewModel.coordinateSystem,
    verticalDisplayMode: viewModel.verticalDisplayMode
  });
}

function styleForTarget(target, { selected = false, attached = false, status = null } = {}) {
  const warning = status === 'UNREACHABLE' || (target.warningCodes ?? []).includes('TARGET_DEPTH_BEYOND_ACHIEVABLE');
  const color = warning ? 0xff6b6b : selected ? 0xffffff : attached ? 0x63e6be : 0xb197fc;
  const opacity = selected ? 1 : attached ? 0.9 : 0.62;
  return { color, opacity, key: `${target.geometryType}:${color}:${opacity}:${attached}:${selected}:${warning}` };
}