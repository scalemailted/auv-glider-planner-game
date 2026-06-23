export const PLANNING_TIMELINE_TIME_BRIDGE_VERSION = 'planning-timeline-time-bridge-flow-runtime-r1-1';

export function planningTimelineTimeToCurrentSeconds(level = {}, time = 0, options = {}) {
  const phase = String(options.phase ?? 'planning');
  const rawTime = finiteNumber(time, 0);
  if (phase === 'simulation' || phase === 'replay') {
    return finiteNumber(options.simulationStatus?.timeSeconds ?? options.timeSeconds ?? rawTime, rawTime);
  }
  if (phase !== 'planning') return rawTime;
  return rawTime * missionTimelineUnitMultiplier(level, options);
}

export function planningTimelineBridgeSummary(level = {}, time = 0, options = {}) {
  const phase = String(options.phase ?? 'planning');
  const displayUnits = timelineDisplayUnits(level, options);
  const multiplier = phase === 'planning' ? missionTimelineUnitMultiplier(level, options) : 1;
  const missionTimelineTime = finiteNumber(time, 0);
  const missionTimelineTimeSeconds = planningTimelineTimeToCurrentSeconds(level, missionTimelineTime, options);
  const duration = finiteNumber(level?.world?.time?.duration, null);
  const durationSeconds = finiteNumber(
    options.durationSeconds
      ?? level?.world?.time?.durationSeconds
      ?? level?.world?.operationalDomain?.time?.durationSeconds
      ?? level?.operationalDomain?.time?.durationSeconds
      ?? level?.meta?.generationConfig?.operationalDomain?.time?.durationSeconds,
    Number.isFinite(duration) ? duration * multiplier : null
  );
  return {
    type: 'anchor.debug.planning-timeline-time-bridge',
    version: PLANNING_TIMELINE_TIME_BRIDGE_VERSION,
    phase,
    displayUnits,
    missionTimelineTime,
    missionTimelineTimeHours: displayUnits === 'hours' ? missionTimelineTime : missionTimelineTimeSeconds / 3600,
    missionTimelineTimeSeconds,
    currentPresentationTimeSeconds: missionTimelineTimeSeconds,
    timeUnitMultiplier: multiplier,
    duration,
    durationSeconds,
    sourceTimeAxisUnits: 'seconds',
    sourceTimeAuthority: phase === 'planning' ? 'visible-planning-timeline' : `${phase}-runtime-time`,
    conversionApplied: phase === 'planning' && multiplier !== 1,
    directDebugTimeMutationUsed: false
  };
}

export function currentSecondsToPlanningTimelineTime(level = {}, seconds = 0, options = {}) {
  const phase = String(options.phase ?? 'planning');
  const rawSeconds = finiteNumber(seconds, 0);
  if (phase !== 'planning') return rawSeconds;
  return rawSeconds / Math.max(1e-9, missionTimelineUnitMultiplier(level, options));
}

export function missionTimelineUnitMultiplier(level = {}, options = {}) {
  const units = timelineDisplayUnits(level, options);
  if (units === 'hours') return 3600;
  if (units === 'minutes') return 60;
  return 1;
}

export function timelineDisplayUnits(level = {}, options = {}) {
  const raw = String(options.displayUnits ?? level?.world?.time?.displayUnits ?? 'hours').trim().toLowerCase();
  if (raw.startsWith('hour')) return 'hours';
  if (raw.startsWith('min')) return 'minutes';
  if (raw.startsWith('sec') || raw === 's') return 'seconds';
  return raw || 'seconds';
}

export function planningTimelineBridgePasses(bridge = {}, toleranceSeconds = 1e-3) {
  const current = finiteNumber(bridge.currentPresentationTimeSeconds, NaN);
  const mission = finiteNumber(bridge.missionTimelineTimeSeconds, NaN);
  return Number.isFinite(current) && Number.isFinite(mission) && Math.abs(current - mission) <= toleranceSeconds;
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

