import assert from 'node:assert/strict';
import { readText } from './dom_parity_audit_lib.mjs';

const shell = readText('src/app/shell/AnchorAppShell.js');
const host = readText('src/app/runtime/RouteScopedViewHost.js');
const planning = readText('src/app/views/MissionPlanningView.js');
const simulation = readText('src/app/views/MissionSimulationView.js');
assert.ok(shell.includes('clearRouteRegions'), 'shell clears route-specific regions');
assert.ok(host.includes('anchor-route-root'), 'route host marks route root');
assert.ok(host.includes('unmountRouteScopedView'), 'route host exposes unmount');
assert.ok(planning.includes('simulationTransport') === false, 'planning source must not render simulation transport section');
assert.ok(simulation.includes('planningEditTools') === false, 'simulation source must not render planning edit section');
console.log('audit_route_view_isolation: ok');
