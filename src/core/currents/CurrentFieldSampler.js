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
  const boundaryConditions = normalizeBoundaryConditions(config.boundaryConditions
    ?? config.currentFieldConfig?.boundaryConditions
    ?? level?.meta?.generationConfig?.currentFieldConfig?.boundaryConditions
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
    return annotateTopologyComposite(applyTopologyAdjustment(sample, { terrain: terrainLayer, x: cx, y: cy, width, height, boundaryConditions }), {
      terrain: terrainLayer,
      x: cx,
      y: cy,
      width,
      height,
      config,
      level
    });
  }

  const presetConfig = preset ? getVectorPresetConfig(preset, config) : {};
  const generatorConfig = {
    ...presetConfig,
    ...config,
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
  return annotateTopologyComposite(applyTopologyAdjustment(sample, { terrain: terrainLayer, x: cx, y: cy, width, height, boundaryConditions }), {
    terrain: terrainLayer,
    x: cx,
    y: cy,
    width,
    height,
    config,
    level
  });
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
