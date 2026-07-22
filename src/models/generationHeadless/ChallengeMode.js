const ForecastGenerator = require('./ForecastGenerator.js')
const Random = require('./Random.js')
const MissionTime = require('./MissionTime.js')
const CHALLENGE_MODES = ['perfectKnowledge', 'forecast'];

 function normalizeChallengeMode(mode) {
  return CHALLENGE_MODES.includes(mode) ? mode : 'perfectKnowledge';
}

 function ensureForecastFields(level, config = {}) {
  if (!level) return level;
  const frames = level.layers?.forecast?.frames ?? [];
  if (frames.length > 0 || (level.layers?.forecasts ?? []).length > 0) return level;

  const random = Random.createSeededRandom(config.seed ?? level.meta?.seed ?? level.levelId ?? 'forecast');
  level.layers.forecast = {
    frames: ForecastGenerator.makeForecastFromTruth(level.layers.truth?.frames ?? [], {
      forecastMode: 'noisy',
      forecastNoise: config.forecastNoise ?? 0.12
    }, random)
  };
  return level;
}

 function getPlanningFrame(level, time = 0, { challengeMode = 'perfectKnowledge', revealTruth = false, forecastMemberId = null } = {}) {
  const mode = normalizeChallengeMode(challengeMode);
  const source = mode === 'forecast' && !revealTruth ? 'forecast' : 'truth';
  const ensemble = source === 'forecast' ? (level.layers.forecasts ?? []) : [];
  if (ensemble.length > 0) {
    const member = forecastMemberId === 'ensemble_mean'
      ? null
      : ensemble.find((candidate) => candidate.id === forecastMemberId) ?? ensemble[0];
    if (member) {
      const frame = MissionTime.getFrameAtTime(member.frames ?? [], time, level.world.time.dt || 1);
      return frame ? { ...frame, source: 'forecast', forecastMemberId: member.id, forecastLabel: member.label ?? member.id } : null;
    }
    const mean = getEnsembleMeanFrame(ensemble, time, level.world.time.dt || 1);
    if (mean) return { ...mean, source: 'forecast', forecastMemberId: 'ensemble_mean', forecastLabel: 'Ensemble Mean' };
  }
  const frames = source === 'forecast' ? (level.layers.forecast?.frames ?? []) : (level.layers.truth?.frames ?? []);
  const fallbackFrames = level.layers.truth?.frames ?? [];
  const selectedFrames = frames.length > 0 ? frames : fallbackFrames;
  const dt = level.world.time.dt || 1;
  const frame = MissionTime.getFrameAtTime(selectedFrames, time, dt);
  return frame ? { ...frame, source: frames.length > 0 ? source : 'truth' } : null;
}

 function getForecastMembers(level) {
  const members = (level?.layers?.forecasts ?? []).map((member) => ({
    id: member.id,
    label: member.label ?? member.id
  }));
  if (members.length > 1) members.unshift({ id: 'ensemble_mean', label: 'Ensemble Mean' });
  return members;
}

function getEnsembleMeanFrame(ensemble, time, dt) {
  const frames = ensemble.map((member) => MissionTime.getFrameAtTime(member.frames ?? [], time, dt)).filter(Boolean);
  if (!frames.length) return null;
  const height = frames[0].roi?.length ?? 0;
  const width = frames[0].roi?.[0]?.length ?? 0;
  return {
    t: time,
    current: Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
      const values = frames.map((frame) => frame.current?.[y]?.[x] ?? [0, 0]);
      return [
        round(values.reduce((sum, value) => sum + value[0], 0) / values.length),
        round(values.reduce((sum, value) => sum + value[1], 0) / values.length)
      ];
    })),
    roi: Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
      const values = frames.map((frame) => roiExpected(frame.roi?.[y]?.[x]));
      const expectedValue = values.reduce((sum, value) => sum + value, 0) / values.length;
      return { value: round(expectedValue), probability: 1, expectedValue: round(expectedValue) };
    })),
    uncertainty: Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
      const values = frames.map((frame) => roiExpected(frame.roi?.[y]?.[x]));
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      return round(Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length));
    }))
  };
}

function roiExpected(cell) {
  if (cell && typeof cell === 'object') return Number(cell.expectedValue ?? (cell.value ?? 0) * (cell.probability ?? 1));
  return Number(cell ?? 0);
}

function round(value) {
  return Number(Number(value).toFixed(3));
}

 function getVisiblePlanningSource({ challengeMode = 'perfectKnowledge', revealTruth = false } = {}) {
  if (normalizeChallengeMode(challengeMode) === 'forecast' && !revealTruth) return 'forecast';
  return 'truth';
}

module.exports = {normalizeChallengeMode, ensureForecastFields, getPlanningFrame, getForecastMembers, getVisiblePlanningSource}