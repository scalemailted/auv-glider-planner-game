import { sampleGeneratedCurrent } from '../generation/CurrentFieldGenerator.js';
import { getVectorPresetConfig } from '../generation/VectorFieldPresets.js';
import { normalizeBoundaryConditions } from '../generation/FlowFieldConfig.js';
import { classifyTopologyRegionAtCell } from '../generation/TopologyAwareComposite.js';

export const CURRENT_COORDINATES = {
  GRID: 'grid',
  NORMALIZED: 'normalized'
};

export function sampleCurrentField({
  x = 0,
  y = 0,
  time = 0,
  frame = null,
  level = null,
  grid = null,
  coordinates = CURRENT_COORDINATES.GRID,
  preset = null,
  config = {},
  terrain = null
} = {}) {
  const resolvedGrid = grid ?? level?.world?.grid ?? {
    width: Number(config.width ?? 1),
    height: Number(config.height ?? 1)
  };
  const width = Math.max(1, Number(resolvedGrid.width ?? 1));
  const height = Math.max(1, Number(resolvedGrid.height ?? 1));
  const point = coordinates === CURRENT_COORDINATES.NORMALIZED
    ? normalizedToGridCell({ x, y, width, height })
    : {
        x: clamp(Number(x), 0, width - 1),
        y: clamp(Number(y), 0, height - 1)
      };
  const cx = Math.round(point.x);
  const cy = Math.round(point.y);
  const terrainLayer = terrain ?? config.terrain ?? level?.layers?.terrain;
  const levelCurrentFieldConfig = level?.meta?.generationConfig?.currentFieldConfig
    ?? level?.meta?.generationConfig?.currentField
    ?? null;
  const resolvedCurrentFieldConfig = config.currentFieldConfig
    ?? (config.fieldMode || config.basePreset ? config : null)
    ?? levelCurrentFieldConfig;
  const boundaryConditions = normalizeBoundaryConditions(config.boundaryConditions
    ?? resolvedCurrentFieldConfig?.boundaryConditions
    ?? level?.meta?.generationConfig?.importedFlowField?.boundaryConditions
    ?? {});

  let sample;
  if (frame?.current) {
    sample = normalizeCurrentVector(frame.current?.[cy]?.[cx], {
      confidence: sampleConfidence(frame, cx, cy),
      source: frame.source ?? 'frame',
      x: cx,
      y: cy,
      coordinates: 'grid-cell'
    });
    return debugCurrentSampleContributors(debugTopologyCurrentAudit(enrichCurrentSampleMetadata(annotateTopologyComposite(applyTopologyAdjustment(sample, { terrain: terrainLayer, x: cx, y: cy, width, height, boundaryConditions }), {
      terrain: terrainLayer,
      x: cx,
      y: cy,
      width,
      height,
      config,
      level
    }), {
      x: cx,
      y: cy,
      time,
      width,
      height,
      terrain: terrainLayer,
      level,
      fieldConfig: resolvedCurrentFieldConfig,
      boundaryConditions
    }), { x: cx, y: cy, time }), { x: cx, y: cy, time });
  }

  const presetConfig = preset ? getVectorPresetConfig(preset, config) : {};
  const generatorConfig = {
    ...presetConfig,
    ...config,
    currentFieldConfig: resolvedCurrentFieldConfig,
    terrain: terrainLayer,
    width,
    height,
    currentPattern: config.currentPattern ?? config.pattern ?? config.currentGenerator?.currentPattern ?? presetConfig.currentPattern,
    pattern: config.pattern ?? config.currentPattern ?? config.currentGenerator?.currentPattern ?? presetConfig.currentPattern,
    currentStrength: config.currentStrength ?? config.strength ?? config.currentGenerator?.strength ?? presetConfig.strength,
    strength: config.strength ?? config.currentStrength ?? config.currentGenerator?.strength ?? presetConfig.strength,
    currentVariability: config.currentVariability ?? config.variability ?? config.currentGenerator?.variability ?? presetConfig.variability,
    variability: config.variability ?? config.currentVariability ?? config.currentGenerator?.variability ?? presetConfig.variability,
    temporalEvolution: config.temporalEvolution ?? config.currentGenerator?.temporalEvolution ?? presetConfig.temporalEvolution
  };

  sample = normalizeCurrentVector(sampleGeneratedCurrent({
    x: point.x,
    y: point.y,
    width,
    height,
    time,
    config: generatorConfig
  }), {
    confidence: 1,
    source: 'generated-preset',
    x: cx,
    y: cy,
    coordinates: 'grid-cell'
  });
  return debugCurrentSampleContributors(debugTopologyCurrentAudit(enrichCurrentSampleMetadata(annotateTopologyComposite(applyTopologyAdjustment(sample, { terrain: terrainLayer, x: cx, y: cy, width, height, boundaryConditions }), {
    terrain: terrainLayer,
    x: cx,
    y: cy,
    width,
    height,
    config,
    level
  }), {
    x: cx,
    y: cy,
    time,
    width,
    height,
    terrain: terrainLayer,
    level,
    fieldConfig: resolvedCurrentFieldConfig,
    boundaryConditions
  }), { x: cx, y: cy, time }), { x: cx, y: cy, time });
}

