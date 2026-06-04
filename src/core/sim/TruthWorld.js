import { getFrameAtTime } from '../time/MissionTime.js';
import { normalizeROIValue, roiScalar } from './ROIValue.js';
import { depthEnergyMultiplier, isTooShallow, sampleDepth } from './DepthLayer.js';
import { mobileHazardAt } from './MobileHazards.js';

export class TruthWorld {
  constructor(level, mission = null) {
    this.level = level;
    this.mission = mission;
    this.grid = level.world.grid;
    this.time = level.world.time;
    this.frames = level.layers.truth.frames ?? [];
  }

  getFrame(t) {
    return getFrameAtTime(this.frames, t, this.time.dt || 1);
  }

  sampleCurrent(x, y, t) {
    const frame = this.getFrame(t);
    const { cx, cy } = this.clampCell(x, y);
    return frame?.current?.[cy]?.[cx] ?? [0, 0];
  }

  sampleROI(x, y, t, mode = 'value') {
    return roiScalar(this.sampleROIObject(x, y, t), mode);
  }

  sampleROIObject(x, y, t) {
    const frame = this.getFrame(t);
    const { cx, cy } = this.clampCell(x, y);
    return normalizeROIValue(frame?.roi?.[cy]?.[cx] ?? 0);
  }

  sampleDepth(x, y) {
    return sampleDepth(this.level, x, y);
  }

  depthEnergyMultiplier(x, y) {
    return depthEnergyMultiplier(this.level, this.mission, x, y);
  }

  isBlocked(x, y) {
    const { cx, cy } = this.clampCell(x, y);
    return Boolean(this.level.layers.terrain?.[cy]?.[cx]) || isTooShallow(this.level, this.mission, cx, cy);
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
      cx: Math.max(0, Math.min(this.grid.width - 1, Math.floor(x))),
      cy: Math.max(0, Math.min(this.grid.height - 1, Math.floor(y)))
    };
  }
}
