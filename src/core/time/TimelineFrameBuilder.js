const EPSILON = 1e-6;
export const DEBUG_TIMELINE_FRAMES = false;

export function buildMissionTimelineFrames({ durationHours = 0, surfaceIntervalHours = null, dtHours = null } = {}) {
  const duration = Math.max(0, finiteNumber(durationHours, 0));
  const interval = finiteNumber(surfaceIntervalHours, 0);
  const dt = finiteNumber(dtHours, 0);
  const entries = [];

  addFrame(entries, 0, 'start', { isSurfaceFrame: interval > 0 && nearlyEqual(0, 0) });

  const step = interval > EPSILON ? interval : dt > EPSILON ? dt : 0;
  if (step > EPSILON) {
    for (let t = step; t < duration - EPSILON; t += step) {
      addFrame(entries, t, interval > EPSILON ? 'surface' : 'frame', { isSurfaceFrame: interval > EPSILON });
    }
  }

  addFrame(entries, duration, 'missionEnd', { isSurfaceFrame: true, isFinalFrame: true });

  const sorted = entries
    .map((entry) => ({ ...entry, t: clampTime(entry.t, duration) }))
    .sort((a, b) => a.t - b.t);

  const deduped = [];
  for (const entry of sorted) {
    const existing = deduped.find((candidate) => nearlyEqual(candidate.t, entry.t));
    if (existing) {
      existing.isSurfaceFrame = Boolean(existing.isSurfaceFrame || entry.isSurfaceFrame);
      existing.isFinalFrame = Boolean(existing.isFinalFrame || entry.isFinalFrame);
      existing.kind = existing.isFinalFrame && existing.kind !== 'surface' ? entry.kind : existing.kind;
      continue;
    }
    deduped.push(entry);
  }

  const final = deduped.find((entry) => nearlyEqual(entry.t, duration)) ?? deduped.at(-1);
  if (final) {
    final.t = duration;
    final.isFinalFrame = true;
    final.isSurfaceFrame = true;
    if (final.kind !== 'surface') final.kind = 'missionEnd';
  }

  const frames = deduped.map((entry, index) => ({ ...entry, index }));
  debugTimeline('build', { durationHours: duration, surfaceIntervalHours: interval, dtHours: dt, frames });
  return frames;
}

export function getTimelineFrameForTime(frames = [], time = 0) {
  const index = getNearestFrameIndex(frames, time);
  return frames[index] ?? null;
}

export function getFrameIndexAtOrBefore(frames = [], time = 0) {
  if (!frames.length) return 0;
  const value = finiteNumber(time, 0);
  let index = 0;
  for (let i = 0; i < frames.length; i += 1) {
    if (Number(frames[i].t ?? 0) <= value + EPSILON) index = i;
    else break;
  }
  return clampIndex(index, frames);
}

export function getNearestFrameIndex(frames = [], time = 0) {
  if (!frames.length) return null;
  const value = finiteNumber(time, 0);
  let bestIndex = 0;
  let bestDistance = Math.abs(value - Number(frames[0].t ?? 0));
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const distance = Math.abs(value - frame.t);
    if (distance < bestDistance - EPSILON) {
      bestIndex = index;
      bestDistance = distance;
    }
  }
  return clampIndex(bestIndex, frames);
}

export function getNextFrame(frames = [], time = 0) {
  if (!frames.length) return null;
  const value = finiteNumber(time, 0);
  const current = getNearestFrameIndex(frames, value);
  const exact = nearlyEqual(frames[current]?.t, value);
  const nextIndex = exact
    ? Math.min(frames.length - 1, current + 1)
    : frames.findIndex((frame) => Number(frame.t ?? 0) > value + EPSILON);
  const bounded = nextIndex < 0 ? frames.length - 1 : Math.min(frames.length - 1, nextIndex);
  debugTimeline('next', { selectedTime: value, currentFrameIndex: current, nextFrameIndex: bounded, selectedTimeAfter: frames[bounded]?.t, frames });
  return frames[bounded] ?? null;
}

export function getPrevFrame(frames = [], time = 0) {
  if (!frames.length) return null;
  const value = finiteNumber(time, 0);
  const current = getNearestFrameIndex(frames, value);
  const exact = nearlyEqual(frames[current]?.t, value);
  const prevIndex = exact
    ? Math.max(0, current - 1)
    : getFrameIndexAtOrBefore(frames, value);
  const bounded = Math.max(0, Math.min(frames.length - 1, prevIndex));
  debugTimeline('prev', { selectedTime: value, currentFrameIndex: current, prevFrameIndex: bounded, selectedTimeAfter: frames[bounded]?.t, frames });
  return frames[bounded] ?? null;
}

function clampIndex(index, frames) {
  return Math.max(0, Math.min(frames.length - 1, Number(index) || 0));
}

function addFrame(entries, t, kind, flags = {}) {
  entries.push({
    t,
    kind,
    isSurfaceFrame: Boolean(flags.isSurfaceFrame),
    isFinalFrame: Boolean(flags.isFinalFrame)
  });
}

function clampTime(time, duration) {
  return Math.max(0, Math.min(duration, finiteNumber(time, 0)));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nearlyEqual(a, b) {
  return Math.abs(Number(a) - Number(b)) <= EPSILON;
}

function debugTimeline(phase, details) {
  if (!DEBUG_TIMELINE_FRAMES && !globalThis.DEBUG_TIMELINE_FRAMES) return;
  console.debug('[timeline]', phase, {
    ...details,
    frames: details.frames?.map((frame) => ({
      index: frame.index,
      t: frame.t,
      kind: frame.kind,
      isSurfaceFrame: frame.isSurfaceFrame,
      isFinalFrame: frame.isFinalFrame
    }))
  });
}
