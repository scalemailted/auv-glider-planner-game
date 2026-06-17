import assert from 'node:assert/strict';
import { createSyntheticBathymetryField } from '../../src/core/science/BathymetryFieldModel.js';
import {
  buildOceanWorldGeometry,
  diveProfilePathFromTracks,
  oceanWorldGeometrySummary,
  realizedTrajectoryGeometry,
  samplingPointsFromObservations,
  surfaceWaypointsFromPlan,
  validateOceanWorldGeometry
} from '../../src/core/science/OceanWorldGeometryAdapter.js';

const plan = { waypoints: [{ x: 1, y: 2 }, { x: 4, y: 5, depthLayerId: 'deep', depthMeters: 110 }] };
const observations = [{ observationId: 'obs-1', x: 2, y: 3, depthLayerId: 'thermocline', depthMeters: 35, observedValue: 0.7 }];
const tracks = [{ x: 1, y: 2, depthLayerId: 'surface', depthMeters: 0 }, { x: 3, y: 4, depthLayerId: 'deep', depthMeters: 120 }];
const motionTrajectory = { realizedTrack: tracks, sampledObservations: observations };
assert.equal(surfaceWaypointsFromPlan(plan).length, 2);
assert.equal(samplingPointsFromObservations(observations).length, 1);
assert.equal(diveProfilePathFromTracks(tracks).length, 2);
assert.equal(realizedTrajectoryGeometry(motionTrajectory).length, 2);
const before = JSON.stringify(plan);
const geometry = buildOceanWorldGeometry({
  missionConfig: { world: { width: 12, height: 8 } },
  bathymetry: createSyntheticBathymetryField({ seed: 'geometry-smoke', width: 12, height: 8 }),
  waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] },
  observations,
  tracks,
  motionTrajectory,
  plan
});
assert.equal(validateOceanWorldGeometry(geometry).valid, true);
const summary = oceanWorldGeometrySummary(geometry);
assert.equal(summary.surfaceWaypointCount, 2);
assert.equal(summary.samplingPointCount, 1);
assert.equal(summary.generatedRoute, false);
assert.equal(summary.ownsPlanning, false);
assert.equal(JSON.stringify(plan), before, 'adapter does not mutate input plan');
console.log('smoke_ocean_world_geometry_adapter: ok');