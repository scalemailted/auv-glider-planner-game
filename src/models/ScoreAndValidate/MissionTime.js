const FrameIndex = require('./FrameIndex.js')
const TimelineFrameBuilder = require('./TimelineFrameBuilder.js')
function getTimeConfig(level) {
  const time = level?.world?.time ?? {};
  const duration = finiteOrDefault(time.duration, 60);
  const dt = finiteOrDefault(time.dt, 1);
  const planningWindow = finiteOrDefault(time.planningWindow, Math.max(1, duration));
  return {
    dt: Math.max(0.0001, dt),
    duration: Math.max(0, duration),
    planningWindow: Math.max(0.0001, planningWindow),
    displayUnits: time.displayUnits ?? 'hours'
  };
}

 function getPlanningWindowCount(level) {
  const { duration, planningWindow } = getTimeConfig(level);
  return Math.max(1, Math.ceil(duration / planningWindow));
}

 function getWindowForTime(level, time) {
  const { planningWindow } = getTimeConfig(level);
  const count = getPlanningWindowCount(level);
  const windowIndex = Math.floor(clampMissionTime(level, time) / planningWindow);
  return Math.max(0, Math.min(count - 1, windowIndex));
}

 function getWindowStartTime(level, windowIndex) {
  const { duration, planningWindow } = getTimeConfig(level);
  return Math.max(0, Math.min(duration, Math.floor(windowIndex) * planningWindow));
}

 function getMissionTimelineFrames(level, mission = null) {
  const time = getTimeConfig(level);
  const surfaceInterval = Number(mission?.rules?.communication?.surfaceInterval ?? time.planningWindow);
  return TimelineFrameBuilder.buildMissionTimelineFrames({
    durationHours: time.duration,
    surfaceIntervalHours: Number.isFinite(surfaceInterval) && surfaceInterval > 0 ? surfaceInterval : time.planningWindow,
    dtHours: time.dt
  });
}

 function getTimelineFrameIndexForTime(level, mission = null, time = 0) {
  const frames = getMissionTimelineFrames(level, mission);
  return TimelineFrameBuilder.getTimelineFrameForTime(frames, clampMissionTime(level, time))?.index ?? 0;
}

 function getTimelineFrameIndexAtOrBefore(level, mission = null, time = 0) {
  return TimelineFrameBuilder.getFrameIndexAtOrBefore(getMissionTimelineFrames(level, mission), clampMissionTime(level, time));
}

 function getNearestTimelineFrameIndex(level, mission = null, time = 0) {
  return TimelineFrameBuilder.getNearestFrameIndex(getMissionTimelineFrames(level, mission), clampMissionTime(level, time));
}

 function getNextTimelineFrameIndex(level, mission = null, time = 0) {
  return TimelineFrameBuilder.getNextFrame(getMissionTimelineFrames(level, mission), clampMissionTime(level, time))?.index ?? 0;
}

 function getPrevTimelineFrameIndex(level, mission = null, time = 0) {
  return TimelineFrameBuilder.getPrevFrame(getMissionTimelineFrames(level, mission), clampMissionTime(level, time))?.index ?? 0;
}

 function getTimelineFrameTime(level, mission = null, index = 0) {
  const frames = getMissionTimelineFrames(level, mission);
  const bounded = Math.max(0, Math.min(frames.length - 1, Math.round(Number(index) || 0)));
  return frames[bounded]?.t ?? 0;
}

 function getWindowEndTime(level, windowIndex) {
  const { duration, planningWindow } = getTimeConfig(level);
  return Math.max(0, Math.min(duration, getWindowStartTime(level, windowIndex) + planningWindow));
}

 function clampMissionTime(level, time) {
  const { duration } = getTimeConfig(level);
  const numeric = Number(time);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(duration, numeric));
}

 function formatMissionTime(level, time) {
  const { displayUnits } = getTimeConfig(level);
  const value = clampMissionTime(level, time);
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (displayUnits === 'hours') return `${rounded} hr`;
  if (displayUnits === 'minutes') return `${rounded} min`;
  return `${rounded}s`;
}

 function getFrameAtTime(frames = [], time = 0, dt = 1) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  const index = FrameIndex.getFrameIndexForTime(frames, time, dt);
  return frames[index] ?? null;
}

function finiteOrDefault(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

module.exports = {getTimeConfig, getPlanningWindowCount, getWindowForTime, getWindowStartTime, getMissionTimelineFrames, getTimelineFrameIndexForTime, getTimelineFrameIndexAtOrBefore, getNearestTimelineFrameIndex, getNextTimelineFrameIndex, getPrevTimelineFrameIndex, getTimelineFrameTime, getWindowEndTime, clampMissionTime, formatMissionTime, getFrameAtTime}