import assert from 'node:assert/strict';

import { TruthWorld } from '../../src/core/sim/TruthWorld.js';
import { sampleScalarFieldContinuous } from '../../src/core/science/VolumetricFieldSampler.js';
import { collapseWaterColumnField } from '../../src/core/science/WaterColumnFieldModel.js';
import { waterColumnLayerMetadata } from '../../src/core/science/WaterColumnSchema.js';

const depthLayerIds = ['surface', 'shallow', 'thermocline', 'midwater', 'deep'];
const depthCoordinates = depthLayerIds.map((id) => Number(waterColumnLayerMetadata(id).nominalDepthMeters ?? 0));
const grid = { width: 4, height: 4 };
const x = 1.35;
const y = 2.2;
const t = 0;
const field = depthLayerIds.map((layerId, z) => Array.from({ length: grid.height }, (_row, row) => Array.from({ length: grid.width }, (_cell, col) => {
  const horizontalSignal = col * 0.017 + row * 0.031;
  const verticalSignal = [0.12, 0.34, 0.81, 0.57, 0.23][z];
  return round(verticalSignal + horizontalSignal);
})));
const level = {
  levelId: 'same-xy-depth-values-smoke',
  world: {
    grid,
    time: { dt: 1, duration: 10 },
    waterColumnConfig: {
      depthLayerIds,
      defaultLayerIds: depthLayerIds,
      diveProfileId: 'sawtoothProfile',
      defaultDiveProfileId: 'sawtoothProfile',
      defaultTargetDepthLayerId: 'thermocline',
      source: 'generatedModernMission'
    }
  },
  layers: {
    truth: { frames: [{ t: 0, roi: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 0.999)) }] },
    terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)),
    hazards: [],
    waterColumn: {
      sampleValue: field,
      depthCoordinates,
      timeCoordinates: [0]
    }
  }
};
const mission = { missionId: 'same-xy-depth-values-mission', fieldSamplingProfileId: 'trilinearVolumeV1' };
const world = new TruthWorld(level, mission);
const samples = depthLayerIds.map((layerId) => {
  const depthMeters = Number(waterColumnLayerMetadata(layerId).nominalDepthMeters ?? 0);
  const roi = world.sampleROIObject(x, y, t, depthMeters);
  return { layerId, depthMeters, value: roi.expectedValue, fieldSample: roi.volumetricSample };
});

for (const sample of samples) {
  assert.equal(Number.isFinite(sample.value), true, `${sample.layerId} sample is finite`);
  assert.equal(sample.fieldSample?.interpolationProfileId, 'trilinearVolumeV1', `${sample.layerId} uses trilinear volume sampling`);
  assert.equal(sample.fieldSample?.depthMeters, sample.depthMeters, `${sample.layerId} records actual sample depth`);
}

const uniqueValues = new Set(samples.map((sample) => sample.value.toFixed(5)));
assert.ok(uniqueValues.size >= 2, 'fixture has materially different values by depth at the same x/y');

const repeated = depthLayerIds.map((layerId) => {
  const depthMeters = Number(waterColumnLayerMetadata(layerId).nominalDepthMeters ?? 0);
  return world.sampleROIObject(x, y, t, depthMeters).expectedValue;
});
assert.deepEqual(repeated, samples.map((sample) => sample.value), 'same x/y/z/t sampling is deterministic');

const shallow = samples.find((sample) => sample.layerId === 'shallow').value;
const thermocline = samples.find((sample) => sample.layerId === 'thermocline').value;
const midpointDepth = (Number(waterColumnLayerMetadata('shallow').nominalDepthMeters) + Number(waterColumnLayerMetadata('thermocline').nominalDepthMeters)) / 2;
const midpoint = sampleScalarFieldContinuous({
  field,
  x,
  y,
  depthMeters: midpointDepth,
  timeSeconds: t,
  depthCoordinates,
  timeCoordinates: [0],
  interpolationProfileId: 'trilinearVolumeV1'
});
assert.equal(Number.isFinite(midpoint.value), true, 'mid-depth interpolation is finite');
assert.ok(midpoint.value >= Math.min(shallow, thermocline) - 1e-9 && midpoint.value <= Math.max(shallow, thermocline) + 1e-9, 'trilinear depth interpolation lies between adjacent source values');
assert.equal(midpoint.interpolationWeights.depth.z0, depthLayerIds.indexOf('shallow'), 'midpoint lower depth bracket is shallow');
assert.equal(midpoint.interpolationWeights.depth.z1, depthLayerIds.indexOf('thermocline'), 'midpoint upper depth bracket is thermocline');

const ordinaryDeep = world.sampleROIObject(x, y, t, Number(waterColumnLayerMetadata('deep').nominalDepthMeters));
assert.notEqual(ordinaryDeep.volumetricSample?.fieldType, 'integratedWaterColumn', 'ordinary actual-depth sampling is not integrated-water-column sampling');
const integrated = collapseWaterColumnField(field, level.world.waterColumnConfig, { method: 'integratedProfile' });
const integratedCellValue = integrated[Math.round(y)][Math.round(x)];
assert.equal(Number.isFinite(integratedCellValue), true, 'explicit integrated-water-column sample is finite');
assert.notEqual(round(integratedCellValue), round(ordinaryDeep.expectedValue), 'explicit integrated value is distinct from ordinary deep actual-depth sample in this fixture');

console.log('smoke_same_xy_different_depth_values: ok', {
  x,
  y,
  samples: samples.map(({ layerId, depthMeters, value }) => ({ layerId, depthMeters, value })),
  midpoint: midpoint.value,
  integratedCellValue: round(integratedCellValue)
});

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
