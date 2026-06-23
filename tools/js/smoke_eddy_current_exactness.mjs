import { near } from './current_r2a3_test_helpers.mjs';
import { createManufacturedCurrentField, evaluateExpectedCurrent } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';
import { computeCurrentFieldScientificDiagnostics } from '../../src/core/science/CurrentFieldScientificDiagnostics.js';

const field = createManufacturedCurrentField('solidBodyEddy');
const sample = sampleOceanCurrent({ field, eastMeters: 3, northMeters: 2, depthMeters: 35, timeSeconds: 0 });
const expected = evaluateExpectedCurrent(field, 3, 2, 35, 0);
near(sample.uEastMetersPerSecond, expected.u, 1e-6, 'eddy u');
near(sample.vNorthMetersPerSecond, expected.v, 1e-6, 'eddy v');
const diagnostics = computeCurrentFieldScientificDiagnostics(field);
near(diagnostics.divergenceRms, 0, 1e-9, 'eddy divergence');
console.log('[smoke_eddy_current_exactness] PASS', { sample, vorticityMean: diagnostics.vorticityMean });