export function sampleCurrentVector(options = {}) {
  const sample = sampleCurrentField(options);
  return [sample.u, sample.v];
}

export function gridToNormalized({ x = 0, y = 0, width = 1, height = 1 } = {}) {
  return {
    x: Number(width) > 1 ? clamp(Number(x), 0, Number(width) - 1) / (Number(width) - 1) : 0,
    y: Number(height) > 1 ? clamp(Number(y), 0, Number(height) - 1) / (Number(height) - 1) : 0
  };
}

export function normalizedToGridCell({ x = 0, y = 0, width = 1, height = 1 } = {}) {
  return {
    x: Math.round(clamp(Number(x), 0, 1) * Math.max(0, Number(width) - 1)),
    y: Math.round(clamp(Number(y), 0, 1) * Math.max(0, Number(height) - 1))
  };
}

export function normalizeCurrentVector(vector, metadata = {}) {
  const u = finiteNumber(Array.isArray(vector) ? vector[0] : vector?.u, 0);
  const v = finiteNumber(Array.isArray(vector) ? vector[1] : vector?.v, 0);
  return {
    u,
    v,
    magnitude: Math.hypot(u, v),
    confidence: finiteNumber(metadata.confidence, 1),
    source: metadata.source ?? 'unknown',
    x: metadata.x ?? null,
    y: metadata.y ?? null,
    coordinates: metadata.coordinates ?? null,
    contributors: metadata.contributors ?? {
      base: { u, v },
      topologyAdjustment: null,
      shorelineRisk: null
    }
  };
}

export function estimateTopologyAtCell({ terrain = null, x = 0, y = 0, width = 1, height = 1, radius = 3 } = {}) {
  const cx = Math.round(Number(x));
  const cy = Math.round(Number(y));
  if (!terrain || !Array.isArray(terrain)) {
    return {
      available: false,
      land: false,
      shoreDistance: Infinity,
      nearestLand: null,
      directionToLand: null
    };
  }
  if (!inside(cx, cy, width, height)) {
    return {
      available: true,
      land: true,
      shoreDistance: 0,
      nearestLand: null,
      directionToLand: null
    };
  }
  if (terrain[cy]?.[cx]) {
    return {
      available: true,
      land: true,
      shoreDistance: 0,
      nearestLand: { x: cx, y: cy },
      directionToLand: { x: 0, y: 0 }
    };
  }
  let best = null;
  const boundedRadius = Math.max(1, Math.ceil(Number(radius) || 3));
  for (let dy = -boundedRadius; dy <= boundedRadius; dy += 1) {
    for (let dx = -boundedRadius; dx <= boundedRadius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const tx = cx + dx;
      const ty = cy + dy;
      if (!inside(tx, ty, width, height) || !terrain[ty]?.[tx]) continue;
      const distance = Math.hypot(dx, dy);
      if (distance > boundedRadius) continue;
      if (!best || distance < best.distance) best = { x: tx, y: ty, distance };
    }
  }
  if (!best) {
    return {
      available: true,
      land: false,
      shoreDistance: Infinity,
      nearestLand: null,
      directionToLand: null
    };
  }
  const directionToLand = normalize(best.x - cx, best.y - cy);
  return {
    available: true,
    land: false,
    shoreDistance: best.distance,
    nearestLand: { x: best.x, y: best.y },
    directionToLand
  };
}

