import { assert, createFakeDocument, makeTutorialSession } from './mig_r2_smoke_helpers.mjs';
import { createMissionSessionStore } from '../../src/app/mission/MissionSessionStore.js';
import { createMissionBriefingView } from '../../src/app/views/MissionBriefingView.js';
import { createAnchorAppShell } from '../../src/app/shell/AnchorAppShell.js';

const documentRef = createFakeDocument();
const store = createMissionSessionStore(makeTutorialSession());
const view = createMissionBriefingView({ sessionStore: store, lifecycleController: { beginPlanning: () => {} }, router: { navigate: () => {} } });
const shell = createAnchorAppShell({ documentRef });
const node = view.mount({ documentRef, shell });
assert(node.children.length > 0, 'Briefing view should render mission content.');
view.unmount();
console.log('smoke_dom_mission_briefing_view ok');
