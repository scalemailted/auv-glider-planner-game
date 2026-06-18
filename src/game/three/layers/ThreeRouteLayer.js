import { clearGroup, agentColor, makeLine, positionForRecord } from './ThreeMissionLayerUtils.js';

export function updateThreeRouteLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const route of viewModel.routes ?? []) {
    if (!route.points?.length) continue;
    const points = route.points.map((point) => positionForRecord(transform, point, 0.16));
    const line = makeLine(points, { color: agentColor(route.agentId), opacity: 0.92 });
    line.name = route.id;
    line.userData = { id: route.id, agentId: route.agentId, pointCount: route.points.length, status: route.status };
    group.add(line);
  }
  return group;
}