function applyTopologyAdjustment(sample, { terrain = null, x = 0, y = 0, width = 1, height = 1, boundaryConditions = {} } = {}) {
  const boundary = normalizeBoundaryConditions(boundaryConditions);
  const topology = estimateTopologyAtCell({ terrain, x, y, width, height, radius: boundary.shoreRiskRadius });
  const base = { u: sample.u, v: sample.v };
  if (!boundary.topologyAware || boundary.mode === 'none' || !topology.available) {
    return {
      ...sample,
      contributors: {
        ...(sample.contributors ?? {}),
        base,
        topologyAdjustment: { applied: false, reason: boundary.mode === 'none' ? 'boundary-mode-none' : 'terrain-unavailable', boundaryMode: boundary.mode },
        shorelineRisk: null
      }
    };
  }
  if (topology.land) {
    return {
      ...sample,
      u: 0,
      v: 0,
      magnitude: 0,
      confidence: 0,
      contributors: {
        ...(sample.contributors ?? {}),
        base,
          topologyAdjustment: { applied: true, reason: 'land-cell', method: 'zero-land-current', boundaryMode: boundary.mode },
        shorelineRisk: {
          level: 'blocked',
          value: 1,
          shoreDistance: 0,
          currentTowardLand: 0,
          nearestLand: topology.nearestLand,
          directionToLand: topology.directionToLand
        }
      }
    };
  }
  if (!Number.isFinite(topology.shoreDistance)) {
    return {
      ...sample,
      contributors: {
        ...(sample.contributors ?? {}),
        base,
        topologyAdjustment: { applied: false, reason: 'open-water', boundaryMode: boundary.mode },
        shorelineRisk: {
          level: 'none',
          value: 0,
          shoreDistance: Infinity,
          currentTowardLand: 0,
          nearestLand: null,
          directionToLand: null
        }
      }
    };
  }
  const nx = topology.directionToLand?.x ?? 0;
  const ny = topology.directionToLand?.y ?? 0;
  const currentTowardLand = base.u * nx + base.v * ny;
  const nearScale = clamp((3 - topology.shoreDistance) / 3, 0, 1);
  const inward = Math.max(0, currentTowardLand);
  const parallelMagnitude = Math.abs(base.u * -ny + base.v * nx);
  const riskValue = clamp(
    nearScale * (
      inward > 0.16 ? 0.9
        : inward > 0.08 ? 0.62
          : parallelMagnitude > 0.35 ? 0.28
            : 0.14
    ),
    0,
    1
  );
  const damp = inward > 0 ? Math.min(0.92, nearScale * boundary.dampenIntoLand) : 0;
  const tangentialSign = (base.u * -ny + base.v * nx) >= 0 ? 1 : -1;
  const deflect = boundary.mode === 'deflectAlongShore' || boundary.mode === 'wakeApproximation'
    ? inward * nearScale * boundary.deflectStrength
    : 0;
  const shouldAdjust = inward > 0 && boundary.mode !== 'riskOnly';
  const adjusted = shouldAdjust
    ? {
        u: base.u - nx * inward * damp + (-ny) * deflect * tangentialSign,
        v: base.v - ny * inward * damp + nx * deflect * tangentialSign
      }
    : base;
  const riskLevel = riskValue >= 0.7 ? 'high' : riskValue >= 0.35 ? 'medium' : riskValue > 0 ? 'low' : 'none';
  const topologyAdjustment = {
    applied: shouldAdjust,
    method: shouldAdjust
      ? (deflect > 0 ? 'dampen-inward-deflect-along-shore' : 'dampen-inward-current')
      : 'risk-label-only',
    boundaryMode: boundary.mode,
    original: base,
    adjusted,
    shoreDistance: topology.shoreDistance,
    currentTowardLand,
    topologyAdjusted: shouldAdjust
  };
  return {
    ...sample,
    u: adjusted.u,
    v: adjusted.v,
    magnitude: Math.hypot(adjusted.u, adjusted.v),
    contributors: {
      ...(sample.contributors ?? {}),
      base,
      topologyAdjustment,
      shorelineRisk: {
        level: riskLevel,
        value: riskValue,
        shoreDistance: topology.shoreDistance,
        nearestLand: topology.nearestLand,
        directionToLand: topology.directionToLand,
        currentTowardLand,
        currentMagnitude: Math.hypot(base.u, base.v),
        topologyAdjusted: shouldAdjust,
        boundaryMode: boundary.mode
      }
    }
  };
}

