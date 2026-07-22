
 function computeHeadlessScoreReport({ fieldPackBefore, fieldPackAfter, observations = [], tracks = [], missionConfig = {}, waterColumnSummary = null } = {}) {
  const uniqueCells = new Set();
  let duplicateSamples = 0;
  let scienceValueCollected = 0;
  let forecastErrorDetection = 0;
  let hiddenEventEvidence = 0;
  let boundarySamplingBonus = 0;
  for (const observation of observations) {
    const key = `${Math.round(observation.x)}:${Math.round(observation.y)}:${Math.round(observation.zIndex ?? 0)}`;
    if (uniqueCells.has(key)) duplicateSamples += 1;
    uniqueCells.add(key);
    scienceValueCollected += Number(observation.observedValue ?? 0);
    forecastErrorDetection += Math.abs(Number(observation.innovation ?? 0));
    const pUnknown = sampleNearest3d(fieldPackBefore?.fields?.P_unknown, observation.x, observation.y, observation.zIndex ?? 0);
    if (pUnknown > 0.35 || Number(observation.surprise ?? 0) > 2) hiddenEventEvidence += Math.max(pUnknown, Math.min(1, Number(observation.surprise ?? 0) / 5));
    boundarySamplingBonus += sampleNearest3d(fieldPackBefore?.fields?.boundaryStrength, observation.x, observation.y, observation.zIndex ?? 0);
  }
  const beforeU = field3dStats(fieldPackBefore?.fields?.U_uncertainty);
  const afterU = field3dStats(fieldPackAfter?.fields?.U_uncertainty);
  const uncertaintyReduction = Math.max(0, Number(beforeU.mean ?? 0) - Number(afterU.mean ?? 0));
  const energyUsed = tracks.reduce((sum, point) => sum + Number(point.energyUsedIncrement ?? 0), 0);
  const distanceTraveled = pathDistance(tracks);
  const hazardCount = tracks.filter((point) => Number(point.hazard ?? 0) >= 0.35).length;
  const maskCount = tracks.filter((point) => Number(point.constraintMask ?? 0) >= 0.5).length;
  const hazardPenalty = hazardCount * 2.5 + maskCount * 6;
  const duplicateSamplePenalty = duplicateSamples * 0.75;
  const finalScore = (
    scienceValueCollected * 4
    + uncertaintyReduction * 80
    + forecastErrorDetection * 7
    + hiddenEventEvidence * 5
    + boundarySamplingBonus * 1.8
    - energyUsed * 0.18
    - hazardPenalty
    - duplicateSamplePenalty
  );
  return {
    type: 'anchor.headless.score-report',
    version: 'headless-scoring-h1',
    missionId: missionConfig.missionId ?? null,
    educationalHeadlessScoring: true,
    notBrowserOfficialScoring: true,
    components: {
      scienceValueCollected: round(scienceValueCollected),
      uncertaintyReduction: round(uncertaintyReduction),
      forecastErrorDetection: round(forecastErrorDetection),
      hiddenEventEvidence: round(hiddenEventEvidence),
      boundarySamplingBonus: round(boundarySamplingBonus),
      energyUsed: round(energyUsed),
      distanceTraveled: round(distanceTraveled),
      hazardPenalty: round(hazardPenalty),
      duplicateSamplePenalty: round(duplicateSamplePenalty)
    },
    waterColumn: waterColumnScoreContext(waterColumnSummary),
    counts: {
      observationCount: observations.length,
      trackPointCount: tracks.length,
      uniqueSampleCells: uniqueCells.size,
      duplicateSamples,
      hazardExposures: hazardCount,
      maskViolations: maskCount
    },
    finalScore: round(finalScore),
    boundary: 'Educational Node headless score only. Browser ANCHOR remains the official visual referee and scoring UI.'
  };
}

 function headlessScoreReportSummary(report = {}) {
  return {
    type: report.type,
    finalScore: report.finalScore ?? 0,
    observationCount: report.counts?.observationCount ?? 0,
    energyUsed: report.components?.energyUsed ?? 0,
    hazardExposures: report.counts?.hazardExposures ?? 0,
    notBrowserOfficialScoring: report.notBrowserOfficialScoring === true
  };
}

function waterColumnScoreContext(summary = null) {
  if (!summary) return null;
  return {
    profileId: summary.diveProfile?.profileId ?? null,
    verticalCoverage: summary.verticalCoverage ?? null,
    observationCountsByDepth: summary.observationCountsByDepth ?? {},
    bestDepthLayerCounts: summary.bestDepthLayerCounts ?? {},
    scoreNeutral: true,
    note: 'P11 water-column context is reported for analysis and does not rewrite the headless score formula.'
  };
}

function pathDistance(tracks = []) {
  let distance = 0;
  for (let index = 1; index < tracks.length; index += 1) {
    distance += Math.hypot(Number(tracks[index].x ?? 0) - Number(tracks[index - 1].x ?? 0), Number(tracks[index].y ?? 0) - Number(tracks[index - 1].y ?? 0));
  }
  return distance;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}

function field3dStats(field) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  let finiteCount = 0;
  forEachFieldCell(field, (value) => {
    count += 1;
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    finiteCount += 1;
    min = Math.min(min, number);
    max = Math.max(max, number);
    sum += number;
  });
  return { min: finiteCount ? min : null, max: finiteCount ? max : null, mean: finiteCount ? sum / finiteCount : null, count, finiteCount, invalidCount: count - finiteCount };
}

function sampleNearest3d(field, x, y, zIndex = 0) {
  const shape = fieldShape(field);
  if (!shape.valid) return 0;
  const z = clampInt(Math.round(zIndex), 0, shape.depth - 1);
  const row = clampInt(Math.round(y), 0, shape.height - 1);
  const col = clampInt(Math.round(x), 0, shape.width - 1);
  return Number(field[z]?.[row]?.[col] ?? 0);
}

function fieldShape(field) {
  const depth = Array.isArray(field) ? field.length : 0;
  const height = depth && Array.isArray(field[0]) ? field[0].length : 0;
  const width = height && Array.isArray(field[0][0]) ? field[0][0].length : 0;
  const valid = depth > 0 && height > 0 && width > 0 && field.every((layer) => (
    Array.isArray(layer) && layer.length === height && layer.every((row) => Array.isArray(row) && row.length === width)
  ));
  return { valid, depth, height, width };
}

function forEachFieldCell(field, visitor) {
  if (!Array.isArray(field)) return;
  for (let z = 0; z < field.length; z += 1) {
    const layer = field[z];
    if (!Array.isArray(layer)) continue;
    for (let y = 0; y < layer.length; y += 1) {
      const row = layer[y];
      if (!Array.isArray(row)) continue;
      for (let x = 0; x < row.length; x += 1) visitor(row[x], x, y, z);
    }
  }
}

function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min));
}

module.exports = {computeHeadlessScoreReport, headlessScoreReportSummary}