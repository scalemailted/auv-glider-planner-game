import { assert, createFakeDocument, fakeRendererFactory, fakeSimulationControllerFactory, makeTutorialSession } from './mig_r2_smoke_helpers.mjs';
import { createMissionSessionStore } from '../../src/app/mission/MissionSessionStore.js';
import { createMissionSimulationView } from '../../src/app/views/MissionSimulationView.js';
import { createAnchorAppShell } from '../../src/app/shell/AnchorAppShell.js';

const documentRef = createFakeDocument();
const store = createMissionSessionStore(makeTutorialSession());
let updated = false;
const view = createMissionSimulationView({
  sessionStore: store,
  lifecycleController: { beginPlanning: () => {}, completeSimulation: () => {} },
  rendererFactory: fakeRendererFactory,
  rendererApi: { update: (renderer, vm) => { updated = vm.type === 'anchor.rendering.simulation-world'; }, resize: () => {}, dispose: () => {} },
  simulationControllerFactory: fakeSimulationControllerFactory
});
const shell = createAnchorAppShell({ documentRef });
const node = view.mount({ documentRef, shell });
assert(node.children.length === 2, 'Simulation view should render renderer and controls.');
assert(updated, 'Simulation view should update renderer with simulation-world view model.');
view.unmount();
console.log('smoke_dom_mission_simulation_view ok');