function annotateTopologyComposite(sample, { terrain = null, x = 0, y = 0, width = 1, height = 1, config = {}, level = null } = {}) {
  const fieldConfig = config.currentFieldConfig
    ?? level?.meta?.generationConfig?.currentFieldConfig
    ?? level?.meta?.generationConfig?.currentField
    ?? null;
  const composite = fieldConfig?.topologyComposite;
  if (!composite || !terrain) return sample;
  const classification = classifyTopologyRegionAtCell({ terrain, x, y, width, height });
  const dominantRegion = composite.regions?.find((region) => region.maskType === classification.regionType) ?? null;
  return {
    ...sample,
    contributors: {
      ...(sample.contributors ?? {}),
      topologyComposite: {
        schemaVersion: composite.schemaVersion ?? '1.0',
        dynamicComplexity: composite.dynamicComplexity ?? composite.randomness ?? null,
        regionType: classification.regionType,
        dominantRegionBehavior: dominantRegion?.behavior ?? classification.dominantRegionBehavior,
        regionId: dominantRegion?.id ?? null,
        weight: dominantRegion?.weight ?? null,
        shoreDistance: classification.shoreDistance,
        openness: classification.openness,
        channelScore: classification.channelScore,
        bayScore: classification.bayScore,
        islandAdjacency: classification.islandAdjacency,
        description: composite.description ?? 'Synthetic topology-aware ocean-inspired current field.'
      }
    }
  };
}

function enrichCurrentSampleMetadata(sample, {
  x = 0,
  y = 0,
  time = 0,
  width = 1,
  height = 1,
  terrain = null,
  level = null,
  fieldConfig = null,
  boundaryConditions = {}
} = {}) {
  const topology = terrain
    ? classifyTopologyRegionAtCell({ terrain, x, y, width, height })
    : null;
  const composite = sample.contributors?.topologyComposite ?? null;
  const risk = sample.contributors?.shorelineRisk ?? null;
  const adjustment = sample.contributors?.topologyAdjustment ?? null;
  const directionToLand = risk?.directionToLand ?? null;
  const normalTowardLand = Number(risk?.currentTowardLand ?? 0);
  const tangent = directionToLand ? { x: -directionToLand.y, y: directionToLand.x } : null;
  const tangentialComponent = tangent ? sample.u * tangent.x + sample.v * tangent.y : 0;
  const hazardExposure = sampleHazardExposure(level, x, y);
  const channelAxis = topology?.regionType === 'channel'
    ? estimateChannelAxis({ terrain, x, y, width, height })
    : null;
  const metadata = {
    fieldMode: fieldConfig?.fieldMode ?? null,
    preset: fieldConfig?.basePreset ?? null,
    evolutionBehavior: fieldConfig?.evolutionBehavior ?? null,
    dynamicComplexity: composite?.dynamicComplexity ?? fieldConfig?.dynamicComplexity ?? null,
    topologyRegion: composite?.regionType ?? topology?.regionType ?? null,
    dominantBehavior: composite?.dominantRegionBehavior ?? topology?.dominantRegionBehavior ?? null,
    contributors: sample.contributors ?? {},
    shoreDistance: risk?.shoreDistance ?? topology?.shoreDistance ?? null,
    directionToLand,
    normalTowardLand,
    tangentialComponent,
    shorelineRisk: risk?.value ?? 0,
    topologyAdjusted: Boolean(adjustment?.topologyAdjusted),
    boundaryMode: adjustment?.boundaryMode ?? normalizeBoundaryConditions(boundaryConditions).mode,
    hazardExposure,
    channelAxis
  };
  return {
    ...sample,
    directionRadians: Math.atan2(sample.v, sample.u),
    fieldMode: metadata.fieldMode,
    preset: metadata.preset,
    evolutionBehavior: metadata.evolutionBehavior,
    dynamicComplexity: metadata.dynamicComplexity,
    topologyRegion: metadata.topologyRegion,
    dominantBehavior: metadata.dominantBehavior,
    shoreDistance: metadata.shoreDistance,
    directionToLand: metadata.directionToLand,
    normalTowardLand: metadata.normalTowardLand,
    tangentialComponent: metadata.tangentialComponent,
    shorelineRisk: metadata.shorelineRisk,
    topologyAdjusted: metadata.topologyAdjusted,
    boundaryMode: metadata.boundaryMode,
    hazardExposure: metadata.hazardExposure,
    channelAxis: metadata.channelAxis,
    contributors: {
      ...(sample.contributors ?? {}),
      topologyMetadata: metadata
    }
  };
}

