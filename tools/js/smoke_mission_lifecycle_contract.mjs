import { assert, makeTutorialSession } from './mig_r2_smoke_helpers.mjs';
import { createMissionLifecycleState, applyMissionLifecycleTransition, missionLifecycleSummary } from '../../src/app/mission/MissionLifecycleContract.js';

const session = makeTutorialSession();
let lifecycle = createMissionLifecycleState();
let transition = applyMissionLifecycleTransition(lifecycle, 'loadMission', session);
assert(transition.validation.valid, 'loadMission should be valid from idle.');
lifecycle = transition.state;
transition = applyMissionLifecycleTransition(lifecycle, 'beginPlanning', session);
assert(transition.validation.valid, 'beginPlanning should be valid with loaded mission.');
assert(missionLifecycleSummary(transition.state).usesPhaserUpdate === false, 'Lifecycle must not use Phaser update.');
console.log('smoke_mission_lifecycle_contract ok');
