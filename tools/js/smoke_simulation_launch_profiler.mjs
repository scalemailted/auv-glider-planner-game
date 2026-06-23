import assert from 'node:assert/strict';
import { createSimulationLaunchProfiler, markSimulationLaunchStage, completeSimulationLaunchStage, completeSimulationLaunchProfiler, simulationLaunchDebugSnapshot } from '../../src/core/runtime/SimulationLaunchProfiler.js';

const profiler = createSimulationLaunchProfiler({ missionId: 'smoke-mission', scenarioId: 'smoke-scenario', agentCount: 1 });
globalThis.ANCHOR_SIMULATION_LAUNCH_DEBUG = null;
markSimulationLaunchStage('prepareLaunchSnapshot');
completeSimulationLaunchStage('prepareLaunchSnapshot');
markSimulationLaunchStage('constructSimulationEngine');
completeSimulationLaunchStage('constructSimulationEngine');
completeSimulationLaunchProfiler('interactive', { activeRendererCount: 1, activeRafCount: 1 });
const debug = simulationLaunchDebugSnapshot();
assert.equal(debug.status, 'interactive');
assert.equal(debug.lastCompletedStage, 'constructSimulationEngine');
assert.equal(Array.isArray(debug.warnings), true);
assert.equal(Object.values(debug).some(Array.isArray), true, 'warnings/failures arrays are allowed');
assert.equal(JSON.stringify(debug).includes('uEastMetersPerSecond'), false, 'debug summary must not contain full current arrays');
console.log('[smoke_simulation_launch_profiler] PASS', { status: debug.status, lastCompletedStage: debug.lastCompletedStage });