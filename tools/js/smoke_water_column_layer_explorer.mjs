import assert from 'node:assert/strict';

import { validateWaterColumnLayerExplorerViewModel, waterColumnLayerExplorerSummary } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const model = makeVolumetricViewModel({ activeDepthLayerId: 'thermocline', waterColumnUi: { displayMode: 'stackedSlabs' } });
const explorer = model.waterColumnExplorer;
const validation = validateWaterColumnLayerExplorerViewModel(explorer);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(explorer.boundaryFlags.displayOwnsScience, false);
assert.equal(explorer.boundaryFlags.displayOwnsCurrent, false);
assert.equal(explorer.boundaryFlags.displayOwnsSampling, false);
assert.equal(explorer.boundaryFlags.displayChangesScoring, false);
assert.equal(explorer.boundaryFlags.ownsSimulation, false);
assert.equal(explorer.layers.length >= 3, true, 'explorer exposes configured operational depth layers');
assert.equal(Boolean(explorer.integratedSummary), true, 'integrated water-column summary is available as derived view');
assert.equal(explorer.integratedSummary.physicalDepthPlane, false, 'integrated view is not treated as a physical slab');
assert.equal(explorer.selectedVerticalProfile.length, explorer.layers.length, 'vertical profile has one row per layer');

console.log('smoke_water_column_layer_explorer: ok', waterColumnLayerExplorerSummary(explorer));
