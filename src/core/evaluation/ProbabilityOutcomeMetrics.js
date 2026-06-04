export function summarizeProbabilityOutcomes(events = [], missionState = null) {
  const samples = events.filter((event) => event.type === 'sample');
  const outcomes = events.filter((event) => event.type === 'probabilityOutcome');
  const successes = samples.filter((event) => event.manifested !== false).length;
  const failures = samples.filter((event) => event.manifested === false).length;
  const uncertain = samples.filter((event) => Number(event.probability ?? 1) < 1).length;
  return {
    scoringMode: missionState?.roiScoringMode ?? 'expectedValue',
    rngSeed: missionState?.rngSeed ?? null,
    sampleCount: samples.length,
    uncertainSampleCount: uncertain,
    manifestedCount: successes,
    missedManifestationCount: failures,
    plannedExpectedValue: round(samples.reduce((sum, event) => sum + Number(event.expectedValue ?? 0), 0), 3),
    realizedSampledValue: round(samples.reduce((sum, event) => sum + Number(event.value ?? 0), 0), 3),
    averageProbability: round(average(samples.map((event) => Number(event.probability ?? 1))), 3),
    outcomes: outcomes.map((event) => ({
      t: event.t,
      agentId: event.agentId,
      x: event.x,
      y: event.y,
      value: event.value,
      probability: event.probability,
      expectedValue: event.expectedValue,
      manifested: event.manifested,
      realizedValue: event.realizedValue,
      seed: event.seed,
      outcomeRoll: event.outcomeRoll
    }))
  };
}

function average(values) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function round(value, digits) {
  return Number(Number(value).toFixed(digits));
}
