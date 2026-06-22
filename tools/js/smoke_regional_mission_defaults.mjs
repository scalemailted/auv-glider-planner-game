import assert from 'node:assert/strict';

import {
  createRegionalContinentalShelfScenario,
  createRegionalFleetMission,
  createRegionalMissionBundle
} from '../../src/core/generation/RegionalMissionDefaults.js';
import { validateOperationalDomainSpec } from '../../src/core/domain/OperationalDomainSpec.js';
import { validateMissionResolutionProfile } from '../../src/core/domain/MissionResolutionProfile.js';

const level = createRegionalContinentalShelfScenario({ seed: 'world-r1-defaults' });
const mission = createRegionalFleetMission({ seed: 'world-r1-defaults', resolutionProfile: level.resolutionProfile });
const bundle = createRegionalMissionBundle({ seed: 'world-r1-defaults' });

assert.equal(validateOperationalDomainSpec(level.operationalDomain).valid, true);
assert.equal(validateMissionResolutionProfile(level.resolutionProfile).valid, true);
assert.equal(level.meta.syntheticEducational, true);
assert.equal(level.meta.calibratedOceanForecast, false);
assert.equal(level.world.grid.width, level.resolutionProfile.planningLattice.columns);
assert.equal(level.regionalFields.scienceValue.length, level.resolutionProfile.scienceGrid.rows);
assert.equal(level.layers.truth.frames[0].roi.length, level.world.grid.height, 'sim-compatible ROI frame should use planning lattice');
assert.equal(mission.agents.length, 3);
assert.equal(mission.physics.calibratedVehicleController, false);
assert.equal(bundle.compactExport.containsFullFieldArrays, false);

console.log('smoke_regional_mission_defaults: ok');
