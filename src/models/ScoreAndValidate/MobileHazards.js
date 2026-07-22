 function getMobileHazardsAtTime(level, time = 0) {
  return (level?.layers?.mobileHazards ?? []).map((hazard) => ({
    ...hazard,
    ...interpolateHazardFrame(hazard.frames ?? [], time)
  })).filter((hazard) => Number.isFinite(hazard.x) && Number.isFinite(hazard.y));
}

 function mobileHazardAt(level, x, y, time = 0) {
  return getMobileHazardsAtTime(level, time).find((hazard) => {
    const radius = Number(hazard.radius ?? 1);
    return Math.hypot(x - Number(hazard.x), y - Number(hazard.y)) <= radius;
  }) ?? null;
}

function interpolateHazardFrame(frames, time) {
  if (!frames.length) return {};
  const sorted = [...frames].sort((a, b) => Number(a.t ?? 0) - Number(b.t ?? 0));
  let previous = sorted[0];
  let next = sorted.at(-1);
  for (let index = 0; index < sorted.length; index += 1) {
    if (Number(sorted[index].t ?? 0) <= time) previous = sorted[index];
    if (Number(sorted[index].t ?? 0) >= time) {
      next = sorted[index];
      break;
    }
  }
  const t0 = Number(previous.t ?? 0);
  const t1 = Number(next.t ?? t0);
  const alpha = t1 === t0 ? 0 : Math.max(0, Math.min(1, (time - t0) / (t1 - t0)));
  return {
    t: time,
    x: lerp(Number(previous.x), Number(next.x), alpha),
    y: lerp(Number(previous.y), Number(next.y), alpha),
    radius: lerp(Number(previous.radius ?? 1), Number(next.radius ?? previous.radius ?? 1), alpha)
  };
}

function lerp(a, b, alpha) {
  if (!Number.isFinite(a)) return b;
  if (!Number.isFinite(b)) return a;
  return a + (b - a) * alpha;
}

module.exports = {getMobileHazardsAtTime, mobileHazardAt}