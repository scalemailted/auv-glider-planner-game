import assert from 'node:assert/strict';

import {
  createLegacyOperationalDomainFromGrid,
  createOperationalDomainSpec,
  isSyntheticEducationalDomain,
  operationalDomainSummary,
  validateOperationalDomainSpec
} from '../../src/core/domain/OperationalDomainSpec.js';

const regional = createOperationalDomainSpec({ domainId: 'world-r1-smoke-domain' });
const validation = validateOperationalDomainSpec(regional);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(isSyntheticEducationalDomain(regional), true, 'regional domain should be synthetic educational');
const summary = operationalDomainSummary(regional);
assert.equal(summary.widthKm, 80, 'default regional width should be 80 km');
assert.equal(summary.heightKm, 50, 'default regional height should be 50 km');
assert.equal(summary.calibratedOceanForecast, false, 'regional fixture must not claim calibrated forecast status');

const legacy = createLegacyOperationalDomainFromGrid({ width: 4, height: 3, cellSizeMeters: 100 });
assert.equal(legacy.horizontal.widthMeters, 400);
assert.equal(legacy.horizontal.heightMeters, 300);
assert.equal(validateOperationalDomainSpec(legacy).valid, true);

console.log('smoke_operational_domain_spec: ok');
