import { getFrameAtTime } from '../time/MissionTime.js';
import { normalizeROIValue, roiScalar } from './ROIValue.js';
import { depthEnergyMultiplier, sampleDepth } from './DepthLayer.js';
import { mobileHazardAt } from './MobileHazards.js';
import { isPointNavigable } from '../planning/Navigability.js';
import { sampleCurrentVector } from '../currents/CurrentFieldSampler.js';
import { sampleScalarFieldContinuous, sampleVectorFieldContinuous } from '../science/VolumetricFieldSampler.js';
import { normalizeWaterColumnConfig, waterColumnLayerMetadata } from '../science/WaterColumnSchema.js';

export class TruthWorld {
  constructor(level, mission = null) {
    this.level = level;
    this.mission = mission;
    this.grid = level.world.grid;
    this.time = level.world.time;
    this.frames = level.layers.truth.frames ?? [];
    this.lastVolumetricCurrentSample = null;
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
    const grid = this.level.bathymetry?.depthMeters ?? this.level.layers?.bathymetry?.depthMeters ?? this.level.layers?.bottomDepthMeters ?? null;
    if (!Array.isArray(grid) || !grid.length) return Infinity;
    const width = grid[0]?.length ?? this.grid.width;
    const height = grid.length;
    const cx = Math.max(0, Math.min(width - 1, Math.round(Number(x))));
    const cy = Math.max(0, Math.min(height - 1, Math.round(Number(y))));
    const value = Number(grid[cy]?.[cx]);
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