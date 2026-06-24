import { getFrameAtTime } from '../time/MissionTime.js';
import { normalizeROIValue, roiScalar } from './ROIValue.js';
import { depthEnergyMultiplier, sampleDepth } from './DepthLayer.js';
import { mobileHazardAt } from './MobileHazards.js';
import { isPointNavigable } from '../planning/Navigability.js';
import { sampleCurrentVector } from '../currents/CurrentFieldSampler.js';
import { getSyntheticCurrentCubeFromMissionWorld } from '../science/SyntheticCurrentCubeAdapter.js';
import { getOceanCurrentSampler, getOceanCurrentSamplerRuntimeCounters } from '../science/OceanCurrentFieldSampler.js';
import { markSimulationLaunchStage, completeSimulationLaunchStage, incrementSimulationLaunchCounter, setSimulationLaunchCurrentField } from '../runtime/SimulationLaunchProfiler.js';
import { sampleScalarFieldContinuous, sampleVectorFieldContinuous } from '../science/VolumetricFieldSampler.js';
import { normalizeWaterColumnConfig, waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';

export class TruthWorld {
  constructor(level, mission = null) {
    this.level = level;
    this.mission = mission;
    this.grid = level.world.grid;
    this.time = level.world.time;
    this.frames = level.layers?.truth?.frames ?? [];
    this.lastVolumetricCurrentSample = null;
    this.lastOceanCurrentSample = null;
    markSimulationLaunchStage('resolveCurrentSource');
    this.currentField4D = getSyntheticCurrentCubeFromMissionWorld({ level, waterColumnConfig: this.waterColumnConfig() });
    completeSimulationLaunchStage('resolveCurrentSource');
    if (this.currentField4D) setSimulationLaunchCurrentField(this.currentField4D);
    const samplerCreateCountBefore = getOceanCurrentSamplerRuntimeCounters().samplerCreateCount;
    this.currentSampler = this.currentField4D ? getOceanCurrentSampler(this.currentField4D, { interpolation: 'linear4d' }) : null;
    const samplerCreateCountAfter = getOceanCurrentSamplerRuntimeCounters().samplerCreateCount;
    const samplerCreateDelta = Math.max(0, samplerCreateCountAfter - samplerCreateCountBefore);
    if (samplerCreateDelta > 0) incrementSimulationLaunchCounter('currentSamplerCreateCount', samplerCreateDelta);
    this.lastVolumetricRoiSample = null;
  }

  getFrame(t) {
    return getFrameAtTime(this.frames, t, this.time.dt || 1);
  }

  sampleCurrent(x, y, t, depthMeters = 0) {
    const volumetric = this.sampleVolumetricCurrent(x, y, t, depthMeters);
    if (volumetric) return [volumetric.u, volumetric.v];
    const frame = this.getFrame(t);
    return sampleCurrentVector({ frame, level: this.level, x, y, time: t });
  }

  sampleVolumetricCurrent(x, y, t, depthMeters = 0) {
    const oceanField = this.currentField4D ?? null;
    if (oceanField) {
      const oceanSample = (this.currentSampler ?? getOceanCurrentSampler(oceanField, { interpolation: 'linear4d' })).sample({ eastMeters: x, northMeters: y, depthMeters, timeSeconds: t, interpolation: 'linear4d' });
      incrementSimulationLaunchCounter('currentSampleCallCount');
      this.lastOceanCurrentSample = oceanSample;
      if (oceanSample.wet === true || oceanSample.masked === true) {
        this.lastVolumetricCurrentSample = { ...oceanSample, u: oceanSample.uEastMetersPerSecond, v: oceanSample.vNorthMetersPerSecond, vector: { u: oceanSample.uEastMetersPerSecond, v: oceanSample.vNorthMetersPerSecond, w: oceanSample.wDownMetersPerSecond ?? 0 } };
        return this.lastVolumetricCurrentSample;
      }
    }
    const field = this.level.layers?.waterColumn?.current
      ?? this.level.layers?.waterColumn?.currentVectors
      ?? this.level.layers?.current3d
      ?? this.level.layers?.flow3d
      ?? null;
    if (!field) return null;
    const sample = sampleVectorFieldContinuous({
      field,
      x,
      y,
      depthMeters,
      timeSeconds: t,
      depthCoordinates: this.depthCoordinates(),
      timeCoordinates: this.timeCoordinates(),
      interpolationProfileId: this.fieldSamplingProfile('trilinearVolumeV1')
    });
    if (sample.valid === false || !Number.isFinite(Number(sample.u)) || !Number.isFinite(Number(sample.v))) return null;
    this.lastVolumetricCurrentSample = sample;
    return sample;
  }

  sampleROI(x, y, t, mode = 'value', depthMeters = 0) {
    return roiScalar(this.sampleROIObject(x, y, t, depthMeters), mode);
  }

  sampleROIObject(x, y, t, depthMeters = 0) {
    const volumetric = this.sampleVolumetricROI(x, y, t, depthMeters);
    if (volumetric) return volumetric;
    const frame = this.getFrame(t);
    const { cx, cy } = this.clampCell(x, y);
    return normalizeROIValue(frame?.roi?.[cy]?.[cx] ?? 0);
  }

  sampleVolumetricROI(x, y, t, depthMeters = 0) {
    const field = this.level.layers?.waterColumn?.sampleValue
      ?? this.level.layers?.waterColumn?.roi
      ?? this.level.layers?.roi3d
      ?? null;
    if (!field) return null;
    const sample = sampleScalarFieldContinuous({
      field,
      x,
      y,
      depthMeters,
      timeSeconds: t,
      depthCoordinates: this.depthCoordinates(),
      timeCoordinates: this.timeCoordinates(),
      interpolationProfileId: this.fieldSamplingProfile('trilinearVolumeV1')
    });
    if (sample.valid === false || !Number.isFinite(Number(sample.value))) return null;
    this.lastVolumetricRoiSample = sample;
    return {
      ...normalizeROIValue(sample.value),
      expectedValue: Number(sample.value),
      volumetricSample: sample,
      containingCell: sample.containingCell,
      interpolationWeights: sample.interpolationWeights
    };
  }

  sampleDepth(x, y) {
    return sampleDepth(this.level, x, y);
  }

  sampleBottomDepthMeters(x, y) {
    const source = selectBottomDepthSource(this.level, this.grid);
    if (!source) return Infinity;
    const value = sampleBottomDepthSource(source, x, y, this.grid);
    return Number.isFinite(value) ? Math.max(0, value) : Infinity;
  }

  depthEnergyMultiplier(x, y) {
    return depthEnergyMultiplier(this.level, this.mission, x, y);
  }

  isBlocked(x, y) {
    return !isPointNavigable(this.level, this.mission, { x, y }).ok;
  }

  hazardAt(x, y, t = 0) {
    const { cx, cy } = this.clampCell(x, y);
    return this.level.layers.hazards?.[cy]?.[cx] ?? 0;
  }

  mobileHazardAt(x, y, t = 0) {
    return mobileHazardAt(this.level, x, y, t);
  }

  clampCell(x, y) {
    return {
      cx: Math.max(0, Math.min(this.grid.width - 1, Math.round(Number(x)))),
      cy: Math.max(0, Math.min(this.grid.height - 1, Math.round(Number(y))))
    };
  }

  waterColumnConfig() {
    return normalizeWaterColumnConfig(this.mission?.waterColumnConfig ?? this.mission?.world?.waterColumnConfig ?? this.level?.world?.waterColumnConfig ?? { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' });
  }

  depthCoordinates() {
    const config = this.waterColumnConfig();
    return config.depthLayerIds.map((id, index) => {
      const explicit = Number(config.layerMetadata?.[id]?.nominalDepthMeters);
      if (Number.isFinite(explicit)) return explicit;
      return Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? index);
    });
  }

  timeCoordinates() {
    const explicit = this.level.layers?.waterColumn?.timeCoordinates ?? this.level.layers?.timeCoordinates ?? null;
    if (Array.isArray(explicit) && explicit.length) return explicit.map(Number).filter(Number.isFinite);
    return (this.frames ?? []).map((frame, index) => Number(frame.t ?? frame.time ?? index * Number(this.time.dt || 1))).filter(Number.isFinite);
  }

  fieldSamplingProfile(fallback = 'bilinearHorizontalV1') {
    return this.mission?.fieldSamplingProfileId
      ?? this.mission?.meta?.fieldSamplingProfileId
      ?? this.level?.meta?.fieldSamplingProfileId
      ?? fallback;
  }
}
function selectBottomDepthSource(level = {}, planningGrid = {}) {
  const candidates = [
    level.layers?.bottomDepthMeters,
    level.layers?.depthMeters,
    level.layers?.depth,
    level.bathymetry?.depthMeters,
    level.world?.bathymetry?.depthMeters,
    level.layers?.bathymetry?.depthMeters,
    level.regionalFields?.bathymetryDepthMeters,
    level.signedTerrainSurface?.bottomDepthMeters
  ].filter((candidate) => Array.isArray(candidate) && Array.isArray(candidate[0]));
  if (!candidates.length) return null;
  return candidates.find((candidate) => gridMatches(candidate, planningGrid)) ?? candidates[0];
}

function gridMatches(grid = [], planningGrid = {}) {
  return grid.length === Number(planningGrid.height ?? 0)
    && Number(grid[0]?.length ?? 0) === Number(planningGrid.width ?? 0);
}

function sampleBottomDepthSource(grid = [], x = 0, y = 0, planningGrid = {}) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!height || !width) return Infinity;
  const planningWidth = Math.max(1, Number(planningGrid.width ?? width));
  const planningHeight = Math.max(1, Number(planningGrid.height ?? height));
  const sourceX = width === planningWidth ? Number(x) : (Number(x) / Math.max(1, planningWidth - 1)) * Math.max(1, width - 1);
  const sourceY = height === planningHeight ? Number(y) : (Number(y) / Math.max(1, planningHeight - 1)) * Math.max(1, height - 1);
  return sampleGridBilinear(grid, sourceX, sourceY);
}

function sampleGridBilinear(grid = [], x = 0, y = 0) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!height || !width) return Infinity;
  const bx = Math.max(0, Math.min(width - 1, Number(x) || 0));
  const by = Math.max(0, Math.min(height - 1, Number(y) || 0));
  const x0 = Math.floor(bx);
  const y0 = Math.floor(by);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = bx - x0;
  const ty = by - y0;
  const a = Number(grid[y0]?.[x0]);
  const b = Number(grid[y0]?.[x1]);
  const c = Number(grid[y1]?.[x0]);
  const d = Number(grid[y1]?.[x1]);
  if (![a, b, c, d].every(Number.isFinite)) return Infinity;
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}
