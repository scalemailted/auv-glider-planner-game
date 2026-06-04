export function getActiveRenderTime(gameState, simulationEngine = null) {
  if (gameState?.mode === 'simulation' && simulationEngine) {
    return finiteOrZero(simulationEngine.t);
  }
  if (gameState?.mode === 'planning') {
    return finiteOrZero(gameState.planningTime ?? gameState.selectedTime);
  }
  return finiteOrZero(gameState?.planningTime ?? gameState?.selectedTime ?? 0);
}

function finiteOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
