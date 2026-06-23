import { createOceanCurrentField4D, validateOceanCurrentField4D } from './OceanCurrentField4D.js';
import { normalizeWaterColumnConfig, waterColumnLayerMetadata } from './WaterColumnSchema.js';
import { incrementSimulationLaunchCounter } from '../runtime/SimulationLaunchProfiler.js';

export const SYNTHETIC_CURRENT_CUBE_ADAPTER_VERSION = 'synthetic-current-cube-adapter-flow-r2a-1';
const syntheticCurrentCubeSessionCache = new WeakMap();
const syntheticCurrentCubeSessionStats = { buildCount: 0, cacheHitCount: 0, cacheMissCount: 0 };

export function resetSyntheticCurrentCubeSessionCache() {
  syntheticCurrentCubeSessionStats.buildCount = 0;
  syntheticCurrentCubeSessionStats.cacheHitCount = 0;
  syntheticCurrentCubeSessionStats.cacheMissCount = 0;
}

export function syntheticCurrentCubeSessionCacheSummary() {
  return { ...syntheticCurrentCubeSessionStats };
}

export function getSyntheticCurrentCubeFromMissionWorld(options = {}) {
  const explicit = explicitCurrentFieldFromMissionWorld(options);
  if (explicit) return explicit;
  const level = options.level ?? null;
  if (!level || typeof level !== 'object') return createSyntheticCurrentCubeFromMissionWorld(options);
  const key = syntheticCurrentCubeCacheKey(options);
  let entries = syntheticCurrentCubeSessionCache.get(level);
  if (!entries) {
    entries = new Map();
    syntheticCurrentCubeSessionCache.set(level, entries);
  }
  if (entries.has(key)) {
    syntheticCurrentCubeSessionStats.cacheHitCount += 1;
    return entries.get(key);
  }
  syntheticCurrentCubeSessionStats.cacheMissCount += 1;
  const field = createSyntheticCurrentCubeFromMissionWorld(options);
  entries.set(key, field);
  return field;
}

export function createSyntheticCurrentCubeFromMissionWorld(options = {}) {
  const explicit = explicitCurrentFieldFromMissionWorld(options);
  if (explicit) return explicit;
  syntheticCurrentCubeSessionStats.buildCount += 1;
  incrementSimulationLaunchCounter('currentCubeBuildCount');
  const level = options.level ?? {};
  const baseViewModel = options.baseViewModel ?? {};
  const grid = options.grid ?? baseViewModel.grid ?? level.world?.grid ?? { width: 8, height: 8 };
  const width = Math.max(1, Number(grid.width ?? 8));
  const height = Math.max(1, Number(grid.height ?? 8));
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig ?? level.world?.waterColumnConfig ?? { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' });
  const depthAxisMeters = depthAxis(waterColumnConfig, options.depthAxisMeters);
  const timeAxisSeconds = timeAxis(level, options.timeAxisSeconds);
  const legacyFrames = legacyCurrentFrames(level, baseViewModel, width, height, timeAxisSeconds);
  const preserveLegacy = waterColumnConfig.depthLayerIds.length <= 1 || options.preserveLegacySurfaceOnly === true;
  const seed = finite(options.seed ?? level.meta?.seed ?? level.seed, 29);
  const u = [];
  const v = [];
  for (let ti = 0; ti < timeAxisSeconds.length; ti += 1) {
    const timeU = [];
    const timeV = [];
    for (let zi = 0; zi < depthAxisMeters.length; zi += 1) {
      const factor = preserveLegacy ? { scale: 1, angle: 0, shearU: 0, shearV: 0 } : depthFactor(layerIdAt(waterColumnConfig, zi), zi, depthAxisMeters.length);
      const layerU = [];
      const layerV = [];
      for (let y = 0; y < height; y += 1) {
        const rowU = [];
        const rowV = [];
        for (let x = 0; x < width; x += 1) {
          const base = legacyFrames[ti]?.[y]?.[x] ?? generatedBase(x, y, ti, width, height, timeAxisSeconds.length, seed);
          const pulse = Math.sin((timeAxisSeconds[ti] / Math.max(1, timeAxisSeconds.at(-1) ?? 1)) * Math.PI * 2 + depthAxisMeters[zi] * 0.01 + seed * 0.02);
          const rotated = rotate({ u: base.u + factor.shearU * pulse, v: base.v + factor.shearV * Math.cos(pulse) }, factor.angle);
          rowU.push(round(rotated.u * factor.scale));
          rowV.push(round(rotated.v * factor.scale));
        }
        layerU.push(rowU);
        layerV.push(rowV);
      }
      timeU.push(layerU);
      timeV.push(layerV);
    }
    u.push(timeU);
    v.push(timeV);
  }
  const bottomDepthMeters = bottomDepth(level, width, height, depthAxisMeters);
  const wetMask = wetMaskFromTerrain(level.layers?.terrain ?? baseViewModel.terrain?.values, bottomDepthMeters, width, height);
  return createOceanCurrentField4D({
    id: options.id ?? `synthetic-current-cube-${width}x${height}x${depthAxisMeters.length}x${timeAxisSeconds.length}`,
    label: 'HYCOM-style synthetic current cube',
    grid: { width, height },
    eastAxisMeters: Array.from({ length: width }, (_value, index) => index),
    northAxisMeters: Array.from({ length: height }, (_value, index) => index),
    depthAxisMeters,
    timeAxisSeconds,
    uEastMetersPerSecond: u,
    vNorthMetersPerSecond: v,
    wetMask,
    bottomDepthMeters,
    seed,
    sourceMetadata: {
      sourceType: 'synthetic',
      fieldId: options.id ?? 'hycom-style-synthetic-current-cube',
      label: 'HYCOM-style synthetic current cube',
      adapterVersion: SYNTHETIC_CURRENT_CUBE_ADAPTER_VERSION,
      synthetic: true,
      checkedInFixture: false,
      importedOceanModel: false,
      usesRealHycom: false,
      usesRealMarineCopernicus: false,
      calibratedForecast: false,
      operationalOceanPrediction: false,
      preservesLegacySurfaceOnly: preserveLegacy,
      seed
    },
    boundaryFlags: {
      rendererOwnsCurrent: false,
      displayLayerChangesCurrent: false,
      changesOfficialScoring: false,
      usesNewPlanner: false,
      usesWebGpu: false,
      wetMaskSource: level.layers?.terrain ? 'level.layers.terrain' : 'bottomDepthMeters'
    }
  });
}

export function createSyntheticCurrentCubeFixture(options = {}) {
  return createSyntheticCurrentCubeFromMissionWorld({
    seed: options.seed ?? 41,
    grid: options.grid ?? { width: 6, height: 5 },
    waterColumnConfig: options.waterColumnConfig ?? { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' },
    timeAxisSeconds: options.timeAxisSeconds ?? [0, 600, 1800],
    depthAxisMeters: options.depthAxisMeters ?? [0, 15, 35, 75, 150],
    level: options.level ?? {
      world: { grid: options.grid ?? { width: 6, height: 5 }, time: { duration: 1800, dt: 60 } },
      layers: { terrain: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => false)) },
      bathymetry: { depthMeters: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 220)) }
    }
  });
}

