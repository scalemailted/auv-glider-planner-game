import { assert, makeTutorialSession } from './mig_r2_smoke_helpers.mjs';
import { createMissionSessionStore } from '../../src/app/mission/MissionSessionStore.js';

const { level, mission, plan } = makeTutorialSession();
const store = createMissionSessionStore({ level, mission, plan });
let seen = 0;
store.subscribe(() => { seen += 1; });
store.patch({ selectedAgentId: mission.agents[0].id }, { type: 'test' });
assert(seen >= 2, 'Store should notify subscribers.');
assert(store.getDebugState().containsPhaserObjects === false, 'Session store must not contain Phaser runtime objects.');
assert(store.ensurePlan().agentPlans.length > 0, 'Store should preserve normalized plan.');
console.log('smoke_mission_session_store ok');
