import assert from 'node:assert/strict';

import { validateWaterColumnLayerExplorerViewModel } from '../../src/core/rendering/WaterColumnLayerExplorerViewModel.js';
import { makeVolumetricViewModel } from './water_column_smoke_helpers.mjs';

const explorer = makeVolumetricViewModel().waterColumnExplorer;
const validation = validateWaterColumnLayerExplorerViewModel(explorer);
assert.equal(validation.valid, true, validation.errors.join('; '));
const flags = explorer.boundaryFlags;
assert.equal(flags.hiddenTruthIncluded, false, 'explorer must not expose hidden truth');
assert.equal(flags.displayOwnsScience, false, 'explorer display does not create science values');
assert.equal(flags.displayOwnsCurrent, false, 'explorer display does not create currents');
assert.equal(flags.displayOwnsSampling, false, 'explorer display does not own sampling');
assert.equal(flags.displayChangesScoring, false, 'explorer display does not change scoring');
assert.equal(flags.ownsPlanning, false, 'explorer display does not own planning');
assert.equal(flags.ownsSimulation, false, 'explorer display does not own simulation');
assert.equal(flags.usesNewPlanner, false, 'explorer display does not add planner');

console.log('audit_water_column_explorer_authority: ok', validation.summary);