export function syntheticCurrentCubeAdapterSummary(field = {}) {
  return {
    type: 'anchor.science.synthetic-current-cube-adapter-summary',
    version: SYNTHETIC_CURRENT_CUBE_ADAPTER_VERSION,
    fieldId: field.id ?? field.sourceMetadata?.fieldId ?? null,
    sourceType: field.sourceMetadata?.sourceType ?? null,
    depthSampleCount: field.depthAxisMeters?.length ?? 0,
    timeSampleCount: field.timeAxisSeconds?.length ?? 0,
    usesRealHycom: field.sourceMetadata?.usesRealHycom === true,
    usesRealMarineCopernicus: field.sourceMetadata?.usesRealMarineCopernicus === true,
    calibratedForecast: field.sourceMetadata?.calibratedForecast === true
  };
}

function explicitCurrentFieldFromMissionWorld(options = {}) {
  const level = options.level ?? {};
  const field = options.currentField4D
    ?? options.oceanCurrentField4D
    ?? level.currentField4D
    ?? level.oceanCurrentField4D
    ?? level.layers?.currentField4D
    ?? level.layers?.oceanCurrentField4D
    ?? level.layers?.waterColumn?.currentField4D
    ?? level.layers?.waterColumn?.oceanCurrentField4D
    ?? null;
  if (!field) return null;
  const validation = validateOceanCurrentField4D(field);
  if (!validation.valid) {
    const error = new Error(`Canonical current field invalid: ${validation.errors.join('; ') || 'unknown validation failure'}`);
    error.name = 'CanonicalCurrentFieldError';
    error.validation = validation;
    throw error;
  }
  return validation.field;
}

function depthAxis(config, explicit) {
  if (Array.isArray(explicit) && explicit.length) return [...new Set(explicit.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  return [...new Set(config.depthLayerIds.map((id, index) => finite(config.layerMetadata?.[id]?.nominalDepthMeters ?? waterColumnLayerMetadata(id).nominalDepthMeters, index * 50)))].sort((a, b) => a - b);
}

function timeAxis(level, explicit) {
  if (Array.isArray(explicit) && explicit.length) return explicit.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const frameTimes = (level.layers?.truth?.frames ?? []).map((frame, index) => finite(frame.t ?? frame.time, index * finite(level.world?.time?.dt, 60))).filter(Number.isFinite);
  if (frameTimes.length >= 2) return frameTimes;
  const duration = Math.max(600, finite(level.world?.time?.duration, 1800));
  return [0, duration / 2, duration];
}

function legacyCurrentFrames(level, baseViewModel, width, height, timeAxisSeconds) {
  const frames = level.layers?.truth?.frames ?? [];
  if (frames.some((frame) => frame.current)) return timeAxisSeconds.map((time) => gridFromCurrent((nearestFrame(frames, time) ?? frames[0])?.current, width, height));
  if (baseViewModel.vectorFieldLayer?.vectors?.length) return timeAxisSeconds.map(() => gridFromVectors(baseViewModel.vectorFieldLayer.vectors, width, height));
  return timeAxisSeconds.map((_time, ti) => Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => generatedBase(x, y, ti, width, height, timeAxisSeconds.length, 23))));
}

