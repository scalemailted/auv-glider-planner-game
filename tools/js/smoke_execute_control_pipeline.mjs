import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scene = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const overlay = fs.readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');

assert(scene.includes('handleExecuteControlAction'), 'MissionWorkspaceScene needs one execute-control wrapper');
assert(scene.includes('executeControlClickCount'), 'execute click count must be tracked');
assert(scene.includes('duplicateExecuteDispatchCount'), 'duplicate execute dispatch count must be tracked');
assert(scene.includes('createMissionExecutionTransaction'), 'execute must create a transaction');
assert(scene.includes("this.scene.start('SimulationScene', launchPayload)"), 'execute must start SimulationScene with launch payload');
assert(!scene.includes('threeMissionRenderer.execute'), 'execute must not call a Three renderer execute path');
assert(overlay.includes('data-action="execute"'), 'visible execute control must exist');
assert(overlay.includes('this.boundRoots.has(root)'), 'overlay should use idempotent delegated binding');

console.log('smoke_execute_control_pipeline passed');