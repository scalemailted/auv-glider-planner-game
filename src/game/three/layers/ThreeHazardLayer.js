import { clearGroup, makeBoxCell } from './ThreeMissionLayerUtils.js';

export function updateThreeHazardLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const hazard of viewModel.hazards ?? []) {
    const mesh = makeBoxCell(transform, hazard, { color: 0xff4e5a, opacity: hazard.mobile ? 0.5 : 0.36, height: hazard.mobile ? 0.09 : 0.045, yOffset: hazard.mobile ? 0.24 : 0.11 });
    mesh.userData = { id: hazard.id, hazardId: hazard.id, mobile: hazard.mobile === true, value: hazard.value };
    group.add(mesh);
  }
  return group;
}

export function updateThreeConstraintLayer(group, viewModel = {}) {
  clearGroup(group);
  const transform = viewModel.coordinateSystem;
  for (const constraint of viewModel.constraints ?? []) {
    const mesh = makeBoxCell(transform, constraint, { color: 0x91a06d, opacity: 0.66, height: 0.08, yOffset: 0.02 });
    mesh.userData = { id: constraint.id, constraintId: constraint.id };
    group.add(mesh);
  }
  return group;
}
