import assert from 'node:assert/strict';
import { createDepthStructuredField } from './current_vertical_structure_test_helpers.mjs';
const field = createDepthStructuredField();
const components = field.sourceMetadata.components ?? [];
const required = ['alongShelfJet', 'barotropicTide', 'mesoscaleEddy', 'localizedCanyonExchange', 'optionalWindDrivenSurfaceShear'];
for (const id of required) {
  const component = components.find((entry) => entry.id === id);
  assert.ok(component, `missing component ${id}`);
  assert.ok(component.verticalSupport || component.depthBehavior, `component ${id} lacks vertical support metadata`);
}
console.log('audit_current_component_vertical_support: ok', { components: components.length });