import { near, finiteSample } from './current_r2a3_test_helpers.mjs';
import { createManufacturedCurrentField, evaluateExpectedCurrent } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = createManufacturedCurrentField('linearShearWithDepth');
const sample = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 22.5, timeSeconds: 600 });
const expected = evaluateExpectedCurrent(field, 2, 2, 22.5, 600);
finiteSample(sample);
near(sample.uEastMetersPerSecond, expected.u, 1e-6, 'linear shear u');
near(sample.vNorthMetersPerSecond, expected.v, 1e-6, 'linear shear v');
console.log('[smoke_depth_shear_current_exactness] PASS', { depth: sample.depthMeters, u: sample.uEastMetersPerSecond });
