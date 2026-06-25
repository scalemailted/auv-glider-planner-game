import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const transitionForwarders = [
  'src/core/sim/Agent.js',
  'src/core/sim/Physics.js',
  'src/core/sim/Sampling.js',
  'src/core/planning/PlanExecutor.js',
  'src/core/simulation/TerrainSimulationDiagnostics.js',
  'src/core/sim/ContinuousGliderState.js',
  'src/core/sim/EndConditions.js',
  'src/core/sim/GliderDiveStateMachine.js',
  'src/core/sim/MissionRules.js',
  'src/core/motion/EffectiveDiveProfileResolver.js'
];

const packageTransitionModules = [
  'packages/mission-simulator/src/Agent.js',
  'packages/mission-simulator/src/Physics.js',
  'packages/mission-simulator/src/Sampling.js',
  'packages/mission-simulator/src/PlanExecutor.js',
  'packages/mission-simulator/src/TerrainSimulationDiagnostics.js',
  'packages/mission-simulator/src/GliderDiveStateMachine.js',
  'packages/mission-simulator/src/MissionSimulationKernel.js'
];

let legacyProductionTransitionCount = 0;
for (const file of transitionForwarders) {
  const source = await fs.readFile(file, 'utf8');
  const forwards = source.includes('packages/mission-simulator/src/') && source.includes('Canonical implementation lives in packages/mission-simulator');
  if (!forwards) legacyProductionTransitionCount += 1;
}

let packageTransitionCount = 0;
for (const file of packageTransitionModules) {
  const source = await fs.readFile(file, 'utf8');
  if (/export function|export const|export class/.test(source)) packageTransitionCount += 1;
  const importSpecs = [...source.matchAll(/from\s+['\"]([^'\"]+)['\"]/g)].map((match) => match[1]);
  for (const specifier of importSpecs) {
    const normalized = specifier.replaceAll('\\\\', '/');
    assert(!normalized.includes('../../../src/') && !normalized.includes('../../../../src/'), file + ' must not import app src: ' + specifier);
  }
}

const duplicateEngineCount = legacyProductionTransitionCount;
assert.equal(legacyProductionTransitionCount, 0);
assert(packageTransitionCount > 0);
assert.equal(duplicateEngineCount, 0);
console.log('audit_mission_simulator_authoritative_runtime: ok', { legacyProductionTransitionCount, packageTransitionCount, duplicateEngineCount });
