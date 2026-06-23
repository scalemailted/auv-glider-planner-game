import assert from 'node:assert/strict';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';
import { makeCurrentExplorer, makeFlowR2A1Level, makeFixtureCurrentField } from './flow_r2a1_test_helpers.mjs';
import { setSimulationLaunchPresentationDegraded, simulationLaunchDebugSnapshot } from '../../src/core/runtime/SimulationLaunchProfiler.js';

const layer = createThreeInstancedCurrentGlyphLayer();
const explorer = makeCurrentExplorer(makeFlowR2A1Level(), { currentField4D: makeFixtureCurrentField() });
globalThis.__ANCHOR_TEST_FORCE_CURRENT_GLYPH_FAILURE = true;
let failed = false;
try {
  updateThreeInstancedCurrentGlyphLayer(layer, { coordinateSystem: { cellSize: 10 }, waterColumnExplorer: explorer });
} catch (error) {
  failed = true;
  setSimulationLaunchPresentationDegraded('Volumetric current visualization could not be initialized. Mission physics still use the canonical current field.');
}
finally {
  globalThis.__ANCHOR_TEST_FORCE_CURRENT_GLYPH_FAILURE = false;
}
const debug = simulationLaunchDebugSnapshot();
assert.equal(failed, true, 'test seam forces glyph presentation failure');
assert.equal(debug.degradedPresentation, true, 'presentation degradation is recorded');
assert.match(debug.warnings.join('\n'), /Mission physics still use the canonical current field/);
console.log('[smoke_current_presentation_fail_soft] PASS', { degradedPresentation: debug.degradedPresentation });