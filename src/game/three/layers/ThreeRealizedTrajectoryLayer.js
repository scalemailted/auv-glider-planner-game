import { clearGroup, disposeObject, agentColor, makeLine, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeRealizedTrajectoryLayer(group, viewModel = {}) {
  if (!group) return group;
  const transform = viewModel.coordinateSystem;
  const records = [...(viewModel.realizedTrajectories ?? []), ...(viewModel.sampledTrajectories ?? [])];
  const existing = group.userData.objects instanceof Map ? group.userData.objects : new Map();
  const seen = new Set();
  for (const [index, trajectory] of records.entries()) {
    const id = trajectory.id ?? `${trajectory.agentId ?? 'agent'}-trajectory-${index}`;
    seen.add(id);
    const points = (trajectory.points ?? []).map((point) => positionForRecord(transform, point, trajectory.sampled ? 0.24 : 0.18));
    if (points.length < 2) continue;
    let line = existing.get(id);
    if (!line) {
      line = makeLine(points, { color: trajectory.sampled ? 0xffffff : agentColor(trajectory.agentId, index), opacity: trajectory.sampled ? 0.96 : 0.84 });
      line.name = id;
      group.add(line);
      existing.set(id, line);
    } else if (line.userData.pointCount !== points.length || line.userData.sampled !== trajectory.sampled) {
      line.geometry?.dispose?.();
      line.geometry = makeLine(points, { color: trajectory.sampled ? 0xffffff : agentColor(trajectory.agentId, index), opacity: trajectory.sampled ? 0.96 : 0.84 }).geometry;
    }
    line.userData = { id, missionObjectType: 'realizedTrajectory', missionObjectId: id, routeSegmentId: id, agentId: trajectory.agentId, pointCount: points.length, sampled: trajectory.sampled === true, status: trajectory.status ?? 'realized' };
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

export function clearThreeRealizedTrajectoryLayer(group) {
  clearGroup(group);
  if (group?.userData) group.userData.objects = new Map();
}
