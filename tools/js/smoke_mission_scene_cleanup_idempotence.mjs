import assert from 'node:assert/strict';
import { MissionWorkspaceScene } from '../../src/game/phaser/scenes/MissionWorkspaceScene.js';
import { SimulationScene } from '../../src/game/phaser/scenes/SimulationScene.js';
import { createThreeMissionSceneLifecycle, threeMissionSceneLifecycleSummary } from '../../src/game/three/ThreeMissionSceneLifecycle.js';

function appStub() {
  return {
    state: { ui: { threeMissionInteraction: {} } },
    elements: { overlay: { bottomTimeline: { innerHTML: '' } } },
    mapHoverTooltip: { hide() {} },
    phaser: { scene: { scenes: [] } }
  };
}

const planning = new MissionWorkspaceScene();
planning.app = appStub();
planning.threeSceneLifecycle = createThreeMissionSceneLifecycle({ sceneKey: 'MissionWorkspaceScene' });
planning.cleanupMissionWorkspaceScene('first');
planning.cleanupMissionWorkspaceScene('second');
assert.equal(planning.cleanupErrorCount, 0);
assert.equal(planning.duplicateCleanupInvocationCount, 1);
assert.equal(threeMissionSceneLifecycleSummary(planning.threeSceneLifecycle).status, 'inactive');

const simulation = new SimulationScene();
simulation.app = appStub();
simulation.engine = { pause() {} };
simulation.threeSceneLifecycle = createThreeMissionSceneLifecycle({ sceneKey: 'SimulationScene' });
simulation.cleanupSimulationScene('first');
simulation.cleanupSimulationScene('second');
assert.equal(simulation.cleanupErrorCount, 0);
assert.equal(simulation.duplicateCleanupInvocationCount, 1);
assert.equal(threeMissionSceneLifecycleSummary(simulation.threeSceneLifecycle).status, 'inactive');
console.log('smoke_mission_scene_cleanup_idempotence passed');