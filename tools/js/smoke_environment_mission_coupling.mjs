import { sampleMotionEnvironment } from '../../src/core/motion/MotionEnvironmentSampler.js';
import { createWaterColumnObservation } from '../../src/core/science/WaterColumnObservationModel.js';
import { assertCondition, createScalarField4d, sampleScalarFixture } from './scientific_baseline_helpers.mjs';

const depthLayers = ['surface', 'shallow', 'thermocline', 'midwater', 'deep'];
const fieldPack = {
  grid: { width: 6, height: 5, depthLayers },
  fields: {
    F_u: depthLayers.map((_layer, z) => Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 0.02 + z * 0.03))),
    F_v: depthLayers.map((_layer, z) => Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => -0.01 + z * 0.01))),
    hazard: depthLayers.map((_layer, z) => Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => z === 4 ? 0.25 : 0.05))),
    constraintMask: depthLayers.map((_layer, z) => Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => z === 4 ? 0 : 0)))
  }
};
const bathymetry = Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 120));
const scalar = createScalarField4d({
  width: 6,
  height: 5,
  depthCoordinates: [0, 10, 35, 75, 150],
  timeCoordinates: [0, 300],
  evaluator: ({ x, y, depthMeters, timeSeconds }) => 0.1 + 0.02 * x + 0.01 * y + 0.003 * depthMeters + 0.0001 * timeSeconds
});

const surfaceState = { x: 3, y: 2, zIndex: 0, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 300 };
const deepState = { x: 3, y: 2, zIndex: 3, depthLayerId: 'midwater', depthMeters: 75, timeSeconds: 300 };
const surfaceEnvironment = sampleMotionEnvironment({ fieldPack, bathymetry, waterColumnConfig: { depthLayerIds: depthLayers }, state: surfaceState, timeSeconds: 300 });
const deepEnvironment = sampleMotionEnvironment({ fieldPack, bathymetry, waterColumnConfig: { depthLayerIds: depthLayers }, state: deepState, timeSeconds: 300 });
const surfaceScience = sampleScalarFixture(scalar, { x: surfaceState.x, y: surfaceState.y, depthMeters: surfaceState.depthMeters, timeSeconds: 300 }, { depthCoordinates: [0, 10, 35, 75, 150], timeCoordinates: [0, 300] });
const deepScience = sampleScalarFixture(scalar, { x: deepState.x, y: deepState.y, depthMeters: deepState.depthMeters, timeSeconds: 300 }, { depthCoordinates: [0, 10, 35, 75, 150], timeCoordinates: [0, 300] });
const observation = createWaterColumnObservation({ gliderId: 'glider_1', x: deepState.x, y: deepState.y, depthLayerId: 'midwater', depthMeters: deepState.depthMeters, timeSeconds: 300, observedValue: deepScience.value, waterColumnConfig: { depthLayerIds: depthLayers } });

assertCondition(surfaceEnvironment.depthAccessible === true && deepEnvironment.depthAccessible === true, 'Expected both surface and midwater samples to be accessible.', { surfaceEnvironment, deepEnvironment });
assertCondition(deepEnvironment.currentSpeed > surfaceEnvironment.currentSpeed, 'Motion environment current sample should vary with depth layer.', { surfaceEnvironment, deepEnvironment });
assertCondition(deepScience.value !== surfaceScience.value, 'Scalar science value should vary with actual depth at the same x/y/t.', { surfaceScience, deepScience });
assertCondition(observation.depthMeters === deepState.depthMeters && observation.depthLayerId === 'midwater', 'Observation must preserve actual sampled depth and resolved layer.', observation);
assertCondition(observation.hiddenTruthIncluded === false && observation.publicSafe === true, 'Observation summaries must remain public-safe.', observation);

console.log('smoke_environment_mission_coupling: ok', JSON.stringify({
  surfaceEnvironment,
  deepEnvironment,
  surfaceScience: surfaceScience.value,
  deepScience: deepScience.value,
  observation
}, null, 2));
