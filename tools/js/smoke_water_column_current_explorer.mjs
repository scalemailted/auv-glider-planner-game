import { assert, makeCurrentExplorerFixture, materiallyDifferent } from './current_cube_test_helpers.mjs';
import { validateWaterColumnLayerExplorerViewModel, waterColumnLayerExplorerSummary } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';

const explorer = makeCurrentExplorerFixture({ displayMode: 'activeCurrentSlice' });
const validation = validateWaterColumnLayerExplorerViewModel(explorer);
assert.equal(validation.valid, true, validation.errors.join('\n'));
assert.equal(explorer.currentFieldSummary.depthSampleCount >= 5, true);
assert.equal(explorer.selectedCurrentProfile.samplesByDepth.length >= 5, true);
const surface = explorer.selectedCurrentProfile.samplesByDepth.find((s) => s.layerId === 'surface');
const deep = explorer.selectedCurrentProfile.samplesByDepth.find((s) => s.layerId === 'deep');
assert.equal(materiallyDifferent(surface, deep), true);
assert.equal(explorer.integratedSummary.derived, true);
console.log('[smoke_water_column_current_explorer] PASS', waterColumnLayerExplorerSummary(explorer));