function debugCurrentSampleContributors(sample, { x = 0, y = 0, time = 0 } = {}) {
  if (!globalThis.ANCHOR_DEBUG_CURRENT_COMPLEXITY) return sample;
  console.debug('[CurrentField][SampleContributors]', {
    position: { x, y },
    missionTime: Number(time) || 0,
    finalVector: { u: sample.u, v: sample.v },
    magnitude: sample.magnitude,
    contributors: sample.contributors,
    dominantBehavior: sample.contributors?.topologyComposite?.dominantRegionBehavior ?? null,
    shorelineRisk: sample.contributors?.shorelineRisk ?? null
  });
  return sample;
}

function debugTopologyCurrentAudit(sample, { x = 0, y = 0, time = 0, terrain = null, width = 1, height = 1 } = {}) {
  if (!globalThis.ANCHOR_DEBUG_TOPOLOGY_CURRENT_AUDIT) return sample;
  const regionType = sample.topologyRegion ?? 'unknown';
  const key = `${Math.round(Number(time) * 10) / 10}:${regionType}`;
  const audit = globalThis.__ANCHOR_TOPOLOGY_CURRENT_AUDIT ??= new Map();
  const bucket = audit.get(key) ?? {
    time: Number(time) || 0,
    regionType,
    sampleCount: 0,
    magnitudeSum: 0,
    maxMagnitude: 0,
    sinSum: 0,
    cosSum: 0,
    shorelineRiskSum: 0,
    topologyAdjustedCount: 0,
    dominantBehaviors: {}
  };
  bucket.sampleCount += 1;
  bucket.magnitudeSum += Number(sample.magnitude ?? 0);
  bucket.maxMagnitude = Math.max(bucket.maxMagnitude, Number(sample.magnitude ?? 0));
  bucket.sinSum += Math.sin(Number(sample.directionRadians ?? 0));
  bucket.cosSum += Math.cos(Number(sample.directionRadians ?? 0));
  bucket.shorelineRiskSum += Number(sample.shorelineRisk ?? 0);
  if (sample.topologyAdjusted) bucket.topologyAdjustedCount += 1;
  const behavior = sample.dominantBehavior ?? 'unknown';
  bucket.dominantBehaviors[behavior] = Number(bucket.dominantBehaviors[behavior] ?? 0) + 1;
  audit.set(key, bucket);

  if (bucket.sampleCount === 1 || bucket.sampleCount % 64 === 0) {
    const resultant = Math.hypot(bucket.sinSum, bucket.cosSum) / Math.max(1, bucket.sampleCount);
    console.debug('[CurrentAudit][RegionStats]', {
      time: bucket.time,
      regionType: bucket.regionType,
      sampleCount: bucket.sampleCount,
      meanMagnitude: round(bucket.magnitudeSum / bucket.sampleCount, 4),
      maxMagnitude: round(bucket.maxMagnitude, 4),
      directionVariance: round(1 - resultant, 4),
      meanShorelineRisk: round(bucket.shorelineRiskSum / bucket.sampleCount, 4),
      topologyAdjustedCount: bucket.topologyAdjustedCount,
      dominantBehaviors: bucket.dominantBehaviors
    });
  }

  const suspicious = suspiciousTopologyCurrentSample(sample, { x, y, terrain, width, height });
  if (suspicious) {
    console.warn('[CurrentAudit][SuspiciousSample]', {
      reason: suspicious,
      x,
      y,
      regionType,
      vector: { u: sample.u, v: sample.v, magnitude: sample.magnitude },
      shoreDistance: sample.shoreDistance,
      directionToLand: sample.directionToLand,
      normalTowardLand: sample.normalTowardLand,
      boundaryMode: sample.boundaryMode,
      dominantBehavior: sample.dominantBehavior,
      topologyAdjusted: sample.topologyAdjusted
    });
  }
  return sample;
}

