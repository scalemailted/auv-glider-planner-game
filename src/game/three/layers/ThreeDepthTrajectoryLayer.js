import { disposeObject, makeLine, positionForRecord } from './ThreeMissionLayerUtils.js';

export const THREE_DEPTH_TRAJECTORY_LAYER_VERSION = 'three-depth-trajectory-layer-r1-2a';

export function updateThreeDepthTrajectoryLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  const records = [
    ...(viewModel.predictedDiveTrajectories ?? []).map((trajectory) => ({ ...trajectory, depthKind: 'predicted' })),
    ...(viewModel.realizedDiveTrajectories ?? []).map((trajectory) => ({ ...trajectory, depthKind: 'realized' }))
  ];
  const existing = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const seen = new Set();
  for (const [index, trajectory] of records.entries()) {
    const id = trajectory.id ?? `${trajectory.depthKind}-depth-trajectory-${index}`;
    seen.add(id);
    const points = (trajectory.points ?? []).map((point) => positionForRecord(transform, point, trajectory.depthKind === 'predicted' ? 0.1 : 0.18));
    if (points.length < 2) continue;
    let line = existing.get(id);
    const color = trajectory.depthKind === 'predicted' ? 0xfff0a3 : 0xffffff;
    const opacity = trajectory.depthKind === 'predicted' ? 0.74 : 0.96;
    if (!line) {
      line = makeLine(points, { color, opacity });
      line.name = id;
      group.add(line);
      existing.set(id, line);
    } else if (line.userData.pointCount !== points.length || line.userData.depthKind !== trajectory.depthKind) {
      line.geometry?.dispose?.();
      line.geometry = makeLine(points, { color, opacity }).geometry;
    } else {
      const positions = line.geometry?.attributes?.position;
      if (positions && positions.count === points.length) {
        points.forEach((point, pointIndex) => positions.setXYZ(pointIndex, point.x, point.y, point.z));
        positions.needsUpdate = true;
      }
    }
    line.userData = {
      id,
      missionObjectType: trajectory.depthKind === 'predicted' ? 'predictedDiveTrajectory' : 'realizedTrajectory',
      missionObjectId: id,
      routeSegmentId: id,
      agentId: trajectory.agentId ?? null,
      depthKind: trajectory.depthKind,
      pointCount: points.length,
      diveProfileId: trajectory.diveProfileId ?? null,
      maximumDepthMeters: trajectory.maximumDepthMeters ?? null,
      ownsPlanning: false,
      ownsSimulationState: false,
      ownsScoring: false
    };
  }
  for (const [id, object] of existing.entries()) {
    if (!seen.has(id)) {
      group.remove(object);
      disposeObject(object);
      existing.delete(id);
    }
  }
  group.userData.objects = existing;
  group.userData.summary = threeDepthTrajectoryLayerSummary(group);
  return group;
}

export function clearThreeDepthTrajectoryLayer(group) {
  if (!group) return;
  for (const object of group.children ?? []) disposeObject(object);
  group.clear?.();
  group.userData.objects = new Map();
}

export function threeDepthTrajectoryLayerSummary(group = {}) {
  const objects = group.userData?.objects instanceof Map ? [...group.userData.objects.values()] : group.children ?? [];
  return {
    type: 'anchor.three.depth-trajectory-layer-summary',
    version: THREE_DEPTH_TRAJECTORY_LAYER_VERSION,
    objectCount: objects.length,
    predictedPathCount: objects.filter((object) => object.userData?.depthKind === 'predicted').length,
    realizedPathCount: objects.filter((object) => object.userData?.depthKind === 'realized').length,
    pointCount: objects.reduce((sum, object) => sum + Number(object.userData?.pointCount ?? 0), 0),
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false
  };
}
