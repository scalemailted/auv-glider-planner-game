import { assert, makeTutorialSession } from './mig_r2_smoke_helpers.mjs';
import { createMissionSessionStore } from '../../src/app/mission/MissionSessionStore.js';
import { createMissionLifecycleController } from '../../src/app/mission/MissionLifecycleController.js';

const loaded = makeTutorialSession();
const store = createMissionSessionStore();
const routes = [];
const router = { navigate: (id) => routes.push(id), openLegacyScene: (id) => routes.push(`legacy:${id}`) };
const controller = createMissionLifecycleController({ sessionStore: store, router, services: { validatePlanForExecution: () => ({ ok: true }) } });
controller.loadMission(loaded, { source: 'smoke' });
controller.beginPlanning();
const launched = controller.launchSimulation();
assert(launched.validation.valid, 'launchSimulation should be valid with level, mission, and plan.');
assert(routes.includes('missionPlanning') && routes.includes('missionSimulation'), 'Lifecycle should drive DOM routes.');
assert(controller.getDebugState().usesPhaserUpdate === false, 'Controller must not use Phaser update.');
console.log('smoke_mission_lifecycle_controller ok');
