export function updateThreeSimulationStatusLayer(group, viewModel = {}) {
  if (!group) return group;
  group.userData.status = {
    ...(viewModel.simulationStatus ?? {}),
    scoreSummary: viewModel.scoreSummary ?? null,
    missionProgress: viewModel.missionProgress ?? null,
    boundaryFlags: viewModel.boundaryFlags ?? null
  };
  return group;
}

export function clearThreeSimulationStatusLayer(group) {
  if (group?.userData) group.userData.status = null;
}
