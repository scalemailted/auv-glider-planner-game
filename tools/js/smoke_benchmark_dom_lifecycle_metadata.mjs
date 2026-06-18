import { assert, makeTutorialSession } from './mig_r2_smoke_helpers.mjs';
import { createMissionSessionStore } from '../../src/app/mission/MissionSessionStore.js';

const store = createMissionSessionStore(makeTutorialSession());
const summary = store.getDebugState();
assert(summary.levelId, 'Benchmark DOM lifecycle metadata should include level id.');
assert(summary.missionId, 'Benchmark DOM lifecycle metadata should include mission id.');
assert(summary.waypointCount > 0, 'Benchmark DOM lifecycle metadata should include waypoint count.');
assert(summary.containsPhaserObjects === false, 'Benchmark DOM lifecycle metadata should be free of Phaser objects.');
console.log('smoke_benchmark_dom_lifecycle_metadata ok');
