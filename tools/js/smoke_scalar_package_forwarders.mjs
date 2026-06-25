import { assert, createPackageFixtureField, scalarProcesses } from './scalar_package_test_helpers.mjs';
import * as legacySampler from '../../src/core/science/VolumetricFieldSampler.js';
import * as legacySchema from '../../src/core/science/WaterColumnSchema.js';
import * as legacyField from '../../src/core/science/WaterColumnFieldModel.js';
import * as legacyPriority from '../../src/core/science/WaterColumnPriorityModel.js';

const field = createPackageFixtureField({ id: 'forwarder-scalar-field' });
const packageSample = scalarProcesses.sampleScalarFieldContinuous({ field: field.scalarValue, x: 0.5, y: 0.5, depthMeters: 50, timeSeconds: 50, depthCoordinates: field.depthAxisMeters, timeCoordinates: field.timeAxisSeconds });
const legacySample = legacySampler.sampleScalarFieldContinuous({ field: field.scalarValue, x: 0.5, y: 0.5, depthMeters: 50, timeSeconds: 50, depthCoordinates: field.depthAxisMeters, timeCoordinates: field.timeAxisSeconds });
assert.deepEqual(legacySample, packageSample);
const packageConfig = scalarProcesses.normalizeWaterColumnConfig({ depthLayerIds: ['surface', 'deep'], diveProfileId: 'deepDive' });
const legacyConfig = legacySchema.normalizeWaterColumnConfig({ depthLayerIds: ['surface', 'deep'], diveProfileId: 'deepDive' });
assert.deepEqual(legacyConfig, packageConfig);
const depthField = scalarProcesses.createWaterColumnScalarField({ width: 2, height: 2, depthLayerIds: ['surface', 'deep'] }, 0.5);
assert.equal(legacyField.sampleWaterColumnScalar(depthField, 0, 0, 'deep', packageConfig), scalarProcesses.sampleWaterColumnScalar(depthField, 0, 0, 'deep', packageConfig));
const priority = scalarProcesses.computeWaterColumnPriority({ fields: { A_global: depthField } }, packageConfig);
assert.deepEqual(legacyPriority.summarizeWaterColumnPriority(priority), scalarProcesses.summarizeWaterColumnPriority(priority));
console.log('smoke_scalar_package_forwarders: ok', { digest: field.digest });
