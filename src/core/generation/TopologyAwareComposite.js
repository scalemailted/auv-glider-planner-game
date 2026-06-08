import { createSeededRng } from '../random/SeededRng.js';

export const TOPOLOGY_COMPOSITE_SCHEMA_VERSION = '1.0';

const REGION_TYPES = ['openWater', 'shoreline', 'channel', 'bayPocket', 'islandAdjacent'];

export function buildTopologyAwareCompositeConfig({
  terrain = [],
  width = 1,
  height = 1,
  seed = 'anchor-current',
  challengeId = null,
  generationVersion = 'anchor-generator-v1',
  randomness = 'medium'
} = {}) {
  const rng = createSeededRng(`${challengeId ?? seed}:current:topology-composite:${generationVersion}`);
  const summary = summarizeTopologyRegions({ terrain, width, height });
  const variationScale = randomness === 'high' ? 1 : randomness === 'low' ? 0.35 : 0.65;
  const regions = [
    makeRegion('open-water', 'openWater', chooseWeighted(rng, [
      ['meanderingJet', 0.55],
      ['doubleGyre', 0.25],
      ['uniformDrift', 0.12],
      ['curlNoise', 0.08]
    ]), 0.55 + rng() * 0.28 * variationScale, rng),
    makeRegion('shoreline', 'shoreline', chooseWeighted(rng, [
      ['alongShoreFlow', 0.7],
      ['tidalOscillation', 0.18],
      ['curlNoise', 0.12]
    ]), 0.34 + rng() * 0.22 * variationScale, rng),
    makeRegion('channels', 'channel', chooseWeighted(rng, [
      ['channelJet', 0.8],
      ['uniformDrift', 0.2]
    ]), 0.42 + rng() * 0.28 * variationScale, rng),
    makeRegion('bays-pockets', 'bayPocket', chooseWeighted(rng, [
      ['eddyField', 0.68],
      ['tidalOscillation', 0.2],
      ['curlNoise', 0.12]
    ]), 0.22 + rng() * 0.2 * variationScale, rng),
    makeRegion('island-wakes', 'islandAdjacent', chooseWeighted(rng, [
      ['islandWake', 0.55],
      ['eddyField', 0.3],
      ['curlNoise', 0.15]
    ]), 0.32 + rng() * 0.26 * variationScale, rng)
  ];
  return {
    schemaVersion: TOPOLOGY_COMPOSITE_SCHEMA_VERSION,
    label: 'Topology-Aware Composite',
    description: 'Synthetic topology-aware ocean-inspired current field. Not validated CFD or HYCOM forecast data.',
    seed: String(seed),
    challengeId: challengeId ? String(challengeId) : null,
    generationVersion,
    randomness,
    summary,
    regions
  };
}

export function summarizeTopologyRegions({ terrain = [], width = 1, height = 1 } = {}) {
  const counts = Object.fromEntries(REGION_TYPES.map((type) => [type, 0]));
  let water = 0;
  let land = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (terrain[y]?.[x]) {
        land += 1;
        continue;
      }
      water += 1;
      const classification = classifyTopologyRegionAtCell({ terrain, x, y, width, height });
      counts[classification.regionType] = Number(counts[classification.regionType] ?? 0) + 1;
    }
  }
  return {
    width,
    height,
    waterCells: water,
    landCells: land,
    regionCounts: counts,
    waterRegionRatio: water > 0
      ? Object.fromEntries(REGION_TYPES.map((type) => [type, Number(((counts[type] ?? 0) / water).toFixed(3))]))
      : Object.fromEntries(REGION_TYPES.map((type) => [type, 0]))
  };
}

