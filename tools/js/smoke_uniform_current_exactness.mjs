import { near, finiteSample } from './current_r2a3_test_helpers.mjs';
import { createManufacturedCurrentField, evaluateExpectedCurrent } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';
import { computeCurrentFieldScientificDiagnostics } from '../../src/core/science/CurrentFieldScientificDiagnostics.js';

const field = createManufacturedCurrentField('uniformTranslation');
const sample = sampleOceanCurrent({ field, eastMeters: 1.25, northMeters: 2.5, depthMeters: 22, timeSeconds: 777 });
const expected = evaluateExpectedCurrent(field, 1.25, 2.5, 22, 777);
finiteSample(sample);
near(sample.uEastMetersPerSecond, expected.u);
near(sample.vNorthMetersPerSecond, expected.v);
const diagnostics = computeCurrentFieldScientificDiagnostics(field);
near(diagnostics.divergenceRms, 0, 1e-9, 'divergenceRms');
console.log('[smoke_uniform_current_exactness] PASS', { sample, diagnostics: { divergenceRms: diagnostics.divergenceRms } });
