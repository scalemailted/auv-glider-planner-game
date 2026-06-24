import { assert, currents, createPackageFixtureField } from './current_package_test_helpers.mjs';

const field = createPackageFixtureField({ wetMask: [[true, true], [true, true]], bottomDepthMeters: [[150, 150], [150, 150]] });
const diagnostics = currents.computeCurrentFieldScientificDiagnostics(field);
assert.equal(diagnostics.type, 'anchor.science.current-field-scientific-diagnostics');
assert.ok(diagnostics.validVectorCount > 0);
assert.equal(Number.isFinite(diagnostics.speedMean), true);
assert.equal(Number.isFinite(diagnostics.verticalShearRms), true);
assert.equal(Number.isFinite(diagnostics.temporalChangeRms), true);
assert.ok(['PASS', 'WARN'].includes(diagnostics.status));
console.log('smoke_current_package_diagnostics: ok', { status: diagnostics.status, speedMean: diagnostics.speedMean });