export function classifyTopologyRegionAtCell({ terrain = [], x = 0, y = 0, width = 1, height = 1 } = {}) {
  const cx = clampInt(Math.round(Number(x)), 0, Math.max(0, Number(width) - 1));
  const cy = clampInt(Math.round(Number(y)), 0, Math.max(0, Number(height) - 1));
  if (terrain[cy]?.[cx]) {
    return {
      regionType: 'land',
      dominantRegionBehavior: 'blocked',
      shoreDistance: 0,
      cardinalLand: 4,
      diagonalLand: 4,
      openness: 0,
      channelScore: 0,
      bayScore: 0,
      islandAdjacency: 0
    };
  }
  const cardinal = [
    isLand(terrain, cx + 1, cy, width, height),
    isLand(terrain, cx - 1, cy, width, height),
    isLand(terrain, cx, cy + 1, width, height),
    isLand(terrain, cx, cy - 1, width, height)
  ];
  const diagonal = [
    isLand(terrain, cx + 1, cy + 1, width, height),
    isLand(terrain, cx - 1, cy + 1, width, height),
    isLand(terrain, cx + 1, cy - 1, width, height),
    isLand(terrain, cx - 1, cy - 1, width, height)
  ];
  const cardinalLand = cardinal.filter(Boolean).length;
  const diagonalLand = diagonal.filter(Boolean).length;
  const shoreDistance = nearestLandDistance({ terrain, x: cx, y: cy, width, height, radius: 5 });
  const landNorthSouth = cardinal[2] && cardinal[3];
  const landEastWest = cardinal[0] && cardinal[1];
  const channelScore = (landNorthSouth || landEastWest ? 0.85 : 0) + Math.max(0, cardinalLand - 1) * 0.12;
  const bayScore = cardinalLand >= 2 && diagonalLand >= 2 && !landNorthSouth && !landEastWest ? 0.85 : cardinalLand >= 2 ? 0.45 : 0;
  const islandAdjacency = cardinalLand === 1 && diagonalLand >= 2 ? 0.75 : diagonalLand >= 3 ? 0.55 : 0;
  const openness = Number.isFinite(shoreDistance) ? clamp(shoreDistance / 5, 0, 1) : 1;
  let regionType = 'openWater';
  if (channelScore >= 0.75) regionType = 'channel';
  else if (bayScore >= 0.6) regionType = 'bayPocket';
  else if (islandAdjacency >= 0.6) regionType = 'islandAdjacent';
  else if (shoreDistance <= 2.2 || cardinalLand > 0) regionType = 'shoreline';
  return {
    regionType,
    dominantRegionBehavior: regionType,
    shoreDistance,
    cardinalLand,
    diagonalLand,
    openness,
    channelScore: clamp(channelScore, 0, 1),
    bayScore: clamp(bayScore, 0, 1),
    islandAdjacency: clamp(islandAdjacency, 0, 1)
  };
}

function makeRegion(id, maskType, behavior, weight, rng) {
  return {
    id,
    maskType,
    behavior,
    weight: Number(weight.toFixed(3)),
    phase: Number((rng() * Math.PI * 2).toFixed(6)),
    speedScale: Number((0.72 + rng() * 0.58).toFixed(3)),
    magnitudeScale: Number((0.78 + rng() * 0.52).toFixed(3))
  };
}

function chooseWeighted(rng, entries) {
  const total = entries.reduce((sum, entry) => sum + Number(entry[1] ?? 0), 0);
  let cursor = rng() * total;
  for (const [value, weight] of entries) {
    cursor -= Number(weight ?? 0);
    if (cursor <= 0) return value;
  }
  return entries.at(-1)?.[0] ?? entries[0]?.[0] ?? 'uniformDrift';
}

function nearestLandDistance({ terrain, x, y, width, height, radius = 5 }) {
  let best = Infinity;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const tx = x + dx;
      const ty = y + dy;
      if (!isLand(terrain, tx, ty, width, height)) continue;
      best = Math.min(best, Math.hypot(dx, dy));
    }
  }
  return best;
}

function isLand(terrain, x, y, width, height) {
  if (x < 0 || y < 0 || x >= width || y >= height) return true;
  return Boolean(terrain[y]?.[x]);
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}
