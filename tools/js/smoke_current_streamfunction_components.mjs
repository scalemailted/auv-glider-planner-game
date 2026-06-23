import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
const required = ['alongShelfJet', 'depthShear', 'barotropicTide', 'mesoscaleEddy', 'translatingEddy', 'calmOrWeakCurrentRegion', 'localizedCanyonExchange'];
for (const id of required) assert.ok(m.componentIds.includes(id), `missing component ${id}`);
for (const component of m.field.sourceMetadata.components) {
  for (const key of ['id', 'equationFamily', 'parameters', 'physicalAnalogy', 'depthBehavior', 'temporalBehavior', 'bathymetryInteraction', 'validRegion', 'knownLimitations', 'notA']) assert.ok(Object.hasOwn(component, key), `${component.id} missing ${key}`);
  assert.match(component.notA, /not a calibrated/i, `${component.id} must reject calibrated forecast claim`);
}
assert.equal(m.field.sourceMetadata.perturbationPolicy.notCellwiseRandomDirections, true, 'perturbations are not cellwise random directions');
console.log('[smoke_current_streamfunction_components] PASS', { components: m.componentIds });
