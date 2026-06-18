import { assert, createFakeDocument, fakeRendererFactory, makeTutorialSession } from './mig_r2_smoke_helpers.mjs';
import { createMissionSessionStore } from '../../src/app/mission/MissionSessionStore.js';
import { createMissionPlanningView, buildPlanningViewModel } from '../../src/app/views/MissionPlanningView.js';
import { createAnchorAppShell } from '../../src/app/shell/AnchorAppShell.js';

const documentRef = createFakeDocument();
const store = createMissionSessionStore(makeTutorialSession());
let updated = false;
const view = createMissionPlanningView({
  sessionStore: store,
  lifecycleController: { updatePlan: () => {}, launchSimulation: () => {} },
  router: { navigate: () => {} },
  rendererFactory: fakeRendererFactory,
  rendererApi: { update: (renderer, vm) => { updated = vm.type === 'anchor.rendering.mission-world'; }, resize: () => {}, dispose: () => {} }
});
const shell = createAnchorAppShell({ documentRef });
const node = view.mount({ documentRef, shell });
assert(node.children.length === 2, 'Planning view should render renderer and tools.');
assert(updated, 'Planning view should update renderer with mission-world view model.');
assert(buildPlanningViewModel(store.getState()).boundaryFlags.ownsPlanning === false, 'Planning view model must not own planning.');
view.unmount();
console.log('smoke_dom_mission_planning_view ok');
