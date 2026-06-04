export function compareResults(manualResult, solverResult) {
  if (!manualResult || !solverResult) return null;
  const manual = manualResult.summary ?? {};
  const solver = solverResult.summary ?? {};
  const finalDelta = round((solver.finalScore ?? 0) - (manual.finalScore ?? 0));
  const sampleDelta = round((solver.sampleScore ?? 0) - (manual.sampleScore ?? 0), 3);
  const energyDelta = round((solver.energyUsed ?? 0) - (manual.energyUsed ?? 0), 3);
  const hazardDelta = (solver.hazardsHit ?? 0) - (manual.hazardsHit ?? 0);

  return {
    manualFinalScore: manual.finalScore ?? 0,
    solverFinalScore: solver.finalScore ?? 0,
    finalDelta,
    sampleDelta,
    energyDelta,
    hazardDelta,
    winner: finalDelta > 0 ? 'solver' : finalDelta < 0 ? 'manual' : 'tie'
  };
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}
