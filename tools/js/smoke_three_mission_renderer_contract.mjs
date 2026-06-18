import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as rendererModule from '../../src/game/three/ThreeMissionWorldRenderer.js';

const required = ['createThreeMissionWorldRenderer', 'updateThreeMissionWorldRenderer', 'resizeThreeMissionWorldRenderer', 'setThreeMissionWorldCamera', 'setThreeMissionLayerVisibility', 'threeMissionWorldRendererSummary', 'disposeThreeMissionWorldRenderer'];
for (const name of required) assert.equal(typeof rendererModule[name], 'function', `${name} must be exported`);
const source = fs.readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
for (const banned of ['core/sim', 'core/scoring', 'core/planning', 'WebGPUOcean', 'Enable3D']) {
  assert.equal(source.includes(banned), false, `renderer must not import/use ${banned}`);
}
for (const group of ['bathymetryGroup', 'scalarFieldGroup', 'currentVectorGroup', 'hazardGroup', 'dropZoneGroup', 'gliderGroup', 'waypointGroup', 'routeGroup', 'markerGroup', 'priorityTargetGroup', 'selectionGroup']) {
  assert.ok(source.includes(group), `renderer source should define ${group}`);
}
assert.ok(source.includes('usesMARL: false'), 'renderer must explicitly state it does not use MARL');
console.log('Three mission renderer contract smoke passed');
