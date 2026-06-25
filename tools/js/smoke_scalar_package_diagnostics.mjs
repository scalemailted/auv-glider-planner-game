import { assert, createPackageFixtureField, scalarProcesses } from './scalar_package_test_helpers.mjs';

const field = createPackageFixtureField({ id: 'smoke-scalar-package-diagnostics' });
const diagnostics = scalarProcesses.computeScalarFieldDiagnostics(field);
const validation = scalarProcesses.validateScalarFieldDiagnostics(diagnostics);
const claim = scalarProcesses.validateScalarClaimBoundary(field);
assert.equal(validation.status, 'PASS');
assert.equal(claim.status, 'PASS');
assert.equal(diagnostics.materiallyDepthVarying, true);
assert.equal(diagnostics.temporallyVarying, true);
assert.equal(scalarProcesses.noCalibratedScalarClaims(field), true);
assert.equal(diagnostics.boundaryFlags.rendererOwnsScalarTruth, false);
console.log('smoke_scalar_package_diagnostics: ok', { depthMeanRange: diagnostics.depthMeanRange, timeMeanRange: diagnostics.timeMeanRange });
