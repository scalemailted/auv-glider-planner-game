import assert from 'node:assert/strict';
import { bathymetryConditionedComponentCatalog } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { manufacturedCurrentFieldCatalog } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';

const components = bathymetryConditionedComponentCatalog();
assert.ok(components.length >= 8, 'expected named synthetic components');
for (const component of components) {
  assert.ok(component.equation, `missing equation for ${component.id}`);
  assert.ok(component.intendedPhysicalAnalogy, `missing analogy for ${component.id}`);
  assert.ok(component.knownLimitations, `missing limitations for ${component.id}`);
}
const manufactured = manufacturedCurrentFieldCatalog();
assert.ok(manufactured.every((entry) => entry.equation), 'manufactured equations must be documented');
console.log('[audit_current_equation_metadata] PASS', { components: components.length, manufactured: manufactured.length });
