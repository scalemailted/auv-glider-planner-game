import assert from 'node:assert/strict';
import { getSyntheticCurrentCubeFromMissionWorld } from '../../src/core/science/SyntheticCurrentCubeAdapter.js';
import { validateOceanCurrentField4D } from '../../src/core/science/OceanCurrentField4D.js';
import { failSimulationLaunchProfiler, simulationLaunchDebugSnapshot } from '../../src/core/runtime/SimulationLaunchProfiler.js';

const malformed = {
  type: 'anchor.science.ocean-current-field-4d',
  eastAxisMeters: [],
  northAxisMeters: [],
  depthAxisMeters: [],
  timeAxisSeconds: [],
  uEastMetersPerSecond: [],
  vNorthMetersPerSecond: []
};
const validation = validateOceanCurrentField4D(malformed);
assert.equal(validation.valid, false, 'malformed current cube is rejected');
let thrown = null;
try {
  getSyntheticCurrentCubeFromMissionWorld({
    level: {
      levelId: 'malformed-current-launch',
      world: { grid: { width: 2, height: 2 }, time: { duration: 60, dt: 1 }, waterColumnConfig: { depthLayerIds: ['surface'], diveProfileId: 'surfaceOnly' } },
      layers: { waterColumn: { currentField4D: malformed } }
    }
  });
} catch (error) {
  thrown = error;
}
assert.equal(thrown?.name, 'CanonicalCurrentFieldError', 'canonical current resolver throws a typed launch error');
failSimulationLaunchProfiler(thrown.message, { launchAbortedCleanly: true });
const debug = simulationLaunchDebugSnapshot();
assert.equal(debug.status, 'failed');
assert.equal(debug.launchAbortedCleanly, true);
assert.ok(debug.failures.length >= 1);
console.log('[smoke_current_canonical_launch_failure] PASS', { failure: debug.failures[0] });