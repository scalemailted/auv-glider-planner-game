import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const files = [
  'src/core/motion/GliderMotionSchema.js',
  'src/core/motion/MotionEnvironmentSampler.js',
  'src/core/motion/GliderDynamicsModel.js',
  'src/core/motion/PlanControlAdapter.js',
  'src/core/motion/MotionDiagnostics.js',
  'src/core/motion/GliderTrajectorySimulator.js',
  'src/core/motion/MissionFeasibilityReport.js',
  'src/game/phaser/scenes/MotionPlanningDemoScene.js',
  'src/ui/MissionConsole.js',
  'src/ui/headless/HeadlessBundleViewerPanel.js',
  'tools/js/headless_oceanbox.mjs',
  'README.md',
  'HOWPLAY.md',
  'ROADMAP.md',
  'docs/headless_node_oceanbox_runtime.md',
  'docs/headless_solver_packet_roundtrip.md',
  'docs/motion_planning_dynamics_layer.md',
  'docs/mission_feasibility_simulator_requirements.md'
].filter((file) => fs.existsSync(file));

const joined = files.map((file) => `\n--- ${file} ---\n${fs.readFileSync(file, 'utf8')}`).join('\n');
assert.equal(/usesWebGPUFluid:\s*true/.test(joined), false, 'MOTION-R1 must not claim active WebGPU fluid use');
assert.equal(/usesNewPlanner:\s*true/.test(joined), false, 'MOTION-R1 must not claim a new route planner');
assert.equal(/usesMARL:\s*true/.test(joined), false, 'MOTION-R1 must not claim MARL/RL');
assert.equal(/implementsPythonSimulator:\s*true|usesPythonSimulator:\s*true/i.test(joined), false, 'motion docs/code must not introduce a Python simulator');
assert.ok(joined.includes('Motion dynamics does not generate a route'), 'motion boundary copy is present');
assert.ok(/not SeaExplorer-specific validated simulator|not SeaExplorer-validated|SeaExplorer-specific validation/i.test(joined), 'SeaExplorer validation boundary is present');
assert.ok(/not operational certification|operational certification/i.test(joined), 'operational certification boundary is present');
assert.ok(joined.includes('WebGPU fluid coupling is future/optional') || joined.includes('not WebGPU'), 'WebGPU future boundary is present');

const rootMenu = fs.readFileSync('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
const primaryCards = rootMenu.match(/const PRIMARY_CARDS = \[(.*?)\];/s)?.[1] ?? '';
assert.equal(primaryCards.includes('Motion Planning'), false, 'Motion Planning is not a fourth top-level product mode');
assert.ok(rootMenu.includes("hubActionHtml('motion-planning-demo'"), 'Motion Planning Demo is reachable in Simulation Lab');

console.log('Motion planning boundary audit passed', { files: files.length, repo: path.basename(process.cwd()) });
