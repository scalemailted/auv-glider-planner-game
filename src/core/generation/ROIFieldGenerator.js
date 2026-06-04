export function generateROI(width, height, t, config = {}) {
  const pattern = config.roiPattern ?? 'multiple';
  const hotspots = config.hotspots ?? [{ x: width * 0.65, y: height * 0.45, strength: 1, radius: 3.5 }];
  const temporal = Boolean(config.temporalHotspots || pattern === 'moving');

  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const value = hotspots.reduce((sum, hotspot, index) => {
      const drift = getHotspotDrift(pattern, t, index, width, height, temporal);
      const hx = hotspot.x + drift.x;
      const hy = hotspot.y + drift.y;
      const pulse = temporal ? 0.72 + 0.36 * (0.5 + 0.5 * Math.sin(t * 0.32 + (hotspot.phase ?? index))) : 1;
      const appearance = temporal ? 0.58 + 0.42 * (0.5 + 0.5 * Math.cos(t * 0.18 + index * 1.7)) : 1;
      const radius = (hotspot.radius ?? 3.5) * (temporal ? 0.86 + 0.18 * Math.sin(t * 0.2 + index) : 1);
      const d2 = (x - hx) ** 2 + (y - hy) ** 2;
      return sum + (hotspot.strength ?? 1) * pulse * appearance * Math.exp(-d2 / (2 * radius ** 2));
    }, 0);
    return Number(Math.max(0, Math.min(1, value)).toFixed(3));
  }));
}

export function createHotspots(width, height, count, pattern, random = Math.random) {
  if (pattern === 'single') count = 1;
  const clustered = pattern === 'clustered';
  const center = {
    x: width * (0.35 + random() * 0.35),
    y: height * (0.3 + random() * 0.4)
  };

  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    x: clustered ? center.x + (random() - 0.5) * width * 0.22 : 2 + random() * Math.max(1, width - 4),
    y: clustered ? center.y + (random() - 0.5) * height * 0.22 : 2 + random() * Math.max(1, height - 4),
    strength: 0.65 + random() * 0.45,
    radius: 2.2 + random() * 2.4,
    phase: index * 0.9 + random() * Math.PI
  }));
}

function getHotspotDrift(pattern, t, index, width, height, temporal) {
  if (pattern !== 'moving' && !temporal) return { x: 0, y: 0 };
  return {
    x: Math.sin(t * 0.18 + index * 0.9) * width * 0.12,
    y: Math.cos(t * 0.14 + index * 1.1) * height * 0.1
  };
}
