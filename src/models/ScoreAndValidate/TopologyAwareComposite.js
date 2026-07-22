const SeededRng = require('./SeededRng.js')
const TOPOLOGY_COMPOSITE_SCHEMA_VERSION = '1.1';

const REGION_TYPES = ['openWater', 'shoreline', 'channel', 'bayPocket', 'islandAdjacent'];

 function buildTopologyAwareCompositeConfig({
  terrain = [],
  width = 1,
  height = 1,
  seed = 'anchor-current',
  challengeId = null,
  generationVersion = 'anchor-generator-v1',
  randomness = 'medium',
  dynamicComplexity = randomness
} = {}) {
  const rng = SeededRng.createSeededRng(`${challengeId ?? seed}:current:topology-composite:${generationVersion}`);
  const summary = summarizeTopologyRegions({ terrain, width, height });
  const complexity = normalizeDynamicComplexity(dynamicComplexity);
  const profile = complexityProfile(complexity);
  const regions = [
    makeRegion('open-water-jet', 'openWater', chooseWeighted(rng, [
      ['meanderingJet', 0.45],
      ['movingMeanderingJet', 0.35],
      ['rotatingDrift', 0.12],
      ['advectedCurlTexture', 0.08]
    ]), 0.42 + rng() * 0.18 * profile.weightJitter, rng, profile),
    makeRegion('open-water-gyre', 'openWater', chooseWeighted(rng, [
      ['movingGyre', 0.5],
      ['doubleGyre', 0.28],
      ['advectedCurlTexture', 0.22]
    ]), profile.secondaryWeight * (0.28 + rng() * 0.16), rng, profile),
    makeRegion('shoreline-primary', 'shoreline', chooseWeighted(rng, [
      ['variableAlongShoreFlow', 0.55],
      ['alongShoreFlow', 0.2],
      ['shorelinePulse', 0.15],
      ['advectedCurlTexture', 0.1]
    ]), 0.34 + rng() * 0.18 * profile.weightJitter, rng, profile),
    makeRegion('shoreline-pulse', 'shoreline', chooseWeighted(rng, [
      ['shorelinePulse', 0.45],
      ['variableAlongShoreFlow', 0.35],
      ['tidalOscillation', 0.2]
    ]), profile.secondaryWeight * (0.2 + rng() * 0.14), rng, profile),
    makeRegion('channels-primary', 'channel', chooseWeighted(rng, [
      ['reversingChannelJet', 0.55],
      ['channelJet', 0.35],
      ['advectedCurlTexture', 0.1]
    ]), 0.42 + rng() * 0.22 * profile.weightJitter, rng, profile),
    makeRegion('bays-recirculation', 'bayPocket', chooseWeighted(rng, [
      ['bayRecirculation', 0.52],
      ['flushingPulse', 0.28],
      ['eddyField', 0.2]
    ]), 0.24 + rng() * 0.16 * profile.weightJitter, rng, profile),
    makeRegion('island-wakes-primary', 'islandAdjacent', chooseWeighted(rng, [
      ['eddyPairWake', 0.42],
      ['islandWake', 0.32],
      ['turbulentWakeTexture', 0.18],
      ['movingGyre', 0.08]
    ]), 0.34 + rng() * 0.2 * profile.weightJitter, rng, profile)
  ].filter((region) => profile.includeSecondary || !region.id.includes('pulse') && !region.id.includes('gyre'));
  const assignedBehaviors = Object.fromEntries(REGION_TYPES.map((type) => [
    type,
    regions.filter((region) => region.maskType === type).map((region) => region.behavior)
  ]));
  return {
    schemaVersion: TOPOLOGY_COMPOSITE_SCHEMA_VERSION,
    label: 'Topology-Aware Composite',
    description: 'Synthetic topology-aware ocean-inspired current field with seeded dynamic regional behavior. Not validated CFD or HYCOM forecast data.',
    seed: String(seed),
    challengeId: challengeId ? String(challengeId) : null,
    generationVersion,
    randomness: complexity,
    dynamicComplexity: complexity,
    evolutionBehavior: {
      movingStructures: profile.movingStructures,
      directionVariationScale: profile.directionScale,
      magnitudeVariationScale: profile.magnitudeScale,
      shorelineVariability: profile.shorelineScale,
      wakeStrength: profile.wakeScale,
      pulseStrength: profile.pulseScale
    },
    summary,
    assignedBehaviors,
    regions
  };
}

 function summarizeTopologyRegions({ terrain = [], width = 1, height = 1 } = {}) {
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

 function classifyTopologyRegionAtCell({ terrain = [], x = 0, y = 0, width = 1, height = 1 } = {}) {
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

function makeRegion(id, maskType, behavior, weight, rng, profile = complexityProfile('medium')) {
  return {
    id,
    maskType,
    behavior,
    weight: Number(weight.toFixed(3)),
    phase: Number((rng() * Math.PI * 2).toFixed(6)),
    speedScale: Number((profile.speedMin + rng() * (profile.speedMax - profile.speedMin)).toFixed(3)),
    magnitudeScale: Number((profile.magnitudeMin + rng() * (profile.magnitudeMax - profile.magnitudeMin)).toFixed(3)),
    driftRadius: Number((profile.driftRadius * (0.65 + rng() * 0.7)).toFixed(3)),
    meanderAmplitude: Number((profile.meanderAmplitude * (0.7 + rng() * 0.65)).toFixed(3)),
    pulseScale: Number((profile.pulseScale * (0.65 + rng() * 0.7)).toFixed(3)),
    textureScale: Number((profile.textureScale * (0.7 + rng() * 0.6)).toFixed(3))
  };
}

 function normalizeDynamicComplexity(value = 'medium') {
  if (value === 'off') return 'low';
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric >= 0.7 ? 'high' : numeric <= 0.35 ? 'low' : 'medium';
  return 'medium';
}

function complexityProfile(value = 'medium') {
  const complexity = normalizeDynamicComplexity(value);
  if (complexity === 'low') {
    return {
      includeSecondary: false,
      movingStructures: 'slow',
      directionScale: 0.45,
      magnitudeScale: 0.42,
      shorelineScale: 0.42,
      wakeScale: 0.5,
      pulseScale: 0.35,
      textureScale: 0.35,
      secondaryWeight: 0.45,
      weightJitter: 0.45,
      driftRadius: 0.035,
      meanderAmplitude: 0.08,
      speedMin: 0.55,
      speedMax: 0.95,
      magnitudeMin: 0.72,
      magnitudeMax: 1.05
    };
  }
  if (complexity === 'high') {
    return {
      includeSecondary: true,
      movingStructures: 'strong',
      directionScale: 1.05,
      magnitudeScale: 1.08,
      shorelineScale: 1.05,
      wakeScale: 1.15,
      pulseScale: 1.05,
      textureScale: 1.0,
      secondaryWeight: 0.88,
      weightJitter: 1,
      driftRadius: 0.13,
      meanderAmplitude: 0.24,
      speedMin: 0.75,
      speedMax: 1.75,
      magnitudeMin: 0.82,
      magnitudeMax: 1.58
    };
  }
  return {
    includeSecondary: true,
    movingStructures: 'moderate',
    directionScale: 0.75,
    magnitudeScale: 0.78,
    shorelineScale: 0.72,
    wakeScale: 0.78,
    pulseScale: 0.7,
    textureScale: 0.68,
    secondaryWeight: 0.68,
    weightJitter: 0.72,
    driftRadius: 0.08,
    meanderAmplitude: 0.16,
    speedMin: 0.65,
    speedMax: 1.28,
    magnitudeMin: 0.76,
    magnitudeMax: 1.28
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

module.exports = {buildTopologyAwareCompositeConfig, summarizeTopologyRegions, classifyTopologyRegionAtCell, normalizeDynamicComplexity}