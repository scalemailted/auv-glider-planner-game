const EPSILON = 1e-6;

export function buildTemporalFrameTimes({ duration = 0, dt = 1 } = {}) {
  const boundedDuration = Math.max(0, finiteNumber(duration, 0));
  const step = Math.max(EPSILON, finiteNumber(dt, 1));
  const times = [];

  for (let t = 0; t < boundedDuration - EPSILON; t += step) {
    times.push(roundTime(t));
  }

  if (!times.length || !nearlyEqual(times.at(-1), boundedDuration)) {
    times.push(roundTime(boundedDuration));
  }

  return dedupeTimes(times);
}

function dedupeTimes(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const deduped = [];
  for (const time of sorted) {
    if (!deduped.some((candidate) => nearlyEqual(candidate, time))) {
      deduped.push(time);
    }
  }
  return deduped;
}

function roundTime(value) {
  return Number(finiteNumber(value, 0).toFixed(6));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nearlyEqual(a, b) {
  return Math.abs(Number(a) - Number(b)) <= EPSILON;
}
