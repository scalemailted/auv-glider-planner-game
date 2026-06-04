export function getFrameIndexForTime(frames = [], time = 0, dt = 1) {
  if (!Array.isArray(frames) || frames.length === 0) return -1;
  const target = finiteOrZero(time);
  if (frames.some((frame) => Number.isFinite(Number(frame?.t)))) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    frames.forEach((frame, index) => {
      const distance = Math.abs(finiteOrZero(frame?.t) - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return clampIndex(bestIndex, frames.length);
  }
  const safeDt = Math.max(0.0001, finiteOrDefault(dt, 1));
  return clampIndex(Math.floor(target / safeDt), frames.length);
}

function clampIndex(index, length) {
  return Math.max(0, Math.min(length - 1, Number.isFinite(Number(index)) ? Math.floor(Number(index)) : 0));
}

function finiteOrZero(value) {
  return finiteOrDefault(value, 0);
}

function finiteOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