function suspiciousTopologyCurrentSample(sample, { x = 0, y = 0, terrain = null, width = 1, height = 1 } = {}) {
  const cx = Math.round(Number(x));
  const cy = Math.round(Number(y));
  if (terrain?.[cy]?.[cx] && Number(sample.magnitude ?? 0) > 0.01) return 'land cell has nonzero visible current';
  if (Number(sample.shoreDistance ?? Infinity) <= 1.5 && Number(sample.normalTowardLand ?? 0) > 0.18 && Number(sample.shorelineRisk ?? 0) < 0.35) {
    return 'strong vector into nearby land with low shoreline risk';
  }
  if (Number(sample.shoreDistance ?? Infinity) <= 1.5 && Number(sample.normalTowardLand ?? 0) > 0.18 && sample.boundaryMode !== 'riskOnly' && !sample.topologyAdjusted) {
    return 'near-shore into-land current was not topology adjusted';
  }
  if (sample.topologyRegion === 'channel' && sample.channelAxis && Number(sample.magnitude ?? 0) > 0.15) {
    const alignment = Math.abs(sample.u * sample.channelAxis.x + sample.v * sample.channelAxis.y) / Math.max(1e-6, Number(sample.magnitude ?? 0));
    if (alignment < 0.35) return 'channel vector mostly perpendicular to channel axis';
  }
  if (sample.topologyRegion === 'bayPocket' && Number(sample.magnitude ?? 0) > 1.25 && Number(sample.shorelineRisk ?? 0) < 0.2) {
    return 'bay pocket has high open-water magnitude without risk explanation';
  }
  return null;
}

function estimateChannelAxis({ terrain = null, x = 0, y = 0, width = 1, height = 1 } = {}) {
  const cx = Math.round(Number(x));
  const cy = Math.round(Number(y));
  const eastWestLand = Boolean(isLand(terrain, cx - 1, cy, width, height) || isLand(terrain, cx + 1, cy, width, height));
  const northSouthLand = Boolean(isLand(terrain, cx, cy - 1, width, height) || isLand(terrain, cx, cy + 1, width, height));
  if (eastWestLand && !northSouthLand) return { x: 0, y: 1 };
  return { x: 1, y: 0 };
}

function sampleHazardExposure(level, x, y) {
  const grid = level?.world?.grid ?? {};
  const cx = clampIndex(x, Number(grid.width ?? 1));
  const cy = clampIndex(y, Number(grid.height ?? 1));
  return Number(level?.layers?.hazards?.[cy]?.[cx] ?? 0);
}

function isLand(terrain, x, y, width, height) {
  if (!terrain) return false;
  if (x < 0 || y < 0 || x >= Number(width) || y >= Number(height)) return true;
  return Boolean(terrain[y]?.[x]);
}

function normalize(x, y) {
  const magnitude = Math.hypot(Number(x), Number(y));
  if (!Number.isFinite(magnitude) || magnitude <= 1e-9) return { x: 0, y: 0 };
  return { x: Number(x) / magnitude, y: Number(y) / magnitude };
}

function inside(x, y, width, height) {
  return x >= 0 && y >= 0 && x < Number(width) && y < Number(height);
}

function sampleConfidence(frame, x, y) {
  const value = frame?.confidence?.[y]?.[x] ?? frame?.forecastConfidence ?? 1;
  return clamp(finiteNumber(value, 1), 0, 1);
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(Math.max(0, Number(max) - 1), Math.round(Number(value) || 0)));
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(Number(value ?? 0) * factor) / factor;
}