function nearestFrame(frames, time) {
  return frames.reduce((best, frame) => {
    const distance = Math.abs(finite(frame.t ?? frame.time, 0) - time);
    return !best || distance < best.distance ? { frame, distance } : best;
  }, null)?.frame ?? null;
}

function gridFromCurrent(current, width, height) {
  if (Array.isArray(current) && Array.isArray(current[0])) return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => vector(current?.[y]?.[x])));
  if (Array.isArray(current)) return gridFromVectors(current, width, height);
  return Array.from({ length: height }, () => Array.from({ length: width }, () => ({ u: 0, v: 0 })));
}

function gridFromVectors(vectors, width, height) {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => ({ u: 0, v: 0 })));
  for (const item of vectors ?? []) {
    const x = Math.max(0, Math.min(width - 1, Math.round(finite(item.x ?? item.col, 0))));
    const y = Math.max(0, Math.min(height - 1, Math.round(finite(item.y ?? item.row, 0))));
    grid[y][x] = vector(item);
  }
  return grid;
}

function vector(value) {
  if (Array.isArray(value)) return { u: finite(value[0], 0), v: finite(value[1], 0) };
  return { u: finite(value?.u ?? value?.x, 0), v: finite(value?.v ?? value?.y, 0) };
}

function depthFactor(id, index, count) {
  const f = count <= 1 ? 0 : index / (count - 1);
  if (id === 'surface') return { scale: 1, angle: 0, shearU: 0, shearV: 0 };
  if (id === 'thermocline') return { scale: 1.2, angle: -0.28, shearU: 0.025, shearV: 0.015 };
  if (id === 'midwater') return { scale: 0.84, angle: 0.34, shearU: -0.018, shearV: 0.014 };
  if (id === 'deep') return { scale: 0.62, angle: 0.62, shearU: -0.026, shearV: -0.018 };
  return { scale: 1 - f * 0.25, angle: f * 0.3, shearU: 0.01 * f, shearV: -0.006 * f };
}

function layerIdAt(config, index) { return config.depthLayerIds[Math.min(index, config.depthLayerIds.length - 1)] ?? 'surface'; }
function generatedBase(x, y, t, width, height, timeCount, seed) { return { u: 0.17 + 0.08 * Math.sin((x / Math.max(1, width - 1) * 2 + t / Math.max(1, timeCount - 1) + seed * 0.01) * Math.PI), v: -0.05 + 0.07 * Math.cos((y / Math.max(1, height - 1) * 2 - t / Math.max(1, timeCount - 1) + seed * 0.013) * Math.PI) }; }
function rotate(value, radians) { const c = Math.cos(radians); const s = Math.sin(radians); return { u: value.u * c - value.v * s, v: value.u * s + value.v * c }; }
function bottomDepth(level, width, height, depthAxisMeters) { const source = level.bathymetry?.depthMeters ?? level.layers?.bottomDepthMeters ?? level.layers?.depthMeters; const fallback = Math.max(...depthAxisMeters, 150) + 50; return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => Math.max(0, finite(source?.[y]?.[x], level.layers?.terrain?.[y]?.[x] ? 0 : fallback)))); }
function wetMaskFromTerrain(terrain, bottomDepthMeters, width, height) { return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => !Boolean(terrain?.[y]?.[x]) && finite(bottomDepthMeters?.[y]?.[x], 0) > 0)); }
function finite(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function round(value, digits = 6) { const n = Number(value); return Number.isFinite(n) ? Number(n.toFixed(digits)) : null; }

function syntheticCurrentCubeCacheKey(options = {}) {
  const level = options.level ?? {};
  const baseViewModel = options.baseViewModel ?? {};
  const grid = options.grid ?? baseViewModel.grid ?? level.world?.grid ?? { width: 8, height: 8 };
  const waterColumnConfig = normalizeWaterColumnConfig(options.waterColumnConfig ?? level.world?.waterColumnConfig ?? { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' });
  const explicitDepth = Array.isArray(options.depthAxisMeters) ? options.depthAxisMeters.join(',') : '';
  const explicitTime = Array.isArray(options.timeAxisSeconds) ? options.timeAxisSeconds.join(',') : '';
  return stable({
    width: Number(grid.width ?? 8),
    height: Number(grid.height ?? 8),
    layerIds: waterColumnConfig.depthLayerIds,
    defaultLayerIds: waterColumnConfig.defaultLayerIds,
    diveProfileId: waterColumnConfig.diveProfileId,
    duration: level.world?.time?.duration ?? null,
    dt: level.world?.time?.dt ?? null,
    seed: options.seed ?? level.meta?.seed ?? level.seed ?? 29,
    depth: explicitDepth,
    time: explicitTime,
    preserveLegacySurfaceOnly: options.preserveLegacySurfaceOnly === true
  });
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}