import { assert, createFakeDocument, makeTutorialSession } from './mig_r2_smoke_helpers.mjs';
import { createMissionSessionStore } from '../../src/app/mission/MissionSessionStore.js';
import { createMissionDebriefView } from '../../src/app/views/MissionDebriefView.js';
import { createAnchorAppShell } from '../../src/app/shell/AnchorAppShell.js';

const documentRef = createFakeDocument();
const session = makeTutorialSession();
session.result = { type: 'anchor.result', summary: { finalScore: 42, roiCollected: 2, energyUsed: 10 }, stopReason: { reason: 'complete' } };
const store = createMissionSessionStore(session);
const view = createMissionDebriefView({ sessionStore: store, lifecycleController: { beginPlanning: () => {} }, router: { navigate: () => {} } });
const shell = createAnchorAppShell({ documentRef });
const node = view.mount({ documentRef, shell });
assert(node.children.length > 0, 'Debrief view should render summary.');
assert(view.getDebugState().ownsScoring === false, 'Debrief view should not own scoring.');
view.unmount();
console.log('smoke_dom_mission_debrief_view ok');
