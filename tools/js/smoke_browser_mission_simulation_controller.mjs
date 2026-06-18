import { assert, makeTutorialSession } from './mig_r2_smoke_helpers.mjs';
import { createMissionSessionStore } from '../../src/app/mission/MissionSessionStore.js';
import { createBrowserMissionSimulationController } from '../../src/app/simulation/BrowserMissionSimulationController.js';

const store = createMissionSessionStore(makeTutorialSession());
let completed = false;
const controller = createBrowserMissionSimulationController({
  sessionStore: store,
  lifecycleController: { completeSimulation: () => { completed = true; } },
  scheduler: { start: () => 1, stop: () => {} }
});
controller.createEngine();
controller.stepOnce();
const debug = controller.getDebugState();
assert(debug.usesPhaserUpdate === false, 'Browser simulation controller must not use Phaser update.');
assert(debug.status.stepCount >= 1, 'Controller should advance at least one simulation step.');
console.log('smoke_browser_mission_simulation_controller ok');
