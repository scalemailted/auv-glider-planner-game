import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scene = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const required = [
  ['Start', 'data-action="start"'],
  ['Play/Pause', 'data-action="play"'],
  ['Pause', 'data-action="pause"'],
  ['Step', 'data-action="step"'],
  ['Finish', 'data-action="finish"'],
  ['Reset', 'data-action="reset"'],
  ['Return/Replan', 'data-action="planning"'],
  ['Debrief', 'data-action="debrief"'],
  ['Main Menu', 'data-action="menu"'],
  ['Timeline', 'simulation-timeline'],
  ['Selected glider', 'selectAgent'],
  ['Planned route', 'plannedRouteCount'],
  ['Actual path', 'realizedTrajectoryCount'],
  ['Energy/progress', 'Energy ${summary.energyUsed}'],
  ['Route failure', 'simulation-route-failure-actions'],
  ['Surfacing', 'simulation-surface-decision-actions']
];
const rows = required.map(([feature, token]) => ({ feature, status: scene.includes(token) ? 'PARITY' : 'MISSING', token }));
const missing = rows.filter((row) => row.status === 'MISSING');
assert(missing.length === 0, `Missing simulation UI parity items: ${missing.map((row) => row.feature).join(', ')}`);
console.log(JSON.stringify({ type: 'anchor.audit.three-simulation-ui-parity', rows }, null, 2));