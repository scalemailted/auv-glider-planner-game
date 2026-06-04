export function getCommunicationRules(mission = {}) {
  const communication = mission.rules?.communication ?? {};
  const interval = finiteNonNegative(communication.surfaceInterval, 3);
  const duration = finiteNonNegative(communication.surfaceDuration, 0.25);
  return {
    mode: communication.mode ?? 'surfaceOnly',
    surfaceInterval: interval,
    surfaceDuration: duration,
    allowReplanningOnSurface: communication.allowReplanningOnSurface !== false,
    pauseOnSurface: communication.pauseOnSurface !== false,
    updatePenalty: Number(communication.updatePenalty ?? mission.scoring?.updatePenalty ?? 0)
  };
}

export function surfacingEnabled(mission = {}) {
  const rules = getCommunicationRules(mission);
  return rules.mode === 'surfaceOnly' && rules.surfaceInterval > 0;
}

export function getSurfacingTimes(level = {}, mission = {}) {
  if (!surfacingEnabled(mission)) return [];
  const duration = Number(level.world?.time?.duration ?? 0);
  const interval = getCommunicationRules(mission).surfaceInterval;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(interval) || interval <= 0) return [];
  const times = [];
  for (let t = interval; t < duration; t += interval) {
    times.push(roundTime(t));
    if (times.length > 10000) break;
  }
  return times;
}

export function getGliderCommsState(t, mission = {}, agent = null) {
  if (agent?.commsState) return agent.commsState;
  if (!surfacingEnabled(mission)) return 'submerged';
  const rules = getCommunicationRules(mission);
  const time = Number(t ?? 0);
  if (time <= 0) return 'surfaced';
  const phase = time % rules.surfaceInterval;
  if (phase <= rules.surfaceDuration || rules.surfaceInterval - phase <= rules.surfaceDuration) return 'surfacing';
  return 'submerged';
}

export function shouldSurfaceAtTime(tBefore, tAfter, level = {}, mission = {}, handledTimes = new Set()) {
  const epsilon = 1e-6;
  return getSurfacingTimes(level, mission).find((time) => (
    time > tBefore + epsilon
    && time <= tAfter + epsilon
    && !handledTimes.has(surfaceKey(time))
  )) ?? null;
}

export function surfaceKey(time) {
  return String(roundTime(time));
}

function roundTime(time) {
  return Number(Number(time).toFixed(6));
}

function finiteNonNegative(value, fallback) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}
